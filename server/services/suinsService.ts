import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });

const nameCache = new Map<string, { name: string | null; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const pendingLookups = new Map<string, Promise<string | null>>();

async function resolveNameFromChain(address: string): Promise<string | null> {
  try {
    const result = await suiClient.resolveNameServiceNames({
      address,
      limit: 1,
    });
    if (result?.data && result.data.length > 0) {
      const name = result.data[0];
      return name.endsWith('.sui') ? name : `${name}.sui`;
    }
    return null;
  } catch (error) {
    console.error(`[SuiNS] Failed to resolve ${address.slice(0, 10)}...:`, error);
    return null;
  }
}

export async function resolveSuiNSName(address: string): Promise<string | null> {
  if (!address || !address.startsWith('0x')) return null;

  const cached = nameCache.get(address);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.name;
  }

  const pending = pendingLookups.get(address);
  if (pending) return pending;

  const promise = resolveNameFromChain(address).then(name => {
    nameCache.set(address, { name, timestamp: Date.now() });
    pendingLookups.delete(address);
    return name;
  }).catch(() => {
    pendingLookups.delete(address);
    return null;
  });

  pendingLookups.set(address, promise);
  return promise;
}

export async function batchResolveSuiNSNames(addresses: string[]): Promise<Record<string, string | null>> {
  const unique = Array.from(new Set(addresses.filter(a => a && a.startsWith('0x'))));
  const results: Record<string, string | null> = {};

  const toResolve: string[] = [];
  for (const addr of unique) {
    const cached = nameCache.get(addr);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      results[addr] = cached.name;
    } else {
      toResolve.push(addr);
    }
  }

  if (toResolve.length > 0) {
    const batchSize = 10;
    for (let i = 0; i < toResolve.length; i += batchSize) {
      const batch = toResolve.slice(i, i + batchSize);
      const resolved = await Promise.allSettled(
        batch.map(addr => resolveSuiNSName(addr))
      );
      batch.forEach((addr, idx) => {
        const result = resolved[idx];
        results[addr] = result.status === 'fulfilled' ? result.value : null;
      });
    }
  }

  return results;
}

export function getCachedName(address: string): string | null {
  const cached = nameCache.get(address);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.name;
  }
  return null;
}

export function getSuiNSCacheStats() {
  return {
    size: nameCache.size,
    entries: Array.from(nameCache.entries()).slice(0, 20).map(([addr, data]) => ({
      address: `${addr.slice(0, 10)}...`,
      name: data.name,
      age: Math.floor((Date.now() - data.timestamp) / 1000) + 's ago',
    })),
  };
}
