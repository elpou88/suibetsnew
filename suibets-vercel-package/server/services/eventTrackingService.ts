import { ApiSportsService } from "./apiSportsService";
import { storage } from "../storage";

/**
 * EventTrackingService
 * 
 * This service tracks upcoming events and checks if they have transitioned to live status.
 * It periodically checks the status of upcoming events and updates them accordingly.
 */
export class EventTrackingService {
  private apiSportsService: ApiSportsService;
  private trackedEvents: Map<string, any> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private isChecking: boolean = false;

  constructor(apiSportsService: ApiSportsService) {
    this.apiSportsService = apiSportsService;
    console.log('[EventTrackingService] Initialized');
  }

  /**
   * Start tracking upcoming events
   */
  public start(): void {
    if (this.checkInterval) {
      this.stop();
    }
    
    // Track upcoming events every 60 seconds
    this.checkInterval = setInterval(() => this.checkUpcomingEvents(), 60 * 1000);
    console.log('[EventTrackingService] Started tracking upcoming events');
    
    // Do an initial check right away
    this.checkUpcomingEvents();
  }

  /**
   * Stop tracking upcoming events
   */
  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[EventTrackingService] Stopped tracking upcoming events');
    }
  }

  /**
   * Check if any upcoming events have transitioned to live status
   */
  private async checkUpcomingEvents(): Promise<void> {
    if (this.isChecking) {
      console.log('[EventTrackingService] Already checking events, skipping this cycle');
      return;
    }
    
    this.isChecking = true;
    
    try {
      console.log('[EventTrackingService] Checking for upcoming events that have gone live');
      
      // Get all upcoming events from storage if the method exists, otherwise use empty array
      let upcomingEvents = [];
      try {
        if (typeof storage.getEvents === 'function') {
          upcomingEvents = await storage.getEvents(undefined, false);
        } else {
          console.log('[EventTrackingService] storage.getEvents method not available, skipping storage check');
        }
      } catch (error) {
        console.error('[EventTrackingService] Error getting events from storage:', error);
      }
      
      // Get all live events from the API for comparison
      const liveEvents = await this.getAllLiveEvents();
      
      console.log(`[EventTrackingService] Found ${upcomingEvents.length} upcoming events and ${liveEvents.length} live events`);
      
      // First pass: Directly handle events that match by ID
      await this.processMatchingEvents(upcomingEvents, liveEvents);
      
      // Second pass: Store all new live events regardless of if they were upcoming
      await this.processAllLiveEvents(liveEvents);
      
      // Third pass: Check if any upcoming events should have started based on time
      await this.processEventsByStartTime(upcomingEvents, liveEvents);
      
      console.log(`[EventTrackingService] Tracking ${this.trackedEvents.size} events that have gone live`);
    } catch (error) {
      console.error('[EventTrackingService] Error checking upcoming events:', error);
    } finally {
      this.isChecking = false;
    }
  }
  
  /**
   * Process events that match exactly by ID between upcoming and live lists
   */
  private async processMatchingEvents(upcomingEvents: any[], liveEvents: any[]): Promise<void> {
    // Track each event by ID for easier lookup
    const liveEventsMap = new Map<string, any>();
    liveEvents.forEach(event => {
      liveEventsMap.set(String(event.id), event);
    });
    
    // Check each upcoming event to see if it's now live
    for (const upcomingEvent of upcomingEvents) {
      const eventId = String(upcomingEvent.id);
      
      // If the event is in the live events map, it has gone live
      if (liveEventsMap.has(eventId)) {
        console.log(`[EventTrackingService] Event ${eventId} (${upcomingEvent.homeTeam} vs ${upcomingEvent.awayTeam}) has gone live!`);
        
        // Update the event status in storage
        const liveEvent = liveEventsMap.get(eventId);
        await this.updateEventToLive(upcomingEvent.id, liveEvent);
        
        // Add to tracked events
        this.trackedEvents.set(eventId, {
          id: eventId,
          homeTeam: upcomingEvent.homeTeam,
          awayTeam: upcomingEvent.awayTeam,
          startTime: upcomingEvent.startTime,
          wentLiveAt: new Date().toISOString()
        });
      }
    }
  }
  
  /**
   * Ensure all currently live events are stored properly
   */
  private async processAllLiveEvents(liveEvents: any[]): Promise<void> {
    // Get all events currently in storage if the method exists
    let allStoredEvents = [];
    try {
      if (typeof storage.getEvents === 'function') {
        allStoredEvents = await storage.getEvents();
      } else {
        console.log('[EventTrackingService] storage.getEvents method not available, skipping stored events check');
      }
    } catch (error) {
      console.error('[EventTrackingService] Error getting all events from storage:', error);
    }
    const storedEventIds = new Set(allStoredEvents.map(event => String(event.id)));
    
    // For each live event, check if it exists in storage
    for (const liveEvent of liveEvents) {
      const eventId = String(liveEvent.id);
      
      // If this live event doesn't exist in storage at all, create it
      if (!storedEventIds.has(eventId)) {
        console.log(`[EventTrackingService] Found new live event ${eventId} (${liveEvent.homeTeam} vs ${liveEvent.awayTeam}) not in storage`);
        await this.updateEventToLive(eventId, liveEvent);
      } 
      // If it exists but might not be marked as live, make sure it's updated
      else {
        const storedEvent = allStoredEvents.find(e => String(e.id) === eventId);
        if (storedEvent && (!storedEvent.isLive || storedEvent.status !== 'live')) {
          console.log(`[EventTrackingService] Updating existing event ${eventId} to live status`);
          await this.updateEventToLive(eventId, liveEvent);
        }
      }
    }
  }
  
  /**
   * Check for events that should be live based on their start time
   */
  private async processEventsByStartTime(upcomingEvents: any[], liveEvents: any[]): Promise<void> {
    const now = new Date();
    const liveTeamPairs = new Set(liveEvents.map(e => `${e.homeTeam}:${e.awayTeam}`));
    
    // Check each upcoming event to see if it should be live based on start time
    for (const upcomingEvent of upcomingEvents) {
      const eventId = String(upcomingEvent.id);
      const startTime = new Date(upcomingEvent.startTime);
      
      // Skip events we've already processed
      if (this.trackedEvents.has(eventId)) continue;
      
      // If the event should have started in the last 3 hours
      if (startTime < now && (now.getTime() - startTime.getTime()) < 3 * 60 * 60 * 1000) {
        // Check if there's a matching event by team names (might have different ID)
        const teamPair = `${upcomingEvent.homeTeam}:${upcomingEvent.awayTeam}`;
        const reversePair = `${upcomingEvent.awayTeam}:${upcomingEvent.homeTeam}`;
        
        // If we already have this match as live in another format, skip it
        if (liveTeamPairs.has(teamPair) || liveTeamPairs.has(reversePair)) {
          console.log(`[EventTrackingService] Event ${eventId} teams match a live event, skipping specific check`);
          continue;
        }
        
        // Otherwise do a specific check for this event with the API
        await this.checkSpecificEventLiveStatus(upcomingEvent);
      }
    }
  }
  
  /**
   * Get all live events from all sports
   */
  private async getAllLiveEvents(): Promise<any[]> {
    const allSports = [
      { id: 1, name: 'football' },
      { id: 2, name: 'basketball' },
      { id: 3, name: 'tennis' },
      { id: 4, name: 'baseball' },
      { id: 5, name: 'hockey' },
      { id: 6, name: 'handball' },
      { id: 7, name: 'volleyball' },
      { id: 8, name: 'rugby' },
      { id: 9, name: 'cricket' },
      { id: 10, name: 'golf' },
      { id: 11, name: 'boxing' },
      { id: 12, name: 'mma-ufc' },
      { id: 13, name: 'formula_1' },
      { id: 14, name: 'cycling' },
      { id: 15, name: 'american_football' },
      { id: 16, name: 'afl' },      // Australian Football League
      { id: 17, name: 'snooker' },  // Added snooker
      { id: 18, name: 'darts' },    // Added darts
      { id: 2, name: 'nba' }        // Using NBA as a separate entry for better data
    ];
    
    let allEvents: any[] = [];
    
    // Fetch live events for all sports in parallel for better performance
    const eventPromises = allSports.map(sport => {
      return this.apiSportsService.getLiveEvents(sport.name)
        .then(sportEvents => {
          if (sportEvents && sportEvents.length > 0) {
            console.log(`[EventTrackingService] Found ${sportEvents.length} live events for ${sport.name}`);
            return sportEvents;
          }
          return [];
        })
        .catch(error => {
          console.error(`[EventTrackingService] Error fetching live events for ${sport.name}:`, error);
          return [];
        });
    });
    
    // Wait for all promises to resolve
    const eventResults = await Promise.all(eventPromises);
    
    // Combine all events
    eventResults.forEach(events => {
      if (events.length > 0) {
        allEvents = [...allEvents, ...events];
      }
    });
    
    // Also pre-fetch upcoming events for all sports to ensure data is cached
    // This improves the experience when users navigate to specific sport categories
    this.preloadUpcomingEventsForAllSports();
    
    return allEvents;
  }
  
  /**
   * Check if a specific event has gone live
   */
  private async checkSpecificEventLiveStatus(event: any): Promise<void> {
    try {
      // Get the sport name from the sportId
      const sportMap: Record<number, string> = {
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
        15: 'american_football'
      };
      
      const sportName = sportMap[event.sportId] || 'football';
      
      // Get live events for this sport
      const liveEvents = await this.apiSportsService.getLiveEvents(sportName);
      
      // Try to find the event by matching teams
      const matchingEvent = liveEvents.find(liveEvent => 
        (liveEvent.homeTeam === event.homeTeam && liveEvent.awayTeam === event.awayTeam) ||
        (liveEvent.homeTeam === event.awayTeam && liveEvent.awayTeam === event.homeTeam)
      );
      
      if (matchingEvent) {
        console.log(`[EventTrackingService] Found matching live event for ${event.homeTeam} vs ${event.awayTeam}`);
        await this.updateEventToLive(event.id, matchingEvent);
        
        // Add to tracked events
        this.trackedEvents.set(String(event.id), {
          id: event.id,
          homeTeam: event.homeTeam,
          awayTeam: event.awayTeam,
          startTime: event.startTime,
          wentLiveAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`[EventTrackingService] Error checking live status for ${event.homeTeam} vs ${event.awayTeam}:`, error);
    }
  }
  
  /**
   * Update an event's status to live in storage
   */
  private async updateEventToLive(eventId: number | string, liveEventData: any): Promise<void> {
    try {
      console.log(`[EventTrackingService] Updating event ${eventId} to live status`);
      
      // Get the existing event from storage if the method exists
      let existingEvent = null;
      try {
        if (typeof storage.getEvent === 'function') {
          existingEvent = await storage.getEvent(Number(eventId));
        } else {
          console.log(`[EventTrackingService] storage.getEvent method not available, skipping event lookup`);
        }
      } catch (error) {
        console.error(`[EventTrackingService] Error getting event ${eventId} from storage:`, error);
      }
      
      if (existingEvent) {
        // Update the event with live data
        const updatedEvent = {
          ...existingEvent,
          status: 'live',
          isLive: true,
          homeScore: liveEventData.homeScore || 0,
          awayScore: liveEventData.awayScore || 0,
          // Update any other fields from the live event
          score: liveEventData.score || existingEvent.score,
          // Add timestamp for when event went live
          liveStartTime: new Date().toISOString(),
          // Copy additional properties from live event data if they exist
          ...(liveEventData.time && { time: liveEventData.time }),
          ...(liveEventData.elapsed && { elapsed: liveEventData.elapsed }),
          ...(liveEventData.period && { period: liveEventData.period }),
        };
        
        // Save the updated event if the method exists
        if (typeof storage.updateEvent === 'function') {
          await storage.updateEvent(Number(eventId), updatedEvent);
        } else {
          console.log(`[EventTrackingService] storage.updateEvent method not available, skipping event update`);
        }
        console.log(`[EventTrackingService] Successfully updated event ${eventId} to live status`);
      } else {
        console.warn(`[EventTrackingService] Could not find event ${eventId} in storage to update its status`);
        
        // If we can't find the event in storage, but we have live data,
        // we should consider creating a new live event in storage
        if (liveEventData && liveEventData.id) {
          console.log(`[EventTrackingService] Attempting to create new live event from API data`);
          try {
            // Prepare event data for insertion
            const newLiveEvent = {
              id: typeof liveEventData.id === 'string' ? parseInt(liveEventData.id, 10) : liveEventData.id,
              sportId: liveEventData.sportId,
              leagueName: liveEventData.leagueName || 'Unknown League',
              leagueSlug: liveEventData.leagueSlug || liveEventData.leagueName?.toLowerCase().replace(/\\s+/g, '-') || 'unknown-league',
              homeTeam: liveEventData.homeTeam,
              awayTeam: liveEventData.awayTeam,
              startTime: new Date(liveEventData.startTime || Date.now()),
              homeOdds: liveEventData.homeOdds || null,
              drawOdds: liveEventData.drawOdds || null,
              awayOdds: liveEventData.awayOdds || null,
              homeScore: liveEventData.homeScore || 0,
              awayScore: liveEventData.awayScore || 0,
              isLive: true,
              status: 'live',
              score: liveEventData.score || `${liveEventData.homeScore || 0}-${liveEventData.awayScore || 0}`,
              providerId: liveEventData.providerId || 'api-sports',
            };
            
            // Try to create the event in storage if the method exists
            let insertedEvent;
            if (typeof storage.createEvent === 'function') {
              insertedEvent = await storage.createEvent(newLiveEvent);
            } else {
              console.log(`[EventTrackingService] storage.createEvent method not available, using event data as-is`);
              insertedEvent = newLiveEvent;
            }
            console.log(`[EventTrackingService] Successfully created new live event ${insertedEvent.id}`);
            
            // Add to tracked events
            this.trackedEvents.set(String(insertedEvent.id), {
              id: insertedEvent.id,
              homeTeam: insertedEvent.homeTeam,
              awayTeam: insertedEvent.awayTeam,
              startTime: insertedEvent.startTime,
              wentLiveAt: new Date().toISOString(),
              createdFromLiveData: true
            });
          } catch (createError) {
            console.error(`[EventTrackingService] Failed to create new live event:`, createError);
          }
        }
      }
    } catch (error) {
      console.error(`[EventTrackingService] Error updating event ${eventId} to live status:`, error);
    }
  }
  
  /**
   * Get all events that are currently being tracked
   */
  /**
   * Get all tracked events with validation to prevent runtime errors
   * Returns an array of events that have transitioned from upcoming to live
   */
  public getTrackedEvents(): any[] {
    try {
      if (!this.trackedEvents || !(this.trackedEvents instanceof Map)) {
        console.error('[EventTrackingService] trackedEvents is not a valid Map');
        return [];
      }
      
      // Convert Map values to array
      const eventsArray = Array.from(this.trackedEvents.values());
      
      // Validate each event to ensure it has minimum required fields
      const validatedEvents = eventsArray.filter(event => {
        return event && 
               typeof event === 'object' && 
               (event.id || event.eventId) && // Must have some form of ID 
               (event.homeTeam || event.home || event.team1); // Must have at least one team
      });
      
      console.log(`[EventTrackingService] Returning ${validatedEvents.length} validated tracked events out of ${eventsArray.length} total`);
      
      return validatedEvents;
    } catch (error) {
      console.error('[EventTrackingService] Error getting tracked events:', error);
      return []; // Return empty array on error
    }
  }
  
  /**
   * Get all live events currently available, optionally filtered by sport ID
   */
  public async getLiveEvents(sportId?: number): Promise<any[]> {
    try {
      const allLiveEvents = await this.getAllLiveEvents();
      
      if (sportId) {
        console.log(`[EventTrackingService] Filtering ${allLiveEvents.length} live events for sportId ${sportId}`);
        return allLiveEvents.filter(event => event.sportId === sportId);
      }
      
      return allLiveEvents;
    } catch (error) {
      console.error('[EventTrackingService] Error getting live events:', error);
      return [];
    }
  }
  
  /**
   * Get all upcoming (non-live) events, optionally filtered by sport ID
   */
  public getUpcomingEvents(sportId?: number): any[] {
    try {
      // Get all events from tracked events that are not live
      const upcomingEvents = Array.from(this.trackedEvents.values())
        .filter(event => !event.isLive);
      
      console.log(`[EventTrackingService] Found ${upcomingEvents.length} upcoming events from tracked events`);
      
      // Filter by sport ID if provided
      if (sportId) {
        console.log(`[EventTrackingService] Filtering upcoming events for sportId ${sportId}`);
        return upcomingEvents.filter(event => event.sportId === sportId);
      }
      
      return upcomingEvents;
    } catch (error) {
      console.error('[EventTrackingService] Error getting upcoming events:', error);
      return [];
    }
  }
  
  /**
   * Get a specific event by ID
   * @param eventId Event ID to retrieve
   */
  public async getEventById(eventId: string): Promise<any | null> {
    try {
      // First check if the event is in storage if the method exists
      let storedEvent = null;
      try {
        if (typeof storage.getEvent === 'function') {
          storedEvent = await storage.getEvent(Number(eventId));
        } else {
          console.log(`[EventTrackingService] storage.getEvent method not available, skipping storage check for event ${eventId}`);
        }
      } catch (storageError) {
        console.error(`[EventTrackingService] Error getting event ${eventId} from storage:`, storageError);
      }
      
      if (storedEvent) {
        console.log(`[EventTrackingService] Found event ${eventId} in storage`);
        return storedEvent;
      }
      
      // If not in storage, check if it's available from the API
      console.log(`[EventTrackingService] Event ${eventId} not found in storage, checking with API`);
      
      // We need to determine which sport this event belongs to
      // Try to find it in live events first
      const allLiveEvents = await this.getAllLiveEvents();
      const liveEvent = allLiveEvents.find(event => String(event.id) === eventId);
      
      if (liveEvent) {
        console.log(`[EventTrackingService] Found event ${eventId} as a live event`);
        return liveEvent;
      }
      
      // Not found in live events, we could try to query all sports
      // But this would be inefficient, so for now return null
      console.log(`[EventTrackingService] Event ${eventId} not found in any available source`);
      return null;
    } catch (error) {
      console.error(`[EventTrackingService] Error getting event ${eventId}:`, error);
      return null;
    }
  }
  
  /**
   * Preload upcoming events for all sports to ensure data is cached
   * This provides a better user experience when navigating between sport categories
   */
  private async preloadUpcomingEventsForAllSports(): Promise<void> {
    try {
      console.log(`[EventTrackingService] Preloading upcoming events for all sports`);
      
      const allSports = [
        { id: 1, name: 'football' },
        { id: 2, name: 'basketball' },
        { id: 3, name: 'tennis' },
        { id: 4, name: 'baseball' },
        { id: 5, name: 'hockey' },
        { id: 6, name: 'handball' },
        { id: 7, name: 'volleyball' },
        { id: 8, name: 'rugby' },
        { id: 9, name: 'cricket' },
        { id: 10, name: 'golf' },
        { id: 11, name: 'boxing' },
        { id: 12, name: 'mma-ufc' },
        { id: 13, name: 'formula_1' },
        { id: 14, name: 'cycling' },
        { id: 15, name: 'american_football' },
        { id: 16, name: 'afl' },      // Australian Football League
        { id: 17, name: 'snooker' },  // Added snooker
        { id: 18, name: 'darts' }     // Added darts
      ];
      
      // Create an array of promises to fetch upcoming events for all sports in parallel
      const promises = allSports.map(sport => {
        return this.apiSportsService.getUpcomingEvents(sport.name, 5)
          .then(events => {
            if (events && events.length > 0) {
              console.log(`[EventTrackingService] Preloaded ${events.length} upcoming events for ${sport.name}`);
            }
            return events;
          })
          .catch(error => {
            console.error(`[EventTrackingService] Error preloading upcoming events for ${sport.name}:`, error);
            return [];
          });
      });
      
      // Execute all promises in parallel but don't wait for the results
      // This runs in the background and doesn't block other operations
      Promise.all(promises).then(results => {
        const totalEvents = results.reduce((total, events) => total + events.length, 0);
        console.log(`[EventTrackingService] Successfully preloaded ${totalEvents} upcoming events for all sports`);
      });
      
      // Also preload the combined all sports endpoint which is used on the homepage
      this.apiSportsService.getAllUpcomingEvents()
        .then(events => {
          console.log(`[EventTrackingService] Preloaded ${events.length} upcoming events for homepage`);
        })
        .catch(error => {
          console.error(`[EventTrackingService] Error preloading upcoming events for homepage:`, error);
        });
    } catch (error) {
      console.error(`[EventTrackingService] Error in preloadUpcomingEventsForAllSports:`, error);
    }
  }
}

// Create a singleton instance
let eventTrackingService: EventTrackingService | null = null;

export function initEventTrackingService(apiSportsService: ApiSportsService): EventTrackingService {
  if (!eventTrackingService) {
    eventTrackingService = new EventTrackingService(apiSportsService);
  }
  return eventTrackingService;
}

export function getEventTrackingService(): EventTrackingService | null {
  return eventTrackingService;
}