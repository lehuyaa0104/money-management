package usecase

import (
	"context"
	"sync"
	"time"
)

// ttlCache keeps the last good result of fetch for ttl, so an external source (an
// unofficial distributor or bank feed) isn't called on every request.
type ttlCache[T any] struct {
	fetch func(ctx context.Context) (T, error)
	ttl   time.Duration
	now   Clock

	mu        sync.Mutex // held while fetching, so concurrent requests share one fetch
	value     T
	ok        bool
	fetchedAt time.Time
}

// get returns the cached value while fresh. When a refetch fails, the last good value
// is returned instead; the error surfaces only if there has never been one.
func (c *ttlCache[T]) get(ctx context.Context) (T, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.ok && c.now().Sub(c.fetchedAt) < c.ttl {
		return c.value, nil
	}
	v, err := c.fetch(ctx)
	if err != nil {
		if c.ok {
			return c.value, nil
		}
		var zero T
		return zero, err
	}
	c.value, c.ok, c.fetchedAt = v, true, c.now()
	return v, nil
}
