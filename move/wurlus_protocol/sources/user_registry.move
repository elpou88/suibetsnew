module wurlus_protocol::user_registry {
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
    use sui::vec_map::{Self, VecMap};
    use sui::bag::{Self, Bag};

    // Errors
    const EUserNotFound: u64 = 0;
    const EUserAlreadyExists: u64 = 1;
    const EUsernameTaken: u64 = 2;
    const ENotAuthorized: u64 = 3;
    const EInvalidUsername: u64 = 4;
    const EInvalidEmail: u64 = 5;
    const EWalletAlreadyConnected: u64 = 6;

    // User status constants
    const STATUS_ACTIVE: u8 = 0;
    const STATUS_SUSPENDED: u8 = 1;
    const STATUS_RESTRICTED: u8 = 2;

    // Capability to manage users
    struct AdminCap has key {
        id: UID
    }

    // Capability for users to authenticate themselves
    struct UserAuthCap has key, store {
        id: UID,
        user_id: ID
    }

    // Registry to store all users
    struct UserRegistry has key {
        id: UID,
        users: Table<ID, User>,
        usernames: Table<String, ID>,
        version: u64
    }
    
    // User account with personal information
    struct User has store {
        id: ID,
        username: String,
        email: String,
        status: u8,
        wallet_address: String,
        wallet_fingerprint: String,
        balance: u64,
        created_at: u64,
        last_login: u64,
        metadata: Bag // For extensible properties
    }

    // Profile settings, stored as a dynamic field
    struct UserProfile has store {
        display_name: String,
        avatar_url: String,
        bio: String,
        preferences: VecMap<String, String>
    }

    // Secure storage for sensitive data
    struct UserSecureStorage has store {
        password_hash: String, // Encrypted hash stored on-chain
        mfa_enabled: bool
    }

    // Events
    struct UserRegistered has copy, drop {
        user_id: ID,
        username: String,
        wallet_address: String,
        created_at: u64
    }

    struct UserUpdated has copy, drop {
        user_id: ID,
        updated_fields: vector<String>,
        updated_at: u64
    }

    struct WalletConnected has copy, drop {
        user_id: ID,
        wallet_address: String,
        connected_at: u64
    }

    // Create a new user registry
    fun init(ctx: &mut TxContext) {
        // Create admin capability
        let admin_cap = AdminCap {
            id: object::new(ctx)
        };
        
        // Create user registry
        let registry = UserRegistry {
            id: object::new(ctx),
            users: table::new(ctx),
            usernames: table::new(ctx),
            version: 0
        };
        
        // Share registry as a shared object
        transfer::share_object(registry);
        
        // Transfer admin cap to transaction sender
        transfer::transfer(admin_cap, tx_context::sender(ctx));
    }

    // Register a new user
    public entry fun register_user(
        registry: &mut UserRegistry,
        username: vector<u8>,
        email: vector<u8>,
        wallet_address: vector<u8>,
        password_hash: vector<u8>,
        current_time: u64,
        ctx: &mut TxContext
    ) {
        let username_str = string::utf8(username);
        let email_str = string::utf8(email);
        let wallet_addr_str = string::utf8(wallet_address);
        
        // Validate username
        assert!(!string::is_empty(&username_str) && string::length(&username_str) >= 3, EInvalidUsername);
        
        // Validate email
        assert!(!string::is_empty(&email_str) && string::index_of(&email_str, &string::utf8(b"@")) != string::length(&email_str), EInvalidEmail);
        
        // Check if username is already taken
        assert!(!table::contains(&registry.usernames, username_str), EUsernameTaken);
        
        // Generate wallet fingerprint (simplified version, in real implementation use crypto hashing)
        let wallet_fingerprint = string::utf8(b"fp_");
        string::append(&mut wallet_fingerprint, wallet_addr_str);
        
        // Create unique ID for user
        let user_id = object::new(ctx);
        let user_id_inner = object::uid_to_inner(&user_id);
        
        // Create metadata bag for extensible properties
        let metadata = bag::new(ctx);
        
        // Create user object
        let user = User {
            id: user_id_inner,
            username: username_str,
            email: email_str,
            status: STATUS_ACTIVE,
            wallet_address: wallet_addr_str,
            wallet_fingerprint,
            balance: 0,
            created_at: current_time,
            last_login: current_time,
            metadata
        };
        
        // Add user to registry
        table::add(&mut registry.users, user_id_inner, user);
        table::add(&mut registry.usernames, username_str, user_id_inner);
        
        // Create and store secure information as a dynamic field
        let secure_storage = UserSecureStorage {
            password_hash: string::utf8(password_hash),
            mfa_enabled: false
        };
        
        // Add secure storage as a dynamic field to the user ID
        df::add(&mut registry.id, (user_id_inner, b"secure"), secure_storage);
        
        // Create user profile
        let profile = UserProfile {
            display_name: username_str,
            avatar_url: string::utf8(b""),
            bio: string::utf8(b""),
            preferences: vec_map::empty()
        };
        
        // Add profile as a dynamic field to the user ID
        df::add(&mut registry.id, (user_id_inner, b"profile"), profile);
        
        // Create user authentication capability
        let auth_cap = UserAuthCap {
            id: object::new(ctx),
            user_id: user_id_inner
        };
        
        // Transfer auth capability to the user
        transfer::transfer(auth_cap, tx_context::sender(ctx));
        
        // Delete the temporary UID
        object::delete(user_id);
        
        // Emit user registered event
        event::emit(UserRegistered {
            user_id: user_id_inner,
            username: username_str,
            wallet_address: wallet_addr_str,
            created_at: current_time
        });
        
        // Increment registry version
        registry.version = registry.version + 1;
    }

    // Connect a wallet to a user account
    public entry fun connect_wallet(
        registry: &mut UserRegistry,
        auth_cap: &UserAuthCap,
        wallet_address: vector<u8>,
        current_time: u64,
        ctx: &mut TxContext
    ) {
        // Verify auth cap belongs to a valid user
        let user_id = auth_cap.user_id;
        assert!(table::contains(&registry.users, user_id), EUserNotFound);
        
        // Get user
        let user = table::borrow_mut(&mut registry.users, user_id);
        
        // Convert wallet address to string
        let wallet_addr_str = string::utf8(wallet_address);
        
        // Update wallet info
        user.wallet_address = wallet_addr_str;
        
        // Generate new wallet fingerprint (simplified version)
        let new_fingerprint = string::utf8(b"fp_");
        string::append(&mut new_fingerprint, wallet_addr_str);
        user.wallet_fingerprint = new_fingerprint;
        
        // Emit wallet connected event
        event::emit(WalletConnected {
            user_id,
            wallet_address: wallet_addr_str,
            connected_at: current_time
        });
        
        // Increment registry version
        registry.version = registry.version + 1;
    }

    // Update user profile
    public entry fun update_profile(
        registry: &mut UserRegistry,
        auth_cap: &UserAuthCap,
        display_name: vector<u8>,
        avatar_url: vector<u8>,
        bio: vector<u8>,
        current_time: u64,
        ctx: &mut TxContext
    ) {
        // Verify auth cap belongs to a valid user
        let user_id = auth_cap.user_id;
        assert!(table::contains(&registry.users, user_id), EUserNotFound);
        
        // Get user's profile
        assert!(df::exists_with_type<(ID, vector<u8>), UserProfile>(&registry.id, (user_id, b"profile")), EUserNotFound);
        let profile = df::borrow_mut<(ID, vector<u8>), UserProfile>(&mut registry.id, (user_id, b"profile"));
        
        // Update profile fields
        profile.display_name = string::utf8(display_name);
        profile.avatar_url = string::utf8(avatar_url);
        profile.bio = string::utf8(bio);
        
        // Prepare updated fields list
        let updated_fields = vector[
            string::utf8(b"display_name"),
            string::utf8(b"avatar_url"),
            string::utf8(b"bio")
        ];
        
        // Emit user updated event
        event::emit(UserUpdated {
            user_id,
            updated_fields,
            updated_at: current_time
        });
        
        // Increment registry version
        registry.version = registry.version + 1;
    }

    // Administrative function to suspend a user
    public entry fun suspend_user(
        registry: &mut UserRegistry,
        admin_cap: &AdminCap,
        user_id: ID,
        ctx: &mut TxContext
    ) {
        // Verify user exists
        assert!(table::contains(&registry.users, user_id), EUserNotFound);
        
        // Get user
        let user = table::borrow_mut(&mut registry.users, user_id);
        
        // Update status
        user.status = STATUS_SUSPENDED;
        
        // Increment registry version
        registry.version = registry.version + 1;
    }

    // Get user information (read-only)
    public fun get_user_info(registry: &UserRegistry, user_id: ID): (String, String, u8, u64) {
        assert!(table::contains(&registry.users, user_id), EUserNotFound);
        
        let user = table::borrow(&registry.users, user_id);
        (user.username, user.email, user.status, user.balance)
    }

    // Check if a username is available
    public fun is_username_available(registry: &UserRegistry, username: String): bool {
        !table::contains(&registry.usernames, username)
    }

    // Get user by username
    public fun get_user_id_by_username(registry: &UserRegistry, username: String): ID {
        assert!(table::contains(&registry.usernames, username), EUserNotFound);
        *table::borrow(&registry.usernames, username)
    }

    // Get user by auth capability
    public fun get_user_id_from_auth(auth_cap: &UserAuthCap): ID {
        auth_cap.user_id
    }

    // Get registry version
    public fun get_version(registry: &UserRegistry): u64 {
        registry.version
    }
}
