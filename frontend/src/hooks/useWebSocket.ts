import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuthStore } from '../contexts/authStore'
import toast from 'react-hot-toast'

export interface WebSocketMessage<T = unknown> {
  type: string
  data?: T
  timestamp: string
}

interface UseWebSocketOptions {
  onAlert?: (message: WebSocketMessage) => void
  onArticle?: (message: WebSocketMessage) => void
  onHealth?: (message: WebSocketMessage) => void
  onDashboardRefresh?: () => void
  showToasts?: boolean
  enabled?: boolean
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    showToasts = true,
    onAlert,
    onArticle,
    onHealth,
    onDashboardRefresh,
    enabled = true
  } = options

  const token = useAuthStore((state) => state.token)
  const organization = useAuthStore((state) => state.organization)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const clientRef = useRef<unknown>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const connect = useCallback(async () => {
    // Don't connect if disabled, no token, or no organization
    if (!enabled || !token || !organization?.id) {
      return
    }

    try {
      // Dynamically import to prevent initialization errors
      const [{ Client }, SockJSModule] = await Promise.all([
        import('@stomp/stompjs'),
        import('sockjs-client')
      ])

      const SockJS = SockJSModule.default || SockJSModule

      // Cleanup existing connection
      if (clientRef.current) {
        try {
          (clientRef.current as { deactivate: () => void }).deactivate()
        } catch {
          // Ignore cleanup errors
        }
      }

      const wsUrl = import.meta.env.VITE_WS_URL || '/ws'

      const client = new Client({
        webSocketFactory: () => new SockJS(wsUrl),
        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },
        debug: (str: string) => {
          if (import.meta.env.DEV) {
            console.log('[STOMP]', str)
          }
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
          setIsConnected(true)
          setConnectionError(null)
          reconnectAttempts.current = 0

          const orgId = organization.id

          // Subscribe to alerts
          client.subscribe(`/topic/org/${orgId}/alerts`, (message: { body: string }) => {
            try {
              const data = JSON.parse(message.body) as WebSocketMessage
              if (onAlert) {
                onAlert(data)
              }
              if (showToasts && data.type === 'NEW_ALERT') {
                const alertData = data.data as { title?: string; severity?: string }
                toast(alertData?.title || 'New alert received', {
                  icon: getSeverityIcon(alertData?.severity),
                })
              }
            } catch (e) {
              console.error('Failed to parse alert message:', e)
            }
          })

          // Subscribe to articles
          client.subscribe(`/topic/org/${orgId}/articles`, (message: { body: string }) => {
            try {
              const data = JSON.parse(message.body) as WebSocketMessage
              if (onArticle) {
                onArticle(data)
              }
            } catch (e) {
              console.error('Failed to parse article message:', e)
            }
          })

          // Subscribe to dashboard refresh
          client.subscribe(`/topic/org/${orgId}/dashboard`, (message: { body: string }) => {
            try {
              const data = JSON.parse(message.body) as WebSocketMessage
              if (data.type === 'STATS_UPDATED' && onDashboardRefresh) {
                onDashboardRefresh()
              }
            } catch (e) {
              console.error('Failed to parse dashboard message:', e)
            }
          })

          // Subscribe to health updates
          client.subscribe('/topic/health', (message: { body: string }) => {
            try {
              const data = JSON.parse(message.body) as WebSocketMessage
              if (onHealth) {
                onHealth(data)
              }
            } catch (e) {
              console.error('Failed to parse health message:', e)
            }
          })

          console.log('[WebSocket] Connected and subscribed to org', orgId)
        },
        onDisconnect: () => {
          setIsConnected(false)
          console.log('[WebSocket] Disconnected')
        },
        onStompError: (frame: { headers: Record<string, string> }) => {
          const errorMessage = frame.headers['message'] || 'WebSocket error'
          setConnectionError(errorMessage)
          console.error('[WebSocket] STOMP error:', errorMessage)
        },
        onWebSocketError: () => {
          reconnectAttempts.current++
          if (reconnectAttempts.current >= maxReconnectAttempts) {
            setConnectionError('Failed to connect after multiple attempts')
            try {
              client.deactivate()
            } catch {
              // Ignore
            }
          }
          console.error('[WebSocket] Connection error')
        },
      })

      clientRef.current = client
      client.activate()
    } catch (error) {
      console.error('[WebSocket] Failed to initialize:', error)
      setConnectionError('Failed to initialize WebSocket')
    }
  }, [token, organization?.id, onAlert, onArticle, onHealth, onDashboardRefresh, showToasts, enabled])

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      try {
        (clientRef.current as { deactivate: () => void }).deactivate()
      } catch {
        // Ignore cleanup errors
      }
      setIsConnected(false)
    }
  }, [])

  useEffect(() => {
    // Only connect after a short delay to ensure app is fully loaded
    const timeoutId = setTimeout(() => {
      connect()
    }, 1000)

    return () => {
      clearTimeout(timeoutId)
      disconnect()
    }
  }, [connect, disconnect])

  return {
    isConnected,
    connectionError,
    reconnect: connect,
    disconnect,
  }
}

function getSeverityIcon(severity?: string): string {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL':
      return '\u{1F6A8}' // siren
    case 'HIGH':
      return '\u26A0\uFE0F' // warning
    case 'MEDIUM':
      return '\u{1F7E1}' // yellow circle
    case 'LOW':
      return '\u{1F535}' // blue circle
    default:
      return '\u{1F514}' // bell
  }
}

export default useWebSocket
