import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { WalletConnector } from '@/components/wallet/WalletConnector';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, LineChart, Coins, Newspaper } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ConnectWalletImage from '@assets/Connect Wallet (2).png';
import { useWalrusProtocol } from '@/hooks/useWalrusProtocol';

function BenefitsTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <Card className="bg-[#0b1618] border-[#1e3a3f] text-white">
        <CardHeader>
          <CardTitle className="flex items-center text-[#00ffff]">
            <Wallet className="h-5 w-5 mr-2" />
            Seamless Betting
          </CardTitle>
          <CardDescription className="text-gray-400">
            Bet directly from your wallet with no deposits
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-gray-300">
          <p>
            Connect your Sui wallet to place bets using SUI or SBETS tokens directly.
            No need to deposit funds into a separate betting account.
            Your tokens remain in your wallet until you place a bet.
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-[#0b1618] border-[#1e3a3f] text-white">
        <CardHeader>
          <CardTitle className="flex items-center text-[#00ffff]">
            <LineChart className="h-5 w-5 mr-2" />
            Automatic Payouts
          </CardTitle>
          <CardDescription className="text-gray-400">
            Receive winnings directly to your wallet
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-gray-300">
          <p>
            When you win a bet, your earnings are automatically sent to your wallet.
            No withdrawal delays or fees. The smart contract executes payouts instantly
            once the event results are confirmed.
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-[#0b1618] border-[#1e3a3f] text-white">
        <CardHeader>
          <CardTitle className="flex items-center text-[#00ffff]">
            <Coins className="h-5 w-5 mr-2" />
            Earn Dividends
          </CardTitle>
          <CardDescription className="text-gray-400">
            Share in protocol profits
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-gray-300">
          <p>
            By staking SBETS tokens, you earn a share of protocol fees as dividends.
            The more you stake and the longer you lock, the higher your dividends.
            Claim your dividends anytime or reinvest for compound growth.
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-[#0b1618] border-[#1e3a3f] text-white">
        <CardHeader>
          <CardTitle className="flex items-center text-[#00ffff]">
            <Newspaper className="h-5 w-5 mr-2" />
            Access Premium Features
          </CardTitle>
          <CardDescription className="text-gray-400">
            Unlock advanced betting options
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-gray-300">
          <p>
            Connected wallets gain access to premium features like parlays, 
            cash-out options, boosted odds, and exclusive promotions.
            Track your betting history across all sports and competitions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="mt-6 space-y-4 text-white">
      <div className="rounded-lg border border-[#1e3a3f] p-4 bg-[#0b1618]">
        <h3 className="font-medium text-[#00ffff] mb-2">Smart Contract Security</h3>
        <p className="text-sm text-gray-300">
          The Walrus protocol smart contracts have been audited by leading blockchain security firms.
          All contracts are open-source and verified on the Sui blockchain explorer.
          Funds are never held in custody by the platform - they remain in your wallet or locked in
          transparent smart contracts.
        </p>
      </div>
      
      <div className="rounded-lg border border-[#1e3a3f] p-4 bg-[#0b1618]">
        <h3 className="font-medium text-[#00ffff] mb-2">Decentralized Operation</h3>
        <p className="text-sm text-gray-300">
          The protocol operates in a decentralized manner with no central point of failure.
          Event results are verified by multiple oracle networks before settlement.
          All transactions are recorded on-chain for complete transparency and auditability.
        </p>
      </div>
      
      <div className="rounded-lg border border-[#1e3a3f] p-4 bg-[#0b1618]">
        <h3 className="font-medium text-[#00ffff] mb-2">Self-Custody</h3>
        <p className="text-sm text-gray-300">
          Your funds always remain in your control. The platform never takes custody of your tokens.
          You approve each transaction individually through your wallet's confirmation process.
          There are no deposit or withdrawal delays since you maintain custody of your assets.
        </p>
      </div>
    </div>
  );
}

export default function ConnectWalletPage() {
  const [, navigate] = useLocation();
  const { currentWallet } = useWalrusProtocol();
  const [activeTab, setActiveTab] = useState('connect');
  
  // Redirect to wallet dashboard if wallet is already connected
  useEffect(() => {
    if (currentWallet?.address && currentWallet?.isRegistered) {
      navigate('/wallet-dashboard');
    }
  }, [currentWallet, navigate]);
  
  const handleConnect = (address: string) => {
    console.log('Wallet connected:', address);
    // After successful connection, redirect to wallet dashboard
    setTimeout(() => {
      navigate('/wallet-dashboard');
    }, 1500);
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white">Connect Your Wallet</h1>
          <p className="text-gray-400 mb-6">
            Connect your Sui wallet to start betting with cryptocurrency on our secure platform
          </p>
          
          <WalletConnector onConnect={handleConnect} />
          
          <Separator className="my-8 bg-[#1e3a3f]" />
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-[#0b1618]">
              <TabsTrigger 
                value="benefits" 
                className="data-[state=active]:bg-[#1e3a3f] data-[state=active]:text-[#00ffff]"
              >
                Benefits
              </TabsTrigger>
              <TabsTrigger 
                value="security" 
                className="data-[state=active]:bg-[#1e3a3f] data-[state=active]:text-[#00ffff]"
              >
                Security
              </TabsTrigger>
            </TabsList>
            <TabsContent value="benefits">
              <BenefitsTab />
            </TabsContent>
            <TabsContent value="security">
              <SecurityTab />
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="hidden md:block">
          <img 
            src={ConnectWalletImage} 
            alt="Connect Wallet" 
            className="w-full h-auto rounded-lg border border-[#1e3a3f]"
          />
          
          <div className="mt-6 p-4 rounded-lg bg-[#0b1618] border border-[#1e3a3f]">
            <h3 className="text-xl font-semibold mb-2 text-white">Ready to Get Started?</h3>
            <p className="text-gray-300 mb-4">
              Connect your wallet to gain access to all features of the platform, including:
            </p>
            <ul className="space-y-2 text-gray-300 mb-4">
              <li className="flex items-center">
                <span className="text-[#00ffff] mr-2">•</span>
                Betting with SUI and SBETS tokens
              </li>
              <li className="flex items-center">
                <span className="text-[#00ffff] mr-2">•</span>
                Automatic winnings payouts
              </li>
              <li className="flex items-center">
                <span className="text-[#00ffff] mr-2">•</span>
                Dividend earning through staking
              </li>
              <li className="flex items-center">
                <span className="text-[#00ffff] mr-2">•</span>
                Access to exclusive promotions
              </li>
            </ul>
            <Button 
              className="w-full bg-[#00ffff] text-[#112225] hover:bg-cyan-300"
              onClick={() => setActiveTab('connect')}
            >
              Connect Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}