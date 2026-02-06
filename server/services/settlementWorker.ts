import { storage } from '../storage';
import balanceService from './balanceService';
import { blockchainBetService } from './blockchainBetService';
import { db } from '../db';
import { settledEvents } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';

interface FinishedMatch {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  winner: 'home' | 'away' | 'draw';
  status: string;
}

interface UnsettledBet {
  id: string;
  eventId: string;
  externalEventId: string;
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  odds: number;
  stake: number;
  potentialWin: number;
  userId: string;
  currency: string;
  betObjectId?: string; // On-chain Sui bet object ID (for SUI bets placed via contract)
  status?: string; // 'pending', 'confirmed', or 'won' (won = already determined winner needing payout)
}

const REVENUE_WALLET = 'platform_revenue';

class SettlementWorkerService {
  private _isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private settledEventIdsCache = new Set<string>(); // In-memory cache, synced from DB
  private checkInterval = 5 * 60 * 1000; // 5 minutes (AGGRESSIVE API SAVING - was 2min)
  private finishedMatchesCache: { data: FinishedMatch[]; timestamp: number } | null = null;
  private finishedMatchesCacheTTL = 3 * 60 * 1000; // Cache finished matches for 3 minutes

  async start() {
    if (this._isRunning) {
      console.log('⚙️ SettlementWorker already running');
      return;
    }

    // Load settled events from database on startup (survives restarts)
    await this.loadSettledEventsFromDB();

    // On-chain bet sync runs automatically every 5 minutes with settlement checks
    // Manual trigger also available via POST /api/admin/sync-onchain-bets
    console.log('🔄 On-chain bet sync enabled - runs every 5 minutes to catch direct contract bets');

    this._isRunning = true;
    console.log('🚀 SettlementWorker started - checking for finished matches every 5 minutes (API SAVING MODE)');

    this.intervalId = setInterval(async () => {
      try {
        await this.checkAndSettleBets();
      } catch (error) {
        console.error('❌ SettlementWorker error:', error);
      }
    }, this.checkInterval);

    this.checkAndSettleBets();
  }

  private async loadSettledEventsFromDB() {
    try {
      const settledFromDB = await db.select().from(settledEvents);
      for (const event of settledFromDB) {
        this.settledEventIdsCache.add(event.externalEventId);
      }
      console.log(`📋 Loaded ${settledFromDB.length} settled events from database`);
    } catch (error) {
      console.error('Failed to load settled events from DB:', error);
    }
  }

  private async markEventAsSettled(match: FinishedMatch, betsSettledCount: number) {
    try {
      // Check if already exists in DB
      const existing = await db.select().from(settledEvents).where(eq(settledEvents.externalEventId, match.eventId));
      if (existing.length === 0) {
        // Insert new settled event
        await db.insert(settledEvents).values({
          externalEventId: match.eventId,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          winner: match.winner,
          betsSettled: betsSettledCount
        });
        console.log(`📝 Persisted settled event: ${match.eventId} (${betsSettledCount} bets settled)`);
      } else {
        // Update betsSettled count for existing event (upsert pattern)
        const newTotal = (existing[0].betsSettled || 0) + betsSettledCount;
        await db.update(settledEvents)
          .set({ betsSettled: newTotal })
          .where(eq(settledEvents.externalEventId, match.eventId));
        console.log(`📝 Updated settled event: ${match.eventId} (total ${newTotal} bets settled)`);
      }
      this.settledEventIdsCache.add(match.eventId);
    } catch (error) {
      console.error(`Failed to persist settled event ${match.eventId}:`, error);
    }
  }

  private isEventSettled(eventId: string): boolean {
    return this.settledEventIdsCache.has(eventId);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this._isRunning = false;
    console.log('⏹️ SettlementWorker stopped');
  }

  /**
   * Process free sports results for settlement
   * Called by freeSportsService after nightly results fetch
   */
  public async processFreeSportsResults(results: { eventId: string; homeTeam: string; awayTeam: string; homeScore: number; awayScore: number; winner: 'home' | 'away' | 'draw'; status: string }[]): Promise<void> {
    console.log(`🆓 SettlementWorker: Processing ${results.length} free sports results...`);
    
    if (results.length === 0) {
      console.log('🆓 SettlementWorker: No free sports results to process');
      return;
    }
    
    try {
      // Get all unsettled bets
      const unsettledBets = await this.getUnsettledBets();
      
      if (unsettledBets.length === 0) {
        console.log('🆓 SettlementWorker: No unsettled bets to settle');
        return;
      }
      
      // Filter to only pending bets (not already won)
      const pendingBets = unsettledBets.filter(bet => bet.status !== 'won');
      
      if (pendingBets.length === 0) {
        console.log('🆓 SettlementWorker: No pending bets for free sports');
        return;
      }
      
      console.log(`🆓 SettlementWorker: Checking ${pendingBets.length} pending bets against ${results.length} free sports results`);
      
      // Convert free sports results to FinishedMatch format
      const finishedMatches: FinishedMatch[] = results.map(result => ({
        eventId: result.eventId,
        homeTeam: result.homeTeam,
        awayTeam: result.awayTeam,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        winner: result.winner,
        status: result.status
      }));
      
      // Process each finished match
      for (const match of finishedMatches) {
        // Skip if already settled
        if (this.isEventSettled(match.eventId)) {
          console.log(`🆓 Skipping already settled event: ${match.eventId}`);
          continue;
        }
        
        // Find bets for this match - use event ID matching
        const betsForMatch = pendingBets.filter(bet => {
          const betExtId = String(bet.externalEventId || '').trim();
          const matchId = String(match.eventId || '').trim();
          
          // Strategy 1: Exact event ID match
          if (betExtId && matchId && betExtId === matchId) {
            console.log(`🆓 Match found: bet ${betExtId} matches finished match ${matchId}`);
            return true;
          }
          
          // Strategy 2: Match by team names (for free sports that may have different ID formats)
          if (bet.homeTeam && bet.awayTeam) {
            const betHome = bet.homeTeam.toLowerCase().trim();
            const betAway = bet.awayTeam.toLowerCase().trim();
            const matchHome = match.homeTeam.toLowerCase().trim();
            const matchAway = match.awayTeam.toLowerCase().trim();
            
            if ((betHome === matchHome || matchHome.includes(betHome) || betHome.includes(matchHome)) &&
                (betAway === matchAway || matchAway.includes(betAway) || betAway.includes(matchAway))) {
              console.log(`🆓 Team name match: ${bet.homeTeam} vs ${bet.awayTeam} matches ${match.homeTeam} vs ${match.awayTeam}`);
              return true;
            }
          }
          
          return false;
        });
        
        if (betsForMatch.length > 0) {
          console.log(`🆓 Settling ${betsForMatch.length} bets for ${match.homeTeam} vs ${match.awayTeam} (${match.homeScore}-${match.awayScore})`);
          await this.settleBetsForMatch(match, betsForMatch);
        }
      }
      
      // Also process parlay bets that may include free sports legs
      const allUnsettled = await this.getUnsettledBets();
      const parlayBets = allUnsettled.filter(bet => this.isParlayBet(bet) && bet.status !== 'won');
      
      if (parlayBets.length > 0) {
        console.log(`🆓 Processing ${parlayBets.length} parlay bets with free sports results...`);
        await this.settleParlayBets(parlayBets, finishedMatches);
      }
      
      console.log(`🆓 SettlementWorker: Free sports settlement complete`);
    } catch (error: any) {
      console.error(`🆓 SettlementWorker: Error processing free sports results:`, error.message);
    }
  }

