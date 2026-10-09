package mysql

import (
	"context"
	"errors"

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

func (r *TransactionRepository) FindByID(ctx context.Context, userID, id string) (*domain.Transaction, error) {
	var m transactionModel
	err := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).Take(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	tx := m.toDomain()
	return &tx, nil
}

func (r *TransactionRepository) Update(ctx context.Context, tx *domain.Transaction) error {
	m, err := toTransactionModel(tx)
	if err != nil {
		return err
	}
	res := r.db.WithContext(ctx).Model(&transactionModel{}).
		Where("id = ? AND user_id = ?", tx.ID, tx.UserID).
		Updates(map[string]any{
			"category_id": m.CategoryID, "category_name": m.CategoryName, "type": m.Type, "amount": m.Amount,
			"date": m.Date, "note": m.Note, "occurred_at": m.OccurredAt,
		})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return domain.ErrNotFound
	}
	return nil
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
