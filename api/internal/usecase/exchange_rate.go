package usecase

import (
	"context"
	"time"

	"github.com/leduchuy/money-management/api/internal/domain"
)

// ExchangeRateUsecase serves today's VND exchange rates from a RateSource, refetched at most once per ttl.
type ExchangeRateUsecase struct {
	cache ttlCache[[]domain.ExchangeRate]
}

func NewExchangeRateUsecase(source RateSource, ttl time.Duration, now Clock) *ExchangeRateUsecase {
	return &ExchangeRateUsecase{cache: ttlCache[[]domain.ExchangeRate]{fetch: source.LatestRates, ttl: ttl, now: now}}
}

// Latest returns how many VND one unit of each currency is worth (the last good result if a refetch fails).
func (u *ExchangeRateUsecase) Latest(ctx context.Context) ([]domain.ExchangeRate, error) {
	return u.cache.get(ctx)
}
