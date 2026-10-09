package handler

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/leduchuy/money-management/api/internal/domain"
)

type FundNavService interface {
	Latest(ctx context.Context) ([]domain.FundNav, error)
}

type FundNavHandler struct{ navs FundNavService }

func NewFundNavHandler(navs FundNavService) *FundNavHandler { return &FundNavHandler{navs: navs} }

type fundNavResponse struct {
	Code    string  `json:"code"`
	Nav     float64 `json:"nav"`
	NavDate string  `json:"navDate"`
}

// List godoc: GET /api/v1/funds/navs → {navs: [{code, nav, navDate}]}, the latest NAV of each supported fund.
func (h *FundNavHandler) List(c *gin.Context) {
	navs, err := h.navs.Latest(c.Request.Context())
	if err != nil {
		WriteError(c, err)
		return
	}
	out := make([]fundNavResponse, len(navs))
	for i, n := range navs {
		out[i] = fundNavResponse{Code: n.Code, Nav: n.Nav, NavDate: n.Date}
	}
	c.JSON(http.StatusOK, gin.H{"navs": out})
}
