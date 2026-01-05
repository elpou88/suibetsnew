import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useWalrusProtocolContext } from '@/context/WalrusProtocolContext';
import { AlertCircle, Coins, ArrowUpRight, Loader2, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface Dividend {
  id: string;
  amount: number;
  timestamp: number;
  status: 'pending' | 'claimable' | 'claimed';
  source: 'bet' | 'stake' | 'referral';
  expiryTimestamp?: number;
}

interface DividendsPanelProps {
  className?: string;
}

export function DividendsPanel({ className }: DividendsPanelProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isClaimingAll, setIsClaimingAll] = useState(false);
  
  const { currentWallet, useWalletDividends, claimDividendsMutation } = useWalrusProtocolContext();
  
  // Use wallet dividends hook to fetch data
  const { data: dividendsData, isLoading: isDividendsLoading } = useWalletDividends(
    currentWallet?.address
  );
  
  // Use real dividends from API (empty array as fallback - no mock data)
  const dividends = dividendsData?.dividends || [];
  
  // Calculate total claimable dividends
  const totalClaimableDividends = dividends
    .filter((div: Dividend) => div.status === 'claimable')
    .reduce((sum: number, div: Dividend) => sum + div.amount, 0);
  
  // Calculate lifetime total dividends
  const lifetimeDividends = dividends.reduce((sum: number, div: Dividend) => sum + div.amount, 0);
  
  const handleClaimAll = async () => {
    if (!currentWallet?.address) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to claim dividends.',
        variant: 'destructive',
      });
      navigate('/connect-wallet');
      return;
    }
    
    if (totalClaimableDividends <= 0) {
      toast({
        title: 'No Claimable Dividends',
        description: 'You don\'t have any dividends to claim at the moment.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsClaimingAll(true);
    
    try {
      await claimDividendsMutation.mutateAsync({
        walletAddress: currentWallet.address,
      });
      
      toast({
        title: 'Dividends Claimed',
        description: `Successfully claimed ${totalClaimableDividends.toFixed(2)} SBETS in dividends.`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error claiming dividends:', error);
      toast({
        title: 'Claim Failed',
        description: 'There was an error claiming your dividends. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsClaimingAll(false);
    }
  };
  
  // Format dividend source for display
  const formatSource = (source: string) => {
    switch (source) {
      case 'bet':
        return 'Betting Reward';
      case 'stake':
        return 'Staking Yield';
      case 'referral':
        return 'Referral Bonus';
      default:
        return 'Platform Reward';
    }
  };
  
  if (!currentWallet?.address) {
    return (
      <Card className={`w-full bg-[#112225] border-[#1e3a3f] text-white ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Coins className="mr-2 h-5 w-5 text-[#00ffff]" />
            Dividends
          </CardTitle>
          <CardDescription className="text-gray-400">
            Connect your wallet to view and claim your dividends
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-500 mb-4" />
          <p className="text-gray-400 text-center mb-4">
            You need to connect your wallet to access your dividends.
          </p>
          <Button 
            className="bg-[#00ffff] text-[#112225] hover:bg-cyan-300"
            onClick={() => navigate('/connect-wallet')}
          >
            Connect Wallet
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={`w-full bg-[#112225] border-[#1e3a3f] text-white ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Coins className="mr-2 h-5 w-5 text-[#00ffff]" />
          Dividends
        </CardTitle>
        <CardDescription className="text-gray-400">
          Earn passive rewards from the protocol
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-[#0b1618] rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Claimable Dividends</div>
            <div className="flex items-end">
              <span className="text-xl font-semibold text-[#00ffff]">
                {totalClaimableDividends.toFixed(2)}
              </span>
              <span className="text-xs text-gray-400 ml-1 mb-1">SBETS</span>
            </div>
            <Progress 
              value={75} 
              className="h-1 w-full mt-2 bg-[#1e3a3f]" 
            />
          </div>
          
          <div className="bg-[#0b1618] rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Lifetime Earnings</div>
            <div className="flex items-end">
              <span className="text-xl font-semibold text-white">
                {lifetimeDividends.toFixed(2)}
              </span>
              <span className="text-xs text-gray-400 ml-1 mb-1">SBETS</span>
            </div>
            <div className="flex items-center mt-2">
              <ArrowUpRight className="text-green-400 h-3 w-3 mr-1" />
              <span className="text-xs text-green-400">+12.5% this month</span>
            </div>
          </div>
        </div>
        
        <Separator className="my-4 bg-[#1e3a3f]" />
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-white">Recent Dividends</h3>
            <Badge variant="outline" className="bg-[#1e3a3f] text-[#00ffff] border-none">
              {dividends.length} Total
            </Badge>
          </div>
          
          {isDividendsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#00ffff]" />
            </div>
          ) : dividends.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No dividends found. Stake SBETS tokens to start earning.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dividends.map((dividend: Dividend) => (
                <div 
                  key={dividend.id}
                  className="bg-[#0b1618] rounded-lg p-3 flex justify-between items-center"
                >
                  <div>
                    <div className="flex items-center">
                      <div className="mr-3">
                        {dividend.status === 'claimed' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                        ) : dividend.status === 'claimable' ? (
                          <Coins className="h-5 w-5 text-[#00ffff]" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{formatSource(dividend.source)}</p>
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                          <p className="text-xs text-gray-400">
                            {format(new Date(dividend.timestamp), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-[#00ffff]">{dividend.amount.toFixed(2)} SBETS</p>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        dividend.status === 'claimed' 
                          ? 'bg-green-900/20 text-green-400' 
                          : dividend.status === 'claimable'
                            ? 'bg-blue-900/20 text-[#00ffff]'
                            : 'bg-yellow-900/20 text-yellow-400'
                      } border-none`}
                    >
                      {dividend.status === 'claimed' 
                        ? 'Claimed' 
                        : dividend.status === 'claimable' 
                          ? 'Claimable' 
                          : 'Pending'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter>
        <div className="w-full space-y-2">
          <Button
            className="w-full bg-[#00ffff] text-[#112225] hover:bg-cyan-300"
            disabled={totalClaimableDividends <= 0 || isClaimingAll}
            onClick={handleClaimAll}
          >
            {isClaimingAll ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Claiming...
              </>
            ) : (
              <>
                Claim All Dividends ({totalClaimableDividends.toFixed(2)} SBETS)
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="w-full border-[#1e3a3f] text-white hover:bg-[#1e3a3f]"
            onClick={() => navigate('/defi-staking')}
          >
            Stake SBETS to Earn More
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}