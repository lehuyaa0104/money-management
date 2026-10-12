// Package vietcombank reads VND exchange rates from Vietcombank's public rate feed.
//
// shortcut: the XML feed isn't a documented API (it asks for at most one request every
// 5 minutes; the use case caches for an hour). If it changes, amounts are shown in VND
// until it's fixed; switch to a documented provider if that becomes a problem.
package vietcombank

import (
	"context"
	"encoding/xml"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/leduchuy/money-management/api/internal/domain"
)

type Client struct {
	URL  string
	HTTP *http.Client
}

func New() *Client {
	return &Client{
		URL:  "https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx",
		HTTP: &http.Client{Timeout: 10 * time.Second},
	}
}

type exrateList struct {
	Rates []struct {
		Code     string `xml:"CurrencyCode,attr"`
		Name     string `xml:"CurrencyName,attr"`
		Transfer string `xml:"Transfer,attr"`
		Sell     string `xml:"Sell,attr"`
	} `xml:"Exrate"`
}

// LatestRates returns VND per unit for each currency, using the transfer rate (between
// Vietcombank's buy and sell prices), or the sell rate when there is no transfer rate.
func (c *Client) LatestRates(ctx context.Context) ([]domain.ExchangeRate, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.URL, nil)
	if err != nil {
		return nil, err
	}
	res, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("vietcombank: status %d", res.StatusCode)
	}
	var list exrateList
	if err := xml.NewDecoder(res.Body).Decode(&list); err != nil {
		return nil, fmt.Errorf("vietcombank: %w", err)
	}
	var rates []domain.ExchangeRate
	for _, r := range list.Rates {
		vnd, ok := parseRate(r.Transfer)
		if !ok {
			vnd, ok = parseRate(r.Sell)
		}
		code := strings.TrimSpace(r.Code)
		if !ok || domain.ValidateCurrency(code) != nil {
			continue
		}
		rates = append(rates, domain.ExchangeRate{Code: code, Name: strings.TrimSpace(r.Name), VND: vnd})
	}
	if len(rates) == 0 {
		return nil, errors.New("vietcombank: no rates in the feed")
	}
	return rates, nil
}

// parseRate reads "25,400.00"; "-" (no quote) and junk are not rates.
func parseRate(s string) (float64, bool) {
	v, err := strconv.ParseFloat(strings.ReplaceAll(strings.TrimSpace(s), ",", ""), 64)
	return v, err == nil && v > 0
}
