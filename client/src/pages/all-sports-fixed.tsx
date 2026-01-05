import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import { Trophy, Calendar, Radio, Filter, Zap, Activity, Target, Gamepad2, Dumbbell } from 'lucide-react';
import { EventsDisplay } from '@/components/EventsDisplay';

// Sport icon mapping
const SPORT_ICONS: Record<number, JSX.Element> = {
  1: <Zap className="h-5 w-5 text-cyan-400" />,
  2: <Activity className="h-5 w-5 text-cyan-400" />,
  3: <Target className="h-5 w-5 text-cyan-400" />,
  4: <Radio className="h-5 w-5 text-cyan-400" />,
  5: <Gamepad2 className="h-5 w-5 text-cyan-400" />,
  6: <Dumbbell className="h-5 w-5 text-cyan-400" />,
  7: <Activity className="h-5 w-5 text-cyan-400" />,
  8: <Zap className="h-5 w-5 text-cyan-400" />,
  9: <Radio className="h-5 w-5 text-cyan-400" />,
  10: <Target className="h-5 w-5 text-cyan-400" />,
  11: <Dumbbell className="h-5 w-5 text-cyan-400" />,
  12: <Dumbbell className="h-5 w-5 text-cyan-400" />,
  26: <Zap className="h-5 w-5 text-cyan-400" />
};

