import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, SignalIcon, AlertCircle } from 'lucide-react';

interface LiveScoreEvent {
  id: string;
  sportId: number;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  score: string;
  status: string;
  startTime: string;
  leagueName?: string;
}

interface LiveScoreProps {
  sport?: string;
  onScoreUpdate?: (event: LiveScoreEvent) => void;
  className?: string;
}

const LiveScoreUpdates: React.FC<LiveScoreProps> = ({ 
  sport = 'all',
  onScoreUpdate,
  className = ''
}) => {
  const [events, setEvents] = useState<LiveScoreEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  // Format the WebSocket URL based on current location
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Use window.location.host which includes port on Replit, fallback to localhost:5000
    const host = window.location.host && window.location.host !== 'localhost' 
      ? window.location.host 
      : 'localhost:5000';
    return `${protocol}//${host}/ws`;
  }, []);

  // Set up WebSocket connection
  useEffect(() => {
    // Don't start a connection if we already have one
    if (socketRef.current) return;

    // Create WebSocket connection
    const socket = new WebSocket(getWebSocketUrl());
    socketRef.current = socket;

    // Connection opened
    socket.addEventListener('open', () => {
      console.log('WebSocket connection established');
      setIsConnected(true);
      setIsLoading(false);
      
      // Subscribe to the specified sport or 'all'
      socket.send(JSON.stringify({
        type: 'subscribe',
        sports: sport === 'all' ? ['all'] : [sport]
      }));
      
      // Request initial live events
      socket.send(JSON.stringify({
        type: 'request',
        request: 'live_events',
        sport
      }));
      
      // Show a notification
      toast({
        title: 'Live Updates Connected',
        description: `You're now receiving live score updates${sport !== 'all' ? ` for ${sport}` : ''}`,
        duration: 3000
      });
    });

    // Listen for messages
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
        // Handle different message types
        switch (data.type) {
          case 'score_update':
            // Merge new events with existing ones
            setEvents(currentEvents => {
              // Create a map for faster lookups
              const eventMap = new Map(currentEvents.map(e => [e.id, e]));
              
              // Update or add new events
              data.events.forEach((newEvent: LiveScoreEvent) => {
                eventMap.set(newEvent.id, newEvent);
                
                // Call the callback if provided
                if (onScoreUpdate) {
                  onScoreUpdate(newEvent);
                }
                
                // Show a toast for score changes
                const existingEvent = currentEvents.find(e => e.id === newEvent.id);
                if (existingEvent && existingEvent.score !== newEvent.score) {
                  toast({
                    title: 'Score Update',
                    description: `${newEvent.homeTeam} vs ${newEvent.awayTeam}: ${newEvent.score}`,
                    duration: 3000
                  });
                }
              });
              
              // Convert map back to array and sort by status (live first) and then by start time
              return Array.from(eventMap.values())
                .sort((a, b) => {
                  // Live events first
                  if (a.status === 'live' && b.status !== 'live') return -1;
                  if (a.status !== 'live' && b.status === 'live') return 1;
                  
                  // Then sort by start time
                  return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
                });
            });
            break;
            
          case 'live_events':
            // Set initial live events
            setEvents(data.events);
            break;
            
          case 'error':
            console.error('WebSocket error:', data.message);
            setError(data.message);
            break;
            
          case 'connection':
            console.log('WebSocket connection status:', data.status);
            break;
            
          case 'subscription':
            console.log('WebSocket subscription updated:', data.subscription);
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    // Connection closed
    socket.addEventListener('close', () => {
      console.log('WebSocket connection closed');
      setIsConnected(false);
      
      // Show a notification
      toast({
        title: 'Live Updates Disconnected',
        description: 'Connection to live score updates has been lost',
        variant: 'destructive',
        duration: 5000
      });
      
      // Attempt to reconnect after a delay
      setTimeout(() => {
        socketRef.current = null;
        // This will trigger the useEffect again and reconnect
      }, 5000);
    });

    // Connection error
    socket.addEventListener('error', (event) => {
      console.error('WebSocket error:', event);
      setError('Failed to connect to live score updates');
      setIsLoading(false);
    });

    // Clean up on unmount
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [getWebSocketUrl, sport, toast, onScoreUpdate]);

  // Render component
  return (
    <div className={`live-score-updates ${className}`}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Live Score Updates
          </CardTitle>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                <SignalIcon className="h-3 w-3 mr-1" />
                <span>Live</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                <AlertCircle className="h-3 w-3 mr-1" />
                <span>Disconnected</span>
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Connecting to live updates...</span>
            </div>
          ) : error ? (
            <div className="bg-destructive/10 text-destructive rounded-md p-3">
              <AlertCircle className="h-4 w-4 inline-block mr-2" />
              <span className="text-sm">{error}</span>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No live events found at the moment
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">{event.leagueName || getSportName(event.sportId)}</span>
                    <span className="font-medium">{event.homeTeam} vs {event.awayTeam}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={event.status === 'live' ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {event.status === 'live' ? 'LIVE' : event.status.toUpperCase()}
                    </Badge>
                    <span className="font-bold">{event.score}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Helper function to get a sport name from ID
function getSportName(sportId: number): string {
  const sportMap: Record<number, string> = {
    1: 'Football',
    2: 'Basketball',
    3: 'Tennis',
    4: 'Baseball',
    5: 'Hockey',
    6: 'Handball',
    7: 'Volleyball',
    8: 'Rugby',
    9: 'Cricket',
    10: 'Golf',
    11: 'Boxing',
    12: 'MMA/UFC',
    13: 'Formula 1',
    14: 'Cycling',
    15: 'American Football',
    16: 'Australian Football',
    17: 'Snooker',
    18: 'Darts',
    19: 'Table Tennis',
    20: 'Badminton',
    21: 'Beach Volleyball',
    22: 'Winter Sports',
    23: 'Motorsport',
    24: 'Esports',
    25: 'Netball',
    26: 'Soccer',
    27: 'NBA',
    28: 'NHL',
    29: 'NFL',
    30: 'MLB',
  };

  return sportMap[sportId] || 'Unknown Sport';
}

export default LiveScoreUpdates;