import { Link } from 'wouter';
import { ArrowLeft, Users, DollarSign, TrendingUp, Gift, Zap, BarChart } from 'lucide-react';
const suibetsLogo = "/images/suibets-logo.png";

export default function AffiliatePage() {
  return (
    <div className="min-h-screen bg-black" data-testid="affiliate-page">
      <nav className="bg-[#0a0a0a] border-b border-cyan-900/30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors" data-testid="btn-back">
                <ArrowLeft size={20} />
              </button>
            </Link>
            <Link href="/" data-testid="link-logo-affiliate">
              <img src={suibetsLogo} alt="SuiBets" className="h-10 w-auto cursor-pointer" />
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-green-500/20 rounded-xl">
            <Users className="h-8 w-8 text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Affiliate Program</h1>
            <p className="text-gray-400">Earn rewards by referring users to SuiBets</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-cyan-500/20 to-green-500/20 border border-cyan-500/30 rounded-2xl p-8 mb-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Earn Up To 30% Commission</h2>
          <p className="text-gray-300 mb-6">On all betting fees from your referrals - paid in SUI and SBETS</p>
          <button className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold px-8 py-3 rounded-xl text-lg transition-colors" data-testid="btn-apply-affiliate">
            Apply Now
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6 text-center">
            <DollarSign className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">30%</h3>
            <p className="text-gray-400">Revenue Share</p>
          </div>
          <div className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6 text-center">
            <TrendingUp className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Lifetime</h3>
            <p className="text-gray-400">Earnings Duration</p>
          </div>
          <div className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6 text-center">
            <Gift className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Limits</h3>
            <p className="text-gray-400">Unlimited Referrals</p>
          </div>
        </div>

        <div className="space-y-6">
          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              How It Works
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-black font-bold flex-shrink-0">1</div>
                <div>
                  <h4 className="font-bold text-white">Apply & Get Approved</h4>
                  <p className="text-gray-400">Submit your application and get your unique referral link</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-black font-bold flex-shrink-0">2</div>
                <div>
                  <h4 className="font-bold text-white">Share Your Link</h4>
                  <p className="text-gray-400">Promote SuiBets through your channels - social media, websites, communities</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-black font-bold flex-shrink-0">3</div>
                <div>
                  <h4 className="font-bold text-white">Earn Commissions</h4>
                  <p className="text-gray-400">Get paid automatically when your referrals place bets</p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <BarChart className="h-5 w-5 text-cyan-400" />
              Commission Structure
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-cyan-900/30">
                    <th className="py-3 text-gray-400 font-medium">Tier</th>
                    <th className="py-3 text-gray-400 font-medium">Monthly Volume</th>
                    <th className="py-3 text-gray-400 font-medium">Commission</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-cyan-900/20">
                    <td className="py-3">Bronze</td>
                    <td className="py-3">0 - 1,000 SUI</td>
                    <td className="py-3 text-cyan-400 font-bold">20%</td>
                  </tr>
                  <tr className="border-b border-cyan-900/20">
                    <td className="py-3">Silver</td>
                    <td className="py-3">1,000 - 10,000 SUI</td>
                    <td className="py-3 text-cyan-400 font-bold">25%</td>
                  </tr>
                  <tr>
                    <td className="py-3">Gold</td>
                    <td className="py-3">10,000+ SUI</td>
                    <td className="py-3 text-cyan-400 font-bold">30%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Why Partner With SuiBets?</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-gray-300">Industry-leading commission rates</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-gray-300">Instant payouts in crypto</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-gray-300">Real-time tracking dashboard</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-gray-300">Dedicated affiliate support</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-gray-300">Marketing materials provided</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-gray-300">No negative carryover</span>
              </div>
            </div>
          </section>

          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Requirements</h2>
            <ul className="space-y-2 text-gray-400">
              <li>• Active social media presence or website</li>
              <li>• Interest in cryptocurrency and sports betting</li>
              <li>• Commitment to ethical promotion practices</li>
              <li>• Compliance with local advertising regulations</li>
            </ul>
          </section>

          <div className="text-center py-8">
            <h3 className="text-xl font-bold text-white mb-4">Ready to Start Earning?</h3>
            <button className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold px-8 py-3 rounded-xl text-lg transition-colors" data-testid="btn-apply-affiliate-bottom">
              Apply for Affiliate Program
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
