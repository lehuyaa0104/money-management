package testutil

import (
	"context"
	"sort"
	"sync"

	"github.com/leduchuy/money-management/api/internal/domain"
)

// MemoryTransactions is an in-memory domain.TransactionRepository.
type MemoryTransactions struct {
	mu           sync.Mutex
	Transactions []domain.Transaction
}

func (r *MemoryTransactions) Create(_ context.Context, tx *domain.Transaction) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.Transactions = append(r.Transactions, *tx)
	return nil
}

func (r *MemoryTransactions) List(_ context.Context, userID string, f domain.TransactionFilter) ([]domain.Transaction, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := []domain.Transaction{}
	for _, t := range r.Transactions {
		if t.UserID == userID && (f.From == "" || t.Date >= f.From) && (f.To == "" || t.Date <= f.To) {
			out = append(out, t)
		}
	}
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Date != out[j].Date {
			return out[i].Date > out[j].Date
		}
		return out[i].OccurredAt.After(out[j].OccurredAt)
	})
	return out, nil
}

func (r *MemoryTransactions) FindByID(_ context.Context, userID, id string) (*domain.Transaction, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, t := range r.Transactions {
		if t.ID == id && t.UserID == userID {
			return &t, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (r *MemoryTransactions) Update(_ context.Context, tx *domain.Transaction) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i, t := range r.Transactions {
		if t.ID == tx.ID && t.UserID == tx.UserID {
			r.Transactions[i] = *tx
			return nil
		}
	}
	return domain.ErrNotFound
}

func (r *MemoryTransactions) Delete(_ context.Context, userID, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i, t := range r.Transactions {
		if t.ID == id && t.UserID == userID {
			r.Transactions = append(r.Transactions[:i], r.Transactions[i+1:]...)
			return nil
		}
	}
	return domain.ErrNotFound
}
