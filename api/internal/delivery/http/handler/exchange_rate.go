package handler

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/leduchuy/money-management/api/internal/domain"
)

type ExchangeRateService interface {
	Latest(ctx context.Context) ([]domain.ExchangeRate, error)
}

type ExchangeRateHandler struct{ rates ExchangeRateService }

func NewExchangeRateHandler(rates ExchangeRateService) *ExchangeRateHandler {
	return &ExchangeRateHandler{rates: rates}
}

type exchangeRateResponse struct {
	Code string  `json:"code"`
	Name string  `json:"name"`
	VND  float64 `json:"vnd"`
}

// List godoc: GET /api/v1/rates → {rates: [{code, name, vnd}]}: VND per unit of each currency, today.
func (h *ExchangeRateHandler) List(c *gin.Context) {
	rates, err := h.rates.Latest(c.Request.Context())
	if err != nil {
		WriteError(c, err)
		return
	}
	out := make([]exchangeRateResponse, len(rates))
	for i, r := range rates {
		out[i] = exchangeRateResponse{Code: r.Code, Name: r.Name, VND: r.VND}
	}
	c.JSON(http.StatusOK, gin.H{"rates": out})
}
