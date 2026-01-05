import { Link } from 'wouter';
import { ArrowLeft, Shield } from 'lucide-react';
const suibetsLogo = "/images/suibets-logo.png";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-black" data-testid="privacy-page">
      <nav className="bg-[#0a0a0a] border-b border-cyan-900/30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors" data-testid="btn-back">
                <ArrowLeft size={20} />
              </button>
            </Link>
            <Link href="/" data-testid="link-logo-privacy">
              <img src={suibetsLogo} alt="SuiBets" className="h-10 w-auto cursor-pointer" />
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-cyan-500/20 rounded-xl">
            <Shield className="h-8 w-8 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
            <p className="text-gray-400">Last updated: December 2025</p>
          </div>
        </div>

        <div className="space-y-8 text-gray-300">
          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">1. Information We Collect</h2>
            <p className="mb-4">SuiBets collects minimal information necessary to provide our services:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong className="text-cyan-400">Wallet Address:</strong> Your Sui blockchain wallet address for transactions</li>
              <li><strong className="text-cyan-400">Transaction Data:</strong> Betting history, deposits, and withdrawals on the blockchain</li>
              <li><strong className="text-cyan-400">Usage Data:</strong> Anonymous analytics to improve our platform</li>
            </ul>
          </section>

          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Process betting transactions securely on the Sui blockchain</li>
              <li>Provide customer support and respond to inquiries</li>
              <li>Prevent fraud and ensure platform security</li>
              <li>Improve our services and user experience</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">3. Blockchain Transparency</h2>
            <p>All transactions on SuiBets are recorded on the Sui blockchain. This means:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
              <li>Transactions are publicly visible on the blockchain</li>
              <li>Your wallet address is pseudonymous but not anonymous</li>
              <li>We cannot delete blockchain transaction records</li>
              <li>Smart contract interactions are immutable and verifiable</li>
            </ul>
          </section>

          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">4. Data Security</h2>
            <p>We implement industry-standard security measures including:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
              <li>End-to-end encryption for all communications</li>
              <li>Secure wallet integration protocols</li>
              <li>Regular security audits of smart contracts</li>
              <li>No storage of private keys or seed phrases</li>
            </ul>
          </section>

          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">5. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
              <li>Access your betting history and account data</li>
              <li>Request deletion of off-chain personal data</li>
              <li>Disconnect your wallet at any time</li>
              <li>Contact us with privacy concerns</li>
            </ul>
          </section>

          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">6. Contact Us</h2>
            <p>For privacy-related questions, contact us through our community channels or support system.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
