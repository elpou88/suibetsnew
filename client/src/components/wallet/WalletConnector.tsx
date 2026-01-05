import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wallet, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCurrentAccount, useDisconnectWallet, useConnectWallet, useWallets } from '@mysten/dapp-kit';
import { shortenAddress } from '@/lib/utils';

interface WalletConnectorProps {
  onConnect?: (address: string) => void;
}

export function WalletConnector({ onConnect }: WalletConnectorProps) {
  const { toast } = useToast();
  const [showWallets, setShowWallets] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const { mutate: connect } = useConnectWallet();
  const wallets = useWallets();

  useEffect(() => {
    if (currentAccount?.address && onConnect) {
      onConnect(currentAccount.address);
    }
  }, [currentAccount?.address, onConnect]);

  const handleConnect = (wallet: any) => {
    setConnectingWallet(wallet.name);
    
    connect(
      { wallet },
      {
        onSuccess: () => {
          setConnectingWallet(null);
          setShowWallets(false);
          toast({
            title: 'Wallet Connected',
            description: `Connected to ${wallet.name}`,
          });
        },
        onError: (error) => {
          setConnectingWallet(null);
          toast({
            title: 'Connection Failed',
            description: error.message || 'Failed to connect wallet',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleDisconnect = () => {
    disconnect(undefined, {
      onSuccess: () => {
        toast({
          title: 'Wallet Disconnected',
          description: 'Your wallet has been disconnected.',
        });
      }
    });
  };

  if (currentAccount?.address) {
    return (
      <Card className="w-full max-w-md mx-auto bg-[#112225] border-[#1e3a3f] text-white">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wallet className="mr-2 h-5 w-5 text-[#00ffff]" />
            Connected Wallet
          </CardTitle>
          <CardDescription className="text-gray-400">
            Your wallet is connected
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-200">Address</p>
              <p className="text-xs font-mono text-[#00ffff]">
                {shortenAddress(currentAccount.address)}
              </p>
            </div>
            <Badge className="bg-[#1e3a3f] text-[#00ffff]">
              <CheckCircle className="h-3 w-3 mr-1" /> Connected
            </Badge>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            className="w-full border-[#1e3a3f] text-[#00ffff] hover:bg-[#1e3a3f]"
            onClick={handleDisconnect}
          >
            Disconnect
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-[#112225] border-[#1e3a3f] text-white">
      <CardHeader>
        <CardTitle className="text-white">Connect Your Wallet</CardTitle>
        <CardDescription className="text-gray-400">
          Connect your Sui wallet to start betting
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showWallets ? (
          <div className="space-y-3">
            {wallets.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                <p className="mb-4">No Sui wallets detected</p>
                <p className="text-sm">Please install a Sui wallet extension like:</p>
                <ul className="text-sm mt-2 space-y-1">
                  <li><a href="https://slush.app" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Slush Wallet</a></li>
                  <li><a href="https://suiet.app" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Suiet Wallet</a></li>
                  <li><a href="https://nightly.app" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Nightly Wallet</a></li>
                </ul>
              </div>
            ) : (
              wallets.map((wallet) => (
                <button
                  key={wallet.name}
                  onClick={() => handleConnect(wallet)}
                  disabled={connectingWallet === wallet.name}
                  className="w-full flex items-center gap-4 p-4 bg-[#0b1618] hover:bg-cyan-900/30 rounded-lg border border-[#1e3a3f] hover:border-cyan-500/50 transition-all duration-200 disabled:opacity-50"
                >
                  {wallet.icon && (
                    <img 
                      src={wallet.icon} 
                      alt={wallet.name} 
                      className="w-10 h-10 rounded-lg"
                    />
                  )}
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-white">{wallet.name}</div>
                    <div className="text-xs text-gray-400">Click to connect</div>
                  </div>
                  {connectingWallet === wallet.name && (
                    <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
                  )}
                </button>
              ))
            )}
            <Button 
              variant="outline"
              onClick={() => setShowWallets(false)}
              className="w-full border-[#1e3a3f] text-gray-400 hover:bg-[#1e3a3f]"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            <div className="rounded-lg border border-[#1e3a3f] p-4 bg-[#0b1618]">
              <h3 className="font-medium text-[#00ffff] mb-2">Why Connect Your Wallet?</h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 mr-2 text-[#00ffff] mt-0.5 flex-shrink-0" />
                  <span>Place crypto bets securely with SUI or SBETS tokens</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 mr-2 text-[#00ffff] mt-0.5 flex-shrink-0" />
                  <span>Receive automatic payouts when you win</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 mr-2 text-[#00ffff] mt-0.5 flex-shrink-0" />
                  <span>Earn dividends from staking SBETS</span>
                </li>
              </ul>
            </div>
            <Button 
              onClick={() => setShowWallets(true)}
              className="w-full bg-gradient-to-r from-[#00FFFF] to-[#00CCCC] hover:from-[#00FFFF]/90 hover:to-[#00CCCC]/90 text-[#112225] font-bold"
            >
              <Wallet className="h-4 w-4 mr-2" />
              Connect Wallet
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
