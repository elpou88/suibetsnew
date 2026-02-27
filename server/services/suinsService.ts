import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });

interface CacheEntry {
  name: string | null;
  timestamp: number;
  isError: boolean;
}

const nameCache = new Map<string, CacheEntry>();
const CACHE_TTL_FOUND = 30 * 60 * 1000;
const CACHE_TTL_NOT_FOUND = 5 * 60 * 1000;
const CACHE_TTL_ERROR = 60 * 1000;
const pendingLookups = new Map<string, Promise<string | null>>();

function getCacheTTL(entry: CacheEntry): number {
  if (entry.isError) return CACHE_TTL_ERROR;
  if (entry.name) return CACHE_TTL_FOUND;
  return CACHE_TTL_NOT_FOUND;
}

async function resolveNameFromChain(address: string): Promise<{ name: string | null; isError: boolean }> {
  try {
    const result = await suiClient.resolveNameServiceNames({
      address,
      limit: 1,
    });
    if (result?.data && result.data.length > 0) {
      const name = result.data[0];
      return { name: name.endsWith('.sui') ? name : `${name}.sui`, isError: false };
    }
    return { name: null, isError: false };
  } catch (error) {
    console.error(`[SuiNS] Failed to resolve ${address.slice(0, 10)}...:`, error);
    return { name: null, isError: true };
  }
}

export async function resolveSuiNSName(address: string): Promise<string | null> {
  if (!address || !address.startsWith('0x')) return null;

  const cached = nameCache.get(address);
  if (cached && Date.now() - cached.timestamp < getCacheTTL(cached)) {
    return cached.name;
  }

  const pending = pendingLookups.get(address);
  if (pending) return pending;

  const promise = resolveNameFromChain(address).then(({ name, isError }) => {
    nameCache.set(address, { name, timestamp: Date.now(), isError });
    pendingLookups.delete(address);
    return name;
  }).catch(() => {
    nameCache.set(address, { name: null, timestamp: Date.now(), isError: true });
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
    if (cached && Date.now() - cached.timestamp < getCacheTTL(cached)) {
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
  if (cached && Date.now() - cached.timestamp < getCacheTTL(cached)) {
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
      isError: data.isError,
      age: Math.floor((Date.now() - data.timestamp) / 1000) + 's ago',
    })),
  };
}
