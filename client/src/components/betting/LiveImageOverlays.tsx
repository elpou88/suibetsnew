import React, { useEffect, useRef, useState } from 'react';
import { useBetting } from '@/context/BettingContext';

interface LiveImageOverlaysProps {
  imageSrc: string;
}

/**
 * This component creates clickable areas on top of live sports image interfaces
 * without modifying the original design. It allows users to click directly on
 * teams/odds shown in the image to place bets.
 */
export const LiveImageOverlays: React.FC<LiveImageOverlaysProps> = ({ imageSrc }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const { addBet } = useBetting();
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  
  // Fetch live events on mount
  useEffect(() => {
    const fetchLiveEvents = async () => {
      try {
        // In a real app, get this data from the API
        // For now, hard-code some example live events
        const events = [
          {
            id: 1001,
            homeTeam: 'Arthur Fils',
            awayTeam: 'Pablo Carreno',
            homeOdds: 1.57,
            awayOdds: 2.42,
            sport: 'tennis',
            isLive: true
          },
          {
            id: 1002,
            homeTeam: 'Alex M Pujolas',
            awayTeam: 'Dominik Kellovsky',
            homeOdds: 1.07,
            awayOdds: 6.96,
            sport: 'tennis',
            isLive: true
          },
          {
            id: 1003,
            homeTeam: 'Arsenal',
            awayTeam: 'Tottenham',
            homeOdds: 1.45,
            awayOdds: 2.85,
            drawOdds: 3.50,
            sport: 'football',
            isLive: true
          },
          {
            id: 1004,
            homeTeam: 'Lakers',
            awayTeam: 'Warriors',
            homeOdds: 1.60,
            awayOdds: 2.45,
            sport: 'basketball',
            isLive: true
          }
        ];
        
        setLiveEvents(events);
      } catch (error) {
        console.error('Error fetching live events:', error);
      }
    };
    
    fetchLiveEvents();
  }, []);
  
  useEffect(() => {
    // Create image map for betting clicks based on image src
    const imageMap = document.createElement('map');
    imageMap.name = 'live-betting-map';
    
    // Add the image map to the DOM
    document.body.appendChild(imageMap);
    
    // If the image has loaded, connect it to the map
    if (imageRef.current) {
      imageRef.current.useMap = '#live-betting-map';
    }
    
    // Set up the clickable areas based on the image being used
    setupClickableAreas(imageMap, imageSrc);
    
    return () => {
      // Clean up the image map when component unmounts
      document.body.removeChild(imageMap);
    };
  }, [imageSrc]);
  
  // Handle clicking on a betting option in the image
  const handleBetClick = (
    selectionName: string,
    odds: number,
    market: string
  ) => {
    // Generate a unique ID for this bet
    const betId = `live-${market}-${selectionName}-${Date.now()}`;
    
    // Create a mockup event ID for live events (specific logic would depend on the API)
    const liveEventId = 1000 + Math.floor(Math.random() * 100);
    
    // Add the bet to the betslip
    addBet({
      id: betId,
      eventId: liveEventId,
      eventName: `Live: ${selectionName.split(' ')[0]} match`,
      selectionName,
      odds,
      stake: 10, // Default stake amount
      market,
      isLive: true
    });
    
    // Provide minimal visual feedback that the bet was added - matching site color scheme
    const feedbackElement = document.createElement('div');
    feedbackElement.textContent = `Added ${selectionName} @ ${odds} to Bet Slip`;
    feedbackElement.style.position = 'fixed';
    feedbackElement.style.bottom = '20px';
    feedbackElement.style.right = '20px';
    feedbackElement.style.backgroundColor = '#112225'; // Dark teal/blue background
    feedbackElement.style.color = '#fff';
    feedbackElement.style.padding = '10px 15px';
    feedbackElement.style.borderRadius = '5px';
    feedbackElement.style.zIndex = '9999';
    feedbackElement.style.opacity = '0';
    feedbackElement.style.transform = 'translateY(20px)';
    feedbackElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    feedbackElement.style.border = '1px solid #1e3a3f'; // Teal border for consistency
    feedbackElement.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
    
    document.body.appendChild(feedbackElement);
    
    // Animate in
    setTimeout(() => {
      feedbackElement.style.opacity = '1';
      feedbackElement.style.transform = 'translateY(0)';
    }, 10);
    
    // Animate out and remove
    setTimeout(() => {
      feedbackElement.style.opacity = '0';
      feedbackElement.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        if (document.body.contains(feedbackElement)) {
          document.body.removeChild(feedbackElement);
        }
      }, 300); // Wait for the animation to complete
    }, 2000);
  };
  
  // Set up the clickable areas on the image map
  const setupClickableAreas = (mapElement: HTMLMapElement, src: string) => {
    // Clear any existing areas
    mapElement.innerHTML = '';
    
    // Different clickable areas based on the image being shown
    // These coordinates would need to be adjusted based on the actual images
    
    // Define common coordinates for different live page images
    if (src.includes('Live') || src.includes('live')) {
      // Add click areas for the top tennis match
      const area1 = document.createElement('area');
      area1.shape = 'rect';
      area1.coords = '289,250,305,270';
      area1.alt = 'Arthur Fils';
      area1.addEventListener('click', () => {
        handleBetClick('Arthur Fils', 1.57, 'Match Winner');
      });
      mapElement.appendChild(area1);
      
      const area2 = document.createElement('area');
      area2.shape = 'rect';
      area2.coords = '289,270,305,290';
      area2.alt = 'Pablo Carreno';
      area2.addEventListener('click', () => {
        handleBetClick('Pablo Carreno', 2.42, 'Match Winner');
      });
      mapElement.appendChild(area2);
      
      // Add click areas for the bottom tennis match
      const area3 = document.createElement('area');
      area3.shape = 'rect';
      area3.coords = '779,370,785,375';
      area3.alt = 'Alex M Pujolas';
      area3.addEventListener('click', () => {
        handleBetClick('Alex M Pujolas', 1.07, 'Match Winner');
      });
      mapElement.appendChild(area3);
      
      const area4 = document.createElement('area');
      area4.shape = 'rect';
      area4.coords = '779,385,785,390';
      area4.alt = 'Dominik Kellovsky';
      area4.addEventListener('click', () => {
        handleBetClick('Dominik Kellovsky', 6.96, 'Match Winner');
      });
      mapElement.appendChild(area4);
      
      // Add click areas for handicap bets
      const area5 = document.createElement('area');
      area5.shape = 'rect';
      area5.coords = '842,370,857,375';
      area5.alt = 'Pujolas Handicap';
      area5.addEventListener('click', () => {
        handleBetClick('Alex M Pujolas -3.5', 1.57, 'Handicap');
      });
      mapElement.appendChild(area5);
      
      const area6 = document.createElement('area');
      area6.shape = 'rect';
      area6.coords = '842,385,857,390';
      area6.alt = 'Kellovsky Handicap';
      area6.addEventListener('click', () => {
        handleBetClick('Dominik Kellovsky +3.5', 2.25, 'Handicap');
      });
      mapElement.appendChild(area6);
      
      // Add click areas for total bets
      const area7 = document.createElement('area');
      area7.shape = 'rect';
      area7.coords = '915,370,945,375';
      area7.alt = 'Over 22.5';
      area7.addEventListener('click', () => {
        handleBetClick('Over 22.5', 2.20, 'Total');
      });
      mapElement.appendChild(area7);
      
      const area8 = document.createElement('area');
      area8.shape = 'rect';
      area8.coords = '915,385,945,390';
      area8.alt = 'Under 22.5';
      area8.addEventListener('click', () => {
        handleBetClick('Under 22.5', 1.61, 'Total');
      });
      mapElement.appendChild(area8);
    }
    
    // Add more conditions for other sport-specific images
    if (src.includes('Sports_1') || src.includes('sports_1')) {
      // Soccer odds
      const area1 = document.createElement('area');
      area1.shape = 'rect';
      area1.coords = '289,190,305,210';
      area1.alt = 'Arsenal';
      area1.addEventListener('click', () => {
        handleBetClick('Arsenal', 1.45, 'Match Winner');
      });
      mapElement.appendChild(area1);
      
      const area2 = document.createElement('area');
      area2.shape = 'rect';
      area2.coords = '289,210,305,230';
      area2.alt = 'Tottenham';
      area2.addEventListener('click', () => {
        handleBetClick('Tottenham', 2.85, 'Match Winner');
      });
      mapElement.appendChild(area2);
    }
    
    if (src.includes('Sports_2') || src.includes('Sports 2')) {
      // Basketball odds
      const area1 = document.createElement('area');
      area1.shape = 'rect';
      area1.coords = '289,190,305,210';
      area1.alt = 'Lakers';
      area1.addEventListener('click', () => {
        handleBetClick('Lakers', 1.60, 'Match Winner');
      });
      mapElement.appendChild(area1);
      
      const area2 = document.createElement('area');
      area2.shape = 'rect';
      area2.coords = '289,210,305,230';
      area2.alt = 'Warriors';
      area2.addEventListener('click', () => {
        handleBetClick('Warriors', 2.45, 'Match Winner');
      });
      mapElement.appendChild(area2);
    }
    
    // Add general click handler for the entire image
    const fullImageArea = document.createElement('area');
    fullImageArea.shape = 'default';
    fullImageArea.addEventListener('click', (e) => {
      const rect = imageRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      // Calculate click position relative to the image
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      console.log(`Click coordinates: ${x}, ${y}`);
      
      // Define regions on the image as clickable for betting
      // These would need adjustment based on the actual image
      
      // Left section - might be home team
      if (x < rect.width * 0.33) {
        if (y < rect.height * 0.3) {
          handleBetClick('Home Team 1', 1.80, 'Match Winner');
        } else if (y < rect.height * 0.6) {
          handleBetClick('Home Team 2', 1.95, 'Match Winner');
        } else {
          handleBetClick('Home Team 3', 2.10, 'Match Winner');
        }
      }
      // Center section - might be draw
      else if (x < rect.width * 0.66) {
        if (y < rect.height * 0.3) {
          handleBetClick('Draw 1', 3.50, 'Match Winner');
        } else if (y < rect.height * 0.6) {
          handleBetClick('Draw 2', 3.25, 'Match Winner');
        } else {
          handleBetClick('Draw 3', 3.40, 'Match Winner');
        }
      }
      // Right section - might be away team
      else {
        if (y < rect.height * 0.3) {
          handleBetClick('Away Team 1', 4.20, 'Match Winner');
        } else if (y < rect.height * 0.6) {
          handleBetClick('Away Team 2', 3.90, 'Match Winner');
        } else {
          handleBetClick('Away Team 3', 4.50, 'Match Winner');
        }
      }
    });
    mapElement.appendChild(fullImageArea);
    
    console.log(`Set up clickable betting areas for image: ${src}`);
  };
  
  // Add direct click handlers to any visible live event elements in the DOM
  useEffect(() => {
    if (liveEvents.length === 0) return;
    
    // Find existing live event elements in the DOM to add click handlers to
    // without modifying the UI structure
    const findAndEnhanceLiveElements = () => {
      const liveElements = document.querySelectorAll('[class*="live"], [class*="Live"]');
      
      console.log(`Found ${liveElements.length} potential live elements to enhance`);
      
      // Process each live element
      liveElements.forEach(element => {
        // Skip if already processed
        if (element.hasAttribute('data-betting-enhanced')) return;
        
        // Mark as processed to avoid duplicate handlers
        element.setAttribute('data-betting-enhanced', 'true');
        
        // Add direct click handler to the element
        element.addEventListener('click', (e) => {
          // Stop propagation to prevent multiple handlers
          e.stopPropagation();
          
          const rect = element.getBoundingClientRect();
          if (!rect || rect.width === 0) return;
          
          // Calculate relative position within the element
          const relativeX = (e.clientX - rect.left) / rect.width;
          
          // Find a matching event based on text content
          let matchedEvent = null;
          
          // Check for team name mentions in the text
          const elementText = element.textContent || '';
          for (const event of liveEvents) {
            if (elementText.includes(event.homeTeam) || elementText.includes(event.awayTeam)) {
              matchedEvent = event;
              break;
            }
          }
          
          // If we found a match, create a bet based on click position
          if (matchedEvent) {
            // Map the relative X position to a team selection
            if (relativeX < 0.33) {
              // Left third - home team
              handleBetClick(matchedEvent.homeTeam, matchedEvent.homeOdds, 'Match Winner');
            } else if (relativeX > 0.66) {
              // Right third - away team
              handleBetClick(matchedEvent.awayTeam, matchedEvent.awayOdds, 'Match Winner');
            } else if (matchedEvent.drawOdds) {
              // Middle third - draw (if applicable)
              handleBetClick('Draw', matchedEvent.drawOdds, 'Match Winner');
            } else {
              // Default to home team if no draw available
              handleBetClick(matchedEvent.homeTeam, matchedEvent.homeOdds, 'Match Winner');
            }
          } else {
            // If no specific match was found, use a default approach with the live events
            const eventIndex = Math.min(Math.floor(relativeX * liveEvents.length), liveEvents.length - 1);
            const event = liveEvents[eventIndex];
            
            if (relativeX < 0.33) {
              handleBetClick(event.homeTeam, event.homeOdds, 'Match Winner');
            } else if (relativeX > 0.66) {
              handleBetClick(event.awayTeam, event.awayOdds, 'Match Winner');
            } else if (event.drawOdds) {
              handleBetClick('Draw', event.drawOdds, 'Match Winner');
            }
          }
        });
        
        // Also check for child elements with odds
        const potentialOddsElements = element.querySelectorAll('*');
        potentialOddsElements.forEach(el => {
          const text = el.textContent || '';
          if (/\d+\.\d+/.test(text)) {
            // This contains a decimal number, might be odds
            el.addEventListener('click', (e) => {
              e.stopPropagation();
              
              // Extract the odds value
              const oddsMatch = text.match(/\d+\.\d+/);
              if (oddsMatch) {
                const odds = parseFloat(oddsMatch[0]);
                
                // Try to determine which team this odds is for
                let teamName = 'Selection';
                
                // Check for team names nearby
                for (const event of liveEvents) {
                  if (text.includes(event.homeTeam) || 
                      (el.previousElementSibling && el.previousElementSibling.textContent?.includes(event.homeTeam))) {
                    teamName = event.homeTeam;
                    break;
                  } else if (text.includes(event.awayTeam) || 
                            (el.previousElementSibling && el.previousElementSibling.textContent?.includes(event.awayTeam))) {
                    teamName = event.awayTeam;
                    break;
                  } else if (text.toLowerCase().includes('draw') || 
                            (el.previousElementSibling && el.previousElementSibling.textContent?.toLowerCase().includes('draw'))) {
                    teamName = 'Draw';
                    break;
                  }
                }
                
                // Create the bet
                handleBetClick(teamName, odds, 'Match Winner');
              }
            });
          }
        });
      });
    };
    
    // Run the enhancement immediately
    findAndEnhanceLiveElements();
    
    // Also set up a mutation observer to catch dynamically added elements
    const observer = new MutationObserver((mutations) => {
      let shouldReprocess = false;
      
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldReprocess = true;
        }
      });
      
      if (shouldReprocess) {
        findAndEnhanceLiveElements();
      }
    });
    
    // Start observing the document with the configured parameters
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Clean up the observer when the component unmounts
    return () => {
      observer.disconnect();
    };
  }, [liveEvents]);
  
  // This component renders an invisible image reference to connect the map
  return (
    <img 
      ref={imageRef}
      src={imageSrc}
      style={{ display: 'none' }}
      alt="Live betting map reference"
    />
  );
};

export default LiveImageOverlays;