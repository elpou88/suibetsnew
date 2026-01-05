import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Wallet } from 'lucide-react';
import { CopyButton } from '../ui/copy-button';

/**
 * Clean implementation of the SUI wallet connector component
 * This handles the wallet connection flow for different wallet types
 */
const SuiWalletConnector: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [walletStatus, setWalletStatus] = useState<{
    authenticated: boolean;
    address?: string;
    walletType?: string;
    message?: string;
  }>({
    authenticated: false,
    message: 'No wallet connected'
  });
  const [availableWallets, setAvailableWallets] = useState<{
    walletStandard: boolean;
    suiWallet: boolean;
    ethosWallet: boolean;
    suietWallet: boolean;
    martianWallet: boolean;
  }>({
    walletStandard: false,
    suiWallet: false,
    ethosWallet: false,
    suietWallet: false,
    martianWallet: false
  });
  
  const { toast } = useToast();
  
  // Check wallet connection status on mount
  useEffect(() => {
    checkWalletConnection();
    detectWallets();
  }, []);
  
  // Check if wallet is already connected
  const checkWalletConnection = async () => {
    try {
      setIsLoading(true);
      
      const response = await apiRequest('GET', '/api/auth/wallet-status', undefined, {
        timeout: 10000 // 10 second timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Wallet status:', data);
        setWalletStatus(data);
      } else {
        console.warn('Failed to check wallet status:', response.status);
        setWalletStatus({
          authenticated: false,
          message: 'No wallet connected'
        });
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
      setWalletStatus({
        authenticated: false,
        message: 'Error checking wallet status'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Detect available wallets
  const detectWallets = () => {
    // Check for wallet standard
    const hasWalletStandard = 'wallet' in window && 'sui' in (window as any);
    
    // Check for specific wallet providers
    const hasSuiWallet = 'suiWallet' in window;
    const hasEthosWallet = 'ethosWallet' in window;
    const hasSuietWallet = 'suietWallet' in window;
    const hasMartianWallet = 'martianWallet' in window;
    
    console.log('Wallet detection:', {
      walletStandard: hasWalletStandard,
      suiWallet: hasSuiWallet,
      ethosWallet: hasEthosWallet,
      suietWallet: hasSuietWallet,
      martianWallet: hasMartianWallet
    });
    
    setAvailableWallets({
      walletStandard: hasWalletStandard,
      suiWallet: hasSuiWallet,
      ethosWallet: hasEthosWallet,
      suietWallet: hasSuietWallet,
      martianWallet: hasMartianWallet
    });
  };
  
  // Connect wallet function
  const connectWallet = async (walletType: string) => {
    try {
      setIsLoading(true);
      
      // Different connection logic based on wallet type
      let walletAddress: string | null = null;
      
      switch (walletType) {
        case 'sui':
          // Standard wallet connection flow
          if (availableWallets.walletStandard) {
            walletAddress = await connectStandardWallet();
          } else if (availableWallets.suiWallet) {
            walletAddress = await connectSuiWallet();
          } else {
            toast({
              title: 'Sui Wallet Not Detected',
              description: 'Please install Sui Wallet extension',
              variant: 'destructive'
            });
            return;
          }
          break;
          
        case 'ethos':
          if (!availableWallets.ethosWallet) {
            toast({
              title: 'Ethos Wallet Not Detected',
              description: 'Please install Ethos Wallet extension',
              variant: 'destructive'
            });
            return;
          }
          walletAddress = await connectEthosWallet();
          break;
          
        case 'suiet':
          if (!availableWallets.suietWallet) {
            toast({
              title: 'Suiet Wallet Not Detected',
              description: 'Please install Suiet Wallet extension',
              variant: 'destructive'
            });
            return;
          }
          walletAddress = await connectSuietWallet();
          break;
          
        case 'martian':
          if (!availableWallets.martianWallet) {
            toast({
              title: 'Martian Wallet Not Detected',
              description: 'Please install Martian Wallet extension',
              variant: 'destructive'
            });
            return;
          }
          walletAddress = await connectMartianWallet();
          break;
          
        default:
          toast({
            title: 'Unsupported Wallet',
            description: `Wallet type ${walletType} is not supported`,
            variant: 'destructive'
          });
          return;
      }
      
      if (!walletAddress) {
        toast({
          title: 'Connection Failed',
          description: 'Failed to connect wallet',
          variant: 'destructive'
        });
        return;
      }
      
      // Send wallet address to server
      const response = await apiRequest('POST', '/api/auth/wallet-connect', {
        walletAddress,
        walletType
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Wallet connected:', data);
        setWalletStatus({
          authenticated: true,
          address: walletAddress,
          walletType,
          message: 'Wallet connected'
        });
        
        toast({
          title: 'Wallet Connected',
          description: `Connected ${walletType} wallet successfully`,
        });
      } else {
        console.error('Failed to connect wallet:', response.status);
        toast({
          title: 'Connection Failed',
          description: 'Failed to connect wallet to the server',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast({
        title: 'Connection Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Disconnect wallet function
  const disconnectWallet = async () => {
    try {
      setIsLoading(true);
      
      const response = await apiRequest('POST', '/api/auth/wallet-disconnect');
      
      if (response.ok) {
        setWalletStatus({
          authenticated: false,
          message: 'Wallet disconnected'
        });
        
        toast({
          title: 'Wallet Disconnected',
          description: 'Your wallet has been disconnected',
        });
      } else {
        console.error('Failed to disconnect wallet:', response.status);
        toast({
          title: 'Disconnect Failed',
          description: 'Failed to disconnect wallet',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      toast({
        title: 'Disconnect Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Wallet-specific connection methods
  const connectStandardWallet = async (): Promise<string | null> => {
    try {
      // This is simplified but represents the standard wallet API
      const wallet = (window as any).wallet;
      const response = await wallet.sui.connect();
      return response.accounts[0];
    } catch (error) {
      console.error('Error connecting standard wallet:', error);
      return null;
    }
  };
  
  const connectSuiWallet = async (): Promise<string | null> => {
    try {
      const sui = (window as any).suiWallet;
      const response = await sui.connect();
      return response.accounts[0];
    } catch (error) {
      console.error('Error connecting Sui wallet:', error);
      return null;
    }
  };
  
  const connectEthosWallet = async (): Promise<string | null> => {
    try {
      const ethos = (window as any).ethosWallet;
      const response = await ethos.connect();
      return response.accounts[0];
    } catch (error) {
      console.error('Error connecting Ethos wallet:', error);
      return null;
    }
  };
  
  const connectSuietWallet = async (): Promise<string | null> => {
    try {
      const suiet = (window as any).suietWallet;
      const response = await suiet.connect();
      return response.accounts[0];
    } catch (error) {
      console.error('Error connecting Suiet wallet:', error);
      return null;
    }
  };
  
  const connectMartianWallet = async (): Promise<string | null> => {
    try {
      const martian = (window as any).martianWallet;
      const response = await martian.connect();
      return response.accounts[0];
    } catch (error) {
      console.error('Error connecting Martian wallet:', error);
      return null;
    }
  };
  
  // Render the wallet button or connected status
  return (
    <div className="flex items-center space-x-2">
      {isLoading ? (
        <Button disabled size="sm" className="h-8">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </Button>
      ) : walletStatus.authenticated ? (
        <div className="flex items-center gap-2">
          <div className="hidden md:flex text-xs bg-[#1e3a3f] text-[#00ffff] px-2 py-1 rounded-md">
            {walletStatus.address && (
              <div className="flex items-center">
                <span className="overflow-hidden text-ellipsis max-w-[100px]">
                  {walletStatus.address.substring(0, 6)}...{walletStatus.address.substring(walletStatus.address.length - 4)}
                </span>
                <CopyButton 
                  value={walletStatus.address} 
                  className="ml-1" 
                  size="icon" 
                  variant="ghost"
                  onCopy={() => {
                    toast({
                      title: "Address Copied",
                      description: "Wallet address copied to clipboard",
                    });
                  }}
                />
              </div>
            )}
          </div>
          <Button 
            size="sm" 
            variant="destructive" 
            className="h-8 bg-[#1e3a3f] text-[#00ffff] hover:bg-[#112225] hover:text-white"
            onClick={disconnectWallet}
          >
            Disconnect
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          className="h-8 bg-[#00ffff] text-black hover:bg-[#00aaaa]"
          onClick={() => connectWallet('sui')}
        >
          <Wallet className="mr-2 h-4 w-4" />
          Connect
        </Button>
      )}
    </div>
  );
};

export default SuiWalletConnector;