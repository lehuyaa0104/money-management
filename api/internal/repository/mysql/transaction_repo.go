package mysql

import (
	"context"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/leduchuy/money-management/api/internal/domain"
)

type TransactionRepository struct{ db *gorm.DB }

func NewTransactionRepository(db *gorm.DB) *TransactionRepository {
	return &TransactionRepository{db: db}
}

func (r *TransactionRepository) Create(ctx context.Context, tx *domain.Transaction) error {
	m, err := toTransactionModel(tx)
	if err != nil {
		return err
	}
	return r.db.WithContext(ctx).Omit(clause.Associations).Create(m).Error
}

func (r *TransactionRepository) List(ctx context.Context, userID string, f domain.TransactionFilter) ([]domain.Transaction, error) {
	q := r.db.WithContext(ctx).Where("user_id = ?", userID)
	// Range on the (user_id, date) index; bounds were validated by the use case.
	if f.From != "" {
		q = q.Where("date >= ?", f.From)
	}
	if f.To != "" {
		q = q.Where("date <= ?", f.To)
	}
	var models []transactionModel
	if err := q.Order("date DESC, occurred_at DESC, id").Find(&models).Error; err != nil {
		return nil, err
	}
	out := make([]domain.Transaction, len(models))
	for i := range models {
		out[i] = models[i].toDomain()
	}
	return out, nil
}

func (r *TransactionRepository) Delete(ctx context.Context, userID, id string) error {
	// Scoped by user_id so one user can never delete another's transaction.
	res := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).Delete(&transactionModel{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return domain.ErrNotFound
	}
	return nil
}
