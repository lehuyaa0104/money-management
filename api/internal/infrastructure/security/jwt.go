package security

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const issuer = "money-management"

// JWTService issues and verifies HS256 access tokens whose subject is the user ID.
type JWTService struct {
	secret []byte
	ttl    time.Duration
	now    func() time.Time
}

func NewJWTService(secret string, ttl time.Duration) (*JWTService, error) {
	if len(secret) < 32 {
		return nil, errors.New("JWT secret must be at least 32 characters")
	}
	return &JWTService{secret: []byte(secret), ttl: ttl, now: time.Now}, nil
}

func (s *JWTService) Issue(userID string) (string, time.Time, error) {
	now := s.now()
	expiresAt := now.Add(s.ttl)
	claims := jwt.RegisteredClaims{
		Issuer:    issuer,
		Subject:   userID,
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(expiresAt),
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.secret)
	return token, expiresAt, err
}

// Verify returns the user ID of a valid, unexpired token.
func (s *JWTService) Verify(token string) (string, error) {
	claims := &jwt.RegisteredClaims{}
	_, err := jwt.ParseWithClaims(token, claims, func(*jwt.Token) (any, error) { return s.secret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(issuer),
		jwt.WithExpirationRequired(),
		jwt.WithTimeFunc(s.now),
	)
	if err != nil {
		return "", fmt.Errorf("invalid token: %w", err)
	}
	if claims.Subject == "" {
		return "", errors.New("invalid token: missing subject")
	}
	return claims.Subject, nil
}
