import { Link, useLocation } from 'wouter';
import { useState } from 'react';
import { useWalrusProtocolContext } from '@/context/WalrusProtocolContext';
import SuiNSName from '@/components/SuiNSName';
const suibetsLogo = "/images/suibets-logo.png";
import { 
  FileText, 
  Shield, 
  Zap, 
  Lock,
  TrendingUp,
  Globe,
  Wallet,
  RefreshCw,
  ExternalLink,
  ArrowLeft,
  Gift,
  Users,
  Target,
  Award,
  Coins,
  BarChart3,
  MessageCircle,
  Layers
} from 'lucide-react';

export default function WhitepaperPage() {
  const [, setLocation] = useLocation();
  const { currentWallet } = useWalrusProtocolContext();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const sections = [
    {
      id: 'introduction',
      title: 'Introduction',
      icon: <FileText className="h-5 w-5 text-cyan-400" />,
      content: [
        'SuiBets is a decentralized sports betting platform built on the Sui blockchain. Our platform leverages the speed, security, and low transaction costs of the Sui network to provide a seamless betting experience with complete transparency and fairness.',
        'Every bet is placed directly on-chain via Move smart contracts. Settlements are automated and payouts go directly from the contract treasury to your wallet. No intermediaries, no custodial risk, no hidden fees.',
        'SuiBets supports dual tokens: SUI (the native gas token) and SBETS (the platform utility token). Both can be used for betting, with dedicated treasury pools and independent liability tracking for each.'
      ]
    },
    {
      id: 'sports-coverage',
      title: 'Sports Coverage',
      icon: <Globe className="h-5 w-5 text-blue-400" />,
      content: [
        'SuiBets aggregates real-time scores and odds from multiple premium data providers across 30+ sports:',
        'Football (Soccer) - Live betting (first 45 minutes) + upcoming matches via paid API-Sports integration with real bookmaker odds.',
        'Basketball, Baseball, Ice Hockey, MMA, American Football, AFL, Formula 1, Handball, NFL, Rugby, Volleyball - Upcoming matches with 7-day lookahead via free sports APIs. Pre-game only (no live betting).',
        'Market Types: Match Winner, Double Chance, Both Teams To Score (BTTS), Half-Time Result, Over/Under Goals, Correct Score, and Handicap markets.',
        'Live Fallback Odds: When real-time odds are unavailable, a probability-based model accounts for score difference AND match time elapsed. A team leading 3-1 at minute 43 gets approximately 1.15 odds. Odds are capped at 51.00 maximum with a 5% bookmaker margin built in.',
        'Parlay Betting: Combine multiple selections into a single bet with combined odds for bigger payouts. All legs must win for the parlay to pay out.'
      ]
    },
    {
      id: 'betting-flow',
      title: 'Betting Flow (100% On-Chain)',
      icon: <TrendingUp className="h-5 w-5 text-green-400" />,
      content: [
        'Step 1 - Place Bet: User calls place_bet (SUI) or place_bet_sbets (SBETS) on the smart contract. Tokens go directly to the contract treasury. Liability is tracked on-chain: total_potential_liability += potential_payout. A Bet object is created with a unique betObjectId stored in PostgreSQL for tracking.',
        'Step 2 - Settlement: The settlement worker runs every 5 minutes, checking for finished matches from API-Sports data. It then calls settle_bet_admin or settle_bet_sbets_admin on-chain.',
        'Step 3 - If Bet WON: net_payout = potential_payout - (profit x 1%). Payout is sent directly from treasury to user wallet. The 1% fee is added to accrued_fees (platform revenue). Liability is reduced.',
        'Step 4 - If Bet LOST: Full stake is added to accrued_fees (platform revenue). Liability is reduced. No payout is made.',
        'Admin Revenue: The admin can call withdraw_fees or withdraw_fees_sbets to extract accumulated platform revenue from the smart contract.',
        'Maximum Stakes: 100 SUI per bet or 10,000 SBETS per bet. Treasury pre-checks ensure sufficient funds before accepting any bet.'
      ]
    },
    {
      id: 'security',
      title: 'Security Model',
      icon: <Shield className="h-5 w-5 text-red-400" />,
      content: [
        'Capability-Based Access Control (OTW Pattern): AdminCap is a single capability minted at deployment, required for all admin operations. OracleCap can be minted by admin for settlement oracles. Private keys are stored securely as encrypted secrets.',
        'Server-Authoritative Betting Cutoff: For football, live betting is allowed only in the first 45 minutes. For free sports, betting closes once the match starts (no live betting). The server determines match status - client flags are ignored.',
        'Anti-Exploit Measures: Rate limiting (20 bets per hour per wallet). Unknown or invalid events are rejected. Event validation happens before bet acceptance. Duplicate transaction hash prevention (in-memory Set + DB unique index). Settlement blocking for unverified events. Wallet blocklist system for policy violations.',
        'Rejection Codes: EVENT_NOT_FOUND, STALE_EVENT_DATA, STALE_MATCH_DATA, UNVERIFIABLE_MATCH_TIME, MATCH_TIME_EXCEEDED, EVENT_STATUS_UNCERTAIN, EVENT_VERIFICATION_ERROR, MAX_STAKE_EXCEEDED, WALLET_BLOCKED.',
        'On-Chain Bet Synchronization: Automatic sync every 5 minutes catches any direct contract bets. Manual sync endpoint available. Detailed status tracking and prediction extraction for every on-chain bet.'
      ]
    },
    {
      id: 'treasury-safety',
      title: 'Treasury & Liability Safety',
      icon: <Lock className="h-5 w-5 text-purple-400" />,
      content: [
        'The smart contract REJECTS bets if treasury cannot cover the potential payout. The assertion assert!(treasury >= net_payout) is enforced on-chain before any bet is accepted.',
        'Liability is always reduced on settlement (won, lost, or voided). Treasury maintains separate balances for SUI and SBETS tokens with independent liability tracking for each.',
        'Dual Token System: SUI bets range from 0.05 to 100 SUI. SBETS bets range from 1 to 10,000 SBETS. Each token has dedicated treasury and liability counters.',
        'Fee Structure: Only 1% fee on profit (not on stake). Winners receive stake + (profit - 1% fee). Lost stakes become platform revenue.',
        'Treasury Auto-Withdraw: Manual only, triggered via admin endpoint. Zero-amount guards prevent empty transactions. Reconciliation endpoint available for balance auditing.'
      ]
    },
    {
      id: 'sbets-token',
      title: 'SBETS Token',
      icon: <Coins className="h-5 w-5 text-yellow-400" />,
      content: [
        'SBETS is the native utility token of the SuiBets platform, deployed on Sui mainnet.',
        'Token Address: 0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285::sbets::SBETS',
        'Use Cases: Place bets on sports events. Stake in prediction markets and challenges on the Network page. Stake for 5% APY rewards. Earn through referrals, welcome bonuses, and loyalty rewards. Hold to earn a share of platform revenue (revenue sharing).',
        'SBETS can be used alongside SUI for all betting operations. The platform maintains independent treasury pools for each token.'
      ]
    },
    {
      id: 'staking',
      title: 'SBETS Staking',
      icon: <Layers className="h-5 w-5 text-indigo-400" />,
      content: [
        'SBETS holders can stake their tokens to earn passive rewards from the platform treasury pool.',
        'APY: 5% annual percentage yield paid from a 50 billion SBETS treasury pool.',
        'Minimum Stake: 100,000 SBETS required to open a staking position.',
        'Lock Period: 7-day lock period from the time of staking. Tokens cannot be unstaked during this period.',
        'How It Works: Stake your SBETS tokens via the staking interface. Rewards accrue daily based on your staked amount. After the 7-day lock period, you can unstake at any time. Claim accumulated rewards separately without unstaking.',
        'Staking Operations: Stake (lock tokens for rewards), Unstake (withdraw tokens after lock period), Claim Rewards (collect earned rewards without unstaking).'
      ]
    },
    {
      id: 'revenue-sharing',
      title: 'Revenue Sharing',
      icon: <BarChart3 className="h-5 w-5 text-emerald-400" />,
      content: [
        'SBETS token holders earn a share of weekly platform revenue proportional to their holdings.',
        'Revenue Split: 30% distributed to SBETS holders. 40% goes to the treasury buffer (ensures platform solvency). 30% allocated for liquidity and buybacks.',
        'How Claims Work: Revenue is calculated on a weekly basis. Holders can claim their share proportional to their SBETS balance. Claims are processed as real token transfers from the platform treasury.',
        'This creates a direct incentive for holding SBETS tokens - the more you hold, the larger your share of platform profits.'
      ]
    },
    {
      id: 'welcome-bonus',
      title: 'Welcome Bonus',
      icon: <Gift className="h-5 w-5 text-pink-400" />,
      content: [
        'Every new user receives a 1,000 SBETS welcome bonus upon connecting their wallet for the first time.',
        'This is a one-time bonus per wallet address, stored and tracked via the welcomeBonusClaimed field in the user profile.',
        'The welcome bonus is credited as free bet balance, allowing new users to experience the platform risk-free before committing their own tokens.'
      ]
    },
    {
      id: 'referral-system',
      title: 'Referral System',
      icon: <Users className="h-5 w-5 text-orange-400" />,
      content: [
        'Earn SBETS by inviting friends to SuiBets through the wallet-address generated referral system.',
        'How It Works: Each wallet automatically generates a unique referral code. Share your code with friends. When a referred user connects their wallet and places their first bet, you earn the referral reward.',
        'Reward: 1,000 SBETS per qualified referral (credited when the referred user places their first bet).',
        'Referral Tracking: Pending (user signed up but has not bet yet). Qualified (user placed first bet, reward earned). Rewarded (SBETS credited to referrer wallet).',
        'Rewards are added directly to your platform balance and can be used for betting or withdrawn.'
      ]
    },
    {
      id: 'loyalty-program',
      title: 'Loyalty Program',
      icon: <Award className="h-5 w-5 text-amber-400" />,
      content: [
        'Earn loyalty points for every dollar wagered on the platform. Points unlock higher tiers with exclusive benefits.',
        'Points System: Points are earned per $1 wagered across all bets (SUI and SBETS).',
        'Tier Structure: Bronze (0 - 999 points) - Entry level. Silver (1,000 - 2,499 points) - Active bettor. Gold (2,500 - 4,999 points) - Regular bettor. Platinum (5,000 - 9,999 points) - VIP bettor. Diamond (10,000+ points) - Elite status.',
        'Tier badges are displayed on leaderboards and user profiles. Points accumulate over your entire betting history and never expire.',
        'Leaderboard Rankings: Weekly, monthly, and all-time rankings based on profit, tracking total bets, win rate, and profit/loss. Compete with other bettors for top positions.'
      ]
    },
    {
      id: 'betting-limits',
      title: 'Responsible Betting',
      icon: <Shield className="h-5 w-5 text-teal-400" />,
      content: [
        'SuiBets supports user-configurable betting limits and responsible gambling tools.',
        'Spending Limits: Set daily, weekly, or monthly spending limits in USD. The platform enforces these limits server-side and prevents bets that would exceed them.',
        'Session Timers: Track your betting session duration and receive notifications.',
        'Self-Exclusion: Temporarily or permanently exclude yourself from the platform if needed.',
        'These tools give users full control over their betting activity while maintaining the freedom that decentralized platforms provide.'
      ]
    },
    {
      id: 'predict-anything',
      title: 'Predict Anything (Network)',
      icon: <Target className="h-5 w-5 text-violet-400" />,
      content: [
        'The "Predict Anything" social network engine is a standalone feature at /network with custom prediction markets, viral challenges, and social features. All bets use SBETS tokens exclusively with real on-chain transfers.',
        'Prediction Markets: Anyone can create a prediction question with a deadline (e.g., "Will SUI hit $10 in 2026?"). Other users bet SBETS on Yes or No. Every bet is a real on-chain SBETS transfer to the treasury wallet, verified on the blockchain. When the deadline passes, the creator resolves it as Yes or No. Winners split the entire pool proportional to their bet size. The creator cannot bet on their own prediction (anti-exploit rule).',
        'Example: 1,000 SBETS bet on Yes, 500 SBETS bet on No. Total pool = 1,500 SBETS. If resolved Yes, the Yes bettors split 1,500 SBETS proportionally.',
        'Challenges: Create a challenge statement (e.g., "Real Madrid wins the next Clasico - who fades me?") and stake SBETS on-chain. Others can Back (agree, side = "for") or Fade (disagree, side = "against"), each staking the same amount. The creator settles the challenge when the outcome is known. If the creator wins, the creator + all backers split the pool. If the creator loses, all faders split the pool.',
        'On-Chain Verification: Every prediction bet and challenge stake requires signing a real SBETS transfer to the treasury wallet via your connected wallet (Slush/Nightly). The backend verifies on-chain: sender address, recipient = treasury, correct amount, SBETS coin type. No fake transaction IDs are accepted.',
        'Anti-Exploit Security: Creator self-bet blocked. Duplicate join prevented (DB unique constraint). Duplicate transaction hash reuse blocked (unique index + in-memory Set). Atomic SQL increments for pool totals (no race conditions). Rate limiting (20 bets/hour, 30 chat messages/min). Double-resolve and double-settle guards. Early resolution blocked.',
        'Settlement Payouts: Winners receive real SBETS from the treasury via automated transfer. Per-wallet success/failure tracking with detailed logs.',
        'Social Features: Follow other bettors, live chat (polling-based), public profiles with leaderboard integration. All content is user-generated - no mock or seed data.'
      ]
    },
    {
      id: 'technology',
      title: 'Technology Stack',
      icon: <Zap className="h-5 w-5 text-yellow-400" />,
      content: [
        'Blockchain: Sui Network (Layer 1) with Move smart contracts for betting and automated payouts. Capability-based security with AdminCap and OracleCap access control.',
        'Frontend: React 18 with TypeScript, Vite bundler, Tailwind CSS, Framer Motion animations, Radix UI components, TanStack Query for data fetching.',
        'Backend: Express.js with TypeScript, RESTful API design, WebSocket for live score updates, multi-API data aggregation with resilience and fallback mechanisms.',
        'Database: PostgreSQL with Drizzle ORM for data persistence. In-memory caching for odds and event data.',
        'Smart Contract (Mainnet): Package ID 0x737324ddac9fb96e3d7ffab524f5489c1a0b3e5b4bffa2f244303005001b4ada. Shared Object 0x5fc1073c9533c6737fa3a0882055d1778602681df70bdabde96b0127b588f082.',
        'Architecture: Full on-chain model - bets placed directly on smart contracts, tracked in PostgreSQL for UI, settlements automated on-chain. No custodial risk.'
      ]
    }
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

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

  return (
    <div className="min-h-screen bg-[#060d16]" data-testid="whitepaper-page">
      <nav className="bg-[#0a1220] border-b border-cyan-900/30 px-4 py-3">
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
            <Link href="/network" className="text-gray-400 hover:text-cyan-400 text-sm font-medium" data-testid="nav-network">Network</Link>
            <Link href="/parlay" className="text-gray-400 hover:text-cyan-400 text-sm font-medium" data-testid="nav-parlays">Parlays</Link>
            <Link href="/whitepaper" className="text-cyan-400 text-sm font-medium" data-testid="nav-whitepaper">Whitepaper</Link>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleRefresh} className="text-gray-400 hover:text-white p-2" data-testid="btn-refresh">
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            {currentWallet?.address ? (
              <SuiNSName address={currentWallet.address} className="text-cyan-400 text-sm" />
            ) : (
              <button onClick={handleConnectWallet} className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2" data-testid="btn-connect">
                <Wallet size={16} />
                Connect
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-cyan-500/20 rounded-xl">
            <FileText className="h-8 w-8 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white" data-testid="text-title">SuiBets Whitepaper</h1>
            <p className="text-gray-400" data-testid="text-version">Version 2.0 - February 2026</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-900/30 to-purple-900/20 border border-cyan-500/30 rounded-2xl p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Globe className="h-10 w-10 text-cyan-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">Decentralized Sports Betting & Social Predictions</h2>
              <p className="text-gray-400">Powered by Sui Blockchain</p>
            </div>
          </div>
          <p className="text-gray-300 leading-relaxed mb-6">
            SuiBets revolutionizes sports betting by combining the excitement of real-time wagering 
            with the security and transparency of blockchain technology. Our platform uses 100% on-chain 
            settlements with only a 1% fee on profits, ensuring instant payouts directly from the 
            smart contract treasury to your wallet. Beyond sports, our "Predict Anything" social engine 
            lets anyone create custom prediction markets and challenges using SBETS tokens.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-[#060d16]/70 rounded-xl border border-cyan-900/30">
              <p className="text-3xl font-bold text-cyan-400">1%</p>
              <p className="text-gray-400 text-sm">Fee on Profit</p>
            </div>
            <div className="text-center p-4 bg-[#060d16]/70 rounded-xl border border-cyan-900/30">
              <p className="text-3xl font-bold text-cyan-400">30+</p>
              <p className="text-gray-400 text-sm">Sports</p>
            </div>
            <div className="text-center p-4 bg-[#060d16]/70 rounded-xl border border-cyan-900/30">
              <p className="text-3xl font-bold text-cyan-400">5%</p>
              <p className="text-gray-400 text-sm">Staking APY</p>
            </div>
            <div className="text-center p-4 bg-[#060d16]/70 rounded-xl border border-cyan-900/30">
              <p className="text-3xl font-bold text-cyan-400">30%</p>
              <p className="text-gray-400 text-sm">Revenue to Holders</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                const el = document.getElementById(`section-${section.id}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="text-xs px-3 py-1.5 rounded-full bg-[#0f1923] border border-cyan-900/30 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors"
              data-testid={`nav-section-${section.id}`}
            >
              {section.title}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {sections.map((section, index) => {
            const isExpanded = expandedSections[section.id] !== false;
            return (
              <div 
                key={section.id}
                id={`section-${section.id}`}
                className="bg-[#0f1923] border border-cyan-900/30 rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-colors"
                data-testid={`section-${section.id}`}
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between gap-3 p-6 text-left"
                  data-testid={`button-toggle-${section.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#060d16]/70 rounded-xl">
                      {section.icon}
                    </div>
                    <h3 className="text-lg font-bold text-cyan-400">{index + 1}. {section.title}</h3>
                  </div>
                  <span className="text-gray-500 text-xl">{isExpanded ? '\u2212' : '+'}</span>
                </button>
                {isExpanded && (
                  <div className="px-6 pb-6 pl-[4.5rem] space-y-3">
                    {section.content.map((paragraph, pIdx) => (
                      <p key={pIdx} className="text-gray-300 leading-relaxed text-sm">{paragraph}</p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-[#0f1923] border border-cyan-500/30 rounded-2xl p-6 mt-8">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="h-6 w-6 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Smart Contract Addresses (Mainnet)</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 p-4 bg-[#060d16]/70 rounded-xl flex-wrap">
              <span className="text-gray-400">SBETS Token</span>
              <div className="flex items-center gap-2">
                <code className="text-cyan-400 text-sm">0x6a4d9c...1a7285</code>
                <a 
                  href="https://suiscan.xyz/mainnet/object/0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300"
                  data-testid="link-sbets-token"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 p-4 bg-[#060d16]/70 rounded-xl flex-wrap">
              <span className="text-gray-400">Betting Platform</span>
              <div className="flex items-center gap-2">
                <code className="text-cyan-400 text-sm">0x5fc107...88f082</code>
                <a 
                  href="https://suiscan.xyz/mainnet/object/0x5fc1073c9533c6737fa3a0882055d1778602681df70bdabde96b0127b588f082"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300"
                  data-testid="link-betting-contract"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 p-4 bg-[#060d16]/70 rounded-xl flex-wrap">
              <span className="text-gray-400">Betting Package</span>
              <div className="flex items-center gap-2">
                <code className="text-cyan-400 text-sm">0x737324...1b4ada</code>
                <a 
                  href="https://suiscan.xyz/mainnet/object/0x737324ddac9fb96e3d7ffab524f5489c1a0b3e5b4bffa2f244303005001b4ada"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300"
                  data-testid="link-betting-package"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-900/20 to-cyan-900/20 border border-purple-500/30 rounded-2xl p-6 mt-8">
          <div className="flex items-center gap-3 mb-4">
            <MessageCircle className="h-6 w-6 text-purple-400" />
            <h3 className="text-lg font-bold text-white">Disclaimer</h3>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            This whitepaper is for informational purposes only and does not constitute financial advice. 
            Sports betting and cryptocurrency carry inherent risks. Users should only bet what they can 
            afford to lose. SuiBets enforces responsible gambling tools including spending limits, session 
            timers, and self-exclusion options. By using the platform, users acknowledge and accept all 
            associated risks. Smart contract code is publicly verifiable on the Sui blockchain.
          </p>
        </div>

        <div className="text-center text-gray-500 text-sm mt-8 pb-8">
          SuiBets &mdash; Version 2.0 &mdash; February 2026 &mdash; Built on Sui
        </div>
      </div>
    </div>
  );
}
