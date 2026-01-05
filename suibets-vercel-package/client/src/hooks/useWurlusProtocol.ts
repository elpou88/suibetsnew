import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { queryClient } from '@/lib/queryClient';

/**
 * Interface definitions based on Wal.app documentation
 * References:
 * - https://docs.wal.app/dev-guide/components.html
 * - https://docs.wal.app/dev-guide/sui-struct.html
 * - https://docs.wal.app/design/operations-sui.html 
 * - https://docs.wal.app/design/encoding.html
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
 * Hook to interact with the Wurlus protocol on the Sui blockchain
 * Based on Wal.app documentation:
 * - https://docs.wal.app/usage/interacting.html
 * - https://docs.wal.app/operator-guide/aggregator.html
 * - https://docs.wal.app/usage/stake.html
 * - https://docs.wal.app/dev-guide/data-security.html
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
   * Connect wallet to Wurlus protocol
   * @param walletAddress The wallet address to connect
   * @returns Promise resolving to boolean indicating success
   */
  const connectToWurlusProtocol = async (walletAddress: string): Promise<boolean> => {
    setConnecting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/wurlus/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        setError(data.message || 'Failed to connect to Wurlus protocol');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error connecting to Wurlus protocol:', error);
      setError('Failed to connect to Wurlus protocol');
      return false;
    } finally {
      setConnecting(false);
    }
  };

  /**
   * Check if wallet is registered with Wurlus protocol
   * @param walletAddress The wallet address to check
   * @returns Promise resolving to boolean indicating registration status
   */
  const checkRegistrationStatus = async (walletAddress: string): Promise<boolean> => {
    setCheckingRegistration(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/wurlus/registration/${walletAddress}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (!data.success) {
        setError(data.message || 'Failed to check registration status');
        return false;
      }
      
      return data.isRegistered;
    } catch (error) {
      console.error('Error checking registration status:', error);
      setError('Failed to check registration status');
      return false;
    } finally {
      setCheckingRegistration(false);
    }
  };

  /**
   * Get dividend information for a wallet
   * @param walletAddress The wallet address
   * @returns Promise resolving to dividend information
   */
  const getDividends = async (walletAddress: string): Promise<WurlusDividends | null> => {
    setFetchingDividends(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/wurlus/dividends/${walletAddress}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (!data.success) {
        setError(data.message || 'Failed to fetch dividend information');
        return null;
      }
      
      return {
        totalEarned: data.totalEarned,
        availableToClaim: data.availableToClaim,
        lastDistribution: data.lastDistribution,
        stakingBalance: data.stakingBalance,
        stakingPeriod: data.stakingPeriod,
        activeStake: data.activeStake
      };
    } catch (error) {
      console.error('Error fetching dividend information:', error);
      setError('Failed to fetch dividend information');
      return null;
    } finally {
      setFetchingDividends(false);
    }
  };

  /**
   * Claim winnings from a bet
   * @param walletAddress The wallet address
   * @param betId The bet ID to claim winnings from
   * @returns Promise resolving to transaction hash
   */
  const claimWinnings = async (walletAddress: string, betId: string): Promise<string | null> => {
    setClaimingWinnings(true);
    setError(null);
    
    try {
      const response = await fetch('/api/wurlus/claim-winnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, betId })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        setError(data.message || 'Failed to claim winnings');
        return null;
      }
      
      // Invalidate bets query cache to refresh bet list
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: ['/api/bets/user', user.id],
        });
      }
      
      return data.txHash;
    } catch (error) {
      console.error('Error claiming winnings:', error);
      setError('Failed to claim winnings');
      return null;
    } finally {
      setClaimingWinnings(false);
    }
  };

  /**
   * Place a bet using the Wurlus protocol
   * @param eventId Event ID
   * @param marketId Market ID
   * @param outcomeId Outcome ID
   * @param amount Bet amount
   * @param odds Odds value
   * @param prediction Prediction text
   * @returns Promise resolving to transaction hash
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
          market: marketId,
          selection: outcomeId
        })
      });
      
      const data = await response.json();
      
      if (!data.id) {
        setError(data.message || 'Failed to place bet');
        return null;
      }
      
      // Invalidate bets query cache to refresh bet list
      queryClient.invalidateQueries({
        queryKey: ['/api/bets/user', user.id],
      });
      
      return data.txHash;
    } catch (error) {
      console.error('Error placing bet:', error);
      setError('Failed to place bet');
      return null;
    } finally {
      setPlacingBet(false);
    }
  };

  /**
   * Get betting history from local storage
   * @returns Promise resolving to array of bets
   */
  const getUserBets = async (): Promise<WurlusBet[]> => {
    if (!user?.id) {
      return [];
    }
    
    try {
      const response = await fetch(`/api/bets/user/${user.id}`, {
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
   * Get betting history directly from blockchain
   * @param walletAddress The wallet address
   * @returns Promise resolving to array of bets
   */
  const getWalletBets = async (walletAddress: string): Promise<WurlusBet[]> => {
    try {
      const response = await fetch(`/api/wurlus/bets/${walletAddress}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (!data.success) {
        setError(data.message || 'Failed to fetch bet history');
        return [];
      }
      
      return data.bets;
    } catch (error) {
      console.error('Error fetching wallet bets:', error);
      setError('Failed to fetch bet history');
      return [];
    }
  };

  /**
   * Stake tokens in the Wurlus protocol
   * @param walletAddress The wallet address
   * @param amount Amount to stake
   * @param period Staking period in days
   * @returns Promise resolving to transaction hash
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
      // This would make an API call to stake tokens in the Wurlus protocol
      // For now, we'll simulate a successful staking operation
      console.log(`Staking ${amount} tokens for ${period} days from wallet ${walletAddress}`);
      
      // In a real implementation, this would call an API endpoint
      // that would interact with the Wurlus protocol
      
      // Mock transaction hash for development
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