import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Medal, TrendingUp, Calendar, Coins } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  profit: number;
  totalBets: number;
  winRate: number;
  currency: string;
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'allTime'>('weekly');

  const { data, isLoading } = useQuery<{ leaderboard: LeaderboardEntry[] }>({
    queryKey: ['/api/leaderboard', period],
  });

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
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-yellow-500/30';
    if (rank === 2) return 'bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/30';
    if (rank === 3) return 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-amber-500/30';
    return 'bg-[#111111] border-cyan-900/30';
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-8" data-testid="leaderboard-page">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-yellow-500/20 rounded-xl">
            <Trophy className="h-8 w-8 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
            <p className="text-gray-400">Top winners by profit</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            variant={period === 'weekly' ? 'default' : 'outline'}
            onClick={() => setPeriod('weekly')}
            className="gap-2"
            data-testid="btn-period-weekly"
          >
            <Calendar className="h-4 w-4" />
            This Week
          </Button>
          <Button
            variant={period === 'monthly' ? 'default' : 'outline'}
            onClick={() => setPeriod('monthly')}
            className="gap-2"
            data-testid="btn-period-monthly"
          >
            <Calendar className="h-4 w-4" />
            This Month
          </Button>
          <Button
            variant={period === 'allTime' ? 'default' : 'outline'}
            onClick={() => setPeriod('allTime')}
            className="gap-2"
            data-testid="btn-period-alltime"
          >
            <TrendingUp className="h-4 w-4" />
            All Time
          </Button>
        </div>

        <Card className="bg-[#0a0a0a] border-cyan-900/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Coins className="h-5 w-5 text-cyan-400" />
              Top Winners
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full bg-gray-800" />
              ))
            ) : data?.leaderboard && data.leaderboard.length > 0 ? (
              data.leaderboard.map((entry) => (
                <div
                  key={entry.rank}
                  className={`flex items-center justify-between p-4 rounded-xl border ${getRankBg(entry.rank)}`}
                  data-testid={`leaderboard-entry-${entry.rank}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 flex justify-center">
                      {getRankIcon(entry.rank)}
                    </div>
                    <div>
                      <p className="text-white font-medium">{formatWallet(entry.wallet)}</p>
                      <p className="text-gray-400 text-sm">
                        {entry.totalBets} bets | {entry.winRate.toFixed(1)}% win rate
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${entry.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {entry.profit >= 0 ? '+' : ''}{entry.profit.toFixed(2)} {entry.currency}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No winners yet for this period</p>
                <p className="text-gray-500 text-sm">Place bets to climb the leaderboard!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
