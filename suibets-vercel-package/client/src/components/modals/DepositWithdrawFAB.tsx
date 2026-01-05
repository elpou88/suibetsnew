import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';
import { WalletTransactionModal } from './WalletTransactionModal';
import { useAuth } from '@/context/AuthContext';
import { ConnectWalletModal } from './ConnectWalletModal';

// Floating Action Button for quick deposit/withdraw access on all pages
export function DepositWithdrawFAB() {
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  
  const handleActionClick = (action: 'deposit' | 'withdraw') => {
    if (!isAuthenticated) {
      setIsWalletModalOpen(true);
      return;
    }
    
    if (action === 'deposit') {
      setIsDepositOpen(true);
    } else {
      setIsWithdrawOpen(true);
    }
  };
  
  return (
    <>
      <div className="fixed bottom-6 right-6 flex flex-col space-y-2 z-50">
        {/* Deposit button */}
        <Button 
          onClick={() => handleActionClick('deposit')}
          className="rounded-full h-14 w-14 bg-[#00ffff] hover:bg-[#00d8d8] text-black shadow-lg p-0"
        >
          <Plus className="h-6 w-6" />
          <span className="sr-only">Deposit</span>
        </Button>
        
        {/* Withdraw button */}
        <Button 
          onClick={() => handleActionClick('withdraw')}
          className="rounded-full h-14 w-14 bg-blue-500 hover:bg-blue-600 shadow-lg p-0"
        >
          <Minus className="h-6 w-6" />
          <span className="sr-only">Withdraw</span>
        </Button>
      </div>
      
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
      
      <ConnectWalletModal 
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </>
  );
}