  public async checkAndSettleBets() {
    console.log('🔍 SettlementWorker: Checking for finished matches...');

    try {
      // Sync on-chain bets to database (catch bets placed directly on contract)
      try {
        const syncResult = await blockchainBetService.syncOnChainBetsToDatabase();
        if (syncResult.synced > 0) {
          console.log(`🔄 Synced ${syncResult.synced} on-chain bets to database`);
        }
      } catch (syncErr) {
        console.error('❌ On-chain bet sync failed:', syncErr);
      }

      // Check for unsettled bets FIRST to avoid unnecessary API calls
      const unsettledBets = await this.getUnsettledBets();
      
      if (unsettledBets.length === 0) {
        console.log('📭 SettlementWorker: No unsettled bets - skipping API fetch');
        return;
      }

      const wonBetsNeedingPayout = unsettledBets.filter(bet => bet.status === 'won');
      if (wonBetsNeedingPayout.length > 0) {
        console.log(`💰 PAYOUT RETRY: ${wonBetsNeedingPayout.length} won bets need payout processing`);
        await this.retryPendingPayouts(wonBetsNeedingPayout);
      }

      const pendingBets = unsettledBets.filter(bet => bet.status !== 'won');
      
      if (pendingBets.length === 0) {
        console.log('📭 SettlementWorker: No pending bets need match lookup');
        return;
      }

      // Only fetch finished matches if we have pending bets to settle
      const finishedMatches = await this.getFinishedMatches();
      
      if (finishedMatches.length === 0) {
        console.log('📭 SettlementWorker: No new finished matches to settle');
        return;
      }

      console.log(`📋 SettlementWorker: Found ${finishedMatches.length} finished matches`);
      console.log(`🎯 SettlementWorker: Processing ${pendingBets.length} pending bets`);
      
      // Debug: Log pending bet details for matching
      for (const bet of pendingBets) {
        console.log(`📊 Unsettled bet: externalEventId=${bet.externalEventId}, eventId=${bet.eventId}, prediction=${bet.prediction}, homeTeam=${bet.homeTeam}, awayTeam=${bet.awayTeam}`);
        
        // Check if this bet's event is in the finished matches
        const betExtId = String(bet.externalEventId || '').trim();
        const matchingFinished = finishedMatches.find(m => String(m.eventId || '').trim() === betExtId);
        if (matchingFinished) {
          console.log(`🎯 Found finished match for bet: ${matchingFinished.homeTeam} vs ${matchingFinished.awayTeam} (${matchingFinished.homeScore}-${matchingFinished.awayScore})`);
        } else {
          console.log(`⏳ Match ${betExtId} not yet finished or not in today's results`);
        }
      }

      // Separate single bets from parlay bets
      const singleBets = pendingBets.filter(bet => !this.isParlayBet(bet));
      const parlayBets = pendingBets.filter(bet => this.isParlayBet(bet));
      
      console.log(`📊 Processing ${singleBets.length} single bets, ${parlayBets.length} parlay bets`);
      
      // Process single bets
      for (const match of finishedMatches) {
        // IMPROVED MATCHING: Use multiple strategies to find bets for this match
        const betsForMatch = singleBets.filter(bet => {
          // Strategy 1: Exact external event ID match (most reliable) - compare as strings
          const betExtId = String(bet.externalEventId || '').trim();
          const matchId = String(match.eventId || '').trim();
          if (betExtId && matchId && betExtId === matchId) {
            console.log(`✅ MATCH FOUND: bet externalEventId=${betExtId} matches finished match ${matchId}`);
            return true;
          }
          
          // Strategy 2: Match by stored team names (reliable for newer bets)
          if (bet.homeTeam && bet.awayTeam) {
            const betHome = bet.homeTeam.toLowerCase();
            const betAway = bet.awayTeam.toLowerCase();
            const matchHome = match.homeTeam.toLowerCase();
            const matchAway = match.awayTeam.toLowerCase();
            if ((betHome === matchHome || matchHome.includes(betHome) || betHome.includes(matchHome)) &&
                (betAway === matchAway || matchAway.includes(betAway) || betAway.includes(matchAway))) {
              return true;
            }
          }
          
          // Strategy 3: DISABLED - Fuzzy prediction matching caused false positives
          // This was incorrectly matching future bets to finished matches with similar team names
          // e.g., bet on "Leeds vs Arsenal" (future) was matched to some other "Leeds" match that finished
          // ONLY use exact event ID matching to prevent premature settlement of upcoming matches
          // 
          // DO NOT RE-ENABLE without adding start_time validation to ensure match has actually started
          
          // Strategy 4: Legacy eventId match
          if (bet.eventId && bet.eventId === match.eventId) {
            return true;
          }
          
          return false;
        });

        if (betsForMatch.length > 0) {
          console.log(`⚽ Settling ${betsForMatch.length} bets for ${match.homeTeam} vs ${match.awayTeam} (${match.homeScore}-${match.awayScore})`);
          await this.settleBetsForMatch(match, betsForMatch);
        }
      }
      
      // Process parlay bets - need all legs to be finished
      if (parlayBets.length > 0) {
        await this.settleParlayBets(parlayBets, finishedMatches);
      }
    } catch (error) {
      console.error('❌ SettlementWorker checkAndSettleBets error:', error);
    }
  }
  
