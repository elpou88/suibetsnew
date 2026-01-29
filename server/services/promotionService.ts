import { db } from '../db';
import { bettingPromotions } from '@shared/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { storage } from '../storage';

// Promotion constants
const PROMO_THRESHOLD_USD = 15; // $15 in bets to qualify
const PROMO_BONUS_USD = 5; // $5 bonus reward
const PROMO_DURATION_DAYS = 14; // 2 weeks promotion
const PROMO_END_DATE = '2026-02-10T23:59:59Z'; // 2 weeks from Jan 27, 2026

// Price estimates (can be updated with real-time prices)
// Updated January 27, 2026 - SUI trading at ~$1.50
const SUI_PRICE_USD = 1.50; // Current SUI price in USD
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
    const promoEnd = new Date(PROMO_END_DATE); // 2 weeks from Jan 27, 2026
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
    const promoEnd = new Date(PROMO_END_DATE);

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
      // Ensure we use the promoEnd from the database, not a new one
      const actualPromoEnd = promo.promotionEnd || promoEnd;
      const nextThreshold = (promo.bonusesAwarded + 1) * PROMO_THRESHOLD_USD;
      return {
        totalBetUsd: promo.totalBetUsd,
        bonusesAwarded: promo.bonusesAwarded,
        bonusBalance: promo.bonusBalance,
        promotionEnd: actualPromoEnd,
        nextBonusAt: nextThreshold - promo.totalBetUsd,
        isActive: now < actualPromoEnd
      };
    }

    // Create new promotion record with upsert to prevent duplicates
    const promoStart = now;
    await db.insert(bettingPromotions).values({
      walletAddress,
      totalBetUsd: 0,
      bonusesAwarded: 0,
      bonusBalance: 0,
      promotionStart: promoStart,
      promotionEnd: promoEnd
    }).onConflictDoNothing();

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
      console.log(`[PROMO] Promotion not active, skipping bonus tracking`);
      return { bonusAwarded: false, bonusAmount: 0, newBonusBalance: 0 };
    }

    const betUsd = this.convertToUsd(betAmount, currency);
    console.log(`[PROMO] Tracking bet: ${betAmount} ${currency} = $${betUsd.toFixed(2)} USD for wallet ${walletAddress.slice(0, 10)}...`);
    
    const promo = await this.getOrCreatePromotion(walletAddress);

    if (!promo.isActive) {
      console.log(`[PROMO] User promo not active`);
      return { bonusAwarded: false, bonusAmount: 0, newBonusBalance: promo.bonusBalance };
    }

    const newTotalBetUsd = promo.totalBetUsd + betUsd;
    
    // Calculate how many bonuses they should have based on total amount bet
    // Every $15 = 1 bonus, so someone with $45 total should have 3 bonuses
    const totalBonusesEarned = Math.floor(newTotalBetUsd / PROMO_THRESHOLD_USD);
    const newBonusesToAward = totalBonusesEarned - promo.bonusesAwarded;

    let bonusAwarded = false;
    let bonusAmount = 0;
    let newBonusesAwarded = promo.bonusesAwarded;
    let newBonusBalance = promo.bonusBalance;

    // Award ALL new bonuses (handles large bets that cross multiple thresholds)
    if (newBonusesToAward > 0) {
      bonusAwarded = true;
      bonusAmount = newBonusesToAward * PROMO_BONUS_USD;
      newBonusesAwarded = totalBonusesEarned;
      newBonusBalance = promo.bonusBalance + bonusAmount;

      console.log(`🎁🎁🎁 PROMOTION BONUS AWARDED! 🎁🎁🎁`);
      console.log(`   Wallet: ${walletAddress.slice(0, 10)}...`);
      console.log(`   Total bet USD: $${newTotalBetUsd.toFixed(2)}`);
      console.log(`   New bonuses earned: ${newBonusesToAward} x $${PROMO_BONUS_USD} = $${bonusAmount}`);
      console.log(`   New bonus balance: $${newBonusBalance.toFixed(2)}`);
    }

    // Update promotion record in database
    await db.update(bettingPromotions)
      .set({
        totalBetUsd: newTotalBetUsd,
        bonusesAwarded: newBonusesAwarded,
        bonusBalance: newBonusBalance,
        lastBetAt: new Date()
      })
      .where(eq(bettingPromotions.walletAddress, walletAddress));

    console.log(`[PROMO] Updated DB: totalBetUsd=$${newTotalBetUsd.toFixed(2)}, bonusesAwarded=${newBonusesAwarded}, bonusBalance=$${newBonusBalance.toFixed(2)}`);

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
