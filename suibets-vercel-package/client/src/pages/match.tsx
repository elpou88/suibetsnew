import { useLocation, useRoute } from "wouter";
import { useState, useEffect } from "react";
import { ConnectWalletModal } from "@/components/modals/ConnectWalletModal";
import { NotificationsModal } from "@/components/modals/NotificationsModal";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import SimpleMarkets from "@/components/betting/SimpleMarkets";

export default function Match() {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  // Check if we're in a match/:id route
  const [matchRoute, matchParams] = useRoute('/match/:id');
  
  // Check if we're in a sport/:slug route
  const [sportRoute, sportParams] = useRoute('/sport/:slug');
  
  // Image state based on the route
  const [imageSrc, setImageSrc] = useState('/images/Sports 3 (2).png');
  const [location] = useLocation();
  
  // Get the sport parameter from the URL query string - used for API calls
  const queryParams = new URLSearchParams(window.location.search);
  const sportParam = queryParams.get('sport');
  
  // Fetch events from API for the relevant sport
  const { data: events = [] } = useQuery({
    queryKey: ['/api/events', sportParam],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/events${sportParam ? `?sport=${sportParam}` : ''}`);
      return response.json();
    },
    enabled: !!sportParam
  });
  
  // Fetch event details for the match
  const { data: eventDetails } = useQuery({
    queryKey: ['/api/events', matchParams?.id],
    queryFn: async () => {
      if (!matchParams?.id) return null;
      const response = await apiRequest('GET', `/api/events/${matchParams.id}`);
      return response.json();
    },
    enabled: !!matchParams?.id
  });
  
  useEffect(() => {
    if (matchRoute && matchParams) {
      // This is a match page
      setImageSrc('/images/Sports 3 (2).png');
    } else if (sportRoute && sportParams) {
      // This is a sport page with a slug
      console.log('Sport slug:', sportParams.slug);
      setImageSrc('/images/Sports 3 (2).png'); // Use the same image for now
    }
    
    // Log the events for the selected sport
    if (events && events.length) {
      console.log(`Loaded ${events.length} events for sport: ${sportParam}`);
    }
  }, [matchRoute, matchParams, sportRoute, sportParams, location, events, sportParam]);

  // Function to handle clicks on the image that should navigate
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Percentage positions
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    
    // Define clickable areas (approximate percentages)
    if (yPercent < 10) { // Top navigation bar area
      if (xPercent > 82 && xPercent < 92) { // Join Now button
        window.location.href = "/join";
        return;
      }
      if (xPercent > 92) { // Connect Wallet button
        setIsWalletModalOpen(true);
        return;
      }
      
      // Bell icon (notifications)
      if (xPercent > 76 && xPercent < 80) {
        setIsNotificationsModalOpen(true);
        return;
      }
      
      // Settings icon
      if (xPercent > 80 && xPercent < 84) {
        setIsSettingsModalOpen(true);
        return;
      }
      
      // Sports, Live, Promotions tabs
      if (xPercent > 50 && xPercent < 60) {
        window.location.href = "/";
        return;
      }
      if (xPercent > 60 && xPercent < 70) {
        window.location.href = "/live";
        return;
      }
      if (xPercent > 70 && xPercent < 76) {
        window.location.href = "/promotions";
        return;
      }
    }
    
    // Bet slip and match details areas
    if (yPercent > 45 && yPercent < 85) {
      if (xPercent > 80) { // Bet slip area on the right
        window.location.href = "/bet-slip";
        return;
      }
    }
    
    // Back button (top left of match details)
    if (yPercent > 10 && yPercent < 15 && xPercent < 10) {
      window.location.href = "/";
      return;
    }
  };

  // Load sport-specific betting interface behind the scenes
  // This won't change the UI but will enable all the betting functionality
  const loadSportBetting = () => {
    if (!sportParam || !eventDetails) return null;
    
    // We don't directly render this but its hooks will be registered
    return (
      <div style={{ display: 'none' }}>
        <SimpleMarkets 
          sportType={sportParam}
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
  };

  return (
    <div className="w-full min-h-screen flex flex-col">
      <div 
        className="relative w-full cursor-pointer" 
        onClick={handleImageClick}
      >
        <img 
          src={imageSrc} 
          alt="Match Details" 
          className="w-full h-full object-contain pointer-events-none"
        />
        
        {/* Hidden element - contains sport-specific betting functionality without changing UI */}
        {eventDetails && sportParam && loadSportBetting()}
      </div>
      
      <ConnectWalletModal 
        isOpen={isWalletModalOpen} 
        onClose={() => setIsWalletModalOpen(false)} 
      />
      
      <NotificationsModal 
        isOpen={isNotificationsModalOpen} 
        onClose={() => setIsNotificationsModalOpen(false)} 
      />
      
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
      />
    </div>
  );
}