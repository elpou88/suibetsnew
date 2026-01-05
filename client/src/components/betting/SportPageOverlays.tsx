import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useBetting } from '@/context/BettingContext';
import { Event, Sport } from '@/types';

interface SportPageOverlaysProps {
  sportSlug?: string;
}

/**
 * This component creates clickable overlays specifically for sport pages,
 * allowing users to click anywhere on the event listings to place bets
 * without modifying the original UI design
 */
export const SportPageOverlays: React.FC<SportPageOverlaysProps> = ({ sportSlug }) => {
  const [initialized, setInitialized] = useState(false);
  const { addBet } = useBetting();
  
  // Fetch all events for this sport
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ['/api/events', sportSlug ? { sport: sportSlug } : undefined],
    queryFn: async () => {
      const url = sportSlug 
        ? `/api/events?sport=${sportSlug}` 
        : '/api/events';
      const response = await apiRequest('GET', url);
      return response.json();
    }
  });
  
  useEffect(() => {
    // Initialize event listeners after component mounts
    if (!initialized && events.length > 0) {
      console.log(`Loaded ${events.length} events for sport: ${sportSlug || 'all'}`);
      
      // Add click event listener to the document
      const handleDocumentClick = (e: MouseEvent) => {
        // Log exact click position for debugging
        console.log(`Click coordinates: ${e.clientX}, ${e.clientY}`);
        
        // Find the closest clickable element
        const element = document.elementFromPoint(e.clientX, e.clientY);
        if (!element) return;
        
        // Check if we're clicking on or near an event card
        const eventCard = element.closest('[data-event-id]');
        if (eventCard) {
          const eventId = parseInt(eventCard.getAttribute('data-event-id') || '0');
          const event = events?.find(e => e?.id === eventId);
          
          if (event) {
            // Determine which part of the card was clicked
            const rect = eventCard.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const relY = e.clientY - rect.top;
            const relXPercent = relX / rect.width * 100;
            
            // Right side might be away team odds
            if (relXPercent > 70 && event?.awayTeam) {
              handleBetClick(event, event.awayTeam, event.awayOdds || 3.50, 'Match Winner');
            }
            // Middle might be draw (if applicable)
            else if (relXPercent > 45 && relXPercent < 70 && event?.drawOdds) {
              handleBetClick(event, 'Draw', event.drawOdds, 'Match Winner');
            } 
            // Left side might be home team odds
            else if (relXPercent < 45 && event?.homeTeam) {
              handleBetClick(event, event.homeTeam, event.homeOdds || 1.90, 'Match Winner');
            }
          }
        }
      };
      
      // Add data-event-id attributes to event cards so we can identify them
      setTimeout(() => {
        attachEventIds();
      }, 1000);
      
      document.addEventListener('click', handleDocumentClick);
      
      // Set initialized to prevent multiple listeners
      setInitialized(true);
      
      return () => {
        document.removeEventListener('click', handleDocumentClick);
      };
    }
  }, [events, initialized, sportSlug]);
  
  // Handle clicking on a sport event
  const handleBetClick = (
    event: Event,
    selectionName: string,
    odds: number,
    market: string
  ) => {
    // Create a unique bet ID - ensure it's always a string
    const betId: string = `${String(event.id)}-${market}-${selectionName}-${Date.now()}`;
    
    // Add the bet to the slip
    addBet({
      id: betId,
      eventId: typeof event.id === 'number' ? event.id : parseInt(String(event.id), 10),
      eventName: `${event.homeTeam} vs ${event.awayTeam}`,
      selectionName,
      odds,
      stake: 10, // Default stake amount
      market,
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
  
  // Attach event IDs to event cards in the DOM for easier identification
  const attachEventIds = () => {
    // Get all cards or container elements that might be event cards
    const cardElements = [
      ...Array.from(document.querySelectorAll('.card')),
      ...Array.from(document.querySelectorAll('.overflow-hidden')),
      ...Array.from(document.querySelectorAll('[class*="event"]')),
      ...Array.from(document.querySelectorAll('[class*="match"]')),
      ...Array.from(document.querySelectorAll('.p-4')),
    ];
    
    // Count attached events for logging
    let eventsAttached = 0;
    
    // Create transparent overlays for each card that mentions teams
    events.forEach(event => {
      const eventTeams = `${event.homeTeam}.*${event.awayTeam}|${event.awayTeam}.*${event.homeTeam}`;
      const eventTeamsRegex = new RegExp(eventTeams, 'i');
      
      // Find all cards that contain both team names
      cardElements.forEach(card => {
        if (!card.textContent) return;
        
        // Make sure we have both team names in the card
        if (!eventTeamsRegex.test(card.textContent)) return;
        
        // Card contains both teams, set its event ID
        card.setAttribute('data-event-id', event.id.toString());
        eventsAttached++;
        
        // Now create invisible overlays for different bet positions within the card
        const rect = card.getBoundingClientRect();
        if (!rect || rect.width === 0) return;
        
        // Create the container and position it absolutely
        const overlayContainer = document.createElement('div');
        overlayContainer.style.position = 'absolute';
        overlayContainer.style.top = `${rect.top}px`;
        overlayContainer.style.left = `${rect.left}px`;
        overlayContainer.style.width = `${rect.width}px`;
        overlayContainer.style.height = `${rect.height}px`;
        overlayContainer.style.pointerEvents = 'none'; // Don't block regular clicks
        overlayContainer.style.zIndex = '10';
        
        // Create three clickable areas for home, draw, away
        // Home team area (left third)
        const homeArea = document.createElement('div');
        homeArea.setAttribute('data-bet-type', 'home');
        homeArea.setAttribute('data-event-id', event.id.toString());
        homeArea.setAttribute('data-team', event.homeTeam);
        homeArea.setAttribute('data-odds', String(event.homeOdds || 1.9));
        homeArea.style.position = 'absolute';
        homeArea.style.left = '0';
        homeArea.style.top = '0';
        homeArea.style.width = '33.3%';
        homeArea.style.height = '100%';
        homeArea.style.pointerEvents = 'auto';
        // homeArea.style.backgroundColor = 'rgba(255, 0, 0, 0.1)'; // Debug only
        overlayContainer.appendChild(homeArea);
        
        // Draw area (middle third) - only for sports that can have draws
        if (event.drawOdds) {
          const drawArea = document.createElement('div');
          drawArea.setAttribute('data-bet-type', 'draw');
          drawArea.setAttribute('data-event-id', event.id.toString());
          drawArea.setAttribute('data-team', 'Draw');
          drawArea.setAttribute('data-odds', String(event.drawOdds));
          drawArea.style.position = 'absolute';
          drawArea.style.left = '33.3%';
          drawArea.style.top = '0';
          drawArea.style.width = '33.3%';
          drawArea.style.height = '100%';
          drawArea.style.pointerEvents = 'auto';
          // drawArea.style.backgroundColor = 'rgba(0, 255, 0, 0.1)'; // Debug only
          overlayContainer.appendChild(drawArea);
        }
        
        // Away team area (right third)
        const awayArea = document.createElement('div');
        awayArea.setAttribute('data-bet-type', 'away');
        awayArea.setAttribute('data-event-id', event.id.toString());
        awayArea.setAttribute('data-team', event.awayTeam);
        awayArea.setAttribute('data-odds', String(event.awayOdds || 3.5));
        awayArea.style.position = 'absolute';
        awayArea.style.right = '0';
        awayArea.style.top = '0';
        awayArea.style.width = '33.3%';
        awayArea.style.height = '100%';
        awayArea.style.pointerEvents = 'auto';
        // awayArea.style.backgroundColor = 'rgba(0, 0, 255, 0.1)'; // Debug only
        overlayContainer.appendChild(awayArea);
        
        // Add the invisible overlays to the DOM - will be hidden but clickable
        // document.body.appendChild(overlayContainer);
        
        // Instead of adding to DOM, directly add click handlers to the areas
        // to avoid changing the UI structure in any way
        homeArea.addEventListener('click', () => {
          handleBetClick(event, event.homeTeam, event.homeOdds || 1.9, 'Match Winner');
        });
        
        if (event.drawOdds) {
          const drawArea = overlayContainer.querySelector('[data-bet-type="draw"]');
          if (drawArea) {
            drawArea.addEventListener('click', () => {
              handleBetClick(event, 'Draw', event.drawOdds || 3.2, 'Match Winner');
            });
          }
        }
        
        awayArea.addEventListener('click', () => {
          handleBetClick(event, event.awayTeam, event.awayOdds || 3.5, 'Match Winner');
        });
      });
    });
    
    // Log the results for debugging
    console.log(`Enhanced ${eventsAttached} event cards for betting`);
  };
  
  // Add click handlers for specific UI elements without modifying them
  useEffect(() => {
    // Find elements that look like odds buttons
    const oddsElements = document.querySelectorAll('[class*="odds"], .font-bold');
    oddsElements.forEach(element => {
      element.addEventListener('click', (e) => {
        // Find the closest event card
        const eventCard = element.closest('[data-event-id]');
        if (eventCard) {
          const eventId = parseInt(eventCard.getAttribute('data-event-id') || '0');
          const event = events.find(e => e.id === eventId);
          
          if (event) {
            // Try to determine which team this odds is for
            const text = element.textContent || '';
            if (text.includes(event.homeTeam) || element.previousElementSibling?.textContent?.includes(event.homeTeam)) {
              handleBetClick(event, event.homeTeam, event.homeOdds || 1.90, 'Match Winner');
            } else if (text.includes(event.awayTeam) || element.previousElementSibling?.textContent?.includes(event.awayTeam)) {
              handleBetClick(event, event.awayTeam, event.awayOdds || 3.50, 'Match Winner');
            } else if (text.includes('Draw') || element.previousElementSibling?.textContent?.includes('Draw')) {
              handleBetClick(event, 'Draw', event.drawOdds || 3.20, 'Match Winner');
            }
          }
        }
      });
    });
  }, [events, initialized]);
  
  // This component doesn't render anything visible
  // It just adds click handlers to make the UI interactive
  return null;
};

export default SportPageOverlays;