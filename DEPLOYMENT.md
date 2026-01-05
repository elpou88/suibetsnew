# SuiBets Platform Deployment Guide

## Requirements

- Node.js v18+ 
- Walrus CLI
- Sui CLI (for blockchain operations)
- Sports API keys
- PostgreSQL database (optional - app now has blockchain storage fallback)

## Deployment Steps

### 1. Install Walrus CLI

```bash
npm install -g @walrus-app/cli
```

### 2. Configure Environment

Copy .env.example to .env and add your API keys:

```bash
cp .env.example .env
```

Edit the .env file with your actual API keys. Note that DATABASE_URL is optional - the application can run without a database connection by using blockchain storage as a fallback.

### 3. Install Dependencies

```bash
npm install
```

### 4. Deploy with Walrus

```bash
walrus deploy
```

### 5. Configure Network

```bash
walrus config set network testnet
# or for production:
# walrus config set network mainnet
```

### 6. Start the Application

```bash
npm run dev
```

## Features Included in this Platform

- Multi-language support (10 languages)
- Odds format conversion (American, Decimal, Fractional)
- Settings that apply throughout the app
- Blockchain wallet integration via Sui wallets
- Support for all 14 sports with proper market formatting
- Comprehensive DeFi staking with outcome yield farming
- Live events section with accordion-style categories
- Betting with both SUI and SBETS tokens
- Deposit/withdraw functionality with specific wallet addresses

## Wallet Addresses

- Deposit Receiver: `0x14277cecf9d3f819c2ec39e9be93c35fb3bdd85d2fd5f6dcd1fad931aee232e8`
- Withdrawal Provider: `0xd8e37ef7507b086f1f9f29de543cb2c4e9249e886558a734923aafa4c103658c`

## SBETS Token Contract Address

- `0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285::sbets::SBETS`

## Technical Support

For support, visit our Telegram group: https://t.me/Sui_Bets