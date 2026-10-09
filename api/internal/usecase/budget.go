package usecase

import (
	"context"
	"errors"

	"github.com/leduchuy/money-management/api/internal/domain"
)

type CreateBudgetInput struct {
	CategoryID string
	Limit      int64
}

type BudgetUsecase struct {
	budgets    domain.BudgetRepository
	categories domain.CategoryRepository
	now        Clock
	newID      IDGenerator
}

func NewBudgetUsecase(budgets domain.BudgetRepository, categories domain.CategoryRepository, now Clock, newID IDGenerator) *BudgetUsecase {
	return &BudgetUsecase{budgets: budgets, categories: categories, now: now, newID: newID}
}

// Create sets a monthly limit for one of the user's expense categories.
func (u *BudgetUsecase) Create(ctx context.Context, userID string, in CreateBudgetInput) (*domain.Budget, error) {
	now := u.now()
	budget := &domain.Budget{
		ID: u.newID(), UserID: userID, CategoryID: in.CategoryID, Limit: in.Limit, CreatedAt: now, UpdatedAt: now,
	}
	if err := budget.Validate(); err != nil {
		return nil, err
	}

	category, err := u.categories.FindByID(ctx, userID, in.CategoryID)
	if errors.Is(err, domain.ErrNotFound) {
		return nil, domain.ErrCategoryNotFound
	}
	if err != nil {
		return nil, err
	}
	if category.Type != domain.CategoryExpense {
		return nil, domain.ErrBudgetCategoryNotExpense
	}

	if err := u.budgets.Create(ctx, budget); err != nil {
		return nil, err
	}
	return budget, nil
}

// List returns the user's budgets with what was spent in each category during the
// cycle starting in month ("YYYY-MM") on startDay (1 = the calendar month). Nothing
// is reset or stored per cycle: "spent" is summed from that cycle's expenses, so a
// new cycle simply starts from zero.
func (u *BudgetUsecase) List(ctx context.Context, userID, month string, startDay int) ([]domain.BudgetUsage, error) {
	from, to, err := domain.CycleRange(month, startDay)
	if err != nil {
		return nil, err
	}
	return u.budgets.ListWithSpent(ctx, userID, from, to)
}

// UpdateLimit changes a budget's monthly limit.
func (u *BudgetUsecase) UpdateLimit(ctx context.Context, userID, id string, limit int64) (*domain.Budget, error) {
	budget, err := u.budgets.FindByID(ctx, userID, id)
	if err != nil {
		return nil, err
	}
	budget.Limit = limit
	budget.UpdatedAt = u.now()
	if err := budget.Validate(); err != nil {
		return nil, err
	}
	if err := u.budgets.UpdateLimit(ctx, budget); err != nil {
		return nil, err
	}
	return budget, nil
}

func (u *BudgetUsecase) Delete(ctx context.Context, userID, id string) error {
	return u.budgets.Delete(ctx, userID, id)
}
