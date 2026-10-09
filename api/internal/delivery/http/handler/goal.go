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

type GoalService interface {
	Create(ctx context.Context, userID string, in usecase.GoalInput) (*domain.Goal, error)
	List(ctx context.Context, userID string) ([]domain.Goal, error)
	Update(ctx context.Context, userID, id string, in usecase.GoalInput) (*domain.Goal, error)
	Deposit(ctx context.Context, userID, id string, amount int64) (*domain.Goal, error)
	Withdraw(ctx context.Context, userID, id string, amount int64) (*domain.Goal, error)
	Delete(ctx context.Context, userID, id string) error
}

type GoalHandler struct{ goals GoalService }

func NewGoalHandler(goals GoalService) *GoalHandler { return &GoalHandler{goals: goals} }

type goalRequest struct {
	Name     string `json:"name"`
	Target   int64  `json:"target"`
	Saved    int64  `json:"saved"`
	Deadline string `json:"deadline"`
	Color    string `json:"color"`
	Image    string `json:"image"`
}

func (r goalRequest) toInput() usecase.GoalInput {
	return usecase.GoalInput{Name: r.Name, Target: r.Target, Saved: r.Saved, Deadline: r.Deadline, Color: r.Color, Image: r.Image}
}

type goalResponse struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Target int64  `json:"target"`
	Saved  int64  `json:"saved"`
	// Left out when not set.
	Deadline  string    `json:"deadline,omitempty"`
	Color     string    `json:"color"`
	Image     string    `json:"image,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func toGoalResponse(g *domain.Goal) goalResponse {
	return goalResponse{
		ID: g.ID, Name: g.Name, Target: g.Target, Saved: g.Saved, Deadline: g.Deadline,
		Color: g.Color, Image: g.Image, CreatedAt: g.CreatedAt, UpdatedAt: g.UpdatedAt,
	}
}

// List godoc: GET /api/v1/goals → {goals}, newest first.
func (h *GoalHandler) List(c *gin.Context) {
	goals, err := h.goals.List(c.Request.Context(), middleware.UserID(c))
	if err != nil {
		WriteError(c, err)
		return
	}
	out := make([]goalResponse, len(goals))
	for i := range goals {
		out[i] = toGoalResponse(&goals[i])
	}
	c.JSON(http.StatusOK, gin.H{"goals": out})
}

// Create godoc: POST /api/v1/goals {name, target, saved?, deadline?, color, image?} → 201 {goal}
func (h *GoalHandler) Create(c *gin.Context) {
	var req goalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeBadRequest(c)
		return
	}
	goal, err := h.goals.Create(c.Request.Context(), middleware.UserID(c), req.toInput())
	if err != nil {
		WriteError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"goal": toGoalResponse(goal)})
}

// Update godoc: PUT /api/v1/goals/:id {same fields as create} → 200 {goal}
// Replaces every field: leaving out deadline or image clears it.
func (h *GoalHandler) Update(c *gin.Context) {
	var req goalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeBadRequest(c)
		return
	}
	goal, err := h.goals.Update(c.Request.Context(), middleware.UserID(c), c.Param("id"), req.toInput())
	if err != nil {
		WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"goal": toGoalResponse(goal)})
}

type amountRequest struct {
	Amount int64 `json:"amount"`
}

// Deposit godoc: POST /api/v1/goals/:id/deposit {amount} → 200 {goal}
func (h *GoalHandler) Deposit(c *gin.Context) { h.changeSaved(c, h.goals.Deposit) }

// Withdraw godoc: POST /api/v1/goals/:id/withdraw {amount} → 200 {goal}, 400 withdraw_too_large if amount > saved.
func (h *GoalHandler) Withdraw(c *gin.Context) { h.changeSaved(c, h.goals.Withdraw) }

func (h *GoalHandler) changeSaved(c *gin.Context, change func(ctx context.Context, userID, id string, amount int64) (*domain.Goal, error)) {
	var req amountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeBadRequest(c)
		return
	}
	goal, err := change(c.Request.Context(), middleware.UserID(c), c.Param("id"), req.Amount)
	if err != nil {
		WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"goal": toGoalResponse(goal)})
}

// Delete godoc: DELETE /api/v1/goals/:id → 204, or 404 if it isn't the user's.
func (h *GoalHandler) Delete(c *gin.Context) {
	if err := h.goals.Delete(c.Request.Context(), middleware.UserID(c), c.Param("id")); err != nil {
		WriteError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
