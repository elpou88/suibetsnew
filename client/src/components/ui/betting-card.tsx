import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatOdds } from "@/lib/utils";
import { useBetting } from "@/context/BettingContext";

interface BettingCardProps {
  eventId: number;
  matchTitle: string;
  time?: string;
  isLive?: boolean;
  home: string;
  away: string;
  draw?: string;
  homeOdds: number;
  drawOdds?: number;
  awayOdds: number;
  handicapHome?: string;
  handicapAway?: string;
  totalOver?: string;
  totalUnder?: string;
}

export function BettingCard({
  eventId,
  matchTitle,
  time,
  isLive = false,
  home,
  away,
  draw,
  homeOdds,
  drawOdds,
  awayOdds,
  handicapHome,
  handicapAway,
  totalOver,
  totalUnder,
}: BettingCardProps) {
  const { addBet } = useBetting();
  
  const handleBetClick = (
    selectionName: string,
    odds: number,
    market: string
  ) => {
    addBet({
      id: `${eventId}-${market}-${selectionName}`,
      eventId,
      eventName: matchTitle,
      selectionName,
      odds,
      stake: 10, // Default stake amount
      market,
    });
  };

  return (
    <Card className="w-full mb-4 overflow-hidden">
      <CardContent className="p-0">
        <div className="p-3">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500">
                <th className="text-left font-normal">
                  {isLive ? (
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full inline-block mr-2 live-pulse"></span>
                      LIVE
                    </span>
                  ) : (
                    "Today"
                  )}
                </th>
                <th className="text-center font-normal w-16"></th>
                <th className="text-right font-normal w-20">1x2</th>
                <th className="text-right font-normal w-20">Handicap</th>
                <th className="text-right font-normal w-20">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3">
                  <div className="text-sm font-medium">{home}</div>
                  <div className="text-sm font-medium">{away}</div>
                  {draw && <div className="text-sm text-gray-400">Draw</div>}
                </td>
                <td className="text-center">
                  {time && (
                    <span className="text-xs text-white bg-primary px-1 py-0.5 rounded">
                      {time}
                    </span>
                  )}
                  {isLive && (
                    <span className="text-xs text-white bg-red-500 px-1 py-0.5 rounded">
                      LIVE
                    </span>
                  )}
                </td>
                <td>
                  <div className="flex flex-col space-y-1">
                    <Button
                      variant="outline"
                      className="p-1 h-auto text-sm text-right"
                      onClick={() => handleBetClick(home, homeOdds, "1x2")}
                    >
                      {formatOdds(homeOdds)}
                    </Button>
                    <Button
                      variant="outline"
                      className="p-1 h-auto text-sm text-right"
                      onClick={() => handleBetClick(away, awayOdds, "1x2")}
                    >
                      {formatOdds(awayOdds)}
                    </Button>
                    {drawOdds && (
                      <Button
                        variant="outline"
                        className="p-1 h-auto text-sm text-right"
                        onClick={() => handleBetClick("Draw", drawOdds, "1x2")}
                      >
                        {formatOdds(drawOdds)}
                      </Button>
                    )}
                  </div>
                </td>
                <td>
                  <div className="flex flex-col space-y-1">
                    {handicapHome ? (
                      <Button
                        variant="outline"
                        className="p-1 h-auto text-sm text-right"
                        onClick={() => 
                          handleBetClick(`${home} ${handicapHome}`, 2.01, "handicap")
                        }
                      >
                        {handicapHome} 2.01
                      </Button>
                    ) : (
                      <div className="p-1 rounded text-sm text-right text-gray-300">-</div>
                    )}
                    {handicapAway ? (
                      <Button
                        variant="outline"
                        className="p-1 h-auto text-sm text-right"
                        onClick={() => 
                          handleBetClick(`${away} ${handicapAway}`, 1.77, "handicap")
                        }
                      >
                        {handicapAway} 1.77
                      </Button>
                    ) : (
                      <div className="p-1 rounded text-sm text-right text-gray-300">-</div>
                    )}
                    <div className="p-1 rounded text-sm text-right text-gray-300">-</div>
                  </div>
                </td>
                <td>
                  <div className="flex flex-col space-y-1">
                    {totalOver ? (
                      <Button
                        variant="outline"
                        className="p-1 h-auto text-sm text-right"
                        onClick={() => 
                          handleBetClick(`Over ${totalOver}`, 1.76, "total")
                        }
                      >
                        O{totalOver} 1.76
                      </Button>
                    ) : (
                      <div className="p-1 rounded text-sm text-right text-gray-300">-</div>
                    )}
                    {totalUnder ? (
                      <Button
                        variant="outline"
                        className="p-1 h-auto text-sm text-right"
                        onClick={() => 
                          handleBetClick(`Under ${totalUnder}`, 2.02, "total")
                        }
                      >
                        U{totalUnder} 2.02
                      </Button>
                    ) : (
                      <div className="p-1 rounded text-sm text-right text-gray-300">-</div>
                    )}
                    <div className="p-1 rounded text-sm text-right text-gray-300">-</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
