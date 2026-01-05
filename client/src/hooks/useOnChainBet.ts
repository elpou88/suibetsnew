import { useState, useCallback } from 'react';
import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { useToast } from '@/hooks/use-toast';

// Helper to convert string to SerializedBcs with proper vector<u8> type metadata
// This is required for Nightly wallet to properly parse the transaction
const stringToVectorU8 = (str: string) => {
  const bytes = Array.from(new TextEncoder().encode(str));
  return bcs.vector(bcs.u8()).serialize(bytes);
};

// Contract addresses - redeployed January 5, 2026
const BETTING_PACKAGE_ID = import.meta.env.VITE_BETTING_PACKAGE_ID || '0xfaf371c3c9fe2544cc1ce9a40b07621503b300bf3a65b8fab0dba134636e8b32';
const BETTING_PLATFORM_ID = import.meta.env.VITE_BETTING_PLATFORM_ID || '0xae1b0dfed589c6ce5b7dafdb7477954670f0f73530668b5476e3a429b64099b3';
const CLOCK_OBJECT_ID = '0x6';

// SBETS token type from mainnet
const SBETS_TOKEN_TYPE = '0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285::sbets::SBETS';

export interface OnChainBetParams {
  eventId: string;
  marketId: string;
  prediction: string;
  betAmount: number; // In SUI or SBETS (will be converted to smallest units)
  odds: number;
  walrusBlobId?: string;
  coinType: 'SUI' | 'SBETS';
  sbetsCoinObjectId?: string; // Required for SBETS bets
}

export interface OnChainBetResult {
  success: boolean;
  txDigest?: string;
  betObjectId?: string;
  coinType?: 'SUI' | 'SBETS';
  error?: string;
}

