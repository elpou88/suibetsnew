import { useEffect, useState } from "react";
import { LiveImageOverlays } from "@/components/betting/LiveImageOverlays";
import { useBetting } from "@/context/BettingContext";

/**
 * Live page that shows the exact image with precise click regions
 */
export default function LiveExact() {
  const [imagePath, setImagePath] = useState<string>('/images/live_actual.png');
  const { addBet } = useBetting();
  
  // Create a click handler for betting from the image
  const handleBetClick = (
    selectionName: string, 
    odds: number,
    market: string
  ) => {
    // Create a unique bet ID
    const betId = `live-${market}-${selectionName}-${Date.now()}`;
    
    // Add the bet to the betting slip
    addBet({
      id: betId,
      eventId: 9999, // Live events use a placeholder ID
      eventName: `Live: ${selectionName.split(' ')[0]} match`,
      selectionName,
      odds,
      stake: 10, // Default stake amount
      market
    });
  };
  
  useEffect(() => {
    document.title = 'Live Events - SuiBets';
    
    // Create a full-page image with no navigation elements
    const body = document.body;
    body.style.margin = '0';
    body.style.padding = '0';
    body.style.overflow = 'hidden';
    body.style.backgroundColor = 'black';
    
    // Remove all existing content except our overlays
    const root = document.getElementById('root');
    if (root) {
      // Just clear content inside the root element
      while (root.firstChild) {
        root.removeChild(root.firstChild);
      }
    }
    
    // Create a container for better positioning
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.id = 'live-container';
    root?.appendChild(container);
    
    // Create the image element - using the full original image
    const img = document.createElement('img');
    img.src = imagePath;
    img.alt = 'Live Events';
    img.id = 'live-image';
    img.style.width = '100%';
    img.style.display = 'block';
    img.useMap = '#livemap';
    container.appendChild(img);
    
    // Create the image map with console logging to help debug click positions
    const map = document.createElement('map');
    map.name = 'livemap';
    container.appendChild(map);
    
    img.addEventListener('click', (e) => {
      const x = (e as MouseEvent).clientX;
      const y = (e as MouseEvent).clientY;
      console.log(`Click coordinates: ${x},${y}`);
    });
    
    // Create absolute positioned divs for clickable areas - more reliable than image maps
    const navContainer = document.createElement('div');
    navContainer.style.position = 'absolute';
    navContainer.style.top = '0';
    navContainer.style.left = '0';
    navContainer.style.width = '100%';
    navContainer.style.zIndex = '1000';
    container.appendChild(navContainer);
    
    // Add visual debugging for clickable areas
    const debugMode = false;
    
    // Create a navigation bar that exactly matches the position in the image
    // The navigation uses EXACT pixel positions from the image we examined
    const navigationBar = document.createElement('div');
    navigationBar.style.position = 'absolute';
    navigationBar.style.top = '0';
    navigationBar.style.left = '0';
    navigationBar.style.width = '100%';
    navigationBar.style.height = '45px';
    navigationBar.style.display = 'flex';
    navigationBar.style.justifyContent = 'center';
    navigationBar.style.alignItems = 'center';
    navigationBar.style.zIndex = '1000';
    container.appendChild(navigationBar);
    
    // Add fixed-position buttons exactly where they appear in the source image
    // Each button has exact coordinates and dimensions from the image inspection
    
    // Create navigation elements with consistent spacing
    // IMPORTANT: The center of the navbar is at 512px (1024px/2)
    // So we position our 3 links centered around this point
    
    // Sports button - enhanced for faster click detection
    const sportsButton = document.createElement('button');
    sportsButton.textContent = 'Sports';
    sportsButton.style.position = 'absolute';
    sportsButton.style.left = '440px'; // Adjusted for better spacing
    sportsButton.style.top = '12px'; // Moved up to provide more click area
    sportsButton.style.backgroundColor = debugMode ? 'rgba(255,0,0,0.3)' : 'transparent';
    sportsButton.style.border = 'none';
    sportsButton.style.color = 'transparent'; // Make text transparent but keep the button text for accessibility
    sportsButton.style.width = '70px'; // Wider for easier clicking
    sportsButton.style.height = '40px'; // Much taller for better clickability
    sportsButton.style.cursor = 'pointer';
    sportsButton.style.fontFamily = 'Arial, sans-serif';
    sportsButton.style.fontSize = '16px';
    sportsButton.style.padding = '0';
    sportsButton.style.margin = '0';
    sportsButton.style.textAlign = 'center';
    sportsButton.style.zIndex = '1001';
    sportsButton.onclick = (e) => {
      e.preventDefault();
      console.log('SPORTS button clicked - Fast navigation');
      // Use direct DOM replacement for faster navigation
      const homeUrl = '/';
      window.history.pushState({}, '', homeUrl);
      window.location.replace(homeUrl);
    };
    navigationBar.appendChild(sportsButton);
    
    // Live button - enhanced for faster click detection
    const liveButton = document.createElement('button');
    liveButton.textContent = 'Live';
    liveButton.style.position = 'absolute';
    liveButton.style.left = '510px'; // Center aligned
    liveButton.style.top = '12px'; // Moved up to provide more click area
    liveButton.style.backgroundColor = debugMode ? 'rgba(0,255,0,0.3)' : 'transparent';
    liveButton.style.border = 'none';
    liveButton.style.color = 'transparent';
    liveButton.style.width = '50px'; // Wider for easier clicking
    liveButton.style.height = '40px'; // Much taller for better clickability
    liveButton.style.cursor = 'pointer';
    liveButton.style.fontFamily = 'Arial, sans-serif';
    liveButton.style.fontSize = '16px';
    liveButton.style.padding = '0';
    liveButton.style.margin = '0';
    liveButton.style.textAlign = 'center';
    liveButton.style.zIndex = '1001';
    liveButton.onclick = (e) => {
      e.preventDefault();
      console.log('LIVE button clicked - Fast navigation');
      // Use direct DOM replacement for faster navigation
      const liveUrl = '/live';
      window.history.pushState({}, '', liveUrl);
      window.location.replace(liveUrl);
    };
    navigationBar.appendChild(liveButton);
    
    // Promotions button - enhanced for faster click detection
    const promotionsButton = document.createElement('button');
    promotionsButton.textContent = 'Promotions';
    promotionsButton.style.position = 'absolute';
    promotionsButton.style.left = '560px'; // Adjusted for better spacing
    promotionsButton.style.top = '12px'; // Moved up to provide more click area
    promotionsButton.style.backgroundColor = debugMode ? 'rgba(0,0,255,0.3)' : 'transparent';
    promotionsButton.style.border = 'none';
    promotionsButton.style.color = 'transparent';
    promotionsButton.style.width = '90px'; // Wider for easier clicking
    promotionsButton.style.height = '40px'; // Much taller for better clickability
    promotionsButton.style.cursor = 'pointer';
    promotionsButton.style.fontFamily = 'Arial, sans-serif';
    promotionsButton.style.fontSize = '16px';
    promotionsButton.style.padding = '0';
    promotionsButton.style.margin = '0';
    promotionsButton.style.textAlign = 'center';
    promotionsButton.style.zIndex = '1001';
    promotionsButton.onclick = (e) => {
      e.preventDefault();
      console.log('PROMOTIONS button clicked - Fast navigation');
      // Use direct DOM replacement for faster navigation
      const promotionsUrl = '/promotions';
      window.history.pushState({}, '', promotionsUrl);
      window.location.replace(promotionsUrl);
    };
    navigationBar.appendChild(promotionsButton);
    
    const joinArea = document.createElement('area');
    joinArea.shape = 'rect';
    joinArea.coords = '810,10,870,35'; // Wider area
    joinArea.alt = 'Join Now';
    joinArea.href = '/join';
    map.appendChild(joinArea);
    
    const connectWalletArea = document.createElement('area');
    connectWalletArea.shape = 'rect';
    connectWalletArea.coords = '900,10,980,35'; // Wider area
    connectWalletArea.alt = 'Connect Wallet';
    connectWalletArea.href = '/connect-wallet';
    map.appendChild(connectWalletArea);
    
    // Add tennis match betting options
    // Create clickable betting areas for the tennis matches
    
    // Match 1: Arthur Fils vs Pablo Carreno
    const filsButton = document.createElement('div');
    filsButton.style.position = 'absolute';
    filsButton.style.left = '318px';
    filsButton.style.top = '235px';
    filsButton.style.width = '47px';
    filsButton.style.height = '27px';
    filsButton.style.backgroundColor = debugMode ? 'rgba(255,0,0,0.3)' : 'transparent';
    filsButton.style.cursor = 'pointer';
    filsButton.style.zIndex = '1002';
    filsButton.onclick = (e) => {
      e.preventDefault();
      console.log('Arthur Fils bet clicked');
      handleBetClick('Arthur Fils', 1.57, 'Match Winner');
    };
    container.appendChild(filsButton);
    
    const carrenoButton = document.createElement('div');
    carrenoButton.style.position = 'absolute';
    carrenoButton.style.left = '318px';
    carrenoButton.style.top = '262px';
    carrenoButton.style.width = '47px';
    carrenoButton.style.height = '27px';
    carrenoButton.style.backgroundColor = debugMode ? 'rgba(0,255,0,0.3)' : 'transparent';
    carrenoButton.style.cursor = 'pointer';
    carrenoButton.style.zIndex = '1002';
    carrenoButton.onclick = (e) => {
      e.preventDefault();
      console.log('Pablo Carreno bet clicked');
      handleBetClick('Pablo Carreno', 2.42, 'Match Winner');
    };
    container.appendChild(carrenoButton);
    
    // Match 2: Alex Pujolas vs Dominik Kellovsky
    const pujolasButton = document.createElement('div');
    pujolasButton.style.position = 'absolute';
    pujolasButton.style.left = '779px';
    pujolasButton.style.top = '371px';
    pujolasButton.style.width = '47px';
    pujolasButton.style.height = '27px';
    pujolasButton.style.backgroundColor = debugMode ? 'rgba(255,0,0,0.3)' : 'transparent';
    pujolasButton.style.cursor = 'pointer';
    pujolasButton.style.zIndex = '1002';
    pujolasButton.onclick = (e) => {
      e.preventDefault();
      console.log('Alex Pujolas bet clicked');
      handleBetClick('Alex M Pujolas', 1.07, 'Match Winner');
    };
    container.appendChild(pujolasButton);
    
    const kellovskyButton = document.createElement('div');
    kellovskyButton.style.position = 'absolute';
    kellovskyButton.style.left = '779px';
    kellovskyButton.style.top = '386px';
    kellovskyButton.style.width = '47px';
    kellovskyButton.style.height = '27px';
    kellovskyButton.style.backgroundColor = debugMode ? 'rgba(0,255,0,0.3)' : 'transparent';
    kellovskyButton.style.cursor = 'pointer';
    kellovskyButton.style.zIndex = '1002';
    kellovskyButton.onclick = (e) => {
      e.preventDefault();
      console.log('Dominik Kellovsky bet clicked');
      handleBetClick('Dominik Kellovsky', 6.96, 'Match Winner');
    };
    container.appendChild(kellovskyButton);
    
    // Handicap betting buttons
    const pujolasHandicapButton = document.createElement('div');
    pujolasHandicapButton.style.position = 'absolute';
    pujolasHandicapButton.style.left = '842px';
    pujolasHandicapButton.style.top = '371px';
    pujolasHandicapButton.style.width = '47px';
    pujolasHandicapButton.style.height = '27px';
    pujolasHandicapButton.style.backgroundColor = debugMode ? 'rgba(255,0,0,0.3)' : 'transparent';
    pujolasHandicapButton.style.cursor = 'pointer';
    pujolasHandicapButton.style.zIndex = '1002';
    pujolasHandicapButton.onclick = (e) => {
      e.preventDefault();
      console.log('Pujolas handicap bet clicked');
      handleBetClick('Alex M Pujolas -3.5', 1.57, 'Handicap');
    };
    container.appendChild(pujolasHandicapButton);
    
    const kellovskyHandicapButton = document.createElement('div');
    kellovskyHandicapButton.style.position = 'absolute';
    kellovskyHandicapButton.style.left = '842px';
    kellovskyHandicapButton.style.top = '386px';
    kellovskyHandicapButton.style.width = '47px';
    kellovskyHandicapButton.style.height = '27px';
    kellovskyHandicapButton.style.backgroundColor = debugMode ? 'rgba(0,255,0,0.3)' : 'transparent';
    kellovskyHandicapButton.style.cursor = 'pointer';
    kellovskyHandicapButton.style.zIndex = '1002';
    kellovskyHandicapButton.onclick = (e) => {
      e.preventDefault();
      console.log('Kellovsky handicap bet clicked');
      handleBetClick('Dominik Kellovsky +3.5', 2.25, 'Handicap');
    };
    container.appendChild(kellovskyHandicapButton);
    
    // Disable all other links to ensure only our navigation buttons work
    // This helps prevent any conflicts with other elements on the page
    const links = document.querySelectorAll('a, button');
    links.forEach(link => {
      if (link !== sportsButton && link !== liveButton && link !== promotionsButton) {
        // TypeScript fix: cast to HTMLElement before setting style
        if (link instanceof HTMLElement) {
          link.style.pointerEvents = 'none';
        }
      }
    });
    
    // Make the navigation bar visually distinct to highlight clickable areas
    navigationBar.style.borderBottom = debugMode ? '2px solid red' : 'none';
    
    // No need to add underline as it's already part of the UI design
    
    // Add debugging info
    console.log('Navigation setup complete. Only Sports, Live, and Promotions links are active.');
    console.log('Sports link position: 440px, Live link position: 510px, Promotions link position: 560px');
    
    // Clean up function
    return () => {
      body.style.margin = '';
      body.style.padding = '';
      body.style.overflow = '';
      body.style.backgroundColor = '';
    };
  }, []);
  
  return null;
}