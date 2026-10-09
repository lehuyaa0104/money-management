package usecase_test

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/leduchuy/money-management/api/internal/domain"
	"github.com/leduchuy/money-management/api/internal/testutil"
	"github.com/leduchuy/money-management/api/internal/usecase"
)

func newAssets() (*usecase.AssetUsecase, *testutil.MemoryAssets) {
	n := 0
	newID := func() string { n++; return fmt.Sprintf("asset-%d", n) }
	repo := &testutil.MemoryAssets{}
	return usecase.NewAssetUsecase(repo, func() time.Time { return fixedNow }, newID), repo
}

const savingsJSON = `{"bank":" Techcombank ","amount":150000000,"rate":5.2,"termMonths":12,"openedAt":"2026-03-20","interestPayout":"maturity","onMaturity":"rollover_all"}`

const fundJSON = `{"code":" dcds ","manager":"Dragon Capital","nav":98500,"navDate":"2026-09-20","transactions":[
	{"id":"t1","type":"buy","date":"2026-03-05","units":100,"amount":9000000,"nav":90000},
	{"id":"t2","type":"sell","date":"2026-08-10","units":60,"amount":7200000,"nav":121000}]}`

func TestAssets(t *testing.T) {
	ctx := context.Background()
	uc, repo := newAssets()

	savings, err := uc.Create(ctx, "u1", usecase.AssetInput{Kind: "savings", Name: "  Quỹ mua nhà ", Details: []byte(savingsJSON)})
	if err != nil {
		t.Fatal(err)
	}
	var sd domain.SavingsDetails
	if err := json.Unmarshal(savings.Details, &sd); err != nil || savings.Name != "Quỹ mua nhà" || sd.Bank != "Techcombank" || sd.Rate != 5.2 {
		t.Fatalf("savings not normalized: %s %q %v", savings.Details, savings.Name, err)
	}

	fund, err := uc.Create(ctx, "u1", usecase.AssetInput{Kind: "fund", Details: []byte(fundJSON)})
	if err != nil {
		t.Fatal(err)
	}
	var fd domain.FundDetails
	if err := json.Unmarshal(fund.Details, &fd); err != nil || fd.Code != "DCDS" || len(fd.Transactions) != 2 || fd.Transactions[0].Units != 100 {
		t.Fatalf("fund not normalized: %s %v", fund.Details, err)
	}

	// A fund with no trades yet is stored with [] rather than null.
	empty, err := uc.Create(ctx, "u1", usecase.AssetInput{Kind: "fund", Details: []byte(`{"code":"DCBF","manager":"","nav":0,"navDate":""}`)})
	if err != nil || !strings.Contains(string(empty.Details), `"transactions":[]`) {
		t.Fatalf("empty fund: %s %v", empty.Details, err)
	}

	if list, _ := uc.List(ctx, "u2"); len(list) != 0 {
		t.Fatalf("another user sees %v", list)
	}
	if _, err := uc.Update(ctx, "u2", fund.ID, usecase.AssetInput{Kind: "savings", Details: []byte(savingsJSON)}); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("someone else's asset = %v", err)
	}
	updated, err := uc.Update(ctx, "u1", savings.ID, usecase.AssetInput{Kind: "savings", Name: "Đổi tên", Details: []byte(strings.Replace(savingsJSON, "5.2", "6", 1))})
	if err != nil || updated.Name != "Đổi tên" || !strings.Contains(string(updated.Details), `"rate":6`) || !updated.CreatedAt.Equal(savings.CreatedAt) {
		t.Fatalf("update: %v %+v", err, updated)
	}
	// A rejected update leaves the stored asset as it was.
	if _, err := uc.Update(ctx, "u1", savings.ID, usecase.AssetInput{Kind: "savings", Details: []byte(`{}`)}); errCode(err) != "bank_required" {
		t.Fatalf("invalid update = %v", err)
	}
	if stored, _ := repo.FindByID(ctx, "u1", savings.ID); stored.Name != "Đổi tên" {
		t.Fatalf("rejected update changed the asset: %+v", stored)
	}
	if err := uc.Delete(ctx, "u1", savings.ID); err != nil {
		t.Fatal(err)
	}
	if err := uc.Delete(ctx, "u1", savings.ID); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("second delete = %v", err)
	}
}

