module wurlus_protocol::market {
    use std::string::{Self, String};
    use std::vector;
    use std::option::{Self, Option};
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::event;
    use sui::table::{Self, Table};

    // Errors
    const EMarketNotOpen: u64 = 0;
    const EInvalidStatus: u64 = 1;
    const EOutcomeAlreadyExists: u64 = 2;
    const EOutcomeNotFound: u64 = 3;
    const ENotMarketOwner: u64 = 4;
    const EMarketAlreadySettled: u64 = 5;

    // Market status
    const STATUS_OPEN: u8 = 0;
    const STATUS_CLOSED: u8 = 1;
    const STATUS_SETTLED: u8 = 2;
    const STATUS_CANCELED: u8 = 3;

    // Market structure
    struct Market has key {
        id: UID,
        name: String,
        market_type: String, // moneyline, over-under, etc.
        event_id: ID,
        status: u8,
        outcomes: Table<ID, Outcome>,
        liquidity_pool: Balance<SUI>,
        created_at: u64,
        settled_at: Option<u64>,
        creator: address,
        transaction_hash: String
    }

    // Outcome structure
    struct Outcome has store {
        id: ID,
        name: String,
        odds: u64, // Multiplied by 100 for precision (e.g., 2.50 = 250)
        probability: Option<u64>,
        status: u8,
        is_winner: bool
    }

    // Market owner capability
    struct MarketOwnerCap has key {
        id: UID,
        market_id: ID,
        event_id: ID,
        owner: address
    }

    // Events
    struct MarketCreated has copy, drop {
        market_id: ID,
        name: String,
        event_id: ID,
        creator: address,
        created_at: u64
    }

    struct OutcomeAdded has copy, drop {
        market_id: ID,
        outcome_id: ID,
        name: String,
        odds: u64
    }

    struct MarketSettled has copy, drop {
        market_id: ID,
        winning_outcome_id: Option<ID>,
        settled_at: u64
    }

    // Create a new market
    public entry fun create_market(
        name: vector<u8>,
        market_type: vector<u8>,
        event_id: ID,
        transaction_hash: vector<u8>,
        ctx: &mut TxContext
    ) {
        let creator = tx_context::sender(ctx);
        let current_time = tx_context::epoch(ctx);
        
        let market_id = object::new(ctx);
        let market = Market {
            id: market_id,
            name: string::utf8(name),
            market_type: string::utf8(market_type),
            event_id,
            status: STATUS_OPEN,
            outcomes: table::new(ctx),
            liquidity_pool: balance::zero(),
            created_at: current_time,
            settled_at: option::none(),
            creator,
            transaction_hash: string::utf8(transaction_hash)
        };
        
        // Create owner capability
        let owner_cap = MarketOwnerCap {
            id: object::new(ctx),
            market_id: object::uid_to_inner(&market.id),
            event_id,
            owner: creator
        };
        
        // Transfer ownership to creator
        transfer::transfer(owner_cap, creator);
        
        // Make market available
        transfer::share_object(market);
        
        // Emit event
        event::emit(MarketCreated {
            market_id: object::uid_to_inner(&market_id),
            name: string::utf8(name),
            event_id,
            creator,
            created_at: current_time
        });
    }

    // Add outcome to a market
    public entry fun add_outcome(
        market: &mut Market,
        owner_cap: &MarketOwnerCap,
        name: vector<u8>,
        odds: u64,
        probability: Option<u64>,
        ctx: &mut TxContext
    ) {
        // Check if caller is market owner
        let market_id = object::uid_to_inner(&market.id);
        assert!(owner_cap.market_id == market_id, ENotMarketOwner);
        assert!(owner_cap.owner == tx_context::sender(ctx), ENotMarketOwner);
        
        // Check if market is still open
        assert!(market.status == STATUS_OPEN, EMarketNotOpen);
        
        // Create outcome
        let outcome_id = object::new(ctx);
        let outcome = Outcome {
            id: object::uid_to_inner(&outcome_id),
            name: string::utf8(name),
            odds,
            probability,
            status: STATUS_OPEN,
            is_winner: false
        };
        
        // Add outcome to market
        table::add(&mut market.outcomes, object::uid_to_inner(&outcome_id), outcome);
        
        // Emit event
        event::emit(OutcomeAdded {
            market_id,
            outcome_id: object::uid_to_inner(&outcome_id),
            name: string::utf8(name),
            odds
        });
        
        object::delete(outcome_id);
    }

