import type {
  Invoice,
  Order,
  PointLot,
  PointRedemption,
  User,
  UUID,
} from './types';

export interface ORMSimulator {
  transaction<T>(
    work: (repos: TransactionRepositories) => Promise<T>,
  ): Promise<T>;
}

export interface TransactionRepositories {
  users: UserRepository;
  orders: OrderRepository;
  invoices: InvoiceRepository;
  pointLots: PointLotRepository;
  pointRedemptions: PointRedemptionRepository;
}

export interface UserRepository {
  getForUpdate(userId: UUID): Promise<User>; // SELECT ... FOR UPDATE
}

export interface OrderRepository {
  getForUpdate(orderId: UUID): Promise<Order>;
}

export interface InvoiceRepository {
  get(invoiceId: UUID): Promise<Invoice>;
  getForUpdate(invoiceId: UUID): Promise<Invoice>;
  findByOrderId(orderId: UUID): Promise<Invoice | null>;
  // SUM(paid_amount), status = 1 (InvoiceStatus.PAID), paid_at >= from AND paid_at < to.
  sumPaidAmount(userId: UUID, from: Date, to: Date): Promise<number>;
  create(invoice: Invoice): Promise<void>;
  updateById(id: UUID, invoice: Partial<Invoice>): Promise<void>;
}

export interface PointLotRepository {
  // expires_at > at, revoked_at IS NULL, remaining_amount > 0.
  // ORDER BY expires_at, earned_at, id; SELECT ... FOR UPDATE.
  findAvailableForUpdate(userId: UUID, at: Date): Promise<PointLot[]>;
  getForUpdate(pointLotId: UUID): Promise<PointLot>;
  findBySourceInvoiceForUpdate(invoiceId: UUID): Promise<PointLot | null>;
  create(lot: PointLot): Promise<void>;
  updateById(id: UUID, lot: Partial<PointLot>): Promise<void>;
}

export interface PointRedemptionRepository {
  findByInvoiceForUpdate(invoiceId: UUID): Promise<PointRedemption[]>;
  createMany(redemptions: PointRedemption[]): Promise<void>;
  updateById(id: UUID, redemption: Partial<PointRedemption>): Promise<void>;
}

export interface IdGenerator {
  next(): UUID;
}
