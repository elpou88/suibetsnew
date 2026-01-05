import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useCurrentAccount } from '@mysten/dapp-kit';

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
        queryClient.invalidateQueries({ queryKey: ['/api/auth/wallet-status'] });
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

function useDisconnectWalletMutation() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/auth/wallet-disconnect');
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['/api/auth/wallet-status'] });
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

function useCheckWalletStatusQuery() {
  return useQuery({
    queryKey: ['/api/auth/wallet-status'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/auth/wallet-status');
      return await res.json();
    },
    staleTime: 60000,
    refetchOnWindowFocus: true,
  });
}

function useProfileQuery() {
  return useQuery({
    queryKey: ['/api/auth/profile'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/auth/profile');
        return await res.json();
      } catch (error) {
        return { success: false, profile: null };
      }
    },
    staleTime: 60000,
    retry: false,
  });
}

const BlockchainAuthContext = createContext<BlockchainAuthContextType | null>(null);

export function BlockchainAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<BlockchainAuthUser | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // Use dapp-kit instead of suiet/wallet-kit
  const currentAccount = useCurrentAccount();
  
  const checkWalletStatusQuery = useCheckWalletStatusQuery();
  const { data: walletStatusData, isLoading: isCheckingWalletStatus } = checkWalletStatusQuery;
  
  const { data: profileData, isLoading: isLoadingProfile } = useProfileQuery();
  
  const connectWalletMutation = useConnectWalletMutation();
  const disconnectWalletMutation = useDisconnectWalletMutation();
  
  // Handle dapp-kit wallet connection
  useEffect(() => {
    if (currentAccount?.address) {
      console.log('[BlockchainAuth] dapp-kit wallet connected:', currentAccount.address);
      connectWalletMutation.mutate({
        walletAddress: currentAccount.address,
        walletType: 'sui-dapp-kit'
      });
    }
  }, [currentAccount?.address]);
  
  useEffect(() => {
    if (connectWalletMutation.isError) {
      console.error('[BlockchainAuth] Wallet connection error:', connectWalletMutation.error);
    }
    
    if (walletStatusData) {
      console.log('[BlockchainAuth] Wallet status:', walletStatusData);
    }
  }, [connectWalletMutation.isError, connectWalletMutation.error, walletStatusData]);
  
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
  
  const isLoading = isCheckingWalletStatus || isLoadingProfile || connectWalletMutation.isPending;
  
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

export function useBlockchainAuth() {
  const context = useContext(BlockchainAuthContext);
  
  if (!context) {
    throw new Error('useBlockchainAuth must be used within a BlockchainAuthProvider');
  }
  
  return context;
}
