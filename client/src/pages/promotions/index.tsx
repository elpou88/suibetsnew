import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Users, Star, Coins, ArrowLeft, Check, Copy, Wallet, Lock, Unlock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface FreeBetStatus {
  freeBetBalance: number;
  welcomeBonusClaimed: boolean;
  welcomeBonusAmount: number;
  loyaltyPoints: number;
}

interface StakingInfo {
  treasuryPool: number;
  totalStaked: number;
  apyRate: number;
  userStaked: number;
  userRewards: number;
  userStakes: Array<{
    id: number;
    amount: number;
    stakedAt: string;
    lockedUntil: string;
    accumulatedRewards: number;
    canUnstake: boolean;
  }>;
  minStake: number;
  lockPeriod: string;
}

interface LoyaltyStatus {
  points: number;
  tier: string;
  nextTier: string;
  pointsToNext: number;
  perks: string[];
}

interface ReferralStats {
  code: string;
  link: string;
  totalReferrals: number;
  qualifiedReferrals: number;
  pendingReferrals: number;
  totalEarned: number;
}

const SBETS_TYPE = '0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285::sbets::SBETS';
const PLATFORM_TREASURY = '0x20850db591c4d575b5238baf975e54580d800e69b8b5b421de796a311d3bea50';

export default function PromotionsPage() {
  const [, setLocation] = useLocation();
  const currentAccount = useCurrentAccount();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [stakeAmount, setStakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);
  
  const suiClient = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const walletAddress = currentAccount?.address;
  
  const { data: stakingInfo, refetch: refetchStaking } = useQuery<StakingInfo>({
    queryKey: ['/api/staking/info', walletAddress],
    queryFn: async () => {
      const res = await fetch(`/api/staking/info?wallet=${walletAddress || ''}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });
  
  const handleStake = async () => {
    if (!walletAddress) {
      toast({ title: "Connect wallet first", variant: "destructive" });
      return;
    }
    const amount = parseInt(stakeAmount);
    if (!amount || amount < 100000) {
      toast({ title: "Minimum stake is 100,000 SBETS", variant: "destructive" });
      return;
    }
    setIsStaking(true);
    try {
      // SBETS has 9 decimals like SUI - convert to smallest units
      const amountInSmallestUnits = BigInt(amount) * BigInt(1_000_000_000);
      
      console.log('[Staking] Amount requested:', amount, 'SBETS');
      console.log('[Staking] Amount in smallest units:', amountInSmallestUnits.toString());
      
      // Step 1: Get user's SBETS coins
      const sbetsCoins = await suiClient.getCoins({
        owner: walletAddress,
        coinType: SBETS_TYPE,
        limit: 50
      });
      
      console.log('[Staking] Found coins:', sbetsCoins.data.length);
      sbetsCoins.data.forEach((c, i) => {
        console.log(`[Staking] Coin ${i}: ${c.coinObjectId} = ${c.balance} smallest units (${Number(c.balance) / 1_000_000_000} display)`);
      });
      
      if (!sbetsCoins.data.length) {
        toast({ title: "No SBETS in wallet", description: "You need SBETS tokens to stake", variant: "destructive" });
        setIsStaking(false);
        return;
      }
      
      // Check total balance (already in smallest units from chain)
      let totalBalance = BigInt(0);
      for (const coin of sbetsCoins.data) {
        totalBalance += BigInt(coin.balance);
      }
      
      // Convert to display units for comparison (SBETS has 9 decimals like SUI)
      const totalBalanceDisplay = Number(totalBalance) / 1_000_000_000;
      console.log('[Staking] Total balance:', totalBalance.toString(), 'smallest units =', totalBalanceDisplay, 'display');
      
      if (totalBalance < amountInSmallestUnits) {
        toast({ title: "Insufficient SBETS", description: `You have ${totalBalanceDisplay.toLocaleString()} SBETS`, variant: "destructive" });
        setIsStaking(false);
        return;
      }
      
      // Find coins with non-zero balance
      const nonZeroCoins = sbetsCoins.data.filter(c => BigInt(c.balance) > 0);
      console.log('[Staking] Non-zero coins:', nonZeroCoins.length);
      
      // Find a single coin with enough balance
      const suitableCoin = nonZeroCoins.find(c => BigInt(c.balance) >= amountInSmallestUnits);
      console.log('[Staking] Suitable coin found:', suitableCoin ? suitableCoin.coinObjectId : 'NONE - will merge');
      
      // Step 2: Build transaction - match working bet code pattern exactly
      const tx = new Transaction();
      
      // Use plain number like working bet code does
      const stakeAmountMist = Math.floor(amount * 1_000_000_000);
      console.log('[Staking] Stake amount in mist:', stakeAmountMist);
      
      if (suitableCoin) {
        // Single coin has enough - just split and transfer
        console.log('[Staking] Splitting from single coin:', suitableCoin.coinObjectId);
        const [stakeCoin] = tx.splitCoins(tx.object(suitableCoin.coinObjectId), [stakeAmountMist]);
        tx.transferObjects([stakeCoin], PLATFORM_TREASURY);
      } else {
        // Need to merge coins first - only use non-zero coins
        const coinIds = nonZeroCoins.map(c => c.coinObjectId);
        console.log('[Staking] Merging coins:', coinIds);
        const primaryCoin = tx.object(coinIds[0]);
        if (coinIds.length > 1) {
          const otherCoins = coinIds.slice(1).map(id => tx.object(id));
          tx.mergeCoins(primaryCoin, otherCoins);
        }
        const [stakeCoin] = tx.splitCoins(primaryCoin, [stakeAmountMist]);
        tx.transferObjects([stakeCoin], PLATFORM_TREASURY);
      }
      
      console.log('[Staking] Transaction built, requesting signature...');
      
      // Step 3: Sign and execute
      toast({ title: "Sign transaction", description: "Approve the SBETS transfer in your wallet" });
      
      const result = await signAndExecute({
        transaction: tx,
      } as any);
      
      if (!result.digest) {
        throw new Error("Transaction failed - no digest returned");
      }
      
      // Step 4: Confirm stake with backend
      const res = await apiRequest("POST", "/api/staking/stake", { 
        walletAddress, 
        amount,
        txHash: result.digest
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Staked Successfully!", description: `${amount.toLocaleString()} SBETS locked for 7 days` });
        setStakeAmount("");
        refetchStaking();
      } else {
        toast({ title: "Staking record failed", description: data.error, variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Staking error:", error);
      toast({ title: "Staking failed", description: error.message || "Transaction rejected", variant: "destructive" });
    } finally {
      setIsStaking(false);
    }
  };
  
  const handleUnstake = async (stakeId: number) => {
    if (!walletAddress) return;
    try {
      const res = await apiRequest("POST", "/api/staking/unstake", { walletAddress, stakeId });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Unstaked!", description: `Received ${data.total?.toLocaleString()} SBETS (incl. rewards)` });
        refetchStaking();
      } else {
        toast({ title: "Unstake failed", description: data.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };
  
  const handleClaimRewards = async () => {
    if (!walletAddress) return;
    try {
      const res = await apiRequest("POST", "/api/staking/claim-rewards", { walletAddress });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Rewards Claimed!", description: data.message });
        refetchStaking();
      } else {
        toast({ title: "Claim failed", description: data.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const { data: freeBetStatus, refetch: refetchFreeBet } = useQuery<FreeBetStatus>({
    queryKey: ['/api/free-bet/status', walletAddress],
    queryFn: async () => {
      const res = await fetch(`/api/free-bet/status?wallet=${walletAddress}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!walletAddress,
  });

  const { data: loyaltyStatus } = useQuery<LoyaltyStatus>({
    queryKey: ['/api/loyalty/status', walletAddress],
    queryFn: async () => {
      const res = await fetch(`/api/loyalty/status?wallet=${walletAddress}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!walletAddress,
  });

  const { data: referralData } = useQuery<ReferralStats>({
    queryKey: ['/api/referral/code', walletAddress],
    queryFn: async () => {
      const res = await fetch(`/api/referral/code?wallet=${walletAddress}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!walletAddress,
  });

  const handleClaimWelcome = async () => {
    if (!walletAddress) {
      toast({ title: "Connect Wallet", description: "Please connect your wallet first", variant: "destructive" });
      return;
    }
    
    setIsClaiming(true);
    try {
      const res = await apiRequest("POST", "/api/free-bet/claim-welcome", { walletAddress });
      const data = await res.json();
      
      if (res.ok) {
        toast({ title: "Welcome Bonus Claimed!", description: data.message });
        refetchFreeBet();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to claim bonus", variant: "destructive" });
    } finally {
      setIsClaiming(false);
    }
  };

  const copyReferralLink = () => {
    if (referralData?.link) {
      navigator.clipboard.writeText(referralData.link);
      setCopied(true);
      toast({ title: "Copied!", description: "Referral link copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      'Bronze': 'text-amber-600',
      'Silver': 'text-gray-300',
      'Gold': 'text-yellow-400',
      'Platinum': 'text-cyan-300',
      'Diamond': 'text-purple-400'
    };
    return colors[tier] || 'text-gray-400';
  };

  return (
    <Layout title="Promotions">
      <div className="min-h-screen bg-black p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={() => setLocation('/')}
              className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="p-3 bg-gradient-to-br from-cyan-400/20 to-cyan-600/20 rounded-xl border border-cyan-500/30">
              <Gift className="h-8 w-8 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Promotions</h1>
              <p className="text-gray-400">Claim bonuses and earn rewards</p>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-green-900/30 to-green-800/10 border-green-500/30">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/20">
                  <Gift className="h-6 w-6 text-green-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-white text-xl">Welcome Bonus</CardTitle>
                  <p className="text-green-400 font-bold text-lg">1,000 SBETS</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300">
                  New to SuiBets? Claim your 1,000 SBETS welcome bonus to get started! This bonus can only be claimed once per wallet.
                </p>
                
                {walletAddress ? (
                  <div className="space-y-3">
                    {freeBetStatus?.welcomeBonusClaimed ? (
                      <div className="flex items-center gap-2 text-green-400 bg-green-500/10 p-3 rounded-lg border border-green-500/30">
                        <Check className="h-5 w-5" />
                        <span className="font-medium">Welcome bonus already claimed (one-time per wallet)</span>
                      </div>
                    ) : (
                      <Button
                        onClick={handleClaimWelcome}
                        disabled={isClaiming}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-3"
                        data-testid="btn-claim-welcome"
                      >
                        {isClaiming ? 'Claiming...' : 'CLAIM 1,000 SBETS'}
                      </Button>
                    )}
                    
                    {(freeBetStatus?.freeBetBalance || 0) > 0 && (
                      <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/30">
                        <p className="text-green-400 font-medium">
                          Free Bet Balance: <span className="text-white font-bold">{freeBetStatus?.freeBetBalance?.toLocaleString()} SBETS</span>
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-yellow-400 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/30">
                    <Wallet className="h-5 w-5" />
                    <span>Connect your wallet to claim</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-900/30 to-cyan-800/10 border-cyan-500/30">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-3 rounded-full bg-cyan-500/20">
                  <Users className="h-6 w-6 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-white text-xl">Refer a Friend</CardTitle>
                  <p className="text-cyan-400 font-bold text-lg">Earn 1,000 SBETS per Referral</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300">
                  Share your referral link with friends. When they sign up and place their first bet, you earn 1,000 SBETS!
                </p>
                
                {walletAddress && referralData ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={referralData.link}
                        readOnly
                        className="flex-1 bg-black/50 border border-cyan-500/30 rounded-lg px-4 py-2 text-white text-sm"
                      />
                      <Button
                        onClick={copyReferralLink}
                        variant="outline"
                        className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                        data-testid="btn-copy-referral"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-black/30 p-3 rounded-lg text-center border border-cyan-500/20">
                        <p className="text-2xl font-bold text-white">{referralData.totalReferrals || 0}</p>
                        <p className="text-xs text-gray-400">Total Referrals</p>
                      </div>
                      <div className="bg-black/30 p-3 rounded-lg text-center border border-cyan-500/20">
                        <p className="text-2xl font-bold text-green-400">{referralData.qualifiedReferrals || 0}</p>
                        <p className="text-xs text-gray-400">Qualified</p>
                      </div>
                      <div className="bg-black/30 p-3 rounded-lg text-center border border-cyan-500/20">
                        <p className="text-2xl font-bold text-cyan-400">{(referralData.totalEarned || 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-400">SBETS Earned</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-yellow-400 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/30">
                    <Wallet className="h-5 w-5" />
                    <span>Connect your wallet to get your referral link</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/10 border-yellow-500/30">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-3 rounded-full bg-yellow-500/20">
                  <Star className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-white text-xl">Loyalty Program</CardTitle>
                  <p className="text-yellow-400 font-bold text-lg">Earn Points on Every Bet</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300">
                  Earn 1 loyalty point for every $1 wagered. Climb the tiers to unlock exclusive perks and higher point multipliers!
                </p>
                
                {walletAddress && loyaltyStatus ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-black/30 p-4 rounded-lg border border-yellow-500/20">
                      <div>
                        <p className="text-gray-400 text-sm">Your Tier</p>
                        <p className={`text-2xl font-bold ${getTierColor(loyaltyStatus.tier)}`}>
                          {loyaltyStatus.tier}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-sm">Points</p>
                        <p className="text-2xl font-bold text-yellow-400">
                          {loyaltyStatus.points.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    {loyaltyStatus.nextTier !== loyaltyStatus.tier && (
                      <div className="bg-black/20 p-3 rounded-lg">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">Progress to {loyaltyStatus.nextTier}</span>
                          <span className="text-yellow-400">{loyaltyStatus.pointsToNext} pts to go</span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400"
                            style={{ width: `${Math.min(100, (1 - loyaltyStatus.pointsToNext / 1000) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-black/20 p-3 rounded-lg">
                      <p className="text-sm text-gray-400 mb-2">Your Perks:</p>
                      <ul className="space-y-1">
                        {loyaltyStatus.perks.map((perk, i) => (
                          <li key={i} className="text-sm text-yellow-300 flex items-center gap-2">
                            <Check className="h-3 w-3 text-green-400" />
                            {perk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-5 gap-2 text-center">
                      {['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'].map((tier) => (
                        <div key={tier} className="bg-black/30 p-2 rounded-lg">
                          <p className={`font-bold text-sm ${getTierColor(tier)}`}>{tier}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-yellow-400 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/30">
                      <Wallet className="h-5 w-5" />
                      <span>Connect wallet to view your loyalty status</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-900/30 to-purple-800/10 border-purple-500/30">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-3 rounded-full bg-purple-500/20">
                  <Coins className="h-6 w-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-white text-xl">SBETS Staking</CardTitle>
                  <p className="text-purple-400 font-bold text-lg">{stakingInfo?.apyRate || 5}% APY</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300">
                  Stake your SBETS tokens to earn passive rewards from the platform treasury. {stakingInfo?.lockPeriod || '7 days'} lock period.
                </p>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-black/30 p-3 rounded-lg text-center border border-purple-500/20">
                    <p className="text-xl font-bold text-purple-400">{stakingInfo?.apyRate || 5}%</p>
                    <p className="text-xs text-gray-400">APY</p>
                  </div>
                  <div className="bg-black/30 p-3 rounded-lg text-center border border-purple-500/20">
                    <p className="text-xl font-bold text-white">{((stakingInfo?.totalStaked || 0) / 1e9).toFixed(1)}B</p>
                    <p className="text-xs text-gray-400">Total Staked</p>
                  </div>
                  <div className="bg-black/30 p-3 rounded-lg text-center border border-purple-500/20">
                    <p className="text-xl font-bold text-green-400">{((stakingInfo?.userStaked || 0) / 1e6).toFixed(1)}M</p>
                    <p className="text-xs text-gray-400">Your Stake</p>
                  </div>
                </div>
                
                {walletAddress ? (
                  <div className="space-y-3">
                    {(stakingInfo?.userRewards || 0) > 0 && (
                      <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/30 flex justify-between items-center">
                        <div>
                          <p className="text-green-400 text-sm">Pending Rewards</p>
                          <p className="text-white font-bold">{Math.floor(stakingInfo?.userRewards || 0).toLocaleString()} SBETS</p>
                        </div>
                        <Button size="sm" onClick={handleClaimRewards} className="bg-green-600 hover:bg-green-500" data-testid="btn-claim-rewards">
                          Claim
                        </Button>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Amount (min 100,000)"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        className="bg-black/30 border-purple-500/30 text-white"
                        data-testid="input-stake-amount"
                      />
                      <Button 
                        onClick={handleStake}
                        disabled={isStaking}
                        className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500"
                        data-testid="btn-stake"
                      >
                        <Lock className="h-4 w-4 mr-1" />
                        {isStaking ? 'Staking...' : 'Stake'}
                      </Button>
                    </div>
                    
                    {stakingInfo?.userStakes && stakingInfo.userStakes.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400">Your Active Stakes:</p>
                        {stakingInfo.userStakes.map((stake) => (
                          <div key={stake.id} className="bg-black/30 p-3 rounded-lg border border-purple-500/20 flex justify-between items-center">
                            <div>
                              <p className="text-white font-medium">{stake.amount.toLocaleString()} SBETS</p>
                              <p className="text-xs text-gray-400">
                                +{Math.floor(stake.accumulatedRewards).toLocaleString()} rewards
                                {!stake.canUnstake && ` (locked until ${new Date(stake.lockedUntil).toLocaleDateString()})`}
                              </p>
                            </div>
                            <Button 
                              size="sm" 
                              variant={stake.canUnstake ? "default" : "secondary"}
                              onClick={() => handleUnstake(stake.id)}
                              disabled={!stake.canUnstake}
                              className={stake.canUnstake ? "bg-red-600 hover:bg-red-500" : ""}
                              data-testid={`btn-unstake-${stake.id}`}
                            >
                              <Unlock className="h-3 w-3 mr-1" />
                              {stake.canUnstake ? 'Unstake' : 'Locked'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-yellow-400 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/30">
                    <Wallet className="h-5 w-5" />
                    <span>Connect your wallet to stake</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
