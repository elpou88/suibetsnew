/**
 * Admin Control Service - Force settle, cancel bets, and manual overrides
 */

export interface AdminAction {
  id: string;
  betId: string;
  action: 'force-settle' | 'cancel' | 'refund';
  reason: string;
  settledOutcome?: 'won' | 'lost' | 'void';
  performedBy: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  result?: any;
}

export class AdminService {
  private adminActions: AdminAction[] = [];
  private adminPassword: string;

  constructor() {
    this.adminPassword = process.env.ADMIN_PASSWORD || 'change-me-in-production';
  }

  /**
   * Verify admin access
   */
  verifyAdminAccess(password: string): boolean {
    const isValid = password === this.adminPassword;
    if (isValid) {
      console.log(`✅ ADMIN: Access granted`);
    } else {
      console.warn(`❌ ADMIN: Access denied - invalid password`);
    }
    return isValid;
  }

  /**
   * Force settle a bet with a specific outcome
   */
  async forceSettleBet(
    betId: string,
    outcome: 'won' | 'lost' | 'void',
    reason: string,
    adminPassword: string
  ): Promise<AdminAction> {
    if (!this.verifyAdminAccess(adminPassword)) {
      throw new Error('Unauthorized - invalid admin password');
    }

    const action: AdminAction = {
      id: `admin-${betId}-${Date.now()}`,
      betId,
      action: 'force-settle',
      reason,
      settledOutcome: outcome,
      performedBy: 'admin',
      timestamp: Date.now(),
      status: 'completed',
      result: {
        betId,
        outcome,
        settledAt: Date.now(),
        reason
      }
    };

    this.adminActions.push(action);
    console.log(`🔧 ADMIN: Force settled bet ${betId} as ${outcome}`);
    console.log(`   Reason: ${reason}`);
    return action;
  }

  /**
   * Cancel a pending bet and refund the stake
   */
  async cancelBet(
    betId: string,
    reason: string,
    adminPassword: string
  ): Promise<AdminAction> {
    if (!this.verifyAdminAccess(adminPassword)) {
      throw new Error('Unauthorized - invalid admin password');
    }

    const action: AdminAction = {
      id: `admin-cancel-${betId}-${Date.now()}`,
      betId,
      action: 'cancel',
      reason,
      performedBy: 'admin',
      timestamp: Date.now(),
      status: 'completed',
      result: {
        betId,
        status: 'cancelled',
        refunded: true,
        cancelledAt: Date.now(),
        reason
      }
    };

    this.adminActions.push(action);
    console.log(`🔧 ADMIN: Cancelled bet ${betId} with refund`);
    console.log(`   Reason: ${reason}`);
    return action;
  }

  /**
   * Manual refund for a settled bet
   */
  async refundBet(
    betId: string,
    amount: number,
    reason: string,
    adminPassword: string
  ): Promise<AdminAction> {
    if (!this.verifyAdminAccess(adminPassword)) {
      throw new Error('Unauthorized - invalid admin password');
    }

    const action: AdminAction = {
      id: `admin-refund-${betId}-${Date.now()}`,
      betId,
      action: 'refund',
      reason,
      performedBy: 'admin',
      timestamp: Date.now(),
      status: 'completed',
      result: {
        betId,
        refundAmount: amount,
        refundedAt: Date.now(),
        reason
      }
    };

    this.adminActions.push(action);
    console.log(`🔧 ADMIN: Refunded bet ${betId} for ${amount} SUI`);
    console.log(`   Reason: ${reason}`);
    return action;
  }

  /**
   * Get all admin actions
   */
  getAdminActions(): AdminAction[] {
    return this.adminActions;
  }

  /**
   * Get admin actions for a specific bet
   */
  getActionsForBet(betId: string): AdminAction[] {
    return this.adminActions.filter(a => a.betId === betId);
  }

  /**
   * Get system health status
   */
  getSystemHealth(): any {
    return {
      timestamp: Date.now(),
      status: 'healthy',
      adminActionsProcessed: this.adminActions.length,
      lastAdminAction: this.adminActions[this.adminActions.length - 1] || null,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      notes: 'All systems operational. Monitor API failures and WebSocket connections.'
    };
  }
}

export default new AdminService();
