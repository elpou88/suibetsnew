import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Loader2, ArrowRight, TrendingUp, Lock, Wallet, Info, Calendar } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from '@/hooks/use-toast';
import { useWalrusProtocolContext } from '@/context/WalrusProtocolContext';

interface StakingOption {
  periodDays: number;
  apy: number;
}

interface StakingFormProps {
  className?: string;
}

export function StakingForm({ className }: StakingFormProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [stakeAmount, setStakeAmount] = useState<number>(100);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30);
  const [isStaking, setIsStaking] = useState(false);
  
  const { currentWallet, stakeTokensMutation } = useWalrusProtocolContext();
  
  // Staking options with APY percentages
  const stakingOptions: StakingOption[] = [
    { periodDays: 30, apy: 12 },
    { periodDays: 90, apy: 18 },
    { periodDays: 180, apy: 24 },
    { periodDays: 365, apy: 32 }
  ];
  
  // Find the selected option
  const selectedOption = stakingOptions.find(option => option.periodDays === selectedPeriod) || stakingOptions[0];
  
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setStakeAmount(value);
    }
  };
  
  const handlePeriodChange = (period: number) => {
    setSelectedPeriod(period);
  };
  
  const calculateReward = () => {
    const annualReward = stakeAmount * (selectedOption.apy / 100);
    const dailyReward = annualReward / 365;
    const totalReward = dailyReward * selectedOption.periodDays;
    return totalReward.toFixed(2);
  };
  
  const estimateApr = () => {
    return selectedOption.apy;
  };
  
  const calculateUnlockDate = () => {
    const unlockDate = new Date();
    unlockDate.setDate(unlockDate.getDate() + selectedOption.periodDays);
    return unlockDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const handleStake = async () => {
    if (!currentWallet?.address) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to stake tokens.',
        variant: 'destructive',
      });
      navigate('/connect-wallet');
      return;
    }
    
    if (stakeAmount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid staking amount.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsStaking(true);
    
    try {
      await stakeTokensMutation.mutateAsync({
        walletAddress: currentWallet.address,
        amount: stakeAmount,
        periodDays: selectedOption.periodDays
      });
      
      toast({
        title: 'Tokens Staked Successfully',
        description: `You have staked ${stakeAmount} SBETS for ${selectedOption.periodDays} days.`,
        variant: 'default',
      });
      
      // Reset the form
      setStakeAmount(100);
    } catch (error) {
      console.error('Error staking tokens:', error);
      toast({
        title: 'Staking Failed',
        description: 'There was an error staking your tokens. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsStaking(false);
    }
  };
  
  if (!currentWallet?.address) {
    return (
      <Card className={`w-full bg-[#112225] border-[#1e3a3f] text-white ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-[#00ffff]" />
            DeFi Staking
          </CardTitle>
          <CardDescription className="text-gray-400">
            Connect your wallet to stake SBETS and earn yield
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-500 mb-4" />
          <p className="text-gray-400 text-center mb-4">
            You need to connect your wallet to stake tokens and earn yield.
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
          <TrendingUp className="mr-2 h-5 w-5 text-[#00ffff]" />
          DeFi Staking
        </CardTitle>
        <CardDescription className="text-gray-400">
          Stake SBETS tokens to earn yield and increase dividends
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="stake-amount" className="text-sm text-gray-300">Amount to Stake</label>
              <Badge className="bg-[#1e3a3f] text-[#00ffff] border-none">SBETS</Badge>
            </div>
            <div className="space-y-2">
              <Input
                id="stake-amount"
                type="number"
                min="1"
                value={stakeAmount}
                onChange={handleAmountChange}
                className="bg-[#0b1618] border-[#1e3a3f] text-white"
              />
              <div className="flex justify-between gap-2">
                {[100, 500, 1000, 5000].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    className="flex-1 px-2 py-0 text-xs bg-[#0b1618] border-[#1e3a3f] text-gray-300 hover:bg-[#1e3a3f] hover:text-[#00ffff]"
                    onClick={() => setStakeAmount(amount)}
                  >
                    {amount}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm text-gray-300">Staking Period</label>
              <div className="flex items-center">
                <Badge className="bg-[#1e3a3f] text-[#00ffff] border-none mr-2">
                  {selectedPeriod} Days
                </Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-gray-400">
                        <Info className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#0b1618] border-[#1e3a3f] text-white">
                      <p className="text-xs">Longer staking periods offer higher APY</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between gap-2">
                {stakingOptions.map((option) => (
                  <Button
                    key={option.periodDays}
                    variant={selectedPeriod === option.periodDays ? "default" : "outline"}
                    className={`flex-1 px-2 py-1 ${
                      selectedPeriod === option.periodDays 
                        ? 'bg-[#00ffff] text-[#112225]' 
                        : 'bg-[#0b1618] text-gray-300 border-[#1e3a3f] hover:bg-[#1e3a3f] hover:text-[#00ffff]'
                    }`}
                    onClick={() => handlePeriodChange(option.periodDays)}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-xs">{option.periodDays} Days</span>
                      <span className="text-xs font-bold">{option.apy}% APY</span>
                    </div>
                  </Button>
                ))}
              </div>
              
              <div className="bg-[#0b1618] rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-300 mr-2" />
                    <span className="text-sm text-gray-300">Unlock Date:</span>
                  </div>
                  <span className="text-sm text-[#00ffff]">{calculateUnlockDate()}</span>
                </div>
              </div>
            </div>
          </div>
          
          <Separator className="bg-[#1e3a3f]" />
          
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white">Estimated Returns</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0b1618] rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">APY</div>
                <div className="text-lg font-semibold text-[#00ffff]">
                  {estimateApr()}%
                </div>
              </div>
              
              <div className="bg-[#0b1618] rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Estimated Reward</div>
                <div className="text-lg font-semibold text-[#00ffff]">
                  {calculateReward()} SBETS
                </div>
              </div>
            </div>
            
            <div className="bg-[#1e3a3f] rounded-lg p-3">
              <div className="flex items-start">
                <Info className="h-4 w-4 text-yellow-300 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-300">
                  Staked tokens are locked for the entire staking period. Early unstaking is not supported in the Walrus protocol.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button
          className="w-full bg-[#00ffff] text-[#112225] hover:bg-cyan-300 relative"
          disabled={isStaking || stakeAmount <= 0}
          onClick={handleStake}
        >
          {isStaking ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Staking Tokens...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Stake {stakeAmount} SBETS for {selectedPeriod} Days
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}