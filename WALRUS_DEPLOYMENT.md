# SuiBets Platform - Walrus Deployment Guide

This document provides step-by-step instructions for deploying the SuiBets Platform on Walrus. The platform is a cryptocurrency betting application that leverages the Sui blockchain for secure transactions, allowing users to place bets using SUI and SBETS tokens.

## Prerequisites

Before deployment, ensure you have:

1. [Walrus CLI](https://walrus-cli.dev/) installed
2. A Sui wallet with sufficient funds for deployment costs
3. Access to a PostgreSQL database (or credentials to create one)
4. Required API keys:
   - API_SPORTS_KEY for sports data
   - SPORTSDATA_API_KEY for additional sports data
   - Stripe keys (optional, for payment processing)

## Environment Setup

1. Create a `.env` file in the root directory of the project with the following variables. Replace the placeholder values with your actual credentials:

```
# Database connection (Required)
DATABASE_URL=postgres://username:password@hostname:port/database

# API Sports API Key
API_SPORTS_KEY=your_api_sports_key

# SportsData API Key
SPORTSDATA_API_KEY=your_sportsdata_key_here

# Sui blockchain network settings
SUI_NETWORK=testnet
ADMIN_WALLET_ADDRESS=your_admin_wallet_address

# Session and security settings
SESSION_SECRET=your_session_secret
PASSWORD_SALT=your_password_salt

# SBETS token address on Sui
SBETS_TOKEN_ADDRESS=0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285::sbets::SBETS

# Stripe integration (for payment processing)
STRIPE_SECRET_KEY=your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
STRIPE_PRICE_ID=your_stripe_price_id

# Platform settings
PLATFORM_FEE_BETTING=0.00
NETWORK_FEE_BETTING=0.01
PLATFORM_FEE_STAKING=0.02
PLATFORM_FEE_REWARDS=0.10

# Wallet addresses for deposit/withdrawal operations
DEPOSIT_RECEIVER_ADDRESS=your_deposit_receiver_address
WITHDRAWAL_PROVIDER_ADDRESS=your_withdrawal_provider_address
```

2. The `DATABASE_URL` is optional. While recommended for production, the application now has a fallback mechanism to use blockchain storage if no database connection is available. This makes deployment more flexible and resilient.

## Database Setup

1. Create a PostgreSQL database for the application.
2. Update the `DATABASE_URL` in your `.env` file with the connection details.
3. On first deployment, the database schema will be automatically created.

## Deployment Steps

1. Log in to your Walrus account:
   ```bash
   walrus login
   ```

2. Navigate to your project directory:
   ```bash
   cd /path/to/suibets-platform
   ```

3. Initialize a new Walrus project (if not already initialized):
   ```bash
   walrus init
   ```

4. Configure your deployment:
   ```bash
   walrus config set environment production
   ```

5. Deploy the application:
   ```bash
   walrus deploy
   ```

6. Once deployed, you can view your application status:
   ```bash
   walrus status
   ```

7. To view logs from your deployed application:
   ```bash
   walrus logs
   ```

## Post-Deployment Verification

After successful deployment, verify the following:

1. The application is accessible at the provided Walrus URL
2. Users can connect their Sui wallets
3. Sports events are loading correctly
4. Betting functionality works as expected
5. Staking and DeFi features are operational

## Troubleshooting

If you encounter issues during deployment:

1. **Database Connection Errors**: If you're using a database, ensure your `DATABASE_URL` is correctly formatted and accessible from the Walrus environment. Remember that the application can run without a database by using blockchain storage as a fallback.

2. **API Key Issues**: Verify that all API keys are valid and correctly entered in the `.env` file.

3. **Blockchain Connection Problems**: Check that the SUI_NETWORK value matches the network you intend to use (testnet, mainnet).

4. **Deployment Failures**: Review the Walrus logs using `walrus logs` for specific error messages.

5. **Empty Sports Data**: If no sports events are displaying, check the API_SPORTS_KEY and ensure it has not exceeded its request limit.

## Support

For additional support:
- Join the SuiBets Telegram group: https://t.me/Sui_Bets
- Contact the development team through the Walrus support channels