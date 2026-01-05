import { useEffect } from "react";
import { useLocation } from "wouter";

export default function GotoSports() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    // Get the sport from URL parameters if available
    const urlParams = new URLSearchParams(window.location.search);
    const sportSlug = urlParams.get('sport');
    
    if (sportSlug) {
      console.log(`Redirecting to sport page for ${sportSlug}`);
      // Redirect to the specific sport page
      setTimeout(() => {
        window.location.href = `/sport/${sportSlug}`;
      }, 100);
    } else {
      console.log("Redirecting to general sports page");
      // Redirect to the default sports page
      setTimeout(() => {
        window.location.href = '/sports-exact';
      }, 100);
    }
  }, [setLocation]);
  
  return <div className="h-screen flex items-center justify-center">Redirecting to sports...</div>;
}