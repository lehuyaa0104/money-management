package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/leduchuy/money-management/api/internal/delivery/http/middleware"
	"github.com/leduchuy/money-management/api/internal/domain"
	"github.com/leduchuy/money-management/api/internal/usecase"
)

type CategoryService interface {
	List(ctx context.Context, userID string) ([]domain.Category, error)
	Create(ctx context.Context, userID string, in usecase.CreateCategoryInput) (*domain.Category, error)
	CreateDefaults(ctx context.Context, userID string) (int, []domain.Category, error)
	Delete(ctx context.Context, userID, id string) error
}

type CategoryHandler struct{ categories CategoryService }

func NewCategoryHandler(categories CategoryService) *CategoryHandler {
	return &CategoryHandler{categories: categories}
}

type createCategoryRequest struct {
	Type  string `json:"type"`
	Name  string `json:"name"`
	Icon  string `json:"icon"`
	Color string `json:"color"`
}

type categoryResponse struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`
	Name      string    `json:"name"`
	Icon      string    `json:"icon"`
	Color     string    `json:"color"`
	CreatedAt time.Time `json:"createdAt"`
}

func toCategoryResponse(c domain.Category) categoryResponse {
	return categoryResponse{ID: c.ID, Type: string(c.Type), Name: c.Name, Icon: c.Icon, Color: c.Color, CreatedAt: c.CreatedAt}
}

func toCategoryResponses(cs []domain.Category) []categoryResponse {
	out := make([]categoryResponse, len(cs))
	for i, c := range cs {
		out[i] = toCategoryResponse(c)
	}
	return out
}

// List godoc: GET /api/v1/categories → {categories}
func (h *CategoryHandler) List(c *gin.Context) {
	categories, err := h.categories.List(c.Request.Context(), middleware.UserID(c))
	if err != nil {
		WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"categories": toCategoryResponses(categories)})
}

// Create godoc: POST /api/v1/categories {type, name, icon, color} → 201 {category}
func (h *CategoryHandler) Create(c *gin.Context) {
	var req createCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeBadRequest(c)
		return
	}
	category, err := h.categories.Create(c.Request.Context(), middleware.UserID(c), usecase.CreateCategoryInput{
		Type: domain.CategoryType(req.Type), Name: req.Name, Icon: req.Icon, Color: req.Color,
	})
	if err != nil {
		WriteError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"category": toCategoryResponse(*category)})
}

// CreateDefaults godoc: POST /api/v1/categories/defaults → {created, categories}
// Adds the built-in categories the user is missing; repeated calls are no-ops.
func (h *CategoryHandler) CreateDefaults(c *gin.Context) {
	created, categories, err := h.categories.CreateDefaults(c.Request.Context(), middleware.UserID(c))
	if err != nil {
		WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"created": created, "categories": toCategoryResponses(categories)})
}

// Delete godoc: DELETE /api/v1/categories/:id → 204, or 404 if it isn't the user's.
func (h *CategoryHandler) Delete(c *gin.Context) {
	if err := h.categories.Delete(c.Request.Context(), middleware.UserID(c), c.Param("id")); err != nil {
		WriteError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
