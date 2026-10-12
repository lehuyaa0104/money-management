package vietcombank_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/leduchuy/money-management/api/internal/infrastructure/vietcombank"
)

const feed = `<!--For reference only. Only one request every 5 minutes!-->
<ExrateList>
  <DateTime>10/12/2026 10:05:42 AM</DateTime>
  <Exrate CurrencyCode="USD" CurrencyName="US DOLLAR           " Buy="25,370.00" Transfer="25,400.00" Sell="25,760.00" />
  <Exrate CurrencyCode="DKK" CurrencyName="DANISH KRONE        " Buy="-" Transfer="-" Sell="3,957.32" />
  <Exrate CurrencyCode="JPY" CurrencyName="YEN                 " Buy="158.48" Transfer="160.08" Sell="169.53" />
  <Exrate CurrencyCode="XXX" CurrencyName="BROKEN              " Buy="-" Transfer="-" Sell="-" />
  <Source>Vietcombank</Source>
</ExrateList>`

func TestLatestRates(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte(feed)) }))
	defer srv.Close()
	c := &vietcombank.Client{URL: srv.URL, HTTP: srv.Client()}
	rates, err := c.LatestRates(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	got := map[string]float64{}
	for _, r := range rates {
		got[r.Code] = r.VND
	}
	// Transfer rate; sell rate when there's no transfer rate; no quote at all → left out.
	if len(got) != 3 || got["USD"] != 25400 || got["JPY"] != 160.08 || got["DKK"] != 3957.32 || rates[0].Name != "US DOLLAR" {
		t.Fatalf("rates = %+v", rates)
	}

	empty := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte(`<ExrateList></ExrateList>`)) }))
	defer empty.Close()
	if _, err := (&vietcombank.Client{URL: empty.URL, HTTP: empty.Client()}).LatestRates(context.Background()); err == nil {
		t.Fatal("no rates: want an error")
	}
}
