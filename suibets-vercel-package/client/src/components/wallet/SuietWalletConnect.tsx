import React, { useEffect, useState } from 'react';
import { ConnectButton, useWallet } from '@suiet/wallet-kit';
import { useToast } from '@/hooks/use-toast';
import { useWalletAdapter } from './WalletAdapter';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';

interface SuietWalletConnectProps {
  onConnect?: (address: string) => void;
}

export const SuietWalletConnect: React.FC<SuietWalletConnectProps> = ({ onConnect }) => {
  const { toast } = useToast();
  const [walletConnected, setWalletConnected] = useState(false);
  const wallet = useWallet();
  
  // Destructure wallet properties
  const { 
    connected,
    address,
    select,
    disconnect: suietDisconnect
  } = wallet;
  
  const { updateConnectionState } = useWalletAdapter();

  // Handle wallet connection when address changes
  useEffect(() => {
    if (connected && address) {
      console.log('Suiet Wallet Connected:', address);
      
      // Update our app's connection state
      updateConnectionState(address, 'sui');
      
      // Call the onConnect callback if provided
      if (onConnect) {
        onConnect(address);
      }
      
      setWalletConnected(true);
      
      toast({
        title: 'Wallet Connected',
        description: `Connected to Suiet wallet: ${address.slice(0, 6)}...${address.slice(-4)}`,
      });
    } else {
      setWalletConnected(false);
    }
  }, [connected, address, onConnect, updateConnectionState, toast]);

  const [isConnecting, setIsConnecting] = useState(false);

  // Handle connect/disconnect
  const handleWalletAction = async () => {
    if (walletConnected) {
      // Disconnect
      try {
        setIsConnecting(true);
        
        if (suietDisconnect) {
          await suietDisconnect();
        }
        
        setWalletConnected(false);
        
        toast({
          title: 'Wallet Disconnected',
          description: 'Your Suiet wallet has been disconnected',
        });
        setIsConnecting(false);
      } catch (error) {
        console.error('Error disconnecting wallet:', error);
        setIsConnecting(false);
      }
    } else {
      // Connect
      try {
        setIsConnecting(true);
        
        // First check if the Suiet wallet extension is available
        // @ts-ignore - window.suiet is injected by the extension
        const isSuietAvailable = typeof window.suiet !== 'undefined';
        
        if (!isSuietAvailable) {
          // No Suiet extension detected - provide installation guidance
          console.log('No Suiet wallet extension detected');
          
          toast({
            title: 'Suiet Wallet Not Detected',
            description: 'Please install the Suiet wallet extension to continue',
            variant: 'destructive',
          });
          
          // Open the fallback connection - use manual address if extension not available
          setTimeout(() => {
            if (onConnect) {
              // Use fallback address for demonstration
              // In production, this would be a form input
              onConnect('0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285');
            }
          }, 1000);
          
          setIsConnecting(false);
          return;
        }
        
        // Extension available, try to select Suiet
        if (select) {
          await select('Suiet');
          console.log('Selected Suiet wallet');
        } else {
          // If selecting fails, try direct connect via window.suiet
          console.log('No select method available, trying direct window.suiet');
          try {
            // @ts-ignore - window.suiet is injected by the extension
            const response = await window.suiet.connect();
            if (response && response.accounts && response.accounts.length > 0) {
              const walletAddress = response.accounts[0].address;
              
              console.log('Connected to Suiet wallet via window.suiet:', walletAddress);
              
              // Update our app's connection state
              await updateConnectionState(walletAddress, 'sui');
              
              // Call the onConnect callback if provided
              if (onConnect) {
                onConnect(walletAddress);
              }
              
              setWalletConnected(true);
              
              toast({
                title: 'Wallet Connected',
                description: `Connected to Suiet wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
              });
            }
          } catch (e) {
            console.error('Error with direct window.suiet connection:', e);
            throw e;
          }
        }
        
        setIsConnecting(false);
      } catch (error) {
        console.error('Error connecting to Suiet wallet:', error);
        
        toast({
          title: 'Connection Failed',
          description: 'Please make sure you have the Suiet wallet extension installed and unlocked',
          variant: 'destructive',
        });
        
        setIsConnecting(false);
      }
    }
  };

  return (
    <div className="suiet-wallet-connect">
      <Button
        className="w-full bg-[#00FFFF] hover:bg-[#00FFFF]/90 text-black font-bold"
        onClick={handleWalletAction}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : walletConnected ? (
          <>
            Connected to Suiet
          </>
        ) : (
          <>
            Connect with Suiet
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
      
      {/* Fallback info for users without wallet extensions */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        <p>
          {!walletConnected && 
            "Don't have Suiet wallet? You can still connect using any Sui wallet address."
          }
        </p>
      </div>
    </div>
  );
};