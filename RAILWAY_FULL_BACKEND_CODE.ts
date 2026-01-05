/**
 * ============================================
 * SUIBETS COMPLETE BACKEND - COPY THIS TO server/index.ts
 * ============================================
 */

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes-simple";
import { setupVite, serveStatic, log } from "./vite";
import { initDb, seedDb } from "./db";
import { setupBlockchainAuth } from "./blockchain-auth";

const app = express();

// Middleware setup
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.set('trust proxy', 1);

// Security headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
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
      if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });
  next();
});

// Health check (Railway requirement)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Main initialization
(async () => {
  try {
    // Database setup
    await initDb();
    await seedDb();
    log('✅ Database initialized');
  } catch (error) {
    console.error('Database error:', error);
    log('⚠️ Using blockchain storage');
  }

  try {
    // Blockchain auth setup
    const { requireWalletAuth } = setupBlockchainAuth(app);
    log('✅ Blockchain auth initialized');

    // Register routes
    const server = await registerRoutes(app);
    log('✅ Routes registered');

    // Error handler (must be last)
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error('Error:', err);
      if (!res.headersSent) res.status(status).json({ message });
    });

    // Vite or static
    if (process.env.NODE_ENV !== "production") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server
    const PORT = parseInt(process.env.PORT || '3000', 10);
    const HOST = process.env.HOST || '0.0.0.0';

    server.listen(PORT, HOST, () => {
      log(`🚀 SuiBets running on ${HOST}:${PORT}`);
      log(`📍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
      log(`🔗 DB: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'Blockchain'}`);
      log(`🌍 CORS: ${process.env.CORS_ORIGIN || 'All origins'}`);
    });

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();
