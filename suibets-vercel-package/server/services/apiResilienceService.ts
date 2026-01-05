import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { setTimeout } from 'timers/promises';

/**
 * A service to provide resilient API calls with fallbacks, retries, and caching
 * Helps handle DNS resolution issues and other network problems
 */
export class ApiResilienceService {
  private endpointMappings: Map<string, string[]> = new Map();
  private cache: Map<string, { data: any; timestamp: number; success: boolean }> = new Map();
  private cacheExpiryTime: number = 5 * 60 * 1000; // 5 minutes default
  private maxRetries: number = 3; // Increased max retries for better reliability
  private retryDelayBase: number = 1000; // 1 second base delay

  constructor() {
    // Initialize endpoint mappings for known problematic APIs
    this.setupEndpointMappings();
    console.log("[ApiResilienceService] Initialized with enhanced reliability for all 14 core sports");
  }

  /**
   * Set up fallback endpoints for APIs with known issues
   * This is especially useful for DNS resolution problems with external API services
   */
  private setupEndpointMappings(): void {
    // Tennis API fallbacks with enhanced reliability (DNS issues observed)
    this.endpointMappings.set('v1.tennis.api-sports.io', [
      'api-tennis.sportsdata.io/v1', // Primary fallback
      'tennis-feeds.api-sports.io/v1',
      'tennis.api-sports.io', // No v1 prefix
      'api-tennis.sportsdataapi.com/v1',
      'alt-tennis.apisports.io/v1',
      'tennis-live.api-sports.io/v1'
    ]);

    // Cricket API fallbacks with enhanced reliability (DNS issues observed)
    this.endpointMappings.set('v1.cricket.api-sports.io', [
      'api-cricket.sportsdata.io/v1', // Primary fallback 
      'cricket-feeds.api-sports.io/v1',
      'cricket.api-sports.io', // No v1 prefix
      'api-cricket.sportsdataapi.com/v1',
      'alt-cricket.apisports.io/v1',
      'cricket-live.api-sports.io/v1'
    ]);

    // Football/Soccer API fallbacks (v3 endpoint)
    this.endpointMappings.set('v3.football.api-sports.io', [
      'api-football.sportsdata.io/v3', // Primary fallback
      'football-feeds.api-sports.io/v3',
      'football.api-sports.io/v3',
      'api-football.sportsdataapi.com/v3',
      'alt-football.apisports.io/v3',
      'football-live.api-sports.io/v3'
    ]);

    // Basketball API fallbacks
    this.endpointMappings.set('v1.basketball.api-sports.io', [
      'api-basketball.sportsdata.io/v1', // Primary fallback
      'basketball-feeds.api-sports.io/v1',
      'basketball.api-sports.io', // No v1 prefix
      'api-basketball.sportsdataapi.com/v1',
      'alt-basketball.apisports.io/v1',
      'basketball-live.api-sports.io/v1'
    ]);

    // Baseball API fallbacks
    this.endpointMappings.set('v1.baseball.api-sports.io', [
      'api-baseball.sportsdata.io/v1', // Primary fallback
      'baseball-feeds.api-sports.io/v1',
      'baseball.api-sports.io', // No v1 prefix
      'api-baseball.sportsdataapi.com/v1',
      'alt-baseball.apisports.io/v1',
      'baseball-live.api-sports.io/v1'
    ]);

    // Hockey API fallbacks
    this.endpointMappings.set('v1.hockey.api-sports.io', [
      'api-hockey.sportsdata.io/v1', // Primary fallback
      'hockey-feeds.api-sports.io/v1',
      'hockey.api-sports.io', // No v1 prefix
      'api-hockey.sportsdataapi.com/v1',
      'alt-hockey.apisports.io/v1',
      'hockey-live.api-sports.io/v1'
    ]);

    // Rugby API fallbacks
    this.endpointMappings.set('v1.rugby.api-sports.io', [
      'api-rugby.sportsdata.io/v1', // Primary fallback
      'rugby-feeds.api-sports.io/v1',
      'rugby.api-sports.io', // No v1 prefix
      'api-rugby.sportsdataapi.com/v1',
      'alt-rugby.apisports.io/v1',
      'rugby-live.api-sports.io/v1'
    ]);

    // Formula 1 API fallbacks
    this.endpointMappings.set('v1.formula-1.api-sports.io', [
      'api-formula1.sportsdata.io/v1', // Primary fallback
      'formula1-feeds.api-sports.io/v1',
      'formula1.api-sports.io', // No v1 prefix
      'alt-formula1.api-sports.io/v1',
      'api-formula1.sportsdata-provider.com/v1'
    ]);

    // MMA API fallbacks
    this.endpointMappings.set('v1.mma.api-sports.io', [
      'api.mma-api.io/v1',
      'api-mma.sports-data.io/v1',
      'mma-feeds.api-sports.io/v1',
      'mma.api-sports.io',
      'alt-mma.api-sports.io/v1',
      'api-mma.sportsdata-provider.com/v1'
    ]);

    // Golf API fallbacks
    this.endpointMappings.set('v1.golf.api-sports.io', [
      'api.golf-api.io/v1',
      'api-golf.sports-data.io/v1',
      'golf-feeds.api-sports.io/v1',
      'golf.api-sports.io',
      'alt-golf.api-sports.io/v1',
      'api-golf.sportsdata-provider.com/v1'
    ]);

    // Boxing API fallbacks
    this.endpointMappings.set('v1.boxing.api-sports.io', [
      'api.boxing-api.io/v1',
      'api-boxing.sports-data.io/v1',
      'boxing-feeds.api-sports.io/v1',
      'boxing.api-sports.io',
      'alt-boxing.api-sports.io/v1',
      'api-boxing.sportsdata-provider.com/v1'
    ]);

    // American Football API fallbacks
    this.endpointMappings.set('v1.american-football.api-sports.io', [
      'api.american-football-api.io/v1',
      'api-american-football.sports-data.io/v1',
      'american-football-feeds.api-sports.io/v1',
      'american-football.api-sports.io',
      'alt-american-football.api-sports.io/v1',
      'api-american-football.sportsdata-provider.com/v1'
    ]);

    // Cycling API fallbacks
    this.endpointMappings.set('v1.cycling.api-sports.io', [
      'api.cycling-api.io/v1',
      'api-cycling.sports-data.io/v1',
      'cycling-feeds.api-sports.io/v1',
      'cycling.api-sports.io', 
      'alt-cycling.api-sports.io/v1',
      'api-cycling.sportsdata-provider.com/v1'
    ]);
  }

