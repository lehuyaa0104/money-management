package usecase

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"github.com/leduchuy/money-management/api/internal/domain"
)

type RegisterInput struct {
	FullName string
	Username string
	Password string
}

type AuthResult struct {
	Token     string // short-lived access token
	ExpiresAt time.Time
	// RefreshToken gets the next pair from Refresh; it works once.
	RefreshToken string
	User         *domain.User
}

type AuthUsecase struct {
	users      domain.UserRepository
	refresh    domain.RefreshTokenRepository
	refreshTTL time.Duration
	hasher     PasswordHasher
	tokens     TokenIssuer
	now        Clock
	newID      IDGenerator
	// dummyHash is compared against when the username doesn't exist, so a failed
	// login takes the same time either way and doesn't reveal which usernames exist.
	dummyHash string
}

func NewAuthUsecase(
	users domain.UserRepository, refresh domain.RefreshTokenRepository, refreshTTL time.Duration,
	hasher PasswordHasher, tokens TokenIssuer, now Clock, newID IDGenerator,
) (*AuthUsecase, error) {
	dummy, err := hasher.Hash("dummy-password-for-timing")
	if err != nil {
		return nil, err
	}
	return &AuthUsecase{
		users: users, refresh: refresh, refreshTTL: refreshTTL, hasher: hasher, tokens: tokens, now: now, newID: newID, dummyHash: dummy,
	}, nil
}

func (u *AuthUsecase) Register(ctx context.Context, in RegisterInput) (*AuthResult, error) {
	fullName := strings.TrimSpace(in.FullName)
	username := strings.TrimSpace(in.Username)
	for _, err := range []error{
		domain.ValidateFullName(fullName),
		domain.ValidateUsername(username),
		domain.ValidatePassword(in.Password),
	} {
		if err != nil {
			return nil, err
		}
	}

	if _, err := u.users.FindByUsername(ctx, username); err == nil {
		return nil, domain.ErrUsernameTaken
	} else if !errors.Is(err, domain.ErrNotFound) {
		return nil, err
	}

	hash, err := u.hasher.Hash(in.Password)
	if err != nil {
		return nil, err
	}
	user := &domain.User{
		ID:            u.newID(),
		Username:      username,
		FullName:      fullName,
		PasswordHash:  hash,
		CycleStartDay: 1,
		Currency:      domain.DefaultCurrency,
		CreatedAt:     u.now(),
	}
	// The repository also maps a duplicate-key race to ErrUsernameTaken.
	if err := u.users.Create(ctx, user); err != nil {
		return nil, err
	}
	return u.issue(ctx, user)
}

func (u *AuthUsecase) Login(ctx context.Context, username, password string) (*AuthResult, error) {
	username = strings.TrimSpace(username)
	if username == "" || password == "" {
		return nil, domain.ErrInvalidCredentials
	}

	user, err := u.users.FindByUsername(ctx, username)
	if errors.Is(err, domain.ErrNotFound) {
		u.hasher.Compare(u.dummyHash, password)
		return nil, domain.ErrInvalidCredentials
	}
	if err != nil {
		return nil, err
	}
	if !u.hasher.Compare(user.PasswordHash, password) {
		return nil, domain.ErrInvalidCredentials
	}
	return u.issue(ctx, user)
}

func (u *AuthUsecase) Me(ctx context.Context, userID string) (*domain.User, error) {
	user, err := u.users.FindByID(ctx, userID)
	if errors.Is(err, domain.ErrNotFound) {
		// The token is valid but the account is gone.
		return nil, domain.ErrUnauthorized
	}
	return user, err
}

// SettingsInput changes only the fields that are set.
type SettingsInput struct {
	CycleStartDay *int    // day of month budgeting cycles start on
	Currency      *string // display currency, ISO 4217
}

// UpdateSettings changes the user's preferences.
func (u *AuthUsecase) UpdateSettings(ctx context.Context, userID string, in SettingsInput) (*domain.User, error) {
	user, err := u.Me(ctx, userID)
	if err != nil {
		return nil, err
	}
	if in.CycleStartDay != nil {
		if err := domain.ValidateCycleStartDay(*in.CycleStartDay); err != nil {
			return nil, err
		}
		user.CycleStartDay = *in.CycleStartDay
	}
	if in.Currency != nil {
		code := strings.ToUpper(strings.TrimSpace(*in.Currency))
		if err := domain.ValidateCurrency(code); err != nil {
			return nil, err
		}
		user.Currency = code
	}
	if err := u.users.UpdateSettings(ctx, user); err != nil {
		return nil, err
	}
	return user, nil
}

// ChangePassword sets a new password after checking the current one, then signs
// the user out everywhere else: other devices' refresh tokens stop working, and
// their access tokens run out within the access token TTL. This device gets a new pair.
func (u *AuthUsecase) ChangePassword(ctx context.Context, userID, current, next string) (*AuthResult, error) {
	if err := domain.ValidatePassword(next); err != nil {
		return nil, err
	}
	user, err := u.Me(ctx, userID)
	if err != nil {
		return nil, err
	}
	if !u.hasher.Compare(user.PasswordHash, current) {
		return nil, domain.ErrCurrentPasswordWrong
	}
	hash, err := u.hasher.Hash(next)
	if err != nil {
		return nil, err
	}
	if err := u.users.UpdatePasswordHash(ctx, user.ID, hash); err != nil {
		return nil, err
	}
	if err := u.refresh.DeleteByUser(ctx, user.ID); err != nil {
		return nil, err
	}
	return u.issue(ctx, user)
}

// Refresh swaps a refresh token for a new access + refresh token pair.
// shortcut: a reused refresh token is only rejected, not treated as theft; revoke all the user's tokens on reuse if that matters.
func (u *AuthUsecase) Refresh(ctx context.Context, refreshToken string) (*AuthResult, error) {
	if refreshToken == "" {
		return nil, domain.ErrUnauthorized
	}
	stored, err := u.refresh.Take(ctx, hashRefreshToken(refreshToken))
	if errors.Is(err, domain.ErrNotFound) {
		return nil, domain.ErrUnauthorized
	}
	if err != nil {
		return nil, err
	}
	if !u.now().Before(stored.ExpiresAt) {
		return nil, domain.ErrUnauthorized
	}
	user, err := u.Me(ctx, stored.UserID)
	if err != nil {
		return nil, err
	}
	return u.issue(ctx, user)
}

// issue signs the user in: a short-lived access token plus a stored refresh token.
// shortcut: refresh tokens that expire unused are never deleted; add a periodic cleanup if the table grows.
func (u *AuthUsecase) issue(ctx context.Context, user *domain.User) (*AuthResult, error) {
	token, expiresAt, err := u.tokens.Issue(user.ID)
	if err != nil {
		return nil, err
	}
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return nil, err
	}
	refreshToken := base64.RawURLEncoding.EncodeToString(raw)
	now := u.now()
	if err := u.refresh.Create(ctx, &domain.RefreshToken{
		Hash: hashRefreshToken(refreshToken), UserID: user.ID, ExpiresAt: now.Add(u.refreshTTL), CreatedAt: now,
	}); err != nil {
		return nil, err
	}
	return &AuthResult{Token: token, ExpiresAt: expiresAt, RefreshToken: refreshToken, User: user}, nil
}

func hashRefreshToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
