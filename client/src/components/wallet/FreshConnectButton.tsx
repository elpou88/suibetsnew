import { useCurrentAccount, useDisconnectWallet, useConnectWallet, useWallets } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { Wallet, ChevronDown, LogOut, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { shortenAddress } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function FreshConnectButton() {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const { mutate: connect, isPending } = useConnectWallet();
  const wallets = useWallets();
  const { toast } = useToast();
  
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  
  // Log wallet detection for debugging
  useEffect(() => {
    console.log('[FreshConnectButton] Detected wallets:', wallets.map(w => w.name));
    console.log('[FreshConnectButton] Current account:', currentAccount?.address);
  }, [wallets, currentAccount]);
  
  // Handle wallet connection
  const handleConnect = (wallet: any) => {
    console.log('[FreshConnectButton] Connecting to:', wallet.name);
    setConnectingWallet(wallet.name);
    
    connect(
      { wallet },
      {
        onSuccess: () => {
          console.log('[FreshConnectButton] Connected successfully to:', wallet.name);
          setShowWalletModal(false);
          setConnectingWallet(null);
          toast({
            title: "Wallet Connected",
            description: `Connected to ${wallet.name}`,
          });
        },
        onError: (error) => {
          console.error('[FreshConnectButton] Connection error:', error);
          setConnectingWallet(null);
          toast({
            title: "Connection Failed",
            description: error.message || "Failed to connect wallet",
            variant: "destructive",
          });
        },
      }
    );
  };
  
  // Handle opening wallet selection - ALWAYS disconnect first to force fresh selection
  const openWalletSelection = () => {
    console.log('[FreshConnectButton] Opening wallet selection, disconnecting first...');
    
    // Always disconnect first to clear any cached state
    disconnect(undefined, {
      onSettled: () => {
        console.log('[FreshConnectButton] Disconnected, showing wallet modal');
        setShowWalletModal(true);
      }
    });
  };
  
  // Handle disconnect
  const handleDisconnect = () => {
    console.log('[FreshConnectButton] Disconnecting...');
    disconnect(undefined, {
      onSuccess: () => {
        toast({
          title: "Wallet Disconnected",
          description: "Your wallet has been disconnected.",
        });
      }
    });
  };
  
  // If connected, show wallet dropdown
  if (currentAccount?.address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="border-cyan-500/50 bg-cyan-900/20 text-cyan-300 hover:bg-cyan-900/40 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/30 font-medium transition-all duration-300"
            data-testid="button-wallet-connected"
          >
            <Wallet className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">{shortenAddress(currentAccount.address)}</span>
            <span className="sm:hidden">Wallet</span>
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-[#0d1f23] border-cyan-800/50">
          <DropdownMenuLabel className="text-cyan-300">Connected Wallet</DropdownMenuLabel>
          <div className="px-2 py-2 text-xs text-cyan-400 font-mono">
            {shortenAddress(currentAccount.address)}
          </div>
          <DropdownMenuSeparator className="bg-cyan-800/30" />
          <DropdownMenuItem 
            className="cursor-pointer text-white hover:bg-cyan-900/50"
            onClick={() => window.location.href = '/wallet-dashboard'}
          >
            <Wallet className="mr-2 h-4 w-4" />
            Dashboard
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="cursor-pointer text-white hover:bg-cyan-900/50"
            onClick={() => window.location.href = '/bet-history'}
          >
            My Bets
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-cyan-800/30" />
          <DropdownMenuItem 
            className="cursor-pointer text-white hover:bg-cyan-900/50"
            onClick={openWalletSelection}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Switch Wallet
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="cursor-pointer text-red-400 hover:bg-red-900/30"
            onClick={handleDisconnect}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  
  // Not connected - show connect button
  return (
    <>
      <Button
        onClick={openWalletSelection}
        disabled={isPending}
        className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-4 py-2 rounded-lg shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/50 transition-all duration-300"
        data-testid="button-connect-wallet"
      >
        <Wallet className="w-4 h-4 mr-2" />
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </Button>
      
      {/* Custom wallet selection modal */}
      <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
        <DialogContent className="bg-[#0d1f23] border-cyan-800/50 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-cyan-300">Select Wallet</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 mt-4">
            {wallets.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
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
                  className="w-full flex items-center gap-4 p-4 bg-[#112225] hover:bg-cyan-900/30 rounded-lg border border-cyan-800/30 hover:border-cyan-500/50 transition-all duration-200 disabled:opacity-50"
                  data-testid={`wallet-option-${wallet.name.toLowerCase().replace(/\s+/g, '-')}`}
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
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500 border-t-transparent" />
                  )}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
