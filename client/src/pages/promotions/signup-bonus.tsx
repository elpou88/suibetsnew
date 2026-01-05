import { useLocation } from "wouter";
import Layout from "@/components/layout/Layout";

export default function SignupBonusPage() {
  const [, setLocation] = useLocation();
  
  return (
    <Layout>
      <div className="w-full min-h-screen relative">
        <img 
          src="/images/Promotions (2).png" 
          alt="Signup Bonus"
          className="w-full h-full object-contain"
        />
        
        {/* Back button */}
        <button 
          onClick={() => setLocation("/promotions")}
          className="absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-lg"
        >
          Back to Promotions
        </button>
        
        {/* Promotion type indicator */}
        <div className="absolute top-4 right-4 bg-black/50 text-white px-4 py-2 rounded-lg">
          Promotion: Signup Bonus
        </div>
      </div>
    </Layout>
  );
}