module wurlus_protocol::wurlus_protocol {
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
    use sui::dynamic_field as df;
    use sui::object_bag::{Self, ObjectBag};
    use sui::dynamic_object_field as dof;
    use wurlus_protocol::market::{Self, Market, MarketOwnerCap};
    use wurlus_protocol::user_registry::{Self, UserRegistry, UserAuthCap};

    // Errors
    const EInsufficientFunds: u64 = 0;
    const EInvalidAmount: u64 = 1;
    const EUnauthorized: u64 = 2;
    const EInvalidMarket: u64 = 3;
    const EInvalidOutcome: u64 = 4;
    const EMarketNotActive: u64 = 5;
    const EInvalidBlob: u64 = 6;
    const EBlobNotFound: u64 = 7;

    // Protocol state
    struct Protocol has key {
        id: UID,
        treasury: Balance<SUI>,
        staking_pool: Balance<SUI>,
        admin: address,
        paused: bool,
        version: u64,
        fee_rate: u64, // In basis points (e.g., 250 = 2.5%)
        blobs: ObjectBag, // For storing dynamic/large objects
        active_markets: u64
    }

    // Admin capability
    struct AdminCap has key {
        id: UID
    }

    // Blob to store large/complex data according to WAL docs pattern
    struct Blob has key, store {
        id: UID,
        owner: address,
        blob_type: String,
        created_at: u64,
        updated_at: u64
    }

    // Type-specific blob data
    struct AggregatedOddsData has store {
        markets: vector<ID>,
        odds_data: vector<u8>, // JSON serialized odds data
        last_updated: u64
    }

    struct LeaderboardData has store {
        users: vector<ID>,
        scores: vector<u64>,
        last_updated: u64
    }

    // Events
    struct ProtocolInitialized has copy, drop {
        admin: address,
        fee_rate: u64,
        initialized_at: u64
    }

    struct ProtocolFeeUpdated has copy, drop {
        old_fee_rate: u64,
        new_fee_rate: u64,
        updated_at: u64
    }

    struct MarketCreated has copy, drop {
        market_id: ID,
        creator: address,
        created_at: u64
    }

    struct BlobCreated has copy, drop {
        blob_id: ID,
        owner: address,
        blob_type: String,
        created_at: u64
    }

    struct BlobUpdated has copy, drop {
        blob_id: ID,
        blob_type: String,
        updated_at: u64
    }

    // Initialize protocol
    fun init(ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        let protocol = Protocol {
            id: object::new(ctx),
            treasury: balance::zero(),
            staking_pool: balance::zero(),
            admin: sender,
            paused: false,
            version: 1,
            fee_rate: 250, // 2.5% default fee
            blobs: object_bag::new(ctx),
            active_markets: 0
        };
        
        // Create admin capability
        let admin_cap = AdminCap {
            id: object::new(ctx)
        };
        
        // Emit initialization event
        event::emit(ProtocolInitialized {
            admin: sender,
            fee_rate: protocol.fee_rate,
            initialized_at: tx_context::epoch(ctx)
        });
        
        // Share protocol as a shared object
        transfer::share_object(protocol);
        
        // Transfer admin cap to sender
        transfer::transfer(admin_cap, sender);
    }

    // Update protocol fee rate (admin only)
    public entry fun update_fee_rate(
        protocol: &mut Protocol,
        admin_cap: &AdminCap,
        new_fee_rate: u64,
        ctx: &mut TxContext
    ) {
        // Verify admin
        assert!(protocol.admin == tx_context::sender(ctx), EUnauthorized);
        
        // Store old fee rate for event
        let old_fee_rate = protocol.fee_rate;
        
        // Update fee rate
        protocol.fee_rate = new_fee_rate;
        
        // Increment version
        protocol.version = protocol.version + 1;
        
        // Emit event
        event::emit(ProtocolFeeUpdated {
            old_fee_rate,
            new_fee_rate,
            updated_at: tx_context::epoch(ctx)
        });
    }

    // Create a blob for storing large/complex data
    public entry fun create_blob(
        protocol: &mut Protocol,
        auth_cap: &UserAuthCap,
        blob_type: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let blob_type_str = string::utf8(blob_type);
        let current_time = tx_context::epoch(ctx);
        
        // Create blob object
        let blob = Blob {
            id: object::new(ctx),
            owner: sender,
            blob_type: blob_type_str,
            created_at: current_time,
            updated_at: current_time
        };
        
        let blob_id = object::id(&blob);
        
        // Add blob to protocol
        object_bag::add(&mut protocol.blobs, blob_id, blob);
        
        // Emit event
        event::emit(BlobCreated {
            blob_id,
            owner: sender,
            blob_type: blob_type_str,
            created_at: current_time
        });
    }

