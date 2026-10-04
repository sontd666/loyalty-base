import { LoyaltyPolicy } from './loyalty-policy';
import { InvoiceStatus } from './types';
import type { IdGenerator, ORMSimulator } from './repositories';
import type { Invoice, PayInvoiceInput, UUID } from './types';

export class LoyaltyService {
  constructor(
    private readonly orm: ORMSimulator,
    private readonly policy: LoyaltyPolicy,
    private readonly ids: IdGenerator,
  ) {}

  async payInvoice(input: PayInvoiceInput): Promise<Invoice> {
    const now = new Date();

    return this.orm.transaction(async (repos) => {
      const user = await repos.users.getForUpdate(input.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const order = await repos.orders.getForUpdate(input.orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const existingInvoice = await repos.invoices.findByOrderId(input.orderId);
      if (existingInvoice) {
        throw new Error('Invoice already exists for this order');
      }

      // Repository returns only valid lots, ordered by earliest expiry first.
      const availablePointLots = await repos.pointLots.findAvailableForUpdate(
        input.userId,
        now,
      );
      const availablePoints = availablePointLots.reduce(
        (sum, lot) => sum + lot.remainingAmount,
        0,
      );
      const maxRedeemablePoints = this.policy.calculateMaxRedeemablePoints(
        order.grossAmount,
        availablePoints,
      );
      this.policy.validateRequestedPoints(
        input.requestedPoints,
        maxRedeemablePoints,
      );

      const allocatedRedemptions = this.policy.allocateRedemptions(
        availablePointLots,
        input.requestedPoints,
      );

      // Compute the tier from previous paid invoices; the current invoice is excluded.
      const spendingLast12Months = await repos.invoices.sumPaidAmount(
        input.userId,
        this.policy.calculateRollingWindowStart(now),
        now,
      );
      const tier = this.policy.determineTier(spendingLast12Months);
      const multiplier = this.policy.determineMultiplier(
        tier,
        user.dateOfBirth,
        now,
      );

      const paidAmount = this.policy.calculatePaidAmount(
        order.grossAmount,
        input.requestedPoints,
      );

      const earnedPoints = this.policy.calculateEarnedPoints(
        paidAmount,
        multiplier,
      );

      const newInvoice: Invoice = {
        id: this.ids.next(),
        userId: input.userId,
        orderId: input.orderId,
        redeemedPoints: input.requestedPoints,
        paidAmount,
        status: InvoiceStatus.PAID,
        paidAt: now,
        refundedAt: null,
      };
      await repos.invoices.create(newInvoice);
      await Promise.all(
        allocatedRedemptions.map((allocation) => {
          return repos.pointLots.updateById(allocation.pointLotId, {
            remainingAmount:
              availablePointLots.find(
                (lot) => lot.id === allocation.pointLotId,
              )!.remainingAmount - allocation.pointsUsed,
          });
        }),
      );
      await repos.pointRedemptions.createMany(
        allocatedRedemptions.map((allocation) => ({
          id: this.ids.next(),
          invoiceId: newInvoice.id,
          pointLotId: allocation.pointLotId,
          pointsUsed: allocation.pointsUsed,
          reversedAt: null,
        })),
      );

      if (earnedPoints > 0) {
        const earnedAt = now;
        const expiresAt = this.policy.calculateExpiry(earnedAt);
        const newPointLot = {
          id: this.ids.next(),
          userId: input.userId,
          sourceInvoiceId: newInvoice.id,
          earnedPoints,
          remainingAmount: earnedPoints,
          earnedAt,
          expiresAt,
          revokedAt: null,
        };
        await repos.pointLots.create(newPointLot);
      }

      return newInvoice;
    });
  }

  async refundInvoice(invoiceId: UUID): Promise<void> {
    const now = new Date();

    await this.orm.transaction(async (repos) => {
      const invoice = await repos.invoices.getForUpdate(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }
      if (invoice.status === InvoiceStatus.REFUNDED) {
        throw new Error('Invoice already refunded');
      }

      this.policy.validateRefundDate(invoice.paidAt, now);

      const pointLot =
        await repos.pointLots.findBySourceInvoiceForUpdate(invoiceId);
      if (pointLot) {
        await repos.pointLots.updateById(pointLot.id, {
          remainingAmount: 0,
          revokedAt: now,
        });
      }

      // Restore each redemption to its original lot without extending the expiry.
      const redemptions =
        await repos.pointRedemptions.findByInvoiceForUpdate(invoiceId);
      for (const redemption of redemptions) {
        const lot = await repos.pointLots.getForUpdate(redemption.pointLotId);
        if (!lot) {
          throw new Error('Point lot not found for redemption');
        }
        await repos.pointLots.updateById(lot.id, {
          remainingAmount: lot.remainingAmount + redemption.pointsUsed,
        });
        await repos.pointRedemptions.updateById(redemption.id, {
          reversedAt: now,
        });
      }

      await repos.invoices.updateById(invoice.id, {
        status: InvoiceStatus.REFUNDED,
        refundedAt: now,
      });
    });
  }
}
