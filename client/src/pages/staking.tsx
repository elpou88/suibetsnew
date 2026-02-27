import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient, useCurrentWallet } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Coins, ArrowLeft, Wallet, Lock, Unlock, TrendingUp, Shield, Clock, Zap, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
    dailyEarning: number;
    stakedDays: number;
    canUnstake: boolean;
  }>;
  minStake: number;
  lockPeriod: string;
}

const SBETS_TYPE = '0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285::sbets::SBETS';
const STAKING_TREASURY_WALLET = '0x20850db591c4d575b5238baf975e54580d800e69b8b5b421de796a311d3bea50';

export default function StakingPage() {
  const [, setLocation] = useLocation();
  const currentAccount = useCurrentAccount();
  const { toast } = useToast();
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
      const amountInSmallestUnits = BigInt(Math.floor(amount * 1_000_000_000));

      const sbetsCoins = await suiClient.getCoins({
        owner: walletAddress,
        coinType: SBETS_TYPE,
        limit: 50
      });

      if (!sbetsCoins.data.length) {
        toast({ title: "No SBETS in wallet", description: "You need SBETS tokens to stake", variant: "destructive" });
        setIsStaking(false);
        return;
      }

      let totalBalance = BigInt(0);
      for (const coin of sbetsCoins.data) {
        totalBalance += BigInt(coin.balance);
      }

      const totalBalanceDisplay = Number(totalBalance) / 1_000_000;

      if (totalBalance < amountInSmallestUnits) {
        toast({ title: "Insufficient SBETS", description: `You have ${totalBalanceDisplay.toLocaleString()} SBETS`, variant: "destructive" });
        setIsStaking(false);
        return;
      }

      const nonZeroCoins = sbetsCoins.data.filter(c => BigInt(c.balance) > 0);
      const suitableCoin = nonZeroCoins.find(c => BigInt(c.balance) >= amountInSmallestUnits);

      const tx = new Transaction();
      const stakeAmountMist = BigInt(Math.floor(amount * 1_000_000_000));

      if (suitableCoin) {
        const [splitCoin] = tx.splitCoins(tx.object(suitableCoin.coinObjectId), [stakeAmountMist]);
        tx.transferObjects([splitCoin], tx.pure.address(STAKING_TREASURY_WALLET));
      } else {
        const coinIds = nonZeroCoins.map(c => c.coinObjectId);
        const primaryCoin = tx.object(coinIds[0]);
        if (coinIds.length > 1) {
          const otherCoins = coinIds.slice(1).map(id => tx.object(id));
          tx.mergeCoins(primaryCoin, otherCoins);
        }
        const [splitCoin] = tx.splitCoins(primaryCoin, [stakeAmountMist]);
        tx.transferObjects([splitCoin], tx.pure.address(STAKING_TREASURY_WALLET));
      }

      toast({ title: "Sign transaction", description: "Approve the SBETS transfer in your wallet" });

      const result = await signAndExecute({
        transaction: tx,
      } as any);

      if (!result.digest) {
        throw new Error("Transaction failed - no digest returned");
      }

      const res = await apiRequest("POST", "/api/staking/stake", {
        walletAddress,
        amount,
        txHash: result.digest
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Staked Successfully!", description: `${amount.toLocaleString()} SBETS locked for 3 months at 8% APY` });
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
        queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
        queryClient.invalidateQueries({ queryKey: ['/api/staking/info'] });
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
        queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
        queryClient.invalidateQueries({ queryKey: ['/api/staking/info'] });
      } else {
        toast({ title: "Claim failed", description: data.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const formatLargeNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(0)}K`;
    return num.toLocaleString();
  };

  return (
    <Layout title="SBETS Staking">
      <div className="min-h-screen bg-black p-4 md:p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setLocation('/')}
              className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
              data-testid="btn-back-staking"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="p-3 bg-gradient-to-br from-cyan-400/20 to-blue-600/20 rounded-xl border border-cyan-500/30">
              <Coins className="h-8 w-8 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white" data-testid="text-staking-title">SBETS Staking</h1>
              <p className="text-gray-400">Earn passive rewards on your SBETS tokens</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-xl blur-sm group-hover:blur-md transition-all" />
              <div className="relative bg-black/40 backdrop-blur-sm p-4 rounded-xl text-center border border-cyan-500/30 group-hover:border-cyan-400/50 transition-all">
                <TrendingUp className="h-5 w-5 text-cyan-400 mx-auto mb-1" />
                <div className="text-2xl md:text-3xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent" data-testid="text-apy-rate">
                  {stakingInfo?.apyRate || 5}%
                </div>
                <p className="text-xs text-cyan-300/70 mt-1 font-medium">APY</p>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent rounded-xl blur-sm group-hover:blur-md transition-all" />
              <div className="relative bg-black/40 backdrop-blur-sm p-4 rounded-xl text-center border border-blue-500/30 group-hover:border-blue-400/50 transition-all">
                <Shield className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                <div className="text-2xl md:text-3xl font-black text-blue-300" data-testid="text-total-staked">
                  {formatLargeNumber(stakingInfo?.totalStaked || 0)}
                </div>
                <p className="text-xs text-blue-300/70 mt-1 font-medium">Total Staked</p>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-transparent rounded-xl blur-sm group-hover:blur-md transition-all" />
              <div className="relative bg-black/40 backdrop-blur-sm p-4 rounded-xl text-center border border-green-500/30 group-hover:border-green-400/50 transition-all">
                <Coins className="h-5 w-5 text-green-400 mx-auto mb-1" />
                <div className="text-2xl md:text-3xl font-black text-green-400" data-testid="text-your-stake">
                  {formatLargeNumber(stakingInfo?.userStaked || 0)}
                </div>
                <p className="text-xs text-green-300/70 mt-1 font-medium">Your Stake</p>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent rounded-xl blur-sm group-hover:blur-md transition-all" />
              <div className="relative bg-black/40 backdrop-blur-sm p-4 rounded-xl text-center border border-purple-500/30 group-hover:border-purple-400/50 transition-all">
                <Clock className="h-5 w-5 text-purple-400 mx-auto mb-1" />
                <div className="text-2xl md:text-3xl font-black text-purple-300" data-testid="text-lock-period">
                  {stakingInfo?.lockPeriod || '90 days'}
                </div>
                <p className="text-xs text-purple-300/70 mt-1 font-medium">Lock Period</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-5 gap-6">
            <div className="md:col-span-3 space-y-5">
              {(stakingInfo?.userRewards || 0) > 0 && (
                <div className="relative overflow-hidden bg-gradient-to-r from-green-500/20 via-emerald-500/15 to-green-500/20 p-5 rounded-xl border border-green-500/40">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-500/10 to-transparent" />
                  <div className="relative flex justify-between items-center flex-wrap gap-3">
                    <div>
                      <p className="text-green-300 text-sm font-medium flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        Pending Rewards
                      </p>
                      <p className="text-3xl font-black text-green-400 mt-1" data-testid="text-pending-rewards">
                        +{Math.floor(stakingInfo?.userRewards || 0).toLocaleString()} SBETS
                      </p>
                    </div>
                    <Button
                      onClick={handleClaimRewards}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold px-8 shadow-lg shadow-green-500/30"
                      data-testid="btn-claim-rewards"
                    >
                      Claim Rewards
                    </Button>
                  </div>
                </div>
              )}

              <Card className="relative overflow-hidden bg-gradient-to-br from-cyan-900/40 via-blue-900/30 to-slate-900/20 border-cyan-500/40 shadow-2xl shadow-cyan-500/10">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl" />

                <CardHeader className="relative pb-2">
                  <CardTitle className="text-white text-xl font-bold flex items-center gap-2">
                    <Lock className="h-5 w-5 text-cyan-400" />
                    Stake SBETS
                  </CardTitle>
                  <p className="text-cyan-300/70 text-sm">Minimum 100,000 SBETS per stake</p>
                </CardHeader>

                <CardContent className="relative space-y-4">
                  {walletAddress ? (
                    <>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter amount (e.g. 100000)..."
                        value={stakeAmount}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setStakeAmount(val);
                        }}
                        className="bg-black/50 border-cyan-500/40 text-white text-lg font-bold placeholder:text-gray-500 focus:border-cyan-400 focus:ring-cyan-400/30"
                        data-testid="input-stake-amount"
                      />
                      <div className="flex gap-2 flex-wrap">
                        {[100000, 500000, 1000000].map((amt) => (
                          <Button
                            key={amt}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setStakeAmount(amt.toString())}
                            className="flex-1 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 hover:text-white text-xs min-w-[60px]"
                            data-testid={`btn-preset-${amt}`}
                          >
                            {amt >= 1000000 ? `${amt / 1000000}M` : `${amt / 1000}K`}
                          </Button>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!walletAddress) {
                              toast({ title: "Connect wallet first", variant: "destructive" });
                              return;
                            }
                            try {
                              const coins = await suiClient.getCoins({ owner: walletAddress, coinType: SBETS_TYPE, limit: 50 });
                              const totalBalance = coins.data.reduce((sum, c) => sum + Number(c.balance), 0);
                              const displayBalance = Math.floor(totalBalance / 1_000_000_000);
                              if (displayBalance > 0) {
                                setStakeAmount(displayBalance.toString());
                              } else {
                                toast({ title: "No SBETS in wallet", variant: "destructive" });
                              }
                            } catch {
                              toast({ title: "Failed to fetch balance", variant: "destructive" });
                            }
                          }}
                          className="flex-1 border-green-500/40 text-green-400 hover:bg-green-500/20 hover:text-white text-xs font-bold min-w-[60px]"
                          data-testid="btn-stake-max"
                        >
                          MAX
                        </Button>
                      </div>
                      <Button
                        onClick={handleStake}
                        disabled={isStaking}
                        className="w-full bg-gradient-to-r from-cyan-500 via-cyan-600 to-blue-600 hover:from-cyan-400 hover:via-cyan-500 hover:to-blue-500 text-white font-bold py-3 shadow-lg shadow-cyan-500/30 transition-all"
                        data-testid="btn-stake"
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        {isStaking ? 'Staking...' : 'Stake Now'}
                      </Button>
                    </>
                  ) : (
                    <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 p-4 rounded-xl border border-yellow-500/30 flex items-center gap-3">
                      <div className="p-2 bg-yellow-500/20 rounded-lg">
                        <Wallet className="h-6 w-6 text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-yellow-300 font-semibold">Connect Wallet to Start Staking</p>
                        <p className="text-yellow-300/60 text-sm">Earn {stakingInfo?.apyRate || 8}% APY on your SBETS</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {walletAddress && stakingInfo?.userStakes && stakingInfo.userStakes.length > 0 && (
                <div className="space-y-3">
                  <p className="text-lg text-cyan-300 font-bold flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Your Active Stakes ({stakingInfo.userStakes.length})
                  </p>
                  {stakingInfo.userStakes.map((stake) => {
                    const lockEndDate = new Date(stake.lockedUntil);
                    const now = new Date();
                    const totalLockTime = 7 * 24 * 60 * 60 * 1000;
                    const timeRemaining = Math.max(0, lockEndDate.getTime() - now.getTime());
                    const progressPercent = Math.min(100, ((totalLockTime - timeRemaining) / totalLockTime) * 100);
                    const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));
                    const daysRemaining = Math.floor(hoursRemaining / 24);
                    const hrsLeft = hoursRemaining % 24;

                    return (
                      <div key={stake.id} className="relative overflow-hidden bg-gradient-to-r from-cyan-900/40 to-blue-900/30 p-4 rounded-xl border border-cyan-500/30" data-testid={`card-stake-${stake.id}`}>
                        <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-2xl" />
                        <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                          <div>
                            <p className="text-xl font-black text-white">{(stake.amount || 0).toLocaleString()} SBETS</p>
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
                              ? "bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold shadow-lg"
                              : "bg-gray-700/50 text-gray-400 cursor-not-allowed"
                            }
                            data-testid={`btn-unstake-${stake.id}`}
                          >
                            <Unlock className="h-4 w-4 mr-1" />
                            {stake.canUnstake ? 'Unstake + Claim' : 'Locked'}
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-black/30 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-cyan-300/60 uppercase tracking-wider">Daily Earning</p>
                            <p className="text-sm font-bold text-cyan-300">+{(stake.dailyEarning || 0).toLocaleString()}</p>
                          </div>
                          <div className="bg-black/30 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-cyan-300/60 uppercase tracking-wider">Staked</p>
                            <p className="text-sm font-bold text-cyan-300">{stake.stakedDays || 0} days</p>
                          </div>
                        </div>

                        {!stake.canUnstake && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs flex-wrap gap-1">
                              <span className="text-cyan-300/70">Lock Progress</span>
                              <span className="text-cyan-300">
                                {daysRemaining > 0 ? `${daysRemaining}d ${hrsLeft}h remaining` : `${hrsLeft}h remaining`}
                              </span>
                            </div>
                            <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 transition-all duration-1000"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {stake.canUnstake && (
                          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-center">
                            <p className="text-green-400 text-sm font-medium">Lock period complete - ready to unstake</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="md:col-span-2 space-y-4">
              <Card className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 border-cyan-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Info className="h-4 w-4 text-cyan-400" />
                    How Staking Works
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-cyan-500/20 rounded-lg mt-0.5 shrink-0">
                        <Lock className="h-3.5 w-3.5 text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold">Lock Your SBETS</p>
                        <p className="text-gray-400 text-xs">Stake a minimum of 100,000 SBETS. Tokens are locked for 3 months.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-green-500/20 rounded-lg mt-0.5 shrink-0">
                        <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold">Earn 8% APY</p>
                        <p className="text-gray-400 text-xs">Rewards accrue hourly from a 50 billion SBETS treasury pool.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-purple-500/20 rounded-lg mt-0.5 shrink-0">
                        <Zap className="h-3.5 w-3.5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold">Claim Anytime</p>
                        <p className="text-gray-400 text-xs">Withdraw your earned rewards daily without unstaking. Or unstake after 3 months to get principal + rewards.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-blue-500/20 rounded-lg mt-0.5 shrink-0">
                        <Shield className="h-3.5 w-3.5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold">On-Chain Security</p>
                        <p className="text-gray-400 text-xs">All stake transactions are verified on the Sui blockchain. Your tokens are safe.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 border-cyan-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Coins className="h-4 w-4 text-cyan-400" />
                    Staking Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center py-2 border-b border-cyan-500/10">
                      <span className="text-gray-400 text-sm">Annual Yield</span>
                      <span className="text-cyan-300 font-bold text-sm" data-testid="text-detail-apy">{stakingInfo?.apyRate || 8}% APY</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-cyan-500/10">
                      <span className="text-gray-400 text-sm">Min Stake</span>
                      <span className="text-white font-bold text-sm">100,000 SBETS</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-cyan-500/10">
                      <span className="text-gray-400 text-sm">Lock Period</span>
                      <span className="text-white font-bold text-sm">{stakingInfo?.lockPeriod || '90 days'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-cyan-500/10">
                      <span className="text-gray-400 text-sm">Reward Accrual</span>
                      <span className="text-white font-bold text-sm">Hourly</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-cyan-500/10">
                      <span className="text-gray-400 text-sm">Treasury Pool</span>
                      <span className="text-white font-bold text-sm" data-testid="text-treasury-pool">{formatLargeNumber(stakingInfo?.treasuryPool || 50000000000)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-400 text-sm">Total Platform Staked</span>
                      <span className="text-white font-bold text-sm">{formatLargeNumber(stakingInfo?.totalStaked || 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/10 p-4 rounded-xl border border-cyan-500/20">
                <p className="text-xs text-cyan-300/60 leading-relaxed">
                  Staking rewards are calculated using an 8% annual rate from the treasury pool. Rewards accrue hourly and can be withdrawn daily at any time. The reward model uses the higher of live calculation or worker-accumulated values to ensure accuracy. Your principal is locked for 3 months - early unstaking before the lock period is not permitted.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
