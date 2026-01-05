import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from '../shared/schema';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * This script will push the schema to the database.
 * Run with: npx tsx scripts/db-push.ts
 */
async function main() {
  try {
    // Get the database connection string from environment variables
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not defined');
    }

    console.log('Pushing schema to database...');

    // Use drizzle-kit push to create or update tables
    try {
      // Run drizzle-kit push as a child process
      const { stdout, stderr } = await execPromise('npx drizzle-kit push');
      console.log('Drizzle Push Output:', stdout);
      if (stderr) {
        console.error('Drizzle Push Error:', stderr);
      }
    } catch (error) {
      console.error('Error running drizzle-kit push:', error);
      throw error;
    }

    // Create the database connection
    const sql = postgres(connectionString, { max: 1 });
    const db = drizzle(sql, { schema });

    // Perform post-push operations and create extension
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    

    console.log('Schema pushed successfully!');

    // Seed initial data
    await seedSports(db);
    await seedPromotions(db);

    console.log('Seeding completed!');

    // Close the database connection
    await sql.end();
  } catch (error) {
    console.error('Error pushing schema:', error);
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