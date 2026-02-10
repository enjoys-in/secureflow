package middleware

import (
	"errors"

	"github.com/gofiber/fiber/v2"

	"github.com/enjoys-in/secureflow/internal/constants"
)

// ErrorHandler is a custom Fiber error handler that converts AppError instances
// to structured JSON responses. Use this as app's ErrorHandler config.
func ErrorHandler(c *fiber.Ctx, err error) error {
	var appErr *constants.AppError
	if errors.As(err, &appErr) {
		return c.Status(appErr.Status).JSON(fiber.Map{
			"error":   appErr.Code,
			"message": appErr.Message,
		})
	}

	// Handle Fiber errors
	var fiberErr *fiber.Error
	if errors.As(err, &fiberErr) {
		return c.Status(fiberErr.Code).JSON(fiber.Map{
			"error":   "HTTP_ERROR",
			"message": fiberErr.Message,
		})
	}

	// Fallback for unexpected errors
	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
		"error":   "INTERNAL_ERROR",
		"message": "an unexpected error occurred",
	})
}
