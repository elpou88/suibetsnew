import axios from 'axios';
import { SportEvent, MarketData, OutcomeData } from '../types/betting';

/**
 * FREE SPORTS SERVICE
 * Handles all sports EXCEPT football (which uses paid API)
 * 
 * Strategy:
 * - Fetch upcoming matches ONCE per day (morning 6 AM UTC)
 * - Fetch results ONCE per day (night 11 PM UTC)
 * - No live betting for free sports
 * - Cache data aggressively (24 hours)
 */

// Cached data for free sports
let cachedFreeSportsEvents: SportEvent[] = [];
let lastFetchTime: number = 0;
let lastResultsFetchTime: number = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours cache

// Per-day locks to prevent duplicate fetches (stores YYYY-MM-DD)
let lastUpcomingFetchDate: string = '';
let lastResultsFetchDate: string = '';

// Helper to get current UTC date string
const getUTCDateString = (): string => new Date().toISOString().split('T')[0];

// Free sports configuration
const FREE_SPORTS_CONFIG: Record<string, {
  endpoint: string;
  apiHost: string;
  sportId: number;
  name: string;
  hasDraws: boolean;
}> = {
  basketball: {
    endpoint: 'https://v1.basketball.api-sports.io/games',
    apiHost: 'v1.basketball.api-sports.io',
    sportId: 2,
    name: 'Basketball',
    hasDraws: false
  },
  baseball: {
    endpoint: 'https://v1.baseball.api-sports.io/games',
    apiHost: 'v1.baseball.api-sports.io',
    sportId: 5,
    name: 'Baseball',
    hasDraws: false
  },
  'ice-hockey': {
    endpoint: 'https://v1.hockey.api-sports.io/games',
    apiHost: 'v1.hockey.api-sports.io',
    sportId: 6,
    name: 'Ice Hockey',
    hasDraws: false
  },
  mma: {
    endpoint: 'https://v1.mma.api-sports.io/fights',
    apiHost: 'v1.mma.api-sports.io',
    sportId: 7,
    name: 'MMA',
    hasDraws: false
  },
  'american-football': {
    endpoint: 'https://v1.american-football.api-sports.io/games',
    apiHost: 'v1.american-football.api-sports.io',
    sportId: 4,
    name: 'American Football',
    hasDraws: false
  }
};

// API key
const API_KEY = process.env.API_SPORTS_KEY || '';

export class FreeSportsService {
  private isRunning: boolean = false;
  private morningSchedulerInterval: NodeJS.Timeout | null = null;
  private nightSchedulerInterval: NodeJS.Timeout | null = null;

  /**
   * Start the daily schedulers
   * - Morning (6 AM UTC): Fetch upcoming matches
   * - Night (11 PM UTC): Fetch results for settlement
   */
  startSchedulers(): void {
    if (this.isRunning) {
      console.log('[FreeSports] Schedulers already running');
      return;
    }

    this.isRunning = true;
    console.log('[FreeSports] Starting daily schedulers for free sports');
    console.log('[FreeSports] Sports: basketball, baseball, ice-hockey, mma, american-football');
    console.log('[FreeSports] Schedule: Upcoming 6AM UTC, Results 11PM UTC');

    // STRICT DAILY SCHEDULE: Only fetch if not already done today
    const today = getUTCDateString();
    
    // Initial fetch on startup ONLY if we haven't fetched today
    if (lastUpcomingFetchDate !== today && cachedFreeSportsEvents.length === 0) {
      console.log('[FreeSports] Initial fetch of upcoming matches (first fetch today)...');
      this.fetchAllUpcomingMatches().catch(err => {
        console.error('[FreeSports] Initial fetch failed:', err.message);
      });
    } else {
      console.log(`[FreeSports] Skipping initial fetch - already fetched today (${lastUpcomingFetchDate})`);
    }

    // Check every hour if we should fetch - STRICT: only at 6 AM UTC, once per day
    this.morningSchedulerInterval = setInterval(() => {
      const now = new Date();
      const utcHour = now.getUTCHours();
      const todayStr = getUTCDateString();
      
      // STRICT: Only fetch at 6 AM UTC AND only if we haven't fetched today
      if (utcHour === 6 && lastUpcomingFetchDate !== todayStr) {
        console.log('[FreeSports] Morning fetch triggered (6 AM UTC)');
        this.fetchAllUpcomingMatches().catch(err => {
          console.error('[FreeSports] Morning fetch failed:', err.message);
        });
      }
    }, 60 * 60 * 1000); // Check every hour

    // Check every hour if we should fetch results - STRICT: only at 11 PM UTC, once per day
    this.nightSchedulerInterval = setInterval(() => {
      const now = new Date();
      const utcHour = now.getUTCHours();
      const todayStr = getUTCDateString();
      
      // STRICT: Only fetch at 11 PM UTC AND only if we haven't fetched today
      if (utcHour === 23 && lastResultsFetchDate !== todayStr) {
        console.log('[FreeSports] Night results fetch triggered (11 PM UTC)');
        this.fetchAllResults().catch(err => {
          console.error('[FreeSports] Night results fetch failed:', err.message);
        });
      }
    }, 60 * 60 * 1000); // Check every hour

    console.log('[FreeSports] ✅ Daily schedulers started');
  }

