package mysql

import (
	"context"
	"errors"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/leduchuy/money-management/api/internal/domain"
)

type CategoryRepository struct{ db *gorm.DB }

func NewCategoryRepository(db *gorm.DB) *CategoryRepository { return &CategoryRepository{db: db} }

func (r *CategoryRepository) List(ctx context.Context, userID string) ([]domain.Category, error) {
	var models []categoryModel
	if err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("created_at, id").Find(&models).Error; err != nil {
		return nil, err
	}
	out := make([]domain.Category, len(models))
	for i := range models {
		out[i] = models[i].toDomain()
	}
	return out, nil
}

func (r *CategoryRepository) Create(ctx context.Context, c *domain.Category) error {
	err := r.db.WithContext(ctx).Omit(clause.Associations).Create(toCategoryModel(c)).Error
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return domain.ErrCategoryNameTaken
	}
	return err
}

func (r *CategoryRepository) CreateIgnoringDuplicates(ctx context.Context, categories []domain.Category) (int, error) {
	if len(categories) == 0 {
		return 0, nil
	}
	models := make([]*categoryModel, len(categories))
	for i := range categories {
		models[i] = toCategoryModel(&categories[i])
	}
	// MySQL: ON DUPLICATE KEY UPDATE id = id — a no-op for rows that already
	// exist, so concurrent calls can't create duplicates or fail.
	res := r.db.WithContext(ctx).Omit(clause.Associations).Clauses(clause.OnConflict{DoNothing: true}).Create(&models)
	return int(res.RowsAffected), res.Error
}

func (r *CategoryRepository) Delete(ctx context.Context, userID, id string) error {
	// Scoped by user_id so one user can never delete another's category.
	res := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).Delete(&categoryModel{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *CategoryRepository) FindByID(ctx context.Context, userID, id string) (*domain.Category, error) {
	var m categoryModel
	err := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).Take(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	c := m.toDomain()
	return &c, nil
}
