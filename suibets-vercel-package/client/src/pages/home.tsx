import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { ConnectWalletModal } from "@/components/modals/ConnectWalletModal";
import sportImages from '@/data/sportImages';
import SportsSidebar from "@/components/layout/SportsSidebar";
import { useBetting } from "@/context/BettingContext";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const [, setLocation] = useLocation();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const { addBet } = useBetting();
  
  // Fetch events from API for display
  const { data: events = [] } = useQuery({
    queryKey: ['/api/events'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/events`);
      return response.json();
    }
  });

  // Function to handle clicks on the image that should navigate
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Percentage positions
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    
    console.log('Clicked at position:', xPercent, yPercent);
    console.log('Click coordinates:', Math.round(x), Math.round(y));
    
    // Define clickable regions with more precise coordinates
    // These coordinates are based on the Sports 1 image layout
    
    // Top navigation area - ignore clicks in top navigation
    if (yPercent < 15) {
      // Promotions button (top right area)
      if (xPercent > 55 && xPercent < 65) {
        console.log('Clicked on Promotions');
        setLocation('/promotions');
        return;
      }
      
      // Live button (top center area)
      if (xPercent > 45 && xPercent < 55) {
        console.log('Clicked on Live');
        setLocation('/live');
        return;
      }
      
      // Connect wallet button in top right corner
      if (xPercent > 85) {
        console.log('Clicked connect wallet button');
        setIsWalletModalOpen(true);
        return;
      }
      
      // Other top nav clicks - don't show error
      return;
    }
    
    // Sport navigation handling for the transparent sidebar
    // We'll leave this code here for backward compatibility but
    // we also have dedicated clickable regions now
    if (xPercent < 20) {
      // Football
      if (yPercent > 130 && yPercent < 150) {
        console.log('Navigating to Football');
        setLocation('/sport/football');
        return;
      }
      // Basketball
      if (yPercent > 170 && yPercent < 190) {
        console.log('Navigating to Basketball');
        setLocation('/sport/basketball');
        return;
      }
      // Tennis
      if (yPercent > 210 && yPercent < 230) {
        console.log('Navigating to Tennis');
        setLocation('/sport/tennis');
        return;
      }
      // Baseball
      if (yPercent > 250 && yPercent < 270) {
        console.log('Navigating to Baseball');
        setLocation('/sport/baseball');
        return;
      }
      // Boxing
      if (yPercent > 290 && yPercent < 310) {
        console.log('Navigating to Boxing');
        setLocation('/sport/boxing');
        return;
      }
      // Hockey
      if (yPercent > 330 && yPercent < 350) {
        console.log('Navigating to Hockey');
        setLocation('/sport/hockey');
        return;
      }
      // Esports
      if (yPercent > 370 && yPercent < 390) {
        console.log('Navigating to Esports');
        setLocation('/sport/esports');
        return;
      }
      // MMA / UFC
      if (yPercent > 410 && yPercent < 430) {
        console.log('Navigating to MMA/UFC');
        setLocation('/sport/mma-ufc');
        return;
      }
      // Volleyball
      if (yPercent > 450 && yPercent < 470) {
        console.log('Navigating to Volleyball');
        setLocation('/sport/volleyball');
        return;
      }
      // Table Tennis
      if (yPercent > 490 && yPercent < 510) {
        console.log('Navigating to Table Tennis');
        setLocation('/sport/table-tennis');
        return;
      }
      // Rugby League
      if (yPercent > 530 && yPercent < 550) {
        console.log('Navigating to Rugby League');
        setLocation('/sport/rugby-league');
        return;
      }
      // Rugby Union
      if (yPercent > 570 && yPercent < 590) {
        console.log('Navigating to Rugby Union');
        setLocation('/sport/rugby-union');
        return;
      }
      // Cricket
      if (yPercent > 610 && yPercent < 630) {
        console.log('Navigating to Cricket');
        setLocation('/sport/cricket');
        return;
      }
      // Horse Racing
      if (yPercent > 650 && yPercent < 670) {
        console.log('Navigating to Horse Racing');
        setLocation('/sport/horse-racing');
        return;
      }
      // Greyhounds
      if (yPercent > 690 && yPercent < 710) {
        console.log('Navigating to Greyhounds');
        setLocation('/sport/greyhounds');
        return;
      }
      // AFL
      if (yPercent > 730 && yPercent < 750) {
        console.log('Navigating to AFL');
        setLocation('/sport/afl');
        return;
      }
    }
    
    // Main content area clicks
    
    // Promotion banner (top banner)
    if (yPercent > 80 && yPercent < 190 && xPercent > 20) {
      console.log('Clicked on top promotion banner');
      setLocation('/promotions/referral');
      return;
    }
    
    // Left promotion box (100% SIGN-UP BONUS)
    if (yPercent > 220 && yPercent < 330 && xPercent > 20 && xPercent < 50) {
      console.log('Clicked on left promotion box');
      setLocation('/promotions/signup-bonus');
      return;
    }
    
    // Right promotion box ($50 RISK-FREE BET)
    if (yPercent > 220 && yPercent < 330 && xPercent > 50 && xPercent < 80) {
      console.log('Clicked on right promotion box');
      setLocation('/promotions/risk-free');
      return;
    }
    
    // "All promotions" button
    if (yPercent > 345 && yPercent < 355 && xPercent > 80 && xPercent < 90) {
      console.log('Clicked on All promotions button');
      setLocation('/promotions');
      return;
    }
    
    // Bundesliga matches (multiple rows)
    if (yPercent > 390 && yPercent < 630 && xPercent > 20 && xPercent < 80) {
      const row = Math.floor((yPercent - 390) / 24);
      console.log('Clicked on Bundesliga match row:', row);
      setLocation(`/event/${row + 1}`);
      return;
    }
    
    // Footer section clicks
    if (yPercent > 700) {
      // Information section
      if (xPercent > 20 && xPercent < 40) {
        console.log('Clicked on Information section in footer');
        setLocation('/info');
        return;
      }
      
      // Community section
      if (xPercent > 40 && xPercent < 60) {
        console.log('Clicked on Community section in footer');
        setLocation('/community');
        return;
      }
      
      // Contact Us section
      if (xPercent > 60 && xPercent < 80) {
        console.log('Clicked on Contact Us section in footer');
        setLocation('/contact');
        return;
      }
    }
    
    // Default case - no need to show error message for clicks outside defined regions
    // Just log the click coordinates for debugging
    console.log('Click in unhandled region');
  };

  // Function to render match data on the image
  useEffect(() => {
    if (events.length > 0) {
      // We'll use a small script to position match data in the correct locations
      // on the sports betting image without changing the UI
      console.log('Loaded events for display:', events.length);
      
      // Don't modify the DOM directly as this is just for positioning data
      // on the existing image interface
    }
  }, [events]);

  return (
    <div className="w-full min-h-screen flex flex-col">
      <div 
        className="relative w-full cursor-pointer" 
        onClick={handleImageClick}
      >
        <img 
          src="/images/Sports 2 (2).png" 
          alt="Sports Home" 
          className="w-full h-full object-contain pointer-events-none"
        />
        
        {/* Overlay the sports sidebar on top of the image */}
        <SportsSidebar />
      </div>
      
      <ConnectWalletModal 
        isOpen={isWalletModalOpen} 
        onClose={() => setIsWalletModalOpen(false)} 
      />
    </div>
  );
}