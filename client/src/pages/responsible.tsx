import { Link } from 'wouter';
import { ArrowLeft, Heart, AlertTriangle, Phone, Clock, Ban } from 'lucide-react';
const suibetsLogo = "/images/suibets-logo.png";

export default function ResponsibleGambling() {
  return (
    <div className="min-h-screen bg-black" data-testid="responsible-page">
      <nav className="bg-[#0a0a0a] border-b border-cyan-900/30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors" data-testid="btn-back">
                <ArrowLeft size={20} />
              </button>
            </Link>
            <Link href="/" data-testid="link-logo-responsible">
              <img src={suibetsLogo} alt="SuiBets" className="h-10 w-auto cursor-pointer" />
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-green-500/20 rounded-xl">
            <Heart className="h-8 w-8 text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Responsible Gambling</h1>
            <p className="text-gray-400">Your wellbeing is our priority</p>
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-yellow-400 mb-2">Important Notice</h3>
              <p className="text-gray-300">
                Gambling should be entertainment, not a way to make money. Only bet what you can afford to lose. 
                If gambling stops being fun, it's time to stop.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-cyan-400" />
              Set Your Limits
            </h2>
            <p className="text-gray-300 mb-4">We encourage all users to set personal limits:</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                <div>
                  <strong className="text-white">Time limits:</strong>
                  <span className="text-gray-400"> Set a maximum time for betting sessions</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                <div>
                  <strong className="text-white">Deposit limits:</strong>
                  <span className="text-gray-400"> Decide your maximum deposit amount per day/week/month</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                <div>
                  <strong className="text-white">Loss limits:</strong>
                  <span className="text-gray-400"> Set a maximum you're willing to lose</span>
                </div>
              </li>
            </ul>
          </section>

          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Signs of Problem Gambling</h2>
            <p className="text-gray-300 mb-4">Watch for these warning signs:</p>
            <ul className="space-y-2 text-gray-400">
              <li>• Spending more money or time gambling than intended</li>
              <li>• Chasing losses by betting more to recover</li>
              <li>• Neglecting responsibilities, work, or relationships</li>
              <li>• Borrowing money or selling possessions to gamble</li>
              <li>• Feeling restless or irritable when trying to stop</li>
              <li>• Lying about gambling activities to others</li>
              <li>• Gambling to escape problems or relieve stress</li>
            </ul>
          </section>

          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-400" />
              Self-Exclusion
            </h2>
            <p className="text-gray-300 mb-4">
              If you need to take a break, you can self-exclude by simply disconnecting your wallet and not reconnecting. 
              Since SuiBets is decentralized, you maintain full control over your participation.
            </p>
            <p className="text-gray-400">
              We recommend deleting your browser history related to gambling sites and using website blockers if needed.
            </p>
          </section>

          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-400" />
              Get Help
            </h2>
            <p className="text-gray-300 mb-4">If you or someone you know has a gambling problem, help is available:</p>
            <div className="space-y-4">
              <div className="bg-black/50 rounded-xl p-4">
                <h4 className="font-bold text-white">National Problem Gambling Helpline</h4>
                <p className="text-cyan-400 text-lg">1-800-522-4700</p>
                <p className="text-gray-400 text-sm">Available 24/7, confidential</p>
              </div>
              <div className="bg-black/50 rounded-xl p-4">
                <h4 className="font-bold text-white">Gamblers Anonymous</h4>
                <a href="https://www.gamblersanonymous.org" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline" data-testid="link-gamblers-anonymous">
                  www.gamblersanonymous.org
                </a>
              </div>
              <div className="bg-black/50 rounded-xl p-4">
                <h4 className="font-bold text-white">National Council on Problem Gambling</h4>
                <a href="https://www.ncpgambling.org" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline" data-testid="link-ncpg">
                  www.ncpgambling.org
                </a>
              </div>
            </div>
          </section>

          <section className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Tips for Responsible Gambling</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-gray-300">
                <span className="text-cyan-400 font-bold">1.</span>
                Set a budget before you start and stick to it
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <span className="text-cyan-400 font-bold">2.</span>
                Never chase your losses
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <span className="text-cyan-400 font-bold">3.</span>
                Take regular breaks from gambling
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <span className="text-cyan-400 font-bold">4.</span>
                Don't gamble when upset, stressed, or under the influence
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <span className="text-cyan-400 font-bold">5.</span>
                Balance gambling with other activities
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <span className="text-cyan-400 font-bold">6.</span>
                Never borrow money to gamble
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
