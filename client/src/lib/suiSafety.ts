/**
 * Comprehensive Sui Safety Utilities
 * Implements latest Sui blockchain security best practices
 * Updated for latest Sui SDK and Move contract standards
 */

import { isValidSuiAddress } from '@mysten/sui.js/utils';

// ============================================================================
// ADDRESS VALIDATION & SAFETY
// ============================================================================

/**
 * Validates a Sui address with comprehensive checks
 */
export function validateSuiAddress(address: string): {
  valid: boolean;
  error?: string;
} {
  // Check if address is provided
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Address must be a non-empty string' };
  }

  // Trim whitespace
  address = address.trim();

  // Check if it's a valid Sui address format
  if (!isValidSuiAddress(address)) {
    return { valid: false, error: 'Invalid Sui address format' };
  }

  // Ensure address is lowercase (Sui standard)
  if (address !== address.toLowerCase()) {
    return { valid: false, error: 'Address must be lowercase' };
  }

  // Check length (Sui addresses are 66 chars with 0x prefix)
  if (address.length !== 66) {
    return { valid: false, error: 'Address must be exactly 66 characters' };
  }

  return { valid: true };
}

/**
 * Sanitizes an address for safe storage
 */
export function sanitizeSuiAddress(address: string): string {
  return address.toLowerCase().trim();
}

// ============================================================================
// AMOUNT VALIDATION & LIMITS
// ============================================================================

const MIN_BET_AMOUNT = 1; // Minimum 1 Mist (0.000001 SUI)
const MAX_BET_AMOUNT = 10000000000000; // Maximum 10,000,000 SUI
const DECIMAL_PLACES = 9; // SUI has 9 decimal places

/**
 * Validates a bet amount with Sui standards
 */
export function validateBetAmount(amount: number | string): {
  valid: boolean;
  error?: string;
  normalizedAmount?: number;
} {
  try {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    // Check if amount is a valid number
    if (isNaN(numAmount)) {
      return { valid: false, error: 'Amount must be a valid number' };
    }

    // Check if amount is positive
    if (numAmount <= 0) {
      return { valid: false, error: 'Amount must be greater than 0' };
    }

    // Check minimum
    if (numAmount < MIN_BET_AMOUNT) {
      return { valid: false, error: `Minimum bet amount is ${MIN_BET_AMOUNT}` };
    }

    // Check maximum
    if (numAmount > MAX_BET_AMOUNT) {
      return { valid: false, error: `Maximum bet amount is ${MAX_BET_AMOUNT}` };
    }

    // Convert to Mist (smallest unit) and back to check precision
    const mist = Math.round(numAmount * Math.pow(10, DECIMAL_PLACES));
    const normalizedAmount = mist / Math.pow(10, DECIMAL_PLACES);

    // Check decimal precision
    if (Math.abs(numAmount - normalizedAmount) > Number.EPSILON) {
      return {
        valid: false,
        error: `Amount has too many decimal places (max ${DECIMAL_PLACES})`
      };
    }

    return { valid: true, normalizedAmount };
  } catch (error) {
    return { valid: false, error: `Amount validation failed: ${String(error)}` };
  }
}

/**
 * Converts SUI to Mist (smallest unit)
 */
export function suiToMist(sui: number): number {
  return Math.round(sui * Math.pow(10, DECIMAL_PLACES));
}

/**
 * Converts Mist to SUI
 */
export function mistToSui(mist: number): number {
  return mist / Math.pow(10, DECIMAL_PLACES);
}

// ============================================================================
// TRANSACTION SAFETY
// ============================================================================

/**
 * Maximum gas budget for transactions (in Mist)
 */
export const MAX_GAS_BUDGET = 500000000; // 0.5 SUI

/**
 * Validates transaction parameters
 */