  /**
   * Make a resilient API request with fallbacks and retries
   * @param originalUrl The original URL to request
   * @param config Additional Axios request configuration
   * @param cacheKey Optional cache key, if not provided the URL will be used
   * @param cacheDuration Optional cache duration in milliseconds
   */
  public async makeRequest(
    originalUrl: string,
    config: AxiosRequestConfig = {},
    cacheKey?: string,
    cacheDuration?: number
  ): Promise<any> {
    const key = cacheKey || originalUrl;
    const expiryTime = cacheDuration || this.cacheExpiryTime;

    // Check cache first if we have a recent successful response
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < expiryTime && cached.success) {
      console.log(`[ApiResilienceService] Using cached data for ${key}`);
      return cached.data;
    }

    // Parse the original URL to extract domain and path
    let url = new URL(originalUrl);
    const originalDomain = url.hostname;
    const originalPath = url.pathname;
    const originalParams = url.search;

    // Check if we have fallback domains for this endpoint
    const fallbackDomains = this.endpointMappings.get(originalDomain) || [];
    
    // Try the original domain first, then fallbacks
    const domainsToTry = [originalDomain, ...fallbackDomains];
    
    // Track errors for logging
    const errors: Error[] = [];

    // Try each domain with retries
    for (const domain of domainsToTry) {
      // Build the URL with the current domain
      let currentUrl: string;
      
      if (domain === originalDomain) {
        currentUrl = originalUrl; // Use the original URL as-is
      } else {
        // Construct a new URL with the fallback domain
        // Handle different URL formats (some fallbacks might use different path structures)
        if (domain.includes('/v1')) {
          // Domain includes version path already
          currentUrl = `${url.protocol}//${domain}${originalPath.replace('/v1', '')}${originalParams}`;
        } else {
          currentUrl = `${url.protocol}//${domain}${originalPath}${originalParams}`;
        }
      }
      
      // Try with exponential backoff retries
      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        try {
          console.log(`[ApiResilienceService] Attempting request to ${currentUrl} (attempt ${attempt + 1}/${this.maxRetries + 1})`);
          
          // Make the request
          const response = await axios({
            ...config,
            url: currentUrl,
            method: config.method || 'GET',
          });
          
          // Cache the successful response
          this.cache.set(key, {
            data: response.data,
            timestamp: Date.now(),
            success: true
          });
          
          console.log(`[ApiResilienceService] Request to ${currentUrl} succeeded`);
          return response.data;
        } catch (error: any) {
          // Add more context to the error and store it
          const enhancedError = new Error(
            `Request to ${currentUrl} failed (attempt ${attempt + 1}): ${error.message}`
          );
          errors.push(enhancedError);
          
          console.error(`[ApiResilienceService] ${enhancedError.message}`);
          
          // Only retry with delay if this isn't the last attempt
          if (attempt < this.maxRetries) {
            // Exponential backoff with jitter
            const delay = this.retryDelayBase * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
            console.log(`[ApiResilienceService] Retrying in ${delay.toFixed(0)}ms...`);
            await setTimeout(delay);
          }
        }
      }
    }
    
    // If we get here, all domains and retries failed
    console.error(`[ApiResilienceService] All attempts failed for ${originalUrl}:`, 
      errors.map(e => e.message).join('\n'));
    
    // Check if we have stale cache data to return as fallback
    if (cached) {
      console.warn(`[ApiResilienceService] Returning stale cached data for ${key} after all attempts failed`);
      return cached.data;
    }
    
    // No cached data available, throw an error with all the failed attempts
    throw new Error(`All API attempts failed for ${originalUrl}. Errors: ${errors.map(e => e.message).join('; ')}`);
  }

  /**
   * Set custom endpoint mappings
   * @param domain The original domain
   * @param fallbacks Array of fallback domains
   */
  public setEndpointMappings(domain: string, fallbacks: string[]): void {
    this.endpointMappings.set(domain, fallbacks);
  }

  /**
   * Clear the cache for a specific key or all cache if no key provided
   * @param key Optional cache key to clear
   */
  public clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

// Create a singleton instance
export const apiResilienceService = new ApiResilienceService();