package testutil

import (
	"context"
	"sort"
	"sync"

	"github.com/leduchuy/money-management/api/internal/domain"
)

// MemoryAssets is an in-memory domain.AssetRepository.
type MemoryAssets struct {
	mu     sync.Mutex
	Assets []domain.Asset
}

func (r *MemoryAssets) Create(_ context.Context, a *domain.Asset) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.Assets = append(r.Assets, *a)
	return nil
}

func (r *MemoryAssets) List(_ context.Context, userID string) ([]domain.Asset, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := []domain.Asset{}
	for _, a := range r.Assets {
		if a.UserID == userID {
			out = append(out, a)
		}
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out, nil
}

func (r *MemoryAssets) FindByID(_ context.Context, userID, id string) (*domain.Asset, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, a := range r.Assets {
		if a.ID == id && a.UserID == userID {
			return &a, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (r *MemoryAssets) Update(_ context.Context, a *domain.Asset) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i := range r.Assets {
		if r.Assets[i].ID == a.ID && r.Assets[i].UserID == a.UserID {
			r.Assets[i] = *a
			return nil
		}
	}
	return domain.ErrNotFound
}

func (r *MemoryAssets) Delete(_ context.Context, userID, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i, a := range r.Assets {
		if a.ID == id && a.UserID == userID {
			r.Assets = append(r.Assets[:i], r.Assets[i+1:]...)
			return nil
		}
	}
	return domain.ErrNotFound
}
