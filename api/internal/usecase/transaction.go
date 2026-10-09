package usecase

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/leduchuy/money-management/api/internal/domain"
)

type CreateTransactionInput struct {
	Type       domain.TransactionType
	Amount     int64
	CategoryID string
	Date       string
	Note       string
	// OccurredAt is optional; defaults to now.
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
	if err := tx.Validate(); err != nil {
		return nil, err
	}

	// The category must be one of the user's, of the same type (no expense filed under "Lương").
	category, err := u.categories.FindByID(ctx, userID, in.CategoryID)
	if errors.Is(err, domain.ErrNotFound) {
		return nil, domain.ErrCategoryNotFound
	}
	if err != nil {
		return nil, err
	}
	if category.Type != tx.Type {
		return nil, domain.ErrCategoryTypeMismatch
	}
	tx.CategoryName = category.Name

	if err := u.transactions.Create(ctx, tx); err != nil {
		return nil, err
	}
	return tx, nil
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
