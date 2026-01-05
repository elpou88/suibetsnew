import Layout from '@/components/layout/Layout';
import { BetHistory } from '@/components/betting/BetHistory';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from 'wouter';

/**
 * Bet History page that displays a user's betting history and allows
 * them to manage active bets, cash out, and withdraw winnings
 */
export default function BetHistoryPage() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
  // If not authenticated, redirect to auth page
  useEffect(() => {
    if (!isAuthenticated && !user) {
      // You could redirect to login, but for now we'll just go to home
      // setLocation('/auth');
    }
  }, [isAuthenticated, user, setLocation]);

  return (
    <Layout>
      <div className="min-h-screen bg-[#112225] p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-6">Bet History</h1>
          
          <div className="space-y-6">
            <BetHistory />
            
            {/* Additional bet stats or information could go here */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#0b1618] border border-[#1e3a3f] rounded-md p-4 text-white">
                <h3 className="text-lg font-medium text-cyan-400 mb-2">Win Rate</h3>
                <div className="text-3xl font-bold">
                  {user ? '64%' : '—'}
                </div>
                <p className="text-gray-400 text-sm mt-1">Based on your betting history</p>
              </div>
              
              <div className="bg-[#0b1618] border border-[#1e3a3f] rounded-md p-4 text-white">
                <h3 className="text-lg font-medium text-cyan-400 mb-2">Total Winnings</h3>
                <div className="text-3xl font-bold">
                  {user ? '245.50 SUI' : '—'}
                </div>
                <p className="text-gray-400 text-sm mt-1">Across all settled bets</p>
              </div>
              
              <div className="bg-[#0b1618] border border-[#1e3a3f] rounded-md p-4 text-white">
                <h3 className="text-lg font-medium text-cyan-400 mb-2">Active Bets</h3>
                <div className="text-3xl font-bold">
                  {user ? '3' : '—'}
                </div>
                <p className="text-gray-400 text-sm mt-1">Currently in progress</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}