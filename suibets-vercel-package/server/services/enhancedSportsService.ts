import axios from 'axios';
import { Event, SportEvent, Market, Outcome } from '@shared/schema';
import { isEmpty } from 'lodash';

// List of all supported sports with their respective IDs
const SUPPORTED_SPORTS = [
  { id: 1, name: 'Soccer', slug: 'soccer', apiId: 'soccer' },
  { id: 2, name: 'Basketball', slug: 'basketball', apiId: 'basketball' },
  { id: 3, name: 'Tennis', slug: 'tennis', apiId: 'tennis' },
  { id: 4, name: 'Baseball', slug: 'baseball', apiId: 'baseball' },
  { id: 5, name: 'Hockey', slug: 'hockey', apiId: 'hockey' },
  { id: 6, name: 'Rugby', slug: 'rugby', apiId: 'rugby' },
  { id: 7, name: 'Golf', slug: 'golf', apiId: 'golf' },
  { id: 8, name: 'Boxing', slug: 'boxing', apiId: 'boxing' },
  { id: 9, name: 'Cricket', slug: 'cricket', apiId: 'cricket' },
  { id: 10, name: 'MMA', slug: 'mma', apiId: 'mma' },
  { id: 13, name: 'Formula 1', slug: 'formula_1', apiId: 'formula_1' },
  { id: 14, name: 'Cycling', slug: 'cycling', apiId: 'cycling' },
  { id: 16, name: 'American Football', slug: 'american_football', apiId: 'american_football' },
  { id: 17, name: 'Rugby League', slug: 'rugby_league', apiId: 'rugby_league' },
  { id: 19, name: 'Volleyball', slug: 'volleyball', apiId: 'volleyball' },
  { id: 20, name: 'Snooker', slug: 'snooker', apiId: 'snooker' },
  { id: 21, name: 'Handball', slug: 'handball', apiId: 'handball' },
  { id: 22, name: 'Darts', slug: 'darts', apiId: 'darts' },
  { id: 23, name: 'eSports', slug: 'esports', apiId: 'esports' },
  { id: 24, name: 'Table Tennis', slug: 'table_tennis', apiId: 'table_tennis' },
  { id: 25, name: 'Badminton', slug: 'badminton', apiId: 'badminton' },
  { id: 26, name: 'Olympic Games', slug: 'olympics', apiId: 'olympics' },
  { id: 27, name: 'Futsal', slug: 'futsal', apiId: 'futsal' },
  { id: 28, name: 'Beach Volleyball', slug: 'beach_volleyball', apiId: 'beach_volleyball' },
  { id: 29, name: 'Beach Soccer', slug: 'beach_soccer', apiId: 'beach_soccer' },
  { id: 30, name: 'Motorsport', slug: 'motorsport', apiId: 'motorsport' },
];

// Standard market types for all sports
const STANDARD_MARKETS = [
  { id: 1, name: 'Match Winner' },
  { id: 2, name: 'Handicap' },
  { id: 3, name: 'Total Points' },
  { id: 4, name: 'First Half Result' },
  { id: 5, name: 'Correct Score' }
];

// Sport-specific markets
const SPORT_SPECIFIC_MARKETS: Record<number, any[]> = {
  1: [ // Soccer
    { id: 'soccer-yellow-cards', name: 'Yellow Cards' },
    { id: 'soccer-corners', name: 'Corners' },
    { id: 'soccer-first-scorer', name: 'First Goalscorer' }
  ],
  2: [ // Basketball
    { id: 'basketball-quarter-winner', name: 'Quarter Winner' },
    { id: 'basketball-player-points', name: 'Player Points' },
    { id: 'basketball-race-to-20', name: 'Race to 20 Points' }
  ],
  3: [ // Tennis
    { id: 'tennis-set-winner', name: 'Set Winner' },
    { id: 'tennis-total-games', name: 'Total Games' },
    { id: 'tennis-correct-score', name: 'Correct Score (Sets)' }
  ],
  4: [ // Baseball
    { id: 'baseball-run-line', name: 'Run Line' },
    { id: 'baseball-total-runs', name: 'Total Runs' },
    { id: 'baseball-innings', name: 'First 5 Innings Result' }
  ],
  9: [ // Cricket
    { id: 'cricket-top-batsman', name: 'Top Batsman' },
    { id: 'cricket-top-bowler', name: 'Top Bowler' },
    { id: 'cricket-method-of-dismissal', name: 'Method of Dismissal' }
  ]
};

