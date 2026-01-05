# SuiBets Platform Workflow Script: Betting, Winning & Withdrawal Process

## Overview
SuiBets is a decentralized sports betting platform built on the Sui blockchain that uses the Walrus protocol for secure transactions and data storage. Users can bet with either SUI tokens or SBETS tokens across 30+ sports.

## Phase 1: User Onboarding & Wallet Connection

### 1.1 Wallet Connection
```
User Action: Visit SuiBets platform
System Response: Platform detects no wallet connection
User Action: Click "Connect Wallet" button
System Response: Display wallet options (Sui Wallet, Suiet, etc.)
User Action: Select and connect preferred wallet
System Response: Store wallet address in session (blockchain-auth.ts)
```

### 1.2 Authentication Flow
```javascript
// Blockchain authentication process
POST /api/auth/wallet-connect
{
  walletAddress: "0x...",
  walletType: "sui-wallet",
  signature: "...",
  nonce: "random_string"
}
```

## Phase 2: Betting Process

### 2.1 Event Discovery
```
User Action: Browse sports categories
System Response: Fetch live/upcoming events from multiple APIs:
  - ESPN API for real-time data
  - API-Sports for comprehensive coverage
  - BWin API for additional markets

Data Flow: APIs → Event Normalization → Real-time Updates via WebSocket
```

### 2.2 Bet Selection
```
User Action: Click on odds for desired outcome
Frontend Process: Create SelectedBet object
{
  id: "unique_bet_id",
  eventId: "event_123",
  eventName: "Liverpool vs Arsenal",
  selectionName: "Liverpool Win",
  odds: 2.50,
  stake: 10,
  marketId: "match_result",
  outcomeId: "home_win"
}

System Response: Add to betting slip
```

### 2.3 Bet Placement - Single Bet
```javascript
// Frontend API call
POST /api/bets
{
  userId: 123,
  walletAddress: "0x...",
  eventId: "event_123",
  marketId: "match_result",
  outcomeId: "home_win",
  odds: 2.50,
  betAmount: 10,
  prediction: "Liverpool Win",
  potentialPayout: 25.0,
  feeCurrency: "SUI"
}
```

### 2.4 Blockchain Transaction Processing
```javascript
// SUI Token Betting
async placeBetWithSui(userId, walletAddress, eventId, marketName, prediction, amount, odds) {
  // Convert to MIST (1 SUI = 10^9 MIST)
  const amountInMist = amount * 1_000_000_000;
  
  // Calculate fees
  const platformFee = 0; // 0% platform fee
  const networkFee = amount * 0.01; // 1% network fee
  const potentialPayout = amount * odds;
  
  // Create blockchain transaction
  const tx = new TransactionBlock();
  tx.splitCoins(tx.gas, [amountInMist]);
  
  // Call Walrus protocol smart contract
  tx.moveCall({
    target: '0x45f3b76138726dbeb67ca5bb98b6a425fd7284fff63953640f6bc8cf0906ea2e::walrus::place_bet',
    arguments: [
      betCoin,
      eventId,
      marketName,
      prediction,
      odds * 100, // Convert to integer
      potentialPayout,
      platformFee,
      networkFee,
      userId,
      'SUI'
    ]
  });
  
  return tx.digest; // Transaction hash
}
```

### 2.5 Parlay Betting
```javascript
// Multiple selections combined
POST /api/parlays
{
  userId: 123,
  walletAddress: "0x...",
  totalOdds: 6.25, // Combined odds
  betAmount: 10,
  potentialPayout: 62.50,
  feeCurrency: "SUI",
  legs: [
    {
      eventId: "event_123",
      marketId: "match_result",
      prediction: "Liverpool Win",
      odds: 2.50
    },
    {
      eventId: "event_456",
      marketId: "match_result", 
      prediction: "City Win",
      odds: 2.50
    }
  ]
}
```

## Phase 3: Event Monitoring & Settlement

### 3.1 Live Event Tracking
```
System Process: WebSocket connections provide real-time updates
- Live scores
- Status changes (upcoming → live → finished)
- Odds fluctuations

Event Settlement Trigger: When event status changes to "finished"
```

### 3.2 Market Settlement (Admin Process)
```javascript
// Admin settles market with winning outcome
async settleMarket(adminAddress, marketId, outcomeId) {
  // Verify admin rights
  if (adminAddress !== config.blockchain.adminWalletAddress) {
    throw new Error('Only admin can settle markets');
  }
  
  // Create settlement transaction
  const tx = new TransactionBlock();
  tx.moveCall({
    target: '0x45f3b76138726dbeb67ca5bb98b6a425fd7284fff63953640f6bc8cf0906ea2e::walrus::settle_market',
    arguments: [marketId, outcomeId]
  });
  
  return tx.digest;
}
```

### 3.3 Bet Status Updates
```
Database Updates:
- Winning bets: status = 'won', payout = betAmount * odds
- Losing bets: status = 'lost', payout = 0
- Pending settlement: status = 'pending'

Automatic Notifications: WebSocket broadcast to users about bet results
```

