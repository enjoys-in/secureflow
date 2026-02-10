import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react"

// ---- Event type matching Go backend websocket.Event ----
export interface WSEvent {
  type: string
  timestamp: string
  server?: string
  rule_id?: string
  src_ip?: string
  dst_ip?: string
  protocol?: string
  port?: number
  action?: string
  user?: string
  message?: string
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected"
export type WSListener = (event: WSEvent) => void

interface WebSocketContextValue {
  status: ConnectionStatus
  retryCount: number
  /** Subscribe to incoming events. Returns an unsubscribe function. */
  subscribe: (listener: WSListener) => () => void
  /** Manual reconnect (resets backoff) */
  reconnect: () => void
  /** Disconnect and stop auto-reconnect */
  disconnect: () => void
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

const WS_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8443")
  .replace(/\/api\/v1\/?$/, "")
  .replace(/^http/, "ws")

const INITIAL_RECONNECT_MS = 1000
const MAX_RECONNECT_MS = 30000

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting")
  const [retryCount, setRetryCount] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmounted = useRef(false)
  const retryRef = useRef(0)
  const listenersRef = useRef<Set<WSListener>>(new Set())
  const stoppedRef = useRef(false)

  const subscribe = useCallback((listener: WSListener) => {
    listenersRef.current.add(listener)
    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  const connect = useCallback(() => {
    if (unmounted.current || stoppedRef.current) return

    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
    }
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current)

    const ws = new WebSocket(`${WS_BASE_URL}/ws`)
    wsRef.current = ws
    setStatus("connecting")

    ws.onopen = () => {
      if (unmounted.current) return
      retryRef.current = 0
      setRetryCount(0)
      setStatus("connected")
    }

    ws.onmessage = (e) => {
      if (unmounted.current) return
      try {
        const event: WSEvent = JSON.parse(e.data)
        listenersRef.current.forEach((fn) => fn(event))
      } catch {
        // ignore malformed messages
      }
    }

    ws.onerror = () => {
      if (!unmounted.current) setStatus("disconnected")
    }

    ws.onclose = () => {
      if (unmounted.current || stoppedRef.current) return
      setStatus("disconnected")

      const delay = Math.min(
        INITIAL_RECONNECT_MS * 2 ** retryRef.current,
        MAX_RECONNECT_MS
      )
      retryRef.current += 1
      setRetryCount(retryRef.current)
      reconnectTimer.current = setTimeout(connect, delay)
    }
  }, [])

  const reconnect = useCallback(() => {
    stoppedRef.current = false
    retryRef.current = 0
    setRetryCount(0)
    connect()
  }, [connect])

  const disconnect = useCallback(() => {
    stoppedRef.current = true
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
    }
    setStatus("disconnected")
  }, [])

  useEffect(() => {
    unmounted.current = false
    stoppedRef.current = false
    connect()

    return () => {
      unmounted.current = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
    }
  }, [connect])

  const value: WebSocketContextValue = {
    status,
    retryCount,
    subscribe,
    reconnect,
    disconnect,
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

// ---- Hook ----
export function useWebSocket(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext)
  if (!ctx) {
    throw new Error("useWebSocket must be used within a <WebSocketProvider>")
  }
  return ctx
}
