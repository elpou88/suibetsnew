import { createHash } from 'crypto';
import { execFile } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const WALRUS_CLI = '/tmp/walrus';
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

function walrusStoreCli(filePath: string): Promise<{ blobId: string } | null> {
  return new Promise((resolve) => {
    execFile(WALRUS_CLI, ['store', '--epochs', String(STORE_EPOCHS), filePath, '--json'], {
      timeout: 120000,
    }, (error, stdout, stderr) => {
      if (error) {
        console.warn(`[Walrus CLI] store error: ${error.message}`);
        resolve(null);
        return;
      }

      try {
        const jsonStart = stdout.indexOf('[');
        const jsonStr = jsonStart >= 0 ? stdout.slice(jsonStart) : stdout;
        const results = JSON.parse(jsonStr);
        const result = results[0]?.blobStoreResult;

        let blobId: string | null = null;
        if (result?.newlyCreated?.blobObject?.blobId) {
          blobId = result.newlyCreated.blobObject.blobId;
        } else if (result?.alreadyCertified?.blobId) {
          blobId = result.alreadyCertified.blobId;
        }

        if (blobId) {
          resolve({ blobId });
          return;
        }

        console.warn(`[Walrus CLI] No blobId in output:`, stdout.slice(0, 300));
        resolve(null);
      } catch (parseErr: any) {
        console.warn(`[Walrus CLI] Parse error: ${parseErr.message}, stdout: ${stdout.slice(0, 200)}`);
        resolve(null);
      }
    });
  });
}

export async function storeBetReceipt(data: BetReceiptData): Promise<WalrusStoreResponse> {
  const receiptJson = generateReceiptJson(data);
  const receiptHash = hashReceipt(receiptJson);

  const tmpFile = join(tmpdir(), `walrus_receipt_${data.betId.slice(0, 16)}_${Date.now()}.json`);

  try {
    await writeFile(tmpFile, receiptJson);
    const result = await walrusStoreCli(tmpFile);

    if (result) {
      console.log(`🐋 Walrus MAINNET receipt stored: ${result.blobId}`);
      return { blobId: result.blobId, receiptJson, receiptHash, publisherUsed: 'walrus-cli-mainnet' };
    }
  } catch (err: any) {
    console.warn(`[Walrus] CLI store failed: ${err.message}`);
  } finally {
    unlink(tmpFile).catch(() => {});
  }

  console.warn(`[Walrus] CLI store failed — receipt stored locally (hash: ${receiptHash})`);
  return { blobId: null, receiptJson, receiptHash, error: 'Walrus CLI store failed' };
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
