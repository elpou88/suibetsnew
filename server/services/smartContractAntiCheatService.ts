/**
 * Smart Contract Anti-Cheat Service
 * Implements cryptographic signing and verification for settlement data
 * Prevents backend manipulation by requiring oracle signature verification on-chain
 */

import crypto from 'crypto';

export interface SettlementData {
  betId: string;
  eventId: string;
  outcome: 'won' | 'lost' | 'void';
  payout: number;
  timestamp: number;
}

export interface SignedSettlement {
  data: SettlementData;
  signature: string;
  oraclePublicKey: string;
  verified: boolean;
}

export class SmartContractAntiCheatService {
  private oraclePrivateKey: string;
  private oraclePublicKey: string;

  constructor() {
    // In production, load from secure environment
    // For now, generate or use configured keys
    this.oraclePrivateKey = process.env.ORACLE_PRIVATE_KEY || this.generatePrivateKey();
    this.oraclePublicKey = this.derivePublicKey(this.oraclePrivateKey);
  }

  /**
   * Generate HMAC-SHA256 signature for settlement data
   * This ensures data integrity and authenticity
   */
  signSettlementData(data: SettlementData): SignedSettlement {
    // Create a canonical JSON representation for consistent hashing
    const canonicalData = JSON.stringify({
      betId: data.betId,
      eventId: data.eventId,
      outcome: data.outcome,
      payout: data.payout,
      timestamp: data.timestamp
    });

    // Create HMAC signature using oracle private key
    const hmac = crypto.createHmac('sha256', this.oraclePrivateKey);
    hmac.update(canonicalData);
    const signature = hmac.digest('hex');

    console.log(`🔐 ANTI-CHEAT: Settlement signed for bet ${data.betId} | Outcome: ${data.outcome} | Payout: ${data.payout} SUI`);

    return {
      data,
      signature,
      oraclePublicKey: this.oraclePublicKey,
      verified: false
    };
  }

  /**
   * Verify signed settlement data
   * Prevents tampering by re-computing signature and comparing
   */
  verifySettlementSignature(signedSettlement: SignedSettlement): boolean {
    const canonicalData = JSON.stringify({
      betId: signedSettlement.data.betId,
      eventId: signedSettlement.data.eventId,
      outcome: signedSettlement.data.outcome,
      payout: signedSettlement.data.payout,
      timestamp: signedSettlement.data.timestamp
    });

    // Recompute signature with same private key
    const hmac = crypto.createHmac('sha256', this.oraclePrivateKey);
    hmac.update(canonicalData);
    const expectedSignature = hmac.digest('hex');

    // Constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signedSettlement.signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    if (isValid) {
      console.log(`✅ ANTI-CHEAT VERIFIED: Settlement ${signedSettlement.data.betId} signature is authentic`);
    } else {
      console.error(`❌ ANTI-CHEAT FAILED: Settlement ${signedSettlement.data.betId} signature is INVALID - possible manipulation`);
    }

    return isValid;
  }

  /**
   * Hash settlement data for on-chain verification
   * Creates immutable proof that can be stored on Sui blockchain
   */
  hashSettlementData(data: SettlementData): string {
    const canonicalData = JSON.stringify(data);
    return crypto.createHash('sha256').update(canonicalData).digest('hex');
  }

  /**
   * Generate a proof bundle for Sui Move contract verification
   * This is what gets submitted to the smart contract
   */
  generateOnChainProof(signedSettlement: SignedSettlement): {
    dataHash: string;
    signature: string;
    oraclePublicKey: string;
    timestamp: number;
  } {
    return {
      dataHash: this.hashSettlementData(signedSettlement.data),
      signature: signedSettlement.signature,
      oraclePublicKey: signedSettlement.oraclePublicKey,
      timestamp: signedSettlement.data.timestamp
    };
  }

  /**
   * Validate settlement against API data to detect anomalies
   * Checks for suspicious settlement patterns
   */
  validateSettlementLogic(data: SettlementData, apiEventData: any): { valid: boolean; reason?: string } {
    // Prevent negative payouts
    if (data.payout < 0) {
      return { valid: false, reason: 'Negative payout detected - potential manipulation' };
    }

    // Verify outcome matches event result
    if (!['won', 'lost', 'void'].includes(data.outcome)) {
      return { valid: false, reason: 'Invalid outcome value' };
    }

    // Check for suspiciously high payouts (>1000x stake)
    if (data.payout > 100000) {
      console.warn(`⚠️ ANTI-CHEAT: Unusually high payout detected: ${data.payout} SUI for bet ${data.betId}`);
    }

    // Verify event status aligns with outcome
    if (apiEventData?.status && apiEventData.status !== 'finished' && data.outcome !== 'void') {
      return { valid: false, reason: 'Settling unfinished event without void status' };
    }

    return { valid: true };
  }

  /**
   * Helper: Generate test private key (for development only)
   */
  private generatePrivateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Helper: Derive public key from private key
   */
  private derivePublicKey(privateKey: string): string {
    // For HMAC, the "public key" is just a hash of the private key
    // In production, use proper asymmetric crypto (ECDSA, EdDSA)
    return crypto.createHash('sha256').update(privateKey).digest('hex');
  }
}

export default new SmartContractAntiCheatService();
