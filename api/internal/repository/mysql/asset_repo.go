package mysql

import (
	"context"
	"errors"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/leduchuy/money-management/api/internal/domain"
)

type AssetRepository struct{ db *gorm.DB }

func NewAssetRepository(db *gorm.DB) *AssetRepository { return &AssetRepository{db: db} }

func (r *AssetRepository) Create(ctx context.Context, a *domain.Asset) error {
	return r.db.WithContext(ctx).Omit(clause.Associations).Create(toAssetModel(a)).Error
}

func (r *AssetRepository) List(ctx context.Context, userID string) ([]domain.Asset, error) {
	var models []assetModel
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("created_at DESC, id").Find(&models).Error
	if err != nil {
		return nil, err
	}
	out := make([]domain.Asset, len(models))
	for i := range models {
		out[i] = models[i].toDomain()
	}
	return out, nil
}

func (r *AssetRepository) FindByID(ctx context.Context, userID, id string) (*domain.Asset, error) {
	var m assetModel
	err := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).Take(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	a := m.toDomain()
	return &a, nil
}

func (r *AssetRepository) Update(ctx context.Context, a *domain.Asset) error {
	res := r.db.WithContext(ctx).Model(&assetModel{}).
		Where("id = ? AND user_id = ?", a.ID, a.UserID).
		Updates(map[string]any{"kind": string(a.Kind), "name": a.Name, "details": a.Details, "updated_at": a.UpdatedAt})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *AssetRepository) Delete(ctx context.Context, userID, id string) error {
	res := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).Delete(&assetModel{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return domain.ErrNotFound
	}
	return nil
}
