package testutil

import (
	"context"
	"sync"

	"github.com/leduchuy/money-management/api/internal/domain"
)

// MemoryRefreshTokens is an in-memory domain.RefreshTokenRepository.
type MemoryRefreshTokens struct {
	mu     sync.Mutex
	tokens []domain.RefreshToken
}

func (r *MemoryRefreshTokens) Create(_ context.Context, t *domain.RefreshToken) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.tokens = append(r.tokens, *t)
	return nil
}

func (r *MemoryRefreshTokens) Take(_ context.Context, hash string) (*domain.RefreshToken, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i, t := range r.tokens {
		if t.Hash == hash {
			r.tokens = append(r.tokens[:i], r.tokens[i+1:]...)
			return &t, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (r *MemoryRefreshTokens) DeleteByUser(_ context.Context, userID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	kept := r.tokens[:0]
	for _, t := range r.tokens {
		if t.UserID != userID {
			kept = append(kept, t)
		}
	}
	r.tokens = kept
	return nil
}
