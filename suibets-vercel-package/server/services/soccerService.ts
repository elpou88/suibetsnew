/**
 * Service for handling soccer data from API Sports
 */
import axios from 'axios';
import { SportEvent } from '../types/betting';

/**
 * Soccer-specific service for handling soccer events
 */
class SoccerService {
  private apiKey: string;
  private baseUrl: string = 'https://v3.football.api-sports.io';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    console.log('[SoccerService] Initialized with API key');
  }
  
  /**
   * Update the API key
   * @param apiKey New API key to use
   */
  updateApiKey(apiKey: string): void {
    if (apiKey && this.apiKey !== apiKey) {
      this.apiKey = apiKey;
      console.log('[SoccerService] API key updated');
    }
  }
  
  /**
   * Get live soccer matches
   */
  async getLiveMatches(): Promise<SportEvent[]> {
    try {
      console.log('[SoccerService] Fetching live soccer matches');
      
      // API Sports v3 soccer endpoint for live matches
      const response = await axios.get(`${this.baseUrl}/fixtures`, {
        params: {
          live: 'all'
        },
        headers: {
          'x-apisports-key': this.apiKey,
          'Accept': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });
      
      // Check if the API response is valid
      if (response.data && response.data.response && Array.isArray(response.data.response)) {
        const liveMatches = response.data.response;
        console.log(`[SoccerService] Found ${liveMatches.length} live soccer matches`);
        
        // Transform the response to our standard format
        return this.transformMatches(liveMatches, true);
      } else {
        console.warn('[SoccerService] Invalid API response format for live matches');
        return [];
      }
    } catch (error) {
      console.error('[SoccerService] Error fetching live soccer matches:', error);
      return [];
    }
  }
  
  /**
   * Get upcoming soccer matches
   */
  async getUpcomingMatches(limit: number = 20): Promise<SportEvent[]> {
    try {
      console.log(`[SoccerService] Fetching upcoming soccer matches (limit: ${limit})`);
      
      // Get current date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // API Sports v3 soccer endpoint for upcoming matches
      const response = await axios.get(`${this.baseUrl}/fixtures`, {
        params: {
          date: today,
          status: 'NS', // Not Started
          timezone: 'UTC'
        },
        headers: {
          'x-apisports-key': this.apiKey,
          'Accept': 'application/json'
        },
        timeout: 15000 // 15 second timeout
      });
      
      // Check if the API response is valid
      if (response.data && response.data.response && Array.isArray(response.data.response)) {
        const matches = response.data.response.slice(0, limit);
        console.log(`[SoccerService] Found ${matches.length} upcoming soccer matches`);
        
        // Transform the response to our standard format
        return this.transformMatches(matches, false);
      } else {
        console.warn('[SoccerService] Invalid API response format for upcoming matches');
        return [];
      }
    } catch (error) {
      console.error('[SoccerService] Error fetching upcoming soccer matches:', error);
      
      // Try alternative approach with next parameter
      try {
        console.log('[SoccerService] Trying alternative upcoming matches approach');
        
        const altResponse = await axios.get(`${this.baseUrl}/fixtures`, {
          params: {
            next: String(limit)
          },
          headers: {
            'x-apisports-key': this.apiKey,
            'Accept': 'application/json'
          },
          timeout: 15000
        });
        
        if (altResponse.data && altResponse.data.response && Array.isArray(altResponse.data.response)) {
          const matches = altResponse.data.response;
          console.log(`[SoccerService] Found ${matches.length} upcoming soccer matches via alternative method`);
          
          // Transform the response to our standard format
          return this.transformMatches(matches, false);
        }
      } catch (altError) {
        console.error('[SoccerService] Alternative method also failed:', altError);
      }
      
      return [];
    }
  }
  
  /**
   * Transform soccer matches to our standard event format
   */
  private transformMatches(matches: any[], isLive: boolean): SportEvent[] {
    return matches.map((match, index) => {
      // Extract relevant data from the match object
      const fixture = match.fixture || {};
      const teams = match.teams || {};
      const goals = match.goals || {};
      const league = match.league || {};
      const score = match.score || {};
      
      // Extract team names
      const homeTeam = teams.home?.name || 'Home Team';
      const awayTeam = teams.away?.name || 'Away Team';
      
      // Calculate the current score
      let currentScore = `${goals.home || 0}-${goals.away || 0}`;
      
      // For live matches, we might want to show more detailed scores
      if (isLive && score.halftime) {
        const halfTimeScore = score.halftime;
        currentScore = `${goals.home || 0}-${goals.away || 0} (HT: ${halfTimeScore.home || 0}-${halfTimeScore.away || 0})`;
      }
      
      // Convert status to our standard format
      let status = fixture.status?.short || 'NS';
      if (status === '1H') status = 'First Half';
      if (status === '2H') status = 'Second Half';
      if (status === 'HT') status = 'Half Time';
      if (status === 'ET') status = 'Extra Time';
      if (status === 'P') status = 'Penalty Shootout';
      if (status === 'FT') status = 'Full Time';
      if (status === 'AET') status = 'After Extra Time';
      if (status === 'PEN') status = 'Penalties';
      if (status === 'BT') status = 'Break Time';
      if (status === 'SUSP') status = 'Suspended';
      if (status === 'INT') status = 'Interrupted';
      if (status === 'PST') status = 'Postponed';
      if (status === 'CANC') status = 'Cancelled';
      if (status === 'ABD') status = 'Abandoned';
      if (status === 'AWD') status = 'Technical Loss';
      if (status === 'WO') status = 'Walkover';
      if (status === 'LIVE') status = 'Live';
      
      // Create a standard event object
      return {
        id: fixture.id?.toString() || `soccer-${Date.now()}-${index}`,
        sportId: 26, // Soccer has ID 26 in our system
        leagueId: league.id?.toString() || '',
        leagueName: league.name || 'Soccer League',
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        startTime: fixture.date || new Date().toISOString(),
        status: status,
        score: currentScore,
        isLive: isLive || ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(fixture.status?.short || ''),
        markets: [], // We would populate this with betting markets
        venue: fixture.venue?.name || '',
        season: league.season || new Date().getFullYear(),
        round: league.round || '',
        country: league.country || '',
        logo: league.logo || '',
        flag: league.flag || '',
        elapsed: fixture.status?.elapsed || 0
      };
    });
  }
  
  /**
   * Get all soccer matches (both live and upcoming)
   */
  async getAllMatches(limit: number = 50): Promise<SportEvent[]> {
    try {
      // Get both live and upcoming matches
      const [liveMatches, upcomingMatches] = await Promise.all([
        this.getLiveMatches(),
        this.getUpcomingMatches(limit)
      ]);
      
      // Combine the results
      return [...liveMatches, ...upcomingMatches];
    } catch (error) {
      console.error('[SoccerService] Error fetching all soccer matches:', error);
      return [];
    }
  }
  
  /**
   * Get soccer service status
   */
  async getStatus(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/status`, {
        headers: {
          'x-apisports-key': this.apiKey,
          'Accept': 'application/json'
        },
        timeout: 5000
      });
      
      if (response.data && response.data.response) {
        console.log('[SoccerService] API status check successful');
        return true;
      } else {
        console.warn('[SoccerService] API status check returned invalid response');
        return false;
      }
    } catch (error) {
      console.error('[SoccerService] API status check failed:', error);
      return false;
    }
  }
}

// Create and export singleton instance - initialize with empty API key that will be set from routes.ts
export const soccerService = new SoccerService(process.env.API_SPORTS_KEY || '');