  private isParlayBet(bet: UnsettledBet): boolean {
    // Parlay bets can be identified by:
    // 1. JSON array format: prediction starts with '[' and contains eventId
    // 2. Pipe-separated format: externalEventId starts with 'parlay_' and prediction contains '|'
    try {
      const pred = bet.prediction || '';
      const extId = bet.externalEventId || '';
      
      // JSON format parlay
      if (pred.startsWith('[') && pred.includes('"eventId"')) {
        return true;
      }
      
      // Pipe-separated format parlay (e.g., "Team A: Over 2.5 | Team B: Under 2.5")
      if (extId.startsWith('parlay_') && pred.includes('|')) {
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }
  
  private parsePipeSeparatedParlay(bet: UnsettledBet): Array<{ eventId: string; prediction: string; marketId?: string; outcomeId?: string }> {
    // Parse parlays like "Al-Faisaly FC vs Al Zulfi: Over 2.5 | Pdrm vs Kuala Lumpur FA: Over 2.5"
    // external_event_id format: "parlay_1769778304571_1437339_1404202" contains the event IDs
    const legs: Array<{ eventId: string; prediction: string; marketId?: string; outcomeId?: string }> = [];
    
    try {
      const extId = bet.externalEventId || '';
      const pred = bet.prediction || '';
      
      // Extract event IDs from external_event_id (format: parlay_timestamp_eventId1_eventId2...)
      const parts = extId.split('_');
      const eventIds = parts.slice(2); // Skip "parlay" and timestamp
      
      // Parse predictions from pipe-separated format
      const predParts = pred.split('|').map(p => p.trim());
      
      for (let i = 0; i < Math.min(eventIds.length, predParts.length); i++) {
        const eventId = eventIds[i];
        const fullPred = predParts[i]; // e.g., "Al-Faisaly FC vs Al Zulfi: Over 2.5"
        
        // Extract just the prediction part after the colon
        const colonIdx = fullPred.lastIndexOf(':');
        const prediction = colonIdx !== -1 ? fullPred.slice(colonIdx + 1).trim() : fullPred;
        
        // Determine market type from prediction
        let marketId = 'match-winner';
        let outcomeId = '';
        
        if (prediction.includes('Over')) {
          marketId = '5'; // Over/Under market
          outcomeId = 'ou_over';
        } else if (prediction.includes('Under')) {
          marketId = '5';
          outcomeId = 'ou_under';
        } else if (prediction === 'Draw') {
          outcomeId = 'draw';
        } else if (prediction.includes('or Draw')) {
          marketId = 'double-chance';
        }
        
        legs.push({ eventId, prediction, marketId, outcomeId });
      }
    } catch (error) {
      console.error(`❌ Error parsing pipe-separated parlay:`, error);
    }
    
    return legs;
  }
  
  private async settleParlayBets(parlayBets: UnsettledBet[], finishedMatches: FinishedMatch[]) {
    console.log(`🎰 Processing ${parlayBets.length} parlay bets...`);
    
    // Create a map of finished matches by eventId for quick lookup
    const finishedMatchMap = new Map<string, FinishedMatch>();
    for (const match of finishedMatches) {
      finishedMatchMap.set(String(match.eventId).trim(), match);
    }
    
    for (const bet of parlayBets) {
      try {
        // Parse parlay legs - support both JSON and pipe-separated formats
        let legs: Array<{
          eventId: string;
          marketId?: string;
          outcomeId?: string;
          odds?: number;
          prediction: string;
          selection?: string;
        }>;
        
        const pred = bet.prediction || '';
        const extId = bet.externalEventId || '';
        
        if (pred.startsWith('[') && pred.includes('"eventId"')) {
          // JSON format parlay
          legs = JSON.parse(pred);
        } else if (extId.startsWith('parlay_') && pred.includes('|')) {
          // Pipe-separated format parlay
          legs = this.parsePipeSeparatedParlay(bet);
          console.log(`🔄 Parsed pipe-separated parlay: ${legs.length} legs from ${extId}`);
        } else {
          console.log(`⚠️ Parlay bet ${bet.id} has unknown format`);
          continue;
        }
        
        if (!Array.isArray(legs) || legs.length === 0) {
          console.log(`⚠️ Parlay bet ${bet.id} has invalid legs structure`);
          continue;
        }
        
        console.log(`🎯 Parlay bet ${bet.id.slice(0, 10)}... has ${legs.length} legs`);
        
        // Check if ALL legs have finished matches
        let allLegsFinished = true;
        let anyLegLost = false;
        const legResults: { eventId: string; prediction: string; won: boolean; match?: FinishedMatch }[] = [];
        
        for (const leg of legs) {
          const eventId = String(leg.eventId).trim();
          let match = finishedMatchMap.get(eventId);
          
          if (!match) {
            // On-demand lookup: if this is a free sports event, fetch its result directly from API
            const fetchedResult = await this.fetchFreeSportsLegResult(eventId);
            if (fetchedResult) {
              match = fetchedResult;
              finishedMatchMap.set(eventId, match); // Cache for other parlays
              console.log(`🔍 Fetched result for parlay leg ${eventId}: ${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam}`);
            }
          }
          
          if (!match) {
            console.log(`⏳ Parlay leg ${eventId} not yet finished`);
            allLegsFinished = false;
            break;
          }
          
          // Evaluate this leg's prediction
          const prediction = leg.prediction || leg.selection || '';
          const legWon = this.evaluateLegPrediction(prediction, match, leg.marketId, leg.outcomeId);
          
          legResults.push({ eventId, prediction, won: legWon, match });
          
          if (!legWon) {
            anyLegLost = true;
            console.log(`❌ Parlay leg LOST: ${prediction} for ${match.homeTeam} vs ${match.awayTeam} (${match.homeScore}-${match.awayScore})`);
          } else {
            console.log(`✅ Parlay leg WON: ${prediction} for ${match.homeTeam} vs ${match.awayTeam} (${match.homeScore}-${match.awayScore})`);
          }
        }
        
        if (!allLegsFinished) {
          console.log(`⏳ Parlay bet ${bet.id.slice(0, 10)}... waiting for ${legs.length - legResults.length} more legs to finish`);
          continue;
        }
        
        // All legs finished - settle the parlay
        const parlayWon = !anyLegLost;
        console.log(`🎰 PARLAY SETTLED: ${bet.id.slice(0, 10)}... ${parlayWon ? 'WON' : 'LOST'} (${legResults.filter(l => l.won).length}/${legs.length} legs won)`);
        
        // Use the first leg's match for settlement (for event tracking)
        const firstMatch = legResults[0]?.match;
        if (firstMatch) {
          // Create a modified bet with pre-computed parlay outcome
          // We set status to 'won' if parlay won, so settleBetsForMatch will process it correctly
          const modifiedBet: UnsettledBet = {
            ...bet,
            // Override prediction to match result for proper settlement flow
            // If parlay won, we force the determineBetOutcome to return true
            status: parlayWon ? 'won' : 'pending'
          };
          
          // Call the standard settlement flow with the parlay bet
          // If parlayWon is true, status='won' causes settlement to skip determineBetOutcome and payout
          // If parlayWon is false, we need to force a loss
          if (parlayWon) {
            await this.settleBetsForMatch(firstMatch, [modifiedBet]);
          } else {
            // For lost parlays, we need to mark as lost directly
            await this.settleParlaySingleBet(bet, firstMatch, false);
          }
        }
        
      } catch (error) {
        console.error(`❌ Error processing parlay bet ${bet.id}:`, error);
      }
    }
  }
  
  /**
   * Fetch a specific free sports game result by eventId (e.g., "basketball_489697")
   * Used for on-demand lookback when parlay legs aren't in the current day's results
   */
  private async fetchFreeSportsLegResult(eventId: string): Promise<FinishedMatch | null> {
    const FREE_SPORT_API_MAP: Record<string, { endpoint: string; apiHost: string }> = {
      basketball: { endpoint: 'https://v1.basketball.api-sports.io/games', apiHost: 'v1.basketball.api-sports.io' },
      baseball: { endpoint: 'https://v1.baseball.api-sports.io/games', apiHost: 'v1.baseball.api-sports.io' },
      'ice-hockey': { endpoint: 'https://v1.hockey.api-sports.io/games', apiHost: 'v1.hockey.api-sports.io' },
      rugby: { endpoint: 'https://v1.rugby.api-sports.io/games', apiHost: 'v1.rugby.api-sports.io' },
      handball: { endpoint: 'https://v1.handball.api-sports.io/games', apiHost: 'v1.handball.api-sports.io' },
      volleyball: { endpoint: 'https://v1.volleyball.api-sports.io/games', apiHost: 'v1.volleyball.api-sports.io' },
      mma: { endpoint: 'https://v1.mma.api-sports.io/fights', apiHost: 'v1.mma.api-sports.io' },
      'american-football': { endpoint: 'https://v1.american-football.api-sports.io/games', apiHost: 'v1.american-football.api-sports.io' },
      afl: { endpoint: 'https://v1.afl.api-sports.io/games', apiHost: 'v1.afl.api-sports.io' },
      'formula-1': { endpoint: 'https://v1.formula-1.api-sports.io/races', apiHost: 'v1.formula-1.api-sports.io' },
      nba: { endpoint: 'https://v1.nba.api-sports.io/games', apiHost: 'v1.nba.api-sports.io' },
      nfl: { endpoint: 'https://v1.nfl.api-sports.io/games', apiHost: 'v1.nfl.api-sports.io' },
    };

    try {
      // Split on last underscore to handle sport slugs with hyphens (e.g., "ice-hockey_404167")
      const lastUnderscore = eventId.lastIndexOf('_');
      if (lastUnderscore <= 0) return null;
      const sportSlug = eventId.substring(0, lastUnderscore);
      const gameId = eventId.substring(lastUnderscore + 1);
      if (!gameId || !/^\d+$/.test(gameId)) return null;
      const apiConfig = FREE_SPORT_API_MAP[sportSlug];
      if (!apiConfig) return null;

      const apiKey = process.env.API_SPORTS_KEY;
      if (!apiKey) return null;

      const axios = (await import('axios')).default;
      const response = await axios.get(apiConfig.endpoint, {
        params: { id: gameId },
        headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': apiConfig.apiHost },
        timeout: 10000
      });

      const game = response.data?.response?.[0];
      if (!game) return null;

      const status = game.status?.long || game.status?.short || '';
      const isFinished = status.toLowerCase().includes('finished') ||
                         status.toLowerCase().includes('final') ||
                         status === 'FT' || status === 'AET' || status === 'AOT' || status === 'PEN';
      if (!isFinished) return null;

      let homeTeam = '', awayTeam = '';
      if (sportSlug === 'mma') {
        homeTeam = game.fighters?.home?.name || game.home?.name || 'Fighter 1';
        awayTeam = game.fighters?.away?.name || game.away?.name || 'Fighter 2';
      } else {
        homeTeam = game.teams?.home?.name || game.home?.name || 'Home';
        awayTeam = game.teams?.away?.name || game.away?.name || 'Away';
      }

      const homeScore = game.scores?.home?.total ?? game.scores?.home ?? 0;
      const awayScore = game.scores?.away?.total ?? game.scores?.away ?? 0;
      const hScore = typeof homeScore === 'number' ? homeScore : parseInt(homeScore) || 0;
      const aScore = typeof awayScore === 'number' ? awayScore : parseInt(awayScore) || 0;

      return {
        eventId,
        homeTeam,
        awayTeam,
        homeScore: hScore,
        awayScore: aScore,
        winner: hScore > aScore ? 'home' : aScore > hScore ? 'away' : 'draw',
        status: 'finished'
      };
    } catch (error: any) {
      console.warn(`⚠️ Failed to fetch free sports result for ${eventId}: ${error.message}`);
      return null;
    }
  }

  private async settleParlaySingleBet(bet: UnsettledBet, match: FinishedMatch, isWinner: boolean) {
    // DUPLICATE SETTLEMENT PREVENTION: Skip if already settled this session
    if (this.settledBetIds.has(bet.id)) {
      console.log(`⚠️ SKIPPING: Parlay bet ${bet.id} already processed this session`);
      return;
    }
    
    const grossPayout = isWinner ? bet.potentialWin : 0;
    const profit = isWinner ? (grossPayout - bet.stake) : 0;
    const platformFee = profit > 0 ? profit * 0.01 : 0;
    
    // Check for on-chain bet
    const hasOnChainBet = bet.betObjectId && blockchainBetService.isAdminKeyConfigured();
    const isSbetsOnChainBet = bet.currency === 'SBETS' && hasOnChainBet;
    const isSuiOnChainBet = bet.currency === 'SUI' && hasOnChainBet;
    
    if (isSuiOnChainBet || isSbetsOnChainBet) {
      console.log(`🔗 ON-CHAIN PARLAY SETTLEMENT: Bet ${bet.id.slice(0, 10)}... via smart contract`);
      
      // PRE-CHECK: Verify bet isn't already settled on-chain
      const onChainInfo = await blockchainBetService.getOnChainBetInfo(bet.betObjectId!);
      if (onChainInfo?.settled) {
        console.log(`⚠️ PARLAY ALREADY SETTLED ON-CHAIN: ${bet.betObjectId} - contract handled payout, updating database`);
        const finalStatus = isWinner ? 'paid_out' : 'lost';
        await storage.updateBetStatus(bet.id, finalStatus, grossPayout, `contract-settled-parlay-${bet.betObjectId?.slice(0,16)}`);
        this.settledBetIds.add(bet.id);
        return;
      }
      
      if (!onChainInfo) {
        console.warn(`⚠️ PARLAY BET OBJECT NOT FOUND ON-CHAIN: ${bet.betObjectId} - marking for manual resolution`);
        await storage.updateBetStatus(bet.id, isWinner ? 'won' : 'lost', grossPayout);
        this.settledBetIds.add(bet.id);
        return;
      }
      
      // Small delay between on-chain transactions
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const settlementResult = await blockchainBetService.executeSettleBetOnChain(
        bet.betObjectId!,
        isWinner
      );
      
      if (settlementResult.success) {
        const finalStatus = isWinner ? 'paid_out' : 'lost';
        const statusUpdated = await storage.updateBetStatus(bet.id, finalStatus, grossPayout, settlementResult.txHash);
        if (statusUpdated) {
          console.log(`✅ ON-CHAIN PARLAY SETTLED: ${bet.id.slice(0, 10)}... ${finalStatus} | TX: ${settlementResult.txHash}`);
          this.settledBetIds.add(bet.id);
        }
        return;
      } else {
        console.error(`❌ ON-CHAIN PARLAY SETTLEMENT FAILED: ${settlementResult.error}`);
        if (isWinner) {
          console.warn(`⚠️ PARLAY WINNER PAYOUT DEFERRED: Bet ${bet.id} - keeping as 'won' for retry (do NOT mark as lost)`);
          await storage.updateBetStatus(bet.id, 'won', grossPayout);
        } else {
          await storage.updateBetStatus(bet.id, 'lost', 0);
        }
        this.settledBetIds.add(bet.id);
        return;
      }
    }
    
    // Off-chain fallback
    const finalStatus = isWinner ? 'paid_out' : 'lost';
    const statusUpdated = await storage.updateBetStatus(bet.id, finalStatus, grossPayout);
    if (statusUpdated) {
      console.log(`✅ OFF-CHAIN PARLAY SETTLED: ${bet.id.slice(0, 10)}... ${finalStatus}`);
      this.settledBetIds.add(bet.id);
    }
  }
  
  private evaluateLegPrediction(prediction: string, match: FinishedMatch, marketId?: string, outcomeId?: string): boolean {
    // Handle Double Chance market (dc_1x, dc_12, dc_x2)
    if (marketId === '3' || outcomeId?.startsWith('dc_')) {
      const outcome = outcomeId || '';
      if (outcome === 'dc_1x' || outcome.includes('home or draw')) {
        return match.winner === 'home' || match.winner === 'draw';
      }
      if (outcome === 'dc_12' || outcome.includes('home or away')) {
        return match.winner === 'home' || match.winner === 'away';
      }
      if (outcome === 'dc_x2' || outcome.includes('draw or away')) {
        return match.winner === 'draw' || match.winner === 'away';
      }
    }
    
    // Fallback to standard prediction logic
    const pred = prediction.toLowerCase().trim();
    const homeTeam = match.homeTeam.toLowerCase();
    const awayTeam = match.awayTeam.toLowerCase();
    
    // Match Winner
    if (pred.includes(homeTeam) || pred === 'home' || pred === '1') {
      return match.winner === 'home';
    }
    if (pred.includes(awayTeam) || pred === 'away' || pred === '2') {
      return match.winner === 'away';
    }
    if (pred === 'draw' || pred === 'x' || pred === 'tie') {
      return match.winner === 'draw';
    }
    
    // Double Chance by prediction text
    if (pred.includes('or draw')) {
      if (pred.includes(homeTeam)) {
        return match.winner === 'home' || match.winner === 'draw';
      }
      if (pred.includes(awayTeam)) {
        return match.winner === 'draw' || match.winner === 'away';
      }
    }
    
    // Over/Under predictions
    const totalGoals = match.homeScore + match.awayScore;
    if (pred.includes('over')) {
      const threshold = parseFloat(pred.replace(/[^0-9.]/g, '')) || 2.5;
      return totalGoals > threshold;
    }
    if (pred.includes('under')) {
      const threshold = parseFloat(pred.replace(/[^0-9.]/g, '')) || 2.5;
      return totalGoals < threshold;
    }
    
    // Both Teams To Score (BTTS)
    if (pred === 'yes' || pred.includes('btts yes') || pred.includes('both teams to score: yes')) {
      return match.homeScore > 0 && match.awayScore > 0;
    }
    if (pred === 'no' || pred.includes('btts no') || pred.includes('both teams to score: no')) {
      return match.homeScore === 0 || match.awayScore === 0;
    }
    
    // Correct Score predictions (e.g., "1-0", "2-1", "0-0")
    const correctScoreMatch = pred.match(/^(\d+)\s*[-:]\s*(\d+)$/);
    if (correctScoreMatch) {
      const predictedHome = parseInt(correctScoreMatch[1], 10);
      const predictedAway = parseInt(correctScoreMatch[2], 10);
      return match.homeScore === predictedHome && match.awayScore === predictedAway;
    }
    
    return false;
  }

  private async getFinishedMatches(): Promise<FinishedMatch[]> {
    // AGGRESSIVE API SAVING: Use cache if fresh
    if (this.finishedMatchesCache && 
        (Date.now() - this.finishedMatchesCache.timestamp) < this.finishedMatchesCacheTTL) {
      console.log('📦 SettlementWorker: Using cached finished matches');
      return this.finishedMatchesCache.data;
    }
    
    const finishedMatches: FinishedMatch[] = [];
    
    try {
      // Check ALL 15 sports with API endpoints for finished matches
      // Football uses paid API, others use free API endpoints
      // Covers: Football, Basketball, Baseball, Hockey, Volleyball, Handball, Rugby, AFL, MMA, American Football, Tennis, Formula 1, Boxing, Esports, NFL
      const sportsToCheck = ['football', 'basketball', 'baseball', 'hockey', 'volleyball', 'handball', 'rugby', 'afl', 'mma', 'american-football', 'tennis', 'formula-1', 'boxing', 'esports', 'nfl'];
      
      for (const sport of sportsToCheck) {
        try {
          const response = await this.fetchFinishedForSport(sport);
          finishedMatches.push(...response);
        } catch (error) {
          // Silently skip failed sports
        }
      }

      // Cache the results
      this.finishedMatchesCache = {
        data: finishedMatches,
        timestamp: Date.now()
      };

      // NOTE: Don't filter out matches based on settledEventIdsCache here!
      // Multiple bets can exist on the same match. The settlement logic
      // will naturally skip matches with no pending bets.
      return finishedMatches;
    } catch (error) {
      console.error('Error fetching finished matches:', error);
      return [];
    }
  }

  private async fetchFinishedForSport(sport: string): Promise<FinishedMatch[]> {
    const finished: FinishedMatch[] = [];

    const apiKey = process.env.API_SPORTS_KEY || process.env.SPORTSDATA_API_KEY || process.env.APISPORTS_KEY || '';
    if (!apiKey) return [];

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const datesToCheck = [todayStr, yesterdayStr];
    
    // ALL 15 sports API endpoints for settlement
    const sportEndpoints: Record<string, string> = {
      football: 'https://v3.football.api-sports.io/fixtures',
      basketball: 'https://v1.basketball.api-sports.io/games',
      baseball: 'https://v1.baseball.api-sports.io/games',
      hockey: 'https://v1.hockey.api-sports.io/games',
      volleyball: 'https://v1.volleyball.api-sports.io/games',
      handball: 'https://v1.handball.api-sports.io/games',
      rugby: 'https://v1.rugby.api-sports.io/games',
      afl: 'https://v1.afl.api-sports.io/games',
      mma: 'https://v1.mma.api-sports.io/fights',
      'american-football': 'https://v1.american-football.api-sports.io/games',
      tennis: 'https://v1.tennis.api-sports.io/games',
      'formula-1': 'https://v1.formula-1.api-sports.io/races',
      boxing: 'https://v1.boxing.api-sports.io/fights',
      esports: 'https://v1.esports.api-sports.io/games',
      nfl: 'https://v1.american-football.api-sports.io/games'
    };

    const url = sportEndpoints[sport];
    if (!url) return finished;

    for (const dateStr of datesToCheck) {
      try {
        const axios = await import('axios');
        const params = sport === 'football' 
          ? { date: dateStr, status: 'FT-AET-PEN' }
          : { date: dateStr, status: 'FT' };
          
        const response = await axios.default.get(url, {
          params,
          headers: {
            'x-apisports-key': apiKey,
            'Accept': 'application/json'
          },
          timeout: 10000
        });

        if (response.data?.response && Array.isArray(response.data.response)) {
          for (const match of response.data.response) {
            const eventId = match.fixture?.id?.toString() || match.id?.toString();
            
            // Handle different sports' team/fighter naming conventions
            let homeTeam = '';
            let awayTeam = '';
            
            if (sport === 'mma' || sport === 'boxing') {
              // MMA and Boxing use 'fighters' structure
              homeTeam = match.fighters?.first?.name || match.fighters?.home?.name || match.teams?.home?.name || '';
              awayTeam = match.fighters?.second?.name || match.fighters?.away?.name || match.teams?.away?.name || '';
            } else if (sport === 'formula-1') {
              // Formula 1 uses 'driver' or 'team' structure - store race winner
              homeTeam = match.driver?.name || match.team?.name || match.winner?.name || '';
              awayTeam = 'Race'; // F1 is not home vs away
            } else {
              // All other sports use standard teams structure
              homeTeam = match.teams?.home?.name || '';
              awayTeam = match.teams?.away?.name || '';
            }
            
            let homeScore = 0;
            let awayScore = 0;
            
            if (sport === 'football') {
              homeScore = match.goals?.home || 0;
              awayScore = match.goals?.away || 0;
            } else if (sport === 'basketball') {
              homeScore = match.scores?.home?.total || 0;
              awayScore = match.scores?.away?.total || 0;
            } else if (sport === 'mma' || sport === 'boxing') {
              // MMA/Boxing: winner is determined by result, not score
              // Check if there's a winner field
              const winnerName = match.winner?.name || match.result?.winner || '';
              if (winnerName && homeTeam && winnerName.toLowerCase().includes(homeTeam.toLowerCase())) {
                homeScore = 1;
                awayScore = 0;
              } else if (winnerName && awayTeam && winnerName.toLowerCase().includes(awayTeam.toLowerCase())) {
                homeScore = 0;
                awayScore = 1;
              }
            } else if (sport === 'formula-1') {
              // F1: Position-based, winner gets score 1
              homeScore = match.position === 1 ? 1 : 0;
              awayScore = 0;
            } else {
              homeScore = match.scores?.home || match.score?.home || 0;
              awayScore = match.scores?.away || match.score?.away || 0;
            }

            const winner: 'home' | 'away' | 'draw' = 
              homeScore > awayScore ? 'home' : 
              awayScore > homeScore ? 'away' : 'draw';

            // Only add if we have valid team/fighter names
            if (homeTeam || awayTeam || eventId) {
              finished.push({
                eventId,
                homeTeam,
                awayTeam,
                homeScore,
                awayScore,
                winner,
                status: 'finished'
              });
            }
          }
        }
      } catch (error) {
        // Silently handle API errors for this date
      }
    }

    return finished;
  }

  private settledBetIds = new Set<string>(); // Track settled bet IDs to prevent duplicates

  private async getUnsettledBets(): Promise<UnsettledBet[]> {
    try {
      // Get ALL unsettled bets from all users - include:
      // - 'pending' = waiting for match result
      // - 'confirmed' = on-chain bets that were placed but not yet settled
      // - 'won' = winners that couldn't be paid out (insufficient treasury) - MUST RETRY PAYOUT
      const pendingBets = await storage.getAllBets('pending');
      const confirmedBets = await storage.getAllBets('confirmed');
      const wonBets = await storage.getAllBets('won');
      
      // Filter won bets to only include those without settlement_tx_hash (not yet paid out)
      const unpaidWonBets = wonBets.filter(bet => !bet.settlementTxHash);
      
      console.log(`📊 Unsettled bets: ${pendingBets.length} pending, ${confirmedBets.length} confirmed, ${unpaidWonBets.length} won (unpaid)`);
      
      const allBets = [...pendingBets, ...confirmedBets, ...unpaidWonBets];
      return allBets
        .filter(bet => !this.settledBetIds.has(bet.id))
        .map(bet => ({
          id: bet.id,
          eventId: bet.eventId || '',
          externalEventId: bet.externalEventId || String(bet.eventId || ''),
          homeTeam: bet.homeTeam || '',
          awayTeam: bet.awayTeam || '',
          prediction: bet.selection || bet.prediction || '',
          odds: bet.odds,
          stake: bet.stake || bet.betAmount,
          potentialWin: bet.potentialWin || bet.potentialPayout,
          userId: bet.walletAddress || bet.userId || 'unknown',
          currency: bet.currency || 'SUI',
          betObjectId: bet.betObjectId || undefined, // On-chain bet object ID for SUI bets
          status: bet.status // Include status to identify already-won bets needing payout
        }));
    } catch (error) {
      console.error('Error getting unsettled bets:', error);
      return [];
    }
  }

  private payoutRetryCount = new Map<string, number>();
  private static MAX_PAYOUT_RETRIES = 20;

  private static BLOCKED_WALLETS = new Set([
    '0xaa7f49920b411adeaf6a79a16fc5e8cd0b2da25fdee3eda70fafb06bdba5abf1',
  ]);

  private async retryPendingPayouts(wonBets: UnsettledBet[]) {
    for (const bet of wonBets) {
      if (this.settledBetIds.has(bet.id)) continue;

      // ANTI-EXPLOIT: Skip payouts to blocked wallets
      if (SettlementWorkerService.BLOCKED_WALLETS.has(bet.userId?.toLowerCase())) {
        console.warn(`🚫 PAYOUT BLOCKED: Bet ${bet.id} belongs to blocked wallet ${bet.userId?.slice(0, 12)}... - skipping`);
        this.settledBetIds.add(bet.id);
        continue;
      }

      const retries = this.payoutRetryCount.get(bet.id) || 0;
      if (retries >= SettlementWorkerService.MAX_PAYOUT_RETRIES) {
        console.warn(`🛑 PAYOUT RETRY LIMIT REACHED: Bet ${bet.id} failed ${retries} times - requires manual admin resolution`);
        this.settledBetIds.add(bet.id);
        continue;
      }
      this.payoutRetryCount.set(bet.id, retries + 1);

      try {
        const currentBet = await storage.getBet(bet.id);
        if (!currentBet || currentBet.status !== 'won') {
          console.log(`⚠️ PAYOUT SKIP: Bet ${bet.id} no longer in 'won' state (status=${currentBet?.status}) - skipping`);
          this.settledBetIds.add(bet.id);
          continue;
        }
        const txHash = currentBet.settlementTxHash;
        if (txHash) {
          const isContractSettled = txHash.startsWith('contract-settled-') || txHash.startsWith('verified-on-chain-');
          const isRealTxHash = !txHash.startsWith('on-chain-') && !isContractSettled;
          if (isRealTxHash) {
            console.log(`⚠️ PAYOUT SKIP: Bet ${bet.id} already has real TX hash ${txHash.slice(0,16)}... - skipping`);
            this.settledBetIds.add(bet.id);
            continue;
          }
          if (isContractSettled) {
            console.log(`⚠️ PAYOUT SKIP: Bet ${bet.id} already settled by smart contract (${txHash.slice(0,30)}...) - skipping`);
            this.settledBetIds.add(bet.id);
            continue;
          }
        }

        const grossPayout = bet.potentialWin;
        const profit = grossPayout - bet.stake;
        const platformFee = profit > 0 ? profit * 0.01 : 0;
        const netPayout = grossPayout - platformFee;
        const userWallet = bet.userId;

        if (!userWallet || !userWallet.startsWith('0x') || userWallet.length < 64) {
          console.log(`ℹ️ PAYOUT SKIP: Bet ${bet.id} has no valid wallet address - internal balance only`);
          this.settledBetIds.add(bet.id);
          continue;
        }

        if (bet.betObjectId && blockchainBetService.isAdminKeyConfigured()) {
          const onChainInfo = await blockchainBetService.getOnChainBetInfo(bet.betObjectId);
          if (onChainInfo && !onChainInfo.settled) {
            console.log(`🔗 PAYOUT RETRY ON-CHAIN: Bet ${bet.id} - attempting smart contract settlement`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            const settlementResult = bet.currency === 'SBETS' 
              ? await blockchainBetService.executeSettleBetSbetsOnChain(bet.betObjectId, true)
              : await blockchainBetService.executeSettleBetOnChain(bet.betObjectId, true);
            
            if (settlementResult.success) {
              await storage.updateBetStatus(bet.id, 'paid_out', grossPayout, settlementResult.txHash);
              console.log(`✅ PAYOUT RETRY ON-CHAIN SUCCESS: Bet ${bet.id} | TX: ${settlementResult.txHash}`);
              this.settledBetIds.add(bet.id);
              continue;
            }
            console.warn(`⚠️ PAYOUT RETRY ON-CHAIN FAILED: ${settlementResult.error} - falling back to direct transfer`);
          } else if (onChainInfo?.settled) {
            console.log(`✅ PAYOUT RETRY: Bet ${bet.id} already settled on-chain - marking paid_out`);
            await storage.updateBetStatus(bet.id, 'paid_out', grossPayout, `verified-on-chain-${bet.betObjectId?.slice(0,16)}`);
            this.settledBetIds.add(bet.id);
            continue;
          }
        }

        console.log(`🔄 PAYOUT RETRY DIRECT: Bet ${bet.id} - sending ${netPayout} ${bet.currency} to ${userWallet.slice(0,10)}... (attempt ${retries + 1})`);
        let payoutResult;
        if (bet.currency === 'SUI') {
          payoutResult = await blockchainBetService.sendSuiToUser(userWallet, netPayout);
        } else if (bet.currency === 'SBETS') {
          payoutResult = await blockchainBetService.sendSbetsToUser(userWallet, netPayout);
        }

        if (payoutResult?.success && payoutResult?.txHash) {
          await storage.updateBetStatus(bet.id, 'paid_out', grossPayout, payoutResult.txHash);
          console.log(`✅ PAYOUT RETRY SUCCESS: Bet ${bet.id} paid_out | TX: ${payoutResult.txHash}`);
          this.settledBetIds.add(bet.id);
        } else {
          console.warn(`⚠️ PAYOUT RETRY FAILED: Bet ${bet.id} (attempt ${retries + 1}/${SettlementWorkerService.MAX_PAYOUT_RETRIES}) - ${payoutResult?.error || 'Unknown error'}`);
        }
      } catch (error: any) {
        console.error(`❌ PAYOUT RETRY ERROR: Bet ${bet.id} - ${error.message}`);
      }
    }
  }

  private async settleBetsForMatch(match: FinishedMatch, bets: UnsettledBet[]) {
    for (const bet of bets) {
      // DUPLICATE SETTLEMENT PREVENTION: Skip if already settled this session
      if (this.settledBetIds.has(bet.id)) {
        console.log(`⚠️ SKIPPING: Bet ${bet.id} already processed this session`);
        continue;
      }
      
      // ANTI-EXPLOIT: Never settle bets on "Unknown Event" - these are likely fake/exploitative
      if ((bet as any).eventName === "Unknown Event" || bet.homeTeam === "Unknown" || bet.awayTeam === "Unknown") {
        console.warn(`🚫 EXPLOIT BLOCKED: Skipping settlement for bet ${bet.id} - Unknown Event/Teams`);
        this.settledBetIds.add(bet.id); // Mark as processed to avoid retry spam
        continue;
      }
      
      try {
        // SPECIAL HANDLING: Bets already marked as 'won' are confirmed winners needing payout retry
        // Skip match result determination - they've already been confirmed as winners
        const isAlreadyWon = bet.status === 'won';
        const isWinner = isAlreadyWon ? true : this.determineBetOutcome(bet, match);
        
        if (isAlreadyWon) {
          console.log(`💰 PAYOUT RETRY: Bet ${bet.id} already marked as 'won' - attempting payout`);
        }
        
        const status = isWinner ? 'won' : 'lost';
        const grossPayout = isWinner ? bet.potentialWin : 0;
        // FEE CALCULATION: 1% of PROFIT only (matching smart contract logic)
        // Profit = grossPayout - stake = net winnings beyond original bet
        const profit = isWinner ? (grossPayout - bet.stake) : 0;
        const platformFee = profit > 0 ? profit * 0.01 : 0; // 1% of profit, NOT gross
        const netPayout = grossPayout - platformFee;

        // DUAL SETTLEMENT: On-chain for SUI/SBETS with betObjectId, off-chain fallback
        const hasOnChainBet = bet.betObjectId && blockchainBetService.isAdminKeyConfigured();
        const isSuiOnChainBet = bet.currency === 'SUI' && hasOnChainBet;
        const isSbetsOnChainBet = bet.currency === 'SBETS' && hasOnChainBet;
        
        // CRITICAL WARNING: Flag bets without betObjectId that will use off-chain fallback
        if (!bet.betObjectId) {
          console.warn(`⚠️ MISSING betObjectId: Bet ${bet.id} (${bet.currency}) has no on-chain object ID - will use OFF-CHAIN fallback`);
          console.warn(`   This bet was likely placed before the betObjectId extraction fix or transaction failed to capture it`);
        }
        if (!blockchainBetService.isAdminKeyConfigured()) {
          console.warn(`⚠️ ADMIN_PRIVATE_KEY not configured - all settlements will use OFF-CHAIN fallback`);
        }

        if (isSuiOnChainBet) {
          // ============ ON-CHAIN SETTLEMENT (SUI via smart contract) ============
          // Contract handles payout directly - winner gets SUI from contract treasury
          // Lost bets stay in contract treasury as accrued fees
          console.log(`🔗 ON-CHAIN SUI SETTLEMENT: Bet ${bet.id} via smart contract`);
          
          // PRE-CHECK 1: Verify treasury has enough balance for winners
          if (isWinner) {
            const platformInfo = await blockchainBetService.getPlatformInfo();
            if (platformInfo && platformInfo.treasuryBalanceSui < grossPayout) {
              console.warn(`⚠️ INSUFFICIENT TREASURY: Need ${grossPayout} SUI but only ${platformInfo.treasuryBalanceSui} SUI available`);
              console.warn(`   Bet ${bet.id} requires manual admin resolution - marking as won in DB`);
              // Mark as won but NOT paid_out - admin needs to manually add treasury funds and settle
              await storage.updateBetStatus(bet.id, 'won', grossPayout);
              this.settledBetIds.add(bet.id);
              continue;
            }
          }
          
          // PRE-CHECK 2: Verify bet isn't already settled on-chain (prevents error 6)
          const onChainInfo = await blockchainBetService.getOnChainBetInfo(bet.betObjectId!);
          if (onChainInfo?.settled) {
            console.log(`⚠️ BET ALREADY SETTLED ON-CHAIN: ${bet.betObjectId} - contract handled payout, updating database`);
            const finalStatus = isWinner ? 'paid_out' : 'lost';
            await storage.updateBetStatus(bet.id, finalStatus, grossPayout, `contract-settled-sui-${bet.betObjectId?.slice(0,16)}`);
            this.settledBetIds.add(bet.id);
            continue;
          }
          
          if (!onChainInfo) {
            // Bet object not found on-chain - mark for manual resolution
            console.warn(`⚠️ BET OBJECT NOT FOUND ON-CHAIN: ${bet.betObjectId} - marking for manual resolution`);
            await storage.updateBetStatus(bet.id, isWinner ? 'won' : 'lost', grossPayout);
            this.settledBetIds.add(bet.id);
            continue;
          } else {
            // Small delay between on-chain transactions to prevent object version conflicts
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const settlementResult = await blockchainBetService.executeSettleBetOnChain(
              bet.betObjectId!,
              isWinner
            );

            if (settlementResult.success) {
              // Update database status to reflect on-chain settlement
              // Use 'paid_out' for winners since payout was sent, 'lost' for losers
              const finalStatus = isWinner ? 'paid_out' : 'lost';
              const statusUpdated = await storage.updateBetStatus(bet.id, finalStatus, grossPayout, settlementResult.txHash);
              if (statusUpdated) {
                console.log(`✅ ON-CHAIN SUI SETTLED: ${bet.id} ${finalStatus} | TX: ${settlementResult.txHash}`);
                this.settledBetIds.add(bet.id);
              }
              continue;
            } else {
              // Check if error indicates a MoveAbort (error 6 could be insufficient treasury OR already settled)
              if (settlementResult.error?.includes('error 6') || settlementResult.error?.includes('MoveAbort')) {
                // Re-check on-chain bet status to determine root cause
                const reCheckInfo = await blockchainBetService.getOnChainBetInfo(bet.betObjectId!);
                
                if (reCheckInfo?.settled) {
                  // Bet was already settled on-chain - safe to mark in DB
                  console.log(`⚠️ BET CONFIRMED SETTLED ON-CHAIN: ${bet.id} - contract handled payout, updating database`);
                  const finalStatus = isWinner ? 'paid_out' : 'lost';
                  await storage.updateBetStatus(bet.id, finalStatus, grossPayout, `contract-settled-sui-${bet.betObjectId?.slice(0,16)}`);
                  this.settledBetIds.add(bet.id);
                  continue;
                } else if (isWinner) {
                  // Bet not settled, likely insufficient treasury - mark as 'won' for manual resolution
                  console.warn(`⚠️ SETTLEMENT FAILED (insufficient treasury): ${bet.id} - marking as 'won' for manual resolution`);
                  await storage.updateBetStatus(bet.id, 'won', grossPayout);
                  this.settledBetIds.add(bet.id);
                  continue;
                } else {
                  // Loser bet with error 6 but not settled on-chain - mark as lost (no payout needed anyway)
                  console.warn(`⚠️ SETTLEMENT ERROR for losing bet: ${bet.id} - marking as lost (no payout needed)`);
                  await storage.updateBetStatus(bet.id, 'lost', 0);
                  this.settledBetIds.add(bet.id);
                  continue;
                }
              }
              console.error(`❌ ON-CHAIN SUI SETTLEMENT FAILED: ${bet.id} - ${settlementResult.error}`);
              
              // FALLBACK: If TypeMismatch or ownership error (legacy contract with owned objects), use DB-only settlement
              const isLegacyBetError = settlementResult.error?.includes('TypeMismatch') || 
                                       settlementResult.error?.includes('type mismatch') ||
                                       settlementResult.error?.includes('owned by account address') ||
                                       settlementResult.error?.includes('not signed by the correct sender');
              if (isLegacyBetError) {
                console.log(`🔄 LEGACY BET DETECTED (owned object): Falling back to DB-only settlement with wallet payout for ${bet.id}`);
                // Fall through to off-chain settlement below
              } else {
                // Don't mark as settled - will retry next cycle
                continue;
              }
            }
          }
        }
        
        // Check for SBETS on-chain bets separately
        if (isSbetsOnChainBet) {
          // ============ ON-CHAIN SETTLEMENT (SBETS via smart contract) ============
          // Contract handles payout directly - winner gets SBETS from contract treasury
          console.log(`🔗 ON-CHAIN SBETS SETTLEMENT: Bet ${bet.id} via smart contract`);
          
          // PRE-CHECK 1: Verify treasury has enough SBETS balance for winners
          if (isWinner) {
            const platformInfo = await blockchainBetService.getPlatformInfo();
            if (platformInfo && platformInfo.treasuryBalanceSbets < grossPayout) {
              console.warn(`⚠️ INSUFFICIENT SBETS TREASURY: Need ${grossPayout} SBETS but only ${platformInfo.treasuryBalanceSbets} SBETS available`);
              console.warn(`   Bet ${bet.id} requires manual admin resolution - marking as won in DB`);
              // Mark as won but NOT paid_out - admin needs to manually add treasury funds and settle
              await storage.updateBetStatus(bet.id, 'won', grossPayout);
              this.settledBetIds.add(bet.id);
              continue;
            }
          }
          
          // PRE-CHECK 2: Verify bet isn't already settled on-chain (prevents error 6)
          const onChainInfo = await blockchainBetService.getOnChainBetInfo(bet.betObjectId!);
          if (onChainInfo?.settled) {
            console.log(`⚠️ SBETS BET ALREADY SETTLED ON-CHAIN: ${bet.betObjectId} - contract handled payout, updating database`);
            const finalStatus = isWinner ? 'paid_out' : 'lost';
            await storage.updateBetStatus(bet.id, finalStatus, grossPayout, `contract-settled-sbets-${bet.betObjectId?.slice(0,16)}`);
            this.settledBetIds.add(bet.id);
            continue;
          }
          
          if (!onChainInfo) {
            // Bet object not found on-chain - mark for manual resolution
            console.warn(`⚠️ SBETS BET OBJECT NOT FOUND ON-CHAIN: ${bet.betObjectId} - marking for manual resolution`);
            await storage.updateBetStatus(bet.id, isWinner ? 'won' : 'lost', grossPayout);
            this.settledBetIds.add(bet.id);
            continue;
          } else {
            // Small delay between on-chain transactions to prevent object version conflicts
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const settlementResult = await blockchainBetService.executeSettleBetSbetsOnChain(
              bet.betObjectId!,
              isWinner
            );

            if (settlementResult.success) {
              // Use 'paid_out' for winners since payout was sent, 'lost' for losers
              const finalStatus = isWinner ? 'paid_out' : 'lost';
              const statusUpdated = await storage.updateBetStatus(bet.id, finalStatus, grossPayout, settlementResult.txHash);
              if (statusUpdated) {
                console.log(`✅ ON-CHAIN SBETS SETTLED: ${bet.id} ${finalStatus} | TX: ${settlementResult.txHash}`);
                this.settledBetIds.add(bet.id);
              }
              continue;
            } else {
              // Check if error indicates a MoveAbort (error 6 could be insufficient treasury OR already settled)
              if (settlementResult.error?.includes('error 6') || settlementResult.error?.includes('MoveAbort')) {
                // Re-check on-chain bet status to determine root cause
                const reCheckInfo = await blockchainBetService.getOnChainBetInfo(bet.betObjectId!);
                
                if (reCheckInfo?.settled) {
                  // Bet was already settled on-chain - safe to mark in DB
                  console.log(`⚠️ SBETS BET CONFIRMED SETTLED ON-CHAIN: ${bet.id} - contract handled payout, updating database`);
                  const finalStatus = isWinner ? 'paid_out' : 'lost';
                  await storage.updateBetStatus(bet.id, finalStatus, grossPayout, `contract-settled-sbets-${bet.betObjectId?.slice(0,16)}`);
                  this.settledBetIds.add(bet.id);
                  continue;
                } else if (isWinner) {
                  // Bet not settled, likely insufficient treasury - mark as 'won' for manual resolution
                  console.warn(`⚠️ SBETS SETTLEMENT FAILED (insufficient treasury): ${bet.id} - marking as 'won' for manual resolution`);
                  await storage.updateBetStatus(bet.id, 'won', grossPayout);
                  this.settledBetIds.add(bet.id);
                  continue;
                } else {
                  // Loser bet with error 6 but not settled on-chain - mark as lost (no payout needed anyway)
                  console.warn(`⚠️ SBETS SETTLEMENT ERROR for losing bet: ${bet.id} - marking as lost (no payout needed)`);
                  await storage.updateBetStatus(bet.id, 'lost', 0);
                  this.settledBetIds.add(bet.id);
                  continue;
                }
              }
              console.error(`❌ ON-CHAIN SBETS SETTLEMENT FAILED: ${bet.id} - ${settlementResult.error}`);
              
              // FALLBACK: If TypeMismatch or ownership error (legacy contract with owned objects), use DB-only settlement
              const isLegacySbetsBetError = settlementResult.error?.includes('TypeMismatch') || 
                                            settlementResult.error?.includes('type mismatch') ||
                                            settlementResult.error?.includes('owned by account address') ||
                                            settlementResult.error?.includes('not signed by the correct sender');
              if (isLegacySbetsBetError) {
                console.log(`🔄 LEGACY SBETS BET DETECTED (owned object): Falling back to DB-only settlement with wallet payout for ${bet.id}`);
                // Fall through to off-chain settlement below
              } else {
                continue;
              }
            }
          }
        }
        
        // ============ OFF-CHAIN SETTLEMENT FALLBACK ============
        // Fall-through point for: bets without betObjectId, OR legacy bets with TypeMismatch errors
        // This handles both cases: no on-chain bet OR failed on-chain settlement
        {
          // ============ OFF-CHAIN SETTLEMENT (fallback for all failed on-chain attempts) ============
          // Uses internal balance tracking - funds managed via hybrid custodial model
          console.log(`📊 OFF-CHAIN SETTLEMENT: Bet ${bet.id} (${bet.currency}) via database (fallback)`);

          // DOUBLE PAYOUT PREVENTION: Only process winnings if status update succeeded
          // Use 'paid_out' for winners after successful payout, 'lost' for losers
          const initialStatus = isWinner ? 'won' : 'lost'; // Start as 'won', upgrade to 'paid_out' after payout
          const statusUpdated = await storage.updateBetStatus(bet.id, initialStatus, grossPayout);

          if (statusUpdated) {
            if (isWinner && netPayout > 0) {
              const winningsAdded = await balanceService.addWinnings(bet.userId, netPayout, bet.currency as 'SUI' | 'SBETS');
              if (!winningsAdded) {
                console.error(`❌ BALANCE CREDIT FAILED: Bet ${bet.id} - keeping as 'won' for payout retry (NOT reverting to pending)`);
                continue;
              }
              // CRITICAL: Record 1% platform fee as revenue
              await balanceService.addRevenue(platformFee, bet.currency as 'SUI' | 'SBETS');
              console.log(`💰 WINNER (DB): ${bet.userId} won ${netPayout} ${bet.currency} (fee: ${platformFee} ${bet.currency} -> revenue)`);
              
              // AUTOMATIC ON-CHAIN PAYOUT: Send winnings directly to user's wallet from treasury funds
              const userWallet = bet.userId;
              let payoutSuccess = false;
              let payoutTxHash: string | undefined;
              
              if (userWallet && userWallet.startsWith('0x') && userWallet.length >= 64) {
                try {
                  console.log(`🔄 AUTO-PAYOUT: Sending ${netPayout} ${bet.currency} to ${userWallet.slice(0,10)}...`);
                  let payoutResult;
                  if (bet.currency === 'SUI') {
                    payoutResult = await blockchainBetService.sendSuiToUser(userWallet, netPayout);
                  } else if (bet.currency === 'SBETS') {
                    payoutResult = await blockchainBetService.sendSbetsToUser(userWallet, netPayout);
                  }
                  
                  if (payoutResult?.success && payoutResult?.txHash) {
                    console.log(`✅ AUTO-PAYOUT SUCCESS: ${netPayout} ${bet.currency} sent to ${userWallet.slice(0,10)}... | TX: ${payoutResult.txHash}`);
                    payoutSuccess = true;
                    payoutTxHash = payoutResult.txHash;
                  } else {
                    console.warn(`⚠️ AUTO-PAYOUT FAILED: ${payoutResult?.error || 'Unknown error'} - keeping as 'won' for retry`);
                  }
                } catch (payoutError: any) {
                  console.warn(`⚠️ AUTO-PAYOUT ERROR: ${payoutError.message} - keeping as 'won' for retry`);
                }
              } else {
                console.log(`ℹ️ No valid wallet for auto-payout (userId: ${bet.userId?.slice(0,20)}...) - internal balance credited`);
              }
              
              // Only mark as 'paid_out' if on-chain payout succeeded, otherwise keep as 'won' for retry
              if (payoutSuccess && payoutTxHash) {
                await storage.updateBetStatus(bet.id, 'paid_out', grossPayout, payoutTxHash);
                console.log(`✅ PAID OUT: Bet ${bet.id} marked as paid_out with TX: ${payoutTxHash}`);
              } else {
                await storage.updateBetStatus(bet.id, 'won', grossPayout);
                console.log(`⏳ PENDING PAYOUT: Bet ${bet.id} marked as 'won' - awaiting admin wallet funding for on-chain payout`);
              }
            } else {
              // Lost bet - add full stake to platform revenue
              await balanceService.addRevenue(bet.stake, bet.currency as 'SUI' | 'SBETS');
              console.log(`📉 LOST (DB): ${bet.userId} lost ${bet.stake} ${bet.currency} - added to platform revenue`);
            }
            console.log(`✅ Settled bet ${bet.id}: ${isWinner ? 'paid_out' : 'lost'} (${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam})`);
            
            // ONLY mark as settled after successful payout processing
            this.settledBetIds.add(bet.id);
          } else {
            console.log(`⚠️ SETTLEMENT SKIPPED: Bet ${bet.id} already in terminal state - payout retries handled by dedicated retryPendingPayouts`);
            this.settledBetIds.add(bet.id);
          }
        }
      } catch (error) {
        console.error(`❌ Error settling bet ${bet.id}:`, error);
        // Don't mark as settled on error - allow retry next cycle
      }
    }

    // Persist event as settled in database (survives restarts)
    await this.markEventAsSettled(match, bets.length);
  }

  private determineBetOutcome(bet: UnsettledBet, match: FinishedMatch): boolean {
    const prediction = bet.prediction.toLowerCase().trim();
    const homeTeam = match.homeTeam.toLowerCase();
    const awayTeam = match.awayTeam.toLowerCase();

    // Check for Correct Score prediction (e.g., "1-0", "2-1", "0-0")
    const correctScoreMatch = prediction.match(/^(\d+)\s*[-:]\s*(\d+)$/);
    if (correctScoreMatch) {
      const predictedHome = parseInt(correctScoreMatch[1], 10);
      const predictedAway = parseInt(correctScoreMatch[2], 10);
      return match.homeScore === predictedHome && match.awayScore === predictedAway;
    }

    // Check for "Other" correct score prediction (any score not in standard options)
    if (prediction === 'other') {
      const commonScores = ['0-0', '1-0', '0-1', '1-1', '2-0', '0-2', '2-1', '1-2', '2-2', '3-0', '0-3', '3-1', '1-3', '3-2', '2-3'];
      const actualScore = `${match.homeScore}-${match.awayScore}`;
      return !commonScores.includes(actualScore);
    }

    // Match Winner predictions
    if (prediction.includes(homeTeam) || prediction === 'home' || prediction === '1') {
      return match.winner === 'home';
    }
    
    if (prediction.includes(awayTeam) || prediction === 'away' || prediction === '2') {
      return match.winner === 'away';
    }
    
    if (prediction === 'draw' || prediction === 'x' || prediction === 'tie') {
      return match.winner === 'draw';
    }

    // Over/Under predictions (for other sports like basketball, tennis)
    if (prediction.includes('over')) {
      const totalGoals = match.homeScore + match.awayScore;
      const threshold = parseFloat(prediction.replace(/[^0-9.]/g, '')) || 2.5;
      return totalGoals > threshold;
    }
    
    if (prediction.includes('under')) {
      const totalGoals = match.homeScore + match.awayScore;
      const threshold = parseFloat(prediction.replace(/[^0-9.]/g, '')) || 2.5;
      return totalGoals < threshold;
    }

    return false;
  }

  async manualSettle(betId: string, outcome: 'won' | 'lost' | 'void') {
    try {
      const bet = await storage.getBet(betId);
      if (!bet) throw new Error('Bet not found');

      const payout = outcome === 'won' ? bet.potentialPayout : 
                     outcome === 'void' ? bet.betAmount : 0;

      // DOUBLE PAYOUT PREVENTION: Only process winnings if status update succeeded
      const statusUpdated = await storage.updateBetStatus(betId, outcome, payout);

      if (!statusUpdated) {
        console.log(`⚠️ DUPLICATE SETTLEMENT PREVENTED: Bet ${betId} already settled - no payout applied`);
        return { success: false, betId, outcome, payout, message: 'Bet already settled' };
      }

      if (outcome === 'won' && payout > 0) {
        await balanceService.addWinnings(bet.userId || 'user1', payout, (bet.feeCurrency || 'SUI') as 'SUI' | 'SBETS');
        console.log(`💰 MANUAL SETTLE (DB): ${bet.userId} won ${payout} ${bet.feeCurrency}`);
      } else if (outcome === 'void') {
        await balanceService.addWinnings(bet.userId || 'user1', payout, (bet.feeCurrency || 'SUI') as 'SUI' | 'SBETS');
        console.log(`🔄 VOIDED (DB): Refunded ${payout} to ${bet.userId}`);
      } else {
        await balanceService.addRevenue(bet.betAmount, (bet.feeCurrency || 'SUI') as 'SUI' | 'SBETS');
        console.log(`📉 MANUAL LOSS (DB): Added ${bet.betAmount} to platform revenue`);
      }

      return { success: true, betId, outcome, payout };
    } catch (error) {
      console.error('Manual settlement error:', error);
      throw error;
    }
  }

  async forceOnChainSettlement(betId: string, outcome: 'won' | 'lost' | 'void'): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const bet = await storage.getBet(betId);
      if (!bet) {
        return { success: false, error: 'Bet not found' };
      }

      const betObjectId = bet.betObjectId;
      if (!betObjectId) {
        return { success: false, error: 'Bet has no on-chain betObjectId - cannot execute on-chain settlement' };
      }

      if (!blockchainBetService.isAdminKeyConfigured()) {
        return { success: false, error: 'Admin private key not configured - cannot execute on-chain settlement' };
      }

      const isWinner = outcome === 'won';
      const isVoid = outcome === 'void';
      const currency = bet.feeCurrency || bet.currency || 'SUI';

      console.log(`🔧 FORCE ON-CHAIN SETTLEMENT: Bet ${betId} (${currency}) -> ${outcome}`);

      let result;
      if (isVoid) {
        if (currency === 'SBETS') {
          result = await blockchainBetService.executeVoidBetSbetsOnChain(betObjectId);
        } else {
          result = await blockchainBetService.executeVoidBetOnChain(betObjectId);
        }
      } else {
        if (currency === 'SBETS') {
          result = await blockchainBetService.executeSettleBetSbetsOnChain(betObjectId, isWinner);
        } else {
          result = await blockchainBetService.executeSettleBetOnChain(betObjectId, isWinner);
        }
      }

      if (result.success) {
        console.log(`✅ FORCE ON-CHAIN SETTLEMENT SUCCESS: Bet ${betId} -> ${outcome} | TX: ${result.txHash}`);
        return { success: true, txHash: result.txHash };
      } else {
        console.error(`❌ FORCE ON-CHAIN SETTLEMENT FAILED: Bet ${betId} - ${result.error}`);
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('Force on-chain settlement error:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  async getBetsNeedingOnChainSettlement(): Promise<any[]> {
    try {
      const allBets = await storage.getAllBets();
      return allBets.filter(bet => 
        bet.betObjectId && 
        (bet.status === 'won' || bet.status === 'lost' || bet.status === 'void') &&
        !bet.winningsWithdrawn
      );
    } catch (error) {
      console.error('Error getting bets needing on-chain settlement:', error);
      return [];
    }
  }

  getStatus() {
    return {
      isRunning: this._isRunning,
      settledEventsInMemory: this.settledEventIdsCache.size,
      settledBetsInMemory: this.settledBetIds.size,
      checkInterval: this.checkInterval / 1000
    };
  }

  // Helper methods for testing
  isRunningNow(): boolean {
    return this._isRunning;
  }

  getSettledEventsCount(): number {
    return this.settledEventIdsCache.size;
  }

  getSettledBetsCount(): number {
    return this.settledBetIds.size;
  }
}

export const settlementWorker = new SettlementWorkerService();
