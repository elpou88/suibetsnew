/**
 * User Balance Management Service - PERSISTENT DATABASE VERSION
 * Tracks SUI and SBETS token balances for each user in PostgreSQL
 * Balances survive server restarts and are reliable for settlement
 */

import { storage } from '../storage';
import { blockchainBetService } from './blockchainBetService';

export interface UserBalance {
  userId: string;
  suiBalance: number;
  sbetsBalance: number;
  totalBetAmount: number;
  totalWinnings: number;
  lastUpdated: number;
}

export class BalanceService {
  private balanceCache: Map<string, UserBalance> = new Map();
  private cacheExpiry = 30000; // 30 second cache

  /**
   * Normalize wallet address for consistent cache keys
   */
  private normalizeKey(userId: string): string {
    return userId.toLowerCase();
  }

  /**
   * Get user balance from database (with caching for performance)
   */
  async getBalanceAsync(userId: string): Promise<UserBalance> {
    const cacheKey = this.normalizeKey(userId);
    const cached = this.balanceCache.get(cacheKey);
    if (cached && Date.now() - cached.lastUpdated < this.cacheExpiry) {
      return cached;
    }

    const dbBalance = await storage.getUserBalance(userId);
    
    const balance: UserBalance = {
      userId: cacheKey,
      suiBalance: dbBalance?.suiBalance || 0,
      sbetsBalance: dbBalance?.sbetsBalance || 0,
      totalBetAmount: 0,
      totalWinnings: 0,
      lastUpdated: Date.now()
    };

    this.balanceCache.set(cacheKey, balance);
    return balance;
  }

  /**
   * Synchronous balance getter (uses cache, falls back to 0)
   */
  getBalance(userId: string): UserBalance {
    const cacheKey = this.normalizeKey(userId);
    const cached = this.balanceCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Return default, async load will populate
    const balance: UserBalance = {
      userId: cacheKey,
      suiBalance: 0,
      sbetsBalance: 0,
      totalBetAmount: 0,
      totalWinnings: 0,
      lastUpdated: Date.now()
    };

    // Trigger async load
    this.getBalanceAsync(userId).catch(console.error);
    
    return balance;
  }

  /**
   * Check if a transaction hash has already been processed
   */
  async isTxProcessed(txHash: string): Promise<boolean> {
    return await storage.isTransactionProcessed(txHash);
  }

  /**
   * Deduct bet amount from user balance (supports SUI or SBETS)
   * PERSISTS TO DATABASE
   */
  async deductForBet(userId: string, amount: number, fee: number, currency: 'SUI' | 'SBETS' = 'SUI'): Promise<boolean> {
    const balance = await this.getBalanceAsync(userId);
    const totalDebit = amount + fee;

    if (currency === 'SBETS') {
      // ATOMIC DEDUCTION: Use database-level balance check to prevent race conditions
      const deductionSuccess = await storage.updateUserBalance(userId, 0, -totalDebit);
      
      if (!deductionSuccess) {
        console.warn(`❌ Insufficient SBETS for ${userId}: ${balance.sbetsBalance} SBETS < ${totalDebit} SBETS needed`);
        return false;
      }
      
      // Only record operation after successful atomic deduction
      await storage.recordWalletOperation(userId, 'bet_placed', totalDebit, `bet-${Date.now()}`, { currency: 'SBETS', fee });
      
      // Update cache
      balance.sbetsBalance -= totalDebit;
      balance.totalBetAmount += amount;
      balance.lastUpdated = Date.now();
      
      console.log(`💰 BET DEDUCTED (DB): ${userId.slice(0, 8)}... - ${amount} SBETS (Fee: ${fee} SBETS) | Balance: ${balance.sbetsBalance} SBETS`);
    } else {
      // ATOMIC DEDUCTION: Use database-level balance check to prevent race conditions
      const deductionSuccess = await storage.updateUserBalance(userId, -totalDebit, 0);
      
      if (!deductionSuccess) {
        console.warn(`❌ Insufficient balance for ${userId}: ${balance.suiBalance} SUI < ${totalDebit} SUI needed`);
        return false;
      }
      
      // Only record operation after successful atomic deduction
      await storage.recordWalletOperation(userId, 'bet_placed', totalDebit, `bet-${Date.now()}`, { currency: 'SUI', fee });
      
      // Update cache
      balance.suiBalance -= totalDebit;
      balance.totalBetAmount += amount;
      balance.lastUpdated = Date.now();
      
      console.log(`💰 BET DEDUCTED (DB): ${userId.slice(0, 8)}... - ${amount} SUI (Fee: ${fee} SUI) | Balance: ${balance.suiBalance} SUI`);
    }

    return true;
  }

