import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  RotateCcw, 
  ArrowDownToLine,
  TrendingUp
} from 'lucide-react';

/**
 * BetHistory component displays user's betting history and bet status
 */
export function BetHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('all');

  // Fetch user's bets
  const { data: userBets = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/bets/user', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const response = await apiRequest('GET', `/api/bets/user/${user.id}`);
      return response.json();
    },
    enabled: !!user?.id,
    refetchInterval: 60000, // Refresh every minute
  });

  // Filter bets based on active tab
  const filteredBets = userBets.filter((bet: any) => {
    if (activeTab === 'active') return bet.status === 'pending' || bet.status === 'in_progress';
    if (activeTab === 'settled') return bet.status === 'won' || bet.status === 'lost';
    return true; // 'all' tab
  });

  // Handle cash out request
  const handleCashOut = async (betId: number) => {
    try {
      const response = await apiRequest('POST', `/api/bets/${betId}/cash-out`, {
        userId: user?.id
      });
      
      if (response.ok) {
        toast({
          title: 'Cash Out Successful',
          description: 'Your bet has been cashed out successfully.',
        });
        refetch(); // Refresh bet list
      } else {
        const errorData = await response.json();
        toast({
          title: 'Cash Out Failed',
          description: errorData.message || 'Failed to cash out your bet',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while cashing out',
        variant: 'destructive',
      });
    }
  };

  // Handle withdraw winnings
  const handleWithdrawWinnings = async (betId: number) => {
    try {
      const response = await apiRequest('POST', `/api/bets/${betId}/withdraw-winnings`, {
        userId: user?.id
      });
      
      if (response.ok) {
        toast({
          title: 'Withdrawal Successful',
          description: 'Your winnings have been withdrawn to your wallet.',
        });
        refetch(); // Refresh bet list
      } else {
        const errorData = await response.json();
        toast({
          title: 'Withdrawal Failed',
          description: errorData.message || 'Failed to withdraw your winnings',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while withdrawing winnings',
        variant: 'destructive',
      });
    }
  };

  // Get status badge based on bet status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'won':
        return (
          <div className="flex items-center text-green-500">
            <CheckCircle className="w-4 h-4 mr-1" />
            <span>Won</span>
          </div>
        );
      case 'lost':
        return (
          <div className="flex items-center text-red-500">
            <AlertTriangle className="w-4 h-4 mr-1" />
            <span>Lost</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center text-yellow-500">
            <Clock className="w-4 h-4 mr-1 animate-pulse" />
            <span>Pending</span>
          </div>
        );
      case 'in_progress':
        return (
          <div className="flex items-center text-cyan-400">
            <TrendingUp className="w-4 h-4 mr-1 animate-pulse" />
            <span>In Progress</span>
          </div>
        );
      case 'cashed_out':
        return (
          <div className="flex items-center text-blue-500">
            <RotateCcw className="w-4 h-4 mr-1" />
            <span>Cashed Out</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center text-gray-500">
            <span>{status}</span>
          </div>
        );
    }
  };

  if (!user) {
    return (
      <Card className="bg-[#112225] border-[#1e3a3f] text-white">
        <CardHeader>
          <CardTitle>Bet History</CardTitle>
          <CardDescription className="text-gray-400">
            Connect your wallet to view your bet history
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Button 
            className="bg-[#00FFFF] hover:bg-[#00FFFF]/90 text-black"
            onClick={() => {
              // Trigger wallet connection modal
              const connectWalletEvent = new CustomEvent('suibets:connect-wallet-required');
              window.dispatchEvent(connectWalletEvent);
            }}
          >
            Connect Wallet
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#112225] border-[#1e3a3f] text-white">
      <CardHeader>
        <CardTitle>Your Bets</CardTitle>
        <CardDescription className="text-gray-400">
          Track and manage your betting activity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" onValueChange={setActiveTab}>
          <TabsList className="bg-[#0b1618] border border-[#1e3a3f] w-full grid grid-cols-3">
            <TabsTrigger value="all" className="data-[state=active]:bg-[#00FFFF] data-[state=active]:text-black">
              All Bets
            </TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-[#00FFFF] data-[state=active]:text-black">
              Active
            </TabsTrigger>
            <TabsTrigger value="settled" className="data-[state=active]:bg-[#00FFFF] data-[state=active]:text-black">
              Settled
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin w-8 h-8 border-4 border-[#00FFFF] border-t-transparent rounded-full"></div>
            </div>
          ) : filteredBets.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No bets found in this category
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {filteredBets.map((bet: any) => (
                <Card key={bet.id} className="bg-[#0b1618] border-[#1e3a3f]">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{bet.eventName}</CardTitle>
                        <CardDescription className="text-cyan-400/80">
                          {bet.prediction} @ {bet.odds.toFixed(2)}
                        </CardDescription>
                      </div>
                      {getStatusBadge(bet.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-gray-400">Stake:</div>
                      <div className="text-right">{bet.betAmount} {bet.currency || 'SUI'}</div>
                      
                      <div className="text-gray-400">Potential Win:</div>
                      <div className="text-right">{bet.potentialPayout.toFixed(2)} {bet.currency || 'SUI'}</div>
                      
                      <div className="text-gray-400">Placed:</div>
                      <div className="text-right">
                        {bet.createdAt && formatDistanceToNow(new Date(bet.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    {bet.status === 'pending' || bet.status === 'in_progress' ? (
                      <Button 
                        className="w-full bg-[#1e3a3f] hover:bg-[#1e3a3f]/80 text-cyan-400"
                        onClick={() => handleCashOut(bet.id)}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Cash Out - {(bet.cashOutAmount || (bet.betAmount * 0.8)).toFixed(2)} {bet.currency || 'SUI'}
                      </Button>
                    ) : bet.status === 'won' && !bet.winningsWithdrawn ? (
                      <Button 
                        className="w-full bg-[#00FFFF] hover:bg-[#00FFFF]/90 text-black"
                        onClick={() => handleWithdrawWinnings(bet.id)}
                      >
                        <ArrowDownToLine className="w-4 h-4 mr-2" />
                        Withdraw Winnings
                      </Button>
                    ) : null}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}