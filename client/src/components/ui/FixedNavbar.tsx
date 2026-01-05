import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

const FixedNavbar = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    if (containerRef.current) {
      // Clear any existing content
      containerRef.current.innerHTML = '';
      
      // Create a container for our links
      const navContainer = document.createElement('div');
      navContainer.className = 'fixed-navbar';
      navContainer.style.display = 'flex';
      navContainer.style.justifyContent = 'center';
      navContainer.style.alignItems = 'center';
      navContainer.style.gap = '40px';
      navContainer.style.padding = '20px 0';
      
      // Create Sports link
      const sportsLink = document.createElement('a');
      sportsLink.href = '/';
      sportsLink.textContent = 'Sports';
      sportsLink.style.color = '#00FFFF';
      sportsLink.style.textDecoration = 'none';
      sportsLink.style.borderBottom = '2px solid #00FFFF';
      sportsLink.style.paddingBottom = '5px';
      
      // Add click handler for Sports
      sportsLink.addEventListener('click', (e) => {
        e.preventDefault();
        setLocation('/');
      });
      
      // Create Live link with red dot
      const liveLink = document.createElement('a');
      liveLink.href = '#';
      liveLink.textContent = 'Live';
      liveLink.style.color = 'white';
      liveLink.style.textDecoration = 'none';
      
      const redDot = document.createElement('span');
      redDot.style.display = 'inline-block';
      redDot.style.width = '8px';
      redDot.style.height = '8px';
      redDot.style.backgroundColor = 'red';
      redDot.style.borderRadius = '50%';
      redDot.style.marginLeft = '5px';
      redDot.classList.add('animate-pulse');
      
      liveLink.appendChild(redDot);
      
      // Add an event listener for router navigation
      liveLink.addEventListener('click', (e) => {
        e.preventDefault();
        setLocation('/live');
      });
      
      // Create Results link
      const resultsLink = document.createElement('a');
      resultsLink.href = '#';
      resultsLink.textContent = 'Results';
      resultsLink.style.color = 'white';
      resultsLink.style.textDecoration = 'none';
      
      // Add an event listener for router navigation
      resultsLink.addEventListener('click', (e) => {
        e.preventDefault();
        setLocation('/results');
      });
      
      // Add all links to container
      navContainer.appendChild(sportsLink);
      navContainer.appendChild(liveLink);
      navContainer.appendChild(resultsLink);
      
      // Add container to our ref
      containerRef.current.appendChild(navContainer);
    }
  }, [setLocation]);
  
  return <div ref={containerRef} className="fixed-navbar-container" />;
};

export default FixedNavbar;