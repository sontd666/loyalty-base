export type UUID = string;
export type MembershipTier = 'BRONZE' | 'SILVER' | 'GOLD';
export enum InvoiceStatus {
  PAID = 1,
  REFUNDED = 2,
}

export interface User {
  id: UUID;
  dateOfBirth: string; // YYYY-MM-DD
}

export interface Order {
  id: UUID;
  grossAmount: number;
}

export interface Invoice {
  id: UUID;
  userId: UUID;
  orderId: UUID;
  redeemedPoints: number;
  paidAmount: number;
  status: InvoiceStatus;
  paidAt: Date;
  refundedAt: Date | null;
}

export interface PointLot {
  id: UUID;
  userId: UUID;
  sourceInvoiceId: UUID;
  earnedPoints: number;
  remainingAmount: number;
  earnedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface PointRedemption {
  id: UUID;
  invoiceId: UUID;
  pointLotId: UUID;
  pointsUsed: number;
  reversedAt: Date | null;
}

export interface PayInvoiceInput {
  userId: UUID;
  orderId: UUID;
  requestedPoints: number;
}

export interface RedemptionAllocation {
  pointLotId: UUID;
  pointsUsed: number;
}
