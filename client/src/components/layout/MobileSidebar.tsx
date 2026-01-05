import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Sport } from "@/types";
import { Menu, Grid2X2 } from "lucide-react";
import { 
  MdSportsBaseball, 
  MdSportsBasketball, 
  MdSportsSoccer, 
  MdSportsTennis, 
  MdSportsHockey, 
  MdSportsEsports, 
  MdSportsRugby, 
  MdSportsCricket, 
  MdSportsHandball,
  MdSportsVolleyball
} from "react-icons/md";
import {
  FaFistRaised,
  FaHorse,
  FaDog,
  FaShieldAlt,
  FaTableTennis
} from "react-icons/fa";
import { useQuery } from "@tanstack/react-query";

export default function MobileSidebar() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [activeSport, setActiveSport] = useState("upcoming");
  
  const { data: sports = [] } = useQuery<Sport[]>({
    queryKey: ['/api/sports']
  });
  
  useEffect(() => {
    // Extract the current sport from the location
    const path = location.split('?')[0];
    if (path === '/') {
      setActiveSport('upcoming');
    } else if (path.startsWith('/sport/')) {
      setActiveSport(path.replace('/sport/', ''));
    }
  }, [location]);

  const getSportIcon = (sport: string) => {
    switch (sport.toLowerCase()) {
      case 'football':
        return <MdSportsSoccer className="h-5 w-5" />;
      case 'basketball':
        return <MdSportsBasketball className="h-5 w-5" />;
      case 'tennis':
        return <MdSportsTennis className="h-5 w-5" />;
      case 'baseball':
        return <MdSportsBaseball className="h-5 w-5" />;
      case 'boxing':
        return <FaFistRaised className="h-5 w-5" />;
      case 'hockey':
        return <MdSportsHockey className="h-5 w-5" />;
      case 'esports':
        return <MdSportsEsports className="h-5 w-5" />;
      case 'mma-ufc':
        return <FaFistRaised className="h-5 w-5" />;
      case 'volleyball':
        return <MdSportsVolleyball className="h-5 w-5" />;
      case 'table-tennis':
        return <FaTableTennis className="h-5 w-5" />;
      case 'rugby-league':
      case 'rugby-union':
        return <MdSportsRugby className="h-5 w-5" />;
      case 'cricket':
        return <MdSportsCricket className="h-5 w-5" />;
      case 'horse-racing':
        return <FaHorse className="h-5 w-5" />;
      case 'greyhounds':
        return <FaDog className="h-5 w-5" />;
      case 'afl':
        return <FaShieldAlt className="h-5 w-5" />;
      default:
        return <Grid2X2 className="h-5 w-5" />;
    }
  };

  const handleNavigation = (path: string) => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 bg-[#032F36] text-white w-64">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="py-6 px-6 flex items-center">
            <Link href="/" onClick={() => handleNavigation('/')}>
              <img 
                src="/logo/suibets-logo.png?v=999" 
                alt="SuiBets Logo" 
                className="h-8"
                onError={(e) => console.log('Logo loading:', e)}
              />
            </Link>
          </div>
          
          {/* Navigation */}
          <div className="flex-grow overflow-y-auto scrollbar-hidden space-y-1">
            {/* Upcoming */}
            <Link href="/">
              <div 
                className={`flex items-center px-4 py-3 mx-2 rounded ${
                  activeSport === 'upcoming' 
                    ? 'bg-primary text-black' 
                    : 'text-white hover:bg-[#042A30]'
                }`}
                onClick={() => handleNavigation('/')}
              >
                <div className="w-8 h-8 mr-3 flex items-center justify-center">
                  <Grid2X2 className="h-5 w-5" />
                </div>
                <span className={activeSport === 'upcoming' ? 'font-semibold' : ''}>Upcoming</span>
              </div>
            </Link>

            {/* Sports categories */}
            {sports.map((sport) => (
              <Link key={sport.id} href={`/sports-live/${sport.slug}`}>
                <div
                  className={`flex items-center px-4 py-3 mx-2 rounded ${
                    activeSport === sport.slug 
                      ? 'bg-primary text-black' 
                      : 'text-white hover:bg-[#042A30]'
                  }`}
                  onClick={() => handleNavigation(`/sports-live/${sport.slug}`)}
                >
                  <div className="w-8 h-8 mr-3 flex items-center justify-center">
                    {getSportIcon(sport.slug)}
                  </div>
                  <span className={activeSport === sport.slug ? 'font-semibold' : ''}>{sport.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
