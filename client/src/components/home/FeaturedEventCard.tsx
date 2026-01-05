import React from 'react';
import { Button } from '@/components/ui/button';
import { useBetting } from '@/context/BettingContext';
import { Link } from 'wouter';
import { SelectedBet } from '@/types';

interface CardEvent {
  id: string | number;
  sportId: number;
  leagueName: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: string;
  score: string;
  markets: Array<{
    id: string;
    name: string;
    outcomes: Array<{
      id: string;
      name: string;
      odds: number;
      probability: number;
    }>;
  }>;
  isLive: boolean;
}

interface FeaturedEventCardProps {
  event: CardEvent;
  getSportName: (sportId: number | null) => string;
}

const FeaturedEventCard: React.FC<FeaturedEventCardProps> = ({ event, getSportName }) => {
  const { addBet } = useBetting();

  const handleAddBet = (e: React.MouseEvent, teamName: string, outcome: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Convert eventId to string if it's a number
    const eventIdString = typeof event.id === 'number' ? event.id.toString() : event.id;
    
    // Create a bet object that satisfies the SelectedBet interface
    const bet: SelectedBet = {
      id: `${eventIdString}-${event.markets[0]?.id || 'market'}-${outcome.id || 'outcome'}-${Date.now()}`,
      eventId: eventIdString,
      eventName: `${event.homeTeam} vs ${event.awayTeam}`,
      selectionName: teamName,
      odds: outcome.odds,
      stake: 10, // Default stake
      market: event.markets[0]?.name || 'Match Result',
      marketId: event.markets[0]?.id ? parseInt(event.markets[0].id) : undefined,
      outcomeId: outcome.id,
      isLive: event.isLive,
      uniqueId: Math.random().toString(36).substring(2, 10)
    };
    
    addBet(bet);
    console.log('Adding bet:', bet);
  };

  return (
    <div className="bg-[#112225] rounded-md border border-[#1e3a3f] cursor-pointer hover:border-cyan-400 transition-all duration-200 overflow-hidden shadow-lg h-full flex flex-col relative">
      {/* Header with team names and live indicator */}
      <div className="p-3 border-b border-[#1e3a3f]">
        <div className="flex justify-between items-center mb-1.5">
          <div className="text-white font-medium text-sm truncate pr-2 flex-1">
            {event.homeTeam} <span className="text-gray-400">vs</span> {event.awayTeam}
          </div>
          {event.isLive && (
            <div className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">
              LIVE
            </div>
          )}
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-cyan-300 font-medium">{getSportName(event.sportId)}</span>
          <span className="text-gray-400">{event.leagueName}</span>
        </div>
      </div>
      
      {/* Score display (for live events) */}
      {event.isLive && event.score && (
        <div className="bg-[#0b1618] py-2 px-3 border-b border-[#1e3a3f] text-center">
          <span className="text-cyan-300 text-lg font-bold">
            {event.score}
          </span>
        </div>
      )}
      
      {/* Betting options with team names and odds */}
      <div className="p-3 flex-grow flex flex-col justify-between">
        <div className="space-y-3">
          {event.markets && event.markets[0] && event.markets[0].outcomes ? (
            <>
              {/* Market name */}
              <div className="text-center text-xs text-gray-400 mb-2">
                {event.markets[0]?.name || 'Match Result'}
              </div>
              
              {/* Home team button */}
              <Button 
                size="sm" 
                variant="outline" 
                className="h-12 bg-[#1e3a3f] hover:bg-cyan-800 border-[#2a4c55] text-cyan-300 hover:text-white w-full"
                onClick={(e) => {
                  if (event.markets && event.markets[0] && event.markets[0].outcomes) {
                    handleAddBet(e, event.homeTeam, event.markets[0].outcomes[0]);
                  }
                }}
              >
                <div className="flex flex-col items-center w-full">
                  <span className="text-sm font-medium">{event.homeTeam}</span>
                  <span className="text-lg font-bold">
                    {event.markets[0].outcomes[0]?.odds.toFixed(2) || '2.00'}
                  </span>
                </div>
              </Button>
              
              {/* Away team button */}
              <Button 
                size="sm" 
                variant="outline" 
                className="h-12 bg-[#1e3a3f] hover:bg-cyan-800 border-[#2a4c55] text-cyan-300 hover:text-white w-full"
                onClick={(e) => {
                  if (event.markets && event.markets[0] && event.markets[0].outcomes) {
                    handleAddBet(e, event.awayTeam, event.markets[0].outcomes[1]);
                  }
                }}
              >
                <div className="flex flex-col items-center w-full">
                  <span className="text-sm font-medium">{event.awayTeam}</span>
                  <span className="text-lg font-bold">
                    {event.markets[0].outcomes[1]?.odds.toFixed(2) || '3.50'}
                  </span>
                </div>
              </Button>
            </>
          ) : (
            <>
              {/* Fallback for when market data isn't available */}
              <div className="text-center text-xs text-gray-400 mb-2">
                Match Result
              </div>
              
              <Button 
                size="sm" 
                variant="outline" 
                className="h-12 bg-[#1e3a3f] hover:bg-cyan-800 border-[#2a4c55] text-cyan-300 hover:text-white w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col items-center w-full">
                  <span className="text-sm font-medium">{event.homeTeam}</span>
                  <span className="text-lg font-bold">2.10</span>
                </div>
              </Button>
              
              <Button 
                size="sm" 
                variant="outline" 
                className="h-12 bg-[#1e3a3f] hover:bg-cyan-800 border-[#2a4c55] text-cyan-300 hover:text-white w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col items-center w-full">
                  <span className="text-sm font-medium">{event.awayTeam}</span>
                  <span className="text-lg font-bold">1.90</span>
                </div>
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Transparent overlay for card navigation */}
      <Link href={`/match/${event.id}`}>
        <div className="absolute inset-0 z-0" style={{ pointerEvents: 'auto' }}></div>
      </Link>
    </div>
  );
};

export default FeaturedEventCard;