    // Close a market (no more bets allowed)
    public entry fun close_market(
        market: &mut Market,
        owner_cap: &MarketOwnerCap,
        ctx: &mut TxContext
    ) {
        // Check if caller is market owner
        let market_id = object::uid_to_inner(&market.id);
        assert!(owner_cap.market_id == market_id, ENotMarketOwner);
        assert!(owner_cap.owner == tx_context::sender(ctx), ENotMarketOwner);
        
        // Check if market is still open
        assert!(market.status == STATUS_OPEN, EMarketNotOpen);
        
        // Close market
        market.status = STATUS_CLOSED;
    }

    // Settle a market (determine outcome)
    public entry fun settle_market(
        market: &mut Market,
        owner_cap: &MarketOwnerCap,
        winning_outcome_id: Option<ID>,
        ctx: &mut TxContext
    ) {
        // Check if caller is market owner
        let market_id = object::uid_to_inner(&market.id);
        assert!(owner_cap.market_id == market_id, ENotMarketOwner);
        assert!(owner_cap.owner == tx_context::sender(ctx), ENotMarketOwner);
        
        // Check if market is closed but not settled
        assert!(market.status == STATUS_CLOSED, EInvalidStatus);
        
        // Update market status
        market.status = STATUS_SETTLED;
        market.settled_at = option::some(tx_context::epoch(ctx));
        
        // If there's a winning outcome, mark it
        if (option::is_some(&winning_outcome_id)) {
            let winner_id = *option::borrow(&winning_outcome_id);
            
            // Ensure outcome exists
            assert!(table::contains(&market.outcomes, winner_id), EOutcomeNotFound);
            
            // Mark outcome as winner
            let outcome = table::borrow_mut(&mut market.outcomes, winner_id);
            outcome.is_winner = true;
        }
        
        // Emit event
        event::emit(MarketSettled {
            market_id,
            winning_outcome_id,
            settled_at: *option::borrow(&market.settled_at)
        });
    }

    // Cancel a market (refund all bets)
    public entry fun cancel_market(
        market: &mut Market,
        owner_cap: &MarketOwnerCap,
        ctx: &mut TxContext
    ) {
        // Check if caller is market owner
        let market_id = object::uid_to_inner(&market.id);
        assert!(owner_cap.market_id == market_id, ENotMarketOwner);
        assert!(owner_cap.owner == tx_context::sender(ctx), ENotMarketOwner);
        
        // Check if market is not already settled
        assert!(market.status != STATUS_SETTLED, EMarketAlreadySettled);
        
        // Update market status
        market.status = STATUS_CANCELED;
        market.settled_at = option::some(tx_context::epoch(ctx));
        
        // In a real implementation, process refunds for all bets
        
        // Emit event
        event::emit(MarketSettled {
            market_id,
            winning_outcome_id: option::none(),
            settled_at: *option::borrow(&market.settled_at)
        });
    }

    // Add to the market's liquidity pool
    public fun add_to_liquidity_pool(market: &mut Market, coin: Coin<SUI>) {
        let value = coin::value(&coin);
        coin::put(&mut market.liquidity_pool, coin);
    }

    // Utility functions
    public fun is_open(market: &Market): bool {
        market.status == STATUS_OPEN
    }
    
    public fun is_closed(market: &Market): bool {
        market.status == STATUS_CLOSED
    }
    
    public fun is_settled(market: &Market): bool {
        market.status == STATUS_SETTLED
    }
    
    public fun is_canceled(market: &Market): bool {
        market.status == STATUS_CANCELED
    }
    
    public fun has_outcome(market: &Market, outcome_id: ID): bool {
        table::contains(&market.outcomes, outcome_id)
    }
    
    public fun get_outcome_details(market: &Market, outcome_id: ID): (String, u64) {
        let outcome = table::borrow(&market.outcomes, outcome_id);
        (outcome.name, outcome.odds)
    }
    
    public fun is_market_owner(cap: &MarketOwnerCap, market_id: ID): bool {
        cap.market_id == market_id
    }
    
    public fun get_id(market: &Market): ID {
        object::uid_to_inner(&market.id)
    }
    
    public fun get_name(market: &Market): String {
        market.name
    }
    
    public fun get_liquidity_pool_value(market: &Market): u64 {
        balance::value(&market.liquidity_pool)
    }
}
