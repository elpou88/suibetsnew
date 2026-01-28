import React, { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ActivityIcon, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Event, Market } from '@/types';
import { useBetting } from '@/context/BettingContext';
import sportMarketsAdapter from '@/lib/sportMarketsAdapter';

interface SportEventCardProps {
  event: Event;
  sportId: number;
}

const SportEventCard: React.FC<SportEventCardProps> = ({ event, sportId }) => {
  const { addBet } = useBetting();
  const [showAllMarkets, setShowAllMarkets] = useState(false);
  
  // Get markets for this event based on sport type
  let allMarkets = event.markets || [];
  
  // If no markets provided, use default ones based on sport
  if (!allMarkets || allMarkets.length === 0) {
    allMarkets = sportMarketsAdapter.getDefaultMarkets(
      sportId, 
      event.homeTeam, 
      event.awayTeam
    );
  } else {
    // Enhance the existing markets and add missing secondary markets
    allMarkets = sportMarketsAdapter.enhanceMarketsForSport(allMarkets, sportId, event.homeTeam, event.awayTeam);
  }
  
  const primaryMarket = allMarkets[0];
  const secondaryMarkets = allMarkets.slice(1);
  
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
  const handleAddBet = (e: React.MouseEvent, market: Market, selectionName: string, odds: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Convert eventId to string if it's a number
    const eventIdString = typeof event.id === 'number' ? event.id.toString() : event.id;
    
    // Create the bet object
    const bet = {
      id: `${eventIdString}-${market?.name || 'Match Result'}-${selectionName}-${Date.now()}`,
      eventId: eventIdString,
      eventName: `${event.homeTeam} vs ${event.awayTeam}`,
      selectionName,
      odds,
      stake: 10, // Default stake
      market: market?.name || 'Match Result',
      marketId: typeof market?.id === 'number' ? market.id : parseInt(String(market?.id)),
      isLive: event.isLive,
      uniqueId: Math.random().toString(36).substring(2, 8),
      homeTeam: event.homeTeam,
      awayTeam: event.awayTeam
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
                  <span className="text-gray-500 ml-2">ID:{event.id}</span>
                </>
              )}
            </div>
          </div>
          <div className="bg-[#0b1618] px-2 py-1 rounded text-xs text-cyan-300">
            {event.leagueName}
          </div>
        </div>
        
        {/* Main Market */}
        {primaryMarket && (
          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-2 text-center font-medium">{primaryMarket.name}</p>
            <div className={`grid ${primaryMarket.outcomes.length > 2 ? 'grid-cols-3' : 'grid-cols-2'} gap-1 relative z-20`}>
              {primaryMarket.outcomes.map((outcome, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="h-12 bg-[#1e3a3f] hover:bg-cyan-800 border-[#2a4c55] text-cyan-300 hover:text-white"
                  onClick={(e) => handleAddBet(e, primaryMarket, outcome.name, outcome.odds)}
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] font-normal truncate max-w-[80px]">{outcome.name}</span>
                    <span className="font-bold text-sm">{outcome.odds.toFixed(2)}</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Expandable Secondary Markets */}
        {secondaryMarkets.length > 0 && (
          <div className="mt-3 border-t border-[#1e3a3f] pt-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs text-cyan-400 hover:text-cyan-300 h-7 flex items-center justify-center gap-1 relative z-20"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowAllMarkets(!showAllMarkets);
              }}
            >
              {showAllMarkets ? (
                <><ChevronUp className="h-3 w-3" /> Hide Markets</>
              ) : (
                <><ChevronDown className="h-3 w-3" /> +{secondaryMarkets.length} More Markets</>
              )}
            </Button>

            {showAllMarkets && (
              <div className="mt-3 space-y-4">
                {secondaryMarkets.map((market, idx) => (
                  <div key={idx} className="border-b border-[#1e3a3f]/50 pb-3 last:border-0 last:pb-0">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 font-bold">{market.name}</p>
                    <div className="grid grid-cols-2 gap-1 relative z-20">
                      {market.outcomes.map((outcome, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="h-10 bg-[#0b1618] hover:bg-cyan-900/40 border-[#1e3a3f] text-cyan-300"
                          onClick={(e) => handleAddBet(e, market, outcome.name, outcome.odds)}
                        >
                          <div className="flex justify-between items-center w-full px-1">
                            <span className="text-[10px] font-normal truncate mr-2">{outcome.name}</span>
                            <span className="font-bold text-xs">{outcome.odds.toFixed(2)}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      {/* Link to event details page - placed after content so betting buttons work */}
      <Link href={`/match/${event.id}`}>
        <span className="absolute inset-0 z-0 cursor-pointer"></span>
      </Link>
    </Card>
  );
};

export default SportEventCard;