package usecase

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/leduchuy/money-management/api/internal/domain"
)

// CreateTransactionInput is also what Update takes: every field is replaced.
type CreateTransactionInput struct {
	Type       domain.TransactionType
	Amount     int64
	CategoryID string
	Date       string
	Note       string
	// OccurredAt is optional; defaults to now (Update: keeps the old value).
	OccurredAt *time.Time
}

type TransactionUsecase struct {
	transactions domain.TransactionRepository
	categories   domain.CategoryRepository
	now          Clock
	newID        IDGenerator
}

func NewTransactionUsecase(transactions domain.TransactionRepository, categories domain.CategoryRepository, now Clock, newID IDGenerator) *TransactionUsecase {
	return &TransactionUsecase{transactions: transactions, categories: categories, now: now, newID: newID}
}

func (u *TransactionUsecase) Create(ctx context.Context, userID string, in CreateTransactionInput) (*domain.Transaction, error) {
	now := u.now()
	occurredAt := now
	if in.OccurredAt != nil {
		occurredAt = in.OccurredAt.UTC().Truncate(time.Millisecond)
	}
	tx := &domain.Transaction{
		ID:         u.newID(),
		UserID:     userID,
		Type:       in.Type,
		Amount:     in.Amount,
		CategoryID: in.CategoryID,
		Date:       in.Date,
		Note:       strings.TrimSpace(in.Note),
		OccurredAt: occurredAt,
		CreatedAt:  now,
	}
	if err := u.validate(ctx, tx); err != nil {
		return nil, err
	}
	if err := u.transactions.Create(ctx, tx); err != nil {
		return nil, err
	}
	return tx, nil
}

// Update replaces the fields of one of the user's transactions.
func (u *TransactionUsecase) Update(ctx context.Context, userID, id string, in CreateTransactionInput) (*domain.Transaction, error) {
	tx, err := u.transactions.FindByID(ctx, userID, id)
	if err != nil {
		return nil, err
	}
	tx.Type, tx.Amount, tx.CategoryID, tx.Date, tx.Note = in.Type, in.Amount, in.CategoryID, in.Date, strings.TrimSpace(in.Note)
	if in.OccurredAt != nil {
		tx.OccurredAt = in.OccurredAt.UTC().Truncate(time.Millisecond)
	}
	if err := u.validate(ctx, tx); err != nil {
		return nil, err
	}
	if err := u.transactions.Update(ctx, tx); err != nil {
		return nil, err
	}
	return tx, nil
}

// validate checks tx and fills in its category's current name.
func (u *TransactionUsecase) validate(ctx context.Context, tx *domain.Transaction) error {
	if err := tx.Validate(); err != nil {
		return err
	}
	// The category must be one of the user's, of the same type (no expense filed under "Lương").
	category, err := u.categories.FindByID(ctx, tx.UserID, tx.CategoryID)
	if errors.Is(err, domain.ErrNotFound) {
		return domain.ErrCategoryNotFound
	}
	if err != nil {
		return err
	}
	if category.Type != tx.Type {
		return domain.ErrCategoryTypeMismatch
	}
	tx.CategoryName = category.Name
	return nil
}

func (u *TransactionUsecase) List(ctx context.Context, userID string, filter domain.TransactionFilter) ([]domain.Transaction, error) {
	if err := filter.Validate(); err != nil {
		return nil, err
	}
	return u.transactions.List(ctx, userID, filter)
}

func (u *TransactionUsecase) Delete(ctx context.Context, userID, id string) error {
	return u.transactions.Delete(ctx, userID, id)
}