## Phase 4: Winning & Withdrawal Process

### 4.1 Claim Winnings
```javascript
// User initiates withdrawal from bet history
POST /api/wurlus/claim-winnings
{
  walletAddress: "0x...",
  betId: "bet_123"
}

// Backend processing
async claimWinnings(walletAddress, betId) {
  // Create claim transaction
  const tx = new TransactionBlock();
  tx.moveCall({
    target: '0x45f3b76138726dbeb67ca5bb98b6a425fd7284fff63953640f6bc8cf0906ea2e::walrus::claim_winnings',
    arguments: [betId]
  });
  
  // Execute on blockchain
  const result = await this.executeSignedTransaction(walletAddress, tx);
  return result.digest;
}
```

### 4.2 Frontend Withdrawal Interface
```javascript
// Bet History Component
const handleWithdrawWinnings = async (betId) => {
  const response = await apiRequest('POST', `/api/bets/${betId}/withdraw-winnings`, {
    userId: user.id
  });
  
  if (response.ok) {
    toast({ title: 'Withdrawal Successful' });
    refetch(); // Refresh bet list
  }
};

// UI Display
{bet.status === 'won' && !bet.winningsWithdrawn ? (
  <Button onClick={() => handleWithdrawWinnings(bet.id)}>
    Withdraw Winnings - {bet.potentialPayout} {bet.currency}
  </Button>
) : null}
```

### 4.3 Cash Out (Early Settlement)
```javascript
// Before event finishes, users can cash out
POST /api/bets/:betId/cash-out
{
  userId: 123,
  walletAddress: "0x...",
  currency: "SUI"
}

// Calculate cash out amount (typically 80% of current value)
const cashOutAmount = await storage.calculateSingleBetCashOutAmount(betId);

// Process blockchain transaction
const txHash = await suiMoveService.cashOutSingleBet(
  walletAddress, 
  betId, 
  cashOutAmount
);
```

## Phase 5: Additional Earning Mechanisms

### 5.1 Staking & Dividends
```javascript
// Stake SBETS tokens to earn dividends
POST /api/wurlus/stake
{
  walletAddress: "0x...",
  amount: 100,
  stakingPeriod: 30 // days
}

// Claim accumulated dividends
POST /api/wurlus/claim-dividends
{
  walletAddress: "0x..."
}

// Returns available dividends from platform fees
Response: {
  stakingAmount: 100.0,
  availableDividends: 2.5,
  apr: 12.5 // 12.5% annual percentage rate
}
```

### 5.2 Transaction History
```javascript
// All user transactions tracked
TransactionTypes: [
  'bet',          // Placed bet
  'win',          // Betting win
  'stake',        // Staked tokens  
  'unstake',      // Unstaked tokens
  'claim',        // Claimed winnings
  'dividend',     // Dividend payment
  'deposit',      // Token deposit
  'withdraw'      // Token withdrawal
]
```

## Phase 6: Fee Structure

### 6.1 Betting Fees
```
Platform Fee: 0% (removed as per requirements)
Network Fee: 1% (paid to Sui network)
Staking Fee: 2% (when staking SBETS)
Rewards Fee: 10% (taken from staking rewards)
```

### 6.2 Token Support
```
Primary Tokens:
- SUI: Native Sui blockchain token
- SBETS: Platform token (0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285::sbets::SBETS)

Wallet Integration:
- Sui Wallet
- Suiet Wallet
- Martian Wallet (via wallet standard)
```

## Phase 7: Security & Data Integrity

### 7.1 Blockchain Security
```
- All transactions signed by user's private key
- Smart contracts on Sui blockchain
- Immutable transaction records
- Decentralized data storage via Walrus protocol
```

### 7.2 Data Sources
```
Authentic Sports Data Only:
- ESPN API (primary)
- API-Sports (secondary)
- BWin API (additional markets)
- No simulated or mock data allowed
- Real-time verification of live events
```

## Workflow Summary

1. **Connect Wallet** → User connects Sui-compatible wallet
2. **Browse Events** → Real-time sports data from authenticated APIs
3. **Select Bets** → Add selections to betting slip
4. **Place Bet** → Blockchain transaction via Walrus protocol
5. **Monitor Events** → WebSocket updates on event progress
6. **Market Settlement** → Admin settles markets when events finish
7. **Claim Winnings** → User initiates withdrawal from bet history
8. **Blockchain Payout** → Smart contract transfers winnings to wallet
9. **Earn Dividends** → Stake SBETS tokens for additional income
10. **Track History** → Complete transaction history available

## Key Benefits

- **Decentralized**: No central authority controls funds
- **Transparent**: All transactions on public blockchain
- **Global**: Access from anywhere with wallet connection
- **Real-time**: Live updates via WebSocket connections
- **Multi-sport**: 30+ sports with comprehensive coverage
- **Flexible**: Both single bets and parlays supported
- **Rewarding**: Additional income through staking dividends

This workflow ensures users have complete control over their funds while providing a seamless betting experience backed by authentic sports data and secure blockchain technology.