// Package testutil holds in-memory fakes shared by tests.
package testutil

import (
	"context"
	"strings"
	"sync"

	"github.com/leduchuy/money-management/api/internal/domain"
)

// MemoryUsers is an in-memory domain.UserRepository. Username lookups are
// case-insensitive, like the MySQL collation the real repository relies on.
type MemoryUsers struct {
	mu    sync.Mutex
	users []domain.User
}

func (r *MemoryUsers) Create(_ context.Context, u *domain.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, existing := range r.users {
		if strings.EqualFold(existing.Username, u.Username) {
			return domain.ErrUsernameTaken
		}
	}
	r.users = append(r.users, *u)
	return nil
}

func (r *MemoryUsers) FindByUsername(_ context.Context, username string) (*domain.User, error) {
	return r.find(func(u domain.User) bool { return strings.EqualFold(u.Username, username) })
}

func (r *MemoryUsers) FindByID(_ context.Context, id string) (*domain.User, error) {
	return r.find(func(u domain.User) bool { return u.ID == id })
}

func (r *MemoryUsers) UpdateCycleStartDay(_ context.Context, id string, day int) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i := range r.users {
		if r.users[i].ID == id {
			r.users[i].CycleStartDay = day
			return nil
		}
	}
	return domain.ErrNotFound
}

func (r *MemoryUsers) UpdatePasswordHash(_ context.Context, id, hash string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i := range r.users {
		if r.users[i].ID == id {
			r.users[i].PasswordHash = hash
			return nil
		}
	}
	return domain.ErrNotFound
}

func (r *MemoryUsers) find(match func(domain.User) bool) (*domain.User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, u := range r.users {
		if match(u) {
			found := u
			return &found, nil
		}
	}
	return nil, domain.ErrNotFound
}
