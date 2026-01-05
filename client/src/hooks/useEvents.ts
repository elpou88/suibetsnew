import { useQuery } from '@tanstack/react-query';

export interface SportEvent {
  id: string | number;
  sportId: number;
  homeTeam: string;
  awayTeam: string;
  leagueName?: string;
  leagueSlug?: string;
  league?: string;
  startTime: string;
  isLive: boolean;
  score?: string;
  homeScore?: number;
  awayScore?: number;
  minute?: string;
  status?: string;
  stats?: any;
  homeOdds?: number;
  drawOdds?: number;
  awayOdds?: number;
  markets?: any[];
}

export function useLiveEvents(sportId?: string | number | null) {
  const normalizedSportId = sportId ? String(sportId) : 'all';
  
  const url = normalizedSportId === 'all' 
    ? '/api/events?isLive=true' 
    : `/api/events?isLive=true&sportId=${normalizedSportId}`;

  return useQuery<any[]>({
    queryKey: ['events', 'live', normalizedSportId],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        // Only use lite endpoint when fetching all sports (no filter)
        // When a specific sport is selected, go directly to filtered endpoint
        if (normalizedSportId === 'all') {
          const liteResponse = await fetch('/api/events/live-lite', {
            signal: controller.signal,
            credentials: 'include',
          }).catch(() => null);
          
          clearTimeout(timeoutId);
          
          if (liteResponse?.ok) {
            const data = await liteResponse.json();
            if (Array.isArray(data) && data.length > 0) {
              return data;
            }
          }
        }
        
        // Use filtered endpoint for specific sport or as fallback
        clearTimeout(timeoutId);
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch live events');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (err) {
        clearTimeout(timeoutId);
        // If aborted or failed, try main endpoint without abort
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch live events');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      }
    },
    refetchInterval: 10000,
    staleTime: 9000,
    gcTime: 60000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData ?? [],
    retry: 2,
    retryDelay: 1000,
  });
}

export function useUpcomingEvents(sportId?: string | number | null) {
  const normalizedSportId = sportId ? String(sportId) : 'all';
  
  const url = normalizedSportId === 'all' 
    ? '/api/events?isLive=false' 
    : `/api/events?isLive=false&sportId=${normalizedSportId}`;

  return useQuery<any[]>({
    queryKey: ['events', 'upcoming', normalizedSportId],
    queryFn: async () => {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch upcoming events');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 30000,
    staleTime: 25000,
    gcTime: 120000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData ?? [],
  });
}
