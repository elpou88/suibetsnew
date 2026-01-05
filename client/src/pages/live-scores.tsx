import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import LiveScoreUpdates from '@/components/live-scores/LiveScoreUpdates';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

const LiveScoresPage: React.FC = () => {
  const [activeSport, setActiveSport] = useState<string>('all');
  const [notificationCount, setNotificationCount] = useState<Record<string, number>>({});

  // Update notification count when a score update is received
  const handleScoreUpdate = (sport: string) => {
    setNotificationCount(prev => ({
      ...prev,
      [sport]: (prev[sport] || 0) + 1
    }));
  };

  // Clear notification count when tab is clicked
  const handleTabClick = (sport: string) => {
    setActiveSport(sport);
    setNotificationCount(prev => ({
      ...prev,
      [sport]: 0
    }));
  };

  return (
    <div className="container py-6">
      <PageHeader
        title="Live Scores"
        description="Real-time scores and updates from all sports"
      />

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4 flex overflow-x-auto pb-2 sm:flex-wrap">
          <TabsTrigger 
            value="all"
            onClick={() => handleTabClick('all')}
            className="relative"
          >
            All Sports
            {notificationCount['all'] ? (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                {notificationCount['all']}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger 
            value="football"
            onClick={() => handleTabClick('football')}
            className="relative"
          >
            Football
            {notificationCount['football'] ? (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                {notificationCount['football']}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger 
            value="basketball"
            onClick={() => handleTabClick('basketball')}
            className="relative"
          >
            Basketball
            {notificationCount['basketball'] ? (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                {notificationCount['basketball']}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger 
            value="tennis"
            onClick={() => handleTabClick('tennis')}
            className="relative"
          >
            Tennis
            {notificationCount['tennis'] ? (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                {notificationCount['tennis']}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger 
            value="cricket"
            onClick={() => handleTabClick('cricket')}
            className="relative"
          >
            Cricket
            {notificationCount['cricket'] ? (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                {notificationCount['cricket']}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger 
            value="boxing"
            onClick={() => handleTabClick('boxing')}
            className="relative"
          >
            Boxing
            {notificationCount['boxing'] ? (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                {notificationCount['boxing']}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger 
            value="formula1"
            onClick={() => handleTabClick('formula1')}
            className="relative"
          >
            Formula 1
            {notificationCount['formula1'] ? (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                {notificationCount['formula1']}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        {/* All sports tab content */}
        <TabsContent value="all" className="space-y-4">
          <LiveScoreUpdates 
            sport="all"
            onScoreUpdate={() => handleScoreUpdate('all')}
          />
        </TabsContent>

        {/* Football tab content */}
        <TabsContent value="football" className="space-y-4">
          <LiveScoreUpdates 
            sport="football"
            onScoreUpdate={() => handleScoreUpdate('football')}
          />
        </TabsContent>

        {/* Basketball tab content */}
        <TabsContent value="basketball" className="space-y-4">
          <LiveScoreUpdates 
            sport="basketball"
            onScoreUpdate={() => handleScoreUpdate('basketball')}
          />
        </TabsContent>

        {/* Tennis tab content */}
        <TabsContent value="tennis" className="space-y-4">
          <LiveScoreUpdates 
            sport="tennis"
            onScoreUpdate={() => handleScoreUpdate('tennis')}
          />
        </TabsContent>

        {/* Cricket tab content */}
        <TabsContent value="cricket" className="space-y-4">
          <LiveScoreUpdates 
            sport="cricket"
            onScoreUpdate={() => handleScoreUpdate('cricket')}
          />
        </TabsContent>

        {/* Boxing tab content */}
        <TabsContent value="boxing" className="space-y-4">
          <LiveScoreUpdates 
            sport="boxing"
            onScoreUpdate={() => handleScoreUpdate('boxing')}
          />
        </TabsContent>

        {/* Formula 1 tab content */}
        <TabsContent value="formula1" className="space-y-4">
          <LiveScoreUpdates 
            sport="formula1"
            onScoreUpdate={() => handleScoreUpdate('formula1')}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LiveScoresPage;