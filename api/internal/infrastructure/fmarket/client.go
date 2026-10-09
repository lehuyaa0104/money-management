// Package fmarket reads fund NAVs from Fmarket (fmarket.vn), a fund distributor.
//
// shortcut: this is the JSON API Fmarket's own website calls, not a documented one; it can
// change without notice (the app then falls back to NAVs typed by the user). Switch to an
// official feed (e.g. from the fund manager) if one becomes available.
package fmarket

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"time"

	"github.com/leduchuy/money-management/api/internal/domain"
)

// Products maps the funds' current codes to Fmarket's product ids. Fmarket still lists
// Dragon Capital's funds under their old VFM codes (DCDS is VFMVF1, and so on).
var Products = map[string]int{
	"DCDS": 28,  // VFMVF1 – Quỹ Đầu tư Chứng khoán Năng động DC
	"DCDE": 25,  // VFMVF4 – Quỹ Đầu tư Cổ phiếu Tập trung Cổ tức DC
	"DCBF": 27,  // VFMVFB – Quỹ Đầu tư Trái phiếu DC
	"DCIP": 67,  // VFMVFC – Quỹ Đầu tư Trái phiếu Gia tăng Thu nhập Cố định DC
	"DCBA": 118, // DCBA   – Quỹ Đầu tư Cân bằng DC
}

// Vietnam doesn't observe DST; NAV dates are its calendar days.
var vietnam = time.FixedZone("ICT", 7*3600)

type Client struct {
	BaseURL  string
	HTTP     *http.Client
	Products map[string]int
	Now      func() time.Time
}

func New() *Client {
	return &Client{BaseURL: "https://api.fmarket.vn", HTTP: &http.Client{Timeout: 10 * time.Second}, Products: Products, Now: time.Now}
}

// LatestNavs returns the newest NAV of every fund it could fetch; it fails only if none worked.
func (c *Client) LatestNavs(ctx context.Context) ([]domain.FundNav, error) {
	codes := make([]string, 0, len(c.Products))
	for code := range c.Products {
		codes = append(codes, code)
	}
	sort.Strings(codes)

	today := c.Now().In(vietnam)
	// Two weeks covers holidays (Tết closes the market for about a week).
	from, to := today.AddDate(0, 0, -14).Format("20060102"), today.Format("20060102")
	var navs []domain.FundNav
	var errs []error
	for _, code := range codes {
		nav, err := c.latest(ctx, code, c.Products[code], from, to)
		if err != nil {
			errs = append(errs, fmt.Errorf("%s: %w", code, err))
			continue
		}
		navs = append(navs, nav)
	}
	if len(navs) == 0 {
		return nil, fmt.Errorf("fmarket: no NAV fetched: %w", errors.Join(errs...))
	}
	return navs, nil
}

type historyResponse struct {
	Data []struct {
		Nav     float64 `json:"nav"`
		NavDate string  `json:"navDate"` // YYYY-MM-DD
	} `json:"data"`
}

func (c *Client) latest(ctx context.Context, code string, productID int, from, to string) (domain.FundNav, error) {
	body, _ := json.Marshal(map[string]any{"isAllData": 0, "productId": productID, "fromDate": from, "toDate": to})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+"/res/product/get-nav-history", bytes.NewReader(body))
	if err != nil {
		return domain.FundNav{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	res, err := c.HTTP.Do(req)
	if err != nil {
		return domain.FundNav{}, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return domain.FundNav{}, fmt.Errorf("status %d", res.StatusCode)
	}
	var h historyResponse
	if err := json.NewDecoder(res.Body).Decode(&h); err != nil {
		return domain.FundNav{}, err
	}
	var best domain.FundNav
	for _, row := range h.Data {
		if _, err := time.Parse(domain.DateLayout, row.NavDate); err != nil || row.Nav <= 0 {
			continue // skip anything that doesn't look like a NAV
		}
		if row.NavDate > best.Date {
			best = domain.FundNav{Code: code, Nav: row.Nav, Date: row.NavDate}
		}
	}
	if best.Date == "" {
		return domain.FundNav{}, errors.New("no NAV in the last two weeks")
	}
	return best, nil
}
