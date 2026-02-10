package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/enjoys-in/secureflow/pkg/logger"
)

// RequestLogger returns middleware that logs every HTTP request with structured fields.
func RequestLogger(log *logger.Logger) fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		err := c.Next()

		log.Info("HTTP request",
			"method", c.Method(),
			"path", c.Path(),
			"status", c.Response().StatusCode(),
			"duration_ms", time.Since(start).Milliseconds(),
			"ip", c.IP(),
			"user_agent", c.Get("User-Agent"),
		)

		return err
	}
}
