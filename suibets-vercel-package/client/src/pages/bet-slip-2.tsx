import { useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ChevronDown, X } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BetMatch {
  id: string;
  team1: string;
  team2: string;
  outcomes: {
    id: string;
    name: string;
    odds: number;
    selected?: boolean;
  }[];
}

interface BetSelection {
  id: string;
  matchId: string;
  eventName: string;
  marketName: string;
  selectionName: string;
  odds: number;
}

export default function BetSlip2() {
  const [activeTab, setActiveTab] = useState("1");
  const [selectedSelections, setSelectedSelections] = useState<BetSelection[]>([
    {
      id: "1",
      matchId: "1",
      eventName: "Alas W Nigeria vs Bayelsa Queens",
      marketName: "Match Winner",
      selectionName: "Alas W Nigeria",
      odds: 1.75
    },
    {
      id: "2",
      matchId: "2",
      eventName: "Sunshine Solapio vs Bayelsa Queens",
      marketName: "Match Winner",
      selectionName: "Sunshine Solapio",
      odds: 2.80
    }
  ]);
  
  const [oddsChangeAccepted, setOddsChangeAccepted] = useState(false);
  const [stake, setStake] = useState("2.42");
  
  // Handicap selection data
  const [fullTimeHandicap, setFullTimeHandicap] = useState([
    { id: "h1", team: "Al Hilal Riyadh", selected: true, odds: 1.21 },
    { id: "h2", team: "Al Kohood", selected: false, odds: 5.30 }
  ]);
  
  // Game total selections
  const matches = [
    { id: "match1", team1: "Alas W Nigeria", team2: "Bayelsa Queens" }
  ];
  
  const calculateTotalOdds = () => {
    return selectedSelections.reduce((acc, bet) => acc * bet.odds, 1).toFixed(2);
  };
  
  const calculatePotentialWinnings = () => {
    const stakeValue = parseFloat(stake) || 0;
    return (stakeValue * parseFloat(calculateTotalOdds())).toFixed(2);
  };
  
  const handleClearAll = () => {
    setSelectedSelections([]);
  };
  
  const handleRemoveSelection = (id: string) => {
    setSelectedSelections(prev => prev.filter(sel => sel.id !== id));
  };
  
  const handleOddsChangeAccepted = () => {
    setOddsChangeAccepted(true);
  };
  
  return (
    <Layout>
      <div className="w-full min-h-screen p-4 bg-gray-100">
        <div className="max-w-4xl mx-auto relative">
          {/* Main content area */}
          <div className="grid grid-cols-1 gap-4">
            {/* Main matches section */}
            <Card className="w-full shadow-sm">
              <CardHeader className="py-3 px-4 border-b">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">← Back</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Tennis</span>
                    <ChevronDown className="h-4 w-4" />
                  </div>
                  <div className="grid grid-cols-5 gap-3 text-xs text-center font-medium">
                    <div>1</div>
                    <div>2</div>
                    <div>3</div>
                    <div>4</div>
                    <div>5</div>
                    <div className="font-normal text-muted-foreground">Sets</div>
                    <div className="font-normal text-muted-foreground">Totals</div>
                  </div>
                </div>
                
                {/* Match rows */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" checked className="rounded" />
                        <span className="text-sm">Alas W Nigeria</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-3 text-xs text-center">
                      <Button size="sm" variant="outline" className="bg-blue-50 h-6 min-w-[36px] px-1">2</Button>
                      <Button size="sm" variant="outline" className="h-6 min-w-[36px] px-1">3</Button>
                      <Button size="sm" variant="outline" className="h-6 min-w-[36px] px-1">4</Button>
                      <Button size="sm" variant="outline" className="h-6 min-w-[36px] px-1">4</Button>
                      <Button size="sm" variant="outline" className="h-6 min-w-[36px] px-1">5</Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Bayelsa Queens</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-3 text-xs text-center">
                      <Button size="sm" variant="outline" className="h-6 min-w-[36px] px-1">1</Button>
                      <Button size="sm" variant="outline" className="h-6 min-w-[36px] px-1">2</Button>
                      <Button size="sm" variant="outline" className="h-6 min-w-[36px] px-1">3</Button>
                      <Button size="sm" variant="outline" className="h-6 min-w-[36px] px-1">3</Button>
                      <Button size="sm" variant="outline" className="h-6 min-w-[36px] px-1">4</Button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">
                    3 Game 1st - Alas W Nigeria: Totals (o 4.5)
                  </div>
                </div>
                
                {/* Video player area (simplified) */}
                <div className="mt-6 relative w-full h-48 bg-gray-800 rounded overflow-hidden">
                  <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 text-xs rounded">LIVE</div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center">
                        <div className="w-0 h-0 border-t-4 border-t-transparent border-l-8 border-l-white border-b-4 border-b-transparent ml-1"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Bet slip popup overlay */}
            <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
              <div className="bg-white rounded-md w-full max-w-md mx-4">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <span className="font-medium">Bet Slip</span>
                      <span className="ml-2 text-sm text-gray-500">{activeTab}</span>
                    </div>
                    <button>
                      <ChevronDown className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                <div className="p-4 border-b border-gray-200">
                  <button className="text-sm text-gray-600 hover:underline">Clear all</button>
                </div>
                
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">No odds changes accepted</div>
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
                
                <div className="p-4 border-b border-gray-200">
                  <div className="mb-2 font-medium text-sm">Full Time Handicap</div>
                  <div className="grid grid-cols-1 gap-2">
                    {fullTimeHandicap.map(option => (
                      <div 
                        key={option.id} 
                        className={`p-2 rounded text-sm flex justify-between ${option.selected ? 'bg-blue-100 border border-blue-400' : 'bg-gray-100'}`}
                      >
                        {option.team} {option.selected && <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded">1.21</span>}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="text" 
                      value={stake} 
                      onChange={(e) => setStake(e.target.value)}
                      className="border border-gray-300 rounded p-2 w-16 text-center" 
                    />
                    <span className="font-medium text-sm">Stake</span>
                  </div>
                  <div className="text-gray-600 text-sm">MAX</div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-md m-4">
                  <div className="text-sm text-center text-gray-700">
                    The line, odds or availability of your selections has changed
                  </div>
                </div>
                
                <div className="p-4">
                  <Button 
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white"
                    onClick={handleOddsChangeAccepted}
                  >
                    Accept Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}