func TestAssetValidation(t *testing.T) {
	uc, _ := newAssets()
	set := func(base, field, value string) string {
		var m map[string]any
		if err := json.Unmarshal([]byte(base), &m); err != nil {
			t.Fatal(err)
		}
		var v any
		if err := json.Unmarshal([]byte(value), &v); err != nil {
			t.Fatal(err)
		}
		m[field] = v
		out, _ := json.Marshal(m)
		return string(out)
	}
	for _, tc := range []struct {
		kind, details, code string
	}{
		{"gold", savingsJSON, "kind_invalid"},
		{"savings", `not json`, "details_invalid"},
		{"savings", ``, "details_invalid"},
		{"savings", set(savingsJSON, "extra", `1`), "details_invalid"},
		{"savings", `{"bank":"A"} {"bank":"B"}`, "details_invalid"},
		{"savings", set(savingsJSON, "bank", `"  "`), "bank_required"},
		{"savings", set(savingsJSON, "amount", `0`), "amount_invalid"},
		{"savings", set(savingsJSON, "rate", `101`), "rate_invalid"},
		{"savings", set(savingsJSON, "termMonths", `-1`), "term_invalid"},
		{"savings", set(savingsJSON, "openedAt", `"20/03/2026"`), "date_invalid"},
		{"savings", set(savingsJSON, "openedAt", `"2026-10-20"`), "date_in_future"},
		{"savings", set(savingsJSON, "interestPayout", `"weekly"`), "interest_payout_invalid"},
		{"savings", set(savingsJSON, "onMaturity", `""`), "on_maturity_invalid"},
		{"fund", set(fundJSON, "code", `""`), "code_required"},
		{"fund", set(fundJSON, "nav", `-1`), "nav_invalid"},
		{"fund", set(fundJSON, "navDate", `"2026-13-01"`), "date_invalid"},
		{"fund", set(fundJSON, "transactions", `[{"id":"t1","type":"buy","date":"2026-03-05","units":1,"amount":1,"nav":1},{"id":"t1","type":"buy","date":"2026-03-06","units":1,"amount":1,"nav":1}]`), "transaction_id_invalid"},
		{"fund", set(fundJSON, "transactions", `[{"id":"t1","type":"gift","date":"2026-03-05","units":1,"amount":1,"nav":1}]`), "transaction_type_invalid"},
		{"fund", set(fundJSON, "transactions", `[{"id":"t1","type":"buy","date":"2026-03-05","units":0,"amount":1,"nav":1}]`), "units_invalid"},
		{"fund", set(fundJSON, "transactions", `[{"id":"t1","type":"buy","date":"2026-03-05","units":1,"amount":1,"nav":0}]`), "nav_invalid"},
		// Sold before it was bought (dates, not list order, decide).
		{"fund", set(fundJSON, "transactions", `[{"id":"b","type":"buy","date":"2026-05-01","units":10,"amount":1000,"nav":100},{"id":"s","type":"sell","date":"2026-04-01","units":5,"amount":600,"nav":120}]`), "fund_oversold"},
		{"fund", set(fundJSON, "transactions", `[{"id":"b","type":"buy","date":"2026-05-01","units":10,"amount":1000,"nav":100},{"id":"s","type":"sell","date":"2026-06-01","units":10.5,"amount":600,"nav":120}]`), "fund_oversold"},
	} {
		if _, err := uc.Create(context.Background(), "u1", usecase.AssetInput{Kind: domain.AssetKind(tc.kind), Details: []byte(tc.details)}); errCode(err) != tc.code {
			t.Errorf("%s %s: got %v, want %s", tc.kind, tc.details, err, tc.code)
		}
	}
	// The client's day may be ahead of UTC: tomorrow (UTC) is still accepted, and so is selling everything.
	ok := set(fundJSON, "transactions", `[{"id":"b","type":"buy","date":"2026-10-09","units":183.47,"amount":20000000,"nav":109000},{"id":"s","type":"sell","date":"2026-10-09","units":183.47,"amount":21000000,"nav":114000}]`)
	if _, err := uc.Create(context.Background(), "u1", usecase.AssetInput{Kind: "fund", Details: []byte(ok)}); err != nil {
		t.Fatalf("sell everything tomorrow = %v", err)
	}
}
