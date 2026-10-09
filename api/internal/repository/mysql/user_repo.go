package mysql

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/leduchuy/money-management/api/internal/domain"
)

type UserRepository struct{ db *gorm.DB }

func NewUserRepository(db *gorm.DB) *UserRepository { return &UserRepository{db: db} }

func (r *UserRepository) Create(ctx context.Context, user *domain.User) error {
	err := r.db.WithContext(ctx).Create(toUserModel(user)).Error
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return domain.ErrUsernameTaken
	}
	return err
}

func (r *UserRepository) FindByUsername(ctx context.Context, username string) (*domain.User, error) {
	return r.findOne(ctx, "username = ?", username)
}

func (r *UserRepository) FindByID(ctx context.Context, id string) (*domain.User, error) {
	return r.findOne(ctx, "id = ?", id)
}

func (r *UserRepository) UpdateCycleStartDay(ctx context.Context, id string, day int) error {
	return r.db.WithContext(ctx).Model(&userModel{}).Where("id = ?", id).Update("cycle_start_day", day).Error
}

func (r *UserRepository) findOne(ctx context.Context, query string, arg any) (*domain.User, error) {
	var m userModel
	err := r.db.WithContext(ctx).Where(query, arg).Take(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return m.toDomain(), nil
}
