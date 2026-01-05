import React, { ReactNode } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  Home, TrendingUp, Megaphone, Bell, Settings, 
  Clock, Wallet, ChevronLeft, Landmark, 
  TrendingDown, Trophy, Search, MenuIcon
} from 'lucide-react';

export interface LayoutProps {
  children: ReactNode;
  title?: string;
  showBackButton?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  title, 
  showBackButton = false
}) => {
  const [location, setLocation] = useLocation();
  
  const topNavItems = [
    { label: 'Sports', i18nKey: 'sports', icon: <TrendingUp />, href: '/home-real' },
    { label: 'Live', i18nKey: 'live', icon: <TrendingDown />, href: '/live-real' },
    { label: 'Promotions', i18nKey: 'promotions', icon: <Megaphone />, href: '/promotions' },
  ];

  const bottomNavItems = [
    { label: 'Home', i18nKey: 'home', icon: <Home />, href: '/home-real' },
    { label: 'Live', i18nKey: 'live', icon: <TrendingUp />, href: '/live-real' },
    { label: 'DeFi', i18nKey: 'staking', icon: <Landmark />, href: '/defi-staking' },
    { label: 'History', i18nKey: 'bet_history', icon: <Clock />, href: '/bet-history' },
    { label: 'Settings', i18nKey: 'settings', icon: <Settings />, href: '/settings' },
  ];

  const handleBack = () => {
    window.history.back();
  };
  
  return (
    <div className="min-h-screen bg-[#112225] text-white pb-16 lg:pb-0">
      {/* Top Header - like bet365 */}
      <header className="bg-[#0b1618] border-b border-[#1e3a3f]">
        {/* Upper section with logo and login */}
        <div className="px-4 py-3 flex items-center justify-between bg-gradient-to-r from-[#0b1618] to-[#112225]">
          <div className="flex items-center space-x-2">
            {showBackButton ? (
              <Button
                variant="ghost"
                size="sm"
                className="mr-2 text-cyan-400 hover:text-cyan-300 hover:bg-[#1e3a3f]"
                onClick={handleBack}
              >
                <ChevronLeft className="h-5 w-5" />
                Back
              </Button>
            ) : (
              <div className="font-bold text-xl text-cyan-400 relative">
                <span className="relative z-10">SuiBets</span>
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-cyan-400 opacity-30"></span>
                <span className="absolute -left-2 top-0 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,255,255,0.8)]"></span>
              </div>
            )}
            {showBackButton && title && (
              <h1 className="text-xl font-semibold text-cyan-200">{title}</h1>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              className="border-[#1e3a3f] bg-[#112225] text-cyan-200 text-xs hover:bg-[#1e3a3f] hover:text-cyan-400 transition-colors"
              onClick={() => setLocation('/join')}
            >
              Join Now
            </Button>
            <Button 
              variant="default" 
              size="sm"
              className="bg-[#00ffff] hover:bg-[#00d8d8] text-black text-xs shadow-[0_0_10px_rgba(0,255,255,0.3)] transition-all hover:shadow-[0_0_15px_rgba(0,255,255,0.5)]"
              onClick={() => setLocation('/connect-wallet')}
            >
              <Wallet className="mr-2 h-3 w-3" />
              Connect Wallet
            </Button>
          </div>
        </div>

        {/* Navigation items in header like bet365 */}
        <div className="flex items-center overflow-x-auto custom-scrollbar border-t border-[#1e3a3f] bg-[#0b1618]">
          {topNavItems.map((item, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className={`rounded-none border-r border-[#1e3a3f] h-12 px-4 flex items-center transition-colors ${
                location === item.href 
                  ? 'text-cyan-400 border-b-2 border-b-cyan-400 bg-[#112225]' 
                  : 'text-cyan-200 hover:text-cyan-400 hover:bg-[#112225]'
              }`}
              onClick={() => setLocation(item.href)}
            >
              {React.cloneElement(item.icon as React.ReactElement, { 
                className: `h-4 w-4 mr-2 ${location === item.href ? 'text-cyan-400' : 'text-cyan-400/70'}` 
              })}
              <span data-i18n={item.i18nKey}>{item.label}</span>
            </Button>
          ))}

          <div className="ml-auto flex items-center p-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-1 rounded-full text-cyan-400 hover:bg-[#1e3a3f] hover:text-cyan-300 transition-colors"
              onClick={() => setLocation('/notifications')}
            >
              <Bell className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-1 rounded-full text-cyan-400 hover:bg-[#1e3a3f] hover:text-cyan-300 transition-colors"
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-1 rounded-full text-cyan-400 hover:bg-[#1e3a3f] hover:text-cyan-300 transition-colors md:hidden"
            >
              <MenuIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
      
      {/* Display title if provided and not showing back button */}
      {title && !showBackButton && (
        <div className="container mx-auto px-4 pt-4">
          <h1 className="text-xl font-bold">{title}</h1>
        </div>
      )}
      
      {/* Main content */}
      <div className="container mx-auto p-4">
        {children}
      </div>
      
      {/* Mobile bottom navigation (visible on small screens) - like bet365 */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0b1618] to-[#112225] border-t border-[#1e3a3f] z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.3)]">
        <div className="flex justify-around p-1">
          {bottomNavItems.map((item, index) => (
            <Button
              key={index}
              variant="ghost"
              className={`flex flex-col items-center justify-center py-1 h-16 w-full transition-all ${
                location === item.href 
                  ? 'text-cyan-400 border-t-2 border-cyan-400 bg-[#1e3a3f]/30' 
                  : 'text-cyan-200 hover:text-cyan-400'
              }`}
              onClick={() => setLocation(item.href)}
            >
              {React.cloneElement(item.icon as React.ReactElement, { 
                className: `h-5 w-5 mb-1 ${location === item.href ? 'text-cyan-400' : 'text-cyan-400/70'}`
              })}
              <span className="text-xs" data-i18n={item.i18nKey}>{item.label}</span>
              {location === item.href && (
                <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,255,255,0.8)]"></span>
              )}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Layout;