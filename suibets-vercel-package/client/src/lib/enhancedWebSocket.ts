import { EventEmitter } from 'events';

/**
 * Enhanced WebSocket client with improved reconnection, fallback, and error handling
 */
export class EnhancedWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private isConnecting: boolean = false;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts: number = 0;
  private lastPongTime: number = Date.now();
  private statusChangeCallbacks: ((status: ConnectionStatus) => void)[] = [];
  private messageCallbacks: ((data: any) => void)[] = [];
  private connectionStatus: ConnectionStatus = 'disconnected';
  private subscriptions: string[] = [];

  // Configuration options
  private readonly maxReconnectAttempts: number;
  private readonly reconnectBaseDelay: number; // Base delay in ms
  private readonly pingIntervalTime: number; // Ping interval in ms
  private readonly debug: boolean;

  constructor(options: WebSocketOptions = {}) {
    super();
    
    // Determine the proper WebSocket URL based on the current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    this.url = options.url || `${protocol}//${host}/ws`;
    
    // Configure options with defaults
    this.maxReconnectAttempts = options.maxReconnectAttempts || 50;
    this.reconnectBaseDelay = options.reconnectBaseDelay || 1000;
    this.pingIntervalTime = options.pingIntervalTime || 20000;
    this.debug = options.debug || false;
    
    // Initialize with immediate connection if autoConnect is true
    if (options.autoConnect !== false) {
      this.connect();
    }
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      this.log('Connection attempt already in progress or already connected');
      return;
    }

    this.isConnecting = true;
    this._setStatus('connecting');
    
    // Clear any existing reconnect timeouts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Set a connection timeout to prevent hanging
    const connectionTimeout = setTimeout(() => {
      this.log('Connection attempt timed out');
      if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
        try {
          this.ws.close();
          this.ws = null;
        } catch (err) {
          this.error('Error closing timed-out connection:', err);
        }
        this._setStatus('error');
        this.isConnecting = false;
        this._scheduleReconnect();
      }
    }, 5000); // 5 second timeout
    
    try {
      this.log(`Connecting to ${this.url}`);
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        this.log('Connection established');
        this._setStatus('connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.lastPongTime = Date.now();
        
        // Resubscribe to previous subscriptions
        this._resubscribe();
        
        // Start ping interval
        this._startPingInterval();
      };
      
      this.ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        this.log(`Connection closed (${event.code}: ${event.reason || 'No reason provided'})`);
        this._setStatus('disconnected');
        this.isConnecting = false;
        
        // Clear ping interval
        this._clearPingInterval();
        
        // Schedule reconnect if needed
        this._scheduleReconnect();
      };
      
      this.ws.onerror = (event) => {
        this.error('Error:', event);
        this._setStatus('error');
        // Connection will be closed automatically by the WebSocket API,
        // which will trigger the onclose handler
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle pong response to reset the lastPongTime
          if (data.type === 'pong') {
            this.lastPongTime = Date.now();
            return;
          }
          
          // Handle live score updates
          if (data.type === 'scoreUpdate' || data.type === 'update') {
            this._notifyMessageCallbacks(data);
            return;
          }
          
          // Handle connection status messages
          if (data.type === 'connection') {
            this.log(`Connection status message: ${data.message}`);
            return;
          }
          
          // Handle any other message types
          this._notifyMessageCallbacks(data);
        } catch (err) {
          this.error('Error parsing message:', err, event.data);
        }
      };
    } catch (err) {
      clearTimeout(connectionTimeout);
      this.error('Failed to create WebSocket instance:', err);
      this._setStatus('error');
      this.isConnecting = false;
      this._scheduleReconnect();
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    this._clearPingInterval();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      try {
        this.ws.close(1000, 'Disconnected by client');
      } catch (err) {
        this.error('Error closing WebSocket:', err);
      }
      this.ws = null;
    }
    
    this._setStatus('disconnected');
    this.isConnecting = false;
  }

  /**
   * Subscribe to specific sports or topics
   */
  public subscribe(sports: string[]): void {
    // Create a new array with unique values
    const uniqueSubscriptions = Array.from(new Set([...this.subscriptions, ...sports]));
    this.subscriptions = uniqueSubscriptions;
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'subscribe',
          sports: this.subscriptions
        }));
        
        this.log(`Subscribed to sports: ${this.subscriptions.join(', ')}`);
      } catch (err) {
        this.error('Error sending subscription:', err);
      }
    }
  }

  /**
   * Unsubscribe from specific sports or topics
   */
  public unsubscribe(sports: string[]): void {
    this.subscriptions = this.subscriptions.filter(sport => !sports.includes(sport));
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'unsubscribe',
          sports
        }));
        
        this.log(`Unsubscribed from sports: ${sports.join(', ')}`);
      } catch (err) {
        this.error('Error sending unsubscription:', err);
      }
    }
  }

  /**
   * Register a callback for WebSocket messages
   */
  public onMessage(callback: (data: any) => void): () => void {
    this.messageCallbacks.push(callback);
    
    // Return a function to remove this specific callback
    return () => {
      this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Register a callback for connection status changes
   */
  public onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusChangeCallbacks.push(callback);
    
    // Immediately call with current status
    callback(this.connectionStatus);
    
    // Return a function to remove this specific callback
    return () => {
      this.statusChangeCallbacks = this.statusChangeCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Get current connection status
   */
  public getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Send a custom message to the WebSocket server
   */
  public send(data: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.error('Cannot send message: WebSocket is not connected');
      return false;
    }
    
    try {
      this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    } catch (err) {
      this.error('Error sending message:', err);
      return false;
    }
  }

  /**
   * Request specific data from the server
   */
  public request(requestType: string, params: any = {}): boolean {
    return this.send({
      type: 'request',
      requestType,
      params,
      timestamp: Date.now()
    });
  }

  /**
   * Send a ping to the server
   */
  private _sendPing(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    
    try {
      this.ws.send(JSON.stringify({
        type: 'ping',
        timestamp: Date.now()
      }));
    } catch (err) {
      this.error('Error sending ping:', err);
    }
  }

  /**
   * Start ping interval to keep connection alive
   */
  private _startPingInterval(): void {
    this._clearPingInterval();
    
    this.pingInterval = setInterval(() => {
      this._sendPing();
      
      // Check if we've received a pong recently
      const timeSinceLastPong = Date.now() - this.lastPongTime;
      if (timeSinceLastPong > this.pingIntervalTime * 2) {
        this.log(`No pong received for ${timeSinceLastPong}ms, reconnecting...`);
        this.reconnect();
      }
    }, this.pingIntervalTime);
  }

  /**
   * Clear ping interval
   */
  private _clearPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Schedule a reconnection with exponential backoff
   */
  private _scheduleReconnect(): void {
    if (!this.reconnectTimeout && this.reconnectAttempts < this.maxReconnectAttempts) {
      // Calculate backoff with jitter to prevent server overload
      const jitter = Math.random() * 0.5 + 0.5; // Random between 0.5 and 1
      const delay = Math.min(
        this.reconnectBaseDelay * Math.pow(1.5, Math.min(this.reconnectAttempts, 10)) * jitter,
        30000 // Max 30 seconds
      );
      
      this.log(`Reconnecting in ${delay.toFixed(2)}ms (attempt ${this.reconnectAttempts + 1})`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        this.reconnectAttempts++;
        this.connect();
      }, delay);
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
    }
  }

  /**
   * Reconnect to the WebSocket server
   */
  public reconnect(): void {
    this.disconnect();
    this.connect();
  }

  /**
   * Resubscribe to all previous subscriptions
   */
  private _resubscribe(): void {
    if (this.subscriptions.length > 0) {
      this.subscribe([...this.subscriptions]);
    }
  }

  /**
   * Set the current connection status and notify callbacks
   */
  private _setStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.log(`Connection status changed to: ${status}`);
      
      // Notify all status change callbacks
      this.statusChangeCallbacks.forEach(callback => {
        try {
          callback(status);
        } catch (err) {
          this.error('Error in status change callback:', err);
        }
      });
      
      // Emit status event
      this.emit('status', status);
    }
  }

  /**
   * Notify all message callbacks
   */
  private _notifyMessageCallbacks(data: any): void {
    this.messageCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        this.error('Error in message callback:', err);
      }
    });
    
    // Emit message event
    this.emit('message', data);
  }

  /**
   * Log a message if debug is enabled
   */
  private log(...args: any[]): void {
    if (this.debug) {
      console.log('[WebSocket]', ...args);
    }
  }

  /**
   * Log an error
   */
  private error(...args: any[]): void {
    console.error('[WebSocket]', ...args);
  }
}

// Define types
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectBaseDelay?: number;
  pingIntervalTime?: number;
  debug?: boolean;
}

// Create a singleton instance for global usage
export const globalWebSocket = new EnhancedWebSocket({ debug: true });