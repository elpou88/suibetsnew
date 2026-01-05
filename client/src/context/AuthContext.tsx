import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { apiRequest } from '@/lib/queryClient';
import { useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';

type WalletType = string;

const AuthContext = createContext<{
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  walletAddress: string | null;
  disconnectWallet: () => void;
  login: (userData: User) => void;
  updateWalletBalance: (amount: number, currency: string) => void;
}>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  walletAddress: null,
  disconnectWallet: () => {},
  login: () => {},
  updateWalletBalance: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Use dapp-kit hooks directly - SINGLE SOURCE OF TRUTH
  const currentAccount = useCurrentAccount();
  const { mutate: disconnectDappKit } = useDisconnectWallet();
  
  // Derive wallet address from dapp-kit
  const walletAddress = currentAccount?.address || null;
  const isAuthenticated = !!walletAddress;

  // Clear stale localStorage on mount
  useEffect(() => {
    localStorage.removeItem('wallet_address');
    localStorage.removeItem('wallet_type');
    localStorage.removeItem('sui-dapp-kit:wallet-connection-info');
    localStorage.removeItem('@mysten/wallet-kit:lastWallet');
  }, []);

  // Sync user data when wallet connects via dapp-kit
  useEffect(() => {
    if (currentAccount?.address) {
      console.log('[AuthContext] Wallet connected via dapp-kit:', currentAccount.address);
      
      // Set minimal user immediately
      const minimalUser: User = {
        id: 0,
        username: currentAccount.address.substring(0, 8),
        walletAddress: currentAccount.address,
        walletType: 'sui',
        createdAt: new Date().toISOString(),
        balance: { SUI: 0, SBETS: 0 }
      };
      setUser(minimalUser);
      
      // Sync with server asynchronously
      apiRequest('POST', '/api/wallet/connect', {
        address: currentAccount.address,
        walletType: 'sui'
      })
        .then(res => res.json())
        .then(userData => {
          console.log('[AuthContext] Server sync complete:', userData);
          if (userData && userData.walletAddress) {
            setUser(userData);
          }
        })
        .catch(err => {
          console.error('[AuthContext] Server sync error (keeping minimal user):', err);
        });
    } else {
      // Wallet disconnected
      console.log('[AuthContext] Wallet disconnected');
      setUser(null);
    }
  }, [currentAccount?.address]);

  const disconnectWallet = () => {
    console.log('[AuthContext] Disconnecting wallet');
    setUser(null);
    disconnectDappKit();
  };
  
  const login = (userData: User) => {
    setUser(userData);
  };
  
  const updateWalletBalance = (amount: number, currency: string) => {
    if (!user) return;
    
    setUser(prevUser => {
      if (!prevUser) return null;
      
      const currentBalance = prevUser.balance && typeof prevUser.balance === 'object' 
        ? prevUser.balance 
        : { SUI: 0, SBETS: 0 };
      
      const newBalance = { ...currentBalance };
      
      if (currency === 'SUI') {
        newBalance.SUI = (newBalance.SUI || 0) + amount;
      } else if (currency === 'SBETS') {
        newBalance.SBETS = (newBalance.SBETS || 0) + amount;
      }
      
      return {
        ...prevUser,
        balance: newBalance
      };
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        walletAddress,
        disconnectWallet,
        login,
        updateWalletBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
