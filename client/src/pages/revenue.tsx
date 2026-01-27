import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import Layout from "@/components/layout/Layout";
import { Loader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  Users, 
  CheckCircle2, 
  Info,
  ChartLine,
  Coins,
  Gift
} from "lucide-react";

interface RevenueStats {
  success: boolean;
  weekStart: string;
  weekEnd: string;
  totalRevenue: number;
  allTimeRevenue: number;
  distribution: {
    holders: { percentage: number; amount: number };
    treasury: { percentage: number; amount: number };
    liquidity?: { percentage: number; amount: number };
  };
  onChainData: {
    treasuryBalance: number;
    treasuryBalanceSbets: number;
    totalBets: number;
    totalVolume: number;
    accruedFees: number;
  };
  historicalRevenue: Array<{ week: string; revenue: number }>;
  lastUpdated: number;
}

interface ClaimableData {
  success: boolean;
  walletAddress: string;
  sbetsBalance: number;
  sharePercentage: string;
  weeklyRevenuePool: number;
  claimableAmount: number;
  alreadyClaimed: boolean;
  lastClaimTxHash: string | null;
  claimHistory: Array<{ amount: number; timestamp: number; txHash: string }>;
  lastUpdated: number;
}

export default function RevenuePage() {
  const { user, walletAddress } = useAuth();
  const { toast } = useToast();
  const [isClaiming, setIsClaiming] = useState(false);

  const { data: revenueStats, isLoading: statsLoading } = useQuery<RevenueStats>({
    queryKey: ['/api/revenue/stats'],
    refetchInterval: 30000,
  });

  const { data: claimableData, isLoading: claimableLoading, refetch: refetchClaimable } = useQuery<ClaimableData>({
    queryKey: ['/api/revenue/claimable', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      const res = await fetch(`/api/revenue/claimable/${walletAddress}`);
      if (!res.ok) throw new Error('Failed to fetch claimable');
      return res.json();
    },
    enabled: !!walletAddress,
    refetchInterval: 15000,
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/revenue/claim", {
        walletAddress
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to claim rewards');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Rewards Claimed Successfully",
        description: `You received ${data.claimedAmount.toFixed(4)} SUI! TX: ${data.txHash?.slice(0, 12)}...`,
      });
      refetchClaimable();
      queryClient.invalidateQueries({ queryKey: ['/api/revenue'] });
    },
    onError: (error: any) => {
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim rewards",
        variant: "destructive",
      });
    },
  });

  const handleClaim = async () => {
    if (!walletAddress) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!claimableData?.claimableAmount || claimableData.claimableAmount <= 0) {
      toast({
        title: "Nothing to Claim",
        description: "You don't have any rewards to claim this week",
        variant: "destructive",
      });
      return;
    }

    setIsClaiming(true);
    try {
      await claimMutation.mutateAsync();
    } finally {
      setIsClaiming(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'SUI') => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M ${currency}`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K ${currency}`;
    }
    return `${amount.toFixed(4)} ${currency}`;
  };

  const formatUSD = (suiAmount: number) => {
    const suiPrice = 4.5;
    const usdValue = suiAmount * suiPrice;
    return `$${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  };

  if (statsLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-[50vh]">
          <Loader size="lg" />
        </div>
      </Layout>
    );
  }

  const weekStart = revenueStats?.weekStart ? new Date(revenueStats.weekStart) : new Date();
  const weekEnd = revenueStats?.weekEnd ? new Date(revenueStats.weekEnd) : new Date();

  return (
    <Layout>
      <div 
        className="min-h-screen relative"
        style={{
          background: 'linear-gradient(180deg, #0a1628 0%, #0d1f3c 50%, #0a1628 100%)',
        }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute bottom-0 left-0 right-0 h-1/3"
            style={{
              background: 'radial-gradient(ellipse at center bottom, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
            }}
          />
          <div 
            className="absolute top-0 left-1/4 w-1/2 h-1/4"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.1) 0%, transparent 60%)',
            }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 py-6 space-y-6">
          <Card className="border-0 overflow-hidden" style={{ 
            background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%)',
            boxShadow: '0 0 30px rgba(59, 130, 246, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center">
                  <h2 className="text-lg text-blue-200 mb-2">This Week's Revenue</h2>
                  <div className="text-3xl font-bold text-white mb-1">
                    {formatUSD(revenueStats?.totalRevenue || 0)}
                  </div>
                  <div className="text-blue-300 text-sm">
                    = {formatCurrency(revenueStats?.totalRevenue || 0)}
                  </div>
                </div>
                <div className="text-center border-t md:border-t-0 md:border-l border-blue-500/30 pt-4 md:pt-0 md:pl-6">
                  <h2 className="text-lg text-green-200 mb-2">All-Time Total Revenue</h2>
                  <div className="text-3xl font-bold text-green-400 mb-1">
                    {formatUSD(revenueStats?.allTimeRevenue || 0)}
                  </div>
                  <div className="text-green-300 text-sm">
                    = {formatCurrency(revenueStats?.allTimeRevenue || 0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 overflow-hidden" style={{ 
            background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.7) 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)'
          }}>
            <CardContent className="p-6">
              <h3 className="text-lg text-center text-blue-200 mb-4 flex items-center justify-center gap-2">
                <span className="w-8 h-[2px] bg-blue-400"></span>
                Revenue Distribution
                <span className="w-8 h-[2px] bg-blue-400"></span>
              </h3>
              
              <div className="space-y-3">
                <div className="relative">
                  <div className="h-10 rounded-lg overflow-hidden bg-gray-800/50 flex">
                    <div 
                      className="h-full flex items-center justify-start pl-4 text-sm font-medium text-white"
                      style={{ 
                        width: '30%',
                        background: 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                      }}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      To Holders: {formatCurrency(revenueStats?.distribution?.holders?.amount || 0)} (30%)
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="h-10 rounded-lg overflow-hidden bg-gray-800/50 flex">
                    <div 
                      className="h-full flex items-center justify-start pl-4 text-sm font-medium text-white"
                      style={{ 
                        width: '40%',
                        background: 'linear-gradient(90deg, #3b82f6, #2563eb)'
                      }}
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      Treasury Buffer: {formatCurrency(revenueStats?.distribution?.treasury?.amount || 0)} (40%)
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="h-10 rounded-lg overflow-hidden bg-gray-800/50 flex">
                    <div 
                      className="h-full flex items-center justify-start pl-4 text-sm font-medium text-white"
                      style={{ 
                        width: '30%',
                        background: 'linear-gradient(90deg, #10b981, #059669)'
                      }}
                    >
                      <Coins className="w-4 h-4 mr-2" />
                      Liquidity and Buybacks: {formatCurrency(revenueStats?.distribution?.liquidity?.amount || 0)} (30%)
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {walletAddress ? (
            <Card className="border-0 overflow-hidden" style={{ 
              background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.7) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)'
            }}>
              <CardContent className="p-6">
                <h3 className="text-lg text-center text-blue-200 mb-4 flex items-center justify-center gap-2">
                  <span className="w-8 h-[2px] bg-blue-400"></span>
                  Your Earnings This Week
                  <span className="w-8 h-[2px] bg-blue-400"></span>
                </h3>

                {claimableLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader size="md" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-800/30 rounded-lg p-4 border border-blue-500/20">
                        <div className="flex items-center gap-2 text-blue-300 text-sm mb-1">
                          <CheckCircle2 className="w-4 h-4 text-blue-400" />
                          Your SBETS:
                        </div>
                        <div className="text-xl font-bold text-white">
                          {(claimableData?.sbetsBalance || 0).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="bg-gray-800/30 rounded-lg p-4 border border-green-500/20">
                        <div className="flex items-center gap-2 text-green-300 text-sm mb-1">
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          Your Share:
                        </div>
                        <div className="text-xl font-bold text-white">
                          {claimableData?.sharePercentage || '0'}%
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-lg p-6 border border-yellow-500/30 text-center">
                      <div className="flex items-center justify-center gap-2 text-yellow-300 text-sm mb-2">
                        <Gift className="w-5 h-5 text-yellow-400" />
                        Claimable Rewards:
                      </div>
                      <div className="text-3xl font-bold text-white mb-1">
                        {formatUSD(claimableData?.claimableAmount || 0)}
                      </div>
                      <div className="text-yellow-300 text-sm mb-4">
                        = {formatCurrency(claimableData?.claimableAmount || 0)}
                      </div>

                      {claimableData?.alreadyClaimed ? (
                        <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3">
                          <div className="flex items-center justify-center gap-2 text-green-400">
                            <CheckCircle2 className="w-5 h-5" />
                            Already Claimed This Week
                          </div>
                          {claimableData.lastClaimTxHash && (
                            <a 
                              href={`https://suivision.xyz/txblock/${claimableData.lastClaimTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:underline mt-1 block"
                            >
                              View Transaction
                            </a>
                          )}
                        </div>
                      ) : (
                        <Button
                          onClick={handleClaim}
                          disabled={isClaiming || !claimableData?.claimableAmount || claimableData.claimableAmount <= 0}
                          className="w-full max-w-xs py-3 text-lg font-bold"
                          style={{
                            background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                            boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)'
                          }}
                          data-testid="button-claim-rewards"
                        >
                          {isClaiming ? (
                            <div className="flex items-center gap-2">
                              <Loader size="sm" />
                              Processing...
                            </div>
                          ) : (
                            'CLAIM REWARDS'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 overflow-hidden" style={{ 
              background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.7) 100%)',
            }}>
              <CardContent className="p-8 text-center">
                <Wallet className="w-12 h-12 mx-auto text-blue-400 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Connect Wallet</h3>
                <p className="text-blue-300 mb-4">
                  Connect your wallet to view and claim your SBETS holder rewards
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 overflow-hidden" style={{ 
            background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.7) 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)'
          }}>
            <CardContent className="p-6">
              <h3 className="text-lg text-blue-200 mb-4 flex items-center gap-2">
                <Gift className="w-5 h-5 text-yellow-400" />
                How It Works
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-gray-300">
                  <div className="w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center flex-shrink-0">
                    <ChartLine className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-white">Betting Revenue Shared with SBETS Holders</div>
                    <div className="text-sm text-blue-300">30% of all platform revenue goes to token holders</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 text-gray-300">
                  <div className="w-8 h-8 rounded-full bg-green-600/30 flex items-center justify-center flex-shrink-0">
                    <Coins className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium text-white">Hold SBETS, Earn Weekly Rewards</div>
                    <div className="text-sm text-blue-300">Rewards distributed every Monday</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 text-gray-300">
                  <div className="w-8 h-8 rounded-full bg-yellow-600/30 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div>
                    <div className="font-medium text-white">The More SBETS You Hold, The More You Earn</div>
                    <div className="text-sm text-blue-300">Rewards are proportional to your holdings</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {revenueStats?.historicalRevenue && revenueStats.historicalRevenue.length > 0 && (
            <Card className="border-0 overflow-hidden" style={{ 
              background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.7) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)'
            }}>
              <CardContent className="p-6">
                <h3 className="text-lg text-blue-200 mb-4 flex items-center gap-2">
                  <ChartLine className="w-5 h-5 text-blue-400" />
                  Weekly Revenue History
                </h3>
                
                <div className="relative h-48">
                  <div className="flex items-end justify-between h-full gap-2">
                    {revenueStats.historicalRevenue.slice(0, 7).reverse().map((week, index) => {
                      const maxRevenue = Math.max(...revenueStats.historicalRevenue.map(w => w.revenue));
                      const height = maxRevenue > 0 ? (week.revenue / maxRevenue) * 100 : 0;
                      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                      
                      return (
                        <div key={week.week} className="flex-1 flex flex-col items-center">
                          <div 
                            className="w-full rounded-t-lg transition-all duration-300 relative group"
                            style={{ 
                              height: `${Math.max(height, 5)}%`,
                              background: 'linear-gradient(180deg, #3b82f6, #1d4ed8)',
                              boxShadow: '0 0 10px rgba(59, 130, 246, 0.3)'
                            }}
                          >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {formatCurrency(week.revenue)}
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 mt-2">{dayNames[index] || week.week.slice(5)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 overflow-hidden" style={{ 
            background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.3) 0%, rgba(15, 23, 42, 0.6) 100%)',
          }}>
            <CardContent className="p-6">
              <h3 className="text-lg text-blue-200 mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-400" />
                On-Chain Treasury Status
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-800/30 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-400 mb-1">SUI Treasury</div>
                  <div className="text-lg font-bold text-white">
                    {(revenueStats?.onChainData?.treasuryBalance || 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-400 mb-1">SBETS Treasury</div>
                  <div className="text-lg font-bold text-white">
                    {formatCurrency(revenueStats?.onChainData?.treasuryBalanceSbets || 0, 'SBETS')}
                  </div>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-400 mb-1">Total Bets</div>
                  <div className="text-lg font-bold text-white">
                    {revenueStats?.onChainData?.totalBets || 0}
                  </div>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-400 mb-1">Total Volume</div>
                  <div className="text-lg font-bold text-white">
                    {(revenueStats?.onChainData?.totalVolume || 0).toFixed(2)} SUI
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-xs text-gray-500 py-4">
            * Rewards are based on real betting activity on the SuiBets platform.
          </div>
        </div>
      </div>
    </Layout>
  );
}
