import React, { useState, useEffect } from 'react';
import { useWal } from './WalProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { WalConnect } from './WalConnect';
import axios from 'axios';

// Types based on Wal.app documentation
interface BetHistoryItem {
  id: string;
  owner: string;
  market_id: string;
  outcome_id: string;
  amount: string;
  potential_payout: string;
  odds: number;
  status: 'pending' | 'won' | 'lost' | 'voided';
  placed_at: number;
  settled_at: number | null;
  platform_fee: string;
  network_fee: string;
  display: {
    amount: string;
    potential_payout: string;
    platform_fee: string;
    network_fee: string;
    odds: string;
    placed_at: string;
    settled_at: string | null;
    status_formatted: string;
  };
}

interface WalBetHistoryProps {
  limit?: number;
  showFilters?: boolean;
}

export const WalBetHistory: React.FC<WalBetHistoryProps> = ({
  limit = 10,
  showFilters = false,
}) => {
  const { user } = useWal();
  const [bets, setBets] = useState<BetHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadBetHistory();
    }
  }, [user]);

  const loadBetHistory = async () => {
    if (!user?.walletAddress) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/wurlus/bets/${user.walletAddress}`);
      
      if (response.data.success) {
        const betsData = response.data.bets.slice(0, limit);
        setBets(betsData);
      } else {
        setError(response.data.message || 'Failed to load bet history');
      }
    } catch (err) {
      setError((err as Error).message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'won':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'lost':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'voided':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Bet History</CardTitle>
        <CardDescription>
          Your recent betting activity on the Wurlus protocol
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!user ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <p className="text-center text-muted-foreground">
              Connect your wallet to view your bet history
            </p>
            <WalConnect />
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="bg-destructive/10 p-4 rounded-md text-destructive">
            {error}
          </div>
        ) : bets.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No betting history found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Odds</TableHead>
                <TableHead>Potential Payout</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bets.map((bet) => (
                <TableRow key={bet.id}>
                  <TableCell>
                    {formatDate(bet.display.placed_at)}
                  </TableCell>
                  <TableCell>
                    {bet.display.amount}
                  </TableCell>
                  <TableCell>
                    {bet.display.odds}
                  </TableCell>
                  <TableCell>
                    {bet.display.potential_payout}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={getStatusColor(bet.status)}
                    >
                      {bet.display.status_formatted}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};