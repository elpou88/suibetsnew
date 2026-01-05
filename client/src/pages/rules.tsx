import { Link } from 'wouter';
import { ArrowLeft, BookOpen, CheckCircle } from 'lucide-react';
const suibetsLogo = "/images/suibets-logo.png";

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-black" data-testid="rules-page">
      <nav className="bg-[#0a0a0a] border-b border-cyan-900/30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors" data-testid="btn-back">
                <ArrowLeft size={20} />
              </button>
            </Link>
            <Link href="/" data-testid="link-logo-rules">
              <img src={suibetsLogo} alt="SuiBets" className="h-10 w-auto cursor-pointer" />
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-cyan-500/20 rounded-xl">
            <BookOpen className="h-8 w-8 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Betting Rules</h1>
            <p className="text-gray-400">Terms and conditions for betting on SuiBets</p>
          </div>
        </div>

        <div className="space-y-6 text-gray-300">
          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">1. General Rules</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>All bets are final once confirmed on the blockchain</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>Minimum bet amount is 0.1 SUI or equivalent in SBETS</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>Maximum bet amount is 10,000 SUI per single bet</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>Odds are subject to change until bet is placed</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>Users must be of legal gambling age in their jurisdiction</span>
              </li>
            </ul>
          </section>

          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">2. Bet Settlement</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>Bets are settled based on official results from authorized data providers</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>Winnings are automatically credited to your balance upon settlement</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>In case of disputed results, SuiBets reserves the right to delay settlement</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>Settlement typically occurs within minutes of event completion</span>
              </li>
            </ul>
          </section>

          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">3. Void Bets</h2>
            <p className="mb-4">Bets may be voided (stake refunded) in the following circumstances:</p>
            <ul className="space-y-2 ml-4">
              <li>• Event is cancelled or postponed beyond 24 hours</li>
              <li>• Event venue changes significantly</li>
              <li>• Technical errors in odds or markets</li>
              <li>• Evidence of match-fixing or manipulation</li>
              <li>• Player/team withdrawal before event starts (where applicable)</li>
            </ul>
          </section>

          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">4. Parlay Bets</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>Minimum 2 selections, maximum 10 selections per parlay</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>All selections must win for the parlay to pay out</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>If one selection is voided, the parlay continues with reduced odds</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>Same-event parlays may be restricted for certain markets</span>
              </li>
            </ul>
          </section>

          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">5. Live Betting</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>Live betting odds change in real-time based on event progress</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>Bets placed during a scoring action may be voided</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>Markets may be suspended during critical moments</span>
              </li>
            </ul>
          </section>

          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">6. Fees</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>Platform fee: 1% of bet amount</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>Network gas fees apply for blockchain transactions</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>SBETS token holders may receive reduced fees</span>
              </li>
            </ul>
          </section>

          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">7. Disputes</h2>
            <p>
              In case of any dispute, SuiBets' decision is final. All betting activity is recorded on the 
              Sui blockchain and can be verified. For dispute resolution, contact our support team through 
              community channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
