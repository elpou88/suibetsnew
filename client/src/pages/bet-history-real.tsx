import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";

import Layout from "@/components/layout/Layout";
import { Loader } from "@/components/ui/loader";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface Bet {
  id: number;
  userId: number;
  eventId: number;
  eventName: string;
  sportId: number;
  sportName: string;
  marketName: string;
  odds: number;
  betAmount: number;
  potentialPayout: number;
  prediction: string;
  status: 'pending' | 'won' | 'lost' | 'cashed_out' | 'cancelled' | 'void';
  createdAt: string;
  currency: string;
  isSuiBet: boolean;
  txHash?: string;
  wurlusBetId?: string;
}

type BetStatus = 'all' | 'pending' | 'settled';

export default function BetHistoryReal() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<BetStatus>("all");
  const [activeTab, setActiveTab] = useState<"bets" | "parlays">("bets");

  // Fetch user bet history using wallet address
  const walletAddress = user?.walletAddress || user?.id;
  
  const { data: bets, isLoading } = useQuery<Bet[]>({
    queryKey: [`/api/bets?wallet=${walletAddress}`, walletAddress],
    enabled: !!walletAddress,
  });

  // Filter bets based on search term and status
  const filteredBets = bets?.filter((bet) => {
    const matchesSearch = 
      searchTerm === "" || 
      bet.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bet.sportName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bet.prediction.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "pending" && bet.status === "pending") ||
      (statusFilter === "settled" && ['won', 'lost', 'cashed_out', 'cancelled', 'void'].includes(bet.status));
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won': return 'bg-green-600 text-white';
      case 'lost': return 'bg-red-600 text-white';
      case 'pending': return 'bg-yellow-600 text-white';
      case 'cashed_out': return 'bg-blue-600 text-white';
      case 'cancelled': return 'bg-gray-600 text-white';
      case 'void': return 'bg-gray-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const formatOdds = (odds: number) => {
    // American odds format
    if (odds >= 2.0) {
      return `+${Math.round((odds - 1) * 100)}`;
    } else {
      return `${Math.round(-100 / (odds - 1))}`;
    }
  };

  if (isLoading) {
    return (
      <Layout title="Bet History">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="BET HISTORY">
      <div className="space-y-4">
        <Tabs defaultValue="bets" className="w-full" onValueChange={(value) => setActiveTab(value as "bets" | "parlays")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bets">Single Bets</TabsTrigger>
            <TabsTrigger value="parlays">Parlays</TabsTrigger>
          </TabsList>

          <TabsContent value="bets" className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row gap-2 justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search Bet"
                  className="pl-8 bg-gray-800 border-gray-700"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as BetStatus)}
              >
                <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Bets</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="settled">Settled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredBets && filteredBets.length > 0 ? (
              <div className="space-y-3">
                {filteredBets.map((bet) => (
                  <div key={bet.id} className="neon-card overflow-hidden slide-down">
                    <div className="p-4 border-b border-blue-500/30">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-cyan-400">{bet.eventName}</h3>
                          <p className="text-sm text-blue-300">{bet.marketName}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                          bet.status === 'won' ? 'bg-green-500/30 text-green-300' :
                          bet.status === 'lost' ? 'bg-red-500/30 text-red-300' :
                          bet.status === 'pending' ? 'bg-yellow-500/30 text-yellow-300' :
                          'bg-blue-500/30 text-blue-300'
                        }`}>
                          {bet.status.charAt(0).toUpperCase() + bet.status.slice(1).replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                      <div className="p-4 flex flex-col gap-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-300">Prediction</span>
                          <span className="text-cyan-400 font-bold">{bet.prediction}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-300">Odds</span>
                          <span className="odds-value text-base">{formatOdds(bet.odds)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-300">Stake</span>
                          <span className="text-white font-bold">{bet.betAmount} {bet.currency}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-300">Potential Payout</span>
                          <span className="odds-value text-base">{bet.potentialPayout.toFixed(2)} {bet.currency}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Placed</span>
                          <span>{format(new Date(bet.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                        </div>
                        {bet.txHash && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Transaction</span>
                            <a 
                              href={`https://explorer.sui.io/txblock/${bet.txHash}?network=testnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline"
                            >
                              View on Explorer
                            </a>
                          </div>
                        )}
                      </div>
                      {bet.status === 'pending' && (
                        <div className="p-4 border-t border-blue-500/30">
                          <button className="neon-btn w-full">💸 Cash Out Now</button>
                        </div>
                      )}
                    </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="rounded-full bg-gray-800 p-3 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium">No history Available</h3>
                <p className="text-sm text-gray-400 mt-1">Place your first bet to see it here</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="parlays" className="space-y-4 mt-4">
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="rounded-full bg-gray-800 p-3 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h3 className="text-lg font-medium">No Parlays Available</h3>
              <p className="text-sm text-gray-400 mt-1">Create your first parlay to see it here</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}