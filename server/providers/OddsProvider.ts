import { OddsData } from '../types/betting';

/**
 * Interface for odds providers
 */
export interface OddsProvider {
  readonly id: string;
  readonly name: string;
  readonly weight: number;
  enabled: boolean;
  
  getOdds(): Promise<OddsData[]>;
}