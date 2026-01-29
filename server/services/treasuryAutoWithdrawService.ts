/**
 * Treasury Auto-Withdraw Service
 * 
 * Periodically withdraws accrued fees from on-chain treasury to admin wallet
 * to fund payouts for user-owned bets that require fallback settlement.
 * 
 * Flow:
 * 1. User stakes go to on-chain treasury
 * 2. Fees (1% of winnings) go to accrued_fees account
 * 3. This service periodically moves fees to admin wallet
 * 4. Admin wallet pays winners via fallback mechanism
 */

import { blockchainBetService } from './blockchainBetService';

const WITHDRAW_INTERVAL_MS = 10 * 60 * 1000; // Every 10 minutes
const MIN_SUI_FEES_TO_WITHDRAW = 0.001; // Minimum 0.001 SUI to bother withdrawing
const MIN_SBETS_FEES_TO_WITHDRAW = 100; // Minimum 100 SBETS to bother withdrawing

let withdrawIntervalId: NodeJS.Timeout | null = null;
let lastWithdrawTime = 0;

interface TreasuryStats {
  accruedFeesSui: number;
  accruedFeesSbets: number;
  treasurySui: number;
  treasurySbets: number;
  adminWalletSui: number;
  adminWalletSbets: number;
}

/**
 * Get current treasury and fees status
 */
async function getTreasuryStats(): Promise<TreasuryStats | null> {
  try {
    const platformInfo = await blockchainBetService.getPlatformInfo();
    const adminBalance = await blockchainBetService.getTreasuryBalance();
    
    if (!platformInfo) {
      console.error('[TreasuryAutoWithdraw] Could not fetch platform info');
      return null;
    }

    return {
      accruedFeesSui: platformInfo.accruedFeesSui || 0,
      accruedFeesSbets: platformInfo.accruedFeesSbets || 0,
      treasurySui: platformInfo.treasuryBalanceSui || 0,
      treasurySbets: platformInfo.treasuryBalanceSbets || 0,
      adminWalletSui: adminBalance.sui,
      adminWalletSbets: adminBalance.sbets,
    };
  } catch (error) {
    console.error('[TreasuryAutoWithdraw] Error getting treasury stats:', error);
    return null;
  }
}

/**
 * Attempt to withdraw available fees to admin wallet
 */
async function attemptAutoWithdraw(): Promise<{
  suiWithdrawn: number;
  sbetsWithdrawn: number;
  suiTxHash?: string;
  sbetsTxHash?: string;
  errors: string[];
}> {
  const result = {
    suiWithdrawn: 0,
    sbetsWithdrawn: 0,
    suiTxHash: undefined as string | undefined,
    sbetsTxHash: undefined as string | undefined,
    errors: [] as string[],
  };

  if (!blockchainBetService.isAdminKeyConfigured()) {
    result.errors.push('Admin key not configured');
    return result;
  }

  const stats = await getTreasuryStats();
  if (!stats) {
    result.errors.push('Could not fetch treasury stats');
    return result;
  }

  console.log(`[TreasuryAutoWithdraw] Stats: Accrued SUI=${stats.accruedFeesSui.toFixed(6)}, Accrued SBETS=${stats.accruedFeesSbets.toFixed(0)}, Admin SUI=${stats.adminWalletSui.toFixed(4)}, Admin SBETS=${stats.adminWalletSbets.toFixed(0)}`);

  // Withdraw SUI fees if above minimum
  if (stats.accruedFeesSui >= MIN_SUI_FEES_TO_WITHDRAW) {
    try {
      // Withdraw 95% to leave some buffer for gas
      const amountToWithdraw = stats.accruedFeesSui * 0.95;
      console.log(`[TreasuryAutoWithdraw] Withdrawing ${amountToWithdraw.toFixed(6)} SUI fees...`);
      
      const suiResult = await blockchainBetService.withdrawFeesOnChain(amountToWithdraw);
      if (suiResult.success) {
        result.suiWithdrawn = amountToWithdraw;
        result.suiTxHash = suiResult.txHash;
        console.log(`✅ [TreasuryAutoWithdraw] SUI fees withdrawn: ${amountToWithdraw.toFixed(6)} SUI | TX: ${suiResult.txHash}`);
      } else {
        result.errors.push(`SUI withdraw failed: ${suiResult.error}`);
      }
    } catch (error: any) {
      result.errors.push(`SUI withdraw error: ${error.message}`);
    }
  }

  // Withdraw SBETS fees if above minimum
  if (stats.accruedFeesSbets >= MIN_SBETS_FEES_TO_WITHDRAW) {
    try {
      // Withdraw 95% to leave some buffer
      const amountToWithdraw = stats.accruedFeesSbets * 0.95;
      console.log(`[TreasuryAutoWithdraw] Withdrawing ${amountToWithdraw.toFixed(0)} SBETS fees...`);
      
      const sbetsResult = await blockchainBetService.withdrawFeesSbetsOnChain(amountToWithdraw);
      if (sbetsResult.success) {
        result.sbetsWithdrawn = amountToWithdraw;
        result.sbetsTxHash = sbetsResult.txHash;
        console.log(`✅ [TreasuryAutoWithdraw] SBETS fees withdrawn: ${amountToWithdraw.toFixed(0)} SBETS | TX: ${sbetsResult.txHash}`);
      } else {
        result.errors.push(`SBETS withdraw failed: ${sbetsResult.error}`);
      }
    } catch (error: any) {
      result.errors.push(`SBETS withdraw error: ${error.message}`);
    }
  }

  lastWithdrawTime = Date.now();
  return result;
}