export default function AllSportsFixed() {
  const [, setLocation] = useLocation();
  const [selectedTab, setSelectedTab] = useState<'live' | 'upcoming'>('live');

  // Fetch sports with error handling
  const { data: sports = [], isLoading: sportsLoading } = useQuery({
    queryKey: ['/api/sports'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/sports');
        if (!response.ok) throw new Error('Failed to fetch sports');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching sports:', error);
        // Return default sports if API fails
        return [
          { id: 26, name: 'Soccer', slug: 'soccer', isActive: true },
          { id: 1, name: 'Football', slug: 'football', isActive: true },
          { id: 2, name: 'Basketball', slug: 'basketball', isActive: true },
          { id: 3, name: 'Tennis', slug: 'tennis', isActive: true },
          { id: 4, name: 'Baseball', slug: 'baseball', isActive: true },
          { id: 5, name: 'Hockey', slug: 'hockey', isActive: true }
        ];
      }
    },
    staleTime: 300000, // 5 minutes
    retry: 2
  });

  // Fetch live events
  const { data: liveEvents = [], isLoading: liveLoading } = useQuery({
    queryKey: ['/api/events/live'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/events?isLive=true');
        if (!response.ok) throw new Error('Failed to fetch live events');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching live events:', error);
        return [];
      }
    },
    refetchInterval: 60000, // Refresh every minute
    retry: 3
  });

  // Fetch upcoming events
  const { data: upcomingEvents = [], isLoading: upcomingLoading } = useQuery({
    queryKey: ['/api/events/upcoming'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/events');
        if (!response.ok) throw new Error('Failed to fetch upcoming events');
        const data = await response.json();
        return Array.isArray(data) ? data.filter(event => !event.isLive) : [];
      } catch (error) {
        console.error('Error fetching upcoming events:', error);
        return [];
      }
    },
    refetchInterval: 60000, // Refresh every minute
    retry: 3
  });

  // Calculate sport stats - FIXED: No more events.find errors
  const sportStats = sports.map(sport => {
    const liveCount = liveEvents.filter(event => 
      event && event.sportId === sport.id
    ).length;
    
    const upcomingCount = upcomingEvents.filter(event => 
      event && event.sportId === sport.id
    ).length;
    
    return {
      ...sport,
      liveCount,
      upcomingCount,
      totalEvents: liveCount + upcomingCount
    };
  });

  const handleSportClick = (sportSlug: string) => {
    setLocation(`/sports-live/${sportSlug}`);
  };

  return (
    <Layout title="All Sports">
      <div className="min-h-screen bg-[#0b1618] text-white py-6">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Trophy className="h-8 w-8 text-cyan-400" />
              <div>
                <h1 className="text-3xl font-bold text-cyan-400">All Sports</h1>
                <p className="text-gray-400">Browse all available sports and events</p>
              </div>
            </div>
          </div>

          {/* Sports Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-[#112225] border-[#1e3a3f] text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-cyan-400">
                  {sports.length}
                </div>
                <div className="text-sm text-gray-400">Total Sports</div>
              </CardContent>
            </Card>
            
            <Card className="bg-[#112225] border-[#1e3a3f] text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-400">
                  {liveEvents.length}
                </div>
                <div className="text-sm text-gray-400">Live Events</div>
              </CardContent>
            </Card>
            
            <Card className="bg-[#112225] border-[#1e3a3f] text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-400">
                  {upcomingEvents.length}
                </div>
                <div className="text-sm text-gray-400">Upcoming</div>
              </CardContent>
            </Card>
            
            <Card className="bg-[#112225] border-[#1e3a3f] text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-400">
                  {liveEvents.length + upcomingEvents.length}
                </div>
                <div className="text-sm text-gray-400">Total Events</div>
              </CardContent>
            </Card>
          </div>

          {/* Sports Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sportStats
              .filter(sport => sport.isActive !== false)
              .map((sport) => (
                <Card 
                  key={sport.id} 
                  className="bg-[#112225] border-[#1e3a3f] hover:border-cyan-400/50 transition-colors cursor-pointer group"
                  onClick={() => handleSportClick(sport.slug)}
                >
                  <CardHeader className="border-b border-[#1e3a3f]">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {SPORT_ICONS[sport.id] || <Trophy className="h-5 w-5 text-cyan-400" />}
                        <span className="text-white group-hover:text-cyan-400 transition-colors">
                          {sport.name}
                        </span>
                      </div>
                      {sport.totalEvents > 0 && (
                        <Badge className="bg-cyan-600 text-white">
                          {sport.totalEvents}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1 mb-1">
                          <Radio className="h-4 w-4 text-red-400" />
                          <span className="text-lg font-bold text-red-400">
                            {sport.liveCount}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">Live Now</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1 mb-1">
                          <Calendar className="h-4 w-4 text-green-400" />
                          <span className="text-lg font-bold text-green-400">
                            {sport.upcomingCount}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">Upcoming</div>
                      </div>
                    </div>
                    
                    {sport.totalEvents > 0 ? (
                      <Button 
                        className="w-full mt-4 bg-cyan-600 hover:bg-cyan-700 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSportClick(sport.slug);
                        }}
                      >
                        View Events
                      </Button>
                    ) : (
                      <div className="text-center mt-4 text-gray-500 text-sm">
                        No events available
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>

          {/* Loading State */}
          {(sportsLoading || liveLoading || upcomingLoading) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="bg-[#112225] border-[#1e3a3f] animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-[#1e3a3f] rounded mb-4"></div>
                    <div className="h-8 bg-[#1e3a3f] rounded mb-2"></div>
                    <div className="h-6 bg-[#1e3a3f] rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Quick Links */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-[#112225] border-[#1e3a3f]">
              <CardContent className="p-6 text-center">
                <Radio className="h-8 w-8 text-red-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">Live Events</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Watch and bet on live sporting events
                </p>
                <Button 
                  onClick={() => setLocation('/live-events')}
                  className="bg-red-600 hover:bg-red-700"
                >
                  View Live Events
                </Button>
              </CardContent>
            </Card>
            
            <Card className="bg-[#112225] border-[#1e3a3f]">
              <CardContent className="p-6 text-center">
                <Calendar className="h-8 w-8 text-green-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">Upcoming Events</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Browse and bet on upcoming matches
                </p>
                <Button 
                  onClick={() => setLocation('/upcoming-events')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  View Upcoming
                </Button>
              </CardContent>
            </Card>
            
            <Card className="bg-[#112225] border-[#1e3a3f]">
              <CardContent className="p-6 text-center">
                <Trophy className="h-8 w-8 text-yellow-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">Results</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Check completed match results
                </p>
                <Button 
                  onClick={() => setLocation('/results')}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  View Results
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}