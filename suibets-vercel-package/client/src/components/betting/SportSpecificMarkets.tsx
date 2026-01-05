import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBetting } from '@/context/BettingContext';
import { SelectedBet, Event } from '@/types';
import sportMarketsAdapter, { SportIds } from '@/lib/sportMarketsAdapter';

interface SportSpecificMarketsProps {
  event: Event;
  className?: string;
}

const SportSpecificMarkets: React.FC<SportSpecificMarketsProps> = ({ event, className = '' }) => {
  const { addBet } = useBetting();
  const sportId = event.sportId;
  
  // Get enhanced markets for this sport
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
  
  // Get available market types for this sport
  const availableMarketTypes = sportMarketsAdapter.getAvailableMarketTypesForSport(sportId);
  
  // Helper function to get the icon for each sport
  const getSportIcon = (sportId: number): string => {
    switch (sportId) {
      case SportIds.SOCCER: return '⚽';
      case SportIds.BASKETBALL: return '🏀';
      case SportIds.TENNIS: return '🎾';
      case SportIds.BASEBALL: return '⚾';
      case SportIds.HOCKEY: return '🏒';
      case SportIds.RUGBY: return '🏉';
      case SportIds.GOLF: return '⛳';
      case SportIds.CRICKET: return '🏏';
      case SportIds.MMA_UFC: return '🥊';
      case SportIds.BOXING: return '🥊';
      case SportIds.FORMULA_1: return '🏎️';
      case SportIds.CYCLING: return '🚴';
      default: return '🎮';
    }
  };
  
  const handleAddBet = (marketName: string, selectionName: string, odds: number) => {
    // Convert eventId to string if it's a number
    const eventIdString = typeof event.id === 'number' ? event.id.toString() : event.id;
    
    const bet: SelectedBet = {
      id: `${eventIdString}-${marketName}-${selectionName}-${Date.now()}`,
      eventId: eventIdString,
      eventName: `${event.homeTeam} vs ${event.awayTeam}`,
      selectionName,
      odds,
      stake: 10, // Default stake
      market: marketName,
      isLive: event.isLive,
      uniqueId: Math.random().toString(36).substring(2, 8)
    };
    
    addBet(bet);
    console.log(`Adding bet for ${selectionName} at odds ${odds}`);
  };
  
  // Function to render markets based on sport
  const renderMarketsByType = () => {
    return (
      <div className="space-y-4">
        {markets.slice(0, 3).map((market, index) => (
          <Card key={index} className="bg-[#112225] border-[#1e3a3f]">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-cyan-300 text-sm flex items-center">
                {getSportIcon(sportId)} <span className="ml-2">{market.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {market.outcomes.map((outcome, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="bg-[#1e3a3f] hover:bg-cyan-800 border-[#2a4c55] text-cyan-300 hover:text-white flex justify-between w-full"
                    onClick={() => handleAddBet(market.name, outcome.name, outcome.odds)}
                  >
                    <span>{outcome.name}</span>
                    <span className="bg-[#0b1618] px-2 py-0.5 rounded text-cyan-400">
                      {outcome.odds.toFixed(2)}
                    </span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };
  
  // Special rendering for cricket markets
  const renderCricketMarkets = () => {
    return (
      <div className="space-y-4">
        {/* Match Winner market */}
        <Card className="bg-[#112225] border-[#1e3a3f]">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-cyan-300 text-sm flex items-center">
              🏏 <span className="ml-2">Match Winner</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-[#1e3a3f] hover:bg-cyan-800 border-[#2a4c55] text-cyan-300 hover:text-white flex justify-between w-full"
                onClick={() => handleAddBet('Match Winner', event.homeTeam, 1.95)}
              >
                <span>{event.homeTeam}</span>
                <span className="bg-[#0b1618] px-2 py-0.5 rounded text-cyan-400">1.95</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-[#1e3a3f] hover:bg-cyan-800 border-[#2a4c55] text-cyan-300 hover:text-white flex justify-between w-full"
                onClick={() => handleAddBet('Match Winner', event.awayTeam, 1.85)}
              >
                <span>{event.awayTeam}</span>
                <span className="bg-[#0b1618] px-2 py-0.5 rounded text-cyan-400">1.85</span>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Total Match Sixes market */}
        <Card className="bg-[#112225] border-[#1e3a3f]">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-cyan-300 text-sm flex items-center">
              🏏 <span className="ml-2">Total Match Sixes</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-[#1e3a3f] hover:bg-cyan-800 border-[#2a4c55] text-cyan-300 hover:text-white flex justify-between w-full"
                onClick={() => handleAddBet('Total Match Sixes', 'Over 9.5', 1.90)}
              >
                <span>Over 9.5</span>
                <span className="bg-[#0b1618] px-2 py-0.5 rounded text-cyan-400">1.90</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-[#1e3a3f] hover:bg-cyan-800 border-[#2a4c55] text-cyan-300 hover:text-white flex justify-between w-full"
                onClick={() => handleAddBet('Total Match Sixes', 'Under 9.5', 1.90)}
              >
                <span>Under 9.5</span>
                <span className="bg-[#0b1618] px-2 py-0.5 rounded text-cyan-400">1.90</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  // Special rendering for tennis markets
  const renderTennisMarkets = () => {
    return (
      <div className="space-y-4">
        {/* Match Winner market */}
        <Card className="bg-[#112225] border-[#1e3a3f]">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-cyan-300 text-sm flex items-center">
              🎾 <span className="ml-2">Match Winner</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-[#1e3a3f] hover:bg-cyan-800 border-[#2a4c55] text-cyan-300 hover:text-white flex justify-between w-full"
                onClick={() => handleAddBet('Match Winner', event.homeTeam, 1.75)}
              >
                <span>{event.homeTeam}</span>
                <span className="bg-[#0b1618] px-2 py-0.5 rounded text-cyan-400">1.75</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-[#1e3a3f] hover:bg-cyan-800 border-[#2a4c55] text-cyan-300 hover:text-white flex justify-between w-full"
                onClick={() => handleAddBet('Match Winner', event.awayTeam, 2.05)}
              >
                <span>{event.awayTeam}</span>
                <span className="bg-[#0b1618] px-2 py-0.5 rounded text-cyan-400">2.05</span>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Set Winner market */}
        <Card className="bg-[#112225] border-[#1e3a3f]">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-cyan-300 text-sm flex items-center">
              🎾 <span className="ml-2">First Set Winner</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-[#1e3a3f] hover:bg-cyan-800 border-[#2a4c55] text-cyan-300 hover:text-white flex justify-between w-full"
                onClick={() => handleAddBet('First Set Winner', event.homeTeam, 1.80)}
              >
                <span>{event.homeTeam}</span>
                <span className="bg-[#0b1618] px-2 py-0.5 rounded text-cyan-400">1.80</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-[#1e3a3f] hover:bg-cyan-800 border-[#2a4c55] text-cyan-300 hover:text-white flex justify-between w-full"
                onClick={() => handleAddBet('First Set Winner', event.awayTeam, 2.00)}
              >
                <span>{event.awayTeam}</span>
                <span className="bg-[#0b1618] px-2 py-0.5 rounded text-cyan-400">2.00</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  // Choose the right rendering based on sport type
  const renderMarkets = () => {
    switch (sportId) {
      case SportIds.CRICKET:
        return renderCricketMarkets();
      case SportIds.TENNIS:
        return renderTennisMarkets();
      default:
        return renderMarketsByType();
    }
  };
  
  return (
    <div className={className}>
      <h3 className="text-cyan-300 font-bold mb-3">Available Markets</h3>
      {renderMarkets()}
    </div>
  );
};

export default SportSpecificMarkets;