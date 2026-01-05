import { SportEvent, MarketData } from '../types/betting';
import { ApiSportsService } from './apiSportsService';
import axios from 'axios';

/**
 * Service for retrieving and processing boxing event data 
 * using the API-Sports boxing-specific endpoints
 */
export class BoxingService {
  private apiSportsService: ApiSportsService;
  private apiKey: string;

  constructor() {
    this.apiSportsService = new ApiSportsService();
    // Use the existing API key from environment variables or default key
    this.apiKey = process.env.SPORTSDATA_API_KEY || process.env.API_SPORTS_KEY || '3ec255b133882788e32f6349eff77b21';
    if (!this.apiKey) {
      console.error('[BoxingService] No API key found for API-Sports');
    } else {
      console.log(`[BoxingService] Initialized with API key`);
    }
  }
  
  /**
   * Update the API key 
   * @param apiKey New API key to use
   */
  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    console.log('[BoxingService] API key updated');
    
    // Also update the internal apiSportsService reference
    if (this.apiSportsService && typeof this.apiSportsService.setApiKey === 'function') {
      this.apiSportsService.setApiKey(apiKey);
    }
  }

  /**
   * Get boxing events (upcoming or live) from the API-Sports boxing endpoint
   */
  public async getBoxingEvents(isLive: boolean): Promise<SportEvent[]> {
    try {
      console.log(`[BoxingService] Fetching ${isLive ? 'live' : 'upcoming'} boxing events from API-Sports`);
      
      let events: SportEvent[] = [];
      
      if (isLive) {
        // For live events, use the ApiSportsService getLiveEvents method with 'boxing' sport
        events = await this.apiSportsService.getLiveEvents('boxing');
      } else {
        // For upcoming events, use getUpcomingEvents with 'boxing' sport
        events = await this.apiSportsService.getUpcomingEvents('boxing');
      }
      
      // Filter out any non-boxing events (football matches, etc.)
      const filteredEvents = events.filter(event => this.isBoxingEvent(event));
      
      if (filteredEvents.length < events.length) {
        console.log(`[BoxingService] Filtered out ${events.length - filteredEvents.length} non-boxing events`);
        
        // Log some examples of rejected events
        events.forEach(event => {
          if (!this.isBoxingEvent(event)) {
            console.log(`[BoxingService] REJECTING non-boxing event: ${event.homeTeam} vs ${event.awayTeam} (${event.leagueName})`);
          }
        });
      }
      
      console.log(`[BoxingService] Returning ${filteredEvents.length} genuine boxing events`);
      return filteredEvents;
    } catch (error) {
      console.error(`[BoxingService] Error fetching boxing events from API:`, error);
      
      // Try direct approach as fallback if the service method fails
      try {
        console.log(`[BoxingService] Trying direct API approach for boxing ${isLive ? 'live' : 'upcoming'} events`);
        
        // Adjust API parameters based on whether we want live or upcoming events
        const apiUrl = 'https://v1.boxing.api-sports.io/fights';
        let params: Record<string, string> = {};
        
        if (isLive) {
          // For live events
          params = { status: 'live' };
        } else {
          // For upcoming events, we'll try to find scheduled matches
          params = { status: 'scheduled' };
        }
        
        console.log(`[BoxingService] Making direct API request to ${apiUrl} with params:`, params);
        
        const response = await axios.get(apiUrl, {
          params,
          headers: {
            'x-apisports-key': this.apiKey,
            'Accept': 'application/json'
          }
        });
        
        // Check response structure
        if (!response.data) {
          console.log(`[BoxingService] Empty response from ${apiUrl}`);
          return [];
        }
        
        // Log API response info for debugging
        console.log(`[BoxingService] API response status:`, response.data?.status);
        console.log(`[BoxingService] API errors:`, response.data?.errors || 'None');
        console.log(`[BoxingService] API response structure:`, 
          Object.keys(response.data).map(key => `${key}: ${typeof response.data[key]}`).join(', '));
        
        if (response.data && response.data.response && Array.isArray(response.data.response)) {
          const fights = response.data.response;
          console.log(`[BoxingService] Found ${fights.length} boxing events via direct API call`);
          
          // Log a sample of the data structure for debugging
          if (fights.length > 0) {
            console.log(`[BoxingService] Sample fight data structure:`, 
              Object.keys(fights[0]).map(key => `${key}: ${typeof fights[0][key]}`).join(', '));
          }
          
          // Process the events to match our SportEvent format
          const events = fights.map((fight: any, index: number) => {
            const id = fight.id?.toString() || `boxing-${index}-${Date.now()}`;
            
            // Boxing fights structure is different from other sports
            const boxer1 = fight.fighters && fight.fighters.length > 0 
              ? fight.fighters[0]?.name || fight.firstBoxer || fight.boxer1 || 'Boxer 1'
              : fight.firstBoxer || fight.boxer1 || 'Boxer 1';
              
            const boxer2 = fight.fighters && fight.fighters.length > 1
              ? fight.fighters[1]?.name || fight.secondBoxer || fight.boxer2 || 'Boxer 2'
              : fight.secondBoxer || fight.boxer2 || 'Boxer 2';
            
            // Get league/division information
            const leagueName = fight.league?.name || fight.event?.name || fight.competition || 'Boxing';
            const venueName = fight.venue?.name || fight.location?.venue || '';
            const locationName = fight.location?.city || fight.location?.country || '';
            const displayLocation = venueName ? `${venueName}, ${locationName}` : locationName;
            
            // Parse date and handle possible formats
            let startTime = new Date().toISOString();
            if (fight.date) {
              startTime = fight.date;
            } else if (fight.timestamp) {
              startTime = new Date(fight.timestamp * 1000).toISOString();
            } else if (fight.startDate || fight.start_date) {
              startTime = fight.startDate || fight.start_date;
            }
            
            // Create markets based on actual fight data if available
            let markets: MarketData[] = [];
            
            if (fight.odds && typeof fight.odds === 'object') {
              // Try to use actual odds data if available
              const boxer1Odds = fight.odds.boxer1 || fight.odds.firstBoxer || 1.85;
              const boxer2Odds = fight.odds.boxer2 || fight.odds.secondBoxer || 1.95;
              const drawOdds = fight.odds.draw || 15.0;
              
              markets = [
                {
                  id: `${id}-market-winner`,
                  name: 'Winner',
                  outcomes: [
                    {
                      id: `${id}-outcome-boxer1`,
                      name: `${boxer1} Win`,
                      odds: parseFloat(boxer1Odds),
                      probability: 1 / parseFloat(boxer1Odds)
                    },
                    {
                      id: `${id}-outcome-boxer2`,
                      name: `${boxer2} Win`,
                      odds: parseFloat(boxer2Odds),
                      probability: 1 / parseFloat(boxer2Odds)
                    }
                  ]
                }
              ];
              
              // Add draw outcome if odds are available
              if (drawOdds) {
                markets[0].outcomes.push({
                  id: `${id}-outcome-draw`,
                  name: 'Draw',
                  odds: parseFloat(drawOdds),
                  probability: 1 / parseFloat(drawOdds)
                });
              }
              
              // Add method of victory market if we have round data
              if (fight.rounds) {
                markets.push({
                  id: `${id}-market-method`,
                  name: 'Method of Victory',
                  outcomes: [
                    {
                      id: `${id}-outcome-ko`,
                      name: 'KO/TKO',
                      odds: 2.2,
                      probability: 0.45
                    },
                    {
                      id: `${id}-outcome-points`,
                      name: 'Points',
                      odds: 1.9,
                      probability: 0.52
                    }
                  ]
                });
              }
            } else {
              // Default boxing market if no odds data is available
              markets = [
                {
                  id: `${id}-market-winner`,
                  name: 'Winner',
                  outcomes: [
                    {
                      id: `${id}-outcome-boxer1`,
                      name: `${boxer1} Win`,
                      odds: 1.85,
                      probability: 0.54
                    },
                    {
                      id: `${id}-outcome-boxer2`,
                      name: `${boxer2} Win`,
                      odds: 1.95,
                      probability: 0.51
                    }
                  ]
                }
              ];
            }
            
            // Create and return the formatted boxing event
            return {
              id,
              sportId: 11, // Boxing ID
              leagueName: leagueName,
              homeTeam: boxer1,
              awayTeam: boxer2,
              startTime,
              status: isLive ? 'live' : 'upcoming',
              score: fight.score || '',
              markets,
              isLive,
              location: displayLocation,
              dataSource: 'api-sports-boxing'
            };
          });
          
          console.log(`[BoxingService] Processed ${events.length} boxing events from direct API call`);
          return events;
        } else {
          // If response is not in expected format, log info to help debug
          console.log(`[BoxingService] Unexpected response format from boxing API:`, 
                      response.data ? JSON.stringify(response.data).substring(0, 500) + '...' : 'No data');
          return [];
        }
      } catch (directError: any) {
        console.error(`[BoxingService] Direct API approach failed:`, directError.message);
        // Try to get more info from the error
        if (directError.response) {
          console.log(`[BoxingService] API error status:`, directError.response.status);
          console.log(`[BoxingService] API error data:`, directError.response.data);
        }
        if (directError.request) {
          console.log('[BoxingService] No response received from API');
        }
      }
      
      // If all attempts fail, return empty array
      console.log(`[BoxingService] No boxing events found from API, returning empty array`);
      return [];
    }
  }
  
  /**
   * Filter events to ensure they're actual boxing events
   * This helps remove any football or other sport events that might have been 
   * incorrectly categorized
   */
  private isBoxingEvent(event: any): boolean {
    // Boxing events should have certain characteristics
    if (!event) return false;
    
    // Check if it's explicitly marked as boxing
    if (event._sportName === 'boxing') return true;
    
    // Check if it's from the boxing-specific API
    if (event.dataSource === 'api-sports-boxing') return true;
    
    // Boxing events usually have these terms in their league/competition name
    const boxingTerms = ['boxing', 'championship', 'bout', 'title', 'ufc', 'fight night', 'match', 'combat', 'boxing federation', 'wba', 'wbc', 'wbo', 'ibf'];
    const leagueName = (event.leagueName || event.league?.name || '').toLowerCase();
    
    // Check for boxing keywords in the league name
    if (boxingTerms.some(term => leagueName.includes(term))) return true;
    
    // Boxing has individual fighter names, not team names
    // Teams with FC, United, etc. in their names are likely football teams
    const homeTeam = (event.homeTeam || '').toLowerCase();
    const awayTeam = (event.awayTeam || '').toLowerCase();
    
    const footballTerms = ['fc', 'united', 'city', 'club', 'athletic', 'sporting', 'real', 'deportivo'];
    const footballNames = ['arsenal', 'chelsea', 'bayern', 'juventus', 'barcelona', 'madrid', 'inter', 'milan'];
    
    // Check for football team indicators - if either team has these terms it's likely not boxing
    if ((footballTerms.some(term => homeTeam.includes(term)) || footballNames.some(name => homeTeam === name)) &&
        (footballTerms.some(term => awayTeam.includes(term)) || footballNames.some(name => awayTeam === name))) {
      return false;
    }
    
    // Additional check: Most football teams will have spaces between words, while boxer names
    // will typically be in "Firstname Lastname" format
    if (homeTeam.split(' ').length <= 3 && awayTeam.split(' ').length <= 3) {
      // This could be a boxer name (e.g., "Tyson Fury" or "Canelo Alvarez")
      // Check if the event contains boxing market types
      if (event.markets && Array.isArray(event.markets)) {
        for (const market of event.markets) {
          const marketName = (market.name || '').toLowerCase();
          if (marketName.includes('round') || 
              marketName.includes('ko') || 
              marketName.includes('knockout') ||
              marketName.includes('method of victory')) {
            // This is likely a boxing event based on market types
            return true;
          }
        }
      }
    }
    
    // The default here is to be conservative and only accept events we're confident are boxing
    // It's better to miss some boxing events than to show football as boxing
    return false;
  }
}

// Export a singleton instance
export const boxingService = new BoxingService();