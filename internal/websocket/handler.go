package websocket

import (
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/enjoys-in/secureflow/internal/security"
)

// UpgradeMiddleware checks that the request is a WebSocket upgrade and
// validates the JWT token from a query parameter or cookie.
func UpgradeMiddleware(auth *security.AuthService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if !websocket.IsWebSocketUpgrade(c) {
			return fiber.ErrUpgradeRequired
		}

		// Try query param first, then fall back to cookie
		token := c.Query("token")
		if token == "" {
			token = c.Cookies("secureflow_token")
		}

		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "authentication required for WebSocket connections",
			})
		}

		claims, err := auth.ValidateToken(token)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid or expired token",
			})
		}

		c.Locals("user_id", claims.UserID)
		c.Locals("email", claims.Email)

		return c.Next()
	}
}

// Handler returns the WebSocket handler function that streams events to clients.
func Handler(hub *Hub) fiber.Handler {
	return websocket.New(func(conn *websocket.Conn) {
		clientID := uuid.New().String()
		client := &Client{
			ID:   clientID,
			Send: make(chan []byte, 256),
		}

		hub.Register(client)
		defer hub.Unregister(client)

		// Writer goroutine — sends events to the WebSocket client
		done := make(chan struct{})
		go func() {
			defer close(done)
			ticker := time.NewTicker(30 * time.Second)
			defer ticker.Stop()

			for {
				select {
				case msg, ok := <-client.Send:
					if !ok {
						_ = conn.WriteMessage(websocket.CloseMessage, []byte{})
						return
					}
					if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
						return
					}
				case <-ticker.C:
					if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
						return
					}
				}
			}
		}()

		// Reader — keeps connection alive and reads incoming messages
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				break
			}
		}

		<-done
	})
}