export function useOnChainBet() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const suiClient = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  // Get user's SBETS coin objects
  const getSbetsCoins = useCallback(async (walletAddress: string): Promise<{objectId: string, balance: number}[]> => {
    try {
      const coins = await suiClient.getCoins({
        owner: walletAddress,
        coinType: SBETS_TOKEN_TYPE,
      });

      return coins.data.map(coin => ({
        objectId: coin.coinObjectId,
        balance: parseInt(coin.balance) / 1_000_000_000,
      }));
    } catch (err) {
      console.error('Failed to get SBETS coins:', err);
      return [];
    }
  }, [suiClient]);

  // Get user's SUI coins for bet placement (separate from gas)
  const getSuiCoins = useCallback(async (walletAddress: string): Promise<{objectId: string, balance: number}[]> => {
    try {
      const coins = await suiClient.getCoins({
        owner: walletAddress,
        coinType: '0x2::sui::SUI',
      });

      return coins.data.map(coin => ({
        objectId: coin.coinObjectId,
        balance: parseInt(coin.balance) / 1_000_000_000,
      }));
    } catch (err) {
      console.error('Failed to get SUI coins:', err);
      return [];
    }
  }, [suiClient]);

  // Place bet on-chain (SUI or SBETS)
  const placeBetOnChain = useCallback(async (params: OnChainBetParams & { walletAddress?: string }): Promise<OnChainBetResult> => {
    console.log('[useOnChainBet] placeBetOnChain called with params:', params);
    setIsLoading(true);
    setError(null);

    try {
      const { eventId, marketId, prediction, betAmount, odds, walrusBlobId = '', coinType = 'SUI', sbetsCoinObjectId, walletAddress } = params;
      
      // On-chain bet limits (in SUI/SBETS tokens, not MIST)
      const MIN_BET = 0.02; // 20,000,000 MIST
      const MAX_BET = 15;   // 15,000,000,000 MIST
      
      // Validate bet amount against on-chain limits
      if (betAmount < MIN_BET) {
        throw new Error(`Minimum bet is ${MIN_BET} ${coinType}. You tried to bet ${betAmount} ${coinType}.`);
      }
      if (betAmount > MAX_BET) {
        throw new Error(`Maximum bet is ${MAX_BET} ${coinType}. You tried to bet ${betAmount} ${coinType}.`);
      }
      
      // Convert to smallest units (1 SUI/SBETS = 1_000_000_000)
      const betAmountMist = Math.floor(betAmount * 1_000_000_000);
      // Convert odds to basis points (e.g., 2.50 -> 250)
      const oddsBps = Math.floor(odds * 100);
      
      // Gas safety margin (0.02 SUI = 20M MIST should be enough for gas)
      const GAS_MARGIN_MIST = 20_000_000;
      const requiredMist = betAmountMist + GAS_MARGIN_MIST;
      
      console.log('[useOnChainBet] Building transaction:', {
        packageId: BETTING_PACKAGE_ID,
        platformId: BETTING_PLATFORM_ID,
        betAmountMist,
        oddsBps,
        coinType,
        requiredMist
      });

      const tx = new Transaction();
      
      // Set explicit gas budget to help wallet pre-checks
      tx.setGasBudget(20_000_000); // 0.02 SUI should be plenty for this transaction
      
      if (coinType === 'SUI') {
        // Use tx.gas for splitting - same approach as working admin panel deposit
        console.log('[useOnChainBet] Using tx.gas for coin split (same as admin deposit)');
        const [stakeCoin] = tx.splitCoins(tx.gas, [betAmountMist]);
        
        // Convert strings to SerializedBcs with vector<u8> type metadata
        // This preserves type info that Nightly wallet needs to parse the transaction
        const eventIdSerialized = stringToVectorU8(eventId);
        const marketIdSerialized = stringToVectorU8(marketId);
        const predictionSerialized = stringToVectorU8(prediction);
        const walrusSerialized = stringToVectorU8(walrusBlobId);
        
        console.log('[useOnChainBet] Serialized with BCS type metadata:', {
          eventId: eventId,
          marketId: marketId,
          prediction: prediction,
          walrusBlobId: walrusBlobId
        });
        
        // Pass SerializedBcs objects to tx.pure - preserves vector<u8> type info
        tx.moveCall({
          target: `${BETTING_PACKAGE_ID}::betting::place_bet`,
          arguments: [
            tx.object(BETTING_PLATFORM_ID),
            stakeCoin,
            tx.pure(eventIdSerialized),
            tx.pure(marketIdSerialized),
            tx.pure(predictionSerialized),
            tx.pure.u64(oddsBps),
            tx.pure(walrusSerialized),
            tx.object(CLOCK_OBJECT_ID),
          ],
        });
      } else if (coinType === 'SBETS') {
        // SBETS bet - requires user's SBETS coin object
        if (!sbetsCoinObjectId) {
          throw new Error('SBETS coin object ID required for SBETS bets');
        }
        
        // For SBETS, we need to split the coin and handle the remainder
        // Split exact bet amount from user's SBETS coin
        const [sbetsCoin] = tx.splitCoins(tx.object(sbetsCoinObjectId), [betAmountMist]);
        
        // Convert strings to SerializedBcs with vector<u8> type metadata
        const eventIdSerialized = stringToVectorU8(eventId);
        const marketIdSerialized = stringToVectorU8(marketId);
        const predictionSerialized = stringToVectorU8(prediction);
        const walrusSerialized = stringToVectorU8(walrusBlobId);
        
        // The original coin (with remainder) stays with the owner automatically
        // The split coin is consumed by place_bet_sbets
        // Pass SerializedBcs objects to tx.pure - preserves vector<u8> type info
        tx.moveCall({
          target: `${BETTING_PACKAGE_ID}::betting::place_bet_sbets`,
          arguments: [
            tx.object(BETTING_PLATFORM_ID),
            sbetsCoin,
            tx.pure(eventIdSerialized),
            tx.pure(marketIdSerialized),
            tx.pure(predictionSerialized),
            tx.pure.u64(oddsBps),
            tx.pure(walrusSerialized),
            tx.object(CLOCK_OBJECT_ID),
          ],
        });
      } else {
        throw new Error(`Unsupported coin type: ${coinType}`);
      }

      console.log('[useOnChainBet] Transaction built, requesting wallet signature...');
      toast({
        title: "Signing Transaction",
        description: `Please approve the ${coinType} bet in your wallet...`,
      });

      const result = await signAndExecute({
        transaction: tx,
      });
      console.log('[useOnChainBet] Transaction signed, result:', result);

      if (!result.digest) {
        throw new Error('Transaction failed - no digest returned');
      }

      const txDetails = await suiClient.waitForTransaction({
        digest: result.digest,
        options: { showEffects: true, showObjectChanges: true },
      });

      let betObjectId: string | undefined;
      if (txDetails.objectChanges) {
        const createdBet = txDetails.objectChanges.find(
          (change) => change.type === 'created' && change.objectType?.includes('::betting::Bet')
        );
        if (createdBet && 'objectId' in createdBet) {
          betObjectId = createdBet.objectId;
        }
      }

      toast({
        title: `${coinType} Bet Placed On-Chain!`,
        description: `Transaction confirmed: ${result.digest.slice(0, 12)}...`,
        variant: "default",
      });

      setIsLoading(false);
      return {
        success: true,
        txDigest: result.digest,
        betObjectId,
        coinType,
      };

    } catch (err: any) {
      console.error('[useOnChainBet] Transaction failed:', err);
      console.error('[useOnChainBet] Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
      const errorMessage = err.message || 'Failed to place bet on-chain';
      setError(errorMessage);
      setIsLoading(false);

      toast({
        title: "On-Chain Bet Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [signAndExecute, suiClient, toast, getSuiCoins]);

  return {
    placeBetOnChain,
    getSbetsCoins,
    isLoading,
    error,
    SBETS_TOKEN_TYPE,
  };
}
