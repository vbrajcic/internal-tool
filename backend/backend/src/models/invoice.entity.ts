import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Subscription } from './subscription.entity';
import { User } from './user.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  subscriptionId: string;

  @Column()
  fileName: string;

  @Column()
  filePath: string; // S3 key

  @Column({ type: 'uuid' })
  uploadedById: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  amount: number;

  @Column({ type: 'date', nullable: true })
  invoiceDate: Date;

  @Column('text', { nullable: true })
  description: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'uuid', nullable: true })
  verifiedById: string;

  @CreateDateColumn()
  uploadedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  // Relations
  @ManyToOne(() => Subscription, subscription => subscription.invoices)
  @JoinColumn({ name: 'subscriptionId' })
  subscription: Subscription;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'verifiedById' })
  verifiedBy: User;

  // Virtual properties
  get fileExtension(): string {
    return this.fileName.split('.').pop()?.toLowerCase() || '';
  }

  get isPdf(): boolean {
    return this.fileExtension === 'pdf';
  }

  get isRecentUpload(): boolean {
    const now = new Date();
    const uploadTime = new Date(this.uploadedAt);
    const hoursSinceUpload = (now.getTime() - uploadTime.getTime()) / (1000 * 60 * 60);
    return hoursSinceUpload <= 24; // Consider recent if uploaded within 24 hours
  }

  get needsVerification(): boolean {
    return !this.isVerified && !this.isRecentUpload;
  }

  get monthYear(): string {
    if (!this.invoiceDate) return 'Unknown';
    const date = new Date(this.invoiceDate);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }

  get isCurrentMonth(): boolean {
    if (!this.invoiceDate) return false;
    const now = new Date();
    const invoiceDate = new Date(this.invoiceDate);
    return (
      invoiceDate.getMonth() === now.getMonth() &&
      invoiceDate.getFullYear() === now.getFullYear()
    );
  }

  get isOverdue(): boolean {
    if (this.isVerified) return false;
    const now = new Date();
    const uploadTime = new Date(this.uploadedAt);
    const daysSinceUpload = (now.getTime() - uploadTime.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpload > 7; // Consider overdue if not verified within 7 days
  }

  // Business logic methods
  verify(verifiedById: string, amount?: number, invoiceDate?: Date): void {
    if (this.isVerified) {
      throw new Error('Invoice is already verified');
    }

    this.isVerified = true;
    this.verifiedById = verifiedById;
    this.verifiedAt = new Date();

    if (amount !== undefined) {
      this.amount = amount;
    }

    if (invoiceDate) {
      this.invoiceDate = invoiceDate;
    }
  }

  unverify(): void {
    if (!this.isVerified) {
      throw new Error('Invoice is not verified');
    }

    this.isVerified = false;
    this.verifiedById = null;
    this.verifiedAt = null;
  }

  updateAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error('Invoice amount must be positive');
    }
    this.amount = amount;
  }

  updateInvoiceDate(date: Date): void {
    const now = new Date();
    if (date > now) {
      throw new Error('Invoice date cannot be in the future');
    }

    // Check if date is reasonable (within 2 years)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(now.getFullYear() - 2);
    if (date < twoYearsAgo) {
      throw new Error('Invoice date is too old (older than 2 years)');
    }

    this.invoiceDate = date;
  }

  static validateFileName(fileName: string): boolean {
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension ? allowedExtensions.includes(extension) : false;
  }

  static generateS3Key(subscriptionId: string, fileName: string): string {
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `invoices/${subscriptionId}/${timestamp}_${cleanFileName}`;
  }
}