import { EventTrackingService } from './eventTrackingService';
import { ApiSportsService } from './apiSportsService';

// Declare global type extensions
declare global {
  var eventTrackingService: EventTrackingService | undefined;
  var apiSportsService: ApiSportsService | undefined;
}

/**
 * Service specifically for handling cycling events with better validation
 */
class CyclingService {
  private trackingService: EventTrackingService;
  private apiService: ApiSportsService;
  
  constructor(
    trackingService?: EventTrackingService, 
    apiService?: ApiSportsService
  ) {
    // Use provided services if available, otherwise create new instances
    this.trackingService = trackingService || 
                          global.eventTrackingService || 
                          new EventTrackingService(global.apiSportsService || new ApiSportsService());
    
    this.apiService = apiService || 
                     global.apiSportsService || 
                     new ApiSportsService();
  }
  
  /**
   * Get validated cycling events
   * @param isLive Whether to get live events (true) or upcoming (false)
   * @returns Validated and cleaned cycling events
   */
  async getEvents(isLive?: boolean): Promise<any[]> {
    console.log(`[CyclingService] Fetching ${isLive ? 'live' : 'upcoming'} cycling events`);
    
    try {
      let cyclingEvents = [];
      
      // First try to get data from the tracking service cache
      if (isLive) {
        cyclingEvents = await this.trackingService.getLiveEvents(14);
        console.log(`[CyclingService] Tracking service returned ${cyclingEvents.length} live cycling events`);
      } else {
        cyclingEvents = this.trackingService.getUpcomingEvents(14);
        console.log(`[CyclingService] Tracking service returned ${cyclingEvents.length} upcoming cycling events`);
      }
      
      // If we got events from the tracking service, validate them
      if (cyclingEvents && cyclingEvents.length > 0) {
        console.log(`[CyclingService] Using ${cyclingEvents.length} cycling events from tracking service`);
        return this.validateAndCleanCyclingEvents(cyclingEvents);
      }
      
      // If tracking service didn't return any events, try API service
      console.log(`[CyclingService] No events from tracking service, trying API directly`);
      
      const apiEvents = isLive 
        ? await this.apiService.getLiveEvents('cycling')
        : await this.apiService.getUpcomingEvents('cycling', 30);
      
      console.log(`[CyclingService] API service returned ${apiEvents.length} ${isLive ? 'live' : 'upcoming'} cycling events`);
      
      if (apiEvents && apiEvents.length > 0) {
        return this.validateAndCleanCyclingEvents(apiEvents);
      }
      
      // If no events from API service, try to get upcoming events if we were looking for live
      if (isLive) {
        console.log(`[CyclingService] No live cycling events, trying to get upcoming instead`);
        const upcomingEvents = await this.apiService.getUpcomingEvents('cycling', 10);
        
        if (upcomingEvents && upcomingEvents.length > 0) {
          console.log(`[CyclingService] Found ${upcomingEvents.length} upcoming cycling events to use instead of live`);
          return this.validateAndCleanCyclingEvents(upcomingEvents.map(event => ({
            ...event,
            isLive: false, // Ensure these are marked as not live
            status: 'upcoming'
          })));
        }
      }
      
      // If we get here, we couldn't find any events at all
      console.log(`[CyclingService] Could not find any cycling events`);
      return [];
    } catch (error) {
      console.error(`[CyclingService] Error fetching cycling events:`, error);
      return [];
    }
  }
  
  /**
   * Validate and clean cycling events to ensure they have proper structure
   * @param events Raw cycling events that may have inconsistent structure
   * @returns Clean cycling events with proper structure
   */
  private validateAndCleanCyclingEvents(events: any[]): any[] {
    if (!events || !Array.isArray(events)) {
      console.error(`[CyclingService] Invalid events array:`, events);
      return [];
    }
    
    console.log(`[CyclingService] Validating and cleaning ${events.length} cycling events`);
    
    try {
      const cleanedEvents = events
        .filter(event => 
          event && typeof event === 'object' && 
          // Must have either team names or league/competition info
          ((event.homeTeam && event.awayTeam) || 
           (event.leagueName && event.competition) ||
           (event.title && event.description))
        )
        .map(event => {
          // Ensure every event has the correct sportId
          const cleanEvent = {
            ...event,
            sportId: 14, // Force Cycling ID
            _isCycling: true, // Add a special flag
          };
          
          // Ensure events have homeTeam/awayTeam fields
          if (!event.homeTeam && event.title) {
            const parts = event.title.split(' vs ');
            if (parts.length === 2) {
              cleanEvent.homeTeam = parts[0].trim();
              cleanEvent.awayTeam = parts[1].trim();
            } else {
              // If no "vs" found, use title as homeTeam and set awayTeam to something meaningful
              cleanEvent.homeTeam = event.title || 'Cycling Event';
              cleanEvent.awayTeam = event.subtitle || 'Competitors';
            }
          }
          
          // Ensure market fields exist
          if (!cleanEvent.markets || !Array.isArray(cleanEvent.markets)) {
            cleanEvent.markets = [];
          }
          
          // Add default winner market if none exists
          if (cleanEvent.markets.length === 0) {
            cleanEvent.markets.push({
              id: `winner_${cleanEvent.id || Date.now()}`,
              name: 'Winner',
              outcomes: [
                { id: 'home', name: cleanEvent.homeTeam, odds: '2.00' },
                { id: 'away', name: cleanEvent.awayTeam, odds: '2.00' }
              ]
            });
          }
          
          return cleanEvent;
        });
      
      console.log(`[CyclingService] Validated and cleaned ${cleanedEvents.length} cycling events`);
      return cleanedEvents;
    } catch (error) {
      console.error(`[CyclingService] Error cleaning cycling events:`, error);
      return [];
    }
  }
}

export const cyclingService = new CyclingService();