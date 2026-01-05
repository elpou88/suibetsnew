import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import Layout from '@/components/layout/Layout';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { BetSlip } from '@/components/betting/BetSlip';
import { useBetting } from '@/context/BettingContext';
import SportsSidebar from '@/components/layout/SportsSidebar';
import { Clock, Calendar } from 'lucide-react';
const suiBetsHero = "/images/sui-hero.png";

/**
 * Sport page that displays events for a specific sport with real-time data
 */
export default function SportsLive() {
  const params = useParams();
  const sportSlug = params.slug || '';
  const [, setLocation] = useLocation();
  const { addBet } = useBetting();
  const [activeTab, setActiveTab] = useState<string>('all');
  
  // Fetch sports data
  const { data: sports = [] } = useQuery({
    queryKey: ['/api/sports'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/sports');
      return response.json();
    }
  });
  
  // Find the current sport based on the slug
  const currentSport = sports.find((sport: any) => sport.slug === sportSlug);
  
  // Fetch events for the specific sport
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/events', sportSlug],
    queryFn: async () => {
      const sportId = currentSport?.id;
      if (!sportId) {
        return [];
      }
      const response = await apiRequest('GET', `/api/events?sportId=${sportId}`);
      return response.json();
    },
    enabled: !!currentSport?.id,
    refetchInterval: 5000 // Refresh every 5 seconds for real-time updates
  });
  
  // Filter events based on the active tab
  const filteredEvents = events.filter((event: any) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'live') return event.status === 'live';
    if (activeTab === 'upcoming') return event.status === 'upcoming';
    return true;
  });
  
  // Handle bet selection
  const handleBetSelection = (event: any, market: any, outcome: any) => {
    const betId = `${event.id}-${market.id}-${outcome.id}`;
    
    addBet({
      id: betId,
      eventId: event.id,
      eventName: event.name,
      selectionName: outcome.name,
      odds: outcome.odds,
      stake: 10, // Default stake
      market: market.name,
      isLive: event.status === 'live'
    });
  };
  
  return (
    <Layout>
      <div className="flex min-h-screen bg-[#112225]">
        {/* Left sidebar */}
        <div className="w-64 bg-[#0b1618] border-r border-[#1e3a3f] min-h-screen">
          <SportsSidebar />
        </div>
        
        {/* Main content */}
        <div className="flex-1 p-4">
          <div className="mb-6">
            {/* Sport header */}
            {currentSport ? (
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-white">{currentSport.name}</h1>
                  <p className="text-gray-400">{currentSport.description || `All ${currentSport.name} Events`}</p>
                </div>
                
                {/* Tabs */}
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    className={`border-[#1e3a3f] ${activeTab === 'all' ? 'bg-cyan-400 text-black' : 'bg-[#0b1618] text-white'}`}
                    onClick={() => setActiveTab('all')}
                  >
                    All Events
                  </Button>
                  <Button 
                    variant="outline" 
                    className={`border-[#1e3a3f] ${activeTab === 'live' ? 'bg-cyan-400 text-black' : 'bg-[#0b1618] text-white'}`}
                    onClick={() => setActiveTab('live')}
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"></div>
                    Live
                  </Button>
                  <Button 
                    variant="outline" 
                    className={`border-[#1e3a3f] ${activeTab === 'upcoming' ? 'bg-cyan-400 text-black' : 'bg-[#0b1618] text-white'}`}
                    onClick={() => setActiveTab('upcoming')}
                  >
                    Upcoming
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                Select a sport from the sidebar.
              </div>
            )}
            
            {/* Events list */}
            {eventsLoading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full"></div>
              </div>
            ) : filteredEvents.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredEvents.map((event: any) => (
                  <Card key={event.id} className="bg-[#0b1618] border-[#1e3a3f] text-white overflow-hidden">
                    <CardContent className="p-0">
                      <div className={`p-4 border-b border-[#1e3a3f] ${
                        event.status === 'live' 
                          ? 'bg-gradient-to-r from-cyan-600 to-cyan-400' 
                          : 'bg-[#0b1618]'
                      }`}>
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold">{event.name}</h3>
                          {event.status === 'live' && (
                            <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold animate-pulse">
                              LIVE
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-2 flex justify-between items-center">
                          {event.status === 'upcoming' ? (
                            <div className="flex items-center text-sm">
                              <Calendar className="w-4 h-4 mr-1" />
                              {format(new Date(event.startTime), 'dd MMM')}
                              <Clock className="w-4 h-4 ml-3 mr-1" />
                              {format(new Date(event.startTime), 'HH:mm')}
                            </div>
                          ) : (
                            <div className="text-sm">
                              Started at {format(new Date(event.startTime), 'HH:mm')}
                            </div>
                          )}
                        </div>
                        
                        {/* Live score (if available) */}
                        {event.status === 'live' && event.score && (
                          <div className="mt-2 flex justify-center bg-[#0b1618] rounded-md p-3">
                            <div className="flex items-center justify-between w-full max-w-md">
                              <div className="text-right flex-1 mr-4">
                                <div className="font-bold">{event.homeTeam}</div>
                              </div>
                              <div className="text-xl font-bold bg-black rounded-md py-1 px-4">
                                {event.score}
                              </div>
                              <div className="text-left flex-1 ml-4">
                                <div className="font-bold">{event.awayTeam}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Markets */}
                      {event.markets && event.markets.map((market: any) => (
                        <div key={market.id} className="px-4 py-3 border-b border-[#1e3a3f]">
                          <h4 className="text-sm text-gray-400 mb-2">{market.name}</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {market.outcomes && market.outcomes.map((outcome: any) => (
                              <Button
                                key={outcome.id}
                                variant="outline"
                                className={`flex justify-between items-center border-[#1e3a3f] hover:bg-cyan-400 hover:text-black ${
                                  outcome.status === 'active' 
                                    ? 'bg-[#112225]' 
                                    : 'bg-gray-800 opacity-70 cursor-not-allowed'
                                }`}
                                disabled={outcome.status !== 'active'}
                                onClick={() => handleBetSelection(event, market, outcome)}
                              >
                                <span className="truncate">{outcome.name}</span>
                                <span className={`font-medium ml-2 ${
                                  outcome.status === 'active' 
                                    ? 'text-cyan-400' 
                                    : 'text-gray-400'
                                }`}>
                                  {outcome.odds.toFixed(2)}
                                </span>
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                No events found for this sport.
              </div>
            )}
          </div>
        </div>
        
        {/* Right sidebar with bet slip and hero image */}
        <div className="w-80 bg-[#0b1618] border-l border-[#1e3a3f] flex flex-col min-h-screen">
          {/* BetSlip - scrollable container */}
          <div className="p-4 flex-shrink-0">
            <BetSlip />
          </div>

          {/* Hero Image below BetSlip */}
          <div className="p-4 flex-1 flex">
            <div className="relative overflow-hidden rounded-lg shadow-lg shadow-cyan-500/30 w-full">
              <img 
                src={suiBetsHero} 
                alt="SuiBets" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-600/20 to-[#061118] pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}