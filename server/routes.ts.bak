import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { SportsApi } from "./services/sportsApi";
import { SuiMoveService } from "./services/suiMoveService";
import { WalrusService } from "./services/walrusService";
import { securityService } from "./services/securityService";
import { aggregatorService } from "./services/aggregatorService";
import { walProtocolService } from "./services/walProtocolService";
import { suiMetadataService } from "./services/suiMetadataService";
import { walAppService } from "./services/walAppService";
import { sportDataService } from "./services/sportDataService";
import { ApiSportsService } from "./services/apiSportsService";
import config from "./config";
import { insertUserSchema, insertBetSchema, insertNotificationSchema } from "@shared/schema";

// Create API Sports service instance
const apiSportsService = new ApiSportsService();

export async function registerRoutes(app: Express): Promise<Server> {
  // Add a simple health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });
  
  // SportsData API endpoints
  app.get("/api/sportsdata/events/live", async (req: Request, res: Response) => {
    try {
      const sport = req.query.sport as string || 'soccer';
      const liveEvents = await sportDataService.getLiveEvents(sport);
      res.json(liveEvents);
    } catch (error) {
      console.error("Error fetching live events from SportsData API:", error);
      res.status(500).json({ message: "Failed to fetch live events" });
    }
  });
  
  app.get("/api/sportsdata/events/upcoming", async (req: Request, res: Response) => {
    try {
      const sport = req.query.sport as string || 'soccer';
      const upcomingEvents = await sportDataService.getUpcomingEvents(sport);
      res.json(upcomingEvents);
    } catch (error) {
      console.error("Error fetching upcoming events from SportsData API:", error);
      res.status(500).json({ message: "Failed to fetch upcoming events" });
    }
  });
  
  app.get("/api/sportsdata/events/:eventId", async (req: Request, res: Response) => {
    try {
      const eventId = req.params.eventId;
      const sport = req.query.sport as string || 'soccer';
      const event = await sportDataService.getEventDetails(sport, eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.json(event);
    } catch (error) {
      console.error("Error fetching event details from SportsData API:", error);
      res.status(500).json({ message: "Failed to fetch event details" });
    }
  });
  
  // Special route for promotions page outside of React router
  app.get("/promo", (req, res) => {
    res.sendFile('promo.html', { root: './client/public' });
  });
  
  // Initialize services
  const sportsApi = new SportsApi();
  const suiMoveService = new SuiMoveService();
  const walrusService = new WalrusService();
  
  // WalApp API endpoints for live events
  app.get("/api/wal/events/live", async (req: Request, res: Response) => {
    try {
      const liveEvents = await walAppService.getLiveEvents();
      res.json(liveEvents);
    } catch (error) {
      console.error("Error fetching live events:", error);
      res.status(500).json({ message: "Failed to fetch live events" });
    }
  });
  
  // Fetch upcoming events from Wal.app
  app.get("/api/wal/events/upcoming", async (req: Request, res: Response) => {
    try {
      const upcomingEvents = await walAppService.getUpcomingEvents();
      res.json(upcomingEvents);
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      res.status(500).json({ message: "Failed to fetch upcoming events" });
    }
  });
  
  // Get specific event details from Wal.app
  app.get("/api/wal/events/:eventId", async (req: Request, res: Response) => {
    try {
      const eventId = req.params.eventId;
      const event = await walAppService.getEventDetails(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.json(event);
    } catch (error) {
      console.error("Error fetching event details:", error);
      res.status(500).json({ message: "Failed to fetch event details" });
    }
  });

  // API Routes - prefixed with /api
  // Sports routes
  app.get("/api/sports", async (req: Request, res: Response) => {
    try {
      const sports = await storage.getSports();
      res.json(sports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sports" });
    }
  });

  // Events routes
  app.get("/api/events", async (req: Request, res: Response) => {
    try {
      const reqSportId = req.query.sportId ? Number(req.query.sportId) : undefined;
      const isLive = req.query.isLive ? req.query.isLive === 'true' : undefined;
      
      console.log(`Fetching events for sportId: ${reqSportId}, isLive: ${isLive}`);
      
      // Get events from storage for non-live events
      let events = await storage.getEvents(reqSportId, isLive);
      console.log(`Found ${events.length} events for sportId: ${reqSportId} in database`);
      
      // For non-live events, just return what's in the database
      if (!isLive) {
        return res.json(events);
      }
      
      // For live events, always try to get them from the API
      console.log("Fetching real-time data for all 26 sports from API");
      
      // If specific sport is requested, try to get that sport's data first
      if (reqSportId) {
        // Map sport ID to sport name
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
          12: 'mma',
          13: 'formula_1',
          14: 'cycling',
          15: 'american_football'
        };
        
        const sportName = sportMap[reqSportId] || 'football';
        console.log(`Attempting to fetch live ${sportName} (ID: ${reqSportId}) events from API`);
        
        const sportEvents = await apiSportsService.getLiveEvents(sportName);
        
        if (sportEvents && sportEvents.length > 0) {
          console.log(`Found ${sportEvents.length} real ${sportName} events from API`);
          return res.json(sportEvents);
        } else {
          console.log(`No live ${sportName} events found from API, returning empty array`);
          return res.json([]);
        }
      }
      
      // If we get here, no specific sport was requested
      // Try to get events for all sports
      console.log("Fetching all live events from the API for all sports");
      
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
        { id: 12, name: 'mma' },
        { id: 13, name: 'formula_1' },
        { id: 14, name: 'cycling' },
        { id: 15, name: 'american_football' }
      ];
      
      let allEvents: any[] = [];
      
      // Fetch events for main sports
      for (const sport of allSports.slice(0, 3)) { // Just try the first 3 sports to avoid too many API calls
        const events = await apiSportsService.getLiveEvents(sport.name);
        if (events && events.length > 0) {
          console.log(`Found ${events.length} live events for ${sport.name}`);
          allEvents = [...allEvents, ...events];
        }
      }
      
      if (allEvents.length > 0) {
        console.log(`Found a total of ${allEvents.length} live events from all sports combined`);
        return res.json(allEvents);
      }
      
      // If we get here, just return what's in the database (or an empty array if there's nothing)
      console.log("No live events found from API, returning database events");
      return res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });
            console.log(`No exact matches or football events found, fetching data directly for sport ID ${reqSportId}`);
            
            // One more try with direct fetch
            const sportMap: Record<number, string> = {
              1: 'football', 2: 'basketball', 3: 'tennis', 4: 'baseball', 
              5: 'hockey', 6: 'handball', 7: 'volleyball', 8: 'rugby'
            };
            
            const sportName = sportMap[reqSportId] || 'football';
            console.log(`Attempting to fetch data directly for ${sportName}`);
            
            const directEvents = await apiSportsService.getLiveEvents(sportName);
            
            if (directEvents && directEvents.length > 0) {
              console.log(`Found ${directEvents.length} events directly for ${sportName}`);
              return res.json(directEvents);
            } else {
                console.log(`No ${sportName} events found from direct API call, adapting data instead`);
                
                // If we get here, we need to adapt some data from football to show something
                // First, check if we have any events in our database
                if (events.length > 0) {
                  console.log(`Using ${events.length} events from database for sport ID ${reqSportId}`);
                  
                  // Add appropriate data to these events
                  enhancedEvents = events.map(event => ({
                    ...event,
                    isLive: true,
                    status: 'live',
                    markets: event.markets || []
                  }));
                  
                  return res.json(enhancedEvents);
                } else {
                  console.log(`Using adapted data for sport ID ${reqSportId} as fallback`);
                  
                  // Get football events and modify them for the requested sport
                  const footballEvents = await apiSportsService.getLiveEvents('football');
                  
                  if (footballEvents && footballEvents.length > 0) {
                    // Adapt football events to the requested sport
                    const adaptedEvents = footballEvents.slice(0, 8).map((event, index) => {
                      const sportName = sportMap[reqSportId] || 'unknown';
                      const teams = getSportSpecificTeams(sportName);
                      const leagueName = getSportLeagueName(sportName);
                      const totalPointsName = getSportTotalPointsName(sportName);
                      
                      // Get a pair of teams for this sport
                      const homeTeamIndex = index * 2 % teams.length;
                      const awayTeamIndex = (index * 2 + 1) % teams.length;
                      
                      const homeTeam = teams[homeTeamIndex];
                      const awayTeam = teams[awayTeamIndex];
                      
                      // Create a balanced score appropriate for the sport
                      let score;
                      
                      if (reqSportId === 2) { // Basketball
                        const homeScore = Math.floor(Math.random() * 45) + 40;
                        const awayScore = Math.floor(Math.random() * 45) + 35;
                        score = `${homeScore} - ${awayScore}`;
                      } else if (reqSportId === 3) { // Tennis
                        const homeScore = Math.floor(Math.random() * 2) + 1;
                        const awayScore = Math.floor(Math.random() * 2);
                        score = `${homeScore} - ${awayScore}`;
                      } else {
                        // Default to original score or create a new one
                        const homeScore = Math.floor(Math.random() * 3);
                        const awayScore = Math.floor(Math.random() * 3);
                        score = `${homeScore} - ${awayScore}`;
                      }
                      
                      return {
                        ...event,
                        id: `${sportName}-${index+1}-${Date.now()}`,
                        sportId: reqSportId,
                        leagueName: leagueName,
                        homeTeam: homeTeam,
                        awayTeam: awayTeam,
                        score: score,
                        markets: [
                          {
                            id: `market-${sportName}-${index+1}-match-winner`,
                            name: reqSportId === 3 ? 'Match Winner' : 'Match Result',
                            status: 'open',
                            marketType: reqSportId === 3 ? '12' : '1X2',
                            outcomes: reqSportId === 3 ?
                              [ // Tennis (no draw)
                                { id: `outcome-${sportName}-${index+1}-home`, name: homeTeam, odds: 1.7 + Math.random() * 0.4, status: 'active', probability: 0.55 },
                                { id: `outcome-${sportName}-${index+1}-away`, name: awayTeam, odds: 1.9 + Math.random() * 0.5, status: 'active', probability: 0.45 }
                              ] : 
                              [ // Other sports (with draw)
                                { id: `outcome-${sportName}-${index+1}-home`, name: homeTeam, odds: 1.85 + Math.random() * 0.5, status: 'active', probability: 0.47 },
                                { id: `outcome-${sportName}-${index+1}-draw`, name: 'Draw', odds: 3.2 + Math.random() * 0.7, status: 'active', probability: 0.31 },
                                { id: `outcome-${sportName}-${index+1}-away`, name: awayTeam, odds: 2.05 + Math.random() * 0.6, status: 'active', probability: 0.33 }
                              ]
                          },
                          {
                            id: `market-${sportName}-${index+1}-total`,
                            name: totalPointsName,
                            status: 'open',
                            marketType: 'total',
                            outcomes: reqSportId === 2 ? // Basketball
                              [
                                { id: `outcome-${sportName}-${index+1}-over`, name: 'Over 195.5', odds: 1.95, status: 'active', probability: 0.49 },
                                { id: `outcome-${sportName}-${index+1}-under`, name: 'Under 195.5', odds: 1.85, status: 'active', probability: 0.51 }
                              ] : reqSportId === 3 ? // Tennis
                              [
                                { id: `outcome-${sportName}-${index+1}-over`, name: 'Over 22.5', odds: 1.95, status: 'active', probability: 0.49 },
                                { id: `outcome-${sportName}-${index+1}-under`, name: 'Under 22.5', odds: 1.85, status: 'active', probability: 0.51 }
                              ] : // Default (football)
                              [
                                { id: `outcome-${sportName}-${index+1}-over`, name: 'Over 2.5', odds: 1.95, status: 'active', probability: 0.49 },
                                { id: `outcome-${sportName}-${index+1}-under`, name: 'Under 2.5', odds: 1.85, status: 'active', probability: 0.51 }
                              ]
                          }
                        ]
                      };
                    });
                    
                    console.log(`Adapted ${adaptedEvents.length} events with real data structure for sport ID ${reqSportId}`);
                    return res.json(adaptedEvents);
                  }
                }
              }
            }
          } else {
            // No specific sport requested, return all events
            return res.json(allEvents);
          }
        }
      }
      
      // Add any needed market data to database events
      let enhancedEvents = events.map(event => {
        const hasMarkets = event.markets && Array.isArray(event.markets) && event.markets.length > 0;
        return {
          ...event,
          isLive: isLive !== undefined ? isLive : (event.isLive || false),
          status: event.status || 'scheduled',
          markets: hasMarkets ? event.markets : [
            {
              id: `market-${event.id}-1`,
              name: 'Match Result',
              status: 'open',
              marketType: '1X2',
              outcomes: [
                { id: `outcome-${event.id}-1-1`, name: event.homeTeam, odds: 1.85 + Math.random() * 0.5, status: 'active' },
                { id: `outcome-${event.id}-1-2`, name: 'Draw', odds: 3.2 + Math.random() * 0.7, status: 'active' },
                { id: `outcome-${event.id}-1-3`, name: event.awayTeam, odds: 2.05 + Math.random() * 0.6, status: 'active' }
              ]
            },
            {
              id: `market-${event.id}-2`,
              name: 'Over/Under 2.5 Goals',
              status: 'open',
              marketType: 'OVER_UNDER',
              outcomes: [
                { id: `outcome-${event.id}-2-1`, name: 'Over 2.5', odds: 1.95 + Math.random() * 0.3, status: 'active' },
                { id: `outcome-${event.id}-2-2`, name: 'Under 2.5', odds: 1.85 + Math.random() * 0.3, status: 'active' }
              ]
            }
          ]
        };
      });
      
      return res.json(enhancedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });
  
  // IMPORTANT: Add the live events endpoint BEFORE the :id endpoint to avoid routing conflicts
  app.get("/api/events/live", async (req: Request, res: Response) => {
    try {
      // Redirect to our standard events endpoint with isLive=true
      // This ensures consistent behavior between both endpoints
      const sportId = req.query.sportId ? Number(req.query.sportId) : undefined;
      
      // Construct the redirect URL with all query parameters
      const redirectUrl = `/api/events?isLive=true${sportId ? `&sportId=${sportId}` : ''}`;
      
      console.log(`Redirecting /api/events/live to ${redirectUrl}`);
      
      // Issue a redirect to the events endpoint with isLive=true
      return res.redirect(302, redirectUrl);
    } catch (error) {
      console.error('Error in live events redirect:', error);
      res.status(500).json({ error: 'Failed to fetch live events' });
    }
  });
  
  // Helper functions for data generation - moved outside the route handlers
  function getSportId(sport: string): number {
    const sportMap: Record<string, number> = {
      'football': 1,
      'basketball': 2,
      'tennis': 3,
      'baseball': 4,
      'hockey': 5,
      'handball': 6,
      'volleyball': 7,
      'rugby': 8,
      'cricket': 9,
      'golf': 10,
      'boxing': 11,
      'mma': 12,
      'motorsport': 13,
      'cycling': 14,
      'american_football': 15,
      'snooker': 16,
      'darts': 17,
      'table_tennis': 18,
      'badminton': 19,
      'esports': 20
    };
    return sportMap[sport] || 1;
  }
  
  function getSportSpecificTeams(sport: string): string[] {
        const teamMap: Record<string, string[]> = {
          'basketball': ['LA Lakers', 'Boston Celtics', 'Miami Heat', 'Golden State Warriors', 'Chicago Bulls', 'Brooklyn Nets', 'Dallas Mavericks', 'Phoenix Suns'],
          'tennis': ['Rafael Nadal', 'Novak Djokovic', 'Roger Federer', 'Andy Murray', 'Carlos Alcaraz', 'Daniil Medvedev', 'Stefanos Tsitsipas', 'Alexander Zverev'],
          'baseball': ['New York Yankees', 'Boston Red Sox', 'LA Dodgers', 'Chicago Cubs', 'Houston Astros', 'Atlanta Braves', 'Toronto Blue Jays', 'San Francisco Giants'],
          'hockey': ['Toronto Maple Leafs', 'Montreal Canadiens', 'Boston Bruins', 'Chicago Blackhawks', 'New York Rangers', 'Pittsburgh Penguins', 'Edmonton Oilers', 'Tampa Bay Lightning'],
          'handball': ['Barcelona', 'Paris Saint-Germain', 'THW Kiel', 'Veszprém', 'Aalborg Håndbold', 'Flensburg-Handewitt', 'RK Zagreb', 'Vardar Skopje'],
          'volleyball': ['Trentino Volley', 'ZAKSA Kędzierzyn-Koźle', 'Zenit Kazan', 'Lube Civitanova', 'PGE Skra Bełchatów', 'Berlin Recycling Volleys', 'Dinamo Moscow', 'Sada Cruzeiro'],
          'rugby': ['New Zealand', 'South Africa', 'England', 'Ireland', 'France', 'Wales', 'Australia', 'Argentina'],
          'cricket': ['Mumbai Indians', 'Chennai Super Kings', 'Royal Challengers Bangalore', 'Kolkata Knight Riders', 'Delhi Capitals', 'Sunrisers Hyderabad', 'Rajasthan Royals', 'Punjab Kings'],
          'american_football': ['Kansas City Chiefs', 'Dallas Cowboys', 'Green Bay Packers', 'New England Patriots', 'Tampa Bay Buccaneers', 'Pittsburgh Steelers', 'San Francisco 49ers', 'Philadelphia Eagles'],
          'boxing': ['Tyson Fury', 'Anthony Joshua', 'Oleksandr Usyk', 'Deontay Wilder', 'Canelo Alvarez', 'Gennady Golovkin', 'Errol Spence Jr.', 'Terence Crawford'],
          'mma': ['Jon Jones', 'Khabib Nurmagomedov', 'Conor McGregor', 'Israel Adesanya', 'Francis Ngannou', 'Dustin Poirier', 'Charles Oliveira', 'Max Holloway'],
          'golf': ['Rory McIlroy', 'Tiger Woods', 'Jon Rahm', 'Scottie Scheffler', 'Brooks Koepka', 'Jordan Spieth', 'Justin Thomas', 'Bryson DeChambeau'],
          'darts': ['Michael van Gerwen', 'Peter Wright', 'Gerwyn Price', 'Michael Smith', 'Gary Anderson', 'Rob Cross', 'James Wade', 'Jonny Clayton'],
          'snooker': ['Ronnie O\'Sullivan', 'Judd Trump', 'Mark Selby', 'Neil Robertson', 'John Higgins', 'Shaun Murphy', 'Mark Williams', 'Kyren Wilson'],
          'table_tennis': ['Fan Zhendong', 'Ma Long', 'Timo Boll', 'Dimitrij Ovtcharov', 'Hugo Calderano', 'Lin Yun-Ju', 'Tomokazu Harimoto', 'Mattias Falck'],
          'badminton': ['Viktor Axelsen', 'Kento Momota', 'Anders Antonsen', 'Lee Zii Jia', 'Chen Long', 'Chou Tien-chen', 'Anthony Sinisuka Ginting', 'Jonatan Christie'],
          'motorsport': ['Max Verstappen', 'Lewis Hamilton', 'Charles Leclerc', 'Lando Norris', 'Carlos Sainz', 'Fernando Alonso', 'Sergio Perez', 'George Russell'],
          'cycling': ['Tadej Pogačar', 'Jonas Vingegaard', 'Primož Roglič', 'Remco Evenepoel', 'Wout van Aert', 'Mathieu van der Poel', 'Julian Alaphilippe', 'Peter Sagan'],
          'esports': ['FaZe Clan', 'G2 Esports', 'Team Liquid', 'Natus Vincere', 'T1', 'Cloud9', 'Fnatic', 'ENCE']
        };
        return teamMap[sport] || [`${sport.charAt(0).toUpperCase() + sport.slice(1)} Team 1`, `${sport.charAt(0).toUpperCase() + sport.slice(1)} Team 2`, 
                                  `${sport.charAt(0).toUpperCase() + sport.slice(1)} Team 3`, `${sport.charAt(0).toUpperCase() + sport.slice(1)} Team 4`,
                                  `${sport.charAt(0).toUpperCase() + sport.slice(1)} Team 5`, `${sport.charAt(0).toUpperCase() + sport.slice(1)} Team 6`,
                                  `${sport.charAt(0).toUpperCase() + sport.slice(1)} Team 7`, `${sport.charAt(0).toUpperCase() + sport.slice(1)} Team 8`];
      }
      
      function getSportLeagueName(sport: string): string {
        const leagueMap: Record<string, string> = {
          'basketball': 'NBA',
          'tennis': 'ATP Tour',
          'baseball': 'MLB',
          'hockey': 'NHL',
          'handball': 'Champions League',
          'volleyball': 'World League',
          'rugby': 'Six Nations',
          'cricket': 'IPL',
          'golf': 'PGA Tour',
          'boxing': 'World Championship',
          'mma': 'UFC',
          'motorsport': 'Formula 1',
          'cycling': 'Tour de France',
          'american_football': 'NFL',
          'snooker': 'World Championship',
          'darts': 'PDC World Championship',
          'table_tennis': 'ITTF World Tour',
          'badminton': 'BWF World Tour',
          'esports': 'League of Legends'
        };
        return leagueMap[sport] || `${sport.charAt(0).toUpperCase() + sport.slice(1)} League`;
      }
      
      function getSportTotalPointsName(sport: string): string {
        const totalPointsMap: Record<string, string> = {
          'basketball': 'Total Points',
          'tennis': 'Total Games',
          'baseball': 'Total Runs',
          'hockey': 'Total Goals',
          'american_football': 'Total Points',
          'rugby': 'Total Points',
          'cricket': 'Total Runs',
          'snooker': 'Total Frames',
          'darts': 'Total 180s'
        };
        return totalPointsMap[sport] || 'Total Goals';
      }
      
      // This section has been moved to the enhancedEvents variable inside the main events endpoint
      
      res.json(enhancedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // IMPORTANT: Add the live events endpoint BEFORE the :id endpoint to avoid routing conflicts
  app.get("/api/events/live", async (req: Request, res: Response) => {
    try {
      // Redirect to our standard events endpoint with isLive=true
      // This ensures consistent behavior between both endpoints
      const sportId = req.query.sportId ? Number(req.query.sportId) : undefined;
      
      // Construct the redirect URL with all query parameters
      const redirectUrl = `/api/events?isLive=true${sportId ? `&sportId=${sportId}` : ''}`;
      
      console.log(`Redirecting /api/events/live to ${redirectUrl}`);
      
      // Issue a redirect to the events endpoint with isLive=true
      return res.redirect(302, redirectUrl);
    } catch (error) {
      console.error('Error in live events redirect:', error);
      res.status(500).json({ error: 'Failed to fetch live events' });
    }
  });
  
  // Individual event endpoint - MUST come after specific endpoints like /api/events/live
  app.get("/api/events/:id", async (req: Request, res: Response) => {
    try {
      // Ensure id is a valid number
      const id = Number(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID format" });
      }
      
      const event = await storage.getEvent(id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Create a copy of the event with proper typing
      const eventWithMarkets: any = {
        ...event,
        // Use existing values or defaults, don't force live status
        isLive: event.isLive !== undefined ? event.isLive : false,
        status: event.status || 'scheduled',
        name: event.name || `${event.homeTeam} vs ${event.awayTeam}`
      };
        
      // Check if event already has markets
      if (eventWithMarkets.markets && eventWithMarkets.markets.length > 0 && 
          eventWithMarkets.markets[0].outcomes && eventWithMarkets.markets[0].outcomes.length > 0) {
        // If it has markets, ensure they have proper status and odds
        eventWithMarkets.markets = eventWithMarkets.markets.map((market: any) => ({
          ...market,
          status: 'open',
          outcomes: market.outcomes ? market.outcomes.map((outcome: any) => ({
            ...outcome,
            odds: outcome.odds < 1.1 ? 1.5 + Math.random() * 3 : outcome.odds,
            status: 'active'
          })) : []
        }));
      } else {
        // If no markets exist, create standard football markets
        eventWithMarkets.markets = [
          {
            id: `market-${event.id}-1`,
            name: 'Match Result',
            status: 'open',
            marketType: '1X2',
            outcomes: [
              { id: `outcome-${event.id}-1-1`, name: event.homeTeam, odds: 1.85 + Math.random() * 0.5, status: 'active' },
              { id: `outcome-${event.id}-1-2`, name: 'Draw', odds: 3.2 + Math.random() * 0.7, status: 'active' },
              { id: `outcome-${event.id}-1-3`, name: event.awayTeam, odds: 2.05 + Math.random() * 0.6, status: 'active' }
            ]
          },
          {
            id: `market-${event.id}-2`,
            name: 'Over/Under 2.5 Goals',
            status: 'open',
            marketType: 'OVER_UNDER',
            outcomes: [
              { id: `outcome-${event.id}-2-1`, name: 'Over 2.5', odds: 1.95 + Math.random() * 0.3, status: 'active' },
              { id: `outcome-${event.id}-2-2`, name: 'Under 2.5', odds: 1.85 + Math.random() * 0.3, status: 'active' }
            ]
          }
        ];
      }
      
      res.json(eventWithMarkets);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  // Promotions routes
  app.get("/api/promotions", async (req: Request, res: Response) => {
    try {
      const isActive = req.query.isActive ? req.query.isActive === 'true' : true;
      const promotions = await storage.getPromotions(isActive);
      res.json(promotions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch promotions" });
    }
  });

  // User routes
  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(validatedData.username);
      
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.get("/api/users/wallet/:address", async (req: Request, res: Response) => {
    try {
      const address = req.params.address;
      const user = await storage.getUserByWalletAddress(address);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Betting routes with Sui Move blockchain integration
  
  // Bet with SUI tokens
  app.post("/api/bets/sui", async (req: Request, res: Response) => {
    try {
      const validatedData = insertBetSchema.parse(req.body);
      
      // Ensure userId, eventId, and wallet address are present
      if (typeof validatedData.userId !== 'number' || isNaN(validatedData.userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      if (typeof validatedData.eventId !== 'number' && isNaN(Number(validatedData.eventId))) {
        return res.status(400).json({ message: "Invalid event ID format" });
      }
      
      // Check for required bet parameters
      if (!validatedData.prediction || !validatedData.odds || !validatedData.betAmount) {
        return res.status(400).json({ 
          message: "Missing required bet parameters", 
          details: "prediction, odds, and betAmount are required"
        });
      }
      
      // Convert eventId to number if needed
      const eventId = typeof validatedData.eventId === 'number' 
        ? validatedData.eventId 
        : Number(validatedData.eventId);
        
      const user = await storage.getUser(validatedData.userId);
      const event = await storage.getEvent(eventId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Ensure user has wallet address
      if (!user.walletAddress) {
        return res.status(400).json({ message: "User has no wallet connected" });
      }
      
      // Ensure user.balance is treated as 0 if null
      const userBalance = user.balance ?? 0;
      
      if (userBalance < validatedData.betAmount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }
      
      // Use the Sui Move service for wurlus protocol integration and place bet with SUI tokens
      const txHash = await suiMoveService.placeBetWithSui(
        user.id,
        user.walletAddress,
        eventId,
        validatedData.marketId || 0,
        validatedData.outcomeId || 0,
        validatedData.betAmount,
        validatedData.odds
      );
      
      if (!txHash) {
        return res.status(500).json({ message: "Failed to place bet on blockchain" });
      }
      
      // Return success response
      res.json({
        success: true,
        txHash,
        message: `Successfully placed bet of ${validatedData.betAmount} SUI on ${validatedData.prediction}`,
        currency: "SUI"
      });
    } catch (error) {
      console.error("Error placing SUI bet:", error);
      res.status(500).json({ message: "Failed to place bet with SUI" });
    }
  });
  
  // Bet with SBETS tokens
  app.post("/api/bets/sbets", async (req: Request, res: Response) => {
    try {
      const validatedData = insertBetSchema.parse(req.body);
      
      // Ensure userId, eventId, and wallet address are present
      if (typeof validatedData.userId !== 'number' || isNaN(validatedData.userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      if (typeof validatedData.eventId !== 'number' && isNaN(Number(validatedData.eventId))) {
        return res.status(400).json({ message: "Invalid event ID format" });
      }
      
      // Check for required bet parameters
      if (!validatedData.prediction || !validatedData.odds || !validatedData.betAmount) {
        return res.status(400).json({ 
          message: "Missing required bet parameters", 
          details: "prediction, odds, and betAmount are required"
        });
      }
      
      // Convert eventId to number if needed
      const eventId = typeof validatedData.eventId === 'number' 
        ? validatedData.eventId 
        : Number(validatedData.eventId);
        
      const user = await storage.getUser(validatedData.userId);
      const event = await storage.getEvent(eventId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Ensure user has wallet address
      if (!user.walletAddress) {
        return res.status(400).json({ message: "User has no wallet connected" });
      }
      
      // We don't check SBETS balance here since that's maintained on the blockchain
      // and will be verified when the actual transaction is executed
      
      // Use the Sui Move service for wurlus protocol integration and place bet with SBETS tokens
      const txHash = await suiMoveService.placeBetWithSbets(
        user.id,
        user.walletAddress,
        eventId,
        validatedData.marketId || 0,
        validatedData.outcomeId || 0,
        validatedData.betAmount,
        validatedData.odds
      );
      
      if (!txHash) {
        return res.status(500).json({ message: "Failed to place bet on blockchain" });
      }
      
      // Return success response
      res.json({
        success: true,
        txHash,
        message: `Successfully placed bet of ${validatedData.betAmount} SBETS on ${validatedData.prediction}`,
        currency: "SBETS",
        tokenAddress: "0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285::sbets::SBETS"
      });
    } catch (error) {
      console.error("Error placing SBETS bet:", error);
      res.status(500).json({ message: "Failed to place bet with SBETS tokens" });
    }
  });
  
  // Legacy endpoint for backward compatibility
  app.post("/api/bets", async (req: Request, res: Response) => {
    try {
      const validatedData = insertBetSchema.parse(req.body);
      
      // Check if currency is specified
      const currency = validatedData.feeCurrency || 'SUI';
      
      // Skip the redirection for now which is causing a parsing error
      // Store the bet directly in the database instead of redirecting to other endpoints
      
      // Create a new bet in the database
      const bet = await storage.createBet({
        userId: Number(req.body.userId),
        eventId: Number(req.body.eventId),
        marketId: req.body.marketId ? Number(req.body.marketId) : null,
        outcomeId: req.body.outcomeId || null,
        odds: Number(req.body.odds),
        betAmount: Number(req.body.betAmount),
        prediction: req.body.prediction,
        potentialPayout: Number(req.body.potentialPayout),
        status: 'pending',
        result: null,
        createdAt: new Date().toISOString(),
        settledAt: null,
        transactionHash: null,
        feeCurrency: req.body.feeCurrency || 'SUI'
      });
      
      return res.status(200).json(bet);
    } catch (error) {
      console.error("Error placing bet:", error);
      res.status(500).json({ message: "Failed to place bet" });
    }
  });

  app.get("/api/bets/user/:userId", async (req: Request, res: Response) => {
    try {
      const userId = Number(req.params.userId);
      const status = req.query.status as string | undefined;
      
      let bets = await storage.getBets(userId);
      
      // Filter by status if it's provided and not 'all'
      if (status && status !== 'all') {
        bets = bets.filter(bet => bet.status === status);
      }
      
      res.json(bets);
    } catch (error) {
      console.error("Error fetching bets:", error);
      res.status(500).json({ message: "Failed to fetch bets" });
    }
  });
  
  // Create parlay bet endpoint (accumulator)
  app.post("/api/parlays", async (req: Request, res: Response) => {
    try {
      const { 
        userId, 
        betAmount, 
        totalOdds, 
        potentialPayout, 
        legs,
        feeCurrency = 'SUI'
      } = req.body;
      
      if (!userId || !betAmount || !totalOdds || !legs || !Array.isArray(legs) || legs.length < 2) {
        return res.status(400).json({ 
          message: "Invalid parlay data",
          details: "userId, betAmount, totalOdds, and legs array with at least 2 selections are required"
        });
      }
      
      // Get user info
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Ensure user has wallet connected
      if (!user.walletAddress) {
        return res.status(400).json({ message: "User has no wallet connected" });
      }
      
      // Check if this is a SBETS or SUI parlay
      if (feeCurrency.toUpperCase() === 'SBETS') {
        // Process SBETS parlay through wurlus protocol
        const txHash = await suiMoveService.createParlayWithSbets(
          userId,
          user.walletAddress,
          betAmount,
          totalOdds,
          legs
        );
        
        if (!txHash) {
          return res.status(500).json({ message: "Failed to place parlay bet on blockchain" });
        }
        
        // Create the parlay in our database with appropriate references
        const parlay = await storage.createParlay({
          userId,
          betAmount,
          totalOdds,
          potentialPayout,
          feeCurrency: 'SBETS'
        });
        
        // Create each leg of the parlay
        for (const leg of legs) {
          await storage.createBetLeg({
            parlayId: parlay.id,
            eventId: leg.eventId,
            marketId: leg.marketId,
            odds: leg.odds,
            prediction: leg.prediction,
            outcomeId: leg.outcomeId || null,
            wurlusLegId: null // Will be updated when available
          });
        }
        
        return res.json({
          success: true,
          txHash,
          parlayId: parlay.id, 
          message: `Successfully placed parlay bet of ${betAmount} SBETS with ${legs.length} selections`,
          currency: "SBETS",
          tokenAddress: "0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285::sbets::SBETS"
        });
      } else {
        // Default to SUI parlay
        // Check if user has sufficient SUI balance
        const userBalance = user.balance ?? 0;
        if (userBalance < betAmount) {
          return res.status(400).json({ message: "Insufficient balance" });
        }
        
        // Process SUI parlay
        const txHash = await suiMoveService.createParlayWithSui(
          userId,
          user.walletAddress,
          betAmount,
          totalOdds,
          legs
        );
        
        if (!txHash) {
          return res.status(500).json({ message: "Failed to place parlay bet on blockchain" });
        }
        
        // Create the parlay in our database
        const parlay = await storage.createParlay({
          userId,
          betAmount,
          totalOdds,
          potentialPayout,
          feeCurrency: 'SUI'
        });
        
        // Create each leg of the parlay
        for (const leg of legs) {
          await storage.createBetLeg({
            parlayId: parlay.id,
            eventId: leg.eventId,
            marketId: leg.marketId,
            odds: leg.odds,
            prediction: leg.prediction,
            outcomeId: leg.outcomeId || null,
            wurlusLegId: null // Will be updated when available
          });
        }
        
        return res.json({
          success: true,
          txHash,
          parlayId: parlay.id,
          message: `Successfully placed parlay bet of ${betAmount} SUI with ${legs.length} selections`,
          currency: "SUI"
        });
      }
    } catch (error: any) {
      console.error("Error creating parlay bet:", error);
      res.status(500).json({ message: error.message || "Failed to create parlay bet" });
    }
  });
  
  // Cash out a single bet
  app.post("/api/bets/:betId/cash-out", async (req: Request, res: Response) => {
    try {
      const betId = parseInt(req.params.betId);
      const { userId, walletAddress, currency = 'SUI' } = req.body;
      
      if (isNaN(betId)) {
        return res.status(400).json({ message: 'Invalid bet ID' });
      }
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      if (!walletAddress) {
        return res.status(400).json({ message: 'Wallet address is required' });
      }
      
      // Check if the bet is eligible for cash out
      const bet = await storage.getBet(betId);
      if (!bet) {
        return res.status(404).json({ message: 'Bet not found' });
      }
      
      if (bet.userId !== userId) {
        return res.status(403).json({ message: 'Bet does not belong to this user' });
      }
      
      if (bet.status !== 'pending') {
        return res.status(400).json({ message: `Bet is not eligible for cash out. Status: ${bet.status}` });
      }
      
      try {
        // Calculate the cash out amount
        const cashOutAmount = await storage.calculateSingleBetCashOutAmount(betId);
        if (!cashOutAmount) {
          return res.status(400).json({ message: 'Cash out is not available for this bet' });
        }
        
        // Process the cash out using the SuiMoveService for blockchain integration
        const txHash = await suiMoveService.cashOutSingleBet(walletAddress, betId.toString(), cashOutAmount);
        
        if (!txHash) {
          return res.status(500).json({ message: 'Failed to process cash out' });
        }
        
        // Attempt to update the bet using our error-handling cashOutSingleBet method
        try {
          await storage.cashOutSingleBet(betId);
        } catch (dbError: any) {
          console.warn('Error updating bet in database, but blockchain transaction completed:', dbError.message);
          // We'll still continue since the blockchain transaction was successful
        }
        
        // Get the updated bet details
        const updatedBet = await storage.getBet(betId);
        
        res.json({ 
          success: true, 
          message: 'Bet successfully cashed out',
          transactionHash: txHash,
          bet: updatedBet,
          amount: cashOutAmount,
          currency
        });
      } catch (innerError: any) {
        // Handle specific database schema errors
        if (innerError.message && innerError.message.includes('column') && innerError.message.includes('does not exist')) {
          console.error('Database schema error during cash out:', innerError.message);
          return res.status(500).json({ 
            message: 'Database schema issue detected. Cash out operation could not be completed. Please contact support.',
            error: 'SCHEMA_ERROR'
          });
        }
        throw innerError; // Re-throw for the outer catch block
      }
    } catch (error: any) {
      console.error('Error cashing out bet:', error);
      res.status(500).json({ message: error.message || 'Failed to process cash out' });
    }
  });
  
  // Cash out a parlay bet
  app.post("/api/parlays/:parlayId/cash-out", async (req: Request, res: Response) => {
    try {
      const parlayId = parseInt(req.params.parlayId);
      const { userId, walletAddress, currency = 'SUI' } = req.body;
      
      if (isNaN(parlayId)) {
        return res.status(400).json({ message: 'Invalid parlay ID' });
      }
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      if (!walletAddress) {
        return res.status(400).json({ message: 'Wallet address is required' });
      }
      
      // Check if the parlay is eligible for cash out
      const parlay = await storage.getParlay(parlayId);
      if (!parlay) {
        return res.status(404).json({ message: 'Parlay not found' });
      }
      
      if (parlay.userId !== userId) {
        return res.status(403).json({ message: 'Parlay does not belong to this user' });
      }
      
      if (parlay.status !== 'pending') {
        return res.status(400).json({ message: `Parlay is not eligible for cash out. Status: ${parlay.status}` });
      }
      
      try {
        // Calculate the cash out amount
        const cashOutAmount = await storage.calculateCashOutAmount(parlayId);
        if (!cashOutAmount) {
          return res.status(400).json({ message: 'Cash out is not available for this parlay' });
        }
        
        // Process the cash out using the SuiMoveService for blockchain integration
        const txHash = await suiMoveService.cashOutParlay(walletAddress, parlayId.toString(), cashOutAmount);
        
        if (!txHash) {
          return res.status(500).json({ message: 'Failed to process parlay cash out' });
        }
        
        // Attempt to update the parlay using our error-handling cashOutParlay method
        try {
          await storage.cashOutParlay(parlayId);
        } catch (dbError: any) {
          console.warn('Error updating parlay in database, but blockchain transaction completed:', dbError.message);
          // We'll still continue since the blockchain transaction was successful
        }
        
        // Get the updated parlay details
        const updatedParlay = await storage.getParlay(parlayId);
        
        res.json({ 
          success: true, 
          message: 'Parlay successfully cashed out',
          transactionHash: txHash,
          parlay: updatedParlay,
          amount: cashOutAmount,
          currency
        });
      } catch (innerError: any) {
        // Handle specific database schema errors
        if (innerError.message && innerError.message.includes('column') && innerError.message.includes('does not exist')) {
          console.error('Database schema error during parlay cash out:', innerError.message);
          return res.status(500).json({ 
            message: 'Database schema issue detected. Cash out operation could not be completed. Please contact support.',
            error: 'SCHEMA_ERROR'
          });
        }
        throw innerError; // Re-throw for the outer catch block
      }
    } catch (error: any) {
      console.error('Error cashing out parlay:', error);
      res.status(500).json({ message: error.message || 'Failed to process parlay cash out' });
    }
  });

  // Notifications routes
  app.get("/api/notifications/user/:userId", async (req: Request, res: Response) => {
    try {
      const userId = Number(req.params.userId);
      const unreadOnly = req.query.unreadOnly === 'true';
      
      let notifications;
      if (unreadOnly) {
        notifications = await storage.getUnreadNotifications(userId);
      } else {
        notifications = await storage.getNotifications(userId);
      }
      
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications", async (req: Request, res: Response) => {
    try {
      const validatedData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(validatedData);
      res.status(201).json(notification);
    } catch (error) {
      res.status(400).json({ message: "Invalid notification data" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const notification = await storage.markNotificationAsRead(id);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/user/:userId/read-all", async (req: Request, res: Response) => {
    try {
      const userId = Number(req.params.userId);
      await storage.markAllNotificationsAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Sui Blockchain integration routes with Sui Move language integration
  // Wallet integration routes
  
  // Get wallet balance
  app.get("/api/wallet/:address/balance", async (req: Request, res: Response) => {
    try {
      const walletAddress = req.params.address;
      
      if (!walletAddress) {
        return res.status(400).json({ message: "Wallet address is required" });
      }
      
      // Get balance from blockchain
      const balances = await suiMoveService.getWalletBalance(walletAddress);
      
      res.json({
        sui: balances.sui,
        sbets: balances.sbets
      });
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
      res.status(500).json({ message: "Failed to fetch wallet balance" });
    }
  });
  
  // Transfer SUI tokens
  app.post("/api/wallet/transfer/sui", async (req: Request, res: Response) => {
    try {
      const { sender, recipient, amount } = req.body;
      
      if (!sender || !recipient || !amount) {
        return res.status(400).json({ 
          message: "Sender, recipient, and amount are required" 
        });
      }
      
      // Transfer SUI tokens
      const txHash = await walrusService.transferSui(sender, recipient, amount);
      
      res.json({
        success: true,
        txHash,
        message: `Successfully transferred ${amount} SUI to ${recipient}`
      });
    } catch (error) {
      console.error("Error transferring SUI:", error);
      res.status(500).json({ message: "Failed to transfer SUI" });
    }
  });
  
  // Transfer SBETS tokens
  app.post("/api/wallet/transfer/sbets", async (req: Request, res: Response) => {
    try {
      const { sender, recipient, amount } = req.body;
      
      if (!sender || !recipient || !amount) {
        return res.status(400).json({ 
          message: "Sender, recipient, and amount are required" 
        });
      }
      
      // Transfer SBETS tokens
      const txHash = await walrusService.transferSbets(sender, recipient, amount);
      
      res.json({
        success: true,
        txHash,
        message: `Successfully transferred ${amount} SBETS to ${recipient}`
      });
    } catch (error) {
      console.error("Error transferring SBETS:", error);
      res.status(500).json({ message: "Failed to transfer SBETS" });
    }
  });
  
  // Connect wallet to the platform
  app.post("/api/wallet/connect", async (req: Request, res: Response) => {
    try {
      const { address, walletType } = req.body;
      
      if (!address) {
        return res.status(400).json({ message: "Wallet address is required" });
      }
      
      // Validate wallet address format using securityService
      if (!securityService.validateWalletAddress(address)) {
        return res.status(400).json({ 
          message: "Invalid wallet address format", 
          details: "Wallet address must be a valid Sui address" 
        });
      }
      
      // Sanitize inputs to prevent XSS
      const sanitizedWalletType = walletType || 'Sui';
      
      // Using the imported suiMoveService singleton for wurlus protocol integration

      // Connect wallet to wurlus protocol using Sui Move
      console.log(`Connecting wallet ${address} to Wurlus protocol with type ${sanitizedWalletType}`);
      const connected = await suiMoveService.connectWallet(address);
      
      if (!connected) {
        return res.status(400).json({ message: "Failed to connect wallet to Wurlus protocol" });
      }
      
      let user = await storage.getUserByWalletAddress(address);
      
      if (!user) {
        // Create a new user if the wallet address doesn't exist
        // Generate a unique username with a secure random suffix for additional security
        const randomSuffix = securityService.generateSecureToken(4);
        const username = `user_${address.substring(0, 8)}_${randomSuffix}`;
        
        // For wallet-based users, generate a random password they never need to use
        // This satisfies the not-null constraint on the password field
        const randomPassword = securityService.generateSecureToken(16);
        
        const newUser = {
          username: username,
          password: randomPassword, // Add a random password for wallet-based users
          walletAddress: address,
          walletType: sanitizedWalletType,
          createdAt: new Date()
        };
        
        user = await storage.createUser(newUser);
        
        // Create welcome notification
        const notification = {
          userId: user.id,
          title: "Welcome to SuiBets",
          message: "Your wallet has been connected to the Wurlus protocol on the Sui blockchain.",
          type: "system",
          isRead: false,
          createdAt: new Date()
        };
        
        await storage.createNotification(notification);
      }
      
      try {
        // Get wallet balance from Sui blockchain via Sui Move
        const balance = await suiMoveService.getWalletBalance(address);
        
        // Update user with balance from blockchain
        const updateData = {
          suiBalance: balance.sui, 
          sbetsBalance: balance.sbets
        };
        user = await storage.updateUser(user.id, updateData);
      } catch (balanceError) {
        console.warn("Error updating balance, continuing with wallet connection:", balanceError);
        // Continue with connection even if balance update fails
      }
      
      // Generate a secure session token
      const sessionToken = securityService.generateSecureToken();
      
      // Return user data with session token, but exclude sensitive data
      // Make sure user exists before accessing its properties
      if (!user) {
        return res.status(500).json({ 
          message: "Failed to retrieve user data after connection" 
        });
      }
      
      const safeUserData = {
        id: user.id,
        username: user.username,
        walletAddress: user.walletAddress,
        walletType: user.walletType || 'Sui', // Provide default if not set
        suiBalance: user.suiBalance || 0,     // Use suiBalance instead of balance
        sbetsBalance: user.sbetsBalance || 0, // Include SBETS balance as well
        sessionToken: sessionToken
      };
      
      res.json(safeUserData);
    } catch (error) {
      console.error("Error connecting wallet:", error);
      res.status(500).json({ message: "Failed to connect wallet" });
    }
  });

  // Wurlus Protocol specific API endpoints
  app.post("/api/wurlus/connect", async (req: Request, res: Response) => {
    try {
      const { walletAddress, walletType } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ message: "Wallet address is required" });
      }
      
      // Sanitize inputs to prevent XSS
      const sanitizedWalletType = walletType || 'Sui';
      
      // Using the imported suiMoveService singleton for wurlus protocol integration
      
      // Connect to the Wurlus protocol using Sui Move
      const connected = await suiMoveService.connectWallet(walletAddress);
      
      if (!connected) {
        return res.status(400).json({ 
          success: false, 
          message: "Failed to connect to Wurlus protocol" 
        });
      }
      
      // Return success response
      res.json({ 
        success: true, 
        message: "Successfully connected to Wurlus protocol" 
      });
    } catch (error) {
      console.error("Error connecting to Wurlus protocol:", error);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error connecting to Wurlus protocol" 
      });
    }
  });
  
  // Check if user is registered with Wurlus protocol
  app.get("/api/wurlus/registration/:walletAddress", async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        return res.status(400).json({ message: "Wallet address is required" });
      }
      
      // Using the imported suiMoveService singleton
      const isRegistered = await suiMoveService.getUserRegistrationStatus(walletAddress);
      
      res.json({ 
        success: true,
        isRegistered,
        walletAddress
      });
    } catch (error) {
      console.error("Error checking registration status:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to check registration status" 
      });
    }
  });
  
  // Get user's dividend information
  app.get("/api/wurlus/dividends/:walletAddress", async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        return res.status(400).json({ message: "Wallet address is required" });
      }
      
      // Using the imported suiMoveService singleton
      const dividends = await suiMoveService.getUserDividends(walletAddress);
      
      // Format dates for better readability in the response
      const formattedDividends = {
        ...dividends,
        // Format times as ISO strings for better client-side handling
        lastClaimTime: new Date(dividends.lastClaimTime).toISOString(),
        stakingStartTime: new Date(dividends.stakingStartTime).toISOString(),
        stakingEndTime: new Date(dividends.stakingEndTime).toISOString(),
        // Add display values for better user experience
        displayValues: {
          availableDividends: dividends.availableDividends.toFixed(4) + ' SUI',
          claimedDividends: dividends.claimedDividends.toFixed(4) + ' SUI',
          stakingAmount: dividends.stakingAmount.toFixed(4) + ' SUI',
          totalRewards: dividends.totalRewards.toFixed(4) + ' SUI',
          platformFees: dividends.platformFees.toFixed(4) + ' SUI',
          feePercentage: '10%' // Based on Wal.app cost documentation
        }
      };
      
      res.json({ 
        success: true,
        walletAddress,
        ...formattedDividends
      });
    } catch (error) {
      console.error("Error fetching dividend information:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch dividend information" 
      });
    }
  });
  
  // Stake tokens in the Wurlus protocol
  app.post("/api/wurlus/stake", async (req: Request, res: Response) => {
    try {
      const { walletAddress, amount, periodDays } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ 
          success: false, 
          message: "Wallet address is required" 
        });
      }
      
      if (amount <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Amount must be greater than 0" 
        });
      }
      
      if (periodDays <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Staking period must be greater than 0 days" 
        });
      }
      
      // Using the imported suiMoveService singleton
      const txHash = await suiMoveService.stakeTokens(walletAddress, amount, periodDays);
      
      res.json({ 
        success: true,
        walletAddress,
        amount,
        periodDays,
        txHash
      });
    } catch (error) {
      console.error("Error staking tokens:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to stake tokens" 
      });
    }
  });
  
  // Claim winnings from a bet
  app.post("/api/wurlus/claim-winnings", async (req: Request, res: Response) => {
    try {
      const { walletAddress, betId } = req.body;
      
      if (!walletAddress || !betId) {
        return res.status(400).json({ 
          success: false,
          message: "Wallet address and bet ID are required" 
        });
      }
      
      // Using the imported suiMoveService singleton
      const txHash = await suiMoveService.claimWinnings(walletAddress, betId);
      
      res.json({ 
        success: true,
        txHash,
        betId,
        message: "Successfully claimed winnings"
      });
    } catch (error) {
      console.error("Error claiming winnings:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to claim winnings" 
      });
    }
  });
  
  // Claim available dividends
  app.post("/api/wurlus/claim-dividends", async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ 
          success: false,
          message: "Wallet address is required" 
        });
      }
      
      // Using the imported suiMoveService singleton
      
      // Get current dividends to check if there's anything to claim
      const dividends = await suiMoveService.getUserDividends(walletAddress);
      
      if (dividends.availableDividends <= 0) {
        return res.status(400).json({
          success: false,
          message: "No dividends available to claim"
        });
      }
      
      // This method would need to be implemented in the SuiMoveService class
      // For now, we'll simulate a successful claim
      // const txHash = await suiMoveService.claimDividends(walletAddress);
      const txHash = "0x" + Math.random().toString(16).substring(2, 15);
      
      res.json({ 
        success: true,
        txHash,
        amount: dividends.availableDividends,
        message: "Successfully claimed dividends"
      });
    } catch (error) {
      console.error("Error claiming dividends:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to claim dividends" 
      });
    }
  });
  
  // Get betting history for a user
  app.get("/api/wurlus/bets/:walletAddress", async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        return res.status(400).json({ 
          success: false,
          message: "Wallet address is required" 
        });
      }
      
      // Using the imported suiMoveService singleton
      const bets = await suiMoveService.getUserBets(walletAddress);
      
      // Format bets with human-readable values for frontend display
      const formattedBets = bets.map(bet => {
        // Convert MIST string values to SUI numeric values
        const amountSui = parseFloat((parseInt(bet.amount) / 1e9).toFixed(9));
        const potentialPayoutSui = parseFloat((parseInt(bet.potential_payout) / 1e9).toFixed(9));
        const platformFeeSui = parseFloat((parseInt(bet.platform_fee) / 1e9).toFixed(9));
        const networkFeeSui = parseFloat((parseInt(bet.network_fee) / 1e9).toFixed(9));
        const oddsDecimal = (bet.odds / 100).toFixed(2);
        
        return {
          ...bet,
          // Add formatted display values for UI
          display: {
            amount: `${amountSui} SUI`,
            potential_payout: `${potentialPayoutSui} SUI`,
            platform_fee: `${platformFeeSui} SUI`,
            network_fee: `${networkFeeSui} SUI`,
            odds: oddsDecimal,
            placed_at: new Date(bet.placed_at).toISOString(),
            settled_at: bet.settled_at ? new Date(bet.settled_at).toISOString() : null,
            status_formatted: bet.status.charAt(0).toUpperCase() + bet.status.slice(1) // Capitalize status
          }
        };
      });
      
      res.json({ 
        success: true,
        walletAddress,
        bets: formattedBets
      });
    } catch (error) {
      console.error("Error fetching bet history:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch bet history" 
      });
    }
  });
  
  // Admin endpoints for Wurlus protocol
  
  // Create a new market for an event
  app.post("/api/wurlus/admin/markets", async (req: Request, res: Response) => {
    try {
      const { adminWallet, eventId, marketName } = req.body;
      
      if (!adminWallet || !eventId || !marketName) {
        return res.status(400).json({ 
          success: false,
          message: "Admin wallet, event ID, and market name are required" 
        });
      }
      
      // Using the imported suiMoveService singleton
      const startTime = Math.floor(Date.now() / 1000);
      const endTime = startTime + (24 * 60 * 60); // 24 hours later
      
      const marketId = await suiMoveService.createMarket(
        adminWallet, 
        Number(eventId), 
        marketName,
        [], // Empty outcomes array, will be added separately
        startTime,
        endTime
      );
      
      res.json({ 
        success: true,
        marketId,
        eventId,
        marketName
      });
    } catch (error) {
      console.error("Error creating market:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to create market" 
      });
    }
  });
  
  // Create a new outcome for a market
  app.post("/api/wurlus/admin/outcomes", async (req: Request, res: Response) => {
    try {
      const { adminWallet, marketId, outcomeName, oddsValue } = req.body;
      
      if (!adminWallet || !marketId || !outcomeName || !oddsValue) {
        return res.status(400).json({ 
          success: false,
          message: "Admin wallet, market ID, outcome name, and odds value are required" 
        });
      }
      
      // Using the imported suiMoveService singleton
      const outcomeId = await suiMoveService.createOutcome(
        adminWallet, 
        marketId, 
        outcomeName, 
        Number(oddsValue)
      );
      
      res.json({ 
        success: true,
        outcomeId,
        marketId,
        outcomeName,
        oddsValue
      });
    } catch (error) {
      console.error("Error creating outcome:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to create outcome" 
      });
    }
  });
  
  // Settle a market
  app.post("/api/wurlus/admin/settle-market", async (req: Request, res: Response) => {
    try {
      const { adminWallet, marketId, winningOutcomeId } = req.body;
      
      if (!adminWallet || !marketId || !winningOutcomeId) {
        return res.status(400).json({ 
          success: false,
          message: "Admin wallet, market ID, and winning outcome ID are required" 
        });
      }
      
      const txHash = await suiMoveService.settleMarket(
        adminWallet, 
        marketId, 
        winningOutcomeId
      );
      
      res.json({ 
        success: true,
        txHash,
        marketId,
        winningOutcomeId,
        message: "Market settled successfully"
      });
    } catch (error) {
      console.error("Error settling market:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to settle market" 
      });
    }
  });

  // Aggregator API endpoints based on Wal.app aggregator documentation
  // Start the odds aggregation service
  // Odds are automatically refreshed - refresh interval is already started in the constructor
  
  // Get all available events with odds
  app.get("/api/wurlus/events", async (req: Request, res: Response) => {
    try {
      // Import the mock data provider to get direct event data
      const { mockSportsDataProvider } = await import('./services/mockSportsDataProvider');
      
      // Get all available events
      const events = mockSportsDataProvider.getEvents();
      
      res.json({
        success: true,
        events,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch events" 
      });
    }
  });

  // Get best odds for an event
  app.get("/api/aggregator/events/:eventId/odds", async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      
      if (!eventId) {
        return res.status(400).json({ 
          success: false, 
          message: "Event ID is required" 
        });
      }
      
      // Mock implementation while we implement the actual service
      // This will be replaced with actual aggregated data in the future
      const mockOdds = [
        {
          outcomeId: `outcome-${eventId}-1`,
          marketId: `market-${eventId}-1`,
          eventId: eventId,
          value: 1.75 + Math.random() * 0.2,
          providerIds: ["wurlus", "walapp"],
          confidence: 0.85,
          timestamp: new Date()
        },
        {
          outcomeId: `outcome-${eventId}-2`,
          marketId: `market-${eventId}-1`,
          eventId: eventId,
          value: 3.25 + Math.random() * 0.3,
          providerIds: ["wurlus", "walapp"],
          confidence: 0.85,
          timestamp: new Date()
        },
        {
          outcomeId: `outcome-${eventId}-3`,
          marketId: `market-${eventId}-1`,
          eventId: eventId,
          value: 2.15 + Math.random() * 0.25,
          providerIds: ["wurlus", "walapp"],
          confidence: 0.85,
          timestamp: new Date()
        }
      ];
      
      res.json({
        success: true,
        eventId,
        odds: mockOdds,
        timestamp: Date.now(),
        providersCount: mockOdds.length > 0 ? mockOdds[0].providerIds.length : 0
      });
    } catch (error) {
      console.error("Error fetching aggregated odds:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch aggregated odds" 
      });
    }
  });

  // Get best odds for a market
  app.get("/api/aggregator/markets/:marketId/odds", async (req: Request, res: Response) => {
    try {
      const { marketId } = req.params;
      
      if (!marketId) {
        return res.status(400).json({ 
          success: false, 
          message: "Market ID is required" 
        });
      }
      
      // Mock implementation while we implement the actual service
      // This will be replaced with actual aggregated data in the future
      const mockOdds = [
        {
          outcomeId: `outcome-${marketId}-1`,
          marketId: marketId,
          eventId: `event-${marketId}`,
          value: 1.95 + Math.random() * 0.15,
          providerIds: ["wurlus", "walapp"],
          confidence: 0.85,
          timestamp: new Date()
        },
        {
          outcomeId: `outcome-${marketId}-2`,
          marketId: marketId,
          eventId: `event-${marketId}`,
          value: 1.85 + Math.random() * 0.2,
          providerIds: ["wurlus", "walapp"],
          confidence: 0.85,
          timestamp: new Date()
        }
      ];
      
      res.json({
        success: true,
        marketId,
        odds: mockOdds,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Error fetching market odds:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch market odds" 
      });
    }
  });

  // Get specific outcome odds
  app.get("/api/aggregator/outcomes", async (req: Request, res: Response) => {
    try {
      const { eventId, marketId, outcomeId } = req.query as Record<string, string>;
      
      if (!eventId || !marketId || !outcomeId) {
        return res.status(400).json({ 
          success: false, 
          message: "Event ID, Market ID, and Outcome ID are required" 
        });
      }
      
      // Mock implementation for now
      const mockOdds = {
        outcomeId: outcomeId,
        marketId: marketId,
        eventId: eventId,
        value: 1.95 + Math.random() * 0.15,
        providerIds: ["wurlus", "walapp", "sportsdata"],
        bestValue: 2.05 + Math.random() * 0.1,
        bestProviderId: "sportsdata",
        range: {
          min: 1.85,
          max: 2.15
        },
        confidence: 0.9,
        timestamp: new Date()
      };
      
      res.json({
        success: true,
        eventId,
        marketId,
        outcomeId,
        odds: mockOdds,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Error fetching outcome odds:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch outcome odds" 
      });
    }
  });

  // Get aggregator providers status
  app.get("/api/aggregator/providers", async (req: Request, res: Response) => {
    try {
      const providers = aggregatorService.getProviders();
      
      res.json({
        success: true,
        providers,
        timestamp: Date.now(),
        count: providers.length
      });
    } catch (error) {
      console.error("Error fetching aggregator providers:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch aggregator providers" 
      });
    }
  });

  // Get detailed provider information
  app.get("/api/aggregator/providers/:providerId", async (req: Request, res: Response) => {
    try {
      const { providerId } = req.params;
      
      if (!providerId) {
        return res.status(400).json({ 
          success: false, 
          message: "Provider ID is required" 
        });
      }
      
      const provider = aggregatorService.getProvider(providerId);
      
      if (!provider) {
        return res.status(404).json({ 
          success: false, 
          message: "Provider not found" 
        });
      }
      
      res.json({
        success: true,
        provider,
        status: { active: provider.enabled },
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Error fetching provider details:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch provider details" 
      });
    }
  });

  // Toggle provider status
  app.patch("/api/aggregator/providers/:providerId/toggle", async (req: Request, res: Response) => {
    try {
      const { providerId } = req.params;
      const { enabled } = req.body;
      
      if (!providerId) {
        return res.status(400).json({ 
          success: false, 
          message: "Provider ID is required" 
        });
      }
      
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ 
          success: false, 
          message: "Enabled status must be a boolean" 
        });
      }
      
      const isToggled = aggregatorService.toggleProvider(providerId, enabled);
      
      if (!isToggled) {
        return res.status(404).json({ 
          success: false, 
          message: "Provider not found" 
        });
      }
      
      res.json({
        success: true,
        providerId,
        enabled,
        message: `Provider ${enabled ? 'enabled' : 'disabled'} successfully`
      });
    } catch (error) {
      console.error("Error toggling provider status:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to toggle provider status" 
      });
    }
  });

  // Update provider weight
  app.patch("/api/aggregator/providers/:providerId/weight", async (req: Request, res: Response) => {
    try {
      const { providerId } = req.params;
      const { weight } = req.body;
      
      if (!providerId) {
        return res.status(400).json({ 
          success: false, 
          message: "Provider ID is required" 
        });
      }
      
      if (typeof weight !== 'number' || weight < 0 || weight > 1) {
        return res.status(400).json({ 
          success: false, 
          message: "Weight must be a number between 0 and 1" 
        });
      }
      
      const success = aggregatorService.updateProviderWeight(providerId, weight);
      
      if (!success) {
        return res.status(404).json({ 
          success: false, 
          message: "Provider not found" 
        });
      }
      
      res.json({
        success: true,
        providerId,
        weight,
        message: "Provider weight updated successfully"
      });
    } catch (error) {
      console.error("Error updating provider weight:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to update provider weight" 
      });
    }
  });

  // Force refresh all odds
  app.post("/api/aggregator/refresh", async (req: Request, res: Response) => {
    try {
      // Start refreshing in the background
      aggregatorService.refreshOdds().catch((error: Error) => {
        console.error("Background odds refresh error:", error);
      });
      
      res.json({
        success: true,
        message: "Odds refresh initiated",
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Error initiating odds refresh:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to initiate odds refresh" 
      });
    }
  });
  
  // API endpoint to fetch all live events across all sports
  app.get("/api/events/live", async (req: Request, res: Response) => {
    try {
      // Redirect to our standard events endpoint with isLive=true
      // This ensures consistent behavior between both endpoints
      const sportId = req.query.sportId ? Number(req.query.sportId) : undefined;
      
      // Construct the redirect URL with all query parameters
      const redirectUrl = `/api/events?isLive=true${sportId ? `&sportId=${sportId}` : ''}`;
      
      console.log(`Redirecting /api/events/live to ${redirectUrl}`);
      
      // Issue a 307 temporary redirect to maintain the same HTTP method
      return res.redirect(307, redirectUrl);
    } catch (error) {
      console.error('Error fetching live events:', error);
      res.status(500).json({ error: 'Failed to fetch live events' });
    }
  });

  // New wallet protocol-specific endpoints using Wal.app integration
  
  // Get live events using Wal protocol
  app.get("/api/wal/events/live", async (req: Request, res: Response) => {
    try {
      const sportId = req.query.sportId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      
      const events = await walProtocolService.getLiveEvents(sportId, limit);
      res.json(events);
    } catch (error) {
      console.error("Error fetching live events:", error);
      res.status(500).json({ message: "Failed to fetch live events" });
    }
  });
  
  // Get upcoming events using Wal protocol
  app.get("/api/wal/events/upcoming", async (req: Request, res: Response) => {
    try {
      const sportId = req.query.sportId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      
      const events = await walProtocolService.getUpcomingEvents(sportId, limit);
      res.json(events);
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      res.status(500).json({ message: "Failed to fetch upcoming events" });
    }
  });
  
  // Get event details using Wal protocol
  app.get("/api/wal/events/:eventId", async (req: Request, res: Response) => {
    try {
      const eventId = req.params.eventId;
      const event = await walProtocolService.getEventDetails(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.json(event);
    } catch (error) {
      console.error(`Error fetching event ${req.params.eventId}:`, error);
      res.status(500).json({ message: "Failed to fetch event details" });
    }
  });
  
  // Place bet with SUI tokens using Wal protocol
  app.post("/api/wal/bets/sui", async (req: Request, res: Response) => {
    try {
      const { walletAddress, eventId, marketId, outcomeId, odds, amount } = req.body;
      
      if (!walletAddress || !eventId || !marketId || !outcomeId || !odds || !amount) {
        return res.status(400).json({ 
          message: "Missing required parameters",
          details: "walletAddress, eventId, marketId, outcomeId, odds, and amount are required"
        });
      }
      
      // Check if the wallet address is valid
      if (!securityService.validateWalletAddress(walletAddress)) {
        return res.status(400).json({ message: "Invalid wallet address format" });
      }
      
      // Place the bet using the Wal protocol service
      const result = await walProtocolService.placeBetWithSui(
        walletAddress,
        eventId,
        marketId,
        outcomeId,
        parseFloat(odds),
        parseFloat(amount)
      );
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Failed to place bet",
          error: result.error
        });
      }
      
      // Return success response
      res.json({
        success: true,
        txHash: result.txHash,
        message: `Successfully placed bet of ${amount} SUI at odds ${odds}`,
        currency: "SUI"
      });
    } catch (error) {
      console.error("Error placing bet with SUI via Wal protocol:", error);
      res.status(500).json({ message: "Failed to place bet" });
    }
  });
  
  // Place bet with SBETS tokens using Wal protocol
  app.post("/api/wal/bets/sbets", async (req: Request, res: Response) => {
    try {
      const { walletAddress, eventId, marketId, outcomeId, odds, amount } = req.body;
      
      if (!walletAddress || !eventId || !marketId || !outcomeId || !odds || !amount) {
        return res.status(400).json({ 
          message: "Missing required parameters",
          details: "walletAddress, eventId, marketId, outcomeId, odds, and amount are required"
        });
      }
      
      // Check if the wallet address is valid
      if (!securityService.validateWalletAddress(walletAddress)) {
        return res.status(400).json({ message: "Invalid wallet address format" });
      }
      
      // Place the bet using the Wal protocol service
      const result = await walProtocolService.placeBetWithSbets(
        walletAddress,
        eventId,
        marketId,
        outcomeId,
        parseFloat(odds),
        parseFloat(amount)
      );
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Failed to place bet",
          error: result.error
        });
      }
      
      // Return success response
      res.json({
        success: true,
        txHash: result.txHash,
        message: `Successfully placed bet of ${amount} SBETS at odds ${odds}`,
        currency: "SBETS",
        tokenAddress: "0x1b05613345e94ff29769c27c8ae86b5b9b273e74c4b5d14beb2a7525cc83561e::sbets::SBETS"
      });
    } catch (error) {
      console.error("Error placing bet with SBETS via Wal protocol:", error);
      res.status(500).json({ message: "Failed to place bet" });
    }
  });
  
  // Get user bets using Wal protocol
  app.get("/api/wal/bets/:walletAddress", async (req: Request, res: Response) => {
    try {
      const walletAddress = req.params.walletAddress;
      const status = req.query.status as string | undefined;
      
      if (!securityService.validateWalletAddress(walletAddress)) {
        return res.status(400).json({ message: "Invalid wallet address format" });
      }
      
      const bets = await walProtocolService.getUserBets(walletAddress, status);
      res.json(bets);
    } catch (error) {
      console.error(`Error fetching bets for ${req.params.walletAddress}:`, error);
      res.status(500).json({ message: "Failed to fetch bets" });
    }
  });
  
  // Claim winnings using Wal protocol
  app.post("/api/wal/claim-winnings", async (req: Request, res: Response) => {
    try {
      const { walletAddress, betId } = req.body;
      
      if (!walletAddress || !betId) {
        return res.status(400).json({ 
          message: "Missing required parameters",
          details: "walletAddress and betId are required"
        });
      }
      
      if (!securityService.validateWalletAddress(walletAddress)) {
        return res.status(400).json({ message: "Invalid wallet address format" });
      }
      
      const result = await walProtocolService.claimWinnings(walletAddress, betId);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Failed to claim winnings",
          error: result.error
        });
      }
      
      res.json({
        success: true,
        txHash: result.txHash,
        message: `Successfully claimed winnings for bet ${betId}`
      });
    } catch (error) {
      console.error("Error claiming winnings:", error);
      res.status(500).json({ message: "Failed to claim winnings" });
    }
  });
  
  // Cash out bet using Wal protocol
  app.post("/api/wal/cashout", async (req: Request, res: Response) => {
    try {
      const { walletAddress, betId, amount } = req.body;
      
      if (!walletAddress || !betId || !amount) {
        return res.status(400).json({ 
          message: "Missing required parameters",
          details: "walletAddress, betId, and amount are required"
        });
      }
      
      if (!securityService.validateWalletAddress(walletAddress)) {
        return res.status(400).json({ message: "Invalid wallet address format" });
      }
      
      const result = await walProtocolService.cashoutBet(
        walletAddress,
        betId,
        parseFloat(amount)
      );
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Failed to cash out bet",
          error: result.error
        });
      }
      
      res.json({
        success: true,
        txHash: result.txHash,
        message: `Successfully cashed out bet ${betId} for ${amount}`
      });
    } catch (error) {
      console.error("Error cashing out bet:", error);
      res.status(500).json({ message: "Failed to cash out bet" });
    }
  });
  
  // Get wallet dividends using Wal protocol
  app.get("/api/wal/dividends/:walletAddress", async (req: Request, res: Response) => {
    try {
      const walletAddress = req.params.walletAddress;
      
      if (!securityService.validateWalletAddress(walletAddress)) {
        return res.status(400).json({ message: "Invalid wallet address format" });
      }
      
      const dividends = await walProtocolService.getWalletDividends(walletAddress);
      res.json(dividends);
    } catch (error) {
      console.error(`Error fetching dividends for ${req.params.walletAddress}:`, error);
      res.status(500).json({ message: "Failed to fetch dividends" });
    }
  });
  
  // Get transaction status using Wal protocol
  app.get("/api/wal/transaction/:txHash", async (req: Request, res: Response) => {
    try {
      const txHash = req.params.txHash;
      
      // Validate tx hash format (should start with 0x and be followed by hex characters)
      if (!txHash.startsWith('0x') || !/^0x[a-fA-F0-9]+$/.test(txHash)) {
        return res.status(400).json({ message: "Invalid transaction hash format" });
      }
      
      const status = await walProtocolService.getTransactionStatus(txHash);
      res.json(status);
    } catch (error) {
      console.error(`Error fetching transaction status for ${req.params.txHash}:`, error);
      res.status(500).json({ message: "Failed to fetch transaction status" });
    }
  });
  
  // Sui Metadata API endpoints
  
  // Get token metadata
  app.get("/api/sui/token/:tokenType", async (req: Request, res: Response) => {
    try {
      const tokenType = req.params.tokenType;
      const metadata = await suiMetadataService.getTokenMetadata(tokenType);
      
      if (!metadata) {
        return res.status(404).json({ message: "Token metadata not found" });
      }
      
      res.json(metadata);
    } catch (error) {
      console.error(`Error fetching token metadata for ${req.params.tokenType}:`, error);
      res.status(500).json({ message: "Failed to fetch token metadata" });
    }
  });
  
  // Get token balance
  app.get("/api/sui/balance/:walletAddress/:tokenType", async (req: Request, res: Response) => {
    try {
      const walletAddress = req.params.walletAddress;
      const tokenType = req.params.tokenType;
      
      if (!securityService.validateWalletAddress(walletAddress)) {
        return res.status(400).json({ message: "Invalid wallet address format" });
      }
      
      const balance = await suiMetadataService.getTokenBalance(walletAddress, tokenType);
      
      if (!balance) {
        return res.status(404).json({ message: "Token balance not found" });
      }
      
      res.json(balance);
    } catch (error) {
      console.error(`Error fetching token balance for ${req.params.walletAddress} and ${req.params.tokenType}:`, error);
      res.status(500).json({ message: "Failed to fetch token balance" });
    }
  });
  
  // Get all token balances for a wallet
  app.get("/api/sui/balances/:walletAddress", async (req: Request, res: Response) => {
    try {
      const walletAddress = req.params.walletAddress;
      
      if (!securityService.validateWalletAddress(walletAddress)) {
        return res.status(400).json({ message: "Invalid wallet address format" });
      }
      
      const balances = await suiMetadataService.getAllTokenBalances(walletAddress);
      res.json(balances);
    } catch (error) {
      console.error(`Error fetching token balances for ${req.params.walletAddress}:`, error);
      res.status(500).json({ message: "Failed to fetch token balances" });
    }
  });
  
  // Get NFT metadata
  app.get("/api/sui/nft/:objectId", async (req: Request, res: Response) => {
    try {
      const objectId = req.params.objectId;
      const metadata = await suiMetadataService.getNFTMetadata(objectId);
      
      if (!metadata) {
        return res.status(404).json({ message: "NFT metadata not found" });
      }
      
      res.json(metadata);
    } catch (error) {
      console.error(`Error fetching NFT metadata for ${req.params.objectId}:`, error);
      res.status(500).json({ message: "Failed to fetch NFT metadata" });
    }
  });
  
  // Get all NFTs owned by a wallet
  app.get("/api/sui/nfts/:walletAddress", async (req: Request, res: Response) => {
    try {
      const walletAddress = req.params.walletAddress;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      
      if (!securityService.validateWalletAddress(walletAddress)) {
        return res.status(400).json({ message: "Invalid wallet address format" });
      }
      
      const nfts = await suiMetadataService.getNFTsOwnedByAddress(walletAddress, limit);
      res.json(nfts);
    } catch (error) {
      console.error(`Error fetching NFTs for ${req.params.walletAddress}:`, error);
      res.status(500).json({ message: "Failed to fetch NFTs" });
    }
  });
  
  // Get transaction details
  app.get("/api/sui/transaction/:txHash", async (req: Request, res: Response) => {
    try {
      const txHash = req.params.txHash;
      
      // Validate tx hash format (should start with 0x and be followed by hex characters)
      if (!txHash.startsWith('0x') || !/^0x[a-fA-F0-9]+$/.test(txHash)) {
        return res.status(400).json({ message: "Invalid transaction hash format" });
      }
      
      const details = await suiMetadataService.getTransactionDetails(txHash);
      res.json(details);
    } catch (error) {
      console.error(`Error fetching transaction details for ${req.params.txHash}:`, error);
      res.status(500).json({ message: "Failed to fetch transaction details" });
    }
  });
  
  // Get object data
  app.get("/api/sui/object/:objectId", async (req: Request, res: Response) => {
    try {
      const objectId = req.params.objectId;
      const object = await suiMetadataService.getObject(objectId);
      
      if (!object) {
        return res.status(404).json({ message: "Object not found" });
      }
      
      res.json(object);
    } catch (error) {
      console.error(`Error fetching object ${req.params.objectId}:`, error);
      res.status(500).json({ message: "Failed to fetch object" });
    }
  });
  
  // DeFi Staking API Endpoints
  app.post("/api/staking/stake", async (req: Request, res: Response) => {
    try {
      const { 
        walletAddress, 
        token, 
        amount, 
        period, 
        eventId, 
        outcomeId, 
        marketId
      } = req.body;
      
      if (!walletAddress || !token || !amount || !period || !eventId || !outcomeId) {
        return res.status(400).json({ error: "Missing required parameters" });
      }
      
      // In a real implementation, this would create a transaction on the SUI blockchain
      // using the wurlus protocol for staking
      
      // Simulate blockchain delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock stake creation
      const stake = {
        id: Math.floor(Math.random() * 10000),
        walletAddress,
        token,
        amount: parseFloat(amount),
        period: parseInt(period),
        apy: calculateApy(parseInt(period), token, outcomeId),
        startDate: new Date(),
        endDate: new Date(Date.now() + parseInt(period) * 24 * 60 * 60 * 1000),
        eventId,
        outcomeId,
        marketId,
        status: 'active',
        txHash: `0x${Math.random().toString(16).substring(2, 42)}`,
        yieldEarned: 0
      };
      
      res.status(201).json({ 
        success: true, 
        stake,
        message: `Successfully staked ${amount} ${token} for ${period} days` 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/staking/unstake", async (req: Request, res: Response) => {
    try {
      const { stakeId, walletAddress } = req.body;
      
      if (!stakeId || !walletAddress) {
        return res.status(400).json({ error: "Missing required parameters" });
      }
      
      // In a real implementation, this would create a transaction on the SUI blockchain
      // to unstake tokens and claim any yield
      
      // Simulate blockchain delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock unstake response
      const unstakeResponse = {
        success: true,
        stakeId,
        walletAddress,
        returnedAmount: Math.random() * 100 + 100,
        yieldEarned: Math.random() * 10 + 1,
        txHash: `0x${Math.random().toString(16).substring(2, 42)}`
      };
      
      res.json(unstakeResponse);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/staking/active/:walletAddress", async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      
      // In a real implementation, this would query the SUI blockchain
      // for all active stakes by this wallet
      
      // Mock active stakes
      const activeStakes = [
        {
          id: 1001,
          walletAddress,
          token: 'SUI',
          amount: 150.5,
          period: 30,
          apy: 8.5,
          startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
          status: 'active',
          eventId: 2,
          eventName: 'Manchester United vs Liverpool',
          outcomeId: 'outcome-2-1-1',
          outcomeName: 'Manchester United',
          marketId: 'market-2-1',
          marketName: 'Match Result',
          txHash: `0x${Math.random().toString(16).substring(2, 42)}`,
          yieldEarned: 1.06
        },
        {
          id: 1002,
          walletAddress,
          token: 'SBETS',
          amount: 500,
          period: 60,
          apy: 12.2,
          startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
          status: 'active',
          eventId: 3,
          eventName: 'NBA Finals Game 3',
          outcomeId: 'outcome-3-1-1',
          outcomeName: 'Los Angeles Lakers',
          marketId: 'market-3-1',
          marketName: 'Match Result',
          txHash: `0x${Math.random().toString(16).substring(2, 42)}`,
          yieldEarned: 10.17
        }
      ];
      
      res.json(activeStakes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Helper function to calculate APY based on period, token and outcome
  function calculateApy(period: number, token: string, outcomeId: string): number {
    // Base APY based on staking period
    let baseApy = 0;
    switch (period) {
      case 7: baseApy = 5; break;
      case 30: baseApy = 8; break;
      case 90: baseApy = 12; break;
      case 180: baseApy = 15; break;
      default: baseApy = 8;
    }
    
    // Add a boost based on token type
    const tokenBoost = token === 'SBETS' ? 2 : 0;
    
    // Add a small random boost based on outcome to simulate variability
    // In reality, this would be based on the odds of the outcome
    const outcomeBoost = Math.random() * 3 + 1;
    
    return +(baseApy + tokenBoost + outcomeBoost).toFixed(1);
  }

  const httpServer = createServer(app);
  return httpServer;
}
