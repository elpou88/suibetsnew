import { useRoute, Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useBetting } from '@/context/BettingContext';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
const suibetsLogo = "/images/suibets-logo.png";
import {
  ArrowLeft,
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  TrendingUp,
  ExternalLink,
  Share2,
  RefreshCw
} from 'lucide-react';
import { useWalrusProtocolContext } from '@/context/WalrusProtocolContext';

interface SharedBetData {
  id: string | number;
  numericId?: number;
  eventId: string;
  eventName: string;
  selection?: string;
  prediction?: string;
  odds: number;
  stake?: number;
  betAmount?: number;
  amount?: number;
  potentialWin?: number;
  potentialPayout?: number;
  status: string;
  placedAt?: string;
  createdAt?: string;
  settledAt?: string;
  txHash?: string;
  currency?: string;
  feeCurrency?: string;
  walletAddress?: string;
  userId?: string;
  marketId?: string;
  homeTeam?: string;
  awayTeam?: string;
}

export default function SharedBetPage() {
  const [, params] = useRoute('/bet/:id');
  const [, setLocation] = useLocation();
  const betId = params?.id;
  const { addBet } = useBetting();
  const { toast } = useToast();
  const { currentWallet } = useWalrusProtocolContext();
  const [copied, setCopied] = useState(false);
  const [betAdded, setBetAdded] = useState(false);

  const { data: bet, isLoading, error } = useQuery<SharedBetData>({
    queryKey: [`/api/bets/${betId}`],
    enabled: !!betId,
  });

  const handleConnectWallet = () => {
    window.dispatchEvent(new CustomEvent('suibets:connect-wallet-required'));
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  };

  const getStake = (b: SharedBetData) => b.stake ?? b.betAmount ?? b.amount ?? 0;
  const getPayout = (b: SharedBetData) => b.potentialWin ?? b.potentialPayout ?? 0;
  const getCurrency = (b: SharedBetData) => b.currency ?? b.feeCurrency ?? 'SUI';
  const getSelection = (b: SharedBetData) => b.selection ?? b.prediction ?? '';
  const getDate = (b: SharedBetData) => b.placedAt ?? b.createdAt ?? '';
  const getWallet = (b: SharedBetData) => b.walletAddress ?? b.userId ?? '';

  const tryParseLegs = (b: SharedBetData): { isParlay: boolean; legs: any[] } => {
    const sources = [b.eventName, b.selection, b.prediction];
    for (const src of sources) {
      if (typeof src === 'string' && src.startsWith('[')) {
        try {
          const parsed = JSON.parse(src);
          if (Array.isArray(parsed) && parsed.length > 1) return { isParlay: true, legs: parsed };
        } catch {}
      }
    }
    return { isParlay: false, legs: [] };
  };

  const handleCopyBet = () => {
    if (!bet) return;

    const { isParlay, legs: parlayLegs } = tryParseLegs(bet);

    if (isParlay) {
      parlayLegs.forEach((leg: any, idx: number) => {
        addBet({
          id: `copy-${bet.id}-${idx}`,
          eventId: leg.eventId || bet.eventId || `copy-${bet.id}-${idx}`,
          eventName: leg.eventName || 'Copied Bet',
          selectionName: leg.selection || leg.prediction || 'Pick',
          odds: leg.odds || 1,
          stake: 0,
          market: leg.marketId || 'match-winner',
          currency: getCurrency(bet) as 'SUI' | 'SBETS',
          homeTeam: leg.homeTeam,
          awayTeam: leg.awayTeam,
        });
      });
      toast({
        title: 'Parlay Copied!',
        description: `${parlayLegs.length} selections added to your bet slip. Set your stake and place the bet!`,
      });
    } else {
      addBet({
        id: `copy-${bet.id}`,
        eventId: bet.eventId || `copy-${bet.id}`,
        eventName: bet.eventName || 'Copied Bet',
        selectionName: getSelection(bet) || 'Pick',
        odds: bet.odds || 1,
        stake: 0,
        market: bet.marketId || 'match-winner',
        currency: getCurrency(bet) as 'SUI' | 'SBETS',
        homeTeam: bet.homeTeam,
        awayTeam: bet.awayTeam,
      });
      toast({
        title: 'Bet Copied!',
        description: 'Selection added to your bet slip. Set your stake and place the bet!',
      });
    }
    setBetAdded(true);
  };

  const handleShareLink = async () => {
    const shareId = bet?.numericId ?? betId;
    const shareUrl = `https://suibets.com/bet/${shareId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Link Copied!', description: 'Share this link with friends' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'won':
      case 'paid_out':
        return { label: status === 'paid_out' ? 'PAID OUT' : 'WON', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30', icon: <CheckCircle2 className="h-6 w-6 text-green-400" /> };
      case 'lost':
        return { label: 'LOST', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', icon: <XCircle className="h-6 w-6 text-red-400" /> };
      case 'pending':
      case 'confirmed':
        return { label: 'PENDING', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', icon: <Clock className="h-6 w-6 text-yellow-400 animate-pulse" /> };
      default:
        return { label: status?.toUpperCase() || 'UNKNOWN', color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30', icon: <Clock className="h-6 w-6 text-gray-400" /> };
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return dateStr; }
  };

  const shortenWallet = (address?: string) => {
    if (!address || address.length <= 14) return address || '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getPnl = () => {
    if (!bet) return { value: 0, display: '0', isPositive: false };
    const stk = getStake(bet);
    const pyt = getPayout(bet);
    if (bet.status === 'won' || bet.status === 'paid_out') {
      const profit = pyt - stk;
      return { value: profit, display: `+${profit.toFixed(2)}`, isPositive: true };
    }
    if (bet.status === 'lost') {
      return { value: -stk, display: `-${stk.toFixed(2)}`, isPositive: false };
    }
    return { value: 0, display: `+${(pyt - stk).toFixed(2)}`, isPositive: true };
  };

  const parseBetLegs = () => {
    if (!bet) return [];
    const { isParlay, legs } = tryParseLegs(bet);
    if (isParlay) return legs;
    return [{ eventName: bet.eventName, selection: getSelection(bet), odds: bet.odds }];
  };

  return (
    <div className="min-h-screen bg-[#060d16]" data-testid="shared-bet-page">
      <nav className="bg-[#0a1220] border-b border-cyan-900/30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={handleBack} className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors" data-testid="btn-back">
              <ArrowLeft size={20} />
            </button>
            <Link href="/" data-testid="link-logo">
              <img src={suibetsLogo} alt="SuiBets" className="h-10 w-auto cursor-pointer" />
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-gray-400 hover:text-cyan-400 text-sm font-medium" data-testid="nav-bets">Bets</Link>
            <Link href="/bet-history" className="text-gray-400 hover:text-cyan-400 text-sm font-medium" data-testid="nav-my-bets">My Bets</Link>
            <Link href="/network" className="text-gray-400 hover:text-cyan-400 text-sm font-medium" data-testid="nav-network">Network</Link>
            <Link href="/parlay" className="text-gray-400 hover:text-cyan-400 text-sm font-medium" data-testid="nav-parlays">Parlays</Link>
          </div>
          <div className="flex items-center gap-4">
            {currentWallet?.address ? (
              <span className="text-cyan-400 text-sm">{currentWallet.address.slice(0, 6)}...{currentWallet.address.slice(-4)}</span>
            ) : (
              <button onClick={handleConnectWallet} className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2" data-testid="btn-connect">
                <Wallet size={16} />
                Connect
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-8">
        {isLoading && (
          <div className="text-center py-20">
            <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading bet details...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-white text-lg font-medium mb-2">Bet Not Found</p>
            <p className="text-gray-400 mb-6">This bet may no longer exist or the link is invalid.</p>
            <Link href="/">
              <button className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold px-6 py-3 rounded-xl" data-testid="btn-go-home">
                Browse Events
              </button>
            </Link>
          </div>
        )}

        {bet && (() => {
          const statusInfo = getStatusInfo(bet.status);
          const pnl = getPnl();
          const legs = parseBetLegs();
          const isParlay = legs.length > 1;
          const isSettled = ['won', 'paid_out', 'lost', 'void'].includes(bet.status);
          const currency = getCurrency(bet);
          const stakeVal = getStake(bet);
          const payoutVal = getPayout(bet);
          const dateVal = getDate(bet);

          return (
            <div className="space-y-6">
              <div className="text-center mb-2">
                <p className="text-gray-400 text-sm">Shared Bet</p>
                {getWallet(bet) && (
                  <p className="text-gray-500 text-xs mt-1">by {shortenWallet(getWallet(bet))}</p>
                )}
              </div>

              <div
                className="relative rounded-2xl overflow-hidden border border-cyan-900/40"
                style={{ background: 'linear-gradient(135deg, #0d1b1e 0%, #112225 50%, #0a1214 100%)' }}
                data-testid="pnl-card"
              >
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-cyan-500/15 to-transparent" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-cyan-500/8 to-transparent" />

                <div className="relative p-6">
                  <div className="flex items-center justify-between mb-4">
                    <img src={suibetsLogo} alt="SuiBets" className="h-10 w-auto" />
                    <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border}`} data-testid="text-status">
                      {statusInfo.label}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-400 text-sm font-medium">
                      {isParlay ? `Parlay (${legs.length} Legs)` : 'Single Bet'}
                    </span>
                    <span className="text-white font-bold text-xl" data-testid="text-odds">{bet.odds.toFixed(2)}</span>
                  </div>

                  <div className="space-y-3 mb-5 mt-4">
                    {legs.map((leg: any, idx: number) => {
                      const selection = leg.selection || leg.prediction || '';
                      const eventName = leg.eventName && leg.eventName !== 'Unknown Event' && !leg.eventName.startsWith('[') ? leg.eventName : '';
                      const displayText = eventName && !selection.includes(' vs ') ? `${eventName}: ${selection}` : selection;

                      const dotColor = isSettled && (bet.status === 'won' || bet.status === 'paid_out') ? 'bg-green-400'
                        : isSettled && bet.status === 'lost' ? 'bg-red-400'
                        : 'bg-cyan-400';

                      return (
                        <div key={idx} className="relative pl-5" data-testid={`leg-${idx}`}>
                          <div className={`absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full ${dotColor} border-2 border-[#112225]`} />
                          {idx < legs.length - 1 && (
                            <div className="absolute left-[4px] top-4 w-0.5 h-[calc(100%+4px)] bg-gray-700/50" />
                          )}
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-cyan-300 font-semibold text-sm leading-tight">{displayText}</span>
                            {isParlay && leg.odds > 1 && (
                              <span className="text-gray-500 text-xs flex-shrink-0">@ {(leg.odds || 1).toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-black/30 rounded-xl p-4 space-y-2.5">
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="text-gray-500">Stake</span>
                      <span className="text-white font-medium" data-testid="text-stake">{stakeVal.toLocaleString(undefined, { maximumFractionDigits: 4 })} {currency}</span>
                    </div>
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="text-gray-500">{isSettled ? 'Payout' : 'Potential Win'}</span>
                      <span className={`font-bold ${bet.status === 'won' || bet.status === 'paid_out' ? 'text-green-400' : bet.status === 'lost' ? 'text-red-400 line-through' : 'text-cyan-400'}`} data-testid="text-payout">
                        {payoutVal.toLocaleString(undefined, { maximumFractionDigits: 4 })} {currency}
                      </span>
                    </div>
                    {isSettled && (
                      <div className="flex justify-between gap-2 text-sm pt-1 border-t border-gray-700/50">
                        <span className="text-gray-500">P&L</span>
                        <span className={`font-bold text-lg ${pnl.isPositive ? 'text-green-400' : 'text-red-400'}`} data-testid="text-pnl">
                          {pnl.display} {currency}
                        </span>
                      </div>
                    )}
                  </div>

                  {bet.txHash && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-600">
                      <span>TX:</span>
                      <a
                        href={`https://suiscan.xyz/mainnet/tx/${bet.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-cyan-500/60 hover:text-cyan-400 flex items-center gap-1"
                        data-testid="link-tx"
                      >
                        {bet.txHash.slice(0, 16)}...
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                    <span>{dateVal ? formatDate(dateVal) : ''}</span>
                    <span>suibets.com</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleCopyBet}
                  disabled={betAdded}
                  className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors ${
                    betAdded
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default'
                      : 'bg-cyan-500 hover:bg-cyan-600 text-black'
                  }`}
                  data-testid="button-copy-bet"
                >
                  {betAdded ? (
                    <>
                      <Check className="h-5 w-5" />
                      Added to Bet Slip
                    </>
                  ) : (
                    <>
                      <Copy className="h-5 w-5" />
                      Copy This Bet
                    </>
                  )}
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={handleShareLink}
                    className="flex-1 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 bg-[#0f1923] border border-cyan-900/30 text-gray-300 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors"
                    data-testid="button-share-link"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                    {copied ? 'Copied!' : 'Share Link'}
                  </button>
                  <Link href="/" className="flex-1">
                    <button
                      className="w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 bg-[#0f1923] border border-cyan-900/30 text-gray-300 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors"
                      data-testid="button-browse-events"
                    >
                      <TrendingUp className="h-4 w-4" />
                      Browse Events
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
