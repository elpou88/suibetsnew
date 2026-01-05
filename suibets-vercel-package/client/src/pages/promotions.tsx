import { useEffect } from 'react';

export default function PromotionsPage() {
  useEffect(() => {
    document.title = 'Promotions - SuiBets';
    
    // Create a full-page image with no navigation elements
    const body = document.body;
    body.style.margin = '0';
    body.style.padding = '0';
    body.style.overflow = 'hidden';
    body.style.backgroundColor = 'black';
    
    // Remove all existing content
    body.innerHTML = '';
    
    // Create a container for better positioning
    const container = document.createElement('div');
    container.style.position = 'relative';
    body.appendChild(container);
    
    // Create the image element - using the full original image
    const img = document.createElement('img');
    img.src = '/images/promotions_actual.png';
    img.alt = 'Promotions';
    img.style.width = '100%';
    img.style.display = 'block';
    img.useMap = '#promotionsmap';
    container.appendChild(img);
    
    // Create the image map with console logging to help debug click positions
    const map = document.createElement('map');
    map.name = 'promotionsmap';
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
    
    // Promotion-specific clickable areas
    const joinNow1 = document.createElement('area');
    joinNow1.shape = 'rect';
    joinNow1.coords = '190,390,260,410'; // Wider button
    joinNow1.alt = 'Join Now 1';
    joinNow1.href = '/join';
    map.appendChild(joinNow1);
    
    const joinNow2 = document.createElement('area');
    joinNow2.shape = 'rect';
    joinNow2.coords = '440,390,510,410'; // Wider button
    joinNow2.alt = 'Join Now 2';
    joinNow2.href = '/join';
    map.appendChild(joinNow2);
    
    const joinNow3 = document.createElement('area');
    joinNow3.shape = 'rect';
    joinNow3.coords = '690,390,760,410'; // Wider button
    joinNow3.alt = 'Join Now 3';
    joinNow3.href = '/join';
    map.appendChild(joinNow3);
    
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