package testutil

import (
	"context"
	"sort"
	"sync"

	"github.com/leduchuy/money-management/api/internal/domain"
)

// MemoryGoals is an in-memory domain.GoalRepository.
type MemoryGoals struct {
	mu    sync.Mutex
	Goals []domain.Goal
}

func (r *MemoryGoals) Create(_ context.Context, g *domain.Goal) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.Goals = append(r.Goals, *g)
	return nil
}

func (r *MemoryGoals) List(_ context.Context, userID string) ([]domain.Goal, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := []domain.Goal{}
	for _, g := range r.Goals {
		if g.UserID == userID {
			out = append(out, g)
		}
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out, nil
}

func (r *MemoryGoals) FindByID(_ context.Context, userID, id string) (*domain.Goal, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if i := r.index(userID, id); i >= 0 {
		found := r.Goals[i]
		return &found, nil
	}
	return nil, domain.ErrNotFound
}

func (r *MemoryGoals) Update(_ context.Context, g *domain.Goal) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if i := r.index(g.UserID, g.ID); i >= 0 {
		r.Goals[i] = *g
		return nil
	}
	return domain.ErrNotFound
}

func (r *MemoryGoals) UpdateSaved(_ context.Context, userID, id string, change func(*domain.Goal) error) (*domain.Goal, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	i := r.index(userID, id)
	if i < 0 {
		return nil, domain.ErrNotFound
	}
	g := r.Goals[i]
	if err := change(&g); err != nil {
		return nil, err
	}
	r.Goals[i] = g
	return &g, nil
}

func (r *MemoryGoals) Delete(_ context.Context, userID, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if i := r.index(userID, id); i >= 0 {
		r.Goals = append(r.Goals[:i], r.Goals[i+1:]...)
		return nil
	}
	return domain.ErrNotFound
}

// index must be called with mu held.
func (r *MemoryGoals) index(userID, id string) int {
	for i, g := range r.Goals {
		if g.ID == id && g.UserID == userID {
			return i
		}
	}
	return -1
}
