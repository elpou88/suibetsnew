import { createContext, ReactNode, useContext } from 'react';
import { useWalrusProtocol } from '@/hooks/useWalrusProtocol';

// Create the context
const WalrusProtocolContext = createContext<ReturnType<typeof useWalrusProtocol> | null>(null);

// Create the provider component
export function WalrusProtocolProvider({ children }: { children: ReactNode }) {
  const walrusProtocolHooks = useWalrusProtocol();
  
  return (
    <WalrusProtocolContext.Provider value={walrusProtocolHooks}>
      {children}
    </WalrusProtocolContext.Provider>
  );
}

// Hook for accessing the Walrus protocol context
export function useWalrusProtocolContext() {
  const context = useContext(WalrusProtocolContext);
  
  if (!context) {
    throw new Error('useWalrusProtocolContext must be used within a WalrusProtocolProvider');
  }
  
  return context;
}