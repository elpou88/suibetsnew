# SuiBets Platform - Crypto Sports Betting Platform

## Overview
SuiBets is a crypto sports betting platform built on the Sui blockchain, offering real-time betting across 30+ sports. It integrates multiple sports APIs for live scores and automated event tracking, utilizing blockchain for secure transactions and PostgreSQL for data persistence. The platform aims to provide a comprehensive and robust betting experience with a focus on real-time odds, secure on-chain betting, and a user-friendly interface, with the ambition to be a leading platform in the crypto sports betting market.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Frameworks**: React 18 (TypeScript), Vite
- **Styling & UI**: Tailwind CSS, Framer Motion for animations, Radix UI for components
- **Data & Routing**: TanStack Query for data fetching, Wouter for routing
- **UI/UX Decisions**: Redesigned event cards with inline odds buttons, collapsible league sections, major leagues prioritized and expanded by default, quick bet functionality.

### Backend
- **Framework**: Express.js (TypeScript)
- **API**: RESTful design
- **Real-time**: WebSocket for live score updates
- **Data Aggregation**: Multi-API with resilience and fallback mechanisms
- **Authentication**: Session-based with optional blockchain authentication
- **Security**: Server-authoritative betting cutoff, rejection of stale event data, anti-exploit protections (rate limiting, cooldowns, max bets per event, event validation, settlement blocking).

### Data Storage
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Caching**: In-memory caching for odds and event data.

### Key Features
- **Sports Data Integration**: Aggregates real-time scores and odds from multiple providers.
- **Blockchain Integration**: Sui blockchain for secure transactions, SBETS token support, and Move smart contracts for betting and automated payouts.
- **Betting System**: Real-time odds, multiple market types, live betting via WebSockets, betting slip management, automated on-chain payouts, multi-leg parlay betting.
- **User Management**: Wallet-based authentication, user profiles, SUI and SBETS token balance management, user betting limits, referral system.
- **On-Chain Fund Flow**: Full on-chain dual-token system for bets and settlements via smart contracts, transparent treasury management, and fee accrual.
- **Liability Tracking**: Explicit currency tracking, maximum stake limits, treasury pre-checks, on-chain bet synchronization.
- **Social Network Effect Engine ("Predict Anything")**: Standalone /network page with custom prediction markets, viral challenges, public profiles, live chat, follow system, and leaderboard integration. Features on-chain prediction bets and challenge stakes, atomic pool updates, and automated resolution/settlement with anti-exploit security.
- **Live Streaming Section**: Proxies `streamed.pk` API for live and upcoming football matches with embedded playback.
- **zkLogin (Google OAuth)**: Full Sui zkLogin implementation for seedless wallet login via Google, integrated with on-chain betting.
- **Walrus Decentralized Storage**: Stores bet receipts on Walrus Protocol (mainnet). Service: `server/services/walrusStorageService.ts`. Uses Walrus CLI (`/tmp/walrus` mainnet v1.42.1) to store blobs directly on-chain. Aggregator: `aggregator.walrus-mainnet.walrus.space`. Each bet receipt gets a real Walrus blob ID stored in `bets.walrus_blob_id`. Receipt JSON also cached in `bets.walrus_receipt_data`. Frontend shows "Verify on Walrus" link in bet history. Sui CLI at `/tmp/sui` configured for mainnet with admin wallet. Walrus mainnet config at `~/.config/walrus/client_config.yaml`.
- **SuiNS Integration**: Resolves wallet addresses to `.sui` domain names for enhanced UI.

### Architecture Model
- **Full On-Chain Model**: Bets placed directly on smart contracts, tracked in PostgreSQL for UI, settlements automated on-chain.
- **Capability-Based Security**: Smart contracts use AdminCap and OracleCap for access control.

## External Dependencies

### Sports Data Providers
- **API-Sports**: Primary data source for Football (paid tier, live betting).
- **Free Sports API**: Provides data for Basketball, Baseball, Ice Hockey, MMA, American Football, AFL, Formula 1, Handball, NFL, Rugby, Volleyball (upcoming only, no live betting for free sports).

### Blockchain Services
- **Sui Network**: Layer 1 blockchain.
- **Move Language**: Smart contract development.
- **SBETS Token (Mainnet)**: `0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285::sbets::SBETS`
- **SuiBettingPlatform Contract (Mainnet)**: Deployed at `0x737324ddac9fb96e3d7ffab524f5489c1a0b3e5b4bffa2f244303005001b4ada` (Package ID) and `0x5fc1073c9533c6737fa3a0882055d1778602681df70bdabde96b0127b588f082` (Shared object).

### Promotions System
- **Welcome Bonus**: 1,000 SBETS for new users.
- **Referral System**: 1,000 SBETS reward per qualified referral.
- **Loyalty Program**: Tier-based system with points earned per wager.
- **SBETS Staking**: 1-Week and 3-Month lock plans with APY, daily reward withdrawals, and hourly accrual.

### Payment Integration
- **Stripe**: Optional fiat payment processing.

### Infrastructure
- **PostgreSQL**: Primary database.
- **WebSocket**: Real-time communication.
- **Railway**: Hosting for PostgreSQL and deployment.
- **Vercel**: Alternative for serverless functions and static assets.