import { useRef, useState } from 'react';
import { Share2, Download, X, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';

interface BetLeg {
  eventName: string;
  selection: string;
  prediction?: string;
  odds: number;
}

interface ShareableBetCardProps {
  bet: {
    id: number;
    eventName: string;
    prediction: string;
    odds: number;
    betAmount: number;
    potentialPayout: number;
    currency: string;
    status: string;
    createdAt: string;
    txHash?: string;
  };
  isParlay?: boolean;
  parlayLegs?: BetLeg[];
  isOpen: boolean;
  onClose: () => void;
}

export function ShareableBetCard({ bet, isParlay = false, parlayLegs = [], isOpen, onClose }: ShareableBetCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won':
      case 'paid_out':
        return 'text-green-400';
      case 'lost':
        return 'text-red-400';
      case 'pending':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'won':
        return 'WON';
      case 'paid_out':
        return 'PAID OUT';
      case 'lost':
        return 'LOST';
      case 'pending':
        return 'PENDING';
      default:
        return status.toUpperCase();
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0a1214',
        scale: 2,
        logging: false,
        useCORS: true,
      });
      
      const link = document.createElement('a');
      link.download = `suibets-bet-${bet.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast({
        title: 'Downloaded!',
        description: 'Bet slip saved to your device',
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: 'Could not generate image',
        variant: 'destructive',
      });
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0a1214',
        scale: 2,
        logging: false,
        useCORS: true,
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        const file = new File([blob], `suibets-bet-${bet.id}.png`, { type: 'image/png' });
        
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'My SuiBets Bet',
            text: `Check out my bet on SuiBets! ${isParlay ? 'Parlay' : 'Single'} @ ${bet.odds.toFixed(2)} odds`,
            files: [file],
          });
        } else {
          const url = canvas.toDataURL('image/png');
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          toast({
            title: 'Copied to clipboard!',
            description: 'Image copied, paste it anywhere to share',
          });
        }
      }, 'image/png');
    } catch (error) {
      const shareUrl = `https://suibets.com/bet/${bet.id}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Link copied!',
        description: 'Share this link with friends',
      });
    }
  };

  const displayLegs = isParlay && parlayLegs.length > 0 ? parlayLegs : [{
    eventName: bet.eventName,
    selection: bet.prediction,
    odds: bet.odds
  }];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a1214] border-[#1e3a3f] text-white max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center justify-between">
            <span>Share Your Bet</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-4">
          <div 
            ref={cardRef}
            className="relative rounded-xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0d1b1e 0%, #112225 50%, #0a1214 100%)' }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/20 to-transparent" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-cyan-500/10 to-transparent" />
            
            <div className="relative p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center">
                    <span className="text-black font-bold text-xs">SB</span>
                  </div>
                  <span className="font-bold text-cyan-400 text-lg tracking-wide">SUIBETS</span>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  bet.status === 'won' || bet.status === 'paid_out' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : bet.status === 'lost' 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                }`}>
                  {getStatusText(bet.status)}
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm font-medium">
                  {isParlay ? `Parlay (${displayLegs.length} Legs)` : 'Single'}
                </span>
                <span className="text-white font-bold text-xl">{bet.odds.toFixed(2)}</span>
              </div>

              <div className="border-l-2 border-cyan-500/50 pl-4 space-y-3 mb-4">
                {displayLegs.map((leg, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[18px] top-1.5 w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 border-[#112225]" />
                    <div className="text-cyan-300 font-semibold text-sm">{leg.selection || leg.prediction}</div>
                    <div className="text-gray-500 text-xs">{leg.eventName}</div>
                    {displayLegs.length > 1 && (
                      <div className="text-gray-600 text-xs mt-0.5">@ {leg.odds.toFixed(2)}</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-black/30 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Stake</span>
                  <span className="text-white font-medium">
                    {bet.betAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {bet.currency}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">To Win</span>
                  <span className={`font-bold ${bet.status === 'won' || bet.status === 'paid_out' ? 'text-green-400' : 'text-cyan-400'}`}>
                    {bet.potentialPayout.toLocaleString(undefined, { maximumFractionDigits: 4 })} {bet.currency}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                <span>{formatDate(bet.createdAt)}</span>
                <span>suibets.com</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button 
              onClick={handleDownload}
              className="flex-1 bg-[#1e3a3f] hover:bg-[#2a4a4f] text-white"
              data-testid="button-download-bet"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button 
              onClick={handleShare}
              className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
              data-testid="button-share-bet"
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Share2 className="w-4 h-4 mr-2" />}
              {copied ? 'Copied!' : 'Share'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ShareButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="h-8 w-8 text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10"
      title="Share bet"
      data-testid="button-share-bet-open"
    >
      <Share2 className="w-4 h-4" />
    </Button>
  );
}
