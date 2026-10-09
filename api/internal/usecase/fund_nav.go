package usecase

import (
	"context"
	"sync"
	"time"

	"github.com/leduchuy/money-management/api/internal/domain"
)

// FundNavUsecase serves the latest fund NAVs from a NavSource, refetching at most
// once per ttl so the source (an unofficial distributor API) isn't called on every request.
type FundNavUsecase struct {
	source NavSource
	ttl    time.Duration
	now    Clock

	mu        sync.Mutex // held while fetching, so concurrent requests share one fetch
	cached    []domain.FundNav
	fetchedAt time.Time
}

func NewFundNavUsecase(source NavSource, ttl time.Duration, now Clock) *FundNavUsecase {
	return &FundNavUsecase{source: source, ttl: ttl, now: now}
}

// Latest returns each fund's newest NAV. When a refetch fails, the last good result is
// returned instead; the error surfaces only if there has never been one.
func (u *FundNavUsecase) Latest(ctx context.Context) ([]domain.FundNav, error) {
	u.mu.Lock()
	defer u.mu.Unlock()
	if u.cached != nil && u.now().Sub(u.fetchedAt) < u.ttl {
		return u.cached, nil
	}
	navs, err := u.source.LatestNavs(ctx)
	if err != nil {
		if u.cached != nil {
			return u.cached, nil
		}
		return nil, err
	}
	u.cached, u.fetchedAt = navs, u.now()
	return navs, nil
}
