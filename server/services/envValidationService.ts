/**
 * Environment Variable Validation Service
 * Validates production environment configuration on startup
 */

export interface EnvValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: {
    databaseUrl: boolean;
    apiSportsKey: boolean;
    suiNetwork: string;
    adminWallet: boolean;
    sessionSecret: boolean;
    sbetsToken: boolean;
  };
}

export class EnvValidationService {
  private static requiredEnvVars = [
    'API_SPORTS_KEY',
    'SESSION_SECRET'
  ];

  private static optionalEnvVars = [
    'DATABASE_URL',
    'SPORTSDATA_API_KEY',
    'SUI_NETWORK',
    'ADMIN_WALLET_ADDRESS',
    'ADMIN_PASSWORD',
    'SBETS_TOKEN_ADDRESS',
    'STRIPE_SECRET_KEY',
    'DEPOSIT_RECEIVER_ADDRESS',
    'WITHDRAWAL_PROVIDER_ADDRESS'
  ];

  /**
   * Validate all environment variables on startup
   */
  static validateEnvironment(): EnvValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const config = {
      databaseUrl: !!process.env.DATABASE_URL,
      apiSportsKey: !!process.env.API_SPORTS_KEY,
      suiNetwork: process.env.SUI_NETWORK || 'mainnet',
      adminWallet: !!process.env.ADMIN_WALLET_ADDRESS,
      sessionSecret: !!process.env.SESSION_SECRET,
      sbetsToken: !!process.env.SBETS_TOKEN_ADDRESS
    };

    // Check required variables
    for (const envVar of this.requiredEnvVars) {
      if (!process.env[envVar]) {
        errors.push(`❌ Missing required environment variable: ${envVar}`);
      }
    }

    // Check optional variables with warnings
    if (!process.env.DATABASE_URL) {
      warnings.push(`⚠️ DATABASE_URL not set - using in-memory storage (not for production)`);
    }

    if (!process.env.ADMIN_PASSWORD) {
      warnings.push(`⚠️ ADMIN_PASSWORD not set - using default password (change in production!)`);
    }

    if (!process.env.ADMIN_WALLET_ADDRESS) {
      warnings.push(`⚠️ ADMIN_WALLET_ADDRESS not set - admin functions may not work properly`);
    }

    if (!process.env.SBETS_TOKEN_ADDRESS) {
      warnings.push(`⚠️ SBETS_TOKEN_ADDRESS not set - using default testnet address`);
    }

    // Validate API key format if present
    if (process.env.API_SPORTS_KEY) {
      if (process.env.API_SPORTS_KEY.length < 10) {
        errors.push(`❌ API_SPORTS_KEY appears invalid (too short)`);
      }
      if (process.env.API_SPORTS_KEY === 'your_api_key_here') {
        errors.push(`❌ API_SPORTS_KEY is still set to placeholder value`);
      }
    }

    // Check network validity
    const validNetworks = ['mainnet', 'testnet', 'devnet'];
    if (!validNetworks.includes(process.env.SUI_NETWORK || 'mainnet')) {
      warnings.push(`⚠️ Unknown SUI_NETWORK: ${process.env.SUI_NETWORK}`);
    }

    // Production-specific checks
    if (process.env.NODE_ENV === 'production') {
      if (process.env.SESSION_SECRET === 'sui_bets_platform_session_2025') {
        errors.push(`❌ PRODUCTION: SESSION_SECRET is using default value - must change for production!`);
      }
      if (process.env.ADMIN_PASSWORD === 'change-me-in-production') {
        errors.push(`❌ PRODUCTION: ADMIN_PASSWORD is using default value - must change for production!`);
      }
      if (!process.env.DATABASE_URL) {
        errors.push(`❌ PRODUCTION: DATABASE_URL must be configured`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      config
    };
  }

  /**
   * Print validation results
   */
  static printValidationResults(validation: EnvValidation): void {
    console.log('\n' + '='.repeat(60));
    console.log('🔐 ENVIRONMENT VALIDATION REPORT');
    console.log('='.repeat(60));

    console.log('\n📋 Configuration Status:');
    console.log(`   Database URL: ${validation.config.databaseUrl ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   API-Sports Key: ${validation.config.apiSportsKey ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   Sui Network: ${validation.config.suiNetwork}`);
    console.log(`   Admin Wallet: ${validation.config.adminWallet ? '✅ Configured' : '⚠️ Missing'}`);
    console.log(`   Session Secret: ${validation.config.sessionSecret ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   SBETS Token: ${validation.config.sbetsToken ? '✅ Configured' : '⚠️ Missing'}`);

    if (validation.errors.length > 0) {
      console.log('\n❌ ERRORS (Critical):');
      for (const error of validation.errors) {
        console.log(`   ${error}`);
      }
    }

    if (validation.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS (Non-critical):');
      for (const warning of validation.warnings) {
        console.log(`   ${warning}`);
      }
    }

    if (validation.isValid) {
      console.log('\n✅ All required environment variables are properly configured!');
    } else {
      console.log('\n🚨 Fix the errors above before deploying!');
    }

    console.log('='.repeat(60) + '\n');
  }

  /**
   * Get printable environment summary (safe for logging)
   */
  static getSafeEnvSummary(): any {
    return {
      nodeEnv: process.env.NODE_ENV || 'development',
      suiNetwork: process.env.SUI_NETWORK || 'mainnet',
      hasApiSportsKey: !!process.env.API_SPORTS_KEY,
      hasDatabase: !!process.env.DATABASE_URL,
      hasAdminPassword: !!process.env.ADMIN_PASSWORD,
      timestamp: new Date().toISOString()
    };
  }
}

export default EnvValidationService;
