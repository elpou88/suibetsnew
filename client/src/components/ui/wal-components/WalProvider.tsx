import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

// Types based on Wal.app documentation
export interface WalUser {
  id: string;
  username: string;
  walletAddress: string;
  walletType: string;
  balance: number;
  sessionToken?: string;
}

export interface WalProviderContextType {
  user: WalUser | null;
  isConnecting: boolean;
  connectWallet: (address: string, type?: string) => Promise<WalUser | null>;
  disconnectWallet: () => void;
  refreshUserData: () => Promise<void>;
  userRegistrationStatus: boolean | null;
  checkRegistrationStatus: (address: string) => Promise<boolean>;
}

// Create the context
const WalProviderContext = createContext<WalProviderContextType | undefined>(undefined);

// Provider props
interface WalProviderProps {
  children: ReactNode;
}

export const WalProvider: React.FC<WalProviderProps> = ({ children }) => {
  const [user, setUser] = useState<WalUser | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [userRegistrationStatus, setUserRegistrationStatus] = useState<boolean | null>(null);

  // Check if user was previously logged in (via localStorage)
  useEffect(() => {
    const storedUser = localStorage.getItem('walUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        
        // Validate the stored session
        checkRegistrationStatus(parsedUser.walletAddress);
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('walUser');
      }
    }
  }, []);

  const connectWallet = async (address: string, type: string = 'Sui'): Promise<WalUser | null> => {
    setIsConnecting(true);
    try {
      const response = await axios.post('/api/wallet/connect', { 
        address, 
        walletType: type 
      });
      
      const userData = response.data;
      
      // Store user in state and localStorage
      setUser(userData);
      localStorage.setItem('walUser', JSON.stringify(userData));
      
      // Check if user is registered with Wurlus protocol
      checkRegistrationStatus(address);
      
      return userData;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setUser(null);
    setUserRegistrationStatus(null);
    localStorage.removeItem('walUser');
  };

  const refreshUserData = async (): Promise<void> => {
    if (!user?.walletAddress) return;
    
    try {
      // Get updated user data like balance
      const response = await axios.get(`/api/users/wallet/${user.walletAddress}`);
      const updatedUser = response.data;
      
      // Update user in state and localStorage
      setUser(updatedUser);
      localStorage.setItem('walUser', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  const checkRegistrationStatus = async (address: string): Promise<boolean> => {
    try {
      const response = await axios.get(`/api/wurlus/registration/${address}`);
      const { isRegistered } = response.data;
      setUserRegistrationStatus(isRegistered);
      return isRegistered;
    } catch (error) {
      console.error('Failed to check registration status:', error);
      setUserRegistrationStatus(false);
      return false;
    }
  };

  // Context value
  const value: WalProviderContextType = {
    user,
    isConnecting,
    connectWallet,
    disconnectWallet,
    refreshUserData,
    userRegistrationStatus,
    checkRegistrationStatus,
  };

  return (
    <WalProviderContext.Provider value={value}>
      {children}
    </WalProviderContext.Provider>
  );
};

// Custom hook to use the context
export const useWal = (): WalProviderContextType => {
  const context = useContext(WalProviderContext);
  if (context === undefined) {
    throw new Error('useWal must be used within a WalProvider');
  }
  return context;
};