import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      skipSuccessfulRequests: false,
      ...config,
    };
  }

  private getKey(req: Request): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(req);
    }
    return req.ip || 'unknown';
  }

  middleware = () => {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.getKey(req);
      const now = Date.now();
      const windowStart = now - this.config.windowMs;

      // Get or create request timestamps for this key
      let timestamps = this.requests.get(key) || [];
      
      // Filter out old requests outside the window
      timestamps = timestamps.filter(timestamp => timestamp > windowStart);

      if (timestamps.length >= this.config.maxRequests) {
        return res.status(429).json({
          message: 'Too many requests, please try again later',
          retryAfter: Math.ceil((timestamps[0] + this.config.windowMs - now) / 1000)
        });
      }

      // Add current request
      timestamps.push(now);
      this.requests.set(key, timestamps);

      // Clean up old keys periodically
      if (Math.random() < 0.01) {
        this.cleanup();
      }

      res.on('finish', () => {
        if (this.config.skipSuccessfulRequests && res.statusCode < 400) {
          const current = this.requests.get(key) || [];
          this.requests.set(key, current.slice(0, -1));
        }
      });

      next();
    };
  };

  private cleanup() {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    for (const [key, timestamps] of this.requests.entries()) {
      const filtered = timestamps.filter(t => t > windowStart);
      if (filtered.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, filtered);
      }
    }
  }

  reset() {
    this.requests.clear();
  }
}

// Export factory function
export function createRateLimiter(config: RateLimitConfig) {
  return new RateLimiter(config).middleware();
}

// General API limiter - 100 requests per minute per IP
export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100
});

// Strict limiter for auth endpoints - 5 requests per minute per IP
export const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5
});

// Transaction limiter - 20 requests per minute per IP (for deposits/withdrawals)
export const transactionLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  skipSuccessfulRequests: true
});

// Betting limiter - 50 requests per minute per IP
export const bettingLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 50
});
