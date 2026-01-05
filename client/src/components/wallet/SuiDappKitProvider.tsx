import { ReactNode, useEffect } from 'react';
import '@mysten/dapp-kit/dist/index.css';
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';

const { networkConfig } = createNetworkConfig({
  mainnet: { url: getFullnodeUrl('mainnet') },
  testnet: { url: getFullnodeUrl('testnet') },
  devnet: { url: getFullnodeUrl('devnet') },
  localnet: { url: getFullnodeUrl('localnet') },
});

const getDefaultNetwork = (): 'mainnet' | 'testnet' | 'devnet' | 'localnet' => {
  const network = import.meta.env.VITE_SUI_NETWORK as string || 'mainnet';
  return network as 'mainnet' | 'testnet' | 'devnet' | 'localnet';
};

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

interface SuiDappKitProviderProps {
  children: ReactNode;
}

export const SuiDappKitProvider = ({ children }: SuiDappKitProviderProps) => {
  const defaultNetwork = getDefaultNetwork();
  
  useEffect(() => {
    try {
      localStorage.removeItem('sui-dapp-kit:wallet-connection-info');
      localStorage.removeItem('@mysten/wallet-kit:lastWallet');
      localStorage.removeItem('suiWallet');
    } catch (e) {
      console.log('Could not clear wallet cache');
    }
  }, []);
  
  return (
    <SuiClientProvider networks={networkConfig} defaultNetwork={defaultNetwork}>
      <WalletProvider
        autoConnect={false}
        storage={noopStorage}
        stashedWallet={{
          name: 'SuiBets',
        }}
      >
        {children}
      </WalletProvider>
    </SuiClientProvider>
  );
};
