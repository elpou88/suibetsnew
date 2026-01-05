import React, { useState } from 'react';
import { useWal } from './WalProvider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { AlertTriangle, Loader2, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { WalConnect } from './WalConnect';
import axios from 'axios';

interface WalStakingProps {
  onStakeSuccess?: (txHash: string, amount: number, periodDays: number) => void;
  onError?: (error: Error) => void;
}

export const WalStaking: React.FC<WalStakingProps> = ({
  onStakeSuccess,
  onError
}) => {
  const { user, refreshUserData } = useWal();
  const [amount, setAmount] = useState<string>('');
  const [periodDays, setPeriodDays] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [estimatedRewards, setEstimatedRewards] = useState<number>(0);
  const [stakingFee, setStakingFee] = useState<number>(0);

  // Calculate estimated rewards and fee when amount or period changes
  const calculateEstimates = (amt: string, days: number) => {
    const amountValue = parseFloat(amt);
    if (isNaN(amountValue) || amountValue <= 0) {
      setEstimatedRewards(0);
      setStakingFee(0);
      return;
    }

    // Calculate staking fee (2% based on Wal.app documentation)
    const fee = amountValue * 0.02;
    setStakingFee(fee);

    // Calculate estimated rewards
    // This is a simplified calculation for illustration
    // In a real app, this might come from an API call
    const dailyRatePercent = 0.005; // 0.5% daily (for example)
    const rewards = amountValue * (dailyRatePercent / 100) * days;
    setEstimatedRewards(rewards);
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    calculateEstimates(value, periodDays);
  };

  const handlePeriodChange = (value: number[]) => {
    const days = value[0];
    setPeriodDays(days);
    calculateEstimates(amount, days);
  };

  const handleMaxAmount = () => {
    if (user && user.balance) {
      // Set to 90% of available balance to account for fees
      const maxAmount = Math.floor(user.balance * 0.9 * 1000) / 1000;
      setAmount(maxAmount.toString());
      calculateEstimates(maxAmount.toString(), periodDays);
    }
  };

  const handleStake = async () => {
    if (!user) {
      setError('Please connect your wallet first');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      setError('Please enter a valid stake amount');
      return;
    }

    if (amountValue > (user.balance || 0)) {
      setError('Insufficient balance');
      return;
    }

    if (periodDays < 7) {
      setError('Minimum staking period is 7 days');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await axios.post('/api/wurlus/stake', {
        walletAddress: user.walletAddress,
        amount: amountValue,
        periodDays
      });

      if (response.data.success) {
        // Update user balance after staking
        await refreshUserData();
        
        // Reset form
        setAmount('');
        setPeriodDays(30);
        setEstimatedRewards(0);
        setStakingFee(0);
        
        // Notify parent component
        onStakeSuccess?.(response.data.txHash, amountValue, periodDays);
      } else {
        setError(response.data.message || 'Failed to stake tokens');
        onError?.(new Error(response.data.message || 'Failed to stake tokens'));
      }
    } catch (err) {
      setError((err as Error).message || 'An error occurred');
      onError?.(err as Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toFixed(4) + ' SUI';
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Stake SUI Tokens</CardTitle>
        <CardDescription>
          Earn rewards by staking your SUI tokens in the Wurlus protocol
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="stake-amount">Stake Amount</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="stake-amount"
                type="number"
                step="0.001"
                min="0.001"
                placeholder="0.00"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleMaxAmount}
                disabled={!user}
              >
                MAX
              </Button>
            </div>
          </div>

          <div>
            <div className="flex justify-between">
              <Label htmlFor="stake-period">Staking Period</Label>
              <span className="text-sm">{periodDays} days</span>
            </div>
            <Slider
              id="stake-period"
              defaultValue={[30]}
              max={365}
              min={7}
              step={1}
              onValueChange={handlePeriodChange}
              className="mt-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>7 days</span>
              <span>1 year</span>
            </div>
          </div>

          {amount && parseFloat(amount) > 0 && (
            <div className="space-y-2 mt-4 bg-muted p-3 rounded-md">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Estimated Rewards:
                </span>
                <span className="font-medium">+{formatCurrency(estimatedRewards)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Platform Fee (2%):</span>
                <span>-{formatCurrency(stakingFee)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-medium">
                <span>Total to Stake:</span>
                <span>{formatCurrency(parseFloat(amount))}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Note: Rewards are distributed daily and can be claimed after the staking period ends.
                Early unstaking will forfeit all rewards.
              </div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 p-2 rounded-md flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        {user ? (
          <Button 
            className="w-full" 
            disabled={!amount || isSubmitting || parseFloat(amount) <= 0}
            onClick={handleStake}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Staking...
              </>
            ) : (
              'Stake Tokens'
            )}
          </Button>
        ) : (
          <WalConnect fullWidth buttonText="Connect Wallet to Stake" />
        )}
        
        {user && (
          <div className="text-xs text-center text-muted-foreground">
            Available Balance: {formatCurrency(user.balance || 0)}
          </div>
        )}
      </CardFooter>
    </Card>
  );
};