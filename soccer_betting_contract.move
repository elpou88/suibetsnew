module wurlus_protocol::soccer_betting {
    use sui::object::{Self, ID, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use sui::table::{Self, Table};
    use sui::clock::{Self, Clock};
    use std::string::{Self, String};
    use std::vector;
    
    /// Error codes
    const EInvalidOdds: u64 = 1;
    const EInvalidBetAmount: u64 = 2;
    const EMatchNotFound: u64 = 3;
    const EMatchAlreadyStarted: u64 = 4;
    const EMatchAlreadyEnded: u64 = 5;
    const EUnauthorizedOracle: u64 = 6;
    const EBetNotFound: u64 = 7;
    const EBetAlreadySettled: u64 = 8;
    const EInvalidOutcome: u64 = 9;
    
    /// Market types for soccer betting
    const MARKET_1X2: u8 = 0; // Home win, draw, away win
    const MARKET_OVER_UNDER: u8 = 1; // Over/under goals
    const MARKET_BTTS: u8 = 2; // Both teams to score
    const MARKET_CORRECT_SCORE: u8 = 3; // Exact score prediction
    
    /// Possible bet outcomes for 1X2 market
    const OUTCOME_HOME_WIN: u8 = 1;
    const OUTCOME_DRAW: u8 = 2;
    const OUTCOME_AWAY_WIN: u8 = 3;
    
    /// Soccer match structure
    struct SoccerMatch has key, store {
        id: UID,
        match_id: String, // External ID from data provider
        home_team: String,
        away_team: String,
        league: String,
        start_time: u64, // Unix timestamp
        end_time: u64, // Unix timestamp
        status: u8, // 0 = scheduled, 1 = in progress, 2 = completed
        home_score: u8,
        away_score: u8,
        markets: Table<u8, Market>, // Different betting markets available
        oracle_address: address, // Address authorized to update results
    }
    
    /// Market structure with odds
    struct Market has store {
        market_type: u8,
        outcomes: Table<u8, u64>, // Outcome ID -> odds (in basis points, 10000 = evens)
        is_active: bool,
    }
    
    /// Bet placed by a user
    struct Bet has key, store {
        id: UID,
        match_id: ID,
        bettor: address,
        market_type: u8,
        outcome: u8,
        amount: u64,
        odds: u64, // Locked odds at time of bet
        timestamp: u64,
        is_settled: bool,
        is_winner: bool,
    }
    
    /// Registry of all soccer matches
    struct SoccerMatchRegistry has key {
        id: UID,
        matches: Table<ID, bool>, // Match ID -> exists
        house_balance: Coin<SUI>,
        house_fee_pct: u64, // Fee in basis points (10000 = 100%)
    }
    
    /// Events
    struct MatchCreated has copy, drop {
        match_id: ID,
        external_id: String,
        home_team: String,
        away_team: String,
        start_time: u64,
    }
    
    struct BetPlaced has copy, drop {
        bet_id: ID,
        match_id: ID,
        bettor: address,
        market_type: u8,
        outcome: u8,
        amount: u64,
        odds: u64,
    }
    
    struct BetSettled has copy, drop {
        bet_id: ID,
        is_winner: bool,
        payout_amount: u64,
    }
    
    struct MatchResultUpdated has copy, drop {
        match_id: ID,
        home_score: u8,
        away_score: u8,
        status: u8,
    }
    
    // === Initialization ===
    
    fun init(ctx: &mut TxContext) {
        // Create and share the soccer match registry
        let registry = SoccerMatchRegistry {
            id: object::new(ctx),
            matches: table::new(ctx),
            house_balance: coin::zero<SUI>(ctx),
            house_fee_pct: 100, // 1% fee
        };
        transfer::share_object(registry);
    }
    
    // === Match Management Functions ===
    
    /// Create a new soccer match
    public fun create_match(
        registry: &mut SoccerMatchRegistry,
        match_id: String,
        home_team: String,
        away_team: String,
        league: String,
        start_time: u64,
        oracle_address: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock) / 1000;
        assert!(start_time > current_time, EMatchAlreadyStarted);
        
        let match_obj = SoccerMatch {
            id: object::new(ctx),
            match_id,
            home_team,
            away_team,
            league,
            start_time,
            end_time: 0, // Will be set when match ends
            status: 0, // Scheduled
            home_score: 0,
            away_score: 0,
            markets: table::new(ctx),
            oracle_address,
        };
        
        // Create default 1X2 market
        let market_1x2 = Market {
            market_type: MARKET_1X2,
            outcomes: table::new(ctx),
            is_active: true,
        };
        
        // Add default odds (e.g., Home: 2.00, Draw: 3.20, Away: 4.00)
        let outcomes = &mut market_1x2.outcomes;
        table::add(outcomes, OUTCOME_HOME_WIN, 20000); // 2.00 odds (20000 basis points)
        table::add(outcomes, OUTCOME_DRAW, 32000); // 3.20 odds
        table::add(outcomes, OUTCOME_AWAY_WIN, 40000); // 4.00 odds
        
        // Add the market to the match
        table::add(&mut match_obj.markets, MARKET_1X2, market_1x2);
        
        // Add match to registry
        let match_id_obj = object::id(&match_obj);
        table::add(&mut registry.matches, match_id_obj, true);
        
        // Share the match object
        transfer::share_object(match_obj);
        
        // Emit event
        event::emit(MatchCreated {
            match_id: match_id_obj,
            external_id: match_id,
            home_team,
            away_team,
            start_time,
        });
    }
    
    /// Update match odds for a specific market and outcome
    public fun update_odds(
        match_obj: &mut SoccerMatch,
        market_type: u8,
        outcome: u8,
        new_odds: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Verify the match hasn't started
        let current_time = clock::timestamp_ms(clock) / 1000;
        assert!(current_time < match_obj.start_time, EMatchAlreadyStarted);
        
        // Verify caller is the oracle
        assert!(tx_context::sender(ctx) == match_obj.oracle_address, EUnauthorizedOracle);
        
        // Check odds validity (minimum 1.01)
        assert!(new_odds >= 10100, EInvalidOdds);
        
        // Update the odds
        let market = table::borrow_mut(&mut match_obj.markets, market_type);
        *table::borrow_mut(&mut market.outcomes, outcome) = new_odds;
    }
    
    /// Update match result
    public fun update_result(
        match_obj: &mut SoccerMatch,
        home_score: u8,
        away_score: u8,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Verify caller is the oracle
        assert!(tx_context::sender(ctx) == match_obj.oracle_address, EUnauthorizedOracle);
        
        // Set scores and mark as completed
        match_obj.home_score = home_score;
        match_obj.away_score = away_score;
        match_obj.status = 2; // Completed
        match_obj.end_time = clock::timestamp_ms(clock) / 1000;
        
        // Emit event
        event::emit(MatchResultUpdated {
            match_id: object::id(match_obj),
            home_score,
            away_score,
            status: 2,
        });
    }
    
    // === Betting Functions ===
    
    /// Place a bet on a soccer match
    public fun place_bet(
        registry: &mut SoccerMatchRegistry,
        match_obj: &mut SoccerMatch,
        market_type: u8,
        outcome: u8,
        bet_payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Check match is still accepting bets
        let current_time = clock::timestamp_ms(clock) / 1000;
        assert!(current_time < match_obj.start_time, EMatchAlreadyStarted);
        
        // Check market exists and is active
        assert!(table::contains(&match_obj.markets, market_type), EInvalidOutcome);
        let market = table::borrow(&match_obj.markets, market_type);
        assert!(market.is_active, EInvalidOutcome);
        
        // Check outcome is valid
        assert!(table::contains(&market.outcomes, outcome), EInvalidOutcome);
        
        // Get the odds for this outcome
        let odds = *table::borrow(&market.outcomes, outcome);
        
        // Get bet amount
        let bet_amount = coin::value(&bet_payment);
        assert!(bet_amount > 0, EInvalidBetAmount);
        
        // Calculate house fee
        let fee_amount = (bet_amount * registry.house_fee_pct) / 10000;
        let net_bet_amount = bet_amount - fee_amount;
        
        // Add fee to house balance
        let fee_coin = coin::split(&mut bet_payment, fee_amount, ctx);
        coin::join(&mut registry.house_balance, fee_coin);
        
        // Create the bet object
        let bet = Bet {
            id: object::new(ctx),
            match_id: object::id(match_obj),
            bettor: tx_context::sender(ctx),
            market_type,
            outcome,
            amount: net_bet_amount,
            odds,
            timestamp: current_time,
            is_settled: false,
            is_winner: false,
        };
        
        // Keep the user's SUI in the bet object's escrow
        transfer::public_transfer(bet_payment, @wurlus_protocol);
        
        // Transfer bet to user
        transfer::transfer(bet, tx_context::sender(ctx));
        
        // Emit event
        event::emit(BetPlaced {
            bet_id: object::id(&bet),
            match_id: object::id(match_obj),
            bettor: tx_context::sender(ctx),
            market_type,
            outcome,
            amount: net_bet_amount,
            odds,
        });
    }
    
    /// Settle a bet after match result is available
    public fun settle_bet(
        bet: &mut Bet, 
        match_obj: &SoccerMatch,
        registry: &mut SoccerMatchRegistry,
        ctx: &mut TxContext
    ) {
        // Verify bet is for this match
        assert!(bet.match_id == object::id(match_obj), EBetNotFound);
        
        // Verify match is completed
        assert!(match_obj.status == 2, EMatchAlreadyEnded);
        
        // Verify bet is not already settled
        assert!(!bet.is_settled, EBetAlreadySettled);
        
        // Mark bet as settled
        bet.is_settled = true;
        
        // Determine if bet is a winner based on market type and outcome
        let is_winner = false;
        
        if (bet.market_type == MARKET_1X2) {
            // 1X2 market: determine winner based on match result
            let actual_outcome = if (match_obj.home_score > match_obj.away_score) {
                OUTCOME_HOME_WIN
            } else if (match_obj.home_score == match_obj.away_score) {
                OUTCOME_DRAW
            } else {
                OUTCOME_AWAY_WIN
            };
            
            is_winner = bet.outcome == actual_outcome;
        };
        // Other market types would be implemented similarly
        
        bet.is_winner = is_winner;
        
        // Calculate and send payout if the bet is a winner
        let payout_amount = 0;
        
        if (is_winner) {
            // Calculate winnings: bet amount * odds / 10000
            payout_amount = (bet.amount * bet.odds) / 10000;
            
            // Create and send coins
            let payout = coin::take(&mut registry.house_balance, payout_amount, ctx);
            transfer::public_transfer(payout, bet.bettor);
        };
        
        // Emit event
        event::emit(BetSettled {
            bet_id: object::id(bet),
            is_winner,
            payout_amount,
        });
    }
}