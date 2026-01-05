import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useBlockchainAuth } from '@/hooks/useBlockchainAuth';
import { Loader2, ArrowLeft, TrendingUp, Award, Timer, ChevronRight, BarChart3, ArrowDown, ArrowUp, PiggyBank, Wallet, HelpCircle, Target, Trophy, Landmark, CheckCircle2, Lightbulb, Play, Calculator, AlertCircle } from 'lucide-react';
import { useLocation } from 'wouter';

// Types for staking pools
interface StakingPool {
  id: string;
  name: string;
  icon: React.ReactNode;
  apr: number;
  description: string;
  lockPeriod: number; // in days
  totalStaked: number;
  token: 'SUI' | 'SBETS';
  minStake: number;
  outcomeRelated?: boolean;
  outcomeDescription?: string;
  eventName?: string;
  additionalYield?: number;
}

// Types for user staking positions
interface StakingPosition {
  id: string;
  poolId: string;
  poolName: string;
  amount: number;
  token: 'SUI' | 'SBETS';
  startDate: Date;
  endDate: Date;
  rewards: number;
  status: 'active' | 'locked' | 'completed';
}

// Mock data for staking pools
const STAKING_POOLS: StakingPool[] = [
  // Traditional staking pools
  {
    id: 'sui-flexible',
    name: 'SUI Flexible',
    icon: <Wallet className="h-5 w-5 text-[#00ffff]" />,
    apr: 7.5,
    description: 'Stake SUI with no lock period. Withdraw anytime with 0.5% fee. Earn passive income regardless of market outcomes.',
    lockPeriod: 0,
    totalStaked: 125000,
    token: 'SUI',
    minStake: 1
  },
  {
    id: 'sui-locked',
    name: 'SUI Locked',
    icon: <PiggyBank className="h-5 w-5 text-[#00ffff]" />,
    apr: 12.8,
    description: 'Stake SUI for 30 days. Higher APR but locked funds. Earn passive income regardless of market outcomes.',
    lockPeriod: 30,
    totalStaked: 345000,
    token: 'SUI',
    minStake: 5
  },
  {
    id: 'sbets-flexible',
    name: 'SBETS Flexible',
    icon: <Wallet className="h-5 w-5 text-amber-500" />,
    apr: 15.2,
    description: 'Stake SBETS tokens with no lock period. Withdraw anytime with 0.5% fee. Earn passive income regardless of market outcomes.',
    lockPeriod: 0,
    totalStaked: 78000,
    token: 'SBETS',
    minStake: 10
  },
  {
    id: 'sbets-locked',
    name: 'SBETS Locked',
    icon: <PiggyBank className="h-5 w-5 text-amber-500" />,
    apr: 24.6,
    description: 'Stake SBETS for 60 days. Highest APR but longest lock period. Earn passive income regardless of market outcomes.',
    lockPeriod: 60,
    totalStaked: 220000,
    token: 'SBETS',
    minStake: 50
  },
  
  // Outcome-based staking pools
  {
    id: 'home-win-barca-real',
    name: 'Barcelona Win',
    icon: <Target className="h-5 w-5 text-[#00ffff]" />,
    apr: 28.5,
    description: 'Stake on Barcelona to win against Real Madrid. Earn 28.5% APR base yield plus 50% bonus if outcome is correct.',
    lockPeriod: 2,
    totalStaked: 87500,
    token: 'SUI',
    minStake: 10,
    outcomeRelated: true,
    outcomeDescription: 'Barcelona to win',
    eventName: 'Barcelona vs Real Madrid',
    additionalYield: 50
  },
  {
    id: 'draw-barca-real',
    name: 'Draw Outcome',
    icon: <Target className="h-5 w-5 text-amber-500" />,
    apr: 35.2,
    description: 'Stake on a draw between Barcelona and Real Madrid. Earn 35.2% APR base yield plus 75% bonus if outcome is correct.',
    lockPeriod: 2,
    totalStaked: 32000,
    token: 'SUI',
    minStake: 10,
    outcomeRelated: true,
    outcomeDescription: 'Draw',
    eventName: 'Barcelona vs Real Madrid',
    additionalYield: 75
  },
  {
    id: 'away-win-barca-real',
    name: 'Real Madrid Win',
    icon: <Target className="h-5 w-5 text-green-500" />,
    apr: 30.6,
    description: 'Stake on Real Madrid to win against Barcelona. Earn 30.6% APR base yield plus 60% bonus if outcome is correct.',
    lockPeriod: 2,
    totalStaked: 62000,
    token: 'SUI',
    minStake: 10,
    outcomeRelated: true,
    outcomeDescription: 'Real Madrid to win',
    eventName: 'Barcelona vs Real Madrid',
    additionalYield: 60
  },
  {
    id: 'nba-lakers-win',
    name: 'Lakers Win',
    icon: <Trophy className="h-5 w-5 text-purple-500" />,
    apr: 25.3,
    description: 'Stake on Lakers to win against Celtics. Earn 25.3% APR base yield plus 45% bonus if outcome is correct.',
    lockPeriod: 1,
    totalStaked: 43800,
    token: 'SBETS',
    minStake: 25,
    outcomeRelated: true,
    outcomeDescription: 'Lakers to win',
    eventName: 'Lakers vs Celtics',
    additionalYield: 45
  }
];

