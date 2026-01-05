# SuiBets Contract Deployment Guide

## Prerequisites
1. Install Sui CLI: `cargo install --locked --git https://github.com/MystenLabs/sui.git --branch mainnet sui`
2. Create wallet: `sui client new-address ed25519`
3. Fund wallet with SUI for gas (minimum 1 SUI)

## Contract Features

### Capability-Based Security (OTW Pattern)
The contract uses **One-Time Witness (OTW)** and **Capability objects** for secure access control:
- **AdminCap**: Single capability object minted at deployment, required for all admin operations
- **OracleCap**: Can be minted by admin and distributed to settlement oracles
- No address-based checks - only capability holders can perform privileged operations

### Dual Token Support
- **SUI betting**: Users can bet with native SUI tokens
- **SBETS betting**: Users can bet with SBETS platform tokens
- Separate treasuries and liability tracking for each token type

### Contract Functions

| Function | Description | Required Capability |
|----------|-------------|---------------------|
| **SUI Betting** | | |
| `place_bet` | Place a bet with SUI | None (any user) |
| `settle_bet` | Settle SUI bet with oracle | OracleCap |
| `settle_bet_admin` | Settle SUI bet with admin | AdminCap |
| `void_bet` | Void SUI bet with oracle | OracleCap |
| `void_bet_admin` | Void SUI bet with admin | AdminCap |
| **SBETS Betting** | | |
| `place_bet_sbets` | Place a bet with SBETS | None (any user) |
| `settle_bet_sbets` | Settle SBETS bet with oracle | OracleCap |
| `settle_bet_sbets_admin` | Settle SBETS bet with admin | AdminCap |
| `void_bet_sbets` | Void SBETS bet with oracle | OracleCap |
| `void_bet_sbets_admin` | Void SBETS bet with admin | AdminCap |
| **Revenue & Treasury** | | |
| `withdraw_fees` | Extract SUI revenue | AdminCap |
| `withdraw_fees_sbets` | Extract SBETS revenue | AdminCap |
| `deposit_liquidity` | Add SUI to treasury | AdminCap |
| `deposit_liquidity_sbets` | Add SBETS to treasury | AdminCap |
| `emergency_withdraw` | Emergency SUI withdrawal | AdminCap (paused only) |
| `emergency_withdraw_sbets` | Emergency SBETS withdrawal | AdminCap (paused only) |
| **Oracle Management** | | |
| `mint_oracle_cap` | Create OracleCap for settlement | AdminCap |
| `revoke_oracle_cap` | Burn an OracleCap | AdminCap |
| **Platform Settings** | | |
| `set_pause` | Pause/unpause platform | AdminCap |
| `update_fee` | Change platform fee | AdminCap |
| `update_limits` | Change min/max bet | AdminCap |

## Deployment Steps

### 1. Create project folder with these files:
```
suibets/
├── Move.toml
└── sources/
    └── betting.move
```

### 2. Move.toml content:
```toml
[package]
name = "suibets"
version = "1.0.0"
edition = "2024.beta"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/mainnet" }

[addresses]
suibets = "0x0"
sbets_token = "0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285"
```

**Note:** The contract imports the existing SBETS token from mainnet at `0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285::sbets::SBETS`

### 3. Build the contract
```bash
cd suibets
sui move build
```

### 4. Deploy to mainnet
```bash
sui client publish --gas-budget 100000000
```

### 5. Record the output
After deployment, you'll get THREE important IDs:
- **Package ID**: The new contract address
- **BettingPlatform Object ID**: The shared platform object
- **AdminCap Object ID**: The admin capability (transferred to deployer)

Example output (actual mainnet deployment January 4, 2026):
```
Published Objects:
- Package: 0x9ca7d3b57c018fb171724dc808a542d2ec27354f6526b75e968d308d29bb6626
Created Objects:
- ID: 0xfb946f078082f42c93b7c1db30365f590338fd477ac20c564498d9315ca89e9c, Owner: Shared, Type: ...::betting::BettingPlatform
- ID: 0x49bee21bdf21522f401d5a3d6677604f0738bbd20f9bffef97d2223bdf2a1cb5, Owner: 0x20850db591c4d575b5238baf975e54580d800e69b8b5b421de796a311d3bea50, Type: ...::betting::AdminCap
```

