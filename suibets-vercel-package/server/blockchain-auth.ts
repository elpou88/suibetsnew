import { Express, Request, Response, NextFunction } from "express";
import { walrusService } from "./services/walrusService";
import session from "express-session";
import { v4 as uuidv4 } from 'uuid';
import { User } from "@shared/schema";
import MemoryStore from "memorystore";

// Create memory store for session
const MemStore = MemoryStore(session);

// Type for wallet-based session
interface WalletSession {
  walletAddress: string;
  walletType: string;
  signature?: string;
  timestamp: number;
  nonce: string;
}

/**
 * Setup blockchain-based authentication using Walrus protocol
 */
export function setupBlockchainAuth(app: Express) {
  // Define session secret
  const sessionSecret = process.env.SESSION_SECRET || uuidv4();

  // Create in-memory session store (for dev only, use Redis or similar in production)
  const memoryStore = new MemStore({
    checkPeriod: 86400000 // Prune expired entries every 24h
  });

  // Configure session
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: memoryStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      sameSite: 'lax'
    }
  };

  // Apply session middleware
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));

  // Middleware to check wallet authentication
  const requireWalletAuth = (req: Request, res: Response, next: NextFunction) => {
    // Check if wallet session exists
    const walletSession = req.session.wallet as WalletSession | undefined;
    
    if (!walletSession || !walletSession.walletAddress) {
      return res.status(401).json({ 
        success: false, 
        message: "Wallet authentication required" 
      });
    }
    
    // Add wallet info to request
    req.wallet = {
      address: walletSession.walletAddress,
      type: walletSession.walletType,
      authenticated: true
    };
    
    next();
  };

  // Define routes for blockchain-based authentication

  // Connect wallet and authenticate
  app.post("/api/auth/wallet-connect", async (req: Request, res: Response) => {
    try {
      const { walletAddress, walletType, signature, message } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({
          success: false,
          message: "Wallet address is required"
        });
      }
      
      // In a full implementation, verify the signature against the message
      // For now, we'll assume it's valid
      
      // Check if wallet is registered with Walrus protocol
      const isRegistered = await walrusService.isWalletRegistered(walletAddress);
      
      // If not registered, register it
      let registrationTxHash = null;
      if (!isRegistered) {
        registrationTxHash = await walrusService.registerWallet(walletAddress);
      }
      
      // Create wallet session
      const walletSession: WalletSession = {
        walletAddress,
        walletType: walletType || 'Sui',
        signature,
        timestamp: Date.now(),
        nonce: uuidv4()
      };
      
      // Save wallet session
      req.session.wallet = walletSession;
      
      // Return success
      res.json({
        success: true,
        walletAddress,
        isRegistered: true,
        registrationTxHash,
        message: registrationTxHash 
          ? "Wallet registered and connected successfully" 
          : "Wallet connected successfully"
      });
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      res.status(500).json({
        success: false,
        message: "Failed to connect wallet: " + error.message
      });
    }
  });

  // Disconnect wallet
  app.post("/api/auth/wallet-disconnect", (req: Request, res: Response) => {
    // Delete wallet session
    delete req.session.wallet;
    
    // Return success
    res.json({
      success: true,
      message: "Wallet disconnected successfully"
    });
  });

  // Check wallet authentication status
  app.get("/api/auth/wallet-status", (req: Request, res: Response) => {
    const walletSession = req.session.wallet as WalletSession | undefined;
    
    if (!walletSession || !walletSession.walletAddress) {
      return res.json({
        authenticated: false,
        message: "No wallet connected"
      });
    }
    
    res.json({
      authenticated: true,
      walletAddress: walletSession.walletAddress,
      walletType: walletSession.walletType
    });
  });

  // Get user profile from blockchain
  app.get("/api/auth/profile", requireWalletAuth, async (req: Request, res: Response) => {
    try {
      const { address } = req.wallet as { address: string };
      
      // In a full implementation, this would fetch user profile data from blockchain
      // For now, we'll return a basic profile
      
      // Check if wallet is registered with Walrus protocol (to be safe)
      const isRegistered = await walrusService.isWalletRegistered(address);
      
      if (!isRegistered) {
        return res.status(401).json({
          success: false,
          message: "Wallet is not registered with Walrus protocol"
        });
      }
      
      // Return user profile
      res.json({
        success: true,
        profile: {
          walletAddress: address,
          walletType: (req.wallet as any).type || 'Sui',
          username: `user_${address.substring(0, 6)}`,
          // We would fetch these from the blockchain in a real implementation
          balance: 0,
          suiBalance: 0,
          sbetsBalance: 0,
          createdAt: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch profile: " + error.message
      });
    }
  });

  // Return the middleware for use in other routes
  return { requireWalletAuth };
}

// Extend Express Request type to include wallet info
declare global {
  namespace Express {
    interface Request {
      wallet?: {
        address: string;
        type: string;
        authenticated: boolean;
      };
    }
  }
}