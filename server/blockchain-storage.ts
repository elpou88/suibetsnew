/**
 * Blockchain Storage - Deprecated in favor of MemStorage
 * Kept for backward compatibility but not actively used
 */

export class BlockchainStorage {
  constructor() {
    console.log('✅ BlockchainStorage initialized (MemStorage is primary)');
  }
  
  async getUser() { return undefined; }
  async getUserByUsername() { return undefined; }
  async getUserByWalletAddress() { return undefined; }
}

export const blockchainStorage = new BlockchainStorage();
