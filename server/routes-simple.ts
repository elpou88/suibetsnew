import express, { Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ApiSportsService, saveUpcomingSnapshot, getUpcomingSnapshot, saveLiveSnapshot, getLiveSnapshot, withSingleFlight } from "./services/apiSportsService";
const apiSportsService = new ApiSportsService();
import { SettlementService } from "./services/settlementService";
import { AdminService } from "./services/adminService";
import errorHandlingService from "./services/errorHandlingService";
import { EnvValidationService } from "./services/envValidationService";
import monitoringService from "./services/monitoringService";
import notificationService from "./services/notificationService";
import balanceService from "./services/balanceService";
import antiCheatService from "./services/smartContractAntiCheatService";
import zkLoginService from "./services/zkLoginService";
import { getSportsToFetch } from "./sports-config";
import { validateRequest, PlaceBetSchema, ParlaySchema, WithdrawSchema } from "./validation";
import aiRoutes from "./routes-ai";
import { settlementWorker } from "./services/settlementWorker";
import blockchainBetService from "./services/blockchainBetService";
import { promotionService } from "./services/promotionService";

export async function registerRoutes(app: express.Express): Promise<Server> {
  // Initialize services
  const adminService = new AdminService();

  // Validate environment on startup
  const envValidation = EnvValidationService.validateEnvironment();
  EnvValidationService.printValidationResults(envValidation);

  // Start the settlement worker for automatic bet settlement
  settlementWorker.start();
  console.log('🔄 Settlement worker started - will automatically settle bets when matches finish');
  
  // Start background odds prefetcher for 100% real odds coverage
  apiSportsService.startOddsPrefetcher();
  console.log('🎰 Odds prefetcher started - continuously warming odds cache for instant responses');

  // Create HTTP server
  const httpServer = createServer(app);

  // Admin session tokens (in-memory with 1 hour expiry)
  const adminSessions = new Map<string, { expiresAt: number }>();
  const SESSION_DURATION = 60 * 60 * 1000; // 1 hour

  const generateSecureToken = () => {
    const array = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const isValidAdminSession = (token: string): boolean => {
    const session = adminSessions.get(token);
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
      adminSessions.delete(token);
      return false;
    }
    return true;
  };

  // Clean up expired sessions periodically
  setInterval(() => {
    const now = Date.now();
    Array.from(adminSessions.entries()).forEach(([token, session]) => {
      if (now > session.expiresAt) {
        adminSessions.delete(token);
      }
    });
  }, 5 * 60 * 1000); // Every 5 minutes

  // Health check endpoint
  app.get("/api/health", async (req: Request, res: Response) => {
    const report = monitoringService.getHealthReport();
    const statusCode = report.status === 'HEALTHY' ? 200 : 503;
    res.status(statusCode).json(report);
  });

  // System stats endpoint
  app.get("/api/admin/stats", async (req: Request, res: Response) => {
    try {
      const stats = monitoringService.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Admin force-settle endpoint (supports both token and password auth)
  app.post("/api/admin/settle-bet", async (req: Request, res: Response) => {
    try {
      const { betId, outcome, reason, adminPassword } = req.body;
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');
      
      // Check token-based auth first, then fall back to password auth
      const hasValidToken = token && isValidAdminSession(token);
      const actualPassword = process.env.ADMIN_PASSWORD || 'change-me-in-production';
      const hasValidPassword = adminPassword === actualPassword;
      
      if (!hasValidToken && !hasValidPassword) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      if (!betId || !outcome) {
        return res.status(400).json({ message: "Missing required fields: betId, outcome" });
      }

      if (!['won', 'lost', 'void'].includes(outcome)) {
        return res.status(400).json({ message: "Invalid outcome - must be 'won', 'lost', or 'void'" });
      }

      // Update bet status directly and handle payouts - ONLY if status update succeeds (prevents double payout)
      const bet = await storage.getBetByStringId(betId);
      
      if (!bet) {
        console.log(`❌ Bet ${betId} not found`);
        return res.status(404).json({ message: "Bet not found" });
      }
      
      const statusUpdated = await storage.updateBetStatus(betId, outcome);
      
      if (statusUpdated) {
        // Map storage field names correctly: stake, potentialWin, currency
        const currency = (bet.currency === 'SBETS' || bet.feeCurrency === 'SBETS') ? 'SBETS' : 'SUI';
        const walletId = bet.walletAddress || String(bet.userId);
        const stake = bet.stake || bet.betAmount || 0;
        const potentialPayout = bet.potentialWin || bet.potentialPayout || 0;
        
        console.log(`🔧 ADMIN SETTLE: Processing bet ${betId} - stake: ${stake}, payout: ${potentialPayout}, currency: ${currency}`);
        
        if (outcome === 'won') {
          // Calculate and record 1% platform fee on winnings (profit only)
          const profit = potentialPayout - stake;
          const platformFee = profit > 0 ? profit * 0.01 : 0;
          const netPayout = potentialPayout - platformFee;
          
          const winningsAdded = await balanceService.addWinnings(walletId, netPayout, currency);
          if (!winningsAdded) {
            // CRITICAL: Revert bet status if balance credit failed
            await storage.updateBetStatus(betId, 'pending');
            console.error(`❌ SETTLEMENT REVERTED: Failed to credit winnings for bet ${betId}`);
            return res.status(500).json({ message: "Failed to credit winnings - settlement reverted" });
          }
          // Record platform fee as revenue
          if (platformFee > 0) {
            await balanceService.addRevenue(platformFee, currency);
          }
          console.log(`💰 ADMIN SETTLE: ${walletId} won ${netPayout} ${currency} (fee: ${platformFee} ${currency})`);
        } else if (outcome === 'lost') {
          // Add full stake to platform revenue
          await balanceService.addRevenue(stake, currency);
          console.log(`📊 ADMIN SETTLE: ${stake} ${currency} added to revenue from lost bet`);
        } else if (outcome === 'void') {
          // Refund stake on void
          const refundSuccess = await balanceService.addWinnings(walletId, stake, currency);
          if (!refundSuccess) {
            await storage.updateBetStatus(betId, 'pending');
            console.error(`❌ SETTLEMENT REVERTED: Failed to refund stake for voided bet ${betId}`);
            return res.status(500).json({ message: "Failed to refund stake - settlement reverted" });
          }
          console.log(`🔄 ADMIN SETTLE: ${walletId} refunded ${stake} ${currency} (void)`);
        }
      } else {
        console.log(`⚠️ Bet ${betId} already settled - no payout applied`);
        return res.status(400).json({ message: "Bet already settled" });
      }
      
      const action = {
        id: `admin-settle-${betId}-${Date.now()}`,
        betId,
        outcome,
        reason: reason || 'Admin force settle',
        timestamp: Date.now()
      };
      
      monitoringService.logSettlement({
        settlementId: action.id,
        betId,
        outcome,
        payout: bet?.potentialWin || bet?.potentialPayout || 0,
        timestamp: Date.now(),
        fees: 0
      });
      
      console.log(`✅ ADMIN: Settled bet ${betId} as ${outcome}`);
      res.json({ success: true, action });
    } catch (error: any) {
      console.error("Admin settle error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Admin force on-chain settlement endpoint - retry failed blockchain payouts
  app.post("/api/admin/force-onchain-settlement", async (req: Request, res: Response) => {
    try {
      const { betId, outcome, adminPassword } = req.body;
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');
      
      // Check token-based auth first, then fall back to password auth
      const hasValidToken = token && isValidAdminSession(token);
      const actualPassword = process.env.ADMIN_PASSWORD || 'change-me-in-production';
      const hasValidPassword = adminPassword === actualPassword;
      
      if (!hasValidToken && !hasValidPassword) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      if (!betId || !outcome) {
        return res.status(400).json({ message: "Missing required fields: betId, outcome" });
      }

      if (!['won', 'lost', 'void'].includes(outcome)) {
        return res.status(400).json({ message: "Invalid outcome - must be 'won', 'lost', or 'void'" });
      }

      console.log(`🔧 ADMIN: Force on-chain settlement for bet ${betId} as ${outcome}`);
      
      const result = await settlementWorker.forceOnChainSettlement(betId, outcome);
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: `On-chain settlement executed successfully`,
          txHash: result.txHash,
          betId,
          outcome
        });
      } else {
        res.status(400).json({ 
          success: false, 
          message: result.error || 'On-chain settlement failed',
          betId,
          outcome
        });
      }
    } catch (error: any) {
      console.error("Admin force on-chain settlement error:", error);
      res.status(500).json({ message: error.message || 'Unknown error' });
    }
  });

  // Admin get bets needing on-chain settlement
  app.get("/api/admin/bets-needing-settlement", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');
      
      if (!token || !isValidAdminSession(token)) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const bets = await settlementWorker.getBetsNeedingOnChainSettlement();
      res.json({ 
        success: true, 
        count: bets.length,
        bets: bets.map(b => ({
          id: b.id,
          betObjectId: b.betObjectId,
          status: b.status,
          walletAddress: b.walletAddress,
          betAmount: b.betAmount,
          potentialPayout: b.potentialPayout,
          currency: b.feeCurrency || 'SUI'
        }))
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin cancel-bet endpoint
  app.post("/api/admin/cancel-bet", async (req: Request, res: Response) => {
    try {
      const { betId, reason, adminPassword } = req.body;
      
      if (!betId || !adminPassword) {
        return res.status(400).json({ message: "Missing required fields: betId, adminPassword" });
      }

      const action = await adminService.cancelBet(betId, reason || 'Admin cancelled', adminPassword);
      
      if (action) {
        monitoringService.logCancelledBet(betId, reason || 'Admin cancelled');
        res.json({ success: true, action });
      } else {
        res.status(401).json({ message: "Unauthorized" });
      }
    } catch (error: any) {
      console.error("Admin cancel error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Admin refund endpoint
  app.post("/api/admin/refund-bet", async (req: Request, res: Response) => {
    try {
      const { betId, amount, reason, adminPassword } = req.body;
      
      if (!betId || amount === undefined || !adminPassword) {
        return res.status(400).json({ message: "Missing required fields: betId, amount, adminPassword" });
      }

      const action = await adminService.refundBet(betId, amount, reason || 'Admin refund', adminPassword);
      
      if (action) {
        res.json({ success: true, action });
      } else {
        res.status(401).json({ message: "Unauthorized" });
      }
    } catch (error: any) {
      console.error("Admin refund error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Admin logs endpoint
  app.get("/api/admin/logs", async (req: Request, res: Response) => {
    try {
      const logs = monitoringService.getRecentLogs(50);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  // Admin login endpoint
  app.post("/api/admin/login", async (req: Request, res: Response) => {
    try {
      const { password } = req.body;
      const adminPassword = process.env.ADMIN_PASSWORD || 'change-me-in-production';
      
      if (password === adminPassword) {
        // Generate a secure session token
        const sessionToken = generateSecureToken();
        adminSessions.set(sessionToken, { expiresAt: Date.now() + SESSION_DURATION });
        console.log('✅ ADMIN: Login successful');
        res.json({ success: true, token: sessionToken });
      } else {
        console.warn('❌ ADMIN: Login failed - invalid password');
        res.status(401).json({ success: false, message: "Invalid password" });
      }
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Admin get all bets endpoint
  app.get("/api/admin/all-bets", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');
      
      if (!token || !isValidAdminSession(token)) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { status } = req.query;
      const allBets = await storage.getAllBets(status as string);
      const stats = {
        total: allBets.length,
        pending: allBets.filter(b => b.status === 'pending').length,
        won: allBets.filter(b => b.status === 'won').length,
        lost: allBets.filter(b => b.status === 'lost').length,
        void: allBets.filter(b => b.status === 'void' || b.status === 'cancelled').length,
        totalStake: allBets.reduce((sum, b) => sum + (b.stake || 0), 0),
        totalPotentialWin: allBets.reduce((sum, b) => sum + (b.potentialWin || 0), 0)
      };
      
      res.json({ bets: allBets, stats });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bets" });
    }
  });

  // Admin get legacy bets (without betObjectId - stuck liability)
  app.get("/api/admin/legacy-bets", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');
      
      if (!token || !isValidAdminSession(token)) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get all bets and filter for those without betObjectId (legacy bets causing stuck liability)
      const allBets = await storage.getAllBets();
      const legacyBets = allBets.filter(b => !b.betObjectId && b.status !== 'pending');
      
      // Calculate stuck liability based on potential payouts
      const stuckLiabilitySui = legacyBets
        .filter(b => b.currency === 'SUI')
        .reduce((sum, b) => sum + (b.potentialWin || 0), 0);
      const stuckLiabilitySbets = legacyBets
        .filter(b => b.currency === 'SBETS')
        .reduce((sum, b) => sum + (b.potentialWin || 0), 0);
      
      res.json({ 
        legacyBets,
        stuckLiabilitySui,
        stuckLiabilitySbets,
        count: legacyBets.length
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch legacy bets" });
    }
  });

  // Admin settle all pending bets endpoint
  app.post("/api/admin/settle-all", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');
      
      if (!token || !isValidAdminSession(token)) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { outcome } = req.body;
      
      if (!['won', 'lost', 'void'].includes(outcome)) {
        return res.status(400).json({ message: "Invalid outcome - must be 'won', 'lost', or 'void'" });
      }
      
      const pendingBets = await storage.getAllBets('pending');
      const results = [];
      
      for (const bet of pendingBets) {
        try {
          const statusUpdated = await storage.updateBetStatus(bet.id, outcome);
          if (statusUpdated) {
            if (outcome === 'won') {
              await balanceService.addWinnings(bet.walletAddress || String(bet.userId), bet.potentialWin || 0, bet.currency === 'SBETS' ? 'SBETS' : 'SUI');
            } else if (outcome === 'lost') {
              await balanceService.addRevenue(bet.stake || 0, bet.currency === 'SBETS' ? 'SBETS' : 'SUI');
            }
            results.push({ betId: bet.id, status: 'settled', outcome });
          } else {
            results.push({ betId: bet.id, status: 'skipped', outcome, reason: 'Already settled' });
          }
        } catch (err) {
          results.push({ betId: bet.id, status: 'error', error: String(err) });
        }
      }
      
      console.log(`✅ ADMIN: Settled ${results.filter(r => r.status === 'settled').length} bets as ${outcome}`);
      res.json({ success: true, settled: results.length, results });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // API error statistics
  app.get("/api/admin/error-stats", async (req: Request, res: Response) => {
    try {
      const stats = errorHandlingService.getErrorStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch error stats" });
    }
  });

  // Platform revenue endpoint - shows split breakdown
  app.get("/api/admin/revenue", async (req: Request, res: Response) => {
    try {
      const totalRevenue = await balanceService.getPlatformRevenue();
      const holdersRevenue = await storage.getRevenueForHolders();
      const treasuryBuffer = await storage.getTreasuryBuffer();
      const platformProfit = await storage.getPlatformProfit();
      const contractInfo = await blockchainBetService.getPlatformInfo();
      
      res.json({
        // Total accumulated revenue (legacy tracking)
        totalRevenue: {
          sui: totalRevenue.suiBalance,
          sbets: totalRevenue.sbetsBalance
        },
        // Revenue split breakdown (30/40/30)
        revenueSplit: {
          holders: {
            sui: holdersRevenue.suiRevenue,
            sbets: holdersRevenue.sbetsRevenue,
            percentage: 30
          },
          treasuryBuffer: {
            sui: treasuryBuffer.suiBalance,
            sbets: treasuryBuffer.sbetsBalance,
            percentage: 40
          },
          platformProfit: {
            sui: platformProfit.suiBalance,
            sbets: platformProfit.sbetsBalance,
            percentage: 30
          }
        },
        onChainContract: contractInfo || {
          treasuryBalance: 0,
          totalBets: 0,
          totalVolume: 0,
          accruedFees: 0
        },
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error fetching revenue:', error);
      res.status(500).json({ message: "Failed to fetch revenue" });
    }
  });
  
  // Withdraw platform profit (admin only - the 30% owner share)
  app.post("/api/admin/withdraw-profit", async (req: Request, res: Response) => {
    try {
      const { amount, currency, adminPassword } = req.body;
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');
      
      const hasValidToken = token && isValidAdminSession(token);
      const actualPassword = process.env.ADMIN_PASSWORD || 'change-me-in-production';
      const hasValidPassword = adminPassword === actualPassword;
      
      if (!hasValidToken && !hasValidPassword) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Valid amount required" });
      }
      
      const tokenCurrency = currency === 'SBETS' ? 'SBETS' : 'SUI';
      const profit = await storage.getPlatformProfit();
      const available = tokenCurrency === 'SBETS' ? profit.sbetsBalance : profit.suiBalance;
      
      if (amount > available) {
        return res.status(400).json({ 
          message: `Insufficient ${tokenCurrency} profit. Available: ${available.toFixed(4)} ${tokenCurrency}` 
        });
      }
      
      // Deduct from profit account
      const profitWallet = 'platform_profit';
      const suiDelta = tokenCurrency === 'SUI' ? -amount : 0;
      const sbetsDelta = tokenCurrency === 'SBETS' ? -amount : 0;
      await storage.updateUserBalance(profitWallet, suiDelta, sbetsDelta);
      
      // Execute on-chain transfer to admin wallet if configured
      const adminWallet = '0x20850db591c4d575b5238baf975e54580d800e69b8b5b421de796a311d3bea50';
      let txHash = `profit-withdraw-${Date.now()}`;
      
      if (blockchainBetService.isAdminKeyConfigured()) {
        try {
          const payoutResult = tokenCurrency === 'SBETS' 
            ? await blockchainBetService.executePayoutSbetsOnChain(adminWallet, amount)
            : await blockchainBetService.executePayoutOnChain(adminWallet, amount);
          if (payoutResult.success && payoutResult.txHash) {
            txHash = payoutResult.txHash;
          }
        } catch (payoutError) {
          console.warn('On-chain payout failed, profit deducted from DB only:', payoutError);
        }
      }
      
      console.log(`[Admin] Platform profit withdrawn: ${amount} ${tokenCurrency} | TX: ${txHash}`);
      res.json({ success: true, amount, currency: tokenCurrency, txHash });
    } catch (error) {
      console.error('Error withdrawing profit:', error);
      res.status(500).json({ message: "Failed to withdraw profit" });
    }
  });

  // Withdraw fees from contract (admin only)
  app.post("/api/admin/withdraw-fees", async (req: Request, res: Response) => {
    try {
      const { amount, adminPassword } = req.body;
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');
      
      console.log(`[Admin] Withdraw SUI request: amount=${amount}, hasToken=${!!token}, hasPassword=${!!adminPassword}`);
      
      const hasValidToken = token && isValidAdminSession(token);
      const actualPassword = process.env.ADMIN_PASSWORD || 'change-me-in-production';
      const hasValidPassword = adminPassword === actualPassword;
      
      // Debug: show password comparison (redacted for security)
      console.log(`[Admin] Auth check: validToken=${hasValidToken}, validPassword=${hasValidPassword}`);
      console.log(`[Admin] Password debug: providedLen=${adminPassword?.length || 0}, expectedLen=${actualPassword.length}`);
      
      if (!hasValidToken && !hasValidPassword) {
        console.log(`[Admin] Unauthorized - no valid token or password`);
        return res.status(401).json({ message: "Unauthorized - provide valid admin password or session token" });
      }
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Valid amount required" });
      }
      
      // Check if admin key is configured
      if (!blockchainBetService.isAdminKeyConfigured()) {
        return res.status(400).json({ success: false, error: "ADMIN_PRIVATE_KEY not configured on server" });
      }
      
      console.log(`[Admin] Executing SUI withdrawal: ${amount} SUI`);
      const result = await blockchainBetService.withdrawFeesOnChain(amount);
      if (result.success) {
        console.log(`[Admin] SUI withdrawal successful: ${result.txHash}`);
        res.json({ success: true, txHash: result.txHash, amount });
      } else {
        console.log(`[Admin] SUI withdrawal failed: ${result.error}`);
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      console.error(`[Admin] SUI withdrawal error:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  // Withdraw SBETS fees from contract (admin only)
  app.post("/api/admin/withdraw-fees-sbets", async (req: Request, res: Response) => {
    try {
      const { amount, adminPassword } = req.body;
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');
      
      console.log(`[Admin] Withdraw SBETS request: amount=${amount}, hasToken=${!!token}, hasPassword=${!!adminPassword}`);
      
      const hasValidToken = token && isValidAdminSession(token);
      const actualPassword = process.env.ADMIN_PASSWORD || 'change-me-in-production';
      const hasValidPassword = adminPassword === actualPassword;
      
      console.log(`[Admin] Auth check: validToken=${hasValidToken}, validPassword=${hasValidPassword}`);
      
      if (!hasValidToken && !hasValidPassword) {
        console.log(`[Admin] Unauthorized - no valid token or password`);
        return res.status(401).json({ message: "Unauthorized - provide valid admin password or session token" });
      }
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Valid amount required" });
      }
      
      // Check if admin key is configured
      if (!blockchainBetService.isAdminKeyConfigured()) {
        return res.status(400).json({ success: false, error: "ADMIN_PRIVATE_KEY not configured on server" });
      }
      
      console.log(`[Admin] Executing SBETS withdrawal: ${amount} SBETS`);
      const result = await blockchainBetService.withdrawFeesSbetsOnChain(amount);
      if (result.success) {
        console.log(`[Admin] SBETS withdrawal successful: ${result.txHash}`);
        res.json({ success: true, txHash: result.txHash, amount });
      } else {
        console.log(`[Admin] SBETS withdrawal failed: ${result.error}`);
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      console.error(`[Admin] SBETS withdrawal error:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  // Liability reconciliation - compare on-chain vs database liability (admin only)
  app.get("/api/admin/liability-reconciliation", async (req: Request, res: Response) => {
    try {
      // Admin authentication - same as other admin endpoints
      // Accept password via X-Admin-Password header (secure) or Authorization Bearer token
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');
      const adminPassword = req.headers['x-admin-password'] as string;
      
      const hasValidToken = token && isValidAdminSession(token);
      const actualPassword = process.env.ADMIN_PASSWORD || 'change-me-in-production';
      const hasValidPassword = adminPassword === actualPassword;
      
      if (!hasValidToken && !hasValidPassword) {
        return res.status(401).json({ success: false, message: "Unauthorized - provide valid X-Admin-Password header or Authorization Bearer token" });
      }

      // Get on-chain platform info
      const platformInfo = await blockchainBetService.getPlatformInfo();
      if (!platformInfo) {
        return res.status(503).json({ success: false, message: "Unable to fetch on-chain platform info" });
      }

      // Get all pending bets from database
      const pendingBets = await storage.getAllBets('pending');
      const confirmedBets = await storage.getAllBets('confirmed');
      const allUnsettledBets = [...pendingBets, ...confirmedBets];

      // Calculate expected liability from database (by currency)
      // IMPORTANT: Only use currency/feeCurrency fields, NOT bet amount heuristics
      let dbSuiLiability = 0;
      let dbSbetsLiability = 0;
      const suiBetsDetails: any[] = [];
      const sbetsBetsDetails: any[] = [];

      for (const bet of allUnsettledBets) {
        // Determine currency: feeCurrency is the accurate field indicating payment token
        // (currency column may have been set incorrectly for old bets)
        const paymentCurrency = bet.feeCurrency || bet.currency || 'SUI';
        const potentialPayout = bet.potentialPayout || (bet.betAmount * bet.odds);
        
        if (paymentCurrency === 'SBETS') {
          dbSbetsLiability += potentialPayout;
          sbetsBetsDetails.push({
            id: bet.id,
            amount: bet.betAmount,
            potentialPayout,
            currency: 'SBETS',
            feeCurrency: bet.feeCurrency,
            hasBetObjectId: !!bet.betObjectId,
            status: bet.status
          });
        } else {
          // Default to SUI for any non-SBETS currency
          dbSuiLiability += potentialPayout;
          suiBetsDetails.push({
            id: bet.id,
            amount: bet.betAmount,
            potentialPayout,
            currency: 'SUI',
            feeCurrency: bet.feeCurrency,
            hasBetObjectId: !!bet.betObjectId,
            status: bet.status
          });
        }
      }

      // Calculate mismatch
      const suiMismatch = platformInfo.totalLiabilitySui - dbSuiLiability;
      const sbetsMismatch = platformInfo.totalLiabilitySbets - dbSbetsLiability;

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        onChain: {
          suiLiability: platformInfo.totalLiabilitySui,
          sbetsLiability: platformInfo.totalLiabilitySbets,
          suiTreasury: platformInfo.treasuryBalanceSui,
          sbetsTreasury: platformInfo.treasuryBalanceSbets,
          totalBets: platformInfo.totalBets
        },
        database: {
          suiLiability: dbSuiLiability,
          sbetsLiability: dbSbetsLiability,
          suiBetsCount: suiBetsDetails.length,
          sbetsBetsCount: sbetsBetsDetails.length,
          suiBetsWithObjectId: suiBetsDetails.filter(b => b.hasBetObjectId).length,
          sbetsBetsWithObjectId: sbetsBetsDetails.filter(b => b.hasBetObjectId).length
        },
        mismatch: {
          sui: suiMismatch,
          sbets: sbetsMismatch,
          suiOrphaned: suiMismatch > 0.001, // More than 0.001 SUI orphaned
          sbetsOrphaned: sbetsMismatch > 1 // More than 1 SBETS orphaned
        },
        details: {
          suiBets: suiBetsDetails,
          sbetsBets: sbetsBetsDetails
        },
        recommendation: suiMismatch > 0.001 || sbetsMismatch > 1 
          ? "On-chain liability is higher than database expects. This may be from old bets without betObjectId that were settled in DB but not on-chain. Contact support to reconcile."
          : "Liability is in sync. No action needed."
      });
    } catch (error: any) {
      console.error('[Admin] Liability reconciliation error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Test all blockchain settlement functions
  app.get("/api/admin/test-settlement-functions", async (req: Request, res: Response) => {
    try {
      const tests: any = {
        timestamp: new Date().toISOString(),
        adminKeyConfigured: false,
        platformInfo: null,
        settlementWorkerStatus: null,
        pendingBets: 0,
        errors: []
      };
      
      // Test 1: Check admin key configuration
      tests.adminKeyConfigured = blockchainBetService.isAdminKeyConfigured();
      
      // Test 2: Get platform info (treasury balances)
      try {
        const platformInfo = await blockchainBetService.getPlatformInfo();
        tests.platformInfo = platformInfo;
      } catch (e: any) {
        tests.errors.push(`Platform info error: ${e.message}`);
      }
      
      // Test 3: Settlement worker status
      tests.settlementWorkerStatus = {
        isRunning: settlementWorker.isRunningNow(),
        settledEventsCount: settlementWorker.getSettledEventsCount(),
        settledBetsCount: settlementWorker.getSettledBetsCount()
      };
      
      // Test 4: Get pending bets count
      try {
        const pendingBets = await storage.getAllBets('pending');
        tests.pendingBets = pendingBets.length;
        tests.pendingBetDetails = pendingBets.map(b => ({
          id: b.id,
          eventId: b.eventId,
          externalEventId: b.externalEventId,
          currency: b.currency,
          stake: b.stake,
          hasBetObjectId: !!b.betObjectId
        }));
      } catch (e: any) {
        tests.errors.push(`Pending bets error: ${e.message}`);
      }
      
      // Overall status
      tests.allSystemsOperational = 
        tests.adminKeyConfigured && 
        tests.platformInfo !== null && 
        tests.settlementWorkerStatus?.isRunning === true &&
        tests.errors.length === 0;
      
      res.json(tests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Trigger auto-settlement manually (admin only)
  app.post("/api/admin/trigger-settlement", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');
      const { adminPassword } = req.body;
      
      const hasValidToken = token && isValidAdminSession(token);
      const actualPassword = process.env.ADMIN_PASSWORD || 'change-me-in-production';
      const hasValidPassword = adminPassword === actualPassword;
      
      console.log(`[Admin Trigger Settlement] Auth check: tokenPresent=${!!token}, tokenLen=${token?.length || 0}, validToken=${hasValidToken}, passwordProvided=${!!adminPassword}, tokenPreview=${token?.slice(0, 10) || 'none'}, sessionsCount=${adminSessions.size}`);
      
      if (!hasValidToken && !hasValidPassword) {
        console.log(`[Admin Trigger Settlement] UNAUTHORIZED - token validation failed`);
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Trigger the settlement worker to check for finished matches now
      console.log('🔄 Admin triggered manual settlement check...');
      await settlementWorker.checkAndSettleBets();
      
      res.json({ 
        success: true, 
        message: 'Settlement check triggered. Check server logs for results.',
        timestamp: Date.now()
      });
    } catch (error: any) {
      console.error('Manual settlement trigger failed:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Sync on-chain bets to database (admin only)
  app.post("/api/admin/sync-onchain-bets", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');
      const adminPassword = req.headers['x-admin-password'] as string;
      
      const hasValidToken = token && isValidAdminSession(token);
      const actualPassword = process.env.ADMIN_PASSWORD || 'change-me-in-production';
      const hasValidPassword = adminPassword === actualPassword;
      
      if (!hasValidToken && !hasValidPassword) {
        return res.status(401).json({ success: false, message: "Unauthorized - provide valid X-Admin-Password header or Authorization Bearer token" });
      }
      
      console.log('🔄 Admin triggered on-chain bet sync...');
      const syncResult = await blockchainBetService.syncOnChainBetsToDatabase();
      
      res.json({ 
        success: true, 
        message: `Synced ${syncResult.synced} on-chain bets to database`,
        synced: syncResult.synced,
        errors: syncResult.errors,
        timestamp: Date.now()
      });
    } catch (error: any) {
      console.error('On-chain bet sync failed:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Get on-chain bet details including prediction (admin only)
  app.get("/api/admin/onchain-bet/:betObjectId", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');
      const adminPassword = req.headers['x-admin-password'] as string;
      
      const hasValidToken = token && isValidAdminSession(token);
      const actualPassword = process.env.ADMIN_PASSWORD || 'change-me-in-production';
      const hasValidPassword = adminPassword === actualPassword;
      
      if (!hasValidToken && !hasValidPassword) {
        return res.status(401).json({ success: false, message: "Unauthorized - provide valid X-Admin-Password header or Authorization Bearer token" });
      }
      
      const { betObjectId } = req.params;
      
      if (!betObjectId || !betObjectId.startsWith('0x')) {
        return res.status(400).json({ success: false, message: "Invalid bet object ID" });
      }
      
      const betInfo = await blockchainBetService.getOnChainBetInfo(betObjectId);
      
      if (!betInfo) {
        return res.status(404).json({ success: false, message: "Bet not found on-chain" });
      }
      
      res.json({ 
        success: true, 
        bet: betInfo
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Notifications endpoints
  app.get("/api/notifications", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string || 'user1'; // Default user for demo
      const limit = parseInt(req.query.limit as string) || 20;
      const unreadOnly = req.query.unreadOnly === 'true';
      
      const notifications = notificationService.getUserNotifications(userId, limit, unreadOnly);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string || 'user1';
      const count = notificationService.getUnreadCount(userId);
      res.json({ unreadCount: count });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.post("/api/notifications/mark-as-read", async (req: Request, res: Response) => {
    try {
      const { userId, notificationId } = req.body;
      if (!userId || !notificationId) {
        return res.status(400).json({ message: "Missing userId or notificationId" });
      }
      const notif = notificationService.markAsRead(userId, notificationId);
      res.json({ success: !!notif });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark as read" });
    }
  });

  app.post("/api/notifications/mark-all-as-read", async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "Missing userId" });
      }
      const count = notificationService.markAllAsRead(userId);
      res.json({ success: true, markedCount: count });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all as read" });
    }
  });

  // Treasury status endpoint - public check before placing bets
  app.get("/api/treasury/status", async (req: Request, res: Response) => {
    try {
      const platformInfo = await blockchainBetService.getPlatformInfo();
      if (!platformInfo) {
        return res.status(503).json({ 
          success: false, 
          message: "Unable to fetch treasury status" 
        });
      }
      
      // Calculate available capacity for each currency
      const suiAvailable = platformInfo.treasuryBalanceSui - platformInfo.totalLiabilitySui;
      const sbetsAvailable = platformInfo.treasuryBalanceSbets - platformInfo.totalLiabilitySbets;
      
      res.json({
        success: true,
        sui: {
          treasury: platformInfo.treasuryBalanceSui,
          liability: platformInfo.totalLiabilitySui,
          available: suiAvailable,
          acceptingBets: true // Always accept - liability check disabled per user request
        },
        sbets: {
          treasury: platformInfo.treasuryBalanceSbets,
          liability: platformInfo.totalLiabilitySbets,
          available: sbetsAvailable,
          acceptingBets: true // Always accept - liability check disabled per user request
        },
        paused: platformInfo.paused
      });
    } catch (error) {
      console.error('Treasury status error:', error);
      res.status(500).json({ success: false, message: "Failed to fetch treasury status" });
    }
  });

  // Sports routes
  app.get("/api/sports", async (req: Request, res: Response) => {
    try {
      const sports = await storage.getSports();
      res.json(sports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sports" });
    }
  });

  // Events route with multi-source fallback logic
  app.get("/api/events", async (req: Request, res: Response) => {
    try {
      const reqSportId = req.query.sportId ? Number(req.query.sportId) : undefined;
      const isLive = req.query.isLive ? req.query.isLive === 'true' : undefined;
      
      console.log(`Fetching events for sportId: ${reqSportId}, isLive: ${isLive}`);
      
      // Get data from API for any sport if it's live - PAID API ONLY, NO FALLBACKS
      if (isLive === true) {
        console.log(`🔴 LIVE EVENTS MODE - Paid API-Sports ONLY (NO fallbacks, NO free alternatives)`);
        
        try {
          // Get configurable sports list
          const sportsToFetch = getSportsToFetch();
          
          const sportPromises = sportsToFetch.map(sport =>
            apiSportsService.getLiveEvents(sport).catch(e => {
              console.log(`❌ API-Sports failed for ${sport}: ${e.message} - NO FALLBACK, returning empty`);
              return [];
            })
          );
          
          const sportResults = await Promise.all(sportPromises);
          const allLiveEventsRaw = sportResults.flat();
          
          // Deduplicate events by ID to prevent repeated matches
          const seenLiveIds = new Set<string>();
          let allLiveEvents = allLiveEventsRaw.filter(event => {
            const eventId = String(event.id);
            if (seenLiveIds.has(eventId)) return false;
            seenLiveIds.add(eventId);
            return true;
          });
          
          console.log(`✅ LIVE: Fetched ${allLiveEvents.length} unique events (${allLiveEventsRaw.length} before dedup, ${sportsToFetch.length} sports)`);
          
          // Enrich events with real odds from API-Sports (football only for now)
          // Pass isLive=true to always fetch fresh odds for live events
          try {
            allLiveEvents = await apiSportsService.enrichEventsWithOdds(allLiveEvents, 'football', true);
            console.log(`✅ LIVE: Enriched events with real odds`);
          } catch (oddsError: any) {
            console.warn(`⚠️ LIVE: Failed to enrich with odds: ${oddsError.message}`);
          }
          
          // Log odds coverage stats but DON'T filter - show all events
          const eventsWithOdds = allLiveEvents.filter(e => (e as any).oddsSource === 'api-sports').length;
          console.log(`✅ LIVE: ${eventsWithOdds}/${allLiveEvents.length} events have real bookmaker odds`);
          
          // CRITICAL: Save successful results to snapshot (before any filtering)
          if (allLiveEvents.length > 0) {
            saveLiveSnapshot(allLiveEvents);
          }
          
          // Sort by startTime (earliest first, events without startTime go to end)
          allLiveEvents.sort((a, b) => {
            const timeA = a.startTime ? new Date(a.startTime).getTime() : Infinity;
            const timeB = b.startTime ? new Date(b.startTime).getTime() : Infinity;
            return timeA - timeB;
          });
          
          // Filter by sport if requested
          if (reqSportId && allLiveEvents.length > 0) {
            const filtered = allLiveEvents.filter(e => e.sportId === reqSportId);
            console.log(`Filtered to ${filtered.length} events for sport ID ${reqSportId}`);
            return res.json(filtered.length > 0 ? filtered : []);
          }
          
          // Return all live events (may be empty if API-Sports fails)
          return res.json(allLiveEvents);
        } catch (error) {
          console.error(`❌ LIVE API fetch failed:`, error);
          // CRITICAL: On error, try to return snapshot instead of empty
          const snapshot = getLiveSnapshot();
          if (snapshot.events.length > 0) {
            const ageSeconds = Math.round((Date.now() - snapshot.timestamp) / 1000);
            console.log(`⚠️ LIVE: Error occurred, using snapshot of ${snapshot.events.length} events (${ageSeconds}s old)`);
            return res.json(snapshot.events);
          }
          return res.json([]);
        }
      }
      
      // UPCOMING EVENTS MODE - PAID API ONLY, NO FALLBACKS
      console.log(`📅 UPCOMING EVENTS MODE - Paid API-Sports ONLY (NO fallbacks, NO free alternatives)`);
      try {
        // CRITICAL: Check for existing snapshot first - if we have data, return it immediately
        // This prevents rate limiting and ensures users always see events
        const existingSnapshot = getUpcomingSnapshot();
        const snapshotAgeMs = Date.now() - existingSnapshot.timestamp;
        const SNAPSHOT_FRESH_DURATION = 10 * 60 * 1000; // 10 minutes (AGGRESSIVE API SAVING)
        
        if (existingSnapshot.events.length > 0 && snapshotAgeMs < SNAPSHOT_FRESH_DURATION) {
          console.log(`📦 Using fresh snapshot (${existingSnapshot.events.length} events, ${Math.round(snapshotAgeMs/1000)}s old)`);
          let allUpcomingEvents = existingSnapshot.events;
          
          // CRITICAL: Apply cached odds from prefetcher to snapshot events
          // This ensures odds are updated as the prefetcher warms the cache
          try {
            allUpcomingEvents = await apiSportsService.enrichEventsWithCachedOddsOnly(allUpcomingEvents, 'football');
            const oddsCount = allUpcomingEvents.filter(e => (e as any).oddsSource === 'api-sports').length;
            console.log(`📦 Applied cached odds: ${oddsCount}/${allUpcomingEvents.length} events have odds`);
          } catch (e) {
            console.log(`📦 Could not apply cached odds`);
          }
          
          // Sort by startTime
          allUpcomingEvents.sort((a, b) => {
            const timeA = a.startTime ? new Date(a.startTime).getTime() : Infinity;
            const timeB = b.startTime ? new Date(b.startTime).getTime() : Infinity;
            return timeA - timeB;
          });
          
          // CRITICAL: Filter out events that have already started
          const now = Date.now();
          allUpcomingEvents = allUpcomingEvents.filter(e => {
            if (!e.startTime) return true;
            return new Date(e.startTime).getTime() > now;
          });
          
          // Filter by sport if requested
          if (reqSportId && allUpcomingEvents.length > 0) {
            const filtered = allUpcomingEvents.filter(e => e.sportId === reqSportId);
            console.log(`Filtered to ${filtered.length} events for sport ID ${reqSportId}`);
            return res.json(filtered);
          }
          
          return res.json(allUpcomingEvents);
        }
        
        // Fetch football FIRST (main source of events) then others sequentially with delays
        console.log(`📍 Fetching events (football priority, sequential for rate limit protection)`);
        const allUpcomingEventsRaw: any[] = [];
        
        // Football first - this is where 99% of events come from
        try {
          const footballEvents = await apiSportsService.getUpcomingEvents('football');
          allUpcomingEventsRaw.push(...footballEvents);
          console.log(`✅ Football: ${footballEvents.length} events`);
        } catch (e: any) {
          console.log(`❌ Football failed: ${e.message}`);
        }
        
        // Deduplicate events by ID to prevent repeated matches
        const seenUpcomingIds = new Set<string>();
        let allUpcomingEvents = allUpcomingEventsRaw.filter(event => {
          const eventId = String(event.id);
          if (seenUpcomingIds.has(eventId)) return false;
          seenUpcomingIds.add(eventId);
          return true;
        });
        
        console.log(`✅ UPCOMING: Fetched ${allUpcomingEvents.length} unique events (${allUpcomingEventsRaw.length} before dedup, football only)`);
        
        // FAST PATH: Only apply pre-warmed odds from cache (no blocking API calls)
        // The background prefetcher handles warming the odds cache asynchronously
        try {
          // Use fast mode: only apply odds from cache, don't make new API calls
          allUpcomingEvents = await apiSportsService.enrichEventsWithCachedOddsOnly(allUpcomingEvents, 'football');
          console.log(`✅ UPCOMING: Applied cached odds (fast path)`);
        } catch (oddsError: any) {
          console.warn(`⚠️ UPCOMING: Failed to apply cached odds: ${oddsError.message}`);
        }
        
        // Log odds coverage stats but DON'T filter - show all events
        const eventsWithOdds = allUpcomingEvents.filter(e => (e as any).oddsSource === 'api-sports').length;
        console.log(`✅ UPCOMING: ${eventsWithOdds}/${allUpcomingEvents.length} events have real bookmaker odds`);
        
        // CRITICAL: Save successful results to snapshot (before any filtering)
        if (allUpcomingEvents.length > 0) {
          saveUpcomingSnapshot(allUpcomingEvents);
        } else {
          // If we got 0 events but have a snapshot, use it instead (NEVER return empty)
          const snapshot = getUpcomingSnapshot();
          if (snapshot.events.length > 0) {
            const ageSeconds = Math.round((Date.now() - snapshot.timestamp) / 1000);
            console.log(`⚠️ UPCOMING: Got 0 events, using snapshot of ${snapshot.events.length} events (${ageSeconds}s old)`);
            allUpcomingEvents = snapshot.events;
          }
        }
        
        // Sort by startTime (earliest first, events without startTime go to end)
        allUpcomingEvents.sort((a, b) => {
          const timeA = a.startTime ? new Date(a.startTime).getTime() : Infinity;
          const timeB = b.startTime ? new Date(b.startTime).getTime() : Infinity;
          return timeA - timeB;
        });
        
        // CRITICAL: Filter out events that have already started (startTime in the past)
        // These should appear in live matches, not upcoming - prevents betting errors
        const now = Date.now();
        const beforeFilter = allUpcomingEvents.length;
        allUpcomingEvents = allUpcomingEvents.filter(e => {
          if (!e.startTime) return true; // Keep events without startTime
          return new Date(e.startTime).getTime() > now;
        });
        if (beforeFilter !== allUpcomingEvents.length) {
          console.log(`📦 Filtered out ${beforeFilter - allUpcomingEvents.length} already-started events from upcoming`);
        }
        
        // Filter by sport if requested
        if (reqSportId && allUpcomingEvents.length > 0) {
          const filtered = allUpcomingEvents.filter(e => e.sportId === reqSportId);
          console.log(`Filtered to ${filtered.length} events for sport ID ${reqSportId}`);
          return res.json(filtered.length > 0 ? filtered : []);
        }
        
        // Return all upcoming events (guaranteed non-empty if we ever had data)
        return res.json(allUpcomingEvents);
      } catch (error) {
        console.error(`❌ UPCOMING API fetch failed:`, error);
        // CRITICAL: On error, try to return snapshot instead of empty
        const snapshot = getUpcomingSnapshot();
        if (snapshot.events.length > 0) {
          const ageSeconds = Math.round((Date.now() - snapshot.timestamp) / 1000);
          console.log(`⚠️ UPCOMING: Error occurred, using snapshot of ${snapshot.events.length} events (${ageSeconds}s old)`);
          return res.json(snapshot.events);
        }
        return res.json([]);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  
  // Redirect /api/events/live to /api/events?isLive=true
  app.get("/api/events/live", async (req: Request, res: Response) => {
    try {
      const sportId = req.query.sportId ? Number(req.query.sportId) : undefined;
      const redirectUrl = `/api/events?isLive=true${sportId ? `&sportId=${sportId}` : ''}`;
      console.log(`Redirecting /api/events/live to ${redirectUrl}`);
      return res.redirect(302, redirectUrl);
    } catch (error) {
      console.error('Error in live events redirect:', error);
      res.status(500).json({ error: 'Failed to fetch live events' });
    }
  });

  // Live events lite endpoint - returns minimal event data for sidebars
  app.get("/api/events/live-lite", async (req: Request, res: Response) => {
    try {
      const sportId = req.query.sportId ? Number(req.query.sportId) : undefined;
      console.log(`[live-lite] Fetching live events (sportId: ${sportId || 'all'})`);
      
      // Use the same logic as the main events endpoint but return lighter data
      const sportsToFetch = getSportsToFetch();
      const allLiveEvents: any[] = [];
      
      await Promise.all(sportsToFetch.map(async (sport) => {
        try {
          const events = await apiSportsService.getLiveEvents(sport);
          if (events && events.length > 0) {
            allLiveEvents.push(...events);
          }
        } catch (err) {
          // Silently skip failed sport fetches
        }
      }));
      
      // Filter by sport if specified
      let filteredEvents = allLiveEvents;
      if (sportId) {
        filteredEvents = allLiveEvents.filter(e => e.sportId === sportId);
      }
      
      // Sort by startTime (earliest first, events without startTime go to end)
      filteredEvents.sort((a, b) => {
        const timeA = a.startTime ? new Date(a.startTime).getTime() : Infinity;
        const timeB = b.startTime ? new Date(b.startTime).getTime() : Infinity;
        return timeA - timeB;
      });
      
      // Return minimal data for performance (including startTime)
      const liteEvents = filteredEvents.map(e => ({
        id: e.id,
        sportId: e.sportId,
        homeTeam: e.homeTeam,
        awayTeam: e.awayTeam,
        homeScore: e.homeScore,
        awayScore: e.awayScore,
        status: e.status,
        isLive: e.isLive,
        leagueName: e.leagueName,
        startTime: e.startTime
      }));
      
      res.json(liteEvents);
    } catch (error) {
      console.error('Error in live-lite events:', error);
      res.json([]); // Return empty array instead of error to prevent UI issues
    }
  });
  
  // Get individual event by ID
  app.get("/api/events/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID format" });
      }
      
      const event = await storage.getEvent(id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Create a copy with markets if needed
      const eventWithMarkets: any = {
        ...event,
        isLive: event.isLive || false,
        status: event.status || 'scheduled',
        name: `${event.homeTeam} vs ${event.awayTeam}`
      };
      
      // Check if event already has markets
      const hasMarkets = typeof eventWithMarkets.markets !== 'undefined' && 
                         Array.isArray(eventWithMarkets.markets) && 
                         eventWithMarkets.markets.length > 0;
      
      if (!hasMarkets) {
        // Add default markets
        eventWithMarkets.markets = [
          {
            id: `market-${event.id}-1`,
            name: 'Match Result',
            status: 'open',
            marketType: '1X2',
            outcomes: [
              { id: `outcome-${event.id}-1-1`, name: event.homeTeam, odds: 1.85, status: 'active' },
              { id: `outcome-${event.id}-1-2`, name: 'Draw', odds: 3.2, status: 'active' },
              { id: `outcome-${event.id}-1-3`, name: event.awayTeam, odds: 2.05, status: 'active' }
            ]
          },
          {
            id: `market-${event.id}-2`,
            name: 'Over/Under 2.5 Goals',
            status: 'open',
            marketType: 'OVER_UNDER',
            outcomes: [
              { id: `outcome-${event.id}-2-1`, name: 'Over 2.5', odds: 1.95, status: 'active' },
              { id: `outcome-${event.id}-2-2`, name: 'Under 2.5', odds: 1.85, status: 'active' }
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
  
  // Return the promotions from storage
  app.get("/api/promotions", async (req: Request, res: Response) => {
    try {
      const promotions = await storage.getPromotions();
      res.json(promotions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch promotions" });
    }
  });

  // Pre-flight validation for bet placement (checks 80-minute cutoff BEFORE on-chain tx)
  app.post("/api/bets/validate", async (req: Request, res: Response) => {
    try {
      const { eventId, isLive } = req.body;
      
      if (!eventId) {
        return res.status(400).json({ message: "Event ID required", code: "MISSING_EVENT_ID" });
      }
      
      // SERVER-SIDE VALIDATION: Check event status before on-chain transaction
      const eventLookup = apiSportsService.lookupEventSync(String(eventId));
      
      if (!eventLookup.found) {
        return res.status(400).json({ 
          message: "Event not found - please refresh and try again",
          code: "EVENT_NOT_FOUND"
        });
      }
      
      // DYNAMIC CACHE AGE: Strict for live (60s), relaxed for upcoming (15min)
      const MAX_LIVE_CACHE_AGE_MS = 60 * 1000;
      const MAX_UPCOMING_CACHE_AGE_MS = 15 * 60 * 1000;
      const isEventLive = eventLookup.source === 'live';
      const maxCacheAge = isEventLive ? MAX_LIVE_CACHE_AGE_MS : MAX_UPCOMING_CACHE_AGE_MS;
      
      if (eventLookup.cacheAgeMs > maxCacheAge) {
        return res.status(400).json({ 
          message: isEventLive ? "Match data is stale - please refresh" : "Event data is stale - please refresh and try again",
          code: "STALE_EVENT_DATA"
        });
      }
      
      // CRITICAL: 80-minute cutoff for live matches
      if (eventLookup.source === 'live' && eventLookup.minute !== undefined) {
        if (eventLookup.minute >= 80) {
          console.log(`[validate] Event ${eventId} rejected: ${eventLookup.minute} min >= 80 cutoff`);
          return res.status(400).json({ 
            message: `Betting closed for this match (80+ minute cutoff). Match is at ${eventLookup.minute} minutes.`,
            code: "MATCH_CUTOFF"
          });
        }
      }
      
      // Check if upcoming event SHOULD be live (start time passed but not in live cache)
      if (eventLookup.source === 'upcoming' && eventLookup.shouldBeLive) {
        console.log(`[validate] Event ${eventId} rejected: startTime passed (${eventLookup.startTime}) but not in live cache`);
        return res.status(400).json({ 
          message: "This match has started - please check live matches instead",
          code: "MATCH_STARTED"
        });
      }
      
      // Event is valid for betting
      res.json({ 
        valid: true, 
        eventId,
        matchMinute: eventLookup.minute,
        source: eventLookup.source
      });
    } catch (error: any) {
      console.error("Error validating bet:", error);
      res.status(500).json({ message: "Validation failed", code: "SERVER_ERROR" });
    }
  });

  // Place a single bet
  app.post("/api/bets", async (req: Request, res: Response) => {
    try {
      console.log('📥 Received bet request:', JSON.stringify(req.body, null, 2));
      
      // Validate request
      const validation = validateRequest(PlaceBetSchema, req.body);
      if (!validation.valid) {
        console.log('❌ Validation failed:', validation.errors);
        return res.status(400).json({ 
          message: "Validation failed",
          errors: validation.errors 
        });
      }

      const data = validation.data!;
      // Cast to strings since transform always converts to string
      const userId = String(data.userId);
      const eventId = String(data.eventId);
      const { eventName, homeTeam, awayTeam, marketId, outcomeId, odds, betAmount, currency, prediction, feeCurrency, paymentMethod, txHash, onChainBetId, status, isLive, matchMinute, walletAddress } = data;
      
      // Anti-cheat: Block first-half markets after minute 45 and all markets after minute 80
      const isFirstHalfMarket = !!data.marketId && (
        String(data.marketId).includes('1st_half') || 
        String(data.marketId).includes('1st-half') ||
        String(data.marketId).includes('first_half') ||
        String(data.marketId).includes('first-half') ||
        String(data.marketId).includes('half_time_result') ||
        String(data.marketId).includes('half-time-result') ||
        String(data.marketId) === "4" // First Half Result market ID
      );

      const currentMinute = data.matchMinute || (data.isLive ? parseInt(String(apiSportsService.lookupEventSync(data.eventId).minute || 0)) : 0);

      if (data.isLive) {
        if (isFirstHalfMarket && currentMinute >= 45) {
          console.warn(`[Anti-Cheat] Blocking late 1st half bet: event ${data.eventId}, minute ${currentMinute}`);
          return res.status(400).json({ 
            success: false, 
            message: "MARKET_CLOSED_HALF_TIME",
            details: "This market closed at the end of the first half."
          });
        }
        if (currentMinute >= 80) {
          console.warn(`[Anti-Cheat] Blocking late match bet: event ${data.eventId}, minute ${currentMinute}`);
          return res.status(400).json({ 
            success: false, 
            message: "MATCH_CUTOFF",
            details: "Betting is closed after the 80th minute."
          });
        }
      }

      // MAX STAKE VALIDATION - Backend enforcement (100 SUI / 10M SBETS)
      // Use feeCurrency as primary indicator (client sends this), fallback to currency
      const betCurrency = feeCurrency || currency || 'SUI';
      const MAX_STAKE_SUI = 100;
      const MAX_STAKE_SBETS = 10000000;
      const maxStake = betCurrency === 'SBETS' ? MAX_STAKE_SBETS : MAX_STAKE_SUI;
      
      if (betAmount > maxStake) {
        console.log(`❌ Bet rejected (max stake exceeded): ${betAmount} ${betCurrency} > ${maxStake} ${betCurrency}`);
        return res.status(400).json({
          message: `Maximum stake is ${maxStake} ${betCurrency}`,
          code: "MAX_STAKE_EXCEEDED"
        });
      }
      
      // USER BETTING LIMITS CHECK (validate only, update after bet success)
      const SUI_PRICE_USD = 1.50;
      const SBETS_PRICE_USD = 0.000001;
      const betUsdValue = betCurrency === 'SBETS' ? betAmount * SBETS_PRICE_USD : betAmount * SUI_PRICE_USD;
      
      // Update promotion tracking
      try {
        await promotionService.trackBetAndAwardBonus(walletAddress || userId, betAmount, betCurrency as 'SUI' | 'SBETS');
      } catch (promoError) {
        console.warn('[PROMO] Failed to track bet for promotion:', promoError);
      }
      
      let limitsCheckPassed = false;
      let userWalletForLimits: string | null = null;
      
      try {
        const { userLimits } = await import('@shared/schema');
        const { db } = await import('./db');
        const { eq } = await import('drizzle-orm');
        userWalletForLimits = walletAddress || userId;
        
        if (userWalletForLimits && userWalletForLimits.startsWith('0x')) {
          const [limits] = await db.select().from(userLimits).where(eq(userLimits.walletAddress, userWalletForLimits));
          
          if (limits) {
            const now = new Date();
            
            // Reset spent amounts based on time windows
            let dailySpent = limits.dailySpent || 0;
            let weeklySpent = limits.weeklySpent || 0;
            let monthlySpent = limits.monthlySpent || 0;
            
            // Reset daily if last reset was before today
            if (limits.lastResetDaily) {
              const lastDaily = new Date(limits.lastResetDaily);
              if (lastDaily.toDateString() !== now.toDateString()) {
                dailySpent = 0;
              }
            }
            
            // Reset weekly if last reset was more than 7 days ago
            if (limits.lastResetWeekly) {
              const lastWeekly = new Date(limits.lastResetWeekly);
              if (now.getTime() - lastWeekly.getTime() > 7 * 24 * 60 * 60 * 1000) {
                weeklySpent = 0;
              }
            }
            
            // Reset monthly if last reset was in a different month
            if (limits.lastResetMonthly) {
              const lastMonthly = new Date(limits.lastResetMonthly);
              if (lastMonthly.getMonth() !== now.getMonth() || lastMonthly.getFullYear() !== now.getFullYear()) {
                monthlySpent = 0;
              }
            }
            
            // Check self-exclusion
            if (limits.selfExclusionUntil && new Date(limits.selfExclusionUntil) > now) {
              return res.status(403).json({ message: 'Self-exclusion active', code: 'SELF_EXCLUDED' });
            }
            
            // Check limits (validation only, no update yet)
            if (limits.dailyLimit && dailySpent + betUsdValue > limits.dailyLimit) {
              return res.status(403).json({ message: `Daily limit of $${limits.dailyLimit} reached`, code: 'DAILY_LIMIT_EXCEEDED' });
            }
            if (limits.weeklyLimit && weeklySpent + betUsdValue > limits.weeklyLimit) {
              return res.status(403).json({ message: `Weekly limit of $${limits.weeklyLimit} reached`, code: 'WEEKLY_LIMIT_EXCEEDED' });
            }
            if (limits.monthlyLimit && monthlySpent + betUsdValue > limits.monthlyLimit) {
              return res.status(403).json({ message: `Monthly limit of $${limits.monthlyLimit} reached`, code: 'MONTHLY_LIMIT_EXCEEDED' });
            }
            
            limitsCheckPassed = true;
          }
        }
      } catch (limitsError) {
        console.log('Limits check skipped:', limitsError);
      }
      
      // SERVER-SIDE VALIDATION: Unified event registry lookup
      // CRITICAL: Server is authoritative about event status - never trust client isLive/matchMinute
      // Security: FAIL-CLOSED - Event must exist in server cache (live or upcoming) to accept bet
      const MAX_LIVE_CACHE_AGE_MS = 90 * 1000; // Reject stale cache (>90 seconds) for live events - increased from 60s to reduce false rejections
      const MAX_UPCOMING_CACHE_AGE_MS = 15 * 60 * 1000; // 15 minutes for upcoming (pre-match) events - match hasn't started, status is stable
      
      try {
        // Unified lookup: checks BOTH live and upcoming event caches
        const eventLookup = apiSportsService.lookupEventSync(eventId);
        
        if (!eventLookup.found) {
          // FAIL-CLOSED: Event not found in ANY cache - reject bet
          console.log(`❌ Bet rejected (unknown event): Event ${eventId} not in live or upcoming cache, client isLive: ${isLive}`);
          return res.status(400).json({ 
            message: "Event not found - please refresh and try again",
            code: "EVENT_NOT_FOUND"
          });
        }
        
        // DYNAMIC CACHE AGE CHECK: Different thresholds for live vs upcoming events
        // Live events need strict freshness (60s) because match state changes rapidly
        // Upcoming events can have relaxed threshold (15min) because match hasn't started
        const isEventLive = eventLookup.source === 'live';
        const maxCacheAge = isEventLive ? MAX_LIVE_CACHE_AGE_MS : MAX_UPCOMING_CACHE_AGE_MS;
        
        if (eventLookup.cacheAgeMs > maxCacheAge) {
          console.log(`❌ Bet rejected (stale cache): Cache is ${Math.round(eventLookup.cacheAgeMs/1000)}s old (max ${maxCacheAge/1000}s), eventId: ${eventId}, source: ${eventLookup.source}`);
          return res.status(400).json({ 
            message: isEventLive ? "Match data is stale - please refresh" : "Event data is stale - please refresh and try again",
            code: "STALE_EVENT_DATA"
          });
        }
        
        // Event found with fresh cache - check if it's live (server determines this, not client)
        if (eventLookup.source === 'live') {
          // FAIL-CLOSED: If we have no minute data for a live match, we cannot verify it's under 80 min
          // API-Sports may omit minute during halftime, glitches, or for non-football sports
          if (eventLookup.minute === undefined || eventLookup.minute === null) {
            console.log(`❌ Bet rejected (unverifiable minute): Live match has no minute data, eventId: ${eventId}, cannot verify < 80 min cutoff`);
            return res.status(400).json({ 
              message: "Cannot verify match time - please try again shortly",
              code: "UNVERIFIABLE_MATCH_TIME"
            });
          }
          
        // Check trusted minute against 80-minute cutoff
        if (eventLookup.minute >= 80) {
          console.log(`❌ Bet rejected (server-verified): Live match at ${eventLookup.minute} minutes (>= 80 min cutoff), eventId: ${eventId}, client claimed isLive: ${isLive}`);
          return res.status(400).json({ 
            message: "Betting closed for this match (80+ minutes played)",
            code: "MATCH_TIME_EXCEEDED",
            serverVerified: true
          });
        }

        // ANTI-CHEAT: Market-specific time validation
        const marketLower = marketId.toLowerCase();
        const firstHalfMarkets = ['half_time_result', 'ht_ft', '1st_half_goals', 'first_half_winner', 'half-time-result', '1st-half-goals'];
        const isFirstHalfMarket = firstHalfMarkets.includes(marketLower) || 
                                marketLower.includes('1st_half') || 
                                marketLower.includes('1st-half') ||
                                marketLower.includes('first_half') ||
                                marketLower.includes('first-half');
        
        if (isFirstHalfMarket && eventLookup.minute > 45) {
          console.log(`❌ Bet rejected (anti-cheat): First half market ${marketId} selected at minute ${eventLookup.minute}`);
          return res.status(400).json({
            message: "This market is closed (First half has ended)",
            code: "MARKET_CLOSED_HALF_TIME"
          });
        }
        
        // Live match under 80 minutes with fresh cache and verified minute - allow bet to proceed
        console.log(`✅ Live bet allowed: eventId ${eventId}, minute: ${eventLookup.minute}, cache age: ${Math.round(eventLookup.cacheAgeMs/1000)}s`);
        } else if (eventLookup.source === 'upcoming') {
          // Event found in upcoming cache - but check if it SHOULD be live based on start time
          if (eventLookup.shouldBeLive) {
            // START TIME HAS PASSED - match should be live but isn't in live cache
            // This is the critical bypass scenario: match could be at 80+ minutes
            // FAIL-CLOSED: Reject - we can't verify the match state
            console.log(`❌ Bet rejected (should be live): Event ${eventId} startTime has passed (${eventLookup.startTime}) but not in live cache, client isLive: ${isLive}`);
            return res.status(400).json({ 
              message: "Match may have started - cannot verify status, please refresh",
              code: "EVENT_STATUS_UNCERTAIN"
            });
          }
          // Event truly upcoming (start time in future) - allow bet
          console.log(`✅ Upcoming bet allowed: eventId ${eventId}, startTime: ${eventLookup.startTime}, cache age: ${Math.round(eventLookup.cacheAgeMs/1000)}s`);
        }
      } catch (lookupError) {
        // Cache access failed - FAIL-CLOSED: Reject ALL bets
        console.log(`❌ Bet rejected (cache error): Cannot verify event, eventId: ${eventId}, error: ${lookupError}`);
        return res.status(400).json({ 
          message: "Cannot verify event status - please try again",
          code: "EVENT_VERIFICATION_ERROR"
        });
      }
      
      // Currency already extracted from validation (defaults to SUI)
      const platformFee = betAmount * 0.01; // 1% platform fee
      const totalDebit = betAmount + platformFee;

      // SIMPLIFIED OFF-CHAIN BETTING - No balance check required
      // Bets are recorded directly and settled when events complete
      // Settlement adds winnings to user's platform balance
      console.log(`🎲 OFF-CHAIN BET: Recording bet for ${userId} - ${betAmount} ${currency}`);
      
      if (txHash) {
        console.log(`📦 With txHash: ${txHash}, betObjectId: ${onChainBetId}`);
        // CRITICAL WARNING: On-chain bets should always have betObjectId for proper settlement
        if (!onChainBetId) {
          console.warn(`⚠️ MISSING betObjectId: On-chain bet (tx: ${txHash}) has no betObjectId - settlement will use OFF-CHAIN fallback!`);
          console.warn(`   This indicates frontend extraction failed or wallet didn't return objectChanges`);
        }
      }

      const betId = onChainBetId || `bet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const potentialPayout = Math.round(betAmount * odds * 100) / 100;

      const bet = {
        id: betId,
        userId,
        eventId,
        eventName: eventName || 'Sports Event',
        homeTeam: homeTeam || '', // Store for settlement matching
        awayTeam: awayTeam || '', // Store for settlement matching
        marketId,
        outcomeId,
        odds,
        betAmount,
        currency: betCurrency, // Use computed betCurrency (from feeCurrency || currency || 'SUI')
        status: (paymentMethod === 'wallet' ? 'confirmed' : 'pending') as 'pending' | 'confirmed',
        prediction,
        placedAt: Date.now(),
        potentialPayout,
        platformFee: paymentMethod === 'wallet' ? 0 : platformFee, // No platform fee for on-chain bets (paid in gas)
        totalDebit: paymentMethod === 'wallet' ? betAmount : totalDebit,
        txHash: txHash || undefined,
        onChainBetId: onChainBetId || undefined,
        paymentMethod
      };

      // Store bet in storage
      const storedBet = await storage.createBet(bet);
      
      // UPDATE LIMITS AFTER SUCCESSFUL BET PLACEMENT
      if (limitsCheckPassed && userWalletForLimits) {
        try {
          const { userLimits: userLimitsTable } = await import('@shared/schema');
          const { db: dbInstance } = await import('./db');
          const { eq: eqOp } = await import('drizzle-orm');
          const now = new Date();
          
          const [currentLimits] = await dbInstance.select().from(userLimitsTable).where(eqOp(userLimitsTable.walletAddress, userWalletForLimits));
          if (currentLimits) {
            // Calculate spent with time-window resets
            let dailySpent = currentLimits.dailySpent || 0;
            let weeklySpent = currentLimits.weeklySpent || 0;
            let monthlySpent = currentLimits.monthlySpent || 0;
            let lastResetDaily = currentLimits.lastResetDaily;
            let lastResetWeekly = currentLimits.lastResetWeekly;
            let lastResetMonthly = currentLimits.lastResetMonthly;
            
            if (lastResetDaily && new Date(lastResetDaily).toDateString() !== now.toDateString()) {
              dailySpent = 0;
              lastResetDaily = now;
            }
            if (lastResetWeekly && now.getTime() - new Date(lastResetWeekly).getTime() > 7 * 24 * 60 * 60 * 1000) {
              weeklySpent = 0;
              lastResetWeekly = now;
            }
            if (lastResetMonthly) {
              const lm = new Date(lastResetMonthly);
              if (lm.getMonth() !== now.getMonth() || lm.getFullYear() !== now.getFullYear()) {
                monthlySpent = 0;
                lastResetMonthly = now;
              }
            }
            
            await dbInstance.update(userLimitsTable).set({
              dailySpent: dailySpent + betUsdValue,
              weeklySpent: weeklySpent + betUsdValue,
              monthlySpent: monthlySpent + betUsdValue,
              lastResetDaily,
              lastResetWeekly,
              lastResetMonthly,
              updatedAt: now
            }).where(eqOp(userLimitsTable.walletAddress, userWalletForLimits));
          }
        } catch (updateError) {
          console.log('Limits update after bet failed:', updateError);
        }
      }

      // Record bet on blockchain for verification (platform bets only)
      let onChainBet = null;
      if (paymentMethod === 'platform') {
        onChainBet = await blockchainBetService.recordBetOnChain({
          betId,
          walletAddress: userId,
          eventId: String(eventId),
          prediction,
          betAmount,
          odds,
          txHash: storedBet?.txHash || ''
        });
      }

      // Notify user of bet placement
      notificationService.notifyBetPlaced(userId, {
        ...bet,
        homeTeam: homeTeam || 'Home Team',
        awayTeam: awayTeam || 'Away Team'
      });


      // Log to monitoring
      monitoringService.logBet({
        betId,
        userId,
        eventId,
        odds,
        amount: betAmount,
        timestamp: Date.now(),
        status: 'pending'
      });

      console.log(`✅ BET PLACED (${paymentMethod}): ${betId} - ${prediction} @ ${odds} odds, Stake: ${betAmount} ${currency}, Potential: ${potentialPayout} ${currency}`);

      // Track bet for promotion (only for on-chain bets with txHash)
      let promotionBonus = { bonusAwarded: false, bonusAmount: 0, newBonusBalance: 0 };
      if (txHash && walletAddress) {
        try {
          promotionBonus = await promotionService.trackBetAndAwardBonus(
            walletAddress,
            betAmount,
            currency as 'SUI' | 'SBETS'
          );
          if (promotionBonus.bonusAwarded) {
            console.log(`🎁 BONUS AWARDED: ${walletAddress.slice(0, 10)}... got $${promotionBonus.bonusAmount} bonus!`);
          }
        } catch (promoError) {
          console.error('Promotion tracking error:', promoError);
        }
      }

      res.json({
        success: true,
        bet: storedBet || bet,
        paymentMethod,
        calculations: {
          betAmount,
          platformFee: paymentMethod === 'wallet' ? 0 : platformFee,
          totalDebit: paymentMethod === 'wallet' ? betAmount : totalDebit,
          potentialPayout,
          odds
        },
        onChain: {
          status: paymentMethod === 'wallet' ? 'confirmed' : (onChainBet?.status || 'pending'),
          txHash: txHash || storedBet?.txHash,
          betObjectId: onChainBetId,
          packageId: blockchainBetService.getPackageId()
        },
        promotion: promotionBonus.bonusAwarded ? {
          bonusAwarded: true,
          bonusAmount: promotionBonus.bonusAmount,
          newBonusBalance: promotionBonus.newBonusBalance,
          message: `You earned $${promotionBonus.bonusAmount} bonus! Total bonus: $${promotionBonus.newBonusBalance}`
        } : undefined
      });
    } catch (error: any) {
      console.error("Bet placement error:", error);
      res.status(500).json({ message: error.message || "Failed to place bet" });
    }
  });

  // Build transaction payload for frontend wallet signing
  app.post("/api/bets/build-transaction", async (req: Request, res: Response) => {
    try {
      const { eventId, prediction, betAmount, odds, marketId } = req.body;

      if (!eventId || !prediction || !betAmount || !odds) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const betAmountMist = Math.floor(betAmount * 1e9);
      
      const txPayload = blockchainBetService.buildClientTransaction(
        eventId,
        prediction,
        betAmountMist,
        odds,
        marketId || 'match_winner',
        ''
      );

      res.json({
        success: true,
        transaction: txPayload,
        network: process.env.SUI_NETWORK || 'mainnet',
        instructions: 'Use this payload with your Sui wallet to sign and submit the transaction'
      });
    } catch (error: any) {
      console.error("Transaction build error:", error);
      res.status(500).json({ message: error.message || "Failed to build transaction" });
    }
  });

  // Get contract info for frontend
  app.get("/api/contract/info", async (_req: Request, res: Response) => {
    res.json({
      packageId: blockchainBetService.getBettingPackageId(),
      platformId: blockchainBetService.getBettingPlatformId(),
      network: process.env.SUI_NETWORK || 'mainnet',
      revenueWallet: blockchainBetService.getRevenueWallet(),
      adminWallet: blockchainBetService.getAdminWallet(),
      sbetsTokenPackage: blockchainBetService.getPackageId()
    });
  });

  // Get settlement worker status
  app.get("/api/settlement/status", async (_req: Request, res: Response) => {
    const status = settlementWorker.getStatus();
    res.json({
      success: true,
      ...status,
      message: status.isRunning ? 'Settlement worker is active and monitoring for finished matches' : 'Settlement worker is not running'
    });
  });

  // Place a parlay bet (multiple selections)
  app.post("/api/bets/parlay", async (req: Request, res: Response) => {
    try {
      // Validate request
      const validation = validateRequest(ParlaySchema, req.body);
      if (!validation.valid) {
        return res.status(400).json({ 
          message: "Validation failed",
          errors: validation.errors 
        });
      }

      const { userId, selections, betAmount, feeCurrency } = validation.data!;
      const userIdStr = String(userId);
      
      // Determine currency (default to SUI)
      const currency: 'SUI' | 'SBETS' = feeCurrency === 'SBETS' ? 'SBETS' : 'SUI';
      
      // MAX STAKE VALIDATION - Backend enforcement (100 SUI / 10M SBETS)
      const MAX_STAKE_SUI = 100;
      const MAX_STAKE_SBETS = 10000000;
      const maxStake = currency === 'SBETS' ? MAX_STAKE_SBETS : MAX_STAKE_SUI;
      
      if (betAmount > maxStake) {
        console.log(`❌ Parlay rejected (max stake exceeded): ${betAmount} ${currency} > ${maxStake} ${currency}`);
        return res.status(400).json({
          message: `Maximum stake is ${maxStake} ${currency}`,
          code: "MAX_STAKE_EXCEEDED"
        });
      }

      // Check user balance (using async for accurate DB read)
      const balance = await balanceService.getBalanceAsync(userIdStr);
      
      // Calculate parlay odds (multiply all odds)
      const parlayOdds = selections.reduce((acc: number, sel: any) => acc * sel.odds, 1);
      
      if (!isFinite(parlayOdds) || parlayOdds <= 0) {
        return res.status(400).json({ message: "Invalid parlay odds calculation" });
      }

      const platformFee = betAmount * 0.01; // 1% platform fee
      const totalDebit = betAmount + platformFee;

      const availableBalance = currency === 'SBETS' ? balance.sbetsBalance : balance.suiBalance;
      if (availableBalance < totalDebit) {
        return res.status(400).json({ 
          message: `Insufficient balance. Required: ${totalDebit} ${currency}, Available: ${availableBalance} ${currency}`
        });
      }

      // Deduct bet from balance (with currency support)
      const deductSuccess = await balanceService.deductForBet(userIdStr, betAmount, platformFee, currency);
      if (!deductSuccess) {
        return res.status(400).json({ message: "Failed to deduct bet amount from balance" });
      }

      const potentialPayout = Math.round(betAmount * parlayOdds * 100) / 100;

      const parlayId = `parlay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const parlay = {
        id: parlayId,
        userId: userIdStr,
        selections,
        odds: parlayOdds,
        betAmount,
        currency,
        status: 'pending' as const,
        placedAt: Date.now(),
        potentialPayout,
        platformFee,
        totalDebit,
        selectionCount: selections.length
      };

      // Store parlay in storage
      const storedParlay = await storage.createParlay(parlay);

      // Notify user
      notificationService.createNotification(
        userIdStr,
        'bet_placed',
        `Parlay Placed: ${selections.length} Selections`,
        `${selections.length}-leg parlay @ ${parlayOdds.toFixed(2)} odds. Stake: ${betAmount} ${currency}, Potential: ${potentialPayout} ${currency}`,
        parlay
      );


      // Log to monitoring
      monitoringService.logBet({
        betId: parlayId,
        userId: userIdStr,
        eventId: 'parlay',
        odds: parlayOdds,
        amount: betAmount,
        timestamp: Date.now(),
        status: 'pending'
      });

      console.log(`🔥 PARLAY PLACED: ${parlayId} - ${selections.length} selections @ ${parlayOdds.toFixed(2)} odds, Stake: ${betAmount} ${currency}, Potential: ${potentialPayout} ${currency}`);

      res.json({
        success: true,
        parlay: storedParlay || parlay,
        calculations: {
          betAmount,
          platformFee,
          totalDebit,
          potentialPayout,
          parlayOdds,
          legCount: selections.length
        }
      });
    } catch (error: any) {
      console.error("Parlay placement error:", error);
      res.status(500).json({ message: error.message || "Failed to place parlay" });
    }
  });

  // On-chain parlay endpoint - called from frontend after successful on-chain transaction
  // This stores the on-chain bet object ID for settlement
  app.post("/api/parlays", async (req: Request, res: Response) => {
    try {
      const { 
        userId, 
        walletAddress, 
        totalOdds, 
        betAmount, 
        potentialPayout, 
        feeCurrency, 
        txHash, 
        onChainBetId, 
        status, 
        legs 
      } = req.body;

      const currency: 'SUI' | 'SBETS' = feeCurrency === 'SBETS' ? 'SBETS' : 'SUI';
      const parlayId = onChainBetId || `parlay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      console.log(`📦 ON-CHAIN PARLAY: ${parlayId} from ${walletAddress}`);
      console.log(`📦 Legs: ${legs?.length || 0}, Odds: ${totalOdds}, Stake: ${betAmount} ${currency}`);
      console.log(`📦 txHash: ${txHash}, betObjectId: ${onChainBetId}`);

      const parlay = {
        id: parlayId,
        userId: walletAddress || userId,
        selections: legs || [],
        combinedOdds: totalOdds,
        totalStake: betAmount,
        potentialPayout: potentialPayout || (betAmount * totalOdds),
        currency,
        status: status || 'pending',
        txHash,
        onChainBetId, // CRITICAL: Pass betObjectId for on-chain settlement
        platformFee: betAmount * 0.01,
        networkFee: 0,
      };

      const storedParlay = await storage.createParlay(parlay);

      console.log(`✅ ON-CHAIN PARLAY STORED: ${parlayId} with betObjectId: ${onChainBetId}`);

      res.json({
        success: true,
        parlay: storedParlay,
        bet: storedParlay
      });
    } catch (error: any) {
      console.error("On-chain parlay storage error:", error);
      res.status(500).json({ message: error.message || "Failed to store parlay" });
    }
  });

  // Get user's bets - requires wallet address, returns empty if not provided
  app.get("/api/bets", async (req: Request, res: Response) => {
    try {
      const wallet = req.query.wallet as string;
      const userId = req.query.userId as string;
      const status = req.query.status as string | undefined;
      
      // No mock data - require a wallet or userId
      if (!wallet && !userId) {
        return res.json([]);
      }
      
      const lookupId = wallet || userId;
      const bets = await storage.getUserBets(lookupId);
      const filtered = status ? bets.filter(b => b.status === status) : bets;
      
      // Storage already provides currency field properly mapped
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bets" });
    }
  });

  // Get a specific bet
  app.get("/api/bets/:id", async (req: Request, res: Response) => {
    try {
      const betId = req.params.id;
      const bet = await storage.getBet(betId);
      
      if (!bet) {
        return res.status(404).json({ message: "Bet not found" });
      }
      
      res.json(bet);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bet" });
    }
  });

  // Verify bet in database and on-chain
  app.get("/api/bets/:id/verify", async (req: Request, res: Response) => {
    try {
      const betId = req.params.id;
      
      // Get bet from database
      const bet = await storage.getBet(betId);
      if (!bet) {
        return res.status(404).json({ message: "Bet not found" });
      }

      // Verify on-chain if txHash exists
      let onChainVerification: { confirmed: boolean; blockHeight: number } = { confirmed: false, blockHeight: 0 };
      if (bet.txHash) {
        const verification = await blockchainBetService.verifyTransaction(bet.txHash);
        onChainVerification = { 
          confirmed: verification.confirmed, 
          blockHeight: verification.blockHeight || 0 
        };
      }

      res.json({
        betId,
        database: {
          found: true,
          status: bet.status,
          txHash: bet.txHash
        },
        onChain: {
          verified: onChainVerification.confirmed,
          blockHeight: onChainVerification.blockHeight
        },
        packageId: blockchainBetService.getPackageId()
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to verify bet" });
    }
  });

  // Settlement endpoint - Auto-settle bets based on event results
  app.post("/api/bets/:id/settle", async (req: Request, res: Response) => {
    try {
      const betId = req.params.id;
      const { eventResult } = req.body;

      if (!eventResult) {
        return res.status(400).json({ message: "Event result required" });
      }

      // Fetch actual bet from storage
      const storedBet = await storage.getBet(betId);
      
      // Use stored bet or fallback to mock for testing
      const bet = storedBet ? {
        id: storedBet.id,
        userId: storedBet.userId || 'user1',
        eventId: storedBet.eventId,
        marketId: storedBet.marketId || 'match-winner',
        outcomeId: storedBet.outcomeId || 'home',
        odds: storedBet.odds || 2.0,
        betAmount: storedBet.betAmount || 100,
        currency: (storedBet as any).currency || 'SUI' as 'SUI' | 'SBETS',
        status: 'pending' as const,
        prediction: storedBet.prediction || eventResult.result || 'home',
        placedAt: storedBet.placedAt || Date.now(),
        potentialPayout: storedBet.potentialPayout || (storedBet.betAmount || 100) * (storedBet.odds || 2.0)
      } : {
        id: betId,
        userId: 'user1',
        eventId: eventResult.eventId || '1',
        marketId: 'match-winner',
        outcomeId: 'home',
        odds: 2.0,
        betAmount: 100,
        currency: 'SUI' as 'SUI' | 'SBETS',
        status: 'pending' as const,
        prediction: eventResult.result || 'home',
        placedAt: Date.now(),
        potentialPayout: 200
      };

      const settlement = SettlementService.settleBet(bet, eventResult);
      const platformFee = settlement.payout > 0 ? settlement.payout * 0.01 : 0;
      const netPayout = settlement.payout - platformFee;
      
      // ANTI-CHEAT: Sign settlement with oracle key
      const outcome = settlement.status === 'won' ? 'won' : settlement.status === 'lost' ? 'lost' : 'void';
      const settlementData = {
        betId,
        eventId: bet.eventId,
        outcome: outcome as 'won' | 'lost' | 'void',
        payout: settlement.payout,
        timestamp: Date.now()
      };

      // Validate settlement logic to detect manipulation
      const validationCheck = antiCheatService.validateSettlementLogic(settlementData, eventResult);
      if (!validationCheck.valid) {
        console.error(`🚨 ANTI-CHEAT REJECTION: ${validationCheck.reason}`);
        return res.status(400).json({ message: `Settlement validation failed: ${validationCheck.reason}` });
      }

      // Sign settlement data cryptographically
      const signedSettlement = antiCheatService.signSettlementData(settlementData);
      const onChainProof = antiCheatService.generateOnChainProof(signedSettlement);

      // Update bet status - ONLY process payouts if status update succeeds (prevents double payout)
      const statusUpdated = await storage.updateBetStatus(betId, settlement.status, settlement.payout);
      
      if (statusUpdated) {
        // AUTO-PAYOUT: Add winnings to user balance using the bet's currency
        if (settlement.status === 'won' && netPayout > 0) {
          const winningsAdded = await balanceService.addWinnings(bet.userId, netPayout, bet.currency);
          if (!winningsAdded) {
            // CRITICAL: Revert bet status if balance credit failed - user keeps their bet
            await storage.updateBetStatus(betId, 'pending');
            console.error(`❌ SETTLEMENT REVERTED: Failed to credit winnings for bet ${betId}`);
            return res.status(500).json({ message: "Failed to credit winnings - settlement reverted" });
          }
          // CRITICAL: Record 1% platform fee as revenue (was missing!)
          await balanceService.addRevenue(platformFee, bet.currency);
          console.log(`💰 AUTO-PAYOUT (DB): ${bet.userId} received ${netPayout} ${bet.currency} (fee: ${platformFee} ${bet.currency} -> revenue)`);
        } else if (settlement.status === 'void') {
          // Refund stake on void using the bet's currency
          const refundSuccess = await balanceService.addWinnings(bet.userId, settlement.payout, bet.currency);
          if (!refundSuccess) {
            await storage.updateBetStatus(betId, 'pending');
            console.error(`❌ SETTLEMENT REVERTED: Failed to refund stake for voided bet ${betId}`);
            return res.status(500).json({ message: "Failed to refund stake - settlement reverted" });
          }
          console.log(`🔄 STAKE REFUNDED (DB): ${bet.userId} received ${settlement.payout} ${bet.currency} back`);
        } else if (settlement.status === 'lost') {
          // Add lost bet stake to platform revenue
          await balanceService.addRevenue(bet.betAmount, bet.currency);
          console.log(`📊 REVENUE (DB): ${bet.betAmount} ${bet.currency} added to platform revenue from lost bet`);
        }
      } else {
        console.log(`⚠️ DUPLICATE SETTLEMENT PREVENTED: Bet ${betId} already settled - no payout applied`);
        return res.status(400).json({ message: "Bet already settled - duplicate settlement prevented" });
      }

      // Notify user of settlement with proof
      notificationService.notifyBetSettled(bet.userId, bet, outcome);


      // Log settlement
      monitoringService.logSettlement({
        settlementId: `settlement-${betId}`,
        betId,
        outcome: settlement.status,
        payout: settlement.payout,
        timestamp: Date.now(),
        fees: platformFee
      });

      console.log(`✅ BET SETTLED: ${betId} - Status: ${settlement.status}, Payout: ${settlement.payout} ${bet.currency}, Fee: ${platformFee} ${bet.currency}, Net: ${netPayout} ${bet.currency}`);
      
      res.json({
        success: true,
        betId,
        settlement: {
          status: settlement.status,
          payout: settlement.payout,
          platformFee: platformFee,
          netPayout: netPayout,
          settledAt: Date.now()
        },
        antiCheat: {
          signed: true,
          signature: onChainProof.signature,
          dataHash: onChainProof.dataHash,
          oraclePublicKey: onChainProof.oraclePublicKey,
          message: 'Settlement cryptographically verified and ready for Sui Move contract verification'
        }
      });
    } catch (error) {
      console.error("Settlement error:", error);
      res.status(500).json({ message: "Failed to settle bet" });
    }
  });

  // Wallet connect endpoint - registers/retrieves user by wallet address
  app.post("/api/wallet/connect", async (req: Request, res: Response) => {
    try {
      const { address, walletType } = req.body;
      
      if (!address) {
        return res.status(400).json({ message: "Wallet address is required" });
      }
      
      // CRITICAL: Normalize wallet address to lowercase for consistent storage/retrieval
      const normalizedAddress = address.toLowerCase();
      console.log(`[Wallet Connect] Processing connection for: ${normalizedAddress.substring(0, 10)}...`);
      
      // Check if user exists with this wallet address
      let user = await storage.getUserByWalletAddress(normalizedAddress);
      
      if (!user) {
        // Create new user with wallet address (password required by schema, use placeholder for wallet-based auth)
        const placeholderPassword = `wallet_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        user = await storage.createUser({
          username: normalizedAddress.substring(0, 8),
          password: placeholderPassword,
          walletAddress: normalizedAddress,
          walletType: walletType || 'sui'
        });
        console.log(`[Wallet Connect] Created new user for wallet: ${normalizedAddress.substring(0, 10)}...`);
      } else {
        console.log(`[Wallet Connect] Found existing user for wallet: ${normalizedAddress.substring(0, 10)}...`);
      }
      
      // Get balance for user using normalized address
      const balance = await balanceService.getBalanceAsync(normalizedAddress);
      console.log(`[Wallet Connect] Balance retrieved:`, balance);
      
      res.json({
        id: user.id,
        username: user.username,
        walletAddress: user.walletAddress,
        walletType: user.walletType || walletType || 'sui',
        createdAt: user.createdAt,
        suiBalance: balance.suiBalance || 0,
        sbetsBalance: balance.sbetsBalance || 0,
        balance: {
          SUI: balance.suiBalance || 0,
          SBETS: balance.sbetsBalance || 0
        }
      });
    } catch (error: any) {
      console.error("Wallet connect error:", error?.message || error);
      res.status(500).json({ message: "Failed to connect wallet", error: error?.message || "Unknown error" });
    }
  });

  // Auth wallet connect endpoint (alias for /api/wallet/connect for client compatibility)
  app.post("/api/auth/wallet-connect", async (req: Request, res: Response) => {
    try {
      const { walletAddress, walletType } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ success: false, message: "Wallet address is required" });
      }
      
      const normalizedAddress = walletAddress.toLowerCase();
      console.log(`[Auth Wallet Connect] Processing: ${normalizedAddress.substring(0, 10)}...`);
      
      let user = await storage.getUserByWalletAddress(normalizedAddress);
      
      if (!user) {
        const placeholderPassword = `wallet_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        user = await storage.createUser({
          username: normalizedAddress.substring(0, 8),
          password: placeholderPassword,
          walletAddress: normalizedAddress,
          walletType: walletType || 'sui'
        });
        console.log(`[Auth Wallet Connect] Created new user: ${normalizedAddress.substring(0, 10)}...`);
      }
      
      const balance = await balanceService.getBalanceAsync(normalizedAddress);
      
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          walletAddress: user.walletAddress,
          walletType: user.walletType || walletType || 'sui',
          suiBalance: balance.suiBalance || 0,
          sbetsBalance: balance.sbetsBalance || 0,
          balance: {
            SUI: balance.suiBalance || 0,
            SBETS: balance.sbetsBalance || 0
          }
        }
      });
    } catch (error: any) {
      console.error("Auth wallet connect error:", error?.message || error);
      console.error("Auth wallet connect full error:", error);
      // Include more details for debugging
      res.status(500).json({ 
        success: false, 
        message: `Failed to connect wallet: ${error?.message || 'Unknown error'}`
      });
    }
  });

  // Auth wallet disconnect endpoint
  app.post("/api/auth/wallet-disconnect", async (req: Request, res: Response) => {
    res.json({ success: true, message: "Wallet disconnected" });
  });

  // Auth wallet status endpoint
  app.get("/api/auth/wallet-status", async (req: Request, res: Response) => {
    try {
      // Check if wallet is connected based on session or query param
      const walletAddress = req.query.walletAddress as string;
      
      if (walletAddress) {
        const normalizedAddress = walletAddress.toLowerCase();
        const user = await storage.getUserByWalletAddress(normalizedAddress);
        
        if (user) {
          const balance = await balanceService.getBalanceAsync(normalizedAddress);
          return res.json({
            authenticated: true,
            walletAddress: user.walletAddress,
            walletType: user.walletType,
            balance: balance
          });
        }
      }
      
      res.json({ authenticated: false });
    } catch (error) {
      res.json({ authenticated: false });
    }
  });

  // Auth profile endpoint
  app.get("/api/auth/profile", async (req: Request, res: Response) => {
    try {
      const walletAddress = req.query.walletAddress as string;
      
      if (walletAddress) {
        const normalizedAddress = walletAddress.toLowerCase();
        const user = await storage.getUserByWalletAddress(normalizedAddress);
        
        if (user) {
          const balance = await balanceService.getBalanceAsync(normalizedAddress);
          return res.json({
            success: true,
            profile: {
              id: user.id,
              username: user.username,
              walletAddress: user.walletAddress,
              walletType: user.walletType,
              suiBalance: balance?.suiBalance || 0,
              sbetsBalance: balance?.sbetsBalance || 0
            }
          });
        }
      }
      
      res.json({ success: false, profile: null });
    } catch (error) {
      res.json({ success: false, profile: null });
    }
  });

  // Get user balance - fetches BOTH on-chain wallet balance AND platform database balance
  app.get("/api/user/balance", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      
      // Always get database platform balance (for withdrawals of deposited funds)
      const dbBalance = await balanceService.getBalanceAsync(userId || 'user1');
      
      // If userId looks like a wallet address (starts with 0x), also fetch on-chain balance
      if (userId && userId.startsWith('0x')) {
        try {
          const onChainBalance = await blockchainBetService.getWalletBalance(userId);
          // Get promotion bonus balance
          let promotionBonus = 0;
          try {
            const promoStatus = await promotionService.getPromotionStatus(userId);
            promotionBonus = promoStatus.bonusBalance || 0;
          } catch (promoError) {
            console.warn('Promotion status fetch error:', promoError);
          }
          return res.json({
            // On-chain wallet balance (what user has in their Sui wallet for betting)
            SUI: onChainBalance.sui || 0,
            SBETS: onChainBalance.sbets || 0,
            suiBalance: onChainBalance.sui || 0,
            sbetsBalance: onChainBalance.sbets || 0,
            // Platform/database balance (for off-chain deposits - withdrawable)
            platformSuiBalance: dbBalance.suiBalance || 0,
            platformSbetsBalance: dbBalance.sbetsBalance || 0,
            // Promotion bonus balance (virtual USD for betting)
            promotionBonusUsd: promotionBonus,
            source: 'combined'
          });
        } catch (chainError) {
          console.warn(`Failed to fetch on-chain balance for ${userId}:`, chainError);
          // Fall back to database only
        }
      }
      
      // Fallback to database balance
      res.json({
        SUI: dbBalance.suiBalance || 0,
        SBETS: dbBalance.sbetsBalance || 0,
        suiBalance: dbBalance.suiBalance || 0,
        sbetsBalance: dbBalance.sbetsBalance || 0,
        platformSuiBalance: dbBalance.suiBalance || 0,
        platformSbetsBalance: dbBalance.sbetsBalance || 0,
        source: 'database'
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch balance" });
    }
  });

  // Get promotion status for user
  app.get("/api/promotion/status", async (req: Request, res: Response) => {
    try {
      const walletAddress = req.query.wallet as string;
      
      if (!walletAddress || !walletAddress.startsWith('0x')) {
        return res.status(400).json({ message: "Valid wallet address required" });
      }
      
      const status = await promotionService.getPromotionStatus(walletAddress);
      res.json({
        success: true,
        promotion: {
          isActive: status.isActive,
          totalBetUsd: status.totalBetUsd,
          bonusesAwarded: status.bonusesAwarded,
          bonusBalance: status.bonusBalance,
          nextBonusAt: status.nextBonusAt,
          promotionEnd: status.promotionEnd,
          thresholdUsd: status.thresholdUsd,
          bonusUsd: status.bonusUsd,
          progressPercent: Math.min(100, ((status.totalBetUsd % status.thresholdUsd) / status.thresholdUsd) * 100)
        }
      });
    } catch (error: any) {
      console.error('Promotion status error:', error);
      res.status(500).json({ message: error.message || "Failed to get promotion status" });
    }
  });

  // Deposit SUI to account (for on-chain wallet deposits)
  app.post("/api/user/deposit", async (req: Request, res: Response) => {
    try {
      const { userId, amount, txHash, currency = 'SUI', skipVerification = false } = req.body;
      
      if (!userId || !amount) {
        return res.status(400).json({ message: "Missing required fields: userId, amount" });
      }
      
      if (amount <= 0) {
        return res.status(400).json({ message: "Amount must be positive" });
      }

      if (!txHash) {
        return res.status(400).json({ message: "Transaction hash is required for deposits" });
      }
      
      // VERIFY TRANSACTION ON-CHAIN (unless explicitly skipped for testing)
      if (!skipVerification) {
        try {
          const verification = await blockchainBetService.verifyTransaction(txHash);
          if (!verification.confirmed) {
            console.warn(`⚠️ DEPOSIT TX NOT CONFIRMED: ${txHash}`);
            return res.status(400).json({ 
              message: "Transaction not confirmed on-chain. Please wait for confirmation and try again.",
              txHash,
              verified: false
            });
          }
          console.log(`✅ DEPOSIT TX VERIFIED: ${txHash} (block: ${verification.blockHeight})`);
        } catch (verifyError) {
          console.warn(`⚠️ Could not verify tx ${txHash}:`, verifyError);
          // Continue with deposit if verification fails (graceful degradation)
        }
      }
      
      // DUPLICATE PREVENTION: Use txHash deduplication in balanceService
      const depositResult = await balanceService.deposit(userId, amount, txHash, 'Wallet deposit', currency as 'SUI' | 'SBETS');
      
      if (!depositResult.success) {
        console.warn(`⚠️ DUPLICATE DEPOSIT BLOCKED: ${txHash} for ${userId}`);
        return res.status(409).json({ 
          success: false, 
          message: depositResult.message,
          duplicate: true
        });
      }
      
      // Notify user of deposit
      notificationService.createNotification(
        userId,
        'deposit',
        '💰 Deposit Received',
        `Successfully deposited ${amount} ${currency} to your account`,
        { amount, currency, txHash }
      );

      console.log(`✅ DEPOSIT PROCESSED: ${userId} - ${amount} ${currency} (tx: ${txHash})`);
      
      res.json({
        success: true,
        deposit: {
          amount,
          currency,
          txHash,
          status: 'completed',
          timestamp: Date.now()
        },
        newBalance: await balanceService.getBalanceAsync(userId)
      });
    } catch (error: any) {
      console.error("Deposit error:", error);
      res.status(500).json({ message: error.message || "Failed to process deposit" });
    }
  });

  // Withdraw SUI or SBETS to wallet
  app.post("/api/user/withdraw", async (req: Request, res: Response) => {
    try {
      // Validate request
      const validation = validateRequest(WithdrawSchema, req.body);
      if (!validation.valid) {
        return res.status(400).json({ 
          message: "Validation failed",
          errors: validation.errors 
        });
      }

      const { userId, amount } = validation.data!;
      const userIdStr = String(userId);
      const executeOnChain = req.body.executeOnChain === true;
      const currency: 'SUI' | 'SBETS' = req.body.currency === 'SBETS' ? 'SBETS' : 'SUI';
      
      const result = await balanceService.withdraw(userIdStr, amount, executeOnChain, currency);

      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      // Notify user based on withdrawal status
      if (result.status === 'completed') {
        notificationService.notifyWithdrawal(userIdStr, amount, 'completed');
        console.log(`Withdrawal completed: ${userIdStr} - ${amount} ${currency} | TX: ${result.txHash}`);
      } else {
        notificationService.createNotification(
          userIdStr,
          'withdrawal',
          `Withdrawal Queued`,
          `Your withdrawal of ${amount} ${currency} is being processed`,
          { amount, currency, status: 'pending_admin' }
        );
        console.log(`Withdrawal queued: ${userIdStr} - ${amount} ${currency}`);
      }

      res.json({
        success: true,
        withdrawal: {
          amount,
          currency,
          txHash: result.txHash,
          status: result.status,
          timestamp: Date.now(),
          onChainEnabled: blockchainBetService.isAdminKeyConfigured()
        }
      });
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      res.status(500).json({ message: error.message || "Failed to process withdrawal" });
    }
  });

  // Get transaction history
  app.get("/api/user/transactions", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string || 'user1';
      const limit = parseInt(req.query.limit as string) || 50;
      const transactions = await balanceService.getTransactionHistory(userId, limit);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Cash-out endpoint - Allow early cash-out of pending bets
  app.post("/api/bets/:id/cash-out", async (req: Request, res: Response) => {
    try {
      const betId = req.params.id;
      const { currentOdds = 2.0, percentageWinning = 0.8 } = req.body;

      if (!currentOdds || !percentageWinning) {
        return res.status(400).json({ message: "Current odds and percentage winning required" });
  
      }

      // Fetch actual bet from storage
      const storedBet = await storage.getBet(betId);
      
      if (!storedBet) {
        return res.status(404).json({ message: "Bet not found" });
      }
      
      const bet = {
        id: storedBet.id,
        userId: storedBet.userId || 'user1',
        eventId: storedBet.eventId,
        marketId: storedBet.marketId || 'match-winner',
        outcomeId: storedBet.outcomeId || 'home',
        odds: storedBet.odds || 2.0,
        betAmount: storedBet.betAmount || 100,
        currency: (storedBet as any).currency || 'SUI' as 'SUI' | 'SBETS',
        status: storedBet.status as 'pending' | 'won' | 'lost' | 'void' | 'cashed_out',
        prediction: storedBet.prediction || 'home',
        placedAt: storedBet.placedAt || Date.now(),
        potentialPayout: storedBet.potentialPayout || (storedBet.betAmount || 100) * (storedBet.odds || 2.0)
      };
      
      if (bet.status !== 'pending') {
        return res.status(400).json({ message: "Only pending bets can be cashed out" });
      }

      const cashOutValue = SettlementService.calculateCashOut(bet, currentOdds, percentageWinning);
      const platformFee = cashOutValue * 0.01; // 1% cash-out fee
      const netCashOut = cashOutValue - platformFee;

      // Update bet status FIRST - only add winnings if status update succeeds (prevents double cash-out)
      const statusUpdated = await storage.updateBetStatus(betId, 'cashed_out', netCashOut);
      
      if (!statusUpdated) {
        console.log(`⚠️ DUPLICATE CASH-OUT PREVENTED: Bet ${betId} already cashed out or settled`);
        return res.status(400).json({ message: "Bet already cashed out or settled - duplicate cash-out prevented" });
      }
      
      // Add cash out amount to user balance in the correct currency
      await balanceService.addWinnings(bet.userId, netCashOut, bet.currency);

      console.log(`💸 CASH OUT: ${betId} - Value: ${cashOutValue} ${bet.currency}, Fee: ${platformFee} ${bet.currency}, Net: ${netCashOut} ${bet.currency}`);

      res.json({
        success: true,
        betId,
        cashOut: {
          originalStake: bet.betAmount,
          currency: bet.currency,
          cashOutValue: cashOutValue,
          platformFee: platformFee,
          netAmount: netCashOut,
          cashOutAt: Date.now(),
          status: 'cashed_out'
        }
      });
    } catch (error) {
      console.error("Cash-out error:", error);
      res.status(500).json({ message: "Failed to process cash-out" });
    }
  });

  // Register AI betting routes
  app.use(aiRoutes);

  // =====================================================
  // REVENUE SHARING API - SBETS Holder Revenue Distribution
  // =====================================================
  
  const SBETS_TOKEN_TYPE = '0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285::sbets::SBETS';
  const REVENUE_SHARE_PERCENTAGE = 0.30; // 30% of platform revenue goes to SBETS holders (was 10% + 20% liquidity, now combined)
  
  // Helper to get settled bets
  async function getSettledBetsForRevenue(): Promise<any[]> {
    const allBets = await storage.getAllBets();
    return allBets.filter((bet: any) => bet.status === 'won' || bet.status === 'lost');
  }
  
  // Helper to get claims from database
  async function getRevenueClaims(walletAddress: string): Promise<Array<{ amount: number; amountSbets: number; timestamp: number; txHash: string; txHashSbets: string | null; weekStart: Date }>> {
    try {
      const { revenueClaims } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      const { db } = await import('./db');
      
      const claims = await db.select().from(revenueClaims).where(eq(revenueClaims.walletAddress, walletAddress));
      return claims.map((c: any) => ({
        amount: c.claimAmount,
        amountSbets: c.claimAmountSbets || 0,
        timestamp: new Date(c.claimedAt).getTime(),
        txHash: c.txHash,
        txHashSbets: c.txHashSbets || null,
        weekStart: new Date(c.weekStart)
      }));
    } catch (error) {
      console.error('Error fetching revenue claims:', error);
      return [];
    }
  }
  
  // Helper to save a claim to database
  async function saveRevenueClaim(walletAddress: string, weekStart: Date, sbetsBalance: number, sharePercentage: number, claimAmount: number, claimAmountSbets: number, txHash: string, txHashSbets: string | null): Promise<boolean> {
    try {
      const { revenueClaims } = await import('@shared/schema');
      const { db } = await import('./db');
      
      await db.insert(revenueClaims).values({
        walletAddress,
        weekStart,
        sbetsBalance,
        sharePercentage,
        claimAmount,
        claimAmountSbets,
        txHash,
        txHashSbets
      });
      return true;
    } catch (error) {
      console.error('Error saving revenue claim:', error);
      return false;
    }
  }
  
  // Get SBETS holders from blockchain
  app.get("/api/revenue/holders", async (req: Request, res: Response) => {
    try {
      const coinType = SBETS_TOKEN_TYPE;
      const holdersData = await fetchSbetsHolders();
      
      res.json({
        success: true,
        tokenType: coinType,
        totalSupply: holdersData.totalSupply,
        holderCount: holdersData.holders.length,
        holders: holdersData.holders.slice(0, 100),
        lastUpdated: Date.now()
      });
    } catch (error: any) {
      console.error('Error fetching SBETS holders:', error);
      res.status(500).json({ message: 'Failed to fetch holders', error: error.message });
    }
  });
  
  // Get platform revenue data for distribution
  app.get("/api/revenue/stats", async (req: Request, res: Response) => {
    try {
      const platformInfo = await blockchainBetService.getPlatformInfo();
      const settledBets = await getSettledBetsForRevenue();
      
      // Get current week dates
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1);
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      // Filter bets for this week
      const weeklyBets = settledBets.filter((bet: any) => {
        const betDate = new Date(bet.createdAt || 0);
        return betDate >= startOfWeek && betDate <= endOfWeek;
      });
      
      // Price conversion: Convert all revenue to SUI equivalent for display
      // Updated January 27, 2026 - SUI trading at ~$1.50
      const SUI_PRICE_USD = 1.50;
      const SBETS_PRICE_USD = 0.000001;
      const sbetsToSuiRatio = SBETS_PRICE_USD / SUI_PRICE_USD; // ~0.000000667
      
      // Track SUI and SBETS revenue separately
      const weeklyRevenueSui = weeklyBets.reduce((sum: number, bet: any) => {
        if (bet.currency !== 'SUI') return sum;
        let revenue = 0;
        if (bet.status === 'lost') {
          revenue = bet.betAmount || 0;
        } else if (bet.status === 'won' && bet.potentialWin) {
          const profit = bet.potentialWin - bet.betAmount;
          revenue = profit * 0.01;
        }
        return sum + revenue;
      }, 0);
      
      const weeklyRevenueSbets = weeklyBets.reduce((sum: number, bet: any) => {
        if (bet.currency !== 'SBETS') return sum;
        let revenue = 0;
        if (bet.status === 'lost') {
          revenue = bet.betAmount || 0;
        } else if (bet.status === 'won' && bet.potentialWin) {
          const profit = bet.potentialWin - bet.betAmount;
          revenue = profit * 0.01;
        }
        return sum + revenue;
      }, 0);
      
      // Combined for backward compatibility (in SUI equivalent)
      const weeklyRevenue = weeklyRevenueSui + (weeklyRevenueSbets * sbetsToSuiRatio);
      
      // Calculate all-time total revenue - track separately
      const REVENUE_START_DATE = new Date('2026-01-27T00:00:00Z');
      const allTimeBets = settledBets.filter((bet: any) => new Date(bet.createdAt || 0) >= REVENUE_START_DATE);
      
      const allTimeRevenueSui = allTimeBets.reduce((sum: number, bet: any) => {
        if (bet.currency !== 'SUI') return sum;
        let revenue = 0;
        if (bet.status === 'lost') {
          revenue = bet.betAmount || 0;
        } else if ((bet.status === 'won' || bet.status === 'paid_out') && bet.potentialWin) {
          const profit = bet.potentialWin - bet.betAmount;
          revenue = profit * 0.01;
        }
        return sum + revenue;
      }, 0);
      
      const allTimeRevenueSbets = allTimeBets.reduce((sum: number, bet: any) => {
        if (bet.currency !== 'SBETS') return sum;
        let revenue = 0;
        if (bet.status === 'lost') {
          revenue = bet.betAmount || 0;
        } else if ((bet.status === 'won' || bet.status === 'paid_out') && bet.potentialWin) {
          const profit = bet.potentialWin - bet.betAmount;
          revenue = profit * 0.01;
        }
        return sum + revenue;
      }, 0);
      
      const allTimeRevenue = allTimeRevenueSui + (allTimeRevenueSbets * sbetsToSuiRatio);
      
      // Calculate distribution for each currency
      const holderShareSui = weeklyRevenueSui * 0.30;
      const holderShareSbets = weeklyRevenueSbets * 0.30;
      const treasuryShareSui = weeklyRevenueSui * 0.40;
      const treasuryShareSbets = weeklyRevenueSbets * 0.40;
      const profitShareSui = weeklyRevenueSui * 0.30;
      const profitShareSbets = weeklyRevenueSbets * 0.30;
      
      res.json({
        success: true,
        weekStart: startOfWeek.toISOString(),
        weekEnd: endOfWeek.toISOString(),
        // Legacy combined values (SUI equivalent)
        totalRevenue: weeklyRevenue,
        allTimeRevenue: allTimeRevenue,
        // New separate values for SUI and SBETS
        totalRevenueSui: weeklyRevenueSui,
        totalRevenueSbets: weeklyRevenueSbets,
        allTimeRevenueSui: allTimeRevenueSui,
        allTimeRevenueSbets: allTimeRevenueSbets,
        distribution: {
          holders: { 
            percentage: 30, 
            amount: holderShareSui + (holderShareSbets * sbetsToSuiRatio),
            sui: holderShareSui,
            sbets: holderShareSbets
          },
          treasury: { 
            percentage: 40, 
            amount: treasuryShareSui + (treasuryShareSbets * sbetsToSuiRatio),
            sui: treasuryShareSui,
            sbets: treasuryShareSbets
          },
          liquidity: { 
            percentage: 30, 
            amount: profitShareSui + (profitShareSbets * sbetsToSuiRatio),
            sui: profitShareSui,
            sbets: profitShareSbets
          }
        },
        onChainData: {
          treasuryBalance: platformInfo?.treasuryBalanceSui || 0,
          treasuryBalanceSbets: platformInfo?.treasuryBalanceSbets || 0,
          totalBets: platformInfo?.totalBets || 0,
          totalVolume: platformInfo?.totalVolumeSui || 0,
          accruedFees: platformInfo?.accruedFeesSui || 0
        },
        historicalRevenue: await getWeeklyRevenueHistory(),
        lastUpdated: Date.now()
      });
    } catch (error: any) {
      console.error('Error fetching revenue stats:', error);
      res.status(500).json({ message: 'Failed to fetch revenue stats', error: error.message });
    }
  });
  
  // Get user's claimable revenue  
  app.get("/api/revenue/claimable/:walletAddress", async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        return res.status(400).json({ message: 'Wallet address required' });
      }
      
      // Get user's SBETS balance from blockchain (real-time)
      const userBalance = await blockchainBetService.getWalletBalance(walletAddress);
      const userSbets = userBalance.sbets;
      
      // CRITICAL: Get all known holders to calculate fair share
      // User's share = their SBETS / total SBETS held by ALL known holders
      const holdersData = await fetchSbetsHolders();
      const totalCirculating = holdersData.totalSupply; // This is now circulating among known holders
      const sharePercentage = totalCirculating > 0 ? (userSbets / totalCirculating) * 100 : 0;
      
      console.log(`[Revenue] User ${walletAddress.slice(0,10)}... has ${userSbets} SBETS = ${sharePercentage.toFixed(4)}% share`);
      
      const settledBets = await getSettledBetsForRevenue();
      
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const weeklyBets = settledBets.filter((bet: any) => {
        const betDate = new Date(bet.createdAt || 0);
        return betDate >= startOfWeek;
      });
      
      // Track revenue separately for SUI and SBETS
      const weeklyRevenueSui = weeklyBets.reduce((sum: number, bet: any) => {
        if (bet.currency !== 'SUI') return sum;
        let revenue = 0;
        if (bet.status === 'lost') {
          revenue = bet.betAmount || 0;
        } else if (bet.status === 'won' && bet.potentialWin) {
          const profit = bet.potentialWin - bet.betAmount;
          revenue = profit * 0.01;
        }
        return sum + revenue;
      }, 0);
      
      const weeklyRevenueSbets = weeklyBets.reduce((sum: number, bet: any) => {
        if (bet.currency !== 'SBETS') return sum;
        let revenue = 0;
        if (bet.status === 'lost') {
          revenue = bet.betAmount || 0;
        } else if (bet.status === 'won' && bet.potentialWin) {
          const profit = bet.potentialWin - bet.betAmount;
          revenue = profit * 0.01;
        }
        return sum + revenue;
      }, 0);
      
      // Calculate holder pools for each currency (30% to holders)
      const holderPoolSui = weeklyRevenueSui * REVENUE_SHARE_PERCENTAGE;
      const holderPoolSbets = weeklyRevenueSbets * REVENUE_SHARE_PERCENTAGE;
      
      // Calculate user's share based on their SBETS holdings
      const userShareRatio = totalCirculating > 0 ? (userSbets / totalCirculating) : 0;
      const userClaimableSui = holderPoolSui * userShareRatio;
      const userClaimableSbets = holderPoolSbets * userShareRatio;
      
      const userClaims = await getRevenueClaims(walletAddress);
      const thisWeekClaim = userClaims.find(c => c.weekStart >= startOfWeek);
      
      res.json({
        success: true,
        walletAddress,
        sbetsBalance: userSbets,
        sharePercentage: sharePercentage.toFixed(4),
        // Legacy field for backward compatibility (SUI equivalent)
        weeklyRevenuePool: holderPoolSui + (holderPoolSbets * 0.000001 / 1.50),
        claimableAmount: thisWeekClaim ? 0 : userClaimableSui,
        // New separate fields for SUI and SBETS
        weeklyRevenuePoolSui: holderPoolSui,
        weeklyRevenuePoolSbets: holderPoolSbets,
        claimableSui: thisWeekClaim ? 0 : userClaimableSui,
        claimableSbets: thisWeekClaim ? 0 : userClaimableSbets,
        alreadyClaimed: !!thisWeekClaim,
        lastClaimTxHash: thisWeekClaim?.txHash || null,
        claimHistory: userClaims.map(c => ({ 
          amountSui: c.amount, 
          amountSbets: c.amountSbets || 0,
          timestamp: c.timestamp, 
          txHash: c.txHash,
          txHashSbets: c.txHashSbets
        })),
        lastUpdated: Date.now()
      });
    } catch (error: any) {
      console.error('Error fetching claimable revenue:', error);
      res.status(500).json({ message: 'Failed to fetch claimable amount', error: error.message });
    }
  });
  
  // Claim revenue rewards
  app.post("/api/revenue/claim", async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ message: 'Wallet address required' });
      }
      
      if (!blockchainBetService.isAdminKeyConfigured()) {
        return res.status(400).json({ message: 'Server not configured for payouts' });
      }
      
      const userBalance = await blockchainBetService.getWalletBalance(walletAddress);
      const userSbets = userBalance.sbets;
      
      if (userSbets <= 0) {
        return res.status(400).json({ message: 'You must hold SBETS tokens to claim revenue' });
      }
      
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const userClaims = await getRevenueClaims(walletAddress);
      const thisWeekClaim = userClaims.find(c => c.weekStart >= startOfWeek);
      
      if (thisWeekClaim) {
        return res.status(400).json({ message: 'Already claimed this week', txHash: thisWeekClaim.txHash });
      }
      
      const holdersData = await fetchSbetsHolders();
      const totalSupply = holdersData.totalSupply;
      
      const settledBets = await getSettledBetsForRevenue();
      const weeklyBets = settledBets.filter((bet: any) => {
        const betDate = new Date(bet.createdAt || 0);
        return betDate >= startOfWeek;
      });
      
      // Calculate SUI and SBETS revenue separately
      const weeklyRevenueSui = weeklyBets.reduce((sum: number, bet: any) => {
        if (bet.currency !== 'SUI') return sum;
        if (bet.status === 'lost') {
          return sum + (bet.betAmount || 0);
        } else if (bet.status === 'won' && bet.potentialWin) {
          const profit = bet.potentialWin - bet.betAmount;
          return sum + (profit * 0.01);
        }
        return sum;
      }, 0);
      
      const weeklyRevenueSbets = weeklyBets.reduce((sum: number, bet: any) => {
        if (bet.currency !== 'SBETS') return sum;
        if (bet.status === 'lost') {
          return sum + (bet.betAmount || 0);
        } else if (bet.status === 'won' && bet.potentialWin) {
          const profit = bet.potentialWin - bet.betAmount;
          return sum + (profit * 0.01);
        }
        return sum;
      }, 0);
      
      const holderPoolSui = weeklyRevenueSui * REVENUE_SHARE_PERCENTAGE;
      const holderPoolSbets = weeklyRevenueSbets * REVENUE_SHARE_PERCENTAGE;
      const userShareRatio = totalSupply > 0 ? (userSbets / totalSupply) : 0;
      const claimSui = holderPoolSui * userShareRatio;
      const claimSbets = holderPoolSbets * userShareRatio;
      
      if (claimSui <= 0 && claimSbets <= 0) {
        return res.status(400).json({ message: 'No revenue to claim this week' });
      }
      
      console.log(`[Revenue] Processing claim: ${walletAddress} claiming ${claimSui} SUI + ${claimSbets} SBETS`);
      
      // Execute on-chain payouts for both currencies
      let suiTxHash = null;
      let sbetsTxHash = null;
      
      if (claimSui > 0) {
        const suiPayoutResult = await blockchainBetService.sendSuiToUser(walletAddress, claimSui);
        if (!suiPayoutResult.success) {
          console.error(`[Revenue] SUI claim failed: ${suiPayoutResult.error}`);
          return res.status(400).json({ message: suiPayoutResult.error || 'Failed to send SUI payout' });
        }
        suiTxHash = suiPayoutResult.txHash;
        console.log(`[Revenue] SUI payout successful: ${claimSui} SUI | TX: ${suiTxHash}`);
      }
      
      if (claimSbets > 0) {
        const sbetsPayoutResult = await blockchainBetService.sendSbetsToUser(walletAddress, claimSbets);
        if (!sbetsPayoutResult.success) {
          console.error(`[Revenue] SBETS claim failed: ${sbetsPayoutResult.error}`);
          // Still record partial success if SUI was sent
          if (suiTxHash) {
            console.log(`[Revenue] Partial success: SUI sent but SBETS failed`);
          }
          return res.status(400).json({ message: sbetsPayoutResult.error || 'Failed to send SBETS payout', partialSuccess: !!suiTxHash, suiTxHash });
        }
        sbetsTxHash = sbetsPayoutResult.txHash;
        console.log(`[Revenue] SBETS payout successful: ${claimSbets} SBETS | TX: ${sbetsTxHash}`);
      }
      
      // Save claim to database for persistence across server restarts
      const sharePercentage = totalSupply > 0 ? (userSbets / totalSupply) * 100 : 0;
      const saved = await saveRevenueClaim(walletAddress, startOfWeek, userSbets, sharePercentage, claimSui, claimSbets, suiTxHash || '', sbetsTxHash || null);
      
      if (!saved) {
        console.warn('[Revenue] Failed to persist claim to database - claim may be counted again');
      }
      
      console.log(`[Revenue] Claim successful: ${walletAddress} received ${claimSui} SUI + ${claimSbets} SBETS`);
      
      res.json({
        success: true,
        walletAddress,
        claimedAmount: claimSui, // Legacy field
        claimedSui: claimSui,
        claimedSbets: claimSbets,
        txHash: suiTxHash, // Legacy field
        suiTxHash,
        sbetsTxHash,
        timestamp: Date.now()
      });
    } catch (error: any) {
      console.error('Error processing claim:', error);
      res.status(500).json({ message: 'Failed to process claim', error: error.message });
    }
  });
  
  // Helper function to fetch SBETS holders
  // Cache for SBETS holders data (refresh every 5 minutes)
  let sbetsHoldersCache: { totalSupply: number; circulatingSupply: number; holders: Array<{ address: string; balance: number; percentage: number }>; lastUpdated: number } | null = null;
  const SBETS_HOLDERS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  // Platform wallets to EXCLUDE from revenue distribution (these are platform-owned, not circulating)
  const PLATFORM_WALLETS = [
    '0x20850db591c4d575b5238baf975e54580d800e69b8b5b421de796a311d3bea50', // Admin wallet (platform treasury)
  ];
  
  // Known SBETS holder wallets to check for balances
  const KNOWN_SBETS_WALLETS = [
    '0x798e8bb6db3f9c0233ca3521a7b5431af39350b3092144c74be033b468e48426', // Known user
  ];
  
  async function fetchSbetsHolders(): Promise<{ totalSupply: number; circulatingSupply: number; holders: Array<{ address: string; balance: number; percentage: number }> }> {
    // Return cached data if still fresh
    if (sbetsHoldersCache && (Date.now() - sbetsHoldersCache.lastUpdated) < SBETS_HOLDERS_CACHE_TTL) {
      return { totalSupply: sbetsHoldersCache.totalSupply, circulatingSupply: sbetsHoldersCache.circulatingSupply || sbetsHoldersCache.totalSupply, holders: sbetsHoldersCache.holders };
    }
    
    try {
      const { SuiClient, getFullnodeUrl } = await import('@mysten/sui/client');
      const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });
      
      const coinType = SBETS_TOKEN_TYPE;
      let totalSupply = 50_000_000_000; // Default 50 BILLION SBETS (actual minted amount)
      
      // Get actual total supply from blockchain - this is what we use for share calculation
      try {
        const supplyInfo = await suiClient.getTotalSupply({ coinType });
        totalSupply = parseInt(supplyInfo.value) / 1e9;
        console.log(`[Revenue] SBETS total supply from chain: ${totalSupply.toLocaleString()}`);
      } catch (e) {
        console.log('[Revenue] Using default SBETS supply: 50B');
      }
      
      const holders: Array<{ address: string; balance: number; percentage: number }> = [];
      let circulatingSupply = 0;
      
      // METHOD 1: Try BlockVision API to get ALL on-chain token holders
      const blockvisionKey = process.env.BLOCKVISION_API_KEY;
      if (blockvisionKey) {
        try {
          console.log('[Revenue] Fetching ALL SBETS holders from BlockVision API...');
          let cursor: string | null = null;
          let page = 0;
          
          do {
            const params = new URLSearchParams({ coinType, limit: '50' });
            if (cursor) params.append('cursor', cursor);
            
            const response = await fetch(
              `https://api.blockvision.org/v2/sui/coin/holders?${params}`,
              { 
                headers: { 
                  'accept': 'application/json',
                  'x-api-key': blockvisionKey 
                } 
              }
            );
            
            if (!response.ok) {
              const errorText = await response.text();
              console.warn(`[Revenue] BlockVision API error: ${response.status} - ${errorText}`);
              // If we hit rate limit but have some holders, keep them
              if (holders.length > 0) {
                console.log(`[Revenue] Rate limited but keeping ${holders.length} holders already fetched`);
              }
              break;
            }
            
            const data = await response.json();
            console.log(`[Revenue] BlockVision response page ${page}: code=${data.code}, total=${data.result?.total || 0}, items=${data.result?.data?.length || 0}`);
            
            // Handle the nested result structure
            const holderData = data.result?.data || data.data || [];
            if (Array.isArray(holderData)) {
              for (const h of holderData) {
                const address = h.account || h.address || h.owner;
                if (!address || PLATFORM_WALLETS.includes(address)) continue;
                
                const balance = parseFloat(h.balance || h.quantity || '0');
                if (balance > 0) {
                  holders.push({ address, balance, percentage: 0 });
                  circulatingSupply += balance;
                }
              }
            }
            
            cursor = data.result?.nextPageCursor || data.nextPageCursor || null;
            page++;
            
            // Safety limit: max 20 pages (1000 holders)
            if (page >= 20) break;
            
            // Add delay between requests to avoid rate limiting (1.5 seconds)
            if (cursor) {
              await new Promise(resolve => setTimeout(resolve, 1500));
            }
            
          } while (cursor);
          
          console.log(`[Revenue] BlockVision: Found ${holders.length} SBETS holders across ${page} pages`);
        } catch (apiError) {
          console.warn('[Revenue] BlockVision API failed, falling back to database:', apiError);
        }
      }
      
      // METHOD 2: Fallback - check wallets from database if BlockVision didn't work
      if (holders.length === 0) {
        console.log('[Revenue] Using fallback: checking database wallets for SBETS balances...');
        
        const uniqueWallets = new Set<string>();
        KNOWN_SBETS_WALLETS.forEach(w => uniqueWallets.add(w));
        
        const allBets = await storage.getAllBets();
        allBets.forEach((bet: any) => {
          if (bet.walletAddress?.startsWith('0x')) uniqueWallets.add(bet.walletAddress);
          if (bet.userId?.startsWith('0x')) uniqueWallets.add(bet.userId);
        });
        
        try {
          const { users } = await import('@shared/schema');
          const { db } = await import('./db');
          const allUsers = await db.select().from(users);
          allUsers.forEach((u: any) => {
            if (u.walletAddress?.startsWith('0x')) uniqueWallets.add(u.walletAddress);
          });
        } catch (e) {}
        
        console.log(`[Revenue] Checking SBETS balance for ${uniqueWallets.size} database wallets`);
        
        for (const wallet of Array.from(uniqueWallets).slice(0, 200)) {
          if (PLATFORM_WALLETS.includes(wallet)) continue;
          
          try {
            const balance = await suiClient.getBalance({ owner: wallet, coinType });
            const sbetsBalance = parseInt(balance.totalBalance) / 1e9;
            if (sbetsBalance > 0) {
              holders.push({ address: wallet, balance: sbetsBalance, percentage: 0 });
              circulatingSupply += sbetsBalance;
            }
          } catch (e) {}
        }
      }
      
      // Calculate percentages based on TOTAL supply (not just known holders)
      for (const holder of holders) {
        holder.percentage = totalSupply > 0 ? (holder.balance / totalSupply) * 100 : 0;
      }
      
      holders.sort((a, b) => b.balance - a.balance);
      
      console.log(`[Revenue] Found ${holders.length} SBETS holders with ${circulatingSupply.toLocaleString()} known SBETS out of ${totalSupply.toLocaleString()} total supply`);
      
      sbetsHoldersCache = { 
        totalSupply,  // ALWAYS use on-chain total supply for share calculation
        circulatingSupply: circulatingSupply > 0 ? circulatingSupply : totalSupply,
        holders, 
        lastUpdated: Date.now() 
      };
      
      return { totalSupply: sbetsHoldersCache.totalSupply, circulatingSupply: sbetsHoldersCache.circulatingSupply, holders };
    } catch (error) {
      console.error('Error fetching SBETS holders:', error);
      return { totalSupply: 50_000_000_000, circulatingSupply: 50_000_000_000, holders: [] };
    }
  }
  
  // Helper function to get weekly revenue history
  async function getWeeklyRevenueHistory(): Promise<Array<{ week: string; revenue: number }>> {
    try {
      const settledBets = await getSettledBetsForRevenue();
      const weeklyData: Map<string, number> = new Map();
      
      // Price conversion: Convert all revenue to SUI equivalent for consistency
      const SUI_PRICE_USD = 1.50;
      const SBETS_PRICE_USD = 0.000001;
      const sbetsToSuiRatio = SBETS_PRICE_USD / SUI_PRICE_USD;
      
      for (const bet of settledBets) {
        const betDate = new Date(bet.createdAt || 0);
        const weekStart = new Date(betDate);
        weekStart.setDate(betDate.getDate() - betDate.getDay() + 1);
        weekStart.setHours(0, 0, 0, 0);
        const weekKey = weekStart.toISOString().split('T')[0];
        
        let revenue = 0;
        if (bet.status === 'lost') {
          revenue = bet.betAmount || 0;
        } else if (bet.status === 'won' && bet.potentialWin) {
          const profit = bet.potentialWin - bet.betAmount;
          revenue = profit * 0.01;
        }
        // Convert SBETS to SUI equivalent
        if (bet.currency === 'SBETS') {
          revenue = revenue * sbetsToSuiRatio;
        }
        
        weeklyData.set(weekKey, (weeklyData.get(weekKey) || 0) + revenue);
      }
      
      return Array.from(weeklyData.entries())
        .map(([week, revenue]) => ({ week, revenue }))
        .sort((a, b) => b.week.localeCompare(a.week))
        .slice(0, 8);
    } catch (error) {
      console.error('Error getting revenue history:', error);
      return [];
    }
  }

  // =====================================================
  // LEADERBOARD ROUTES
  // =====================================================
  
  app.get('/api/leaderboard', async (req: Request, res: Response) => {
    try {
      const period = (req.query.period as string) || 'weekly';
      const allBets = await storage.getAllBets();
      
      // Calculate date range
      const now = new Date();
      let startDate: Date;
      if (period === 'weekly') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (period === 'monthly') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else {
        startDate = new Date(0);
      }
      
      // Filter bets by period and calculate profits
      const walletStats: Record<string, { profit: number; totalBets: number; wins: number; currency: string }> = {};
      
      for (const bet of allBets) {
        if (!bet.walletAddress && !bet.userId) continue;
        const wallet = bet.walletAddress || bet.userId;
        const betDate = new Date(bet.createdAt || 0);
        if (betDate < startDate) continue;
        
        if (!walletStats[wallet]) {
          walletStats[wallet] = { profit: 0, totalBets: 0, wins: 0, currency: bet.currency || 'SUI' };
        }
        
        walletStats[wallet].totalBets++;
        
        if (bet.status === 'won' || bet.status === 'paid_out') {
          const payout = bet.payout || bet.potentialWin || 0;
          const profit = payout - (bet.betAmount || 0);
          walletStats[wallet].profit += profit;
          walletStats[wallet].wins++;
        } else if (bet.status === 'lost') {
          walletStats[wallet].profit -= bet.betAmount || 0;
        }
      }
      
      // Convert to array and sort by profit
      const leaderboard = Object.entries(walletStats)
        .filter(([_, stats]) => stats.totalBets >= 1)
        .map(([wallet, stats], index) => ({
          rank: index + 1,
          wallet,
          profit: stats.profit,
          totalBets: stats.totalBets,
          winRate: stats.totalBets > 0 ? (stats.wins / stats.totalBets) * 100 : 0,
          currency: stats.currency
        }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 50)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
      
      res.json({ leaderboard });
    } catch (error) {
      console.error('Leaderboard error:', error);
      res.status(500).json({ error: 'Failed to get leaderboard' });
    }
  });

  // =====================================================
  // USER LIMITS ROUTES
  // =====================================================
  
  app.get('/api/user/limits', async (req: Request, res: Response) => {
    try {
      const wallet = req.query.wallet as string;
      if (!wallet) {
        return res.status(400).json({ error: 'Wallet address required' });
      }
      
      const { userLimits } = await import('@shared/schema');
      const { db } = await import('./db');
      const { eq } = await import('drizzle-orm');
      
      const [limits] = await db.select().from(userLimits).where(eq(userLimits.walletAddress, wallet));
      
      if (!limits) {
        return res.json({ limits: {
          dailyLimit: null,
          weeklyLimit: null,
          monthlyLimit: null,
          dailySpent: 0,
          weeklySpent: 0,
          monthlySpent: 0,
          sessionReminderMinutes: 60,
          selfExclusionUntil: null
        }});
      }
      
      res.json({ limits });
    } catch (error) {
      console.error('Get limits error:', error);
      res.status(500).json({ error: 'Failed to get limits' });
    }
  });
  
  app.post('/api/user/limits', async (req: Request, res: Response) => {
    try {
      const { wallet, dailyLimit, weeklyLimit, monthlyLimit, sessionReminderMinutes } = req.body;
      if (!wallet) {
        return res.status(400).json({ error: 'Wallet address required' });
      }
      
      const { userLimits } = await import('@shared/schema');
      const { db } = await import('./db');
      const { eq } = await import('drizzle-orm');
      
      const [existing] = await db.select().from(userLimits).where(eq(userLimits.walletAddress, wallet));
      
      if (existing) {
        await db.update(userLimits)
          .set({
            dailyLimit,
            weeklyLimit,
            monthlyLimit,
            sessionReminderMinutes: sessionReminderMinutes || 60,
            updatedAt: new Date()
          })
          .where(eq(userLimits.walletAddress, wallet));
      } else {
        await db.insert(userLimits).values({
          walletAddress: wallet,
          dailyLimit,
          weeklyLimit,
          monthlyLimit,
          sessionReminderMinutes: sessionReminderMinutes || 60
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Set limits error:', error);
      res.status(500).json({ error: 'Failed to set limits' });
    }
  });

  // =====================================================
  // REFERRAL ROUTES
  // =====================================================
  
  // In-memory referral code mapping (code -> wallet)
  const referralCodeMap: Record<string, string> = {};
  
  app.get('/api/referral/code', async (req: Request, res: Response) => {
    try {
      const wallet = req.query.wallet as string;
      if (!wallet) {
        return res.status(400).json({ error: 'Wallet address required' });
      }
      
      // Generate a unique referral code from wallet
      const code = wallet.slice(2, 10).toUpperCase();
      referralCodeMap[code] = wallet; // Store mapping
      res.json({ code, link: `https://suibets.app/?ref=${code}` });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate referral code' });
    }
  });
  
  app.get('/api/referral/stats', async (req: Request, res: Response) => {
    try {
      const wallet = req.query.wallet as string;
      if (!wallet) {
        return res.status(400).json({ error: 'Wallet address required' });
      }
      
      const { referrals } = await import('@shared/schema');
      const { db } = await import('./db');
      const { eq } = await import('drizzle-orm');
      
      const userReferrals = await db.select().from(referrals).where(eq(referrals.referrerWallet, wallet));
      
      const totalReferrals = userReferrals.length;
      const qualifiedReferrals = userReferrals.filter((r: any) => r.status === 'qualified' || r.status === 'rewarded').length;
      const pendingReferrals = userReferrals.filter((r: any) => r.status === 'pending').length;
      const totalEarned = userReferrals.reduce((sum: number, r: any) => sum + (r.rewardAmount || 0), 0);
      
      // $10 bonus for every 100 invites
      const bonusesEarned = Math.floor(totalReferrals / 100);
      const progressToNext = totalReferrals % 100;
      
      res.json({
        totalReferrals,
        qualifiedReferrals,
        pendingReferrals,
        totalEarned,
        bonusesEarned,
        bonusAmount: bonusesEarned * 10,
        progressToNext,
        nextBonusAt: 100 - progressToNext
      });
    } catch (error) {
      console.error('Referral stats error:', error);
      res.status(500).json({ error: 'Failed to get referral stats' });
    }
  });
  
  app.post('/api/referral/track', async (req: Request, res: Response) => {
    try {
      const { referralCode, referredWallet } = req.body;
      if (!referralCode || !referredWallet) {
        return res.status(400).json({ error: 'Referral code and wallet required' });
      }
      
      const { referrals } = await import('@shared/schema');
      const { db } = await import('./db');
      const { eq } = await import('drizzle-orm');
      
      // Look up referrer wallet from code mapping or reconstruct from known pattern
      let referrerWallet = referralCodeMap[referralCode.toUpperCase()];
      
      // If not in memory, try to find from existing referrals with same code
      if (!referrerWallet) {
        const [existingRef] = await db.select().from(referrals)
          .where(eq(referrals.referralCode, referralCode.toUpperCase()));
        if (existingRef) {
          referrerWallet = existingRef.referrerWallet;
        }
      }
      
      if (!referrerWallet) {
        return res.status(400).json({ error: 'Invalid referral code' });
      }
      
      // Check if already referred
      const [existing] = await db.select().from(referrals)
        .where(eq(referrals.referredWallet, referredWallet));
      
      if (existing) {
        return res.json({ success: false, message: 'Already referred' });
      }
      
      await db.insert(referrals).values({
        referrerWallet,
        referredWallet,
        referralCode: referralCode.toUpperCase(),
        status: 'pending'
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Track referral error:', error);
      res.status(500).json({ error: 'Failed to track referral' });
    }
  });

  return httpServer;
}