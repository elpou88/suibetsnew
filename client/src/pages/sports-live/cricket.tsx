import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Clock, CalendarIcon, RefreshCw, Loader2 } from 'lucide-react';
import SimpleMarkets from '@/components/betting/SimpleMarkets';

// Cricket specific page to handle cricket events correctly
export default function CricketPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<'live' | 'upcoming'>('live');
  
  // Use direct API service for cricket
  const { 
    data: events = [], 
    isLoading, 
    isError,
    refetch 
  } = useQuery({
    queryKey: ['/api/events/cricket', { isLive: selectedTab === 'live' }],
    queryFn: async () => {
      try {
        // First, try the dedicated cricket endpoint
        console.log(`Fetching cricket data from dedicated endpoint (${selectedTab})`);
        
        // Setting up AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        try {
          // Use dedicated endpoint first
          const cricketResponse = await fetch('/api/events/cricket', {
            signal: controller.signal,
            method: 'GET',
            headers: {},
            credentials: 'include',
          });
          
          clearTimeout(timeoutId);
          
          if (cricketResponse.ok) {
            const cricketData = await cricketResponse.json();
            console.log(`Success! Received ${cricketData.length} cricket events from dedicated endpoint`);
            
            if (Array.isArray(cricketData) && cricketData.length > 0) {
              // Filter for live/upcoming based on tab
              const filteredData = selectedTab === 'live'
                ? cricketData.filter((event: any) => event.isLive || event.status === 'live' || event.status === 'in_play')
                : cricketData.filter((event: any) => !event.isLive && event.status !== 'live' && event.status !== 'in_play');
              
              console.log(`Filtered to ${filteredData.length} ${selectedTab} cricket events`);
              if (filteredData.length > 0) {
                return filteredData;
              }
            }
          }
        } catch (dedicatedError: any) {
          console.warn(`Cricket dedicated endpoint error: ${dedicatedError.message}`);
          // Continue to fallback
        }
        
        // Fallback to normal endpoint with sportId
        console.log("Trying standard API with sportId=9");
        const isLiveParam = selectedTab === 'live' ? '&isLive=true' : '';
        const url = `/api/events?sportId=9${isLiveParam}`;
        
        // New controller for this request
        const fallbackController = new AbortController();
        const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 8000);
        
        try {
          const response = await fetch(url, {
            signal: fallbackController.signal,
            method: 'GET',
            headers: {},
            credentials: 'include',
          });
          
          clearTimeout(fallbackTimeoutId);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`Standard endpoint returned ${data.length} events`);
            
            // Filter to ensure only cricket events
            const cricketEvents = data.filter((event: any) => {
              return Number(event.sportId) === 9;
            });
            
            console.log(`Filtered to ${cricketEvents.length} cricket events`);
            
            if (cricketEvents.length > 0) {
              return cricketEvents;
            }
          }
        } catch (standardError: any) {
          console.warn(`Standard API error: ${standardError.message}`);
          // Continue to next fallback
        }
        
        // Last resort - try tracked events API
        console.log("Trying tracked events API as final fallback");
        try {
          const trackedResponse = await fetch('/api/events/tracked');
          if (trackedResponse.ok) {
            const responseData = await trackedResponse.json();
            
            // Extract the tracked array from the response - handle in safe way
            let trackedData = [];
            
            // Check if responseData exists and contains the tracked property
            if (responseData && typeof responseData === 'object') {
              if (Array.isArray(responseData.tracked)) {
                trackedData = responseData.tracked;
              } else if (Array.isArray(responseData)) {
                // Direct array response
                trackedData = responseData;
              }
            }
            
            console.log(`Tracked events response:`,
              `Type: ${typeof trackedData},`,
              `Is Array: ${Array.isArray(trackedData)},`,
              `Length: ${Array.isArray(trackedData) ? trackedData.length : 'N/A'}`
            );
            
            if (Array.isArray(trackedData) && trackedData.length > 0) {
              // Filter to cricket events only with added safety checks
              const cricketEvents = trackedData.filter((event: any) => 
                event && 
                typeof event === 'object' && 
                Number(event.sportId) === 9
              );
              
              console.log(`Found ${cricketEvents.length} cricket events in tracked data`);
              
              // Then filter by live status if needed with added safety checks
              const filteredEvents = selectedTab === 'live'
                ? cricketEvents.filter((event: any) => 
                    event && 
                    (event.isLive === true || 
                     event.status === 'live' || 
                     event.status === 'in_play')
                  )
                : cricketEvents.filter((event: any) => 
                    event && 
                    event.isLive !== true && 
                    event.status !== 'live' && 
                    event.status !== 'in_play'
                  );
              
              console.log(`Tracked API fallback found ${filteredEvents.length} cricket events after status filtering`);
              
              if (filteredEvents.length > 0) {
                return filteredEvents;
              }
            } else {
              console.warn("No valid tracked events data found or empty array returned");
            }
          } else {
            console.warn(`Tracked API request failed with status: ${trackedResponse.status}`);
          }
        } catch (trackedError) {
          console.error(`Tracked API fallback failed: ${trackedError}`);
        }
        
        // If we've gotten here, no data was found, return empty array
        console.warn("All cricket data sources failed, returning empty array");
        return [];
      } catch (error) {
        console.error(`Error fetching cricket events:`, error);
        toast({
          title: 'Error Fetching Cricket Events',
          description: 'Could not fetch cricket events. Please try again later.',
          variant: 'destructive',
        });
        return [];
      }
    },
    refetchInterval: 60000, // Refresh every minute
    retry: 2,
    retryDelay: 1000,
  });

  // Get background gradient for cricket
  const getBgGradient = () => {
    return 'bg-gradient-to-r from-[#112225] to-[#1e3a3f]';
  };

  if (isError) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <Card className="w-full max-w-md bg-[#0f1c1f] border-[#1e3a3f]">
            <CardHeader className="bg-[#112225] border-b border-[#1e3a3f]">
              <CardTitle className="text-red-400">
                Error Loading Cricket Events
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-cyan-200 mb-4">
                Unable to load cricket events. Please try again later.
              </p>
              <Button
                variant="default"
                onClick={() => refetch()}
                className="bg-cyan-700 hover:bg-cyan-600 text-white"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={`${getBgGradient()} text-white min-h-screen`}>
      <div className="container py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div className="mb-4 md:mb-0">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-cyan-400">Cricket</h1>
              <Badge className="ml-3 bg-cyan-700 text-white">🏏 Specialty Sport</Badge>
            </div>
            <p className="text-cyan-200 mt-2">
              {selectedTab === 'live' 
                ? 'Live cricket matches with real-time updates and odds.' 
                : 'Upcoming cricket matches with the latest odds.'}
            </p>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
              className="border-cyan-700 text-cyan-400 hover:bg-cyan-900 hover:text-cyan-300"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button 
              variant="default" 
              size="sm"
              onClick={() => setLocation('/home-real')}
              className="bg-cyan-700 hover:bg-cyan-600 text-white"
            >
              Back to Home
            </Button>
          </div>
        </div>
        
        <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as 'live' | 'upcoming')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-[#0f1c1f] border border-[#1e3a3f]">
            <TabsTrigger 
              value="live" 
              className="data-[state=active]:bg-cyan-800 data-[state=active]:text-cyan-100"
            >
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"></div>
                Live Matches
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="upcoming" 
              className="data-[state=active]:bg-cyan-800 data-[state=active]:text-cyan-100"
            >
              <div className="flex items-center">
                <CalendarIcon className="mr-2 h-4 w-4" />
                Upcoming
              </div>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="live" className="mt-0">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="flex flex-col items-center">
                  <Loader2 className="h-12 w-12 animate-spin text-cyan-400 mb-4" />
                  <p className="text-cyan-200">Loading live cricket matches...</p>
                </div>
              </div>
            ) : events.length === 0 ? (
              <div className="border border-[#1e3a3f] rounded-lg bg-[#0f1c1f] p-8 text-center">
                <p className="text-lg text-cyan-200 mb-2">No live cricket matches at the moment</p>
                <p className="text-sm text-gray-400">Check back later or view upcoming matches</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {events.map((event: any) => (
                  <Card key={event.id} className="bg-[#0f1c1f] border-[#1e3a3f] overflow-hidden">
                    <CardHeader className="bg-[#112225] border-b border-[#1e3a3f] pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-cyan-400 text-lg flex items-center">
                            {event.homeTeam} vs {event.awayTeam}
                            <Badge variant="outline" className="ml-2 border-red-500 text-red-400">LIVE</Badge>
                          </CardTitle>
                          <CardDescription className="text-cyan-200">
                            {event.leagueName || 'Cricket Match'} • {event.format || 'T20'}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-red-400 font-medium">{event.status || 'In Play'}</div>
                          <div className="text-cyan-200 text-sm">{event.score || 'Score pending'}</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <SimpleMarkets 
                        sportType="cricket"
                        eventId={event.id}
                        eventName={`${event.homeTeam} vs ${event.awayTeam}`}
                        homeTeam={event.homeTeam}
                        awayTeam={event.awayTeam}
                        homeOdds={event.homeOdds || 2.0}
                        drawOdds={event.drawOdds || 3.2}
                        awayOdds={event.awayOdds || 2.5}
                        isLive={true}
                        event={event}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="upcoming" className="mt-0">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="flex flex-col items-center">
                  <Loader2 className="h-12 w-12 animate-spin text-cyan-400 mb-4" />
                  <p className="text-cyan-200">Loading upcoming cricket matches...</p>
                </div>
              </div>
            ) : events.length === 0 ? (
              <div className="border border-[#1e3a3f] rounded-lg bg-[#0f1c1f] p-8 text-center">
                <p className="text-lg text-cyan-200 mb-2">No upcoming cricket matches found</p>
                <p className="text-sm text-gray-400">Check back later for new matches</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {events.map((event: any) => (
                  <Card key={event.id} className="bg-[#0f1c1f] border-[#1e3a3f] overflow-hidden">
                    <CardHeader className="bg-[#112225] border-b border-[#1e3a3f] pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-cyan-400 text-lg">
                            {event.homeTeam} vs {event.awayTeam}
                          </CardTitle>
                          <CardDescription className="text-cyan-200">
                            {event.leagueName || 'Cricket Match'} • {event.format || 'T20'}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-cyan-400 font-medium flex items-center justify-end">
                            <Clock className="h-4 w-4 mr-1" />
                            {new Date(event.startTime).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div className="text-cyan-200 text-sm">{event.venue || 'Venue TBD'}</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <SimpleMarkets 
                        sportType="cricket"
                        eventId={event.id}
                        eventName={`${event.homeTeam} vs ${event.awayTeam}`}
                        homeTeam={event.homeTeam}
                        awayTeam={event.awayTeam}
                        homeOdds={event.homeOdds || 2.0}
                        drawOdds={event.drawOdds || 3.2}
                        awayOdds={event.awayOdds || 2.5}
                        isLive={false}
                        event={event}
                      />
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