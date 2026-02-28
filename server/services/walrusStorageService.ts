import { createHash } from 'crypto';

const WALRUS_PUBLISHERS = [
  'https://publisher.walrus-mainnet.walrus.space/v1/blobs',
  'https://wal-publisher-mainnet.staketab.org/v1/blobs',
];
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
  receiptJson: string;
  receiptHash: string;
  publisherUsed?: string;
  error?: string;
}

function generateReceiptJson(data: BetReceiptData): string {
  const receipt = {
    platform: 'SuiBets',
    version: '1.0',
    type: 'bet_receipt',
    ...data,
    storedAt: Date.now(),
    chain: 'sui:mainnet',
  };
  return JSON.stringify(receipt);
}

function hashReceipt(json: string): string {
  return createHash('sha256').update(json).digest('hex').slice(0, 32);
}

async function tryPublisher(url: string, body: string): Promise<{ blobId: string; publisher: string } | null> {
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.warn(`[Walrus] ${url} failed (${response.status}): ${text.slice(0, 100)}`);
      return null;
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
      return { blobId, publisher: url };
    }

    console.warn(`[Walrus] No blobId from ${url}:`, JSON.stringify(result).slice(0, 200));
    return null;
  } catch (err: any) {
    console.warn(`[Walrus] ${url} error: ${err.message}`);
    return null;
  }
}

export async function storeBetReceipt(data: BetReceiptData): Promise<WalrusStoreResponse> {
  const receiptJson = generateReceiptJson(data);
  const receiptHash = hashReceipt(receiptJson);

  for (const publisher of WALRUS_PUBLISHERS) {
    const result = await tryPublisher(publisher, receiptJson);
    if (result) {
      console.log(`🐋 Walrus receipt stored via ${result.publisher}: ${result.blobId}`);
      return { blobId: result.blobId, receiptJson, receiptHash, publisherUsed: result.publisher };
    }
  }

  console.warn(`[Walrus] All publishers unreachable — receipt stored locally (hash: ${receiptHash})`);
  return { blobId: null, receiptJson, receiptHash, error: 'All Walrus mainnet publishers unreachable' };
}

export async function getBetReceipt(blobId: string): Promise<any | null> {
  try {
    const response = await fetch(`${WALRUS_AGGREGATOR}/${blobId}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (err: any) {
    console.warn(`[Walrus] Fetch failed for ${blobId}: ${err.message}`);
  }

  return null;
}

export function getWalrusAggregatorUrl(blobId: string): string {
  return `${WALRUS_AGGREGATOR}/${blobId}`;
}
