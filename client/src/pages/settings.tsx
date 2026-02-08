import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useSettings } from '@/context/SettingsContext';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useToast } from '@/hooks/use-toast';
import SuiNSName from '@/components/SuiNSName';
const suibetsLogo = "/images/suibets-logo.png";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Globe, 
  Wallet,
  RefreshCw,
  Save,
  Moon,
  Sun,
  Palette,
  Zap,
  Shield,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

export default function SettingsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const currentAccount = useCurrentAccount();
  const walletAddress = currentAccount?.address;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { 
    language, 
    setLanguage, 
    oddsFormat, 
    setOddsFormat, 
    onSiteNotifications, 
    setOnSiteNotifications,
    darkMode,
    setDarkMode,
    saveSettings
  } = useSettings();

  const handleSave = async () => {
    setIsSaving(true);
    saveSettings();
    await new Promise(resolve => setTimeout(resolve, 500));
    toast({ title: 'Settings Saved', description: 'Your preferences have been updated' });
    setIsSaving(false);
  };

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
    <div className="min-h-screen" data-testid="settings-page">
      {/* Navigation */}
      <nav className="bg-black/40 backdrop-blur-md border-b border-cyan-900/30 px-4 py-3">
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
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleRefresh} className="text-gray-400 hover:text-white p-2" data-testid="btn-refresh">
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            {walletAddress ? (
              <SuiNSName address={walletAddress} className="text-cyan-400 text-sm" />
            ) : (
              <button onClick={handleConnectWallet} className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2" data-testid="btn-connect">
                <Wallet size={16} />
                Connect
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-cyan-500/20 rounded-xl">
            <SettingsIcon className="h-8 w-8 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Settings</h1>
            <p className="text-gray-400">Customize your SuiBets experience</p>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Display Settings */}
          <div className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Palette className="h-5 w-5 text-cyan-400" />
              Display
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-black/50 rounded-xl">
                <div className="flex items-center gap-3">
                  {darkMode ? <Moon className="h-5 w-5 text-purple-400" /> : <Sun className="h-5 w-5 text-yellow-400" />}
                  <div>
                    <p className="text-white font-medium">Dark Mode</p>
                    <p className="text-gray-500 text-sm">Use dark theme</p>
                  </div>
                </div>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`w-14 h-8 rounded-full transition-colors ${darkMode ? 'bg-cyan-500' : 'bg-gray-600'}`}
                  data-testid="toggle-dark-mode"
                >
                  <div className={`w-6 h-6 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-black/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-cyan-400" />
                  <div>
                    <p className="text-white font-medium">Language</p>
                    <p className="text-gray-500 text-sm">Choose your language</p>
                  </div>
                </div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-[#0a0a0a] border border-cyan-900/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                  data-testid="select-language"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="zh">中文</option>
                  <option value="ja">日本語</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-black/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="text-white font-medium">Odds Format</p>
                    <p className="text-gray-500 text-sm">How odds are displayed</p>
                  </div>
                </div>
                <select
                  value={oddsFormat}
                  onChange={(e) => setOddsFormat(e.target.value)}
                  className="bg-[#0a0a0a] border border-cyan-900/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                  data-testid="select-odds"
                >
                  <option value="decimal">Decimal (1.50)</option>
                  <option value="fractional">Fractional (1/2)</option>
                  <option value="american">American (+150)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Bell className="h-5 w-5 text-cyan-400" />
              Notifications
            </h3>
            
            <div className="flex items-center justify-between p-4 bg-black/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-orange-400" />
                <div>
                  <p className="text-white font-medium">Push Notifications</p>
                  <p className="text-gray-500 text-sm">Receive alerts about your bets</p>
                </div>
              </div>
              <button
                onClick={() => setOnSiteNotifications(!onSiteNotifications)}
                className={`w-14 h-8 rounded-full transition-colors ${onSiteNotifications ? 'bg-cyan-500' : 'bg-gray-600'}`}
                data-testid="toggle-notifications"
              >
                <div className={`w-6 h-6 bg-white rounded-full transition-transform ${onSiteNotifications ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          {/* Security */}
          <div className="bg-[#111111] border border-cyan-900/30 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Shield className="h-5 w-5 text-cyan-400" />
              Security
            </h3>
            
            <div className="flex items-center justify-between p-4 bg-black/50 rounded-xl border border-transparent">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-green-400" />
                <div>
                  <p className="text-white font-medium">Wallet Authentication</p>
                  <p className="text-gray-500 text-sm">Your wallet is your secure login</p>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 text-black font-bold py-4 rounded-xl transition-colors text-lg flex items-center justify-center gap-2"
            data-testid="btn-save-settings"
          >
            {isSaving ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
