import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

// Types for bet selections
export interface SelectedBet {
  id: string;
  eventId: string;
  eventName: string;
  marketId: string | number;
  market: string;
  selectionId: string | number;
  outcomeId?: string | number;
  selectionName: string;
  odds: number;
}

interface BettingContextType {
  selectedBets: SelectedBet[];
  addBet: (bet: SelectedBet) => void;
  removeBet: (betId: string) => void;
  clearBets: () => void;
  isBetSelected: (betId: string) => boolean;
}

const BettingContext = createContext<BettingContextType | undefined>(undefined);

export function BettingProvider({ children }: { children: ReactNode }) {
  const [selectedBets, setSelectedBets] = useState<SelectedBet[]>([]);
  const { toast } = useToast();
  
  // Load saved bets from localStorage on initial mount
  useEffect(() => {
    const savedBets = localStorage.getItem('selectedBets');
    if (savedBets) {
      try {
        setSelectedBets(JSON.parse(savedBets));
      } catch (error) {
        console.error('Error parsing saved bets:', error);
      }
    }
  }, []);
  
  // Save bets to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('selectedBets', JSON.stringify(selectedBets));
  }, [selectedBets]);
  
  // Add a bet to selection
  const addBet = (bet: SelectedBet) => {
    setSelectedBets(prev => {
      // Check if bet with same market exists in the same event
      const existingBetIndex = prev.findIndex(
        b => b.eventId === bet.eventId && b.marketId === bet.marketId
      );
      
      // If exists, replace it
      if (existingBetIndex !== -1) {
        const newBets = [...prev];
        newBets[existingBetIndex] = bet;
        
        toast({
          title: 'Selection Updated',
          description: `Changed to ${bet.selectionName}`,
          variant: 'default',
        });
        
        return newBets;
      }
      
      // Otherwise add it
      toast({
        title: 'Selection Added',
        description: `Added ${bet.selectionName} @ ${bet.odds.toFixed(2)}`,
        variant: 'default',
      });
      
      return [...prev, bet];
    });
  };
  
  // Remove a bet from selection
  const removeBet = (betId: string) => {
    setSelectedBets(prev => {
      const bet = prev.find(b => b.id === betId);
      if (bet) {
        toast({
          title: 'Selection Removed',
          description: `Removed ${bet.selectionName}`,
          variant: 'default',
        });
      }
      return prev.filter(b => b.id !== betId);
    });
  };
  
  // Clear all bets
  const clearBets = () => {
    setSelectedBets([]);
    toast({
      title: 'Bet Slip Cleared',
      description: 'All selections have been removed',
      variant: 'default',
    });
  };
  
  // Check if a bet is already selected
  const isBetSelected = (betId: string) => {
    return selectedBets.some(bet => bet.id === betId);
  };
  
  return (
    <BettingContext.Provider
      value={{
        selectedBets,
        addBet,
        removeBet,
        clearBets,
        isBetSelected,
      }}
    >
      {children}
    </BettingContext.Provider>
  );
}

export function useBetting() {
  const context = useContext(BettingContext);
  if (context === undefined) {
    throw new Error('useBetting must be used within a BettingProvider');
  }
  return context;
}