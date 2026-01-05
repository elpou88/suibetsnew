import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Minus, Wallet } from 'lucide-react';
import { useWalletAdapter } from './WalletAdapter';
import { useToast } from '@/hooks/use-toast';
import { shortenAddress } from '@/lib/utils';

/**
 * WalletCard component displays wallet balance with deposit and withdraw functionality
 */
export function WalletCard() {
  const { address, balances, isConnected, sendSui, sendSbets } = useWalletAdapter();
  const { toast } = useToast();
  const [amount, setAmount] = useState<number>(0);
  const [isDepositing, setIsDepositing] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currency, setCurrency] = useState<'SUI' | 'SBETS'>('SUI');

  // Handle deposit or withdrawal action
  const handleTransaction = async () => {
    if (!isConnected || !address) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to make transactions',
        variant: 'destructive',
      });
      return;
    }

    if (!amount || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount greater than 0',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      if (isDepositing) {
        // Deposit (add funds) functionality
        toast({
          title: 'Deposit Initiated',
          description: `Adding ${amount} ${currency} to your account...`,
        });
        
        // Simulate network delay for testing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        toast({
          title: 'Deposit Successful',
          description: `Added ${amount} ${currency} to your account`,
        });
      } else {
        // Withdrawal functionality
        if (currency === 'SUI') {
          // Check if user has enough balance
          if (balances.SUI < amount) {
            toast({
              title: 'Insufficient Balance',
              description: `You only have ${balances.SUI} SUI available`,
              variant: 'destructive',
            });
            setIsSubmitting(false);
            return;
          }
          
          // For demo, we'll use a fixed address, but in production this would be user input
          const recipient = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
          
          toast({
            title: 'Withdrawal Processing',
            description: `Sending ${amount} SUI to ${shortenAddress(recipient)}...`,
          });
          
          await sendSui(recipient, amount);
        } else {
          // Handle SBETS token withdrawal
          if (balances.SBETS < amount) {
            toast({
              title: 'Insufficient Balance',
              description: `You only have ${balances.SBETS} SBETS available`,
              variant: 'destructive',
            });
            setIsSubmitting(false);
            return;
          }
          
          const recipient = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
          
          toast({
            title: 'Withdrawal Processing',
            description: `Sending ${amount} SBETS to ${shortenAddress(recipient)}...`,
          });
          
          await sendSbets(recipient, amount);
        }
      }
    } catch (error: any) {
      toast({
        title: 'Transaction Failed',
        description: error.message || 'An error occurred during the transaction',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
      setAmount(0);
    }
  };

  return (
    <Card className="bg-[#112225] border-[#1e3a3f] w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-[#00FFFF]">
          <Wallet className="h-5 w-5" />
          <span>Your Wallet</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!address ? (
          <div className="text-center py-4">
            <p className="mb-4 text-white">Connect your wallet to manage funds</p>
            <Button 
              className="bg-[#00FFFF] hover:bg-[#00FFFF]/90 text-black"
              onClick={() => {
                // Trigger wallet connection modal via custom event
                const connectWalletEvent = new CustomEvent('suibets:connect-wallet-required');
                window.dispatchEvent(connectWalletEvent);
              }}
            >
              Connect Wallet
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-[#1e3a3f] p-4 rounded-md">
                <p className="text-gray-400 text-sm">SUI Balance</p>
                <p className="text-2xl font-semibold text-white">{balances.SUI.toFixed(2)} SUI</p>
              </div>
              <div className="bg-[#1e3a3f] p-4 rounded-md">
                <p className="text-gray-400 text-sm">SBETS Balance</p>
                <p className="text-2xl font-semibold text-white">{balances.SBETS.toFixed(2)} SBETS</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <Button 
                  variant={isDepositing ? "default" : "outline"}
                  className={isDepositing ? "bg-[#00FFFF] text-black" : "border-[#00FFFF] text-[#00FFFF]"}
                  onClick={() => setIsDepositing(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Deposit
                </Button>
                <Button 
                  variant={!isDepositing ? "default" : "outline"}
                  className={!isDepositing ? "bg-[#00FFFF] text-black" : "border-[#00FFFF] text-[#00FFFF]"}
                  onClick={() => setIsDepositing(false)}
                >
                  <Minus className="h-4 w-4 mr-2" />
                  Withdraw
                </Button>
              </div>
              
              <div className="flex justify-center space-x-4 my-3">
                <Button 
                  variant={currency === 'SUI' ? "default" : "outline"}
                  size="sm"
                  className={currency === 'SUI' ? "bg-[#00FFFF] text-black" : "border-[#00FFFF] text-[#00FFFF]"}
                  onClick={() => setCurrency('SUI')}
                >
                  SUI
                </Button>
                <Button 
                  variant={currency === 'SBETS' ? "default" : "outline"}
                  size="sm"
                  className={currency === 'SBETS' ? "bg-[#00FFFF] text-black" : "border-[#00FFFF] text-[#00FFFF]"}
                  onClick={() => setCurrency('SBETS')}
                >
                  SBETS
                </Button>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-white">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="bg-[#0b1618] border-[#1e3a3f] text-white"
                  placeholder={`Enter amount in ${currency}`}
                />
              </div>
              
              <Button 
                className="w-full bg-[#00FFFF] hover:bg-[#00FFFF]/90 text-black"
                onClick={handleTransaction}
                disabled={isSubmitting || !amount}
              >
                {isSubmitting ? 'Processing...' : isDepositing ? `Deposit ${currency}` : `Withdraw ${currency}`}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}