import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { EventTrackingService } from './eventTrackingService';
import { ApiSportsService } from './apiSportsService';
import { SportEvent } from '../types/betting';
import { apiResilienceService } from './apiResilienceService';
import axios from 'axios';

/**
 * Service for handling live score updates via WebSocket connections
 */
export class LiveScoreUpdateService {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, { subscription: string[], authenticated: boolean }>;
  private apiSportsService: ApiSportsService;
  private eventTrackingService: EventTrackingService;
  private updateInterval: NodeJS.Timeout | null = null;
  private sportUpdateIntervals: { [sport: string]: number } = {
    // Update frequencies for all 14 core sports - using full mapping to ensure consistency
    // Higher frequency (lower time) for fast-paced sports, lower frequency for slower sports
    football: 10000,        // 10 seconds - Football/Soccer (ID: 1)
    soccer: 10000,          // 10 seconds - Soccer alternative name (ID: 26)
    basketball: 5000,       // 5 seconds - Basketball (ID: 2)
    tennis: 15000,          // 15 seconds - Tennis (ID: 3)
    baseball: 20000,        // 20 seconds - Baseball (ID: 4)
    'ice-hockey': 10000,    // 10 seconds - Ice Hockey (ID: 5)
    hockey: 10000,          // 10 seconds - legacy name support
    handball: 15000,        // 15 seconds - Handball (ID: 6)
    volleyball: 10000,      // 10 seconds - Volleyball (ID: 7)
    rugby: 15000,           // 15 seconds - Rugby (ID: 8)
    'rugby-league': 15000,  // 15 seconds - legacy support 
    'rugby-union': 15000,   // 15 seconds - legacy support
    cricket: 30000,         // 30 seconds - Cricket (ID: 9)
    golf: 60000,            // 60 seconds - Golf (ID: 10)
    boxing: 5000,           // 5 seconds - Boxing (ID: 11)
    'mma-ufc': 5000,        // 5 seconds - MMA/UFC (ID: 12)
    mma: 5000,              // 5 seconds - legacy support
    'formula-1': 10000,     // 10 seconds - Formula 1 (ID: 13)
    'formula1': 10000,      // 10 seconds - legacy support
    cycling: 30000,         // 30 seconds - Cycling (ID: 14)
    
    // Additional sports beyond the core 14
    'american-football': 15000, // 15 seconds - American Football (ID: 15)
    'aussie-rules': 15000,      // 15 seconds - Australian Rules Football (ID: 16)
    snooker: 20000,             // 20 seconds - Snooker (ID: 17)
    darts: 10000,               // 10 seconds - Darts (ID: 18)
    'table-tennis': 10000,      // 10 seconds - Table Tennis (ID: 19)
    badminton: 10000,           // 10 seconds - Badminton (ID: 20)
    'beach-volleyball': 10000,  // 10 seconds - Beach Volleyball (ID: 21)
    'winter-sports': 20000,     // 20 seconds - Winter Sports (ID: 22)
    motorsport: 10000,          // 10 seconds - Motorsport (ID: 23)
    esports: 10000,             // 10 seconds - Esports (ID: 24)
    netball: 15000,             // 15 seconds - Netball (ID: 25)
    
    // League-specific mappings
    nba: 5000,                  // 5 seconds - NBA (ID: 27)
    nhl: 10000,                 // 10 seconds - NHL (ID: 28)
    nfl: 15000,                 // 15 seconds - NFL (ID: 29)
    mlb: 20000,                 // 20 seconds - MLB (ID: 30)
    
    // Default fallback for any unmapped sport
    default: 20000              // 20 seconds for all other sports
  };
  
  private liveScores: { [eventId: string]: { score: string, status: string, timestamp: number } } = {};
  private lastBroadcast: number = 0;
  
  constructor(
    server: Server, 
    apiSportsService: ApiSportsService, 
    eventTrackingService: EventTrackingService
  ) {
    // Initialize WebSocket server with the server directly to handle the path properly
    this.wss = new WebSocketServer({ 
      server: server,
      path: '/ws',
      clientTracking: true 
    });
    
    this.clients = new Map();
    this.apiSportsService = apiSportsService;
    this.eventTrackingService = eventTrackingService;
    
    console.log('[LiveScoreUpdateService] WebSocket server initialized on path /ws');
    
    // Set up WebSocket connection handling
    this.setupWebSocketServer();
    
    // Start the update interval for all sports
    this.startUpdateInterval();
  }
  
