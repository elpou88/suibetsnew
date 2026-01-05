import { useEffect } from "react";
import { useLocation } from "wouter";

export default function RedirectToPromotions() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    console.log("Redirecting to promotions page");
    // Redirect to the promotions page with a slight delay to ensure navigation works
    setTimeout(() => {
      window.location.href = "/promotions";
    }, 100);
  }, [setLocation]);
  
  return <div className="h-screen flex items-center justify-center">Redirecting to promotions...</div>;
}