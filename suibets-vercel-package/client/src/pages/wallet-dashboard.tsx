import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { WalletConnector } from '@/components/wallet/WalletConnector';
import { DividendsPanel } from '@/components/dividends/DividendsPanel';
import { StakingForm } from '@/components/staking/StakingForm';
import { TransactionHistory } from '@/components/transactions/TransactionHistory';
import { WalrusBetSlip } from '@/components/betting/WalrusBetSlip';
import { useWalrusProtocolContext } from '@/context/WalrusProtocolContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wallet, 
  Coins, 
  TrendingUp, 
  History, 
  TicketIcon, 
  Copy, 
  ExternalLink,
  ArrowRightLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function WalletDashboardPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { currentWallet } = useWalrusProtocolContext();
  
  // Mock bet data for visual display
  const mockBets = [
    {
      id: 'bet1',
      eventId: 'event1',
      marketId: 'market1',
      outcomeId: 'outcome1',
      eventName: 'Barcelona vs Real Madrid',
      marketName: 'Match Winner',
      outcomeName: 'Barcelona',
      odds: 1.85,
      status: 'pending' as const
    }
  ];
  
  // Redirect to connect wallet if not connected
  useEffect(() => {
    if (!currentWallet?.address) {
      navigate('/connect-wallet');
    }
  }, [currentWallet, navigate]);
  
  // Copy wallet address to clipboard
  const copyAddressToClipboard = () => {
    if (currentWallet?.address) {
      navigator.clipboard.writeText(currentWallet.address);
      toast({
        title: 'Address Copied',
        description: 'Wallet address copied to clipboard',
        variant: 'default',
      });
    }
  };
  
  // Open wallet address in Sui Explorer
  const openInExplorer = () => {
    if (currentWallet?.address) {
      window.open(`https://explorer.sui.io/address/${currentWallet.address}`, '_blank');
    }
  };
  
  // Format wallet address for display
  const formatWalletAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  if (!currentWallet?.address) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-white text-center">Connect Your Wallet</h1>
          <WalletConnector />
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Wallet Dashboard</h1>
          <p className="text-gray-400 mt-1">Manage your wallet, bets, and earnings</p>
        </div>
        
        <div className="bg-[#0b1618] border border-[#1e3a3f] rounded-lg p-3 mt-4 md:mt-0 w-full md:w-auto">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-[#1e3a3f] flex items-center justify-center mr-3">
              <Wallet className="h-5 w-5 text-[#00ffff]" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Connected Wallet</p>
              <p className="text-white font-mono">{formatWalletAddress(currentWallet.address)}</p>
            </div>
            <div className="ml-4 flex">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#1e3a3f]"
                onClick={copyAddressToClipboard}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#1e3a3f]"
                onClick={openInExplorer}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <p className="text-xs text-gray-400">SUI Balance</p>
              <p className="text-[#00ffff] font-medium">1,245.78 SUI</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">SBETS Balance</p>
              <p className="text-[#00ffff] font-medium">5,678.90 SBETS</p>
            </div>
          </div>
          
          <div className="mt-3">
            <details className="group">
              <summary className="w-full bg-[#1e3a3f] text-[#00ffff] hover:bg-[#254a50] flex justify-center items-center py-1.5 px-3 rounded-md text-sm font-medium cursor-pointer">
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Swap Tokens
              </summary>
              <div className="mt-3 p-3 bg-[#0b1618] border border-[#1e3a3f] rounded-lg">
                <div className="mb-3">
                  <label className="text-xs text-gray-400 mb-1 block">From</label>
                  <div className="flex">
                    <input 
                      type="number" 
                      defaultValue="100" 
                      className="flex-1 bg-[#112225] border-[#1e3a3f] text-white rounded-l-md px-3 py-1 text-sm"
                    />
                    <select className="bg-[#1e3a3f] text-white rounded-r-md px-2 py-1 text-sm">
                      <option value="SUI">SUI</option>
                      <option value="SBETS">SBETS</option>
                    </select>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="text-xs text-gray-400 mb-1 block">To (Estimated)</label>
                  <div className="flex">
                    <input 
                      type="number" 
                      readOnly 
                      value="1230" 
                      className="flex-1 bg-[#112225] border-[#1e3a3f] text-white rounded-l-md px-3 py-1 text-sm"
                    />
                    <select className="bg-[#1e3a3f] text-white rounded-r-md px-2 py-1 text-sm">
                      <option value="SBETS">SBETS</option>
                      <option value="SUI">SUI</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-400">Rate: 1 SUI = 12.3 SBETS</span>
                    <span className="text-xs text-gray-400">Fee: 0.3%</span>
                  </div>
                </div>
                <Button
                  className="w-full bg-[#00ffff] text-[#112225] hover:bg-cyan-300"
                  size="sm"
                >
                  Swap Now
                </Button>
              </div>
            </details>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="betting">
            <TabsList className="bg-[#0b1618] border-b border-[#1e3a3f]">
              <TabsTrigger 
                value="betting" 
                className="data-[state=active]:bg-[#1e3a3f] data-[state=active]:text-[#00ffff]"
              >
                <TicketIcon className="h-4 w-4 mr-2" />
                Betting
              </TabsTrigger>
              <TabsTrigger 
                value="dividends" 
                className="data-[state=active]:bg-[#1e3a3f] data-[state=active]:text-[#00ffff]"
              >
                <Coins className="h-4 w-4 mr-2" />
                Dividends
              </TabsTrigger>
              <TabsTrigger 
                value="staking" 
                className="data-[state=active]:bg-[#1e3a3f] data-[state=active]:text-[#00ffff]"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Staking
              </TabsTrigger>
              <TabsTrigger 
                value="transactions" 
                className="data-[state=active]:bg-[#1e3a3f] data-[state=active]:text-[#00ffff]"
              >
                <History className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="betting" className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                    <TicketIcon className="h-5 w-5 mr-2 text-[#00ffff]" />
                    Active Bets
                    <Badge className="ml-2 bg-[#1e3a3f] text-[#00ffff]">2</Badge>
                  </h2>
                  
                  <div className="space-y-3">
                    <div className="bg-[#0b1618] border border-[#1e3a3f] rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-white">Barcelona vs Real Madrid</p>
                          <p className="text-sm text-gray-400">Match Winner: Barcelona</p>
                        </div>
                        <Badge className="bg-yellow-900/20 text-yellow-400 border-none">In Progress</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-white">
                          <span className="text-gray-400">Amount:</span> 50 SUI
                        </div>
                        <div className="text-sm text-white">
                          <span className="text-gray-400">Potential Win:</span> 92.5 SUI
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-[#1e3a3f] flex justify-between items-center">
                        <div className="text-xs text-gray-400">
                          Transaction: 0x4df5...e72a
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 bg-transparent border-[#1e3a3f] text-[#00ffff] hover:bg-[#1e3a3f] text-xs"
                        >
                          Cash Out (75.5 SUI)
                        </Button>
                      </div>
                    </div>
                    
                    <div className="bg-[#0b1618] border border-[#1e3a3f] rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-white">Lakers vs Bulls</p>
                          <p className="text-sm text-gray-400">Total Points: Over 198.5</p>
                        </div>
                        <Badge className="bg-yellow-900/20 text-yellow-400 border-none">In Progress</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-white">
                          <span className="text-gray-400">Amount:</span> 25 SBETS
                        </div>
                        <div className="text-sm text-white">
                          <span className="text-gray-400">Potential Win:</span> 47.5 SBETS
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-[#1e3a3f] flex justify-between items-center">
                        <div className="text-xs text-gray-400">
                          Transaction: 0x7abc...f91b
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 bg-transparent border-[#1e3a3f] text-[#00ffff] hover:bg-[#1e3a3f] text-xs"
                        >
                          Cash Out (33.2 SBETS)
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">New Bet</h2>
                  <WalrusBetSlip 
                    bets={mockBets as any[]}
                    onRemoveBet={() => {}}
                    onClearAll={() => {}}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="dividends" className="pt-4">
              <DividendsPanel />
            </TabsContent>
            
            <TabsContent value="staking" className="pt-4">
              <StakingForm />
            </TabsContent>
            
            <TabsContent value="transactions" className="pt-4">
              <TransactionHistory />
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                className="bg-[#1e3a3f] text-[#00ffff] hover:bg-[#254a50] h-auto py-6 flex flex-col items-center justify-center"
                onClick={() => navigate('/sport/football')}
              >
                <TicketIcon className="h-6 w-6 mb-2" />
                <span>Place Bet</span>
              </Button>
              <Button 
                className="bg-[#1e3a3f] text-[#00ffff] hover:bg-[#254a50] h-auto py-6 flex flex-col items-center justify-center"
                onClick={() => navigate('/live')}
              >
                <History className="h-6 w-6 mb-2" />
                <span>Live Events</span>
              </Button>
              <Button 
                className="bg-[#1e3a3f] text-[#00ffff] hover:bg-[#254a50] h-auto py-6 flex flex-col items-center justify-center"
                onClick={() => navigate('/dividends')}
              >
                <Coins className="h-6 w-6 mb-2" />
                <span>Claim Dividends</span>
              </Button>
              <Button 
                className="bg-[#1e3a3f] text-[#00ffff] hover:bg-[#254a50] h-auto py-6 flex flex-col items-center justify-center"
                onClick={() => navigate('/defi-staking')}
              >
                <TrendingUp className="h-6 w-6 mb-2" />
                <span>Stake Tokens</span>
              </Button>
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Rewards Summary</h2>
            <div className="bg-[#0b1618] border border-[#1e3a3f] rounded-lg p-4">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total Earnings (All Time)</p>
                  <p className="text-2xl font-semibold text-[#00ffff]">1,487.65 SBETS</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">From Betting</p>
                    <p className="text-lg font-medium text-white">954.20 SBETS</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">From Staking</p>
                    <p className="text-lg font-medium text-white">378.45 SBETS</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">From Dividends</p>
                    <p className="text-lg font-medium text-white">155.00 SBETS</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">This Month</p>
                    <p className="text-lg font-medium text-green-400">+241.35 SBETS</p>
                  </div>
                </div>
                
                <Button
                  className="w-full bg-[#00ffff] text-[#112225] hover:bg-cyan-300"
                  onClick={() => navigate('/bet-history')}
                >
                  View Complete Bet History
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}