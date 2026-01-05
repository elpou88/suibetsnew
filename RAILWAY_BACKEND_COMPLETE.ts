/**
 * ============================================
 * SUIBETS - COMPLETE BACKEND CODE FOR RAILWAY
 * ============================================
 * 
 * INSTRUCTIONS:
 * 1. Copy this entire code
 * 2. Replace your server/index.ts with this code
 * 3. Push to GitHub
 * 4. Connect to Railway
 * 5. Deploy!
 */

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes-simple";
import { setupVite, serveStatic, log } from "./vite";
import { initDb, seedDb } from "./db";
import { setupBlockchainAuth } from "./blockchain-auth";

const app = express();

// ============ MIDDLEWARE ============
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Trust proxy (REQUIRED for Railway)
app.set('trust proxy', 1);

// Security headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// ============ HEALTH CHECK (Railway requires this) ============
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============ INITIALIZE SERVER ============
(async () => {
  try {
    // Database initialization
    await initDb();
    await seedDb();
    log('✅ Database initialized and seeded successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    log('⚠️ Continuing with blockchain-based storage');
  }

  try {
    // Setup blockchain authentication
    const { requireWalletAuth } = setupBlockchainAuth(app);
    log('✅ Blockchain authentication system initialized');

    // Register all SuiBets routes
    log('📝 Registering SuiBets API routes...');
    const server = await registerRoutes(app);
    log('✅ All routes registered successfully');

    // Error handling middleware (MUST be after all routes)
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error('Server error:', err);

      if (!res.headersSent) {
        res.status(status).json({ message });
      }
    });

    // Setup Vite for development OR serve static for production
    if (process.env.NODE_ENV !== "production") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ============ START SERVER ============
    const PORT = parseInt(process.env.PORT || '3000', 10);
    const HOST = process.env.HOST || '0.0.0.0';

    server.listen(PORT, HOST, () => {
      log(`🚀 SuiBets Server running on ${HOST}:${PORT}`);
      log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      log(`🔗 Database: ${process.env.DATABASE_URL ? 'PostgreSQL Connected' : 'Blockchain Storage'}`);
      log(`🌍 CORS Origin: ${process.env.CORS_ORIGIN || 'All origins'}`);
    });

  } catch (error) {
    console.error('Fatal error during initialization:', error);
    process.exit(1);
  }
})();
