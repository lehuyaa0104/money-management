package handler

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/leduchuy/money-management/api/internal/delivery/http/middleware"
	"github.com/leduchuy/money-management/api/internal/domain"
	"github.com/leduchuy/money-management/api/internal/usecase"
)

type BudgetService interface {
	Create(ctx context.Context, userID string, in usecase.CreateBudgetInput) (*domain.Budget, error)
	List(ctx context.Context, userID, month string, startDay int) ([]domain.BudgetUsage, error)
	UpdateLimit(ctx context.Context, userID, id string, limit int64) (*domain.Budget, error)
	Delete(ctx context.Context, userID, id string) error
}

type BudgetHandler struct{ budgets BudgetService }

func NewBudgetHandler(budgets BudgetService) *BudgetHandler { return &BudgetHandler{budgets: budgets} }

type createBudgetRequest struct {
	CategoryID string `json:"categoryId"`
	Limit      int64  `json:"limit"`
}

type budgetResponse struct {
	ID         string    `json:"id"`
	CategoryID string    `json:"categoryId"`
	Limit      int64     `json:"limit"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

func toBudgetResponse(b *domain.Budget) budgetResponse {
	return budgetResponse{ID: b.ID, CategoryID: b.CategoryID, Limit: b.Limit, CreatedAt: b.CreatedAt, UpdatedAt: b.UpdatedAt}
}

// Create godoc: POST /api/v1/budgets {categoryId, limit} → 201 {budget}
// The limit applies to every month; a category can have only one budget (409 budget_exists).
func (h *BudgetHandler) Create(c *gin.Context) {
	var req createBudgetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeBadRequest(c)
		return
	}
	budget, err := h.budgets.Create(c.Request.Context(), middleware.UserID(c), usecase.CreateBudgetInput{
		CategoryID: req.CategoryID, Limit: req.Limit,
	})
	if err != nil {
		WriteError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"budget": toBudgetResponse(budget)})
}

type budgetUsageResponse struct {
	budgetResponse
	// Spent in this category during the requested month; remaining = limit - spent (can be negative).
	Spent     int64 `json:"spent"`
	Remaining int64 `json:"remaining"`
}

// List godoc: GET /api/v1/budgets?month=YYYY-MM&startDay=1..31 → {month, budgets: [{…budget, spent, remaining}]}
// startDay is optional (default 1): with 25, month=2026-09 means 25/09 – 24/10.
func (h *BudgetHandler) List(c *gin.Context) {
	month := c.Query("month")
	startDay := 1
	if s, ok := c.GetQuery("startDay"); ok {
		startDay, _ = strconv.Atoi(s) // not a number → 0, rejected as invalid
	}
	usages, err := h.budgets.List(c.Request.Context(), middleware.UserID(c), month, startDay)
	if err != nil {
		WriteError(c, err)
		return
	}
	out := make([]budgetUsageResponse, len(usages))
	for i := range usages {
		out[i] = budgetUsageResponse{
			budgetResponse: toBudgetResponse(&usages[i].Budget),
			Spent:          usages[i].Spent,
			Remaining:      usages[i].Limit - usages[i].Spent,
		}
	}
	c.JSON(http.StatusOK, gin.H{"month": month, "budgets": out})
}

type updateBudgetRequest struct {
	Limit int64 `json:"limit"`
}

// Update godoc: PUT /api/v1/budgets/:id {limit} → 200 {budget}
func (h *BudgetHandler) Update(c *gin.Context) {
	var req updateBudgetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeBadRequest(c)
		return
	}
	budget, err := h.budgets.UpdateLimit(c.Request.Context(), middleware.UserID(c), c.Param("id"), req.Limit)
	if err != nil {
		WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"budget": toBudgetResponse(budget)})
}

// Delete godoc: DELETE /api/v1/budgets/:id → 204, or 404 if it isn't the user's.
func (h *BudgetHandler) Delete(c *gin.Context) {
	if err := h.budgets.Delete(c.Request.Context(), middleware.UserID(c), c.Param("id")); err != nil {
		WriteError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
