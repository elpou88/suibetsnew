import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';

/**
 * This script will initialize the database with our tables and seed data.
 * Run with: npx tsx scripts/init-db.ts
 */
async function main() {
  try {
    // Get the database connection string from environment variables
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not defined');
    }

    console.log('Connecting to database...');

    // Create the database connection
    const sql = postgres(connectionString, { max: 10 });
    const db = drizzle(sql, { schema });

    // Create extension for UUID generation
    console.log('Creating extensions...');
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

    // Create tables directly
    console.log('Creating tables...');
    
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT,
        wallet_address TEXT UNIQUE,
        wallet_fingerprint TEXT UNIQUE,
        wallet_type TEXT DEFAULT 'Sui',
        balance REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        wurlus_profile_id TEXT,
        wurlus_registered BOOLEAN DEFAULT FALSE,
        wurlus_profile_created_at TIMESTAMP,
        last_login_at TIMESTAMP
      )
    `;

    // Create sports table
    await sql`
      CREATE TABLE IF NOT EXISTS sports (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        icon TEXT,
        wurlus_sport_id TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        provider_id TEXT
      )
    `;

    // Create events table
    await sql`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        sport_id INTEGER REFERENCES sports(id),
        league_name TEXT NOT NULL,
        league_slug TEXT NOT NULL,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        start_time TIMESTAMP NOT NULL,
        home_odds REAL,
        draw_odds REAL,
        away_odds REAL,
        is_live BOOLEAN DEFAULT FALSE,
        score TEXT,
        status TEXT DEFAULT 'upcoming',
        metadata JSONB,
        wurlus_event_id TEXT,
        wurlus_market_ids TEXT[],
        created_on_chain BOOLEAN DEFAULT FALSE,
        event_hash TEXT,
        provider_id TEXT
      )
    `;

    // Create markets table
    await sql`
      CREATE TABLE IF NOT EXISTS markets (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id),
        name TEXT NOT NULL,
        market_type TEXT NOT NULL,
        status TEXT DEFAULT 'open',
        wurlus_market_id TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        settled_at TIMESTAMP,
        creator_address TEXT,
        liquidity_pool REAL DEFAULT 0,
        transaction_hash TEXT
      )
    `;

    // Create outcomes table
    await sql`
      CREATE TABLE IF NOT EXISTS outcomes (
        id SERIAL PRIMARY KEY,
        market_id INTEGER REFERENCES markets(id),
        name TEXT NOT NULL,
        odds REAL NOT NULL,
        probability REAL,
        status TEXT DEFAULT 'active',
        wurlus_outcome_id TEXT NOT NULL UNIQUE,
        transaction_hash TEXT,
        is_winner BOOLEAN DEFAULT FALSE
      )
    `;

    // Create bets table
    await sql`
      CREATE TABLE IF NOT EXISTS bets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        event_id INTEGER REFERENCES events(id),
        market_id INTEGER REFERENCES markets(id),
        outcome_id INTEGER REFERENCES outcomes(id),
        bet_amount REAL NOT NULL,
        odds REAL NOT NULL,
        prediction TEXT NOT NULL,
        potential_payout REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        result TEXT,
        payout REAL,
        settled_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        wurlus_bet_id TEXT,
        tx_hash TEXT,
        platform_fee REAL,
        network_fee REAL,
        fee_currency TEXT DEFAULT 'SUI'
      )
    `;

    // Create wurlus_staking table
    await sql`
      CREATE TABLE IF NOT EXISTS wurlus_staking (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        wallet_address TEXT NOT NULL,
        amount_staked REAL NOT NULL,
        staking_date TIMESTAMP DEFAULT NOW(),
        unstaking_date TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        tx_hash TEXT,
        locked_until TIMESTAMP,
        reward_rate REAL,
        accumulated_rewards REAL DEFAULT 0
      )
    `;

    // Create wurlus_dividends table
    await sql`
      CREATE TABLE IF NOT EXISTS wurlus_dividends (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        wallet_address TEXT NOT NULL,
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        dividend_amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        claimed_at TIMESTAMP,
        claim_tx_hash TEXT,
        platform_fee REAL
      )
    `;

    // Create wurlus_wallet_operations table
    await sql`
      CREATE TABLE IF NOT EXISTS wurlus_wallet_operations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        wallet_address TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        amount REAL NOT NULL,
        tx_hash TEXT NOT NULL,
        status TEXT DEFAULT 'completed',
        timestamp TIMESTAMP DEFAULT NOW(),
        metadata JSONB
      )
    `;

    // Create promotions table
    await sql`
      CREATE TABLE IF NOT EXISTS promotions (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        image_url TEXT,
        type TEXT NOT NULL,
        amount REAL,
        code TEXT,
        min_deposit REAL,
        rollover_sports REAL,
        rollover_casino REAL,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        wurlus_promotion_id TEXT,
        smart_contract_address TEXT,
        requirements TEXT,
        terms_and_conditions TEXT,
        max_reward REAL
      )
    `;

    // Create notifications table
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        related_tx_hash TEXT,
        notification_type TEXT DEFAULT 'app',
        priority TEXT DEFAULT 'normal'
      )
    `;

    console.log('All tables created successfully!');

    // Seed initial data
    await seedSports(db);
    await seedPromotions(db);

    console.log('Seeding completed!');

    // Close the database connection
    await sql.end();
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

