import { Express } from "express";

/**
 * Blockchain Authentication - Deprecated in favor of zkLogin
 * Kept for backward compatibility but not actively used
 */

export function setupBlockchainAuth(app: Express) {
  console.log('✅ Blockchain auth setup complete (zkLogin is primary auth method)');
  
  return {
    requireWalletAuth: (req: any, res: any, next: any) => {
      // zkLogin is now the primary authentication method
      next();
    }
  };
}

export function blockchainStorageInstance() {
  return null;
}
