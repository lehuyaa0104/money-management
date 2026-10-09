package domain

import (
	"context"
	"time"
)

// RefreshToken lets a client get new access tokens without signing in again.
// Only a hash of the token is stored, so a database leak doesn't hand out sessions.
type RefreshToken struct {
	Hash      string
	UserID    string
	ExpiresAt time.Time
	CreatedAt time.Time
}

type RefreshTokenRepository interface {
	Create(ctx context.Context, token *RefreshToken) error
	// Take deletes the token and returns it, so each one works once; ErrNotFound
	// if it doesn't exist or was already used.
	Take(ctx context.Context, hash string) (*RefreshToken, error)
	// DeleteByUser signs the user out everywhere (on their next refresh).
	DeleteByUser(ctx context.Context, userID string) error
}
