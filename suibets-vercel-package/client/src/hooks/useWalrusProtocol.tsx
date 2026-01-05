import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

// Define the wallet type
interface WalrusWallet {
  address: string;
  isRegistered: boolean;
}

// Define bet type
interface WalrusBet {
  id: string;
  eventId: string;
  marketId: string;
  outcomeId: string;
  amount: number;
  tokenType: 'SUI' | 'SBETS';
  timestamp: number;
  status: 'pending' | 'won' | 'lost' | 'cancelled';
  potentialWinnings: number;
}

// Define dividend type
interface WalrusDividend {
  id: string;
  amount: number;
  tokenType: 'SUI' | 'SBETS';
  timestamp: number;
}

// Define stake type
interface WalrusStake {
  id: string;
  amount: number;
  periodDays: number;
  startTimestamp: number;
  endTimestamp: number;
  status: 'active' | 'completed' | 'cancelled';
  apy: number;
}

export function useWalrusProtocol() {
  const { toast } = useToast();
  const [currentWallet, setCurrentWallet] = useState<WalrusWallet | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Connect wallet to Walrus protocol
  const connectToWurlusProtocolMutation = useMutation({
    mutationFn: async (walletAddress: string) => {
      const res = await apiRequest('POST', '/api/walrus/connect', { walletAddress });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.txHash) {
        setCurrentWallet({
          address: data.walletAddress || '',
          isRegistered: true
        });
        
        toast({
          title: 'Wallet Connected',
          description: 'Your wallet has been successfully connected to the Walrus protocol.',
          variant: 'default',
        });
        
        // Invalidate wallet registration status
        queryClient.invalidateQueries({ queryKey: ['/api/walrus/registration'] });
      }
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: 'Connection Failed',
        description: `Failed to connect wallet: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Check if wallet is registered
  const checkRegistrationStatus = (walletAddress?: string) => {
    return useQuery({
      queryKey: ['/api/walrus/registration', walletAddress],
      queryFn: async () => {
        if (!walletAddress) return { isRegistered: false, walletAddress: '' };
        
        const res = await apiRequest('GET', `/api/walrus/registration/${walletAddress}`);
        return await res.json();
      },
      enabled: !!walletAddress,
    });
  };
  
  // Place a bet
  const placeBetMutation = useMutation({
    mutationFn: async (params: {
      walletAddress: string;
      eventId: string | number;
      marketId: string | number;
      outcomeId: string | number;
      amount: number;
      tokenType: 'SUI' | 'SBETS';
    }) => {
      const res = await apiRequest('POST', '/api/walrus/bet', params);
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.txHash) {
        toast({
          title: 'Bet Placed',
          description: `Successfully placed bet of ${data.amount} ${data.tokenType}`,
          variant: 'default',
        });
        
        // Invalidate wallet bets
        if (currentWallet?.address) {
          queryClient.invalidateQueries({ queryKey: ['/api/walrus/bets', currentWallet.address] });
        }
      }
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: 'Bet Failed',
        description: `Failed to place bet: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Claim winnings
  const claimWinningsMutation = useMutation({
    mutationFn: async (params: { walletAddress: string; betId: string }) => {
      const res = await apiRequest('POST', '/api/walrus/claim-winnings', params);
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.txHash) {
        toast({
          title: 'Winnings Claimed',
          description: 'Successfully claimed winnings from bet',
          variant: 'default',
        });
        
        // Invalidate wallet bets and balances
        if (currentWallet?.address) {
          queryClient.invalidateQueries({ queryKey: ['/api/walrus/bets', currentWallet.address] });
          queryClient.invalidateQueries({ queryKey: ['/api/wallet', currentWallet.address, 'balance'] });
        }
      }
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: 'Claim Failed',
        description: `Failed to claim winnings: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Claim dividends
  const claimDividendsMutation = useMutation({
    mutationFn: async (walletAddress: string) => {
      const res = await apiRequest('POST', '/api/walrus/claim-dividends', { walletAddress });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.txHash) {
        toast({
          title: 'Dividends Claimed',
          description: 'Successfully claimed protocol dividends',
          variant: 'default',
        });
        
        // Invalidate wallet dividends and balances
        if (currentWallet?.address) {
          queryClient.invalidateQueries({ queryKey: ['/api/walrus/dividends', currentWallet.address] });
          queryClient.invalidateQueries({ queryKey: ['/api/wallet', currentWallet.address, 'balance'] });
        }
      }
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: 'Claim Failed',
        description: `Failed to claim dividends: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Stake tokens
  const stakeTokensMutation = useMutation({
    mutationFn: async (params: { walletAddress: string; amount: number; periodDays: number }) => {
      const res = await apiRequest('POST', '/api/walrus/stake', params);
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.txHash) {
        toast({
          title: 'Tokens Staked',
          description: `Successfully staked ${data.amount} SBETS for ${data.periodDays} days`,
          variant: 'default',
        });
        
        // Invalidate wallet balances
        if (currentWallet?.address) {
          queryClient.invalidateQueries({ queryKey: ['/api/wallet', currentWallet.address, 'balance'] });
        }
      }
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: 'Stake Failed',
        description: `Failed to stake tokens: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Get user bets
  const useWalletBets = (walletAddress?: string) => {
    return useQuery({
      queryKey: ['/api/walrus/bets', walletAddress],
      queryFn: async () => {
        if (!walletAddress) return { bets: [] };
        
        const res = await apiRequest('GET', `/api/walrus/bets/${walletAddress}`);
        return await res.json();
      },
      enabled: !!walletAddress,
    });
  };
  
  // Get user dividends
  const useWalletDividends = (walletAddress?: string) => {
    return useQuery({
      queryKey: ['/api/walrus/dividends', walletAddress],
      queryFn: async () => {
        if (!walletAddress) return { dividends: [] };
        
        const res = await apiRequest('GET', `/api/walrus/dividends/${walletAddress}`);
        return await res.json();
      },
      enabled: !!walletAddress,
    });
  };
  
  // Return all hooks and state
  return {
    // State
    currentWallet,
    error,
    
    // Mutations
    connectToWurlusProtocol: connectToWurlusProtocolMutation.mutateAsync,
    placeBet: placeBetMutation.mutateAsync,
    claimWinnings: claimWinningsMutation.mutateAsync,
    claimDividends: claimDividendsMutation.mutateAsync,
    stakeTokens: stakeTokensMutation.mutateAsync,
    
    // Query hooks
    checkRegistrationStatus,
    useWalletBets,
    useWalletDividends,
    
    // Loading states
    isConnecting: connectToWurlusProtocolMutation.isPending,
    isPlacingBet: placeBetMutation.isPending,
    isClaimingWinnings: claimWinningsMutation.isPending,
    isClaimingDividends: claimDividendsMutation.isPending,
    isStaking: stakeTokensMutation.isPending,
    
    // Reset error
    clearError: () => setError(null)
  };
}