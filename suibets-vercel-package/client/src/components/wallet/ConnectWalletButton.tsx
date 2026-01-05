import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet, LogOut } from 'lucide-react';
import { shortenAddress } from '@/lib/utils';
import { useWalletAdapter } from './WalletAdapter';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { formatCurrency } from '@/lib/utils';
import { SuiDappKitConnect } from './SuiDappKitConnect';
import { useCurrentAccount } from '@mysten/dapp-kit';

const ConnectWalletButton: React.FC = () => {
  const { 
    connect, 
    disconnect, 
    address, 
    isConnected, 
    isLoading, 
    balances,
    error,
    updateConnectionState
  } = useWalletAdapter();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Get account from dApp Kit
  const currentAccount = useCurrentAccount();
  
  // If we have an account from Sui dApp Kit but not in our adapter
  useEffect(() => {
    if (currentAccount && !isConnected) {
      updateConnectionState(currentAccount.address, 'sui');
    }
  }, [currentAccount, isConnected, updateConnectionState]);

  // Close dialog when connected
  useEffect(() => {
    if (isConnected) {
      setIsDialogOpen(false);
    }
  }, [isConnected]);

  // Connected state with dropdown for wallet options
  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full space-x-2 bg-[#112225] text-cyan-400 border-[#1e3a3f] hover:border-cyan-400 hover:bg-[#1a3138]">
            <Wallet className="h-4 w-4" />
            <span>{shortenAddress(address)}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-[#0b1618] border-[#1e3a3f] text-white">
          <DropdownMenuLabel>Your Wallet</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-[#1e3a3f]" />
          <DropdownMenuItem className="flex justify-between hover:bg-[#1a3138] text-cyan-100">
            <span>SUI</span>
            <span>{formatCurrency(balances.SUI)}</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="flex justify-between hover:bg-[#1a3138] text-cyan-100">
            <span>SBETS</span>
            <span>{formatCurrency(balances.SBETS)}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[#1e3a3f]" />
          <DropdownMenuItem onClick={disconnect} className="text-red-400 cursor-pointer hover:bg-[#1a3138] hover:text-red-300">
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Button disabled variant="outline" className="w-full bg-[#112225] text-cyan-400 border-[#1e3a3f]">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Connecting...
      </Button>
    );
  }

  // Connect wallet dialog
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full bg-[#112225] text-cyan-400 border-[#1e3a3f] hover:border-cyan-400 hover:bg-[#1a3138]">
          <Wallet className="h-4 w-4 mr-2" />
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0b1618] border-[#1e3a3f] text-white">
        <DialogHeader>
          <DialogTitle className="text-cyan-400">Connect Your Sui Wallet</DialogTitle>
          <DialogDescription className="text-gray-400">
            Connect your Sui wallet to place bets, deposit, and withdraw funds.
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <div className="text-red-400 text-sm mb-4 p-2 border border-red-800 rounded bg-red-900/30">
            {error}
          </div>
        )}
        
        <div className="grid gap-4 py-4">
          {/* Sui dApp Kit Connect Button */}
          <SuiDappKitConnect 
            onConnect={(address) => {
              console.log('Wallet connected via SuiDappKitConnect:', address);
              setIsDialogOpen(false);
            }}
          />
          
          {/* Legacy Connect Method as Fallback */}
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#1e3a3f]"></span>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#0b1618] px-2 text-xs text-gray-400">OR</span>
            </div>
          </div>
          
          <Button 
            onClick={async () => {
              const success = await connect();
              if (!success) {
                console.log('Wallet connection was not successful');
              }
            }} 
            disabled={isLoading} 
            className="w-full bg-gradient-to-r from-cyan-600 to-cyan-400 hover:from-cyan-700 hover:to-cyan-500 text-black font-bold"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Connect with Legacy Method
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectWalletButton;