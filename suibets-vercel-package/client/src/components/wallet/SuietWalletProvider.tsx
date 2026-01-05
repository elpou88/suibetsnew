import React, { ReactNode, useEffect, useState } from 'react';
import { WalletProvider, AllDefaultWallets } from '@suiet/wallet-kit';
import '@suiet/wallet-kit/style.css';
import { useToast } from '@/hooks/use-toast';

interface SuietWalletProviderProps {
  children: ReactNode;
}

export const SuietWalletProvider = ({ children }: SuietWalletProviderProps) => {
  const { toast } = useToast();
  const [hasWalletExtension, setHasWalletExtension] = useState(false);
  
  // Log wallet detection information during initialization
  useEffect(() => {
    // Check if window.suiWallet exists (Sui Wallet)
    const hasSuiWallet = typeof window !== 'undefined' && 'suiWallet' in window;
    
    // Check for other common wallet objects
    const hasEthosWallet = typeof window !== 'undefined' && 'ethosWallet' in window;
    const hasSuietWallet = typeof window !== 'undefined' && 'suiet' in window;
    const hasMartianWallet = typeof window !== 'undefined' && 'martian' in window;
    
    // Set state if any wallet extension is found
    const hasAnyWallet = hasSuiWallet || hasEthosWallet || hasSuietWallet || hasMartianWallet;
    setHasWalletExtension(hasAnyWallet);
    
    console.log('Wallet detection on initialization:', {
      hasSuiWallet,
      hasEthosWallet,
      hasSuietWallet,
      hasMartianWallet
    });
    
    // Detect wallet-standard adapters
    try {
      if (typeof window !== 'undefined') {
        // @ts-ignore
        const hasWalletStandard = !!window.wallet;
        console.log('Wallet Standard support available:', hasWalletStandard);
        
        // @ts-ignore
        if (window.wallet) {
          // @ts-ignore
          const walletCount = window.wallet.getWallets().length;
          console.log('Available wallet adapters:', walletCount);
          
          if (walletCount > 0) {
            setHasWalletExtension(true);
          }
        }
      }
    } catch (error) {
      console.error('Error detecting wallet-standard:', error);
    }
  }, []);

  // Custom configuration for better wallet support
  const walletConfiguration = {
    enableUnsafeBurner: false, // Disable the unsafe burner wallet
    autoConnect: false, // We'll handle connection manually for better UX
    wallets: AllDefaultWallets,
  };

  // Set up error handler separately to avoid typechecking issues
  useEffect(() => {
    const handleWalletError = (error: Error) => {
      console.error('Wallet error:', error);
      toast({
        title: 'Wallet Connection Error',
        description: error.message || 'Failed to connect to wallet',
        variant: 'destructive',
      });
    };
    
    // Listen for wallet errors
    window.addEventListener('wallet-error', (e: any) => {
      if (e.detail?.error) {
        handleWalletError(e.detail.error);
      }
    });
    
    return () => {
      window.removeEventListener('wallet-error', handleWalletError as any);
    };
  }, [toast]);

  return (
    <WalletProvider
      defaultWallets={AllDefaultWallets}
      autoConnect={false}
    >
      {children}
    </WalletProvider>
  );
};

export default SuietWalletProvider;