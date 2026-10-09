package usecase

import (
	"context"
	"time"

	"github.com/leduchuy/money-management/api/internal/domain"
)

// PasswordHasher hashes and checks passwords (implemented with bcrypt).
type PasswordHasher interface {
	Hash(password string) (string, error)
	Compare(hash, password string) bool
}

// TokenIssuer creates access tokens for a signed-in user (implemented with JWT).
type TokenIssuer interface {
	Issue(userID string) (token string, expiresAt time.Time, err error)
}

// NavSource fetches the latest published NAV of each fund it knows (from a fund distributor).
// It may return fewer funds than it knows when some fail; an error means it got none.
type NavSource interface {
	LatestNavs(ctx context.Context) ([]domain.FundNav, error)
}

// Clock and IDGenerator are injected so tests can control time and IDs.
type (
	Clock       func() time.Time
	IDGenerator func() string
)
