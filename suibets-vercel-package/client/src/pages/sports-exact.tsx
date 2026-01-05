import React, { useEffect } from 'react';

/**
 * Sports page that shows the exact image with precise click regions
 * This is similar to live-exact.tsx but for the Sports page with blue underline indicator
 */
export default function SportsExact() {
  useEffect(() => {
    // Prevent scrolling
    const body = document.body;
    body.style.margin = '0';
    body.style.padding = '0';
    body.style.overflow = 'hidden';
    body.style.backgroundColor = '#0f172a'; // dark background
    
    // Add the image
    const img = document.createElement('img');
    img.src = '/images/Sports 1 (2).png';
    img.alt = 'Sports Page';
    img.style.width = '100%';
    img.style.height = '100vh';
    img.style.objectFit = 'contain';
    img.style.display = 'block';
    img.style.margin = '0 auto';
    body.appendChild(img);
    
    // Create an image map
    const map = document.createElement('map');
    map.name = 'sports-map';
    body.appendChild(map);
    
    // Connect the image to the map
    img.useMap = '#sports-map';
    
    // Debugging mode - set to true to see click regions
    const debugMode = false;
    
    // Create a navigation bar that will hold our clickable elements
    const navigationBar = document.createElement('div');
    navigationBar.style.position = 'absolute';
    navigationBar.style.top = '0';
    navigationBar.style.left = '0';
    navigationBar.style.width = '100%';
    navigationBar.style.height = '60px';
    navigationBar.style.zIndex = '1000';
    body.appendChild(navigationBar);
    
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