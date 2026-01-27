# SuiBets Platform - Crypto Sports Betting Platform

## Overview
SuiBets is a crypto sports betting platform built on the Sui blockchain, offering real-time betting across 30+ sports. It integrates multiple sports APIs for live scores and automated event tracking, utilizing blockchain for secure transactions and PostgreSQL for data persistence. The platform aims to provide a comprehensive and robust betting experience with a focus on real-time odds, secure on-chain betting, and a user-friendly interface.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **UI Components**: Radix UI
- **Data Fetching**: TanStack Query
- **Routing**: Wouter
- **UI/UX Decisions**: Redesigned event cards with inline odds buttons, collapsible league sections, major leagues prioritized and first 3 expanded by default, quick bet functionality directly from event cards.

### Backend
- **Framework**: Express.js with TypeScript
- **API**: RESTful design
- **Real-time**: WebSocket for live score updates
- **Data Aggregation**: Multi-API with resilience and fallback
- **Authentication**: Session-based with optional blockchain authentication
- **Security**: Server-authoritative 80-minute betting cutoff for all bets, rejecting uncertain or stale event data.

### Data Storage
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Caching**: In-memory for performance, with specific strategies for odds and event data.
- **Odds Fetching**: Fetches odds for ALL fixtures (not just mapping) with batch rate limiting (5 requests/batch, 1.5s delay) to avoid 429 errors.

### Key Features
- **Sports Data Integration**: Aggregates data from multiple providers for real-time scores and odds, with event tracking and API resilience.
- **Blockchain Integration**: Utilizes Sui for secure transactions, supports SBETS token, and employs Move smart contracts for betting operations and automated payouts.
- **Betting System**: Provides real-time odds, multiple market types, live betting via WebSockets, betting slip management, and automated on-chain payout.
- **Parlay Support**: Multi-leg parlay betting with combined odds calculation (multiply all legs). Single bets route to `/api/bets`, parlays (2+ legs) route to `/api/parlays`. Full metadata preserved (marketId, outcomeId, homeTeam, awayTeam, isLive) for settlement matching.
- **User Management**: Wallet-based authentication, user profiles, and balance management for SUI and SBETS tokens.
- **On-Chain Fund Flow**: Supports a full on-chain dual-token system where SUI and SBETS bets are placed and settled directly via smart contracts, with transparent treasury management and fee accrual.
- **Revenue Sharing**: SBETS token holders can claim 30% of weekly platform revenue proportionally to their holdings. Distribution: 30% to holders, 70% to treasury. Claims tracked in database via `revenue_claims` table to prevent double-claiming. Access at `/revenue` route.

### Architecture Model
- **Full On-Chain Model**: Bets are placed directly on the smart contract, tracked in PostgreSQL for UI, and settlements are automated on-chain.
- **Capability-Based Security**: Smart contracts use AdminCap and OracleCap for access control, enhancing security and operational management.

### Liability Tracking
- **Currency Column**: Each bet explicitly stores `currency` ('SUI' or 'SBETS') to track which token was used for the bet.
- **Reconciliation Endpoint**: `/api/admin/liability-reconciliation` (GET, requires X-Admin-Password header) compares on-chain liability vs database-tracked liability.
- **Settlement Worker**: Only calls on-chain settlement when bet has valid `betObjectId` - prevents orphaned on-chain liability from DB-only settlements.
- **Max Stake Limits**: Backend enforces 100 SUI / 10M SBETS maximum stake to prevent treasury overflow issues.
- **Treasury Pre-Check**: Before on-chain settlement, worker verifies treasury has sufficient balance. Insufficient funds mark bets as 'won' (not 'paid_out') for manual admin resolution.
- **Error 6 Handling**: Smart contract error 6 (E_INSUFFICIENT_TREASURY_BALANCE) detected and gracefully handled - bets marked as settled to prevent infinite retry loops.

### On-Chain Bet Synchronization
- **Auto-Sync Every 5 Minutes**: On-chain bet sync runs automatically with settlement checks to catch all bets placed directly on smart contract.
- **Manual Sync**: POST `/api/admin/sync-onchain-bets` (requires X-Admin-Password header) for immediate sync.
- **Bet Details**: GET `/api/admin/onchain-bet/:betObjectId` (requires X-Admin-Password header) retrieves full on-chain bet data including prediction, market, bettor.
- **Prediction Extraction**: Sync reads prediction/selection from on-chain bet object (stored as vector<u8> bytes decoded to string).
- **Smart Contract Status Codes**: 0=pending, 1=won, 2=lost, 3=void (defined in betting.move lines 28-31).

### Contract Settlement Fix (Deployed January 27, 2026)
- **Problem (FIXED)**: Previous contract created bets as OWNED objects (transferred to bettor). Admin could not settle them.
- **Solution**: Contract now uses `transfer::share_object(bet)` to create SHARED bet objects that admin can settle.
- **Status**: New contract deployed and active. All NEW bets will be settleable by admin.
- **Legacy Bets**: Bets placed on OLD contract (0xfaf371c3c9fe...) were owned by bettors. These have been marked as VOID in database to prevent settlement errors.

### Revenue Sharing System (Updated January 27, 2026)
- **Fee Split**: Platform 1% fee on winning bet profits is split:
  - **30%** → `platform_revenue_holders` (for SBETS holder distribution)
  - **40%** → `platform_treasury_buffer` (stays in treasury for liquidity)
  - **30%** → `platform_profit` (platform owner profit)
- **Holder Discovery**: System collects wallets from multiple sources (known wallets, database users, bet participants)
- **Share Calculation**: User's share = their SBETS / total circulating SBETS among known holders (excludes platform wallets)
- **Caching**: Holder data cached for 5 minutes to reduce blockchain API calls
- **Platform Wallet Exclusion**: Admin wallet (0x20850db5...) excluded from holder calculations
- **Real-time Updates**: Frontend refreshes stats every 30s, claimable every 15s
- **Claim Validation**: User must hold SBETS tokens, can only claim once per week, tracked in `revenue_claims` table
- **Database Accounts**: Revenue tracked in 3 separate DB accounts for transparency

## External Dependencies

### Sports Data Providers
- **API-Sports**: Primary sports data provider.
- **SportsData API**: Secondary data source.

### Blockchain Services
- **Sui Network**: Layer 1 blockchain.
- **Move Language**: For smart contract development.
- **SBETS Token (Mainnet)**: `0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285::sbets::SBETS`
- **Deployed Contract (Mainnet)**:
    - Package ID: `0x936e79b406296551171bc148b0e1fe7d32534c446a93f5a18766569d8cc736a6`
    - BettingPlatform (Shared): `0x94a14c61edc4e51b39775b811f42c8a8af96488005af9179315ddb80389f480b`
    - AdminCap: `0x2b4ace9a99fc6ccc09695cf58b6a317be6f219d76a22e1f099bd505141e270ee`
    - Admin Wallet (owns AdminCap): `0x20850db591c4d575b5238baf975e54580d800e69b8b5b421de796a311d3bea50`

### Payment Integration
- **Stripe**: Optional fiat payment processing.

### Infrastructure
- **PostgreSQL**: Primary database.
- **WebSocket**: Real-time communication.
- **Railway**: Hosting for PostgreSQL and deployment.
- **Vercel**: Alternative for serverless functions and static assets.