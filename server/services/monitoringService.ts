/**
 * Comprehensive Monitoring & Logging Service
 * Tracks bets, settlements, WebSocket connections, and API health
 */

export interface BetLog {
  betId: string;
  userId: string;
  eventId: string;
  amount: number;
  odds: number;
  timestamp: number;
  status: 'pending' | 'settled' | 'cancelled';
}

export interface SettlementLog {
  settlementId: string;
  betId: string;
  outcome: 'won' | 'lost' | 'void';
  payout: number;
  timestamp: number;
  fees: number;
}

export interface WebSocketLog {
  clientId: string;
  action: 'connect' | 'disconnect' | 'message' | 'error';
  timestamp: number;
  message?: string;
}

export interface ApiHealthLog {
  endpoint: string;
  statusCode: number;
  responseTime: number;
  timestamp: number;
  success: boolean;
}

export class MonitoringService {
  private betLogs: BetLog[] = [];
  private settlementLogs: SettlementLog[] = [];
  private wsLogs: WebSocketLog[] = [];
  private apiHealthLogs: ApiHealthLog[] = [];

  private stats = {
    totalBetsPlaced: 0,
    totalBetsSettled: 0,
    totalBetsCancelled: 0,
    totalVolume: 0,
    totalFeesCollected: 0,
    wsConnections: 0,
    wsDisconnections: 0,
    activeConnections: new Set<string>(),
    apiErrors: 0,
    apiSuccess: 0
  };

  constructor() {
    console.log('✅ MonitoringService initialized');
    // Clean up old logs every hour
    setInterval(() => this.cleanupOldLogs(), 60 * 60 * 1000);
  }

  /**
   * Log a new bet
   */
  logBet(bet: BetLog): void {
    this.betLogs.push(bet);
    this.stats.totalBetsPlaced++;
    this.stats.totalVolume += bet.amount;
    
    console.log(`📊 BET PLACED: ${bet.betId}`);
    console.log(`   User: ${bet.userId}`);
    console.log(`   Amount: ${bet.amount} SUI @ ${bet.odds.toFixed(2)} odds`);
    console.log(`   Potential: ${(bet.amount * bet.odds).toFixed(2)} SUI`);
  }

  /**
   * Log a settlement
   */
  logSettlement(settlement: SettlementLog): void {
    this.settlementLogs.push(settlement);
    this.stats.totalBetsSettled++;
    this.stats.totalFeesCollected += settlement.fees;

    console.log(`📊 BET SETTLED: ${settlement.betId}`);
    console.log(`   Outcome: ${settlement.outcome.toUpperCase()}`);
    console.log(`   Payout: ${settlement.payout} SUI`);
    console.log(`   Fees: ${settlement.fees} SUI (1%)`);
  }

  /**
   * Log a cancelled bet
   */
  logCancelledBet(betId: string, reason: string): void {
    this.stats.totalBetsCancelled++;
    console.log(`📊 BET CANCELLED: ${betId}`);
    console.log(`   Reason: ${reason}`);
  }

  /**
   * Log WebSocket events
   */
  logWebSocketEvent(event: WebSocketLog): void {
    this.wsLogs.push(event);

    if (event.action === 'connect') {
      this.stats.wsConnections++;
      this.stats.activeConnections.add(event.clientId);
      console.log(`📊 WS CONNECT: ${event.clientId}`);
      console.log(`   Active connections: ${this.stats.activeConnections.size}`);
    } else if (event.action === 'disconnect') {
      this.stats.wsDisconnections++;
      this.stats.activeConnections.delete(event.clientId);
      console.log(`📊 WS DISCONNECT: ${event.clientId}`);
      console.log(`   Active connections: ${this.stats.activeConnections.size}`);
    } else if (event.action === 'error') {
      console.warn(`⚠️ WS ERROR: ${event.clientId} - ${event.message}`);
    }
  }

  /**
   * Log API health
   */
  logApiHealth(log: ApiHealthLog): void {
    this.apiHealthLogs.push(log);

    if (log.success) {
      this.stats.apiSuccess++;
      if (log.responseTime > 5000) {
        console.warn(`⚠️ SLOW API: ${log.endpoint} took ${log.responseTime}ms`);
      }
    } else {
      this.stats.apiErrors++;
      console.warn(`❌ API ERROR: ${log.endpoint} (${log.statusCode}) in ${log.responseTime}ms`);
    }
  }

