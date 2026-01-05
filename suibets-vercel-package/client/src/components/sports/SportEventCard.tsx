import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ActivityIcon, Clock } from 'lucide-react';
import { Event } from '@/types';
import { useBetting } from '@/context/BettingContext';
import sportMarketsAdapter from '@/lib/sportMarketsAdapter';

interface SportEventCardProps {
  event: Event;
  sportId: number;
}

const SportEventCard: React.FC<SportEventCardProps> = ({ event, sportId }) => {
  const { addBet } = useBetting();
  
  // Get markets for this event based on sport type
  let markets = event.markets || [];
  
  // If no markets provided, use default ones based on sport
  if (!markets || markets.length === 0) {
    markets = sportMarketsAdapter.getDefaultMarkets(
      sportId, 
      event.homeTeam, 
      event.awayTeam
    );
  } else {
    // Enhance the existing markets
    markets = sportMarketsAdapter.enhanceMarketsForSport(markets, sportId);
  }
  
  const primaryMarket = markets[0];
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    
    // Return 'Today' with the time if it's today
    const today = new Date();
    if (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    ) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Otherwise return the date and time
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
      ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Function to handle adding a bet to the betslip
  const handleAddBet = (e: React.MouseEvent, selectionName: string, odds: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Convert eventId to string if it's a number
    const eventIdString = typeof event.id === 'number' ? event.id.toString() : event.id;
    
    // Create the bet object
    const bet = {
      id: `${eventIdString}-${primaryMarket?.name || 'Match Result'}-${selectionName}-${Date.now()}`,
      eventId: eventIdString,
      eventName: `${event.homeTeam} vs ${event.awayTeam}`,
      selectionName,
      odds,
      stake: 10, // Default stake
      market: primaryMarket?.name || 'Match Result',
      isLive: event.isLive,
      uniqueId: Math.random().toString(36).substring(2, 8)
    };
    
    addBet(bet);
    console.log(`Adding bet for ${selectionName} at odds ${odds}`);
  };
  
  return (
    <Card className="bg-[#112225] border-[#1e3a3f] hover:border-cyan-500/70 transition-all duration-200 overflow-hidden relative">
      <CardContent className="p-3">
        {/* Event header with time */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="text-white font-bold truncate">{event.homeTeam} vs {event.awayTeam}</h3>
            <div className="flex items-center text-xs text-gray-400 mt-1">
              {event.isLive ? (
                <>
                  <ActivityIcon className="h-3 w-3 text-red-500 mr-1 animate-pulse" />
                  <span className="text-cyan-300">Live</span>
                  {event.score && (
                    <span className="ml-2 px-1.5 py-0.5 bg-[#1e3a3f] rounded text-cyan-300 font-medium">
                      {event.score}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3 mr-1" />
                  <span>{formatDate(event.startTime)}</span>
                </>
              )}
            </div>
          </div>
          <div className="bg-[#0b1618] px-2 py-1 rounded text-xs text-cyan-300">
            {event.leagueName}
          </div>
        </div>
        
        {/* Betting options */}
        {primaryMarket && (
          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-2 text-center">{primaryMarket.name}</p>
            <div className="grid grid-cols-2 gap-1">
              {primaryMarket.outcomes.slice(0, 2).map((outcome, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="h-10 bg-[#1e3a3f] hover:bg-cyan-800 border-[#2a4c55] text-cyan-300 hover:text-white"
                  onClick={(e) => handleAddBet(e, outcome.name, outcome.odds)}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-normal">{outcome.name}</span>
                    <span className="font-bold">{outcome.odds.toFixed(2)}</span>
                  </div>
                </Button>
              ))}
            </div>
            
            {/* If there's a draw option (for sports like soccer) */}
            {primaryMarket.outcomes.length > 2 && (
              <div className="mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-10 bg-[#1e3a3f] hover:bg-cyan-800 border-[#2a4c55] text-cyan-300 hover:text-white"
                  onClick={(e) => handleAddBet(e, primaryMarket.outcomes[2].name, primaryMarket.outcomes[2].odds)}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-normal">{primaryMarket.outcomes[2].name}</span>
                    <span className="font-bold">{primaryMarket.outcomes[2].odds.toFixed(2)}</span>
                  </div>
                </Button>
              </div>
            )}
          </div>
        )}
        
        {/* Link to event details page */}
        <Link href={`/match/${event.id}`}>
          <span className="absolute inset-0 z-10 cursor-pointer"></span>
        </Link>
      </CardContent>
    </Card>
  );
};

export default SportEventCard;