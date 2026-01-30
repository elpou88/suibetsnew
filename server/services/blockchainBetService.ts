import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

const SBETS_PACKAGE_ID = process.env.SBETS_TOKEN_ADDRESS?.split('::')[0] || '0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285';
const SBETS_COIN_TYPE = process.env.SBETS_TOKEN_ADDRESS || `${SBETS_PACKAGE_ID}::sbets::SBETS`;
// Contract addresses - redeployed January 29, 2026 with SHARED OBJECT fix for settlements
const BETTING_PACKAGE_ID = process.env.BETTING_PACKAGE_ID || '0x737324ddac9fb96e3d7ffab524f5489c1a0b3e5b4bffa2f244303005001b4ada';
const BETTING_PLATFORM_ID = process.env.BETTING_PLATFORM_ID || '0x5fc1073c9533c6737fa3a0882055d1778602681df70bdabde96b0127b588f082';
const ADMIN_CAP_ID = process.env.ADMIN_CAP_ID || '0xf51a04becf8c215dee71c9b92a063e4c5ef1ebc2fc3fad0797196895f8589296';
// Admin wallet that owns AdminCap - MUST match the wallet that deployed the contract
const ADMIN_WALLET = process.env.ADMIN_WALLET_ADDRESS || '0x20850db591c4d575b5238baf975e54580d800e69b8b5b421de796a311d3bea50';
const PLATFORM_REVENUE_WALLET = process.env.PLATFORM_REVENUE_WALLET || ADMIN_WALLET;
const REVENUE_WALLET = process.env.REVENUE_WALLET_ADDRESS || ADMIN_WALLET;
// SECURITY: ADMIN_PRIVATE_KEY must be stored as encrypted secret on Railway/production
// NEVER log, expose, or commit this value. Used only for on-chain payouts.
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

// Validate configuration on startup
if (!BETTING_PACKAGE_ID || !BETTING_PLATFORM_ID) {
  console.warn('⚠️ BETTING_PACKAGE_ID or BETTING_PLATFORM_ID not set - on-chain betting disabled');
}
console.log(`📦 Betting Package ID: ${BETTING_PACKAGE_ID}`);
console.log(`🏛️ Platform Object ID: ${BETTING_PLATFORM_ID}`);
console.log(`🎫 Admin Cap ID: ${ADMIN_CAP_ID || 'NOT SET'}`);
console.log(`👤 Admin Wallet: ${ADMIN_WALLET}`);

// SECURITY: Only log existence, never the key itself
if (ADMIN_PRIVATE_KEY) {
  console.log(`🔐 Admin Private Key: CONFIGURED (length: ${ADMIN_PRIVATE_KEY.length})`);
} else {
  console.warn('⚠️ ADMIN_PRIVATE_KEY not set - on-chain payouts/withdrawals will be disabled');
  console.warn('   To enable: Add ADMIN_PRIVATE_KEY as a secret on Railway');
}

export interface OnChainBet {
  betId: string;
  walletAddress: string;
  eventId: string;
  prediction: string;
  betAmount: number;
  odds: number;
  potentialPayout: number;
  txHash: string;
  blockHeight?: number;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'settled' | 'failed';
}

export interface TransactionPayload {
  target: string;
  arguments: any[];
  typeArguments?: string[];
}

export class BlockchainBetService {
  private client: SuiClient;
  private network: 'mainnet' | 'testnet' | 'devnet';

  constructor() {
    this.network = (process.env.SUI_NETWORK as 'mainnet' | 'testnet' | 'devnet') || 'mainnet';
    this.client = new SuiClient({ url: getFullnodeUrl(this.network) });
    console.log(`BlockchainBetService initialized on ${this.network}`);
  }

  async buildBetTransaction(
    walletAddress: string,
    eventId: string,
    prediction: string,
    betAmount: number,
    odds: number,
    marketId: string = 'match_winner',
    walrusBlobId: string = ''
  ): Promise<TransactionPayload> {
    const oddsInBps = Math.floor(odds * 100);

    // Full contract signature: place_bet(platform, payment, event_id, market_id, prediction, odds, walrus_blob_id, clock)
    // Note: payment coin must be constructed by caller, clock is 0x6
    return {
      target: `${BETTING_PACKAGE_ID}::betting::place_bet`,
      arguments: [
        BETTING_PLATFORM_ID,
        // payment coin must be added by caller
        Array.from(new TextEncoder().encode(eventId)),
        Array.from(new TextEncoder().encode(marketId)),
        Array.from(new TextEncoder().encode(prediction)),
        oddsInBps,
        Array.from(new TextEncoder().encode(walrusBlobId)),
        '0x6', // clock object
      ],
      typeArguments: []
    };
  }

