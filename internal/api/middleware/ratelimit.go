package middleware

import (
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
)

type rateLimitEntry struct {
	count   int
	resetAt time.Time
}

// RateLimiter provides per-IP rate limiting middleware.
type RateLimiter struct {
	mu      sync.Mutex
	entries map[string]*rateLimitEntry
	max     int
	window  time.Duration
}

// NewRateLimiter creates a new rate limiter.
// max is the maximum number of requests per window per IP.
func NewRateLimiter(max int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		entries: make(map[string]*rateLimitEntry),
		max:     max,
		window:  window,
	}
	// Periodic cleanup of expired entries
	go func() {
		ticker := time.NewTicker(window)
		defer ticker.Stop()
		for range ticker.C {
			rl.cleanup()
		}
	}()
	return rl
}

// Limit returns a Fiber middleware handler that rate-limits by client IP.
func (rl *RateLimiter) Limit() fiber.Handler {
	return func(c *fiber.Ctx) error {
		ip := c.IP()
		now := time.Now()

		rl.mu.Lock()
		entry, exists := rl.entries[ip]
		if !exists || now.After(entry.resetAt) {
			rl.entries[ip] = &rateLimitEntry{count: 1, resetAt: now.Add(rl.window)}
			rl.mu.Unlock()
			return c.Next()
		}

		entry.count++
		if entry.count > rl.max {
			rl.mu.Unlock()
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   "RATE_LIMITED",
				"message": "too many requests, please try again later",
			})
		}
		rl.mu.Unlock()

		return c.Next()
	}
}

func (rl *RateLimiter) cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()
	for ip, entry := range rl.entries {
		if now.After(entry.resetAt) {
			delete(rl.entries, ip)
		}
	}
}
