import { createHash } from 'crypto';
import { execFile, exec } from 'child_process';
import { writeFile, unlink, chmod, mkdir, access, constants } from 'fs/promises';
import { tmpdir, homedir } from 'os';
import { join } from 'path';

const WALRUS_CLI = '/tmp/walrus';
const WALRUS_AGGREGATOR = 'https://aggregator.walrus-mainnet.walrus.space/v1/blobs';
const STORE_EPOCHS = 5;
const WALRUS_DOWNLOAD_URL = 'https://storage.googleapis.com/mysten-walrus-binaries/walrus-mainnet-latest-ubuntu-x86_64';
const SUI_CLI = '/tmp/sui';
const SUI_DOWNLOAD_URL = 'https://github.com/MystenLabs/sui/releases/download/mainnet-v1.46.1/sui-mainnet-v1.46.1-ubuntu-x86_64.tgz';
const WALRUS_CONFIG_DIR = join(homedir(), '.config', 'walrus');
const WALRUS_CONFIG_PATH = join(WALRUS_CONFIG_DIR, 'client_config.yaml');
const SUI_CONFIG_DIR = join(homedir(), '.sui', 'sui_config');

const WALRUS_MAINNET_CONFIG = `system_object: 0x2134d52768ea07e8c43570ef975eb3e4c27a39fa6396bef985b5abc58d03ddd2
staking_object: 0x10b9d30c28448939ce6c4d6c6e0ffce4a7f8a4ada8248bdad09ef8b70e4a3904
n_shards: 1000
max_epochs_ahead: 53
rpc_urls:
  - https://fullnode.mainnet.sui.io:443
`;

const SUI_CLIENT_CONFIG = `---
keystore:
  File: ${join(homedir(), '.sui', 'sui_config', 'sui.keystore')}
external_keys: ~
envs:
  - alias: mainnet
    rpc: "https://fullnode.mainnet.sui.io:443"
    ws: ~
    basic_auth: ~
    chain_id: 35834a8a
active_env: mainnet
active_address: "0x20850db591c4d575b5238baf975e54580d800e69b8b5b421de796a311d3bea50"
`;

let cliReady: boolean | null = null;
let cliSetupPromise: Promise<boolean> | null = null;

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function runShell(cmd: string, timeoutMs = 180000): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) reject(new Error(`${error.message}\n${stderr}`));
      else resolve(stdout);
    });
  });
}

function execFilePromise(cmd: string, args: string[], input?: string, timeoutMs = 30000): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile(cmd, args, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr || error.message));
      else resolve(stdout);
    });
    if (input && child.stdin) {
      child.stdin.write(input);
      child.stdin.end();
    }
  });
}

async function ensureSuiWallet(): Promise<boolean> {
  try {
    const keystorePath = join(SUI_CONFIG_DIR, 'sui.keystore');
    if (await fileExists(keystorePath)) {
      const content = await import('fs').then(fs => fs.readFileSync(keystorePath, 'utf8'));
      if (content.trim() !== '[]') return true;
    }

    const adminKey = process.env.ADMIN_PRIVATE_KEY;
    if (!adminKey) {
      console.warn('[Walrus] No ADMIN_PRIVATE_KEY — cannot set up Sui wallet for Walrus signing');
      return false;
    }

    await mkdir(SUI_CONFIG_DIR, { recursive: true });

    if (!(await fileExists(SUI_CLI))) {
      console.log('[Walrus] Downloading Sui CLI for wallet setup...');
      await runShell(`curl -sSL "${SUI_DOWNLOAD_URL}" | tar xz -C /tmp/ 2>/dev/null; mv /tmp/sui-mainnet-*/sui ${SUI_CLI} 2>/dev/null || true`, 180000);
      if (await fileExists(SUI_CLI)) {
        await chmod(SUI_CLI, 0o755);
        console.log('[Walrus] Sui CLI downloaded');
      }
    }

    if (!(await fileExists(join(SUI_CONFIG_DIR, 'client.yaml')))) {
      await writeFile(join(SUI_CONFIG_DIR, 'client.yaml'), SUI_CLIENT_CONFIG);
    }
    if (!(await fileExists(keystorePath))) {
      await writeFile(keystorePath, '[]');
    }
    if (!(await fileExists(join(SUI_CONFIG_DIR, 'sui.aliases')))) {
      await writeFile(join(SUI_CONFIG_DIR, 'sui.aliases'), '[]');
    }

    if (await fileExists(SUI_CLI)) {
      try {
        await execFilePromise(SUI_CLI, ['keytool', 'import', adminKey, 'ed25519'], 'y\n', 30000);
        console.log('[Walrus] Admin key imported via Sui CLI');
      } catch (importErr: any) {
        const safeMsg = importErr.message?.replace(adminKey, '***REDACTED***') || 'unknown error';
        console.warn(`[Walrus] Sui keytool import failed: ${safeMsg}`);
        return false;
      }
    } else {
      console.warn('[Walrus] Sui CLI not available for key import');
      return false;
    }

    return true;
  } catch (err: any) {
    console.warn(`[Walrus] Sui wallet setup failed: ${err.message}`);
    return false;
  }
}

async function ensureWalrusCli(): Promise<boolean> {
  if (cliReady === true) return true;

  if (cliSetupPromise) return cliSetupPromise;

  cliSetupPromise = (async () => {
    try {
      const walrusExists = await fileExists(WALRUS_CLI);
      const keystoreExists = await fileExists(join(SUI_CONFIG_DIR, 'sui.keystore'));

      if (walrusExists && keystoreExists) {
        cliReady = true;
        console.log('[Walrus] CLI and wallet already present');
        return true;
      }

      if (!walrusExists) {
        console.log('[Walrus] CLI not found — downloading mainnet binary...');
        await runShell(`curl -sSL -o ${WALRUS_CLI} "${WALRUS_DOWNLOAD_URL}"`, 180000);
        if (!(await fileExists(WALRUS_CLI))) {
          console.warn('[Walrus] Download failed — binary not found after curl');
          cliReady = false;
          return false;
        }
        await chmod(WALRUS_CLI, 0o755);
        console.log('[Walrus] CLI downloaded successfully');
      }

      if (!(await fileExists(WALRUS_CONFIG_PATH))) {
        await mkdir(WALRUS_CONFIG_DIR, { recursive: true });
        await writeFile(WALRUS_CONFIG_PATH, WALRUS_MAINNET_CONFIG);
        console.log('[Walrus] Mainnet config written');
      }

      if (!keystoreExists) {
        const walletOk = await ensureSuiWallet();
        if (!walletOk) {
          console.warn('[Walrus] Wallet setup failed — will still attempt CLI store (may work if wallet exists)');
        }
      }

      const version = await runShell(`${WALRUS_CLI} --version`, 10000).catch(() => 'unknown');
      console.log(`[Walrus] CLI ready: ${version.trim()}`);
      cliReady = true;
      return true;
    } catch (err: any) {
      console.warn(`[Walrus] CLI setup failed (bets still work, receipts stored locally): ${err.message}`);
      cliReady = false;
      return false;
    } finally {
      cliSetupPromise = null;
    }
  })();

  return cliSetupPromise;
}

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

  const cliAvailable = await ensureWalrusCli();
  if (!cliAvailable) {
    console.warn(`[Walrus] CLI not available — receipt stored locally (hash: ${receiptHash})`);
    return { blobId: null, receiptJson, receiptHash, error: 'Walrus CLI not available' };
  }

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
