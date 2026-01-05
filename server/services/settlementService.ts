
export interface Bet {
  id: string;
  userId: string;
  eventId: string;
  marketId: string;
  outcomeId: string;
  odds: number;
  betAmount: number;
  status: 'pending' | 'won' | 'lost' | 'void' | 'cashed_out';
  prediction: string;
  placedAt: number;
  settledAt?: number;
  potentialPayout: number;
  actualPayout?: number;
}

export interface SettlementResult {
  betId: string;
  status: 'won' | 'lost' | 'void';
  payout: number;
}

/**
 * Settlement Service - Handles automatic bet settlement based on event results
 */
export class SettlementService {
  /**
   * Settle a bet based on event result
   */
  static settleBet(bet: Bet, eventResult: any): SettlementResult {
    const settled: SettlementResult = {
      betId: bet.id,
      status: 'lost',
      payout: 0
    };

    try {
      // Check if outcome matches the bet prediction
      if (!eventResult) {
        settled.status = 'void';
        settled.payout = bet.betAmount; // Return stake
        return settled;
      }

      // Determine if bet won based on outcome
      const betWon = this.isBetWon(bet, eventResult);

      if (betWon) {
        settled.status = 'won';
        settled.payout = Math.round(bet.betAmount * bet.odds * 100) / 100; // Apply odds
      } else {
        settled.status = 'lost';
        settled.payout = 0;
      }

      return settled;
    } catch (error) {
      console.error('Settlement error:', error);
      settled.status = 'void';
      settled.payout = bet.betAmount; // Refund on error
      return settled;
    }
  }

  /**
   * Calculate cash-out value based on current odds and bet status
   */
  static calculateCashOut(bet: Bet, currentOdds: number, percentageWinning: number): number {
    if (bet.status !== 'pending') return 0;

    // Cash-out formula: stake * (percentage of original odds / original odds) * 0.95 (5% house cut)
    const cashOutValue = bet.betAmount * (currentOdds / bet.odds) * percentageWinning * 0.95;
    return Math.max(Math.round(cashOutValue * 100) / 100, bet.betAmount * 0.1); // Min 10% of stake
  }

  /**
   * Settle a parlay bet (all legs must win)
   */
  static settleParlay(bets: Bet[], eventResults: any[]): SettlementResult {
    const settled: SettlementResult = {
      betId: `parlay-${bets.map(b => b.id).join('-')}`,
      status: 'lost',
      payout: 0
    };

    try {
      // All bets must win for parlay to win
      const allWon = bets.every((bet, index) => {
        const result = eventResults[index];
        return this.isBetWon(bet, result);
      });

      if (allWon) {
        settled.status = 'won';
        // Calculate combined parlay odds
        const parlayOdds = bets.reduce((acc, bet) => acc * bet.odds, 1);
        settled.payout = Math.round(bets[0].betAmount * parlayOdds * 100) / 100;
      } else {
        settled.status = 'lost';
        settled.payout = 0;
      }

      return settled;
    } catch (error) {
      console.error('Parlay settlement error:', error);
      settled.status = 'void';
      settled.payout = bets[0].betAmount; // Refund first bet stake
      return settled;
    }
  }

  /**
   * Check if a bet won based on event result
   */
  private static isBetWon(bet: Bet, eventResult: any): boolean {
    if (!eventResult) return false;

    const prediction = bet.prediction.toLowerCase();
    // Handle both string and object eventResult
    const result = typeof eventResult === 'string' 
      ? eventResult.toLowerCase()
      : (eventResult.result || eventResult.winner || '').toLowerCase();
    const score = typeof eventResult === 'object' ? eventResult.score : undefined;

    // Direct match on prediction
    if (result === prediction || result === bet.outcomeId.toLowerCase()) {
      return true;
    }

    // Match Winner bets
    if (bet.marketId.includes('match-winner') || bet.marketId.includes('1x2')) {
      if (prediction === 'home' || prediction === '1') {
        return result === 'home' || result === '1' || (eventResult.homeScore > eventResult.awayScore);
      }
      if (prediction === 'away' || prediction === '2') {
        return result === 'away' || result === '2' || (eventResult.awayScore > eventResult.homeScore);
      }
      if (prediction === 'draw' || prediction === 'x') {
        return result === 'draw' || result === 'x' || (eventResult.homeScore === eventResult.awayScore);
      }
    }

    // Over/Under bets
    if (bet.marketId.includes('over-under') || bet.marketId.includes('o/u')) {
      const totalGoals = (eventResult.homeScore || 0) + (eventResult.awayScore || 0);
      const threshold = parseFloat(bet.marketId.match(/\d+\.?\d*/)?.[0] || '2.5');
      
      if (prediction.includes('over')) {
        return totalGoals > threshold;
      }
      if (prediction.includes('under')) {
        return totalGoals < threshold;
      }
    }

    return false;
  }
}
