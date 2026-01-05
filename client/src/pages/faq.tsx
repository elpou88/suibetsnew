import { Link } from 'wouter';
import { ArrowLeft, HelpCircle, ChevronDown } from 'lucide-react';
import { useState } from 'react';
const suibetsLogo = "/images/suibets-logo.png";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is SuiBets?",
    answer: "SuiBets is a decentralized sports betting platform built on the Sui blockchain. We offer betting on 30+ sports with real-time odds, instant settlements, and secure blockchain-based transactions using SUI and SBETS tokens."
  },
  {
    question: "How do I get started?",
    answer: "Simply connect your Sui-compatible wallet (like Sui Wallet or Nightly), deposit SUI tokens, and start betting on your favorite sports. No account registration required - your wallet is your identity."
  },
  {
    question: "What wallets are supported?",
    answer: "We support all Sui-compatible wallets including Sui Wallet, Nightly, Suiet, and other wallets that follow the Wallet Standard. Make sure you have a wallet extension installed in your browser."
  },
  {
    question: "How do deposits and withdrawals work?",
    answer: "Deposits are instant - simply send SUI from your wallet to your SuiBets balance. Withdrawals are processed on-chain and typically complete within seconds. There are no withdrawal limits."
  },
  {
    question: "What is the SBETS token?",
    answer: "SBETS is our native utility token that offers benefits like reduced platform fees, staking rewards, and governance rights. You can use either SUI or SBETS for betting."
  },
  {
    question: "How are bets settled?",
    answer: "Bets are automatically settled when matches finish. Our system fetches official results from sports data providers and credits winnings to your balance instantly via smart contracts."
  },
  {
    question: "What sports can I bet on?",
    answer: "We offer betting on Football, Basketball, Tennis, Baseball, Hockey, Rugby, Cricket, Golf, Boxing, MMA/UFC, Formula 1, American Football, and many more - over 30 sports total."
  },
  {
    question: "Are there any fees?",
    answer: "We charge a small 1% platform fee on bets. There are no deposit or withdrawal fees beyond standard Sui network gas fees, which are minimal."
  },
  {
    question: "What is a parlay bet?",
    answer: "A parlay combines multiple selections into a single bet. All selections must win for the parlay to pay out, but the odds multiply together for potentially much higher returns."
  },
  {
    question: "Is my money safe?",
    answer: "Your funds are secured by the Sui blockchain. We never hold your private keys, and all betting transactions are executed through audited smart contracts. You maintain full custody of your assets."
  },
  {
    question: "What happens if a match is cancelled?",
    answer: "If a match is cancelled or postponed, bets are typically voided and stakes are refunded to your balance. Specific rules may vary by sport and market type."
  },
  {
    question: "How do I contact support?",
    answer: "Join our community on Telegram or Discord for support. You can also reach us through the Contact page on our website."
  }
];

function FAQAccordion({ item, isOpen, onClick }: { item: FAQItem; isOpen: boolean; onClick: () => void }) {
  return (
    <div className="bg-[#111111] border border-cyan-900/30 rounded-xl overflow-hidden">
      <button
        onClick={onClick}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-cyan-500/5 transition-colors"
        data-testid={`faq-${item.question.slice(0, 20).replace(/\s/g, '-').toLowerCase()}`}
      >
        <span className="font-medium text-white">{item.question}</span>
        <ChevronDown className={`h-5 w-5 text-cyan-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-6 pb-4 text-gray-400">
          {item.answer}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-black" data-testid="faq-page">
      <nav className="bg-[#0a0a0a] border-b border-cyan-900/30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors" data-testid="btn-back">
                <ArrowLeft size={20} />
              </button>
            </Link>
            <Link href="/" data-testid="link-logo-faq">
              <img src={suibetsLogo} alt="SuiBets" className="h-10 w-auto cursor-pointer" />
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-cyan-500/20 rounded-xl">
            <HelpCircle className="h-8 w-8 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Frequently Asked Questions</h1>
            <p className="text-gray-400">Everything you need to know about SuiBets</p>
          </div>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <FAQAccordion
              key={index}
              item={faq}
              isOpen={openIndex === index}
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>

        <div className="mt-12 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-2xl p-6 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Still have questions?</h3>
          <p className="text-gray-400 mb-4">Join our community for support and updates</p>
          <div className="flex justify-center gap-4">
            <a href="https://t.me/Sui_Bets" target="_blank" rel="noopener noreferrer" className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold px-6 py-2 rounded-lg transition-colors" data-testid="link-telegram-faq">
              Join Telegram
            </a>
            <a href="#" className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold px-6 py-2 rounded-lg transition-colors" data-testid="link-discord-faq">
              Join Discord
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
