import { useLocation } from "wouter";
import { useBetting } from '@/context/BettingContext';

/**
 * Live page that exactly matches the provided image
 */
export default function LiveNew() {
  const [, setLocation] = useLocation();
  const { addBet } = useBetting();

  // Function to handle bet selection
  const handleBetClick = (player: string, odds: number, type: string) => {
    addBet({
      id: `${player}_${type}_${odds}`,
      eventId: 1, 
      eventName: `${player}`,
      market: type,
      marketId: 1, 
      selectionName: player,
      odds: odds,
      stake: 10,
      currency: 'SUI'
    });
  };

  return (
    <div className="w-full min-h-screen bg-[#f2f2f2]">
      <img 
        src="/live-image.png"
        alt="Live Betting Page"
        className="w-full"
        useMap="#livemap"
      />
      
      <map name="livemap">
        {/* Navigation links */}
        <area shape="rect" coords="435,22,468,35" alt="Sports" href="/sports" />
        <area shape="rect" coords="495,22,514,35" alt="Live" href="/live" />
        <area shape="rect" coords="553,22,609,35" alt="Promotions" href="/promotions" />
        <area shape="rect" coords="816,22,861,35" alt="Join Now" href="/join" />
        <area shape="rect" coords="909,22,970,35" alt="Connect Wallet" href="/connect-wallet" />
        
        {/* Tennis matches - top row */}
        <area shape="rect" coords="318,235,365,262" alt="Arthur Fils vs Nuno Borges" 
          onClick={() => handleBetClick('Arthur Fils', 1.57, 'Match Winner')} />
        <area shape="rect" coords="465,235,512,262" alt="Arthur Fils vs Nuno Borges 2"
          onClick={() => handleBetClick('Arthur Fils', 1.57, 'Match Winner')} />
        <area shape="rect" coords="618,235,665,262" alt="Arthur Fils vs Nuno Borges 3"
          onClick={() => handleBetClick('Arthur Fils', 1.57, 'Match Winner')} />
        <area shape="rect" coords="772,235,819,262" alt="Arthur Fils vs Nuno Borges 4"
          onClick={() => handleBetClick('Arthur Fils', 1.57, 'Match Winner')} />
        <area shape="rect" coords="926,235,973,262" alt="Arthur Fils vs Nuno Borges 5"
          onClick={() => handleBetClick('Arthur Fils', 1.57, 'Match Winner')} />
          
        {/* Live tennis matches - Rwanda section */}
        <area shape="rect" coords="779,371,785,373" alt="Alex M Pujolas"
          onClick={() => handleBetClick('Alex M Pujolas', 1.07, 'Match Winner')} />
        <area shape="rect" coords="779,386,785,388" alt="Dominik Kellovsky"
          onClick={() => handleBetClick('Dominik Kellovsky', 6.96, 'Match Winner')} />
          
        {/* Handicap betting options */}
        <area shape="rect" coords="842,371,857,373" alt="Pujolas Handicap"
          onClick={() => handleBetClick('Alex M Pujolas -3.5', 1.57, 'Handicap')} />
        <area shape="rect" coords="842,386,857,388" alt="Kellovsky Handicap"
          onClick={() => handleBetClick('Dominik Kellovsky +3.5', 2.25, 'Handicap')} />
          
        {/* Total betting options */}
        <area shape="rect" coords="915,371,945,373" alt="Over 22.5"
          onClick={() => handleBetClick('Over 22.5', 2.20, 'Total')} />
        <area shape="rect" coords="915,386,945,388" alt="Under 22.5"
          onClick={() => handleBetClick('Under 22.5', 1.61, 'Total')} />
          
        {/* Second match betting options */}
        <area shape="rect" coords="779,421,785,423" alt="Maximus Jenek"
          onClick={() => handleBetClick('Maximus Jenek', 1.57, 'Match Winner')} />
        <area shape="rect" coords="779,436,785,438" alt="Mathys Erhard"
          onClick={() => handleBetClick('Mathys Erhard', 2.35, 'Match Winner')} />
      </map>
    </div>
  );
}