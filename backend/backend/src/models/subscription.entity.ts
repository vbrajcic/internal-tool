import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Invoice } from './invoice.entity';

export enum BillingFrequency {
  MONTHLY = 'Monthly',
  YEARLY = 'Yearly',
}

export enum PaymentMethod {
  COMPANY_CARD = 'CompanyCard',
  PERSONAL_REIMBURSED = 'PersonalReimbursed',
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({
    type: 'enum',
    enum: BillingFrequency,
  })
  billingFrequency: BillingFrequency;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  @Column({ type: 'uuid' })
  ownerId: string;

  @Column()
  ownerEmail: string;

  @Column({ type: 'date', nullable: true })
  renewalDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, user => user.subscriptions)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @OneToMany(() => Invoice, invoice => invoice.subscription)
  invoices: Invoice[];

  // Virtual properties
  get totalPaid(): number {
    if (!this.invoices) return 0;
    return this.invoices
      .filter(invoice => invoice.isVerified && invoice.amount)
      .reduce((total, invoice) => total + Number(invoice.amount), 0);
  }

  get lastInvoiceDate(): Date | null {
    if (!this.invoices || this.invoices.length === 0) return null;
    const sortedInvoices = this.invoices
      .filter(invoice => invoice.invoiceDate)
      .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
    return sortedInvoices.length > 0 ? sortedInvoices[0].invoiceDate : null;
  }

  get needsInvoiceReminder(): boolean {
    if (this.paymentMethod === PaymentMethod.COMPANY_CARD) return false;
    if (!this.isActive) return false;

    const now = new Date();
    const lastInvoice = this.lastInvoiceDate;

    if (!lastInvoice) return true;

    const daysSinceLastInvoice = Math.floor(
      (now.getTime() - new Date(lastInvoice).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Send reminder if no invoice submitted in current billing period
    return this.billingFrequency === BillingFrequency.MONTHLY
      ? daysSinceLastInvoice >= 30
      : daysSinceLastInvoice >= 365;
  }
}