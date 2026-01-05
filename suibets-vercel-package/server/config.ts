/**
 * Configuration for the Wurlus Protocol integration with the Sui blockchain
 * Based on Wal.app documentation: 
 * - https://docs.wal.app/usage/setup.html
 * - https://docs.wal.app/dev-guide/data-security.html
 */

// Network type definition
export type SuiNetwork = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

export interface AppConfig {
  // API configuration
  api: {
    // This would be provided by Wal.app when registering as a developer
    walAppApiKey?: string;
    // This would be provided by wurlus protocol team
    wurlusApiKey?: string;
    // Base URL for Wal.app API
    walAppBaseUrl?: string;
  };
  
  // Blockchain network configuration
  blockchain: {
    // Default network to use (mainnet, testnet, devnet, localnet)
    defaultNetwork: SuiNetwork;
    // Whether to show transaction logs
    verbose: boolean;
    // Admin wallet for administrative operations
    adminWalletAddress?: string;
  };
  
  // Security configuration based on Wal.app data security documentation
  security?: {
    // Encryption key for sensitive data (should be set via environment variable in production)
    encryptionKey?: string;
    // Salt for password hashing
    passwordSalt?: string;
    // Session secret for Express sessions
    sessionSecret?: string;
    // Enable CSRF protection
    enableCsrf: boolean;
    // Rate limiting settings
    rateLimit: {
      // Max requests per window
      max: number;
      // Time window in milliseconds
      windowMs: number;
    };
    // Content Security Policy settings
    contentSecurityPolicy: boolean;
  };
  
  // Fees configuration
  fees: {
    // Platform fee for betting (0% - removed as requested)
    platformFeeBetting: number;
    // Network fee for betting (1%)
    networkFeeBetting: number;
    // Platform fee for staking (2%)
    platformFeeStaking: number;
    // Platform fee on rewards (10%)
    platformFeeRewards: number;
  };
}

// Default configuration with environment variable fallbacks
const config: AppConfig = {
  api: {
    walAppApiKey: process.env.WAL_APP_API_KEY,
    wurlusApiKey: process.env.WURLUS_API_KEY,
    walAppBaseUrl: 'https://api.wal.app/v1',
  },
  
  blockchain: {
    defaultNetwork: (process.env.SUI_NETWORK as SuiNetwork) || 'devnet',
    verbose: process.env.NODE_ENV !== 'production',
    adminWalletAddress: process.env.ADMIN_WALLET_ADDRESS,
  },
  
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY || 'your-fallback-encryption-key-for-dev',
    passwordSalt: process.env.PASSWORD_SALT || 'your-fallback-salt-for-dev',
    sessionSecret: process.env.SESSION_SECRET || 'your-fallback-session-secret-for-dev',
    enableCsrf: process.env.NODE_ENV === 'production',
    rateLimit: {
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    },
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
  },
  
  fees: {
    platformFeeBetting: 0, // No platform fee as per requirements
    networkFeeBetting: 0.01, // 1% network fee
    platformFeeStaking: 0.02, // 2% platform fee on staking
    platformFeeRewards: 0.10, // 10% platform fee on rewards
  },
};

export default config;