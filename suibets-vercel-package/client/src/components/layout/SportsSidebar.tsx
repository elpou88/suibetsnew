import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { useWebSocketLiveUpdates } from '@/lib/useWebSocketLiveUpdates';
import { 
  Trophy, 
  Grid, 
  Home,
  ChevronRight,
  BarChart,
  Clock,
  Zap,
  Radio,
  AreaChart,
  Wifi,
  WifiOff
} from 'lucide-react';

// Sport icon mapping - completely aligned with main routes.ts sportId mappings
const SPORT_ICONS: Record<number, JSX.Element> = {
  1: <Zap className="mr-2 h-4 w-4 text-[#00ffff]" />,      // Football (European)
  2: <Radio className="mr-2 h-4 w-4 text-[#00ffff]" />,    // Basketball
  3: <AreaChart className="mr-2 h-4 w-4 text-[#00ffff]" />, // Tennis
  4: <AreaChart className="mr-2 h-4 w-4 text-[#00ffff]" />, // Baseball
  5: <Radio className="mr-2 h-4 w-4 text-[#00ffff]" />,    // Hockey
  6: <Zap className="mr-2 h-4 w-4 text-[#00ffff]" />,      // Handball
  7: <AreaChart className="mr-2 h-4 w-4 text-[#00ffff]" />, // Volleyball
  8: <Zap className="mr-2 h-4 w-4 text-[#00ffff]" />,      // Rugby
  9: <Radio className="mr-2 h-4 w-4 text-[#00ffff]" />,    // Cricket
  10: <AreaChart className="mr-2 h-4 w-4 text-[#00ffff]" />, // Golf
  11: <Zap className="mr-2 h-4 w-4 text-[#00ffff]" />,     // Boxing
  12: <Zap className="mr-2 h-4 w-4 text-[#00ffff]" />,     // MMA/UFC
  13: <AreaChart className="mr-2 h-4 w-4 text-[#00ffff]" />, // Formula 1
  14: <AreaChart className="mr-2 h-4 w-4 text-[#00ffff]" />, // Cycling
  15: <Zap className="mr-2 h-4 w-4 text-[#00ffff]" />,     // American Football
  16: <Zap className="mr-2 h-4 w-4 text-[#00ffff]" />,     // AFL
  17: <Radio className="mr-2 h-4 w-4 text-[#00ffff]" />,   // Snooker
  18: <Zap className="mr-2 h-4 w-4 text-[#00ffff]" />,     // Darts
  19: <AreaChart className="mr-2 h-4 w-4 text-[#00ffff]" />, // Table Tennis
  20: <AreaChart className="mr-2 h-4 w-4 text-[#00ffff]" />, // Badminton
  21: <Zap className="mr-2 h-4 w-4 text-[#00ffff]" />,     // Beach Volleyball
  22: <Radio className="mr-2 h-4 w-4 text-[#00ffff]" />,   // Winter Sports
  23: <AreaChart className="mr-2 h-4 w-4 text-[#00ffff]" />, // Motorsport
  24: <Zap className="mr-2 h-4 w-4 text-[#00ffff]" />,     // Esports
  25: <Radio className="mr-2 h-4 w-4 text-[#00ffff]" />,   // Netball
  26: <Zap className="mr-2 h-4 w-4 text-[#00ffff]" />,     // Soccer
  27: <Radio className="mr-2 h-4 w-4 text-[#00ffff]" />,   // NBA
  28: <Radio className="mr-2 h-4 w-4 text-[#00ffff]" />,   // NHL
  29: <Zap className="mr-2 h-4 w-4 text-[#00ffff]" />,     // NFL
  30: <AreaChart className="mr-2 h-4 w-4 text-[#00ffff]" />  // MLB
};

