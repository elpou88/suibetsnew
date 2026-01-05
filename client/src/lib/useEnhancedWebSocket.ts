import { useState, useEffect, useCallback, useRef } from 'react';
import { globalWebSocket, ConnectionStatus, EnhancedWebSocket } from './enhancedWebSocket';

/**
 * React hook for using the enhanced WebSocket connection
 */
export function useEnhancedWebSocket(options: {
  onMessage?: (data: any) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  sports?: string[];
  useGlobalInstance?: boolean;
  autoConnect?: boolean;
  debug?: boolean;
} = {}) {
  const {
    onMessage,
    onStatusChange,
    sports = ['all'],
    useGlobalInstance = true,
    autoConnect = true,
    debug = false,
  } = options;

  // Use global instance or create a dedicated instance
  const wsRef = useRef<EnhancedWebSocket>(
    useGlobalInstance ? globalWebSocket : new EnhancedWebSocket({ 
      autoConnect: false,
      debug 
    })
  );
  
  // Track connection status
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    wsRef.current.getStatus()
  );
  
  // Store cleanup functions
  const cleanupFunctions = useRef<(() => void)[]>([]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    wsRef.current.connect();
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    wsRef.current.disconnect();
  }, []);

  // Reconnect to WebSocket
  const reconnect = useCallback(() => {
    wsRef.current.reconnect();
  }, []);

  // Subscribe to sports
  const subscribe = useCallback((sportsList: string[]) => {
    wsRef.current.subscribe(sportsList);
  }, []);

  // Unsubscribe from sports
  const unsubscribe = useCallback((sportsList: string[]) => {
    wsRef.current.unsubscribe(sportsList);
  }, []);

  // Send a custom message
  const send = useCallback((data: any): boolean => {
    return wsRef.current.send(data);
  }, []);

  // Request specific data
  const request = useCallback((requestType: string, params: any = {}): boolean => {
    return wsRef.current.request(requestType, params);
  }, []);

  // Set up event listeners on mount
  useEffect(() => {
    // Register status change callback
    const statusCleanup = wsRef.current.onStatusChange((status) => {
      setConnectionStatus(status);
      onStatusChange?.(status);
    });
    cleanupFunctions.current.push(statusCleanup);

    // Register message callback if provided
    if (onMessage) {
      const messageCleanup = wsRef.current.onMessage(onMessage);
      cleanupFunctions.current.push(messageCleanup);
    }

    // Subscribe to sports if provided
    if (sports.length > 0) {
      wsRef.current.subscribe(sports);
    }

    // Connect if autoConnect is true
    if (autoConnect) {
      wsRef.current.connect();
    }

    // Cleanup on unmount
    return () => {
      // Run all cleanup functions
      cleanupFunctions.current.forEach(cleanup => cleanup());
      cleanupFunctions.current = [];

      // Disconnect if not using global instance
      if (!useGlobalInstance) {
        wsRef.current.disconnect();
      }
    };
  }, [onMessage, onStatusChange, sports, autoConnect, useGlobalInstance]);

  return {
    connectionStatus,
    connect,
    disconnect,
    reconnect,
    subscribe,
    unsubscribe,
    send,
    request,
    wsInstance: wsRef.current
  };
}