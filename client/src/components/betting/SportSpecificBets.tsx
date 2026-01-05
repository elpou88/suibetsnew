import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBetting } from '@/context/BettingContext';
import { formatOdds, getSportMarkets } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

// Props interface for sport-specific betting components
interface SportSpecificBetsProps {
  sportType: string;
  eventId: string | number;
  eventName: string;
  homeTeam: string;
  awayTeam: string;
  homeOdds?: number;
  drawOdds?: number;
  awayOdds?: number;
  isLive?: boolean;
}

// This component handles sport-specific betting features
const SportSpecificBets: React.FC<SportSpecificBetsProps> = ({
  sportType,
  eventId,
  eventName,
  homeTeam,
  awayTeam,
  homeOdds = 2.0,
  drawOdds = 3.5,
  awayOdds = 3.8,
  isLive = false,
}) => {
  const { addBet } = useBetting();
  
  // State to keep track of which markets are expanded
  const [expandedMarkets, setExpandedMarkets] = useState<string[]>(['match-result']);
  
  // Toggle market expansion
  const toggleMarket = (marketId: string) => {
    if (expandedMarkets.includes(marketId)) {
      setExpandedMarkets(expandedMarkets.filter(id => id !== marketId));
    } else {
      setExpandedMarkets([...expandedMarkets, marketId]);
    }
  };
  
  // Function to handle adding a bet to the slip
  const handleAddBet = (
    marketName: string,
    selectionName: string,
    odds: number,
    marketId?: number,
    outcomeId?: string | null
  ) => {
    // Create truly unique ID for this bet selection using more specific info
    // This helps prevent duplicate bets
    const uniqueIdentifier = Math.random().toString(36).substring(2, 8);
    const betId = `${eventId}-${marketName.replace(/\s+/g, '-')}-${selectionName.replace(/\s+/g, '-')}-${Date.now()}`;
    
    // Create bet object with correct types to match SelectedBet interface
    const bet = {
      id: betId,
      eventId: typeof eventId === 'string' ? eventId : String(eventId), // Always convert to string
      eventName, 
      selectionName,
      odds,
      stake: 10, // Default stake amount
      market: marketName,
      marketId, // Keep as number or undefined
      outcomeId: outcomeId || undefined,
      isLive: isLive || false, 
      uniqueId: uniqueIdentifier, // Add a random component to prevent duplicates
    };
    
    // Log the bet details for debugging
    console.log("ADDING BET:", bet);
    
    // Use the context to add the bet - context will now check for duplicates
    addBet(bet);
    
    // Log after adding to confirm it was processed
    console.log("BET ADDED TO SLIP!");
  };
  
  // Generate a random odds value within a reasonable range
  const generateOdds = (base: number = 2.0, variance: number = 0.5): number => {
    return Number((base + (Math.random() * variance)).toFixed(2));
  };

  // Common function to render a collapsible market card
  const renderMarketCard = (id: string, title: string, content: React.ReactNode) => {
    const isExpanded = expandedMarkets.includes(id);
    
    return (
      <Card key={id} className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader 
          className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative cursor-pointer"
          onClick={() => toggleMarket(id)}
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center justify-between">
            <span>{title}</span>
            {isExpanded ? 
              <ChevronDown className="h-5 w-5 text-cyan-300" /> : 
              <ChevronRight className="h-5 w-5 text-cyan-300" />
            }
          </CardTitle>
        </CardHeader>
        {isExpanded && (
          <CardContent className="flex flex-wrap gap-3 p-4">
            {content}
          </CardContent>
        )}
      </Card>
    );
  };

  // Render generic betting options available for all sports
  const renderGenericBets = () => {
    const content = (
      <>
        <Button
          variant="outline"
          onClick={() => handleAddBet('Match Result', `${homeTeam} (Win)`, homeOdds)}
          className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
        >
          <span className="text-cyan-200">{homeTeam}</span>
          <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">{formatOdds(homeOdds)}</span>
        </Button>
        
        {/* Draw option for sports that can have draws */}
        {(['football', 'soccer', 'cricket', 'hockey', 'rugby-league', 'rugby-union']).includes(sportType) && drawOdds && (
          <Button
            variant="outline"
            onClick={() => handleAddBet('Match Result', 'Draw', drawOdds)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">Draw</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">{formatOdds(drawOdds)}</span>
          </Button>
        )}
        
        <Button
          variant="outline"
          onClick={() => handleAddBet('Match Result', `${awayTeam} (Win)`, awayOdds)}
          className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
        >
          <span className="text-cyan-200">{awayTeam}</span>
          <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">{formatOdds(awayOdds)}</span>
        </Button>
      </>
    );
    
    return renderMarketCard('match-result', 'Match Result', content);
  };

  // Render football/soccer specific markets
  const renderFootballMarkets = () => (
    <>
      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            Both Teams to Score
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 p-4">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Both Teams to Score', 'Yes', 1.85)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">Yes</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.85</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Both Teams to Score', 'No', 1.95)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">No</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.95</span>
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            Total Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 p-4">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Total Goals', 'Over 2.5', 1.90)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">Over 2.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.90</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Total Goals', 'Under 2.5', 1.90)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">Under 2.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.90</span>
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            Correct Score
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3 p-4">
          {[[1, 0], [2, 0], [3, 0], [0, 0], [1, 1], [2, 1], [0, 1], [0, 2], [0, 3]].map(
            ([home, away]) => {
              const odds = calculateCorrectScoreOdds(home, away);
              return (
                <Button
                  key={`score-${home}-${away}`}
                  variant="outline"
                  onClick={() =>
                    handleAddBet('Correct Score', `${home}-${away}`, odds)
                  }
                  className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-2"
                >
                  <span className="text-lg font-bold">{`${home}-${away}`}</span>
                  <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">
                    {formatOdds(odds)}
                  </span>
                </Button>
              );
            }
          )}
        </CardContent>
      </Card>
    </>
  );

  // Render basketball specific markets
  const renderBasketballMarkets = () => (
    <>
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
            <span className="text-cyan-200">Over 199.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.90</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Total Points', 'Under 199.5', 1.90)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">Under 199.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.90</span>
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            Point Spread
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 p-4">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Point Spread', `${homeTeam} -5.5`, 1.90)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{`${homeTeam} -5.5`}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.90</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Point Spread', `${awayTeam} +5.5`, 1.90)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{`${awayTeam} +5.5`}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.90</span>
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            First Half Winner
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 p-4">
          <Button
            variant="outline"
            onClick={() => handleAddBet('First Half Winner', homeTeam, 1.85)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{homeTeam}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.85</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('First Half Winner', awayTeam, 1.95)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{awayTeam}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.95</span>
          </Button>
        </CardContent>
      </Card>
    </>
  );

  // Render tennis specific markets
  const renderTennisMarkets = () => (
    <>
      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            Total Games
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 p-4">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Total Games', 'Over 22.5', 1.95)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">Over 22.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.95</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Total Games', 'Under 22.5', 1.85)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">Under 22.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.85</span>
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            Set Betting
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 p-4">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Set Betting', `${homeTeam} 2-0`, 2.20)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
            key="set-2-0"
          >
            <span className="text-cyan-200">{`${homeTeam} 2-0`}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">2.20</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Set Betting', `${homeTeam} 2-1`, 3.50)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{`${homeTeam} 2-1`}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">3.50</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Set Betting', `${awayTeam} 2-0`, 4.00)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{`${awayTeam} 2-0`}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">4.00</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Set Betting', `${awayTeam} 2-1`, 4.50)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{`${awayTeam} 2-1`}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">4.50</span>
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            Total Games
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 p-4">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Total Games', 'Over 22.5', 1.90)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">Over 22.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.90</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Total Games', 'Under 22.5', 1.90)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">Under 22.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.90</span>
          </Button>
        </CardContent>
      </Card>
    </>
  );

  // Render boxing/MMA specific markets
  const renderBoxingMMAMarkets = () => (
    <>
      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            Method of Victory
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 p-4">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Method of Victory', `${homeTeam} by KO/TKO`, 2.50)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{`${homeTeam} by KO/TKO`}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">2.50</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Method of Victory', `${homeTeam} by Decision`, 3.00)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{`${homeTeam} by Decision`}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">3.00</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Method of Victory', `${awayTeam} by KO/TKO`, 4.00)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{`${awayTeam} by KO/TKO`}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">4.00</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Method of Victory', `${awayTeam} by Decision`, 3.50)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{`${awayTeam} by Decision`}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">3.50</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Method of Victory', 'Draw', 15.00)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">Draw</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">15.00</span>
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            Round Betting
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3 p-4">
          {[1, 2, 3, 4, 5].map((round) => {
            const odds = 8.00 + round;
            return (
              <Button
                key={`home-${homeTeam}-R${round}`}
                variant="outline"
                onClick={() => handleAddBet('Round Betting', `${homeTeam} in Round ${round}`, odds)}
                className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-2"
              >
                <span className="text-cyan-200">{`${homeTeam} R${round}`}</span>
                <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">{formatOdds(odds)}</span>
              </Button>
            );
          })}
          {[1, 2, 3, 4, 5].map((round) => {
            const odds = 10.00 + round;
            return (
              <Button
                key={`away-${awayTeam}-R${round}`}
                variant="outline"
                onClick={() => handleAddBet('Round Betting', `${awayTeam} in Round ${round}`, odds)}
                className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-2"
              >
                <span className="text-cyan-200">{`${awayTeam} R${round}`}</span>
                <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">{formatOdds(odds)}</span>
              </Button>
            );
          })}
        </CardContent>
      </Card>
    </>
  );

  // Render cricket specific markets
  const renderCricketMarkets = () => (
    <>
      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            Top Batsman
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 p-4">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Top Batsman', `${homeTeam} - Player 1`, 4.50)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{`${homeTeam} - Player 1`}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">4.50</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Top Batsman', `${homeTeam} - Player 2`, 5.00)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{`${homeTeam} - Player 2`}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">5.00</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Top Batsman', `${awayTeam} - Player 1`, 4.00)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{`${awayTeam} - Player 1`}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">4.00</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Top Batsman', `${awayTeam} - Player 2`, 5.50)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{`${awayTeam} - Player 2`}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">5.50</span>
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            Total Runs
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 p-4">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Total Runs', 'Over 350.5', 1.90)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">Over 350.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.90</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Total Runs', 'Under 350.5', 1.90)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">Under 350.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.90</span>
          </Button>
        </CardContent>
      </Card>
    </>
  );
  
  // Render hockey specific markets
  const renderHockeyMarkets = () => (
    <>
      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            Total Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 p-4">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Total Goals', 'Over 5.5', 1.85)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">Over 5.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.85</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Total Goals', 'Under 5.5', 1.95)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">Under 5.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.95</span>
          </Button>
        </CardContent>
      </Card>
      
      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            Puck Line
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 p-4">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Puck Line', `${homeTeam} -1.5`, 2.30)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{homeTeam} -1.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">2.30</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Puck Line', `${awayTeam} +1.5`, 1.60)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{awayTeam} +1.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.60</span>
          </Button>
        </CardContent>
      </Card>
    </>
  );
  
  // Render esports specific markets
  const renderEsportsMarkets = () => (
    <>
      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            Map Winner
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 p-4">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Map Winner', `${homeTeam} Map 1`, 1.85)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{`${homeTeam} Map 1`}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.85</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Map Winner', `${awayTeam} Map 1`, 1.95)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{`${awayTeam} Map 1`}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.95</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Map Winner', `${homeTeam} Map 2`, 1.90)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{`${homeTeam} Map 2`}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.90</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Map Winner', `${awayTeam} Map 2`, 1.90)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{`${awayTeam} Map 2`}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.90</span>
          </Button>
        </CardContent>
      </Card>
      
      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            Total Maps
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 p-4">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Total Maps', 'Over 2.5', 2.20)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">Over 2.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">2.20</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Total Maps', 'Under 2.5', 1.65)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">Under 2.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.65</span>
          </Button>
        </CardContent>
      </Card>
    </>
  );
  
  // Render baseball specific markets
  const renderBaseballMarkets = () => (
    <>
      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            Run Line
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 p-4">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Run Line', `${homeTeam} -1.5`, 2.10)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{homeTeam} -1.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">2.10</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Run Line', `${awayTeam} +1.5`, 1.75)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{awayTeam} +1.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.75</span>
          </Button>
        </CardContent>
      </Card>
      
      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            Total Runs
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 p-4">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Total Runs', 'Over 8.5', 1.90)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">Over 8.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.90</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Total Runs', 'Under 8.5', 1.90)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">Under 8.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.90</span>
          </Button>
        </CardContent>
      </Card>
    </>
  );
  
  // Render American football specific markets
  const renderAmericanFootballMarkets = () => (
    <>
      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            Point Spread
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 p-4">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Point Spread', `${homeTeam} -7.5`, 1.90)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{homeTeam} -7.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.90</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Point Spread', `${awayTeam} +7.5`, 1.90)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{awayTeam} +7.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.90</span>
          </Button>
        </CardContent>
      </Card>
      
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
            onClick={() => handleAddBet('Total Points', 'Over 48.5', 1.90)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">Over 48.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.90</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Total Points', 'Under 48.5', 1.90)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">Under 48.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.90</span>
          </Button>
        </CardContent>
      </Card>
    </>
  );
  
  // Render precision sports markets (golf, darts, snooker)
  const renderPrecisionSportsMarkets = () => (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Tournament Winner</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Tournament Winner', homeTeam, 12.0)}
            className="flex flex-col"
          >
            <span className="text-cyan-200">{homeTeam}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">12.00</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Tournament Winner', awayTeam, 15.0)}
            className="flex flex-col"
          >
            <span className="text-cyan-200">{awayTeam}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">15.00</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Tournament Winner', 'Other Player 1', 8.5)}
            className="flex flex-col"
          >
            <span className="text-cyan-200">Other Player 1</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">8.50</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Tournament Winner', 'Other Player 2', 10.0)}
            className="flex flex-col"
          >
            <span className="text-cyan-200">Other Player 2</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">10.00</span>
          </Button>
        </CardContent>
      </Card>
      
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>To Make Final</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleAddBet('To Make Final', homeTeam, 4.5)}
            className="flex-1 flex flex-col"
          >
            <span className="text-cyan-200">{homeTeam}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">4.50</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('To Make Final', awayTeam, 5.0)}
            className="flex-1 flex flex-col"
          >
            <span className="text-cyan-200">{awayTeam}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">5.00</span>
          </Button>
        </CardContent>
      </Card>
    </>
  );
  
  // Render racing sports markets (Formula 1, cycling)
  const renderRacingSportsMarkets = () => (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Race/Stage Winner</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Race Winner', 'Max Verstappen', 1.80)}
            className="flex flex-col"
          >
            <span className="text-cyan-200">Max Verstappen</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.80</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Race Winner', 'Lewis Hamilton', 5.50)}
            className="flex flex-col"
          >
            <span className="text-cyan-200">Lewis Hamilton</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">5.50</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Race Winner', 'Charles Leclerc', 7.00)}
            className="flex flex-col"
          >
            <span className="text-cyan-200">Charles Leclerc</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">7.00</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Race Winner', 'Lando Norris', 9.00)}
            className="flex flex-col"
          >
            <span className="text-cyan-200">Lando Norris</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">9.00</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Race Winner', 'Sergio Perez', 12.00)}
            className="flex flex-col"
          >
            <span className="text-cyan-200">Sergio Perez</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">12.00</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Race Winner', 'Carlos Sainz', 15.00)}
            className="flex flex-col"
          >
            <span className="text-cyan-200">Carlos Sainz</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">15.00</span>
          </Button>
        </CardContent>
      </Card>
      
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Podium Finish</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Podium Finish', 'Max Verstappen', 1.20)}
            className="flex flex-col"
          >
            <span className="text-cyan-200">Max Verstappen</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.20</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Podium Finish', 'Lewis Hamilton', 1.90)}
            className="flex flex-col"
          >
            <span className="text-cyan-200">Lewis Hamilton</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.90</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Podium Finish', 'Charles Leclerc', 2.20)}
            className="flex flex-col"
          >
            <span className="text-cyan-200">Charles Leclerc</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">2.20</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Podium Finish', 'Lando Norris', 2.50)}
            className="flex flex-col"
          >
            <span className="text-cyan-200">Lando Norris</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">2.50</span>
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Fastest Lap</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Fastest Lap', 'Max Verstappen', 2.10)}
            className="flex flex-col"
          >
            <span className="text-cyan-200">Max Verstappen</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">2.10</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Fastest Lap', 'Lewis Hamilton', 3.00)}
            className="flex flex-col"
          >
            <span className="text-cyan-200">Lewis Hamilton</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">3.00</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Fastest Lap', 'Charles Leclerc', 4.50)}
            className="flex flex-col"
          >
            <span className="text-cyan-200">Charles Leclerc</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">4.50</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Fastest Lap', 'Lando Norris', 5.00)}
            className="flex flex-col"
          >
            <span className="text-cyan-200">Lando Norris</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">5.00</span>
          </Button>
        </CardContent>
      </Card>
    </>
  );
  
  // Render individual sports markets (athletics, swimming)
  const renderIndividualSportsMarkets = () => (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Gold Medal Winner</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Gold Medal', homeTeam, 2.5)}
            className="flex flex-col"
          >
            <span className="text-cyan-200">{homeTeam}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">2.50</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Gold Medal', awayTeam, 3.2)}
            className="flex flex-col"
          >
            <span className="text-cyan-200">{awayTeam}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">3.20</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Gold Medal', 'Athlete 3', 4.0)}
            className="flex flex-col"
          >
            <span className="text-cyan-200">Athlete 3</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">4.00</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Gold Medal', 'Athlete 4', 6.5)}
            className="flex flex-col"
          >
            <span className="text-cyan-200">Athlete 4</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">6.50</span>
          </Button>
        </CardContent>
      </Card>
      
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>To Win a Medal</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleAddBet('To Win a Medal', homeTeam, 1.5)}
            className="flex-1 flex flex-col"
          >
            <span className="text-cyan-200">{homeTeam}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.50</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('To Win a Medal', awayTeam, 1.7)}
            className="flex-1 flex flex-col"
          >
            <span className="text-cyan-200">{awayTeam}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.70</span>
          </Button>
        </CardContent>
      </Card>
    </>
  );
  
  // Render animal racing markets (horse racing, greyhounds)
  const renderAnimalRacingMarkets = () => (
    <>
      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            Race Winner
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 p-4">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Race Winner', homeTeam, 4.5)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{homeTeam}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">4.50</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Race Winner', awayTeam, 6.0)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{awayTeam}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">6.00</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Race Winner', 'Black Beauty', 8.0)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">Black Beauty</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">8.00</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Race Winner', 'Silver Star', 10.0)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">Silver Star</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">10.00</span>
          </Button>
        </CardContent>
      </Card>
      
      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            Each Way
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 p-4">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Each Way', `${homeTeam} (E/W)`, 2.0)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{`${homeTeam} (E/W)`}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">2.00</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Each Way', `${awayTeam} (E/W)`, 2.5)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{`${awayTeam} (E/W)`}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">2.50</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Each Way', 'Black Beauty (E/W)', 3.2)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">Black Beauty (E/W)</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">3.20</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Each Way', 'Silver Star (E/W)', 4.0)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">Silver Star (E/W)</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">4.00</span>
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            Forecast
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 p-4">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Forecast', `${homeTeam} / ${awayTeam}`, 14.0)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{`${homeTeam} / ${awayTeam}`}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">14.00</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Forecast', `${awayTeam} / ${homeTeam}`, 16.0)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{`${awayTeam} / ${homeTeam}`}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">16.00</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Forecast', `${homeTeam} / Black Beauty`, 18.0)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{`${homeTeam} / Black Beauty`}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">18.00</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Forecast', `${awayTeam} / Silver Star`, 22.0)}
            className="flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{`${awayTeam} / Silver Star`}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">22.00</span>
          </Button>
        </CardContent>
      </Card>
    </>
  );
  
  // Render generic sport markets for any other sports
  const renderGenericSportMarkets = () => (
    <>
      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            Handicap
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 p-4">
          <Button
            variant="outline"
            onClick={() => handleAddBet('Handicap', `${homeTeam} -1.5`, 2.0)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{homeTeam} -1.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">2.00</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('Handicap', `${awayTeam} +1.5`, 1.80)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{awayTeam} +1.5</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.80</span>
          </Button>
        </CardContent>
      </Card>
      
      <Card className="mb-6 border-[#1e3a3f] bg-gradient-to-b from-[#14292e] to-[#112225] shadow-lg shadow-cyan-900/10">
        <CardHeader className="pb-3 bg-[#0b1618] border-b border-[#1e3a3f] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"></div>
          <CardTitle className="text-cyan-300 font-bold flex items-center">
            First to Score
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 p-4">
          <Button
            variant="outline"
            onClick={() => handleAddBet('First to Score', homeTeam, 1.85)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{homeTeam}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.85</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddBet('First to Score', awayTeam, 1.95)}
            className="flex-1 flex flex-col border-[#1e3a3f] bg-[#0b1618] hover:bg-cyan-400/20 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-200 py-3"
          >
            <span className="text-cyan-200">{awayTeam}</span>
            <span className="text-sm font-bold mt-1 bg-[#0f3942] text-cyan-300 px-3 py-1 rounded-md shadow-inner shadow-cyan-900/30">1.95</span>
          </Button>
        </CardContent>
      </Card>
    </>
  );

  // Function to calculate correct score odds
  const calculateCorrectScoreOdds = (homeGoals: number, awayGoals: number): number => {
    // Calculate odds based on both teams' scoring probabilities
    const baseOdds = homeOdds && awayOdds ? (homeOdds + awayOdds) / 2 : 2;
    const goalDiff = Math.abs(homeGoals - awayGoals);
    const totalGoals = homeGoals + awayGoals;
    
    // Higher odds for unusual scorelines
    if (totalGoals > 4) {
      return baseOdds * (1 + totalGoals);
    }
    
    // Lower odds for common scorelines
    if ((homeGoals === 1 && awayGoals === 0) || (homeGoals === 0 && awayGoals === 1)) {
      return baseOdds * 3;
    }
    
    if (homeGoals === 0 && awayGoals === 0) {
      return baseOdds * 6;
    }
    
    // Default calculation
    return baseOdds * (2 + goalDiff) * (1 + totalGoals / 2);
  };

  // Get appropriate markets based on sport type
  const getMarketsForSport = () => {
    // Always render generic bets
    const markets = [renderGenericBets()];
    
    // Add sport-specific markets
    switch (sportType) {
      // Team sports with similar market structures
      case 'football':
      case 'soccer':
        markets.push(renderFootballMarkets());
        break;
      case 'basketball':
        markets.push(renderBasketballMarkets());
        break;
      case 'tennis':
        markets.push(renderTennisMarkets());
        break;
      case 'boxing':
      case 'mma-ufc':
        markets.push(renderBoxingMMAMarkets());
        break;
      case 'cricket':
        markets.push(renderCricketMarkets());
        break;
      case 'hockey':
        markets.push(renderHockeyMarkets());
        break;
      case 'esports':
        markets.push(renderEsportsMarkets());
        break;
      case 'baseball':
        markets.push(renderBaseballMarkets());
        break;
      case 'american-football':
        markets.push(renderAmericanFootballMarkets());
        break;

      // New sports with similar market structures to existing ones
      case 'badminton':
      case 'table-tennis':
        // Similar markets to tennis
        markets.push(renderTennisMarkets());
        break;

      case 'handball':
      case 'volleyball':
      case 'beach-volleyball':
      case 'rugby-league': 
      case 'rugby-union':
      case 'afl':
        // Similar markets to team sports
        markets.push(renderFootballMarkets());
        break;

      case 'golf':
      case 'darts':
      case 'snooker':
        // Precision sports
        markets.push(renderPrecisionSportsMarkets());
        break;

      case 'formula-1':
      case 'cycling':
        // Racing sports
        markets.push(renderRacingSportsMarkets());
        break;

      case 'athletics':
      case 'swimming':
        // Individual sports/competitions
        markets.push(renderIndividualSportsMarkets());
        break;

      case 'horse-racing':
      case 'greyhounds':
        // Racing with animals
        markets.push(renderAnimalRacingMarkets());
        break;
        
      default:
        // For other sports, provide at least some basic sport-specific markets
        markets.push(renderGenericSportMarkets());
        break;
    }
    
    return markets;
  };

  // We're returning the component but not displaying it visibly
  // This ensures all betting functionality works behind the scenes
  const marketComponents = getMarketsForSport();
  return (
    <div className="sport-specific-bets">
      {marketComponents.map((market, index) => (
        <div key={`market-${index}`}>
          {market}
        </div>
      ))}
    </div>
  );
};

export default SportSpecificBets;