import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useBetting } from "@/context/BettingContext";
import { useAuth } from "@/context/AuthContext";
import { WalletTransactionModal } from "@/components/modals/WalletTransactionModal";
import { formatCurrency } from '@/lib/utils';
import { Loader2, Plus, Minus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface BetslipActionsProps {
  onBetPlaced?: () => void;
  className?: string;
  showOnlyActions?: boolean;
}

export const BetslipActions: React.FC<BetslipActionsProps> = ({ 
  onBetPlaced,
  className = "",
  showOnlyActions = false
}) => {
  const { selectedBets, placeBet, totalStake, potentialWinnings } = useBetting();
  const { user, isAuthenticated } = useAuth();
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [betCurrency, setBetCurrency] = useState<'SUI' | 'SBETS'>('SUI');
  const [paymentMethod, setPaymentMethod] = useState<'platform' | 'wallet'>('wallet');
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  
  const handlePlaceBet = async () => {
    if (!isAuthenticated || !user) {
      return;
    }
    
    setIsPlacingBet(true);
    try {
      const betType = selectedBets.length > 1 ? 'parlay' : 'single';
      const success = await placeBet(totalStake, { 
        betType, 
        currency: betCurrency,
        acceptOddsChange: true,
        paymentMethod,
      });
      
      if (success && onBetPlaced) {
        onBetPlaced();
      }
    } catch (error) {
      console.error("Error placing bet:", error);
    } finally {
      setIsPlacingBet(false);
    }
  };

  const userBalance = user?.balance?.[betCurrency] || 0;
  const hasEnoughBalance = paymentMethod === 'platform' ? userBalance >= totalStake : true;
  
  if (showOnlyActions) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {/* Payment Method Toggle */}
        <div className="flex items-center justify-between mb-2 p-2 bg-muted/30 rounded-md">
          <Label htmlFor="payment-method-switch" className="text-sm font-medium">
            {paymentMethod === 'wallet' ? '💳 Direct Wallet (On-Chain)' : '💰 Platform Balance'}
          </Label>
          <Switch 
            id="payment-method-switch" 
            checked={paymentMethod === 'platform'}
            onCheckedChange={(checked) => setPaymentMethod(checked ? 'platform' : 'wallet')}
          />
        </div>

        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="currency-switch" className="text-sm font-medium">
            {betCurrency === 'SUI' ? 'Pay with SUI' : 'Pay with SBETS'}
          </Label>
          <Switch 
            id="currency-switch" 
            checked={betCurrency === 'SBETS'}
            onCheckedChange={(checked) => setBetCurrency(checked ? 'SBETS' : 'SUI')}
          />
        </div>
        
        {paymentMethod === 'platform' && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setIsDepositOpen(true)}
              className="flex-1 hover:text-cyan-400 hover:border-cyan-400"
            >
              <Plus className="h-4 w-4 mr-1 text-cyan-400" />
              Deposit
            </Button>
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setIsWithdrawOpen(true)}
              className="flex-1"
            >
              <Minus className="h-4 w-4 mr-1" />
              Withdraw
            </Button>
          </div>
        )}

        {paymentMethod === 'platform' && (
          <div className="text-xs text-muted-foreground">
            Balance: {formatCurrency(userBalance)} {betCurrency}
          </div>
        )}
        
        <Button
          className="w-full bg-cyan-400 hover:bg-cyan-500 text-black font-medium"
          disabled={isPlacingBet || selectedBets.length === 0 || !isAuthenticated || !hasEnoughBalance}
          onClick={handlePlaceBet}
          data-testid="button-place-bet"
        >
          {isPlacingBet ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {paymentMethod === 'wallet' ? 'Signing Transaction...' : 'Placing Bet...'}
            </>
          ) : (
            `${paymentMethod === 'wallet' ? '🔗 On-Chain Bet' : 'Place Bet'} (${formatCurrency(totalStake)} ${betCurrency})`
          )}
        </Button>
        
        {!hasEnoughBalance && paymentMethod === 'platform' && (
          <div className="text-red-500 text-xs mt-1">
            Insufficient balance. You need {formatCurrency(totalStake - userBalance)} more {betCurrency}.
          </div>
        )}
        
        <WalletTransactionModal 
          isOpen={isDepositOpen}
          onClose={() => setIsDepositOpen(false)}
          transactionType="deposit"
        />
        
        <WalletTransactionModal 
          isOpen={isWithdrawOpen}
          onClose={() => setIsWithdrawOpen(false)}
          transactionType="withdraw"
        />
      </div>
    );
  }
  
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="bg-muted/50 p-3 rounded-md space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Stake:</span>
          <span className="font-medium">{formatCurrency(totalStake)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Potential Winnings:</span>
          <span className="font-medium text-cyan-400">{formatCurrency(potentialWinnings)}</span>
        </div>
        {paymentMethod === 'platform' && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Balance ({betCurrency}):</span>
            <span className="font-medium">{formatCurrency(userBalance)}</span>
          </div>
        )}
      </div>

      {/* Payment Method Toggle */}
      <div className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
        <Label htmlFor="payment-method-switch-full" className="text-sm font-medium">
          {paymentMethod === 'wallet' ? '💳 Direct Wallet (On-Chain)' : '💰 Platform Balance'}
        </Label>
        <Switch 
          id="payment-method-switch-full" 
          checked={paymentMethod === 'platform'}
          onCheckedChange={(checked) => setPaymentMethod(checked ? 'platform' : 'wallet')}
        />
      </div>
      
      <div className="flex items-center justify-between mb-2">
        <Label htmlFor="currency-switch" className="text-sm font-medium">
          {betCurrency === 'SUI' ? 'Pay with SUI' : 'Pay with SBETS'}
        </Label>
        <Switch 
          id="currency-switch" 
          checked={betCurrency === 'SBETS'}
          onCheckedChange={(checked) => setBetCurrency(checked ? 'SBETS' : 'SUI')}
        />
      </div>
      
      {paymentMethod === 'platform' && (
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsDepositOpen(true)}
            className="flex-1 hover:text-cyan-400 hover:border-cyan-400"
          >
            <Plus className="h-4 w-4 mr-1 text-cyan-400" />
            Deposit
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsWithdrawOpen(true)}
            className="flex-1"
          >
            <Minus className="h-4 w-4 mr-1" />
            Withdraw
          </Button>
        </div>
      )}
      
      <Button
        className="w-full bg-cyan-400 hover:bg-cyan-500 text-black font-medium"
        disabled={isPlacingBet || selectedBets.length === 0 || !isAuthenticated || !hasEnoughBalance}
        onClick={handlePlaceBet}
        data-testid="button-place-bet-full"
      >
        {isPlacingBet ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {paymentMethod === 'wallet' ? 'Signing Transaction...' : 'Placing Bet...'}
          </>
        ) : (
          `${paymentMethod === 'wallet' ? '🔗 On-Chain Bet' : 'Place Bet'} (${formatCurrency(totalStake)} ${betCurrency})`
        )}
      </Button>
      
      {!hasEnoughBalance && paymentMethod === 'platform' && (
        <div className="text-red-500 text-xs mt-1">
          Insufficient balance. You need {formatCurrency(totalStake - userBalance)} more {betCurrency}.
        </div>
      )}
      
      <WalletTransactionModal 
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        transactionType="deposit"
      />
      
      <WalletTransactionModal 
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        transactionType="withdraw"
      />
    </div>
  );
};