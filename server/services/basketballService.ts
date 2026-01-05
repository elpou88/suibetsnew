import axios from 'axios';

// Types
export interface BasketballGame {
  id: string;
  sportId: number;
  status: 'scheduled' | 'live' | 'finished';
  startTime: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  leagueName: string;
  isLive: boolean;
  league: {
    id: number;
    name: string;
    logo: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
    };
    away: {
      id: number;
      name: string;
      logo: string;
    };
  };
  scores?: {
    home: {
      total: number;
    };
    away: {
      total: number;
    };
  };
  venue?: string;
  odds?: {
    homeWin: number;
    awayWin: number;
    draw: number;
  };
  markets?: any[];
}

export class BasketballService {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  /**
   * Get basketball games - both live and upcoming
   * @param isLive Whether to fetch only live games
   * @returns Array of basketball games
   */
  async getBasketballGames(isLive: boolean = false): Promise<BasketballGame[]> {
    try {
      const today = new Date();
      
      // Create date strings for today and future dates
      const todayStr = today.toISOString().split('T')[0];
      
      // Get dates for the next 7 days for upcoming games
      const futureDates = [];
      for (let i = 0; i < 7; i++) {
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + i);
        futureDates.push(futureDate.toISOString().split('T')[0]);
      }
      
      // Major basketball leagues to query
      const leagueIds = [12, 76, 18, 10, 73, 120]; // NBA, BSN, Argentina Liga A, Italy Lega A, Spain ACB, EuroLeague
      let allGames: any[] = [];
      
      // For live games, we need to check all leagues with live status
      if (isLive) {
        console.log(`[BasketballService] Fetching live basketball games`);
        
        // First try the general live query
        try {
          const liveResponse = await axios.get('https://v1.basketball.api-sports.io/games', {
            params: {
              live: 'all',
              timezone: 'UTC'
            },
            headers: {
              'x-apisports-key': this.apiKey,
              'Accept': 'application/json'
            }
          });
          
          if (liveResponse.data?.response && Array.isArray(liveResponse.data.response)) {
            console.log(`[BasketballService] Found ${liveResponse.data.response.length} live games using 'live=all' param`);
            allGames = [...allGames, ...liveResponse.data.response];
          }
        } catch (error) {
          console.error(`[BasketballService] Error fetching live games with 'live=all':`, error);
        }
        
        // If that doesn't work, try by league and status
        if (allGames.length === 0) {
          for (const leagueId of leagueIds) {
            try {
              console.log(`[BasketballService] Checking for live games in league ${leagueId}`);
              
              const liveResponse = await axios.get('https://v1.basketball.api-sports.io/games', {
                params: {
                  league: leagueId,
                  season: new Date().getFullYear(),
                  timezone: 'UTC',
                  status: '1Q-2Q-3Q-4Q-HT-BT'  // All possible in-game statuses
                },
                headers: {
                  'x-apisports-key': this.apiKey,
                  'Accept': 'application/json'
                }
              });
              
              if (liveResponse.data?.response && Array.isArray(liveResponse.data.response)) {
                console.log(`[BasketballService] Found ${liveResponse.data.response.length} live games for league ${leagueId}`);
                allGames = [...allGames, ...liveResponse.data.response];
              }
            } catch (error) {
              console.error(`[BasketballService] Error fetching live games for league ${leagueId}:`, error);
            }
          }
        }
      } 
      // For upcoming games, we need to query by future dates
      else {
        console.log(`[BasketballService] Fetching upcoming basketball games`);
        
        // Try each future date for the next 7 days
        for (const futureDate of futureDates) {
          try {
            console.log(`[BasketballService] Checking for games on ${futureDate}`);
            
            const dateResponse = await axios.get('https://v1.basketball.api-sports.io/games', {
              params: {
                date: futureDate,
                timezone: 'UTC'
              },
              headers: {
                'x-apisports-key': this.apiKey,
                'Accept': 'application/json'
              }
            });
            
            if (dateResponse.data?.response && Array.isArray(dateResponse.data.response)) {
              console.log(`[BasketballService] Found ${dateResponse.data.response.length} games for ${futureDate}`);
              allGames = [...allGames, ...dateResponse.data.response];
            }
            
            // If we have at least some games, let's stop to avoid too many API calls
            if (allGames.length >= 10) {
              break;
            }
          } catch (error) {
            console.error(`[BasketballService] Error fetching games for ${futureDate}:`, error);
          }
        }
        
        // If we still don't have enough upcoming games, try by league with status=NS
        if (allGames.length < 10) {
          for (const leagueId of leagueIds) {
            try {
              console.log(`[BasketballService] Checking for upcoming games in league ${leagueId}`);
              
              const leagueResponse = await axios.get('https://v1.basketball.api-sports.io/games', {
                params: {
                  league: leagueId,
                  season: new Date().getFullYear(),
                  timezone: 'UTC',
                  status: 'NS' // Not Started
                },
                headers: {
                  'x-apisports-key': this.apiKey,
                  'Accept': 'application/json'
                }
              });
              
              if (leagueResponse.data?.response && Array.isArray(leagueResponse.data.response)) {
                console.log(`[BasketballService] Found ${leagueResponse.data.response.length} upcoming games for league ${leagueId}`);
                allGames = [...allGames, ...leagueResponse.data.response];
              }
              
              // If we have enough games already, break early
              if (allGames.length >= 20) {
                break;
              }
            } catch (error) {
              console.error(`[BasketballService] Error fetching upcoming games for league ${leagueId}:`, error);
            }
          }
        }
        
        // If we STILL don't have enough games, add today's games (which might include some upcoming games)
        if (allGames.length < 5) {
          try {
            console.log(`[BasketballService] Checking for today's games as last resort`);
            
            const todayResponse = await axios.get('https://v1.basketball.api-sports.io/games', {
              params: {
                date: todayStr,
                timezone: 'UTC'
              },
              headers: {
                'x-apisports-key': this.apiKey,
                'Accept': 'application/json'
              }
            });
            
            if (todayResponse.data?.response && Array.isArray(todayResponse.data.response)) {
              console.log(`[BasketballService] Found ${todayResponse.data.response.length} games for today`);
              
              // For today's games, only get the ones that are scheduled and not yet started
              const scheduledGames = todayResponse.data.response.filter(
                (game: any) => game.status && game.status.short === 'NS'
              );
              
              console.log(`[BasketballService] Filtered to ${scheduledGames.length} scheduled games for today`);
              allGames = [...allGames, ...scheduledGames];
            }
          } catch (error) {
            console.error(`[BasketballService] Error fetching today's games:`, error);
          }
        }
      }
      
      // Remove duplicates
      const uniqueGames = Array.from(
        new Map(allGames.map(game => [game.id, game])).values()
      );
      
      console.log(`[BasketballService] Found ${uniqueGames.length} unique basketball games total`);
      
      // Apply proper filtering
      let filteredGames = uniqueGames;
      
      if (isLive) {
        // Filter for live games only
        filteredGames = uniqueGames.filter(game => 
          ['1Q', '2Q', '3Q', '4Q', 'HT', 'BT'].includes(game.status?.short)
        );
      } else {
        // Filter for upcoming games only
        filteredGames = uniqueGames.filter(game => 
          game.status?.short === 'NS' && new Date(game.date) > today
        );
      }
      
      console.log(`[BasketballService] Filtered to ${filteredGames.length} ${isLive ? 'live' : 'upcoming'} basketball games`);
      
      // Format the data to match our EventGame format
      return filteredGames.map(this.formatBasketballGame);
    } catch (error) {
      console.error('[BasketballService] Error fetching basketball games:', error);
      return [];
    }
  }
  
  /**
   * Format a raw basketball game from the API into our standard format
   */
  private formatBasketballGame(game: any): BasketballGame {
    return {
      id: String(game.id),
      sportId: 2, // Basketball
      status: game.status?.short === 'FT' ? 'finished' : 
              (['1Q', '2Q', '3Q', '4Q', 'HT', 'BT'].includes(game.status?.short) ? 'live' : 'scheduled'),
      startTime: game.date,
      homeTeam: game.teams?.home?.name || 'Unknown Team',
      awayTeam: game.teams?.away?.name || 'Unknown Team',
      homeScore: game.scores?.home?.total || 0,
      awayScore: game.scores?.away?.total || 0,
      leagueName: game.league?.name || 'Basketball League',
      isLive: ['1Q', '2Q', '3Q', '4Q', 'HT', 'BT'].includes(game.status?.short),
      league: {
        id: game.league?.id || 0,
        name: game.league?.name || 'Basketball League',
        logo: game.league?.logo || ''
      },
      teams: {
        home: {
          id: game.teams?.home?.id || 0,
          name: game.teams?.home?.name || 'Home Team',
          logo: game.teams?.home?.logo || ''
        },
        away: {
          id: game.teams?.away?.id || 0,
          name: game.teams?.away?.name || 'Away Team',
          logo: game.teams?.away?.logo || ''
        }
      },
      scores: game.scores || { home: { total: 0 }, away: { total: 0 } },
      venue: game.venue || 'Unknown Venue',
      odds: {
        homeWin: 1.9,
        awayWin: 1.9,
        draw: 20.0
      },
      markets: [] // Add odds data if available
    };
  }
}

// Create a singleton instance - will be initialized with the API key when imported
let basketballService: BasketballService | null = null;

export function initBasketballService(apiKey: string): BasketballService {
  if (!basketballService) {
    basketballService = new BasketballService(apiKey);
  }
  return basketballService;
}

export default basketballService;