/**
 * Main auto-withdraw check cycle
 */
async function runAutoWithdrawCycle(): Promise<void> {
  console.log('[TreasuryAutoWithdraw] Running auto-withdraw cycle...');
  
  try {
    const result = await attemptAutoWithdraw();
    
    if (result.suiWithdrawn > 0 || result.sbetsWithdrawn > 0) {
      console.log(`[TreasuryAutoWithdraw] Cycle complete: ${result.suiWithdrawn.toFixed(6)} SUI, ${result.sbetsWithdrawn.toFixed(0)} SBETS withdrawn`);
    } else if (result.errors.length === 0) {
      console.log('[TreasuryAutoWithdraw] No fees above threshold to withdraw');
    }
    
    if (result.errors.length > 0) {
      console.error('[TreasuryAutoWithdraw] Errors:', result.errors.join(', '));
    }
  } catch (error) {
    console.error('[TreasuryAutoWithdraw] Cycle error:', error);
  }
}

/**
 * Start the auto-withdraw scheduler
 */
export function startTreasuryAutoWithdraw(): void {
  if (withdrawIntervalId) {
    console.log('[TreasuryAutoWithdraw] Already running');
    return;
  }

  console.log(`[TreasuryAutoWithdraw] Starting scheduler (interval: ${WITHDRAW_INTERVAL_MS / 1000}s)`);
  
  // Run immediately on start
  setTimeout(() => runAutoWithdrawCycle(), 5000);
  
  // Then run periodically
  withdrawIntervalId = setInterval(runAutoWithdrawCycle, WITHDRAW_INTERVAL_MS);
}

/**
 * Stop the auto-withdraw scheduler
 */
export function stopTreasuryAutoWithdraw(): void {
  if (withdrawIntervalId) {
    clearInterval(withdrawIntervalId);
    withdrawIntervalId = null;
    console.log('[TreasuryAutoWithdraw] Stopped');
  }
}

/**
 * Get service status
 */
export function getTreasuryAutoWithdrawStatus(): {
  running: boolean;
  lastWithdrawTime: number;
  intervalMs: number;
} {
  return {
    running: withdrawIntervalId !== null,
    lastWithdrawTime,
    intervalMs: WITHDRAW_INTERVAL_MS,
  };
}

/**
 * Manual trigger for immediate withdraw
 */
export async function triggerManualWithdraw(): Promise<{
  suiWithdrawn: number;
  sbetsWithdrawn: number;
  suiTxHash?: string;
  sbetsTxHash?: string;
  errors: string[];
}> {
  console.log('[TreasuryAutoWithdraw] Manual withdraw triggered');
  return attemptAutoWithdraw();
}

export const treasuryAutoWithdrawService = {
  start: startTreasuryAutoWithdraw,
  stop: stopTreasuryAutoWithdraw,
  getStatus: getTreasuryAutoWithdrawStatus,
  triggerManual: triggerManualWithdraw,
  getTreasuryStats,
};
