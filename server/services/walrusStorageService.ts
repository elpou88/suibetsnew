import { createHash } from 'crypto';

const WALRUS_PUBLISHER = 'https://publisher.walrus-mainnet.walrus.space/v1/blobs';
const WALRUS_AGGREGATOR = 'https://aggregator.walrus-mainnet.walrus.space/v1/blobs';
const STORE_EPOCHS = 5;

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
    walrusNetwork: 'mainnet',
  };
  return JSON.stringify(receipt);
}

function hashReceipt(json: string): string {
  return createHash('sha256').update(json).digest('hex').slice(0, 32);
}

function extractBlobId(result: any): string | null {
  if (result?.newlyCreated?.blobObject?.blobId) {
    return result.newlyCreated.blobObject.blobId;
  }
  if (result?.alreadyCertified?.blobId) {
    return result.alreadyCertified.blobId;
  }
  if (typeof result?.blobId === 'string') {
    return result.blobId;
  }
  if (Array.isArray(result) && result[0]?.blobStoreResult) {
    const inner = result[0].blobStoreResult;
    return inner?.newlyCreated?.blobObject?.blobId || inner?.alreadyCertified?.blobId || null;
  }
  return null;
}

async function storeViaHttpOnce(receiptJson: string): Promise<{ blobId: string } | null> {
  const url = `${WALRUS_PUBLISHER}?epochs=${STORE_EPOCHS}&send=true`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: receiptJson,
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.warn(`[Walrus HTTP] Publisher returned ${response.status}: ${text.slice(0, 200)}`);
    return null;
  }

  const result = await response.json();
  const blobId = extractBlobId(result);

  if (blobId) {
    return { blobId };
  }

  console.warn(`[Walrus HTTP] No blobId in response:`, JSON.stringify(result).slice(0, 300));
  return null;
}

async function storeViaHttp(receiptJson: string, retries = 2): Promise<{ blobId: string } | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await storeViaHttpOnce(receiptJson);
      if (result) return result;
    } catch (err: any) {
      console.warn(`[Walrus HTTP] Attempt ${attempt + 1} failed: ${err.message}`);
    }
    if (attempt < retries) {
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return null;
}

export async function storeBetReceipt(data: BetReceiptData): Promise<WalrusStoreResponse> {
  const receiptJson = generateReceiptJson(data);
  const receiptHash = hashReceipt(receiptJson);

  const result = await storeViaHttp(receiptJson);

  if (result) {
    console.log(`🐋 Walrus MAINNET receipt stored via HTTP: ${result.blobId}`);
    return { blobId: result.blobId, receiptJson, receiptHash, publisherUsed: 'walrus-http-mainnet' };
  }

  console.warn(`[Walrus] HTTP store failed — receipt stored locally (hash: ${receiptHash})`);
  return { blobId: null, receiptJson, receiptHash, error: 'Walrus HTTP store failed' };
}

export async function getBetReceipt(blobId: string): Promise<any | null> {
  try {
    const response = await fetch(`${WALRUS_AGGREGATOR}/${blobId}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text, format: 'text' };
    }
  } catch (err: any) {
    console.warn(`[Walrus] Fetch failed for ${blobId}: ${err.message}`);
  }

  return null;
}

export function getWalrusAggregatorUrl(blobId: string): string {
  return `${WALRUS_AGGREGATOR}/${blobId}`;
}
