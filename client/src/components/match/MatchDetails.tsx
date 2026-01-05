import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Event } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Info, Play } from "lucide-react";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBetting } from "@/context/BettingContext";
import { formatOdds } from "@/lib/utils";

interface MatchDetailsProps {
  eventId: number;
}

export function MatchDetails({ eventId }: MatchDetailsProps) {
  const [selectedTab, setSelectedTab] = useState("match-winner");
  const { addBet } = useBetting();

  const { data: event, isLoading } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
  });

  if (isLoading) {
    return <div className="p-12 text-center">Loading match details...</div>;
  }

  if (!event) {
    return <div className="p-12 text-center">Match not found</div>;
  }

  const handleBetClick = (
    selectionName: string,
    odds: number,
    market: string
  ) => {
    addBet({
      id: `${event.id}-${market}-${selectionName}`,
      eventId: event.id,
      eventName: `${event.homeTeam} vs ${event.awayTeam}`,
      selectionName,
      odds,
      stake: 10, // Default stake
      market,
    });
  };

  return (
    <div className="p-4">
      <div className="flex items-center mb-4">
        <Link href="/">
          <Button variant="ghost" className="text-gray-500">
            <ChevronLeft className="h-5 w-5 mr-1" />
            Back
          </Button>
        </Link>
        
        <div className="ml-2 flex items-center space-x-2">
          <Button variant="outline" className="text-sm flex items-center">
            {event.leagueName}
            <ChevronLeft className="h-4 w-4 ml-1 rotate-270" />
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
        {/* Match Info */}
        <div className="w-full md:w-2/3 bg-gray-50 rounded-lg p-4">
          <div className="mb-4">
            <h2 className="text-lg font-medium">
              {event.homeTeam} vs {event.awayTeam}
            </h2>
            <h3 className="text-sm font-medium text-gray-500 flex items-center mt-2">
              <ChevronLeft className="h-4 w-4 mr-1 rotate-90" />
              Scores
              <Info className="h-4 w-4 ml-1 text-gray-400" />
            </h3>
            <div className="text-xs text-gray-500 mt-1">
              {event.isLive ? "Live" : "Upcoming"}
              {event.score && ` - Score: ${event.score}`}
            </div>
          </div>
          
          <Tabs defaultValue="match-winner" onValueChange={setSelectedTab}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="match-winner">Match Winner</TabsTrigger>
              <TabsTrigger value="handicap">Handicap</TabsTrigger>
              <TabsTrigger value="totals">Totals</TabsTrigger>
            </TabsList>
            
            <TabsContent value="match-winner" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="p-3 h-auto"
                  onClick={() => handleBetClick(event.homeTeam, event.homeOdds || 1.5, "match-winner")}
                >
                  <div className="flex flex-col items-center w-full">
                    <span className="font-medium">{event.homeTeam}</span>
                    <span className="text-lg font-bold">{formatOdds(event.homeOdds || 1.5)}</span>
                  </div>
                </Button>
                
                {event.drawOdds ? (
                  <Button
                    variant="outline"
                    className="p-3 h-auto"
                    onClick={() => handleBetClick("Draw", event.drawOdds, "match-winner")}
                  >
                    <div className="flex flex-col items-center w-full">
                      <span className="font-medium">Draw</span>
                      <span className="text-lg font-bold">{formatOdds(event.drawOdds)}</span>
                    </div>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="p-3 h-auto"
                    onClick={() => handleBetClick(event.awayTeam, event.awayOdds || 6.5, "match-winner")}
                  >
                    <div className="flex flex-col items-center w-full">
                      <span className="font-medium">{event.awayTeam}</span>
                      <span className="text-lg font-bold">{formatOdds(event.awayOdds || 6.5)}</span>
                    </div>
                  </Button>
                )}
              </div>
              
              {event.drawOdds && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    className="p-3 h-auto w-full"
                    onClick={() => handleBetClick(event.awayTeam, event.awayOdds || 6.5, "match-winner")}
                  >
                    <div className="flex flex-col items-center w-full">
                      <span className="font-medium">{event.awayTeam}</span>
                      <span className="text-lg font-bold">{formatOdds(event.awayOdds || 6.5)}</span>
                    </div>
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="handicap" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="p-3 h-auto"
                  onClick={() => handleBetClick(`${event.homeTeam} -1`, 2.01, "handicap")}
                >
                  <div className="flex flex-col items-center w-full">
                    <span className="font-medium">{event.homeTeam} -1</span>
                    <span className="text-lg font-bold">2.01</span>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="p-3 h-auto"
                  onClick={() => handleBetClick(`${event.awayTeam} +1`, 1.77, "handicap")}
                >
                  <div className="flex flex-col items-center w-full">
                    <span className="font-medium">{event.awayTeam} +1</span>
                    <span className="text-lg font-bold">1.77</span>
                  </div>
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="totals" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="p-3 h-auto"
                  onClick={() => handleBetClick("Over 2.5", 1.95, "totals")}
                >
                  <div className="flex flex-col items-center w-full">
                    <span className="font-medium">Over 2.5</span>
                    <span className="text-lg font-bold">1.95</span>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="p-3 h-auto"
                  onClick={() => handleBetClick("Under 2.5", 1.85, "totals")}
                >
                  <div className="flex flex-col items-center w-full">
                    <span className="font-medium">Under 2.5</span>
                    <span className="text-lg font-bold">1.85</span>
                  </div>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Match Video/Preview */}
        <div className="w-full md:w-1/3 bg-gray-900 rounded-lg overflow-hidden relative">
          <div className="relative pt-[56.25%]">
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <div className="relative w-full h-full">
                <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-700"></div>
                {event.isLive && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded">
                    LIVE
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-primary/70 flex items-center justify-center cursor-pointer">
                    <Play className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4 mt-6">
        <h2 className="text-gray-700 font-semibold mb-2">
          {event.isLive ? "LIVE" : ""} Crypto Betting on {event.leagueName}
        </h2>
        <p className="text-sm text-gray-500 mb-3">
          On SuiBets our people can make bets on live data of {event.leagueName}, and tons of other activities. 
          For example: {event.leagueName} - {event.homeTeam} vs {event.awayTeam}. 
          SuiBet is a dedicated sports book using the Sui blockchain and Wurlus protocol.
        </p>
        <Button variant="link" className="text-primary text-sm p-0 h-auto">
          Show more
        </Button>
      </div>
    </div>
  );
}
