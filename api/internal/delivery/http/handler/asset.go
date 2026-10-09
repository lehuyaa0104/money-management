package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/leduchuy/money-management/api/internal/delivery/http/middleware"
	"github.com/leduchuy/money-management/api/internal/domain"
	"github.com/leduchuy/money-management/api/internal/usecase"
)

type AssetService interface {
	Create(ctx context.Context, userID string, in usecase.AssetInput) (*domain.Asset, error)
	List(ctx context.Context, userID string) ([]domain.Asset, error)
	Update(ctx context.Context, userID, id string, in usecase.AssetInput) (*domain.Asset, error)
	Delete(ctx context.Context, userID, id string) error
}

type AssetHandler struct{ assets AssetService }

func NewAssetHandler(assets AssetService) *AssetHandler { return &AssetHandler{assets: assets} }

type assetRequest struct {
	Kind    string          `json:"kind"`
	Name    string          `json:"name"`
	Details json.RawMessage `json:"details"` // shape depends on kind; see domain.SavingsDetails / FundDetails
}

func (r assetRequest) toInput() usecase.AssetInput {
	return usecase.AssetInput{Kind: domain.AssetKind(r.Kind), Name: r.Name, Details: r.Details}
}

type assetResponse struct {
	ID        string          `json:"id"`
	Kind      string          `json:"kind"`
	Name      string          `json:"name"`
	Details   json.RawMessage `json:"details"`
	CreatedAt time.Time       `json:"createdAt"`
	UpdatedAt time.Time       `json:"updatedAt"`
}

func toAssetResponse(a *domain.Asset) assetResponse {
	return assetResponse{ID: a.ID, Kind: string(a.Kind), Name: a.Name, Details: a.Details, CreatedAt: a.CreatedAt, UpdatedAt: a.UpdatedAt}
}

// List godoc: GET /api/v1/assets → {assets}, newest first.
func (h *AssetHandler) List(c *gin.Context) {
	assets, err := h.assets.List(c.Request.Context(), middleware.UserID(c))
	if err != nil {
		WriteError(c, err)
		return
	}
	out := make([]assetResponse, len(assets))
	for i := range assets {
		out[i] = toAssetResponse(&assets[i])
	}
	c.JSON(http.StatusOK, gin.H{"assets": out})
}

// Create godoc: POST /api/v1/assets {kind: savings|fund, name, details} → 201 {asset}
func (h *AssetHandler) Create(c *gin.Context) {
	var req assetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeBadRequest(c)
		return
	}
	asset, err := h.assets.Create(c.Request.Context(), middleware.UserID(c), req.toInput())
	if err != nil {
		WriteError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"asset": toAssetResponse(asset)})
}

// Update godoc: PUT /api/v1/assets/:id {same body as create} → 200 {asset}; replaces kind, name and details.
func (h *AssetHandler) Update(c *gin.Context) {
	var req assetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeBadRequest(c)
		return
	}
	asset, err := h.assets.Update(c.Request.Context(), middleware.UserID(c), c.Param("id"), req.toInput())
	if err != nil {
		WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"asset": toAssetResponse(asset)})
}

// Delete godoc: DELETE /api/v1/assets/:id → 204, or 404 if it isn't the user's.
func (h *AssetHandler) Delete(c *gin.Context) {
	if err := h.assets.Delete(c.Request.Context(), middleware.UserID(c), c.Param("id")); err != nil {
		WriteError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
