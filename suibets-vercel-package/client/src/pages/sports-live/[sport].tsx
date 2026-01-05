import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Clock, CalendarIcon, RefreshCw, Loader2 } from 'lucide-react';
import SimpleMarkets from '@/components/betting/SimpleMarkets';

const SPORTS_MAPPING: Record<string, number> = {
  'football': 1,
  'basketball': 2,
  'tennis': 3,
  'baseball': 4,
  'hockey': 5,
  'handball': 6,
  'volleyball': 7,
  'rugby': 8,
  'cricket': 9,
  'golf': 10,
  'boxing': 11,
  'mma': 12,
  'mma-ufc': 12, // Added this entry to match the slug in the sidebar
  'formula-1': 13,
  'cycling': 14,
  'american-football': 15,
  'afl': 16,
  'snooker': 17,
  'darts': 18,
  'table-tennis': 19,
  'badminton': 20,
  'beach-volleyball': 21,
  'winter-sports': 22,
  'motorsport': 23,
  'esports': 24,
  'netball': 25,
  'soccer': 26, // Alias for football
  'nba': 27,
  'nhl': 28,
  'nfl': 29,
  'mlb': 30,
};

export default function SportPage() {
  const [match, params] = useRoute<{ sport: string }>('/sports-live/:sport');
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<'live' | 'upcoming'>('live');
  
  const sportId = match ? SPORTS_MAPPING[params.sport.toLowerCase()] : undefined;
  const sportName = match ? params.sport.charAt(0).toUpperCase() + params.sport.slice(1) : '';
  
  // Fetch events for the selected sport
  const { 
    data: events = [], 
    isLoading, 
    isError,
    refetch 
  } = useQuery({
    queryKey: ['/api/events', { sportId, isLive: selectedTab === 'live' }],
    queryFn: async () => {
      if (!sportId) {
        console.error("No sport ID available for API request");
        return [];
      }
      
      try {
        const isLiveParam = selectedTab === 'live' ? '&isLive=true' : '';
        const url = `/api/events?sportId=${sportId}${isLiveParam}`;
        console.log(`Fetching events for specific sport: ${sportName} (ID: ${sportId}), Live: ${selectedTab === 'live'}`);
        console.log(`API URL: ${url}`);
        
        // Try fetching with modified error handling for network errors
        let data = [];
        try {
          // Try direct fetch first - this avoids throwing on network errors
          const response = await fetch(url, {
            method: 'GET',
            headers: {},
            credentials: 'include',
          });
          
          // If status code indicates success, parse the JSON
          if (response.status >= 200 && response.status < 300) {
            data = await response.json();
            console.log(`Success! Received ${data.length} events for ${sportName} via direct fetch`);
          } else {
            console.warn(`API request returned status ${response.status}, trying fallback`);
            
            // For certain sports that have fallback hard-coded events
            if ([9, 14].includes(sportId)) { // Cricket, Cycling - special handling
              console.warn(`Using fallback strategy for sport ID ${sportId} (${sportName})`);
              try {
                // Use the /api/events/tracked endpoint as fallback for these sports
                const fallbackResponse = await fetch('/api/events/tracked');
                if (fallbackResponse.ok) {
                  const responseData = await fallbackResponse.json();
                  
                  // Extract the tracked array from the response
                  const trackedEvents = responseData.tracked || [];
                  
                  console.log(`Tracked events response:`, 
                    `Type: ${typeof trackedEvents}, ` + 
                    `Is Array: ${Array.isArray(trackedEvents)}, ` + 
                    `Length: ${Array.isArray(trackedEvents) ? trackedEvents.length : 'N/A'}`
                  );
                  
                  // Safety check to make sure trackedEvents is an array
                  if (Array.isArray(trackedEvents)) {
                    // Filter to just get this sport's events
                    data = trackedEvents.filter((event: any) => Number(event.sportId) === sportId);
                    console.log(`Fallback found ${data.length} events for sport ID ${sportId}`);
                  } else {
                    console.warn("Fallback data is not an array, cannot filter");
                    // Initialize empty array to prevent filtering errors
                    data = [];
                  }
                }
              } catch (fallbackErr) {
                console.error("Error in special fallback:", fallbackErr);
                // Initialize empty array to prevent filtering errors 
                data = [];
              }
            }
          }
        } catch (fetchError) {
          console.error(`Network error during fetch: ${fetchError}`);
          // For cricket and cycling, attempt to use the tracking service via the tracked endpoint
          if ([9, 14].includes(sportId)) {
            console.warn(`Attempting tracked events fallback for sport ID ${sportId}`);
            try {
              const fallbackResponse = await fetch('/api/events/tracked');
              if (fallbackResponse.ok) {
                const responseData = await fallbackResponse.json();
                
                // Extract the tracked array from the response - handle in safe way
                let trackedEvents = [];
                
                // Check if responseData exists and contains the tracked property
                if (responseData && typeof responseData === 'object') {
                  if (Array.isArray(responseData.tracked)) {
                    trackedEvents = responseData.tracked;
                  } else if (Array.isArray(responseData)) {
                    // Direct array response
                    trackedEvents = responseData;
                  }
                }
                
                console.log(`Tracked events response:`, 
                  `Type: ${typeof trackedEvents}, ` +
                  `Is Array: ${Array.isArray(trackedEvents)}, ` + 
                  `Length: ${Array.isArray(trackedEvents) ? trackedEvents.length : 'N/A'}`
                );
                
                // Safety check (redundant but keeping for robustness)
                if (Array.isArray(trackedEvents)) {
                  // Filter to just get this sport's events
                  data = trackedEvents.filter((event: any) => 
                    event && typeof event === 'object' && Number(event.sportId) === sportId
                  );
                  console.log(`Fallback found ${data.length} events for sport ID ${sportId}`);
                } else {
                  console.warn("Second fallback data is not an array, cannot filter");
                  // Initialize empty array to prevent filtering errors
                  data = [];
                }
              }
            } catch (fallbackError) {
              console.error(`Fallback also failed: ${fallbackError}`);
              // Initialize empty array to prevent filtering errors
              data = [];
            }
          }
        }
        console.log(`Received ${data.length} events for ${sportName}`);
        
        // For NBA/MLB/NHL/NFL sports, try matching with their corresponding mainstream sport IDs as well
        let targetSportIds = [sportId];
        
        // Add mappings for the league-specific sports to their general sport counterparts
        if (sportId === 27) targetSportIds.push(2); // NBA → Basketball 
        if (sportId === 28) targetSportIds.push(5); // NHL → Hockey
        if (sportId === 29) targetSportIds.push(15); // NFL → American Football
        if (sportId === 30) targetSportIds.push(4); // MLB → Baseball
        if (sportId === 26) targetSportIds.push(1); // Soccer → Football
        
        // Special handling for sports with possible data integrity issues
        if ([9, 14].includes(sportId)) { // Cricket, Cycling
          const sportLabel = sportId === 9 ? '🏏 CRICKET' : '🚲 CYCLING';
          console.log(`${sportLabel} PAGE - Validating event data integrity`);
          
          // Log original data for debugging
          console.log('Original data length:', data.length);
          if (data.length > 0 && data[0]) {
            console.log('First event in original data:', 
              `ID: ${data[0].id || 'unknown'}, ` +
              `SportID: ${data[0].sportId || 'unknown'}, ` + 
              `Teams: ${data[0].homeTeam || 'unknown'} vs ${data[0].awayTeam || 'unknown'}, ` +
              `League: ${data[0].leagueName || 'unknown'}`
            );
          }
          
          // Filter out any invalid data entries
          const validatedData = Array.isArray(data) ? data.filter(event => {
            return event && typeof event === 'object';
          }) : [];
          
          console.log(`Filtered ${data.length} events to ${validatedData.length} valid events`);
          
          // For each valid event, ensure it has the essential fields
          const normalizedData = validatedData.map(event => {
            // Different sports have different properties
            if (sportId === 9) { // Cricket
              // Cricket events have teams
              return {
                ...event,
                id: event.id,
                sportId: 9, // Ensure correct cricket ID
                homeTeam: event.homeTeam || event.home || event.team1 || "Team 1",
                awayTeam: event.awayTeam || event.away || event.team2 || "Team 2",
                leagueName: event.leagueName || event.league || event.competition || "Cricket",
                date: event.date || event.startTime || new Date().toISOString(),
                markets: event.markets || [],
                isLive: event.isLive || selectedTab === 'live'
              };
            } else if (sportId === 14) { // Cycling
              // Cycling events may have racers instead of teams
              return {
                ...event,
                id: event.id,
                sportId: 14, // Ensure correct cycling ID
                homeTeam: event.homeTeam || event.racer1 || event.participant1 || event.name || "Cyclist 1",
                awayTeam: event.awayTeam || event.racer2 || event.participant2 || "Cyclist 2",
                leagueName: event.leagueName || event.league || event.competition || event.raceName || "Cycling",
                date: event.date || event.startTime || new Date().toISOString(),
                markets: event.markets || [],
                isLive: event.isLive || selectedTab === 'live'
              };
            }
          }).filter(item => item !== undefined);
          
          console.log(`Validated ${normalizedData.length} events with required fields`);
          return normalizedData;
        }
        
        // Filter data to ensure only events for this sport are shown
        // First ensure data is an array and all items are objects
        let filteredData = [];
        
        try {
          if (!Array.isArray(data)) {
            console.error("Error: data is not an array in filtering step", data);
            data = []; // Set to empty array to avoid errors
          }
          
          filteredData = data.filter((event: any) => {
            // Safety check: make sure event is an object with required properties
            if (!event || typeof event !== 'object') {
              console.warn('Invalid event data encountered during filtering');
              return false;
            }
            
            // Safe sportId extraction with null/undefined handling
            const eventSportId = event.sportId !== undefined && event.sportId !== null
              ? (typeof event.sportId === 'string' ? parseInt(event.sportId, 10) : event.sportId)
              : -1; // Use invalid sport ID if none exists
            
            // Logging for specific sports (for debugging)
            if (sportId === 9) {
              try {
                console.log(`Filtering cricket event: sportId=${eventSportId}, teams=${event.homeTeam || 'Unknown'} vs ${event.awayTeam || 'Unknown'}`);
              } catch (logError) {
                console.warn('Error logging cricket event data');
              }
            }
            
            // Check if this event's sport ID is in our target list
            return targetSportIds.includes(eventSportId);
          });
        } catch (filterError) {
          console.error('Critical error during data filtering:', filterError);
          filteredData = []; // Reset to empty array on error
        }
        
        console.log(`Filtered to ${filteredData.length} events for sportId: ${sportId}`);
        
        if (filteredData.length === 0 && data.length > 0) {
          // If we got data but none matches our sport ID after filtering,
          // it might be that some specific sports like cricket or golf have inconsistent IDs
          console.log(`Warning: Received ${data.length} events but none match sportId ${sportId}`);
          console.log('Sample event sportId from API:', data[0]?.sportId);
          
          // For certain sports that might have special handling or different IDs
          if ([9, 10, 14, 17, 18].includes(sportId)) { // Cricket, Golf, Cycling, Snooker, Darts
            // Use sport name in the title as a fallback filter method
            const sportNames = {
              9: 'cricket',
              10: 'golf',
              14: 'cycling',
              17: 'snooker',
              18: 'darts'
            };
            
            // Create a safer filtering function with null checks
            let nameFilteredData = [];
            
            try {
              // Make sure data is an array before filtering
              if (!Array.isArray(data)) {
                console.error("Error: data is not an array in name filtering", data);
                data = [];
              }
              
              nameFilteredData = data.filter((event: any) => {
                try {
                  // Guard against invalid event objects
                  if (!event || typeof event !== 'object') {
                    return false;
                  }
                  
                  // Safely build the title with null/undefined checks
                  const homeTeam = event.homeTeam || '';
                  const awayTeam = event.awayTeam || '';
                  const leagueName = event.leagueName || '';
                  
                  const eventTitle = `${homeTeam} vs ${awayTeam} ${leagueName}`.toLowerCase();
                  const sportKeyword = sportNames[sportId as keyof typeof sportNames];
                  
                  // Check if the sport name is in the event title
                  return eventTitle.includes(sportKeyword);
                } catch (itemError) {
                  console.warn('Error filtering by name:', itemError);
                  return false;
                }
              });
            } catch (filterError) {
              console.error('Error during name filtering:', filterError);
              nameFilteredData = [];
            }
            
            if (nameFilteredData.length > 0) {
              console.log(`Found ${nameFilteredData.length} events by name filtering for ${sportName}`);
              return nameFilteredData;
            }
          }
          
          // If all else fails, return unfiltered data with safety checks
          console.log(`Using unfiltered data for ${sportName} as fallback`);
          
          try {
            // Make sure data is an array before slicing
            if (!Array.isArray(data)) {
              console.error("Error: data is not an array when using as fallback", data);
              return []; // Return empty array if data is not valid
            }
            
            // Do basic validation on each item to ensure they're valid event objects
            const validatedData = data.filter(event => 
              event && typeof event === 'object' && 
              (event.id || event.eventId) && // Must have some form of ID
              (event.homeTeam || event.home || event.team1) // Must have at least one team
            );
            
            console.log(`Found ${validatedData.length} valid events in unfiltered data`);
            return validatedData.slice(0, 20); // Limit to 20 events to avoid overwhelming display
          } catch (error) {
            console.error("Error processing unfiltered data:", error);
            return []; // Return empty array on error
          }
        }
        
        // For Tennis and other non-football sports, adapt the data structure but don't replace real API data
        if (sportId === 3) { // Tennis
          console.log(`Adapting ${filteredData.length} events for tennis`);
          
          // Just modify market types and remove draw odds for tennis
          const adaptedEvents = filteredData.map((event: any) => {
            return {
              ...event,
              drawOdds: null, // Tennis has no draws
              // Convert any "Match Result" markets to "Match Winner" for tennis terminology
              markets: event.markets?.map((market: any) => {
                if (market.name === "Match Result") {
                  return {
                    ...market,
                    name: "Match Winner",
                    // Remove "Draw" outcome for tennis
                    outcomes: market.outcomes.filter((outcome: any) => 
                      outcome.name !== "Draw"
                    )
                  };
                }
                // Rename "Total Goals" to "Total Games" for tennis 
                else if (market.name === "Total Goals" || market.name === "Over/Under 2.5 Goals") {
                  return {
                    ...market,
                    name: "Total Games",
                    outcomes: [
                      { ...market.outcomes[0], name: "Over 22.5" },
                      { ...market.outcomes[1], name: "Under 22.5" }
                    ]
                  };
                }
                return market;
              }) || []
            };
          });
          
          console.log(`Adapted ${adaptedEvents.length} events for tennis display`);
          return adaptedEvents;
        } 
        else if (sportId === 2) { // Basketball
          // Basketball has specific market types like total points
          const sportSpecificData = filteredData.map((event: any) => {
            return {
              ...event,
              isMapped: true,
              markets: event.markets?.map((market: any) => {
                if (market.name === "Over/Under 2.5 Goals") {
                  return {
                    ...market,
                    name: "Total Points",
                    outcomes: [
                      { ...market.outcomes[0], name: "Over 195.5" },
                      { ...market.outcomes[1], name: "Under 195.5" }
                    ]
                  };
                }
                return market;
              }) || []
            };
          });
          
          console.log(`Modified ${sportSpecificData.length} basketball events to match sport-specific format`);
          return sportSpecificData;
        }
        
        console.log(`Returning ${filteredData.length} filtered events for sportId: ${sportId}`);
        return filteredData;
      } catch (error) {
        console.error(`Error fetching events for ${sportName}:`, error);
        toast({
          title: 'Error Fetching Events',
          description: `Failed to load ${selectedTab} events for ${sportName}`,
          variant: 'destructive',
        });
        return [];
      }
    },
    enabled: !!sportId,
    refetchInterval: selectedTab === 'live' ? 15000 : 60000 // Refresh more frequently for live events
  });
  
  // Format odds in American format
  const formatOdds = (odds: number) => {
    if (!odds) return '-';
    return odds > 0 ? `+${odds}` : odds;
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Handle refresh button click
  const handleRefresh = () => {
    refetch();
    toast({
      title: 'Refreshing Events',
      description: `Getting the latest ${selectedTab} events for ${sportName}`,
    });
  };
  
  if (isError) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <Card className="w-full max-w-md bg-[#0f1c1f] border-[#1e3a3f]">
            <CardHeader className="bg-[#112225] border-b border-[#1e3a3f]">
              <CardTitle className="text-red-400">
                <div className="flex items-center">
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Connection Issue
                </div>
              </CardTitle>
              <CardDescription className="text-gray-400">
                Having trouble connecting to {sportName} data
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-4 p-3 bg-[#0b1618] border border-[#1e3a3f] rounded-md text-gray-300">
                <p className="mb-2">We're currently having trouble loading the latest {sportName} events. Our team is working on it.</p>
                <p>You can try refreshing or check out other sports while we fix this.</p>
              </div>
              <div className="flex justify-between">
                <Button 
                  onClick={() => refetch()} 
                  className="bg-cyan-500 hover:bg-cyan-600 text-black"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Link href="/">
                  <Button variant="outline" className="border-cyan-400 text-cyan-400 hover:bg-cyan-400/10">
                    Return to Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  if (!match) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Sport Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The sport you're looking for doesn't exist or is not supported.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Sport-specific background gradient
  const getSportGradient = () => {
    switch (params.sport) {
      case 'football':
      case 'soccer':
        return 'bg-gradient-to-b from-[#09181B] to-[#112225]';
      case 'basketball':
        return 'bg-gradient-to-b from-[#09181B] to-[#112225]';
      case 'tennis':
        return 'bg-gradient-to-b from-[#09181B] to-[#112225]';
      case 'baseball':
        return 'bg-gradient-to-b from-[#09181B] to-[#112225]';
      case 'hockey':
        return 'bg-gradient-to-b from-[#09181B] to-[#112225]';
      case 'formula-1':
        return 'bg-gradient-to-b from-[#09181B] to-[#112225]';
      case 'esports':
        return 'bg-gradient-to-b from-[#09181B] to-[#112225]';
      default:
        return 'bg-gradient-to-b from-[#09181B] to-[#112225]';
    }
  };

  return (
    <div className={`${getSportGradient()} text-white min-h-screen`}>
      <div className="container py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div className="mb-4 md:mb-0">
            <div className="flex items-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.history.back()}
                className="mr-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                <span className="ml-1">Back</span>
              </Button>
              <h1 className="text-3xl font-bold text-cyan-400">
                {sportName}
                {sportId === 9 && <span className="ml-2">🏏</span>}
              </h1>
            </div>
            <p className="text-muted-foreground mt-1 ml-1">
              {selectedTab === 'live' ? 'Live matches happening now' : 'Upcoming scheduled matches'}
              {sportId === 9 && ' - Cricket Matches'}
            </p>
            <div className="h-1 w-24 bg-cyan-400 mt-2 rounded-full"></div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center border-cyan-400 text-cyan-400 hover:bg-cyan-400/10 shadow-lg shadow-cyan-900/20"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>

        <Tabs
          defaultValue="live"
          value={selectedTab}
          onValueChange={(value) => setSelectedTab(value as 'live' | 'upcoming')}
          className="mb-6"
        >
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-[#0b1618] border-[#1e3a3f] shadow-lg shadow-cyan-900/10">
            <TabsTrigger 
              value="live" 
              className="data-[state=active]:bg-cyan-400 data-[state=active]:text-black data-[state=active]:font-bold"
            >
              Live Matches
            </TabsTrigger>
            <TabsTrigger 
              value="upcoming" 
              className="data-[state=active]:bg-cyan-400 data-[state=active]:text-black data-[state=active]:font-bold"
            >
              Upcoming
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={selectedTab} className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="pb-2">
                      <div className="h-5 bg-muted rounded w-3/4"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-20 bg-muted rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : events.length === 0 ? (
              <Card className="border border-[#1e3a3f] shadow-xl shadow-cyan-900/10 bg-gradient-to-b from-[#112225] to-[#14292e]">
                <CardHeader className="pb-3 bg-gradient-to-r from-[#0b1618] to-[#0f1d20] relative border-b border-[#1e3a3f]">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
                  <CardTitle className="text-cyan-400">No {selectedTab} events found</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="h-8 w-1 bg-cyan-400 rounded-full"></div>
                    <p className="text-cyan-100">
                      There are currently no {selectedTab} {sportName.toLowerCase()} matches available.
                      {selectedTab === 'live' 
                        ? ' Check back later or view upcoming matches.' 
                        : ' Check back later for updates.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {events.map((event: any) => (
                  <Card 
                    key={event.id} 
                    className={`overflow-hidden border ${sportId === 9 ? 'border-cyan-500/30' : 'border-[#1e3a3f]'} 
                      shadow-xl ${sportId === 9 ? 'shadow-cyan-900/20' : 'shadow-cyan-900/10'} 
                      bg-gradient-to-b ${sportId === 9 ? 'from-[#122630] to-[#14292e]' : 'from-[#112225] to-[#14292e]'}`}
                  >
                    <CardHeader 
                      className={`pb-3 bg-gradient-to-r ${sportId === 9 
                        ? 'from-[#0c1a1e] to-[#102228]' 
                        : 'from-[#0b1618] to-[#0f1d20]'} 
                        relative border-b ${sportId === 9 ? 'border-cyan-500/30' : 'border-[#1e3a3f]'}`}
                    >
                      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${
                        sportId === 9 
                          ? 'from-cyan-400 to-cyan-300 opacity-80' 
                          : 'from-cyan-400 to-blue-500 opacity-70'
                      }`}></div>
                      {/* Cricket badge for cricket events */}
                      {sportId === 9 && event._isCricket && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/50">
                            🏏 Cricket
                          </Badge>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="text-lg flex items-center">
                            <span className="text-cyan-300">{event.leagueName || 'League'}</span>
                            {selectedTab === 'live' && (
                              <Badge className="ml-2 bg-gradient-to-r from-red-600 to-red-500 animate-pulse">
                                <span>
                                  LIVE
                                </span>
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="flex items-center text-sm mt-1">
                            <span>
                              {selectedTab === 'live' 
                                ? 'In Progress' 
                                : formatDate(event.startTime)}
                            </span>
                          </CardDescription>
                        </div>
                        {(event.homeScore !== undefined && event.awayScore !== undefined) && (
                          <div className="text-right">
                            <div className="text-sm font-medium text-cyan-400">Score</div>
                            <div className="text-xl font-bold bg-[#0b1618] py-1 px-3 rounded-lg border border-[#1e3a3f]">
                              {event.homeScore} - {event.awayScore}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Home Team */}
                        <div className="flex flex-col items-center justify-center">
                          <div className="text-center mb-2 bg-[#0b1618] p-2 rounded-lg border border-[#1e3a3f] w-full">
                            <div className="font-bold text-cyan-300">{event.homeTeam}</div>
                            <div className="text-sm text-muted-foreground">Home</div>
                          </div>
                          <Button 
                            variant="outline"
                            className="w-full mt-2 border-[#1e3a3f] bg-[#14292e] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 shadow-lg shadow-cyan-900/10 text-lg font-bold"
                            data-event-id={event.id}
                            data-outcome="home"
                            data-odd={event.homeOdds}
                            data-team={event.homeTeam}
                            data-match-title={`${event.homeTeam} vs ${event.awayTeam}`}
                          >
                            {formatOdds(event.homeOdds)}
                          </Button>
                        </div>
                        
                        {/* Draw (if applicable) */}
                        <div className="flex flex-col items-center justify-center">
                          <div className="text-center mb-2 bg-[#0b1618] p-2 rounded-lg border border-[#1e3a3f] w-full">
                            <div className="font-bold text-gray-300">Draw</div>
                            <div className="text-sm text-muted-foreground">Tie</div>
                          </div>
                          {event.drawOdds !== null ? (
                            <Button 
                              variant="outline" 
                              className="w-full mt-2 border-[#1e3a3f] bg-[#14292e] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 shadow-lg shadow-cyan-900/10 text-lg font-bold"
                              data-event-id={event.id}
                              data-outcome="draw"
                              data-odd={event.drawOdds}
                              data-team="Draw"
                              data-match-title={`${event.homeTeam} vs ${event.awayTeam}`}
                            >
                              {formatOdds(event.drawOdds)}
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              className="w-full mt-2 opacity-50 bg-[#0b1618] border-[#1e3a3f]"
                              disabled
                            >
                              N/A
                            </Button>
                          )}
                        </div>
                        
                        {/* Away Team */}
                        <div className="flex flex-col items-center justify-center">
                          <div className="text-center mb-2 bg-[#0b1618] p-2 rounded-lg border border-[#1e3a3f] w-full">
                            <div className="font-bold text-cyan-300">{event.awayTeam}</div>
                            <div className="text-sm text-muted-foreground">Away</div>
                          </div>
                          <Button 
                            variant="outline" 
                            className="w-full mt-2 border-[#1e3a3f] bg-[#14292e] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 shadow-lg shadow-cyan-900/10 text-lg font-bold"
                            data-event-id={event.id}
                            data-outcome="away"
                            data-odd={event.awayOdds}
                            data-team={event.awayTeam}
                            data-match-title={`${event.homeTeam} vs ${event.awayTeam}`}
                          >
                            {formatOdds(event.awayOdds)}
                          </Button>
                        </div>
                      </div>
                      
                      {/* Additional betting markets based on sport type */}
                      <div className="mt-8 border-t border-[#1e3a3f] pt-6">
                        <div className="mb-4 flex items-center">
                          <div className="h-8 w-1 bg-cyan-400 rounded-full mr-3"></div>
                          <h3 className="text-xl font-bold text-cyan-400">All Betting Markets</h3>
                          <div className="ml-auto">
                            <Badge 
                              className="bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-bold hover:from-cyan-500 hover:to-blue-600"
                            >
                              {params.sport.toUpperCase()} BETS
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Use SimpleMarkets component to display all available markets */}
                        <div className={`betting-markets bg-gradient-to-b ${
                          sportId === 9 
                            ? 'from-[#15303c] to-[#112a33]' 
                            : 'from-[#14292e] to-[#112225]'
                          } p-4 rounded-lg border ${
                          sportId === 9 
                            ? 'border-cyan-500/30' 
                            : 'border-[#1e3a3f]'
                          } shadow-lg shadow-cyan-900/10`}
                        >
                          {/* Show cricket-specific markets if available */}
                          {sportId === 9 && event.markets && event.markets.some(m => m.name === 'Top Batsman') && (
                            <div className="mb-6 pb-5 border-b border-cyan-500/20">
                              <h4 className="text-lg font-semibold text-cyan-300 mb-3 flex items-center">
                                <span className="mr-2">🏏</span> Cricket-Specific Markets
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {event.markets
                                  .filter(m => ['Top Batsman', 'Total Runs'].includes(m.name))
                                  .map((market, idx) => (
                                    <div key={`cricket-market-${idx}`} className="bg-[#0c1a1e] p-3 rounded-lg border border-cyan-500/20">
                                      <div className="text-cyan-300 font-medium mb-2">{market.name}</div>
                                      <div className="grid grid-cols-2 gap-2">
                                        {market.outcomes.map((outcome, i) => (
                                          <Button
                                            key={`outcome-${i}`}
                                            variant="outline"
                                            size="sm"
                                            className="border-cyan-500/30 bg-[#112225] hover:bg-cyan-500/10"
                                            data-event-id={event.id}
                                            data-market-id={market.id}
                                            data-outcome-id={outcome.id}
                                          >
                                            <div className="flex w-full justify-between items-center">
                                              <span className="text-sm">{outcome.name}</span>
                                              <span className="text-cyan-300 font-bold">{formatOdds(outcome.odds)}</span>
                                            </div>
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                  ))
                                }
                              </div>
                            </div>
                          )}
                        
                          <SimpleMarkets
                            sportType={params.sport}
                            eventId={event.id}
                            eventName={`${event.homeTeam} vs ${event.awayTeam}`}
                            homeTeam={event.homeTeam}
                            awayTeam={event.awayTeam}
                            homeOdds={event.homeOdds}
                            drawOdds={event.drawOdds}
                            awayOdds={event.awayOdds}
                            isLive={event.isLive}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}