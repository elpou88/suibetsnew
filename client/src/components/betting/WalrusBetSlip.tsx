import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Trash2, AlertCircle, CheckCircle2, Wallet, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWalrusProtocolContext } from '@/context/WalrusProtocolContext';

interface Bet {
  id: string;
  eventId: string;
  marketId: string;
  outcomeId: string;
  eventName: string;
  marketName: string;
  outcomeName: string;
  odds: number;
  status: 'pending' | 'processing' | 'settled' | 'void';
}

interface WalrusBetSlipProps {
  bets: Bet[];
  onRemoveBet?: (betId: string) => void;
  onClearAll?: () => void;
}

export function WalrusBetSlip({ bets, onRemoveBet, onClearAll }: WalrusBetSlipProps) {
  const { toast } = useToast();
  const [betAmount, setBetAmount] = useState<number>(10);
  const [tokenType, setTokenType] = useState<'SUI' | 'SBETS'>('SUI');
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [activeTab, setActiveTab] = useState('single');
  
  const { currentWallet, placeBet } = useWalrusProtocolContext();
  
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setBetAmount(value);
    }
  };
  
  const calculateTotalOdds = () => {
    if (bets.length === 0) return 0;
    return bets.reduce((acc, bet) => acc * bet.odds, 1);
  };
  
  const calculatePotentialWinnings = () => {
    if (bets.length === 0) return 0;
    
    // For single bets, just use the first bet's odds
    if (activeTab === 'single') {
      return (betAmount * bets[0].odds).toFixed(2);
    }
    
    // For parlay, multiply all odds together
    return (betAmount * calculateTotalOdds()).toFixed(2);
  };
  
  const handlePlaceBet = async () => {
    if (!currentWallet?.address) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to place a bet.',
        variant: 'destructive',
      });
      // Trigger wallet connect event instead of navigating away
      const event = new CustomEvent('suibets:connect-wallet-required');
      window.dispatchEvent(event);
      return;
    }
    
    if (betAmount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid bet amount.',
        variant: 'destructive',
      });
      return;
    }
    
    if (bets.length === 0) {
      toast({
        title: 'No Selections',
        description: 'Please add selections to your bet slip.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsPlacingBet(true);
    
    try {
      // For now, we just place the first bet (single bet mode)
      // In a full implementation, we would handle parlays differently
      const bet = bets[0];
      
      await placeBet({
        walletAddress: currentWallet.address,
        eventId: bet.eventId,
        marketId: bet.marketId,
        outcomeId: bet.outcomeId,
        amount: betAmount,
        tokenType: tokenType
      });
      
      // Clear the bet slip after successful placement
      if (onClearAll) {
        onClearAll();
      }
      
      toast({
        title: 'Bet Placed Successfully',
        description: `Your bet of ${betAmount} ${tokenType} has been placed.`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error placing bet:', error);
      toast({
        title: 'Bet Failed',
        description: 'There was an error placing your bet. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsPlacingBet(false);
    }
  };
  
  if (bets.length === 0) {
    return (
      <Card className="w-full bg-[#112225] border-[#1e3a3f] text-white">
        <CardHeader>
          <CardTitle className="text-white">Bet Slip</CardTitle>
          <CardDescription className="text-gray-400">Your selections will appear here</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-500 mb-4" />
          <p className="text-gray-400 text-center">
            No selections yet. Click on odds to add them to your bet slip.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Single bet mode only shows first bet
  const displayBets = activeTab === 'single' ? [bets[0]] : bets;
  
  return (
    <Card className="w-full bg-[#112225] border-[#1e3a3f] text-white">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-white">Bet Slip</CardTitle>
          <Badge variant="outline" className="bg-[#1e3a3f] text-[#00ffff] border-none">
            {bets.length} {bets.length === 1 ? 'Selection' : 'Selections'}
          </Badge>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[#0b1618]">
            <TabsTrigger 
              value="single" 
              disabled={bets.length === 0}
              className="data-[state=active]:bg-[#1e3a3f] data-[state=active]:text-[#00ffff]"
            >
              Single
            </TabsTrigger>
            <TabsTrigger 
              value="parlay" 
              disabled={bets.length < 2}
              className="data-[state=active]:bg-[#1e3a3f] data-[state=active]:text-[#00ffff]"
            >
              Parlay
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      
      <CardContent className="pt-4">
        <TabsContent value="single" className="m-0">
          {displayBets.map((bet) => (
            <div key={bet.id} className="mb-3 p-3 bg-[#0b1618] rounded-md">
              <div className="flex justify-between items-start mb-1.5">
                <div className="flex-1">
                  <p className="font-medium text-sm text-white">{bet.eventName}</p>
                  <p className="text-xs text-gray-400">{bet.marketName}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-400 hover:text-white hover:bg-[#1e3a3f]"
                  onClick={() => onRemoveBet && onRemoveBet(bet.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#00ffff]">{bet.outcomeName}</span>
                <Badge className="bg-[#1e3a3f] text-[#00ffff] border-none">
                  {bet.odds.toFixed(2)}
                </Badge>
              </div>
            </div>
          ))}
        </TabsContent>
        
        <TabsContent value="parlay" className="m-0">
          {displayBets.map((bet) => (
            <div key={bet.id} className="mb-3 p-3 bg-[#0b1618] rounded-md">
              <div className="flex justify-between items-start mb-1.5">
                <div className="flex-1">
                  <p className="font-medium text-sm text-white">{bet.eventName}</p>
                  <p className="text-xs text-gray-400">{bet.marketName}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-400 hover:text-white hover:bg-[#1e3a3f]"
                  onClick={() => onRemoveBet && onRemoveBet(bet.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#00ffff]">{bet.outcomeName}</span>
                <Badge className="bg-[#1e3a3f] text-[#00ffff] border-none">
                  {bet.odds.toFixed(2)}
                </Badge>
              </div>
            </div>
          ))}
          
          <div className="mt-4 p-3 bg-[#1e3a3f] rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-sm text-white">Total Odds:</span>
              <Badge className="bg-[#0b1618] text-[#00ffff] border-none">
                {calculateTotalOdds().toFixed(2)}
              </Badge>
            </div>
          </div>
        </TabsContent>
        
        <Separator className="my-4 bg-[#1e3a3f]" />
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="bet-amount" className="text-sm text-gray-300">Bet Amount</label>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`h-6 px-2 text-xs ${tokenType === 'SUI' ? 'bg-[#1e3a3f] text-[#00ffff]' : 'bg-transparent text-gray-300'} border-[#1e3a3f]`}
                  onClick={() => setTokenType('SUI')}
                >
                  SUI
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`h-6 px-2 text-xs ${tokenType === 'SBETS' ? 'bg-[#1e3a3f] text-[#00ffff]' : 'bg-transparent text-gray-300'} border-[#1e3a3f]`}
                  onClick={() => setTokenType('SBETS')}
                >
                  SBETS
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                id="bet-amount"
                type="number"
                min="1"
                value={betAmount}
                onChange={handleAmountChange}
                className="bg-[#0b1618] border-[#1e3a3f] text-white"
              />
              <div className="flex gap-1">
                {[10, 50, 100, 500].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    className="h-full px-2 py-0 text-xs bg-[#0b1618] border-[#1e3a3f] text-gray-300 hover:bg-[#1e3a3f] hover:text-[#00ffff]"
                    onClick={() => setBetAmount(amount)}
                  >
                    {amount}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-[#0b1618] rounded-md">
            <span className="text-sm text-gray-300">Potential Winnings:</span>
            <span className="font-medium text-[#00ffff]">{calculatePotentialWinnings()} {tokenType}</span>
          </div>
          
          {!currentWallet?.address && (
            <div className="flex items-center p-3 bg-[#1e3a3f] rounded-md text-yellow-300">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <p className="text-xs">
                You need to connect your wallet to place bets. 
                <Button
                  variant="link"
                  className="h-auto p-0 ml-1 text-xs text-[#00ffff]"
                  onClick={() => {
                    const event = new CustomEvent('suibets:connect-wallet-required');
                    window.dispatchEvent(event);
                  }}
                >
                  Connect now
                </Button>
              </p>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col gap-2">
        <Button
          className="w-full bg-[#00ffff] text-[#112225] hover:bg-cyan-300 relative"
          disabled={isPlacingBet || !currentWallet?.address}
          onClick={handlePlaceBet}
        >
          {isPlacingBet ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Place Bet
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          className="w-full border-[#1e3a3f] text-gray-400 hover:bg-[#1e3a3f] hover:text-white"
          onClick={() => onClearAll && onClearAll()}
        >
          Clear All
        </Button>
      </CardFooter>
    </Card>
  );
}