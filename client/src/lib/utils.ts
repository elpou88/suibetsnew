import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { SelectedBet } from "@/types/index";

// Helper utility for joining tailwind class names
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format odds to display in UI (decimal odds)
export function formatOdds(odds: number): string {
  if (!odds) return "-";
  return odds.toFixed(2);
}

// Format currency ($ format)
export function formatCurrency(amount: number): string {
  if (amount === undefined || amount === null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// Format date to display in UI
export function formatDate(date?: string | Date): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

// Calculate potential winnings based on stake and odds
export function calculatePotentialWinnings(stake: number, odds: number): number {
  if (!stake || !odds) return 0;
  return stake * odds;
}

// Calculate parlay odds (multiple bets)
export function calculateParlayOdds(bets: { odds: number }[]): number {
  if (!bets.length) return 0;
  return bets.reduce((totalOdds, bet) => totalOdds * bet.odds, 1);
}

// Get sport-specific markets based on sport type
export function getSportMarkets(sportType: string): { name: string; code: string }[] {
  // Default markets available for all sports
  const defaultMarkets = [
    { name: "Match Result", code: "MR" },
    { name: "Draw No Bet", code: "DNB" },
    { name: "Double Chance", code: "DC" },
    { name: "Handicap", code: "HDP" },
  ];

  // Team sports markets
  const teamSportsMarkets = [
    ...defaultMarkets,
    { name: "Both Teams to Score", code: "BTTS" },
    { name: "Total Goals", code: "TG" },
    { name: "Correct Score", code: "CS" },
    { name: "Half-Time/Full-Time", code: "HTFT" },
    { name: "First Goalscorer", code: "FG" },
  ];

  // Racket sports markets
  const racketSportsMarkets = [
    ...defaultMarkets,
    { name: "Set Betting", code: "SB" },
    { name: "Total Games", code: "TG" },
    { name: "Games Handicap", code: "GH" },
    { name: "Player to Win a Set", code: "PWS" },
  ];

  // Combat sports markets
  const combatSportsMarkets = [
    ...defaultMarkets,
    { name: "Method of Victory", code: "MOV" },
    { name: "Round Betting", code: "RB" },
    { name: "Will the Fight Go the Distance", code: "WFGD" },
    { name: "Total Rounds", code: "TR" },
  ];

  // Racing sports markets
  const racingSportsMarkets = [
    ...defaultMarkets,
    { name: "Race Winner", code: "RW" },
    { name: "Podium Finish", code: "PF" },
    { name: "Head to Head", code: "H2H" },
    { name: "Winning Margin", code: "WM" },
  ];

  // Precision sports markets
  const precisionSportsMarkets = [
    ...defaultMarkets,
    { name: "Tournament Winner", code: "TW" },
    { name: "To Make Final", code: "TMF" },
    { name: "Each Way", code: "EW" },
    { name: "Head to Head", code: "H2H" },
  ];

  // Individual competition markets
  const individualSportsMarkets = [
    ...defaultMarkets,
    { name: "Gold Medal", code: "GM" },
    { name: "To Win a Medal", code: "TWM" },
    { name: "Head to Head", code: "H2H" },
    { name: "Outright Winner", code: "OW" },
  ];

  // Sport-specific markets
  switch (sportType) {
    // Team sports
    case "football":
    case "soccer":
    case "handball":
    case "volleyball":
    case "beach-volleyball":
    case "rugby-league":
    case "rugby-union":
    case "afl":
      return teamSportsMarkets;
    
    // Court/Racket sports  
    case "basketball":
      return [
        ...defaultMarkets,
        { name: "Total Points", code: "TP" },
        { name: "Point Spread", code: "PS" },
        { name: "Quarter Betting", code: "QB" },
        { name: "Race to Points", code: "RTP" },
      ];
      
    case "tennis":
    case "badminton":
    case "table-tennis":
      return racketSportsMarkets;
      
    // Combat sports  
    case "boxing":
    case "mma-ufc":
      return combatSportsMarkets;
      
    // Cricket specific  
    case "cricket":
      return [
        ...defaultMarkets,
        { name: "Top Batsman", code: "TB" },
        { name: "Top Bowler", code: "TBO" },
        { name: "Total Runs", code: "TR" },
        { name: "Man of the Match", code: "MOM" },
      ];
      
    // Precision sports
    case "golf":
    case "darts":
    case "snooker":
      return precisionSportsMarkets;
      
    // Racing sports
    case "formula-1":
    case "cycling":
    case "horse-racing":
    case "greyhounds":
      return racingSportsMarkets;
    
    // Individual competitions
    case "athletics":
    case "swimming":
      return individualSportsMarkets;
      
    default:
      return defaultMarkets;
  }
}

// Generate UUID for client-side IDs
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Parse blockchain transaction hash
export function parseTransactionHash(txHash: string): string {
  if (!txHash) return "";
  // Only show first and last 6 characters of hash
  return txHash.length > 12
    ? `${txHash.substring(0, 6)}...${txHash.substring(txHash.length - 6)}`
    : txHash;
}

// Shorten wallet address for display
export function shortenAddress(address?: string): string {
  if (!address) return "";
  return address.length > 12
    ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
    : address;
}

// Calculate odds from probabilities
export function probabilityToDecimalOdds(probability: number): number {
  if (!probability || probability <= 0 || probability >= 1) return 0;
  return Number((1 / probability).toFixed(2));
}

// Validate a bet before adding it to the slip
export function validateBet(bet: SelectedBet): { valid: boolean; message?: string } {
  if (!bet.eventId) {
    return { valid: false, message: "Invalid event" };
  }
  if (!bet.odds || bet.odds <= 1) {
    return { valid: false, message: "Invalid odds" };
  }
  if (!bet.stake || bet.stake <= 0) {
    return { valid: false, message: "Stake must be greater than 0" };
  }
  return { valid: true };
}

// Get default stake amount based on user preferences 
export function getDefaultStake(): number {
  return 10; // Default stake
}

// Get blockchain network fee percentage
export function getNetworkFeePercentage(): number {
  return 0.01; // 1% network fee
}

// Calculate blockchain transaction fees
export function calculateTransactionFees(amount: number): { 
  platformFee: number, 
  networkFee: number,
  totalFees: number 
} {
  const platformFeePercentage = 0; // No platform fee as per requirements
  const networkFeePercentage = getNetworkFeePercentage();
  
  const platformFee = amount * platformFeePercentage;
  const networkFee = amount * networkFeePercentage;
  
  return {
    platformFee,
    networkFee,
    totalFees: platformFee + networkFee,
  };
}

// Wallet types for UI display - as array for mapping
// Slush (formerly Sui Wallet) is most popular, listed first
export const WALLET_TYPES = [
  { key: 'SLUSH', name: 'Slush Wallet' },
  { key: 'NIGHTLY', name: 'Nightly Wallet' },
  { key: 'SUIET', name: 'Suiet Wallet' },
  { key: 'ETHOS', name: 'Ethos Wallet' },
  { key: 'MARTIAN', name: 'Martian Wallet' },
];