  buildClientTransaction(
    eventId: string,
    prediction: string,
    betAmountMist: number,
    odds: number,
    marketId: string,
    walrusBlobId: string
  ): {
    packageId: string;
    module: string;
    function: string;
    platformId: string;
    betAmountMist: number;
    clockObjectId: string;
    moveCallArgs: {
      platform: string;
      eventId: number[];
      marketId: number[];
      prediction: number[];
      oddsBps: number;
      walrusBlobId: number[];
    };
    instructions: string;
  } {
    return {
      packageId: BETTING_PACKAGE_ID,
      module: 'betting',
      function: 'place_bet',
      platformId: BETTING_PLATFORM_ID,
      betAmountMist,
      clockObjectId: '0x6',
      moveCallArgs: {
        platform: BETTING_PLATFORM_ID,
        eventId: Array.from(new TextEncoder().encode(eventId)),
        marketId: Array.from(new TextEncoder().encode(marketId)),
        prediction: Array.from(new TextEncoder().encode(prediction)),
        oddsBps: Math.floor(odds * 100),
        walrusBlobId: Array.from(new TextEncoder().encode(walrusBlobId)),
      },
      instructions: `
        1. Split ${betAmountMist} MIST from your SUI coins
        2. Call ${BETTING_PACKAGE_ID}::betting::place_bet with:
           - platform: ${BETTING_PLATFORM_ID} (shared object)
           - payment: [split coin]
           - event_id: [encoded bytes]
           - market_id: [encoded bytes]
           - prediction: [encoded bytes]
           - odds: ${Math.floor(odds * 100)} (in basis points)
           - walrus_blob_id: [encoded bytes]
           - clock: 0x6
      `.trim()
    };
  }

  async buildSettlementTransaction(
    betId: string,
    betObjectId: string,
    won: boolean
  ): Promise<TransactionPayload> {
    // Full contract signature: settle_bet_admin(admin_cap, platform, bet, won, clock)
    return {
      target: `${BETTING_PACKAGE_ID}::betting::settle_bet_admin`,
      arguments: [
        BETTING_PLATFORM_ID,
        betObjectId,
        won,
        '0x6', // clock object
      ],
      typeArguments: []
    };
  }

  getBettingPlatformId(): string {
    return BETTING_PLATFORM_ID;
  }

  async verifyTransaction(txHash: string): Promise<{
    confirmed: boolean;
    blockHeight?: number;
    timestamp?: number;
    effects?: any;
  }> {
    try {
      const txResponse = await this.client.getTransactionBlock({
        digest: txHash,
        options: {
          showEffects: true,
          showEvents: true
        }
      });

      if (txResponse && txResponse.effects) {
        return {
          confirmed: txResponse.effects.status?.status === 'success',
          blockHeight: parseInt(txResponse.checkpoint || '0'),
          timestamp: parseInt(txResponse.timestampMs || '0'),
          effects: txResponse.effects
        };
      }

      return { confirmed: false };
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return { confirmed: false };
    }
  }

  async getWalletBalance(walletAddress: string): Promise<{
    sui: number;
    sbets: number;
  }> {
    try {
      const suiBalance = await this.client.getBalance({
        owner: walletAddress,
        coinType: '0x2::sui::SUI'
      });

      let sbetsBalance = { totalBalance: '0' };
      try {
        sbetsBalance = await this.client.getBalance({
          owner: walletAddress,
          coinType: `${SBETS_PACKAGE_ID}::sbets::SBETS`
        });
      } catch (e) {
      }

      return {
        sui: parseInt(suiBalance.totalBalance) / 1e9,
        sbets: parseInt(sbetsBalance.totalBalance) / 1e9
      };
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return { sui: 0, sbets: 0 };
    }
  }

  async recordBetOnChain(bet: {
    betId: string;
    walletAddress: string;
    eventId: string;
    prediction: string;
    betAmount: number;
    odds: number;
    txHash: string;
  }): Promise<OnChainBet> {
    const onChainBet: OnChainBet = {
      betId: bet.betId,
      walletAddress: bet.walletAddress,
      eventId: bet.eventId,
      prediction: bet.prediction,
      betAmount: bet.betAmount,
      odds: bet.odds,
      potentialPayout: bet.betAmount * bet.odds,
      txHash: bet.txHash,
      timestamp: Date.now(),
      status: 'pending'
    };

    if (bet.txHash && bet.txHash.startsWith('0x') && bet.txHash.length > 10) {
      const verification = await this.verifyTransaction(bet.txHash);
      if (verification.confirmed) {
        onChainBet.status = 'confirmed';
        onChainBet.blockHeight = verification.blockHeight;
      }
    }

    console.log(`📦 ON-CHAIN BET RECORDED: ${bet.betId} | ${bet.walletAddress.slice(0, 8)}... | ${bet.betAmount} SUI @ ${bet.odds}x`);

    return onChainBet;
  }

  async getOnChainBetStatus(txHash: string): Promise<'pending' | 'confirmed' | 'failed'> {
    const verification = await this.verifyTransaction(txHash);
    if (verification.confirmed) {
      return 'confirmed';
    }
    return 'pending';
  }

  getPackageId(): string {
    return SBETS_PACKAGE_ID;
  }

  getBettingPackageId(): string {
    return BETTING_PACKAGE_ID;
  }

  getRevenueWallet(): string {
    return REVENUE_WALLET;
  }

  getAdminWallet(): string {
    return ADMIN_WALLET;
  }

  // Check if admin key is configured for on-chain payouts
  isAdminKeyConfigured(): boolean {
    return !!ADMIN_PRIVATE_KEY && ADMIN_PRIVATE_KEY.length > 0;
  }

