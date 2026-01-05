import { db } from './db';
import { users, sports, events, markets, type User, type InsertUser, type Sport, type Event, type Market } from "@shared/schema";
import { eq } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import pg from 'pg';

// Create connection pool for PostgreSQL session store
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  updateWalletAddress(userId: number, walletAddress: string, walletType: string): Promise<User>;
  
  // Sports data methods
  getSports(): Promise<Sport[]>;
  getEvents(sportId?: number, isLive?: boolean, limit?: number): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  getMarkets(eventId: number): Promise<Market[]>;
  getPromotions(): Promise<any[]>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    // Initialize the PostgreSQL session store
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Create a new user
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateWalletAddress(userId: number, walletAddress: string, walletType: string): Promise<User> {
    // Update a user's wallet address and type
    const [user] = await db
      .update(users)
      .set({ 
        walletAddress,
        walletType,
        lastLoginAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Add a method to update a user's Stripe customer ID (for future Stripe integration)
  async updateStripeCustomerId(userId: number, customerId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Add a method to update a user's Stripe subscription ID (for future Stripe integration)
  async updateUserStripeInfo(userId: number, stripeInfo: { customerId: string, subscriptionId: string }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        stripeCustomerId: stripeInfo.customerId,
        stripeSubscriptionId: stripeInfo.subscriptionId 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  // Get all sports
  async getSports(): Promise<Sport[]> {
    try {
      // Get sports from the database
      const sportsList = await db.select().from(sports).where(eq(sports.isActive, true));
      
      // If we don't have any sports in the DB yet, return default sports
      if (!sportsList || sportsList.length === 0) {
        return [
          { id: 1, name: 'Football', slug: 'football', icon: 'football', isActive: true },
          { id: 2, name: 'Basketball', slug: 'basketball', icon: 'basketball', isActive: true },
          { id: 3, name: 'Tennis', slug: 'tennis', icon: 'tennis', isActive: true },
          { id: 4, name: 'Baseball', slug: 'baseball', icon: 'baseball', isActive: true },
          { id: 5, name: 'Hockey', slug: 'hockey', icon: 'hockey', isActive: true },
          { id: 6, name: 'Handball', slug: 'handball', icon: 'handball', isActive: true },
          { id: 7, name: 'Volleyball', slug: 'volleyball', icon: 'volleyball', isActive: true },
          { id: 8, name: 'Rugby', slug: 'rugby', icon: 'rugby', isActive: true },
          { id: 9, name: 'Cricket', slug: 'cricket', icon: 'cricket', isActive: true },
          { id: 10, name: 'Golf', slug: 'golf', icon: 'golf', isActive: true },
          { id: 11, name: 'Boxing', slug: 'boxing', icon: 'boxing', isActive: true },
          { id: 12, name: 'MMA/UFC', slug: 'mma-ufc', icon: 'mma', isActive: true },
          { id: 13, name: 'Formula 1', slug: 'formula_1', icon: 'formula1', isActive: true },
          { id: 14, name: 'Cycling', slug: 'cycling', icon: 'cycling', isActive: true },
          { id: 15, name: 'American Football', slug: 'american_football', icon: 'american-football', isActive: true },
          { id: 16, name: 'Australian Football', slug: 'afl', icon: 'australian-football', isActive: true },
          { id: 17, name: 'Snooker', slug: 'snooker', icon: 'snooker', isActive: true },
          { id: 18, name: 'Darts', slug: 'darts', icon: 'darts', isActive: true },
          { id: 19, name: 'Table Tennis', slug: 'table-tennis', icon: 'table-tennis', isActive: true },
          { id: 20, name: 'Badminton', slug: 'badminton', icon: 'badminton', isActive: true }
        ];
      }
      
      return sportsList;
    } catch (error) {
      console.error('Error getting sports:', error);
      return [];
    }
  }
  
  // Get events with optional filters
  async getEvents(sportId?: number, isLive?: boolean, limit?: number): Promise<Event[]> {
    try {
      let query = db.select().from(events);
      
      // Apply filters if provided
      if (sportId !== undefined) {
        query = query.where(eq(events.sportId, sportId));
      }
      
      if (isLive !== undefined) {
        query = query.where(eq(events.isLive, isLive));
      }
      
      // Apply limit if provided
      if (limit) {
        query = query.limit(limit);
      }
      
      return await query;
    } catch (error) {
      console.error('Error getting events:', error);
      return [];
    }
  }
  
  // Get a specific event by ID
  async getEvent(id: number): Promise<Event | undefined> {
    try {
      const [event] = await db.select().from(events).where(eq(events.id, id));
      return event;
    } catch (error) {
      console.error(`Error getting event ${id}:`, error);
      return undefined;
    }
  }
  
  // Get markets for an event
  async getMarkets(eventId: number): Promise<Market[]> {
    try {
      return await db.select().from(markets).where(eq(markets.eventId, eventId));
    } catch (error) {
      console.error(`Error getting markets for event ${eventId}:`, error);
      return [];
    }
  }
  
  // Get promotions
  async getPromotions(): Promise<any[]> {
    // This is a placeholder implementation
    // In a real application, you would fetch promotions from a database
    return [
      {
        id: 1,
        title: 'Welcome Bonus',
        description: 'Get 100% bonus on your first deposit',
        image: '/images/promotions/welcome-bonus.png',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        isActive: true
      },
      {
        id: 2,
        title: 'Refer a Friend',
        description: 'Get 50 SBETS for each friend you refer',
        image: '/images/promotions/refer-friend.png',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        isActive: true
      }
    ];
  }
}

// Export an instance of the storage class
export const storage = new DatabaseStorage();