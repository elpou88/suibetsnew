import React, { useState, useEffect } from 'react';
import { useWal } from './WalProvider';
import { useBetting } from '@/context/BettingContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { WalConnect } from './WalConnect';
import { formatCurrency } from '@/lib/utils';

// Types based on Wal.app documentation
export interface BetSelection {
  eventId: string;
  marketId: string;
  outcomeId: string;
  eventName: string;
  marketName: string;
  outcomeName: string;
  odds: number;
}

interface WalBetSlipProps {
  initialSelections?: BetSelection[];
  onPlaceBet?: (betId: string) => void;
  onError?: (error: Error) => void;
  onClear?: () => void;
}

export const WalBetSlip: React.FC<WalBetSlipProps> = ({
  initialSelections = [],
  onPlaceBet,
  onError,
  onClear
}) => {
  const { user, refreshUserData } = useWal();
  const { addBet } = useBetting();
  const [selections, setSelections] = useState<BetSelection[]>(initialSelections);
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [potentialWinnings, setPotentialWinnings] = useState<number>(0);
  const [betFees, setBetFees] = useState({ platformFee: 0, networkFee: 0 });
  const [selectedCurrency, setSelectedCurrency] = useState<'SUI' | 'SBETS'>('SUI');
  const paymentMethod = 'wallet' as const; // Always use direct wallet betting

  // Clear error when selections or amount changes
  useEffect(() => {
    setError(null);
  }, [selections, amount]);

  // Calculate potential winnings and fees when amount or selections change
  useEffect(() => {
    const calculatePotentialWinnings = () => {
      if (!amount || selections.length === 0) {
        setPotentialWinnings(0);
        setBetFees({ platformFee: 0, networkFee: 0 });
        return;
      }

      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        setPotentialWinnings(0);
        setBetFees({ platformFee: 0, networkFee: 0 });
        return;
      }

      // Calculate total odds (multiply all selection odds)
      const totalOdds = selections.reduce((acc, selection) => acc * selection.odds, 1);
      const winnings = amountValue * totalOdds;

      // Calculate fees based on updated documentation
      const platformFee = amountValue * 0.00; // 0% platform fee (removed)
      const networkFee = amountValue * 0.01; // 1% network fee

      setPotentialWinnings(winnings);
      setBetFees({ platformFee, networkFee });
    };

    calculatePotentialWinnings();
  }, [selections, amount]);

  const handleRemoveSelection = (outcomeId: string) => {
    setSelections(prevSelections =>
      prevSelections.filter(selection => selection.outcomeId !== outcomeId)
    );
  };

  const handleClearBetSlip = () => {
    setSelections([]);
    setAmount('');
    setPotentialWinnings(0);
    onClear?.();
  };

  const handlePlaceBet = async () => {
    if (!user) {
      setError('Please connect your wallet first');
      return;
    }

    if (selections.length === 0) {
      setError('Please add at least one selection to your bet slip');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      setError('Please enter a valid bet amount');
      return;
    }

    // Direct wallet mode - don't check balance here, on-chain transaction will fail if insufficient

    setIsSubmitting(true);
    setError(null);

    try {
      // Check if we're using the betting context
      if (selections.length === 1 && addBet) {
        // Add the bet to the betting context
        const selection = selections[0];
        addBet({
          id: `${selection.eventId}-${selection.marketId}-${selection.outcomeId}`,
          eventId: selection.eventId,
          eventName: selection.eventName,
          selectionName: selection.outcomeName,
          odds: selection.odds,
          stake: amountValue,
          market: selection.marketName,
          marketId: selection.marketId,
          outcomeId: selection.outcomeId,
          currency: selectedCurrency,
          paymentMethod: paymentMethod // 'platform' or 'wallet'
        });
        
        // Clear the bet slip after adding to context
        handleClearBetSlip();
        return;
      }
      
      // If not using context, handle direct API call for a single bet
      const selection = selections[0];

      // Send to currency-specific endpoint based on user selection
      const endpoint = selectedCurrency === 'SUI' ? '/api/bets/sui' : '/api/bets/sbets';
      
      const response = await axios.post(endpoint, {
        userId: user.id,
        walletAddress: user.walletAddress,
        eventId: selection.eventId,
        marketId: selection.marketId,
        outcomeId: selection.outcomeId,
        betAmount: amountValue, // Using betAmount to match backend expectation
        odds: selection.odds,
        feeCurrency: selectedCurrency, // Include currency for backend processing
        paymentMethod: paymentMethod // 'platform' or 'wallet' - determines if funds come from deposited balance or on-chain
      });

      if (response.data.success) {
        // Update user balance after placing the bet
        await refreshUserData();
        
        // Clear the bet slip
        handleClearBetSlip();
        
        // Notify parent component
        onPlaceBet?.(response.data.betId);
      } else {
        setError(response.data.message || 'Failed to place bet');
        onError?.(new Error(response.data.message || 'Failed to place bet'));
      }
    } catch (err) {
      setError((err as Error).message || 'An error occurred');
      onError?.(err as Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format currency for display with selected currency
  const formatBetCurrency = (value: number) => {
    return `${formatCurrency(value)} ${selectedCurrency}`;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Bet Slip
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClearBetSlip}
            disabled={selections.length === 0}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </CardTitle>
        <CardDescription>
          {selections.length === 0
            ? 'Your bet slip is empty'
            : `${selections.length} selection${selections.length !== 1 ? 's' : ''}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {selections.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            Select odds to add to your bet slip
          </div>
        ) : (
          <div className="space-y-4">
            {selections.map((selection) => (
              <div key={selection.outcomeId} className="relative bg-muted p-3 rounded-md">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => handleRemoveSelection(selection.outcomeId)}
                >
                  <X className="h-3 w-3" />
                </Button>
                
                <div className="text-sm font-medium">{selection.eventName}</div>
                <div className="text-xs text-muted-foreground">{selection.marketName}</div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm">{selection.outcomeName}</span>
                  <Badge variant="outline">{selection.odds.toFixed(2)}</Badge>
                </div>
              </div>
            ))}

            <div className="mt-4">
              <Label htmlFor="bet-amount">Bet Amount</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="bet-amount"
                  type="number"
                  step="0.001"
                  min="0.001"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              
              <div className="mt-3">
                <Label htmlFor="currency-selector">Select Currency</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Button
                    type="button"
                    variant={selectedCurrency === 'SUI' ? 'default' : 'outline'}
                    className={`flex items-center justify-center ${selectedCurrency === 'SUI' ? 'bg-primary text-primary-foreground border-2 border-primary' : 'hover:border-primary'}`}
                    onClick={() => setSelectedCurrency('SUI')}
                  >
                    <div className="flex items-center">
                      <div className="w-4 h-4 mr-2 rounded-full bg-blue-500 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-white">S</span>
                      </div>
                      <span className="font-medium">SUI</span>
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant={selectedCurrency === 'SBETS' ? 'default' : 'outline'}
                    className={`flex items-center justify-center ${selectedCurrency === 'SBETS' ? 'bg-primary text-primary-foreground border-2 border-primary' : 'hover:border-primary'}`}
                    onClick={() => setSelectedCurrency('SBETS')}
                  >
                    <div className="flex items-center">
                      <div className="w-4 h-4 mr-2 rounded-full bg-green-500 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-white">SB</span>
                      </div>
                      <span className="font-medium">SBETS</span>
                    </div>
                  </Button>
                </div>
              </div>
              
              {/* Direct Wallet Mode Indicator */}
              <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded-md">
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <span>🔗</span> Direct Wallet - Bets paid from your connected wallet
                </p>
              </div>
            </div>

            {amount && parseFloat(amount) > 0 && (
              <div className="space-y-2 mt-4">
                <div className="flex justify-between text-sm">
                  <span>Potential Winnings:</span>
                  <span className="font-medium">{formatBetCurrency(potentialWinnings)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Platform Fee (0%):</span>
                  <span>{formatBetCurrency(betFees.platformFee)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Network Fee (1%):</span>
                  <span>{formatBetCurrency(betFees.networkFee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-medium">
                  <span>Total:</span>
                  <span>{formatBetCurrency(parseFloat(amount))}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 p-2 rounded-md mt-4 flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        {user ? (
          <Button 
            className="w-full" 
            disabled={selections.length === 0 || !amount || isSubmitting || parseFloat(amount) <= 0}
            onClick={handlePlaceBet}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Placing Bet...
              </>
            ) : (
              'Place Bet'
            )}
          </Button>
        ) : (
          <WalConnect fullWidth buttonText="Connect Wallet to Place Bet" />
        )}
        
        {user && (
          <div className="text-xs text-center text-muted-foreground space-y-1">
            <div className="flex justify-between px-4">
              <span>SUI Balance:</span>
              <span className="font-medium">
                {formatCurrency(user.suiBalance !== undefined ? user.suiBalance : 0)} SUI
              </span>
            </div>
            <div className="flex justify-between px-4">
              <span>SBETS Balance:</span>
              <span className="font-medium">
                {formatCurrency(user.sbetsBalance !== undefined ? user.sbetsBalance : 0)} SBETS
              </span>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};