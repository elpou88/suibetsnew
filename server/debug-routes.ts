import { Request, Response } from "express";
import { initBasketballService } from "./services/basketballService";
import { Express } from "express";

// Get the API key from environment variables
const apiKey = process.env.SPORTSDATA_API_KEY || process.env.API_SPORTS_KEY || "";
const basketballService = initBasketballService(apiKey);

export function registerDebugRoutes(app: Express) {
  // Debug endpoint for basketball data
  app.get("/api/debug/basketball", async (req: Request, res: Response) => {
    try {
      console.log("[DEBUG] Checking basketball service directly");
      console.log("[DEBUG] API Key length:", apiKey.length);
      console.log("[DEBUG] API Key preview:", apiKey.substring(0, 4) + "..." + apiKey.substring(apiKey.length - 4));
      
      // Get both live and non-live games for testing
      const liveGames = await basketballService.getBasketballGames(true);
      console.log("[DEBUG] Basketball service found", liveGames.length, "live games");
      
      const upcomingGames = await basketballService.getBasketballGames(false);
      console.log("[DEBUG] Basketball service found", upcomingGames.length, "upcoming games");
      
      // Return all the data for inspection
      return res.json({
        status: "ok",
        apiKeyLength: apiKey.length,
        apiKeyValid: apiKey.length > 10,
        timestamp: new Date().toISOString(),
        liveGamesCount: liveGames.length,
        upcomingGamesCount: upcomingGames.length,
        liveSample: liveGames.slice(0, 2), // Just the first 2 for brevity
        upcomingSample: upcomingGames.slice(0, 2) // Just the first 2 for brevity
      });
    } catch (error) {
      console.error("[DEBUG] Error with basketball service:", error);
      return res.status(500).json({ 
        status: "error", 
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });
  
  // Debug endpoint for API key check
  app.get("/api/debug/keys", (_req: Request, res: Response) => {
    return res.json({
      sportsApiKeyPresent: !!apiKey,
      sportsApiKeyLength: apiKey.length,
      walAppKeyPresent: !!process.env.WAL_APP_API_KEY,
      wurlusKeyPresent: !!process.env.WURLUS_API_KEY
    });
  });
}