  /**
   * Add winnings to user balance (supports SUI or SBETS)
   * PERSISTS TO DATABASE
   */
  async addWinnings(userId: string, amount: number, currency: 'SUI' | 'SBETS' = 'SUI'): Promise<boolean> {
    const balance = await this.getBalanceAsync(userId);
    
    if (currency === 'SBETS') {
      // ATOMIC CREDIT: Use database-level atomic increment
      const creditSuccess = await storage.updateUserBalance(userId, 0, amount);
      
      if (!creditSuccess) {
        console.error(`❌ Failed to add SBETS winnings for ${userId}`);
        return false;
      }
      
      // Only record operation after successful atomic credit
      await storage.recordWalletOperation(userId, 'bet_won', amount, `win-${Date.now()}`, { currency: 'SBETS' });
      
      // Update cache
      balance.sbetsBalance += amount;
      balance.totalWinnings += amount;
      balance.lastUpdated = Date.now();
      
      console.log(`🎉 WINNINGS ADDED (DB): ${userId.slice(0, 8)}... - ${amount} SBETS | New Balance: ${balance.sbetsBalance} SBETS`);
    } else {
      // ATOMIC CREDIT: Use database-level atomic increment
      const creditSuccess = await storage.updateUserBalance(userId, amount, 0);
      
      if (!creditSuccess) {
        console.error(`❌ Failed to add SUI winnings for ${userId}`);
        return false;
      }
      
      // Only record operation after successful atomic credit
      await storage.recordWalletOperation(userId, 'bet_won', amount, `win-${Date.now()}`, { currency: 'SUI' });
      
      // Update cache
      balance.suiBalance += amount;
      balance.totalWinnings += amount;
      balance.lastUpdated = Date.now();
      
      console.log(`🎉 WINNINGS ADDED (DB): ${userId.slice(0, 8)}... - ${amount} SUI | New Balance: ${balance.suiBalance} SUI`);
    }
    return true;
  }

  /**
   * Withdraw SUI to wallet - PERSISTS TO DATABASE
   * If ADMIN_PRIVATE_KEY is set and executeOnChain=true, executes on-chain payout
   * Otherwise, creates pending withdrawal for manual admin processing
   */
  async withdraw(userId: string, amount: number, executeOnChain: boolean = false): Promise<{ 
    success: boolean; 
    txHash?: string; 
    message: string;
    status: 'completed' | 'pending_admin';
  }> {
    const balance = await this.getBalanceAsync(userId);

    if (amount < 0.1) {
      return { success: false, message: 'Minimum withdrawal is 0.1 SUI', status: 'pending_admin' };
    }

    // ATOMIC WITHDRAWAL: Use database-level balance check to prevent race conditions
    // This prevents concurrent withdrawals from overdrawing

    // OPTION 1: Execute on-chain if admin key is configured and requested
    if (executeOnChain && blockchainBetService.isAdminKeyConfigured()) {
      // Try atomic deduction first (prevents race condition)
      const deductionSuccess = await storage.updateUserBalance(userId, -amount, 0);
      
      if (!deductionSuccess) {
        return { success: false, message: `Insufficient balance. Available: ${balance.suiBalance} SUI`, status: 'pending_admin' };
      }
      
      const payoutResult = await blockchainBetService.executePayoutOnChain(userId, amount);
      
      if (payoutResult.success && payoutResult.txHash) {
        await storage.recordWalletOperation(userId, 'withdrawal', amount, payoutResult.txHash, { 
          status: 'completed',
          onChain: true
        });

        // Update cache
        balance.suiBalance -= amount;
        balance.lastUpdated = Date.now();

        console.log(`💸 ON-CHAIN WITHDRAWAL: ${userId.slice(0, 8)}... - ${amount} SUI | TX: ${payoutResult.txHash}`);
        return {
          success: true,
          txHash: payoutResult.txHash,
          message: `Successfully withdrawn ${amount} SUI on-chain`,
          status: 'completed'
        };
      } else {
        // On-chain failed - refund the deducted amount
        await storage.updateUserBalance(userId, amount, 0);
        console.error(`❌ On-chain payout failed, refunded ${amount} SUI: ${payoutResult.error}`);
        return { success: false, message: `On-chain payout failed: ${payoutResult.error}`, status: 'pending_admin' };
      }
    }

    // OPTION 2: Create pending withdrawal for manual admin processing
    const withdrawalId = `wd-${userId.slice(0, 8)}-${Date.now()}`;

    // ATOMIC DEDUCTION: Use database-level balance check to prevent race conditions
    const deductionSuccess = await storage.updateUserBalance(userId, -amount, 0);
    
    if (!deductionSuccess) {
      console.log(`❌ WITHDRAWAL REJECTED: Insufficient balance for ${userId.slice(0, 8)}...`);
      return { success: false, message: `Insufficient balance. Available: ${balance.suiBalance} SUI`, status: 'pending_admin' };
    }
    
    await storage.recordWalletOperation(userId, 'withdrawal', amount, withdrawalId, { 
      status: 'pending_admin',
      recipientWallet: userId,
      onChain: false
    });

    // Update cache
    balance.suiBalance -= amount;
    balance.lastUpdated = Date.now();

    console.log(`📋 WITHDRAWAL QUEUED: ${userId.slice(0, 8)}... - ${amount} SUI | ID: ${withdrawalId} (pending admin)`);
    return {
      success: true,
      txHash: withdrawalId,
      message: `Withdrawal of ${amount} SUI queued for processing`,
      status: 'pending_admin'
    };
  }