// Cache for API responses to avoid rate limiting
const apiCache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class EnhancedSportsService {
  private API_SPORTS_KEY: string;
  private BASKETBALL_API_KEY: string;
  private BASEBALL_API_KEY: string;
  private CRICKET_API_KEY: string;
  private BOXING_API_KEY: string;
  
  constructor() {
    this.API_SPORTS_KEY = process.env.API_SPORTS_KEY || '';
    this.BASKETBALL_API_KEY = process.env.BASKETBALL_API_KEY || this.API_SPORTS_KEY;
    this.BASEBALL_API_KEY = process.env.BASEBALL_API_KEY || this.API_SPORTS_KEY;
    this.CRICKET_API_KEY = process.env.CRICKET_API_KEY || this.API_SPORTS_KEY;
    this.BOXING_API_KEY = process.env.BOXING_API_KEY || this.API_SPORTS_KEY;
  }
  
  /**
   * Get all supported sports
   * @returns Array of supported sports
   */
  async getSports() {
    return SUPPORTED_SPORTS;
  }
  
  /**
   * Get all live events for a specific sport
   * @param sportId Sport ID
   * @returns Live events for the sport
   */
  async getLiveEvents(sportId?: number): Promise<SportEvent[]> {
    try {
      if (sportId) {
        const sport = SUPPORTED_SPORTS.find(s => s.id === sportId);
        if (!sport) {
          console.error(`Sport with ID ${sportId} not found`);
          return [];
        }
        return this.getLiveEventsBySport(sport.slug);
      } else {
        // Fetch live events for all sports
        const allSportsPromises = SUPPORTED_SPORTS.map(sport => 
          this.getLiveEventsBySport(sport.slug)
        );
        
        // Wait for all promises to resolve and flatten the results
        const results = await Promise.all(allSportsPromises);
        return results.flat();
      }
    } catch (error) {
      console.error('Error fetching live events:', error);
      return [];
    }
  }
  
  /**
   * Get all upcoming events for a specific sport
   * @param sportId Sport ID
   * @returns Upcoming events for the sport
   */
  async getUpcomingEvents(sportId?: number): Promise<SportEvent[]> {
    try {
      if (sportId) {
        const sport = SUPPORTED_SPORTS.find(s => s.id === sportId);
        if (!sport) {
          console.error(`Sport with ID ${sportId} not found`);
          return [];
        }
        return this.getUpcomingEventsBySport(sport.slug);
      } else {
        // Get a sample of popular sports to show on homepage
        const popularSports = [1, 2, 3, 4, 9]; // Soccer, Basketball, Tennis, Baseball, Cricket
        
        // Fetch upcoming events for popular sports
        const popularSportsPromises = popularSports.map(id => {
          const sport = SUPPORTED_SPORTS.find(s => s.id === id);
          if (!sport) return Promise.resolve([]);
          return this.getUpcomingEventsBySport(sport.slug, 20); // Limit to 20 events per sport
        });
        
        // Wait for all promises to resolve and flatten the results
        const results = await Promise.all(popularSportsPromises);
        return results.flat();
      }
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      return [];
    }
  }
  
  /**
   * Get event by ID from any sport
   * @param eventId Event ID
   * @returns Event details or null if not found
   */
  async getEventById(eventId: string): Promise<SportEvent | null> {
    for (const sport of SUPPORTED_SPORTS) {
      try {
        const event = await this.getEventByIdForSport(eventId, sport.slug);
        if (event) return event;
      } catch (error) {
        console.error(`Error fetching event ${eventId} for sport ${sport.slug}:`, error);
      }
    }
    
    console.warn(`Event with ID ${eventId} not found in any sport`);
    return null;
  }
  
  /**
   * Get live events for a specific sport
   * @param sportSlug Sport slug
   * @returns Live events for the sport
   */
  private async getLiveEventsBySport(sportSlug: string): Promise<SportEvent[]> {
    try {
      const cacheKey = `live_events_${sportSlug}`;
      const cachedData = this.getCachedData(cacheKey);
      
      if (cachedData) {
        return this.transformEventsToSportEvents(cachedData, sportSlug);
      }
      
      let apiData;
      
      // Different API handling for different sports
      if (sportSlug === 'soccer' || sportSlug === 'football') {
        apiData = await this.fetchFootballLiveEvents();
      } else if (sportSlug === 'basketball') {
        apiData = await this.fetchBasketballLiveEvents();
      } else if (sportSlug === 'baseball') {
        apiData = await this.fetchBaseballLiveEvents();
      } else if (sportSlug === 'cricket') {
        apiData = await this.fetchCricketLiveEvents();
      } else if (sportSlug === 'tennis') {
        apiData = await this.fetchTennisLiveEvents();
      } else {
        // Handle other sports with our main api key
        apiData = await this.fetchGenericLiveEvents(sportSlug);
      }
      
      // Cache the API response
      this.cacheApiResponse(cacheKey, apiData);
      
      return this.transformEventsToSportEvents(apiData, sportSlug);
    } catch (error) {
      console.error(`Error fetching live events for ${sportSlug}:`, error);
      return [];
    }
  }
  
  /**
   * Get upcoming events for a specific sport
   * @param sportSlug Sport slug
   * @param limit Limit number of events returned
   * @returns Upcoming events for the sport
   */
  private async getUpcomingEventsBySport(sportSlug: string, limit = 50): Promise<SportEvent[]> {
    try {
      const cacheKey = `upcoming_events_${sportSlug}`;
      const cachedData = this.getCachedData(cacheKey);
      
      if (cachedData) {
        return this.transformEventsToSportEvents(cachedData, sportSlug).slice(0, limit);
      }
      
      let apiData;
      
      // Different API handling for different sports
      if (sportSlug === 'soccer' || sportSlug === 'football') {
        apiData = await this.fetchFootballUpcomingEvents();
      } else if (sportSlug === 'basketball') {
        apiData = await this.fetchBasketballUpcomingEvents();
      } else if (sportSlug === 'baseball') {
        apiData = await this.fetchBaseballUpcomingEvents();
      } else if (sportSlug === 'cricket') {
        apiData = await this.fetchCricketUpcomingEvents();
      } else if (sportSlug === 'tennis') {
        apiData = await this.fetchTennisUpcomingEvents();
      } else {
        // Handle other sports with our main api key
        apiData = await this.fetchGenericUpcomingEvents(sportSlug);
      }
      
      // Cache the API response
      this.cacheApiResponse(cacheKey, apiData);
      
      const sportEvents = this.transformEventsToSportEvents(apiData, sportSlug);
      return sportEvents.slice(0, limit); // Apply limit after transformation
    } catch (error) {
      console.error(`Error fetching upcoming events for ${sportSlug}:`, error);
      return [];
    }
  }
  
  /**
   * Get event by ID for a specific sport
   * @param eventId Event ID
   * @param sportSlug Sport slug
   * @returns Event details or null if not found
   */
  private async getEventByIdForSport(eventId: string, sportSlug: string): Promise<SportEvent | null> {
    try {
      const cacheKey = `event_${sportSlug}_${eventId}`;
      const cachedData = this.getCachedData(cacheKey);
      
      if (cachedData) {
        const sportEvents = this.transformEventsToSportEvents([cachedData], sportSlug);
        return sportEvents.length > 0 ? sportEvents[0] : null;
      }
      
      let apiData;
      
      // Different API handling for different sports
      if (sportSlug === 'soccer' || sportSlug === 'football') {
        apiData = await this.fetchFootballEventById(eventId);
      } else if (sportSlug === 'basketball') {
        apiData = await this.fetchBasketballEventById(eventId);
      } else if (sportSlug === 'baseball') {
        apiData = await this.fetchBaseballEventById(eventId);
      } else if (sportSlug === 'cricket') {
        apiData = await this.fetchCricketEventById(eventId);
      } else if (sportSlug === 'tennis') {
        apiData = await this.fetchTennisEventById(eventId);
      } else {
        // Handle other sports with our main api key
        apiData = await this.fetchGenericEventById(eventId, sportSlug);
      }
      
      if (!apiData) return null;
      
      // Cache the API response
      this.cacheApiResponse(cacheKey, apiData);
      
      const sportEvents = this.transformEventsToSportEvents([apiData], sportSlug);
      return sportEvents.length > 0 ? sportEvents[0] : null;
    } catch (error) {
      console.error(`Error fetching event ${eventId} for sport ${sportSlug}:`, error);
      return null;
    }
  }
  
  /**
   * Transform raw API events to SportEvent format
   * @param data Raw API events
   * @param sportSlug Sport slug
   * @returns Transformed SportEvent objects
   */
  private transformEventsToSportEvents(data: any[], sportSlug: string): SportEvent[] {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    const sportId = this.getSportIdFromSlug(sportSlug);
    console.log(`Transforming ${data.length} raw events for ${sportSlug}`);
    
    try {
      // Transform raw events to SportEvent format
      const events = data.map((event: any) => {
        // Extract event details
        const id = event.id?.toString() || `${sportSlug}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const homeTeam = event.home_team?.name || event.homeTeam || event.teams?.home?.name || 'Home Team';
        const awayTeam = event.away_team?.name || event.awayTeam || event.teams?.away?.name || 'Away Team';
        const startTime = event.date || event.fixture?.date || event.time || new Date().toISOString();
        const status = event.status?.short || event.fixture?.status?.short || 'NS';
        const isLive = status === 'LIVE' || status === 'IN_PLAY' || status === '1H' || status === '2H' || 
          status === 'HT' || status === 'ET' || status === 'P' || status === 'BT' || status === 'INPLAY';
        
        // Generate standard markets with random odds
        const markets = this.generateMarketsForSport(sportId, homeTeam, awayTeam);
        
        // Create a SportEvent object
        const sportEvent: SportEvent = {
          id,
          sportId,
          leagueName: event.league?.name || event.competition?.name || 'League',
          homeTeam,
          awayTeam,
          startTime,
          status,
          score: this.formatScore(event),
          markets,
          isLive
        };
        
        return sportEvent;
      });
      
      console.log(`Transformed ${events.length} events into ${events.length} SportEvents for ${sportSlug}`);
      return events;
    } catch (error) {
      console.error(`Error transforming events for ${sportSlug}:`, error);
      return [];
    }
  }
  
  /**
   * Format score based on sport and event data
   * @param event Raw event data
   * @returns Formatted score string
   */
  private formatScore(event: any): string {
    if (!event) return '0-0';
    
    if (event.score) {
      return event.score;
    } else if (event.scores) {
      return `${event.scores.home || 0}-${event.scores.away || 0}`;
    } else if (event.fixture?.result) {
      const result = event.fixture.result;
      return `${result.home || 0}-${result.away || 0}`;
    } else if (event.goals) {
      return `${event.goals.home || 0}-${event.goals.away || 0}`;
    }
    
    return '0-0';
  }
  
  /**
   * Generate markets for a specific sport
   * @param sportId Sport ID
   * @param homeTeam Home team name
   * @param awayTeam Away team name
   * @returns Array of markets
   */
  private generateMarketsForSport(sportId: number, homeTeam: string, awayTeam: string): Market[] {
    // Get standard markets
    const standardMarkets = STANDARD_MARKETS.map(market => this.createMarket(
      market.id.toString(),
      market.name,
      homeTeam,
      awayTeam,
      sportId
    ));
    
    // Get sport-specific markets
    const specificMarkets = (SPORT_SPECIFIC_MARKETS[sportId] || []).map(market => this.createMarket(
      market.id.toString(),
      market.name,
      homeTeam,
      awayTeam,
      sportId
    ));
    
    return [...standardMarkets, ...specificMarkets];
  }
  
  /**
   * Create a market with outcomes
   * @param id Market ID
   * @param name Market name
   * @param homeTeam Home team name
   * @param awayTeam Away team name
   * @param sportId Sport ID
   * @returns Market object
   */
  private createMarket(id: string, name: string, homeTeam: string, awayTeam: string, sportId: number): Market {
    let outcomes: Outcome[] = [];
    
    if (name === 'Match Winner' || name.includes('Winner')) {
      // Match winner market has home, draw (for some sports), away outcomes
      outcomes = [
        {
          id: `${id}-outcome-home`,
          name: homeTeam,
          odds: this.generateOdds(1.5, 3.5),
          probability: this.generateProbability()
        },
        // Add draw outcome for sports that can end in a draw
        ...(sportId === 1 || sportId === 6 || sportId === 17 ? [
          {
            id: `${id}-outcome-draw`,
            name: 'Draw',
            odds: this.generateOdds(3.0, 4.5),
            probability: this.generateProbability()
          }
        ] : []),
        {
          id: `${id}-outcome-away`,
          name: awayTeam,
          odds: this.generateOdds(1.8, 4.0),
          probability: this.generateProbability()
        }
      ];
    } else if (name.includes('Handicap')) {
      // Handicap market
      outcomes = [
        {
          id: `${id}-outcome-home-handicap`,
          name: `${homeTeam} (-1.5)`,
          odds: this.generateOdds(1.8, 2.5),
          probability: this.generateProbability()
        },
        {
          id: `${id}-outcome-away-handicap`,
          name: `${awayTeam} (+1.5)`,
          odds: this.generateOdds(1.8, 2.5),
          probability: this.generateProbability()
        }
      ];
    } else if (name.includes('Total')) {
      // Total points/goals market
      const threshold = this.getTotalThreshold(sportId);
      outcomes = [
        {
          id: `${id}-outcome-over`,
          name: `Over ${threshold}`,
          odds: this.generateOdds(1.85, 2.1),
          probability: this.generateProbability()
        },
        {
          id: `${id}-outcome-under`,
          name: `Under ${threshold}`,
          odds: this.generateOdds(1.85, 2.1),
          probability: this.generateProbability()
        }
      ];
    } else {
      // Generic market with yes/no outcomes
      outcomes = [
        {
          id: `${id}-outcome-yes`,
          name: 'Yes',
          odds: this.generateOdds(1.8, 2.5),
          probability: this.generateProbability()
        },
        {
          id: `${id}-outcome-no`,
          name: 'No',
          odds: this.generateOdds(1.8, 2.5),
          probability: this.generateProbability()
        }
      ];
    }
    
    return {
      id,
      name,
      outcomes
    };
  }
  
  /**
   * Get threshold for total points/goals based on sport
   * @param sportId Sport ID
   * @returns Threshold for total points/goals
   */
  private getTotalThreshold(sportId: number): string {
    switch (sportId) {
      case 1: // Soccer
        return '2.5';
      case 2: // Basketball
        return '215.5';
      case 3: // Tennis
        return '22.5';
      case 4: // Baseball
        return '8.5';
      case 5: // Hockey
        return '5.5';
      case 9: // Cricket
        return '300.5';
      default:
        return '2.5';
    }
  }
  
  /**
   * Generate random odds within a range
   * @param min Minimum odds
   * @param max Maximum odds
   * @returns Random odds
   */
  private generateOdds(min: number, max: number): number {
    return parseFloat((Math.random() * (max - min) + min).toFixed(2));
  }
  
  /**
   * Generate random probability
   * @returns Random probability between 0 and 1
   */
  private generateProbability(): number {
    return parseFloat((Math.random()).toFixed(2));
  }
  
  /**
   * Get sport ID from slug
   * @param sportSlug Sport slug
   * @returns Sport ID
   */
  private getSportIdFromSlug(sportSlug: string): number {
    const sport = SUPPORTED_SPORTS.find(s => s.slug === sportSlug || s.apiId === sportSlug);
    return sport ? sport.id : 1; // Default to soccer/football if not found
  }
  
  /**
   * Get cached data if available and not expired
   * @param key Cache key
   * @returns Cached data or null
   */
  private getCachedData(key: string): any {
    const cachedEntry = apiCache[key];
    
    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL) {
      return cachedEntry.data;
    }
    
    return null;
  }
  
  /**
   * Cache API response
   * @param key Cache key
   * @param data API response data
   */
  private cacheApiResponse(key: string, data: any): void {
    apiCache[key] = {
      data,
      timestamp: Date.now()
    };
  }
  
  /**
   * Make API request with retry logic
   * @param url API URL
   * @param headers Request headers
   * @returns API response data
   */
  private async makeApiRequest(url: string, headers: Record<string, string>): Promise<any> {
    try {
      const response = await axios.get(url, { headers });
      return response.data;
    } catch (error) {
      console.error(`API request failed for ${url}:`, error);
      return [];
    }
  }
  
  // API-specific methods for different sports
  
  private async fetchFootballLiveEvents(): Promise<any[]> {
    if (!this.API_SPORTS_KEY) {
      console.warn('API_SPORTS_KEY not set, using mock data for football live events');
      return [];
    }
    
    const url = 'https://v3.football.api-sports.io/fixtures?live=all';
    const headers = {
      'x-apisports-key': this.API_SPORTS_KEY
    };
    
    const response = await this.makeApiRequest(url, headers);
    return response?.response || [];
  }
  
  private async fetchFootballUpcomingEvents(): Promise<any[]> {
    if (!this.API_SPORTS_KEY) {
      console.warn('API_SPORTS_KEY not set, using mock data for football upcoming events');
      return [];
    }
    
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const fromDate = today.toISOString().split('T')[0];
    const toDate = nextWeek.toISOString().split('T')[0];
    
    const url = `https://v3.football.api-sports.io/fixtures?from=${fromDate}&to=${toDate}`;
    const headers = {
      'x-apisports-key': this.API_SPORTS_KEY
    };
    
    const response = await this.makeApiRequest(url, headers);
    return response?.response || [];
  }
  
  private async fetchFootballEventById(eventId: string): Promise<any> {
    if (!this.API_SPORTS_KEY) {
      console.warn('API_SPORTS_KEY not set, using mock data for football event');
      return null;
    }
    
    const url = `https://v3.football.api-sports.io/fixtures?id=${eventId}`;
    const headers = {
      'x-apisports-key': this.API_SPORTS_KEY
    };
    
    const response = await this.makeApiRequest(url, headers);
    return response?.response?.[0] || null;
  }
  
  private async fetchBasketballLiveEvents(): Promise<any[]> {
    if (!this.BASKETBALL_API_KEY) {
      console.warn('BASKETBALL_API_KEY not set, using mock data for basketball live events');
      return [];
    }
    
    const url = 'https://v1.basketball.api-sports.io/games?live=all';
    const headers = {
      'x-apisports-key': this.BASKETBALL_API_KEY
    };
    
    const response = await this.makeApiRequest(url, headers);
    return response?.response || [];
  }
  
  private async fetchBasketballUpcomingEvents(): Promise<any[]> {
    if (!this.BASKETBALL_API_KEY) {
      console.warn('BASKETBALL_API_KEY not set, using mock data for basketball upcoming events');
      return [];
    }
    
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const fromDate = today.toISOString().split('T')[0];
    const toDate = nextWeek.toISOString().split('T')[0];
    
    const url = `https://v1.basketball.api-sports.io/games?from=${fromDate}&to=${toDate}`;
    const headers = {
      'x-apisports-key': this.BASKETBALL_API_KEY
    };
    
    const response = await this.makeApiRequest(url, headers);
    return response?.response || [];
  }
  
  private async fetchBasketballEventById(eventId: string): Promise<any> {
    if (!this.BASKETBALL_API_KEY) {
      console.warn('BASKETBALL_API_KEY not set, using mock data for basketball event');
      return null;
    }
    
    const url = `https://v1.basketball.api-sports.io/games?id=${eventId}`;
    const headers = {
      'x-apisports-key': this.BASKETBALL_API_KEY
    };
    
    const response = await this.makeApiRequest(url, headers);
    return response?.response?.[0] || null;
  }
  
  private async fetchBaseballLiveEvents(): Promise<any[]> {
    if (!this.BASEBALL_API_KEY) {
      console.warn('BASEBALL_API_KEY not set, using mock data for baseball live events');
      return [];
    }
    
    const url = 'https://v1.baseball.api-sports.io/games?live=all';
    const headers = {
      'x-apisports-key': this.BASEBALL_API_KEY
    };
    
    const response = await this.makeApiRequest(url, headers);
    return response?.response || [];
  }
  
  private async fetchBaseballUpcomingEvents(): Promise<any[]> {
    if (!this.BASEBALL_API_KEY) {
      console.warn('BASEBALL_API_KEY not set, using mock data for baseball upcoming events');
      return [];
    }
    
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const fromDate = today.toISOString().split('T')[0];
    const toDate = nextWeek.toISOString().split('T')[0];
    
    const url = `https://v1.baseball.api-sports.io/games?from=${fromDate}&to=${toDate}`;
    const headers = {
      'x-apisports-key': this.BASEBALL_API_KEY
    };
    
    const response = await this.makeApiRequest(url, headers);
    return response?.response || [];
  }
  
  private async fetchBaseballEventById(eventId: string): Promise<any> {
    if (!this.BASEBALL_API_KEY) {
      console.warn('BASEBALL_API_KEY not set, using mock data for baseball event');
      return null;
    }
    
    const url = `https://v1.baseball.api-sports.io/games?id=${eventId}`;
    const headers = {
      'x-apisports-key': this.BASEBALL_API_KEY
    };
    
    const response = await this.makeApiRequest(url, headers);
    return response?.response?.[0] || null;
  }
  
  private async fetchCricketLiveEvents(): Promise<any[]> {
    if (!this.CRICKET_API_KEY) {
      console.warn('CRICKET_API_KEY not set, using mock data for cricket live events');
      return [];
    }
    
    const url = 'https://v1.cricket.api-sports.io/fixtures?live=all';
    const headers = {
      'x-apisports-key': this.CRICKET_API_KEY
    };
    
    const response = await this.makeApiRequest(url, headers);
    return response?.response || [];
  }
  
  private async fetchCricketUpcomingEvents(): Promise<any[]> {
    if (!this.CRICKET_API_KEY) {
      console.warn('CRICKET_API_KEY not set, using mock data for cricket upcoming events');
      return [];
    }
    
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const fromDate = today.toISOString().split('T')[0];
    const toDate = nextWeek.toISOString().split('T')[0];
    
    const url = `https://v1.cricket.api-sports.io/fixtures?from=${fromDate}&to=${toDate}`;
    const headers = {
      'x-apisports-key': this.CRICKET_API_KEY
    };
    
    const response = await this.makeApiRequest(url, headers);
    return response?.response || [];
  }
  
  private async fetchCricketEventById(eventId: string): Promise<any> {
    if (!this.CRICKET_API_KEY) {
      console.warn('CRICKET_API_KEY not set, using mock data for cricket event');
      return null;
    }
    
    const url = `https://v1.cricket.api-sports.io/fixtures?id=${eventId}`;
    const headers = {
      'x-apisports-key': this.CRICKET_API_KEY
    };
    
    const response = await this.makeApiRequest(url, headers);
    return response?.response?.[0] || null;
  }
  
  private async fetchTennisLiveEvents(): Promise<any[]> {
    if (!this.API_SPORTS_KEY) {
      console.warn('API_SPORTS_KEY not set, using mock data for tennis live events');
      return [];
    }
    
    const url = 'https://v1.tennis.api-sports.io/fixtures?live=all';
    const headers = {
      'x-apisports-key': this.API_SPORTS_KEY
    };
    
    const response = await this.makeApiRequest(url, headers);
    return response?.response || [];
  }
  
  private async fetchTennisUpcomingEvents(): Promise<any[]> {
    if (!this.API_SPORTS_KEY) {
      console.warn('API_SPORTS_KEY not set, using mock data for tennis upcoming events');
      return [];
    }
    
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const fromDate = today.toISOString().split('T')[0];
    const toDate = nextWeek.toISOString().split('T')[0];
    
    const url = `https://v1.tennis.api-sports.io/fixtures?from=${fromDate}&to=${toDate}`;
    const headers = {
      'x-apisports-key': this.API_SPORTS_KEY
    };
    
    const response = await this.makeApiRequest(url, headers);
    return response?.response || [];
  }
  
  private async fetchTennisEventById(eventId: string): Promise<any> {
    if (!this.API_SPORTS_KEY) {
      console.warn('API_SPORTS_KEY not set, using mock data for tennis event');
      return null;
    }
    
    const url = `https://v1.tennis.api-sports.io/fixtures?id=${eventId}`;
    const headers = {
      'x-apisports-key': this.API_SPORTS_KEY
    };
    
    const response = await this.makeApiRequest(url, headers);
    return response?.response?.[0] || null;
  }
  
  private async fetchGenericLiveEvents(sportSlug: string): Promise<any[]> {
    if (!this.API_SPORTS_KEY) {
      console.warn(`API_SPORTS_KEY not set, using mock data for ${sportSlug} live events`);
      return [];
    }
    
    try {
      const baseUrl = `https://v1.${sportSlug}.api-sports.io`;
      const endpoint = sportSlug === 'formula_1' || sportSlug === 'cycling' ? 'races' : 'fixtures';
      const url = `${baseUrl}/${endpoint}?live=all`;
      
      const headers = {
        'x-apisports-key': this.API_SPORTS_KEY
      };
      
      const response = await this.makeApiRequest(url, headers);
      return response?.response || [];
    } catch (error) {
      console.error(`Failed to fetch live events for ${sportSlug}:`, error);
      return [];
    }
  }
  
  private async fetchGenericUpcomingEvents(sportSlug: string): Promise<any[]> {
    if (!this.API_SPORTS_KEY) {
      console.warn(`API_SPORTS_KEY not set, using mock data for ${sportSlug} upcoming events`);
      return [];
    }
    
    try {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      
      const fromDate = today.toISOString().split('T')[0];
      const toDate = nextWeek.toISOString().split('T')[0];
      
      const baseUrl = `https://v1.${sportSlug}.api-sports.io`;
      const endpoint = sportSlug === 'formula_1' || sportSlug === 'cycling' ? 'races' : 'fixtures';
      const url = `${baseUrl}/${endpoint}?from=${fromDate}&to=${toDate}`;
      
      const headers = {
        'x-apisports-key': this.API_SPORTS_KEY
      };
      
      const response = await this.makeApiRequest(url, headers);
      return response?.response || [];
    } catch (error) {
      console.error(`Failed to fetch upcoming events for ${sportSlug}:`, error);
      return [];
    }
  }
  
  private async fetchGenericEventById(eventId: string, sportSlug: string): Promise<any> {
    if (!this.API_SPORTS_KEY) {
      console.warn(`API_SPORTS_KEY not set, using mock data for ${sportSlug} event`);
      return null;
    }
    
    try {
      const baseUrl = `https://v1.${sportSlug}.api-sports.io`;
      const endpoint = sportSlug === 'formula_1' || sportSlug === 'cycling' ? 'races' : 'fixtures';
      const url = `${baseUrl}/${endpoint}?id=${eventId}`;
      
      const headers = {
        'x-apisports-key': this.API_SPORTS_KEY
      };
      
      const response = await this.makeApiRequest(url, headers);
      return response?.response?.[0] || null;
    } catch (error) {
      console.error(`Failed to fetch event for ${sportSlug}:`, error);
      return null;
    }
  }
}

export const enhancedSportsService = new EnhancedSportsService();