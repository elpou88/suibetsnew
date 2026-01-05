import { useEffect, useState } from "react";
import { Sport } from "@/types";
import { 
  Grid2X2, 
  ChevronRight, 
  ChevronDown, 
  LineChart,
  Flame,
  BarChart3
} from "lucide-react";
import { 
  MdSportsBaseball, 
  MdSportsBasketball, 
  MdSportsSoccer, 
  MdSportsTennis, 
  MdSportsHockey, 
  MdSportsEsports, 
  MdSportsRugby, 
  MdSportsCricket, 
  MdSportsVolleyball,
  MdSportsFootball
} from "react-icons/md";
import {
  FaFistRaised,
  FaHorse,
  FaTableTennis,
  FaDog,
  FaFootballBall,
  FaHandPaper,
  FaBullseye,
  FaBasketballBall,
  FaSnowboarding,
  FaBiking,
  FaMotorcycle,
  FaGolfBall
} from "react-icons/fa";
import {
  TbSteeringWheel,
  TbBike
} from "react-icons/tb";
import {
  GiTennisRacket,
  GiVolleyballBall,
  GiEightBall
} from "react-icons/gi";
import { useQuery } from "@tanstack/react-query";

// Basic categories that will always be available
const MAIN_CATEGORY = {
  name: "Main",
  sports: [
    { id: 0, name: 'Homepage', slug: 'upcoming', icon: 'grid' },
    { id: 0, name: 'Live Now', slug: 'live', icon: 'live', highlight: true },
    { id: 0, name: 'Live Scores', slug: 'live-scores', icon: 'chart' }
  ]
};

// Map of icons for sports
const SPORT_ICON_MAP: Record<string, string> = {
  'soccer': 'soccer',
  'football': 'soccer',
  'basketball': 'basketball',
  'tennis': 'tennis',
  'baseball': 'baseball',
  'hockey': 'hockey',
  'american_football': 'american-football',
  'boxing': 'boxing',
  'mma-ufc': 'mma',
  'volleyball': 'volleyball',
  'beach-volleyball': 'beach-volleyball',
  'rugby': 'rugby',
  'rugby-league': 'rugby',
  'rugby-union': 'rugby',
  'cricket': 'cricket',
  'handball': 'handball',
  'table-tennis': 'tabletennis',
  'badminton': 'badminton',
  'horse-racing': 'horse',
  'formula_1': 'formula1',
  'formula-1': 'formula1',
  'cycling': 'cycling',
  'snooker': 'snooker',
  'darts': 'darts',
  'golf': 'golf',
  'winter-sports': 'winter-sports',
  'afl': 'football',
  'aussie-rules': 'football',
  'esports': 'esports',
  'motogp': 'motogp',
};

// Organize sports into their categories
const organizeSports = (apiSports: Sport[]) => {
  const categorizedSports = {
    popular: [] as any[],
    combat: [] as any[],
    team: [] as any[],
    racquet: [] as any[],
    racing: [] as any[],
    other: [] as any[]
  };
  
  // Convert API sports to sidebar format and categorize
  apiSports.forEach(sport => {
    const sportItem = {
      id: sport.id,
      name: sport.name,
      slug: sport.slug,
      icon: SPORT_ICON_MAP[sport.slug] || 'grid',
      highlight: false
    };
    
    // Categorize each sport
    if (['soccer', 'football', 'basketball', 'tennis', 'baseball', 'hockey', 'american_football', 'esports'].includes(sport.slug)) {
      categorizedSports.popular.push(sportItem);
    } 
    else if (['boxing', 'mma-ufc', 'mma'].includes(sport.slug)) {
      categorizedSports.combat.push(sportItem);
    }
    else if (['volleyball', 'beach-volleyball', 'rugby', 'rugby-league', 'rugby-union', 'cricket', 'handball', 'netball', 'afl'].includes(sport.slug)) {
      categorizedSports.team.push(sportItem);
    }
    else if (['table-tennis', 'badminton'].includes(sport.slug)) {
      categorizedSports.racquet.push(sportItem);
    }
    else if (['formula_1', 'formula-1', 'motorsport', 'cycling', 'horse-racing', 'motogp'].includes(sport.slug)) {
      categorizedSports.racing.push(sportItem);
    }
    else {
      categorizedSports.other.push(sportItem);
    }
  });
  
  // Build final categories array
  const categories = [MAIN_CATEGORY];
  
  if (categorizedSports.popular.length > 0) {
    categories.push({
      name: "Popular Sports",
      sports: categorizedSports.popular
    });
  }
  
  if (categorizedSports.combat.length > 0) {
    categories.push({
      name: "Combat Sports",
      sports: categorizedSports.combat
    });
  }
  
  if (categorizedSports.team.length > 0) {
    categories.push({
      name: "Team Sports",
      sports: categorizedSports.team
    });
  }
  
  if (categorizedSports.racquet.length > 0) {
    categories.push({
      name: "Racquet Sports",
      sports: categorizedSports.racquet
    });
  }
  
  if (categorizedSports.racing.length > 0) {
    categories.push({
      name: "Racing",
      sports: categorizedSports.racing
    });
  }
  
  if (categorizedSports.other.length > 0) {
    categories.push({
      name: "Other Sports",
      sports: categorizedSports.other
    });
  }
  
  return categories;
};

