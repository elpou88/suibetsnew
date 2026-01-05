import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Promotion } from "@/types";

export function PromotionBanner() {
  const { data: promotions = [] } = useQuery<Promotion[]>({
    queryKey: ['/api/promotions'],
  });

  // Find the referral promotion (main banner)
  const referralPromotion = promotions.find(p => p.type === 'referral');

  if (!referralPromotion) {
    return null;
  }

  return (
    <div className="w-full bg-blue-900 rounded-lg overflow-hidden mb-6 relative">
      <div className="bg-gradient-to-r from-blue-900 to-indigo-800 h-40"></div>
      <div className="absolute top-0 left-0 right-0 bottom-0 p-6 text-white">
        <div className="flex items-center">
          <span className="text-primary text-xl font-bold mr-2">SuiBets</span>
        </div>
        <h2 className="text-2xl md:text-4xl font-bold mt-2">
          {referralPromotion.title}
        </h2>
        <div className="text-4xl md:text-7xl font-bold text-white">
          {referralPromotion.amount?.toLocaleString()}
        </div>
        <div className="text-xl font-semibold">$SUIBETS</div>
        <Link href="/join">
          <Button size="lg" className="mt-2 md:mt-4">
            Join Now
          </Button>
        </Link>
      </div>
    </div>
  );
}