### 6. Update environment variables in Replit secrets:
```
# Current mainnet deployment (January 4, 2026)
BETTING_PACKAGE_ID=0x9ca7d3b57c018fb171724dc808a542d2ec27354f6526b75e968d308d29bb6626
BETTING_PLATFORM_ID=0xfb946f078082f42c93b7c1db30365f590338fd477ac20c564498d9315ca89e9c
ADMIN_CAP_ID=0x49bee21bdf21522f401d5a3d6677604f0738bbd20f9bffef97d2223bdf2a1cb5
VITE_BETTING_PACKAGE_ID=0x9ca7d3b57c018fb171724dc808a542d2ec27354f6526b75e968d308d29bb6626
VITE_BETTING_PLATFORM_ID=0xfb946f078082f42c93b7c1db30365f590338fd477ac20c564498d9315ca89e9c
SBETS_TOKEN_ADDRESS=0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285::sbets::SBETS
```

## Post-Deployment Setup

### 1. Mint an OracleCap for automated settlement:
The backend settlement worker needs an OracleCap. You can use the AdminCap directly (via `settle_bet_admin` functions) or mint an OracleCap:
```bash
sui client call --package 0xNEW_PACKAGE_ID --module betting --function mint_oracle_cap \
  --args 0xADMIN_CAP_ID 0xSETTLEMENT_WALLET_ADDRESS 0x6 --gas-budget 10000000
```

### 2. Deposit initial SUI liquidity:
```bash
sui client call --package 0xNEW_PACKAGE_ID --module betting --function deposit_liquidity \
  --args 0xADMIN_CAP_ID 0xNEW_PLATFORM_ID 0xYOUR_SUI_COIN_ID 0x6 --gas-budget 10000000
```

### 3. Deposit initial SBETS liquidity:
Get your SBETS coin object ID first: `sui client coins --coin-type 0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285::sbets::SBETS`
```bash
sui client call --package 0xNEW_PACKAGE_ID --module betting --function deposit_liquidity_sbets \
  --args 0xADMIN_CAP_ID 0xNEW_PLATFORM_ID 0xYOUR_SBETS_COIN_ID 0x6 --gas-budget 10000000
```

## Revenue Withdrawal

### Withdraw SUI fees:
```bash
sui client call --package 0xNEW_PACKAGE_ID --module betting --function withdraw_fees \
  --args 0xADMIN_CAP_ID 0xNEW_PLATFORM_ID AMOUNT_IN_MIST 0xRECIPIENT_ADDRESS 0x6 --gas-budget 10000000
```

### Withdraw SBETS fees:
```bash
sui client call --package 0xNEW_PACKAGE_ID --module betting --function withdraw_fees_sbets \
  --args 0xADMIN_CAP_ID 0xNEW_PLATFORM_ID AMOUNT_IN_MIST 0xRECIPIENT_ADDRESS 0x6 --gas-budget 10000000
```

## Security Best Practices

### AdminCap Protection
- The AdminCap is the **most critical security object**
- Store the wallet holding AdminCap securely (hardware wallet recommended)
- The ADMIN_CAP_ID environment variable is safe to store - it's just an object reference
- Only the wallet that **owns** the AdminCap can use it in transactions
- The private key (ADMIN_PRIVATE_KEY) is what authorizes transactions

### OracleCap Management
- Mint OracleCaps only for trusted settlement services
- Revoke OracleCaps immediately if a settlement service is compromised
- Each OracleCap has a unique ID that can be tracked on-chain

### Operational Security
- Use `set_pause(true)` immediately if suspicious activity detected
- Emergency withdrawal functions only work when platform is paused
- All capability operations emit events for audit trail

## Verification

### Check platform status:
```bash
sui client object 0xNEW_PLATFORM_ID
```

### Check your AdminCap:
```bash
sui client object 0xADMIN_CAP_ID
```

### View contract events:
```bash
sui client events --query '{"Package":"0xNEW_PACKAGE_ID"}'
```
