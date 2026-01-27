import { db } from '../db';
import { bettingPromotions } from '@shared/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { storage } from '../storage';

// Promotion constants
const PROMO_THRESHOLD_USD = 15; // $15 in bets to qualify
const PROMO_BONUS_USD = 5; // $5 bonus reward
const PROMO_DURATION_DAYS = 7; // 1 week promotion

// Price estimates (can be updated with real-time prices)
const SUI_PRICE_USD = 3.50; // Approximate SUI price in USD
const SBETS_PRICE_USD = 0.000001; // SBETS price in USD (very low)

export class PromotionService {
  private static instance: PromotionService;

  static getInstance(): PromotionService {
    if (!PromotionService.instance) {
      PromotionService.instance = new PromotionService();
    }
    return PromotionService.instance;
  }

  getPromotionEndDate(): Date {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + PROMO_DURATION_DAYS);
    return endDate;
  }

  isPromotionActive(): boolean {
    const promoEnd = new Date('2026-02-03T23:59:59Z'); // 1 week from Jan 27
    return new Date() < promoEnd;
  }

  convertToUsd(amount: number, currency: 'SUI' | 'SBETS'): number {
    if (currency === 'SUI') {
      return amount * SUI_PRICE_USD;
    } else {
      return amount * SBETS_PRICE_USD;
    }
  }

  async getOrCreatePromotion(walletAddress: string): Promise<{
    totalBetUsd: number;
    bonusesAwarded: number;
    bonusBalance: number;
    promotionEnd: Date;
    nextBonusAt: number;
    isActive: boolean;
  }> {
    const now = new Date();
    const promoEnd = new Date('2026-02-03T23:59:59Z');

    if (now > promoEnd) {
      return {
        totalBetUsd: 0,
        bonusesAwarded: 0,
        bonusBalance: 0,
        promotionEnd: promoEnd,
        nextBonusAt: PROMO_THRESHOLD_USD,
        isActive: false
      };
    }

    const existing = await db.select()
      .from(bettingPromotions)
      .where(eq(bettingPromotions.walletAddress, walletAddress))
      .limit(1);

    if (existing.length > 0) {
      const promo = existing[0];
      const nextThreshold = (promo.bonusesAwarded + 1) * PROMO_THRESHOLD_USD;
      return {
        totalBetUsd: promo.totalBetUsd,
        bonusesAwarded: promo.bonusesAwarded,
        bonusBalance: promo.bonusBalance,
        promotionEnd: promo.promotionEnd,
        nextBonusAt: nextThreshold - promo.totalBetUsd,
        isActive: now < promo.promotionEnd
      };
    }

    // Create new promotion record
    const promoStart = now;
    await db.insert(bettingPromotions).values({
      walletAddress,
      totalBetUsd: 0,
      bonusesAwarded: 0,
      bonusBalance: 0,
      promotionStart: promoStart,
      promotionEnd: promoEnd
    });

    return {
      totalBetUsd: 0,
      bonusesAwarded: 0,
      bonusBalance: 0,
      promotionEnd: promoEnd,
      nextBonusAt: PROMO_THRESHOLD_USD,
      isActive: true
    };
  }

  async trackBetAndAwardBonus(
    walletAddress: string,
    betAmount: number,
    currency: 'SUI' | 'SBETS'
  ): Promise<{ bonusAwarded: boolean; bonusAmount: number; newBonusBalance: number }> {
    if (!this.isPromotionActive()) {
      return { bonusAwarded: false, bonusAmount: 0, newBonusBalance: 0 };
    }

    const betUsd = this.convertToUsd(betAmount, currency);
    const promo = await this.getOrCreatePromotion(walletAddress);

    if (!promo.isActive) {
      return { bonusAwarded: false, bonusAmount: 0, newBonusBalance: promo.bonusBalance };
    }

    const newTotalBetUsd = promo.totalBetUsd + betUsd;
    const currentThreshold = (promo.bonusesAwarded + 1) * PROMO_THRESHOLD_USD;

    let bonusAwarded = false;
    let bonusAmount = 0;
    let newBonusesAwarded = promo.bonusesAwarded;
    let newBonusBalance = promo.bonusBalance;

    // Check if we crossed the threshold
    if (newTotalBetUsd >= currentThreshold) {
      bonusAwarded = true;
      bonusAmount = PROMO_BONUS_USD;
      newBonusesAwarded = promo.bonusesAwarded + 1;
      newBonusBalance = promo.bonusBalance + bonusAmount;

      console.log(`🎁 PROMOTION BONUS: ${walletAddress.slice(0, 10)}... earned $${bonusAmount} bonus! Total bet: $${newTotalBetUsd.toFixed(2)}`);
    }

    // Update promotion record
    await db.update(bettingPromotions)
      .set({
        totalBetUsd: newTotalBetUsd,
        bonusesAwarded: newBonusesAwarded,
        bonusBalance: newBonusBalance,
        lastBetAt: new Date()
      })
      .where(eq(bettingPromotions.walletAddress, walletAddress));

    return { bonusAwarded, bonusAmount, newBonusBalance };
  }

  async useBonusBalance(walletAddress: string, amount: number): Promise<boolean> {
    const promo = await this.getOrCreatePromotion(walletAddress);

    if (promo.bonusBalance < amount) {
      return false;
    }

    await db.update(bettingPromotions)
      .set({
        bonusBalance: promo.bonusBalance - amount
      })
      .where(eq(bettingPromotions.walletAddress, walletAddress));

    console.log(`💸 BONUS USED: ${walletAddress.slice(0, 10)}... used $${amount} bonus. Remaining: $${(promo.bonusBalance - amount).toFixed(2)}`);
    return true;
  }

  async getPromotionStatus(walletAddress: string): Promise<{
    isActive: boolean;
    totalBetUsd: number;
    bonusesAwarded: number;
    bonusBalance: number;
    nextBonusAt: number;
    promotionEnd: Date;
    thresholdUsd: number;
    bonusUsd: number;
  }> {
    const promo = await this.getOrCreatePromotion(walletAddress);
    return {
      isActive: promo.isActive,
      totalBetUsd: promo.totalBetUsd,
      bonusesAwarded: promo.bonusesAwarded,
      bonusBalance: promo.bonusBalance,
      nextBonusAt: promo.nextBonusAt,
      promotionEnd: promo.promotionEnd,
      thresholdUsd: PROMO_THRESHOLD_USD,
      bonusUsd: PROMO_BONUS_USD
    };
  }
}

export const promotionService = PromotionService.getInstance();