export function validateTransactionParams(params: {
  senderAddress: string;
  amount: number;
  gasBudget?: number;
}): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate sender address
  const addressValidation = validateSuiAddress(params.senderAddress);
  if (!addressValidation.valid) {
    errors.push(`Invalid sender address: ${addressValidation.error}`);
  }

  // Validate amount
  const amountValidation = validateBetAmount(params.amount);
  if (!amountValidation.valid) {
    errors.push(`Invalid amount: ${amountValidation.error}`);
  }

  // Validate gas budget if provided
  if (params.gasBudget !== undefined) {
    if (params.gasBudget < 2000) {
      errors.push('Gas budget must be at least 2000 (0.000002 SUI)');
    }
    if (params.gasBudget > MAX_GAS_BUDGET) {
      errors.push(`Gas budget exceeds maximum of ${MAX_GAS_BUDGET}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// NETWORK & CHAIN SAFETY
// ============================================================================

export enum SuiNetwork {
  MAINNET = 'mainnet',
  TESTNET = 'testnet',
  DEVNET = 'devnet',
  LOCAL = 'localnet'
}

/**
 * Gets the current Sui network from environment
 */
export function getCurrentSuiNetwork(): SuiNetwork {
  const network = import.meta.env.VITE_SUI_NETWORK || 'mainnet';
  return network as SuiNetwork;
}

/**
 * Gets the RPC URL for the current network
 */
export function getSuiRpcUrl(): string {
  const network = getCurrentSuiNetwork();
  const rpcUrls: Record<SuiNetwork, string> = {
    [SuiNetwork.MAINNET]: 'https://rpc.mainnet.sui.io',
    [SuiNetwork.TESTNET]: 'https://rpc.testnet.sui.io',
    [SuiNetwork.DEVNET]: 'https://rpc.devnet.sui.io',
    [SuiNetwork.LOCAL]: 'http://127.0.0.1:9000'
  };
  return rpcUrls[network];
}

/**
 * Validates that we're on the correct network
 */
export function validateNetworkEnvironment(): {
  valid: boolean;
  error?: string;
  network?: SuiNetwork;
} {
  try {
    const network = getCurrentSuiNetwork();
    
    // In production, ensure we're on mainnet
    if (import.meta.env.PROD && network !== SuiNetwork.MAINNET) {
      return {
        valid: false,
        error: `Production build must use mainnet, not ${network}`
      };
    }

    return { valid: true, network };
  } catch (error) {
    return { valid: false, error: `Network validation failed: ${String(error)}` };
  }
}

// ============================================================================
// WALLET BALANCE VALIDATION
// ============================================================================

/**
 * Validates if wallet has sufficient balance
 */
export async function validateWalletBalance(
  address: string,
  requiredAmount: number,
  rpcUrl: string = getSuiRpcUrl()
): Promise<{
  sufficient: boolean;
  currentBalance?: number;
  error?: string;
}> {
  try {
    const addressValidation = validateSuiAddress(address);
    if (!addressValidation.valid) {
      return { sufficient: false, error: addressValidation.error };
    }

    // Fetch balance from RPC
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sui_getBalance',
        params: [address, null]
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { sufficient: false, error: `RPC request failed: ${response.statusText}` };
    }

    const data = await response.json();

    if (data.error) {
      return { sufficient: false, error: `RPC error: ${data.error.message}` };
    }

    const balance = parseInt(data.result.totalBalance || '0', 10);
    const requiredMist = suiToMist(requiredAmount);

    return {
      sufficient: balance >= requiredMist,
      currentBalance: mistToSui(balance)
    };
  } catch (error) {
    return {
      sufficient: false,
      error: `Balance validation failed: ${String(error)}`
    };
  }
}

// ============================================================================
// TRANSACTION SIGNING SAFETY
// ============================================================================

/**
 * Validates transaction signature structure
 */
export function validateTransactionSignature(signature: string): {
  valid: boolean;
  error?: string;
} {
  if (!signature || typeof signature !== 'string') {
    return { valid: false, error: 'Signature must be a non-empty string' };
  }

  // Sui signatures are base64 encoded
  try {
    // Check if it's valid base64
    atob(signature);
  } catch {
    return { valid: false, error: 'Invalid signature format (must be base64)' };
  }

  // Check minimum length (typical Sui signatures are ~88 chars)
  if (signature.length < 50) {
    return { valid: false, error: 'Signature appears to be too short' };
  }

  return { valid: true };
}

// ============================================================================
// RATE LIMITING & THROTTLING
// ============================================================================

/**
 * Simple rate limiter for transactions
 */
export class TransactionRateLimiter {
  private lastTransactionTime = 0;
  private minIntervalMs: number;

  constructor(minIntervalMs: number = 1000) {
    this.minIntervalMs = minIntervalMs;
  }

  canTransact(): boolean {
    const now = Date.now();
    if (now - this.lastTransactionTime >= this.minIntervalMs) {
      this.lastTransactionTime = now;
      return true;
    }
    return false;
  }

  getWaitTimeMs(): number {
    const now = Date.now();
    const elapsed = now - this.lastTransactionTime;
    return Math.max(0, this.minIntervalMs - elapsed);
  }
}

// ============================================================================
// ERROR HANDLING & RECOVERY
// ============================================================================

/**
 * Safe error handler for Sui transactions
 */
export function handleSuiError(error: unknown): {
  message: string;
  isRetryable: boolean;
  code?: string;
} {
  if (error instanceof Error) {
    const message = error.message;

    // Network errors - retryable
    if (message.includes('network') || message.includes('timeout')) {
      return {
        message: 'Network error. Please check your connection and try again.',
        isRetryable: true,
        code: 'NETWORK_ERROR'
      };
    }

    // Gas errors - may be retryable with different gas budget
    if (message.includes('gas') || message.includes('insufficient')) {
      return {
        message: 'Insufficient gas or balance. Please check your wallet balance.',
        isRetryable: true,
        code: 'GAS_ERROR'
      };
    }

    // Signature errors - not retryable
    if (message.includes('signature') || message.includes('signed')) {
      return {
        message: 'Transaction signature invalid. Please try again.',
        isRetryable: false,
        code: 'SIGNATURE_ERROR'
      };
    }

    // Rate limit errors - retryable with backoff
    if (message.includes('rate') || message.includes('429')) {
      return {
        message: 'Rate limited. Please wait before trying again.',
        isRetryable: true,
        code: 'RATE_LIMIT'
      };
    }

    return {
      message: message || 'Unknown error occurred',
      isRetryable: false
    };
  }

  return {
    message: 'An unexpected error occurred',
    isRetryable: false
  };
}

// ============================================================================
// SECURITY CHECKS
// ============================================================================

/**
 * Performs comprehensive security check before transaction
 */
export async function performPreTransactionSecurityCheck(params: {
  senderAddress: string;
  recipientAddress?: string;
  amount: number;
  gasBudget?: number;
}): Promise<{
  safe: boolean;
  warnings: string[];
  errors: string[];
}> {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Validate transaction parameters
  const paramValidation = validateTransactionParams({
    senderAddress: params.senderAddress,
    amount: params.amount,
    gasBudget: params.gasBudget
  });

  if (!paramValidation.valid) {
    errors.push(...paramValidation.errors);
  }

  // Validate recipient if provided
  if (params.recipientAddress) {
    const recipientValidation = validateSuiAddress(params.recipientAddress);
    if (!recipientValidation.valid) {
      errors.push(`Invalid recipient address: ${recipientValidation.error}`);
    }

    // Warn if sender and recipient are the same
    if (params.senderAddress === params.recipientAddress) {
      warnings.push('Sender and recipient are the same address');
    }
  }

  // Check network
  const networkValidation = validateNetworkEnvironment();
  if (!networkValidation.valid) {
    errors.push(`Network error: ${networkValidation.error}`);
  }

  return {
    safe: errors.length === 0,
    warnings,
    errors
  };
}

// ============================================================================
// LOGGING & MONITORING
// ============================================================================

/**
 * Safe logging for transactions (no sensitive data)
 */
export function logTransactionEvent(event: {
  type: 'attempt' | 'success' | 'error' | 'confirmed';
  txHash?: string;
  address?: string;
  amount?: number;
  error?: string;
  timestamp?: number;
}): void {
  const timestamp = event.timestamp || Date.now();
  const logEntry = {
    ...event,
    address: event.address ? `${event.address.slice(0, 6)}...${event.address.slice(-4)}` : undefined,
    timestamp
  };

  console.log(`[SUI-TX-${event.type.toUpperCase()}]`, logEntry);
}

export default {
  validateSuiAddress,
  sanitizeSuiAddress,
  validateBetAmount,
  validateTransactionParams,
  validateNetworkEnvironment,
  validateWalletBalance,
  validateTransactionSignature,
  handleSuiError,
  performPreTransactionSecurityCheck,
  TransactionRateLimiter,
  suiToMist,
  mistToSui,
  getCurrentSuiNetwork,
  getSuiRpcUrl,
  logTransactionEvent
};
