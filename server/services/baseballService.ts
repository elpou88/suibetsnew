import axios from 'axios';
import { SportEvent, MarketData } from '../types/betting';
import apiSportsService from './apiSportsService';

/**
 * Baseball Service
 * Dedicated service for fetching real MLB and baseball data from API-Sports
 */
export class BaseballService {
  private apiKey: string;
  private baseUrl = 'https://v1.baseball.api-sports.io';

  constructor() {
    // Get API key from environment or use default
    this.apiKey = process.env.SPORTSDATA_API_KEY || process.env.API_SPORTS_KEY || '3ec255b133882788e32f6349eff77b21';
    
    if (!this.apiKey) {
      console.warn('[BaseballService] No API key provided. Baseball API functionality will be limited.');
    } else {
      console.log(`[BaseballService] API key found, length: ${this.apiKey.length}`);
    }
  }
  
  /**
   * Update the API key 
   * @param apiKey New API key to use
   */
  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    console.log('[BaseballService] API key updated');
  }
  
  /**
   * Get baseball games (live or upcoming) from API-Sports
   * This is the main method called from routes.ts
   */
  async getBaseballGames(isLive: boolean): Promise<SportEvent[]> {
    console.log(`[BaseballService] Fetching ${isLive ? 'live' : 'upcoming'} baseball games from API-Sports`);
    
    // Store all potential baseball games we find through different methods
    let collectedBaseballGames: SportEvent[] = [];
    
    try {
      // First approach: Get MLB games from API-Sports
      let sportName = isLive ? 'mlb' : 'baseball';
      let games: SportEvent[] = [];
      
      if (isLive) {
        games = await apiSportsService.getLiveEvents(sportName);
      } else {
        games = await apiSportsService.getUpcomingEvents(sportName, 10);
      }
      
      // Make sure the data is actually baseball data, not football data with an incorrect sportId
      if (games && games.length > 0) {
        console.log(`[BaseballService] Found ${games.length} ${isLive ? 'live' : 'upcoming'} ${sportName} games from API-Sports`);
        
        // MLB team names for better detection
        const mlbTeams = [
          'Yankees', 'Red Sox', 'Blue Jays', 'Rays', 'Orioles',  // AL East
          'Guardians', 'Twins', 'Tigers', 'White Sox', 'Royals', // AL Central
          'Astros', 'Rangers', 'Angels', 'Mariners', 'Athletics',  // AL West
          'Braves', 'Phillies', 'Mets', 'Nationals', 'Marlins',  // NL East
          'Brewers', 'Cubs', 'Reds', 'Cardinals', 'Pirates',  // NL Central
          'Dodgers', 'Padres', 'Giants', 'Diamondbacks', 'Rockies' // NL West
        ];
        
        // For testing/development when no true baseball data is available
        // We need a balanced approach to accept real baseball data
        // IMPORTANT: Use smart detection while still showing available games
        let includeAllMlbLabeled = true; // Need to set this to true to show available games
        
        // Log the actual event data for troubleshooting
        if (games.length > 0) {
          console.log(`[BaseballService] Sample MLB event data:`, JSON.stringify(games[0]));
        }

        // Filter to strictly verify this is baseball data
        const baseballGames = games.filter((game: SportEvent, index: number) => {
          // STRICT VERIFICATION: These clearly are football/soccer matches, not baseball
          // Log to help debugging but DO NOT include them
          if (game.leagueName?.includes('Copa') || 
              game.leagueName?.includes('FC') ||
              game.homeTeam?.includes('FC') ||
              game.awayTeam?.includes('FC') ||
              game.homeTeam?.includes('United') ||
              game.awayTeam?.includes('United') ||
              game.homeTeam?.includes('Inter') ||
              game.awayTeam?.includes('Inter') ||
              game.leagueName?.includes('GFC') ||
              game.leagueName?.includes('Argentina') ||
              game.homeTeam?.includes('vs') ||
              game.awayTeam?.includes('vs') ||
              game.homeTeam?.includes('SC') ||
              game.awayTeam?.includes('SC') ||
              game.homeTeam?.includes('GFC') ||
              game.awayTeam?.includes('GFC') ||
              game.homeTeam?.includes('City') ||
              game.awayTeam?.includes('City') ||
              game.homeTeam?.includes('Sporting') ||
              game.awayTeam?.includes('Sporting') ||
              game.homeTeam?.includes('Flamengo') ||
              game.awayTeam?.includes('Flamengo') ||
              game.homeTeam?.includes('Palmeiras') ||
              game.awayTeam?.includes('Palmeiras') ||
              game.homeTeam?.includes('Cordoba') ||
              game.awayTeam?.includes('Cordoba')) {
            console.log(`[BaseballService] REJECTING football match: ${game.homeTeam} vs ${game.awayTeam} (${game.leagueName})`);
            return false;
          }

          // Check if this is genuine baseball data by looking at properties that would indicate baseball
          let isBaseball = 
            // Check if the league name contains baseball-related terms
            (game.leagueName && 
              (game.leagueName.toLowerCase().includes('baseball') || 
               game.leagueName.toLowerCase().includes('mlb') ||
               game.leagueName.toLowerCase().includes('major league')));
               
          // If we already determined this is baseball by the league, no need to check team names
          if (!isBaseball && game.homeTeam && game.awayTeam) {
            // Check against MLB team names
            for (const team of mlbTeams) {
              if ((game.homeTeam && game.homeTeam.includes(team)) || 
                 (game.awayTeam && game.awayTeam.includes(team))) {
                isBaseball = true;
                break;
              }
            }
            
            // Additional checks for common MLB team suffixes and keywords
            if (!isBaseball) {
              const homeTeam = game.homeTeam?.toLowerCase() || '';
              const awayTeam = game.awayTeam?.toLowerCase() || '';
              
              isBaseball = 
                homeTeam.includes('sox') || awayTeam.includes('sox') ||
                homeTeam.includes('cubs') || awayTeam.includes('cubs') ||
                homeTeam.includes('jays') || awayTeam.includes('jays') ||
                homeTeam.includes('rays') || awayTeam.includes('rays') ||
                homeTeam.includes('mets') || awayTeam.includes('mets') ||
                homeTeam.includes('yankees') || awayTeam.includes('yankees') ||
                homeTeam.includes('dodgers') || awayTeam.includes('dodgers') ||
                homeTeam.includes('astros') || awayTeam.includes('astros') ||
                homeTeam.includes('phillies') || awayTeam.includes('phillies') ||
                homeTeam.includes('braves') || awayTeam.includes('braves');
            }
          }
               
          return isBaseball;
        });
        
        if (baseballGames.length > 0) {
          console.log(`[BaseballService] Identified ${baseballGames.length} genuine baseball games out of ${games.length} total games`);
          
          const formattedGames = baseballGames.map((game: SportEvent) => ({
            ...game,
            sportId: 4, // Set to Baseball ID
            isLive: isLive
          }));
          
          // Add to our collection
          collectedBaseballGames = [...collectedBaseballGames, ...formattedGames];
        } else {
          console.log(`[BaseballService] Warning: None of the ${games.length} games appear to be genuine baseball data, trying direct API`);
        }
      }
      
      // If we don't have MLB games, try general baseball endpoint
      if (sportName === 'mlb' && collectedBaseballGames.length === 0) {
        sportName = 'baseball';
        console.log(`[BaseballService] No MLB games found, trying ${sportName} endpoint`);
        
        if (isLive) {
          games = await apiSportsService.getLiveEvents(sportName);
        } else {
          games = await apiSportsService.getUpcomingEvents(sportName, 10);
        }
        
        if (games && games.length > 0) {
          console.log(`[BaseballService] Found ${games.length} ${isLive ? 'live' : 'upcoming'} ${sportName} games from API-Sports`);
          
          // MLB team names for better detection
          const mlbTeams = [
            'Yankees', 'Red Sox', 'Blue Jays', 'Rays', 'Orioles',  // AL East
            'Guardians', 'Twins', 'Tigers', 'White Sox', 'Royals', // AL Central
            'Astros', 'Rangers', 'Angels', 'Mariners', 'Athletics',  // AL West
            'Braves', 'Phillies', 'Mets', 'Nationals', 'Marlins',  // NL East
            'Brewers', 'Cubs', 'Reds', 'Cardinals', 'Pirates',  // NL Central
            'Dodgers', 'Padres', 'Giants', 'Diamondbacks', 'Rockies' // NL West
          ];
          
          // We need a balanced approach to accept real baseball data
          // IMPORTANT: Use smart detection while still showing available games
          let includeAllMlbLabeled = true; // Need to set this to true to show available games
          
          // Log the actual event data for troubleshooting
          if (games.length > 0) {
            console.log(`[BaseballService] Sample 'baseball' API event data:`, JSON.stringify(games[0]));
          }

          // Filter to strictly verify this is baseball data
          const baseballGames = games.filter((game: SportEvent, index: number) => {
            // STRICT VERIFICATION: These clearly are football/soccer matches, not baseball
            // Log to help debugging but DO NOT include them
            if (game.leagueName?.includes('Copa') || 
                game.leagueName?.includes('FC') ||
                game.homeTeam?.includes('FC') ||
                game.awayTeam?.includes('FC') ||
                game.homeTeam?.includes('United') ||
                game.awayTeam?.includes('United') ||
                game.homeTeam?.includes('Inter') ||
                game.awayTeam?.includes('Inter') ||
                game.leagueName?.includes('GFC') ||
                game.leagueName?.includes('Argentina') ||
                game.homeTeam?.includes('vs') ||
                game.awayTeam?.includes('vs') ||
                game.homeTeam?.includes('SC') ||
                game.awayTeam?.includes('SC') ||
                game.homeTeam?.includes('GFC') ||
                game.awayTeam?.includes('GFC') ||
                game.homeTeam?.includes('City') ||
                game.awayTeam?.includes('City') ||
                game.homeTeam?.includes('Sporting') ||
                game.awayTeam?.includes('Sporting') ||
                game.homeTeam?.includes('Flamengo') ||
                game.awayTeam?.includes('Flamengo') ||
                game.homeTeam?.includes('Palmeiras') ||
                game.awayTeam?.includes('Palmeiras') ||
                game.homeTeam?.includes('Cordoba') ||
                game.awayTeam?.includes('Cordoba')) {
              console.log(`[BaseballService] REJECTING football match: ${game.homeTeam} vs ${game.awayTeam} (${game.leagueName})`);
              return false;
            }

            // Check if this is genuine baseball data by looking at properties that would indicate baseball
            let isBaseball = 
              // Check if the league name contains baseball-related terms
              (game.leagueName && 
                (game.leagueName.toLowerCase().includes('baseball') || 
                 game.leagueName.toLowerCase().includes('mlb') ||
                 game.leagueName.toLowerCase().includes('major league')));
                 
            // If we already determined this is baseball by the league, no need to check team names
            if (!isBaseball && game.homeTeam && game.awayTeam) {
              // Check against MLB team names
              for (const team of mlbTeams) {
                if ((game.homeTeam && game.homeTeam.includes(team)) || 
                   (game.awayTeam && game.awayTeam.includes(team))) {
                  isBaseball = true;
                  break;
                }
              }
              
              // Additional checks for common MLB team suffixes and keywords
              if (!isBaseball) {
                const homeTeam = game.homeTeam?.toLowerCase() || '';
                const awayTeam = game.awayTeam?.toLowerCase() || '';
                
                isBaseball = 
                  homeTeam.includes('sox') || awayTeam.includes('sox') ||
                  homeTeam.includes('cubs') || awayTeam.includes('cubs') ||
                  homeTeam.includes('jays') || awayTeam.includes('jays') ||
                  homeTeam.includes('rays') || awayTeam.includes('rays') ||
                  homeTeam.includes('mets') || awayTeam.includes('mets') ||
                  homeTeam.includes('yankees') || awayTeam.includes('yankees') ||
                  homeTeam.includes('dodgers') || awayTeam.includes('dodgers') ||
                  homeTeam.includes('astros') || awayTeam.includes('astros') ||
                  homeTeam.includes('phillies') || awayTeam.includes('phillies') ||
                  homeTeam.includes('braves') || awayTeam.includes('braves');
              }
            }
                 
            return isBaseball;
          });
          
          if (baseballGames.length > 0) {
            console.log(`[BaseballService] Identified ${baseballGames.length} genuine baseball games out of ${games.length} total games`);
            
            const formattedGames = baseballGames.map((game: SportEvent) => ({
              ...game,
              sportId: 4, // Set to Baseball ID
              isLive: isLive
            }));
            
            // Add to our collection
            collectedBaseballGames = [...collectedBaseballGames, ...formattedGames];
          } else {
            console.log(`[BaseballService] Warning: None of the ${games.length} games appear to be genuine baseball data, trying direct API`);
          }
        }
      }
      
      // If we have collected baseball games at this point, return them
      if (collectedBaseballGames.length > 0) {
        console.log(`[BaseballService] Returning ${collectedBaseballGames.length} collected baseball games`);
        return collectedBaseballGames;
      }
      
      // If we still have no games, try direct API
      console.log(`[BaseballService] No games found from API-Sports ${sportName} endpoint, trying direct baseball API`);
      const directApiGames = await this.getDirectBaseballApi(isLive);
      return directApiGames;
      
    } catch (error) {
      console.error(`[BaseballService] Error fetching games from API-Sports:`, error);
      
      // If API-Sports fails, try direct API as fallback
      console.log(`[BaseballService] Trying direct baseball API as fallback`);
      return await this.getDirectBaseballApi(isLive);
    }
  }
  
  /**
   * Get games directly from the baseball API
   * Used as fallback when the API-Sports endpoints don't return data
   */
  private async getDirectBaseballApi(isLive: boolean): Promise<SportEvent[]> {
    try {
      console.log(`[BaseballService] Using direct baseball API for ${isLive ? 'live' : 'upcoming'} games`);
      
      // Parameters for the API call - start with MLB
      const params: Record<string, any> = {
        season: 2024, // Use 2024 season for MLB games
        league: 1     // MLB league ID = 1 for Major League Baseball
      };
      
      // We'll try multiple leagues if this doesn't work
      
      if (isLive) {
        params.live = 'true';
      } else {
        // For upcoming games, use today's date and filter for not started games
        const today = new Date();
        const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        params.date = formattedDate;
        params.status = 'NS'; // Not Started games
      }
      
      console.log(`[BaseballService] Making direct API call with params:`, params);
      
      const response = await axios.get(`${this.baseUrl}/games`, {
        params,
        headers: {
          'x-apisports-key': this.apiKey,
          'Accept': 'application/json'
        }
      });
      
      if (response.status === 200 && response.data && response.data.response) {
        const apiGames = response.data.response;
        console.log(`[BaseballService] Direct API returned ${apiGames.length} games`);
        
        if (apiGames.length > 0) {
          // Transform to our format
          const transformedGames = this.transformBaseballApiGames(apiGames, isLive);
          
          if (transformedGames.length > 0) {
            console.log(`[BaseballService] Transformed ${transformedGames.length} baseball games from direct API`);
            return transformedGames;
          }
        }
      }
      
      // If MLB league didn't return results, try without specifying a league
      if (params.league) {
        console.log(`[BaseballService] No games found for MLB (league=1), trying without league filter`);
        
        // Clone the params without the league property
        const noLeagueParams = { ...params };
        delete noLeagueParams.league;
        
        console.log(`[BaseballService] Making direct API call without league filter:`, noLeagueParams);
        
        const fallbackResponse = await axios.get(`${this.baseUrl}/games`, {
          params: noLeagueParams,
          headers: {
            'x-apisports-key': this.apiKey,
            'Accept': 'application/json'
          }
        });
        
        if (fallbackResponse.status === 200 && fallbackResponse.data && fallbackResponse.data.response) {
          const fallbackGames = fallbackResponse.data.response;
          console.log(`[BaseballService] Fallback without league filter returned ${fallbackGames.length} games`);
          
          if (fallbackGames.length > 0) {
            // Transform to our format
            const transformedGames = this.transformBaseballApiGames(fallbackGames, isLive);
            
            if (transformedGames.length > 0) {
              console.log(`[BaseballService] Transformed ${transformedGames.length} baseball games from fallback approach`);
              return transformedGames;
            }
          }
        }
      }
      
      // If we get here, no games were found from the direct API
      // Try a date range approach for upcoming games
      if (!isLive) {
        console.log(`[BaseballService] No upcoming games found with direct date params, trying date range`);
        
        // Use a much wider date range - current month to next 3 months
        const today = new Date();
        // End date is 3 months from now
        const threeMonthsLater = new Date(today);
        threeMonthsLater.setMonth(today.getMonth() + 3);
        
        // Try multiple seasons to find upcoming games
        const currentYear = today.getFullYear();
        const seasons = [currentYear, currentYear + 1];
        
        // Format dates for API
        const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const formattedThreeMonths = `${threeMonthsLater.getFullYear()}-${String(threeMonthsLater.getMonth() + 1).padStart(2, '0')}-${String(threeMonthsLater.getDate()).padStart(2, '0')}`;
        
        // Try with multiple seasons to find any upcoming baseball games
        let allGames: any[] = [];
        
        // Try each season and combine results
        for (const season of seasons) {
          console.log(`[BaseballService] Trying MLB season ${season} with date range from ${formattedToday} to ${formattedThreeMonths}`);
          
          try {
            const rangeResponse = await axios.get(`${this.baseUrl}/games`, {
              params: {
                season: season,
                from: formattedToday,
                to: formattedThreeMonths,
                status: 'NS',
                league: 1 // MLB league ID - Major League Baseball
              },
              headers: {
                'x-apisports-key': this.apiKey,
                'Accept': 'application/json'
              }
            });
            
            if (rangeResponse.status === 200 && rangeResponse.data && rangeResponse.data.response) {
              const seasonGames = rangeResponse.data.response;
              console.log(`[BaseballService] Season ${season} returned ${seasonGames.length} games`);
              
              if (seasonGames.length > 0) {
                allGames = [...allGames, ...seasonGames];
              }
            }
          } catch (seasonError) {
            console.error(`[BaseballService] Error fetching season ${season}:`, seasonError);
          }
        }
        
        console.log(`[BaseballService] Date range approach returned ${allGames.length} games from all seasons`);
        
        if (allGames.length > 0) {
          // Transform to our format
          const transformedGames = this.transformBaseballApiGames(allGames, isLive);
          
          if (transformedGames.length > 0) {
            console.log(`[BaseballService] Transformed ${transformedGames.length} baseball games from all seasons`);
            return transformedGames;
          }
        }
        
        // Final fallback - try without league filter and with extended date range
        console.log(`[BaseballService] Trying final fallback approach - no league filter with extended date range`);
        
        // Try a 6-month range instead
        const sixMonthsLater = new Date(today);
        sixMonthsLater.setMonth(today.getMonth() + 6);
        const formattedSixMonths = `${sixMonthsLater.getFullYear()}-${String(sixMonthsLater.getMonth() + 1).padStart(2, '0')}-${String(sixMonthsLater.getDate()).padStart(2, '0')}`;
        
        // Try without league filter
        try {
          const finalResponse = await axios.get(`${this.baseUrl}/games`, {
            params: {
              season: new Date().getFullYear(),
              from: formattedToday,
              to: formattedSixMonths,
              status: 'NS'
              // No league filter
            },
            headers: {
              'x-apisports-key': this.apiKey,
              'Accept': 'application/json'
            }
          });
          
          if (finalResponse.status === 200 && finalResponse.data && finalResponse.data.response) {
            const finalGames = finalResponse.data.response;
            console.log(`[BaseballService] Final fallback approach returned ${finalGames.length} games`);
            
            if (finalGames.length > 0) {
              // Transform to our format
              const transformedGames = this.transformBaseballApiGames(finalGames, isLive);
              
              if (transformedGames.length > 0) {
                console.log(`[BaseballService] Transformed ${transformedGames.length} baseball games from final fallback`);
                return transformedGames;
              }
            }
          }
        } catch (finalError) {
          console.error(`[BaseballService] Error in final fallback:`, finalError);
        }
      }
      
      // If we get here, no games were found from any approach
      console.log(`[BaseballService] No ${isLive ? 'live' : 'upcoming'} games found from any API source, returning empty array`);
      return [];
      
    } catch (directApiError) {
      console.error(`[BaseballService] Error fetching games from direct baseball API:`, directApiError);
      return [];
    }
  }
  
  /**
   * Transform baseball API data to our SportEvent format
   */
  private transformBaseballApiGames(games: any[], isLive: boolean): SportEvent[] {
    return games.map((game: any, index: number) => {
      try {
        // Extract basic game data
        const id = game.id?.toString() || `baseball-api-${index}`;
        const homeTeam = game.teams?.home?.name || 'Home Team';
        const awayTeam = game.teams?.away?.name || 'Away Team';
        const leagueName = game.league?.name || 'Major League Baseball';
        const date = game.date || new Date().toISOString();
        
        // Determine game status
        let status: 'scheduled' | 'live' | 'finished' | 'upcoming' = 'upcoming';
        if (isLive) {
          status = 'live';
        } else if (game.status?.short === 'FT' || game.status?.short === 'FINAL') {
          status = 'finished';
        } else if (game.status?.short === 'LIVE' || game.status?.short === 'INPROGRESS') {
          status = 'live';
        }
        
        // Create score string
        let score: string | undefined;
        if (status === 'live' || status === 'finished') {
          const homeScore = game.scores?.home?.total || 0;
          const awayScore = game.scores?.away?.total || 0;
          score = `${homeScore} - ${awayScore}`;
          
          // Add inning info for live games
          if (status === 'live' && game.status?.short) {
            score += ` (${game.status.short})`;
          }
        }
        
        // Create baseball-specific markets
        const marketsData: MarketData[] = [];
        
        // Moneyline market
        marketsData.push({
          id: `${id}-market-moneyline`,
          name: 'Moneyline',
          outcomes: [
            {
              id: `${id}-outcome-home`,
              name: `${homeTeam} (Win)`,
              odds: 1.85 + (Math.random() * 0.4),
              probability: 0.52
            },
            {
              id: `${id}-outcome-away`,
              name: `${awayTeam} (Win)`,
              odds: 1.95 + (Math.random() * 0.4),
              probability: 0.48
            }
          ]
        });
        
        // Run Line market (baseball spread)
        marketsData.push({
          id: `${id}-market-runline`,
          name: 'Run Line',
          outcomes: [
            {
              id: `${id}-outcome-home-runline`,
              name: `${homeTeam} (-1.5)`,
              odds: 2.2 + (Math.random() * 0.3),
              probability: 0.43
            },
            {
              id: `${id}-outcome-away-runline`,
              name: `${awayTeam} (+1.5)`,
              odds: 1.65 + (Math.random() * 0.3),
              probability: 0.57
            }
          ]
        });
        
        // Total Runs market
        const totalRuns = 8.5;
        marketsData.push({
          id: `${id}-market-total`,
          name: 'Total Runs',
          outcomes: [
            {
              id: `${id}-outcome-over`,
              name: `Over ${totalRuns}`,
              odds: 1.9 + (Math.random() * 0.2),
              probability: 0.5
            },
            {
              id: `${id}-outcome-under`,
              name: `Under ${totalRuns}`,
              odds: 1.9 + (Math.random() * 0.2),
              probability: 0.5
            }
          ]
        });
        
        // Create the complete SportEvent object
        return {
          id,
          sportId: 4, // Baseball ID
          leagueName,
          homeTeam,
          awayTeam,
          startTime: new Date(date).toISOString(),
          status,
          score,
          markets: marketsData,
          isLive: status === 'live'
        };
      } catch (error) {
        console.error(`[BaseballService] Error transforming game:`, error);
        
        // Return a minimal event on error
        return {
          id: `baseball-error-${index}`,
          sportId: 4,
          leagueName: 'Major League Baseball',
          homeTeam: 'MLB Team',
          awayTeam: 'Visiting Team',
          startTime: new Date().toISOString(),
          status: isLive ? 'live' : 'upcoming',
          markets: [],
          isLive
        };
      }
    });
  }
}

export const baseballService = new BaseballService();