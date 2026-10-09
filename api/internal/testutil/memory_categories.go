package testutil

import (
	"context"
	"sort"
	"strings"
	"sync"

	"github.com/leduchuy/money-management/api/internal/domain"
)

// MemoryCategories is an in-memory domain.CategoryRepository with the same
// case-insensitive (user, type, name) uniqueness as the MySQL index.
type MemoryCategories struct {
	mu         sync.Mutex
	categories []domain.Category
}

func (r *MemoryCategories) exists(c domain.Category) bool {
	for _, e := range r.categories {
		if e.UserID == c.UserID && e.Type == c.Type && strings.EqualFold(e.Name, c.Name) {
			return true
		}
	}
	return false
}

func (r *MemoryCategories) List(_ context.Context, userID string) ([]domain.Category, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	var out []domain.Category
	for _, c := range r.categories {
		if c.UserID == userID {
			out = append(out, c)
		}
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].CreatedAt.Before(out[j].CreatedAt) })
	return out, nil
}

func (r *MemoryCategories) Create(_ context.Context, c *domain.Category) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.exists(*c) {
		return domain.ErrCategoryNameTaken
	}
	r.categories = append(r.categories, *c)
	return nil
}

func (r *MemoryCategories) CreateIgnoringDuplicates(_ context.Context, cs []domain.Category) (int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	created := 0
	for _, c := range cs {
		if !r.exists(c) {
			r.categories = append(r.categories, c)
			created++
		}
	}
	return created, nil
}

func (r *MemoryCategories) Delete(_ context.Context, userID, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i, c := range r.categories {
		if c.ID == id && c.UserID == userID {
			r.categories = append(r.categories[:i], r.categories[i+1:]...)
			return nil
		}
	}
	return domain.ErrNotFound
}

func (r *MemoryCategories) FindByID(_ context.Context, userID, id string) (*domain.Category, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, c := range r.categories {
		if c.ID == id && c.UserID == userID {
			found := c
			return &found, nil
		}
	}
	return nil, domain.ErrNotFound
}
