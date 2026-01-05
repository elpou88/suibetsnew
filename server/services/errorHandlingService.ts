/**
 * Error Handling & Retry Logic Service
 * Handles 429, 404, and other API failures with exponential backoff
 */

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number; // ms
  maxDelay: number; // ms
  backoffMultiplier: number;
  retryableStatusCodes: number[];
}

export class ErrorHandlingService {
  private config: RetryConfig = {
    maxAttempts: 4,
    initialDelay: 500, // 500ms
    maxDelay: 15000, // 15s
    backoffMultiplier: 2,
    retryableStatusCodes: [429, 503, 502, 500] // Rate limit, service unavailable, bad gateway, server error
  };

  private errorLog: Array<{
    timestamp: number;
    endpoint: string;
    statusCode: number;
    error: string;
    attempt: number;
    retryable: boolean;
  }> = [];

  constructor() {
    console.log('✅ ErrorHandlingService initialized with exponential backoff');
    console.log(`   Max attempts: ${this.config.maxAttempts}`);
    console.log(`   Initial delay: ${this.config.initialDelay}ms`);
    console.log(`   Retryable codes: ${this.config.retryableStatusCodes.join(', ')}`);
  }

  /**
   * Execute request with automatic retry on failure
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    endpoint?: string
  ): Promise<T> {
    let lastError: any = null;
    let delayMs = this.config.initialDelay;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        console.log(`[${operationName}] Attempt ${attempt}/${this.config.maxAttempts}`);
        const result = await operation();
        
        if (attempt > 1) {
          console.log(`✅ ${operationName} succeeded on attempt ${attempt}`);
        }
        return result;
      } catch (error: any) {
        lastError = error;
        const statusCode = error.response?.status;
        const isRetryable = this.config.retryableStatusCodes.includes(statusCode);

        // Log error
        this.logError({
          timestamp: Date.now(),
          endpoint: endpoint || operationName,
          statusCode: statusCode || 0,
          error: error.message,
          attempt,
          retryable: isRetryable
        });

        // If not retryable or last attempt, throw
        if (!isRetryable || attempt === this.config.maxAttempts) {
          console.error(`❌ ${operationName} failed (attempt ${attempt}):`, {
            status: statusCode,
            message: error.message,
            retryable: isRetryable
          });
          throw error;
        }

        // Calculate backoff delay
        delayMs = Math.min(
          this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt - 1),
          this.config.maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * delayMs * 0.1;
        const waitTime = delayMs + jitter;

        console.warn(`⚠️ ${operationName} failed with status ${statusCode} - Retrying in ${Math.round(waitTime)}ms...`);
        await this.delay(waitTime);
      }
    }

    throw lastError;
  }

  /**
   * Handle specific API error
   */
  handleApiError(error: any, apiName: string): { status: number; message: string; retryable: boolean } {
    const statusCode = error.response?.status;
    const responseData = error.response?.data;

    switch (statusCode) {
      case 404:
        return {
          status: 404,
          message: `${apiName}: Resource not found (API endpoint may be invalid or service offline)`,
          retryable: false
        };
      case 429:
        return {
          status: 429,
          message: `${apiName}: Rate limited - too many requests. Will retry with backoff.`,
          retryable: true
        };
      case 403:
        return {
          status: 403,
          message: `${apiName}: Access forbidden - check API key and permissions`,
          retryable: false
        };
      case 401:
        return {
          status: 401,
          message: `${apiName}: Unauthorized - invalid or expired API key`,
          retryable: false
        };
      case 500:
      case 502:
      case 503:
        return {
          status: statusCode,
          message: `${apiName}: Server error - will retry`,
          retryable: true
        };
      default:
        return {
          status: statusCode || 0,
          message: `${apiName}: ${error.message}`,
          retryable: false
        };
    }
  }

  /**
   * Log error for monitoring
   */
  private logError(errorInfo: {
    timestamp: number;
    endpoint: string;
    statusCode: number;
    error: string;
    attempt: number;
    retryable: boolean;
  }): void {
    this.errorLog.push(errorInfo);
    
    // Keep only last 1000 errors to prevent memory bloat
    if (this.errorLog.length > 1000) {
      this.errorLog.shift();
    }

    // Log to console for important errors
    if (!errorInfo.retryable || errorInfo.attempt === 4) {
      console.log(`📊 ERROR LOG: ${errorInfo.endpoint} (${errorInfo.statusCode}) - ${errorInfo.error}`);
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): any {
    const stats = {
      totalErrors: this.errorLog.length,
      last24Hours: 0,
      byStatusCode: {} as Record<number, number>,
      byEndpoint: {} as Record<string, number>,
      retryableErrors: 0,
      nonRetryableErrors: 0,
      recentErrors: this.errorLog.slice(-10)
    };

    const oneDay = 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (const error of this.errorLog) {
      // Count last 24h
      if (now - error.timestamp < oneDay) {
        stats.last24Hours++;
      }

      // Count by status code
      stats.byStatusCode[error.statusCode] = (stats.byStatusCode[error.statusCode] || 0) + 1;

      // Count by endpoint
      stats.byEndpoint[error.endpoint] = (stats.byEndpoint[error.endpoint] || 0) + 1;

      // Count retryable vs non-retryable
      if (error.retryable) {
        stats.retryableErrors++;
      } else {
        stats.nonRetryableErrors++;
      }
    }

    return stats;
  }

  /**
   * Clear old errors (older than specified hours)
   */
  clearOldErrors(olderThanHours: number = 24): void {
    const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;
    const initialCount = this.errorLog.length;
    this.errorLog = this.errorLog.filter(e => e.timestamp > cutoffTime);
    console.log(`🧹 Cleared ${initialCount - this.errorLog.length} old errors`);
  }

  /**
   * Sleep/delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update retry configuration
   */
  setConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('🔧 ErrorHandlingService config updated:', this.config);
  }
}

export default new ErrorHandlingService();
