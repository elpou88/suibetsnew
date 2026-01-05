import { useState, useEffect } from 'react';
import { WalletType } from '@/types';

interface SuiWallet {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  walletType: WalletType | null;
  error: string | null;
  connectWallet: (type: WalletType) => Promise<void>;
  disconnectWallet: () => void;
}

export default function useSuiWallet(): SuiWallet {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if wallet is connected from local storage on mount
  useEffect(() => {
    const savedAddress = localStorage.getItem('wallet_address');
    const savedWalletType = localStorage.getItem('wallet_type') as WalletType;
    
    if (savedAddress && savedWalletType) {
      setAddress(savedAddress);
      setWalletType(savedWalletType);
      setIsConnected(true);
    }
  }, []);

  const connectWallet = async (type: WalletType): Promise<void> => {
    try {
      setIsConnecting(true);
      setError(null);

      // Mock wallet connection for demo purposes
      // In a real application, this would connect to the actual wallet
      const mockAddress = `0x${Math.random().toString(36).substring(2, 15)}`;
      
      // Save to local storage
      localStorage.setItem('wallet_address', mockAddress);
      localStorage.setItem('wallet_type', type);
      
      // Update state
      setAddress(mockAddress);
      setWalletType(type);
      setIsConnected(true);
      
    } catch (err) {
      setError('Failed to connect wallet');
      console.error('Wallet connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = (): void => {
    localStorage.removeItem('wallet_address');
    localStorage.removeItem('wallet_type');
    
    setAddress(null);
    setWalletType(null);
    setIsConnected(false);
  };

  return {
    address,
    isConnected,
    isConnecting,
    walletType,
    error,
    connectWallet,
    disconnectWallet
  };
}
