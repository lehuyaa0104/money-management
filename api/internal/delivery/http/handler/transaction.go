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

type TransactionService interface {
	Create(ctx context.Context, userID string, in usecase.CreateTransactionInput) (*domain.Transaction, error)
	List(ctx context.Context, userID string, filter domain.TransactionFilter) ([]domain.Transaction, error)
	Update(ctx context.Context, userID, id string, in usecase.CreateTransactionInput) (*domain.Transaction, error)
	Delete(ctx context.Context, userID, id string) error
}

type TransactionHandler struct{ transactions TransactionService }

func NewTransactionHandler(transactions TransactionService) *TransactionHandler {
	return &TransactionHandler{transactions: transactions}
}

type createTransactionRequest struct {
	Type       string `json:"type"`
	Amount     int64  `json:"amount"`
	CategoryID string `json:"categoryId"`
	Date       string `json:"date"`
	Note       string `json:"note"`
	// RFC 3339, e.g. "2026-10-08T02:30:00.000Z"; optional.
	OccurredAt *time.Time `json:"occurredAt"`
}

type transactionResponse struct {
	ID           string    `json:"id"`
	Type         string    `json:"type"`
	Amount       int64     `json:"amount"`
	CategoryID   *string   `json:"categoryId"` // null once the category is deleted
	CategoryName string    `json:"categoryName"`
	Date         string    `json:"date"`
	Note         string    `json:"note"`
	OccurredAt   time.Time `json:"occurredAt"`
	CreatedAt    time.Time `json:"createdAt"`
}

func toTransactionResponse(t *domain.Transaction) transactionResponse {
	var categoryID *string
	if t.CategoryID != "" {
		categoryID = &t.CategoryID
	}
	return transactionResponse{
		ID: t.ID, Type: string(t.Type), Amount: t.Amount, CategoryID: categoryID, CategoryName: t.CategoryName,
		Date: t.Date, Note: t.Note, OccurredAt: t.OccurredAt, CreatedAt: t.CreatedAt,
	}
}

// Create godoc: POST /api/v1/transactions {type, amount, categoryId, date, note?, occurredAt?} → 201 {transaction}
func (h *TransactionHandler) Create(c *gin.Context) {
	var req createTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeBadRequest(c)
		return
	}
	tx, err := h.transactions.Create(c.Request.Context(), middleware.UserID(c), usecase.CreateTransactionInput{
		Type: domain.TransactionType(req.Type), Amount: req.Amount, CategoryID: req.CategoryID,
		Date: req.Date, Note: req.Note, OccurredAt: req.OccurredAt,
	})
	if err != nil {
		WriteError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"transaction": toTransactionResponse(tx)})
}

// Update godoc: PUT /api/v1/transactions/:id {same body as create} → 200 {transaction}
// Every field is replaced; an omitted occurredAt keeps the old one. 404 if it isn't the user's.
func (h *TransactionHandler) Update(c *gin.Context) {
	var req createTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeBadRequest(c)
		return
	}
	tx, err := h.transactions.Update(c.Request.Context(), middleware.UserID(c), c.Param("id"), usecase.CreateTransactionInput{
		Type: domain.TransactionType(req.Type), Amount: req.Amount, CategoryID: req.CategoryID,
		Date: req.Date, Note: req.Note, OccurredAt: req.OccurredAt,
	})
	if err != nil {
		WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"transaction": toTransactionResponse(tx)})
}

// List godoc: GET /api/v1/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD → {transactions}
// Both bounds are optional and inclusive; results are newest first.
func (h *TransactionHandler) List(c *gin.Context) {
	filter := domain.TransactionFilter{From: c.Query("from"), To: c.Query("to")}
	txs, err := h.transactions.List(c.Request.Context(), middleware.UserID(c), filter)
	if err != nil {
		WriteError(c, err)
		return
	}
	out := make([]transactionResponse, len(txs))
	for i := range txs {
		out[i] = toTransactionResponse(&txs[i])
	}
	c.JSON(http.StatusOK, gin.H{"transactions": out})
}

// Delete godoc: DELETE /api/v1/transactions/:id → 204, or 404 if it isn't the user's.
func (h *TransactionHandler) Delete(c *gin.Context) {
	if err := h.transactions.Delete(c.Request.Context(), middleware.UserID(c), c.Param("id")); err != nil {
		WriteError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
