package usecase

import "time"

// PasswordHasher hashes and checks passwords (implemented with bcrypt).
type PasswordHasher interface {
	Hash(password string) (string, error)
	Compare(hash, password string) bool
}

// TokenIssuer creates access tokens for a signed-in user (implemented with JWT).
type TokenIssuer interface {
	Issue(userID string) (token string, expiresAt time.Time, err error)
}

// Clock and IDGenerator are injected so tests can control time and IDs.
type (
	Clock       func() time.Time
	IDGenerator func() string
)
