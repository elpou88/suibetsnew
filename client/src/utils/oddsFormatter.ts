/**
 * Utility functions for proper odds formatting and display
 */

export function formatAmericanOdds(odds: number): string {
  if (!odds || isNaN(odds)) return 'N/A';
  
  // Handle American odds format
  if (odds > 0) {
    return `+${odds}`;
  } else {
    return `${odds}`;
  }
}

export function americanToDecimal(american: number): number {
  if (!american || isNaN(american)) return 1.0;
  
  if (american > 0) {
    return (american / 100) + 1;
  } else {
    return (100 / Math.abs(american)) + 1;
  }
}

export function formatOddsDisplay(odds: number, format: 'american' | 'decimal' = 'american'): string {
  if (!odds || isNaN(odds)) return 'N/A';
  
  if (format === 'decimal') {
    return americanToDecimal(odds).toFixed(2);
  }
  
  return formatAmericanOdds(odds);
}

export function isLiveEvent(status: string, isLive?: boolean): boolean {
  if (isLive !== undefined) return isLive;
  
  const liveStatuses = [
    'In Progress', 'Live', '1st Half', '2nd Half', 
    'Halftime', 'Overtime', 'In Play', 'Active'
  ];
  
  return liveStatuses.includes(status) || status.includes('Q') || status.includes('Period');
}