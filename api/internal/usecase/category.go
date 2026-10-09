package usecase

import (
	"context"
	"strings"
	"time"

	"github.com/leduchuy/money-management/api/internal/domain"
)

type CreateCategoryInput struct {
	Type  domain.CategoryType
	Name  string
	Icon  string
	Color string
}

type CategoryUsecase struct {
	repo  domain.CategoryRepository
	now   Clock
	newID IDGenerator
}

func NewCategoryUsecase(repo domain.CategoryRepository, now Clock, newID IDGenerator) *CategoryUsecase {
	return &CategoryUsecase{repo: repo, now: now, newID: newID}
}

func (u *CategoryUsecase) List(ctx context.Context, userID string) ([]domain.Category, error) {
	return u.repo.List(ctx, userID)
}

func (u *CategoryUsecase) Create(ctx context.Context, userID string, in CreateCategoryInput) (*domain.Category, error) {
	category := &domain.Category{
		ID:        u.newID(),
		UserID:    userID,
		Type:      in.Type,
		Name:      strings.Join(strings.Fields(in.Name), " "), // trim + collapse inner spaces
		Icon:      in.Icon,
		Color:     strings.ToLower(in.Color),
		CreatedAt: u.now(),
	}
	if err := category.Validate(); err != nil {
		return nil, err
	}
	if err := u.repo.Create(ctx, category); err != nil {
		return nil, err
	}
	return category, nil
}

// Delete removes one of the user's categories. Transactions keep the category
// name they were saved with; the web app shows them as an unknown category.
func (u *CategoryUsecase) Delete(ctx context.Context, userID, id string) error {
	return u.repo.Delete(ctx, userID, id)
}

// CreateDefaults adds the built-in categories the user doesn't have yet. It is
// safe to call repeatedly: existing ones (same type+name) are skipped.
func (u *CategoryUsecase) CreateDefaults(ctx context.Context, userID string) (created int, all []domain.Category, err error) {
	now := u.now()
	defaults := make([]domain.Category, len(domain.DefaultCategories))
	for i, d := range domain.DefaultCategories {
		defaults[i] = domain.Category{
			ID: u.newID(), UserID: userID, Type: d.Type, Name: d.Name, Icon: d.Icon, Color: d.Color,
			// Spread timestamps so the list keeps the defaults' order.
			CreatedAt: now.Add(time.Duration(i) * time.Millisecond),
		}
	}
	if created, err = u.repo.CreateIgnoringDuplicates(ctx, defaults); err != nil {
		return 0, nil, err
	}
	all, err = u.repo.List(ctx, userID)
	return created, all, err
}
