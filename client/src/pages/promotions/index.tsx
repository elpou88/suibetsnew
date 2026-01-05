import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, Tag, Users, Zap } from "lucide-react";

interface Promotion {
  id: number;
  title: string;
  description: string;
  type: string;
  amount?: number;
  endDate?: string;
  isActive: boolean;
}

export default function PromotionsPage() {
  const [, setLocation] = useLocation();
  
  const { data: promotions = [], isLoading } = useQuery<Promotion[]>({
    queryKey: ['/api/promotions'],
    refetchInterval: 30000,
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'referral': return <Users className="h-6 w-6 text-cyan-400" />;
      case 'deposit_bonus': return <Gift className="h-6 w-6 text-green-400" />;
      case 'risk-free': return <Zap className="h-6 w-6 text-yellow-400" />;
      default: return <Tag className="h-6 w-6 text-cyan-400" />;
    }
  };
  
  return (
    <Layout title="Promotions">
      <div className="min-h-screen bg-[#0b1618] p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-6">Current Promotions</h1>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            </div>
          ) : promotions.length === 0 ? (
            <Card className="bg-[#112225] border-cyan-900/30">
              <CardContent className="py-12 text-center">
                <Gift className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No active promotions at this time</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {promotions.map((promo) => (
                <Card 
                  key={promo.id}
                  onClick={() => {
                    if (promo.type === "referral") {
                      setLocation("/promotions/referral");
                    }
                  }}
                  className="bg-[#112225] border-cyan-900/30 cursor-pointer hover:border-cyan-500/50 transition-colors"
                  data-testid={`promo-card-${promo.id}`}
                >
                  <CardHeader className="flex flex-row items-center gap-4">
                    <div className="p-3 rounded-full bg-[#0b1618]">
                      {getIcon(promo.type)}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-white text-lg">{promo.title}</CardTitle>
                      {promo.amount && (
                        <p className="text-cyan-400 font-semibold">
                          Up to {promo.amount} {promo.type === 'referral' ? 'SBETS' : 'SUI'}
                        </p>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300">{promo.description}</p>
                    {promo.endDate && (
                      <p className="text-sm text-gray-500 mt-2">
                        Ends: {new Date(promo.endDate).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}