import { Link, useLocation } from 'wouter';
import { useState } from 'react';
import { useWalrusProtocolContext } from '@/context/WalrusProtocolContext';
const suibetsLogo = "/images/suibets-logo.png";
import { 
  FileText, 
  Shield, 
  Coins, 
  Users, 
  Zap, 
  Lock,
  TrendingUp,
  Globe,
  Wallet,
  RefreshCw,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';

export default function WhitepaperPage() {
  const [, setLocation] = useLocation();
  const { currentWallet } = useWalrusProtocolContext();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sections = [
    {
      id: 'introduction',
      title: 'Introduction',
      icon: <FileText className="h-5 w-5 text-cyan-400" />,
      content: 'SuiBets is a decentralized sports betting platform built on the Sui blockchain. Our platform leverages the speed, security, and low transaction costs of the Sui network to provide a seamless betting experience with complete transparency and fairness.'
    },
    {
      id: 'tokenomics',
      title: 'SBETS Tokenomics',
      icon: <Coins className="h-5 w-5 text-purple-400" />,
      content: 'The SBETS token is the native utility token of the SuiBets platform. Total supply: 1,000,000,000 SBETS. Distribution: 40% Community rewards, 25% Development, 20% Liquidity, 10% Team (vested), 5% Marketing.'
    },
    {
      id: 'security',
      title: 'Security & Transparency',
      icon: <Shield className="h-5 w-5 text-red-400" />,
      content: 'All bets are recorded on the Sui blockchain, ensuring complete transparency and immutability. Smart contracts are audited by leading security firms. Walrus protocol provides decentralized storage for all betting data.'
    },
    {
      id: 'betting',
      title: 'Betting Mechanics',
      icon: <TrendingUp className="h-5 w-5 text-green-400" />,
      content: 'SuiBets offers real-time odds on 30+ sports with multiple market types including Match Winner, Handicap, Over/Under, and more. Live betting is supported with instant settlement upon match completion.'
    },
    {
      id: 'governance',
      title: 'Governance',
      icon: <Users className="h-5 w-5 text-orange-400" />,
      content: 'SBETS token holders can participate in platform governance through voting on proposals. Stakers earn a share of platform fees and have enhanced voting power proportional to their stake duration.'
    },
    {
      id: 'technology',
      title: 'Technology Stack',
      icon: <Zap className="h-5 w-5 text-yellow-400" />,
      content: 'Built on Sui blockchain for high throughput and low latency. Move smart contracts ensure secure and efficient execution. Integration with Walrus protocol for decentralized data storage. Real-time odds from premium sports data providers.'
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
    <div className="min-h-screen bg-black" data-testid="whitepaper-page">
      {/* Navigation */}
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
            <Link href="/activity" className="text-gray-400 hover:text-cyan-400 text-sm font-medium" data-testid="nav-activity">Activity</Link>
            <Link href="/deposits-withdrawals" className="text-gray-400 hover:text-cyan-400 text-sm font-medium" data-testid="nav-withdraw">Withdraw</Link>
            <Link href="/parlay" className="text-gray-400 hover:text-cyan-400 text-sm font-medium" data-testid="nav-parlays">Parlays</Link>
            <Link href="/whitepaper" className="text-cyan-400 text-sm font-medium" data-testid="nav-whitepaper">Whitepaper</Link>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleRefresh} className="text-gray-400 hover:text-white p-2" data-testid="btn-refresh">
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
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

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-cyan-500/20 rounded-xl">
            <FileText className="h-8 w-8 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">SuiBets Whitepaper</h1>
            <p className="text-gray-400">Version 1.0 - December 2025</p>
          </div>
        </div>

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-cyan-900/30 to-purple-900/20 border border-cyan-500/30 rounded-2xl p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Globe className="h-10 w-10 text-cyan-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">Decentralized Sports Betting</h2>
              <p className="text-gray-400">Powered by Sui Blockchain</p>
            </div>
          </div>
          <p className="text-gray-300 leading-relaxed mb-6">
            SuiBets revolutionizes sports betting by combining the excitement of real-time wagering 
            with the security and transparency of blockchain technology. Our platform eliminates 
            traditional intermediaries, offering users 0% platform fees and instant payouts through 
            smart contract automation.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-black/50 rounded-xl border border-cyan-900/30">
              <p className="text-3xl font-bold text-cyan-400">0%</p>
              <p className="text-gray-400 text-sm">Platform Fees</p>
            </div>
            <div className="text-center p-4 bg-black/50 rounded-xl border border-cyan-900/30">
              <p className="text-3xl font-bold text-cyan-400">30+</p>
              <p className="text-gray-400 text-sm">Sports</p>
            </div>
            <div className="text-center p-4 bg-black/50 rounded-xl border border-cyan-900/30">
              <p className="text-3xl font-bold text-cyan-400">Instant</p>
              <p className="text-gray-400 text-sm">Payouts</p>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {sections.map((section, index) => (
            <div 
              key={section.id}
              className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6 hover:border-cyan-500/30 transition-colors"
              data-testid={`section-${section.id}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-black/50 rounded-xl">
                  {section.icon}
                </div>
                <h3 className="text-lg font-bold text-cyan-400">{index + 1}. {section.title}</h3>
              </div>
              <p className="text-gray-300 leading-relaxed pl-12">{section.content}</p>
            </div>
          ))}
        </div>

        {/* Smart Contract Addresses */}
        <div className="bg-[#111111] border border-cyan-500/30 rounded-2xl p-6 mt-8">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="h-6 w-6 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Smart Contract Addresses</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-black/50 rounded-xl">
              <span className="text-gray-400">SBETS Token</span>
              <div className="flex items-center gap-2">
                <code className="text-cyan-400 text-sm">0x6a4d9c...1a7285</code>
                <a 
                  href="https://explorer.sui.io/object/0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300"
                  data-testid="link-sbets-token"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-black/50 rounded-xl">
              <span className="text-gray-400">Betting Contract</span>
              <div className="flex items-center gap-2">
                <code className="text-cyan-400 text-sm">0x8b5e2f...3c9876</code>
                <a 
                  href="https://explorer.sui.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300"
                  data-testid="link-betting-contract"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