export function StakingSection() {
  const { toast } = useToast();
  const { user } = useBlockchainAuth();
  const [selectedPool, setSelectedPool] = useState<StakingPool | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [stakingPositions, setStakingPositions] = useState<StakingPosition[]>([]);
  const [showUnstakeModal, setShowUnstakeModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<StakingPosition | null>(null);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [showHowItWorksDialog, setShowHowItWorksDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'pools' | 'your-stakes'>('pools');
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [availableEvents, setAvailableEvents] = useState<{id: string, name: string, sport: string}[]>([]);
  
  // Calculate totals for user dashboard
  const totalStaked = stakingPositions.reduce((sum, position) => sum + position.amount, 0);
  const totalRewards = stakingPositions.reduce((sum, position) => sum + position.rewards, 0);
  
  // Load events for outcome-based staking pools
  useEffect(() => {
    // This would fetch upcoming events from API in a real app
    const sampleEvents = [
      { id: 'soccer-1', name: 'Barcelona vs Real Madrid', sport: 'soccer' },
      { id: 'soccer-2', name: 'Manchester United vs Liverpool', sport: 'soccer' },
      { id: 'basketball-1', name: 'Lakers vs Celtics', sport: 'basketball' },
      { id: 'basketball-2', name: 'Bulls vs Warriors', sport: 'basketball' },
      { id: 'tennis-1', name: 'Djokovic vs Nadal', sport: 'tennis' },
      { id: 'tennis-2', name: 'Federer vs Murray', sport: 'tennis' },
      { id: 'boxing-1', name: 'Joshua vs Fury', sport: 'boxing' },
      { id: 'mma-1', name: 'Jones vs Ngannou', sport: 'mma' },
      { id: 'cricket-1', name: 'India vs Australia', sport: 'cricket' },
      { id: 'american-football-1', name: 'Chiefs vs Eagles', sport: 'american-football' }
    ];
    
    setAvailableEvents(sampleEvents);
  }, []);

  // Load user staking positions (mock)
  useEffect(() => {
    if (user?.authenticated) {
      // In a real app, this would be fetched from the blockchain
      const mockPositions: StakingPosition[] = [
        {
          id: 'pos-1',
          poolId: 'sui-flexible',
          poolName: 'SUI Flexible',
          amount: 25,
          token: 'SUI',
          startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
          rewards: 0.28,
          status: 'active'
        },
        {
          id: 'pos-2',
          poolId: 'sbets-locked',
          poolName: 'SBETS Locked',
          amount: 150,
          token: 'SBETS',
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          rewards: 9.23,
          status: 'locked'
        }
      ];
      
      setStakingPositions(mockPositions);
    }
  }, [user]);
  
  const handleStakeClick = (pool: StakingPool) => {
    if (!user?.authenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please connect your wallet to stake in this pool.',
        variant: 'destructive'
      });
      return;
    }
    
    setSelectedPool(pool);
    setStakeAmount('');
    setShowStakeModal(true);
  };
  
  const handleStakeSubmit = async () => {
    if (!selectedPool) return;
    
    const amount = parseFloat(stakeAmount);
    
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid staking amount.',
        variant: 'destructive'
      });
      return;
    }
    
    if (amount < selectedPool.minStake) {
      toast({
        title: 'Below Minimum Stake',
        description: `Minimum stake amount is ${selectedPool.minStake} ${selectedPool.token}.`,
        variant: 'destructive'
      });
      return;
    }
    
    // Check user balance
    if (selectedPool.token === 'SUI' && user?.suiBalance && amount > user.suiBalance) {
      toast({
        title: 'Insufficient Balance',
        description: `You don't have enough SUI tokens. Current balance: ${user.suiBalance.toFixed(2)} SUI`,
        variant: 'destructive'
      });
      return;
    }
    
    if (selectedPool.token === 'SBETS' && user?.sbetsBalance && amount > user.sbetsBalance) {
      toast({
        title: 'Insufficient Balance',
        description: `You don't have enough SBETS tokens. Current balance: ${user.sbetsBalance.toFixed(2)} SBETS`,
        variant: 'destructive'
      });
      return;
    }
    
    setIsStaking(true);
    
    try {
      // Simulate blockchain transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create new staking position
      const now = new Date();
      const endDate = new Date(now.getTime() + selectedPool.lockPeriod * 24 * 60 * 60 * 1000);
      
      const newPosition: StakingPosition = {
        id: `pos-${Date.now()}`,
        poolId: selectedPool.id,
        poolName: selectedPool.name,
        amount,
        token: selectedPool.token,
        startDate: now,
        endDate,
        rewards: 0,
        status: selectedPool.lockPeriod > 0 ? 'locked' : 'active'
      };
      
      setStakingPositions(prev => [...prev, newPosition]);
      
      toast({
        title: 'Staking Successful',
        description: `Successfully staked ${amount} ${selectedPool.token} in ${selectedPool.name} pool.`,
        variant: 'default'
      });
      
      setActiveTab('your-stakes');
      setShowStakeModal(false);
    } catch (error) {
      console.error('Error staking tokens:', error);
      toast({
        title: 'Staking Failed',
        description: 'There was an error processing your staking request. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsStaking(false);
    }
  };
  
  const handleUnstakeClick = (position: StakingPosition) => {
    setSelectedPosition(position);
    setShowUnstakeModal(true);
  };
  
  const handleUnstake = async () => {
    if (!selectedPosition) return;
    
    setIsUnstaking(true);
    
    try {
      // Simulate blockchain transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Remove position from list
      setStakingPositions(prev => prev.filter(p => p.id !== selectedPosition.id));
      
      const fee = selectedPosition.status === 'locked' ? 0.05 : 0.005; // 5% for locked, 0.5% for active
      const feeAmount = selectedPosition.amount * fee;
      const netAmount = selectedPosition.amount - feeAmount;
      
      toast({
        title: 'Unstaking Successful',
        description: `Successfully unstaked ${netAmount.toFixed(2)} ${selectedPosition.token} from ${selectedPosition.poolName} pool. Fee: ${feeAmount.toFixed(2)} ${selectedPosition.token}.`,
        variant: 'default'
      });
      
      setShowUnstakeModal(false);
    } catch (error) {
      console.error('Error unstaking tokens:', error);
      toast({
        title: 'Unstaking Failed',
        description: 'There was an error processing your unstaking request. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUnstaking(false);
    }
  };
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };
  
  const calculateTimeRemaining = (endDate: Date) => {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    
    if (diff <= 0) return 'Completed';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${days}d ${hours}h remaining`;
  };
  
  const calculateProgress = (startDate: Date, endDate: Date) => {
    const now = new Date();
    const total = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    
    if (total <= 0) return 100;
    
    const progress = (elapsed / total) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };
  
  return (
    <div className="container max-w-6xl mx-auto p-4">
      <div className="mb-6 flex items-center">
        <Button 
          variant="outline" 
          size="icon" 
          className="mr-2 bg-[#0b1618] border-[#1e3a3f] hover:bg-[#1e3a3f] text-[#00ffff]"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-white">DeFi Staking</h1>
      </div>
      
      {/* Staking Dashboard */}
      {user?.authenticated && (
        <Card className="bg-[#112225] border-[#1e3a3f] text-white mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#0b1618] border border-[#1e3a3f] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-400 text-sm">Total Staked Value</h3>
                  <PiggyBank className="h-5 w-5 text-[#00ffff]" />
                </div>
                <p className="text-2xl font-bold text-white">
                  {totalStaked.toFixed(2)}
                  <span className="text-sm text-gray-400 ml-1">Tokens</span>
                </p>
              </div>
              
              <div className="bg-[#0b1618] border border-[#1e3a3f] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-400 text-sm">Current Rewards</h3>
                  <Award className="h-5 w-5 text-amber-500" />
                </div>
                <p className="text-2xl font-bold text-white">
                  {totalRewards.toFixed(2)}
                  <span className="text-sm text-gray-400 ml-1">Tokens</span>
                </p>
              </div>
              
              <div className="bg-[#0b1618] border border-[#1e3a3f] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-400 text-sm">Active Positions</h3>
                  <BarChart3 className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-white">
                  {stakingPositions.length}
                  <span className="text-sm text-gray-400 ml-1">Pools</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Staking Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pools' | 'your-stakes')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-[#0b1618] border border-[#1e3a3f]">
          <TabsTrigger 
            value="pools" 
            className="data-[state=active]:bg-[#1e3a3f] data-[state=active]:text-[#00ffff]"
          >
            Staking Pools
          </TabsTrigger>
          <TabsTrigger 
            value="your-stakes" 
            className="data-[state=active]:bg-[#1e3a3f] data-[state=active]:text-[#00ffff]"
          >
            Your Stakes
          </TabsTrigger>
        </TabsList>
        
        {/* Pools Tab */}
        <TabsContent value="pools" className="mt-4 space-y-8">
          {/* Standard Staking Pools Section */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Landmark className="h-5 w-5 mr-2 text-[#00ffff]" />
              Standard Staking Pools
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {STAKING_POOLS.filter(pool => !pool.outcomeRelated).map((pool) => (
                <Card key={pool.id} className="bg-[#112225] border-[#1e3a3f] text-white hover:shadow-[0_0_10px_rgba(0,255,255,0.1)]">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {pool.icon}
                        <CardTitle className="ml-2 text-lg">{pool.name}</CardTitle>
                      </div>
                      <div className="flex items-center bg-[#0b1618] px-3 py-1 rounded-full border border-[#1e3a3f]">
                        <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-green-500 font-medium">{pool.apr}% APR</span>
                      </div>
                    </div>
                    <CardDescription className="text-gray-400">
                      {pool.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Lock Period:</span>
                        <span className="text-white">
                          {pool.lockPeriod === 0 ? 'Flexible' : `${pool.lockPeriod} days`}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Min Stake:</span>
                        <span className="text-white">{pool.minStake} {pool.token}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Total Staked:</span>
                        <span className="text-white">{pool.totalStaked.toLocaleString()} {pool.token}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={() => handleStakeClick(pool)}
                      className="w-full bg-[#1e3a3f] hover:bg-[#254249] text-[#00ffff] border-[#1e3a3f]"
                    >
                      Stake {pool.token}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
          
          {/* Outcome-Based Staking Pools Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <Target className="h-5 w-5 mr-2 text-[#00ffff]" />
                Outcome-Based Yield Farming
                <div className="ml-2 px-2.5 py-0.5 bg-[#1e3a3f] rounded-full text-xs font-medium text-[#00ffff]">New</div>
              </h2>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-[#0b1618] border-[#1e3a3f] text-cyan-400 hover:bg-[#1e3a3f]"
                onClick={() => setShowHowItWorksDialog(true)}
              >
                <HelpCircle className="h-4 w-4 mr-1" />
                How it works
              </Button>
            </div>
            
            <div className="bg-[#0b1618] border border-[#1e3a3f] rounded-lg p-4 mb-4">
              <p className="text-gray-300 text-sm">
                Stake on event outcomes while earning yield! These special pools provide a base APR regardless of the outcome, 
                plus bonus rewards if your chosen outcome is correct. Your principal is always safe and earning.
              </p>
            </div>
            
            {/* Sport Filter */}
            <div className="mb-6">
              <div className="text-sm text-gray-300 mb-2">Filter by Sport:</div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className={`${selectedSport === 'all' 
                    ? 'bg-[#1e3a3f] text-[#00ffff]' 
                    : 'bg-[#0b1618] text-gray-300'} border-[#1e3a3f] hover:bg-[#1e3a3f]`}
                  onClick={() => setSelectedSport('all')}
                >
                  All Sports
                </Button>
                {Array.from(new Set(availableEvents.map(e => e.sport))).map(sport => (
                  <Button 
                    key={sport}
                    variant="outline" 
                    size="sm"
                    className={`${selectedSport === sport 
                      ? 'bg-[#1e3a3f] text-[#00ffff]' 
                      : 'bg-[#0b1618] text-gray-300'} border-[#1e3a3f] hover:bg-[#1e3a3f]`}
                    onClick={() => setSelectedSport(sport)}
                  >
                    {sport.charAt(0).toUpperCase() + sport.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {STAKING_POOLS.filter(pool => {
                if (!pool.outcomeRelated) return false;
                if (selectedSport === 'all') return true;
                
                // Find the event that matches this pool's event name
                const event = availableEvents.find(e => e.name === pool.eventName);
                return event && event.sport === selectedSport;
              }).map((pool) => (
                <Card key={pool.id} className="bg-[#112225] border-[#1e3a3f] text-white hover:shadow-[0_0_10px_rgba(0,255,255,0.1)]">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {pool.icon}
                        <CardTitle className="ml-2 text-lg">{pool.name}</CardTitle>
                      </div>
                      <div className="flex items-center bg-[#0b1618] px-3 py-1 rounded-full border border-[#1e3a3f]">
                        <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-green-500 font-medium">{pool.apr}% APR</span>
                      </div>
                    </div>
                    <CardDescription className="text-gray-400">
                      {pool.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="bg-[#1e3a3f]/30 rounded-md p-3 mb-3 border border-[#1e3a3f]">
                      <div className="flex justify-between mb-1.5 text-sm">
                        <span className="text-gray-300">Event:</span>
                        <span className="text-white font-medium">{pool.eventName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Your Outcome:</span>
                        <span className="text-[#00ffff] font-medium">{pool.outcomeDescription}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Bonus if Correct:</span>
                        <span className="text-green-400 font-medium">+{pool.additionalYield}% APR</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Lock Period:</span>
                        <span className="text-white">{pool.lockPeriod} days</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Min Stake:</span>
                        <span className="text-white">{pool.minStake} {pool.token}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Total Liquidity:</span>
                        <span className="text-white">{pool.totalStaked.toLocaleString()} {pool.token}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={() => handleStakeClick(pool)}
                      className="w-full bg-gradient-to-r from-[#1e3a3f] to-[#254249] hover:from-[#254249] hover:to-[#2a4e55] text-[#00ffff] border-[#1e3a3f]"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Stake on Outcome
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
        
        {/* Your Stakes Tab */}
        <TabsContent value="your-stakes" className="mt-4">
          {!user?.authenticated ? (
            <Card className="bg-[#112225] border-[#1e3a3f] text-white">
              <CardContent className="pt-6 pb-6 flex flex-col items-center">
                <Wallet className="h-12 w-12 text-[#1e3a3f] mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Connect Your Wallet</h3>
                <p className="text-gray-400 text-center mb-4">
                  Please connect your wallet to view your staking positions and rewards.
                </p>
                <Button 
                  className="bg-[#00ffff] hover:bg-cyan-300 text-[#112225]"
                  onClick={() => {
                    // Dispatch an event to trigger the wallet modal
                    const event = new CustomEvent('suibets:connect-wallet-required');
                    window.dispatchEvent(event);
                  }}
                >
                  Connect Wallet
                </Button>
              </CardContent>
            </Card>
          ) : stakingPositions.length === 0 ? (
            <Card className="bg-[#112225] border-[#1e3a3f] text-white">
              <CardContent className="pt-6 pb-6 flex flex-col items-center">
                <PiggyBank className="h-12 w-12 text-[#1e3a3f] mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Active Stakes</h3>
                <p className="text-gray-400 text-center mb-4">
                  You don't have any active staking positions. Start staking to earn rewards!
                </p>
                <Button 
                  onClick={() => setActiveTab('pools')}
                  className="bg-[#00ffff] hover:bg-cyan-300 text-[#112225]"
                >
                  Explore Staking Pools
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {stakingPositions.map((position) => (
                <Card key={position.id} className="bg-[#112225] border-[#1e3a3f] text-white overflow-hidden">
                  <div className={`h-1 ${position.token === 'SUI' ? 'bg-[#00ffff]' : 'bg-amber-500'}`}></div>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-white flex items-center">
                          {position.poolName}
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                            position.status === 'locked' 
                              ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50' 
                              : 'bg-green-500/20 text-green-500 border border-green-500/50'
                          }`}>
                            {position.status === 'locked' ? 'Locked' : 'Flexible'}
                          </span>
                        </h3>
                        <p className="text-gray-400 text-sm">
                          Started {formatDate(position.startDate)}
                        </p>
                      </div>
                      <div className="mt-2 md:mt-0">
                        <p className="text-xl font-bold text-white">
                          {position.amount.toFixed(2)} {position.token}
                        </p>
                        <p className="text-green-500 text-sm flex items-center">
                          <ArrowUp className="h-3 w-3 mr-1" />
                          {position.rewards.toFixed(4)} {position.token} earned
                        </p>
                      </div>
                    </div>
                    
                    {position.status === 'locked' && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400 flex items-center">
                            <Timer className="h-3 w-3 mr-1" />
                            {calculateTimeRemaining(position.endDate)}
                          </span>
                          <span className="text-gray-400">
                            Ends {formatDate(position.endDate)}
                          </span>
                        </div>
                        <Progress
                          value={calculateProgress(position.startDate, position.endDate)}
                          className="h-2 bg-[#1e3a3f]"
                        />
                      </div>
                    )}
                    
                    <div className="flex justify-end">
                      <Button
                        onClick={() => handleUnstakeClick(position)}
                        variant="outline"
                        size="sm"
                        className="border-[#1e3a3f] text-[#00ffff] hover:bg-[#1e3a3f]"
                        disabled={position.status === 'locked'}
                      >
                        {position.status === 'locked' ? 'Locked' : 'Unstake'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Stake Modal */}
      <Dialog open={showStakeModal} onOpenChange={setShowStakeModal}>
        <DialogContent className="bg-[#112225] border-[#1e3a3f] text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center">
              {selectedPool?.outcomeRelated ? (
                <>
                  <Target className="h-5 w-5 mr-2 text-[#00ffff]" />
                  Outcome-Based Staking
                </>
              ) : (
                <>Stake {selectedPool?.token}</>
              )}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedPool?.outcomeRelated ? (
                <>Stake on "{selectedPool?.outcomeDescription}" for {selectedPool?.eventName}</>
              ) : (
                <>Stake your tokens to earn {selectedPool?.apr}% APR.</>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPool?.outcomeRelated && (
            <div className="bg-gradient-to-r from-[#1e3a3f]/50 to-[#254249]/50 p-3 rounded-md border border-[#1e3a3f] mb-3">
              <h4 className="text-[#00ffff] text-sm font-medium mb-2 flex items-center">
                <HelpCircle className="h-4 w-4 mr-1.5" />
                How Outcome-Based Staking Works
              </h4>
              <ul className="text-xs text-gray-300 space-y-1.5 list-disc pl-4">
                <li>Your stake earns a <span className="text-green-400 font-medium">{selectedPool.apr}% base APR</span> regardless of the event outcome</li>
                <li>If your outcome is correct, you earn an <span className="text-green-400 font-medium">additional {selectedPool.additionalYield}% APR bonus</span></li>
                <li>Your principal amount is always safe and will be returned when you unstake</li>
                <li>Minimum lock period is {selectedPool.lockPeriod} days (until event resolution)</li>
              </ul>
            </div>
          )}
          
          <div className="space-y-4 my-2">
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-medium text-gray-200">
                  Amount to Stake
                </label>
                <span className="text-xs text-gray-400">
                  Available: {selectedPool?.token === 'SUI' ? 
                    user?.suiBalance?.toFixed(2) || '0.00' : 
                    user?.sbetsBalance?.toFixed(2) || '0.00'
                  } {selectedPool?.token}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="bg-[#0b1618] border-[#1e3a3f] text-white"
                />
                <span className="text-[#00ffff] font-medium">
                  {selectedPool?.token}
                </span>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="link"
                  className="p-0 h-auto text-xs text-[#00ffff]"
                  onClick={() => {
                    if (selectedPool?.token === 'SUI' && user?.suiBalance) {
                      setStakeAmount(user.suiBalance.toString());
                    } else if (selectedPool?.token === 'SBETS' && user?.sbetsBalance) {
                      setStakeAmount(user.sbetsBalance.toString());
                    }
                  }}
                >
                  Max
                </Button>
              </div>
            </div>
            
            {selectedPool && parseFloat(stakeAmount) > 0 && (
              <div className="rounded-lg border border-[#1e3a3f] p-3 bg-[#0b1618]">
                <h4 className="text-sm font-medium text-white mb-2">Staking Summary</h4>
                <div className="space-y-1 text-xs">
                  {selectedPool.outcomeRelated && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Event:</span>
                        <span className="text-white">{selectedPool.eventName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Your Outcome:</span>
                        <span className="text-[#00ffff]">{selectedPool.outcomeDescription}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pool:</span>
                    <span className="text-white">{selectedPool.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Lock Period:</span>
                    <span className="text-white">
                      {selectedPool.lockPeriod === 0 ? 'Flexible' : `${selectedPool.lockPeriod} days`}
                    </span>
                  </div>
                  
                  {selectedPool.outcomeRelated ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Base APR:</span>
                        <span className="text-green-500">{selectedPool.apr}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Bonus if Correct:</span>
                        <span className="text-green-500">+{selectedPool.additionalYield}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Est. Base Monthly Reward:</span>
                        <span className="text-green-500">
                          {((parseFloat(stakeAmount) * selectedPool.apr / 100) / 12).toFixed(4)} {selectedPool.token}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Potential Bonus:</span>
                        <span className="text-green-500">
                          +{((parseFloat(stakeAmount) * selectedPool.additionalYield / 100) / 12).toFixed(4)} {selectedPool.token}/mo
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">APR:</span>
                        <span className="text-green-500">{selectedPool.apr}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Est. Monthly Reward:</span>
                        <span className="text-green-500">
                          {((parseFloat(stakeAmount) * selectedPool.apr / 100) / 12).toFixed(4)} {selectedPool.token}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              className="border-[#1e3a3f] text-gray-400 hover:bg-[#1e3a3f]"
              onClick={() => setShowStakeModal(false)}
              disabled={isStaking}
            >
              Cancel
            </Button>
            <Button
              className={selectedPool?.outcomeRelated 
                ? "bg-gradient-to-r from-[#00d8d8] to-[#00ffff] hover:from-[#00c3c3] hover:to-[#00e6e6] text-[#112225]" 
                : "bg-[#00ffff] hover:bg-cyan-300 text-[#112225]"
              }
              onClick={handleStakeSubmit}
              disabled={isStaking || !stakeAmount || parseFloat(stakeAmount) <= 0}
            >
              {isStaking ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
              ) : selectedPool?.outcomeRelated ? (
                <>
                  <Target className="h-4 w-4 mr-2" />
                  Stake on Outcome
                </>
              ) : (
                'Stake'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Unstake Modal */}
      <Dialog open={showUnstakeModal} onOpenChange={setShowUnstakeModal}>
        <DialogContent className="bg-[#112225] border-[#1e3a3f] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Unstake {selectedPosition?.token}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Unstake your tokens from the {selectedPosition?.poolName} pool.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPosition && (
            <div className="space-y-4 my-2">
              <div className="rounded-lg border border-[#1e3a3f] p-3 bg-[#0b1618]">
                <h4 className="text-sm font-medium text-white mb-2">Unstaking Summary</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount:</span>
                    <span className="text-white">{selectedPosition.amount.toFixed(2)} {selectedPosition.token}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rewards:</span>
                    <span className="text-green-500">{selectedPosition.rewards.toFixed(4)} {selectedPosition.token}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Unstaking Fee:</span>
                    <span className="text-amber-500">
                      {(selectedPosition.amount * (selectedPosition.status === 'locked' ? 0.05 : 0.005)).toFixed(4)} {selectedPosition.token}
                      <span className="text-xs ml-1">({selectedPosition.status === 'locked' ? '5%' : '0.5%'})</span>
                    </span>
                  </div>
                  <div className="flex justify-between font-medium mt-2 pt-2 border-t border-[#1e3a3f]">
                    <span className="text-gray-400">You Will Receive:</span>
                    <span className="text-white">
                      {(selectedPosition.amount - (selectedPosition.amount * (selectedPosition.status === 'locked' ? 0.05 : 0.005))).toFixed(4)} {selectedPosition.token}
                    </span>
                  </div>
                </div>
              </div>
              
              {selectedPosition.status === 'locked' && (
                <div className="rounded-lg border border-amber-500/30 p-3 bg-amber-500/10">
                  <div className="flex items-start">
                    <HelpCircle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-500">
                      This position is still locked. Early unstaking will incur a 5% penalty fee instead of the standard 0.5% fee.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              className="border-[#1e3a3f] text-gray-400 hover:bg-[#1e3a3f]"
              onClick={() => setShowUnstakeModal(false)}
              disabled={isUnstaking}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#00ffff] hover:bg-cyan-300 text-[#112225]"
              onClick={handleUnstake}
              disabled={isUnstaking}
            >
              {isUnstaking ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                'Unstake'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* How It Works Dialog */}
      <Dialog open={showHowItWorksDialog} onOpenChange={setShowHowItWorksDialog}>
        <DialogContent className="bg-[#112225] border-[#1e3a3f] text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center">
              <Target className="h-5 w-5 mr-2 text-[#00ffff]" />
              Outcome-Based Yield Farming
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              A revolutionary DeFi feature that combines sports betting outcomes with traditional yield farming
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-2">
            <div className="bg-[#0b1618] border border-[#1e3a3f] rounded-lg p-4">
              <h3 className="text-white font-medium mb-2 flex items-center">
                <Lightbulb className="h-4 w-4 mr-2 text-amber-500" />
                What is Outcome-Based Yield Farming?
              </h3>
              <p className="text-gray-300 text-sm">
                Outcome-Based Yield Farming is a unique staking model that bridges DeFi yields with sports betting outcomes. 
                It allows you to stake your tokens on sports event outcomes while earning guaranteed base APR, with potential 
                bonus rewards if your chosen outcome is correct. Unlike traditional sports betting, your principal is always 
                safe and earning yield, regardless of the outcome.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0b1618] border border-[#1e3a3f] rounded-lg p-4">
                <h3 className="text-white font-medium mb-2 flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                  Key Benefits
                </h3>
                <ul className="text-gray-300 text-sm space-y-2 list-disc pl-5">
                  <li><span className="text-white">Risk-Free Principal</span> - Your staked tokens are always returned regardless of the outcome</li>
                  <li><span className="text-white">Guaranteed Yield</span> - Earn base APR even if your outcome prediction is wrong</li>
                  <li><span className="text-white">Outcome Bonuses</span> - Receive significant APR bonuses when your prediction is correct</li>
                  <li><span className="text-white">Diversified Exposure</span> - Combine DeFi yields with sports outcome predictions</li>
                  <li><span className="text-white">Blockchain Security</span> - All pools are secured by the Sui blockchain</li>
                </ul>
              </div>
              
              <div className="bg-[#0b1618] border border-[#1e3a3f] rounded-lg p-4">
                <h3 className="text-white font-medium mb-2 flex items-center">
                  <Play className="h-4 w-4 mr-2 text-[#00ffff]" />
                  How It Works
                </h3>
                <ol className="text-gray-300 text-sm space-y-2 list-decimal pl-5">
                  <li>Choose an outcome-based staking pool for a specific event</li>
                  <li>Stake your SUI or SBETS tokens on your chosen outcome</li>
                  <li>Your tokens immediately start earning the base APR yield</li>
                  <li>Tokens are locked until the event is completed</li>
                  <li>After the event, if your outcome was correct, you receive the base APR plus the outcome bonus</li>
                  <li>If your outcome was incorrect, you still receive the base APR</li>
                  <li>Your principal amount is returned in full once the lock period ends</li>
                </ol>
              </div>
            </div>
            
            <div className="bg-[#0b1618] border border-[#1e3a3f] rounded-lg p-4">
              <h3 className="text-white font-medium mb-2 flex items-center">
                <Calculator className="h-4 w-4 mr-2 text-amber-500" />
                Yield Example
              </h3>
              <div className="space-y-3">
                <p className="text-gray-300 text-sm">
                  Let's say you stake 100 SUI tokens on Barcelona to win against Real Madrid:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-[#1e3a3f] rounded-lg p-3">
                    <h4 className="text-[#00ffff] text-sm font-medium mb-2">If Barcelona Wins</h4>
                    <ul className="text-gray-300 text-sm space-y-1.5">
                      <li>• Base yield: 28.4% APR</li>
                      <li>• Outcome bonus: +50% APR</li>
                      <li>• Total APR: 78.4%</li>
                      <li>• 2-day lock period rewards: ~0.43 SUI</li>
                      <li>• Return: 100 SUI principal + 0.43 SUI reward</li>
                    </ul>
                  </div>
                  <div className="border border-[#1e3a3f] rounded-lg p-3">
                    <h4 className="text-amber-500 text-sm font-medium mb-2">If Barcelona Doesn't Win</h4>
                    <ul className="text-gray-300 text-sm space-y-1.5">
                      <li>• Base yield: 28.4% APR</li>
                      <li>• Outcome bonus: 0% APR</li>
                      <li>• Total APR: 28.4%</li>
                      <li>• 2-day lock period rewards: ~0.16 SUI</li>
                      <li>• Return: 100 SUI principal + 0.16 SUI reward</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-[#1e3a3f]/40 to-[#254249]/40 rounded-lg p-4 border border-[#1e3a3f]">
              <h3 className="text-white font-medium mb-2 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                Risk Considerations
              </h3>
              <ul className="text-gray-300 text-sm space-y-1.5 list-disc pl-5">
                <li>Your principal is safe, but your tokens are locked until the lock period ends</li>
                <li>Early unstaking before the lock period isn't possible</li>
                <li>Event cancellations or postponements could extend lock periods</li>
                <li>APR rates are annualized - actual earnings depend on lock period duration</li>
                <li>Always review pool details and event information before staking</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button 
              className="bg-[#00ffff] hover:bg-cyan-300 text-[#112225]"
              onClick={() => setShowHowItWorksDialog(false)}
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}