/**
 * Server-side Sui Safety Utilities
 * Implements comprehensive transaction safety on the backend
 */

import { isValidSuiAddress } from '@mysten/sui.js/utils';

// ============================================================================
// TRANSACTION VALIDATION
// ============================================================================

export interface SuiTransactionValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a Sui transaction before broadcasting
 */
export function validateSuiTransaction(tx: any): SuiTransactionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!tx) {
    errors.push('Transaction is null or undefined');
    return { valid: false, errors, warnings };
  }

  // Validate sender if present
  if (tx.sender && !isValidSuiAddress(tx.sender)) {
    errors.push('Invalid sender address');
  }

  // Validate gas budget
  if (tx.gasData) {
    const gasBudget = parseInt(tx.gasData.budget || '0');
    if (gasBudget < 2000) {
      errors.push('Gas budget too low (minimum 2000)');
    }
    if (gasBudget > 500000000) {
      warnings.push('Gas budget is unusually high');
    }
  }

  // Validate transaction kind
  if (!tx.kind) {
    errors.push('Transaction kind not specified');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================================================
// REQUEST VALIDATION (ANTI-FRAUD)
// ============================================================================

/**
 * Validates incoming transaction request from frontend
 */
export function validateTransactionRequest(request: any): {
  valid: boolean;
  error?: string;
} {
  // Check required fields
  if (!request.walletAddress || typeof request.walletAddress !== 'string') {
    return { valid: false, error: 'Missing or invalid walletAddress' };
  }

  if (!request.amount || typeof request.amount !== 'number' || request.amount <= 0) {
    return { valid: false, error: 'Invalid amount' };
  }

  // Validate address
  try {
    if (!isValidSuiAddress(request.walletAddress)) {
      return { valid: false, error: 'Invalid wallet address format' };
    }
  } catch {
    return { valid: false, error: 'Address validation failed' };
  }

  // Validate amount is reasonable
  if (request.amount > 10000000000000) {
    return { valid: false, error: 'Amount exceeds maximum limit' };
  }

  // Check for suspicious patterns
  if (request.amount < 1 && request.amount !== 0) {
    return { valid: false, error: 'Amount precision too high' };
  }

  return { valid: true };
}

// ============================================================================
// TRANSACTION HISTORY TRACKING (FOR FRAUD DETECTION)
// ============================================================================

export class TransactionHistory {
  private transactions: Map<string, number[]> = new Map();
  private readonly maxTransactionsPerMinute = 10;
  private readonly maxTransactionsPerHour = 100;

  /**
   * Checks if wallet is performing suspicious transaction frequency
   */
  checkTransactionFrequency(walletAddress: string): {
    allowed: boolean;
    reason?: string;
  } {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    if (!this.transactions.has(walletAddress)) {
      this.transactions.set(walletAddress, []);
    }

    const txTimes = this.transactions.get(walletAddress)!;
    
    // Clean up old transactions
    const recentTxs = txTimes.filter(t => t > oneHourAgo);
    this.transactions.set(walletAddress, recentTxs);

    // Check per-minute limit
    const txLastMinute = recentTxs.filter(t => t > oneMinuteAgo).length;
    if (txLastMinute >= this.maxTransactionsPerMinute) {
      return {
        allowed: false,
        reason: 'Too many transactions in last minute'
      };
    }

    // Check per-hour limit
    if (recentTxs.length >= this.maxTransactionsPerHour) {
      return {
        allowed: false,
        reason: 'Too many transactions in last hour'
      };
    }

    // Record this transaction
    recentTxs.push(now);
    this.transactions.set(walletAddress, recentTxs);

    return { allowed: true };
  }

  /**
   * Gets transaction history for a wallet
   */
  getTransactionHistory(walletAddress: string): {
    count: number;
    lastTransaction?: Date;
  } {
    const txTimes = this.transactions.get(walletAddress) || [];
    return {
      count: txTimes.length,
      lastTransaction: txTimes.length > 0 ? new Date(txTimes[txTimes.length - 1]) : undefined
    };
  }
}

// ============================================================================
// GAS ESTIMATION & SAFETY
// ============================================================================

/**
 * Validates and adjusts gas budget for safety
 */
export function validateAndAdjustGasBudget(
  estimatedGas: number,
  maxGasAllowed: number = 500000000
): {
  safeGasBudget: number;
  estimatedGas: number;
  buffer: number;
} {
  // Add 20% safety buffer
  const bufferMultiplier = 1.2;
  const safeGas = Math.ceil(estimatedGas * bufferMultiplier);

  // Ensure it doesn't exceed maximum
  const finalGas = Math.min(safeGas, maxGasAllowed);

  return {
    safeGasBudget: finalGas,
    estimatedGas,
    buffer: finalGas - estimatedGas
  };
}

// ============================================================================
// SIGNATURE VERIFICATION
// ============================================================================

/**
 * Validates transaction signature structure (server-side)
 */
export function validateSignatureStructure(signature: string): {
  valid: boolean;
  error?: string;
} {
  if (!signature || typeof signature !== 'string') {
    return { valid: false, error: 'Signature must be a non-empty string' };
  }

  // Check if it's valid base64
  try {
    Buffer.from(signature, 'base64');
  } catch {
    return { valid: false, error: 'Signature is not valid base64' };
  }

  // Typical Sui signatures are 88-130 characters
  if (signature.length < 50 || signature.length > 200) {
    return { valid: false, error: 'Signature length is outside expected range' };
  }

  return { valid: true };
}

// ============================================================================
// SECURITY LOGGING
// ============================================================================

export interface SecurityLog {
  timestamp: Date;
  type: 'transaction' | 'validation' | 'error' | 'fraud_attempt';
  walletAddress: string;
  details: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

const securityLogs: SecurityLog[] = [];
const maxLogsInMemory = 10000;

/**
 * Logs security events
 */
export function logSecurityEvent(event: Omit<SecurityLog, 'timestamp'>): void {
  const log: SecurityLog = {
    ...event,
    timestamp: new Date()
  };

  securityLogs.push(log);

  // Keep memory bounded
  if (securityLogs.length > maxLogsInMemory) {
    securityLogs.shift();
  }

  // Log to console based on severity
  if (event.severity === 'error' || event.severity === 'critical') {
    console.error(`[SUI-SECURITY-${event.severity.toUpperCase()}]`, log);
  } else if (event.severity === 'warning') {
    console.warn(`[SUI-SECURITY-WARNING]`, log);
  } else {
    console.info(`[SUI-SECURITY-INFO]`, log);
  }
}

/**
 * Gets recent security logs
 */
export function getSecurityLogs(limit: number = 100): SecurityLog[] {
  return securityLogs.slice(-limit);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  validateSuiTransaction,
  validateTransactionRequest,
  TransactionHistory,
  validateAndAdjustGasBudget,
  validateSignatureStructure,
  logSecurityEvent,
  getSecurityLogs
};
