import { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useToast } from '@/hooks/use-toast';
import {
  TrendingUp, Users, Zap, Trophy, Copy, UserPlus,
  ArrowLeft, Clock, Target, ThumbsUp, ThumbsDown,
  Plus, Search, Filter, Flame, Crown, Award,
  BarChart3, Wallet, ExternalLink, RefreshCw, ChevronRight,
  Share2, CheckCircle, XCircle, DollarSign, Star, X,
  MessageCircle, Info, Send, ChevronDown, ChevronUp
} from 'lucide-react';
import { SiX } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const suibetsLogo = "/images/suibets-logo.png";

type SubTab = 'home' | 'predict' | 'challenge' | 'social';

type ChatMessage = {
  id: number;
  wallet: string;
  message: string;
  createdAt: string;
};

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

const BET_AMOUNTS = [100, 500, 1000, 5000, 10000];

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

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function getXHandle(wallet: string): string {
  if (!wallet) return '';
  try {
    return localStorage.getItem(`x_handle_${wallet}`) || '';
  } catch { return ''; }
}

function setXHandle(wallet: string, handle: string) {
  if (!wallet) return;
  try {
    localStorage.setItem(`x_handle_${wallet}`, handle);
  } catch {}
}

function CreatePredictionModal({ onClose, wallet }: { onClose: () => void; wallet: string }) {
  const { toast } = useToast();
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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create prediction');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/predictions'] });
      toast({ title: 'Prediction Created', description: 'Your prediction market is now live!' });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose} data-testid="modal-create-prediction">
      <div className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Create Prediction Market</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1"><X size={20} /></button>
        </div>
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
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stakeAmount, setStakeAmount] = useState('100');
  const [currency, setCurrency] = useState('SBETS');
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [expiresAt, setExpiresAt] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/social/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, stakeAmount, currency, maxParticipants: parseInt(maxParticipants), expiresAt, wallet })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create challenge');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/challenges'] });
      toast({ title: 'Challenge Created', description: `Your ${stakeAmount} ${currency} challenge is live!` });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose} data-testid="modal-create-challenge">
      <div className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Create Challenge</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1"><X size={20} /></button>
        </div>
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
                min="1"
                step="1"
                className="w-full bg-black/50 border border-cyan-900/30 rounded-lg px-4 py-3 text-white focus:border-cyan-500/50 focus:outline-none"
                data-testid="input-challenge-stake"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Token</label>
              <div className="w-full bg-black/50 border border-cyan-900/30 rounded-lg px-4 py-3 text-cyan-400 font-semibold" data-testid="display-challenge-currency">
                SBETS
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Max Players</label>
              <input
                type="number"
                value={maxParticipants}
                onChange={e => setMaxParticipants(e.target.value)}
                min="2"
                max="100"
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
  const { toast } = useToast();
  const xHandle = getXHandle(wallet);

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/following'] });
      queryClient.invalidateQueries({ queryKey: ['/api/social/profile', wallet] });
      toast({ title: data.action === 'followed' ? 'Following' : 'Unfollowed', description: data.action === 'followed' ? `You are now following ${formatWallet(wallet)}` : `Unfollowed ${formatWallet(wallet)}` });
    }
  });

  const handleCopyWallet = () => {
    copyToClipboard(wallet);
    toast({ title: 'Copied', description: 'Wallet address copied to clipboard' });
  };

  const handleShareOnX = () => {
    const text = encodeURIComponent(`Check out my betting stats on @SuiBets! ${window.location.origin}/network`);
    window.open(`https://x.com/intent/tweet?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose} data-testid="modal-profile">
      <div className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48 bg-gray-800" />
            <Skeleton className="h-20 w-full bg-gray-800" />
            <Skeleton className="h-32 w-full bg-gray-800" />
          </div>
        ) : profile ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{formatWallet(profile.wallet)}</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-500 text-xs">{profile.followers} followers / {profile.following} following</p>
                      {xHandle && (
                        <span className="text-cyan-400 text-xs">@{xHandle.replace('@', '')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="border-cyan-900/30 text-gray-400"
                  onClick={handleShareOnX}
                  data-testid="button-share-x-profile"
                >
                  <SiX className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-cyan-900/30 text-gray-400"
                  onClick={handleCopyWallet}
                  data-testid="button-copy-wallet"
                >
                  <Copy className="h-4 w-4" />
                </Button>
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
                <p className="text-lg font-bold text-yellow-400">{profile.biggestWin} SUI</p>
                <p className="text-gray-500 text-xs">Biggest Win</p>
              </div>
              <div className="bg-black/50 border border-cyan-900/20 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-white">{profile.totalBets}</p>
                <p className="text-gray-500 text-xs">Total Bets</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-black/50 border border-cyan-900/20 rounded-xl p-3 text-center">
                <p className={`text-lg font-bold ${profile.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {profile.profit >= 0 ? '+' : ''}{profile.profit} SUI
                </p>
                <p className="text-gray-500 text-xs">Total Profit</p>
              </div>
              <div className="bg-black/50 border border-cyan-900/20 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-purple-400">{profile.totalStaked} SUI</p>
                <p className="text-gray-500 text-xs">Total Staked</p>
              </div>
            </div>
            {profile.recentBets && profile.recentBets.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Recent Bets</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {profile.recentBets.map((bet: any) => (
                    <div key={bet.id} className="flex items-center justify-between p-3 bg-black/30 border border-cyan-900/10 rounded-lg gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{bet.event}</p>
                        <p className="text-gray-500 text-xs">{bet.prediction} @ {bet.odds?.toFixed(2)} | {bet.stake} SUI</p>
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
            {(!profile.recentBets || profile.recentBets.length === 0) && (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">No betting history yet</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Profile not found</p>
          </div>
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
  const topBettors = leaderboard?.leaderboard?.slice(0, 6) || [];

  return (
    <div className="space-y-6" data-testid="tab-home">
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-cyan-900/30 to-blue-900/20 border-cyan-500/30">
          <CardContent className="p-4 text-center">
            <Target className="h-7 w-7 text-cyan-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{predictions?.length || 0}</p>
            <p className="text-gray-400 text-xs">Active Markets</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-900/30 to-red-900/20 border-orange-500/30">
          <CardContent className="p-4 text-center">
            <Zap className="h-7 w-7 text-orange-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{challenges?.filter(c => c.status === 'open').length || 0}</p>
            <p className="text-gray-400 text-xs">Open Challenges</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border-purple-500/30">
          <CardContent className="p-4 text-center">
            <Users className="h-7 w-7 text-purple-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{topBettors.length}</p>
            <p className="text-gray-400 text-xs">Top Bettors</p>
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
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 bg-gray-800 rounded-xl" />)}</div>
          ) : trending.length === 0 ? (
            <Card className="bg-[#111111] border-cyan-900/20">
              <CardContent className="p-6 text-center">
                <Target className="h-10 w-10 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No predictions yet. Switch to the Predict tab to create one!</p>
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
                        <div className="flex-1 h-2.5 bg-black/50 rounded-full overflow-hidden flex">
                          <div className="h-full bg-green-500 rounded-l-full" style={{ width: `${yesPct}%` }} />
                          <div className="h-full bg-red-500 rounded-r-full" style={{ width: `${100 - yesPct}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="text-green-400 font-bold">YES {yesPct.toFixed(0)}%</span>
                          <span className="text-red-400 font-bold">NO {(100 - yesPct).toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <span>{p.totalParticipants || 0} bets</span>
                          <span>{total > 0 ? total.toFixed(0) : '0'} SBETS pool</span>
                          <span>{timeLeft(p.endDate)}</span>
                        </div>
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
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 bg-gray-800 rounded-xl" />)}</div>
          ) : hotChallenges.length === 0 ? (
            <Card className="bg-[#111111] border-cyan-900/20">
              <CardContent className="p-6 text-center">
                <Zap className="h-10 w-10 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No challenges yet. Switch to the Challenge tab to create one!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {hotChallenges.map((c: any) => {
                const fillPct = ((c.currentParticipants || 1) / (c.maxParticipants || 10)) * 100;
                return (
                  <Card key={c.id} className="bg-[#111111] border-orange-900/20 hover:border-orange-500/30 transition-colors" data-testid={`challenge-card-${c.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-white font-medium text-sm flex-1">{c.title}</p>
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs shrink-0">{c.stakeAmount} {c.currency}</Badge>
                      </div>
                      <div className="mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-black/50 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${fillPct}%` }} />
                          </div>
                          <span className="text-orange-400 text-xs font-bold">{c.currentParticipants || 1}/{c.maxParticipants || 10}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>by {formatWallet(c.creatorWallet)}</span>
                        <span>{timeLeft(c.expiresAt)}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
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
            {topBettors.map((user: any, idx: number) => {
              const rankColors = idx === 0 ? 'from-yellow-500 to-amber-500' : idx === 1 ? 'from-gray-300 to-gray-400' : idx === 2 ? 'from-amber-600 to-amber-700' : 'from-cyan-600 to-cyan-700';
              return (
                <Card
                  key={user.wallet || idx}
                  className="bg-[#111111] border-cyan-900/20 hover:border-cyan-500/30 transition-colors cursor-pointer"
                  onClick={() => user.wallet && onViewProfile(user.wallet)}
                  data-testid={`bettor-card-${idx}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 bg-gradient-to-br ${rankColors} rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                        #{idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm">{formatWallet(user.wallet)}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold ${(user.totalProfitUsd || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {(user.totalProfitUsd || 0) >= 0 ? '+' : ''}${(user.totalProfitUsd || 0).toFixed(2)}
                          </span>
                          <span className="text-gray-500 text-xs">{user.winRate?.toFixed(0)}% WR</span>
                          <span className="text-gray-600 text-xs">{user.totalBets} bets</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-600 shrink-0" />
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

function PredictTab({ wallet }: { wallet?: string }) {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [betAmounts, setBetAmounts] = useState<Record<number, number>>({});
  const [showHowItWorks, setShowHowItWorks] = useState(true);

  const { data: predictions = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/social/predictions', selectedCategory],
    queryFn: async () => {
      const res = await fetch(`/api/social/predictions?category=${selectedCategory}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    }
  });

  const { data: myBets = [] } = useQuery<any[]>({
    queryKey: ['/api/social/predictions/bets', wallet],
    queryFn: async () => {
      if (!wallet) return [];
      const res = await fetch(`/api/social/predictions/bets?wallet=${wallet}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!wallet
  });

  const betMutation = useMutation({
    mutationFn: async ({ predictionId, side, amount }: { predictionId: number; side: string; amount: number }) => {
      const res = await fetch(`/api/social/predictions/${predictionId}/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, side, amount, currency: 'SBETS' })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to place bet');
      }
      return res.json();
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/predictions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/social/predictions/bets'] });
      const txDesc = data?.txId ? ` | TX: ${data.txId}` : '';
      toast({ title: 'Bet Placed', description: `${vars.amount} SBETS on ${vars.side.toUpperCase()}${txDesc}` });
    },
    onError: (err: Error) => {
      toast({ title: 'Bet Failed', description: err.message, variant: 'destructive' });
    }
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ predictionId, outcome }: { predictionId: number; outcome: string }) => {
      const res = await fetch(`/api/social/predictions/${predictionId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, outcome })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to resolve');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/predictions'] });
      toast({ title: 'Market Resolved', description: 'The prediction market has been resolved.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  });

  const handleBet = (predictionId: number, side: string) => {
    if (!wallet) {
      window.dispatchEvent(new CustomEvent('suibets:connect-wallet-required'));
      return;
    }
    const amount = betAmounts[predictionId] || 100;
    betMutation.mutate({ predictionId, side, amount });
  };

  const getBetAmount = (id: number) => betAmounts[id] || 100;

  const getBetsForPrediction = (predictionId: number) => {
    return myBets.filter((b: any) => b.predictionId === predictionId);
  };

  return (
    <div className="space-y-4" data-testid="tab-predict">
      <Card className="bg-gradient-to-r from-cyan-900/20 to-blue-900/10 border-cyan-500/20">
        <CardContent className="p-4">
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="flex items-center justify-between w-full"
            data-testid="button-toggle-how-it-works"
          >
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-cyan-400" />
              <span className="text-white font-medium">How You Win</span>
            </div>
            {showHowItWorks ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>
          {showHowItWorks && (
            <div className="mt-3 space-y-2 text-sm text-gray-400">
              <p>Predict = Pool-based prediction market. You bet YES or NO on any question.</p>
              <p>All SBETS from bettors go into a shared pool.</p>
              <p>When the creator resolves the market (YES or NO), the winning side splits the ENTIRE pool proportionally to how much each person bet.</p>
              <p className="text-cyan-400/80">Example: If 10,000 SBETS on YES and 5,000 on NO, and YES wins, YES bettors split 15,000 SBETS proportionally.</p>
              <p>Bets are recorded in database and tracked to your wallet. Payouts calculated automatically.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
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
        <Button className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold" onClick={() => {
          if (!wallet) {
            window.dispatchEvent(new CustomEvent('suibets:connect-wallet-required'));
            return;
          }
          setShowCreate(true);
        }} data-testid="button-create-prediction">
          <Plus className="h-4 w-4 mr-1" />
          Create Market
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32 bg-gray-800 rounded-xl" />)}</div>
      ) : predictions.length === 0 ? (
        <Card className="bg-[#111111] border-cyan-900/20">
          <CardContent className="p-8 text-center">
            <Target className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-white font-bold mb-1">No predictions yet</h3>
            <p className="text-gray-400 text-sm mb-4">Create the first prediction market and let the community decide!</p>
            <Button className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold" onClick={() => {
              if (!wallet) { window.dispatchEvent(new CustomEvent('suibets:connect-wallet-required')); return; }
              setShowCreate(true);
            }} data-testid="button-create-first-prediction">
              <Plus className="h-4 w-4 mr-1" />
              Create First Market
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {predictions.map((p: any) => {
            const total = (p.totalYesAmount || 0) + (p.totalNoAmount || 0);
            const yesPct = total > 0 ? ((p.totalYesAmount || 0) / total) * 100 : 50;
            const noPct = 100 - yesPct;
            const isEnded = new Date(p.endDate) <= new Date();
            const isActive = p.status === 'active' && !isEnded;
            const isCreator = wallet && wallet.toLowerCase() === p.creatorWallet?.toLowerCase();
            const canResolve = isCreator && isEnded && p.status === 'active';
            const currentBetAmount = getBetAmount(p.id);
            const userBets = getBetsForPrediction(p.id);
            return (
              <Card key={p.id} className="bg-[#111111] border-cyan-900/20" data-testid={`prediction-${p.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1">
                      <p className="text-white font-medium">{p.title}</p>
                      {p.description && <p className="text-gray-500 text-sm mt-1">{p.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">{p.category}</Badge>
                      <button onClick={() => { copyToClipboard(`${window.location.origin}/network?p=${p.id}`); toast({ title: 'Link Copied', description: 'Share link copied!' }); }} className="text-gray-500 hover:text-cyan-400" data-testid={`share-prediction-${p.id}`}>
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-3 bg-black/50 rounded-full overflow-hidden flex">
                      <div className="h-full bg-green-500 rounded-l-full transition-all" style={{ width: `${yesPct}%` }} />
                      <div className="h-full bg-red-500 rounded-r-full transition-all" style={{ width: `${noPct}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <span className="text-green-400 text-sm font-bold">YES {yesPct.toFixed(0)}%</span>
                      <span className="text-red-400 text-sm font-bold">NO {noPct.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{p.totalParticipants || 0} bets</span>
                      <span>{total > 0 ? total.toFixed(0) : '0'} SBETS pool</span>
                      <span>{timeLeft(p.endDate)}</span>
                    </div>
                  </div>

                  {isActive && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs">Bet amount:</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {BET_AMOUNTS.map(amt => (
                            <button
                              key={amt}
                              onClick={() => setBetAmounts(prev => ({ ...prev, [p.id]: amt }))}
                              className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                                currentBetAmount === amt
                                  ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-500/50'
                                  : 'bg-black/30 text-gray-500 border border-gray-800 hover:border-gray-600'
                              }`}
                              data-testid={`bet-amount-${amt}-${p.id}`}
                            >
                              {amt.toLocaleString()} SBETS
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 font-bold"
                          onClick={() => handleBet(p.id, 'yes')}
                          disabled={betMutation.isPending}
                          data-testid={`button-yes-${p.id}`}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          YES ({currentBetAmount.toLocaleString()} SBETS)
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-bold"
                          onClick={() => handleBet(p.id, 'no')}
                          disabled={betMutation.isPending}
                          data-testid={`button-no-${p.id}`}
                        >
                          <ThumbsDown className="h-4 w-4 mr-1" />
                          NO ({currentBetAmount.toLocaleString()} SBETS)
                        </Button>
                      </div>
                    </div>
                  )}

                  {canResolve && (
                    <div className="space-y-2 mt-3">
                      <p className="text-yellow-400 text-xs font-semibold">You are the creator - resolve this market:</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 font-bold"
                          onClick={() => resolveMutation.mutate({ predictionId: p.id, outcome: 'yes' })}
                          disabled={resolveMutation.isPending}
                          data-testid={`button-resolve-yes-${p.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolve YES
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-bold"
                          onClick={() => resolveMutation.mutate({ predictionId: p.id, outcome: 'no' })}
                          disabled={resolveMutation.isPending}
                          data-testid={`button-resolve-no-${p.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Resolve NO
                        </Button>
                      </div>
                    </div>
                  )}

                  {!isActive && !canResolve && (
                    <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                      {p.status === 'resolved_yes' ? 'Resolved: YES' : p.status === 'resolved_no' ? 'Resolved: NO' : 'Market Ended'}
                    </Badge>
                  )}

                  {userBets.length > 0 && (
                    <div className="mt-3 border-t border-cyan-900/20 pt-3">
                      <p className="text-xs font-semibold text-gray-400 mb-2">Your Bets</p>
                      <div className="space-y-1">
                        {userBets.map((b: any) => (
                          <div key={b.id} className="flex items-center justify-between text-xs p-2 bg-black/30 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Badge className={b.side === 'yes' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}>
                                {b.side?.toUpperCase()}
                              </Badge>
                              <span className="text-white">{b.amount?.toLocaleString()} SBETS</span>
                            </div>
                            <span className="text-gray-500">{timeAgo(b.createdAt)}</span>
                          </div>
                        ))}
                      </div>
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
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);

  const { data: challenges = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/social/challenges'],
  });

  const joinMutation = useMutation({
    mutationFn: async ({ challengeId, side }: { challengeId: number; side: string }) => {
      const res = await fetch(`/api/social/challenges/${challengeId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, side })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to join challenge');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/challenges'] });
      toast({ title: 'Challenge Joined', description: 'You faded this bet! Good luck!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  });

  const handleJoin = (challengeId: number, side: string) => {
    if (!wallet) {
      window.dispatchEvent(new CustomEvent('suibets:connect-wallet-required'));
      return;
    }
    joinMutation.mutate({ challengeId, side });
  };

  const openChallenges = challenges.filter(c => c.status === 'open');
  const closedChallenges = challenges.filter(c => c.status !== 'open');

  return (
    <div className="space-y-4" data-testid="tab-challenge">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Zap className="h-5 w-5 text-orange-400" />
          One-Tap Challenges
        </h3>
        <Button className="bg-orange-500 hover:bg-orange-600 text-black font-bold" onClick={() => {
          if (!wallet) { window.dispatchEvent(new CustomEvent('suibets:connect-wallet-required')); return; }
          setShowCreate(true);
        }} data-testid="button-create-challenge">
          <Plus className="h-4 w-4 mr-1" />
          Create Challenge
        </Button>
      </div>

      <Card className="bg-gradient-to-r from-orange-900/20 to-red-900/10 border-orange-500/20">
        <CardContent className="p-4">
          <p className="text-white font-medium mb-1">How it works</p>
          <div className="flex items-start gap-6 text-gray-400 text-sm flex-wrap">
            <div className="flex items-center gap-2"><span className="text-orange-400 font-bold">1.</span> Create a bet</div>
            <div className="flex items-center gap-2"><span className="text-orange-400 font-bold">2.</span> Set your stake</div>
            <div className="flex items-center gap-2"><span className="text-orange-400 font-bold">3.</span> Others fade or back you</div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-28 bg-gray-800 rounded-xl" />)}</div>
      ) : openChallenges.length === 0 ? (
        <Card className="bg-[#111111] border-cyan-900/20">
          <CardContent className="p-8 text-center">
            <Zap className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-white font-bold mb-1">No open challenges</h3>
            <p className="text-gray-400 text-sm mb-4">Be the first to throw down a challenge!</p>
            <Button className="bg-orange-500 hover:bg-orange-600 text-black font-bold" onClick={() => {
              if (!wallet) { window.dispatchEvent(new CustomEvent('suibets:connect-wallet-required')); return; }
              setShowCreate(true);
            }} data-testid="button-create-first-challenge">
              <Plus className="h-4 w-4 mr-1" />
              Create First Challenge
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {openChallenges.map((c: any) => {
            const isFull = (c.currentParticipants || 1) >= (c.maxParticipants || 10);
            const isExpired = new Date(c.expiresAt) <= new Date();
            const isCreator = wallet && wallet.toLowerCase() === c.creatorWallet?.toLowerCase();
            const fillPct = ((c.currentParticipants || 1) / (c.maxParticipants || 10)) * 100;
            const totalPool = (c.stakeAmount || 0) * (c.currentParticipants || 1);
            return (
              <Card key={c.id} className="bg-[#111111] border-orange-900/20 hover:border-orange-500/30 transition-colors" data-testid={`challenge-${c.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <p className="text-white font-medium">{c.title}</p>
                      {c.description && <p className="text-gray-500 text-sm mt-1">{c.description}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-orange-400 font-bold text-lg">{c.stakeAmount} {c.currency}</p>
                      <p className="text-gray-500 text-xs">per player</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-400">{c.currentParticipants || 1}/{c.maxParticipants || 10} players</span>
                      <span className="text-orange-400 font-bold">{totalPool.toFixed(0)} {c.currency} pool</span>
                    </div>
                    <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all" style={{ width: `${fillPct}%` }} />
                    </div>
                  </div>

                  {!isCreator && !isFull && !isExpired && (
                    <div className="flex gap-2 mb-3">
                      <Button
                        size="sm"
                        className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 font-bold"
                        onClick={() => handleJoin(c.id, 'back')}
                        disabled={joinMutation.isPending}
                        data-testid={`button-back-${c.id}`}
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        Back ({c.stakeAmount} {c.currency})
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-bold"
                        onClick={() => handleJoin(c.id, 'fade')}
                        disabled={joinMutation.isPending}
                        data-testid={`button-fade-${c.id}`}
                      >
                        <ThumbsDown className="h-4 w-4 mr-1" />
                        Fade ({c.stakeAmount} {c.currency})
                      </Button>
                    </div>
                  )}

                  {(isFull || isExpired) && !isCreator && (
                    <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 mb-3">
                      {isFull ? 'Challenge Full' : 'Challenge Expired'}
                    </Badge>
                  )}

                  {isCreator && (
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 mb-3">Your Challenge</Badge>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>by {formatWallet(c.creatorWallet)}</span>
                    <span>{timeLeft(c.expiresAt)}</span>
                  </div>
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
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <p className="text-gray-400 text-sm flex-1 truncate">{c.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-xs">{c.stakeAmount} {c.currency}</span>
                    <Badge className="bg-gray-700/50 text-gray-500 border-gray-700">{c.status}</Badge>
                  </div>
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

function LiveChat({ myWallet }: { myWallet?: string }) {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ['/api/social/chat'],
    queryFn: async () => {
      const res = await fetch('/api/social/chat');
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 5000
  });

  const sendMutation = useMutation({
    mutationFn: async (msg: string) => {
      const res = await fetch('/api/social/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: myWallet, message: msg })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to send');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/chat'] });
      setMessage('');
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  });

  const handleSend = () => {
    if (!myWallet) {
      window.dispatchEvent(new CustomEvent('suibets:connect-wallet-required'));
      return;
    }
    if (!message.trim()) return;
    sendMutation.mutate(message.trim());
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Card className="bg-[#111111] border-cyan-900/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="h-5 w-5 text-cyan-400" />
          <h3 className="text-white font-semibold">Live Chat</h3>
        </div>
        <div className="h-64 overflow-y-auto mb-3 space-y-2 border border-cyan-900/10 rounded-lg p-3 bg-black/30" data-testid="chat-messages">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 text-sm">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2" data-testid={`chat-message-${msg.id}`}>
                <div className="w-7 h-7 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <Users className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 text-xs font-medium">{formatWallet(msg.wallet)}</span>
                    <span className="text-gray-600 text-xs">{timeAgo(msg.createdAt)}</span>
                  </div>
                  <p className="text-gray-300 text-sm break-words">{msg.message}</p>
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={myWallet ? "Type a message..." : "Connect wallet to chat"}
            className="flex-1 bg-black/50 border border-cyan-900/30 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none text-sm"
            disabled={!myWallet}
            data-testid="input-chat-message"
          />
          <Button
            size="icon"
            className="bg-cyan-500 hover:bg-cyan-600 text-black"
            onClick={handleSend}
            disabled={!myWallet || !message.trim() || sendMutation.isPending}
            data-testid="button-send-chat"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SocialTab({ onViewProfile, myWallet }: { onViewProfile: (w: string) => void; myWallet?: string }) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'all-time'>('weekly');
  const [xInput, setXInput] = useState(() => myWallet ? getXHandle(myWallet) : '');

  const { data: leaderboard, isLoading } = useQuery<{ leaderboard: any[] }>({
    queryKey: ['/api/leaderboard', period],
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/following'] });
      toast({
        title: data.action === 'followed' ? 'Following' : 'Unfollowed',
        description: data.action === 'followed' ? 'You are now following this bettor' : 'Unfollowed successfully'
      });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update follow status', variant: 'destructive' });
    }
  });

  const handleFollow = (targetWallet: string) => {
    if (!myWallet) {
      window.dispatchEvent(new CustomEvent('suibets:connect-wallet-required'));
      return;
    }
    followMutation.mutate(targetWallet);
  };

  const handleSaveXHandle = () => {
    if (!myWallet) return;
    setXHandle(myWallet, xInput);
    toast({ title: 'Saved', description: 'Your X handle has been saved.' });
  };

  const handleShareOnX = () => {
    const text = encodeURIComponent(`Check out my betting stats on @SuiBets! ${window.location.origin}/network`);
    window.open(`https://x.com/intent/tweet?text=${text}`, '_blank');
  };

  const allUsers = leaderboard?.leaderboard || [];
  const filtered = searchQuery
    ? allUsers.filter(u => u.wallet?.toLowerCase().includes(searchQuery.toLowerCase()))
    : allUsers;

  return (
    <div className="space-y-4" data-testid="tab-social">
      {myWallet && (
        <Card className="bg-[#111111] border-cyan-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <SiX className="h-4 w-4 text-white" />
              <h3 className="text-white font-semibold text-sm">X / Twitter Profile</h3>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={xInput}
                onChange={e => setXInput(e.target.value)}
                placeholder="@yourusername"
                className="flex-1 bg-black/50 border border-cyan-900/30 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none text-sm"
                data-testid="input-x-handle"
              />
              <Button
                size="sm"
                variant="outline"
                className="border-cyan-900/30 text-gray-400"
                onClick={handleSaveXHandle}
                data-testid="button-save-x-handle"
              >
                Save
              </Button>
              <Button
                size="sm"
                className="bg-black text-white border border-gray-700"
                onClick={handleShareOnX}
                data-testid="button-share-on-x"
              >
                <SiX className="h-3.5 w-3.5 mr-1" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by wallet address..."
            className="w-full bg-[#111111] border border-cyan-900/30 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none"
            data-testid="input-search-social"
          />
        </div>
        <div className="flex items-center gap-1">
          {(['weekly', 'monthly', 'all-time'] as const).map(p => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'outline'}
              size="sm"
              className={period === p ? 'bg-cyan-500 text-black' : 'border-cyan-900/30 text-gray-400'}
              onClick={() => setPeriod(p)}
              data-testid={`period-${p}`}
            >
              {p === 'weekly' ? 'Week' : p === 'monthly' ? 'Month' : 'All'}
            </Button>
          ))}
        </div>
      </div>

      {myWallet && followingList.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Following ({followingList.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {followingList.map(w => {
              const wXHandle = getXHandle(w);
              return (
                <Card key={w} className="bg-[#111111] border-cyan-900/20 hover:border-cyan-500/30 transition-colors cursor-pointer" onClick={() => onViewProfile(w)}>
                  <CardContent className="p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <span className="text-white text-sm">{formatWallet(w)}</span>
                        {wXHandle && <p className="text-cyan-400 text-xs">@{wXHandle.replace('@', '')}</p>}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-cyan-500/30 text-cyan-400 text-xs"
                      onClick={(e) => { e.stopPropagation(); handleFollow(w); }}
                      data-testid={`button-unfollow-${w.slice(0,8)}`}
                    >
                      Unfollow
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Leaderboard - Top Bettors ({period === 'weekly' ? 'This Week' : period === 'monthly' ? 'This Month' : 'All Time'})
        </h3>
        {isLoading ? (
          <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 bg-gray-800 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="bg-[#111111] border-cyan-900/20">
            <CardContent className="p-6 text-center">
              <Users className="h-10 w-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">{searchQuery ? 'No wallets found matching your search' : 'No bettors in this period yet'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((user: any, idx: number) => {
              const isFollowing = followingList.includes(user.wallet?.toLowerCase());
              const rankColors = idx === 0 ? 'from-yellow-500 to-amber-500' : idx === 1 ? 'from-gray-300 to-gray-400' : idx === 2 ? 'from-amber-600 to-amber-700' : 'from-cyan-600 to-cyan-700';
              const userXHandle = getXHandle(user.wallet || '');
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
                        <div className="flex items-center gap-2">
                          <p className="text-white text-sm font-medium">{formatWallet(user.wallet)}</p>
                          {userXHandle && <span className="text-cyan-400 text-xs">@{userXHandle.replace('@', '')}</span>}
                        </div>
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
                          onClick={(e) => { e.stopPropagation(); handleFollow(user.wallet); }}
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

      <LiveChat myWallet={myWallet} />
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
              <span className="text-cyan-400 text-sm font-medium">{formatWallet(myWallet)}</span>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <Card className="bg-[#111111] border-cyan-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-cyan-400" />
                  <h4 className="text-white font-semibold text-sm">Predict</h4>
                </div>
                <p className="text-gray-400 text-xs">Create open markets anyone can bet on. Pool-based -- all bets go into a pot, winners split everything. Great for crypto, sports, politics, and anything else.</p>
              </CardContent>
            </Card>
            <Card className="bg-[#111111] border-orange-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-orange-400" />
                  <h4 className="text-white font-semibold text-sm">Challenge</h4>
                </div>
                <p className="text-gray-400 text-xs">Direct head-to-head challenges. Set a fixed stake, dare others to fade or back you. Think of it as a public bet slip others can match. Perfect for friendly wagers.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-[#0a0a0a] border border-cyan-900/30 rounded-xl p-1 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              data-testid={`tab-button-${tab.key}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
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