  /**
   * Deposit SUI or SBETS to account with txHash deduplication
   * PERSISTS TO DATABASE - Returns false if txHash was already processed
   */
  async deposit(userId: string, amount: number, txHash?: string, reason: string = 'Wallet deposit', currency: 'SUI' | 'SBETS' = 'SUI'): Promise<{ success: boolean; message: string }> {
    // DUPLICATE PREVENTION: Check if this txHash was already processed
    if (txHash) {
      const alreadyProcessed = await storage.isTransactionProcessed(txHash);
      if (alreadyProcessed) {
        console.warn(`⚠️ DUPLICATE DEPOSIT BLOCKED: txHash ${txHash} already processed`);
        return { success: false, message: 'Transaction already processed' };
      }
    }

    // Update database with correct currency
    if (currency === 'SBETS') {
      await storage.updateUserBalance(userId, 0, amount);
    } else {
      await storage.updateUserBalance(userId, amount, 0);
    }
    await storage.recordWalletOperation(userId, 'deposit', amount, txHash || `deposit-${Date.now()}`, { reason, currency });

    // Update cache
    const balance = await this.getBalanceAsync(userId);
    if (currency === 'SBETS') {
      balance.sbetsBalance += amount;
    } else {
      balance.suiBalance += amount;
    }
    balance.lastUpdated = Date.now();

    console.log(`💳 DEPOSIT ADDED (DB): ${userId.slice(0, 8)}... - ${amount} ${currency} (${reason}) txHash: ${txHash} | Balance: ${balance.suiBalance} SUI, ${balance.sbetsBalance} SBETS`);
    return { success: true, message: `Deposited ${amount} ${currency}` };
  }

  /**
   * Add revenue from lost bets to platform wallet
   * PERSISTS TO DATABASE
   */
  async addRevenue(amount: number, currency: 'SUI' | 'SBETS' = 'SUI'): Promise<void> {
    await storage.addPlatformRevenue(amount, currency);
    
    if (currency === 'SBETS') {
      console.log(`📊 REVENUE ADDED (DB): ${amount} SBETS to platform`);
    } else {
      console.log(`📊 REVENUE ADDED (DB): ${amount} SUI to platform`);
    }
  }

  /**
   * Get platform revenue from database
   */
  async getPlatformRevenue(): Promise<{ suiBalance: number; sbetsBalance: number }> {
    const revenue = await storage.getPlatformRevenue();
    return {
      suiBalance: revenue.suiRevenue,
      sbetsBalance: revenue.sbetsRevenue
    };
  }

  /**
   * Get transaction history from database
   */
  async getTransactionHistory(userId: string, limit: number = 50): Promise<any[]> {
    return await storage.getWalletOperations(userId, limit);
  }
}

export default new BalanceService();
