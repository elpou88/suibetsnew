import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Promotion } from "@/types";
import { ChevronRight } from "lucide-react";

export function PromotionCards() {
  const { data: promotions = [] } = useQuery<Promotion[]>({
    queryKey: ['/api/promotions'],
  });

  // Filter out the referral promotion (used in banner)
  const displayPromotions = promotions.filter(p => p.type !== 'referral');

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayPromotions.map((promotion, index) => (
          <Card key={promotion.id} className={`overflow-hidden ${promotion.type === 'sign-up' ? 'bg-blue-800' : 'bg-blue-900'}`}>
            <CardContent className="p-6 text-white">
              <h3 className="text-xl md:text-3xl font-bold text-center">{promotion.title}</h3>
              <p className="text-sm mb-4 text-center">{promotion.description}</p>
              <div className="mt-2 flex flex-col space-y-2">
                <div className="flex items-center text-sm">
                  <span>Minimum deposit: ${promotion.minDeposit} in crypto</span>
                </div>
                <div className="flex items-center text-sm">
                  <span>Rollover on sports: {promotion.rolloverSports}x</span>
                </div>
                <div className="flex items-center text-sm">
                  <span>Rollover on casino: {promotion.rolloverCasino}x</span>
                </div>
              </div>
              <div className="mt-4 flex justify-center">
                <Link href="/join">
                  <Button className={`${promotion.type === 'sign-up' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                    Join Now
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="hidden lg:flex justify-end items-center">
          <Link href="/promotions">
            <Button variant="link" className="text-sm text-gray-500 hover:text-primary">
              All promotions
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
