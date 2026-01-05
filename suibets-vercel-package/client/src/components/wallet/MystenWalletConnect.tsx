import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  ConnectButton,
  useWalletKit
} from '@mysten/wallet-kit';

interface MystenWalletConnectProps {
  onConnect?: (address: string) => void;
}

export const MystenWalletConnect: React.FC<MystenWalletConnectProps> = ({ onConnect }) => {
  const { currentAccount, isConnected, disconnect } = useWalletKit();
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletInstalled, setWalletInstalled] = useState(false);
  const { toast } = useToast();

  // Check for wallet installation
  useEffect(() => {
    const checkWalletInstallation = () => {
      // @ts-ignore - Check for SUI wallet
      const hasSuiWallet = typeof window.suiWallet !== 'undefined';
      // @ts-ignore - Check for wallet standard
      const hasWalletStandard = typeof window.wallet !== 'undefined';
      
      setWalletInstalled(hasSuiWallet || hasWalletStandard);
    };
    
    checkWalletInstallation();
  }, []);

  // Handle connection state changes
  useEffect(() => {
    if (isConnected && currentAccount) {
      if (onConnect) {
        onConnect(currentAccount.address);
      }
      setIsConnecting(false);
      
      toast({
        title: 'Wallet Connected',
        description: `Connected to ${currentAccount.address.slice(0, 8)}...${currentAccount.address.slice(-6)}`,
      });
    }
  }, [isConnected, currentAccount, onConnect, toast]);

  const handleConnect = async () => {
    if (isConnected && currentAccount) {
      try {
        setIsConnecting(true);
        await disconnect();
        setIsConnecting(false);
        
        toast({
          title: 'Wallet Disconnected',
          description: 'Your wallet has been disconnected',
        });
      } catch (error) {
        console.error('Error disconnecting wallet:', error);
        setIsConnecting(false);
      }
    } else {
      setIsConnecting(true);
      
      if (!walletInstalled) {
        toast({
          title: 'No Wallet Detected',
          description: 'Please install a Sui wallet extension to continue',
          variant: 'destructive',
        });
        setIsConnecting(false);
        return;
      }
      
      // The actual connect action will be triggered by the hidden ConnectButton
      document.querySelector<HTMLElement>('.hidden-connect-button')?.click();
      
      // Add a timeout to reset the connecting state in case the wallet modal is closed
      setTimeout(() => {
        if (!isConnected) {
          setIsConnecting(false);
        }
      }, 5000);
    }
  };

  return (
    <div className="mysten-wallet-connect">
      <Button
        className="w-full bg-[#00FFFF] hover:bg-[#00FFFF]/90 text-black font-bold"
        onClick={handleConnect}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <>
            <Loader className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : isConnected && currentAccount ? (
          <>
            Connected: {currentAccount.address.slice(0, 6)}...{currentAccount.address.slice(-4)}
          </>
        ) : (
          <>
            Connect Sui Wallet
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
      
      {/* Hidden button used by wallet-kit */}
      <div className="hidden">
        <ConnectButton />
      </div>
    </div>
  );
};