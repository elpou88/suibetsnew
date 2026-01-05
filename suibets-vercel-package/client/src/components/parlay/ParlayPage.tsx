import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useBlockchainAuth } from '@/hooks/useBlockchainAuth';
import { useBetting } from '@/context/BettingContext';
import { Loader2, ArrowLeft, Trash2, Trophy, Plus, AlertTriangle, Check, X, Info, ChevronsRight, DollarSign } from 'lucide-react';
import { Link } from 'wouter';

// Types for parlay bets
interface ParlayBet {
  id: string;
  selections: ParlaySelection[];
  stake: number;
  totalOdds: number;
  potentialWinnings: number;
  status: 'pending' | 'won' | 'lost' | 'partial';
  createdAt: Date;
  token: 'SUI' | 'SBETS';
}

interface ParlaySelection {
  id: string;
  eventId: string;
  eventName: string;
  market: string;
  selection: string;
  odds: number;
  status: 'pending' | 'won' | 'lost' | 'void';
  startTime: Date;
}

export function ParlayPage() {
  const { toast } = useToast();
  const { user } = useBlockchainAuth();
  const { selectedBets } = useBetting();
  const [parlayBets, setParlayBets] = useState<ParlayBet[]>([]);
  const [newParlayStake, setNewParlayStake] = useState('10');
  const [selectedToken, setSelectedToken] = useState<'SUI' | 'SBETS'>('SUI');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPlaceBetDialog, setShowPlaceBetDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [activeParlayId, setActiveParlayId] = useState<string | null>(null);
  
  // Calculate potential winnings based on stake and total odds
  const calculatePotentialWinnings = (stake: number, totalOdds: number) => {
    return stake * totalOdds;
  };
  
  // Calculate total odds for a parlay
  const calculateTotalOdds = (selections: ParlaySelection[]) => {
    if (selections.length === 0) return 1;
    return selections.reduce((total, selection) => total * selection.odds, 1);
  };
  
  // Load parlay bets from storage (mock)
  useEffect(() => {
    if (user?.authenticated) {
      // In a real app, this would fetch from the blockchain
      const storedBets = localStorage.getItem('parlayBets');
      if (storedBets) {
        try {
          const parsedBets = JSON.parse(storedBets);
          // Convert date strings back to Date objects
          const formattedBets = parsedBets.map((bet: any) => ({
            ...bet,
            createdAt: new Date(bet.createdAt),
            selections: bet.selections.map((selection: any) => ({
              ...selection,
              startTime: new Date(selection.startTime)
            }))
          }));
          setParlayBets(formattedBets);
        } catch (error) {
          console.error('Error parsing stored parlay bets:', error);
        }
      }
    }
  }, [user]);
  
  // Save parlay bets to storage whenever they change
  useEffect(() => {
    if (parlayBets.length > 0) {
      localStorage.setItem('parlayBets', JSON.stringify(parlayBets));
    }
  }, [parlayBets]);
  
  // Convert selected bets to parlay selections
  const getSelectionsFromBets = () => {
    return selectedBets.map(bet => ({
      id: bet.id,
      eventId: bet.eventId,
      eventName: bet.eventName,
      market: bet.market,
      selection: bet.selectionName,
      odds: bet.odds,
      status: 'pending' as const,
      startTime: new Date(Date.now() + Math.random() * 86400000) // Random time in next 24h for demo
    }));
  };
  
  // Calculate total odds for current selections
  const currentSelections = getSelectionsFromBets();
  const currentTotalOdds = calculateTotalOdds(currentSelections);
  const currentPotentialWinnings = calculatePotentialWinnings(
    parseFloat(newParlayStake) || 0,
    currentTotalOdds
  );
  
  // Handle placing a new parlay bet
  const handlePlaceParlay = async () => {
    if (!user?.authenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please connect your wallet to place bets.',
        variant: 'destructive'
      });
      return;
    }
    
    if (currentSelections.length < 2) {
      toast({
        title: 'Not Enough Selections',
        description: 'A parlay requires at least 2 selections.',
        variant: 'destructive'
      });
      return;
    }
    
    const stakeAmount = parseFloat(newParlayStake);
    
    if (isNaN(stakeAmount) || stakeAmount <= 0) {
      toast({
        title: 'Invalid Stake',
        description: 'Please enter a valid stake amount.',
        variant: 'destructive'
      });
      return;
    }
    
    // Check user balance
    if (selectedToken === 'SUI' && user?.suiBalance && stakeAmount > user.suiBalance) {
      toast({
        title: 'Insufficient Balance',
        description: `You don't have enough SUI tokens. Current balance: ${user.suiBalance.toFixed(2)} SUI`,
        variant: 'destructive'
      });
      return;
    }
    
    if (selectedToken === 'SBETS' && user?.sbetsBalance && stakeAmount > user.sbetsBalance) {
      toast({
        title: 'Insufficient Balance',
        description: `You don't have enough SBETS tokens. Current balance: ${user.sbetsBalance.toFixed(2)} SBETS`,
        variant: 'destructive'
      });
      return;
    }
    
    setShowPlaceBetDialog(true);
  };
  
  // Confirm and submit parlay bet
  const confirmParlayBet = async () => {
    setIsSubmitting(true);
    
    try {
      // Simulate blockchain transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newParlayBet: ParlayBet = {
        id: `parlay-${Date.now()}`,
        selections: currentSelections,
        stake: parseFloat(newParlayStake),
        totalOdds: currentTotalOdds,
        potentialWinnings: currentPotentialWinnings,
        status: 'pending',
        createdAt: new Date(),
        token: selectedToken
      };
      
      setParlayBets(prev => [newParlayBet, ...prev]);
      
      // Show success dialog
      setShowPlaceBetDialog(false);
      setShowSuccessDialog(true);
      
      // Clear bet slip after successful bet
      // In a real app, you would dispatch an action to clear the bet slip
      console.log('Parlay bet placed successfully!');
      
    } catch (error) {
      console.error('Error placing parlay bet:', error);
      toast({
        title: 'Bet Placement Failed',
        description: 'There was an error processing your bet. Please try again.',
        variant: 'destructive'
      });
      setShowPlaceBetDialog(false);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Toggle showing details for a parlay
  const toggleParlayDetails = (parlayId: string) => {
    if (activeParlayId === parlayId) {
      setActiveParlayId(null);
    } else {
      setActiveParlayId(parlayId);
    }
  };
  
  // Format date string
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won': return 'bg-green-500/20 text-green-500 border border-green-500/50';
      case 'lost': return 'bg-red-500/20 text-red-500 border border-red-500/50';
      case 'partial': return 'bg-amber-500/20 text-amber-500 border border-amber-500/50';
      default: return 'bg-blue-500/20 text-blue-500 border border-blue-500/50';
    }
  };
  
  // Get selection status icon
  const getSelectionStatusIcon = (status: string) => {
    switch (status) {
      case 'won': return <Check className="h-4 w-4 text-green-500" />;
      case 'lost': return <X className="h-4 w-4 text-red-500" />;
      case 'void': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };
  
  return (
    <div className="container max-w-6xl mx-auto p-4">
      <div className="mb-6 flex items-center">
        <Button 
          variant="outline" 
          size="icon" 
          className="mr-2 bg-[#0b1618] border-[#1e3a3f] hover:bg-[#1e3a3f] text-[#00ffff]"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-white">Parlay Builder</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left column - Bet Builder */}
        <div className="md:col-span-7">
          <Card className="bg-[#112225] border-[#1e3a3f] text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="h-5 w-5 text-[#00ffff] mr-2" />
                Create Parlay
              </CardTitle>
              <CardDescription className="text-gray-400">
                Combine multiple selections for bigger potential winnings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentSelections.length === 0 ? (
                <div className="text-center p-6 border border-dashed border-[#1e3a3f] rounded-lg bg-[#0b1618]">
                  <Trophy className="h-12 w-12 text-[#1e3a3f] mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-white mb-2">No Selections Yet</h3>
                  <p className="text-gray-400 mb-4">
                    Add selections from the sportsbook to build your parlay bet.
                  </p>
                  <Button 
                    className="bg-[#00ffff] hover:bg-cyan-300 text-[#112225]"
                    onClick={() => window.location.href = "/"}
                  >
                    Browse Sports
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selections */}
                  <div className="space-y-2">
                    {currentSelections.map((selection, index) => (
                      <div key={selection.id} className="flex items-center justify-between p-3 bg-[#0b1618] rounded-lg border border-[#1e3a3f]">
                        <div>
                          <p className="text-sm font-medium text-white">{selection.selection}</p>
                          <p className="text-xs text-gray-400">
                            {selection.eventName} • {selection.market}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <Badge variant="outline" className="mr-2 bg-[#1e3a3f] text-[#00ffff] border-[#1e3a3f]">
                            {selection.odds.toFixed(2)}
                          </Badge>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-500/10"
                            onClick={() => {
                              // In a real app, you would dispatch an action to remove the bet
                              toast({
                                title: 'Selection Removed',
                                description: `${selection.selection} has been removed from your parlay.`
                              });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Betting Form */}
                  <div className="p-4 bg-[#0b1618] rounded-lg border border-[#1e3a3f]">
                    <div className="flex flex-col space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-200 block mb-1">
                          Stake Amount
                        </label>
                        <div className="flex space-x-2">
                          <Input
                            type="number"
                            value={newParlayStake}
                            onChange={(e) => setNewParlayStake(e.target.value)}
                            className="bg-[#112225] border-[#1e3a3f] text-white"
                          />
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant={selectedToken === 'SUI' ? 'default' : 'outline'}
                              className={selectedToken === 'SUI' ? 
                                'bg-[#00ffff] hover:bg-cyan-300 text-[#112225]' : 
                                'bg-[#1e3a3f] hover:bg-[#254249] text-[#00ffff] border-[#1e3a3f]'
                              }
                              onClick={() => setSelectedToken('SUI')}
                            >
                              SUI
                            </Button>
                            <Button
                              size="sm"
                              variant={selectedToken === 'SBETS' ? 'default' : 'outline'}
                              className={selectedToken === 'SBETS' ? 
                                'bg-[#00ffff] hover:bg-cyan-300 text-[#112225]' : 
                                'bg-[#1e3a3f] hover:bg-[#254249] text-[#00ffff] border-[#1e3a3f]'
                              }
                              onClick={() => setSelectedToken('SBETS')}
                            >
                              SBETS
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Total Odds:</span>
                        <Badge className="bg-[#1e3a3f] text-[#00ffff] border-none">
                          {currentTotalOdds.toFixed(2)}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Potential Win:</span>
                        <span className="text-green-500 font-semibold">
                          {currentPotentialWinnings.toFixed(2)} {selectedToken}
                        </span>
                      </div>
                      
                      <Button
                        onClick={handlePlaceParlay}
                        disabled={currentSelections.length < 2 || parseFloat(newParlayStake) <= 0}
                        className="mt-2 bg-[#00ffff] hover:bg-cyan-300 text-[#112225]"
                      >
                        Place Parlay Bet
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Right column - Parlay History */}
        <div className="md:col-span-5">
          <Card className="bg-[#112225] border-[#1e3a3f] text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 text-[#00ffff] mr-2" />
                Your Parlays
              </CardTitle>
              <CardDescription className="text-gray-400">
                Track your parlay bets and winnings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!user?.authenticated ? (
                <div className="text-center p-4 border border-dashed border-[#1e3a3f] rounded-lg bg-[#0b1618]">
                  <h3 className="text-lg font-medium text-white mb-2">Connect Your Wallet</h3>
                  <p className="text-gray-400 mb-4">
                    Please connect your wallet to view your parlay history.
                  </p>
                  <Button 
                    className="bg-[#00ffff] hover:bg-cyan-300 text-[#112225]"
                    onClick={() => {
                      // Dispatch an event to trigger the wallet modal
                      const event = new CustomEvent('suibets:connect-wallet-required');
                      window.dispatchEvent(event);
                    }}
                  >
                    Connect Wallet
                  </Button>
                </div>
              ) : parlayBets.length === 0 ? (
                <div className="text-center p-4 border border-dashed border-[#1e3a3f] rounded-lg bg-[#0b1618]">
                  <h3 className="text-lg font-medium text-white mb-2">No Parlay Bets Yet</h3>
                  <p className="text-gray-400 mb-4">
                    Create your first parlay bet to see it here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {parlayBets.map((parlay) => (
                    <div key={parlay.id} className="border border-[#1e3a3f] rounded-lg overflow-hidden">
                      {/* Parlay Header */}
                      <div 
                        className="bg-[#0b1618] p-3 cursor-pointer"
                        onClick={() => toggleParlayDetails(parlay.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-white mr-2">
                                {parlay.selections.length} Leg Parlay
                              </span>
                              <Badge 
                                className={`text-xs ${getStatusColor(parlay.status)}`}
                              >
                                {parlay.status.charAt(0).toUpperCase() + parlay.status.slice(1)}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-400">
                              {formatDate(parlay.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-white">
                              {parlay.stake.toFixed(2)} {parlay.token}
                            </p>
                            <p className={`text-xs ${parlay.status === 'won' ? 'text-green-500' : 'text-gray-400'}`}>
                              {parlay.potentialWinnings.toFixed(2)} {parlay.token}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Parlay Selections */}
                      {activeParlayId === parlay.id && (
                        <div className="p-3 bg-[#112225] border-t border-[#1e3a3f]">
                          <div className="space-y-2">
                            {parlay.selections.map((selection) => (
                              <div key={selection.id} className="flex items-start p-2 bg-[#0b1618] rounded">
                                <div className="mt-0.5 mr-2">
                                  {getSelectionStatusIcon(selection.status)}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-white">{selection.selection}</p>
                                  <p className="text-xs text-gray-400">
                                    {selection.eventName} • {selection.market}
                                  </p>
                                </div>
                                <Badge variant="outline" className="bg-[#1e3a3f] text-[#00ffff] border-[#1e3a3f]">
                                  {selection.odds.toFixed(2)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                          
                          <Separator className="my-3 bg-[#1e3a3f]" />
                          
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Total Odds:</span>
                            <span className="text-white font-medium">{parlay.totalOdds.toFixed(2)}</span>
                          </div>
                          
                          <div className="flex justify-between text-xs mt-1">
                            <span className="text-gray-400">Stake:</span>
                            <span className="text-white font-medium">{parlay.stake.toFixed(2)} {parlay.token}</span>
                          </div>
                          
                          <div className="flex justify-between text-sm mt-2 pt-2 border-t border-[#1e3a3f]">
                            <span className="text-gray-400">Potential Win:</span>
                            <span className={`font-semibold ${parlay.status === 'won' ? 'text-green-500' : 'text-white'}`}>
                              {parlay.potentialWinnings.toFixed(2)} {parlay.token}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Confirm Bet Dialog */}
      <Dialog open={showPlaceBetDialog} onOpenChange={setShowPlaceBetDialog}>
        <DialogContent className="bg-[#112225] border-[#1e3a3f] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Confirm Parlay Bet
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Review your parlay bet before placing it
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-2">
            <div className="rounded-lg border border-[#1e3a3f] p-3 bg-[#0b1618]">
              <h4 className="text-sm font-medium text-white mb-2">Parlay Selections</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {currentSelections.map((selection) => (
                  <div key={selection.id} className="flex items-start p-2 bg-[#112225] rounded text-xs">
                    <div className="flex-1">
                      <p className="font-medium text-white">{selection.selection}</p>
                      <p className="text-gray-400">{selection.eventName}</p>
                    </div>
                    <Badge variant="outline" className="bg-[#1e3a3f] text-[#00ffff] border-[#1e3a3f] ml-2">
                      {selection.odds.toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </div>
              
              <Separator className="my-3 bg-[#1e3a3f]" />
              
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Total Odds:</span>
                <span className="text-white font-medium">{currentTotalOdds.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-xs mt-1">
                <span className="text-gray-400">Stake:</span>
                <span className="text-white font-medium">{parseFloat(newParlayStake).toFixed(2)} {selectedToken}</span>
              </div>
              
              <div className="flex justify-between text-sm mt-2 pt-2 border-t border-[#1e3a3f]">
                <span className="text-gray-400">Potential Win:</span>
                <span className="text-green-500 font-semibold">
                  {currentPotentialWinnings.toFixed(2)} {selectedToken}
                </span>
              </div>
            </div>
            
            <div className="rounded-lg border border-blue-500/30 p-3 bg-blue-500/10">
              <div className="flex items-start">
                <Info className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-400">
                  By confirming this bet, you agree to have the stake amount deducted from your wallet balance. All bets are final and cannot be canceled once placed.
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              className="border-[#1e3a3f] text-gray-400 hover:bg-[#1e3a3f]"
              onClick={() => setShowPlaceBetDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#00ffff] hover:bg-cyan-300 text-[#112225]"
              onClick={confirmParlayBet}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                'Confirm Bet'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="bg-[#112225] border-[#1e3a3f] text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-2" />
              Bet Placed Successfully
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Your parlay bet has been placed on the blockchain
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 border border-green-500/30 rounded-lg bg-green-500/10 my-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300">Bet amount:</span>
              <span className="text-white font-medium">{parseFloat(newParlayStake).toFixed(2)} {selectedToken}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Potential winnings:</span>
              <span className="text-green-500 font-semibold">{currentPotentialWinnings.toFixed(2)} {selectedToken}</span>
            </div>
          </div>
          
          <p className="text-center text-sm text-gray-400 my-2">
            Track your bet status in the "Your Parlays" section.
          </p>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline"
              className="border-[#1e3a3f] text-[#00ffff] hover:bg-[#1e3a3f] sm:flex-1"
              onClick={() => {
                setShowSuccessDialog(false);
                // In a real app, you would dispatch an action to clear the bet slip
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              New Bet
            </Button>
            <Button
              className="bg-[#00ffff] hover:bg-cyan-300 text-[#112225] sm:flex-1"
              onClick={() => {
                setShowSuccessDialog(false);
                // In a real app, you would navigate to the bet history page
              }}
            >
              View Bet Details
              <ChevronsRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}