import { useEffect } from "react";
import { useLocation } from "wouter";

export default function RedirectToLive() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    console.log("Redirecting to live page");
    // Redirect to the live page with a slight delay to ensure navigation works
    setTimeout(() => {
      window.location.href = "/live";
    }, 100);
  }, [setLocation]);
  
  return <div className="h-screen flex items-center justify-center">Redirecting to live events...</div>;
}