import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@suiet/wallet-kit';

export interface BlockchainAuthUser {
  walletAddress: string;
  walletType: string;
  username: string;
  balance?: number;
  suiBalance?: number;
  sbetsBalance?: number;
  authenticated: boolean;
}

interface BlockchainAuthContextType {
  user: BlockchainAuthUser | null;
  isLoading: boolean;
  error: Error | null;
  connectWalletMutation: ReturnType<typeof useConnectWalletMutation>;
  disconnectWalletMutation: ReturnType<typeof useDisconnectWalletMutation>;
  checkWalletStatusQuery: ReturnType<typeof useCheckWalletStatusQuery>;
}

// Create a custom hook for connecting a wallet
function useConnectWalletMutation() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: { 
      walletAddress: string;
      walletType?: string;
      signature?: string;
      message?: string;
    }) => {
      const res = await apiRequest('POST', '/api/auth/wallet-connect', data);
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        // Invalidate wallet status query
        queryClient.invalidateQueries({ queryKey: ['/api/auth/wallet-status'] });
        // Invalidate profile query
        queryClient.invalidateQueries({ queryKey: ['/api/auth/profile'] });
        
        toast({
          title: 'Wallet Connected',
          description: `Successfully connected wallet to the blockchain.`,
          variant: 'default',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Connection Failed',
        description: `Failed to connect wallet: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
}

// Create a custom hook for disconnecting a wallet
function useDisconnectWalletMutation() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/auth/wallet-disconnect');
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        // Invalidate wallet status query
        queryClient.invalidateQueries({ queryKey: ['/api/auth/wallet-status'] });
        // Invalidate profile query
        queryClient.invalidateQueries({ queryKey: ['/api/auth/profile'] });
        
        toast({
          title: 'Wallet Disconnected',
          description: 'Your wallet has been disconnected.',
          variant: 'default',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Disconnection Failed',
        description: `Failed to disconnect wallet: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
}

// Create a custom hook for checking wallet status
function useCheckWalletStatusQuery() {
  return useQuery({
    queryKey: ['/api/auth/wallet-status'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/auth/wallet-status');
      return await res.json();
    },
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: true,
  });
}

// Create a custom hook for getting user profile
function useProfileQuery() {
  return useQuery({
    queryKey: ['/api/auth/profile'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/auth/profile');
        return await res.json();
      } catch (error) {
        // If unauthorized, return null profile
        return { success: false, profile: null };
      }
    },
    staleTime: 60000, // 1 minute
    retry: false, // Don't retry if unauthorized
  });
}

// Create the blockchain auth context
const BlockchainAuthContext = createContext<BlockchainAuthContextType | null>(null);

// Create the blockchain auth provider
export function BlockchainAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<BlockchainAuthUser | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // Get Suiet wallet state
  const suietWallet = useWallet();
  
  // Get wallet status
  const checkWalletStatusQuery = useCheckWalletStatusQuery();
  const { data: walletStatusData, isLoading: isCheckingWalletStatus } = checkWalletStatusQuery;
  
  // Get user profile
  const { data: profileData, isLoading: isLoadingProfile } = useProfileQuery();
  
  // Create mutations
  const connectWalletMutation = useConnectWalletMutation();
  const disconnectWalletMutation = useDisconnectWalletMutation();
  
  // Effect to handle Suiet wallet connection
  useEffect(() => {
    if (suietWallet.connected && suietWallet.address) {
      console.log('Suiet wallet connected:', suietWallet.address);
      // Connect the wallet to our blockchain authentication system
      connectWalletMutation.mutate({
        walletAddress: suietWallet.address,
        walletType: 'Suiet'
      });
    }
  }, [suietWallet.connected, suietWallet.address]);
  
  // Add additional debug info for wallet connection issues
  useEffect(() => {
    if (connectWalletMutation.isError) {
      console.error('Wallet connection error:', connectWalletMutation.error);
    }
    
    if (walletStatusData) {
      console.log('Wallet status:', walletStatusData);
    }
  }, [connectWalletMutation.isError, connectWalletMutation.error, walletStatusData]);
  
  // Effect to update user state
  useEffect(() => {
    if (walletStatusData?.authenticated && profileData?.success && profileData?.profile) {
      setUser({
        ...profileData.profile,
        authenticated: true
      });
    } else if (walletStatusData?.authenticated) {
      setUser({
        walletAddress: walletStatusData.walletAddress,
        walletType: walletStatusData.walletType,
        username: `user_${walletStatusData.walletAddress.substring(0, 6)}`,
        authenticated: true
      });
    } else {
      setUser(null);
    }
  }, [walletStatusData, profileData]);
  
  // Combine loading states
  const isLoading = isCheckingWalletStatus || isLoadingProfile || connectWalletMutation.isPending;
  
  // Provide context value
  const contextValue: BlockchainAuthContextType = {
    user,
    isLoading,
    error,
    connectWalletMutation,
    disconnectWalletMutation,
    checkWalletStatusQuery
  };
  
  return (
    <BlockchainAuthContext.Provider value={contextValue}>
      {children}
    </BlockchainAuthContext.Provider>
  );
}

// Create the hook for using blockchain auth
export function useBlockchainAuth() {
  const context = useContext(BlockchainAuthContext);
  
  if (!context) {
    throw new Error('useBlockchainAuth must be used within a BlockchainAuthProvider');
  }
  
  return context;
}