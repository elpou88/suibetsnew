import React, { useState, useEffect } from 'react';
import { useWal } from './WalProvider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Loader2, CalendarDays } from 'lucide-react';
import { WalConnect } from './WalConnect';
import axios from 'axios';

interface DividendData {
  availableDividends: number;
  claimedDividends: number;
  stakingAmount: number;
  totalRewards: number;
  platformFees: number;
  lastClaimTime: string;
  stakingStartTime: string;
  stakingEndTime: string;
  isStaking: boolean;
  stakingDuration: number;
  stakingComplete: boolean;
  displayValues: {
    availableDividends: string;
    claimedDividends: string;
    stakingAmount: string;
    totalRewards: string;
    platformFees: string;
    feePercentage: string;
  };
}

interface WalDividendsProps {
  onClaimSuccess?: (amount: number) => void;
  onError?: (error: Error) => void;
}

export const WalDividends: React.FC<WalDividendsProps> = ({
  onClaimSuccess,
  onError
}) => {
  const { user } = useWal();
  const [dividends, setDividends] = useState<DividendData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load dividends data when user changes
  useEffect(() => {
    if (user) {
      loadDividends();
    } else {
      setDividends(null);
    }
  }, [user]);

  const loadDividends = async () => {
    if (!user?.walletAddress) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/wurlus/dividends/${user.walletAddress}`);
      
      if (response.data.success) {
        setDividends(response.data);
      } else {
        setError(response.data.message || 'Failed to load dividend information');
      }
    } catch (err) {
      setError((err as Error).message || 'An error occurred');
      onError?.(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimDividends = async () => {
    if (!user?.walletAddress || !dividends) return;
    
    setIsClaiming(true);
    setError(null);
    
    try {
      // This endpoint would need to be implemented on the backend
      const response = await axios.post('/api/wurlus/claim-dividends', {
        walletAddress: user.walletAddress
      });
      
      if (response.data.success) {
        // Refresh dividends data
        await loadDividends();
        
        // Notify parent component
        onClaimSuccess?.(dividends.availableDividends);
      } else {
        setError(response.data.message || 'Failed to claim dividends');
      }
    } catch (err) {
      setError((err as Error).message || 'An error occurred');
      onError?.(err as Error);
    } finally {
      setIsClaiming(false);
    }
  };

  // Calculate staking progress percentage
  const calculateStakingProgress = () => {
    if (!dividends) return 0;
    
    const start = new Date(dividends.stakingStartTime).getTime();
    const end = new Date(dividends.stakingEndTime).getTime();
    const now = Date.now();
    
    if (now >= end) return 100;
    if (now <= start) return 0;
    
    return Math.floor(((now - start) / (end - start)) * 100);
  };

  // Format time remaining in staking period
  const formatTimeRemaining = () => {
    if (!dividends) return '';
    
    const end = new Date(dividends.stakingEndTime).getTime();
    const now = Date.now();
    
    if (now >= end) return 'Staking period complete';
    
    const remainingMs = end - now;
    const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${days} days, ${hours} hours remaining`;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Dividends & Rewards</CardTitle>
        <CardDescription>
          View and claim your dividends from the Wurlus protocol
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!user ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <p className="text-center text-muted-foreground">
              Connect your wallet to view your dividends and rewards
            </p>
            <WalConnect />
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="bg-destructive/10 p-4 rounded-md text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : !dividends ? (
          <div className="text-center py-6 text-muted-foreground">
            No dividend information available
          </div>
        ) : (
          <div className="space-y-6">
            {/* Staking Information */}
            {dividends.isStaking && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Staking Progress</h3>
                <Progress value={calculateStakingProgress()} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    <span>
                      Started: {new Date(dividends.stakingStartTime).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    Ends: {new Date(dividends.stakingEndTime).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-sm text-center font-medium">
                  {formatTimeRemaining()}
                </div>
              </div>
            )}

            {/* Dividend Information */}
            <div className="bg-muted p-4 rounded-md space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Staked Amount:</span>
                <span className="text-sm font-medium">{dividends.displayValues.stakingAmount}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm">Available Dividends:</span>
                <span className="text-sm font-medium">{dividends.displayValues.availableDividends}</span>
              </div>
              
              <div className="flex justify-between text-muted-foreground">
                <span className="text-sm">Total Rewards Earned:</span>
                <span className="text-sm">{dividends.displayValues.totalRewards}</span>
              </div>
              
              <div className="flex justify-between text-muted-foreground">
                <span className="text-sm">Platform Fees ({dividends.displayValues.feePercentage}):</span>
                <span className="text-sm">-{dividends.displayValues.platformFees}</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between">
                <span className="text-sm">Already Claimed:</span>
                <span className="text-sm font-medium">{dividends.displayValues.claimedDividends}</span>
              </div>
              
              {dividends.lastClaimTime && (
                <div className="text-xs text-muted-foreground">
                  Last claimed: {new Date(dividends.lastClaimTime).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
      {dividends && dividends.availableDividends > 0 && (
        <CardFooter>
          <Button 
            className="w-full" 
            disabled={isClaiming || dividends.availableDividends <= 0}
            onClick={handleClaimDividends}
          >
            {isClaiming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Claiming...
              </>
            ) : (
              `Claim ${dividends.displayValues.availableDividends}`
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};