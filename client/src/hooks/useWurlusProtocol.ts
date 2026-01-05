import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { queryClient } from '@/lib/queryClient';

/**
 * Interface definitions for betting protocol
 */
export interface WurlusBet {
  id: string;
  eventId: string;
  marketId: string;
  outcomeId: string;
  amount: number;
  potentialPayout: number;
  odds: number;
  status: 'pending' | 'won' | 'lost' | 'void';
  placedAt: number;
  settledAt: number | null;
  txHash: string;
}

export interface WurlusEvent {
  id: string;
  name: string;
  description: string;
  startTime: number;
  sportId: string;
  markets: WurlusMarket[];
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
}

export interface WurlusMarket {
  id: string;
  name: string;
  outcomes: WurlusOutcome[];
  status: 'open' | 'closed' | 'settled';
}

export interface WurlusOutcome {
  id: string;
  name: string;
  odds: number;
  status: 'active' | 'settled_win' | 'settled_lose' | 'voided';
}

export interface WurlusDividends {
  totalEarned: number;
  availableToClaim: number;
  lastDistribution: number;
  stakingBalance: number;
  stakingPeriod: number;
  activeStake: boolean;
}

/**
 * Hook to interact with the betting protocol
 * Uses PostgreSQL database for data storage
 */
export function useWurlusProtocol() {
  const { user } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [placingBet, setPlacingBet] = useState(false);
  const [claimingWinnings, setClaimingWinnings] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(false);
  const [fetchingDividends, setFetchingDividends] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Connect wallet - wallet connection is handled by AuthContext
   */
  const connectToWurlusProtocol = async (walletAddress: string): Promise<boolean> => {
    setConnecting(true);
    setError(null);
    
    try {
      // Wallet connection is handled by the auth system
      // Just return success if we have a valid address
      if (walletAddress && walletAddress.startsWith('0x')) {
        return true;
      }
      setError('Invalid wallet address');
      return false;
    } finally {
      setConnecting(false);
    }
  };

  /**
   * Check registration - all wallets are automatically registered
   */
  const checkRegistrationStatus = async (walletAddress: string): Promise<boolean> => {
    setCheckingRegistration(true);
    setError(null);
    
    try {
      // All wallets are automatically registered in the database
      return walletAddress && walletAddress.startsWith('0x');
    } finally {
      setCheckingRegistration(false);
    }
  };

  /**
   * Get dividend information - returns default values (feature placeholder)
   */
  const getDividends = async (walletAddress: string): Promise<WurlusDividends | null> => {
    setFetchingDividends(true);
    setError(null);
    
    try {
      // Dividends feature - returns placeholder data
      return {
        totalEarned: 0,
        availableToClaim: 0,
        lastDistribution: 0,
        stakingBalance: 0,
        stakingPeriod: 0,
        activeStake: false
      };
    } finally {
      setFetchingDividends(false);
    }
  };

  /**
   * Claim winnings from a bet
   */
  const claimWinnings = async (walletAddress: string, betId: string): Promise<string | null> => {
    setClaimingWinnings(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/bets/${betId}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.message || 'Failed to claim winnings');
        return null;
      }
      
      // Invalidate bets query cache to refresh bet list
      if (user?.id) {
        queryClient.invalidateQueries({
          predicate: (query) => String(query.queryKey[0]).includes('/api/bets'),
        });
      }
      
      return data.txHash || `claim-${Date.now()}`;
    } catch (error) {
      console.error('Error claiming winnings:', error);
      setError('Failed to claim winnings');
      return null;
    } finally {
      setClaimingWinnings(false);
    }
  };

  /**
   * Place a bet using the database-backed API
   */
  const placeBet = async (
    eventId: number,
    marketId: string,
    outcomeId: string,
    amount: number,
    odds: number,
    prediction: string
  ): Promise<string | null> => {
    if (!user?.id) {
      setError('You must be logged in to place a bet');
      return null;
    }
    
    setPlacingBet(true);
    setError(null);
    
    try {
      const response = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          eventId,
          betAmount: amount,
          odds,
          prediction,
          marketId,
          outcomeId
        })
      });
      
      const data = await response.json();
      
      if (!data.success && !data.id) {
        setError(data.message || 'Failed to place bet');
        return null;
      }
      
      // Invalidate bets query cache to refresh bet list
      queryClient.invalidateQueries({
        predicate: (query) => String(query.queryKey[0]).includes('/api/bets'),
      });
      
      return data.onChain?.txHash || data.txHash || `bet-${Date.now()}`;
    } catch (error) {
      console.error('Error placing bet:', error);
      setError('Failed to place bet');
      return null;
    } finally {
      setPlacingBet(false);
    }
  };

  /**
   * Get betting history from database
   */
  const getUserBets = async (): Promise<WurlusBet[]> => {
    const walletId = user?.walletAddress || user?.id;
    if (!walletId) {
      return [];
    }
    
    try {
      const response = await fetch(`/api/bets?wallet=${walletId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching user bets:', error);
      setError('Failed to fetch bet history');
      return [];
    }
  };

  /**
   * Get betting history by wallet address
   */
  const getWalletBets = async (walletAddress: string): Promise<WurlusBet[]> => {
    try {
      const response = await fetch(`/api/bets?wallet=${walletAddress}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching wallet bets:', error);
      setError('Failed to fetch bet history');
      return [];
    }
  };

  /**
   * Stake tokens - placeholder for future feature
   */
  const stakeTokens = async (
    walletAddress: string,
    amount: number,
    period: number
  ): Promise<string | null> => {
    if (!walletAddress) {
      setError('Wallet address is required');
      return null;
    }
    
    setError(null);
    
    try {
      console.log(`Staking ${amount} tokens for ${period} days from wallet ${walletAddress}`);
      
      // Staking feature placeholder - returns mock tx hash
      const txHash = `0x${Array.from({length: 64}, () => 
        Math.floor(Math.random() * 16).toString(16)).join('')}`;
      
      return txHash;
    } catch (error) {
      console.error('Error staking tokens:', error);
      setError('Failed to stake tokens');
      return null;
    }
  };

  return {
    // Connection & registration
    connectToWurlusProtocol,
    checkRegistrationStatus,
    
    // Betting operations
    placeBet,
    claimWinnings,
    
    // Data retrieval
    getUserBets,
    getWalletBets,
    getDividends,
    
    // Staking operations
    stakeTokens,
    
    // Status indicators
    connecting,
    placingBet,
    claimingWinnings,
    checkingRegistration,
    fetchingDividends,
    
    // Error handling
    error,
    setError,
  };
}
