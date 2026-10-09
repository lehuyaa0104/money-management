package usecase_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/leduchuy/money-management/api/internal/domain"
	"github.com/leduchuy/money-management/api/internal/usecase"
)

type fakeNavSource struct {
	calls int
	navs  []domain.FundNav
	err   error
}

func (f *fakeNavSource) LatestNavs(context.Context) ([]domain.FundNav, error) {
	f.calls++
	return f.navs, f.err
}

func TestFundNavCache(t *testing.T) {
	ctx := context.Background()
	clock := fixedNow
	src := &fakeNavSource{err: errors.New("down")}
	uc := usecase.NewFundNavUsecase(src, time.Hour, func() time.Time { return clock })

	if _, err := uc.Latest(ctx); err == nil {
		t.Fatal("no NAV ever fetched: the error must surface")
	}

	src.navs, src.err = []domain.FundNav{{Code: "DCDS", Nav: 93099.64, Date: "2026-10-09"}}, nil
	if navs, err := uc.Latest(ctx); err != nil || len(navs) != 1 || src.calls != 2 {
		t.Fatalf("fetch: %v %v (calls %d)", navs, err, src.calls)
	}
	clock = clock.Add(59 * time.Minute)
	if _, _ = uc.Latest(ctx); src.calls != 2 {
		t.Fatalf("within the TTL the source must not be called again (calls %d)", src.calls)
	}

	clock = clock.Add(2 * time.Minute)
	src.navs, src.err = nil, errors.New("down again")
	navs, err := uc.Latest(ctx)
	if err != nil || len(navs) != 1 || navs[0].Nav != 93099.64 || src.calls != 3 {
		t.Fatalf("a failed refetch must keep the last good NAVs: %v %v (calls %d)", navs, err, src.calls)
	}
}
