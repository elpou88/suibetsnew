import { useQuery } from '@tanstack/react-query';

export function useSuiNSName(address: string | undefined | null) {
  const { data: name } = useQuery<string | null>({
    queryKey: ['/api/suins/name', address],
    queryFn: async () => {
      if (!address || !address.startsWith('0x')) return null;
      const res = await fetch(`/api/suins/resolve?address=${encodeURIComponent(address)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.name || null;
    },
    enabled: !!address && address.startsWith('0x'),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
  });

  return name || null;
}

export function useSuiNSNames(addresses: string[]) {
  const filtered = [...new Set(addresses.filter(a => a && a.startsWith('0x')))];

  const { data: names } = useQuery<Record<string, string | null>>({
    queryKey: ['/api/suins/batch', ...filtered.sort()],
    queryFn: async () => {
      if (filtered.length === 0) return {};
      const res = await fetch('/api/suins/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses: filtered }),
      });
      if (!res.ok) return {};
      const data = await res.json();
      return data.names || {};
    },
    enabled: filtered.length > 0,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
  });

  return names || {};
}

export function formatAddress(address: string): string {
  if (!address) return 'Anonymous';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function displayName(address: string, suinsName: string | null | undefined): string {
  if (suinsName) return suinsName;
  return formatAddress(address);
}