  // Get admin keypair from private key (for on-chain transactions)
  // Sui SDK's Ed25519Keypair.fromSecretKey expects the 32-byte secret seed
  private getAdminKeypair(): Ed25519Keypair | null {
    if (!ADMIN_PRIVATE_KEY) {
      console.warn('⚠️ ADMIN_PRIVATE_KEY not configured - on-chain payouts disabled');
      return null;
    }
    
    try {
      let keyBytes: Uint8Array;
      
      // Support multiple formats: hex, base64, or Sui bech32 format
      if (ADMIN_PRIVATE_KEY.startsWith('suiprivkey')) {
        // Sui bech32 format - use decodeSuiPrivateKey
        try {
          const decoded = decodeSuiPrivateKey(ADMIN_PRIVATE_KEY);
          return Ed25519Keypair.fromSecretKey(decoded.secretKey);
        } catch (e) {
          console.error('❌ Failed to parse Sui bech32 private key:', e);
          return null;
        }
      } else if (ADMIN_PRIVATE_KEY.startsWith('0x')) {
        // Hex format
        const hexKey = ADMIN_PRIVATE_KEY.slice(2);
        keyBytes = new Uint8Array(Buffer.from(hexKey, 'hex'));
      } else {
        // Assume base64 encoding
        keyBytes = new Uint8Array(Buffer.from(ADMIN_PRIVATE_KEY, 'base64'));
      }
      
      // Handle different key formats:
      // - 32 bytes: raw secret seed (ready to use)
      // - 33 bytes: 1 scheme byte + 32 secret seed (strip scheme)
      // - 64 bytes: 32 secret + 32 public (use first 32)
      // - 65 bytes: 1 scheme + 32 secret + 32 public (strip scheme, use first 32)
      
      if (keyBytes.length === 33 && keyBytes[0] === 0) {
        // Strip the scheme byte prefix (0x00 for Ed25519)
        keyBytes = keyBytes.slice(1);
      } else if (keyBytes.length === 65 && keyBytes[0] === 0) {
        // Strip scheme byte and take first 32 bytes (secret seed)
        keyBytes = keyBytes.slice(1, 33);
      } else if (keyBytes.length === 64) {
        // Full keypair format (secret + public), take only first 32 bytes
        keyBytes = keyBytes.slice(0, 32);
      }
      
      if (keyBytes.length !== 32) {
        console.error(`❌ Invalid private key length: ${keyBytes.length} (expected 32 bytes)`);
        console.error('   Supported formats: 32-byte raw seed, 33-byte with scheme prefix, or suiprivkey bech32');
        return null;
      }
      
      const keypair = Ed25519Keypair.fromSecretKey(keyBytes);
      console.log(`✅ Admin keypair loaded: ${keypair.toSuiAddress().slice(0, 12)}...`);
      return keypair;
    } catch (error) {
      console.error('❌ Failed to parse ADMIN_PRIVATE_KEY:', error);
      return null;
    }
  }

