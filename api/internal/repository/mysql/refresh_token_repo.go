package mysql

import (
	"context"
	"errors"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/leduchuy/money-management/api/internal/domain"
)

type RefreshTokenRepository struct{ db *gorm.DB }

func NewRefreshTokenRepository(db *gorm.DB) *RefreshTokenRepository {
	return &RefreshTokenRepository{db: db}
}

func (r *RefreshTokenRepository) Create(ctx context.Context, t *domain.RefreshToken) error {
	return r.db.WithContext(ctx).Omit(clause.Associations).Create(&refreshTokenModel{
		Hash: t.Hash, UserID: t.UserID, ExpiresAt: t.ExpiresAt, CreatedAt: t.CreatedAt,
	}).Error
}

func (r *RefreshTokenRepository) Take(ctx context.Context, hash string) (*domain.RefreshToken, error) {
	var m refreshTokenModel
	err := r.db.WithContext(ctx).Where("hash = ?", hash).Take(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	// Two requests racing with the same token: only the one whose DELETE hits the row wins.
	res := r.db.WithContext(ctx).Where("hash = ?", hash).Delete(&refreshTokenModel{})
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, domain.ErrNotFound
	}
	return &domain.RefreshToken{Hash: m.Hash, UserID: m.UserID, ExpiresAt: m.ExpiresAt, CreatedAt: m.CreatedAt}, nil
}

func (r *RefreshTokenRepository) DeleteByUser(ctx context.Context, userID string) error {
	return r.db.WithContext(ctx).Where("user_id = ?", userID).Delete(&refreshTokenModel{}).Error
}
