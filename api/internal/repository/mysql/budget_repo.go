package mysql

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/leduchuy/money-management/api/internal/domain"
)

type BudgetRepository struct{ db *gorm.DB }

func NewBudgetRepository(db *gorm.DB) *BudgetRepository { return &BudgetRepository{db: db} }

func (r *BudgetRepository) Create(ctx context.Context, b *domain.Budget) error {
	err := r.db.WithContext(ctx).Omit(clause.Associations).Create(toBudgetModel(b)).Error
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return domain.ErrBudgetExists
	}
	return err
}

func (r *BudgetRepository) ListWithSpent(ctx context.Context, userID string, from, to time.Time) ([]domain.BudgetUsage, error) {
	// A flat row: scanning into budgetModel (which has association fields) leaves it empty.
	type row struct {
		ID         string
		UserID     string
		CategoryID string
		Limit      int64 `gorm:"column:limit_amount"`
		CreatedAt  time.Time
		UpdatedAt  time.Time
		Spent      int64
	}
	var rows []row
	// LEFT JOIN so budgets with no spending this month still come back (spent = 0).
	err := r.db.WithContext(ctx).Table("budgets AS b").
		Select("b.id, b.user_id, b.category_id, b.limit_amount, b.created_at, b.updated_at, COALESCE(SUM(t.amount), 0) AS spent").
		Joins("LEFT JOIN transactions AS t ON t.category_id = b.category_id AND t.user_id = b.user_id"+
			" AND t.type = ? AND t.date >= ? AND t.date < ?", string(domain.CategoryExpense), from, to).
		Where("b.user_id = ?", userID).
		Group("b.id").
		Order("b.created_at, b.id").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]domain.BudgetUsage, len(rows))
	for i, r := range rows {
		out[i] = domain.BudgetUsage{
			Budget: domain.Budget{ID: r.ID, UserID: r.UserID, CategoryID: r.CategoryID, Limit: r.Limit, CreatedAt: r.CreatedAt, UpdatedAt: r.UpdatedAt},
			Spent:  r.Spent,
		}
	}
	return out, nil
}

func (r *BudgetRepository) FindByID(ctx context.Context, userID, id string) (*domain.Budget, error) {
	var m budgetModel
	err := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).Take(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	b := m.toDomain()
	return &b, nil
}

func (r *BudgetRepository) UpdateLimit(ctx context.Context, b *domain.Budget) error {
	res := r.db.WithContext(ctx).Model(&budgetModel{}).
		Where("id = ? AND user_id = ?", b.ID, b.UserID).
		Updates(map[string]any{"limit_amount": b.Limit, "updated_at": b.UpdatedAt})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *BudgetRepository) Delete(ctx context.Context, userID, id string) error {
	res := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).Delete(&budgetModel{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return domain.ErrNotFound
	}
	return nil
}
