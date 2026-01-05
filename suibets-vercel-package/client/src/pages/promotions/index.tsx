import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

// Define Promotion type for type safety
interface Promotion {
  id: number;
  title: string;
  description: string;
  endDate: string;
  category: string;
}

export default function PromotionsPage() {
  const [, setLocation] = useLocation();
  
  // Mock promotions data
  const mockPromotions: Promotion[] = [
    { 
      id: 1, 
      title: "Welcome Bonus", 
      description: "Get 100% bonus up to 1000 SUI on your first deposit", 
      endDate: "2025-05-15",
      category: "welcome"
    },
    { 
      id: 2, 
      title: "Referral Bonus", 
      description: "Earn 50 SBETS for each friend you refer", 
      endDate: "2025-12-31",
      category: "referral"
    },
    { 
      id: 3, 
      title: "NBA Finals Special", 
      description: "Get 20% cashback on all NBA Finals bets", 
      endDate: "2025-06-20",
      category: "sport"
    },
    { 
      id: 4, 
      title: "Champions League Parlay Boost", 
      description: "10% odds boost on Champions League parlays", 
      endDate: "2025-05-29",
      category: "sport"
    },
  ];
  
  // Fetch promotions data
  const { data: promotions = mockPromotions, isLoading } = useQuery<Promotion[]>({
    queryKey: ['/api/promotions'],
    // If no data is returned or an error occurs, fallback to mock data
  });
  
  return (
    <div className="w-full min-h-screen relative">
      <img 
        src="/images/Promotions (2).png" 
        alt="Promotions"
        className="w-full h-full object-contain"
      />
      
      {/* Back button */}
      <button 
        onClick={() => setLocation("/")}
        className="absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-lg"
      >
        Back to Home
      </button>
      
      {/* Promotions overlay */}
      <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 w-11/12 max-w-3xl">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">Current Promotions</h2>
        
        {isLoading ? (
          <div className="bg-black/70 p-4 rounded-lg">
            <p className="text-white text-center">Loading promotions...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {promotions.map((promo: Promotion) => (
              <div 
                key={promo.id}
                onClick={() => {
                  if (promo.category === "referral") {
                    setLocation("/promotions/referral");
                  } else {
                    // For other promotions, could add more detailed routes
                    setLocation(`/promotions/${promo.id}`);
                  }
                }}
                className="bg-black/70 p-4 rounded-lg cursor-pointer hover:bg-black/90 transition"
              >
                <div className="text-white">
                  <div className="font-bold text-lg mb-1">{promo.title}</div>
                  <div className="text-sm mb-2">{promo.description}</div>
                  <div className="text-xs text-gray-400">
                    Available until: {new Date(promo.endDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}