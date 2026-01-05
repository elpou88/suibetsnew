import React, { useEffect } from 'react';
import { useBetting } from '@/context/BettingContext';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Event } from '@/types';

/**
 * This component adds universal click handling to the entire application
 * to enable betting from any page without modifying the UI design.
 * 
 * This has been improved to be more selective about which clicks trigger bets
 * to prevent accidental bet additions.
 */
export const UniversalClickHandler: React.FC = () => {
  const { addBet } = useBetting();
  
  // Fetch all events to have them available for betting
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ['/api/events'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/events');
      return response.json();
    }
  });
  
  useEffect(() => {
    console.log(`Loaded ${events.length} events for betting`);
    
    // Add the click event listener to the document
    const handleDocumentClick = (e: MouseEvent) => {
      // Get the clicked element
      const element = e.target as HTMLElement;
      
      // Check if we're on a sport-specific page
      const path = window.location.pathname;
      const isLivePage = path.includes('/live');
      const isSportPage = path.includes('/sport/');
      const sportSlug = isSportPage ? path.split('/').pop() : '';
      const isOnBettingPage = isSportPage || isLivePage;
      
      // Log for debugging
      console.log(`Sport Page - sport slug:`, sportSlug);
      console.log(`Full pathname:`, path);
      console.log(`Click coordinates: ${e.clientX}, ${e.clientY}`);
      
      // Only allow betting interactions on sport-related pages
      if (!isOnBettingPage) {
        return;
      }
      
      // Check if this is an odds-like element (contains decimal number formatting)
      // Only trigger if it's a specific UI element that's meant to be clickable
      const isOddsElement = element.textContent && 
                            /\d+\.\d+/.test(element.textContent || '') && 
                            (element.tagName === 'BUTTON' || 
                             element.className.includes('odds') || 
                             element.className.includes('bet') || 
                             element.role === 'button' ||
                             element.closest('[role="button"]'));
      
      // Check if clicked on a team name - using more precise exact matching
      const possibleTeamName = element.textContent?.trim();
      // Only match a team name if it's a reasonable length and not a very common word
      const isValidTeamName = possibleTeamName && 
                              possibleTeamName.length > 3 && 
                              !['the', 'and', 'for', 'vs', 'live', 'view', 'more', 'less', 'matches'].includes(possibleTeamName.toLowerCase());
      
      // Find matching event with more precise logic to avoid false positives
      const matchingEvent = isValidTeamName ? events.find(event => {
        // Check for exact match first
        if (event.homeTeam === possibleTeamName || event.awayTeam === possibleTeamName) {
          return true;
        }
        
        // Otherwise only match if the team name is a significant part of the text
        const homeTeamWords = event.homeTeam.split(' ');
        const awayTeamWords = event.awayTeam.split(' ');
        
        // Check if the clicked text exactly matches one of the team name words
        return homeTeamWords.includes(possibleTeamName) || awayTeamWords.includes(possibleTeamName);
      }) : null;
      
      // Check if we clicked on a card or area containing event information
      const eventContainer = element.closest('[class*="card"], [class*="event"], [class*="match"]');
      const containsEventInfo = eventContainer && events.some(event => {
        return (
          eventContainer.textContent?.includes(event.homeTeam) && 
          eventContainer.textContent?.includes(event.awayTeam)
        );
      });
      
      // Function to process an element that contains odds
      const processOddsElement = (el: Element, oddsValue: number) => {
        // Try to determine which team/selection this odds is for
        let selectionName = 'Selection';
        let marketName = 'Match Winner';
        let foundEvent = false;
        let selectedEventId = 0;
        let selectedEventName = '';
        
        // Check parent elements for team information
        let currentEl: HTMLElement | null = el as HTMLElement;
        for (let i = 0; i < 5 && currentEl && !foundEvent; i++) {
          const text = currentEl.textContent || '';
          
          // Check for full match context first (both teams)
          for (const event of events) {
            // If we found both team names in the same container, this is likely the correct event
            if (text.includes(event.homeTeam) && text.includes(event.awayTeam)) {
              // Now determine which team the odds are for based on proximity
              selectedEventId = event.id;
              selectedEventName = `${event.homeTeam} vs ${event.awayTeam}`;
              
              // Simplistic approach - check if the element is closer to home team or away team
              const elContent = el.textContent || '';
              const elParentContent = el.parentElement?.textContent || '';
              
              // Check if the odds element contains or is right near a team name
              if (elContent.includes(event.homeTeam) || elParentContent.includes(event.homeTeam)) {
                selectionName = event.homeTeam;
                foundEvent = true;
                break;
              } else if (elContent.includes(event.awayTeam) || elParentContent.includes(event.awayTeam)) {
                selectionName = event.awayTeam;
                foundEvent = true;
                break;
              } else if (elContent.toLowerCase().includes('draw') || elParentContent.toLowerCase().includes('draw')) {
                selectionName = 'Draw';
                foundEvent = true;
                break;
              }
              
              // If still not found, check the position in the parent element
              const parentElement = el.parentElement;
              if (parentElement) {
                // Get position based on bounding rectangle instead of child nodes
                const parentRect = parentElement.getBoundingClientRect();
                const elRect = el.getBoundingClientRect();
                
                // Calculate relative position within parent
                const relativePosition = (elRect.left - parentRect.left) / parentRect.width;
                
                // Determine selection based on position
                if (relativePosition < 0.33) {
                  selectionName = event.homeTeam;
                } else if (relativePosition > 0.66) {
                  selectionName = event.awayTeam;
                } else {
                  selectionName = 'Draw';
                }
                
                foundEvent = true;
                break;
              }
            }
          }
          
          if (foundEvent) break;
          currentEl = currentEl.parentElement;
        }
        
        if (foundEvent) {
          // We found a specific event and selection
          handleBetClick(
            selectedEventId,
            selectedEventName,
            selectionName,
            oddsValue,
            marketName
          );
        } else if (selectedEventId && selectedEventName) {
          // We found an event context but couldn't determine the selection
          handleBetClick(
            selectedEventId,
            selectedEventName,
            `Selection @ ${oddsValue}`, 
            oddsValue,
            marketName
          );
        }
      };
      
      if (isOddsElement) {
        // This might be an odds button or display
        const odds = parseFloat(element.textContent?.match(/\d+\.\d+/)?.[0] || '0');
        
        if (odds > 1.0) {
          processOddsElement(element, odds);
        }
      } else if (matchingEvent) {
        // Clicked on a team name, create a bet for that team
        const isHomeTeam = matchingEvent.homeTeam.includes(possibleTeamName || '');
        
        handleBetClick(
          matchingEvent.id,
          `${matchingEvent.homeTeam} vs ${matchingEvent.awayTeam}`,
          isHomeTeam ? matchingEvent.homeTeam : matchingEvent.awayTeam,
          isHomeTeam ? (matchingEvent.homeOdds || 1.9) : (matchingEvent.awayOdds || 3.5),
          'Match Winner'
        );
      } else if (containsEventInfo) {
        // Clicked on a card containing event info, determine which part was clicked
        const rect = eventContainer?.getBoundingClientRect();
        if (rect) {
          const relativeX = (e.clientX - rect.left) / rect.width;
          
          // Find which event this container is for
          let clickedEvent = null;
          for (const event of events) {
            if (
              eventContainer?.textContent?.includes(event.homeTeam) && 
              eventContainer?.textContent?.includes(event.awayTeam)
            ) {
              clickedEvent = event;
              break;
            }
          }
          
          if (clickedEvent) {
            // Based on where in the container the user clicked, select home, away or draw
            if (relativeX < 0.33) {
              // Left side - likely home team
              handleBetClick(
                clickedEvent.id,
                `${clickedEvent.homeTeam} vs ${clickedEvent.awayTeam}`,
                clickedEvent.homeTeam,
                clickedEvent.homeOdds || 1.9,
                'Match Winner'
              );
            } else if (relativeX > 0.66) {
              // Right side - likely away team
              handleBetClick(
                clickedEvent.id,
                `${clickedEvent.homeTeam} vs ${clickedEvent.awayTeam}`,
                clickedEvent.awayTeam,
                clickedEvent.awayOdds || 3.5,
                'Match Winner'
              );
            } else if (clickedEvent.drawOdds) {
              // Middle - might be draw
              handleBetClick(
                clickedEvent.id,
                `${clickedEvent.homeTeam} vs ${clickedEvent.awayTeam}`,
                'Draw',
                clickedEvent.drawOdds,
                'Match Winner'
              );
            }
          }
        }
      }
      
      // Check for specific UI patterns that might indicate betting elements
      const buttonClasses = element.className || '';
      const isButtonElement = element.tagName === 'BUTTON' || 
                              buttonClasses.includes('button') || 
                              buttonClasses.includes('btn');
      
      if (isButtonElement) {
        // This is a button, check if it might be an odds button
        let selectionName = '';
        let odds = 0;
        let marketName = 'Match Winner';
        let eventId = 0;
        let eventName = '';
        
        // Check for common patterns in buttons
        // 1. Check if the button contains odds
        const oddsMatch = element.textContent?.match(/\d+\.\d+/);
        if (oddsMatch) {
          odds = parseFloat(oddsMatch[0]);
        }
        
        // 2. Try to find the event context
        const cardElement = element.closest('[class*="card"], [class*="event"], [class*="match"]');
        if (cardElement) {
          const cardText = cardElement.textContent || '';
          
          // Check for any matching events
          events.forEach(event => {
            if (cardText.includes(event.homeTeam) && cardText.includes(event.awayTeam)) {
              eventId = event.id;
              eventName = `${event.homeTeam} vs ${event.awayTeam}`;
              
              // Try to determine which selection this button is for
              if (element.textContent?.includes(event.homeTeam)) {
                selectionName = event.homeTeam;
                odds = event.homeOdds || 1.9;
              } else if (element.textContent?.includes(event.awayTeam)) {
                selectionName = event.awayTeam;
                odds = event.awayOdds || 3.5;
              } else if (element.textContent?.toLowerCase().includes('draw')) {
                selectionName = 'Draw';
                odds = event.drawOdds || 3.2;
              }
            }
          });
        }
        
        // 3. If we found a selection and odds, create a bet
        if (selectionName && odds > 1.0) {
          handleBetClick(eventId, eventName, selectionName, odds, marketName);
        }
      }
    };
    
    document.addEventListener('click', handleDocumentClick);
    
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [events]);
  
  // Handle clicking on a betting option
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
      market,
    });
    
    // Provide minimal visual feedback that the bet was added - using site color scheme
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
  
  // This component doesn't render anything visible
  return null;
};

export default UniversalClickHandler;