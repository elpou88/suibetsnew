import React, { createContext, useContext, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { getWallets, type Wallet } from '@wallet-standard/core';

// Define types for wallet balances and state
export type TokenBalances = {
  SUI: number;
  SBETS: number;
};

export type WalletContextType = {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  sendSui: (recipient: string, amount: number) => Promise<string>;
  sendSbets: (recipient: string, amount: number) => Promise<string>;
  stake: (amount: number) => Promise<string>;
  unstake: (amount: number) => Promise<string>;
  claimDividends: () => Promise<string>;
  updateConnectionState: (walletAddress: string, walletType?: string) => Promise<void>;
  address: string | null;
  isConnected: boolean;
  balances: TokenBalances;
  isLoading: boolean;
  error: string | null;
};

// Create the context with default values
const WalletContext = createContext<WalletContextType>({
  connect: async () => false,
  disconnect: () => {},
  sendSui: async () => '',
  sendSbets: async () => '',
  stake: async () => '',
  unstake: async () => '',
  claimDividends: async () => '',
  updateConnectionState: async () => {},
  address: null,
  isConnected: false,
  balances: { SUI: 0, SBETS: 0 },
  isLoading: false,
  error: null,
});

// Provider component that wraps the app
export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  // For a real implementation, we would use a proper Sui wallet adapter
  // For now, we'll provide a simulated implementation
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState<{address: string} | null>(null);
  
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState<TokenBalances>({ SUI: 0, SBETS: 0 });

  // Utility function to update connection state consistently
  const updateConnectionState = async (walletAddress: string, walletType: string = 'sui') => {
    // Set local state
    setAccount({ address: walletAddress });
    setAddress(walletAddress);
    setConnected(true);
    setIsConnected(true);
    
    // Save wallet address in localStorage for reconnection
    localStorage.setItem('wallet_address', walletAddress);
    localStorage.setItem('wallet_type', walletType);
    
    // Connect wallet on server if not already connected
    if (!isConnected) {
      try {
        // First register the wallet with the server
        const response = await apiRequest('POST', '/api/wallet/connect', {
          address: walletAddress,
          walletType: walletType
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('Wallet registered with server:', userData);
          
          // Create user account if it doesn't exist
          if (!userData.id) {
            const userResponse = await apiRequest('POST', '/api/users', {
              username: `user_${walletAddress.substring(0, 8)}`,
              walletAddress: walletAddress,
              walletType: walletType
            });
            
            if (userResponse.ok) {
              console.log('User account created for wallet');
            }
          }
        } else {
          console.error('Failed to register wallet with server:', response.status);
        }
      } catch (error) {
        console.error('Error connecting wallet to server:', error);
      }
    }
  };
  
  // Fetch wallet balances when connected
  const { data: balanceData, isLoading: isBalanceLoading, refetch: refetchBalance } = useQuery({
    queryKey: ['wallet-balance', address],
    queryFn: async () => {
      if (!address) return { sui: 0, sbets: 0 };
      
      try {
        const response = await apiRequest('GET', `/api/wallet/${address}/balance`);
        return await response.json();
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
        return { sui: 0, sbets: 0 };
      }
    },
    enabled: !!address && isConnected,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Update balances when data changes
  useEffect(() => {
    if (balanceData) {
      setBalances({
        SUI: balanceData.sui,
        SBETS: balanceData.sbets,
      });
    }
  }, [balanceData]);

  // Mutation for connecting wallet to server
  const connectMutation = useMutation({
    mutationFn: async (walletAddress: string) => {
      const response = await apiRequest('POST', '/api/wallet/connect', {
        walletAddress,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data && data.success) {
        setIsConnected(true);
        toast({
          title: 'Wallet Connected',
          description: `Connected to ${address?.substring(0, 8)}...${address?.substring(address.length - 4)}`,
        });
        refetchBalance();
      } else {
        setIsConnected(false);
        setError('Failed to connect wallet on server');
        toast({
          title: 'Connection Failed',
          description: 'Failed to connect wallet on server',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      setIsConnected(false);
      setError(error.message || 'Failed to connect wallet');
      toast({
        title: 'Connection Error',
        description: error.message || 'Failed to connect wallet',
        variant: 'destructive',
      });
    },
  });

  // Connect to wallet
  const connect = async (): Promise<boolean> => {
    try {
      setError(null);
      setConnecting(true);
      
      console.log('Starting wallet connection process in WalletAdapter...');
      
      // Real wallet mode is the only option - no mock wallets
      
      try {
        // First, try wallet connection using the wallet-standard
        console.log('Trying wallet connection with wallet-standard');
        
        // Get all available wallet adapters
        const walletAdapters = getWallets().get();
        console.log('Available wallet adapters found:', walletAdapters.length);
        walletAdapters.forEach(wallet => {
          console.log(`Wallet: ${wallet.name}, Features:`, Object.keys(wallet.features).join(', '));
        });
        
        // Find ALL available Sui wallets - using a more inclusive filter
        const suiWallets = walletAdapters.filter(wallet => 
          wallet.features['sui:chains'] || 
          // Check for wallet-specific features safely
          (Object.keys(wallet.features).some(key => key.includes('sui'))) ||
          (wallet.name && (
            wallet.name.toLowerCase().includes('sui') ||
            wallet.name.toLowerCase().includes('ethos') ||
            wallet.name.toLowerCase().includes('martian')
          ))
        );
        
        console.log(`Found ${suiWallets.length} Sui-compatible wallets:`, 
          suiWallets.map(w => w.name).join(', '));
        
        // Try ALL available Sui wallets one by one
        for (const wallet of suiWallets) {
          console.log(`Attempting to connect to ${wallet.name}...`);
          
          // Try standard:connect feature
          if (wallet.features['standard:connect']) {
            try {
              console.log(`Using standard:connect feature for ${wallet.name}`);
              // @ts-ignore - TypeScript error with 'connect' property
              const connectFeature = wallet.features['standard:connect'];
              // @ts-ignore - TypeScript error with 'connect' method
              const connectResult = await connectFeature.connect();
              
              if (connectResult && connectResult.accounts && connectResult.accounts.length > 0) {
                const account = connectResult.accounts[0];
                const walletAddress = account.address;
                
                console.log('Successfully connected to wallet address:', walletAddress);
                
                // Update connection state
                await updateConnectionState(walletAddress, 'sui');
                
                toast({
                  title: 'Wallet Connected',
                  description: `Connected to ${wallet.name}`,
                });
                
                setConnecting(false);
                return true;
              }
            } catch (e) {
              console.error(`Standard connect error for ${wallet.name}:`, e);
              // Continue to next method or wallet
            }
          }
          
          // Try sui:connect feature
          if (wallet.features['sui:connect']) {
            try {
              console.log(`Using sui:connect feature for ${wallet.name}`);
              // @ts-ignore - TypeScript error with property 
              const suiConnectFeature = wallet.features['sui:connect'];
              // @ts-ignore - TypeScript error with method
              const suiConnectResult = await suiConnectFeature.connect();
              
              if (suiConnectResult && suiConnectResult.accounts && suiConnectResult.accounts.length > 0) {
                const account = suiConnectResult.accounts[0];
                const walletAddress = account.address;
                
                console.log('Successfully connected to wallet address:', walletAddress);
                
                // Update connection state
                await updateConnectionState(walletAddress, 'sui');
                
                toast({
                  title: 'Wallet Connected',
                  description: `Connected to ${wallet.name}`,
                });
                
                setConnecting(false);
                return true;
              }
            } catch (e) {
              console.error('Sui connect error:', e);
            }
          }
        }
        
        // Try additional wallet connection methods
        
        // 1. Try legacy Sui wallet API
        try {
          // @ts-ignore - suiWallet may be injected
          if (typeof window.suiWallet !== 'undefined') {
            console.log('Trying legacy Sui wallet connection...');
            // @ts-ignore - suiWallet is injected
            const response = await window.suiWallet.requestPermissions();
            if (response && response.status === 'success') {
              // @ts-ignore - suiWallet is injected
              const accounts = await window.suiWallet.getAccounts();
              if (accounts && accounts.length > 0) {
                const walletAddress = accounts[0];
                
                console.log('Connected to legacy wallet:', walletAddress);
                
                // Update connection state
                await updateConnectionState(walletAddress, 'sui');
                
                toast({
                  title: 'Wallet Connected',
                  description: 'Connected using legacy method',
                });
                
                setConnecting(false);
                return true;
              }
            }
          }
        } catch (e) {
          console.error('Legacy Sui wallet error:', e);
        }
        
        // 2. Try Ethos wallet
        try {
          // @ts-ignore
          if (typeof window.ethos !== 'undefined') {
            console.log('Trying Ethos wallet connection...');
            // @ts-ignore
            const response = await window.ethos.connect();
            if (response && response.address) {
              const walletAddress = response.address;
              
              console.log('Connected to Ethos wallet:', walletAddress);
              
              // Update connection state
              await updateConnectionState(walletAddress, 'sui');
              
              toast({
                title: 'Wallet Connected',
                description: 'Connected to Ethos Wallet',
              });
              
              setConnecting(false);
              return true;
            }
          }
        } catch (e) {
          console.error('Ethos wallet error:', e);
        }
        
        // 3. Try Suiet wallet
        try {
          // @ts-ignore
          if (typeof window.suiet !== 'undefined') {
            console.log('Trying Suiet wallet connection...');
            // @ts-ignore
            const response = await window.suiet.connect();
            if (response && response.accounts && response.accounts.length > 0) {
              const walletAddress = response.accounts[0].address;
              
              console.log('Connected to Suiet wallet:', walletAddress);
              
              // Update connection state
              await updateConnectionState(walletAddress, 'sui');
              
              toast({
                title: 'Wallet Connected',
                description: 'Connected to Suiet Wallet',
              });
              
              setConnecting(false);
              return true;
            }
          }
        } catch (e) {
          console.error('Suiet wallet error:', e);
        }
        
        // 4. Try Glass wallet
        try {
          // @ts-ignore
          if (typeof window.glass !== 'undefined') {
            console.log('Trying Glass wallet connection...');
            // @ts-ignore
            const response = await window.glass.connect();
            if (response && response.accounts && response.accounts.length > 0) {
              const walletAddress = response.accounts[0];
              
              console.log('Connected to Glass wallet:', walletAddress);
              
              // Update connection state
              await updateConnectionState(walletAddress, 'sui');
              
              toast({
                title: 'Wallet Connected',
                description: 'Connected to Glass Wallet',
              });
              
              setConnecting(false);
              return true;
            }
          }
        } catch (e) {
          console.error('Glass wallet error:', e);
        }
        
        // 5. Try Martian wallet
        try {
          // @ts-ignore
          if (typeof window.martian !== 'undefined') {
            console.log('Trying Martian wallet connection...');
            // @ts-ignore
            const response = await window.martian.sui.connect();
            if (response && response.address) {
              const walletAddress = response.address;
              
              console.log('Connected to Martian wallet:', walletAddress);
              
              // Update connection state
              await updateConnectionState(walletAddress, 'sui');
              
              toast({
                title: 'Wallet Connected',
                description: 'Connected to Martian Wallet',
              });
              
              setConnecting(false);
              return true;
            }
          }
        } catch (e) {
          console.error('Martian wallet error:', e);
        }
      } catch (error) {
        console.error('Error connecting to wallet:', error);
      }
      
      // If we get here, we had trouble connecting to the wallet
      console.log('Connection attempts unsuccessful - checking if this is a wallet access issue');
      
      // Check if window.walletStandard exists - different approach to detection
      // @ts-ignore - Dynamic property check
      const hasWalletStandard = typeof window.walletStandard !== 'undefined';
      // @ts-ignore - Dynamic property check
      const hasWalletExtension = typeof window.suiWallet !== 'undefined';
      
      if (hasWalletStandard || hasWalletExtension) {
        // We likely have a wallet but couldn't connect - might be a permissions issue
        console.log('Wallet API detected but couldn\'t connect - might be a permissions issue');
        
        toast({
          title: 'Wallet Connection Failed',
          description: 'We detected a wallet but couldn\'t connect to it. Please check your wallet settings and try again.',
          variant: 'destructive',
        });
        
        setError('Connection to wallet failed. Please make sure your wallet is unlocked and try again.');
      } else {
        // No wallet detected - give installation guidance
        console.log('No wallet detected - providing installation guidance');
        
        // Provide more detailed error based on device and browser
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const browser = navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                       navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                       navigator.userAgent.includes('Safari') ? 'Safari' : 'your browser';
        
        let title = '';
        let description = '';
        
        if (isMobile) {
          // Mobile device guidance
          title = 'No Sui Mobile Wallet Detected';
          description = 'Please install a Sui-compatible mobile wallet to connect to our platform.';
        } else {
          // Desktop guidance
          title = 'No Sui Wallet Extension Detected';
          description = `Please install a Sui wallet extension for ${browser} to connect to the platform.`;
        }
        
        setError('Wallet connection failed. If you have a wallet installed, make sure it\'s unlocked.');
        
        toast({
          title,
          description,
          variant: 'destructive',
        });
      }
      
      setConnecting(false);
      return false;
    } catch (error: any) {
      console.error('Connection error:', error);
      setConnecting(false);
      setError(error.message || 'Failed to connect wallet');
      toast({
        title: 'Connection Error',
        description: error.message || 'Failed to connect wallet',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Disconnect wallet
  const disconnect = () => {
    setAccount(null);
    setAddress(null);
    setConnected(false);
    setIsConnected(false);
    
    // Clear localStorage
    localStorage.removeItem('wallet_address');
    localStorage.removeItem('wallet_type');
    
    toast({
      title: 'Wallet Disconnected',
      description: 'Your wallet has been disconnected',
    });
  };

  // Send SUI tokens
  const sendSui = async (recipient: string, amount: number): Promise<string> => {
    try {
      if (!address || !isConnected) {
        throw new Error('Wallet not connected');
      }
      
      const response = await apiRequest('POST', '/api/wallet/transfer/sui', {
        sender: address,
        recipient,
        amount,
      });
      
      const result = await response.json();
      
      toast({
        title: 'SUI Sent',
        description: `${amount} SUI sent to ${recipient.substring(0, 8)}...`,
      });
      
      // Refresh balance after transaction
      refetchBalance();
      
      return result.txHash;
    } catch (error: any) {
      toast({
        title: 'Transfer Failed',
        description: error.message || 'Failed to send SUI',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Send SBETS tokens
  const sendSbets = async (recipient: string, amount: number): Promise<string> => {
    try {
      if (!address || !isConnected) {
        throw new Error('Wallet not connected');
      }
      
      const response = await apiRequest('POST', '/api/wallet/transfer/sbets', {
        sender: address,
        recipient,
        amount,
      });
      
      const result = await response.json();
      
      toast({
        title: 'SBETS Sent',
        description: `${amount} SBETS sent to ${recipient.substring(0, 8)}...`,
      });
      
      // Refresh balance after transaction
      refetchBalance();
      
      return result.txHash;
    } catch (error: any) {
      toast({
        title: 'Transfer Failed',
        description: error.message || 'Failed to send SBETS',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Stake SBETS tokens
  const stake = async (amount: number): Promise<string> => {
    try {
      if (!address || !isConnected) {
        throw new Error('Wallet not connected');
      }
      
      const response = await apiRequest('POST', '/api/wurlus/stake', {
        walletAddress: address,
        amount,
      });
      
      const result = await response.json();
      
      toast({
        title: 'Tokens Staked',
        description: `${amount} SBETS staked successfully`,
      });
      
      // Refresh balance after transaction
      refetchBalance();
      
      return result.txHash;
    } catch (error: any) {
      toast({
        title: 'Staking Failed',
        description: error.message || 'Failed to stake tokens',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Unstake SBETS tokens
  const unstake = async (amount: number): Promise<string> => {
    try {
      if (!address || !isConnected) {
        throw new Error('Wallet not connected');
      }
      
      const response = await apiRequest('POST', '/api/wurlus/unstake', {
        walletAddress: address,
        amount,
      });
      
      const result = await response.json();
      
      toast({
        title: 'Tokens Unstaked',
        description: `${amount} SBETS unstaked successfully`,
      });
      
      // Refresh balance after transaction
      refetchBalance();
      
      return result.txHash;
    } catch (error: any) {
      toast({
        title: 'Unstaking Failed',
        description: error.message || 'Failed to unstake tokens',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Claim dividends
  const claimDividends = async (): Promise<string> => {
    try {
      if (!address || !isConnected) {
        throw new Error('Wallet not connected');
      }
      
      const response = await apiRequest('POST', '/api/wurlus/claim-dividends', {
        walletAddress: address,
      });
      
      const result = await response.json();
      
      toast({
        title: 'Dividends Claimed',
        description: 'Dividends claimed successfully',
      });
      
      // Refresh balance after transaction
      refetchBalance();
      
      return result.txHash;
    } catch (error: any) {
      toast({
        title: 'Claim Failed',
        description: error.message || 'Failed to claim dividends',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Sync with wallet connection status and check saved wallet on mount
  useEffect(() => {
    if (connected && account?.address) {
      updateConnectionState(account.address);
    }
    
    // Check for saved wallet on mount
    const checkSavedWallet = async () => {
      const savedAddress = localStorage.getItem('wallet_address');
      if (savedAddress && !isConnected && !address) {
        console.log('Found saved wallet, reconnecting:', savedAddress);
        updateConnectionState(savedAddress);
      }
    };
    
    checkSavedWallet();
  }, [connected, account]);

  return (
    <WalletContext.Provider
      value={{
        connect,
        disconnect,
        sendSui,
        sendSbets,
        stake,
        unstake,
        claimDividends,
        updateConnectionState,
        address,
        isConnected,
        balances,
        isLoading: connecting || connectMutation.isPending || isBalanceLoading,
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

// Custom hook to use the wallet context
// Export the hook to use the wallet context
export const useWalletAdapter = () => useContext(WalletContext);