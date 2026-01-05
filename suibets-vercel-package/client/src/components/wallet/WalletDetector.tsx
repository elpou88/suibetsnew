import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export interface WalletDetectionResult {
  name: string;
  detected: boolean;
  available: boolean;
  logo?: string; 
}

export function WalletDetector() {
  const [wallets, setWallets] = useState<WalletDetectionResult[]>([]);
  const [detectionComplete, setDetectionComplete] = useState(false);

  useEffect(() => {
    const detectWallets = async () => {
      const results: WalletDetectionResult[] = [];
      
      // Check for Sui Wallet
      const hasSuiWallet = typeof (window as any).suiWallet !== 'undefined';
      results.push({ 
        name: 'Sui Wallet', 
        detected: hasSuiWallet,
        available: hasSuiWallet
      });
      
      // Check for Ethos Wallet
      const hasEthosWallet = typeof (window as any).ethos !== 'undefined';
      results.push({ 
        name: 'Ethos Wallet', 
        detected: hasEthosWallet,
        available: hasEthosWallet
      });
      
      // Check for Suiet Wallet
      const hasSuietWallet = typeof (window as any).suiet !== 'undefined';
      results.push({ 
        name: 'Suiet Wallet', 
        detected: hasSuietWallet,
        available: hasSuietWallet
      });
      
      // Check for Martian Wallet
      const hasMartianWallet = typeof (window as any).martian !== 'undefined';
      results.push({ 
        name: 'Martian Wallet', 
        detected: hasMartianWallet,
        available: hasMartianWallet
      });
      
      // Check for Wallet Standard support
      const hasWalletStandard = typeof (window as any).wallet !== 'undefined';
      results.push({ 
        name: 'Wallet Standard', 
        detected: hasWalletStandard,
        available: hasWalletStandard 
      });
      
      console.log('Wallet detection results:', results);
      setWallets(results);
      setDetectionComplete(true);
    };
    
    // Run detection on component mount
    detectWallets();
  }, []);
  
  const hasAnyWallet = wallets.some(w => w.detected);
  
  return (
    <div className="wallet-detector mt-4 p-3 bg-background/5 rounded-md text-sm">
      <h4 className="font-medium mb-2 flex items-center">
        {detectionComplete ? (
          hasAnyWallet ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              Wallet Extensions Detected
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-yellow-500 mr-2" />
              No Wallet Extensions Detected
            </>
          )
        ) : (
          <>
            <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-primary animate-spin mr-2" />
            Detecting wallet extensions...
          </>
        )}
      </h4>
      
      {detectionComplete && (
        <div className="grid gap-1 mt-2">
          {wallets.map(wallet => (
            <div key={wallet.name} className="flex items-center text-xs py-1">
              {wallet.detected ? (
                <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
              ) : (
                <XCircle className="h-3 w-3 text-red-500 mr-2" />
              )}
              <span className={wallet.detected ? 'text-white' : 'text-gray-500'}>
                {wallet.name}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {!hasAnyWallet && detectionComplete && (
        <div className="mt-2 text-xs text-yellow-400 bg-yellow-400/10 p-2 rounded">
          <p className="font-medium">No wallet extensions detected</p>
          <p className="mt-1">
            You need to install a Sui wallet extension like Sui Wallet, Ethos, or Suiet to connect a wallet.
          </p>
        </div>
      )}
    </div>
  );
}