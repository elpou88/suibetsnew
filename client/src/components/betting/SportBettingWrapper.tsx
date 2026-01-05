import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Event, Sport } from '@/types';
import SimpleMarkets from './SimpleMarkets';

// This component is a wrapper that loads all sport-specific betting interfaces
// while maintaining the original UI design (without changing it)
// It ensures all betting functionality is available for all sports

interface SportBettingWrapperProps {
  sportType?: string | null;
  eventId?: string | null;
}

export const SportBettingWrapper: React.FC<SportBettingWrapperProps> = ({ sportType, eventId }) => {
  // Fetch all sports to ensure we have data for each sport type
  const { data: sports = [] } = useQuery<Sport[]>({
    queryKey: ['/api/sports'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/sports');
      return response.json();
    }
  });
  
  // Fetch all events to ensure we have data for each event
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ['/api/events'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/events');
      return response.json();
    }
  });
  
  // Fetch specific event details if an event ID is provided
  const { data: eventDetails } = useQuery<Event>({
    queryKey: ['/api/events', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const response = await apiRequest('GET', `/api/events/${eventId}`);
      return response.json();
    },
    enabled: !!eventId
  });
  
  // Log what's loaded for debugging
  useEffect(() => {
    if (sports.length) {
      console.log(`Loaded ${sports.length} sports for betting`);
    }
    if (events.length) {
      console.log(`Loaded ${events.length} events for betting`);
    }
    if (eventDetails) {
      console.log(`Loaded event ${eventDetails.id} details for betting`);
    }
  }, [sports, events, eventDetails]);
  
  // Function to render all sport-specific betting interfaces
  // These are not displayed but ensure all betting code is registered
  const renderSportBettingInterfaces = () => {
    // If we have event details, render that specific sport
    if (eventDetails) {
      return (
        <SimpleMarkets 
          sportType={sportType || getSportTypeById(eventDetails.sportId)}
          eventId={eventDetails.id}
          eventName={`${eventDetails.homeTeam} vs ${eventDetails.awayTeam}`}
          homeTeam={eventDetails.homeTeam}
          awayTeam={eventDetails.awayTeam}
          homeOdds={eventDetails.homeOdds}
          awayOdds={eventDetails.awayOdds}
          drawOdds={eventDetails.drawOdds}
        />
      );
    }
    
    // Otherwise, render interfaces for all the known sports
    // This ensures all betting code is loaded regardless of what's displayed
    return (
      <>
        {/* Football/Soccer */}
        <SimpleMarkets 
          sportType="football"
          eventId={1}
          eventName="Sample Football Match"
          homeTeam="Team A"
          awayTeam="Team B"
          homeOdds={1.9}
          awayOdds={4.2}
          drawOdds={3.5}
        />
        
        {/* Basketball */}
        <SimpleMarkets 
          sportType="basketball"
          eventId={2}
          eventName="Sample Basketball Game"
          homeTeam="Team C"
          awayTeam="Team D"
          homeOdds={1.6}
          awayOdds={2.3}
        />
        
        {/* Tennis */}
        <SimpleMarkets 
          sportType="tennis"
          eventId={3}
          eventName="Sample Tennis Match"
          homeTeam="Player E"
          awayTeam="Player F"
          homeOdds={1.5}
          awayOdds={2.5}
        />
        
        {/* Boxing/MMA */}
        <SimpleMarkets 
          sportType="boxing"
          eventId={4}
          eventName="Sample Boxing Match"
          homeTeam="Fighter G"
          awayTeam="Fighter H"
          homeOdds={1.7}
          awayOdds={2.1}
        />
        
        {/* Cricket */}
        <SimpleMarkets 
          sportType="cricket"
          eventId={5}
          eventName="Sample Cricket Match"
          homeTeam="Team I"
          awayTeam="Team J"
          homeOdds={1.8}
          awayOdds={2.0}
          drawOdds={3.0}
        />
        
        {/* Hockey */}
        <SimpleMarkets 
          sportType="hockey"
          eventId={6}
          eventName="Sample Hockey Game"
          homeTeam="Team K"
          awayTeam="Team L"
          homeOdds={2.1}
          awayOdds={1.7}
          drawOdds={3.8}
        />
        
        {/* Rugby */}
        <SimpleMarkets 
          sportType="rugby-league"
          eventId={7}
          eventName="Sample Rugby Match"
          homeTeam="Team M"
          awayTeam="Team N"
          homeOdds={1.9}
          awayOdds={1.9}
          drawOdds={3.2}
        />
        
        {/* MMA/UFC */}
        <SimpleMarkets 
          sportType="mma-ufc"
          eventId={8}
          eventName="Sample UFC Fight"
          homeTeam="Fighter O"
          awayTeam="Fighter P"
          homeOdds={1.8}
          awayOdds={2.0}
        />
        
        {/* Esports */}
        <SimpleMarkets 
          sportType="esports"
          eventId={9}
          eventName="Sample Esports Match"
          homeTeam="Team Q"
          awayTeam="Team R"
          homeOdds={1.85}
          awayOdds={1.95}
        />
        
        {/* Baseball */}
        <SimpleMarkets 
          sportType="baseball"
          eventId={10}
          eventName="Sample Baseball Game"
          homeTeam="Team S"
          awayTeam="Team T"
          homeOdds={1.75}
          awayOdds={2.05}
        />
        
        {/* American Football */}
        <SimpleMarkets 
          sportType="american-football"
          eventId={11}
          eventName="Sample Football Game"
          homeTeam="Team U"
          awayTeam="Team V"
          homeOdds={1.9}
          awayOdds={1.9}
        />
      </>
    );
  };
  
  // Helper function to get sport type name from ID
  const getSportTypeById = (sportId: number): string => {
    const sport = sports.find(s => s.id === sportId);
    return sport?.slug || 'football'; // Default to football if not found
  };
  
  // Return a div with only the specific event betting interface
  // This fixes the duplication issue by not rendering all sports at once
  if (eventDetails) {
    return (
      <div style={{ display: 'none' }}>
        <SimpleMarkets 
          sportType={sportType || getSportTypeById(eventDetails.sportId)}
          eventId={eventDetails.id}
          eventName={`${eventDetails.homeTeam} vs ${eventDetails.awayTeam}`}
          homeTeam={eventDetails.homeTeam}
          awayTeam={eventDetails.awayTeam}
          homeOdds={eventDetails.homeOdds}
          awayOdds={eventDetails.awayOdds}
          drawOdds={eventDetails.drawOdds}
        />
      </div>
    );
  }
  
  // If no specific event requested, don't render any betting interfaces
  return null;
};

export default SportBettingWrapper;