import type { MembershipTier, PointLot, RedemptionAllocation } from './types';

export class LoyaltyPolicy {
  static readonly VND_PER_EARNED_POINT = 10_000;
  static readonly VND_PER_REDEEMED_POINT = 1_000;

  determineTier(spendingLast12Months: number): MembershipTier {
    if (spendingLast12Months < 2_000_000) {
      return 'BRONZE';
    } else if (spendingLast12Months < 5_000_000) {
      return 'SILVER';
    } else {
      return 'GOLD';
    }
  }

  determineMultiplier(
    tier: MembershipTier,
    birthday: string,
    now: Date,
  ): number {
    const [, month, day] = birthday.split('-').map(Number);
    if (month === now.getMonth() + 1 && day === now.getDate()) {
      return 2;
    }

    switch (tier) {
      case 'BRONZE':
        return 1;
      case 'SILVER':
        return 1.2;
      case 'GOLD':
        return 1.5;
      default:
        throw new Error(`Unhandled membership tier: ${tier}`);
    }
  }

  calculateMaxRedeemablePoints(
    grossAmount: number,
    availablePoints: number,
  ): number {
    return Math.min(
      availablePoints,
      Math.floor(grossAmount / 2 / LoyaltyPolicy.VND_PER_REDEEMED_POINT),
    );
  }

  validateRequestedPoints(
    requestedPoints: number,
    maximumPoints: number,
  ): void {
    if (
      requestedPoints < 0 ||
      requestedPoints > maximumPoints ||
      !Number.isInteger(requestedPoints)
    ) {
      throw new Error('Invalid requested points');
    }
  }

  calculatePaidAmount(grossAmount: number, redeemedPoints: number): number {
    const redeemedValue = redeemedPoints * LoyaltyPolicy.VND_PER_REDEEMED_POINT;
    return grossAmount - redeemedValue;
  }

  calculateEarnedPoints(paidAmount: number, multiplier: number): number {
    return Math.floor(
      (paidAmount / LoyaltyPolicy.VND_PER_EARNED_POINT) * multiplier,
    );
  }

  allocateRedemptions(
    lots: PointLot[],
    requestedPoints: number,
  ): RedemptionAllocation[] {
    const result: RedemptionAllocation[] = [];
    let remainingPoints = requestedPoints;

    for (const lot of lots) {
      if (remainingPoints <= 0) {
        break;
      }

      const pointsToAllocate = Math.min(remainingPoints, lot.remainingAmount);
      result.push({
        pointLotId: lot.id,
        pointsUsed: pointsToAllocate,
      });
      remainingPoints -= pointsToAllocate;
    }

    return result;
  }

  calculateExpiry(earnedAt: Date): Date {
    const expiry = new Date(earnedAt.getFullYear(), earnedAt.getMonth() + 7, 0);
    expiry.setDate(Math.min(earnedAt.getDate(), expiry.getDate()) + 1);
    return expiry;
  }

  calculateRollingWindowStart(now: Date): Date {
    const start = new Date(now);
    start.setFullYear(start.getFullYear() - 1);
    if (start.getMonth() !== now.getMonth()) start.setDate(0);
    return start;
  }

  validateRefundDate(paidAt: Date, now: Date): void {
    if (paidAt.toDateString() !== now.toDateString()) {
      throw new Error('Refunds are only allowed on the same day as payment');
    }
  }
}