  // Execute on-chain SUI payout to user (for withdrawals)
  // Returns explicit error if keypair loading fails
  async executePayoutOnChain(
    recipientAddress: string,
    amountSui: number
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const keypair = this.getAdminKeypair();
    if (!keypair) {
      const error = 'Admin private key not configured or invalid format';
      console.error(`❌ PAYOUT BLOCKED: ${error}`);
      return { success: false, error };
    }

    try {
      const amountMist = Math.floor(amountSui * 1e9);
      
      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [amountMist]);
      tx.transferObjects([coin], recipientAddress);

      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        console.log(`✅ ON-CHAIN PAYOUT: ${amountSui} SUI to ${recipientAddress} | TX: ${result.digest}`);
        return { success: true, txHash: result.digest };
      } else {
        console.error(`❌ PAYOUT FAILED: ${result.effects?.status?.error || 'Unknown error'}`);
        return { success: false, error: result.effects?.status?.error || 'Transaction failed' };
      }
    } catch (error: any) {
      console.error('❌ Payout execution error:', error);
      return { success: false, error: error.message || 'Failed to execute payout' };
    }
  }

  /**
   * Execute on-chain SBETS payout to recipient
   * Requires admin wallet to have SBETS tokens
   */
  async executePayoutSbetsOnChain(
    recipientAddress: string,
    amountSbets: number
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const keypair = this.getAdminKeypair();
    if (!keypair) {
      const error = 'Admin private key not configured or invalid format';
      console.error(`❌ SBETS PAYOUT BLOCKED: ${error}`);
      return { success: false, error };
    }

    try {
      const amountMist = Math.floor(amountSbets * 1e9);
      const adminAddress = keypair.toSuiAddress();
      
      // Get admin's SBETS coins
      const sbetsCoins = await this.client.getCoins({
        owner: adminAddress,
        coinType: SBETS_COIN_TYPE,
      });

      if (!sbetsCoins.data || sbetsCoins.data.length === 0) {
        return { success: false, error: 'No SBETS coins available in admin wallet' };
      }

      const tx = new Transaction();
      
      // Merge all SBETS coins if multiple exist
      if (sbetsCoins.data.length > 1) {
        const primaryCoin = tx.object(sbetsCoins.data[0].coinObjectId);
        const coinsToMerge = sbetsCoins.data.slice(1).map(c => tx.object(c.coinObjectId));
        tx.mergeCoins(primaryCoin, coinsToMerge);
        const [splitCoin] = tx.splitCoins(primaryCoin, [amountMist]);
        tx.transferObjects([splitCoin], recipientAddress);
      } else {
        const primaryCoin = tx.object(sbetsCoins.data[0].coinObjectId);
        const [splitCoin] = tx.splitCoins(primaryCoin, [amountMist]);
        tx.transferObjects([splitCoin], recipientAddress);
      }

      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        console.log(`✅ ON-CHAIN SBETS PAYOUT: ${amountSbets} SBETS to ${recipientAddress} | TX: ${result.digest}`);
        return { success: true, txHash: result.digest };
      } else {
        console.error(`❌ SBETS PAYOUT FAILED: ${result.effects?.status?.error || 'Unknown error'}`);
        return { success: false, error: result.effects?.status?.error || 'Transaction failed' };
      }
    } catch (error: any) {
      console.error('❌ SBETS Payout execution error:', error);
      return { success: false, error: error.message || 'Failed to execute SBETS payout' };
    }
  }

  private sbetsTokenType = "0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285::sbets::SBETS";

  // Get treasury balance (admin wallet balance)
  async getTreasuryBalance(): Promise<{ sui: number; sbets: number }> {
    return this.getWalletBalance(PLATFORM_REVENUE_WALLET);
  }

  /**
   * Execute on-chain bet settlement via smart contract
   * Calls the settle_bet function which pays winners directly from contract treasury
   * @param betObjectId - The on-chain Bet object ID
   * @param won - Whether the bet won or lost
   * @returns Transaction result with hash or error
   */
  async executeSettleBetOnChain(
    betObjectId: string,
    won: boolean
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const keypair = this.getAdminKeypair();
    if (!keypair) {
      const error = 'Admin private key not configured - cannot execute on-chain settlement';
      console.error(`❌ SETTLEMENT BLOCKED: ${error}`);
      return { success: false, error };
    }

    // Signer safety fix: Always use admin keypair
    if (!ADMIN_CAP_ID) {
      const error = 'ADMIN_CAP_ID not configured - cannot execute on-chain settlement with capability pattern';
      console.error(`❌ SETTLEMENT BLOCKED: ${error}`);
      return { success: false, error };
    }

    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${BETTING_PACKAGE_ID}::betting::settle_bet_admin`,
        arguments: [
          tx.object(ADMIN_CAP_ID),          // admin_cap: &AdminCap (owned by signer)
          tx.object(BETTING_PLATFORM_ID),   // platform: &mut Platform
          tx.object(betObjectId),           // bet: &mut Bet (shared object)
          tx.pure.bool(won),                // won: bool
          tx.object('0x6'),                 // clock: &Clock
        ],
      });

      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        const outcome = won ? 'WON (payout sent)' : 'LOST (stake kept in treasury)';
        console.log(`✅ ON-CHAIN SETTLEMENT: Bet ${betObjectId.slice(0, 12)}... ${outcome} | TX: ${result.digest}`);
        return { success: true, txHash: result.digest };
      } else {
        const errorMsg = result.effects?.status?.error || 'Unknown error';
        console.error(`❌ ON-CHAIN SETTLEMENT FAILED: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      console.error('❌ Settlement execution error:', error);
      return { success: false, error: error.message || 'Failed to execute on-chain settlement' };
    }
  }

  /**
   * Execute on-chain bet void via smart contract
   * Calls the void_bet function which refunds the bettor
   * @param betObjectId - The on-chain Bet object ID
   * @returns Transaction result with hash or error
   */
  async executeVoidBetOnChain(
    betObjectId: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const keypair = this.getAdminKeypair();
    if (!keypair) {
      const error = 'Admin private key not configured - cannot execute on-chain void';
      console.error(`❌ VOID BLOCKED: ${error}`);
      return { success: false, error };
    }

    if (!ADMIN_CAP_ID) {
      return { success: false, error: 'ADMIN_CAP_ID not configured' };
    }

    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${BETTING_PACKAGE_ID}::betting::void_bet`,
        arguments: [
          tx.object(ADMIN_CAP_ID),          // admin_cap: &AdminCap
          tx.object(BETTING_PLATFORM_ID),   // platform: &mut BettingPlatform
          tx.object(betObjectId),           // bet: &mut Bet
          tx.object('0x6'),                 // clock: &Clock
        ],
      });

      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        console.log(`✅ ON-CHAIN VOID: Bet ${betObjectId.slice(0, 12)}... refunded | TX: ${result.digest}`);
        return { success: true, txHash: result.digest };
      } else {
        const errorMsg = result.effects?.status?.error || 'Unknown error';
        console.error(`❌ ON-CHAIN VOID FAILED: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      console.error('❌ Void execution error:', error);
      return { success: false, error: error.message || 'Failed to execute on-chain void' };
    }
  }

  /**
   * Withdraw accrued fees from contract to admin wallet
   * @param amountSui - Amount of SUI to withdraw
   * @returns Transaction result
   */
  async withdrawFeesOnChain(
    amountSui: number,
    recipientAddress?: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const keypair = this.getAdminKeypair();
    if (!keypair) {
      return { success: false, error: 'Admin private key not configured' };
    }

    if (!ADMIN_CAP_ID) {
      return { success: false, error: 'ADMIN_CAP_ID not configured' };
    }

    try {
      const amountMist = Math.floor(amountSui * 1e9);
      const tx = new Transaction();
      
      // withdraw_fees signature: (admin_cap, platform, amount, clock)
      // Fees go to tx sender (the admin keypair) automatically
      tx.moveCall({
        target: `${BETTING_PACKAGE_ID}::betting::withdraw_fees`,
        arguments: [
          tx.object(ADMIN_CAP_ID),          // admin_cap: &AdminCap
          tx.object(BETTING_PLATFORM_ID),   // platform: &mut BettingPlatform
          tx.pure.u64(amountMist),          // amount: u64
          tx.object('0x6'),                 // clock: &Clock
        ],
      });

      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: { showEffects: true },
      });

      if (result.effects?.status?.status === 'success') {
        console.log(`✅ FEES WITHDRAWN: ${amountSui} SUI | TX: ${result.digest}`);
        return { success: true, txHash: result.digest };
      } else {
        return { success: false, error: result.effects?.status?.error || 'Failed' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute on-chain SBETS bet settlement via smart contract
   * Calls the settle_bet_sbets function for SBETS bets
   * @param betObjectId - The on-chain Bet object ID
   * @param won - Whether the bet won or lost
   * @returns Transaction result with hash or error
   */
  async executeSettleBetSbetsOnChain(
    betObjectId: string,
    won: boolean
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const keypair = this.getAdminKeypair();
    if (!keypair) {
      const error = 'Admin private key not configured - cannot execute on-chain SBETS settlement';
      console.error(`❌ SBETS SETTLEMENT BLOCKED: ${error}`);
      return { success: false, error };
    }

    // Signer safety fix: Always use admin keypair
    if (!ADMIN_CAP_ID) {
      const error = 'ADMIN_CAP_ID not configured - cannot execute on-chain SBETS settlement';
      console.error(`❌ SBETS SETTLEMENT BLOCKED: ${error}`);
      return { success: false, error };
    }

    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${BETTING_PACKAGE_ID}::betting::settle_bet_sbets_admin`,
        arguments: [
          tx.object(ADMIN_CAP_ID),          // admin_cap: &AdminCap
          tx.object(BETTING_PLATFORM_ID),
          tx.object(betObjectId),
          tx.pure.bool(won),
          tx.object('0x6'),
        ],
      });

      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        const outcome = won ? 'WON (SBETS payout sent)' : 'LOST (SBETS stake kept in treasury)';
        console.log(`✅ ON-CHAIN SBETS SETTLEMENT: Bet ${betObjectId.slice(0, 12)}... ${outcome} | TX: ${result.digest}`);
        return { success: true, txHash: result.digest };
      } else {
        const errorMsg = result.effects?.status?.error || 'Unknown error';
        console.error(`❌ ON-CHAIN SBETS SETTLEMENT FAILED: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      console.error('❌ SBETS Settlement execution error:', error);
      return { success: false, error: error.message || 'Failed to execute on-chain SBETS settlement' };
    }
  }

  /**
   * Execute on-chain SBETS bet void via smart contract
   * @param betObjectId - The on-chain Bet object ID
   * @returns Transaction result with hash or error
   */
  async executeVoidBetSbetsOnChain(
    betObjectId: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const keypair = this.getAdminKeypair();
    if (!keypair) {
      return { success: false, error: 'Admin private key not configured' };
    }

    if (!ADMIN_CAP_ID) {
      return { success: false, error: 'ADMIN_CAP_ID not configured' };
    }

    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${BETTING_PACKAGE_ID}::betting::void_bet_sbets_admin`,
        arguments: [
          tx.object(ADMIN_CAP_ID),          // admin_cap: &AdminCap
          tx.object(BETTING_PLATFORM_ID),
          tx.object(betObjectId),
          tx.object('0x6'),
        ],
      });

      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: { showEffects: true },
      });

      if (result.effects?.status?.status === 'success') {
        console.log(`✅ ON-CHAIN SBETS VOID: Bet ${betObjectId.slice(0, 12)}... refunded | TX: ${result.digest}`);
        return { success: true, txHash: result.digest };
      } else {
        return { success: false, error: result.effects?.status?.error || 'Failed' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Withdraw SBETS fees from contract to admin wallet
   * @param amount - Amount of SBETS to withdraw
   * @returns Transaction result
   */
  async withdrawFeesSbetsOnChain(
    amount: number,
    recipientAddress?: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const keypair = this.getAdminKeypair();
    if (!keypair) {
      return { success: false, error: 'Admin private key not configured' };
    }

    if (!ADMIN_CAP_ID) {
      return { success: false, error: 'ADMIN_CAP_ID not configured' };
    }

    try {
      const amountMist = Math.floor(amount * 1e9);
      const tx = new Transaction();
      
      // withdraw_fees_sbets signature: (admin_cap, platform, amount, clock)
      // Fees go to tx sender (the admin keypair) automatically
      tx.moveCall({
        target: `${BETTING_PACKAGE_ID}::betting::withdraw_fees_sbets`,
        arguments: [
          tx.object(ADMIN_CAP_ID),          // admin_cap: &AdminCap
          tx.object(BETTING_PLATFORM_ID),   // platform: &mut BettingPlatform
          tx.pure.u64(amountMist),          // amount: u64
          tx.object('0x6'),                 // clock: &Clock
        ],
      });

      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: { showEffects: true },
      });

      if (result.effects?.status?.status === 'success') {
        console.log(`✅ SBETS FEES WITHDRAWN: ${amount} SBETS | TX: ${result.digest}`);
        return { success: true, txHash: result.digest };
      } else {
        return { success: false, error: result.effects?.status?.error || 'Failed' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SUI directly from admin wallet (funded from treasury) to user's wallet
   * Used for DB settlement payouts when on-chain settlement isn't possible
   * Admin wallet should be funded via treasury withdrawals
   * @param recipientAddress - User's wallet address
   * @param amount - Amount in SUI (not MIST)
   * @returns Transaction result
   */
  async sendSuiToUser(recipientAddress: string, amount: number): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const keypair = this.getAdminKeypair();
      if (!keypair) {
        return { success: false, error: 'Admin keypair not configured' };
      }

      if (amount <= 0) {
        return { success: false, error: 'Amount must be positive' };
      }

      const amountInMist = BigInt(Math.floor(amount * 1e9));
      const tx = new Transaction();
      
      // Split SUI from admin wallet (treasury-funded) and transfer to user
      const [coin] = tx.splitCoins(tx.gas, [amountInMist]);
      tx.transferObjects([coin], recipientAddress);

      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: { showEffects: true },
      });

      if (result.effects?.status?.status === 'success') {
        console.log(`💸 SUI PAYOUT (from treasury funds): ${amount} SUI -> ${recipientAddress.slice(0,10)}... | TX: ${result.digest}`);
        return { success: true, txHash: result.digest };
      } else {
        return { success: false, error: result.effects?.status?.error || 'Transaction failed' };
      }
    } catch (error: any) {
      console.error(`❌ Failed to send SUI payout:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SBETS directly from admin wallet (funded from treasury) to user's wallet
   * Used for DB settlement payouts when on-chain settlement isn't possible
   * Admin wallet should be funded via treasury withdrawals
   * @param recipientAddress - User's wallet address  
   * @param amount - Amount in SBETS (not smallest unit)
   * @returns Transaction result
   */
  async sendSbetsToUser(recipientAddress: string, amount: number): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const keypair = this.getAdminKeypair();
      if (!keypair) {
        return { success: false, error: 'Admin keypair not configured' };
      }

      if (amount <= 0) {
        return { success: false, error: 'Amount must be positive' };
      }

      const amountInSmallest = BigInt(Math.floor(amount * 1_000_000_000)); // SBETS has 9 decimals (like SUI)
      const tx = new Transaction();

      // Get admin's SBETS coins (funded from treasury)
      const coins = await this.client.getCoins({
        owner: keypair.toSuiAddress(),
        coinType: this.sbetsTokenType,
      });

      if (!coins.data || coins.data.length === 0) {
        return { success: false, error: 'No SBETS in admin wallet - needs treasury funding' };
      }

      // Check total balance
      const totalBalance = coins.data.reduce((sum, c) => sum + BigInt(c.balance), BigInt(0));
      if (totalBalance < amountInSmallest) {
        return { success: false, error: `Insufficient SBETS in admin wallet: ${Number(totalBalance) / 1_000_000_000} < ${amount}` };
      }

      // Merge all SBETS coins if needed
      const coinIds = coins.data.map(c => c.coinObjectId);
      if (coinIds.length > 1) {
        tx.mergeCoins(coinIds[0], coinIds.slice(1));
      }

      // Split and transfer
      const [paymentCoin] = tx.splitCoins(coinIds[0], [amountInSmallest]);
      tx.transferObjects([paymentCoin], recipientAddress);

      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: { showEffects: true },
      });

      if (result.effects?.status?.status === 'success') {
        console.log(`💸 SBETS PAYOUT (from treasury funds): ${amount} SBETS -> ${recipientAddress.slice(0,10)}... | TX: ${result.digest}`);
        return { success: true, txHash: result.digest };
      } else {
        return { success: false, error: result.effects?.status?.error || 'Transaction failed' };
      }
    } catch (error: any) {
      console.error(`❌ Failed to send SBETS payout:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check on-chain bet status to avoid settling already-settled bets
   * Returns the bet status from the blockchain, or null if bet not found
   * @param betObjectId - The on-chain Bet object ID
   * @returns Bet status info or null
   */
  async getOnChainBetInfo(betObjectId: string): Promise<{
    settled: boolean;
    status: string;
    amount: number;
    potentialPayout: number;
    eventId?: string;
    marketId?: string;
    prediction?: string;
    odds?: number;
    bettor?: string;
    coinType?: string;
    placedAt?: number;
    settledAt?: number;
    platformFee?: number;
  } | null> {
    try {
      const betObj = await this.client.getObject({
        id: betObjectId,
        options: { showContent: true },
      });

      if (betObj.data?.content?.dataType === 'moveObject') {
        const fields = (betObj.data.content as any).fields;
        
        // Check the 'status' field in the bet object (0=pending, 1=won, 2=lost, 3=void)
        const statusCode = parseInt(fields.status || '0');
        const settled = statusCode !== 0; // Any non-pending status means settled
        const status = statusCode === 0 ? 'pending' : statusCode === 1 ? 'won' : statusCode === 2 ? 'lost' : 'void';
        const amount = parseInt(fields.amount || fields.stake || '0') / 1e9;
        const potentialPayout = parseInt(fields.potential_payout || '0') / 1e9;
        
        // Decode vector<u8> fields to strings
        const decodeVectorToString = (arr: number[] | undefined): string | undefined => {
          if (!arr || !Array.isArray(arr)) return undefined;
          try {
            return String.fromCharCode(...arr);
          } catch {
            return undefined;
          }
        };
        
        const eventId = decodeVectorToString(fields.event_id);
        const marketId = decodeVectorToString(fields.market_id);
        const prediction = decodeVectorToString(fields.prediction);
        const odds = fields.odds ? parseInt(fields.odds) / 100 : undefined; // Convert from basis points
        const bettor = fields.bettor;
        const coinTypeCode = parseInt(fields.coin_type || '0');
        const coinType = coinTypeCode === 0 ? 'SUI' : 'SBETS';
        const placedAt = fields.placed_at ? parseInt(fields.placed_at) : undefined;
        const settledAt = fields.settled_at ? parseInt(fields.settled_at) : undefined;
        const platformFee = fields.platform_fee ? parseInt(fields.platform_fee) / 1e9 : undefined;
        
        console.log(`[OnChainBet] ${betObjectId.slice(0, 12)}... status=${status} (code=${statusCode}), settled=${settled}, amount=${amount}, prediction=${prediction}`);
        
        return {
          settled,
          status,
          amount,
          potentialPayout,
          eventId,
          marketId,
          prediction,
          odds,
          bettor,
          coinType,
          placedAt,
          settledAt,
          platformFee
        };
      }
      
      console.warn(`[OnChainBet] ${betObjectId.slice(0, 12)}... not found or not a move object`);
      return null;
    } catch (error: any) {
      console.error(`[OnChainBet] Error fetching bet ${betObjectId}:`, error.message);
      return null;
    }
  }

  /**
   * Get platform contract info (treasury balance, stats) - dual treasury
   */
  async getPlatformInfo(): Promise<{
    treasuryBalanceSui: number;
    treasuryBalanceSbets: number;
    totalBets: number;
    totalVolumeSui: number;
    totalVolumeSbets: number;
    totalLiabilitySui: number;
    totalLiabilitySbets: number;
    accruedFeesSui: number;
    accruedFeesSbets: number;
    paused: boolean;
  } | null> {
    try {
      const platformObj = await this.client.getObject({
        id: BETTING_PLATFORM_ID,
        options: { showContent: true },
      });

      if (platformObj.data?.content?.dataType === 'moveObject') {
        const fields = (platformObj.data.content as any).fields;
        
        // Debug: log the raw fields structure
        console.log('[BlockchainBetService] Platform fields treasury_sui:', fields.treasury_sui);
        console.log('[BlockchainBetService] Platform fields treasury_sbets:', fields.treasury_sbets);
        
        // Balance objects in Sui can be stored as direct numbers or nested in .fields.value
        // Try both formats for compatibility
        const getTreasuryValue = (field: any): number => {
          if (!field) return 0;
          // Direct number format
          if (typeof field === 'string' || typeof field === 'number') {
            return parseInt(String(field)) / 1e9;
          }
          // Nested .fields.value format (Balance object)
          if (field?.fields?.value) {
            return parseInt(field.fields.value) / 1e9;
          }
          return 0;
        };
        
        return {
          treasuryBalanceSui: getTreasuryValue(fields.treasury_sui),
          treasuryBalanceSbets: getTreasuryValue(fields.treasury_sbets),
          totalBets: parseInt(fields.total_bets || '0'),
          totalVolumeSui: parseInt(fields.total_volume_sui || '0') / 1e9,
          totalVolumeSbets: parseInt(fields.total_volume_sbets || '0') / 1e9,
          totalLiabilitySui: parseInt(fields.total_potential_liability_sui || '0') / 1e9,
          totalLiabilitySbets: parseInt(fields.total_potential_liability_sbets || '0') / 1e9,
          accruedFeesSui: parseInt(fields.accrued_fees_sui || '0') / 1e9,
          accruedFeesSbets: parseInt(fields.accrued_fees_sbets || '0') / 1e9,
          paused: fields.paused || false,
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get platform info:', error);
      return null;
    }
  }

  /**
   * Sync on-chain bets to database - finds bets placed directly on contract that aren't tracked
   */
  async syncOnChainBetsToDatabase(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      console.log('🔄 Starting on-chain bet sync...');

      // Query all BetPlaced events from the smart contract
      const eventsResponse = await this.client.queryEvents({
        query: {
          MoveEventType: `${BETTING_PACKAGE_ID}::betting::BetPlaced`
        },
        limit: 100,
        order: 'descending'
      });

      console.log(`📊 Found ${eventsResponse.data.length} BetPlaced events on-chain`);

      for (const event of eventsResponse.data) {
        try {
          const parsed = event.parsedJson as any;
          const betObjectId = parsed.bet_id;
          const bettor = parsed.bettor;
          const stake = parseInt(parsed.stake) / 1e9;
          const odds = parseInt(parsed.odds) / 100;
          const potentialPayout = parseInt(parsed.potential_payout) / 1e9;
          const coinType = parsed.coin_type === 0 ? 'SUI' : 'SBETS';
          const timestamp = parseInt(parsed.timestamp);
          
          // Decode vector<u8> fields to strings
          const decodeBytes = (arr: number[] | undefined): string => {
            if (!arr || !Array.isArray(arr)) return 'Unknown';
            try {
              return Buffer.from(arr).toString('utf8');
            } catch (e) {
              return 'Error decoding';
            }
          };

          const prediction = decodeBytes(parsed.prediction);
          const market = decodeBytes(parsed.market);
          
          // Try to extract event info from prediction or market
          let eventName = "Unknown Event";
          let homeTeam = "Unknown";
          let awayTeam = "Unknown";
          
          // Improved extraction logic for synchronized bets
          if (prediction && prediction.includes(" vs ")) {
            const parts = prediction.split(":");
            eventName = parts[0].trim();
            const teams = eventName.split(" vs ");
            homeTeam = teams[0]?.trim() || "Unknown";
            awayTeam = teams[1]?.trim() || "Unknown";
          } else if (market && market.includes(" vs ")) {
            eventName = market.split(":")[0].trim();
            const teams = eventName.split(" vs ");
            homeTeam = teams[0]?.trim() || "Unknown";
            awayTeam = teams[1]?.trim() || "Unknown";
          }
          
          // Decode event_id from byte arrays
          const eventId = decodeBytes(parsed.event_id as number[]);

          // Check if this bet already exists in database by bet_object_id
          const { storage } = await import('../storage');
          const existingBets = await storage.getBetsByBetObjectId(betObjectId);
          
          if (existingBets && existingBets.length > 0) {
            continue; // Already tracked
          }

          // CRITICAL: Check if bet object is SHARED (new contract) or OWNED (legacy contract)
          // Legacy bets from before Jan 27, 2026 are owned objects and cannot be settled by admin
          try {
            const betObj = await this.client.getObject({
              id: betObjectId,
              options: { showOwner: true }
            });
            
            const owner = betObj.data?.owner;
            // If owner is an address (not "Shared"), this is a legacy owned bet - skip it
            if (owner && typeof owner === 'object' && 'AddressOwner' in owner) {
              console.log(`⚠️ SKIPPING legacy owned bet ${betObjectId.slice(0, 12)}... (owned by ${(owner as any).AddressOwner.slice(0, 12)}...)`);
              continue; // Skip legacy owned bets - they cannot be settled
            }
          } catch (ownerCheckError) {
            console.warn(`⚠️ Could not verify bet ownership for ${betObjectId.slice(0, 12)}..., skipping`);
            continue;
          }

          // Get current on-chain status and additional data
          const onChainInfo = await this.getOnChainBetInfo(betObjectId);
          const onChainStatus = onChainInfo?.status || 'pending';
          const marketId = onChainInfo?.marketId || 'match_winner';
          
          // Use prediction from on-chain bet object if event didn't have it
          const finalPrediction = prediction !== 'Unknown' ? prediction : (onChainInfo?.prediction || 'Unknown');

          // Create bet record in database
          const betId = `sync_${betObjectId.slice(0, 16)}_${Date.now()}`;
          const newBet = {
            id: betId,
            oddsId: `onchain_${eventId}`,
            oddsValue: odds,
            eventId: eventId,
            externalEventId: eventId,
            homeTeam: 'Unknown',
            awayTeam: 'Unknown',
            marketId: marketId,
            outcomeId: finalPrediction.toLowerCase().replace(/\s+/g, '_'),
            odds: odds,
            betAmount: stake,
            currency: coinType,
            status: onChainStatus === 'won' ? 'won' : onChainStatus === 'lost' ? 'lost' : 'confirmed',
            prediction: finalPrediction,
            placedAt: timestamp,
            potentialPayout: potentialPayout,
            platformFee: onChainInfo?.platformFee || 0,
            totalDebit: stake,
            paymentMethod: 'wallet' as const,
            onChainBetId: betObjectId,
            userId: bettor,
          };

          await storage.createBet(newBet);
          synced++;
          console.log(`✅ Synced bet ${betObjectId.slice(0, 12)}... from ${bettor.slice(0, 12)}... (${stake} ${coinType}, prediction=${finalPrediction})`);
        } catch (betError: any) {
          errors.push(`Bet sync error: ${betError.message}`);
        }
      }

      console.log(`🔄 On-chain sync complete: ${synced} bets synced, ${errors.length} errors`);
      return { synced, errors };
    } catch (error: any) {
      console.error('❌ On-chain bet sync failed:', error);
      errors.push(`Sync failed: ${error.message}`);
      return { synced, errors };
    }
  }
}

export const blockchainBetService = new BlockchainBetService();
export default blockchainBetService;
