import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Trophy, Medal, TrendingUp, Calendar, Coins, ArrowLeft, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  suiProfit: number;
  sbetsProfit: number;
  totalProfitUsd: number;
  totalBets: number;
  suiBets: number;
  sbetsBets: number;
  winRate: number;
  loyaltyPoints?: number;
  loyaltyTier?: string;
}

export default function LeaderboardPage() {
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'allTime'>('weekly');

  const { data, isLoading } = useQuery<{ leaderboard: LeaderboardEntry[] }>({
    queryKey: ['/api/leaderboard', period],
  });

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  };

  const formatWallet = (wallet: string) => {
    if (!wallet) return 'Anonymous';
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-400" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-300" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />;
    return <span className="text-gray-400 font-bold w-6 text-center">{rank}</span>;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]';
    if (rank === 2) return 'bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/30 shadow-[0_0_15px_rgba(156,163,175,0.1)]';
    if (rank === 3) return 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-amber-500/30 shadow-[0_0_15px_rgba(180,83,9,0.1)]';
    return 'bg-[#0a0a0a] border-cyan-900/20 hover:border-cyan-500/30 transition-colors';
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-8 relative overflow-hidden" data-testid="leaderboard-page">
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={handleBack}
            className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
            data-testid="btn-back"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="p-3 bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 rounded-xl border border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
            <Trophy className="h-8 w-8 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Leaderboard</h1>
            <p className="text-gray-400 font-medium">Top winners by profit</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8 p-1 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 w-fit">
          <Button
            variant="ghost"
            onClick={() => setPeriod('weekly')}
            className={`gap-2 rounded-lg transition-all ${period === 'weekly' ? 'bg-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:bg-cyan-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            data-testid="btn-period-weekly"
          >
            <Calendar className="h-4 w-4" />
            This Week
          </Button>
          <Button
            variant="ghost"
            onClick={() => setPeriod('monthly')}
            className={`gap-2 rounded-lg transition-all ${period === 'monthly' ? 'bg-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:bg-cyan-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            data-testid="btn-period-monthly"
          >
            <Calendar className="h-4 w-4" />
            This Month
          </Button>
          <Button
            variant="ghost"
            onClick={() => setPeriod('allTime')}
            className={`gap-2 rounded-lg transition-all ${period === 'allTime' ? 'bg-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:bg-cyan-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            data-testid="btn-period-alltime"
          >
            <TrendingUp className="h-4 w-4" />
            All Time
          </Button>
        </div>

        <Card className="bg-black/60 backdrop-blur-md border-cyan-900/30 shadow-2xl overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/[0.02]">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Coins className="h-5 w-5 text-yellow-400" />
              Ranking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-6">
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full bg-white/5 rounded-xl" />
              ))
            ) : data?.leaderboard && data.leaderboard.length > 0 ? (
              data.leaderboard.map((entry) => (
                <div
                  key={entry.rank}
                  className={`flex items-center justify-between p-5 rounded-xl border transition-all duration-300 group ${getRankBg(entry.rank)}`}
                  data-testid={`leaderboard-entry-${entry.rank}`}
                >
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 flex items-center justify-center bg-black/40 rounded-full border border-white/5">
                      {getRankIcon(entry.rank)}
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg group-hover:text-cyan-400 transition-colors">{formatWallet(entry.wallet)}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-gray-400 text-xs flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full">
                          <TrendingUp className="h-3 w-3" /> {entry.totalBets} Bets
                        </span>
                        <span className="text-gray-400 text-xs flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full">
                          <Trophy className="h-3 w-3" /> {entry.winRate.toFixed(1)}% WR
                        </span>
                        {entry.loyaltyPoints !== undefined && entry.loyaltyPoints > 0 && (
                          <span className="text-yellow-400 text-xs flex items-center gap-1 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                            <Star className="h-3 w-3" /> {entry.loyaltyPoints.toLocaleString()} pts
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    {entry.suiProfit !== 0 && (
                      <div className="flex items-center justify-end gap-2">
                        <span className={`text-lg font-black ${entry.suiProfit >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                          {entry.suiProfit >= 0 ? '+' : ''}{entry.suiProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-cyan-500/70 bg-cyan-500/10 px-1.5 py-0.5 rounded">SUI</span>
                      </div>
                    )}
                    {entry.sbetsProfit !== 0 && (
                      <div className="flex items-center justify-end gap-2">
                        <span className={`text-lg font-black ${entry.sbetsProfit >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {entry.sbetsProfit >= 0 ? '+' : ''}{entry.sbetsProfit >= 1000000 
                            ? `${(entry.sbetsProfit / 1000000).toFixed(2)}M`
                            : entry.sbetsProfit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-yellow-500/70 bg-yellow-500/10 px-1.5 py-0.5 rounded">SBETS</span>
                      </div>
                    )}
                    <div className="text-[10px] text-gray-500 mt-1">
                      ≈ ${entry.totalProfitUsd >= 0 ? '+' : ''}{entry.totalProfitUsd.toFixed(2)} USD
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-white/[0.01] rounded-2xl border border-dashed border-white/10">
                <div className="relative inline-block mb-6">
                  <Trophy className="h-16 w-16 text-gray-800" />
                  <div className="absolute inset-0 bg-yellow-500/10 blur-xl rounded-full" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No winners found</h3>
                <p className="text-gray-400 max-w-xs mx-auto">The arena is empty. Start betting to claim your spot on the throne!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
