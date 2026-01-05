import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BettingContextType, SelectedBet, PlaceBetOptions } from '@/types/index';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { calculatePotentialWinnings, calculateParlayOdds } from '@/lib/utils';

// Create betting context
const BettingContext = createContext<BettingContextType>({
  selectedBets: [],
  addBet: () => {},
  removeBet: () => {},
  clearBets: () => {},
  placeBet: async () => false,
  totalStake: 0,
  potentialWinnings: 0,
  updateStake: () => {},
});

// Custom hook to use the betting context
export const useBetting = () => useContext(BettingContext);

// Load bets from localStorage (outside component to avoid React warnings)
const loadSavedBets = (): SelectedBet[] => {
  try {
    const savedBets = localStorage.getItem('selectedBets');
    return savedBets ? JSON.parse(savedBets) : [];
  } catch (e) {
    console.error("Error loading bets from localStorage:", e);
    return [];
  }
};

// Provider for betting context
export const BettingProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  // Initialize with saved bets from localStorage
  const [selectedBets, setSelectedBets] = useState<SelectedBet[]>(loadSavedBets);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Save bets to localStorage whenever they change
  useEffect(() => {
    console.log("Saving bets to localStorage:", selectedBets);
    localStorage.setItem('selectedBets', JSON.stringify(selectedBets));
  }, [selectedBets]);

  // Add a bet to the selection - with improved handling for better user experience
  const addBet = (bet: SelectedBet) => {
    console.log("BettingContext: Adding bet to slip", bet);
    
    // Ensure we have the current state by using a callback with setSelectedBets
    setSelectedBets(prevBets => {
      // First, check if this is a duplicate bet with the same selection
      // but allow duplicates if there's a uniqueId (which is used to prevent auto-duplication)
      const isDuplicate = !bet.uniqueId && prevBets.some(
        (existing) => 
          existing.eventId === bet.eventId && 
          existing.market === bet.market && 
          existing.selectionName === bet.selectionName
      );
      
      if (isDuplicate) {
        console.log("BettingContext: Potential duplicate bet detected", bet.id);
        
        // Show a toast to inform user this bet is already in the slip
        toast({
          title: "Bet Already in Slip",
          description: `${bet.selectionName} is already in your bet slip`,
        });
        
        return prevBets; // Don't change the bet array
      }
      
      // Check if we already have this specific bet by ID (for updates)
      const existingBetIndex = prevBets.findIndex(
        (existing) => existing.id === bet.id
      );
  
      if (existingBetIndex >= 0) {
        console.log("BettingContext: Updating existing bet", existingBetIndex);
        // Replace the existing bet in a new array
        const updatedBets = [...prevBets];
        updatedBets[existingBetIndex] = bet;
        
        toast({
          title: "Bet Updated",
          description: `Updated ${bet.selectionName} in your bet slip`,
        });
        
        return updatedBets;
      } else {
        console.log("BettingContext: Adding new bet to slip", prevBets.length);
        // Add a new bet to the array
        const newBets = [...prevBets, bet];
        console.log("BettingContext: New bets array length:", newBets.length);
        
        // Always show a toast for successful bet addition
        toast({
          title: "Bet Added",
          description: `Added ${bet.selectionName} to your bet slip`,
          variant: "default",
        });
        
        return newBets;
      }
    });
    
    // Log the current bets after the state update for debugging
    setTimeout(() => {
      const updatedBets = JSON.parse(localStorage.getItem('selectedBets') || '[]');
      console.log("BettingContext: Current bets count:", updatedBets.length);
    }, 500);
  };

  // Remove a bet from the selection
  const removeBet = (id: string) => {
    setSelectedBets(selectedBets.filter((bet) => bet.id !== id));
  };

  // Clear all bets
  const clearBets = () => {
    setSelectedBets([]);
  };

  // Update stake amount for a bet
  const updateStake = (id: string, stake: number) => {
    setSelectedBets(
      selectedBets.map((bet) => (bet.id === id ? { ...bet, stake } : bet))
    );
  };

  // Place a bet (handle both single and parlay bets)
  const placeBet = async (betAmount: number, options?: PlaceBetOptions): Promise<boolean> => {
    try {
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please connect your wallet to place bets",
          variant: "destructive",
        });
        
        // Auto-show connect wallet modal when user tries to place a bet
        const connectWalletEvent = new CustomEvent('suibets:connect-wallet-required');
        window.dispatchEvent(connectWalletEvent);
        
        return false;
      }

      if (selectedBets.length === 0) {
        toast({
          title: "No bets selected",
          description: "Please select at least one bet",
          variant: "destructive",
        });
        return false;
      }

      // Default options
      const betOptions: PlaceBetOptions = {
        betType: selectedBets.length > 1 ? 'parlay' : 'single',
        currency: 'SUI',
        acceptOddsChange: true,
        ...options,
      };

      // For single bets
      if (betOptions.betType === 'single' && selectedBets.length === 1) {
        const bet = selectedBets[0];
        
        const response = await apiRequest('POST', '/api/bets', {
          userId: user.id,
          walletAddress: user.walletAddress,
          eventId: bet.eventId,
          marketId: bet.marketId,
          outcomeId: bet.outcomeId,
          odds: bet.odds,
          betAmount: bet.stake || betAmount,
          prediction: bet.selectionName,
          potentialPayout: calculatePotentialWinnings(bet.stake || betAmount, bet.odds),
          feeCurrency: betOptions.currency,
        });

        if (response.ok) {
          toast({
            title: "Bet placed successfully",
            description: `${bet.selectionName} bet placed for ${bet.stake || betAmount} ${betOptions.currency}`,
          });
          clearBets();
          return true;
        } else {
          const errorData = await response.json();
          toast({
            title: "Failed to place bet",
            description: errorData.message || "An error occurred",
            variant: "destructive",
          });
          return false;
        }
      }

      // For parlay bets
      if (betOptions.betType === 'parlay' && selectedBets.length > 1) {
        const parlayOdds = calculateParlayOdds(selectedBets);
        const potentialPayout = calculatePotentialWinnings(betAmount, parlayOdds);

        const response = await apiRequest('POST', '/api/parlays', {
          userId: user.id,
          walletAddress: user.walletAddress,
          totalOdds: parlayOdds,
          betAmount: betAmount,
          potentialPayout: potentialPayout,
          feeCurrency: betOptions.currency,
          legs: selectedBets.map(bet => ({
            eventId: bet.eventId,
            marketId: bet.marketId,
            outcomeId: bet.outcomeId,
            odds: bet.odds,
            prediction: bet.selectionName,
          })),
        });

        if (response.ok) {
          toast({
            title: "Parlay bet placed successfully",
            description: `Parlay with ${selectedBets.length} selections placed for ${betAmount} ${betOptions.currency}`,
          });
          clearBets();
          return true;
        } else {
          const errorData = await response.json();
          toast({
            title: "Failed to place parlay bet",
            description: errorData.message || "An error occurred",
            variant: "destructive",
          });
          return false;
        }
      }

      return false;
    } catch (error) {
      console.error("Error placing bet:", error);
      toast({
        title: "Error placing bet",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  // Calculate total stake and potential winnings
  const totalStake = selectedBets.reduce((sum, bet) => sum + (bet.stake || 0), 0);
  
  // Calculate potential winnings differently for parlays vs. single bets
  const potentialWinnings = selectedBets.length > 1 
    ? calculatePotentialWinnings(
        totalStake,
        calculateParlayOdds(selectedBets.map(bet => ({ odds: bet.odds })))
      )
    : selectedBets.reduce(
        (sum, bet) => sum + calculatePotentialWinnings(bet.stake || 0, bet.odds),
        0
      );

  return (
    <BettingContext.Provider
      value={{
        selectedBets,
        addBet,
        removeBet,
        clearBets,
        placeBet,
        totalStake,
        potentialWinnings,
        updateStake,
      }}
    >
      {children}
    </BettingContext.Provider>
  );
};