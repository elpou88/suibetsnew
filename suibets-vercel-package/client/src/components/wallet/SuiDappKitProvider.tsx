import { ReactNode, useEffect } from 'react';
import { getFullnodeUrl } from '@mysten/sui.js/client';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { useToast } from '@/hooks/use-toast';

// Define supported networks
const networks = {
  mainnet: { url: getFullnodeUrl('mainnet') },
  testnet: { url: getFullnodeUrl('testnet') },
  devnet: { url: getFullnodeUrl('devnet') },
  localnet: { url: getFullnodeUrl('localnet') }
};

// Get current network from environment or config (defaults to testnet)
const getNetworkName = (): 'mainnet' | 'testnet' | 'devnet' | 'localnet' => {
  const network = import.meta.env.VITE_SUI_NETWORK as string || 'testnet';
  return network as 'mainnet' | 'testnet' | 'devnet' | 'localnet';
};

interface SuiDappKitProviderProps {
  children: ReactNode;
}

export const SuiDappKitProvider = ({ children }: SuiDappKitProviderProps) => {
  const networkName = getNetworkName();
  const { toast } = useToast();
  
  // Ensure wallet connect from Mysten repository is enabled
  useEffect(() => {
    // Log wallet detection information
    const detectWallets = () => {
      // @ts-ignore - Checking for global objects
      const hasSuiWallet = typeof window.suiWallet !== 'undefined';
      // @ts-ignore - Checking for global objects
      const hasEthosWallet = typeof window.ethos !== 'undefined';
      // @ts-ignore - Checking for global objects
      const hasSuietWallet = typeof window.suiet !== 'undefined';
      // @ts-ignore - Checking for global objects
      const hasMartianWallet = typeof window.martian !== 'undefined';
      // @ts-ignore - Checking for global objects
      const hasWalletStandard = typeof window.walletStandard !== 'undefined';
      
      console.log("Wallet detection on initialization:", {
        hasSuiWallet,
        hasEthosWallet, 
        hasSuietWallet,
        hasMartianWallet
      });

      console.log("Wallet Standard support available:", hasWalletStandard);
    };
    
    detectWallets();
  }, []);
  
  return (
    <SuiClientProvider networks={networks} defaultNetwork={networkName}>
      <WalletProvider
        autoConnect={false} // Explicitly disable autoconnect in favor of our custom connector
        preferredWallets={["Sui Wallet", "Sui: Ethos Wallet", "Martian Sui Wallet", "Suiet", "Glass Wallet"]}
        enableUnsafeBurner={false}
      >
        {children}
      </WalletProvider>
    </SuiClientProvider>
  );
};