  /**
   * Stop the schedulers
   */
  stopSchedulers(): void {
    if (this.morningSchedulerInterval) {
      clearInterval(this.morningSchedulerInterval);
      this.morningSchedulerInterval = null;
    }
    if (this.nightSchedulerInterval) {
      clearInterval(this.nightSchedulerInterval);
      this.nightSchedulerInterval = null;
    }
    this.isRunning = false;
    console.log('[FreeSports] Schedulers stopped');
  }

  /**
   * Fetch upcoming matches for all free sports
   */
  async fetchAllUpcomingMatches(): Promise<SportEvent[]> {
    console.log('[FreeSports] 📅 Fetching upcoming matches for all free sports...');
    
    const allEvents: SportEvent[] = [];
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const [sportSlug, config] of Object.entries(FREE_SPORTS_CONFIG)) {
      try {
        const events = await this.fetchUpcomingForSport(sportSlug, config, today, nextWeek);
        allEvents.push(...events);
        console.log(`[FreeSports] ${config.name}: ${events.length} upcoming matches`);
        
        // Small delay between API calls to be nice to the free tier
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`[FreeSports] Error fetching ${config.name}:`, error.message);
      }
    }

    // Update cache and set per-day lock
    cachedFreeSportsEvents = allEvents;
    lastFetchTime = Date.now();
    lastUpcomingFetchDate = getUTCDateString(); // Lock: only fetch once per day
    
    console.log(`[FreeSports] ✅ Total: ${allEvents.length} upcoming matches cached (locked until ${lastUpcomingFetchDate})`);
    return allEvents;
  }

  /**
   * Fetch upcoming matches for a single sport
   */
  private async fetchUpcomingForSport(
    sportSlug: string, 
    config: typeof FREE_SPORTS_CONFIG[string],
    startDate: Date,
    endDate: Date
  ): Promise<SportEvent[]> {
    const dateStr = startDate.toISOString().split('T')[0];
    
    try {
      const response = await axios.get(config.endpoint, {
        params: {
          date: dateStr,
          timezone: 'UTC'
        },
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': config.apiHost
        },
        timeout: 10000
      });

      const games = response.data?.response || [];
      
      return games.map((game: any) => this.transformToSportEvent(game, sportSlug, config)).filter(Boolean);
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn(`[FreeSports] Rate limited for ${config.name}, skipping`);
      }
      throw error;
    }
  }

  /**
   * Transform API response to SportEvent
   */
  private transformToSportEvent(
    game: any, 
    sportSlug: string, 
    config: typeof FREE_SPORTS_CONFIG[string]
  ): SportEvent | null {
    try {
      const homeTeam = game.teams?.home?.name || game.home?.name || 'Home Team';
      const awayTeam = game.teams?.away?.name || game.away?.name || 'Away Team';
      const league = game.league?.name || game.competition?.name || 'Unknown League';
      const startTime = game.date || game.timestamp ? new Date(game.timestamp * 1000).toISOString() : new Date().toISOString();
      const gameId = String(game.id);

      // Generate basic odds (will be updated when API provides real odds)
      const homeOdds = 1.8 + Math.random() * 0.5;
      const awayOdds = 1.8 + Math.random() * 0.5;

      const outcomes: OutcomeData[] = [
        { id: 'home', name: homeTeam, odds: parseFloat(homeOdds.toFixed(2)), probability: 1 / homeOdds },
        { id: 'away', name: awayTeam, odds: parseFloat(awayOdds.toFixed(2)), probability: 1 / awayOdds }
      ];

      const markets: MarketData[] = [
        {
          id: 'winner',
          name: 'Match Winner',
          outcomes
        }
      ];

      return {
        id: `${sportSlug}_${gameId}`,
        sportId: config.sportId,
        leagueName: league,
        homeTeam,
        awayTeam,
        startTime,
        status: 'scheduled',
        isLive: false, // Never live for free sports
        markets,
        homeOdds: parseFloat(homeOdds.toFixed(2)),
        awayOdds: parseFloat(awayOdds.toFixed(2)),
        drawOdds: config.hasDraws ? parseFloat((2.5 + Math.random() * 0.5).toFixed(2)) : undefined
      };
    } catch (error) {
      console.error('[FreeSports] Error transforming game:', error);
      return null;
    }
  }

  /**
   * Fetch results for settlement
   */
  async fetchAllResults(): Promise<{ eventId: string; homeScore: number; awayScore: number; status: string }[]> {
    console.log('[FreeSports] 🌙 Fetching results for settlement...');
    
    const results: { eventId: string; homeScore: number; awayScore: number; status: string }[] = [];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    for (const [sportSlug, config] of Object.entries(FREE_SPORTS_CONFIG)) {
      try {
        const response = await axios.get(config.endpoint, {
          params: {
            date: dateStr,
            timezone: 'UTC'
          },
          headers: {
            'x-rapidapi-key': API_KEY,
            'x-rapidapi-host': config.apiHost
          },
          timeout: 10000
        });

        const games = response.data?.response || [];
        
        for (const game of games) {
          const status = game.status?.long || game.status?.short || '';
          const isFinished = status.toLowerCase().includes('finished') || 
                            status.toLowerCase().includes('final') ||
                            status === 'FT' || status === 'AET' || status === 'PEN';
          
          if (isFinished) {
            results.push({
              eventId: `${sportSlug}_${game.id}`,
              homeScore: game.scores?.home?.total || game.scores?.home || 0,
              awayScore: game.scores?.away?.total || game.scores?.away || 0,
              status: 'finished'
            });
          }
        }
        
        console.log(`[FreeSports] ${config.name}: ${results.length} finished games`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`[FreeSports] Error fetching results for ${config.name}:`, error.message);
      }
    }

    lastResultsFetchTime = Date.now();
    lastResultsFetchDate = getUTCDateString(); // Lock: only fetch results once per day
    console.log(`[FreeSports] ✅ Total: ${results.length} finished games for settlement (locked until ${lastResultsFetchDate})`);
    return results;
  }

  /**
   * Get cached upcoming events for a specific sport
   */
  getUpcomingEvents(sportSlug?: string): SportEvent[] {
    if (sportSlug) {
      const config = FREE_SPORTS_CONFIG[sportSlug];
      if (config) {
        return cachedFreeSportsEvents.filter(e => e.sportId === config.sportId);
      }
      return [];
    }
    return cachedFreeSportsEvents;
  }

  /**
   * Get all supported free sports
   */
  getSupportedSports(): string[] {
    return Object.keys(FREE_SPORTS_CONFIG);
  }

  /**
   * Check if a sport is a free sport
   */
  isFreeSport(sportSlug: string): boolean {
    return sportSlug in FREE_SPORTS_CONFIG || 
           sportSlug === 'hockey' || // alias
           sportSlug === 'nba' || // alias
           sportSlug === 'nfl' || // alias
           sportSlug === 'mlb'; // alias
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { 
    eventCount: number; 
    lastFetch: Date | null; 
    cacheAgeMinutes: number;
    isStale: boolean;
  } {
    const cacheAgeMs = Date.now() - lastFetchTime;
    return {
      eventCount: cachedFreeSportsEvents.length,
      lastFetch: lastFetchTime > 0 ? new Date(lastFetchTime) : null,
      cacheAgeMinutes: Math.round(cacheAgeMs / (60 * 1000)),
      isStale: cacheAgeMs > CACHE_TTL
    };
  }

  /**
   * Force refresh (manual trigger)
   */
  async forceRefresh(): Promise<SportEvent[]> {
    console.log('[FreeSports] Force refresh requested');
    return this.fetchAllUpcomingMatches();
  }
}

// Singleton instance
export const freeSportsService = new FreeSportsService();
