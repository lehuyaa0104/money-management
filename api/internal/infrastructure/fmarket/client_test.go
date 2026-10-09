package fmarket_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/leduchuy/money-management/api/internal/infrastructure/fmarket"
)

func TestLatestNavs(t *testing.T) {
	var asked []map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		asked = append(asked, body)
		switch body["productId"] {
		case float64(28): // newest row isn't last; a junk row is skipped
			_, _ = w.Write([]byte(`{"status":200,"data":[{"nav":93571.12,"navDate":"2026-10-07"},{"nav":93099.64,"navDate":"2026-10-09"},{"nav":0,"navDate":"2026-10-10"},{"nav":93665.27,"navDate":"2026-10-08"}]}`))
		case float64(27):
			_, _ = w.Write([]byte(`{"status":200,"data":[]}`)) // nothing recent: left out
		default:
			w.WriteHeader(http.StatusBadGateway)
		}
	}))
	defer srv.Close()

	// 01:00 on the 10th in Vietnam is still the 9th in UTC: dates must follow Vietnam.
	now := time.Date(2026, 10, 9, 18, 0, 0, 0, time.UTC)
	c := &fmarket.Client{BaseURL: srv.URL, HTTP: srv.Client(), Products: map[string]int{"DCDS": 28, "DCBF": 27, "DCBA": 118}, Now: func() time.Time { return now }}
	navs, err := c.LatestNavs(context.Background())
	if err != nil || len(navs) != 1 || navs[0].Code != "DCDS" || navs[0].Nav != 93099.64 || navs[0].Date != "2026-10-09" {
		t.Fatalf("navs = %+v, %v", navs, err)
	}
	if asked[0]["toDate"] != "20261010" || asked[0]["fromDate"] != "20260926" {
		t.Fatalf("date range = %v – %v", asked[0]["fromDate"], asked[0]["toDate"])
	}

	c.Products = map[string]int{"DCBA": 118}
	if _, err := c.LatestNavs(context.Background()); err == nil {
		t.Fatal("no fund fetched: want an error")
	}
}