  /**
   * Set up WebSocket server event handling with enhanced connection stability
   */
  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, request) => {
      console.log('[LiveScoreUpdateService] New client connected');
      
      // Set last activity timestamp
      const clientState = {
        lastActivity: Date.now(),
        pingInterval: null as NodeJS.Timeout | null,
        pongTimeout: null as NodeJS.Timeout | null,
        disconnectTimeout: null as NodeJS.Timeout | null
      };
      
      // Function to reset timers when activity is detected
      const resetActivityTimers = () => {
        clientState.lastActivity = Date.now();
        
        // Clear any existing pong timeout
        if (clientState.pongTimeout) {
          clearTimeout(clientState.pongTimeout);
          clientState.pongTimeout = null;
        }
        
        // Clear any existing disconnect timeout
        if (clientState.disconnectTimeout) {
          clearTimeout(clientState.disconnectTimeout);
          clientState.disconnectTimeout = null;
        }
      };
      
      // Function to send a ping and expect a pong response
      const sendPing = () => {
        if (ws.readyState !== WebSocket.OPEN) {
          // Clean up all intervals/timeouts if socket is no longer open
          cleanupClient();
          return;
        }
        
        try {
          // Send ping with timestamp
          const pingTimestamp = Date.now();
          ws.send(JSON.stringify({ 
            type: 'ping', 
            timestamp: pingTimestamp 
          }));
          
          // Set timeout for pong response (expect response within 10 seconds)
          clientState.pongTimeout = setTimeout(() => {
            if (Date.now() - clientState.lastActivity > 15000) {
              console.warn('[LiveScoreUpdateService] No pong received, connection may be dead');
              
              // Set a final timeout before force-closing the connection
              clientState.disconnectTimeout = setTimeout(() => {
                console.error('[LiveScoreUpdateService] Connection timeout, terminating');
                cleanupClient();
                try {
                  ws.terminate(); // Force-close the connection
                } catch (err) {
                  console.error('[LiveScoreUpdateService] Error terminating connection:', err);
                }
              }, 5000); // Wait 5 more seconds before terminating
            }
          }, 10000); // 10 second pong timeout
        } catch (err) {
          console.error('[LiveScoreUpdateService] Error sending ping:', err);
        }
      };
      
      // Function to clean up all timers and remove client
      const cleanupClient = () => {
        if (clientState.pingInterval) {
          clearInterval(clientState.pingInterval);
          clientState.pingInterval = null;
        }
        
        if (clientState.pongTimeout) {
          clearTimeout(clientState.pongTimeout);
          clientState.pongTimeout = null;
        }
        
        if (clientState.disconnectTimeout) {
          clearTimeout(clientState.disconnectTimeout);
          clientState.disconnectTimeout = null;
        }
        
        this.clients.delete(ws);
      };
      
      // Start ping interval
      clientState.pingInterval = setInterval(sendPing, 20000); // Send ping every 20 seconds
      
      // Initialize client data
      this.clients.set(ws, { 
        subscription: ['all'], // Default subscription to all sports
        authenticated: false 
      });
      
      // Send initial welcome message with subscription info
      try {
        ws.send(JSON.stringify({
          type: 'connection',
          status: 'connected',
          message: 'Connected to SuiBets live score update service',
          subscription: ['all'],
          serverTime: Date.now()
        }));
      } catch (err) {
        console.error('[LiveScoreUpdateService] Error sending welcome message:', err);
      }
      
      // Handle messages from the client
      ws.on('message', (message: string) => {
        try {
          // Update activity timestamp on any message
          resetActivityTimers();
          
          const data = JSON.parse(message.toString());
          
          // Handle pong response from client
          if (data.type === 'pong') {
            // Update last activity time and continue
            // No need to do anything else for pong messages
            return;
          }
          
          // Handle ping message from client (respond with pong)
          if (data.type === 'ping') {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'pong',
                timestamp: Date.now(),
                echo: data.timestamp
              }));
            }
            return;
          }
          
          // Handle disconnect message from client
          if (data.type === 'disconnect') {
            console.log('[LiveScoreUpdateService] Client requested disconnect:', data.reason || 'No reason provided');
            cleanupClient();
            try {
              ws.close(1000, 'Client requested disconnect');
            } catch (err) {
              console.error('[LiveScoreUpdateService] Error closing connection:', err);
            }
            return;
          }
          
          // Handle all other message types
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error('[LiveScoreUpdateService] Error parsing client message:', error);
          
          // Send error message back to client
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format. Message must be valid JSON.'
              }));
            } catch (err) {
              console.error('[LiveScoreUpdateService] Error sending error message:', err);
            }
          }
        }
      });
      
      // Handle client disconnection
      ws.on('close', (code, reason) => {
        console.log(`[LiveScoreUpdateService] Client disconnected: Code ${code}, Reason: ${reason || 'No reason provided'}`);
        cleanupClient();
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error('[LiveScoreUpdateService] WebSocket error:', error);
        cleanupClient();
      });
      
      // Send an immediate ping to verify connection
      sendPing();
    });
  }
  
  /**
   * Handle messages from clients
   * @param ws WebSocket connection
   * @param data Message data
   */
  private handleClientMessage(ws: WebSocket, data: any): void {
    console.log('[LiveScoreUpdateService] Received message:', data);
    
    // Handle different message types
    switch (data.type) {
      case 'subscribe':
        this.handleSubscription(ws, data);
        break;
        
      case 'unsubscribe':
        this.handleUnsubscription(ws, data);
        break;
        
      case 'authenticate':
        this.handleAuthentication(ws, data);
        break;
        
      case 'request':
        this.handleRequest(ws, data);
        break;
        
      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Unknown message type'
        }));
    }
  }
  
  /**
   * Handle subscription requests
   * @param ws WebSocket connection
   * @param data Subscription data
   */
  private handleSubscription(ws: WebSocket, data: any): void {
    const clientData = this.clients.get(ws);
    
    if (!clientData) {
      return;
    }
    
    // If subscribing to specific sports
    if (data.sports && Array.isArray(data.sports)) {
      // Replace 'all' with specific sports
      if (clientData.subscription.includes('all')) {
        clientData.subscription = data.sports;
      } else {
        // Add new sports to subscription - use a different approach to avoid Set iteration issues
        const allSports = [...clientData.subscription, ...data.sports];
        const uniqueSports = allSports.filter((sport, index) => allSports.indexOf(sport) === index);
        clientData.subscription = uniqueSports;
      }
    }
    
    // If subscribing to specific events
    if (data.events && Array.isArray(data.events)) {
      // Add event-specific subscriptions (these override sport subscriptions for these events)
      data.events.forEach((eventId: string) => {
        clientData.subscription.push(`event:${eventId}`);
      });
    }
    
    // Update client data
    this.clients.set(ws, clientData);
    
    // Confirm subscription
    ws.send(JSON.stringify({
      type: 'subscription',
      status: 'success',
      subscription: clientData.subscription
    }));
  }
  
  /**
   * Handle unsubscription requests
   * @param ws WebSocket connection
   * @param data Unsubscription data
   */
  private handleUnsubscription(ws: WebSocket, data: any): void {
    const clientData = this.clients.get(ws);
    
    if (!clientData) {
      return;
    }
    
    // If unsubscribing from specific sports
    if (data.sports && Array.isArray(data.sports)) {
      clientData.subscription = clientData.subscription.filter(
        sub => !data.sports.includes(sub) && !sub.startsWith('event:')
      );
    }
    
    // If unsubscribing from specific events
    if (data.events && Array.isArray(data.events)) {
      clientData.subscription = clientData.subscription.filter(
        sub => !data.events.includes(sub.replace('event:', ''))
      );
    }
    
    // If unsubscribing from everything, default to 'all'
    if (clientData.subscription.length === 0) {
      clientData.subscription = ['all'];
    }
    
    // Update client data
    this.clients.set(ws, clientData);
    
    // Confirm unsubscription
    ws.send(JSON.stringify({
      type: 'subscription',
      status: 'updated',
      subscription: clientData.subscription
    }));
  }
  
  /**
   * Handle authentication requests
   * @param ws WebSocket connection
   * @param data Authentication data
   */
  private handleAuthentication(ws: WebSocket, data: any): void {
    const clientData = this.clients.get(ws);
    
    if (!clientData) {
      return;
    }
    
    // Simple auth checking - in production we'd validate tokens properly
    if (data.token) {
      clientData.authenticated = true;
      this.clients.set(ws, clientData);
      
      ws.send(JSON.stringify({
        type: 'authentication',
        status: 'success',
        message: 'Authentication successful'
      }));
    } else {
      ws.send(JSON.stringify({
        type: 'authentication',
        status: 'failed',
        message: 'Authentication failed: Invalid token'
      }));
    }
  }
  
  /**
   * Handle data requests
   * @param ws WebSocket connection
   * @param data Request data
   */
  private handleRequest(ws: WebSocket, data: any): void {
    // Handle different request types
    switch (data.request) {
      case 'live_events':
        this.sendLiveEvents(ws, data.sport);
        break;
        
      case 'event_details':
        this.sendEventDetails(ws, data.eventId);
        break;
        
      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Unknown request type'
        }));
    }
  }
  
  /**
   * Send live events for a specific sport
   * @param ws WebSocket connection
   * @param sport Sport to send events for
   */
  private async sendLiveEvents(ws: WebSocket, sport?: string): Promise<void> {
    try {
      let events: SportEvent[];
      
      if (sport && sport !== 'all') {
        events = await this.apiSportsService.getLiveEvents(sport);
      } else {
        events = await this.eventTrackingService.getLiveEvents();
      }
      
      ws.send(JSON.stringify({
        type: 'live_events',
        sport: sport || 'all',
        count: events.length,
        events: events.map(event => ({
          id: event.id,
          sportId: event.sportId,
          homeTeam: event.homeTeam,
          awayTeam: event.awayTeam,
          score: event.score,
          status: event.status,
          startTime: event.startTime,
          leagueName: event.leagueName
        }))
      }));
    } catch (error) {
      console.error('[LiveScoreUpdateService] Error fetching live events:', error);
      
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Error fetching live events'
      }));
    }
  }
  
  /**
   * Send details for a specific event
   * @param ws WebSocket connection
   * @param eventId Event ID
   */
  private async sendEventDetails(ws: WebSocket, eventId: string): Promise<void> {
    try {
      const event = await this.eventTrackingService.getEventById(eventId);
      
      if (event) {
        ws.send(JSON.stringify({
          type: 'event_details',
          eventId,
          event
        }));
      } else {
        ws.send(JSON.stringify({
          type: 'error',
          message: `Event with ID ${eventId} not found`
        }));
      }
    } catch (error) {
      console.error('[LiveScoreUpdateService] Error fetching event details:', error);
      
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Error fetching event details'
      }));
    }
  }
  
  /**
   * Start the update interval for all sports
   */
  private startUpdateInterval(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // Update every 5 seconds by default
    this.updateInterval = setInterval(() => this.checkForUpdates(), 5000);
    console.log('[LiveScoreUpdateService] Started update interval');
  }
  
  /**
   * Check for score updates
   */
  private async checkForUpdates(): Promise<void> {
    try {
      // Get all current live events
      const liveEvents = await this.eventTrackingService.getLiveEvents();
      
      // Look for score changes
      const updatedEvents: SportEvent[] = [];
      
      liveEvents.forEach(event => {
        const eventId = event.id;
        const currentScore = event.score;
        const currentStatus = event.status;
        
        // Check if we have a previous score for this event
        if (this.liveScores[eventId]) {
          const previousScore = this.liveScores[eventId].score;
          const previousStatus = this.liveScores[eventId].status;
          
          // If the score or status has changed, add to updated events
          if (previousScore !== currentScore || previousStatus !== currentStatus) {
            updatedEvents.push(event);
          }
        } else {
          // First time seeing this event, consider it an update
          updatedEvents.push(event);
        }
        
        // Update our cache
        this.liveScores[eventId] = {
          score: currentScore,
          status: currentStatus,
          timestamp: Date.now()
        };
      });
      
      // Clean up events that are no longer live
      Object.keys(this.liveScores).forEach(eventId => {
        const timestamp = this.liveScores[eventId].timestamp;
        const currentTime = Date.now();
        
        // If we haven't seen an update for this event in 5 minutes, remove it
        if (currentTime - timestamp > 5 * 60 * 1000) {
          delete this.liveScores[eventId];
        }
      });
      
      // If we have updates, broadcast them
      if (updatedEvents.length > 0) {
        this.broadcastUpdates(updatedEvents);
      }
    } catch (error) {
      console.error('[LiveScoreUpdateService] Error checking for updates:', error);
    }
  }
  
  /**
   * Broadcast updates to all connected clients
   * @param events Updated events
   */
  private broadcastUpdates(events: SportEvent[]): void {
    // Don't broadcast too frequently
    const now = Date.now();
    if (now - this.lastBroadcast < 2000) { // Minimum 2 seconds between broadcasts
      return;
    }
    
    this.lastBroadcast = now;
    console.log(`[LiveScoreUpdateService] Broadcasting updates for ${events.length} events`);
    
    // Group events by sport for targeted broadcasting
    const eventsBySport: { [sport: string]: SportEvent[] } = {};
    
    events.forEach(event => {
      const sport = this.getSportSlugById(event.sportId);
      
      if (!eventsBySport[sport]) {
        eventsBySport[sport] = [];
      }
      
      eventsBySport[sport].push(event);
    });
    
    // Broadcast to all connected clients based on their subscriptions
    this.clients.forEach((clientData, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        const subscription = clientData.subscription;
        const eventUpdates: SportEvent[] = [];
        
        // If subscribed to 'all', include all updates
        if (subscription.includes('all')) {
          eventUpdates.push(...events);
        } else {
          // Check for sport-specific subscriptions
          Object.entries(eventsBySport).forEach(([sport, sportEvents]) => {
            if (subscription.includes(sport)) {
              eventUpdates.push(...sportEvents);
            }
          });
          
          // Check for event-specific subscriptions
          events.forEach(event => {
            if (subscription.includes(`event:${event.id}`)) {
              // Only add if not already added via sport subscription
              if (!eventUpdates.some(e => e.id === event.id)) {
                eventUpdates.push(event);
              }
            }
          });
        }
        
        // Only send if there are updates for this client
        if (eventUpdates.length > 0) {
          ws.send(JSON.stringify({
            type: 'score_update',
            timestamp: now,
            count: eventUpdates.length,
            events: eventUpdates.map(event => ({
              id: event.id,
              sportId: event.sportId,
              sport: this.getSportSlugById(event.sportId),
              homeTeam: event.homeTeam,
              awayTeam: event.awayTeam,
              score: event.score,
              status: event.status,
              startTime: event.startTime
            }))
          }));
        }
      }
    });
  }
  
  /**
   * Get sport slug from sport ID
   * @param sportId Sport ID
   * @returns Sport slug
   */
  private getSportSlugById(sportId: number): string {
    // Map sport IDs to sport slugs - completely aligned with main routes.ts mappings
    const sportMap: { [id: number]: string } = {
      1: 'football',
      2: 'basketball',
      3: 'tennis',
      4: 'baseball',
      5: 'hockey',
      6: 'handball',
      7: 'volleyball',
      8: 'rugby',
      9: 'cricket',
      10: 'golf',
      11: 'boxing',
      12: 'mma-ufc',
      13: 'formula_1',
      14: 'cycling',
      15: 'american_football',
      16: 'afl',
      17: 'snooker',
      18: 'darts',
      19: 'table-tennis',
      20: 'badminton',
      21: 'beach-volleyball',
      22: 'winter-sports',
      23: 'motorsport',
      24: 'esports',
      25: 'netball',
      26: 'soccer',
      27: 'nba',
      28: 'nhl',
      29: 'nfl',
      30: 'mlb'
    };
    
    return sportMap[sportId] || 'unknown';
  }
  
  /**
   * Stop the service
   */
  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    // Close all connections
    this.wss.clients.forEach(client => {
      client.close();
    });
    
    console.log('[LiveScoreUpdateService] Service stopped');
  }
}