    // Update blob data
    public entry fun update_odds_blob(
        protocol: &mut Protocol,
        auth_cap: &UserAuthCap,
        blob_id: ID,
        markets: vector<ID>,
        odds_data: vector<u8>,
        ctx: &mut TxContext
    ) {
        // Verify blob exists
        assert!(object_bag::contains(&protocol.blobs, blob_id), EBlobNotFound);
        
        // Get the blob
        let blob = object_bag::borrow_mut(&mut protocol.blobs, blob_id);
        
        // Verify caller is blob owner
        assert!(blob.owner == tx_context::sender(ctx), EUnauthorized);
        
        // Verify blob type
        assert!(string::utf8(b"odds") == blob.blob_type, EInvalidBlob);
        
        // Current time
        let current_time = tx_context::epoch(ctx);
        
        // Update blob timestamp
        blob.updated_at = current_time;
        
        // Create or update odds data
        let key = string::utf8(b"odds_data");
        
        // Check if data already exists
        if (df::exists_with_type<String, AggregatedOddsData>(&mut blob.id, key)) {
            // Update existing data
            let data = df::borrow_mut<String, AggregatedOddsData>(&mut blob.id, key);
            data.markets = markets;
            data.odds_data = odds_data;
            data.last_updated = current_time;
        } else {
            // Create new data
            let data = AggregatedOddsData {
                markets,
                odds_data,
                last_updated: current_time
            };
            df::add(&mut blob.id, key, data);
        }
        
        // Emit event
        event::emit(BlobUpdated {
            blob_id,
            blob_type: blob.blob_type,
            updated_at: current_time
        });
    }

    // Update leaderboard blob
    public entry fun update_leaderboard_blob(
        protocol: &mut Protocol,
        auth_cap: &UserAuthCap,
        blob_id: ID,
        users: vector<ID>,
        scores: vector<u64>,
        ctx: &mut TxContext
    ) {
        // Verify blob exists
        assert!(object_bag::contains(&protocol.blobs, blob_id), EBlobNotFound);
        
        // Get the blob
        let blob = object_bag::borrow_mut(&mut protocol.blobs, blob_id);
        
        // Verify caller is blob owner
        assert!(blob.owner == tx_context::sender(ctx), EUnauthorized);
        
        // Verify blob type
        assert!(string::utf8(b"leaderboard") == blob.blob_type, EInvalidBlob);
        
        // Verify vectors have same length
        assert!(vector::length(&users) == vector::length(&scores), EInvalidAmount);
        
        // Current time
        let current_time = tx_context::epoch(ctx);
        
        // Update blob timestamp
        blob.updated_at = current_time;
        
        // Create or update leaderboard data
        let key = string::utf8(b"leaderboard_data");
        
        // Check if data already exists
        if (df::exists_with_type<String, LeaderboardData>(&mut blob.id, key)) {
            // Update existing data
            let data = df::borrow_mut<String, LeaderboardData>(&mut blob.id, key);
            data.users = users;
            data.scores = scores;
            data.last_updated = current_time;
        } else {
            // Create new data
            let data = LeaderboardData {
                users,
                scores,
                last_updated: current_time
            };
            df::add(&mut blob.id, key, data);
        }
        
        // Emit event
        event::emit(BlobUpdated {
            blob_id,
            blob_type: blob.blob_type,
            updated_at: current_time
        });
    }

    // Register a market with the protocol
    public entry fun register_market(
        protocol: &mut Protocol,
        market_id: ID,
        market_owner_cap: &MarketOwnerCap,
        ctx: &mut TxContext
    ) {
        // Verify market owner
        assert!(market::is_market_owner(market_owner_cap, market_id), EUnauthorized);
        
        // Increment active markets count
        protocol.active_markets = protocol.active_markets + 1;
        
        // Emit event
        event::emit(MarketCreated {
            market_id,
            creator: tx_context::sender(ctx),
            created_at: tx_context::epoch(ctx)
        });
    }

    // Get protocol fee rate
    public fun get_fee_rate(protocol: &Protocol): u64 {
        protocol.fee_rate
    }

    // Check if protocol is paused
    public fun is_paused(protocol: &Protocol): bool {
        protocol.paused
    }

    // Get active markets count
    public fun get_active_markets(protocol: &Protocol): u64 {
        protocol.active_markets
    }

    // Get protocol version
    public fun get_version(protocol: &Protocol): u64 {
        protocol.version
    }
}