export default function SportsSidebar() {
  const [, setLocation] = useLocation();
  const [sportEventCounts, setSportEventCounts] = useState<Record<number, { live: number, upcoming: number }>>({});
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  
  // Fetch sports for the sidebar directly from the API with error handling
  const { data: sports = [] } = useQuery({
    queryKey: ['/api/sports'],
    queryFn: async () => {
      try {
        console.log("Fetching sports for sidebar...");
        const response = await apiRequest('GET', '/api/sports', undefined, { timeout: 5000 });
        if (!response.ok) {
          throw new Error(`Failed to fetch sports: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log(`Fetched ${data.length} sports for sidebar`, data);
        return data;
      } catch (error) {
        console.error("Error fetching sports:", error);
        // Return hardcoded default sports as fallback to ensure sidebar always shows something
        // IDs MUST match server/routes.ts sportId mappings
        return [
          { id: 26, name: 'Soccer', slug: 'soccer', icon: '⚽', isActive: true },
          { id: 1, name: 'Football', slug: 'football', icon: '⚽', isActive: true }, 
          { id: 2, name: 'Basketball', slug: 'basketball', icon: '🏀', isActive: true },
          { id: 3, name: 'Tennis', slug: 'tennis', icon: '🎾', isActive: true },
          { id: 4, name: 'Baseball', slug: 'baseball', icon: '⚾', isActive: true },
          { id: 5, name: 'Ice Hockey', slug: 'ice-hockey', icon: '🏒', isActive: true },
          { id: 6, name: 'Handball', slug: 'handball', icon: '🤾', isActive: true },
          { id: 7, name: 'Volleyball', slug: 'volleyball', icon: '🏐', isActive: true },
          { id: 8, name: 'Rugby', slug: 'rugby', icon: '🏉', isActive: true },
          { id: 9, name: 'Cricket', slug: 'cricket', icon: '🏏', isActive: true },
          { id: 10, name: 'Golf', slug: 'golf', icon: '⛳', isActive: true },
          { id: 11, name: 'Boxing', slug: 'boxing', icon: '🥊', isActive: true },
          { id: 12, name: 'MMA/UFC', slug: 'mma-ufc', icon: '🥋', isActive: true },
          { id: 13, name: 'Formula 1', slug: 'formula-1', icon: '🏎️', isActive: true },
          { id: 14, name: 'Cycling', slug: 'cycling', icon: '🚴', isActive: true },
          { id: 15, name: 'American Football', slug: 'american-football', icon: '🏈', isActive: true }
        ];
      }
    },
    // Refresh every 5 minutes
    refetchInterval: 300000,
    // Retry 3 times with exponential backoff
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
  
  // Fetch live events with our optimized lite endpoint with better error handling
  const { data: liveEvents = [] } = useQuery({
    queryKey: ['/api/events/live-lite'],
    queryFn: async () => {
      try {
        console.log("Fetching live events from lite API for sidebar");
        
        // Try the lite endpoint first with text parsing to handle non-JSON responses
        try {
          // Use a direct fetch for more control over response parsing
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
          
          const response = await fetch('/api/events/live-lite', {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            }
          });
          
          clearTimeout(timeoutId);
          
          // Handle non-OK responses
          if (!response.ok) {
            console.warn(`Live events lite API returned status ${response.status}`);
            throw new Error(`API status: ${response.status}`);
          }
          
          // Get response as text first to validate
          const responseText = await response.text();
          
          // Simple validation that response looks like a JSON array
          if (!responseText.trim().startsWith('[') || !responseText.trim().endsWith(']')) {
            console.warn("Live events lite API did not return an array format");
            throw new Error("Invalid array format");
          }
          
          try {
            // Parse the text as JSON
            const data = JSON.parse(responseText);
            
            // Double-check it's an array
            if (!Array.isArray(data)) {
              console.warn("Live events lite API did not return an array after parsing:", typeof data);
              throw new Error("Not an array after parsing");
            }
            
            console.log(`Received ${data.length} lite events for sidebar`);
            
            // Filter out malformed events
            const validEvents = data.filter(event => 
              event && 
              typeof event === 'object' && 
              (event.id || event.eventId) && 
              (event.homeTeam || event.awayTeam || event.home || event.team1)
            );
            
            return validEvents;
          } catch (jsonError) {
            console.warn("Failed to parse lite API response:", jsonError);
            throw jsonError;
          }
        } catch (liteError) {
          // Fallback to main API endpoint
          console.warn("Lite API failed, using fallback endpoint:", liteError);
          
          // Use the main API endpoint with longer timeout as fallback
          const fallbackResponse = await apiRequest('GET', '/api/events?isLive=true', undefined, { 
            timeout: 15000, // Longer timeout for main endpoint
            retries: 2     
          });
          
          if (!fallbackResponse.ok) {
            console.warn(`Fallback API also failed with status ${fallbackResponse.status}`);
            return [];
          }
          
          const fallbackData = await fallbackResponse.json();
          
          if (!Array.isArray(fallbackData)) {
            console.warn("Fallback API did not return an array:", typeof fallbackData);
            return [];
          }
          
          console.log(`Received ${fallbackData.length} live events from fallback API`);
          
          return fallbackData.filter(event => 
            event && 
            typeof event === 'object' && 
            (event.id || event.eventId) && 
            (event.homeTeam || event.awayTeam || event.home || event.team1)
          );
        }
      } catch (error) {
        console.error("Error fetching live events for sidebar:", error);
        return [];
      }
    },
    refetchInterval: 20000, // More frequent updates for live events
    staleTime: 10000,  // Consider data fresh for 10 seconds
    retry: 3,          // Increase retry attempts
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000)
  });

  // Fetch upcoming events with improved error handling
  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['/api/events/upcoming'],
    queryFn: async () => {
      try {
        // Increased timeout to 15 seconds
        const response = await apiRequest('GET', '/api/events', undefined, { 
          timeout: 15000 
        });
        
        // Handle non-OK responses
        if (!response.ok) {
          console.warn(`Upcoming events API returned status ${response.status}`);
          return [];
        }
        
        // Handle various response formats
        const data = await response.json();
        
        // Validate response is an array
        if (!Array.isArray(data)) {
          console.warn("Upcoming events API did not return an array:", typeof data);
          return [];
        }
        
        // Filter out malformed events and non-upcoming events
        const validEvents = data.filter(event => 
          event && 
          typeof event === 'object' && 
          !event.isLive && 
          (event.id || event.eventId) && 
          (event.homeTeam || event.home || event.team1)
        );
        
        return validEvents;
      } catch (error) {
        console.error("Error fetching upcoming events for sidebar:", error);
        return [];
      }
    },
    refetchInterval: 60000,
    staleTime: 30000,  // Consider data fresh for 30 seconds
    retry: 3,          // Increase retry attempts
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000)
  });

  // Set up WebSocket connection for live score updates
  const { connectionStatus } = useWebSocketLiveUpdates<any>({
    onScoreUpdate: (updatedEvents) => {
      console.log(`[WebSocket] Received live score updates for ${updatedEvents.length} events`);
      // We don't need to do anything here since the regular API calls will
      // get the updated data, but we could update the counts directly if needed
    },
    onStatusChange: (status) => {
      setWsStatus(status);
      console.log(`[WebSocket] Connection status changed to: ${status}`);
    },
    autoReconnect: true
  });

  // Calculate event counts by sport
  // Use a simpler method to update counts only when the data has changed significantly
  // to prevent render loops
  useEffect(() => {
    // Skip if there's no data yet
    if (!sports.length || (!liveEvents.length && !upcomingEvents.length)) return;
    
    // Use the current lengths to see if we need to update
    const sportCount = sports.length;
    const liveCount = liveEvents.length;
    const upcomingCount = upcomingEvents.length;
    
    // Build the counts dictionary
    const counts: Record<number, { live: number, upcoming: number }> = {};
    
    // Initialize all sports with zero counts
    sports.forEach((sport: any) => {
      counts[sport.id] = { live: 0, upcoming: 0 };
    });
    
    // Count live events by sport ID
    liveEvents.forEach((event: any) => {
      if (event.sportId && counts[event.sportId]) {
        counts[event.sportId].live += 1;
      }
    });
    
    // Count upcoming events by sport ID
    upcomingEvents.forEach((event: any) => {
      if (event.sportId && counts[event.sportId]) {
        counts[event.sportId].upcoming += 1;
      }
    });
    
    // Update the state with the new counts
    setSportEventCounts(counts);
    
  }, [sports.length, liveEvents.length, upcomingEvents.length]);

  // Now we've fixed the update loop by using array lengths as dependencies
  
  // Map correct sportId to slug - fixed mapping to match server/routes.ts
  const getSportIdForSlug = (slug: string): number => {
    const mappings: Record<string, number> = {
      // Main sports with direct mapping
      'soccer': 26,             // ID 26 for soccer (Alternative name for football)
      'football': 1,            // ID 1 for football (European football)
      'basketball': 2,          // ID 2 for basketball
      'tennis': 3,              // ID 3 for tennis
      'baseball': 4,            // ID 4 for baseball
      'ice-hockey': 5,          // ID 5 for ice hockey (preferred)
      'hockey': 5,              // ID 5 for hockey (legacy support)
      'handball': 6,            // ID 6 for handball
      'volleyball': 7,          // ID 7 for volleyball
      'rugby': 8,               // ID 8 for rugby
      'cricket': 9,             // ID 9 for cricket
      'golf': 10,               // ID 10 for golf
      'boxing': 11,             // ID 11 for boxing
      'mma-ufc': 12,            // ID 12 for MMA/UFC (preferred)
      'mma': 12,                // ID 12 for MMA (legacy support)
      'formula-1': 13,          // ID 13 for Formula 1 (preferred)
      'formula_1': 13,          // ID 13 for Formula 1 (legacy support)
      'cycling': 14,            // ID 14 for cycling
      'american-football': 15,  // ID 15 for American Football (preferred)
      'american_football': 15,  // ID 15 for American Football (legacy support)
      'aussie-rules': 16,       // ID 16 for Australian Football League (preferred)
      'afl': 16,                // ID 16 for AFL (legacy support)
      'snooker': 17,            // ID 17 for snooker
      'darts': 18,              // ID 18 for darts
      'table-tennis': 19,       // ID 19 for table tennis (preferred)
      'tabletennis': 19,        // ID 19 for table tennis (legacy support)
      'badminton': 20,          // ID 20 for badminton
      'beach-volleyball': 21,   // ID 21 for beach volleyball
      'winter-sports': 22,      // ID 22 for winter sports
      'motorsport': 23,         // ID 23 for motorsport
      'esports': 24,            // ID 24 for esports
      'netball': 25,            // ID 25 for netball
      
      // League-specific mappings (which use the main sport APIs)
      'nba': 27,                // ID 27 for NBA (basketball league)
      'nhl': 28,                // ID 28 for NHL (hockey league)
      'nfl': 29,                // ID 29 for NFL (American football league)
      'mlb': 30                 // ID 30 for MLB (baseball league)
    };
    return mappings[slug] || 26; // Default to soccer (ID 26) if not found
  };

  // Handle sport click to ensure correct sport ID is used
  const handleSportClick = (sport: any) => {
    // Normalize slug to ensure format compatibility with sports-live/[sport].tsx
    const normalizedSlug = sport.slug
      .replace('_', '-') // Convert formula_1 to formula-1
      .toLowerCase();
    
    // Get the correct sportId based on the normalized slug
    const sportId = getSportIdForSlug(normalizedSlug);
    
    // Store the sport ID for event filtering
    localStorage.setItem('currentSportId', String(sportId));
    localStorage.setItem('currentSportSlug', normalizedSlug);
    
    console.log(`Selected sport: ${sport.name} (ID: ${sportId}, slug: ${normalizedSlug})`);
    
    // Navigate to the sport page using the normalized slug
    setLocation(`/sports-live/${normalizedSlug}`);
  };

  return (
    <div className="p-4">
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-cyan-400 mb-4 border-b border-[#1e3a3f] pb-2">Navigation</h2>
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-cyan-200 hover:text-cyan-400 hover:bg-[#1e3a3f] transition-colors"
            onClick={() => setLocation('/home-real')}
          >
            <Home className="mr-2 h-5 w-5 text-cyan-400" />
            Home
          </Button>
          <Button
            variant="ghost" 
            className="w-full justify-start text-cyan-200 hover:text-cyan-400 hover:bg-[#1e3a3f] transition-colors"
            onClick={() => setLocation('/live-real')}
          >
            <div className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"></div>
            Live Events
            {liveEvents.length > 0 && (
              <Badge className="ml-2 bg-red-500 hover:bg-red-600">
                {liveEvents.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-cyan-400 mb-4 border-b border-[#1e3a3f] pb-2">Sports</h2>
        <div className="space-y-1 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
          {/* Ensure we only display the primary 14 sports without duplicates */}
          {sports
            // Filter to only include active sports and handle duplicate sport removal
            .filter((sport: any) => {
              // Skip inactive sports
              if (!sport.isActive) return false;
              
              // Skip Soccer (26) if Football (1) is also present to avoid duplicates
              if (sport.id === 26) {
                return !sports.some((s: any) => s.id === 1 && s.isActive);
              }
              
              // Skip league-specific entries if we have the main sport
              if ([27, 28, 29, 30].includes(sport.id)) {
                // Skip NBA (27) if Basketball (2) exists
                if (sport.id === 27) return !sports.some((s: any) => s.id === 2 && s.isActive);
                // Skip NHL (28) if Hockey (5) exists
                if (sport.id === 28) return !sports.some((s: any) => s.id === 5 && s.isActive);
                // Skip NFL (29) if American Football (15) exists
                if (sport.id === 29) return !sports.some((s: any) => s.id === 15 && s.isActive);
                // Skip MLB (30) if Baseball (4) exists
                if (sport.id === 30) return !sports.some((s: any) => s.id === 4 && s.isActive);
              }
              
              // Include all other sports
              return true;
            })
            .sort((a: any, b: any) => {
              // First, prioritize the 14 main sports
              // We want to show the main 14 sports first, then any additional sports
              const isMainSportA = a.id >= 1 && a.id <= 14;
              const isMainSportB = b.id >= 1 && b.id <= 14;
              
              if (isMainSportA && !isMainSportB) return -1;
              if (!isMainSportA && isMainSportB) return 1;
              
              // Sort by live event count (descending)
              const liveDiff = (sportEventCounts[b.id]?.live || 0) - (sportEventCounts[a.id]?.live || 0);
              if (liveDiff !== 0) return liveDiff;
              
              // Then by upcoming event count (descending)
              const upcomingDiff = (sportEventCounts[b.id]?.upcoming || 0) - (sportEventCounts[a.id]?.upcoming || 0);
              if (upcomingDiff !== 0) return upcomingDiff;
              
              // For the 14 main sports, sort by ID to maintain a consistent order
              if (isMainSportA && isMainSportB) {
                return a.id - b.id;
              }
              
              // Finally alphabetically by name
              return a.name.localeCompare(b.name);
            })
            .map((sport: any) => {
              const liveCount = sportEventCounts[sport.id]?.live || 0;
              const upcomingCount = sportEventCounts[sport.id]?.upcoming || 0;
              
              // Get the appropriate sport icon
              const sportIcon = SPORT_ICONS[sport.id] || <span className="mr-2 h-4 w-4">🎮</span>;
              
              return (
                <div key={sport.id} className="mb-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-between items-center text-cyan-200 hover:text-cyan-400 hover:bg-[#1e3a3f] transition-colors py-2"
                    onClick={() => handleSportClick(sport)}
                  >
                    <div className="flex items-center">
                      {/* Use the icon from our predefined set or the sport's icon if available */}
                      {sportIcon || (sport.icon && <span className="mr-2">{sport.icon}</span>)}
                      <span>{sport.name}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {liveCount > 0 && (
                        <Badge className="bg-red-500 hover:bg-red-600 text-xs">
                          {liveCount} <span className="hidden sm:inline">live</span>
                        </Badge>
                      )}
                      {upcomingCount > 0 && (
                        <Badge className="bg-blue-700 hover:bg-blue-800 text-xs">
                          {upcomingCount} <span className="hidden sm:inline">upcoming</span>
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-cyan-400" />
                    </div>
                  </Button>
                </div>
              );
            })}
        </div>
      </div>
      
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-cyan-400 mb-4 border-b border-[#1e3a3f] pb-2">Quick Links</h2>
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-cyan-200 hover:text-cyan-400 hover:bg-[#1e3a3f] transition-colors"
            onClick={() => setLocation('/parlay')}
          >
            <Trophy className="mr-2 h-5 w-5 text-cyan-400" />
            Parlay Bets
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-cyan-200 hover:text-cyan-400 hover:bg-[#1e3a3f] transition-colors bg-gradient-to-r from-[#112225]/50 to-[#1e3a3f]/50"
            onClick={() => setLocation('/defi-staking')}
          >
            <BarChart className="mr-2 h-5 w-5 text-cyan-400" />
            DeFi Staking
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-cyan-200 hover:text-cyan-400 hover:bg-[#1e3a3f] transition-colors"
            onClick={() => setLocation('/bet-history')}
          >
            <Clock className="mr-2 h-5 w-5 text-cyan-400" />
            Bet History
          </Button>
          
          {/* WebSocket connection status indicator */}
          <div className="mt-4 flex items-center justify-center px-2 py-1 text-xs rounded bg-[#1e3a3f]/50">
            {wsStatus === 'connected' ? (
              <div className="flex items-center text-green-400">
                <Wifi className="h-3 w-3 mr-1" />
                <span>Live updates enabled</span>
              </div>
            ) : (
              <div className="flex items-center text-yellow-400">
                <WifiOff className="h-3 w-3 mr-1" />
                <span>Using polling updates</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}