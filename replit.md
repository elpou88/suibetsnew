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
- **Security**: Server-authoritative betting cutoff (45 minutes for live betting), rejection of stale event data, anti-exploit protections.
- **Anti-Exploit Measures**: Rate limiting (20 bets/hour/wallet), Unknown Event rejection, event validation before bet acceptance, settlement blocking for unverified events.

### Data Storage
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Caching**: In-memory caching for odds and event data with specific strategies.

### Key Features
- **Sports Data Integration**: Aggregates real-time scores and odds from multiple providers.
- **Blockchain Integration**: Sui blockchain for secure transactions, SBETS token support, and Move smart contracts for betting and automated payouts.
- **Betting System**: Real-time odds, multiple market types, live betting via WebSockets, betting slip management, automated on-chain payouts.
- **Parlay Support**: Multi-leg parlay betting with combined odds calculation.
- **User Management**: Wallet-based authentication, user profiles, SUI and SBETS token balance management.
- **On-Chain Fund Flow**: Full on-chain dual-token system for bets and settlements via smart contracts, with transparent treasury management and fee accrual.
- **Revenue Sharing**: SBETS token holders can claim 30% of weekly platform revenue proportionally. Revenue is split 30% to holders, 40% to treasury buffer, 30% for liquidity/buybacks.
- **Liability Tracking**: Explicit `currency` column for bets, reconciliation endpoint, maximum stake limits (100 SUI / 10,000 SBETS), treasury pre-checks before settlement.
- **On-Chain Bet Synchronization**: Automatic and manual sync of on-chain bets, with detailed status tracking and prediction extraction.
- **Treasury Auto-Withdraw System**: MANUAL ONLY (disabled auto-run). Trigger via /api/admin/treasury/withdraw endpoint. Zero-amount guards prevent empty transactions.
- **Automatic On-Chain Payouts**: Direct token transfers to user wallets for winners from DB-only settlements, funded from the admin wallet.
- **Leaderboard System**: Weekly, monthly, and all-time rankings based on profit, tracking total bets, win rate, and profit/loss.
- **User Betting Limits**: User-configurable daily, weekly, and monthly spending limits in USD, session timers, and self-exclusion options.
- **Referral System**: Wallet-address generated referral codes with a bonus structure and tracking for pending, qualified, and rewarded referrals.
- **Additional Betting Markets**: Includes BTTS, Double Chance, Half-Time Result, Over/Under Goals, and Correct Score.
- **Social Network Effect Engine ("Predict Anything")**: Standalone /network page with 4 sub-tabs (Home, Predict, Challenge, Social). Features custom prediction markets (SBETS-only currency), viral challenges, public profiles with X/Twitter linking, live chat (polling-based), follow system, and leaderboard integration. 6 DB tables (social_predictions, social_prediction_bets, social_challenges, social_challenge_participants, social_follows, social_chat_messages), 12+ API endpoints under /api/social/*, and network.tsx page.
  - **On-Chain Prediction Bets**: Users sign real SBETS transfer to treasury wallet via wallet (Slush/Nightly). Backend verifies on-chain: sender, recipient=treasury, amount, SBETS coin type. No fake txIds - every bet is a real blockchain transaction.
  - **On-Chain Challenge Stakes**: Same pattern - joining a challenge requires signing SBETS transfer. Backend verifies before recording participation.
  - **Anti-Exploit Security**: Creator self-bet blocked, duplicate join prevented (DB unique constraint on wallet+challengeId), duplicate tx hash reuse blocked (unique index on txId/txHash + in-memory Set), atomic SQL increments for pool totals (no race conditions), rate limiting (20 bets/hour, 30 chat/min), double-resolve/settle guards, early resolution blocked.
  - **Settlement Payouts**: Winners receive real SBETS from treasury via blockchainBetService.sendSbetsToUser(). Per-wallet success/failure tracking with detailed logs.
  - Educational "How You Win" and "Predict vs Challenge" explainers. No mock/seed data - all content is user-generated.

### Architecture Model
- **Full On-Chain Model**: Bets placed directly on smart contracts, tracked in PostgreSQL for UI, settlements automated on-chain.
- **Capability-Based Security**: Smart contracts use AdminCap and OracleCap for access control.

## External Dependencies

### Sports Data Providers
- **API-Sports**: Primary data source for Football (paid tier with live betting).
- **Free Sports API**: Basketball, Baseball, Ice Hockey, MMA, American Football, AFL, Formula 1, Handball, NBA, NFL, Rugby, Volleyball (upcoming at 6 AM UTC, 7-day lookahead, no live betting).
- **Free Sports Settlement**: Settlement worker actively fetches results for free sports every 30 minutes (only for sports with pending bets). Results cached to file for restart persistence. Also receives nightly batch at 11 PM UTC via freeSportsService as fallback.
- **Sports Coverage**:
  - **Football (sportId 1)**: Live betting (first 45 min only) + Upcoming matches, paid API
  - **Basketball (sportId 2)**: Upcoming only, free API, 7-day lookahead
  - **Baseball (sportId 5)**: Upcoming only, free API
  - **Ice Hockey (sportId 6)**: Upcoming only, free API
  - **MMA (sportId 7)**: Upcoming only, free API, 7-day lookahead (events on fight nights)
  - **American Football (sportId 4)**: Upcoming only, free API (seasonal)
  - **AFL (sportId 10)**: Upcoming only, free API (seasonal, starts March)
  - **Formula 1 (sportId 11)**: Upcoming only, free API (seasonal, starts March)
  - **Handball (sportId 12)**: Upcoming only, free API
  - **NFL (sportId 14)**: Upcoming only, free API (seasonal)
  - **Rugby (sportId 15)**: Upcoming only, free API
  - **Volleyball (sportId 16)**: Upcoming only, free API
  - **Tennis, Esports, Boxing**: Placeholder (no API-Sports endpoint available)
- **Pre-game Cutoff**: Server-side enforcement prevents betting on free sports events that have already started (no live betting for free sports).
- **Odds Cache**: Football odds cache TTL extended to 4 hours with 30-minute prefetch interval for consistent coverage.
- **Live Fallback Odds**: Probability-based model accounting for score difference AND match time elapsed. A team leading 3-1 at minute 43 gets ~1.15 odds (not 3.0). Odds capped at 51.00 max. Uses 5% bookmaker margin.

### Blockchain Services
- **Sui Network**: Layer 1 blockchain.
- **Move Language**: Smart contract development.
- **SBETS Token (Mainnet)**: `0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285::sbets::SBETS`
- **SuiBettingPlatform Contract (Mainnet)**: Deployed at `0x737324ddac9fb96e3d7ffab524f5489c1a0b3e5b4bffa2f244303005001b4ada` (Package ID) and `0x5fc1073c9533c6737fa3a0882055d1778602681df70bdabde96b0127b588f082` (Shared object).

### Betting Promotion System (Active: January 27 - February 10, 2026)
- **Promotion**: Bet $15 (in SUI or SBETS) → Get $5 FREE bonus.
- **Tracking**: On-chain bets tracked and converted to USD value (SUI = $3.50 USD, SBETS = $0.000001 USD).

### Promotions System
- **Welcome Bonus**: 1,000 SBETS for new users (one-time per wallet, stored in `welcomeBonusClaimed` field)
- **Referral System**: 1,000 SBETS reward per qualified referral (when referred user places first bet)
- **Loyalty Program**: 
  - Points earned per $1 wagered
  - Tiers: Bronze (<1000 pts), Silver (1000+), Gold (2500+), Platinum (5000+), Diamond (10000+)
  - Points displayed on leaderboard with tier badges
- **SBETS Staking**: 
  - 5% APY from treasury pool (50 billion SBETS pool)
  - Minimum stake: 100,000 SBETS
  - 7-day lock period
  - Stake/unstake/claim-rewards functionality via `wurlusStaking` table

### Payment Integration
- **Stripe**: Optional fiat payment processing.

### Infrastructure
- **PostgreSQL**: Primary database.
- **WebSocket**: Real-time communication.
- **Railway**: Hosting for PostgreSQL and deployment.
- **Vercel**: Alternative for serverless functions and static assets.