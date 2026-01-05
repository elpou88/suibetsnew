import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook that provides a WebSocket connection to the live score update service
 * with enhanced stability features and error handling
 */
export function useWebSocketLiveUpdates<T>(options: {
  onScoreUpdate?: (events: T[]) => void;
  onStatusChange?: (status: 'connected' | 'disconnected' | 'error') => void;
  sportFilter?: string[];
  autoReconnect?: boolean;
  pingInterval?: number; // Optional custom ping interval (default: 20000ms)
  maxReconnectAttempts?: number; // Optional maximum reconnect attempts
}) {
  const {
    onScoreUpdate,
    onStatusChange,
    sportFilter = ['all'],
    autoReconnect = true,
    pingInterval = 20000, // 20 seconds between pings
    maxReconnectAttempts = 50, // Increased max attempts
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPongRef = useRef<number>(Date.now());
  const isConnecting = useRef<boolean>(false);

  // Cleanup ping interval to prevent memory leaks
  const clearPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  // Send a ping to the server to keep the connection alive
  const sendPing = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify({
          type: 'ping',
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('[WebSocket] Error sending ping:', error);
      }
    }
  }, []);

  // Start a ping interval to keep the connection alive
  const startPingInterval = useCallback(() => {
    clearPingInterval();
    
    // Send ping every {pingInterval} ms to keep connection alive
    pingIntervalRef.current = setInterval(() => {
      sendPing();
      
      // Check if we haven't received a pong in too long (3x ping interval)
      const now = Date.now();
      if (now - lastPongRef.current > pingInterval * 3) {
        console.warn(`[WebSocket] No pong received for ${(now - lastPongRef.current) / 1000}s. Reconnecting...`);
        
        // Force reconnection if no pong received for too long
        if (ws.current) {
          try {
            ws.current.close();
          } catch (err) {
            console.error('[WebSocket] Error closing stale connection:', err);
          }
        }
      }
    }, pingInterval);
  }, [pingInterval, clearPingInterval, sendPing]);

  // Connect to the WebSocket server with enhanced error handling
  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnecting.current) {
      console.log('[WebSocket] Connection attempt already in progress, skipping');
      return;
    }
    
    try {
      isConnecting.current = true;
      
      // Clear any existing timeouts or intervals
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
      clearPingInterval();
      
      // Close any existing connection
      if (ws.current) {
        try {
          ws.current.close();
        } catch (err) {
          console.error('[WebSocket] Error closing existing connection:', err);
        }
        ws.current = null;
      }

      // Stop if we've tried too many times
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.warn(`[WebSocket] Maximum reconnect attempts (${maxReconnectAttempts}) reached. Giving up.`);
        setConnectionStatus('disconnected');
        onStatusChange?.('disconnected');
        isConnecting.current = false;
        return;
      }

      setConnectionStatus('connecting');
      
      // Create WebSocket connection with correct protocol based on current location
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      
      // Use window.location.host which includes port on Replit
      // Fallback to localhost:5000 if host is not available
      const hostPort = window.location.host && window.location.host !== 'localhost'
        ? window.location.host
        : 'localhost:5000';
      
      const wsUrl = `${protocol}//${hostPort}/ws`;
      
      console.log(`[WebSocket] Connecting to ${wsUrl}`);
      
      // Create new WebSocket with timeout
      const socket = new WebSocket(wsUrl);
      ws.current = socket;
      
      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          console.warn('[WebSocket] Connection timeout. Closing socket.');
          socket.close();
        }
      }, 10000); // 10 second connection timeout

      // Setup event handlers
      socket.onopen = () => {
        console.log('[WebSocket] Connected successfully');
        clearTimeout(connectionTimeout);
        setConnectionStatus('connected');
        onStatusChange?.('connected');
        reconnectAttempts.current = 0;
        lastPongRef.current = Date.now(); // Reset last pong time
        isConnecting.current = false;
        
        // Start sending pings to keep the connection alive
        startPingInterval();
        
        // Subscribe to specific sports if provided
        if (sportFilter && sportFilter.length > 0 && sportFilter[0] !== 'all') {
          socket.send(JSON.stringify({
            type: 'subscribe',
            sports: sportFilter
          }));
        }
        
        // Send initial ping to verify connection
        sendPing();
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Update last pong time for any message received (connection is alive)
          lastPongRef.current = Date.now();
          
          // Handle ping messages to keep connection alive
          if (data.type === 'ping') {
            // Respond with pong to confirm connection is active
            socket.send(JSON.stringify({
              type: 'pong',
              timestamp: Date.now(),
              echo: data.timestamp
            }));
            return;
          }
          
          // Handle pong messages from server
          if (data.type === 'pong') {
            return;
          }
          
          if (data.type === 'score_update' && data.events && onScoreUpdate) {
            onScoreUpdate(data.events);
          }
          
          if (data.type === 'connection') {
            console.log(`[WebSocket] Connection status: ${data.status}`);
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      socket.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log(`[WebSocket] Connection closed (${event.code}: ${event.reason})`);
        setConnectionStatus('disconnected');
        onStatusChange?.('disconnected');
        clearPingInterval();
        isConnecting.current = false;
        
        // Don't attempt to reconnect if the close was clean (code 1000)
        if (autoReconnect && event.code !== 1000) {
          // Use exponential backoff with some randomization for reconnect
          const baseDelay = Math.min(1000 * Math.pow(1.5, reconnectAttempts.current), 30000);
          const jitter = Math.random() * 1000; // Add up to 1 second of jitter
          const delay = baseDelay + jitter;
          
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current += 1;
            connect();
          }, delay);
        }
      };

      socket.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error('[WebSocket] Error:', error);
        setConnectionStatus('error');
        onStatusChange?.('error');
        isConnecting.current = false;
        
        // Socket will auto-close when error occurs, which will trigger onclose handler
      };
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      setConnectionStatus('error');
      onStatusChange?.('error');
      isConnecting.current = false;
      
      // Attempt to reconnect on error
      if (autoReconnect) {
        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts.current), 30000);
        console.log(`[WebSocket] Error reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
        
        reconnectTimeout.current = setTimeout(() => {
          reconnectAttempts.current += 1;
          connect();
        }, delay);
      }
    }
  }, [onScoreUpdate, onStatusChange, sportFilter, autoReconnect, maxReconnectAttempts, clearPingInterval, startPingInterval, sendPing]);

  // Disconnect from the WebSocket server properly
  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    clearPingInterval();
    
    if (ws.current) {
      // Send proper close message when available
      if (ws.current.readyState === WebSocket.OPEN) {
        try {
          // Send a clean disconnect message when possible
          ws.current.send(JSON.stringify({
            type: 'disconnect',
            reason: 'client_disconnect',
            timestamp: Date.now()
          }));
          
          // Use a clean close
          ws.current.close(1000, 'Client disconnect');
        } catch (err) {
          console.error('[WebSocket] Error during clean disconnect:', err);
        }
      } else {
        try {
          ws.current.close();
        } catch (err) {
          console.error('[WebSocket] Error closing socket on disconnect:', err);
        }
      }
      
      ws.current = null;
    }
    
    setConnectionStatus('disconnected');
    reconnectAttempts.current = 0;
  }, [clearPingInterval]);

  // Update subscription when sports filter changes
  const updateSubscription = useCallback((sports: string[]) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify({
          type: 'subscribe',
          sports
        }));
      } catch (error) {
        console.error('[WebSocket] Error updating subscription:', error);
      }
    }
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    
    // Clean up on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Update subscription when sportFilter changes
  useEffect(() => {
    if (sportFilter && sportFilter.length > 0 && ws.current) {
      updateSubscription(sportFilter);
    }
  }, [sportFilter, updateSubscription]);

  // Perform reconnection when network status changes (online/offline)
  useEffect(() => {
    const handleOnline = () => {
      console.log('[WebSocket] Network back online. Reconnecting...');
      // Reset reconnection attempts when network comes back online
      reconnectAttempts.current = 0;
      connect();
    };
    
    // Add event listeners for online/offline status
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [connect]);

  return {
    connectionStatus,
    connect,
    disconnect,
    updateSubscription,
    reconnectAttempts: reconnectAttempts.current
  };
}