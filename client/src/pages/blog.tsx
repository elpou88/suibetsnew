import { Link } from 'wouter';
import { ArrowLeft, BookOpen, Calendar, User, ArrowRight } from 'lucide-react';
const suibetsLogo = "/images/suibets-logo.png";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  category: string;
  readTime: string;
}

const blogPosts: BlogPost[] = [
  {
    id: "1",
    title: "Welcome to SuiBets: The Future of Decentralized Sports Betting",
    excerpt: "We're excited to launch SuiBets, a revolutionary sports betting platform built on the Sui blockchain. Learn about our vision for transparent, fair, and instant betting.",
    author: "SuiBets Team",
    date: "December 2025",
    category: "Announcements",
    readTime: "5 min read"
  },
  {
    id: "2",
    title: "Understanding Blockchain-Based Betting: Why It Matters",
    excerpt: "Discover how blockchain technology ensures fairness, transparency, and instant payouts in sports betting. No more waiting for withdrawals or worrying about platform manipulation.",
    author: "SuiBets Team",
    date: "December 2025",
    category: "Education",
    readTime: "7 min read"
  },
  {
    id: "3",
    title: "SBETS Token: Utility, Staking, and Benefits",
    excerpt: "Learn about the SBETS token ecosystem, including reduced fees, staking rewards, governance rights, and exclusive features for token holders.",
    author: "SuiBets Team",
    date: "December 2025",
    category: "Token",
    readTime: "6 min read"
  },
  {
    id: "4",
    title: "Parlay Betting Guide: Maximize Your Returns",
    excerpt: "Master the art of parlay betting with our comprehensive guide. Learn strategies for combining multiple selections to achieve higher potential payouts.",
    author: "SuiBets Team",
    date: "December 2025",
    category: "Guides",
    readTime: "8 min read"
  },
  {
    id: "5",
    title: "Live Betting Tips: How to Bet on In-Play Markets",
    excerpt: "Live betting offers exciting opportunities to capitalize on real-time game developments. Here are our top tips for successful in-play betting.",
    author: "SuiBets Team",
    date: "December 2025",
    category: "Guides",
    readTime: "6 min read"
  },
  {
    id: "6",
    title: "Security on SuiBets: How We Keep Your Funds Safe",
    excerpt: "An in-depth look at our security measures, smart contract audits, and why self-custody through blockchain is the safest way to bet.",
    author: "SuiBets Team",
    date: "December 2025",
    category: "Security",
    readTime: "5 min read"
  }
];

const categoryColors: Record<string, string> = {
  "Announcements": "bg-cyan-500/20 text-cyan-400",
  "Education": "bg-blue-500/20 text-blue-400",
  "Token": "bg-purple-500/20 text-purple-400",
  "Guides": "bg-green-500/20 text-green-400",
  "Security": "bg-orange-500/20 text-orange-400"
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-black" data-testid="blog-page">
      <nav className="bg-[#0a0a0a] border-b border-cyan-900/30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors" data-testid="btn-back">
                <ArrowLeft size={20} />
              </button>
            </Link>
            <Link href="/" data-testid="link-logo-blog">
              <img src={suibetsLogo} alt="SuiBets" className="h-10 w-auto cursor-pointer" />
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-cyan-500/20 rounded-xl">
            <BookOpen className="h-8 w-8 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Blog</h1>
            <p className="text-gray-400">News, updates, and guides from SuiBets</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {blogPosts.map((post) => (
            <article 
              key={post.id} 
              className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6 hover:border-cyan-500/50 transition-colors cursor-pointer group"
              data-testid={`blog-post-${post.id}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${categoryColors[post.category] || 'bg-gray-500/20 text-gray-400'}`}>
                  {post.category}
                </span>
                <span className="text-gray-500 text-sm">{post.readTime}</span>
              </div>
              
              <h2 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors">
                {post.title}
              </h2>
              
              <p className="text-gray-400 mb-4 line-clamp-3">
                {post.excerpt}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {post.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {post.date}
                  </span>
                </div>
                <ArrowRight className="h-5 w-5 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Stay Updated</h3>
          <p className="text-gray-400 mb-6">Follow us on social media for the latest news and updates</p>
          <div className="flex justify-center gap-4">
            <a href="https://x.com/Sui_Bets/" target="_blank" rel="noopener noreferrer" className="bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white font-bold px-6 py-2 rounded-lg transition-colors" data-testid="link-twitter-blog">
              Twitter
            </a>
            <a href="#" className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold px-6 py-2 rounded-lg transition-colors" data-testid="link-discord-blog">
              Discord
            </a>
            <a href="https://t.me/Sui_Bets" target="_blank" rel="noopener noreferrer" className="bg-[#0088cc] hover:bg-[#006699] text-white font-bold px-6 py-2 rounded-lg transition-colors" data-testid="link-telegram-blog">
              Telegram
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
