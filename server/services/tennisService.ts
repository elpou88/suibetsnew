import axios from 'axios';
import { apiResilienceService } from './apiResilienceService';
import { SportEvent } from '../types/betting';

/**
 * Tennis-specific service with enhanced reliability and fallbacks
 */
export class TennisService {
  private apiKey: string;
  private baseUrl = 'https://v1.tennis.api-sports.io';
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  
  // Cache durations
  private liveDataExpiry = 60 * 1000; // 1 minute for live data
  private upcomingDataExpiry = 5 * 60 * 1000; // 5 minutes for upcoming data
  private leagueDataExpiry = 60 * 60 * 1000; // 1 hour for leagues/countries
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    console.log('[TennisService] Initialized with API key');
  }
  
  /**
   * Get live tennis matches with enhanced reliability
   */
  public async getLiveEvents(): Promise<SportEvent[]> {
    try {
      console.log('[TennisService] Fetching live tennis matches');
      
      const cacheKey = 'tennis_live_matches';
      const endpoint = `${this.baseUrl}/matches`;
      
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
        console.warn('[TennisService] API returned unexpected format for live events');
        return [];
      }
      
      // Extract and map the events to our standard format
      const events: SportEvent[] = this.mapApiResponseToEvents(response.response, true);
      console.log(`[TennisService] Found ${events.length} live tennis matches`);
      
      return events;
    } catch (error) {
      console.error('[TennisService] Error fetching live tennis matches:', error);
      return [];
    }
  }
  
  /**
   * Get upcoming tennis matches with enhanced reliability
   */
  public async getUpcomingEvents(limit: number = 20): Promise<SportEvent[]> {
    try {
      console.log(`[TennisService] Fetching upcoming tennis matches (limit: ${limit})`);
      
      const cacheKey = `tennis_upcoming_matches_${limit}`;
      const endpoint = `${this.baseUrl}/matches`;
      
      const response = await apiResilienceService.makeRequest(
        `${endpoint}?next=${limit}&timezone=UTC`,
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
        console.warn('[TennisService] API returned unexpected format for upcoming events');
        return [];
      }
      
      // Extract and map the events to our standard format
      const events: SportEvent[] = this.mapApiResponseToEvents(response.response, false);
      console.log(`[TennisService] Found ${events.length} upcoming tennis matches`);
      
      return events;
    } catch (error) {
      console.error('[TennisService] Error fetching upcoming tennis matches:', error);
      return [];
    }
  }
  
  /**
   * Get match details by ID with enhanced reliability 
   */
  public async getMatchById(matchId: string): Promise<SportEvent | null> {
    try {
      console.log(`[TennisService] Fetching tennis match details for ID: ${matchId}`);
      
      const cacheKey = `tennis_match_${matchId}`;
      const endpoint = `${this.baseUrl}/matches`;
      
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
        console.warn(`[TennisService] API returned unexpected format for match ID: ${matchId}`);
        return null;
      }
      
      // Map the match data to our standard format
      const events = this.mapApiResponseToEvents(response.response, false);
      return events.length > 0 ? events[0] : null;
    } catch (error) {
      console.error(`[TennisService] Error fetching tennis match ID: ${matchId}`, error);
      return null;
    }
  }
  
  /**
   * Map API response data to our standard SportEvent format
   */
  private mapApiResponseToEvents(matches: any[], isLive: boolean = false): SportEvent[] {
    if (!Array.isArray(matches)) {
      console.warn('[TennisService] Expected array of matches but got:', typeof matches);
      return [];
    }
    
    return matches.map(match => {
      try {
        // Extract common data from the match
        const { id, date, status, tournament, teams, scores } = match;
        
        // Map status to our standard format
        let matchStatus = this.mapStatus(status?.short || '');
        let isMatchLive = matchStatus !== 'upcoming' && matchStatus !== 'finished';
        
        const sportEvent: SportEvent = {
          id: id?.toString() || '',
          sportId: 3, // Tennis is sportId 3
          leagueName: tournament?.name || 'Tennis Tournament',
          leagueSlug: tournament?.slug || 'tennis-tournament',
          homeTeam: teams?.home?.name || '',
          awayTeam: teams?.away?.name || '',
          startTime: date || new Date().toISOString(),
          status: matchStatus,
          score: this.formatScore(scores),
          markets: [{
            id: `${id}-match-winner`,
            name: 'Match Winner',
            outcomes: [
              {
                id: `${id}-home-win`,
                name: `${teams?.home?.name || 'Home'} Win`,
                odds: 1.8 + (Math.random() * 0.5),
                probability: 0.55
              },
              {
                id: `${id}-away-win`,
                name: `${teams?.away?.name || 'Away'} Win`,
                odds: 1.95 + (Math.random() * 0.5),
                probability: 0.45
              }
            ]
          }],
          isLive: isLive || isMatchLive,
          dataSource: 'api-sports',
          venue: tournament?.country?.name || '',
          format: 'Match'
        };
        
        return sportEvent;
      } catch (err) {
        console.error('[TennisService] Error mapping match data:', err);
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
      'CANC': 'scheduled',
      'PST': 'scheduled',
      'INTR': 'live',
      'ABD': 'finished',
      'AWO': 'finished',
      'WO': 'finished',
      'WA': 'finished',
      'FIN': 'finished',
      'AET': 'finished',
      'PEN': 'finished',
      'SUSP': 'scheduled',
      'INT': 'live',
      'LIVE': 'live',
      'IP': 'live',
      '1S': 'live',
      '2S': 'live',
      '3S': 'live',
      'FS': 'live',
      'SS': 'live',
      'TS': 'live',
      'TB': 'live'
    };
    
    return statusMap[status] || 'scheduled';
  }
  
  /**
   * Format the score from the API data
   */
  private formatScore(scores: any): string {
    if (!scores) return '';
    
    // Try to extract and format set scores
    try {
      const sets = [];
      if (scores?.sets?.set_1) sets.push(scores.sets.set_1);
      if (scores?.sets?.set_2) sets.push(scores.sets.set_2);
      if (scores?.sets?.set_3) sets.push(scores.sets.set_3);
      if (scores?.sets?.set_4) sets.push(scores.sets.set_4);
      if (scores?.sets?.set_5) sets.push(scores.sets.set_5);
      
      // Format each set as "homeScore-awayScore"
      const formattedSets = sets.map(set => {
        const home = set?.home !== undefined ? set.home : 0;
        const away = set?.away !== undefined ? set.away : 0;
        return `${home}-${away}`;
      });
      
      return formattedSets.join(', ');
    } catch (error) {
      console.error('[TennisService] Error formatting score:', error);
      return '';
    }
  }
}

// Create a singleton instance with API key from env or config
import config from '../config';
const API_KEY = process.env.API_SPORTS_KEY || '3ec255b133882788e32f6349eff77b21';

export const tennisService = new TennisService(API_KEY);