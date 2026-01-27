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
  distribution: {
    holders: { percentage: number; amount: number };
    treasury: { percentage: number; amount: number };
    liquidity?: { percentage: number; amount: number }; // Deprecated - now included in holders
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
    refetchInterval: 30000, // Refresh every 30 seconds for real-time treasury updates
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
    refetchInterval: 15000, // Refresh every 15 seconds for real-time updates
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
      <Layout title="WEEKLY REVENUE">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader size="lg" />
        </div>
      </Layout>
    );
  }

  const weekStart = revenueStats?.weekStart ? new Date(revenueStats.weekStart) : new Date();
  const weekEnd = revenueStats?.weekEnd ? new Date(revenueStats.weekEnd) : new Date();

  return (
    <Layout title="Revenue Sharing">
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <h2 className="text-lg text-muted-foreground mb-2">Total Platform Revenue This Week</h2>
                <div className="text-4xl font-bold text-foreground mb-1">
                  {formatCurrency(revenueStats?.totalRevenue || 0)}
                </div>
                <div className="text-muted-foreground text-sm">
                  {formatUSD(revenueStats?.totalRevenue || 0)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Revenue Distribution</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span className="text-foreground font-medium">SBETS Holders (30%)</span>
                  </div>
                  <span className="font-bold text-foreground">{formatCurrency(revenueStats?.distribution?.holders?.amount || 0)}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground font-medium">Platform Treasury (70%)</span>
                  </div>
                  <span className="font-bold text-foreground">{formatCurrency(revenueStats?.distribution?.treasury?.amount || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {walletAddress ? (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Your Earnings This Week</h3>

                {claimableLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader size="md" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted rounded-lg p-4">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                          <Coins className="w-4 h-4" />
                          Your SBETS Balance
                        </div>
                        <div className="text-xl font-bold text-foreground">
                          {(claimableData?.sbetsBalance || 0).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="bg-muted rounded-lg p-4">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                          <TrendingUp className="w-4 h-4" />
                          Your Share
                        </div>
                        <div className="text-xl font-bold text-foreground">
                          {claimableData?.sharePercentage || '0'}%
                        </div>
                      </div>
                    </div>

                    <div className="bg-primary/10 rounded-lg p-6 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-2">
                        <Gift className="w-5 h-5 text-primary" />
                        Claimable Rewards
                      </div>
                      <div className="text-3xl font-bold text-foreground mb-1">
                        {formatCurrency(claimableData?.claimableAmount || 0)}
                      </div>
                      <div className="text-muted-foreground text-sm mb-4">
                        {formatUSD(claimableData?.claimableAmount || 0)}
                      </div>

                      {claimableData?.alreadyClaimed ? (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                          <div className="flex items-center justify-center gap-2 text-green-500">
                            <CheckCircle2 className="w-5 h-5" />
                            Already Claimed This Week
                          </div>
                          {claimableData.lastClaimTxHash && (
                            <a 
                              href={`https://suivision.xyz/txblock/${claimableData.lastClaimTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline mt-1 block"
                            >
                              View Transaction
                            </a>
                          )}
                        </div>
                      ) : (
                        <Button
                          onClick={handleClaim}
                          disabled={isClaiming || !claimableData?.claimableAmount || claimableData.claimableAmount <= 0}
                          className="w-full max-w-xs"
                          data-testid="button-claim-rewards"
                        >
                          {isClaiming ? (
                            <div className="flex items-center gap-2">
                              <Loader size="sm" />
                              Processing...
                            </div>
                          ) : (
                            'Claim Rewards'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Wallet className="w-12 h-12 mx-auto text-primary mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">Connect Wallet</h3>
                <p className="text-muted-foreground mb-4">
                  Connect your wallet to view and claim your SBETS holder rewards
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                How It Works
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <ChartLine className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Betting Revenue Shared with SBETS Holders</div>
                    <div className="text-sm text-muted-foreground">30% of all platform revenue goes to token holders</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Coins className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Hold SBETS, Earn Weekly Rewards</div>
                    <div className="text-sm text-muted-foreground">Rewards distributed every Monday</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">The More SBETS You Hold, The More You Earn</div>
                    <div className="text-sm text-muted-foreground">Rewards are proportional to your holdings</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {revenueStats?.historicalRevenue && revenueStats.historicalRevenue.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <ChartLine className="w-5 h-5 text-primary" />
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
                            className="w-full rounded-t-lg transition-all duration-300 relative group bg-primary"
                            style={{ height: `${Math.max(height, 5)}%` }}
                          >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {formatCurrency(week.revenue)}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">{dayNames[index] || week.week.slice(5)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                On-Chain Treasury Status
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">SUI Treasury</div>
                  <div className="text-lg font-bold text-foreground">
                    {(revenueStats?.onChainData?.treasuryBalance || 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">SBETS Treasury</div>
                  <div className="text-lg font-bold text-foreground">
                    {formatCurrency(revenueStats?.onChainData?.treasuryBalanceSbets || 0, 'SBETS')}
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Total Bets</div>
                  <div className="text-lg font-bold text-foreground">
                    {revenueStats?.onChainData?.totalBets || 0}
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Total Volume</div>
                  <div className="text-lg font-bold text-foreground">
                    {(revenueStats?.onChainData?.totalVolume || 0).toFixed(2)} SUI
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-xs text-muted-foreground py-4">
            Rewards are based on real betting activity on the SuiBets platform.
          </div>
        </div>
      </div>
    </Layout>
  );
}