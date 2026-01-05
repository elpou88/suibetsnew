import axios from 'axios';
import { apiResilienceService } from './apiResilienceService';
import { SportEvent } from '../types/betting';

/**
 * Cricket-specific service with enhanced reliability and fallbacks
 */
export class CricketService {
  private apiKey: string;
  private baseUrl = 'https://v1.cricket.api-sports.io';
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  
  // Cache durations
  private liveDataExpiry = 60 * 1000; // 1 minute for live data
  private upcomingDataExpiry = 5 * 60 * 1000; // 5 minutes for upcoming data
  private leagueDataExpiry = 60 * 60 * 1000; // 1 hour for leagues/countries
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    console.log('[CricketService] Initialized with API key');
  }
  
  /**
   * Update the API key
   * @param apiKey The new API key to use
   */
  public updateApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    console.log('[CricketService] API key updated');
    // Clear cache when API key changes to ensure fresh data with new key
    this.cache.clear();
  }
  
  /**
   * Get live cricket matches with enhanced reliability
   */
  public async getLiveEvents(): Promise<SportEvent[]> {
    try {
      console.log('[CricketService] Fetching live cricket matches');
      
      const cacheKey = 'cricket_live_matches';
      const endpoint = `${this.baseUrl}/fixtures`;
      
      const response = await apiResilienceService.makeRequest(
        `${endpoint}?live=all`,
        {
          headers: {
            'x-apisports-key': this.apiKey,
            'Accept': 'application/json'
          }
        },
        cacheKey,
        this.liveDataExpiry
      );
      
      if (!response || !response.response) {
        console.warn('[CricketService] API returned unexpected format for live events');
        return [];
      }
      
      // Extract and map the events to our standard format
      const events: SportEvent[] = this.mapApiResponseToEvents(response.response, true);
      console.log(`[CricketService] Found ${events.length} live cricket matches`);
      
      return events;
    } catch (error) {
      console.error('[CricketService] Error fetching live cricket matches:', error);
      return [];
    }
  }
  
  /**
   * Get upcoming cricket matches with enhanced reliability
   */
  public async getUpcomingEvents(limit: number = 20): Promise<SportEvent[]> {
    try {
      console.log(`[CricketService] Fetching upcoming cricket matches (limit: ${limit})`);
      
      const cacheKey = `cricket_upcoming_matches_${limit}`;
      const endpoint = `${this.baseUrl}/fixtures`;
      
      // Create date range for upcoming matches (today to +7 days)
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      
      const fromDate = today.toISOString().split('T')[0];
      const toDate = nextWeek.toISOString().split('T')[0];
      
      const response = await apiResilienceService.makeRequest(
        `${endpoint}?date_from=${fromDate}&date_to=${toDate}&timezone=UTC`,
        {
          headers: {
            'x-apisports-key': this.apiKey,
            'Accept': 'application/json'
          }
        },
        cacheKey,
        this.upcomingDataExpiry
      );
      
      if (!response || !response.response) {
        console.warn('[CricketService] API returned unexpected format for upcoming events');
        return [];
      }
      
      // Extract and map the events to our standard format
      let events: SportEvent[] = this.mapApiResponseToEvents(response.response, false);
      
      // Sort by start time and limit
      events = events
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .slice(0, limit);
      
      console.log(`[CricketService] Found ${events.length} upcoming cricket matches`);
      
      return events;
    } catch (error) {
      console.error('[CricketService] Error fetching upcoming cricket matches:', error);
      return [];
    }
  }
  
  /**
   * Get match details by ID with enhanced reliability 
   */
  public async getMatchById(matchId: string): Promise<SportEvent | null> {
    try {
      console.log(`[CricketService] Fetching cricket match details for ID: ${matchId}`);
      
      const cacheKey = `cricket_match_${matchId}`;
      const endpoint = `${this.baseUrl}/fixtures`;
      
      const response = await apiResilienceService.makeRequest(
        `${endpoint}?id=${matchId}`,
        {
          headers: {
            'x-apisports-key': this.apiKey,
            'Accept': 'application/json'
          }
        },
        cacheKey,
        this.liveDataExpiry // Use live data expiry since it might be a live match
      );
      
      if (!response || !response.response || !response.response[0]) {
        console.warn(`[CricketService] API returned unexpected format for match ID: ${matchId}`);
        return null;
      }
      
      // Map the match data to our standard format
      const events = this.mapApiResponseToEvents(response.response, false);
      return events.length > 0 ? events[0] : null;
    } catch (error) {
      console.error(`[CricketService] Error fetching cricket match ID: ${matchId}`, error);
      return null;
    }
  }
  
  /**
   * Map API response data to our standard SportEvent format
   */
  private mapApiResponseToEvents(matches: any[], isLive: boolean = false): SportEvent[] {
    if (!Array.isArray(matches)) {
      console.warn('[CricketService] Expected array of matches but got:', typeof matches);
      return [];
    }
    
    return matches.map(match => {
      try {
        // Extract common data from the match
        const { id, date, status, league, teams, score } = match;
        
        // Map status to our standard format
        let matchStatus = this.mapStatus(status?.short || '');
        let isMatchLive = matchStatus !== 'upcoming' && matchStatus !== 'finished';
        
        const sportEvent: SportEvent = {
          id: id?.toString() || '',
          sportId: 9, // Cricket is sportId 9
          leagueName: league?.name || 'Cricket Tournament',
          leagueSlug: league?.slug || 'cricket-tournament',
          homeTeam: teams?.home?.name || '',
          awayTeam: teams?.away?.name || '',
          startTime: date || new Date().toISOString(),
          status: matchStatus,
          score: this.formatScore(score),
          markets: [{
            id: `${id}-match-winner`,
            name: 'Match Winner',
            outcomes: [
              {
                id: `${id}-home-win`,
                name: `${teams?.home?.name || 'Home'} Win`,
                odds: 1.8 + (Math.random() * 0.5),
                probability: 0.45
              },
              {
                id: `${id}-away-win`,
                name: `${teams?.away?.name || 'Away'} Win`,
                odds: 1.95 + (Math.random() * 0.5),
                probability: 0.45
              },
              {
                id: `${id}-draw`,
                name: 'Draw',
                odds: 4.5 + (Math.random() * 1.0),
                probability: 0.1
              }
            ]
          }],
          isLive: isLive || isMatchLive,
          dataSource: 'api-sports',
          venue: league?.country?.name || '',
          format: match?.type || 'Match'
        };
        
        return sportEvent;
      } catch (err) {
        console.error('[CricketService] Error mapping match data:', err);
        return null;
      }
    }).filter(match => match !== null) as SportEvent[];
  }
  
  /**
   * Map API status to our standard status format
   */
  private mapStatus(status: string): 'scheduled' | 'live' | 'finished' | 'upcoming' {
    const statusMap: Record<string, 'scheduled' | 'live' | 'finished' | 'upcoming'> = {
      'NS': 'upcoming',
      'TBA': 'upcoming',
      'CANC': 'scheduled',
      'PST': 'scheduled',
      'INTR': 'live',
      'ABD': 'finished',
      'AWD': 'finished',
      'WO': 'finished',
      'FIN': 'finished',
      'AET': 'finished',
      'PEN': 'finished',
      'SUSP': 'scheduled',
      'INT': 'live',
      'LIVE': 'live',
      'IP': 'live',
      '1I': 'live',
      '2I': 'live',
      'BRK': 'live',
      'LB': 'live',
      'IN': 'live',
      'OT': 'live',
    };
    
    return statusMap[status] || 'scheduled';
  }
  
  /**
   * Format the score from the API data
   */
  private formatScore(score: any): string {
    if (!score) return '';
    
    // Try to extract and format innings scores
    try {
      // Format based on cricket scoring format (runs/wickets)
      const homeInnings1 = score?.innings?.home_1st ? `${score.innings.home_1st?.runs || 0}/${score.innings.home_1st?.wickets || 0}` : '';
      const awayInnings1 = score?.innings?.away_1st ? `${score.innings.away_1st?.runs || 0}/${score.innings.away_1st?.wickets || 0}` : '';
      const homeInnings2 = score?.innings?.home_2nd ? ` & ${score.innings.home_2nd?.runs || 0}/${score.innings.home_2nd?.wickets || 0}` : '';
      const awayInnings2 = score?.innings?.away_2nd ? ` & ${score.innings.away_2nd?.runs || 0}/${score.innings.away_2nd?.wickets || 0}` : '';
      
      let result = '';
      if (homeInnings1) result += `${homeInnings1}${homeInnings2}`;
      if (homeInnings1 && awayInnings1) result += ' vs ';
      if (awayInnings1) result += `${awayInnings1}${awayInnings2}`;
      
      return result;
    } catch (error) {
      console.error('[CricketService] Error formatting score:', error);
      return '';
    }
  }
}

// Create a singleton instance with API key from env or config
import config from '../config';
const API_KEY = process.env.API_SPORTS_KEY || '3ec255b133882788e32f6349eff77b21';

export const cricketService = new CricketService(API_KEY);