export default function Sidebar() {
  const [activeSport, setActiveSport] = useState("upcoming");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["Main", "Popular Sports"]);
  
  // Fetch sports from API
  const { data: apiSports = [] } = useQuery<Sport[]>({
    queryKey: ['/api/sports']
  });
  
  // Create sports categories from fetched data
  const sportsCategories = organizeSports(apiSports);

  // Set active sport based on path and expand the relevant category
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/' || path === '/sports') {
      setActiveSport('upcoming');
    } else if (path.includes('/sports-live/')) {
      const sportSlug = path.split('/sports-live/')[1];
      setActiveSport(sportSlug);
      
      // Find which category contains this sport
      for (const category of sportsCategories) {
        if (category.sports.some((sport: any) => sport.slug === sportSlug)) {
          if (!expandedCategories.includes(category.name)) {
            setExpandedCategories([...expandedCategories, category.name]);
          }
          break;
        }
      }
    }
  }, [window.location.pathname, sportsCategories, expandedCategories]); // Update when pathname or sports change

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryName) 
        ? prev.filter(name => name !== categoryName)
        : [...prev, categoryName]
    );
  };

  const getSportIcon = (iconType: string) => {
    switch (iconType) {
      case 'grid':
        return <Grid2X2 size={24} />;
      case 'live':
        return <Flame size={24} className="text-red-500" />;
      case 'chart':
        return <BarChart3 size={24} className="text-blue-400" />;
      case 'soccer':
        return <MdSportsSoccer size={24} />;
      case 'basketball':
        return <MdSportsBasketball size={24} />;
      case 'tennis':
        return <MdSportsTennis size={24} />;
      case 'baseball':
        return <MdSportsBaseball size={24} />;
      case 'boxing':
        return <FaFistRaised size={24} />;
      case 'hockey':
        return <MdSportsHockey size={24} />;
      case 'esports':
        return <MdSportsEsports size={24} />;
      case 'mma':
        return <FaFistRaised size={24} />;
      case 'volleyball':
        return <MdSportsVolleyball size={24} />;
      case 'tabletennis':
        return <FaTableTennis size={24} />;
      case 'rugby':
        return <MdSportsRugby size={24} />;
      case 'cricket':
        return <MdSportsCricket size={24} />;
      case 'horse':
        return <FaHorse size={24} />;
      case 'dog':
        return <FaDog size={24} />;
      case 'football':
        return <MdSportsFootball size={24} />;
      case 'american-football':
        return <FaFootballBall size={24} />;
      case 'formula1':
        return <TbSteeringWheel size={24} />;
      case 'cycling':
        return <FaBiking size={24} />;
      case 'handball':
        return <FaHandPaper size={24} />;
      case 'snooker':
        return <GiEightBall size={24} />;
      case 'darts':
        return <FaBullseye size={24} />;
      case 'badminton':
        return <GiTennisRacket size={24} />;
      case 'netball':
        return <FaBasketballBall size={24} />;
      case 'beach-volleyball':
        return <GiVolleyballBall size={24} />;
      case 'motogp':
        return <FaMotorcycle size={24} />;
      case 'golf':
        return <FaGolfBall size={24} />;
      case 'winter-sports':
        return <FaSnowboarding size={24} />;
      default:
        return <Grid2X2 size={24} />;
    }
  };

  return (
    <div className="flex flex-col w-64 bg-[#09151A] text-white h-full">
      {/* Logo */}
      <div className="py-4 px-4 flex items-center justify-between border-b border-[#123040]">
        <a href="/">
          <img 
            src="/logo/suibets-logo.png?v=999" 
            alt="SuiBets Logo" 
            className="h-8 cursor-pointer"
            onError={(e) => console.log('Logo loading:', e)}
          />
        </a>
      </div>
      
      {/* Sports navigation - categorized */}
      <div className="flex-grow overflow-y-auto no-scrollbar py-2">
        {sportsCategories.map((category: any) => (
          <div key={category.name} className="mb-2">
            {/* Category Header */}
            <div 
              className="flex items-center justify-between px-4 py-2 text-gray-400 hover:text-white cursor-pointer"
              onClick={() => toggleCategory(category.name)}
            >
              <span className="text-sm font-medium uppercase tracking-wider">{category.name}</span>
              {expandedCategories.includes(category.name) 
                ? <ChevronDown size={16} /> 
                : <ChevronRight size={16} />
              }
            </div>
            
            {/* Category Content */}
            {expandedCategories.includes(category.name) && (
              <div className="pl-2">
                {category.sports.map((sport: any) => {
                  const href = sport.slug === 'upcoming' 
                    ? "/" 
                    : sport.slug === 'live' 
                      ? "/live" 
                      : sport.slug === 'live-scores'
                        ? "/live-scores"
                        : `/sports-live/${sport.slug}`;
                  
                  return (
                    <a key={sport.id} href={href} className="block">
                      <div className={`flex items-center px-4 py-3 cursor-pointer rounded-md mx-1 
                        ${sport.highlight ? 'bg-[#1e3a3f] hover:bg-[#254247]' : ''}
                        ${activeSport === sport.slug 
                          ? 'text-cyan-400' 
                          : 'text-white hover:text-cyan-400 hover:bg-[#0f1d23]'
                        }`}
                      >
                        <div className="w-8 h-8 mr-3 flex items-center justify-center">
                          {getSportIcon(sport.icon)}
                        </div>
                        <span className={activeSport === sport.slug ? 'font-medium' : ''}>
                          {sport.name}
                        </span>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}