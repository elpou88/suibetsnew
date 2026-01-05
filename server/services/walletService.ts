import { SuiClient } from '@mysten/sui.js/client';
import { randomBytes } from 'crypto';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { TransactionBlock } from '@mysten/sui.js/transactions';

/**
 * Service for handling blockchain wallet interactions
 */
export class WalletService {
  private suiClient: SuiClient;
  private nonceCache: Map<string, { nonce: string, timestamp: number }> = new Map();
  
  // Wallet session expiry time (30 minutes)
  private sessionExpiry: number = 30 * 60 * 1000;
  
  constructor() {
    // Create Sui client with the appropriate network
    const network = process.env.SUI_NETWORK || 'devnet';
    const networkUrl = this.getNetworkUrl(network);
    
    this.suiClient = new SuiClient({
      url: networkUrl
    });
    
    console.log(`[WalletService] Initialized with network: ${network} (${networkUrl})`);
  }
  
  /**
   * Generate a unique nonce for wallet authentication
   */
  generateNonce(walletAddress: string): string {
    // Generate a random 16-byte hex string as nonce
    const nonce = randomBytes(16).toString('hex');
    
    // Store the nonce in the cache with timestamp
    this.nonceCache.set(walletAddress, {
      nonce,
      timestamp: Date.now()
    });
    
    return nonce;
  }
  
  /**
   * Verify a signature from a wallet
   */
  async verifySignature(
    walletAddress: string, 
    signature: string, 
    signedMessage: string
  ): Promise<boolean> {
    try {
      // Get the nonce from cache
      const cachedNonce = this.nonceCache.get(walletAddress);
      
      // Validate nonce exists and hasn't expired
      if (!cachedNonce) {
        console.error(`[WalletService] No nonce found for wallet address: ${walletAddress}`);
        return false;
      }
      
      if (Date.now() - cachedNonce.timestamp > this.sessionExpiry) {
        console.error(`[WalletService] Nonce expired for wallet address: ${walletAddress}`);
        this.nonceCache.delete(walletAddress);
        return false;
      }
      
      // In a real implementation, we would verify the signature using the Sui SDK
      // For now, we'll simplify by checking if the message contains the nonce
      const isValid = signedMessage.includes(cachedNonce.nonce);
      
      // If signature is valid, clean up the nonce
      if (isValid) {
        this.nonceCache.delete(walletAddress);
      }
      
      return isValid;
    } catch (error: any) {
      console.error(`[WalletService] Error verifying signature:`, error);
      return false;
    }
  }
  
  /**
   * Get wallet account details
   */
  async getWalletDetails(walletAddress: string): Promise<any> {
    try {
      // Get balance information for the wallet
      const balances = await this.suiClient.getBalance({
        owner: walletAddress
      });
      
      // Get coins owned by the wallet
      const coins = await this.suiClient.getCoins({
        owner: walletAddress
      });
      
      // Get owned objects
      const objects = await this.suiClient.getOwnedObjects({
        owner: walletAddress
      });
      
      return {
        address: walletAddress,
        balance: balances,
        coins: coins.data,
        objects: objects.data,
        lastUpdated: new Date().toISOString()
      };
    } catch (error: any) {
      console.error(`[WalletService] Error getting wallet details:`, error);
      throw new Error(`Failed to get wallet details: ${error.message}`);
    }
  }
  
  /**
   * Create a bet transaction
   */
  async createBetTransaction(
    walletAddress: string,
    betAmount: bigint,
    tokenType: string,
    marketId: string
  ): Promise<any> {
    try {
      // Here we would create a Sui transaction for placing a bet
      // This is a simplified example
      
      // In a real implementation, we would:
      // 1. Find the coins to use for the bet
      // 2. Create a transaction to transfer coins to the betting smart contract
      // 3. Add metadata about the bet (market ID, odds, etc.)
      
      // For now, we'll just return a placeholder transaction
      const tx = new TransactionBlock();
      
      // Add a simple transfer operation as a placeholder
      // In a real implementation, this would be a full betting transaction
      tx.transferObjects(
        [], // Coins to transfer would go here
        tx.pure(walletAddress) // Recipient of the transaction
      );
      
      return tx;
    } catch (error: any) {
      console.error(`[WalletService] Error creating bet transaction:`, error);
      throw new Error(`Failed to create bet transaction: ${error.message}`);
    }
  }
  
  /**
   * Get appropriate network URL for Sui client
   */
  private getNetworkUrl(network: string): string {
    switch (network.toLowerCase()) {
      case 'mainnet':
        return 'https://fullnode.mainnet.sui.io:443';
      case 'testnet':
        return 'https://fullnode.testnet.sui.io:443';
      case 'devnet':
        return 'https://fullnode.devnet.sui.io:443';
      case 'localnet':
        return 'http://127.0.0.1:9000';
      default:
        return 'https://fullnode.devnet.sui.io:443';
    }
  }
}

// Export singleton instance
export const walletService = new WalletService();