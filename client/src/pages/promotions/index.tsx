import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient, useCurrentWallet } from "@mysten/dapp-kit";
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
  const { currentWallet, connectionStatus } = useCurrentWallet();

  const walletAddress = currentAccount?.address;
  const isWalletConnected = connectionStatus === 'connected' && !!currentWallet;
  
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
    if (!isWalletConnected) {
      toast({ title: "Wallet not connected", description: "Please reconnect your wallet and try again", variant: "destructive" });
      return;
    }
    const amount = parseInt(stakeAmount);
    if (!amount || amount < 100000) {
      toast({ title: "Minimum stake is 100,000 SBETS", variant: "destructive" });
      return;
    }
    setIsStaking(true);
    try {
      // SBETS has 6 decimals (NOT 9 like SUI!) - convert to smallest units
      const amountInSmallestUnits = BigInt(amount) * BigInt(1_000_000);
      
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
        console.log(`[Staking] Coin ${i}: ${c.coinObjectId} = ${c.balance} smallest units (${Number(c.balance) / 1_000_000} display)`);
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
      
      // Convert to display units for comparison (SBETS has 6 decimals)
      const totalBalanceDisplay = Number(totalBalance) / 1_000_000;
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
      
      // Step 2: Build transaction using splitCoins and transferObjects
      const tx = new Transaction();
      
      // SBETS has 6 decimals - convert to smallest units
      const stakeAmountMist = BigInt(amount) * BigInt(1_000_000);
      console.log('[Staking] Stake amount in smallest units:', stakeAmountMist.toString());
      
      if (suitableCoin) {
        // Split from single coin and transfer to treasury (same pattern as betting)
        console.log('[Staking] Splitting from coin:', suitableCoin.coinObjectId);
        const [splitCoin] = tx.splitCoins(tx.object(suitableCoin.coinObjectId), [stakeAmountMist]);
        tx.transferObjects([splitCoin], tx.pure.address(PLATFORM_TREASURY));
      } else {
        // Need to merge coins first - only use non-zero coins
        const coinIds = nonZeroCoins.map(c => c.coinObjectId);
        console.log('[Staking] Merging coins first:', coinIds);
        const primaryCoin = tx.object(coinIds[0]);
        if (coinIds.length > 1) {
          const otherCoins = coinIds.slice(1).map(id => tx.object(id));
          tx.mergeCoins(primaryCoin, otherCoins);
        }
        // Then split and transfer (same pattern as betting)
        const [splitCoin] = tx.splitCoins(primaryCoin, [stakeAmountMist]);
        tx.transferObjects([splitCoin], tx.pure.address(PLATFORM_TREASURY));
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
                ) : walletAddress ? (
                  <div className="flex items-center gap-2 text-cyan-400 bg-cyan-500/10 p-3 rounded-lg border border-cyan-500/30">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-500 border-t-transparent" />
                    <span>Loading welcome bonus status...</span>
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
                ) : walletAddress ? (
                  <div className="flex items-center gap-2 text-cyan-400 bg-cyan-500/10 p-3 rounded-lg border border-cyan-500/30">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-500 border-t-transparent" />
                    <span>Loading your referral link...</span>
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
                ) : walletAddress ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-5 gap-2 text-center">
                      {['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'].map((tier) => (
                        <div key={tier} className="bg-black/30 p-2 rounded-lg">
                          <p className={`font-bold text-sm ${getTierColor(tier)}`}>{tier}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-cyan-400 bg-cyan-500/10 p-3 rounded-lg border border-cyan-500/30">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-500 border-t-transparent" />
                      <span>Loading your loyalty status...</span>
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

            <Card className="relative overflow-hidden bg-gradient-to-br from-purple-900/40 via-indigo-900/30 to-blue-900/20 border-purple-500/40 shadow-2xl shadow-purple-500/10">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl" />
              
              <CardHeader className="relative flex flex-row items-center gap-4 pb-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-500/50 rounded-full blur-xl animate-pulse" />
                  <div className="relative p-4 rounded-full bg-gradient-to-br from-purple-500/30 to-purple-600/20 border border-purple-400/30">
                    <Coins className="h-8 w-8 text-purple-300" />
                  </div>
                </div>
                <div className="flex-1">
                  <CardTitle className="text-white text-2xl font-black tracking-tight">SBETS Staking</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-purple-300 text-sm">Earn</span>
                    <span className="text-3xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
                      {stakingInfo?.apyRate || 5}% APY
                    </span>
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <div className="text-xs text-purple-300/70">Lock Period</div>
                  <div className="text-lg font-bold text-purple-300">{stakingInfo?.lockPeriod || '7 days'}</div>
                </div>
              </CardHeader>
              
              <CardContent className="relative space-y-5 pt-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent rounded-xl blur-sm group-hover:blur-md transition-all" />
                    <div className="relative bg-black/40 backdrop-blur-sm p-4 rounded-xl text-center border border-purple-500/30 group-hover:border-purple-400/50 transition-all">
                      <div className="text-3xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        {stakingInfo?.apyRate || 5}%
                      </div>
                      <p className="text-xs text-purple-300/70 mt-1 font-medium">Annual Yield</p>
                    </div>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent rounded-xl blur-sm group-hover:blur-md transition-all" />
                    <div className="relative bg-black/40 backdrop-blur-sm p-4 rounded-xl text-center border border-blue-500/30 group-hover:border-blue-400/50 transition-all">
                      <div className="text-3xl font-black text-blue-300">
                        {((stakingInfo?.totalStaked || 0) / 1e9).toFixed(1)}B
                      </div>
                      <p className="text-xs text-blue-300/70 mt-1 font-medium">Total Staked</p>
                    </div>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-transparent rounded-xl blur-sm group-hover:blur-md transition-all" />
                    <div className="relative bg-black/40 backdrop-blur-sm p-4 rounded-xl text-center border border-green-500/30 group-hover:border-green-400/50 transition-all">
                      <div className="text-3xl font-black text-green-400">
                        {(stakingInfo?.userStaked || 0) >= 1000000 
                          ? `${((stakingInfo?.userStaked || 0) / 1e6).toFixed(1)}M`
                          : (stakingInfo?.userStaked || 0).toLocaleString()
                        }
                      </div>
                      <p className="text-xs text-green-300/70 mt-1 font-medium">Your Stake</p>
                    </div>
                  </div>
                </div>
                
                {walletAddress ? (
                  <div className="space-y-4">
                    {(stakingInfo?.userRewards || 0) > 0 && (
                      <div className="relative overflow-hidden bg-gradient-to-r from-green-500/20 via-emerald-500/15 to-green-500/20 p-4 rounded-xl border border-green-500/40">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-500/10 to-transparent" />
                        <div className="relative flex justify-between items-center">
                          <div>
                            <p className="text-green-300 text-sm font-medium flex items-center gap-2">
                              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                              Pending Rewards
                            </p>
                            <p className="text-2xl font-black text-green-400 mt-1">
                              +{Math.floor(stakingInfo?.userRewards || 0).toLocaleString()} SBETS
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={handleClaimRewards} 
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold px-6 shadow-lg shadow-green-500/30" 
                            data-testid="btn-claim-rewards"
                          >
                            Claim Rewards
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-black/30 backdrop-blur-sm p-4 rounded-xl border border-purple-500/30">
                      <p className="text-sm text-purple-300 mb-3 font-medium">Stake SBETS (min 100,000)</p>
                      <div className="flex flex-col gap-3">
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="Enter amount (e.g. 100000)..."
                          value={stakeAmount}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setStakeAmount(val);
                          }}
                          className="bg-black/50 border-purple-500/40 text-white text-lg font-bold placeholder:text-gray-500 focus:border-purple-400 focus:ring-purple-400/30"
                          data-testid="input-stake-amount"
                        />
                        <div className="flex gap-2">
                          {[100000, 500000, 1000000].map((amt) => (
                            <Button
                              key={amt}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setStakeAmount(amt.toString())}
                              className="flex-1 border-purple-500/40 text-purple-300 hover:bg-purple-500/20 hover:text-white text-xs"
                            >
                              {amt >= 1000000 ? `${amt / 1000000}M` : `${amt / 1000}K`}
                            </Button>
                          ))}
                        </div>
                        <Button 
                          onClick={handleStake}
                          disabled={isStaking}
                          className="bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 hover:from-purple-400 hover:via-purple-500 hover:to-indigo-500 text-white font-bold px-8 shadow-lg shadow-purple-500/30 transition-all hover:scale-105"
                          data-testid="btn-stake"
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          {isStaking ? 'Staking...' : 'Stake Now'}
                        </Button>
                      </div>
                    </div>
                    
                    {stakingInfo?.userStakes && stakingInfo.userStakes.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm text-purple-300 font-semibold flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          Your Active Stakes ({stakingInfo.userStakes.length})
                        </p>
                        {stakingInfo.userStakes.map((stake) => {
                          const lockEndDate = new Date(stake.lockedUntil);
                          const now = new Date();
                          const totalLockTime = 7 * 24 * 60 * 60 * 1000;
                          const timeRemaining = Math.max(0, lockEndDate.getTime() - now.getTime());
                          const progressPercent = Math.min(100, ((totalLockTime - timeRemaining) / totalLockTime) * 100);
                          
                          return (
                            <div key={stake.id} className="relative overflow-hidden bg-gradient-to-r from-purple-900/40 to-indigo-900/30 p-4 rounded-xl border border-purple-500/30">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <p className="text-xl font-black text-white">{stake.amount.toLocaleString()} SBETS</p>
                                  <p className="text-sm text-green-400 font-medium mt-1">
                                    +{Math.floor(stake.accumulatedRewards).toLocaleString()} SBETS earned
                                  </p>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant={stake.canUnstake ? "default" : "secondary"}
                                  onClick={() => handleUnstake(stake.id)}
                                  disabled={!stake.canUnstake}
                                  className={stake.canUnstake 
                                    ? "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white font-bold shadow-lg" 
                                    : "bg-gray-700/50 text-gray-400 cursor-not-allowed"
                                  }
                                  data-testid={`btn-unstake-${stake.id}`}
                                >
                                  <Unlock className="h-4 w-4 mr-1" />
                                  {stake.canUnstake ? 'Unstake + Claim' : 'Locked'}
                                </Button>
                              </div>
                              
                              {!stake.canUnstake && (
                                <div className="space-y-2">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-purple-300/70">Lock Progress</span>
                                    <span className="text-purple-300">Unlocks {lockEndDate.toLocaleDateString()}</span>
                                  </div>
                                  <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 transition-all duration-1000"
                                      style={{ width: `${progressPercent}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 p-4 rounded-xl border border-yellow-500/30 flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/20 rounded-lg">
                      <Wallet className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-yellow-300 font-semibold">Connect Wallet to Start Staking</p>
                      <p className="text-yellow-300/60 text-sm">Earn {stakingInfo?.apyRate || 5}% APY on your SBETS</p>
                    </div>
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
