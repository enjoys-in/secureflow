package websocket

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/enjoys-in/secureflow/internal/constants"
	"github.com/enjoys-in/secureflow/pkg/logger"
)

// Event represents a real-time event sent to WebSocket clients.
type Event struct {
	Type      string    `json:"type"`
	Timestamp time.Time `json:"timestamp"`
	Server    string    `json:"server,omitempty"`
	RuleID    string    `json:"rule_id,omitempty"`
	SrcIP     string    `json:"src_ip,omitempty"`
	DstIP     string    `json:"dst_ip,omitempty"`
	Protocol  string    `json:"protocol,omitempty"`
	Port      int       `json:"port,omitempty"`
	Action    string    `json:"action,omitempty"`
	User      string    `json:"user,omitempty"`
	Message   string    `json:"message,omitempty"`
}

// Client represents a connected WebSocket client.
type Client struct {
	ID   string
	Send chan []byte
}

// Hub manages real-time event broadcasting to connected WebSocket clients.
type Hub struct {
	clients    map[string]*Client
	broadcast  chan Event
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
	logger     *logger.Logger
	ctx        context.Context
	cancel     context.CancelFunc
}

// NewHub creates a new WebSocket hub.
func NewHub(log *logger.Logger) *Hub {
	ctx, cancel := context.WithCancel(context.Background())
	return &Hub{
		clients:    make(map[string]*Client),
		broadcast:  make(chan Event, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		logger:     log,
		ctx:        ctx,
		cancel:     cancel,
	}
}

// Run starts the hub event loop. Should be called in a goroutine.
func (h *Hub) Run() {
	for {
		select {
		case <-h.ctx.Done():
			h.mu.Lock()
			for id, client := range h.clients {
				close(client.Send)
				delete(h.clients, id)
			}
			h.mu.Unlock()
			h.logger.Info("WebSocket hub shut down")
			return

		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.ID] = client
			h.mu.Unlock()
			h.logger.Info("WS client connected", "client_id", client.ID, "total", len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.ID]; ok {
				close(client.Send)
				delete(h.clients, client.ID)
			}
			h.mu.Unlock()
			h.logger.Info("WS client disconnected", "client_id", client.ID)

		case event := <-h.broadcast:
			data, err := json.Marshal(event)
			if err != nil {
				h.logger.Error("Failed to marshal event", "error", err)
				continue
			}

			h.mu.RLock()
			for id, client := range h.clients {
				select {
				case client.Send <- data:
				default:
					h.logger.Warn("WS client buffer full, dropping", "client_id", id)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Register adds a new client.
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// Unregister removes a client.
func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

// Emit sends an event to all connected clients.
func (h *Hub) Emit(event Event) {
	event.Timestamp = time.Now()
	h.broadcast <- event
}

// EmitRuleChange publishes a rule change event.
func (h *Hub) EmitRuleChange(action, ruleID, user string, port int) {
	h.Emit(Event{
		Type:   constants.EventTypeRuleChange,
		Action: action,
		RuleID: ruleID,
		User:   user,
		Port:   port,
	})
}

// EmitError publishes an error event.
func (h *Hub) EmitError(message, user string) {
	h.Emit(Event{
		Type:    constants.EventTypeError,
		Message: message,
		User:    user,
	})
}

// EmitTraffic publishes a traffic event.
func (h *Hub) EmitTraffic(srcIP, dstIP, protocol, action string, port int) {
	h.Emit(Event{
		Type:     constants.EventTypeTraffic,
		SrcIP:    srcIP,
		DstIP:    dstIP,
		Protocol: protocol,
		Action:   action,
		Port:     port,
	})
}

// Shutdown gracefully stops the hub.
func (h *Hub) Shutdown() {
	h.cancel()
}
