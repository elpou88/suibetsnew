import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Event, Sport } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ChevronDown, Globe } from "lucide-react";
import { BettingCard } from "@/components/ui/betting-card";
import { formatDate } from "@/lib/utils";

export function EventsContainer() {
  const [selectedFilter, setSelectedFilter] = useState("all");
  
  const { data: sports = [] } = useQuery<Sport[]>({
    queryKey: ['/api/sports']
  });
  
  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/events', { isLive: false }]
  });

  const groupedEvents = events.reduce((acc, event) => {
    const key = event.leagueSlug;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <Button
            variant="outline"
            className="flex items-center justify-between bg-gray-200 rounded-md px-2 py-1 mr-3 text-sm"
          >
            <span>Upcoming</span>
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={selectedFilter === "all" ? "text-primary" : "text-gray-500"}
            onClick={() => setSelectedFilter("all")}
          >
            All
          </Button>
        </div>
      </div>

      {eventsLoading ? (
        <div className="p-12 text-center">Loading events...</div>
      ) : (
        <>
          {Object.entries(groupedEvents).map(([leagueSlug, leagueEvents]) => (
            <Card key={leagueSlug} className="mb-4">
              <CardHeader className="bg-gray-100 p-3 flex flex-row items-center justify-between">
                <div className="flex items-center cursor-pointer">
                  <ChevronDown className="h-4 w-4 mr-2 text-gray-500" />
                  <div className="flex items-center">
                    <Globe className="h-4 w-4 mr-2" />
                    <span>{leagueEvents[0].leagueName}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {leagueEvents.map((event) => (
                  <BettingCard
                    key={event.id}
                    eventId={event.id}
                    matchTitle={`${event.homeTeam} vs ${event.awayTeam}`}
                    time={formatDate(event.startTime)}
                    isLive={event.isLive}
                    home={event.homeTeam}
                    away={event.awayTeam}
                    draw="Draw"
                    homeOdds={event.homeOdds || 1.5}
                    drawOdds={event.drawOdds || 3.8}
                    awayOdds={event.awayOdds || 6.8}
                    handicapHome="-1"
                    handicapAway="+1"
                    totalOver="2"
                    totalUnder="2"
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
