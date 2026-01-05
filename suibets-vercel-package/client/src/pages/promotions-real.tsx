import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/layout/Layout";
import { Loader } from "@/components/ui/loader";

interface Promotion {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  bonusAmount: number;
  bonusCurrency: string;
  minimumDeposit: number;
  depositCurrency: string;
  rolloverRequirement: number;
  code?: string;
  type: string;
}

export default function PromotionsReal() {
  const [activePromo, setActivePromo] = useState<Promotion | null>(null);

  // Fetch promotions from the API
  const { data: promotions, isLoading, error } = useQuery<Promotion[]>({
    queryKey: ['/api/promotions'],
  });

  useEffect(() => {
    // Set first promotion as active by default when data loads
    if (promotions && promotions.length > 0 && !activePromo) {
      setActivePromo(promotions[0]);
    }
  }, [promotions, activePromo]);

  if (isLoading) {
    return (
      <Layout showBackButton title="Promotions">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader size="lg" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout showBackButton title="Promotions">
        <div className="flex flex-col items-center justify-center h-[50vh] p-4 text-center">
          <h2 className="text-xl font-bold text-red-500 mb-2">Error loading promotions</h2>
          <p className="text-gray-400">Please try again later</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showBackButton title="Promotions">
      {/* Referral Banner */}
      <div className="w-full bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg overflow-hidden mb-6">
        <Link href="/promotions/referral">
          <div className="block relative">
            <div className="w-full h-32 md:h-48 relative">
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10">
                <h3 className="text-xl md:text-3xl font-bold text-white">SuiBets</h3>
                <p className="text-lg md:text-2xl font-medium text-white mt-2">
                  Earn Referral Bonus of up to
                </p>
                <p className="text-3xl md:text-5xl font-bold text-white mt-2">
                  500000
                </p>
                <p className="text-lg md:text-xl font-medium text-white">
                  $SUIBETS
                </p>
              </div>
              <div className="absolute inset-0 bg-blue-600 bg-opacity-30 z-0"></div>
              {/* Confetti effect */}
              <div className="absolute inset-0 z-0 opacity-30" 
                   style={{
                     background: 'url(https://assets.codepen.io/28963/confetti.png)',
                     backgroundSize: '300px',
                     animation: 'confetti-fall 10s linear infinite'
                   }}></div>
            </div>
          </div>
        </Link>
      </div>

      <h3 className="text-lg font-medium mb-4">Available promotions</h3>

      {promotions && promotions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {promotions.map((promo) => (
            <Card 
              key={promo.id}
              className={`overflow-hidden cursor-pointer transition-all duration-200 ${
                activePromo?.id === promo.id 
                  ? 'border-primary border-2' 
                  : 'border-gray-700 hover:border-gray-500'
              }`}
              onClick={() => setActivePromo(promo)}
            >
              <div className="h-40 bg-gradient-to-r from-purple-900 to-blue-900 relative">
                {promo.type === 'sign-up-bonus' && (
                  <div className="absolute top-2 right-2 bg-emerald-600 text-white text-xs px-2 py-1 rounded-full">
                    SIGN-UP
                  </div>
                )}
                <div className="flex flex-col items-center justify-center h-full text-white p-4">
                  {promo.type === 'risk-free-bet' ? (
                    <>
                      <h3 className="text-3xl font-bold">$50</h3>
                      <p className="text-sm uppercase mt-1">RISK-FREE BET</p>
                      <p className="text-xs mt-2">DEPOSIT $200, PLAY WITH $450</p>
                    </>
                  ) : promo.type === 'sign-up-bonus' ? (
                    <>
                      <h3 className="text-3xl font-bold">100%</h3>
                      <p className="text-sm uppercase mt-1">SIGN-UP BONUS</p>
                      <p className="text-xs mt-2">GET UP TO 10,000 SUIBETS</p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-3xl font-bold">${promo.bonusAmount}</h3>
                      <p className="text-sm uppercase mt-1">{promo.title}</p>
                      <p className="text-xs mt-2">DEPOSIT ${promo.minimumDeposit}, PLAY WITH ${promo.minimumDeposit + promo.bonusAmount}</p>
                    </>
                  )}
                </div>
              </div>
              <CardContent className="p-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="text-gray-400 mr-2">•</span>
                    <span>Minimum deposit: <span className="text-white">${promo.minimumDeposit} in crypto</span></span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gray-400 mr-2">•</span>
                    <span>Rollover on sports: <span className="text-white">{promo.rolloverRequirement}x</span></span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gray-400 mr-2">•</span>
                    <span>Rollover on casino: <span className="text-white">35x</span></span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-400">No promotions currently available</p>
        </div>
      )}

      {activePromo && (
        <div className="mt-6 p-4 bg-gray-800 bg-opacity-70 rounded-lg">
          <h3 className="text-lg font-medium mb-2">{activePromo.title} Details</h3>
          <p className="text-gray-300 mb-4">{activePromo.description}</p>
          <div className="flex space-x-4">
            <Button>Claim Bonus</Button>
            <Button variant="outline">Terms & Conditions</Button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes confetti-fall {
            0% { background-position: 0 0; }
            100% { background-position: 0 600px; }
          }
        `
      }} />
    </Layout>
  );
}