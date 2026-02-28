const WALRUS_PUBLISHER = 'https://publisher.walrus-mainnet.walrus.space/v1/blobs';
const WALRUS_AGGREGATOR = 'https://aggregator.walrus-mainnet.walrus.space/v1/blobs';

interface BetReceiptData {
  betId: string;
  walletAddress: string;
  eventId: string;
  eventName: string;
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  odds: number;
  stake: number;
  currency: string;
  potentialPayout: number;
  txHash?: string;
  betObjectId?: string;
  placedAt: number;
}

interface WalrusStoreResponse {
  blobId: string | null;
  error?: string;
}

export async function storeBetReceipt(data: BetReceiptData): Promise<WalrusStoreResponse> {
  try {
    const receipt = {
      platform: 'SuiBets',
      version: '1.0',
      type: 'bet_receipt',
      ...data,
      storedAt: Date.now(),
      chain: 'sui:mainnet',
    };

    const body = JSON.stringify(receipt);

    const response = await fetch(WALRUS_PUBLISHER, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.warn(`[Walrus] Upload failed (${response.status}): ${text.slice(0, 200)}`);
      return { blobId: null, error: `HTTP ${response.status}` };
    }

    const result = await response.json();

    let blobId: string | null = null;
    if (result.newlyCreated?.blobObject?.blobId) {
      blobId = result.newlyCreated.blobObject.blobId;
    } else if (result.alreadyCertified?.blobId) {
      blobId = result.alreadyCertified.blobId;
    } else if (result.blobId) {
      blobId = result.blobId;
    }

    if (blobId) {
      console.log(`[Walrus] Receipt stored: ${blobId}`);
    } else {
      console.warn(`[Walrus] No blobId in response:`, JSON.stringify(result).slice(0, 300));
    }

    return { blobId };
  } catch (err: any) {
    console.warn(`[Walrus] Store failed: ${err.message}`);
    return { blobId: null, error: err.message };
  }
}

export async function getBetReceipt(blobId: string): Promise<any | null> {
  try {
    const response = await fetch(`${WALRUS_AGGREGATOR}/${blobId}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (err: any) {
    console.warn(`[Walrus] Fetch failed for ${blobId}: ${err.message}`);
    return null;
  }
}

export function getWalrusAggregatorUrl(blobId: string): string {
  return `${WALRUS_AGGREGATOR}/${blobId}`;
}
