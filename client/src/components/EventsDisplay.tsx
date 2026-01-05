import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatOddsDisplay, isLiveEvent } from '@/utils/oddsFormatter';
import { Clock } from 'lucide-react';

interface Event {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league?: string;
  leagueName?: string;
  sport?: string;
  sportId?: number;
  status?: string;
  date?: string;
  startTime?: string;
  venue?: string;
  homeScore?: number;
  awayScore?: number;
  isLive?: boolean;
  odds?: {
    homeWin?: number;
    awayWin?: number;
    draw?: number;
    home?: number;
    away?: number;
  };
  score?: {
    home?: number;
    away?: number;
  };
}

interface EventsDisplayProps {
  sportId: number;
  sportName: string;
  selectedTab: 'live' | 'upcoming';
}

export function EventsDisplay({ sportId, sportName, selectedTab }: EventsDisplayProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`Fetching ${selectedTab} events for ${sportName} (ID: ${sportId})`);
        
        // Fetch events with proper filters
        const url = `/api/events?sportId=${sportId}&isLive=${selectedTab === 'live'}`;
        console.log(`Fetching from: ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch events: ${response.status}`);
        }
        
        const allEvents = await response.json();
        console.log(`Received ${allEvents.length} authentic ${selectedTab} events for ${sportName}`);
        
        // Process and fix event data
        let filteredEvents = allEvents;
        
        if (sportId === 1) {
          // For soccer, include all football/soccer events
          filteredEvents = allEvents.filter((event: Event) => 
            event.sportId === 1 || 
            event.sport?.toLowerCase().includes('soccer') ||
            event.sport?.toLowerCase().includes('football') ||
            event.league?.toLowerCase().includes('premier') ||
            event.league?.toLowerCase().includes('bundesliga') ||
            event.league?.toLowerCase().includes('serie') ||
            event.league?.toLowerCase().includes('liga') ||
            event.league?.toLowerCase().includes('championship')
          );
        } else {
          filteredEvents = allEvents.filter((event: Event) => event.sportId === sportId);
        }
        
        console.log(`[DIRECT] Found ${filteredEvents.length} events for ${sportName}`);
        setEvents(filteredEvents);
        
      } catch (err) {
        console.error('[DIRECT] Failed to fetch events:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
    
    // Refresh every 30 seconds for live events
    const interval = selectedTab === 'live' ? setInterval(fetchEvents, 30000) : null;
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sportId, sportName, selectedTab]);

  const formatOdds = (odds: number) => {
    if (odds > 0) return `+${odds}`;
    return odds.toString();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="border border-[#1e3a3f] bg-gradient-to-b from-[#112225] to-[#14292e] animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border border-red-500/30 bg-gradient-to-b from-red-900/20 to-red-800/10">
        <CardHeader>
          <CardTitle className="text-red-400">Error Loading Events</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-300">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-red-600 hover:bg-red-700"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="border border-[#1e3a3f] shadow-xl shadow-cyan-900/10 bg-gradient-to-b from-[#112225] to-[#14292e]">
        <CardHeader className="pb-3 bg-gradient-to-r from-[#0b1618] to-[#0f1d20] relative border-b border-[#1e3a3f]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-400">No {selectedTab} events found</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <p className="text-gray-400">
              No {selectedTab} {sportName.toLowerCase()} events are currently available.
            </p>
            <p className="text-sm text-gray-500">
              Check back later for updated event listings.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {events.map((event: Event) => (
        <Card 
          key={event.id} 
          className="overflow-hidden border border-[#1e3a3f] shadow-xl shadow-cyan-900/10 bg-gradient-to-b from-[#112225] to-[#14292e] hover:shadow-cyan-900/20 transition-all duration-300"
        >
          <CardHeader className="pb-3 bg-gradient-to-r from-[#0b1618] to-[#0f1d20] relative border-b border-[#1e3a3f]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
            
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg font-bold text-cyan-400 mb-1">
                  {event.homeTeam} vs {event.awayTeam}
                </CardTitle>
                {event.league && (
                  <p className="text-sm text-gray-400">{event.league}</p>
                )}
              </div>
              
              <div className="flex flex-col items-end space-y-1">
                {event.status && (
                  <Badge 
                    variant={event.status.toLowerCase().includes('live') ? 'default' : 'secondary'}
                    className={event.status.toLowerCase().includes('live') ? 'bg-red-600 text-white' : ''}
                  >
                    {event.status}
                  </Badge>
                )}
                {event.date && (
                  <span className="text-xs text-gray-500">
                    {new Date(event.date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Score Display */}
              {(event.homeScore !== undefined || event.awayScore !== undefined) && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-cyan-300">Score</h4>
                  <div className="flex justify-between items-center bg-[#0f1d20] rounded-lg p-3 border border-[#1e3a3f]">
                    <span className="text-white">{event.homeTeam}</span>
                    <span className="text-lg font-bold text-cyan-400">{event.homeScore || 0}</span>
                  </div>
                  <div className="flex justify-between items-center bg-[#0f1d20] rounded-lg p-3 border border-[#1e3a3f]">
                    <span className="text-white">{event.awayTeam}</span>
                    <span className="text-lg font-bold text-cyan-400">{event.awayScore || 0}</span>
                  </div>
                </div>
              )}

              {/* Odds Display */}
              {event.odds && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-cyan-300">Betting Odds</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {event.odds.home && (
                      <div className="bg-[#0f1d20] rounded-lg p-3 border border-[#1e3a3f] text-center">
                        <div className="text-xs text-gray-400">Home</div>
                        <div className="text-lg font-bold text-green-400">{formatOdds(event.odds.home)}</div>
                      </div>
                    )}
                    {event.odds.away && (
                      <div className="bg-[#0f1d20] rounded-lg p-3 border border-[#1e3a3f] text-center">
                        <div className="text-xs text-gray-400">Away</div>
                        <div className="text-lg font-bold text-green-400">{formatOdds(event.odds.away)}</div>
                      </div>
                    )}
                    {event.odds.draw && (
                      <div className="bg-[#0f1d20] rounded-lg p-3 border border-[#1e3a3f] text-center col-span-2">
                        <div className="text-xs text-gray-400">Draw</div>
                        <div className="text-lg font-bold text-green-400">{formatOdds(event.odds.draw)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-[#1e3a3f]">
              <Button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white">
                Place Bet
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}