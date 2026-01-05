module wurlus_protocol::betting {
    use std::string::{Self, String};
    use std::vector;
    use std::option::{Self, Option};
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use sui::table::{Self, Table};
    use wurlus_protocol::market::{Self, Market, Outcome, MarketOwnerCap};
    
    // Import SBETS token type provided by user
    // Reference: 0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285::sbets::SBETS
    use 0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285::sbets::SBETS;

    // Errors
    const EInsufficientBalance: u64 = 0;
    const EMarketClosed: u64 = 1;
    const EInvalidOutcome: u64 = 2;
    const EBetAlreadySettled: u64 = 3;
    const ENotMarketOwner: u64 = 4;
    const EInvalidBetAmount: u64 = 5;
    const ETransactionFailed: u64 = 6;
    const EInvalidCurrency: u64 = 7;

    // Bet status
    const STATUS_ACTIVE: u8 = 0;
    const STATUS_WON: u8 = 1;
    const STATUS_LOST: u8 = 2;
    const STATUS_REFUNDED: u8 = 3;
    
    // Currency types
    const CURRENCY_SUI: u8 = 0;
    const CURRENCY_SBETS: u8 = 1;

    // Bet structure with currency type
    struct Bet has key {
        id: UID,
        bettor: address,
        market_id: ID,
        outcome_id: ID,
        amount: u64,
        odds: u64, // Multiplied by 100 for precision (e.g., 2.50 = 250)
        potential_payout: u64,
        status: u8,
        placed_at: u64,
        settled_at: Option<u64>,
        tx_hash: String,
        platform_fee: u64,
        network_fee: u64,
        currency_type: u8 // 0 for SUI, 1 for SBETS
    }

    // Bet Receipt given to users
    struct BetReceipt has key, store {
        id: UID,
        bet_id: ID,
        bettor: address,
        market_name: String,
        outcome_name: String,
        amount: u64,
        currency_type: u8,
        odds: u64,
        potential_payout: u64,
        placed_at: u64,
        status: u8
    }

    // Events
    struct BetPlaced has copy, drop {
        bet_id: ID,
        bettor: address,
        market_id: ID,
        outcome_id: ID,
        amount: u64,
        currency_type: u8,
        odds: u64,
        potential_payout: u64,
        placed_at: u64
    }

    struct BetSettled has copy, drop {
        bet_id: ID,
        bettor: address,
        status: u8,
        payout: u64,
        currency_type: u8,
        settled_at: u64
    }
    
    // Wurlus Blob Data for bet verification and transaction integrity
    struct WurlusBlob has copy, drop, store {
        blob_id: ID,
        bet_id: ID,
        transaction_hash: String,
        signature: vector<u8>,
        timestamp: u64,
        data_hash: vector<u8> // Contains hash of the bet parameters for verification
    }

    // Place a bet on a specific outcome using SUI
    public entry fun place_bet_sui(
        market: &Market,
        outcome_id: ID,
        coin: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        // Checks
        assert!(market::is_open(market), EMarketClosed);
        assert!(market::has_outcome(market, outcome_id), EInvalidOutcome);
        
        let bettor = tx_context::sender(ctx);
        let amount = coin::value(&coin);
        assert!(amount > 0, EInvalidBetAmount);
        
        // Get outcome details
        let (outcome_name, odds) = market::get_outcome_details(market, outcome_id);
        
        // Calculate potential payout and fees
        let platform_fee = amount / 20; // 5% platform fee
        let network_fee = amount / 100; // 1% network fee
        let bet_amount = amount - platform_fee - network_fee;
        let potential_payout = (bet_amount * odds) / 100;
        
        // Transfer funds to market's liquidity pool
        market::add_to_liquidity_pool(market, coin);
        
        // Create bet object
        let current_time = tx_context::epoch(ctx);
        let tx_hash = string::utf8(b"sui_tx_");
        
        let bet_id = object::new(ctx);
        let bet_uid = object::uid_to_inner(&bet_id);
        
        // Create a wurlus blob for transaction verification
        let blob_id = object::new(ctx);
        let blob_uid = object::uid_to_inner(&blob_id);
        
        // Create data hash for verification (in real implementation, this would be an actual hash)
        let data_hash = vector[0, 1, 2, 3];
        
        // Create the wurlus blob with signature
        let wurlus_blob = WurlusBlob {
            blob_id: blob_uid,
            bet_id: bet_uid,
            transaction_hash: tx_hash,
            signature: vector[4, 5, 6, 7], // Placeholder for actual signature
            timestamp: current_time,
            data_hash
        };
        
        // Store blob for verification
        df::add(&mut bet_id, string::utf8(b"wurlus_blob"), wurlus_blob);
        
        let bet = Bet {
            id: bet_id,
            bettor,
            market_id: market::get_id(market),
            outcome_id,
            amount: bet_amount,
            odds,
            potential_payout,
            status: STATUS_ACTIVE,
            placed_at: current_time,
            settled_at: option::none(),
            tx_hash,
            platform_fee,
            network_fee,
            currency_type: CURRENCY_SUI
        };
        
        // Create receipt for bettor
        let receipt = BetReceipt {
            id: object::new(ctx),
            bet_id: bet_uid,
            bettor,
            market_name: market::get_name(market),
            outcome_name,
            amount: bet_amount,
            currency_type: CURRENCY_SUI,
            odds,
            potential_payout,
            placed_at: current_time,
            status: STATUS_ACTIVE
        };
        
        // Transfer receipt to bettor
        transfer::transfer(receipt, bettor);
        
        // Store bet in global storage
        transfer::share_object(bet);
        
        // Emit event
        event::emit(BetPlaced {
            bet_id: bet_uid,
            bettor,
            market_id: market::get_id(market),
            outcome_id,
            amount: bet_amount,
            currency_type: CURRENCY_SUI,
            odds,
            potential_payout,
            placed_at: current_time
        });
    }
    
    // Place a bet on a specific outcome using SBETS tokens
    public entry fun place_bet_sbets(
        market: &Market,
        outcome_id: ID,
        coin: Coin<SBETS>,
        ctx: &mut TxContext
    ) {
        // Checks
        assert!(market::is_open(market), EMarketClosed);
        assert!(market::has_outcome(market, outcome_id), EInvalidOutcome);
        
        let bettor = tx_context::sender(ctx);
        let amount = coin::value(&coin);
        assert!(amount > 0, EInvalidBetAmount);
        
        // Get outcome details
        let (outcome_name, odds) = market::get_outcome_details(market, outcome_id);
        
        // Calculate potential payout and fees
        let platform_fee = amount / 20; // 5% platform fee
        let network_fee = amount / 100; // 1% network fee
        let bet_amount = amount - platform_fee - network_fee;
        let potential_payout = (bet_amount * odds) / 100;
        
        // Transfer funds to market's SBETS liquidity pool
        market::add_to_sbets_liquidity_pool(market, coin);
        
        // Create bet object
        let current_time = tx_context::epoch(ctx);
        let tx_hash = string::utf8(b"sbets_tx_");
        
        let bet_id = object::new(ctx);
        let bet_uid = object::uid_to_inner(&bet_id);
        
        // Create a wurlus blob for transaction verification
        let blob_id = object::new(ctx);
        let blob_uid = object::uid_to_inner(&blob_id);
        
        // Create data hash for verification (in real implementation, this would be an actual hash)
        let data_hash = vector[0, 1, 2, 3];
        
        // Create the wurlus blob with signature
        let wurlus_blob = WurlusBlob {
            blob_id: blob_uid,
            bet_id: bet_uid,
            transaction_hash: tx_hash,
            signature: vector[4, 5, 6, 7], // Placeholder for actual signature
            timestamp: current_time,
            data_hash
        };
        
        // Store blob for verification
        df::add(&mut bet_id, string::utf8(b"wurlus_blob"), wurlus_blob);
        
        let bet = Bet {
            id: bet_id,
            bettor,
            market_id: market::get_id(market),
            outcome_id,
            amount: bet_amount,
            odds,
            potential_payout,
            status: STATUS_ACTIVE,
            placed_at: current_time,
            settled_at: option::none(),
            tx_hash,
            platform_fee,
            network_fee,
            currency_type: CURRENCY_SBETS
        };
        
        // Create receipt for bettor
        let receipt = BetReceipt {
            id: object::new(ctx),
            bet_id: bet_uid,
            bettor,
            market_name: market::get_name(market),
            outcome_name,
            amount: bet_amount,
            currency_type: CURRENCY_SBETS,
            odds,
            potential_payout,
            placed_at: current_time,
            status: STATUS_ACTIVE
        };
        
        // Transfer receipt to bettor
        transfer::transfer(receipt, bettor);
        
        // Store bet in global storage
        transfer::share_object(bet);
        
        // Emit event
        event::emit(BetPlaced {
            bet_id: bet_uid,
            bettor,
            market_id: market::get_id(market),
            outcome_id,
            amount: bet_amount,
            currency_type: CURRENCY_SBETS,
            odds,
            potential_payout,
            placed_at: current_time
        });
    }

    // Settle a bet (called by market owner after outcome is determined)
    public entry fun settle_bet(
        bet: &mut Bet,
        market_cap: &MarketOwnerCap,
        winning_outcome_id: Option<ID>,
        ctx: &mut TxContext
    ) {
        // Verify caller is the market owner
        assert!(market::is_market_owner(market_cap, bet.market_id), ENotMarketOwner);
        
        // Verify bet hasn't been settled already
        assert!(bet.status == STATUS_ACTIVE, EBetAlreadySettled);
        
        let current_time = tx_context::epoch(ctx);
        let payout = 0;
        
        // Determine bet result
        if (option::is_some(&winning_outcome_id)) {
            let winner = option::borrow(&winning_outcome_id);
            if (*winner == bet.outcome_id) {
                // Bet won
                bet.status = STATUS_WON;
                payout = bet.potential_payout;
                
                // In a real implementation, transfer funds from market's liquidity pool
                // to bettor, but this requires more complex handling
            } else {
                // Bet lost
                bet.status = STATUS_LOST;
            }
        } else {
            // Market canceled - refund
            bet.status = STATUS_REFUNDED;
            payout = bet.amount;
        }
        
        bet.settled_at = option::some(current_time);
        
        // Emit event
        event::emit(BetSettled {
            bet_id: object::uid_to_inner(&bet.id),
            bettor: bet.bettor,
            status: bet.status,
            payout,
            currency_type: bet.currency_type,
            settled_at: current_time
        });
    }

    // Claim bet winnings for SUI bets
    public entry fun claim_winnings_sui(
        bet: &Bet,
        ctx: &mut TxContext
    ) {
        // Verify bet is settled and won
        assert!(bet.status == STATUS_WON, EBetAlreadySettled);
        
        // Verify bet currency is SUI
        assert!(bet.currency_type == CURRENCY_SUI, EInvalidCurrency);
        
        // In a real implementation, this would:
        // 1. Verify the user owns the corresponding BetReceipt
        // 2. Transfer the winnings from the market's liquidity pool to the bettor
        // 3. Update the bet's status to indicate the winnings have been claimed
    }
    
    // Claim bet winnings for SBETS bets
    public entry fun claim_winnings_sbets(
        bet: &Bet,
        ctx: &mut TxContext
    ) {
        // Verify bet is settled and won
        assert!(bet.status == STATUS_WON, EBetAlreadySettled);
        
        // Verify bet currency is SBETS
        assert!(bet.currency_type == CURRENCY_SBETS, EInvalidCurrency);
        
        // In a real implementation, this would:
        // 1. Verify the user owns the corresponding BetReceipt
        // 2. Transfer the SBETS winnings from the market's SBETS liquidity pool to the bettor
        // 3. Update the bet's status to indicate the winnings have been claimed
    }
    
    // Verify a bet transaction using wurlus blob
    public fun verify_bet_transaction(bet: &Bet): bool {
        let blob_key = string::utf8(b"wurlus_blob");
        
        // Check if blob exists
        if (!df::exists_with_type<String, WurlusBlob>(&bet.id, blob_key)) {
            return false
        }
        
        // Get the blob
        let blob = df::borrow<String, WurlusBlob>(&bet.id, blob_key);
        
        // In a real implementation, this would verify the signature and data hash
        // against the transaction data
        
        // For now, just check that the blob exists and has the same bet ID
        return blob.bet_id == object::uid_to_inner(&bet.id)
    }

    // View functions
    public fun get_bet_status(bet: &Bet): u8 {
        bet.status
    }
    
    public fun get_potential_payout(bet: &Bet): u64 {
        bet.potential_payout
    }
    
    public fun get_bet_amount(bet: &Bet): u64 {
        bet.amount
    }
    
    public fun get_bet_odds(bet: &Bet): u64 {
        bet.odds
    }
    
    public fun get_bet_currency(bet: &Bet): u8 {
        bet.currency_type
    }
    
    public fun is_bet_settled(bet: &Bet): bool {
        bet.status != STATUS_ACTIVE
    }

    public fun get_bettor(bet: &Bet): address {
        bet.bettor
    }
    
    public fun get_currency_name(currency_type: u8): String {
        if (currency_type == CURRENCY_SUI) {
            return string::utf8(b"SUI")
        } else if (currency_type == CURRENCY_SBETS) {
            return string::utf8(b"SBETS")
        } else {
            return string::utf8(b"UNKNOWN")
        }
    }
}
