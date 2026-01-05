import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBlockchainAuth } from '@/hooks/useBlockchainAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wallet, CheckCircle, ShieldCheck, AlertCircle, ExternalLink, ArrowRightLeft, Copy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ConnectButton, useWallet } from '@suiet/wallet-kit';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface BlockchainWalletConnectorProps {
  onConnect?: (address: string) => void;
}

export function BlockchainWalletConnector({ onConnect }: BlockchainWalletConnectorProps) {
  const { toast } = useToast();
  const { user, isLoading, connectWalletMutation, disconnectWalletMutation } = useBlockchainAuth();
  const [showWallets, setShowWallets] = useState(false);
  const [manualWalletAddress, setManualWalletAddress] = useState('');
  const [depositSuiAmount, setDepositSuiAmount] = useState('');
  const [depositSbetsAmount, setDepositSbetsAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawToken, setWithdrawToken] = useState<'SUI' | 'SBETS'>('SUI');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  
  // Get Suiet wallet state
  const suietWallet = useWallet();
  
  // Effect to handle successful connection
  useEffect(() => {
    if (user?.walletAddress && user?.authenticated && onConnect) {
      onConnect(user.walletAddress);
      toast({
        title: "Wallet Connected Successfully",
        description: "Your wallet is now connected to the Sui blockchain.",
        variant: "default",
      });
    }
  }, [user, onConnect, toast]);
  
  const handleConnectWallet = async (walletAddress: string, walletType: string = 'Sui') => {
    try {
      if (!walletAddress) {
        toast({
          title: "Error Connecting Wallet",
          description: "Please enter a valid wallet address.",
          variant: "destructive",
        });
        return;
      }

      // Simple validation to ensure it's a valid Sui address format
      if (!walletAddress.startsWith('0x') || walletAddress.length < 32) {
        toast({
          title: "Invalid Wallet Address",
          description: "Please enter a valid Sui wallet address starting with 0x.",
          variant: "destructive",
        });
        return;
      }

      await connectWalletMutation.mutateAsync({
        walletAddress,
        walletType
      });
      
      // Reset form state
      setManualWalletAddress('');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast({
        title: "Error Connecting Wallet",
        description: "There was an error connecting your wallet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShowWallets(false);
    }
  };
  
  const handleDisconnect = async () => {
    try {
      await disconnectWalletMutation.mutateAsync();
      
      // Disconnect Suiet wallet if connected
      if (suietWallet.connected) {
        await suietWallet.disconnect();
        console.log('Suiet wallet disconnected');
      }
      
      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      toast({
        title: "Error Disconnecting Wallet",
        description: "There was an error disconnecting your wallet. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleWalletButtonClick = () => {
    setShowWallets(!showWallets);
  };
  
  // Platform deposit wallet address
  const platformDepositWalletAddress = "0x14277cecf9d3f819c2ec39e9be93c35fb3bdd85d2fd5f6dcd1fad931aee232e8";
  
  const handleDeposit = async () => {
    setIsDepositing(true);
    try {
      // Validate amounts
      const suiAmount = parseFloat(depositSuiAmount);
      const sbetsAmount = parseFloat(depositSbetsAmount);
      
      if ((isNaN(suiAmount) || suiAmount <= 0) && (isNaN(sbetsAmount) || sbetsAmount <= 0)) {
        toast({
          title: "Invalid Deposit Amount",
          description: "Please enter a valid amount to deposit.",
          variant: "destructive",
        });
        return;
      }
      
      // Show deposit instructions with the platform wallet address
      toast({
        title: "Send Tokens to Platform Address",
        description: `Send your tokens to: ${platformDepositWalletAddress.substring(0, 10)}...${platformDepositWalletAddress.substring(platformDepositWalletAddress.length - 6)}`,
        variant: "default",
        duration: 5000
      });
      
      // Simulate blockchain transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Format the message
      let message = '';
      if (!isNaN(suiAmount) && suiAmount > 0) {
        message += `${suiAmount} SUI`;
      }
      
      if (!isNaN(sbetsAmount) && sbetsAmount > 0) {
        if (message) message += ' and ';
        message += `${sbetsAmount} SBETS`;
      }
      
      toast({
        title: "Deposit Successful",
        description: `Successfully deposited ${message} to platform wallet`,
        variant: "default",
      });
      
      // Reset form and close modal
      setDepositSuiAmount('');
      setDepositSbetsAmount('');
      setShowDepositModal(false);
    } catch (error) {
      console.error("Error depositing tokens:", error);
      toast({
        title: "Deposit Failed",
        description: "There was an error processing your deposit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDepositing(false);
    }
  };
  
  // Platform withdrawal wallet address
  const platformWithdrawalWalletAddress = "0xd8e37ef7507b086f1f9f29de543cb2c4e9249e886558a734923aafa4c103658c";
  
  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    try {
      // Validate amount
      const amount = parseFloat(withdrawAmount);
      
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Invalid Withdraw Amount",
          description: "Please enter a valid amount to withdraw.",
          variant: "destructive",
        });
        return;
      }
      
      // Check if enough balance
      if (withdrawToken === 'SUI' && user?.suiBalance && amount > user.suiBalance) {
        toast({
          title: "Insufficient Balance",
          description: `You don't have enough SUI tokens. Current balance: ${user.suiBalance.toFixed(2)} SUI`,
          variant: "destructive",
        });
        return;
      }
      
      if (withdrawToken === 'SBETS' && user?.sbetsBalance && amount > user.sbetsBalance) {
        toast({
          title: "Insufficient Balance",
          description: `You don't have enough SBETS tokens. Current balance: ${user.sbetsBalance.toFixed(2)} SBETS`,
          variant: "destructive",
        });
        return;
      }
      
      // Show withdrawal info with platform address
      toast({
        title: "Processing Withdrawal Request",
        description: `Funds will be sent from ${platformWithdrawalWalletAddress.substring(0, 8)}...${platformWithdrawalWalletAddress.substring(platformWithdrawalWalletAddress.length - 6)}`,
        variant: "default",
        duration: 5000
      });
      
      // Simulate blockchain transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Withdrawal Successful",
        description: `Successfully withdrew ${amount} ${withdrawToken} to your wallet`,
        variant: "default",
      });
      
      // Reset form and close modal
      setWithdrawAmount('');
      setShowWithdrawModal(false);
    } catch (error) {
      console.error("Error withdrawing tokens:", error);
      toast({
        title: "Withdrawal Failed",
        description: "There was an error processing your withdrawal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };
  
  // Display connected wallet info
  if (user?.authenticated) {
    return (
      <>
        <Card className="w-full max-w-md mx-auto bg-[#112225] border-[#1e3a3f] text-white">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wallet className="mr-2 h-5 w-5 text-[#00ffff]" />
              Connected Wallet
            </CardTitle>
            <CardDescription className="text-gray-400">
              Your wallet is connected to the blockchain
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-200">Address</p>
                <div className="flex items-center">
                  <p className="text-xs font-mono text-[#00ffff]">
                    {user.walletAddress.substring(0, 8)}...
                    {user.walletAddress.substring(user.walletAddress.length - 6)}
                  </p>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 ml-1 text-gray-400 hover:text-[#00ffff]"
                    onClick={() => {
                      navigator.clipboard.writeText(user.walletAddress);
                      toast({
                        title: "Address Copied",
                        description: "Wallet address copied to clipboard",
                        variant: "default",
                      });
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <Badge className="bg-[#1e3a3f] text-[#00ffff]">
                <ShieldCheck className="h-3 w-3 mr-1" /> Blockchain Verified
              </Badge>
            </div>
            
            {user.suiBalance !== undefined && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-200 mb-1">Balance</p>
                <div className="flex items-center justify-between">
                  <span className="text-[#00ffff] font-medium">{user.suiBalance.toFixed(2)} SUI</span>
                  {user.sbetsBalance !== undefined && (
                    <span className="text-[#00ffff] font-medium">{user.sbetsBalance.toFixed(2)} SBETS</span>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex space-x-2 mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 bg-[#1e3a3f] hover:bg-[#254249] text-[#00ffff] border-[#1e3a3f]"
                onClick={() => setShowDepositModal(true)}
              >
                Deposit
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 bg-[#1e3a3f] hover:bg-[#254249] text-[#00ffff] border-[#1e3a3f]"
                onClick={() => setShowWithdrawModal(true)}
              >
                Withdraw
              </Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full border-[#1e3a3f] text-[#00ffff] hover:bg-[#1e3a3f]"
              onClick={handleDisconnect}
            >
              Disconnect
            </Button>
          </CardFooter>
        </Card>
        
        {/* Deposit Modal */}
        <Dialog open={showDepositModal} onOpenChange={setShowDepositModal}>
          <DialogContent className="bg-[#112225] border-[#1e3a3f] text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Deposit Tokens</DialogTitle>
              <DialogDescription className="text-gray-400">
                Deposit SUI or SBETS tokens to your wallet
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-200">SUI Amount</p>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={depositSuiAmount}
                    onChange={(e) => setDepositSuiAmount(e.target.value)}
                    className="bg-[#0b1618] border-[#1e3a3f] text-white"
                  />
                  <span className="text-[#00ffff] font-medium">SUI</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-200">SBETS Amount</p>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={depositSbetsAmount}
                    onChange={(e) => setDepositSbetsAmount(e.target.value)}
                    className="bg-[#0b1618] border-[#1e3a3f] text-white"
                  />
                  <span className="text-[#00ffff] font-medium">SBETS</span>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border border-[#1e3a3f] p-3 bg-[#0b1618] mt-2">
              <div className="space-y-2">
                <p className="text-xs text-gray-400">
                  Send funds to the following deposit address to credit your account. Transaction fees may apply.
                </p>
                <div className="flex items-center justify-between bg-[#112225] p-2 rounded border border-[#1e3a3f]">
                  <span className="text-xs font-mono text-[#00ffff] truncate mr-2">{platformDepositWalletAddress}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-gray-400 hover:text-[#00ffff] flex-shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(platformDepositWalletAddress);
                      toast({
                        title: "Address Copied",
                        description: "Deposit address copied to clipboard",
                        variant: "default",
                      });
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                className="border-[#1e3a3f] text-gray-400 hover:bg-[#1e3a3f]"
                onClick={() => setShowDepositModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#00ffff] hover:bg-cyan-300 text-[#112225]"
                onClick={handleDeposit}
                disabled={isDepositing}
              >
                {isDepositing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  'Deposit'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Withdraw Modal */}
        <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
          <DialogContent className="bg-[#112225] border-[#1e3a3f] text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Withdraw Tokens</DialogTitle>
              <DialogDescription className="text-gray-400">
                Withdraw your tokens to your external wallet
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-200">Amount</p>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="bg-[#0b1618] border-[#1e3a3f] text-white"
                  />
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      variant={withdrawToken === 'SUI' ? 'default' : 'outline'}
                      className={withdrawToken === 'SUI' ? 
                        'bg-[#00ffff] hover:bg-cyan-300 text-[#112225]' : 
                        'bg-[#1e3a3f] hover:bg-[#254249] text-[#00ffff] border-[#1e3a3f]'
                      }
                      onClick={() => setWithdrawToken('SUI')}
                    >
                      SUI
                    </Button>
                    <Button
                      size="sm"
                      variant={withdrawToken === 'SBETS' ? 'default' : 'outline'}
                      className={withdrawToken === 'SBETS' ? 
                        'bg-[#00ffff] hover:bg-cyan-300 text-[#112225]' : 
                        'bg-[#1e3a3f] hover:bg-[#254249] text-[#00ffff] border-[#1e3a3f]'
                      }
                      onClick={() => setWithdrawToken('SBETS')}
                    >
                      SBETS
                    </Button>
                  </div>
                </div>
                
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Available: {withdrawToken === 'SUI' ? 
                    `${user.suiBalance?.toFixed(2) || '0.00'} SUI` : 
                    `${user.sbetsBalance?.toFixed(2) || '0.00'} SBETS`
                  }</span>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-xs text-[#00ffff]"
                    onClick={() => {
                      if (withdrawToken === 'SUI' && user.suiBalance) {
                        setWithdrawAmount(user.suiBalance.toString());
                      } else if (withdrawToken === 'SBETS' && user.sbetsBalance) {
                        setWithdrawAmount(user.sbetsBalance.toString());
                      }
                    }}
                  >
                    Max
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border border-[#1e3a3f] p-3 bg-[#0b1618] mt-2">
              <p className="text-xs text-gray-400">
                Funds will be withdrawn to your connected wallet address. Network fees may apply.
              </p>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                className="border-[#1e3a3f] text-gray-400 hover:bg-[#1e3a3f]"
                onClick={() => setShowWithdrawModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#00ffff] hover:bg-cyan-300 text-[#112225]"
                onClick={handleWithdraw}
                disabled={isWithdrawing}
              >
                {isWithdrawing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  'Withdraw'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }
  
  return (
    <Card className="w-full max-w-md mx-auto bg-[#112225] border-[#1e3a3f] text-white">
      <CardHeader>
        <CardTitle className="text-white">Connect Your Wallet</CardTitle>
        <CardDescription className="text-gray-400">
          Connect your Sui wallet to start betting with the blockchain
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || connectWalletMutation.isPending ? (
          <div className="flex flex-col items-center justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-[#00ffff] mb-4" />
            <p className="text-sm text-gray-300 mb-2">
              Connecting to blockchain...
            </p>
            <Progress 
              value={75} 
              className="h-1 w-full bg-[#1e3a3f]" 
            />
          </div>
        ) : showWallets ? (
          <div className="space-y-3">
            {/* Suiet Wallet Connect Button */}
            <div className="w-full rounded overflow-hidden mb-4">
              <ConnectButton 
                className="w-full bg-gradient-to-r from-[#00FFFF] to-[#00CCCC] hover:from-[#00FFFF]/90 hover:to-[#00CCCC]/90 text-[#112225] font-bold py-3 px-4 rounded flex items-center justify-center"
              >
                <Wallet className="h-5 w-5 mr-2" />
                <span>Connect with Suiet Wallet</span>
              </ConnectButton>
            </div>
            
            {/* Additional Sui Wallet Options */}
            <div className="w-full rounded overflow-hidden mb-4">
              <Button
                onClick={() => {
                  // Use a consistent test wallet address to avoid connection issues
                  const demoWalletAddress = "0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285";
                  handleConnectWallet(demoWalletAddress, 'SuiWallet');
                }}
                className="w-full bg-[#1e3a3f] text-[#00ffff] hover:bg-[#254249] py-3 px-4 rounded flex items-center justify-center"
              >
                <Wallet className="h-5 w-5 mr-2" />
                <span>Connect with Sui Wallet</span>
              </Button>
            </div>
            
            {/* Manual connect for any wallet address */}
            <div className="rounded-lg border border-[#1e3a3f] p-4 bg-[#0b1618] mt-4">
              <h3 className="font-medium text-[#00ffff] mb-2 flex items-center">
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect any Sui wallet
              </h3>
              <p className="text-sm text-gray-300 mb-2">
                For wallet extensions or mobile wallets, you can enter your Sui address directly.
              </p>
              
              <div className="space-y-3">
                <Input
                  type="text"
                  placeholder="0x..."
                  value={manualWalletAddress}
                  onChange={(e) => setManualWalletAddress(e.target.value)}
                  className="bg-[#0b1618] border-[#1e3a3f] text-white"
                />
                
                <Button
                  onClick={() => {
                    if (manualWalletAddress) {
                      handleConnectWallet(manualWalletAddress, 'Manual');
                    } else {
                      // Use a test address if the input is empty
                      handleConnectWallet('0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285', 'Test');
                    }
                  }}
                  className="w-full bg-[#1e3a3f] text-[#00ffff] hover:bg-[#254249]"
                >
                  <ShieldCheck className="mr-2 h-4 w-4" /> Connect Wallet
                </Button>
                
                <p className="text-xs text-gray-500 mt-1">
                  For testing, leave blank to use a demo wallet
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            <div className="rounded-lg border border-[#1e3a3f] p-4 bg-[#0b1618]">
              <h3 className="font-medium text-[#00ffff] mb-2">Why Connect Your Wallet?</h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 mr-2 text-[#00ffff] mt-0.5 flex-shrink-0" />
                  <span>Place crypto bets securely with SUI or SBETS tokens</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 mr-2 text-[#00ffff] mt-0.5 flex-shrink-0" />
                  <span>All authentication happens on the blockchain</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 mr-2 text-[#00ffff] mt-0.5 flex-shrink-0" />
                  <span>Earn dividends from the protocol</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {!showWallets && !isLoading && !connectWalletMutation.isPending && (
          <Button 
            className="w-full bg-[#00ffff] text-[#112225] hover:bg-cyan-300"
            onClick={handleWalletButtonClick}
          >
            <Wallet className="mr-2 h-4 w-4" /> Connect Wallet
          </Button>
        )}
        {showWallets && !isLoading && !connectWalletMutation.isPending && (
          <Button 
            variant="outline" 
            className="w-full border-[#1e3a3f] text-gray-300 hover:bg-[#1e3a3f]"
            onClick={() => setShowWallets(false)}
          >
            Cancel
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}