async function seedSports(db: any) {
  try {
    // Check if sports already exist
    const existingSports = await db.select().from(schema.sports);
    
    if (existingSports.length > 0) {
      console.log(`Found ${existingSports.length} existing sports, skipping seed`);
      return;
    }
    
    console.log('Seeding sports data...');
    
    // Default sports data
    const sportsData = [
      { 
        name: 'Soccer', 
        slug: 'soccer',
        icon: '⚽',
        wurlusSportId: 'soccer_wurlus_id',
        isActive: true,
        providerId: 'sports_provider_1'
      },
      { 
        name: 'Basketball', 
        slug: 'basketball',
        icon: '🏀',
        wurlusSportId: 'basketball_wurlus_id',
        isActive: true,
        providerId: 'sports_provider_1'
      },
      { 
        name: 'Tennis', 
        slug: 'tennis',
        icon: '🎾',
        wurlusSportId: 'tennis_wurlus_id',
        isActive: true,
        providerId: 'sports_provider_1'
      },
      { 
        name: 'American Football', 
        slug: 'american-football',
        icon: '🏈',
        wurlusSportId: 'football_wurlus_id',
        isActive: true,
        providerId: 'sports_provider_1'
      },
      { 
        name: 'Baseball', 
        slug: 'baseball',
        icon: '⚾',
        wurlusSportId: 'baseball_wurlus_id',
        isActive: true,
        providerId: 'sports_provider_1'
      },
      { 
        name: 'Ice Hockey', 
        slug: 'ice-hockey',
        icon: '🏒',
        wurlusSportId: 'hockey_wurlus_id',
        isActive: true,
        providerId: 'sports_provider_1'
      },
      { 
        name: 'MMA', 
        slug: 'mma',
        icon: '🥊',
        wurlusSportId: 'mma_wurlus_id',
        isActive: true,
        providerId: 'sports_provider_2'
      },
      { 
        name: 'Boxing', 
        slug: 'boxing',
        icon: '🥊',
        wurlusSportId: 'boxing_wurlus_id',
        isActive: true,
        providerId: 'sports_provider_2'
      },
      { 
        name: 'Esports', 
        slug: 'esports',
        icon: '🎮',
        wurlusSportId: 'esports_wurlus_id',
        isActive: true,
        providerId: 'sports_provider_3'
      }
    ];
    
    // Insert sports data
    await db.insert(schema.sports).values(sportsData);
    
    console.log(`Seeded ${sportsData.length} sports`);
  } catch (error) {
    console.error('Error seeding sports data:', error);
    throw error;
  }
}

async function seedPromotions(db: any) {
  try {
    // Check if promotions already exist
    const existingPromotions = await db.select().from(schema.promotions);
    
    if (existingPromotions.length > 0) {
      console.log(`Found ${existingPromotions.length} existing promotions, skipping seed`);
      return;
    }
    
    console.log('Seeding promotions data...');
    
    // Default promotions data
    const promotionsData = [
      {
        title: 'Welcome Bonus',
        description: 'Get 100% bonus on your first deposit up to 1000 SUI',
        type: 'deposit',
        code: 'WELCOME100',
        isActive: true,
        amount: 1000,
        minDeposit: 100,
        maxReward: 1000,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        requirements: 'First-time deposit',
        termsAndConditions: 'Must wager bonus amount 10x before withdrawal',
        imageUrl: '/images/welcome-bonus.jpg',
        smartContractAddress: null
      },
      {
        title: 'Refer a Friend',
        description: 'Get 50 SUI for each friend you refer to our platform',
        type: 'referral',
        code: 'REFER50',
        isActive: true,
        amount: 50,
        minDeposit: 0,
        maxReward: 500,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        requirements: 'Referred friend must deposit at least 100 SUI',
        termsAndConditions: 'Bonus paid once friend completes first bet',
        imageUrl: '/images/refer-friend.jpg',
        smartContractAddress: null
      },
      {
        title: 'Enhanced Odds',
        description: 'Get enhanced odds on selected Esports matches',
        type: 'odds',
        code: 'ESPORTS',
        isActive: true,
        amount: null,
        minDeposit: 10,
        maxReward: 500,
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        requirements: 'Valid for Esports bets only',
        termsAndConditions: 'Maximum bet amount of 100 SUI per match',
        imageUrl: '/images/enhanced-odds.jpg',
        smartContractAddress: null
      },
      {
        title: 'Loyalty Program',
        description: 'Earn loyalty points for every bet you place',
        type: 'loyalty',
        code: 'LOYALTY',
        isActive: true,
        amount: null,
        minDeposit: 0,
        maxReward: null,
        startDate: new Date(),
        endDate: null, // No end date
        requirements: 'Must have an active account',
        termsAndConditions: 'Points can be redeemed for free bets or merchandise',
        imageUrl: '/images/loyalty.jpg',
        smartContractAddress: null
      },
      {
        title: 'Staking Rewards',
        description: 'Stake SUI tokens and earn weekly rewards',
        type: 'staking',
        code: 'STAKE',
        isActive: true,
        amount: null,
        minDeposit: 500,
        maxReward: null,
        startDate: new Date(),
        endDate: null, // No end date
        requirements: 'Minimum staking period of 30 days',
        termsAndConditions: 'Rewards paid weekly based on staking amount',
        imageUrl: '/images/staking.jpg',
        smartContractAddress: '0xabc123def456sui'
      }
    ];
    
    // Insert promotions data
    await db.insert(schema.promotions).values(promotionsData);
    
    console.log(`Seeded ${promotionsData.length} promotions`);
  } catch (error) {
    console.error('Error seeding promotions data:', error);
    throw error;
  }
}

// Run the main function
main();