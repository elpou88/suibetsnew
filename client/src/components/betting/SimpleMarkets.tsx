import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBetting } from '@/context/BettingContext';
import { formatOdds } from '@/lib/utils';

// Props interface for basic betting markets
interface SimpleMarketsProps {
  sportType?: string;
  eventId?: string | number;
  eventName?: string;
  homeTeam?: string;
  awayTeam?: string;
  homeOdds?: number;
  drawOdds?: number;
  awayOdds?: number;
  isLive?: boolean;
  event?: any; // Optional event object for direct event passing
}

// A simplified component for betting markets that allows passing either individual props or a full event object
const SimpleMarkets: React.FC<SimpleMarketsProps> = ({
  sportType,
  eventId,
  eventName,
  homeTeam,
  awayTeam,
  homeOdds = 2.0,
  drawOdds = 3.5,
  awayOdds = 3.8,
  isLive = false,
  event,
}) => {
  const { addBet } = useBetting();
  
  // Extract properties from event if provided, otherwise use props directly
  const resolvedEventId = event?.id || eventId;
  const resolvedEventName = event?.eventName || eventName || `${event?.homeTeam || homeTeam} vs ${event?.awayTeam || awayTeam}`;
  const resolvedHomeTeam = event?.homeTeam || homeTeam;
  const resolvedAwayTeam = event?.awayTeam || awayTeam;
  const resolvedIsLive = event?.isLive || isLive;
  const resolvedSportType = event?.sportType || sportType || 'generic';
  
  // Resolve odds from markets in the event object if available
  let resolvedHomeOdds = homeOdds;
  let resolvedDrawOdds = drawOdds;
  let resolvedAwayOdds = awayOdds;
  
  if (event?.markets && event.markets.length > 0) {
    // Try to find match result market
    const matchResultMarket = event.markets.find((market: any) => 
      market.name === 'Match Result' || market.name === 'Winner' || market.name === '1X2');
      
    if (matchResultMarket && matchResultMarket.outcomes && matchResultMarket.outcomes.length > 0) {
      const outcomes = matchResultMarket.outcomes;
      
      // Find home team outcome
      const homeOutcome = outcomes.find((outcome: any) => 
        outcome.name.includes(resolvedHomeTeam) || 
        outcome.name === '1' || 
        outcome.name === 'Home');
        
      if (homeOutcome) {
        resolvedHomeOdds = homeOutcome.odds;
      }
      
      // Find draw outcome
      const drawOutcome = outcomes.find((outcome: any) => 
        outcome.name === 'Draw' || 
        outcome.name === 'X');
        
      if (drawOutcome) {
        resolvedDrawOdds = drawOutcome.odds;
      }
      
      // Find away team outcome
      const awayOutcome = outcomes.find((outcome: any) => 
        outcome.name.includes(resolvedAwayTeam) || 
        outcome.name === '2' || 
        outcome.name === 'Away');
        
      if (awayOutcome) {
        resolvedAwayOdds = awayOutcome.odds;
      }
    }
  }
  
  // Function to handle adding a bet to the slip
  const handleAddBet = (
    marketName: string,
    selectionName: string,
    odds: number
  ) => {
    // Create a unique ID for this bet
    const uniqueIdentifier = Math.random().toString(36).substring(2, 8);
    const betId = `${resolvedEventId}-${marketName}-${selectionName}-${Date.now()}`;
    
    // Create bet object with correct types to match SelectedBet interface
    const bet = {
      id: betId,
      eventId: typeof resolvedEventId === 'string' ? resolvedEventId : String(resolvedEventId), // Ensure it's converted to string
      eventName: resolvedEventName,
      selectionName,
      odds,
      stake: 10, // Default stake amount
      market: marketName,
      marketId: undefined, // Add marketId to prevent type error
      outcomeId: undefined, // Add outcomeId to prevent type error
      isLive: resolvedIsLive || false,
      uniqueId: uniqueIdentifier
    };
    
    console.log("Adding bet:", bet);
    addBet(bet);
  };

  // Determine if this sport has draws
  const hasDraw = ['football', 'soccer', 'cricket', 'hockey', 'rugby-league', 'rugby-union'].includes(resolvedSportType);

  return (
    <div className="betting-markets">
      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            Match Result
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 p-4">
          {/* Home team */}
          <Button
            variant="outline"
            onClick={() => handleAddBet('Match Result', `${resolvedHomeTeam} (Win)`, resolvedHomeOdds)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-300 font-medium">{resolvedHomeTeam}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">{formatOdds(resolvedHomeOdds)}</span>
          </Button>
          
          {/* Draw option for sports that can have draws */}
          {hasDraw && resolvedDrawOdds && (
            <Button
              variant="outline"
              onClick={() => handleAddBet('Match Result', 'Draw', resolvedDrawOdds)}
              className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
            >
              <span className="text-cyan-300 font-medium">Draw</span>
              <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">{formatOdds(resolvedDrawOdds)}</span>
            </Button>
          )}
          
          {/* Away team */}
          <Button
            variant="outline"
            onClick={() => handleAddBet('Match Result', `${resolvedAwayTeam} (Win)`, resolvedAwayOdds)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-300 font-medium">{resolvedAwayTeam}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">{formatOdds(resolvedAwayOdds)}</span>
          </Button>
        </CardContent>
      </Card>

      {/* Additional market for basketball */}
      {resolvedSportType === 'basketball' && (
        <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
          <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
            <CardTitle className="text-cyan-300 font-bold flex items-center">
              Total Points
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3 p-4">
            <Button
              variant="outline"
              onClick={() => handleAddBet('Total Points', 'Over 199.5', 1.90)}
              className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
            >
              <span className="text-cyan-300 font-medium">Over 199.5</span>
              <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.90</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAddBet('Total Points', 'Under 199.5', 1.90)}
              className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
            >
              <span className="text-cyan-300 font-medium">Under 199.5</span>
              <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.90</span>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SimpleMarkets;