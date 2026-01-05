import { Link } from "wouter";
import { 
  MessageSquare, 
  MessageSquareIcon, 
  TwitterIcon, 
  CheckCircle, 
  Info, 
  HelpCircle
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#032F36] p-6 border-t border-[#04363E]">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="font-medium text-white mb-3">Information</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li><span className="hover:text-primary cursor-pointer" onClick={() => window.location.href="/faq"}>FAQ</span></li>
            <li><span className="hover:text-primary cursor-pointer" onClick={() => window.location.href="/blog"}>Blog</span></li>
            <li><span className="hover:text-primary cursor-pointer" onClick={() => window.location.href="/affiliate"}>Become an Affiliate</span></li>
            <li><span className="hover:text-primary cursor-pointer" onClick={() => window.location.href="/privacy"}>Privacy Policy</span></li>
            <li><span className="hover:text-primary cursor-pointer" onClick={() => window.location.href="/rules"}>Rules</span></li>
            <li><span className="hover:text-primary cursor-pointer" onClick={() => window.location.href="/integrity"}>Betting Integrity</span></li>
            <li><span className="hover:text-primary cursor-pointer" onClick={() => window.location.href="/responsible"}>Responsible Gambling</span></li>
            <li><span className="hover:text-primary cursor-pointer" onClick={() => window.location.href="/about"}>About Us</span></li>
          </ul>
        </div>
        
        <div>
          <h3 className="font-medium text-white mb-3">Community</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>
              <a href="#" className="flex items-center hover:text-primary">
                <MessageSquare className="h-4 w-4 mr-2" />
                Telegram
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center hover:text-primary">
                <MessageSquareIcon className="h-4 w-4 mr-2" />
                Discord
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center hover:text-primary">
                <TwitterIcon className="h-4 w-4 mr-2" />
                Twitter
              </a>
            </li>
          </ul>
        </div>
        
        <div>
          <h3 className="font-medium text-white mb-3">Contact Us</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>
              <a href="#" className="flex items-center hover:text-primary">
                <HelpCircle className="h-4 w-4 mr-2" />
                Support
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center hover:text-primary">
                <CheckCircle className="h-4 w-4 mr-2" />
                Cooperation
              </a>
            </li>
          </ul>
        </div>
        
        <div>
          <h3 className="font-medium text-white mb-3">Preferences</h3>
          <div className="flex items-center text-sm text-gray-300 mb-3">
            <div className="border border-[#04363E] rounded inline-flex items-center p-2 bg-[#04363E]">
              <span className="mr-2 flex items-center">
                <svg className="h-4 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30">
                  <clipPath id="a"><path d="M0 0v30h60V0z"/></clipPath>
                  <clipPath id="b"><path d="M30 15h30v15zv15H0zH0V0zV0h30z"/></clipPath>
                  <g clipPath="url(#a)">
                    <path d="M0 0v30h60V0z" fill="#012169"/>
                    <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6"/>
                    <path d="M0 0l60 30m0-30L0 30" clipPath="url(#b)" stroke="#C8102E" strokeWidth="4"/>
                    <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10"/>
                    <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6"/>
                  </g>
                </svg>
              </span>
              <span>English</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 pt-8 border-t border-[#04363E] text-center text-sm text-gray-400">
        <p>© {new Date().getFullYear()} SuiBets. All rights reserved.</p>
        <p className="mt-2">
          SuiBets is a sports betting platform built on the Sui blockchain.
        </p>
      </div>
    </footer>
  );
}
