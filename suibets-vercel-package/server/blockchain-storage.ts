import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { walrusService } from './services/walrusService';
import config from './config';
import { User, InsertUser, Sport, Event, Market, Outcome, Bet, WurlusStaking } from '@shared/schema';
import { bcs } from '@mysten/bcs';
import session from "express-session";
import MemoryStore from "memorystore";

// Create memory store for session (for development purposes only)
const MemStore = MemoryStore(session);

/**
 * Service for blockchain-based storage using Walrus protocol
 */
export class BlockchainStorage {
  private provider: SuiClient;
  private walrusService: typeof walrusService;
  sessionStore: any; // Use any type to avoid SessionStore import issues
  
  private readonly packagesConfig = {
    // Walrus protocol package ID
    walrusPackageId: '0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285',
    // SBETS token ID 
    sbetsTokenId: '0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285::sbets::SBETS',
    // Network to connect to
    network: config.blockchain.defaultNetwork || 'testnet'
  };
  
  // In-memory cache for faster access to common data
  private userCache: Map<string, User> = new Map();
  private sportCache: Map<number, Sport> = new Map();
  private eventCache: Map<string, Event> = new Map();
  
  constructor() {
    // Initialize SUI client with appropriate network
    const networks: Record<string, string> = {
      'mainnet': 'https://fullnode.mainnet.sui.io:443',
      'testnet': 'https://fullnode.testnet.sui.io:443',
      'devnet': 'https://fullnode.devnet.sui.io:443',
      'localnet': 'http://localhost:9000'
    };
    
    const nodeUrl = networks[this.packagesConfig.network];
    this.provider = new SuiClient({ url: nodeUrl });
    this.walrusService = walrusService;
    
    // Initialize session store
    this.sessionStore = new MemStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    });
    
    console.log(`Initialized BlockchainStorage with network: ${this.packagesConfig.network} (${nodeUrl})`);
  }
  
  /**
   * Get user by ID (blockchain approach)
   */
  async getUser(id: number): Promise<User | undefined> {
    console.log(`Getting user with ID ${id} from blockchain`);
    
    // In a full implementation, we would query the blockchain for user data
    // For now, we'll return undefined as we're focusing on wallet-based users
    return undefined;
  }
  
  /**
   * Get user by username (blockchain approach)
   */
  async getUserByUsername(username: string): Promise<User | undefined> {
    console.log(`Getting user with username ${username} from blockchain`);
    
    // In a full implementation, we would query the blockchain for user data
    // For now, we'll return undefined as we're focusing on wallet-based users
    return undefined;
  }
  
  /**
   * Get user by wallet address (blockchain approach)
   */
  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    console.log(`Getting user with wallet address ${walletAddress} from blockchain`);
    
    try {
      // Check cache first
      if (this.userCache.has(walletAddress)) {
        return this.userCache.get(walletAddress);
      }
      
      // Check if wallet is registered with Walrus protocol
      const isRegistered = await this.walrusService.isWalletRegistered(walletAddress);
      
      if (!isRegistered) {
        return undefined;
      }
      
      // In a full implementation, we would get user details from blockchain
      // For now, we'll create a basic user object
      
      // We would get the balance and other details from blockchain
      const user: User = {
        id: parseInt(walletAddress.substring(0, 8), 16), // Generate ID from wallet address
        username: `user_${walletAddress.substring(0, 6)}`,
        password: '', // No password for wallet-based users
        email: null,
        walletAddress,
        walletFingerprint: null,
        walletType: 'Sui',
        balance: 0,
        suiBalance: 0,
        sbetsBalance: 0,
        createdAt: new Date(),
        wurlusRegistered: true,
        wurlusProfileId: null,
        wurlusProfileCreatedAt: null,
        lastLoginAt: null
      };
      
      // Cache the user
      this.userCache.set(walletAddress, user);
      
      return user;
    } catch (error) {
      console.error('Error getting user by wallet address:', error);
      return undefined;
    }
  }
  
  /**
   * Create a new user (blockchain approach)
   */
  async createUser(insertUser: InsertUser): Promise<User> {
    console.log(`Creating user with blockchain integration`);
    
    try {
      const { walletAddress } = insertUser;
      
      // Validate wallet address
      if (!walletAddress) {
        throw new Error('Wallet address is required for blockchain user creation');
      }
      
      // Check if wallet is already registered
      const existingUser = await this.getUserByWalletAddress(walletAddress);
      
      if (existingUser) {
        return existingUser;
      }
      
      // Register wallet with Walrus protocol
      const txHash = await this.walrusService.registerWallet(walletAddress);
      
      // Create user object
      const user: User = {
        id: parseInt(walletAddress.substring(0, 8), 16), // Generate ID from wallet address
        username: insertUser.username || `user_${walletAddress.substring(0, 6)}`,
        password: '', // No password for wallet-based users
        email: insertUser.email || null,
        walletAddress,
        walletFingerprint: null,
        walletType: insertUser.walletType || 'Sui',
        balance: 0,
        suiBalance: 0,
        sbetsBalance: 0,
        createdAt: new Date(),
        wurlusRegistered: true,
        wurlusProfileId: null,
        wurlusProfileCreatedAt: new Date(),
        lastLoginAt: null
      };
      
      // Cache the user
      this.userCache.set(walletAddress, user);
      
      return user;
    } catch (error) {
      console.error('Error creating user with blockchain:', error);
      throw error;
    }
  }
  
  /**
   * Update wallet address (blockchain approach)
   */
  async updateWalletAddress(userId: number, walletAddress: string, walletType: string): Promise<User> {
    console.log(`Updating wallet address for user ${userId} with blockchain integration`);
    
    try {
      // Check if wallet is already registered
      const existingUser = await this.getUserByWalletAddress(walletAddress);
      
      if (existingUser) {
        return existingUser;
      }
      
      // Register wallet with Walrus protocol
      const txHash = await this.walrusService.registerWallet(walletAddress);
      
      // Create user object
      const user: User = {
        id: userId,
        username: `user_${walletAddress.substring(0, 6)}`,
        password: '', // No password for wallet-based users
        email: null,
        walletAddress,
        walletFingerprint: null,
        walletType: walletType || 'Sui',
        balance: 0,
        suiBalance: 0,
        sbetsBalance: 0,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        wurlusRegistered: true,
        wurlusProfileId: null,
        wurlusProfileCreatedAt: new Date()
      };
      
      // Cache the user
      this.userCache.set(walletAddress, user);
      
      return user;
    } catch (error) {
      console.error('Error updating wallet address with blockchain:', error);
      throw error;
    }
  }
  
  /**
   * Get all sports (blockchain approach)
   */
  async getSports(): Promise<Sport[]> {
    console.log(`Getting all sports from blockchain`);
    
    try {
      // Check cache first
      if (this.sportCache.size > 0) {
        console.log('[BlockchainStorage] Returning sports from cache, count:', this.sportCache.size);
        return Array.from(this.sportCache.values());
      }
      
      // Before using hardcoded values, try to use LocalEventsProvider as a fallback
      try {
        const { localEventsProvider } = await import('./services/localEventsProvider');
        if (localEventsProvider) {
          console.log('[BlockchainStorage] Trying LocalEventsProvider for sports data');
          const localSports = localEventsProvider.getSports();
          
          // Populate cache if we got data
          if (localSports && localSports.length > 0) {
            console.log('[BlockchainStorage] Using sports from LocalEventsProvider, count:', localSports.length);
            localSports.forEach(sport => {
              this.sportCache.set(sport.id, sport);
            });
            
            return localSports;
          }
        }
      } catch (localProviderError) {
        console.error('[BlockchainStorage] Error using LocalEventsProvider for sports:', localProviderError);
      }
      
      // If LocalEventsProvider fails or returns no data, use our pre-defined list
      console.log('[BlockchainStorage] Using pre-defined list of sports');
      
      // In a full implementation, we would query the blockchain for sports
      // For now, we'll return a pre-defined list that matches our blockchain IDs
      
      const sports: Sport[] = [
        {
          id: 1,
          name: 'Soccer',
          slug: 'soccer',
          icon: '⚽',
          wurlusSportId: 'football_wurlus_id',
          isActive: true,
          providerId: 'sports_provider_1'
        },
        {
          id: 2,
          name: 'Basketball',
          slug: 'basketball',
          icon: '🏀',
          wurlusSportId: 'basketball_wurlus_id',
          isActive: true,
          providerId: 'sports_provider_1'
        },
        {
          id: 3,
          name: 'Tennis',
          slug: 'tennis',
          icon: '🎾',
          wurlusSportId: 'tennis_wurlus_id',
          isActive: true,
          providerId: 'sports_provider_1'
        },
        {
          id: 4,
          name: 'Baseball',
          slug: 'baseball',
          icon: '⚾',
          wurlusSportId: 'baseball_wurlus_id',
          isActive: true,
          providerId: 'sports_provider_1'
        },
        {
          id: 5,
          name: 'Hockey',
          slug: 'hockey',
          icon: '🏒',
          wurlusSportId: 'hockey_wurlus_id',
          isActive: true,
          providerId: 'sports_provider_1'
        },
        {
          id: 6,
          name: 'Rugby',
          slug: 'rugby',
          icon: '🏉',
          wurlusSportId: 'rugby_wurlus_id',
          isActive: true,
          providerId: 'sports_provider_1'
        },
        {
          id: 7,
          name: 'Golf',
          slug: 'golf',
          icon: '⛳',
          wurlusSportId: 'golf_wurlus_id',
          isActive: true,
          providerId: 'sports_provider_1'
        },
        {
          id: 8,
          name: 'Boxing',
          slug: 'boxing',
          icon: '🥊',
          wurlusSportId: 'boxing_wurlus_id',
          isActive: true,
          providerId: 'sports_provider_1'
        },
        {
          id: 9,
          name: 'Cricket',
          slug: 'cricket',
          icon: '🏏',
          wurlusSportId: 'cricket_wurlus_id',
          isActive: true,
          providerId: 'sports_provider_1'
        },
        {
          id: 10,
          name: 'MMA/UFC',
          slug: 'mma-ufc',
          icon: '🥋',
          wurlusSportId: 'mma_wurlus_id',
          isActive: true,
          providerId: 'sports_provider_1'
        },
        {
          id: 11,
          name: 'Formula 1',
          slug: 'formula_1',
          icon: '🏎️',
          wurlusSportId: 'formula1_wurlus_id',
          isActive: true,
          providerId: 'sports_provider_1'
        },
        {
          id: 12,
          name: 'American Football',
          slug: 'american_football',
          icon: '🏈',
          wurlusSportId: 'american_football_wurlus_id',
          isActive: true,
          providerId: 'sports_provider_1'
        },
        {
          id: 13,
          name: 'Cycling',
          slug: 'cycling',
          icon: '🚴',
          wurlusSportId: 'cycling_wurlus_id',
          isActive: true,
          providerId: 'sports_provider_1'
        },
        {
          id: 14,
          name: 'Snooker',
          slug: 'snooker',
          icon: '🎱',
          wurlusSportId: 'snooker_wurlus_id',
          isActive: true,
          providerId: 'sports_provider_1'
        },
        {
          id: 15,
          name: 'Darts',
          slug: 'darts',
          icon: '🎯',
          wurlusSportId: 'darts_wurlus_id',
          isActive: true,
          providerId: 'sports_provider_1'
        }
      ];
      
      // Cache the sports
      sports.forEach(sport => {
        this.sportCache.set(sport.id, sport);
      });
      
      return sports;
    } catch (error) {
      console.error('Error getting sports from blockchain:', error);
      throw error;
    }
  }
  
  /**
   * Get events with optional filters (blockchain approach)
   */
  async getEvents(sportId?: number, isLive?: boolean, limit?: number): Promise<Event[]> {
    const sportIdStr = sportId ? `sport ID ${sportId}` : 'all sports';
    const liveStr = isLive !== undefined ? (isLive ? 'live' : 'upcoming') : 'all';
    console.log(`Getting ${liveStr} events for ${sportIdStr} from blockchain`);
    
    try {
      // In a real implementation, events would be fetched from the blockchain
      // Since we're in transition to blockchain storage, we'll delegate to the API services
      // This allows our app to continue functioning while we implement blockchain storage
      
      // Delegate to API service using dynamic import instead of require
      let events: Event[] = [];
      
      try {
        // Get a reference to the EventTrackingService which can provide us with events
        const { getEventTrackingService } = await import('./services/eventTrackingService');
        const eventTrackingService = getEventTrackingService();
        
        if (eventTrackingService) {
          if (isLive) {
            events = await eventTrackingService.getLiveEvents(sportId);
          } else {
            // For upcoming events, we can use the tracking service's cached data
            events = eventTrackingService.getUpcomingEvents(sportId);
          }
        } else {
          console.log('[BlockchainStorage] EventTrackingService not available, using empty events array');
        }
      } catch (importError) {
        console.error('[BlockchainStorage] Error importing event service:', importError);
        // Continue with empty events array
      }
      
      // If no events were found from API services or event tracking, try the local provider
      if (events.length === 0) {
        try {
          const { localEventsProvider } = await import('./services/localEventsProvider');
          if (localEventsProvider) {
            console.log('[BlockchainStorage] API and blockchain unavailable, using LocalEventsProvider as fallback');
            events = localEventsProvider.getEvents(sportId, isLive);
            console.log(`[BlockchainStorage] LocalEventsProvider returned ${events.length} events`);
          }
        } catch (localProviderError) {
          console.error('[BlockchainStorage] Error using LocalEventsProvider:', localProviderError);
        }
      }
      
      if (limit && events.length > limit) {
        events = events.slice(0, limit);
      }
      
      return events;
    } catch (error) {
      console.error('Error getting events from blockchain:', error);
      
      // As a last resort, try the local provider directly
      try {
        const { localEventsProvider } = await import('./services/localEventsProvider');
        if (localEventsProvider) {
          console.log('[BlockchainStorage] Using LocalEventsProvider as last resort');
          const localEvents = localEventsProvider.getEvents(sportId, isLive);
          if (limit && localEvents.length > limit) {
            return localEvents.slice(0, limit);
          }
          return localEvents;
        }
      } catch (e) {
        console.error('[BlockchainStorage] Final fallback failed:', e);
      }
      
      // Return empty array instead of throwing to prevent app failure
      return [];
    }
  }
  
  /**
   * Get user bets (blockchain approach)
   */
  async getUserBets(walletAddress: string): Promise<Bet[]> {
    console.log(`Getting bets for wallet ${walletAddress} from blockchain`);
    
    try {
      // In a full implementation, we would query the blockchain for bets
      // We'll delegate to the Walrus service for now
      const bets = await this.walrusService.getWalletBets(walletAddress);
      
      // Convert to our schema format
      // This would map blockchain data to our schema in a real implementation
      return [];
    } catch (error) {
      console.error('Error getting user bets from blockchain:', error);
      throw error;
    }
  }
  
  /**
   * Place a bet (blockchain approach)
   */
  async placeBet(
    walletAddress: string,
    eventId: string,
    marketId: string,
    outcomeId: string,
    amount: number,
    odds: number,
    tokenType: 'SUI' | 'SBETS' = 'SUI'
  ): Promise<string> {
    console.log(`Placing bet through blockchain for wallet ${walletAddress}`);
    
    try {
      // Delegate to Walrus service to place the bet
      const txHash = await this.walrusService.placeBet(
        walletAddress,
        eventId,
        marketId,
        outcomeId,
        amount,
        tokenType
      );
      
      return txHash;
    } catch (error) {
      console.error('Error placing bet through blockchain:', error);
      throw error;
    }
  }
  
  /**
   * Get user staking data (blockchain approach)
   */
  async getUserStaking(walletAddress: string): Promise<WurlusStaking[]> {
    console.log(`Getting staking data for wallet ${walletAddress} from blockchain`);
    
    try {
      // In a full implementation, we would query the blockchain for staking data
      // For now, we'll return an empty array
      return [];
    } catch (error) {
      console.error('Error getting user staking from blockchain:', error);
      throw error;
    }
  }
  
  /**
   * Get user dividends (blockchain approach)
   */
  async getUserDividends(walletAddress: string): Promise<any[]> {
    console.log(`Getting dividends for wallet ${walletAddress} from blockchain`);
    
    try {
      // Delegate to Walrus service to get dividends
      const dividends = await this.walrusService.getWalletDividends(walletAddress);
      
      return dividends;
    } catch (error) {
      console.error('Error getting user dividends from blockchain:', error);
      throw error;
    }
  }
  
  /**
   * Get promotions (blockchain approach)
   */
  async getPromotions(): Promise<any[]> {
    console.log('Getting promotions from blockchain');
    
    try {
      // In a full implementation, we would query the blockchain for promotions
      // For now, we'll return default promotions
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
    } catch (error) {
      console.error('Error getting promotions from blockchain:', error);
      return [];
    }
  }
}

// Export a singleton instance
export const blockchainStorage = new BlockchainStorage();