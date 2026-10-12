package usecase

import (
	"context"
	"time"

	"github.com/leduchuy/money-management/api/internal/domain"
)

// FundNavUsecase serves the latest fund NAVs from a NavSource, refetched at most once per ttl.
type FundNavUsecase struct{ cache ttlCache[[]domain.FundNav] }

func NewFundNavUsecase(source NavSource, ttl time.Duration, now Clock) *FundNavUsecase {
	return &FundNavUsecase{cache: ttlCache[[]domain.FundNav]{fetch: source.LatestNavs, ttl: ttl, now: now}}
}

// Latest returns each fund's newest NAV (the last good result if a refetch fails).
func (u *FundNavUsecase) Latest(ctx context.Context) ([]domain.FundNav, error) {
	return u.cache.get(ctx)
}
