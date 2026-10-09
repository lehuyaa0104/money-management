package usecase

import (
	"context"

	"github.com/leduchuy/money-management/api/internal/domain"
)

// AssetInput holds every editable field of an asset (create and full update).
// Details is the raw JSON object for Kind; it's checked and stored in canonical form.
type AssetInput struct {
	Kind    domain.AssetKind
	Name    string
	Details []byte
}

type AssetUsecase struct {
	assets domain.AssetRepository
	now    Clock
	newID  IDGenerator
}

func NewAssetUsecase(assets domain.AssetRepository, now Clock, newID IDGenerator) *AssetUsecase {
	return &AssetUsecase{assets: assets, now: now, newID: newID}
}

func (u *AssetUsecase) Create(ctx context.Context, userID string, in AssetInput) (*domain.Asset, error) {
	now := u.now()
	asset := &domain.Asset{ID: u.newID(), UserID: userID, Kind: in.Kind, Name: in.Name, Details: in.Details, CreatedAt: now, UpdatedAt: now}
	if err := asset.Prepare(now); err != nil {
		return nil, err
	}
	if err := u.assets.Create(ctx, asset); err != nil {
		return nil, err
	}
	return asset, nil
}

func (u *AssetUsecase) List(ctx context.Context, userID string) ([]domain.Asset, error) {
	return u.assets.List(ctx, userID)
}

// Update replaces the kind, name and details.
func (u *AssetUsecase) Update(ctx context.Context, userID, id string, in AssetInput) (*domain.Asset, error) {
	asset, err := u.assets.FindByID(ctx, userID, id)
	if err != nil {
		return nil, err
	}
	now := u.now()
	asset.Kind, asset.Name, asset.Details, asset.UpdatedAt = in.Kind, in.Name, in.Details, now
	if err := asset.Prepare(now); err != nil {
		return nil, err
	}
	if err := u.assets.Update(ctx, asset); err != nil {
		return nil, err
	}
	return asset, nil
}

func (u *AssetUsecase) Delete(ctx context.Context, userID, id string) error {
	return u.assets.Delete(ctx, userID, id)
}
