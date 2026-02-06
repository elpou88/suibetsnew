import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useCurrentAccount } from '@mysten/dapp-kit';
import {
  TrendingUp, Users, Zap, Trophy, Copy, UserPlus,
  ArrowLeft, Clock, Target, ThumbsUp, ThumbsDown,
  Plus, Search, Filter, Flame, Crown, Award,
  BarChart3, Wallet, ExternalLink, RefreshCw, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const suibetsLogo = "/images/suibets-logo.png";

type SubTab = 'home' | 'predict' | 'challenge' | 'social';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'politics', label: 'Politics' },
  { value: 'tech', label: 'Tech' },
  { value: 'sports', label: 'Sports' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'other', label: 'Other' },
];

function formatWallet(wallet: string) {
  if (!wallet) return 'Anonymous';
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function timeAgo(date: string | Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function timeLeft(date: string | Date) {
  const diff = new Date(date).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m left`;
}

function CreatePredictionModal({ onClose, wallet }: { onClose: () => void; wallet: string }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [endDate, setEndDate] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/social/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, category, endDate, wallet })
      });
      if (!res.ok) throw new Error('Failed to create');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/predictions'] });
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose} data-testid="modal-create-prediction">
      <div className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-white mb-4">Create Prediction</h3>
        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Question</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Will BTC hit $150k by end of 2026?"
              className="w-full bg-black/50 border border-cyan-900/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none"
              data-testid="input-prediction-title"
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Description (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add context or rules..."
              className="w-full bg-black/50 border border-cyan-900/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none resize-none"
              rows={2}
              data-testid="input-prediction-description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-black/50 border border-cyan-900/30 rounded-lg px-4 py-3 text-white focus:border-cyan-500/50 focus:outline-none"
                data-testid="select-prediction-category"
              >
                {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">End Date</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-black/50 border border-cyan-900/30 rounded-lg px-4 py-3 text-white focus:border-cyan-500/50 focus:outline-none"
                data-testid="input-prediction-enddate"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 border-cyan-900/30 text-gray-400" onClick={onClose} data-testid="button-cancel-prediction">Cancel</Button>
            <Button
              className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-black font-bold"
              onClick={() => createMutation.mutate()}
              disabled={!title || !endDate || createMutation.isPending}
              data-testid="button-submit-prediction"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Market'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateChallengeModal({ onClose, wallet }: { onClose: () => void; wallet: string }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stakeAmount, setStakeAmount] = useState('1');
  const [currency, setCurrency] = useState('SUI');
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [expiresAt, setExpiresAt] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/social/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, stakeAmount, currency, maxParticipants: parseInt(maxParticipants), expiresAt, wallet })
      });
      if (!res.ok) throw new Error('Failed to create');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/challenges'] });
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose} data-testid="modal-create-challenge">
      <div className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-white mb-4">Create Challenge</h3>
        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Your Bet</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="I bet Barcelona wins El Clasico - who fades me?"
              className="w-full bg-black/50 border border-cyan-900/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none"
              data-testid="input-challenge-title"
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Details (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add context..."
              className="w-full bg-black/50 border border-cyan-900/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none resize-none"
              rows={2}
              data-testid="input-challenge-description"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Stake</label>
              <input
                type="number"
                value={stakeAmount}
                onChange={e => setStakeAmount(e.target.value)}
                className="w-full bg-black/50 border border-cyan-900/30 rounded-lg px-4 py-3 text-white focus:border-cyan-500/50 focus:outline-none"
                data-testid="input-challenge-stake"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Token</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full bg-black/50 border border-cyan-900/30 rounded-lg px-4 py-3 text-white focus:border-cyan-500/50 focus:outline-none"
                data-testid="select-challenge-currency"
              >
                <option value="SUI">SUI</option>
                <option value="SBETS">SBETS</option>
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Max Players</label>
              <input
                type="number"
                value={maxParticipants}
                onChange={e => setMaxParticipants(e.target.value)}
                className="w-full bg-black/50 border border-cyan-900/30 rounded-lg px-4 py-3 text-white focus:border-cyan-500/50 focus:outline-none"
                data-testid="input-challenge-max"
              />
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Expires</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className="w-full bg-black/50 border border-cyan-900/30 rounded-lg px-4 py-3 text-white focus:border-cyan-500/50 focus:outline-none"
              data-testid="input-challenge-expires"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 border-cyan-900/30 text-gray-400" onClick={onClose} data-testid="button-cancel-challenge">Cancel</Button>
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-black font-bold"
              onClick={() => createMutation.mutate()}
              disabled={!title || !stakeAmount || !expiresAt || createMutation.isPending}
              data-testid="button-submit-challenge"
            >
              {createMutation.isPending ? 'Creating...' : 'Launch Challenge'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileModal({ wallet, onClose, myWallet }: { wallet: string; onClose: () => void; myWallet?: string }) {
  const { data: profile, isLoading } = useQuery<any>({
    queryKey: ['/api/social/profile', wallet],
    queryFn: async () => {
      const res = await fetch(`/api/social/profile/${wallet}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    }
  });

  const { data: followingList = [] } = useQuery<string[]>({
    queryKey: ['/api/social/following', myWallet],
    queryFn: async () => {
      if (!myWallet) return [];
      const res = await fetch(`/api/social/following?wallet=${myWallet}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!myWallet
  });

  const isFollowing = followingList.includes(wallet.toLowerCase());

  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/social/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerWallet: myWallet, followingWallet: wallet })
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/following'] });
      queryClient.invalidateQueries({ queryKey: ['/api/social/profile', wallet] });
    }
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose} data-testid="modal-profile">
      <div className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48 bg-gray-800" />
            <Skeleton className="h-20 w-full bg-gray-800" />
          </div>
        ) : profile ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">{formatWallet(profile.wallet)}</h3>
                <p className="text-gray-500 text-sm">{profile.followers} followers / {profile.following} following</p>
              </div>
              {myWallet && myWallet.toLowerCase() !== wallet.toLowerCase() && (
                <Button
                  variant={isFollowing ? 'outline' : 'default'}
                  size="sm"
                  className={isFollowing ? 'border-cyan-500/30 text-cyan-400' : 'bg-cyan-500 text-black'}
                  onClick={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                  data-testid="button-follow-profile"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-black/50 border border-cyan-900/20 rounded-xl p-3 text-center">
                <p className={`text-lg font-bold ${profile.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>{profile.roi > 0 ? '+' : ''}{profile.roi}%</p>
                <p className="text-gray-500 text-xs">ROI</p>
              </div>
              <div className="bg-black/50 border border-cyan-900/20 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-cyan-400">{profile.winRate}%</p>
                <p className="text-gray-500 text-xs">Win Rate</p>
              </div>
              <div className="bg-black/50 border border-cyan-900/20 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-yellow-400">{profile.biggestWin}</p>
                <p className="text-gray-500 text-xs">Biggest Win</p>
              </div>
              <div className="bg-black/50 border border-cyan-900/20 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-white">{profile.totalBets}</p>
                <p className="text-gray-500 text-xs">Total Bets</p>
              </div>
            </div>
            {profile.recentBets && profile.recentBets.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Recent Bets</h4>
                <div className="space-y-2">
                  {profile.recentBets.map((bet: any) => (
                    <div key={bet.id} className="flex items-center justify-between p-3 bg-black/30 border border-cyan-900/10 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{bet.event}</p>
                        <p className="text-gray-500 text-xs">{bet.prediction} @ {bet.odds?.toFixed(2)}</p>
                      </div>
                      <Badge className={
                        bet.status === 'won' || bet.status === 'paid_out' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                        bet.status === 'lost' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                      }>{bet.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-400">Profile not found</p>
        )}
        <Button variant="outline" className="w-full mt-4 border-cyan-900/30 text-gray-400" onClick={onClose} data-testid="button-close-profile">Close</Button>
      </div>
    </div>
  );
}

function HomeTab({ onViewProfile }: { onViewProfile: (w: string) => void }) {
  const { data: predictions = [], isLoading: loadingPredictions } = useQuery<any[]>({
    queryKey: ['/api/social/predictions'],
  });

  const { data: challenges = [], isLoading: loadingChallenges } = useQuery<any[]>({
    queryKey: ['/api/social/challenges'],
  });

  const { data: leaderboard } = useQuery<{ leaderboard: any[] }>({
    queryKey: ['/api/leaderboard', 'weekly'],
  });

  const trending = [...(predictions || [])].sort((a, b) => (b.totalParticipants || 0) - (a.totalParticipants || 0)).slice(0, 5);
  const hotChallenges = [...(challenges || [])].filter(c => c.status === 'open').slice(0, 5);
  const topBettors = leaderboard?.leaderboard?.slice(0, 5) || [];

  return (
    <div className="space-y-6" data-testid="tab-home">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-cyan-900/30 to-blue-900/20 border-cyan-500/30">
          <CardContent className="p-4 text-center">
            <Target className="h-8 w-8 text-cyan-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{predictions?.length || 0}</p>
            <p className="text-gray-400 text-sm">Active Markets</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-900/30 to-red-900/20 border-orange-500/30">
          <CardContent className="p-4 text-center">
            <Zap className="h-8 w-8 text-orange-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{challenges?.filter(c => c.status === 'open').length || 0}</p>
            <p className="text-gray-400 text-sm">Open Challenges</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border-purple-500/30">
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-purple-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{topBettors.length}</p>
            <p className="text-gray-400 text-sm">Top Bettors</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-5 w-5 text-orange-400" />
            <h3 className="text-lg font-bold text-white">Trending Predictions</h3>
          </div>
          {loadingPredictions ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 bg-gray-800 rounded-xl" />)}</div>
          ) : trending.length === 0 ? (
            <Card className="bg-[#111111] border-cyan-900/20">
              <CardContent className="p-6 text-center">
                <Target className="h-10 w-10 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400">No predictions yet. Be the first to create one!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {trending.map((p: any) => {
                const total = (p.totalYesAmount || 0) + (p.totalNoAmount || 0);
                const yesPct = total > 0 ? ((p.totalYesAmount || 0) / total) * 100 : 50;
                return (
                  <Card key={p.id} className="bg-[#111111] border-cyan-900/20 hover:border-cyan-500/30 transition-colors" data-testid={`prediction-card-${p.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-white font-medium text-sm flex-1">{p.title}</p>
                        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs shrink-0">{p.category}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-2 bg-black/50 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${yesPct}%` }} />
                        </div>
                        <span className="text-green-400 text-xs font-bold">{yesPct.toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{p.totalParticipants || 0} participants</span>
                        <span>{timeLeft(p.endDate)}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-orange-400" />
            <h3 className="text-lg font-bold text-white">Hot Challenges</h3>
          </div>
          {loadingChallenges ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 bg-gray-800 rounded-xl" />)}</div>
          ) : hotChallenges.length === 0 ? (
            <Card className="bg-[#111111] border-cyan-900/20">
              <CardContent className="p-6 text-center">
                <Zap className="h-10 w-10 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400">No challenges yet. Create a viral bet!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {hotChallenges.map((c: any) => (
                <Card key={c.id} className="bg-[#111111] border-orange-900/20 hover:border-orange-500/30 transition-colors" data-testid={`challenge-card-${c.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-white font-medium text-sm flex-1">{c.title}</p>
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs shrink-0">{c.stakeAmount} {c.currency}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>by {formatWallet(c.creatorWallet)}</span>
                      <span>{c.currentParticipants || 1}/{c.maxParticipants || 10} joined</span>
                      <span>{timeLeft(c.expiresAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Crown className="h-5 w-5 text-yellow-400" />
          <h3 className="text-lg font-bold text-white">Smart Bettors to Follow</h3>
        </div>
        {topBettors.length === 0 ? (
          <Card className="bg-[#111111] border-cyan-900/20">
            <CardContent className="p-6 text-center">
              <Trophy className="h-10 w-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">Leaderboard data loading...</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {topBettors.map((user: any, idx: number) => (
              <Card
                key={user.wallet || idx}
                className="bg-[#111111] border-cyan-900/20 hover:border-cyan-500/30 transition-colors cursor-pointer"
                onClick={() => user.wallet && onViewProfile(user.wallet)}
                data-testid={`bettor-card-${idx}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        #{idx + 1}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">{formatWallet(user.wallet)}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold ${(user.totalProfitUsd || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {(user.totalProfitUsd || 0) >= 0 ? '+' : ''}{(user.totalProfitUsd || 0).toFixed(2)} USD
                        </span>
                        <span className="text-gray-500 text-xs">{user.winRate?.toFixed(0)}% WR</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PredictTab({ wallet }: { wallet?: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: predictions = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/social/predictions', selectedCategory],
    queryFn: async () => {
      const res = await fetch(`/api/social/predictions?category=${selectedCategory}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    }
  });

  const betMutation = useMutation({
    mutationFn: async ({ predictionId, side }: { predictionId: number; side: string }) => {
      const res = await fetch(`/api/social/predictions/${predictionId}/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, side, amount: 1, currency: 'SUI' })
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/predictions'] });
    }
  });

  return (
    <div className="space-y-4" data-testid="tab-predict">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {CATEGORIES.map(c => (
            <Button
              key={c.value}
              variant={selectedCategory === c.value ? 'default' : 'outline'}
              size="sm"
              className={selectedCategory === c.value ? 'bg-cyan-500 text-black' : 'border-cyan-900/30 text-gray-400'}
              onClick={() => setSelectedCategory(c.value)}
              data-testid={`filter-category-${c.value}`}
            >
              {c.label}
            </Button>
          ))}
        </div>
        {wallet && (
          <Button className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold" onClick={() => setShowCreate(true)} data-testid="button-create-prediction">
            <Plus className="h-4 w-4 mr-1" />
            Create Market
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 bg-gray-800 rounded-xl" />)}</div>
      ) : predictions.length === 0 ? (
        <Card className="bg-[#111111] border-cyan-900/20">
          <CardContent className="p-8 text-center">
            <Target className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-white font-bold mb-1">No predictions yet</h3>
            <p className="text-gray-400 text-sm mb-4">Create the first prediction market and let the community decide!</p>
            {wallet && (
              <Button className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold" onClick={() => setShowCreate(true)} data-testid="button-create-first-prediction">
                <Plus className="h-4 w-4 mr-1" />
                Create First Market
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {predictions.map((p: any) => {
            const total = (p.totalYesAmount || 0) + (p.totalNoAmount || 0);
            const yesPct = total > 0 ? ((p.totalYesAmount || 0) / total) * 100 : 50;
            const noPct = 100 - yesPct;
            const isActive = p.status === 'active' && new Date(p.endDate) > new Date();
            return (
              <Card key={p.id} className="bg-[#111111] border-cyan-900/20" data-testid={`prediction-${p.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1">
                      <p className="text-white font-medium">{p.title}</p>
                      {p.description && <p className="text-gray-500 text-sm mt-1">{p.description}</p>}
                    </div>
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs shrink-0">{p.category}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-3 bg-black/50 rounded-full overflow-hidden flex">
                      <div className="h-full bg-green-500" style={{ width: `${yesPct}%` }} />
                      <div className="h-full bg-red-500" style={{ width: `${noPct}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <span className="text-green-400 text-sm font-bold">YES {yesPct.toFixed(0)}%</span>
                      <span className="text-red-400 text-sm font-bold">NO {noPct.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{p.totalParticipants || 0} bets</span>
                      <span>{total.toFixed(2)} SUI pool</span>
                      <span>{timeLeft(p.endDate)}</span>
                    </div>
                  </div>
                  {isActive && wallet && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30"
                        onClick={() => betMutation.mutate({ predictionId: p.id, side: 'yes' })}
                        disabled={betMutation.isPending}
                        data-testid={`button-yes-${p.id}`}
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        YES (1 SUI)
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                        onClick={() => betMutation.mutate({ predictionId: p.id, side: 'no' })}
                        disabled={betMutation.isPending}
                        data-testid={`button-no-${p.id}`}
                      >
                        <ThumbsDown className="h-4 w-4 mr-1" />
                        NO (1 SUI)
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
                    <span>by {formatWallet(p.creatorWallet)}</span>
                    <span>{timeAgo(p.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showCreate && wallet && <CreatePredictionModal onClose={() => setShowCreate(false)} wallet={wallet} />}
    </div>
  );
}

function ChallengeTab({ wallet }: { wallet?: string }) {
  const [showCreate, setShowCreate] = useState(false);

  const { data: challenges = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/social/challenges'],
  });

  const joinMutation = useMutation({
    mutationFn: async ({ challengeId }: { challengeId: number }) => {
      const res = await fetch(`/api/social/challenges/${challengeId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, side: 'against' })
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/challenges'] });
    }
  });

  const openChallenges = challenges.filter(c => c.status === 'open');
  const closedChallenges = challenges.filter(c => c.status !== 'open');

  return (
    <div className="space-y-4" data-testid="tab-challenge">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Zap className="h-5 w-5 text-orange-400" />
          One-Tap Challenges
        </h3>
        {wallet && (
          <Button className="bg-orange-500 hover:bg-orange-600 text-black font-bold" onClick={() => setShowCreate(true)} data-testid="button-create-challenge">
            <Plus className="h-4 w-4 mr-1" />
            Create Challenge
          </Button>
        )}
      </div>

      <Card className="bg-gradient-to-r from-orange-900/20 to-red-900/10 border-orange-500/20">
        <CardContent className="p-4">
          <p className="text-white font-medium mb-1">How it works</p>
          <p className="text-gray-400 text-sm">Create a bet, set the stake, and challenge others. Friends join, followers copy, and feeds form. It's betting meets social media.</p>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 bg-gray-800 rounded-xl" />)}</div>
      ) : openChallenges.length === 0 ? (
        <Card className="bg-[#111111] border-cyan-900/20">
          <CardContent className="p-8 text-center">
            <Zap className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-white font-bold mb-1">No open challenges</h3>
            <p className="text-gray-400 text-sm mb-4">Be the first to throw down a challenge!</p>
            {wallet && (
              <Button className="bg-orange-500 hover:bg-orange-600 text-black font-bold" onClick={() => setShowCreate(true)} data-testid="button-create-first-challenge">
                <Plus className="h-4 w-4 mr-1" />
                Create First Challenge
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {openChallenges.map((c: any) => {
            const isFull = (c.currentParticipants || 1) >= (c.maxParticipants || 10);
            const isExpired = new Date(c.expiresAt) <= new Date();
            const isCreator = wallet && wallet.toLowerCase() === c.creatorWallet?.toLowerCase();
            return (
              <Card key={c.id} className="bg-[#111111] border-orange-900/20 hover:border-orange-500/30 transition-colors" data-testid={`challenge-${c.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <p className="text-white font-medium">{c.title}</p>
                      {c.description && <p className="text-gray-500 text-sm mt-1">{c.description}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-orange-400 font-bold">{c.stakeAmount} {c.currency}</p>
                      <p className="text-gray-500 text-xs">per player</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-400">
                        <Users className="h-4 w-4 inline mr-1" />
                        {c.currentParticipants || 1}/{c.maxParticipants || 10}
                      </span>
                      <span className="text-gray-500 text-xs">{timeLeft(c.expiresAt)}</span>
                    </div>
                    <span className="text-gray-600 text-xs">by {formatWallet(c.creatorWallet)}</span>
                  </div>
                  {wallet && !isCreator && !isFull && !isExpired && (
                    <Button
                      className="w-full bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 font-bold"
                      onClick={() => joinMutation.mutate({ challengeId: c.id })}
                      disabled={joinMutation.isPending}
                      data-testid={`button-fade-${c.id}`}
                    >
                      FADE THIS BET
                    </Button>
                  )}
                  {(isFull || isExpired) && (
                    <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">{isFull ? 'Full' : 'Expired'}</Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {closedChallenges.length > 0 && (
        <div>
          <h4 className="text-gray-400 font-semibold mb-3 text-sm">Past Challenges</h4>
          <div className="space-y-2">
            {closedChallenges.slice(0, 5).map((c: any) => (
              <Card key={c.id} className="bg-[#0a0a0a] border-gray-800 opacity-60">
                <CardContent className="p-3 flex items-center justify-between">
                  <p className="text-gray-400 text-sm">{c.title}</p>
                  <Badge className="bg-gray-700/50 text-gray-500 border-gray-700">{c.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {showCreate && wallet && <CreateChallengeModal onClose={() => setShowCreate(false)} wallet={wallet} />}
    </div>
  );
}

function SocialTab({ onViewProfile, myWallet }: { onViewProfile: (w: string) => void; myWallet?: string }) {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: leaderboard, isLoading } = useQuery<{ leaderboard: any[] }>({
    queryKey: ['/api/leaderboard', 'weekly'],
  });

  const { data: followingList = [] } = useQuery<string[]>({
    queryKey: ['/api/social/following', myWallet],
    queryFn: async () => {
      if (!myWallet) return [];
      const res = await fetch(`/api/social/following?wallet=${myWallet}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!myWallet
  });

  const followMutation = useMutation({
    mutationFn: async (targetWallet: string) => {
      const res = await fetch('/api/social/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerWallet: myWallet, followingWallet: targetWallet })
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/following'] });
    }
  });

  const allUsers = leaderboard?.leaderboard || [];
  const filtered = searchQuery
    ? allUsers.filter(u => u.wallet?.toLowerCase().includes(searchQuery.toLowerCase()))
    : allUsers;

  return (
    <div className="space-y-4" data-testid="tab-social">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search wallets..."
          className="w-full bg-[#111111] border border-cyan-900/30 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none"
          data-testid="input-search-social"
        />
      </div>

      {myWallet && followingList.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Following ({followingList.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {followingList.map(w => (
              <Card key={w} className="bg-[#111111] border-cyan-900/20 hover:border-cyan-500/30 transition-colors cursor-pointer" onClick={() => onViewProfile(w)}>
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full" />
                    <span className="text-white text-sm">{formatWallet(w)}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-cyan-500/30 text-cyan-400 text-xs"
                    onClick={(e) => { e.stopPropagation(); followMutation.mutate(w); }}
                    data-testid={`button-unfollow-${w.slice(0,8)}`}
                  >
                    Unfollow
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Leaderboard - Top Bettors
        </h3>
        {isLoading ? (
          <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 bg-gray-800 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="bg-[#111111] border-cyan-900/20">
            <CardContent className="p-6 text-center">
              <Users className="h-10 w-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">No users found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((user: any, idx: number) => {
              const isFollowing = followingList.includes(user.wallet?.toLowerCase());
              const rankColors = idx === 0 ? 'from-yellow-500 to-amber-500' : idx === 1 ? 'from-gray-300 to-gray-400' : idx === 2 ? 'from-amber-600 to-amber-700' : 'from-cyan-600 to-cyan-700';
              return (
                <Card
                  key={user.wallet || idx}
                  className="bg-[#111111] border-cyan-900/20 hover:border-cyan-500/30 transition-colors cursor-pointer"
                  onClick={() => user.wallet && onViewProfile(user.wallet)}
                  data-testid={`leaderboard-user-${idx}`}
                >
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-9 h-9 bg-gradient-to-br ${rankColors} rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium">{formatWallet(user.wallet)}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold ${(user.totalProfitUsd || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {(user.totalProfitUsd || 0) >= 0 ? '+' : ''}${(user.totalProfitUsd || 0).toFixed(2)}
                          </span>
                          <span className="text-gray-500 text-xs">{user.winRate?.toFixed(0)}% WR</span>
                          <span className="text-gray-600 text-xs">{user.totalBets} bets</span>
                          {user.loyaltyTier && user.loyaltyTier !== 'Bronze' && (
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">{user.loyaltyTier}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {myWallet && user.wallet && myWallet.toLowerCase() !== user.wallet.toLowerCase() && (
                        <Button
                          variant={isFollowing ? 'outline' : 'default'}
                          size="sm"
                          className={isFollowing ? 'border-cyan-500/30 text-cyan-400 text-xs' : 'bg-cyan-500 text-black text-xs'}
                          onClick={(e) => { e.stopPropagation(); followMutation.mutate(user.wallet); }}
                          data-testid={`button-follow-${idx}`}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </Button>
                      )}
                      <ChevronRight className="h-4 w-4 text-gray-600" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NetworkPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<SubTab>('home');
  const [viewingProfile, setViewingProfile] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const currentAccount = useCurrentAccount();
  const myWallet = currentAccount?.address;

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['/api/social'] });
    queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleConnectWallet = () => {
    window.dispatchEvent(new CustomEvent('suibets:connect-wallet-required'));
  };

  const tabs: { key: SubTab; label: string; icon: JSX.Element }[] = [
    { key: 'home', label: 'Home', icon: <Flame className="h-4 w-4" /> },
    { key: 'predict', label: 'Predict', icon: <Target className="h-4 w-4" /> },
    { key: 'challenge', label: 'Challenge', icon: <Zap className="h-4 w-4" /> },
    { key: 'social', label: 'Social', icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-black" data-testid="network-page">
      <nav className="bg-[#0a0a0a] border-b border-cyan-900/30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
              data-testid="btn-back"
            >
              <ArrowLeft size={20} />
            </button>
            <Link href="/" data-testid="link-logo">
              <img src={suibetsLogo} alt="SuiBets" className="h-10 w-auto cursor-pointer" />
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-gray-400 hover:text-cyan-400 text-sm font-medium" data-testid="nav-bets">Bets</Link>
            <Link href="/dashboard" className="text-gray-400 hover:text-cyan-400 text-sm font-medium" data-testid="nav-dashboard">Dashboard</Link>
            <Link href="/bet-history" className="text-gray-400 hover:text-cyan-400 text-sm font-medium" data-testid="nav-my-bets">My Bets</Link>
            <Link href="/whitepaper" className="text-gray-400 hover:text-cyan-400 text-sm font-medium" data-testid="nav-whitepaper">Whitepaper</Link>
            <Link href="/network" className="text-cyan-400 text-sm font-medium" data-testid="nav-network">Predict</Link>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleRefresh} className="text-gray-400 hover:text-white p-2" data-testid="btn-refresh">
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            {myWallet ? (
              <span className="text-cyan-400 text-sm">{formatWallet(myWallet)}</span>
            ) : (
              <button onClick={handleConnectWallet} className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2" data-testid="btn-connect">
                <Wallet size={16} />
                Connect
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-xl">
              <TrendingUp className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Predict Anything</h1>
              <p className="text-gray-400 text-sm">On-chain predictions, challenges & social betting</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-[#0a0a0a] border border-cyan-900/30 rounded-xl p-1 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              data-testid={`tab-button-${tab.key}`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {!myWallet && (
          <Card className="bg-gradient-to-r from-cyan-900/20 to-purple-900/10 border-cyan-500/20 mb-6">
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-white font-medium">Connect your wallet to participate</p>
                <p className="text-gray-400 text-sm">Create predictions, join challenges, and follow top bettors</p>
              </div>
              <Button className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold" onClick={handleConnectWallet} data-testid="button-connect-cta">
                <Wallet className="h-4 w-4 mr-1" />
                Connect Wallet
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTab === 'home' && <HomeTab onViewProfile={setViewingProfile} />}
        {activeTab === 'predict' && <PredictTab wallet={myWallet} />}
        {activeTab === 'challenge' && <ChallengeTab wallet={myWallet} />}
        {activeTab === 'social' && <SocialTab onViewProfile={setViewingProfile} myWallet={myWallet} />}
      </div>

      {viewingProfile && (
        <ProfileModal
          wallet={viewingProfile}
          onClose={() => setViewingProfile(null)}
          myWallet={myWallet}
        />
      )}
    </div>
  );
}