package testutil

import (
	"context"
	"sort"
	"sync"
	"time"

	"github.com/leduchuy/money-management/api/internal/domain"
)

// MemoryBudgets is an in-memory domain.BudgetRepository (one budget per user+category).
// Set Transactions to compute "spent" like the SQL join does.
type MemoryBudgets struct {
	mu           sync.Mutex
	Budgets      []domain.Budget
	Transactions *MemoryTransactions
}

func (r *MemoryBudgets) Create(_ context.Context, b *domain.Budget) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, e := range r.Budgets {
		if e.UserID == b.UserID && e.CategoryID == b.CategoryID {
			return domain.ErrBudgetExists
		}
	}
	r.Budgets = append(r.Budgets, *b)
	return nil
}

func (r *MemoryBudgets) ListWithSpent(_ context.Context, userID string, from, to time.Time) ([]domain.BudgetUsage, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	fromDate, toDate := from.Format(domain.DateLayout), to.Format(domain.DateLayout)
	out := []domain.BudgetUsage{}
	for _, b := range r.Budgets {
		if b.UserID != userID {
			continue
		}
		usage := domain.BudgetUsage{Budget: b}
		if r.Transactions != nil {
			for _, t := range r.Transactions.Transactions {
				if t.UserID == userID && t.CategoryID == b.CategoryID && t.Type == domain.CategoryExpense &&
					t.Date >= fromDate && t.Date < toDate {
					usage.Spent += t.Amount
				}
			}
		}
		out = append(out, usage)
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].CreatedAt.Before(out[j].CreatedAt) })
	return out, nil
}

func (r *MemoryBudgets) FindByID(_ context.Context, userID, id string) (*domain.Budget, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, b := range r.Budgets {
		if b.ID == id && b.UserID == userID {
			found := b
			return &found, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (r *MemoryBudgets) UpdateLimit(_ context.Context, b *domain.Budget) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i := range r.Budgets {
		if r.Budgets[i].ID == b.ID && r.Budgets[i].UserID == b.UserID {
			r.Budgets[i].Limit, r.Budgets[i].UpdatedAt = b.Limit, b.UpdatedAt
			return nil
		}
	}
	return domain.ErrNotFound
}

func (r *MemoryBudgets) Delete(_ context.Context, userID, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i, b := range r.Budgets {
		if b.ID == id && b.UserID == userID {
			r.Budgets = append(r.Budgets[:i], r.Budgets[i+1:]...)
			return nil
		}
	}
	return domain.ErrNotFound
}
