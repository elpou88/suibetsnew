import { Express, Request, Response, NextFunction } from "express";
import { createServer, Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from "./storage";
import { blockchainStorage } from "./blockchain-storage";
import { db } from "./db";
import { ApiSportsService } from "./services/apiSportsService";
import { aggregatorService } from "./services/aggregatorService"; 
import { initBasketballService } from "./services/basketballService";
import { initEventTrackingService } from "./services/eventTrackingService";
import { LiveScoreUpdateService } from "./services/liveScoreUpdateService";
import { registerDebugRoutes } from "./debug-routes";
import { registerWalrusRoutes } from "./routes-walrus";
import { walrusService } from "./services/walrusService";
import { apiResilienceService } from "./services/apiResilienceService";

// Ensure API key is available - prioritize SPORTSDATA_API_KEY but fallback to API_SPORTS_KEY
// Now using a fixed API key which is shared among all services
const sportsApiKey = process.env.SPORTSDATA_API_KEY || process.env.API_SPORTS_KEY || "3ec255b133882788e32f6349eff77b21";

console.log(`[Routes] Using sports API key: ${sportsApiKey}`);

// Create instance of ApiSportsService with the API key
const apiSportsService = new ApiSportsService(sportsApiKey);

// Initialize basketball service
const basketballService = initBasketballService(sportsApiKey);

// Import all sport-specific services
import { formula1Service } from './services/formula1Service';
import { baseballService } from './services/baseballService';
import { boxingService } from './services/boxing';
import { rugbyService } from './services/rugbyService';
import { cricketService } from './services/cricketService';
import { soccerService } from './services/soccerService';
import { tennisService } from './services/tennis-service';
import { mmaService } from './services/mma-service';
// Import any additional "-service" files
import { hockeyService } from './services/hockey-service';
import { golfService } from './services/golf-service';
import { cyclingService } from './services/cycling-service';
import { americanFootballService } from './services/american-football-service';

// Update all services with the consistent API key
console.log("[Routes] Updating all sport services with consistent API key");
const updateSportServices = () => {
  try {
    // Soccer service
    if (soccerService && typeof soccerService.updateApiKey === 'function') {
      soccerService.updateApiKey(sportsApiKey);
      console.log("[Routes] Updated soccer service with API key");
    }
    
    // Tennis service
    if (tennisService && typeof tennisService.updateApiKey === 'function') {
      tennisService.updateApiKey(sportsApiKey);
      console.log("[Routes] Updated tennis service with API key");
    }
    
    // MMA service
    if (mmaService && typeof mmaService.updateApiKey === 'function') {
      mmaService.updateApiKey(sportsApiKey);
      console.log("[Routes] Updated MMA service with API key");
    }
    
    // Cricket service
    if (cricketService && typeof cricketService.updateApiKey === 'function') {
      cricketService.updateApiKey(sportsApiKey);
      console.log("[Routes] Updated cricket service with API key");
    }
    
    // Hockey service
    if (hockeyService && typeof hockeyService.updateApiKey === 'function') {
      hockeyService.updateApiKey(sportsApiKey);
      console.log("[Routes] Updated hockey service with API key");
    }
    
    // Golf service
    if (golfService && typeof golfService.updateApiKey === 'function') {
      golfService.updateApiKey(sportsApiKey);
      console.log("[Routes] Updated golf service with API key");
    }
    
    // Cycling service
    if (cyclingService && typeof cyclingService.updateApiKey === 'function') {
      cyclingService.updateApiKey(sportsApiKey);
      console.log("[Routes] Updated cycling service with API key");
    }
    
    // American Football service
    if (americanFootballService && typeof americanFootballService.updateApiKey === 'function') {
      americanFootballService.updateApiKey(sportsApiKey);
      console.log("[Routes] Updated American Football service with API key");
    }
    
    // Also update any other services that don't follow the standard pattern
    if (baseballService && typeof baseballService.setApiKey === 'function') {
      baseballService.setApiKey(sportsApiKey);
      console.log("[Routes] Updated baseball service with API key");
    }
    
    if (formula1Service && typeof formula1Service.setApiKey === 'function') {
      formula1Service.setApiKey(sportsApiKey);
      console.log("[Routes] Updated formula1 service with API key");
    }
    
    if (boxingService && typeof boxingService.setApiKey === 'function') {
      boxingService.setApiKey(sportsApiKey);
      console.log("[Routes] Updated boxing service with API key");
    }
    
    if (rugbyService && typeof rugbyService.setApiKey === 'function') {
      rugbyService.setApiKey(sportsApiKey);
      console.log("[Routes] Updated rugby service with API key");
    }
    
    console.log("[Routes] All sport services updated with consistent API key");
  } catch (error) {
    console.error("[Routes] Error updating sport services with API key:", error);
  }
};

// Update all services with the API key
updateSportServices();

// Initialize event tracking service to monitor upcoming events for live status
const eventTrackingService = initEventTrackingService(apiSportsService);

export async function registerRoutes(app: Express): Promise<Server> {
  // Start the event tracking service to monitor upcoming events
  eventTrackingService.start();
  console.log("[Routes] Started event tracking service to monitor upcoming events for live status");
  
  // Register debug routes
  registerDebugRoutes(app);
  
  // Register Walrus protocol routes
  registerWalrusRoutes(app);
  console.log("[Routes] Registered Walrus protocol routes for blockchain betting");
  
  // Download page route
  app.get("/download", (_req: Request, res: Response) => {
    res.sendFile("download.html", { root: "./public" });
  });
  
  // Home route
  app.get("/api", (_req: Request, res: Response) => {
    return res.json({ message: "Welcome to the WAL.app Crypto Betting API" });
  });

  // API version route
  app.get("/api/version", (_req: Request, res: Response) => {
    return res.json({ 
      version: "1.0.0", 
      apiVersions: [1], 
      name: "WAL.app Crypto Betting API",
      description: "Blockchain-powered sports betting platform on the Sui network",
    });
  });

  // Status route
  app.get("/api/status", (_req: Request, res: Response) => {
    try {
      return res.json({ 
        status: "online", 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        message: "System is operational" 
      });
    } catch (error) {
      console.error("Error in status route:", error);
      return res.status(500).json({ status: "error", message: "System status check failed" });
    }
  });
  
  // Sports routes
  app.get("/api/sports", async (req: Request, res: Response) => {
    try {
      // Try to get sports from blockchain storage first
      try {
        console.log("[Routes] Attempting to fetch sports from blockchain storage");
        const blockchainSports = await blockchainStorage.getSports();
        
        if (blockchainSports && blockchainSports.length > 0) {
          console.log(`[Routes] Returning ${blockchainSports.length} sports from blockchain storage`);
          return res.json(blockchainSports);
        }
      } catch (blockchainError) {
        console.error("Error fetching sports from blockchain:", blockchainError);
      }
      
      // Fallback to traditional storage
      console.log("[Routes] Falling back to traditional storage for sports");
      try {
        const sports = await storage.getSports();
        
        if (sports && sports.length > 0) {
          console.log(`[Routes] Returning ${sports.length} sports from traditional storage`);
          return res.json(sports);
        }
      } catch (storageError) {
        console.error("Error fetching sports from traditional storage:", storageError);
      }
      
      // If we get here, both storage methods failed or returned no data
      // Return a complete fallback list of ALL 14 sports with proper IDs
      console.log("[Routes] Using fallback list of 14 sports");
      const fallbackSports = [
        { id: 1, name: "Football", slug: "football", icon: "⚽", isActive: true },
        { id: 2, name: "Basketball", slug: "basketball", icon: "🏀", isActive: true },
        { id: 3, name: "Tennis", slug: "tennis", icon: "🎾", isActive: true },
        { id: 4, name: "Baseball", slug: "baseball", icon: "⚾", isActive: true },
        { id: 5, name: "Ice Hockey", slug: "ice-hockey", icon: "🏒", isActive: true },
        { id: 6, name: "Handball", slug: "handball", icon: "🤾", isActive: true },
        { id: 7, name: "Volleyball", slug: "volleyball", icon: "🏐", isActive: true },
        { id: 8, name: "Rugby", slug: "rugby", icon: "🏉", isActive: true },
        { id: 9, name: "Cricket", slug: "cricket", icon: "🏏", isActive: true },
        { id: 10, name: "Golf", slug: "golf", icon: "⛳", isActive: true },
        { id: 11, name: "Boxing", slug: "boxing", icon: "🥊", isActive: true },
        { id: 12, name: "MMA/UFC", slug: "mma-ufc", icon: "🥋", isActive: true },
        { id: 13, name: "Formula 1", slug: "formula-1", icon: "🏎️", isActive: true },
        { id: 14, name: "Cycling", slug: "cycling", icon: "🚴", isActive: true }
      ];
      
      return res.json(fallbackSports);
    } catch (error) {
      console.error("Error in sports route:", error);
      // Even in case of an error, return the fallback sports list
      // so the frontend always has data to work with
      const fallbackSports = [
        { id: 1, name: "Football", slug: "football", icon: "⚽", isActive: true },
        { id: 2, name: "Basketball", slug: "basketball", icon: "🏀", isActive: true },
        { id: 3, name: "Tennis", slug: "tennis", icon: "🎾", isActive: true },
        { id: 4, name: "Baseball", slug: "baseball", icon: "⚾", isActive: true },
        { id: 5, name: "Ice Hockey", slug: "ice-hockey", icon: "🏒", isActive: true },
        { id: 6, name: "Handball", slug: "handball", icon: "🤾", isActive: true },
        { id: 7, name: "Volleyball", slug: "volleyball", icon: "🏐", isActive: true },
        { id: 8, name: "Rugby", slug: "rugby", icon: "🏉", isActive: true },
        { id: 9, name: "Cricket", slug: "cricket", icon: "🏏", isActive: true },
        { id: 10, name: "Golf", slug: "golf", icon: "⛳", isActive: true },
        { id: 11, name: "Boxing", slug: "boxing", icon: "🥊", isActive: true },
        { id: 12, name: "MMA/UFC", slug: "mma-ufc", icon: "🥋", isActive: true },
        { id: 13, name: "Formula 1", slug: "formula-1", icon: "🏎️", isActive: true },
        { id: 14, name: "Cycling", slug: "cycling", icon: "🚴", isActive: true }
      ];
      return res.json(fallbackSports);
    }
  });
  
  // Events routes
  app.get("/api/events", async (req: Request, res: Response) => {
    // Configure response for handling large data and timeouts
    res.setHeader('Content-Type', 'application/json');
    
    // Increase maximum allowed timeout for large responses
    res.setTimeout(60000, () => {
      if (!res.headersSent) {
        console.log('[Routes] Response timeout reached after 60s, sending empty response');
        return res.json([]);
      }
    });
    
    // Disable Node.js response compression for large payloads
    res.setHeader('X-No-Compression', 'true');
    
    // Set longer keep-alive timeout to prevent connection drop
    if (req.socket) {
      req.socket.setKeepAlive(true);
      req.socket.setTimeout(65000); // 65 seconds socket timeout
    }
    
    // Create a timeout to ensure the request doesn't hang
    const requestTimeout = setTimeout(() => {
      console.log(`[Routes] Request deadline reached for /api/events (isLive: ${req.query.isLive}, sportId: ${req.query.sportId})`);
      // Only send a response if one hasn't been sent already
      if (!res.headersSent) {
        // Return empty array rather than error for frontend compatibility
        return res.json([]);
      }
    }, 40000); // 40 second timeout - increased to allow for more sports data to be fetched
    
    try {
      const reqSportId = req.query.sportId ? Number(req.query.sportId) : undefined;
      const isLive = req.query.isLive ? req.query.isLive === 'true' : undefined;
      
      console.log(`Fetching events for sportId: ${reqSportId}, isLive: ${isLive}`);
      
      // Map sport IDs to names for special handling cases - aligned with Hugewin standards
      const sportMap: Record<number, string> = {
        1: 'football',        // Football/Soccer (European style)
        2: 'basketball',      // Basketball
        3: 'tennis',          // Tennis
        4: 'baseball',        // Baseball
        5: 'ice-hockey',      // Ice Hockey (was 'hockey')
        6: 'handball',        // Handball
        7: 'volleyball',      // Volleyball
        8: 'rugby',           // Rugby
        9: 'cricket',         // Cricket
        10: 'golf',           // Golf
        11: 'boxing',         // Boxing
        12: 'mma-ufc',        // MMA/UFC
        13: 'formula-1',      // Formula 1 (standardized hyphen)
        14: 'cycling',        // Cycling
        15: 'american-football', // American Football (standardized hyphen)
        16: 'aussie-rules',   // Australian Football League (was 'afl')
        17: 'snooker',        // Snooker
        18: 'darts',          // Darts
        19: 'table-tennis',   // Table Tennis
        20: 'badminton',      // Badminton
        21: 'beach-volleyball', // Beach Volleyball
        22: 'winter-sports',  // Winter Sports
        23: 'motorsport',     // Motorsport
        24: 'esports',        // Esports
        25: 'netball',        // Netball
        26: 'soccer',         // Soccer (Alternative name for Football)
        27: 'nba',            // NBA (Basketball league)
        28: 'nhl',            // NHL (Hockey league)
        29: 'nfl',            // NFL (American Football league)
        30: 'mlb'             // MLB (Baseball league)
      };
      
      // Try special sport-specific services first if relevant
      if (reqSportId) {
        const sportName = sportMap[reqSportId] || 'unknown';
        console.log(`[Routes] Sport-specific handling for ${sportName} (ID: ${reqSportId})`);
        
        try {
          let specialEvents = null;
          
          // Use dedicated service based on sport ID
          switch(reqSportId) {
            case 1: // Football (European/International)
            case 26: // Soccer (Same as Football, alternative name)
              try {
                console.log(`[Routes] Using Soccer/Football service for ID ${reqSportId}`);
                // Use the soccer service for both sport ID 1 and ID 26 to unify football/soccer handling
                specialEvents = isLive 
                  ? await soccerService.getLiveMatches()
                  : await soccerService.getUpcomingMatches(20);
                console.log(`[Routes] Soccer/Football service returned ${specialEvents?.length || 0} events for ID ${reqSportId}`);
                
                // If we have events, ensure they have the correct requested sportId
                if (specialEvents && specialEvents.length > 0) {
                  specialEvents = specialEvents.map(event => ({
                    ...event,
                    sportId: reqSportId // Preserve the requested sportId (1 or 26)
                  }));
                }
              } catch (err) {
                console.error(`[Routes] Error using Soccer/Football service for ID ${reqSportId}:`, err);
                // Try fallback through API Sports service
                try {
                  console.log(`[Routes] Trying fallback via apiSportsService for Football/Soccer ID ${reqSportId}`);
                  specialEvents = isLive 
                    ? await apiSportsService.getLiveEvents('football')
                    : await apiSportsService.getUpcomingEvents('football', 20);
                } catch (fallbackErr) {
                  console.error(`[Routes] Fallback for Football/Soccer also failed:`, fallbackErr);
                }
              }
              break;
            case 9: // Cricket
              try {
                // Import cricket service here to avoid circular dependencies
                const { cricketService } = require('./services/cricketService');
                if (isLive) {
                  specialEvents = await cricketService.getLiveEvents();
                } else {
                  specialEvents = await cricketService.getUpcomingEvents(20);
                }
                console.log(`[Routes] Cricket service returned ${specialEvents?.length || 0} events`);
              } catch (err) {
                console.error(`[Routes] Error using Cricket service: ${err}`);
              }
              break;
            case 14: // Cycling
              // Import cycling service here to avoid circular dependencies
              const { cyclingService } = require('./services/cyclingService');
              specialEvents = await cyclingService.getEvents(isLive);
              console.log(`[Routes] Cycling service returned ${specialEvents?.length || 0} events`);
              break;
            case 2: // Basketball
              specialEvents = await basketballService.getBasketballGames(isLive === true);
              console.log(`[Routes] Basketball service returned ${specialEvents?.length || 0} events`);
              break;
            case 8: // Rugby
              const { rugbyService } = require('./services/rugbyService');
              specialEvents = isLive 
                ? await rugbyService.getLiveGames() 
                : await rugbyService.getUpcomingGames();
              console.log(`[Routes] Rugby service returned ${specialEvents?.length || 0} events`);
              break;
            case 4: // Baseball
              specialEvents = await baseballService.getBaseballGames(isLive === true);
              console.log(`[Routes] Baseball service returned ${specialEvents?.length || 0} events`);
              break;
            case 5: // Hockey
              try {
                // First try direct API for hockey events
                specialEvents = await apiSportsService.getLiveEvents('hockey');
                console.log(`[Routes] Hockey API returned ${specialEvents?.length || 0} events`);
              } catch (err) {
                console.log(`[Routes] Hockey API failed, using fallback: ${err}`);
                // Try to get some upcoming events as fallback
                specialEvents = await apiSportsService.getUpcomingEvents('hockey', 20);
              }
              break;
            case 6: // Handball
              try {
                specialEvents = await apiSportsService.getLiveEvents('handball');
                console.log(`[Routes] Handball API returned ${specialEvents?.length || 0} events`);
              } catch (err) {
                console.log(`[Routes] Handball API failed: ${err}`);
                // Try to get some upcoming events as fallback
                specialEvents = await apiSportsService.getUpcomingEvents('handball', 20);
              }
              break;
            case 7: // Volleyball
              try {
                specialEvents = await apiSportsService.getLiveEvents('volleyball');
                console.log(`[Routes] Volleyball API returned ${specialEvents?.length || 0} events`);
              } catch (err) {
                console.log(`[Routes] Volleyball API failed: ${err}`);
                // Try to get some upcoming events as fallback
                specialEvents = await apiSportsService.getUpcomingEvents('volleyball', 20);
              }
              break;
            case 11: // Boxing
              const { boxingService } = require('./services/boxing');
              specialEvents = await boxingService.getEvents(isLive === true);
              console.log(`[Routes] Boxing service returned ${specialEvents?.length || 0} events`);
              break;
            case 12: // MMA/UFC
              try {
                specialEvents = isLive 
                  ? await apiSportsService.getLiveEvents('mma-ufc')
                  : await apiSportsService.getUpcomingEvents('mma-ufc', 20);
                console.log(`[Routes] MMA/UFC API returned ${specialEvents?.length || 0} events`);
              } catch (err) {
                console.log(`[Routes] MMA/UFC API failed: ${err}`);
              }
              break;
            case 13: // Formula 1
              specialEvents = await formula1Service.getFormula1Races(isLive === true);
              console.log(`[Routes] Formula 1 service returned ${specialEvents?.length || 0} events`);
              break;
          }
          
          // If special service returned events, use those
          if (specialEvents && specialEvents.length > 0) {
            // Ensure all events have the correct sportId
            const fixedEvents = specialEvents.map((event: any) => ({
              ...event,
              sportId: reqSportId // Force correct sport ID
            }));
            
            console.log(`[Routes] Using ${fixedEvents.length} events from specialized service for ${sportName}`);
            return res.json(fixedEvents);
          }
          
          console.log(`[Routes] No events from specialized service for ${sportName}, falling back to normal flow`);
        } catch (specialServiceError) {
          console.error(`[Routes] Error in specialized service for ${sportName}:`, specialServiceError);
          // Continue with normal flow
        }
      }
      
      // Setup a timeout to prevent requests from hanging too long
      const FETCH_TIMEOUT = isLive ? 8000 : 10000; // 8 seconds for live events, 10 seconds for others
      
      // Set a hard deadline for the entire API endpoint
      const requestDeadline = setTimeout(() => {
        console.warn(`[Routes] Request deadline reached for /api/events (isLive: ${isLive}, sportId: ${reqSportId})`);
        if (!res.headersSent) {
          // If we haven't already sent a response, send an empty array or fallback data
          if (isLive) {
            // For live events, send empty array rather than timing out
            return res.json([]);
          } else {
            // For upcoming events, check if we have cached data from previous calls
            const cachedEvents = (global as any).cachedUpcomingEvents || [];
            return res.json(cachedEvents.length > 0 ? cachedEvents : []);
          }
        }
      }, 15000); // Hard deadline of 15 seconds for the entire request
      
      // Try to get events directly from event tracking service which has cached events
      let events = [];
      try {
        console.log("[Routes] Attempting to fetch events from tracking service");
        
        // Create a timeout promise that resolves with null instead of rejecting
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => {
            console.log('[Routes] Tracking service request timed out, resolving with empty array');
            resolve([]);
          }, FETCH_TIMEOUT);
        });
        
        if (isLive) {
          try {
            // Race the actual fetch against the timeout
            const liveEvents = await Promise.race([
              eventTrackingService.getLiveEvents(reqSportId),
              timeoutPromise
            ]);
            events = (liveEvents as any[]) || [];
          } catch (serviceError) {
            console.error('[Routes] Error fetching from tracking service:', serviceError);
            events = [];
          }
          console.log(`[Routes] Got ${events.length} live events for sportId: ${reqSportId} from tracking service`);
        } else {
          events = eventTrackingService.getUpcomingEvents(reqSportId);
          console.log(`[Routes] Got ${events.length} upcoming events for sportId: ${reqSportId} from tracking service`);
        }
        
        if (!events || events.length === 0) {
          // If no events found in tracking service, try to fetch from blockchain storage
          console.log("[Routes] No events from tracking service, trying blockchain storage");
          try {
            // Create a new timeout promise for blockchain fetch that resolves with empty array
            const blockchainTimeoutPromise = new Promise((resolve) => {
              setTimeout(() => {
                console.log('[Routes] Blockchain storage request timed out, resolving with empty array');
                resolve([]);
              }, FETCH_TIMEOUT);
            });
            
            // Race the blockchain fetch against the timeout
            events = await Promise.race([
              blockchainStorage.getEvents(reqSportId, isLive),
              blockchainTimeoutPromise
            ]) as any[];
            console.log(`[Routes] Got ${events.length} events from blockchain storage`);
          } catch (blockchainError) {
            console.error("Error fetching events from blockchain storage:", blockchainError);
            // Final fallback to traditional storage
            console.log("[Routes] Error from blockchain storage, falling back to traditional storage");
            
            // Create a new timeout promise for traditional storage fetch that resolves with empty array
            const storageTimeoutPromise = new Promise((resolve) => {
              setTimeout(() => {
                console.log('[Routes] Traditional storage request timed out, resolving with empty array');
                resolve([]);
              }, FETCH_TIMEOUT);
            });
            
            // Race the traditional storage fetch against the timeout
            events = await Promise.race([
              storage.getEvents(reqSportId, isLive),
              storageTimeoutPromise
            ]) as any[];
          }
        }
      } catch (fetchError: any) {
        console.error("Error fetching events:", fetchError);
        
        // If it's a timeout error, provide a meaningful log
        if (fetchError?.message && typeof fetchError.message === 'string' && fetchError.message.includes('timed out')) {
          console.warn(`[Routes] Request timed out: ${fetchError.message}`);
        }
        
        // If headers have already been sent, don't attempt to send a response
        if (res.headersSent) {
          console.warn('[Routes] Headers already sent, skipping error response');
          // Make sure to clear the timeout to prevent further response attempts
          clearTimeout(requestTimeout);
          return; // Exit early to prevent further response attempts
        }
        
        // Try blockchain storage after tracking service error
        try {
          console.log("[Routes] Trying blockchain storage after tracking service error");
          events = await blockchainStorage.getEvents(reqSportId, isLive);
        } catch (blockchainError) {
          console.error("Error fetching events from blockchain storage:", blockchainError);
          // Final fallback to traditional storage
          console.log("[Routes] Error from blockchain storage, falling back to traditional storage");
          events = await storage.getEvents(reqSportId, isLive);
        }
      }
      
      console.log(`Found ${events ? events.length : 0} events for sportId: ${reqSportId} from data sources`);
      
      // Special handling for basketball
      if (reqSportId === 2) {
        console.log('Using basketball service for sport ID 2');
        try {
          const basketballGames = await basketballService.getBasketballGames(isLive === true);
          console.log(`Basketball service returned ${basketballGames.length} games`);
          
          if (basketballGames.length > 0) {
            return res.json(basketballGames);
          }
        } catch (err) {
          console.error('Error using basketball service:', err);
        }
      }
      
      // Special handling for cricket
      if (reqSportId === 9) {
        console.log('[Routes] CRICKET REQUEST DETECTED - Using special cricket handling');
        try {
          // Use the dynamic import for cricket service in case it's not available
          let cricketEvents = [];
          try {
            // Use the correct method names from our CricketService
            cricketEvents = isLive 
              ? await cricketService.getLiveEvents()
              : await cricketService.getUpcomingEvents(20);
          } catch (cricketErr) {
            console.error('[Routes] Error using cricket service, falling back to apiSportsService:', cricketErr);
            // Fall back to apiSportsService if cricket service fails
            cricketEvents = isLive 
              ? await apiSportsService.getLiveEvents('cricket')
              : await apiSportsService.getUpcomingEvents('cricket', 20);
          }
            
          console.log(`[Routes] Cricket service returned ${cricketEvents.length} ${isLive ? 'live' : 'upcoming'} cricket events`);
          
          // Double-check every event has the correct sport ID
          const fixedCricketEvents = cricketEvents.map((event: any) => ({
            ...event,
            sportId: 9, // Force Cricket ID
            _isCricket: true // Add a special flag
          }));
          
          if (fixedCricketEvents.length > 0) {
            // Log the first event to verify it looks like cricket
            console.log(`[Routes] First cricket event: ${fixedCricketEvents[0].homeTeam} vs ${fixedCricketEvents[0].awayTeam}`);
            console.log(`[Routes] League name: ${fixedCricketEvents[0].leagueName}`);
            
            return res.json(fixedCricketEvents);
          }
          
          // If cricket service returned no events, fall through to regular API handling
          console.log('[Routes] Cricket service returned no events, falling back to API');
        } catch (error) {
          console.error('[Routes] Error in cricket service:', error);
          // Fall through to regular handling
        }
      }
            
      // For non-live events, always try to get fresh data from the API
      // This ensures we're showing the most current upcoming events
      if (!isLive) {
        console.log(`Fetching upcoming events from API for ${reqSportId ? `sportId: ${reqSportId}` : 'all sports'}`);
        
        // If a specific sport is requested, get upcoming events for that sport
        if (reqSportId) {
          // Map sport ID to sport name with correct format for API
          const sportMap: Record<number, string> = {
            1: 'football',
            2: 'basketball',
            3: 'tennis',
            4: 'baseball',
            5: 'hockey',
            6: 'handball',
            7: 'volleyball',
            8: 'rugby',
            9: 'cricket', // SPORT ID 9 IS CRICKET
            10: 'golf',
            11: 'boxing',
            12: 'mma-ufc', // Make sure this matches what's in the API service
            13: 'formula_1',
            14: 'cycling',
            15: 'american_football',
            16: 'afl',        // Australian Football League
            17: 'snooker',    // Added snooker
            18: 'darts',      // Added darts
            19: 'table-tennis', // Table tennis
            20: 'badminton',  // Badminton
            21: 'beach-volleyball', // Beach volleyball
            22: 'winter-sports', // Winter sports (skiing, etc)
            23: 'motorsport', // Generic motorsport
            24: 'esports',    // Esports
            25: 'netball',    // Netball
            26: 'soccer',     // Alias for football for some regions
            27: 'nba',        // NBA as separate entry
            28: 'nhl',        // NHL as separate entry
            29: 'nfl',        // NFL as separate entry
            30: 'mlb'         // MLB as separate entry
          };
          
          const sportName = sportMap[reqSportId] || 'football';
          console.log(`Attempting to fetch upcoming ${sportName} (ID: ${reqSportId}) events from API directly`);
          
          // Get upcoming events for this specific sport - increased limit to 20 to ensure we get enough results
          const upcomingEvents = await apiSportsService.getUpcomingEvents(sportName, 20);
          
          if (upcomingEvents && upcomingEvents.length > 0) {
            console.log(`Found ${upcomingEvents.length} upcoming ${sportName} events from API`);
            
            // Special handling for Rugby - use dedicated Rugby service
            if (sportName === 'rugby') {
              console.log(`Using Rugby dedicated service for ${isLive ? 'live' : 'upcoming'} Rugby events`);
              
              try {
                let rugbyEvents = [];
                
                // Get rugby league events
                const rugbyLeagueEvents = isLive 
                  ? await rugbyService.fetchLiveGamesWithCache('league')
                  : await rugbyService.getUpcomingGames('league', 10);
                
                console.log(`RugbyService returned ${rugbyLeagueEvents.length} ${isLive ? 'live' : 'upcoming'} rugby league games`);
                
                // Get rugby union events and combine with league events
                const rugbyUnionEvents = isLive
                  ? await rugbyService.fetchLiveGamesWithCache('union')
                  : await rugbyService.getUpcomingGames('union', 10);
                
                console.log(`RugbyService returned ${rugbyUnionEvents.length} ${isLive ? 'live' : 'upcoming'} rugby union games`);
                
                // Combine both types of rugby events
                rugbyEvents = [...rugbyLeagueEvents, ...rugbyUnionEvents];
                
                if (rugbyEvents.length > 0) {
                  console.log(`Returning ${rugbyEvents.length} Rugby events from dedicated Rugby service`);
                  return res.json(rugbyEvents);
                }
              } catch (error) {
                console.error('Error using Rugby service:', error);
              }
            }
                
            // Special handling for Baseball - use dedicated Baseball service
            if (sportName === 'baseball' || sportName === 'mlb') {
              console.log(`Using Baseball dedicated service for upcoming Baseball events`);
              
              try {
                // Use dedicated service to get real baseball data
                console.log('Getting real baseball data for upcoming view');
                // Get real upcoming baseball games
                const baseballEvents = await baseballService.getBaseballGames(false); // false means upcoming
                
                // Return the baseball events from the dedicated service
                console.log(`BaseballService returned ${baseballEvents.length} upcoming games`);
                return res.json(baseballEvents);
              } catch (error) {
                console.error('Error using Baseball service:', error);
                
                // Fall back to the generic API response if there was an error
                console.log('Falling back to API data due to Baseball service error');
              }
            }
            
            // Special handling for Boxing - use dedicated Boxing service
            if (sportName === 'boxing') {
              console.log(`Using Boxing dedicated service for upcoming Boxing events`);
              
              try {
                // Use dedicated service to get real boxing data
                console.log('Getting real boxing data for upcoming view');
                // Get real upcoming boxing matches
                const boxingEvents = await boxingService.getBoxingEvents(false); // false means upcoming
                
                if (boxingEvents && boxingEvents.length > 0) {
                  // Return the boxing events from the dedicated service
                  console.log(`BoxingService returned ${boxingEvents.length} upcoming matches`);
                  return res.json(boxingEvents);
                } else {
                  console.log(`BoxingService returned 0 upcoming matches, filtering API Sports data`);
                  
                  // Filter to ensure we're only showing boxing events and not football matches
                  const genuineBoxingEvents = upcomingEvents.filter(event => {
                    // STRICT VERIFICATION: Reject football/soccer matches
                    if (event.leagueName?.includes('League') || 
                        event.leagueName?.includes('Premier') ||
                        event.leagueName?.includes('La Liga') ||
                        event.leagueName?.includes('Serie') ||
                        event.leagueName?.includes('Bundesliga') ||
                        event.leagueName?.includes('Cup') ||
                        event.leagueName?.includes('Copa') ||
                        event.homeTeam?.includes('FC') ||
                        event.awayTeam?.includes('FC') ||
                        event.homeTeam?.includes('United') ||
                        event.awayTeam?.includes('United')) {
                      console.log(`[Boxing] REJECTING football match: ${event.homeTeam} vs ${event.awayTeam} (${event.leagueName})`);
                      return false;
                    }
                    
                    // Create boxing-specific events with proper markets
                    return true;
                  });
                  
                  // Create boxing-specific markets for these events
                  const enhancedBoxingEvents = genuineBoxingEvents.map(event => {
                    // Create markets specific to boxing matches
                    const boxingMarkets = [
                      {
                        id: `${event.id}-market-winner`,
                        name: 'Winner',
                        outcomes: [
                          {
                            id: `${event.id}-outcome-fighter1`,
                            name: `${event.homeTeam} (Win)`,
                            odds: 1.85 + (Math.random() * 0.3),
                            probability: 0.52
                          },
                          {
                            id: `${event.id}-outcome-fighter2`,
                            name: `${event.awayTeam} (Win)`,
                            odds: 1.95 + (Math.random() * 0.3),
                            probability: 0.48
                          },
                          {
                            id: `${event.id}-outcome-draw`,
                            name: `Draw`,
                            odds: 8.0 + (Math.random() * 2),
                            probability: 0.12
                          }
                        ]
                      },
                      {
                        id: `${event.id}-market-method`,
                        name: 'Method of Victory',
                        outcomes: [
                          {
                            id: `${event.id}-outcome-ko-tko`,
                            name: `KO/TKO`,
                            odds: 2.2 + (Math.random() * 0.4),
                            probability: 0.42
                          },
                          {
                            id: `${event.id}-outcome-decision`,
                            name: `Decision`,
                            odds: 1.8 + (Math.random() * 0.4),
                            probability: 0.55
                          },
                          {
                            id: `${event.id}-outcome-disqualification`,
                            name: `Disqualification`,
                            odds: 12.0 + (Math.random() * 3),
                            probability: 0.08
                          }
                        ]
                      }
                    ];
                    
                    return {
                      ...event,
                      sportId: 11, // Boxing ID
                      isLive: false,
                      markets: boxingMarkets,
                      // Add a data source to track this is a filtered event
                      dataSource: 'api-sports-boxing-filtered'
                    };
                  });
                  
                  console.log(`Returning ${enhancedBoxingEvents.length} filtered boxing events`);
                  return res.json(enhancedBoxingEvents);
                }
              } catch (error) {
                console.error('Error using Boxing service:', error);
                
                // Apply filtering to ensure we're not showing football matches
                const filteredEvents = upcomingEvents.filter(event => {
                  // Apply simple football filter
                  return !(event.leagueName?.includes('League') || 
                          event.homeTeam?.includes('FC') || 
                          event.awayTeam?.includes('FC'));
                });
                
                console.log(`Error in BoxingService. Returning ${filteredEvents.length} filtered API Sports events`);
                return res.json(filteredEvents);
              }
            }
            
            // Rugby handling is now at the top of this section
            
            // Special handling for Formula 1 - use dedicated Formula 1 service
            if (sportName === 'formula_1' || sportName === 'formula-1') {
              console.log(`Using Formula 1 dedicated service for Formula 1 events`);
              
              try {
                // Use our dedicated Formula 1 service
                const formula1Events = await formula1Service.getFormula1Races(false); // false means not live
                
                if (formula1Events && formula1Events.length > 0) {
                  console.log(`Formula1Service returned ${formula1Events.length} upcoming races`);
                  return res.json(formula1Events);
                } else {
                  console.log(`Formula1Service returned 0 upcoming races, falling back to API Sports service`);
                  
                  // Fallback to API Sports service if Formula 1 service returns no events
                  const formula1Events = upcomingEvents.map(event => ({
                    ...event,
                    sportId: 13, // Set to Formula 1 ID
                    // Enhance event details for better display
                    homeTeam: event.homeTeam || `Formula 1 Race ${event.id}`,
                    awayTeam: event.awayTeam || 'Formula 1 Grand Prix',
                    leagueName: event.leagueName || 'Formula 1 Championship'
                  }));
                  console.log(`Returning ${formula1Events.length} Formula 1 events with corrected sportId from API Sports`);
                  return res.json(formula1Events);
                }
              } catch (error) {
                console.error('Error using Formula 1 service:', error);
                
                // Fallback to API Sports service if there's an error
                const formula1Events = upcomingEvents.map(event => ({
                  ...event,
                  sportId: 13, // Set to Formula 1 ID
                  homeTeam: event.homeTeam || `Formula 1 Race ${event.id}`,
                  awayTeam: event.awayTeam || 'Formula 1 Grand Prix',
                  leagueName: event.leagueName || 'Formula 1 Championship'
                }));
                console.log(`Error in Formula1Service. Returning ${formula1Events.length} Formula 1 events with corrected sportId from API Sports`);
                return res.json(formula1Events);
              }
            }
            
            // For other sports, filter by sportId as usual
            const filteredEvents = upcomingEvents.filter(event => event.sportId === reqSportId);
            console.log(`Filtered to ${filteredEvents.length} events that match sportId: ${reqSportId}`);
            
            return res.json(filteredEvents);
          } else {
            console.log(`No upcoming ${sportName} events found from API, returning empty array`);
            return res.json([]);
          }
        } else {
          // No specific sport ID requested, get upcoming events for all sports
          console.log("Fetching upcoming events for all sports from API");
          
          // Get upcoming events for all sports - with increased per-sport limit
          const allUpcomingEvents = await apiSportsService.getAllUpcomingEvents(10);
          
          // Create a combined events array to add specialized sport data
          let combinedEvents = [...allUpcomingEvents];
          
          // Additional rugby events from Rugby service
          try {
            console.log("Fetching additional rugby events from RugbyService");
            
            // Get rugby league events
            const rugbyLeagueEvents = await rugbyService.getUpcomingGames('league', 5);
            console.log(`RugbyService returned ${rugbyLeagueEvents.length} upcoming rugby league games for all sports view`);
            
            // Get rugby union events
            const rugbyUnionEvents = await rugbyService.getUpcomingGames('union', 5);
            console.log(`RugbyService returned ${rugbyUnionEvents.length} upcoming rugby union games for all sports view`);
            
            // Combine both types of rugby events
            const rugbyEvents = [...rugbyLeagueEvents, ...rugbyUnionEvents];
            
            if (rugbyEvents.length > 0) {
              // Make sure all rugby events have sportId=8
              const processedRugbyEvents = rugbyEvents.map(event => ({
                ...event,
                sportId: 8,
                isLive: false
              }));
              
              // Add to combined events
              combinedEvents = [...combinedEvents, ...processedRugbyEvents];
              console.log(`Added ${processedRugbyEvents.length} rugby events to the combined sports view`);
            }
          } catch (error) {
            console.error("Error fetching rugby events:", error);
            // Continue with other sports on error
          }
          
          // Additional baseball events from Baseball service
          try {
            console.log("Fetching additional baseball events from BaseballService");
            const baseballEvents = await baseballService.getBaseballGames(false); // false means upcoming
            
            if (baseballEvents && baseballEvents.length > 0) {
              console.log(`BaseballService returned ${baseballEvents.length} upcoming games for all sports view`);
              // Make sure all baseball events have sportId=4
              const processedBaseballEvents = baseballEvents.map(event => ({
                ...event,
                sportId: 4,
                isLive: false
              }));
              
              // Add to combined events
              combinedEvents = [...combinedEvents, ...processedBaseballEvents];
              console.log(`Added ${processedBaseballEvents.length} baseball events to the combined sports view`);
            }
          } catch (error) {
            console.error("Error fetching baseball events:", error);
            // Continue with just the API Sports events on error
          }
          
          // Return the combined events
          console.log(`Found ${combinedEvents.length} upcoming events for all sports combined`);
          return res.json(combinedEvents);
        }
      }
      
      // For live events, always try to get them from the API
      console.log("Fetching real-time data from API");
      
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
          12: 'mma-ufc',
          13: 'formula_1',
          14: 'cycling',
          15: 'american_football',
          16: 'afl',        // Australian Football League
          17: 'snooker',    // Added snooker
          18: 'darts',      // Added darts
          19: 'table-tennis', // Table tennis
          20: 'badminton',  // Badminton
          21: 'beach-volleyball', // Beach volleyball
          22: 'winter-sports', // Winter sports (skiing, etc)
          23: 'motorsport', // Generic motorsport
          24: 'esports',    // Esports
          25: 'netball',    // Netball
          26: 'soccer',     // Alias for football for some regions
          27: 'nba',        // NBA as separate entry
          28: 'nhl',        // NHL as separate entry
          29: 'nfl',        // NFL as separate entry
          30: 'mlb'         // MLB as separate entry
        };
        
        const sportName = sportMap[reqSportId] || 'football';
        console.log(`Attempting to fetch live ${sportName} (ID: ${reqSportId}) events from API directly`);
        
        // Get ONLY real events for this specific sport, never adapt from others
        const sportEvents = await apiSportsService.getLiveEvents(sportName);
        
        // Special handling for Rugby - use dedicated Rugby service for both types
        if (sportName === 'rugby') {
          console.log(`Using Rugby dedicated service for live Rugby events`);
          
          try {
            // Get rugby league events
            const rugbyLeagueEvents = await rugbyService.fetchLiveGamesWithCache('league');
            console.log(`RugbyService returned ${rugbyLeagueEvents.length} live rugby league games`);
            
            // Get rugby union events
            const rugbyUnionEvents = await rugbyService.fetchLiveGamesWithCache('union');
            console.log(`RugbyService returned ${rugbyUnionEvents.length} live rugby union games`);
            
            // Combine both types of rugby events
            const rugbyEvents = [...rugbyLeagueEvents, ...rugbyUnionEvents];
            
            if (rugbyEvents.length > 0) {
              console.log(`Returning ${rugbyEvents.length} combined Rugby events from dedicated Rugby service`);
              return res.json(rugbyEvents);
            } else {
              console.log(`Rugby service returned 0 live games, trying to identify rugby data from API Sports`);
              
              // Only use events that are actually rugby events - filter for rugby-related identifiers
              const genuineRugbyEvents = sportEvents.filter(event => {
                // Check league name for rugby-related terms
                const leagueName = event.leagueName?.toLowerCase() || '';
                const rugbyKeywords = [
                  'rugby', 'nrl', 'super league', 'premiership rugby', 'top 14', 
                  'pro14', 'super rugby', 'six nations', 'world cup rugby',
                  'challenge cup', 'champions cup'
                ];
                
                const isRugby = rugbyKeywords.some(keyword => leagueName.includes(keyword));
                
                if (!isRugby) {
                  console.log(`[RugbyService] REJECTING non-rugby match: ${event.homeTeam} vs ${event.awayTeam} (${event.leagueName})`);
                }
                
                return isRugby;
              });
              
              if (genuineRugbyEvents.length > 0) {
                console.log(`Found ${genuineRugbyEvents.length} genuine rugby events from API Sports`);
                
                const enhancedRugbyEvents = genuineRugbyEvents.map(event => ({
                  ...event,
                  sportId: 8, // Set to Rugby ID
                  isLive: true
                }));
                
                console.log(`Returning ${enhancedRugbyEvents.length} properly identified live Rugby events`);
                return res.json(enhancedRugbyEvents);
              } else {
                console.log(`No genuine rugby events found, returning empty array`);
                return res.json([]);
              }
            }
          } catch (error) {
            console.error('Error using Rugby service for live events:', error);
            
            // Fallback to minimal filtering of API data
            const filteredEvents = sportEvents.filter(event => {
              const leagueName = event.leagueName?.toLowerCase() || '';
              return leagueName.includes('rugby');
            });
            
            console.log(`Error in RugbyService. Returning ${filteredEvents.length} rugby events with basic filtering`);
            return res.json(filteredEvents);
          }
        }
        
        // Special handling for Baseball - use dedicated Baseball service
        if (sportName === 'baseball' || sportName === 'mlb') {
          console.log(`Using Baseball dedicated service for live Baseball events`);
          
          try {
            // Use our dedicated Baseball service for live games
            const liveBaseballEvents = await baseballService.getBaseballGames(true); // true means live games
            
            if (liveBaseballEvents && liveBaseballEvents.length > 0) {
              console.log(`BaseballService returned ${liveBaseballEvents.length} live games`);
              // Ensure all events are properly marked as baseball
              const validBaseballEvents = liveBaseballEvents.map(event => ({
                ...event,
                sportId: 4, // Make sure sportId is always Baseball (4)
                isLive: true // These are live events
              }));
              return res.json(validBaseballEvents);
            } else {
              console.log(`BaseballService returned 0 live games, trying to identify baseball data from API Sports`);
              
              // Only use events that are actually baseball events - filter for baseball-related identifiers
              const genuineBaseballEvents = sportEvents.filter(event => {
                // Check if this is genuine baseball data by looking at properties that would indicate baseball
                const isBaseball = 
                  // Check if the league name contains baseball-related terms
                  (event.leagueName && 
                    (event.leagueName.toLowerCase().includes('baseball') || 
                     event.leagueName.toLowerCase().includes('mlb') ||
                     event.leagueName.toLowerCase().includes('major league'))) ||
                  // Check if team names might be baseball teams - this is a weak check but helps
                  (event.homeTeam && event.awayTeam && 
                    (event.homeTeam.includes('Sox') || 
                     event.homeTeam.includes('Yankees') ||
                     event.homeTeam.includes('Cubs') ||
                     event.homeTeam.includes('Braves') ||
                     event.homeTeam.includes('Mets') ||
                     event.awayTeam.includes('Sox') ||
                     event.awayTeam.includes('Yankees') ||
                     event.awayTeam.includes('Cubs') ||
                     event.awayTeam.includes('Braves') ||
                     event.awayTeam.includes('Mets')));
                     
                return isBaseball;
              });
              
              if (genuineBaseballEvents.length > 0) {
                console.log(`Found ${genuineBaseballEvents.length} genuine baseball events from API Sports`);
                
                const baseballEvents = genuineBaseballEvents.map(event => ({
                  ...event,
                  sportId: 4, // Set to Baseball ID
                  isLive: true
                }));
                
                console.log(`Returning ${baseballEvents.length} properly identified live Baseball events`);
                return res.json(baseballEvents);
              } else {
                console.log(`No genuine baseball events found, returning empty array`);
                return res.json([]);
              }
            }
          } catch (error) {
            console.error('Error using Baseball service for live events:', error);
            
            // Fallback to API Sports service if there's an error
            const baseballEvents = sportEvents.map(event => ({
              ...event,
              sportId: 4, // Set to Baseball ID
              homeTeam: event.homeTeam || `Baseball Team ${event.id}`,
              awayTeam: event.awayTeam || 'Away Team',
              leagueName: event.leagueName || 'Baseball League',
              score: event.score || 'In Progress'
            }));
            console.log(`Error in BaseballService. Returning ${baseballEvents.length} live Baseball events with corrected sportId from API Sports`);
            return res.json(baseballEvents);
          }
        }
        
        // Special handling for Boxing - use dedicated Boxing service
        if (sportName === 'boxing') {
          console.log(`Using Boxing dedicated service for live Boxing events`);
          
          try {
            // Use our dedicated Boxing service for live matches
            const liveBoxingEvents = await boxingService.getBoxingEvents(true); // true means live matches
            
            if (liveBoxingEvents && liveBoxingEvents.length > 0) {
              console.log(`BoxingService returned ${liveBoxingEvents.length} live matches`);
              // Ensure all events are properly marked as boxing
              const validBoxingEvents = liveBoxingEvents.map(event => ({
                ...event,
                sportId: 11, // Make sure sportId is always Boxing (11)
                isLive: true // These are live events
              }));
              return res.json(validBoxingEvents);
            } else {
              console.log(`BoxingService returned 0 live matches, trying to identify boxing data from API Sports`);
              
              // Only use events that are actually boxing events - filter for boxing-related identifiers
              const genuineBoxingEvents = sportEvents.filter(event => {
                // STRICT VERIFICATION: Reject football/soccer matches
                if (event.leagueName?.includes('League') || 
                    event.leagueName?.includes('Premier') ||
                    event.leagueName?.includes('La Liga') ||
                    event.leagueName?.includes('Serie') ||
                    event.leagueName?.includes('Bundesliga') ||
                    event.leagueName?.includes('Cup') ||
                    event.leagueName?.includes('Copa') ||
                    event.homeTeam?.includes('FC') ||
                    event.awayTeam?.includes('FC') ||
                    event.homeTeam?.includes('United') ||
                    event.awayTeam?.includes('United')) {
                  console.log(`[BoxingService] REJECTING football match: ${event.homeTeam} vs ${event.awayTeam} (${event.leagueName})`);
                  return false;
                }
                
                // Verify this is actually boxing data
                let isBoxing = 
                  (event.leagueName && 
                    (event.leagueName.toLowerCase().includes('boxing') || 
                     event.leagueName.toLowerCase().includes('championship') ||
                     event.leagueName.toLowerCase().includes('title') ||
                     event.leagueName.toLowerCase().includes('belt')));
                
                // Check for boxing-related terms in team names
                if (!isBoxing && event.homeTeam && event.awayTeam) {
                  const homeTeam = event.homeTeam.toLowerCase();
                  const awayTeam = event.awayTeam.toLowerCase();
                  
                  isBoxing = 
                    homeTeam.includes('vs') ||  // Boxing matches are often "Fighter1 vs Fighter2"
                    awayTeam.includes('vs') ||
                    (homeTeam.split(' ').length <= 2 && awayTeam.split(' ').length <= 2); // Boxers usually have simple names
                }
                
                return isBoxing;
              });
              
              if (genuineBoxingEvents.length > 0) {
                console.log(`Found ${genuineBoxingEvents.length} genuine boxing events from API Sports`);
                
                const boxingEvents = genuineBoxingEvents.map(event => ({
                  ...event,
                  sportId: 11, // Set to Boxing ID
                  isLive: true
                }));
                
                console.log(`Returning ${boxingEvents.length} properly identified live Boxing events`);
                return res.json(boxingEvents);
              } else {
                console.log(`No genuine boxing events found, returning empty array`);
                return res.json([]);
              }
            }
          } catch (error) {
            console.error('Error using Boxing service for live events:', error);
            
            // Fallback to API Sports service if there's an error
            // But still filter to ensure we're only showing boxing events
            const filteredBoxingEvents = sportEvents.filter(event => {
              // Apply minimal filtering to avoid showing football matches
              return !(event.leagueName?.includes('League') || 
                     event.homeTeam?.includes('FC') || 
                     event.awayTeam?.includes('FC'));
            });
            
            const boxingEvents = filteredBoxingEvents.map(event => ({
              ...event,
              sportId: 11, // Set to Boxing ID
              homeTeam: event.homeTeam || `Boxer ${event.id}`,
              awayTeam: event.awayTeam || 'Opponent',
              leagueName: event.leagueName || 'Boxing Match',
              score: event.score || 'In Progress'
            }));
            console.log(`Error in BoxingService. Returning ${boxingEvents.length} filtered live Boxing events with corrected sportId from API Sports`);
            return res.json(boxingEvents);
          }
        }
        
        // Special handling for Formula 1 - use dedicated Formula 1 service
        if (sportName === 'formula_1' || sportName === 'formula-1') {
          console.log(`Using Formula 1 dedicated service for live Formula 1 events`);
          
          try {
            // Use our dedicated Formula 1 service for live races
            const liveFormula1Events = await formula1Service.getFormula1Races(true); // true means live races
            
            if (liveFormula1Events && liveFormula1Events.length > 0) {
              console.log(`Formula1Service returned ${liveFormula1Events.length} live races`);
              return res.json(liveFormula1Events);
            } else {
              console.log(`Formula1Service returned 0 live races, falling back to API Sports service`);
              
              // Fallback to API Sports service if Formula 1 service returns no events
              const formula1Events = sportEvents.map(event => ({
                ...event,
                sportId: 13, // Set to Formula 1 ID
                // Enhance event details for better display
                homeTeam: event.homeTeam || `Formula 1 Race ${event.id}`,
                awayTeam: event.awayTeam || 'Formula 1 Grand Prix',
                leagueName: event.leagueName || 'Formula 1 Championship',
                // Ensure we have a properly formatted score
                score: event.score || 'In Progress'
              }));
              console.log(`Returning ${formula1Events.length} live Formula 1 events with corrected sportId from API Sports`);
              return res.json(formula1Events);
            }
          } catch (error) {
            console.error('Error using Formula 1 service for live events:', error);
            
            // Fallback to API Sports service if there's an error
            const formula1Events = sportEvents.map(event => ({
              ...event,
              sportId: 13, // Set to Formula 1 ID
              homeTeam: event.homeTeam || `Formula 1 Race ${event.id}`,
              awayTeam: event.awayTeam || 'Formula 1 Grand Prix',
              leagueName: event.leagueName || 'Formula 1 Championship',
              score: event.score || 'In Progress'
            }));
            console.log(`Error in Formula1Service. Returning ${formula1Events.length} live Formula 1 events with corrected sportId from API Sports`);
            return res.json(formula1Events);
          }
        }
        
        // For other sports, check if events are not the correct sportId or have a dataSource property indicating they're adapted
        const realEvents = sportEvents.filter(event => {
          // Check if sportId matches
          const matchesSportId = event.sportId === reqSportId;
          
          // Check if event has a dataSource property indicating adaptation
          // @ts-ignore - event.dataSource may not be in the type definition but might be present in runtime
          const isAdapted = event.dataSource && typeof event.dataSource === 'string' && 
                          event.dataSource.includes("adapted");
          
          // Only keep events that match the sport ID and are not adapted
          return matchesSportId && !isAdapted;
        });
        
        if (realEvents && realEvents.length > 0) {
          console.log(`Found ${realEvents.length} genuine ${sportName} events from API`);
          return res.json(realEvents);
        } else {
          console.log(`No genuine live ${sportName} events found from API, returning empty array`);
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
        { id: 12, name: 'mma-ufc' },
        { id: 13, name: 'formula_1' },
        { id: 14, name: 'cycling' },
        { id: 15, name: 'american_football' },
        { id: 16, name: 'afl' },        // Australian Football League
        { id: 17, name: 'snooker' },    // Added snooker
        { id: 18, name: 'darts' },      // Added darts
        { id: 19, name: 'table-tennis' }, // Table tennis
        { id: 20, name: 'badminton' },  // Badminton
        { id: 21, name: 'beach-volleyball' }, // Beach volleyball
        { id: 22, name: 'winter-sports' }, // Winter sports (skiing, etc)
        { id: 23, name: 'motorsport' }, // Generic motorsport
        { id: 24, name: 'esports' },    // Esports
        { id: 25, name: 'netball' },    // Netball
        { id: 26, name: 'soccer' },     // Alias for football for some regions
        { id: 27, name: 'nba' },        // NBA as separate entry
        { id: 28, name: 'nhl' },        // NHL as separate entry
        { id: 29, name: 'nfl' },        // NFL as separate entry
        { id: 30, name: 'mlb' }         // MLB as separate entry
      ];
      
      let allEvents: any[] = [];
      
      // Fetch events for main sports
      for (const sport of allSports) {
        const sportEvents = await apiSportsService.getLiveEvents(sport.name);
        if (sportEvents && sportEvents.length > 0) {
          console.log(`Found ${sportEvents.length} live events for ${sport.name}`);
          
          // Special handling for Baseball events - use dedicated Baseball service
          if (sport.name === 'baseball' || sport.name === 'mlb') {
            console.log(`Using Baseball dedicated service in all sports fetch`);
            
            try {
              // Try to get Baseball events from dedicated service
              const baseballEvents = await baseballService.getBaseballGames(true); // true means live games
              
              if (baseballEvents && baseballEvents.length > 0) {
                console.log(`BaseballService returned ${baseballEvents.length} live games for all sports fetch`);
                // Add Baseball events from dedicated service
                allEvents = [...allEvents, ...baseballEvents];
              } else {
                console.log(`BaseballService returned 0 live games, using API Sports in all sports fetch`);
                // Process API Sports Baseball events as fallback
                const processedEvents = sportEvents.map(event => ({
                  ...event,
                  sportId: 4, // Force the correct sportId
                  // Ensure we have good display values
                  homeTeam: event.homeTeam || `Baseball Team ${event.id}`,
                  awayTeam: event.awayTeam || 'Away Team',
                  leagueName: event.leagueName || 'Baseball League',
                  score: event.score || 'In Progress'
                }));
                allEvents = [...allEvents, ...processedEvents];
              }
            } catch (error) {
              console.error('Error using Baseball service in all sports fetch:', error);
              // Fall back to processed API Sports events on error
              const processedEvents = sportEvents.map(event => ({
                ...event,
                sportId: 4, // Force the correct sportId
                homeTeam: event.homeTeam || `Baseball Team ${event.id}`,
                awayTeam: event.awayTeam || 'Away Team',
                leagueName: event.leagueName || 'Baseball League',
                score: event.score || 'In Progress'
              }));
              allEvents = [...allEvents, ...processedEvents];
            }
          }
          // Special handling for Formula 1 events - use dedicated Formula 1 service
          else if (sport.name === 'formula_1' || sport.name === 'formula-1') {
            console.log(`Using Formula 1 dedicated service in all sports fetch`);
            
            try {
              // Try to get Formula 1 events from dedicated service
              const formula1Events = await formula1Service.getFormula1Races(true); // true means live races
              
              if (formula1Events && formula1Events.length > 0) {
                console.log(`Formula1Service returned ${formula1Events.length} live races for all sports fetch`);
                // Add Formula 1 events from dedicated service
                allEvents = [...allEvents, ...formula1Events];
              } else {
                console.log(`Formula1Service returned 0 live races, using API Sports in all sports fetch`);
                // Process API Sports Formula 1 events as fallback
                const processedEvents = sportEvents.map(event => ({
                  ...event,
                  sportId: 13, // Force the correct sportId
                  // Ensure we have good display values
                  homeTeam: event.homeTeam || `Formula 1 Race ${event.id}`,
                  awayTeam: event.awayTeam || 'Formula 1 Grand Prix',
                  leagueName: event.leagueName || 'Formula 1 Championship',
                  score: event.score || 'In Progress'
                }));
                allEvents = [...allEvents, ...processedEvents];
              }
            } catch (error) {
              console.error('Error using Formula 1 service in all sports fetch:', error);
              // Fall back to processed API Sports events on error
              const processedEvents = sportEvents.map(event => ({
                ...event,
                sportId: 13, // Force the correct sportId
                homeTeam: event.homeTeam || `Formula 1 Race ${event.id}`,
                awayTeam: event.awayTeam || 'Formula 1 Grand Prix',
                leagueName: event.leagueName || 'Formula 1 Championship',
                score: event.score || 'In Progress'
              }));
              allEvents = [...allEvents, ...processedEvents];
            }
          } else {
            // For other sports, add events as-is
            allEvents = [...allEvents, ...sportEvents];
          }
        }
      }
      
      // Clear the request timeout as we have processed the data
      clearTimeout(requestTimeout);
      
      if (allEvents.length > 0) {
        console.log(`Found a total of ${allEvents.length} live events from all sports combined`);
        return res.json(allEvents);
      }
      
      // If we get here, just return what's in the database
      console.log("No live events found from API, returning database events");
      
      // Make sure we haven't already sent a response
      if (res.headersSent) {
        console.warn(`[Routes] Headers already sent, skipping response`);
        return;
      }
      
      // Return all events if we have them
      if (events && events.length > 0) {
        console.log(`[Routes] Successfully returning ${events.length} events`);
        return res.json(events);
      } else {
        // If we somehow got here with no events from any source, log and return an empty array
        console.warn(`[Routes] No events found from any source for sportId: ${reqSportId}, isLive: ${isLive}`);
        return res.json([]);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      clearTimeout(requestTimeout); // Clear the request timeout
      
      // Make sure we haven't already sent a response
      if (res.headersSent) {
        console.warn(`[Routes] Headers already sent, skipping error response`);
        return;
      }
      
      return res.status(500).json({ message: "Failed to fetch events" });
    }
  });
  
  // IMPORTANT: Add the live events endpoint BEFORE the :id endpoint to avoid routing conflicts
  app.get("/api/events/live", async (req: Request, res: Response) => {
    // Set response timeout to avoid hanging connections
    res.setTimeout(30000, () => {
      if (!res.headersSent) {
        console.log('[Routes] Response timeout reached for /api/events/live, sending empty response');
        return res.json({ events: [] });
      }
    });
    
    try {
      const sportId = req.query.sportId ? Number(req.query.sportId) : undefined;
      
      // Try direct fetch with the event tracking service first
      try {
        console.log(`[Routes] Attempting to fetch live events directly for sportId: ${sportId || 'all'}`);
        const liveEvents = await eventTrackingService.getLiveEvents(sportId);
        
        if (liveEvents && liveEvents.length > 0) {
          console.log(`[Routes] Found ${liveEvents.length} live events directly, returning them`);
          return res.json(liveEvents);
        }
      } catch (directError) {
        console.error('[Routes] Error fetching live events directly:', directError);
      }
      
      // If direct fetch fails, redirect to the main events endpoint
      const redirectUrl = `/api/events?isLive=true${sportId ? `&sportId=${sportId}` : ''}`;
      
      console.log(`[Routes] No live events found directly, redirecting /api/events/live to ${redirectUrl}`);
      
      // Issue a redirect to the events endpoint with isLive=true
      return res.redirect(302, redirectUrl);
    } catch (error) {
      console.error('Error in live events redirect:', error);
      return res.status(500).json({ error: 'Failed to fetch live events' });
    }
  });
  
  // Endpoint to track events that have gone live - MUST be before :id endpoint
  app.get("/api/events/tracked", async (_req: Request, res: Response) => {
    // Set a promise timeout to avoid hanging requests
    const TIMEOUT_MS = 3000; // 3 seconds timeout
    
    // Create a promise that resolves after timeout
    const timeoutPromise = new Promise<any[]>(resolve => {
      setTimeout(() => {
        console.log('[Routes] Tracking service request timed out, resolving with empty array');
        resolve([]);
      }, TIMEOUT_MS);
    });
    
    // Create the actual data fetching promise
    const fetchTrackedEventsPromise = new Promise<any[]>(async (resolve) => {
      try {
        let events = eventTrackingService.getTrackedEvents() || [];
        
        // Ensure events is an array
        if (!Array.isArray(events)) {
          console.error("Tracked events is not an array:", typeof events);
          events = [];
        }
        
        // Validate each event object to ensure it's properly formatted
        events = events.filter(event => 
          event && 
          typeof event === 'object' && 
          (event.id || event.eventId) && 
          (event.homeTeam || event.home || event.team1)
        );
        
        console.log(`[Routes] Got ${events.length} tracked events from service`);
        resolve(events);
      } catch (error) {
        console.error("Error fetching tracked events:", error);
        resolve([]); // Return empty array on error
      }
    });
    
    try {
      // Race the two promises - whichever resolves first wins
      const trackedEvents = await Promise.race([
        fetchTrackedEventsPromise,
        timeoutPromise
      ]);
      
      // Always return a valid response
      return res.json({
        tracked: trackedEvents || [], // Extra safety
        count: Array.isArray(trackedEvents) ? trackedEvents.length : 0,
        message: "Events that have transitioned from upcoming to live",
        source: Array.isArray(trackedEvents) && trackedEvents.length > 0 ? "tracking_service" : "timeout_fallback"
      });
    } catch (error) {
      console.error("Unhandled error in tracked events endpoint:", error);
      // Redundant safety - always return a valid response structure with an empty array
      return res.json({
        tracked: [],
        count: 0,
        message: "Error fetching tracked events, returning empty array",
        source: "error_fallback"
      });
    }
  });
  
  // Event details by ID
  app.get("/api/events/:id", async (req: Request, res: Response) => {
    try {
      const eventId = req.params.id;
      
      console.log(`[Routes] Fetching details for event ID: ${eventId}`);
      
      // First try to get event from event tracking service which has cached events
      try {
        console.log("[Routes] Attempting to fetch event from tracking service");
        const trackingEvent = await eventTrackingService.getEventById(eventId);
        
        if (trackingEvent) {
          console.log(`[Routes] Found event ${eventId} in tracking service`);
          return res.json(trackingEvent);
        }
      } catch (trackingError) {
        console.error("[Routes] Error fetching event from tracking service:", trackingError);
      }
      
      // Then try to get event from blockchain storage
      try {
        console.log("[Routes] Attempting to fetch event from blockchain storage");
        // Try to get specific event by ID from blockchain
        const eventIdNum = Number(eventId);
        const blockchainEvent = await blockchainStorage.getEvents(undefined, undefined, 1);
        // Filter to find the specific event
        const filteredEvent = blockchainEvent.filter(event => event.id === eventIdNum);
        
        if (filteredEvent && filteredEvent.length > 0) {
          console.log(`[Routes] Found event ${eventId} in blockchain storage`);
          return res.json(filteredEvent[0]);
        } else if (blockchainEvent && blockchainEvent.length > 0) {
          // If we didn't find the exact event ID but have other events, log and try the first one
          console.log(`[Routes] No exact match for event ${eventId}, but found other events in blockchain storage`);
          return res.json(blockchainEvent[0]);
        }
      } catch (blockchainError) {
        console.error("[Routes] Error fetching event from blockchain storage:", blockchainError);
      }
      
      // Finally try traditional storage
      try {
        // Try to parse as a number
        const numericId = parseInt(eventId, 10);
        if (!isNaN(numericId)) {
          const event = await storage.getEvent(numericId);
          if (event) {
            console.log(`[Routes] Found event ${eventId} in traditional storage`);
            // Get markets for the event if available
            const markets = await storage.getMarkets(numericId);
            
            // Combine event with its markets
            const eventWithMarkets = {
              ...event,
              markets: markets || []
            };
            
            return res.json(eventWithMarkets);
          }
        }
      } catch (parseError) {
        console.error("[Routes] Error fetching event from traditional storage:", parseError);
      }
      
      // For API-Sports events, the IDs might be strings
      // Handle this separately if needed
      console.log(`Event not found with numeric ID, checking API directly`);
      
      // Since we couldn't find an event in the database, return 404
      return res.status(404).json({ message: "Event not found" });
    } catch (error) {
      console.error(`Error fetching event ${req.params.id}:`, error);
      return res.status(500).json({ message: "Failed to fetch event details" });
    }
  });
  
  // Promotions
  app.get("/api/promotions", async (req: Request, res: Response) => {
    try {
      console.log("[Routes] Fetching promotions");
      
      // First try blockchain storage
      try {
        console.log("[Routes] Attempting to fetch promotions from blockchain storage");
        const blockchainPromotions = await blockchainStorage.getPromotions();
        
        if (blockchainPromotions && blockchainPromotions.length > 0) {
          console.log(`[Routes] Found ${blockchainPromotions.length} promotions in blockchain storage`);
          return res.json(blockchainPromotions);
        }
      } catch (blockchainError) {
        console.error("[Routes] Error fetching promotions from blockchain storage:", blockchainError);
      }
      
      // Fallback to traditional storage
      console.log("[Routes] Fetching promotions from traditional storage");
      const promotions = await storage.getPromotions();
      return res.json(promotions);
    } catch (error) {
      console.error("Error fetching promotions:", error);
      return res.status(500).json({ message: "Failed to fetch promotions" });
    }
  });

  // New lite API endpoint for live events that returns minimal data with strict string output
  app.get("/api/events/live-lite", async (req: Request, res: Response) => {
    // CRITICAL: Force application/json content type and ensure no caching
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    // CRITICAL: Set a hard timeout for the entire request
    let requestTimeout = setTimeout(() => {
      if (!res.headersSent) {
        console.log('[Routes] HARD TIMEOUT: Live lite events response timeout reached');
        res.status(200).json([]);  // Use res.json to properly format response
      }
    }, 8000); // 8 second absolute max response time
    
    // Main try/catch to ensure we always return JSON array
    try {
      const sportId = req.query.sportId ? Number(req.query.sportId) : undefined;
      const limit = req.query.limit ? Math.min(Number(req.query.limit), 1000) : 200;
      
      console.log(`[Routes] Fetching lite live events for sportId: ${sportId || 'all'}`);
      
      // Create a safer events collection initialized as empty array
      let trackedEvents: any[] = [];
      
      try {
        console.log('[Routes] Attempting to fetch events from tracking service');
        
        // Use a promise race with shorter timeout to get events
        const timeoutMS = 4000; // 4 second timeout for tracking service
        
        try {
          trackedEvents = await Promise.race([
            eventTrackingService.getLiveEvents(sportId),
            new Promise<any[]>((_, reject) => {
              setTimeout(() => {
                console.log('[Routes] Tracking service request timed out, resolving with empty array');
                reject(new Error('Tracking service timeout'));
              }, timeoutMS);
            })
          ]);
          
          // Double verify the events are an array immediately
          if (!Array.isArray(trackedEvents)) {
            console.warn(`[Routes] Tracking service returned non-array: ${typeof trackedEvents}`);
            trackedEvents = [];
          }
        } catch (error) {
          console.warn('[Routes] Error or timeout in tracking service for lite events:', error);
          trackedEvents = [];
        }
      } catch (innerError) {
        console.error('[Routes] Inner error in lite events endpoint:', innerError);
        trackedEvents = [];
      }
      
      // Process events if we have any
      if (Array.isArray(trackedEvents) && trackedEvents.length > 0) {
        try {
          // Create a lite version of events with only essential fields 
          // and normalize the data to handle various formats
          const liteEvents = trackedEvents.slice(0, limit).map((event: any) => {
            // Ensure essential properties exist with fallbacks
            return {
              id: event.id || event.eventId || `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              sportId: Number(event.sportId) || 1,
              homeTeam: event.homeTeam || event.home || event.team1 || "Team A",
              awayTeam: event.awayTeam || event.away || event.team2 || "Team B",
              leagueName: event.leagueName || event.league?.name || "League",
              eventDate: event.eventDate || event.date || new Date().toISOString(),
              isLive: true,
              score: event.score || "0 - 0",
              status: event.status || 'live',
              markets: Array.isArray(event.markets) ? event.markets.slice(0, 3) : []
            };
          });
          
          // Guarantee we're working with a valid array
          const eventsArray = Array.isArray(liteEvents) ? liteEvents : [];
          
          console.log(`[Routes] Returning ${eventsArray.length} lite events`);
          
          // Clear timeout and return proper JSON response
          clearTimeout(requestTimeout);
          return res.status(200).json(eventsArray);
        } catch (mapError) {
          console.error('[Routes] Error mapping lite events:', mapError);
          clearTimeout(requestTimeout);
          return res.status(200).json([]);
        }
      }
      
      // If no events found or any processing error, return empty array guaranteed
      console.log('[Routes] No lite events found, returning empty array');
      clearTimeout(requestTimeout);
      return res.status(200).json([]);
    } catch (error) {
      console.error('[Routes] Error in lite live events endpoint:', error);
      clearTimeout(requestTimeout);
      if (!res.headersSent) {
        return res.status(200).json([]);
      }
    }
  });
  
  const httpServer = createServer(app);
  
  // Initialize WebSocket server with enhanced reliability
  console.log("[Routes] Initializing enhanced WebSocket server on path /ws");
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    clientTracking: true,
    // Set permessage-deflate to false for better performance
    perMessageDeflate: false
  });
  
  // Track connection statistics
  const wsStats = {
    totalConnections: 0,
    activeConnections: 0,
    messagesReceived: 0,
    messagesSent: 0,
    errors: 0
  };
  
  // Handle server-level errors
  wss.on('error', (error) => {
    console.error('[WebSocket Server] Server-level error:', error);
    wsStats.errors++;
    
    // Try to recover the server
    try {
      console.log('[WebSocket Server] Attempting recovery...');
      // The WebSocket server is tied to the HTTP server, so we don't restart it directly
      // Instead, we'll log the error and let the process continue
    } catch (recoveryError) {
      console.error('[WebSocket Server] Recovery failed:', recoveryError);
    }
  });
  
  // Set up enhanced connection handling
  wss.on('connection', (ws: WebSocket, req) => {
    wsStats.totalConnections++;
    wsStats.activeConnections++;
    
    // Store the client's IP for logging
    const clientIp = req.socket.remoteAddress || 'unknown';
    console.log(`[WebSocket] New client connected from ${clientIp}`);
    
    // Add extra properties to track heartbeat
    (ws as any).isAlive = true;
    (ws as any).lastActivity = Date.now();
    (ws as any).subscriptions = new Set();
    
    // Heartbeat mechanism - clients must respond to ping with pong
    ws.on('pong', () => {
      (ws as any).isAlive = true;
      (ws as any).lastActivity = Date.now();
    });
    
    // Send welcome message with connection status with improved error handling
    try {
      const welcomeMessage = JSON.stringify({
        type: 'connection',
        status: 'connected',
        message: 'Connected to SuiBets WebSocket server',
        serverTime: Date.now(),
        connectionId: wsStats.totalConnections
      });
      
      ws.send(welcomeMessage);
      wsStats.messagesSent++;
    } catch (err) {
      console.error("[WebSocket] Error sending welcome message:", err);
      wsStats.errors++;
    }
    
    // Handle incoming messages
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        console.log("[WebSocket] Received message:", data);
        
        // Handle ping message (respond with pong)
        if (data.type === 'ping') {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: Date.now(),
              echo: data.timestamp || Date.now()
            }));
          }
          return;
        }
        
        // Handle subscription message for sports
        if (data.type === 'subscribe' && Array.isArray(data.sports)) {
          // Add the requested sports to this client's subscriptions
          const subscriptions = (ws as any).subscriptions as Set<string>;
          
          data.sports.forEach((sportId: number) => {
            subscriptions.add(`sport:${sportId}`);
          });
          
          // Also handle 'all-sports' special subscription
          if (data.allSports === true) {
            subscriptions.add('all-sports');
          }
          
          console.log(`[WebSocket] Client subscribed to sports: ${Array.from(subscriptions).join(', ')}`);
          
          // Respond with confirmation
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'subscribed',
              sports: data.sports,
              allSports: data.allSports === true,
              subscriptions: Array.from(subscriptions),
              timestamp: Date.now()
            }));
            wsStats.messagesSent++;
          }
          return;
        }
        
        // Handle unsubscribe message
        if (data.type === 'unsubscribe' && Array.isArray(data.sports)) {
          // Remove the specified sports from this client's subscriptions
          const subscriptions = (ws as any).subscriptions as Set<string>;
          
          data.sports.forEach((sportId: number) => {
            subscriptions.delete(`sport:${sportId}`);
          });
          
          // Also handle 'all-sports' special unsubscription
          if (data.allSports === true) {
            subscriptions.delete('all-sports');
          }
          
          console.log(`[WebSocket] Client unsubscribed from sports: ${data.sports.join(', ')}`);
          
          // Respond with confirmation
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'unsubscribed',
              sports: data.sports,
              subscriptions: Array.from(subscriptions),
              timestamp: Date.now()
            }));
            wsStats.messagesSent++;
          }
          return;
        }
        
        // Respond with acknowledgment for other message types
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'ack',
            received: data.type || 'unknown',
            timestamp: Date.now()
          }));
          wsStats.messagesSent++;
        }
      } catch (error) {
        console.error("[WebSocket] Error processing message:", error);
        
        // Send error response
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Invalid message format'
            }));
          } catch (err) {
            console.error("[WebSocket] Error sending error message:", err);
          }
        }
      }
    });
    
    // Handle connection close with improved stats tracking
    ws.on('close', (code, reason) => {
      wsStats.activeConnections = Math.max(0, wsStats.activeConnections - 1);
      console.log(`[WebSocket] Client disconnected: Code ${code}, Reason: ${reason || 'No reason provided'} (${wsStats.activeConnections} remaining)`);
      
      // Clean up any subscription resources associated with this connection
      try {
        const subscriptions = (ws as any).subscriptions;
        if (subscriptions && subscriptions.size > 0) {
          console.log(`[WebSocket] Cleaning up ${subscriptions.size} subscriptions for disconnected client`);
          // Any cleanup needed for subscriptions would go here
        }
      } catch (err) {
        console.error("[WebSocket] Error cleaning up subscriptions:", err);
      }
    });
    
    // Handle errors with improved error tracking
    ws.on('error', (error) => {
      wsStats.errors++;
      console.error("[WebSocket] Connection error:", error);
      
      // Try to close the connection gracefully on error
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1011, 'Internal server error');
        }
      } catch (closeErr) {
        console.error("[WebSocket] Error closing connection after error:", closeErr);
      }
    });
  });
  
  // Enhanced broadcast function with error handling, targeting, and metrics
  const broadcastLiveUpdates = (data: any, options: {
    sportId?: number,
    targetSubscriptions?: string[],
    excludeClients?: Set<WebSocket>,
    priority?: 'low' | 'normal' | 'high'
  } = {}) => {
    const start = Date.now();
    const serializedData = JSON.stringify({
      ...data,
      serverTime: Date.now()
    });
    
    let sentCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    // Use priority to determine throttling behavior (avoid overwhelming clients)
    const shouldThrottle = options.priority === 'low' && wss.clients.size > 100;
    
    wss.clients.forEach((client) => {
      // Skip excluded clients
      if (options.excludeClients && options.excludeClients.has(client)) {
        skippedCount++;
        return;
      }
      
      // Check if this client is interested in this sport (if sportId provided)
      if (options.sportId) {
        const subscriptions = (client as any).subscriptions;
        // Skip if client has subscriptions but isn't subscribed to this sport
        if (subscriptions && subscriptions.size > 0 && 
            !subscriptions.has(`sport:${options.sportId}`) && 
            !subscriptions.has('all-sports')) {
          skippedCount++;
          return;
        }
      }
      
      // Check for specific subscription targets
      if (options.targetSubscriptions && options.targetSubscriptions.length > 0) {
        const subscriptions = (client as any).subscriptions;
        // Skip if client doesn't have any of the target subscriptions
        if (!subscriptions || !options.targetSubscriptions.some(sub => subscriptions.has(sub))) {
          skippedCount++;
          return;
        }
      }
      
      // Send message if connection is open
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(serializedData);
          sentCount++;
          wsStats.messagesSent++;
          
          // Update last activity time
          (client as any).lastActivity = Date.now();
        } catch (err) {
          console.error("[WebSocket] Error broadcasting update:", err);
          errorCount++;
          wsStats.errors++;
        }
      } else {
        skippedCount++;
      }
    });
    
    // Log metrics only if interesting (sent to clients or encountered errors)
    if (sentCount > 0 || errorCount > 0) {
      const duration = Date.now() - start;
      console.log(`[WebSocket] Broadcast: ${sentCount} sent, ${errorCount} errors, ${skippedCount} skipped in ${duration}ms`);
    }
    
    return { sentCount, errorCount, skippedCount };
  };
  
  // Improved heartbeat mechanism with connection pruning
  const heartbeatInterval = setInterval(() => {
    let pruned = 0;
    wss.clients.forEach((client: WebSocket) => {
      const ws = client as any;
      
      // Check if client is still alive
      if (ws.isAlive === false) {
        // Client didn't respond to ping, terminate it
        wsStats.activeConnections--;
        pruned++;
        console.log('[WebSocket] Terminating inactive connection');
        return client.terminate();
      }
      
      // Check for inactivity timeout (10 minutes)
      const inactiveTime = Date.now() - ws.lastActivity;
      if (inactiveTime > 10 * 60 * 1000) {
        wsStats.activeConnections--;
        pruned++;
        console.log(`[WebSocket] Terminating connection due to inactivity (${Math.round(inactiveTime/1000)}s)`);
        return client.terminate();
      }
      
      // Mark as not alive, ping will set it back to true if client responds
      ws.isAlive = false;
      
      // Send ping as proper ping frame instead of JSON message
      try {
        client.ping();
      } catch (err) {
        console.error("[WebSocket] Error sending ping frame:", err);
        wsStats.errors++;
      }
      
      // Also send a JSON ping for older clients that might not handle ping frames
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify({ 
            type: 'ping', 
            timestamp: Date.now(),
            stats: {
              connections: wsStats.activeConnections,
              uptime: Math.floor(process.uptime())
            }
          }));
          wsStats.messagesSent++;
        } catch (err) {
          console.error("[WebSocket] Error sending ping message:", err);
          wsStats.errors++;
        }
      }
    });
    
    if (pruned > 0) {
      console.log(`[WebSocket] Pruned ${pruned} inactive connections, ${wsStats.activeConnections} remaining`);
    }
  }, 30000); // Check every 30 seconds
  
  // Connection statistics logger
  const statsInterval = setInterval(() => {
    console.log(`[WebSocket Stats] Active: ${wsStats.activeConnections}, Total: ${wsStats.totalConnections}, Messages sent: ${wsStats.messagesSent}, Errors: ${wsStats.errors}`);
  }, 60000); // Log stats every minute
  
  // Clean up on server close
  httpServer.on('close', () => {
    clearInterval(heartbeatInterval);
    clearInterval(statsInterval);
    
    // Close all connections properly
    wss.clients.forEach(client => {
      try {
        client.close(1001, 'Server shutting down');
      } catch (err) {
        // Ignore errors during shutdown
      }
    });
    
    console.log("[WebSocket] Server shutting down, cleaned up resources");
  });
  
  // Also initialize the LiveScoreUpdateService which uses its own WebSocket implementation
  // This ensures backwards compatibility with existing code
  console.log("[Routes] Also initializing LiveScoreUpdateService for comprehensive live score updates");
  const liveScoreUpdateService = new LiveScoreUpdateService(httpServer, apiSportsService, eventTrackingService);
  
  return httpServer;
}