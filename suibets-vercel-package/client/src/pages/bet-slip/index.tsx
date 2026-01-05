import { useLocation } from "wouter";
import Layout from "@/components/layout/Layout";

export default function BetSlipPage() {
  const [, setLocation] = useLocation();
  
  return (
    <Layout>
      <div className="w-full min-h-screen relative">
        <img 
          src="/images/Bet Slip (2).png" 
          alt="Bet Slip"
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