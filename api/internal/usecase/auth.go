package usecase

import (
	"context"
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
	Token     string
	ExpiresAt time.Time
	User      *domain.User
}

type AuthUsecase struct {
	users  domain.UserRepository
	hasher PasswordHasher
	tokens TokenIssuer
	now    Clock
	newID  IDGenerator
	// dummyHash is compared against when the username doesn't exist, so a failed
	// login takes the same time either way and doesn't reveal which usernames exist.
	dummyHash string
}

func NewAuthUsecase(users domain.UserRepository, hasher PasswordHasher, tokens TokenIssuer, now Clock, newID IDGenerator) (*AuthUsecase, error) {
	dummy, err := hasher.Hash("dummy-password-for-timing")
	if err != nil {
		return nil, err
	}
	return &AuthUsecase{users: users, hasher: hasher, tokens: tokens, now: now, newID: newID, dummyHash: dummy}, nil
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
		CreatedAt:     u.now(),
	}
	// The repository also maps a duplicate-key race to ErrUsernameTaken.
	if err := u.users.Create(ctx, user); err != nil {
		return nil, err
	}
	return u.issue(user)
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
	return u.issue(user)
}

func (u *AuthUsecase) Me(ctx context.Context, userID string) (*domain.User, error) {
	user, err := u.users.FindByID(ctx, userID)
	if errors.Is(err, domain.ErrNotFound) {
		// The token is valid but the account is gone.
		return nil, domain.ErrUnauthorized
	}
	return user, err
}

// SetCycleStartDay changes the day of month the user's budgeting cycle starts on.
func (u *AuthUsecase) SetCycleStartDay(ctx context.Context, userID string, day int) (*domain.User, error) {
	if err := domain.ValidateCycleStartDay(day); err != nil {
		return nil, err
	}
	user, err := u.Me(ctx, userID)
	if err != nil {
		return nil, err
	}
	if err := u.users.UpdateCycleStartDay(ctx, user.ID, day); err != nil {
		return nil, err
	}
	user.CycleStartDay = day
	return user, nil
}

func (u *AuthUsecase) issue(user *domain.User) (*AuthResult, error) {
	token, expiresAt, err := u.tokens.Issue(user.ID)
	if err != nil {
		return nil, err
	}
	return &AuthResult{Token: token, ExpiresAt: expiresAt, User: user}, nil
}
