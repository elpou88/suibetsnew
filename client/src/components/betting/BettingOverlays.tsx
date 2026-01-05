import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useBetting } from '@/context/BettingContext';
import { Event } from '@/types';
import { formatOdds } from '@/lib/utils';

/**
 * This component creates transparent clickable overlays on the existing UI,
 * allowing users to click on events to place bets without modifying the UI design
 */
export const BettingOverlays: React.FC = () => {
  const [loaded, setLoaded] = useState(false);
  const { addBet } = useBetting();
  
  // Fetch all events to make them clickable
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ['/api/events'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/events');
      return response.json();
    }
  });
  
  // Track screen size for responsive positioning
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  
  useEffect(() => {
    // Update window size on resize
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    window.addEventListener('resize', handleResize);
    
    // Log click positions for debugging
    const handleClick = (e: MouseEvent) => {
      // Calculate position percentages for responsive positioning
      const xPercent = (e.clientX / window.innerWidth) * 100;
      const yPercent = (e.clientY / window.innerHeight) * 100;
      console.log(`Clicked at position: ${xPercent}, ${yPercent}`);
      console.log(`Click coordinates: ${e.clientX}, ${e.clientY}`);
    };
    
    window.addEventListener('click', handleClick);
    
    // Create betting overlays after a small delay
    setTimeout(() => setLoaded(true), 1000);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('click', handleClick);
    };
  }, []);
  
  // Handle clicking on a sport event
  const handleBetClick = (
    eventId: number,
    eventName: string,
    selectionName: string,
    odds: number,
    market: string
  ) => {
    // Create unique bet ID
    const betId = `${eventId}-${market}-${selectionName}-${Date.now()}`;
    
    // Add the bet to the betting slip
    addBet({
      id: betId,
      eventId,
      eventName,
      selectionName,
      odds,
      stake: 10, // Default stake amount
      market
    });
    
    // Show a visual indication that the bet was added (optional)
    const element = document.getElementById(`overlay-${eventId}-${market}-${selectionName}`);
    if (element) {
      element.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
      setTimeout(() => {
        element.style.backgroundColor = 'transparent';
      }, 300);
    }
  };
  
  // Render clickable overlays only after component is loaded
  if (!loaded) return null;
  
  return (
    <>
      {/* Fixed position overlays for common UI elements */}
      
      {/* Home Page Match Cards */}
      <div 
        style={{
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          pointerEvents: 'none', // Pass through clicks by default
          zIndex: 999
        }}
      >
        {/* Map events to create clickable areas */}
        {events.map((event, index) => {
          // Dynamic positioning based on index and screen size
          // These positions would need to be calibrated based on the actual UI layout
          const yOffset = (index * 120) + 200; // Vertical position
          
          return (
            <React.Fragment key={event.id}>
              {/* Home Team Bet Area */}
              <div
                id={`overlay-${event.id}-match-winner-${event.homeTeam}`}
                onClick={() => handleBetClick(
                  event.id,
                  `${event.homeTeam} vs ${event.awayTeam}`,
                  event.homeTeam,
                  event.homeOdds || 1.90,
                  'Match Winner'
                )}
                style={{
                  position: 'absolute',
                  left: '60%', 
                  top: `${yOffset}px`,
                  width: '60px',
                  height: '30px',
                  background: 'transparent',
                  cursor: 'pointer',
                  pointerEvents: 'auto', // Enable clicks on this element
                  zIndex: 1000
                }}
              />
              
              {/* Away Team Bet Area */}
              <div
                id={`overlay-${event.id}-match-winner-${event.awayTeam}`}
                onClick={() => handleBetClick(
                  event.id,
                  `${event.homeTeam} vs ${event.awayTeam}`,
                  event.awayTeam,
                  event.awayOdds || 3.80,
                  'Match Winner'
                )}
                style={{
                  position: 'absolute',
                  left: '75%', 
                  top: `${yOffset}px`,
                  width: '60px',
                  height: '30px',
                  background: 'transparent',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  zIndex: 1000
                }}
              />
              
              {/* Draw Bet Area (if applicable) */}
              {event.drawOdds && (
                <div
                  id={`overlay-${event.id}-match-winner-Draw`}
                  onClick={() => handleBetClick(
                    event.id,
                    `${event.homeTeam} vs ${event.awayTeam}`,
                    'Draw',
                    event.drawOdds,
                    'Match Winner'
                  )}
                  style={{
                    position: 'absolute',
                    left: '68%', 
                    top: `${yOffset}px`,
                    width: '60px',
                    height: '30px',
                    background: 'transparent',
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                    zIndex: 1000
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {/* Click handler for sport cards on home page */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 900
        }}
        onClick={(e) => {
          // Get exact coordinates
          const x = e.clientX;
          const y = e.clientY;
          
          // Find if we clicked on a bet card area
          // This is just a basic example - would need to be adjusted
          // based on actual UI layout
          const cardWidth = 250;
          const cardHeight = 100;
          
          // Left side of screen might be sports list
          if (x < 250) {
            console.log("Click in sports list area");
            // Handle sports list click
          }
          // Right side might be betslip
          else if (x > windowSize.width - 300) {
            console.log("Click in betslip area");
            // Betslip is already handled by its component
          }
          // Center might be events list
          else {
            // Find which event might have been clicked
            // This is very simplified and would need adjustment
            const eventIndex = Math.floor((y - 200) / 120);
            
            if (eventIndex >= 0 && eventIndex < events.length) {
              const event = events[eventIndex];
              // Determine which part of the card was clicked
              if (x > windowSize.width * 0.7) {
                // Right side - might be odds buttons
                handleBetClick(
                  event.id, 
                  `${event.homeTeam} vs ${event.awayTeam}`,
                  event.awayTeam,
                  event.awayOdds || 3.80,
                  'Match Winner'
                );
              } else if (x > windowSize.width * 0.6) {
                // Middle - might be draw odds
                if (event.drawOdds) {
                  handleBetClick(
                    event.id,
                    `${event.homeTeam} vs ${event.awayTeam}`,
                    'Draw',
                    event.drawOdds,
                    'Match Winner'
                  );
                }
              } else if (x > windowSize.width * 0.5) {
                // Left odds - might be home team
                handleBetClick(
                  event.id,
                  `${event.homeTeam} vs ${event.awayTeam}`,
                  event.homeTeam,
                  event.homeOdds || 1.90,
                  'Match Winner'
                );
              }
            }
          }
        }}
      />
      
      {/* Sport-specific overlays would be added here */}
      {/* These would need to be customized based on sport layouts */}
      
      {/* Debug mode to show overlay areas (comment out in production) */}
      {/* {import.meta.env.DEV && (
        <style>{`
          [id^="overlay-"] {
            background-color: rgba(255, 0, 0, 0.1) !important;
            border: 1px dashed red;
          }
        `}</style>
      )} */}
    </>
  );
};

export default BettingOverlays;