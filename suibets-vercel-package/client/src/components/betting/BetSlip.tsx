import { useState, useEffect, useRef } from 'react';
import { useBetting } from '@/context/BettingContext';
import { useAuth } from '@/context/AuthContext';
import { useWalletAdapter } from '@/components/wallet/WalletAdapter';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, ChevronDown, ChevronUp, Trash, CoinsIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function BetSlip() {
  const { selectedBets, removeBet, clearBets, updateStake, placeBet, totalStake, potentialWinnings } = useBetting();
  const { user } = useAuth();
  const walletAdapter = useWalletAdapter();
  const { toast } = useToast();
  const [betType, setBetType] = useState<'single' | 'parlay'>(selectedBets.length > 1 ? 'parlay' : 'single');
  const [isLoading, setIsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});
  const [betCurrency, setBetCurrency] = useState<'SUI' | 'SBETS'>('SUI');
  const [isStakeInputFocused, setIsStakeInputFocused] = useState(false);
  const stakeInputRef = useRef<HTMLInputElement>(null);
  
  // Log when bets are updated
  useEffect(() => {
    console.log("BetSlip: selectedBets updated", selectedBets);
  }, [selectedBets]);
  
  // Update bet type based on number of selected bets
  useEffect(() => {
    setBetType(selectedBets.length > 1 ? 'parlay' : 'single');
  }, [selectedBets.length]);
  
  // Toggle bet details
  const toggleDetails = (id: string) => {
    setShowDetails(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Handle stake input change
  const handleStakeChange = (id: string, stake: string) => {
    const stakeValue = parseFloat(stake);
    if (!isNaN(stakeValue) && stakeValue >= 0) {
      updateStake(id, stakeValue);
    }
  };
  
  // Focus the input when shown
  useEffect(() => {
    // For any bet that has just had its details shown, focus the input
    const openBetIds = Object.entries(showDetails)
      .filter(([_, isOpen]) => isOpen)
      .map(([id]) => id);
      
    if (openBetIds.length > 0 && betType === 'single') {
      const lastOpenedBetId = openBetIds[openBetIds.length - 1];
      const inputElement = document.querySelector(`input[data-bet-id="${lastOpenedBetId}"]`) as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
      }
    }
  }, [showDetails, betType]);
  
  // Handle place bet button click
  const handlePlaceBet = async () => {
    if (!user || !walletAdapter.isConnected) {
      toast({
        title: "Not logged in",
        description: "Please connect your wallet to place bets",
        variant: "destructive",
      });
      
      // Auto-trigger wallet connection via custom event
      const connectWalletEvent = new CustomEvent('suibets:connect-wallet-required');
      window.dispatchEvent(connectWalletEvent);
      
      return;
    }
    
    if (totalStake <= 0) {
      toast({
        title: "Invalid stake",
        description: "Please enter a valid stake amount",
        variant: "destructive",
      });
      return;
    }
    
    // Ensure all single bets have a stake amount set
    if (betType === 'single') {
      const invalidBets = selectedBets.filter(bet => !bet.stake || bet.stake <= 0);
      if (invalidBets.length > 0) {
        toast({
          title: "Invalid stake amounts",
          description: "Please enter a stake amount for all selections",
          variant: "destructive",
        });
        return;
      }
    }
    
    setIsLoading(true);
    try {
      // Create a copy of the current bet state to ensure we're using the latest values
      const currentBets = [...selectedBets];
      const currentTotal = currentBets.reduce((sum, bet) => sum + (bet.stake || 0), 0);
      
      console.log("Placing bet with type:", betType);
      console.log("Current bets:", currentBets);
      console.log("Total stake:", currentTotal);
      
      const success = await placeBet(currentTotal, {
        betType,
        currency: betCurrency,
        acceptOddsChange: true
      });
      
      if (success) {
        toast({
          title: "Bet placed successfully",
          description: `Your ${betType} bet has been placed`,
          variant: "default",
        });
        
        // Clear bets after successful placement
        clearBets();
      } else {
        toast({
          title: "Failed to place bet",
          description: "There was an error placing your bet",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error placing bet:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle bet slip expanded state
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Handle bet slip click to expand/collapse
  const handleBetSlipClick = () => {
    console.log("BetSlip clicked - toggling expanded state");
    setIsExpanded(!isExpanded);
  };
  
  // Animate highlight on initial mount or when a new bet is added
  const [isHighlighted, setIsHighlighted] = useState(false);
  
  useEffect(() => {
    if (selectedBets.length > 0) {
      setIsHighlighted(true);
      const timer = setTimeout(() => setIsHighlighted(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [selectedBets.length]);
  
  return (
    <Card 
      className={`bg-gradient-to-b from-[#0b1618] to-[#081214] border-[#1e3a3f] text-white shadow-lg ${isHighlighted ? 'shadow-[0_0_15px_rgba(0,255,255,0.7)]' : 'shadow-cyan-900/20'} relative overflow-hidden min-h-[150px] cursor-pointer transition-all duration-300 ${isExpanded ? 'scale-105' : ''} hover:border-cyan-400/30`}
      onClick={handleBetSlipClick}
    >
      {/* Cyan glow at the top */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-80"></div>
      
      {/* Side glow */}
      <div className="absolute left-0 top-10 bottom-10 w-1 bg-gradient-to-b from-cyan-400/50 to-transparent"></div>
      <div className="absolute right-0 top-10 bottom-10 w-1 bg-gradient-to-b from-cyan-400/50 to-transparent"></div>
      
      <CardHeader className="pb-2 relative z-10">
        <CardTitle className="text-xl flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-cyan-300 font-bold tracking-wide">Bet Slip</span>
            <div className={`ml-2 flex items-center text-cyan-400/80 text-xs ${isExpanded ? 'rotate-180' : ''} transition-transform duration-300`}>
              <ChevronDown className="h-3 w-3 animate-pulse" />
              <span className="ml-1">{isExpanded ? 'Hide' : 'Show'}</span>
            </div>
          </div>
          {selectedBets.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation(); // Prevent event from bubbling up
                clearBets();
              }}
              className="text-cyan-300/80 hover:text-cyan-400 p-0 h-auto hover:bg-transparent"
            >
              <Trash className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pb-2 relative z-10">
        {selectedBets.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#112225] to-[#0b1618] border border-[#1e3a3f] flex items-center justify-center">
              <CoinsIcon className="h-8 w-8 text-cyan-400/60" />
            </div>
            <p className="text-cyan-200">No bets selected</p>
            <p className="text-sm mt-2 text-cyan-300/60">Click on odds to add selections</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
            {selectedBets.map(bet => (
              <div 
                key={bet.id} 
                className="p-2 border border-[#1e3a3f] rounded-md bg-gradient-to-b from-[#14292e] to-[#112225] shadow-md shadow-cyan-900/10 relative overflow-hidden transition-all duration-200 hover:border-cyan-400/30 group"
              >
                {/* Top line accent */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400/80 to-transparent"></div>
                
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate text-cyan-200">{bet.eventName}</p>
                    <div className="flex items-center">
                      <span className="text-xs text-cyan-300/70">{bet.market}</span>
                      {bet.isLive && (
                        <span className="ml-2 px-1 text-xs bg-red-600 rounded text-white animate-pulse">LIVE</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent event from bubbling up
                      removeBet(bet.id);
                    }}
                    className="h-5 w-5 p-0 text-cyan-300/60 hover:text-cyan-400 hover:bg-transparent"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div 
                  className="flex justify-between items-center cursor-pointer group-hover:bg-[#1e3a3f]/20 p-1 rounded-sm transition-colors"
                  onClick={(e) => {
                    e.stopPropagation(); // Stop click from propagating to bet slip
                    toggleDetails(bet.id);
                  }}
                >
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-cyan-200">{bet.selectionName}</div>
                    <div className="ml-2 text-cyan-400 font-bold">{bet.odds.toFixed(2)}</div>
                  </div>
                  
                  <div className="text-cyan-400 transition-transform">
                    {showDetails[bet.id] ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>
                
                {showDetails[bet.id] && betType === 'single' && (
                  <div className="mt-2 pt-2 border-t border-[#1e3a3f]">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-cyan-200">Stake:</label>
                      <Input
                        className="h-8 w-20 bg-[#0b1618] border-[#1e3a3f] text-cyan-200 text-right focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                        value={bet.stake}
                        onChange={(e) => {
                          e.stopPropagation(); // Prevent event from bubbling up
                          handleStakeChange(bet.id, e.target.value);
                        }}
                        onFocus={(e) => {
                          e.stopPropagation(); // Prevent event from bubbling up
                          setIsStakeInputFocused(true);
                        }}
                        onBlur={(e) => {
                          e.stopPropagation(); // Prevent event from bubbling up
                          setIsStakeInputFocused(false);
                        }}
                        onClick={(e) => e.stopPropagation()} // Prevent click from toggling bet slip
                        ref={stakeInputRef}
                        data-bet-id={bet.id}
                        type="number"
                        min="0"
                        step="1"
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1 text-xs">
                      <span className="text-cyan-200">Potential win:</span>
                      <span className="text-cyan-400 font-medium bg-[#0f3942] px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">
                        {(bet.stake * bet.odds).toFixed(2)} {betCurrency}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {selectedBets.length > 0 && (
          <>
            <div className="mt-4">
              <Tabs 
                defaultValue={betType} 
                onValueChange={(value) => setBetType(value as 'single' | 'parlay')}
                className="w-full"
              >
                <TabsList className="w-full bg-[#0b1618] border border-[#1e3a3f]">
                  <TabsTrigger 
                    value="single" 
                    className="flex-1 data-[state=active]:bg-cyan-400 data-[state=active]:text-black data-[state=active]:shadow-[0_0_8px_rgba(0,255,255,0.5)]"
                  >
                    Singles
                  </TabsTrigger>
                  {selectedBets.length > 1 && (
                    <TabsTrigger 
                      value="parlay" 
                      className="flex-1 data-[state=active]:bg-cyan-400 data-[state=active]:text-black data-[state=active]:shadow-[0_0_8px_rgba(0,255,255,0.5)]"
                    >
                      Parlay
                    </TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="parlay" className="mt-2">
                  <div className="p-3 border border-[#1e3a3f] rounded-md bg-gradient-to-b from-[#14292e] to-[#112225] shadow-md shadow-cyan-900/10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400/80 to-transparent"></div>
                    
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm text-cyan-200">Total Stake:</label>
                      <Input
                        className="h-8 w-24 bg-[#0b1618] border-[#1e3a3f] text-right text-cyan-200 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                        value={totalStake}
                        onChange={(e) => {
                          e.stopPropagation(); // Prevent event from bubbling up
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value) && value >= 0) {
                            // Update all stakes proportionally
                            selectedBets.forEach(bet => {
                              updateStake(bet.id, value / selectedBets.length);
                            });
                          }
                        }}
                        onFocus={(e) => {
                          e.stopPropagation(); // Prevent event from bubbling up
                          setIsStakeInputFocused(true);
                        }}
                        onBlur={(e) => {
                          e.stopPropagation(); // Prevent event from bubbling up
                          setIsStakeInputFocused(false);
                        }}
                        onClick={(e) => e.stopPropagation()} // Prevent click from toggling bet slip
                        type="number"
                        min="0"
                        step="1"
                      />
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-cyan-200">Combined Odds:</span>
                      <span className="text-cyan-400 font-bold bg-[#0f3942] px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">
                        {selectedBets.reduce((total, bet) => total * bet.odds, 1).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            <div className="flex items-center space-x-2 mt-4 p-3 border border-[#1e3a3f] rounded-md bg-gradient-to-b from-[#14292e] to-[#112225] relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400/80 to-transparent"></div>
              
              <Select
                value={betCurrency}
                onValueChange={(value) => setBetCurrency(value as 'SUI' | 'SBETS')}
              >
                <SelectTrigger className="w-[120px] bg-[#0b1618] border-[#1e3a3f] text-cyan-200">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent className="bg-[#0b1618] border-[#1e3a3f] text-white">
                  <SelectItem value="SUI" className="hover:bg-[#1e3a3f] hover:text-cyan-200">SUI</SelectItem>
                  <SelectItem value="SBETS" className="hover:bg-[#1e3a3f] hover:text-cyan-200">SBETS</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-cyan-200">Potential Win:</span>
                  <span className="text-cyan-400 font-bold bg-[#0f3942] px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">
                    {potentialWinnings.toFixed(2)} {betCurrency}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
      
      {selectedBets.length > 0 && (
        <CardFooter className="pt-2 relative z-10">
          <Button 
            className="w-full bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-500 hover:to-cyan-600 text-black font-bold shadow-[0_0_10px_rgba(0,255,255,0.3)] hover:shadow-[0_0_15px_rgba(0,255,255,0.5)] transition-all"
            onClick={(e) => {
              e.stopPropagation(); // Prevent event from bubbling up
              handlePlaceBet();
            }}
            disabled={isLoading || totalStake <= 0}
          >
            {isLoading ? (
              <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-2"></div>
            ) : null}
            {isLoading ? 'Processing...' : `Place ${betType === 'parlay' ? 'Parlay' : 'Bets'}`}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}