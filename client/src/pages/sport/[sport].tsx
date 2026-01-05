import { useParams, useLocation } from "wouter";
import { useEffect } from "react";
import Layout from "@/components/layout/Layout";
import sportImages from '@/data/sportImages';

export default function SportPage() {
  const { sport } = useParams<{ sport: string }>();
  const [, setLocation] = useLocation();
  
  // Find the sport details from the slug
  const sportDetails = sportImages.find(s => s.slug === sport);
  
  useEffect(() => {
    // If we don't have this sport, go back to home
    if (!sportDetails) {
      setLocation("/");
    }
  }, [sport, sportDetails, setLocation]);
  
  if (!sportDetails) return null;
  
  return (
    <Layout>
      <div className="w-full min-h-screen relative">
        <img 
          src={sportDetails.imagePath} 
          alt={`${sportDetails.title} Sport Page`}
          className="w-full h-full object-contain"
        />
        
        {/* Back button */}
        <button 
          onClick={() => setLocation("/")}
          className="absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-lg"
        >
          Back to Home
        </button>
      </div>
    </Layout>
  );
}