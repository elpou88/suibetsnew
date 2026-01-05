import { useParams, useLocation } from "wouter";
import Layout from "@/components/layout/Layout";

export default function LiveEventPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  
  return (
    <Layout>
      <div className="w-full min-h-screen relative">
        <img 
          src="/images/Live 3 (2).png" 
          alt={`Live Event ${id}`}
          className="w-full h-full object-contain"
        />
        
        {/* Back button */}
        <button 
          onClick={() => setLocation("/live")}
          className="absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-lg"
        >
          Back to Live Events
        </button>
        
        {/* Event ID indicator */}
        <div className="absolute top-4 right-4 bg-black/50 text-white px-4 py-2 rounded-lg">
          Live Event ID: {id}
        </div>
      </div>
    </Layout>
  );
}