  /**
   * Get comprehensive statistics
   */
  getStats(): any {
    return {
      timestamp: Date.now(),
      bets: {
        totalPlaced: this.stats.totalBetsPlaced,
        totalSettled: this.stats.totalBetsSettled,
        totalCancelled: this.stats.totalBetsCancelled,
        totalVolume: `${this.stats.totalVolume.toFixed(2)} SUI`,
        averageBetSize: this.stats.totalBetsPlaced > 0 
          ? (this.stats.totalVolume / this.stats.totalBetsPlaced).toFixed(2) 
          : 0
      },
      revenue: {
        feesCollected: `${this.stats.totalFeesCollected.toFixed(2)} SUI`,
        averageFeePerSettlement: this.stats.totalBetsSettled > 0
          ? (this.stats.totalFeesCollected / this.stats.totalBetsSettled).toFixed(4)
          : 0
      },
      websocket: {
        totalConnections: this.stats.wsConnections,
        totalDisconnections: this.stats.wsDisconnections,
        activeConnections: this.stats.activeConnections.size
      },
      api: {
        successfulRequests: this.stats.apiSuccess,
        failedRequests: this.stats.apiErrors,
        successRate: this.stats.apiSuccess + this.stats.apiErrors > 0
          ? `${((this.stats.apiSuccess / (this.stats.apiSuccess + this.stats.apiErrors)) * 100).toFixed(2)}%`
          : 'N/A'
      },
      memory: {
        heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`
      },
      uptime: `${Math.floor(process.uptime())} seconds`
    };
  }

  /**
   * Get recent logs
   */
  getRecentLogs(limit: number = 20): any {
    return {
      recentBets: this.betLogs.slice(-limit),
      recentSettlements: this.settlementLogs.slice(-limit),
      recentWebSocketEvents: this.wsLogs.slice(-limit),
      recentApiCalls: this.apiHealthLogs.slice(-limit)
    };
  }

  /**
   * Get bet history for a user
   */
  getUserBetHistory(userId: string): any {
    const userBets = this.betLogs.filter(b => b.userId === userId);
    const userSettlements = this.settlementLogs.filter(s =>
      userBets.some(b => b.betId === s.betId)
    );

    return {
      userId,
      totalBets: userBets.length,
      totalVolume: userBets.reduce((sum, b) => sum + b.amount, 0),
      bets: userBets.slice(-10), // Last 10 bets
      settlements: userSettlements.slice(-10)
    };
  }

  /**
   * Generate health report
   */
  getHealthReport(): any {
    const successRate = this.stats.apiSuccess + this.stats.apiErrors > 0
      ? (this.stats.apiSuccess / (this.stats.apiSuccess + this.stats.apiErrors)) * 100
      : 100;

    return {
      timestamp: Date.now(),
      status: successRate > 95 ? 'HEALTHY' : successRate > 80 ? 'DEGRADED' : 'UNHEALTHY',
      apiHealthScore: successRate.toFixed(2),
      metrics: this.getStats(),
      recommendations: this.getHealthRecommendations(successRate)
    };
  }

  /**
   * Get health recommendations based on metrics
   */
  private getHealthRecommendations(successRate: number): string[] {
    const recommendations: string[] = [];

    if (successRate < 95) {
      recommendations.push('API error rate is elevated - check API service health');
    }

    if (this.stats.apiErrors > 100) {
      recommendations.push('Consider implementing circuit breaker pattern for APIs');
    }

    if (this.stats.activeConnections.size > 100) {
      recommendations.push('High WebSocket connection count - monitor for memory leaks');
    }

    const memUsage = process.memoryUsage().heapUsed / process.memoryUsage().heapTotal;
    if (memUsage > 0.8) {
      recommendations.push('Memory usage is high - consider cleanup or restart');
    }

    if (recommendations.length === 0) {
      recommendations.push('All systems operating normally');
    }

    return recommendations;
  }

  /**
   * Clean up logs older than 24 hours to prevent memory bloat
   */
  private cleanupOldLogs(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const beforeBets = this.betLogs.length;
    this.betLogs = this.betLogs.filter(l => l.timestamp > oneDayAgo);

    const beforeSettlements = this.settlementLogs.length;
    this.settlementLogs = this.settlementLogs.filter(l => l.timestamp > oneDayAgo);

    const beforeWs = this.wsLogs.length;
    this.wsLogs = this.wsLogs.filter(l => l.timestamp > oneDayAgo);

    const beforeApi = this.apiHealthLogs.length;
    this.apiHealthLogs = this.apiHealthLogs.filter(l => l.timestamp > oneDayAgo);

    const cleaned = (beforeBets - this.betLogs.length) +
                    (beforeSettlements - this.settlementLogs.length) +
                    (beforeWs - this.wsLogs.length) +
                    (beforeApi - this.apiHealthLogs.length);

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old log entries`);
    }
  }
}

export default new MonitoringService();
