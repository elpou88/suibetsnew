import React, { useState } from 'react';
import { useWal } from './WalProvider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';

// Types for wallet providers
type WalletProvider = {
  id: string;
  name: string;
  logo: string;
  walletType: string;
};

interface WalConnectProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  fullWidth?: boolean;
  buttonText?: string;
  onSuccess?: (address: string) => void;
  onError?: (error: Error) => void;
}

export const WalConnect: React.FC<WalConnectProps> = ({
  variant = 'default',
  size = 'default',
  fullWidth = false,
  buttonText = 'Connect Wallet',
  onSuccess,
  onError
}) => {
  const { connectWallet, isConnecting, userRegistrationStatus } = useWal();
  const [isOpen, setIsOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<string>('sui');
  const [error, setError] = useState<string | null>(null);

  // Wallet providers based on Wal.app documentation
  const walletProviders: WalletProvider[] = [
    {
      id: 'sui',
      name: 'Sui Wallet',
      logo: 'https://cdn.wal.app/logos/sui-wallet.svg',
      walletType: 'Sui'
    },
    {
      id: 'ethos',
      name: 'Ethos',
      logo: 'https://cdn.wal.app/logos/ethos-wallet.svg',
      walletType: 'Ethos'
    },
    {
      id: 'suiet',
      name: 'Suiet',
      logo: 'https://cdn.wal.app/logos/suiet-wallet.svg',
      walletType: 'Suiet'
    },
    {
      id: 'martian',
      name: 'Martian',
      logo: 'https://cdn.wal.app/logos/martian-wallet.svg',
      walletType: 'Martian'
    }
  ];

  const handleConnect = async () => {
    if (!walletAddress) {
      setError('Please enter a wallet address');
      return;
    }

    setError(null);
    try {
      const selectedProvider = walletProviders.find(p => p.id === selectedWallet);
      const walletType = selectedProvider ? selectedProvider.walletType : 'Sui';
      
      const user = await connectWallet(walletAddress, walletType);
      
      if (user) {
        setIsOpen(false);
        onSuccess?.(walletAddress);
      } else {
        setError('Failed to connect wallet');
        onError?.(new Error('Failed to connect wallet'));
      }
    } catch (err) {
      setError((err as Error).message || 'An error occurred');
      onError?.(err as Error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          className={fullWidth ? 'w-full' : ''}
          onClick={() => setIsOpen(true)}
        >
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect your wallet</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="wallet-address">Wallet Address</Label>
            <Input
              id="wallet-address"
              placeholder="Enter your Sui wallet address"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
            />
          </div>
          
          <div className="grid gap-2">
            <Label>Select Wallet Provider</Label>
            <RadioGroup value={selectedWallet} onValueChange={setSelectedWallet}>
              {walletProviders.map((provider) => (
                <div key={provider.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={provider.id} id={provider.id} />
                  <Label htmlFor={provider.id} className="flex items-center gap-2">
                    <img src={provider.logo} alt={provider.name} className="w-5 h-5" />
                    {provider.name}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          
          {userRegistrationStatus === false && (
            <div className="text-amber-500 text-sm">
              Note: Your wallet is not yet registered with the Wurlus protocol. Connecting will automatically register it.
            </div>
          )}
          
          <Button onClick={handleConnect} disabled={isConnecting} className="mt-2">
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};