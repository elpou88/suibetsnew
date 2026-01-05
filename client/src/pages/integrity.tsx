import { Link } from 'wouter';
import { ArrowLeft, Shield, Eye, Lock, Scale } from 'lucide-react';
const suibetsLogo = "/images/suibets-logo.png";

export default function IntegrityPage() {
  return (
    <div className="min-h-screen bg-black" data-testid="integrity-page">
      <nav className="bg-[#0a0a0a] border-b border-cyan-900/30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors" data-testid="btn-back">
                <ArrowLeft size={20} />
              </button>
            </Link>
            <Link href="/" data-testid="link-logo-integrity">
              <img src={suibetsLogo} alt="SuiBets" className="h-10 w-auto cursor-pointer" />
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-purple-500/20 rounded-xl">
            <Shield className="h-8 w-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Betting Integrity</h1>
            <p className="text-gray-400">Our commitment to fair and transparent betting</p>
          </div>
        </div>

        <div className="space-y-6">
          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Eye className="h-5 w-5 text-cyan-400" />
              Transparency Through Blockchain
            </h2>
            <p className="text-gray-300 mb-4">
              SuiBets is built on the Sui blockchain, ensuring complete transparency in all betting operations:
            </p>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                <span>All bets are recorded immutably on the blockchain</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                <span>Smart contracts execute settlements automatically and fairly</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                <span>Anyone can verify transaction history on-chain</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                <span>No hidden manipulation of odds or outcomes</span>
              </li>
            </ul>
          </section>

          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-cyan-400" />
              Anti-Fraud Measures
            </h2>
            <p className="text-gray-300 mb-4">
              We employ multiple layers of protection against fraudulent activity:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-black/50 rounded-xl p-4">
                <h4 className="font-bold text-white mb-2">Real-Time Monitoring</h4>
                <p className="text-gray-400 text-sm">Continuous monitoring of betting patterns to detect suspicious activity</p>
              </div>
              <div className="bg-black/50 rounded-xl p-4">
                <h4 className="font-bold text-white mb-2">Verified Data Sources</h4>
                <p className="text-gray-400 text-sm">Official sports data from trusted, licensed providers</p>
              </div>
              <div className="bg-black/50 rounded-xl p-4">
                <h4 className="font-bold text-white mb-2">Smart Contract Audits</h4>
                <p className="text-gray-400 text-sm">Regular security audits of all betting smart contracts</p>
              </div>
              <div className="bg-black/50 rounded-xl p-4">
                <h4 className="font-bold text-white mb-2">Anomaly Detection</h4>
                <p className="text-gray-400 text-sm">AI-powered systems to identify unusual betting patterns</p>
              </div>
            </div>
          </section>

          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Scale className="h-5 w-5 text-cyan-400" />
              Fair Odds Policy
            </h2>
            <p className="text-gray-300 mb-4">
              Our odds are calculated fairly and transparently:
            </p>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                <span>Odds are derived from multiple professional data sources</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                <span>A transparent 1% platform fee is applied to all bets</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                <span>No hidden margins or unfair adjustments</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                <span>Competitive odds comparable to industry standards</span>
              </li>
            </ul>
          </section>

          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Match-Fixing Prevention</h2>
            <p className="text-gray-300 mb-4">
              SuiBets has zero tolerance for match-fixing and betting manipulation:
            </p>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-2"></div>
                <span>Suspicious betting patterns are immediately investigated</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-2"></div>
                <span>We cooperate with sports integrity organizations</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-2"></div>
                <span>Bets on compromised events may be voided</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-2"></div>
                <span>Users involved in manipulation will be banned</span>
              </li>
            </ul>
          </section>

          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Report Suspicious Activity</h2>
            <p className="text-gray-300 mb-4">
              If you suspect any fraudulent activity, match-fixing, or integrity violations, 
              please report it immediately through our community channels. All reports are treated 
              confidentially.
            </p>
            <div className="flex gap-4">
              <a href="https://t.me/Sui_Bets" target="_blank" rel="noopener noreferrer" className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold px-6 py-2 rounded-lg transition-colors" data-testid="link-report-telegram">
                Report via Telegram
              </a>
              <a href="#" className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold px-6 py-2 rounded-lg transition-colors" data-testid="link-report-discord">
                Report via Discord
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
