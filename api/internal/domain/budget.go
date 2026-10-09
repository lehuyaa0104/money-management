package domain

import (
	"context"
	"time"
)

var (
	ErrBudgetExists             = &Error{Kind: KindConflict, Code: "budget_exists", Message: "Danh mục này đã có ngân sách"}
	ErrBudgetCategoryNotExpense = Validation("budget_category_not_expense", "Chỉ đặt ngân sách cho danh mục chi tiêu")
)

// Budget is a monthly spending limit for one expense category; it applies to every month.
type Budget struct {
	ID         string
	UserID     string
	CategoryID string
	Limit      int64 // VND per month
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

// BudgetUsage is a budget plus what was spent in its category during one month.
type BudgetUsage struct {
	Budget
	Spent int64
}

// CycleRange returns the first day of the cycle that starts in month ("YYYY-MM")
// on startDay (see User.CycleStartDay), and the first day of the next cycle.
func CycleRange(month string, startDay int) (start, next time.Time, err error) {
	m, err := time.Parse(MonthLayout, month)
	if err != nil {
		return time.Time{}, time.Time{}, Validation("month_invalid", "Tháng không hợp lệ")
	}
	if err := ValidateCycleStartDay(startDay); err != nil {
		return time.Time{}, time.Time{}, err
	}
	return cycleStart(m, startDay), cycleStart(m.AddDate(0, 1, 0), startDay), nil
}

// cycleStart clamps startDay to the month's length: 31 → 30/04, 28/02.
func cycleStart(month time.Time, startDay int) time.Time {
	return month.AddDate(0, 0, min(startDay, month.AddDate(0, 1, -1).Day())-1)
}

type BudgetRepository interface {
	// Create returns ErrBudgetExists if the category already has a budget.
	Create(ctx context.Context, budget *Budget) error
	// ListWithSpent returns the user's budgets with the expenses recorded in each
	// budget's category on dates in [from, to), oldest budget first.
	ListWithSpent(ctx context.Context, userID string, from, to time.Time) ([]BudgetUsage, error)
	// FindByID returns ErrNotFound if the budget doesn't exist or isn't the user's.
	FindByID(ctx context.Context, userID, id string) (*Budget, error)
	UpdateLimit(ctx context.Context, budget *Budget) error
	// Delete returns ErrNotFound if the budget doesn't exist or isn't the user's.
	Delete(ctx context.Context, userID, id string) error
}

func (b *Budget) Validate() error {
	if b.CategoryID == "" {
		return Validation("category_required", "Vui lòng chọn danh mục")
	}
	if b.Limit <= 0 {
		return Validation("limit_invalid", "Hạn mức phải lớn hơn 0")
	}
	if b.Limit > MaxAmount {
		return Validation("limit_too_large", "Hạn mức quá lớn")
	}
	return nil
}
