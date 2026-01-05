/**
 * Oracle Adapter Service - Future-Proof Oracle Integration
 * 
 * Abstraction layer that allows easy switching between:
 * - API-Sports (current - paid API)
 * - Supra Oracle (future - on-chain price feeds)
 * - Band Oracle (future - on-chain price feeds)
 * 
 * The adapter pattern ensures zero changes to betting logic when switching oracles
 */

export interface OracleEventData {
  eventId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  startTime: number;
  status: 'scheduled' | 'live' | 'finished';
  homeScore?: number;
  awayScore?: number;
  result?: 'home' | 'away' | 'draw';
  verified: boolean; // Oracle-verified flag
  signatureProof?: string; // Oracle signature
  timestamp: number;
}

export interface OraclePrice {
  eventId: string;
  odds: number;
  homeWinProbability: number;
  awayWinProbability: number;
  drawProbability: number;
  source: 'api-sports' | 'supra' | 'band';
  verified: boolean;
  timestamp: number;
}

export type OracleType = 'api-sports' | 'supra' | 'band';

export interface IOracleProvider {
  name: string;
  type: OracleType;
  
  // Event data
  getUpcomingEvents(sport: string): Promise<OracleEventData[]>;
  getLiveEvents(sport: string): Promise<OracleEventData[]>;
  getEventResult(eventId: string): Promise<OracleEventData | null>;
  
  // Price feeds
  getOdds(eventId: string): Promise<OraclePrice>;
  getPricesForMultipleEvents(eventIds: string[]): Promise<OraclePrice[]>;
  
  // Verification
  verifyEventSignature(event: OracleEventData): Promise<boolean>;
  verifyPriceSignature(price: OraclePrice): Promise<boolean>;
}

export class OracleAdapterService {
  private currentOracle: IOracleProvider | null = null;
  private oracleProviders: Map<OracleType, IOracleProvider> = new Map();
  private currentOracleType: OracleType = 'api-sports';

  constructor() {
    console.log('🔮 Oracle Adapter Service initialized');
    console.log('   Current: API-Sports (paid API)');
    console.log('   Ready: Supra Oracle (when available)');
    console.log('   Ready: Band Oracle (when available)');
  }

  /**
   * Register an oracle provider
   */
  registerProvider(provider: IOracleProvider): void {
    this.oracleProviders.set(provider.type, provider);
    console.log(`✅ Registered oracle provider: ${provider.name}`);
  }

  /**
   * Set current oracle (with validation)
   */
  setCurrentOracle(oracleType: OracleType): void {
    const provider = this.oracleProviders.get(oracleType);
    if (!provider) {
      throw new Error(`Oracle provider not found: ${oracleType}`);
    }
    this.currentOracle = provider;
    this.currentOracleType = oracleType;
    console.log(`🔄 Switched to oracle: ${provider.name}`);
  }

  /**
   * Get current oracle type
   */
  getCurrentOracleType(): OracleType {
    return this.currentOracleType;
  }

  /**
   * Get upcoming events (delegates to current oracle)
   */
  async getUpcomingEvents(sport: string): Promise<OracleEventData[]> {
    try {
      return await this.currentOracle.getUpcomingEvents(sport);
    } catch (error) {
      console.error(`❌ Oracle error (${this.currentOracleType}):`, error);
      return [];
    }
  }

  /**
   * Get live events
   */
  async getLiveEvents(sport: string): Promise<OracleEventData[]> {
    try {
      return await this.currentOracle.getLiveEvents(sport);
    } catch (error) {
      console.error(`❌ Oracle error (${this.currentOracleType}):`, error);
      return [];
    }
  }

  /**
   * Get event result with verification
   */
  async getEventResult(eventId: string): Promise<OracleEventData | null> {
    try {
      const event = await this.currentOracle.getEventResult(eventId);
      if (event) {
        // Verify oracle signature
        const isVerified = await this.currentOracle.verifyEventSignature(event);
        event.verified = isVerified;
        
        if (!isVerified) {
          console.warn(`⚠️ Event signature verification failed: ${eventId}`);
        }
      }
      return event;
    } catch (error) {
      console.error(`❌ Oracle error (${this.currentOracleType}):`, error);
      return null;
    }
  }

  /**
   * Get odds with verification
   */
  async getOdds(eventId: string): Promise<OraclePrice | null> {
    try {
      const price = await this.currentOracle.getOdds(eventId);
      
      // Verify price signature
      const isVerified = await this.currentOracle.verifyPriceSignature(price);
      price.verified = isVerified;
      
      if (!isVerified) {
        console.warn(`⚠️ Price signature verification failed: ${eventId}`);
      }
      
      return price;
    } catch (error) {
      console.error(`❌ Oracle error (${this.currentOracleType}):`, error);
      return null;
    }
  }

  /**
   * Get prices for multiple events (batch operation)
   */
  async getPricesForMultipleEvents(eventIds: string[]): Promise<OraclePrice[]> {
    try {
      return await this.currentOracle.getPricesForMultipleEvents(eventIds);
    } catch (error) {
      console.error(`❌ Oracle error (${this.currentOracleType}):`, error);
      return [];
    }
  }

  /**
   * Health check for current oracle
   */
  async healthCheck(): Promise<{ healthy: boolean; oracle: OracleType; message: string }> {
    try {
      // Try to fetch one event to verify oracle connectivity
      const events = await this.currentOracle.getLiveEvents('football');
      return {
        healthy: true,
        oracle: this.currentOracleType,
        message: `✅ Oracle healthy (${this.currentOracle.name})`
      };
    } catch (error) {
      return {
        healthy: false,
        oracle: this.currentOracleType,
        message: `❌ Oracle unhealthy: ${error}`
      };
    }
  }

  /**
   * List available oracles
   */
  listAvailableOracles(): Array<{ type: OracleType; name: string; active: boolean }> {
    return Array.from(this.oracleProviders.values()).map(provider => ({
      type: provider.type,
      name: provider.name,
      active: provider.type === this.currentOracleType
    }));
  }
}

export default new OracleAdapterService();
