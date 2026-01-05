import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface WalletTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionType: 'deposit' | 'withdraw';
}

export function WalletTransactionModal({ 
  isOpen, 
  onClose,
  transactionType
}: WalletTransactionModalProps) {
  const { toast } = useToast();
  const { user, updateWalletBalance } = useAuth();
  const [selectedCurrency, setSelectedCurrency] = useState<'SUI' | 'SBETS'>('SUI');
  const [amount, setAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and decimals
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const resetForm = () => {
    setAmount('');
    setIsProcessing(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTransaction = async () => {
    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    // For withdrawals, check if user has enough balance
    if (transactionType === 'withdraw') {
      const currentBalance = user?.balance?.[selectedCurrency] || 0;
      if (numAmount > currentBalance) {
        toast({
          title: "Insufficient balance",
          description: `You don't have enough ${selectedCurrency} to withdraw`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsProcessing(true);

    try {
      // In a real implementation, this would call a blockchain transaction
      // For now, we'll simulate the API call with a timeout
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Update the balance locally
      if (user) {
        const balanceUpdate = {
          ...user.balance,
          [selectedCurrency]: transactionType === 'deposit' 
            ? (user.balance?.[selectedCurrency] || 0) + numAmount
            : (user.balance?.[selectedCurrency] || 0) - numAmount
        };
        
        await updateWalletBalance(balanceUpdate);
      }

      toast({
        title: `${transactionType === 'deposit' ? 'Deposit' : 'Withdrawal'} successful`,
        description: `${formatCurrency(numAmount)} ${selectedCurrency} has been ${transactionType === 'deposit' ? 'added to' : 'withdrawn from'} your wallet`,
      });

      handleClose();
    } catch (error) {
      console.error(`Error during ${transactionType}:`, error);
      toast({
        title: `${transactionType === 'deposit' ? 'Deposit' : 'Withdrawal'} failed`,
        description: "There was an error processing your transaction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const maxWithdraw = user?.balance?.[selectedCurrency] || 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {transactionType === 'deposit' ? 'Deposit to Wallet' : 'Withdraw from Wallet'}
          </DialogTitle>
          <DialogDescription>
            {transactionType === 'deposit' 
              ? 'Deposit funds to your wallet to place bets.' 
              : 'Withdraw funds from your wallet.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs 
          defaultValue="SUI" 
          value={selectedCurrency}
          onValueChange={(value) => setSelectedCurrency(value as 'SUI' | 'SBETS')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="SUI">SUI</TabsTrigger>
            <TabsTrigger value="SBETS">SBETS</TabsTrigger>
          </TabsList>
          <TabsContent value="SUI" className="pt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="sui-amount">Amount (SUI)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="sui-amount"
                    placeholder="0.0"
                    value={amount}
                    onChange={handleAmountChange}
                  />
                  {transactionType === 'withdraw' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setAmount(maxWithdraw.toString())}
                    >
                      Max
                    </Button>
                  )}
                </div>
                {transactionType === 'withdraw' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Available: {formatCurrency(user?.balance?.SUI || 0)} SUI
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="SBETS" className="pt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="sbets-amount">Amount (SBETS)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="sbets-amount"
                    placeholder="0.0"
                    value={amount}
                    onChange={handleAmountChange}
                  />
                  {transactionType === 'withdraw' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setAmount(maxWithdraw.toString())}
                    >
                      Max
                    </Button>
                  )}
                </div>
                {transactionType === 'withdraw' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Available: {formatCurrency(user?.balance?.SBETS || 0)} SBETS
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleTransaction} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              transactionType === 'deposit' ? 'Deposit' : 'Withdraw'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}