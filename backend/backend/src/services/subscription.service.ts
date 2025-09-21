import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Between, In } from 'typeorm';
import * as XLSX from 'xlsx';
import * as PDFDocument from 'pdfkit';
import { Subscription, BillingFrequency, PaymentMethod } from '../models/subscription.entity';
import { Invoice } from '../models/invoice.entity';
import { User, UserRole } from '../models/user.entity';

export enum SubscriptionExportFormat {
  EXCEL = 'excel',
  PDF = 'pdf',
  CSV = 'csv',
}

export interface CreateSubscriptionDto {
  name: string;
  price: number;
  billingFrequency: BillingFrequency;
  paymentMethod: PaymentMethod;
  ownerId: string;
  ownerEmail: string;
  renewalDate?: Date;
}

export interface UpdateSubscriptionDto {
  name?: string;
  price?: number;
  billingFrequency?: BillingFrequency;
  paymentMethod?: PaymentMethod;
  renewalDate?: Date;
  isActive?: boolean;
}

export interface SubscriptionFilters {
  ownerId?: string;
  isActive?: boolean;
  paymentMethod?: PaymentMethod;
  billingFrequency?: BillingFrequency;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ExportFilters {
  startDate?: Date;
  endDate?: Date;
  paymentMethod?: PaymentMethod;
  isActive?: boolean;
}

export interface SubscriptionStats {
  totalActive: number;
  totalInactive: number;
  totalMonthlySubscriptions: number;
  totalYearlySubscriptions: number;
  totalMonthlyCost: number;
  totalYearlyCost: number;
  byPaymentMethod: {
    companyCard: number;
    personalReimbursed: number;
  };
  costByPaymentMethod: {
    companyCard: number;
    personalReimbursed: number;
  };
}

export interface CostAnalysis {
  monthlyTotal: number;
  yearlyTotal: number;
  annualProjection: number;
  costBreakdown: {
    byFrequency: {
      monthly: number;
      yearly: number;
    };
    byPaymentMethod: {
      companyCard: number;
      personalReimbursed: number;
    };
  };
  topSubscriptions: {
    name: string;
    price: number;
    billingFrequency: BillingFrequency;
    annualCost: number;
  }[];
}

export interface RenewalReminder {
  subscriptionId: string;
  subscriptionName: string;
  ownerEmail: string;
  renewalDate: Date;
  daysUntilRenewal: number;
  needsInvoiceReminder: boolean;
  lastInvoiceDate: Date | null;
}

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Create a new subscription with owner validation
   */
  async create(subscriptionData: CreateSubscriptionDto, currentUser: User): Promise<Subscription> {
    // Validate owner exists and email matches
    const owner = await this.userRepository.findOne({
      where: { id: subscriptionData.ownerId }
    });

    if (!owner) {
      throw new BadRequestException('Owner not found');
    }

    if (owner.email !== subscriptionData.ownerEmail) {
      throw new BadRequestException('Owner email does not match user email');
    }

    // Role-based access control
    if (currentUser.role === UserRole.EMPLOYEE && currentUser.id !== subscriptionData.ownerId) {
      throw new ForbiddenException('Employees can only create subscriptions for themselves');
    }

    if (currentUser.role === UserRole.TEAM_LEAD) {
      // TeamLead can create for team members - this would require team validation
      // For now, we'll allow it (in real implementation, check if owner is in team)
    }

    // Validate required fields
    this.validateSubscriptionData(subscriptionData);

    const subscription = this.subscriptionRepository.create({
      ...subscriptionData,
      isActive: true,
    });

    return await this.subscriptionRepository.save(subscription);
  }

  /**
   * Get all subscriptions with filtering and pagination
   */
  async findAll(
    filters: SubscriptionFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 },
    currentUser: User
  ): Promise<PaginatedResult<Subscription>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const queryBuilder = this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.owner', 'owner')
      .leftJoinAndSelect('subscription.invoices', 'invoices');

    // Apply role-based filtering
    this.applyRoleBasedFiltering(queryBuilder, currentUser);

    // Apply filters
    if (filters.ownerId) {
      queryBuilder.andWhere('subscription.ownerId = :ownerId', { ownerId: filters.ownerId });
    }

    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('subscription.isActive = :isActive', { isActive: filters.isActive });
    }

    if (filters.paymentMethod) {
      queryBuilder.andWhere('subscription.paymentMethod = :paymentMethod', {
        paymentMethod: filters.paymentMethod
      });
    }

    if (filters.billingFrequency) {
      queryBuilder.andWhere('subscription.billingFrequency = :billingFrequency', {
        billingFrequency: filters.billingFrequency
      });
    }

    if (filters.startDate && filters.endDate) {
      queryBuilder.andWhere('subscription.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const subscriptions = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('subscription.createdAt', 'DESC')
      .getMany();

    return {
      items: subscriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Find subscription by ID with invoice details
   */
  async findById(id: string, currentUser: User): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
      relations: ['owner', 'invoices', 'invoices.uploadedBy', 'invoices.verifiedBy']
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Role-based access control
    this.validateAccessToSubscription(subscription, currentUser);

    return subscription;
  }

  /**
   * Update subscription details
   */
  async update(id: string, updateData: UpdateSubscriptionDto, currentUser: User): Promise<Subscription> {
    const subscription = await this.findById(id, currentUser);

    // Validate update data
    if (updateData.price !== undefined && updateData.price < 0) {
      throw new BadRequestException('Price cannot be negative');
    }

    if (updateData.billingFrequency && !Object.values(BillingFrequency).includes(updateData.billingFrequency)) {
      throw new BadRequestException('Invalid billing frequency');
    }

    if (updateData.paymentMethod && !Object.values(PaymentMethod).includes(updateData.paymentMethod)) {
      throw new BadRequestException('Invalid payment method');
    }

    // Apply updates
    Object.assign(subscription, updateData);

    return await this.subscriptionRepository.save(subscription);
  }

  /**
   * Deactivate subscription while preserving invoice history
   */
  async deactivate(id: string, currentUser: User): Promise<Subscription> {
    const subscription = await this.findById(id, currentUser);

    subscription.isActive = false;

    return await this.subscriptionRepository.save(subscription);
  }

  /**
   * Get invoices for a subscription
   */
  async getInvoices(subscriptionId: string, currentUser: User): Promise<Invoice[]> {
    const subscription = await this.findById(subscriptionId, currentUser);

    return await this.invoiceRepository.find({
      where: { subscriptionId: subscription.id },
      relations: ['uploadedBy', 'verifiedBy'],
      order: { uploadedAt: 'DESC' }
    });
  }

  /**
   * Export subscriptions in various formats
   */
  async exportSubscriptions(
    format: 'csv' | 'excel' | 'pdf',
    filters: ExportFilters = {},
    currentUser: User
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    // Only admins can export
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can export subscription data');
    }

    // Validate date range
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    const queryBuilder = this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.owner', 'owner')
      .leftJoinAndSelect('subscription.invoices', 'invoices');

    // Apply filters
    if (filters.startDate && filters.endDate) {
      queryBuilder.andWhere('subscription.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate
      });
    }

    if (filters.paymentMethod) {
      queryBuilder.andWhere('subscription.paymentMethod = :paymentMethod', {
        paymentMethod: filters.paymentMethod
      });
    }

    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('subscription.isActive = :isActive', { isActive: filters.isActive });
    }

    const subscriptions = await queryBuilder
      .orderBy('subscription.createdAt', 'DESC')
      .getMany();

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

    switch (format) {
      case 'csv':
        return this.generateCSVExport(subscriptions, timestamp);
      case 'excel':
        return this.generateExcelExport(subscriptions, timestamp);
      case 'pdf':
        return await this.generatePDFExport(subscriptions, timestamp);
      default:
        throw new BadRequestException('Invalid export format');
    }
  }

  /**
   * Get comprehensive cost analysis
   */
  async getCostAnalysis(): Promise<CostAnalysis> {
    const subscriptions = await this.subscriptionRepository.find({
      where: { isActive: true },
      relations: ['invoices']
    });

    const monthlyTotal = subscriptions
      .filter(s => s.billingFrequency === BillingFrequency.MONTHLY)
      .reduce((sum, s) => sum + Number(s.price), 0);

    const yearlyTotal = subscriptions
      .filter(s => s.billingFrequency === BillingFrequency.YEARLY)
      .reduce((sum, s) => sum + Number(s.price), 0);

    const annualProjection = (monthlyTotal * 12) + yearlyTotal;

    const companyCardCost = subscriptions
      .filter(s => s.paymentMethod === PaymentMethod.COMPANY_CARD)
      .reduce((sum, s) => {
        const annualCost = s.billingFrequency === BillingFrequency.MONTHLY
          ? Number(s.price) * 12
          : Number(s.price);
        return sum + annualCost;
      }, 0);

    const personalReimbursedCost = annualProjection - companyCardCost;

    const topSubscriptions = subscriptions
      .map(s => ({
        name: s.name,
        price: Number(s.price),
        billingFrequency: s.billingFrequency,
        annualCost: s.billingFrequency === BillingFrequency.MONTHLY
          ? Number(s.price) * 12
          : Number(s.price)
      }))
      .sort((a, b) => b.annualCost - a.annualCost)
      .slice(0, 10);

    return {
      monthlyTotal,
      yearlyTotal,
      annualProjection,
      costBreakdown: {
        byFrequency: {
          monthly: monthlyTotal,
          yearly: yearlyTotal
        },
        byPaymentMethod: {
          companyCard: companyCardCost,
          personalReimbursed: personalReimbursedCost
        }
      },
      topSubscriptions
    };
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats(): Promise<SubscriptionStats> {
    const allSubscriptions = await this.subscriptionRepository.find();

    const active = allSubscriptions.filter(s => s.isActive);
    const inactive = allSubscriptions.filter(s => !s.isActive);
    const monthly = allSubscriptions.filter(s => s.billingFrequency === BillingFrequency.MONTHLY);
    const yearly = allSubscriptions.filter(s => s.billingFrequency === BillingFrequency.YEARLY);
    const companyCard = allSubscriptions.filter(s => s.paymentMethod === PaymentMethod.COMPANY_CARD);
    const personalReimbursed = allSubscriptions.filter(s => s.paymentMethod === PaymentMethod.PERSONAL_REIMBURSED);

    const totalMonthlyCost = monthly.reduce((sum, s) => sum + Number(s.price), 0);
    const totalYearlyCost = yearly.reduce((sum, s) => sum + Number(s.price), 0);
    const companyCardCost = companyCard.reduce((sum, s) => {
      const annualCost = s.billingFrequency === BillingFrequency.MONTHLY
        ? Number(s.price) * 12
        : Number(s.price);
      return sum + annualCost;
    }, 0);
    const personalReimbursedCost = personalReimbursed.reduce((sum, s) => {
      const annualCost = s.billingFrequency === BillingFrequency.MONTHLY
        ? Number(s.price) * 12
        : Number(s.price);
      return sum + annualCost;
    }, 0);

    return {
      totalActive: active.length,
      totalInactive: inactive.length,
      totalMonthlySubscriptions: monthly.length,
      totalYearlySubscriptions: yearly.length,
      totalMonthlyCost,
      totalYearlyCost,
      byPaymentMethod: {
        companyCard: companyCard.length,
        personalReimbursed: personalReimbursed.length
      },
      costByPaymentMethod: {
        companyCard: companyCardCost,
        personalReimbursed: personalReimbursedCost
      }
    };
  }

  /**
   * Get renewal reminders
   */
  async getRenewalReminders(): Promise<RenewalReminder[]> {
    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(now.getDate() + 30);

    const subscriptions = await this.subscriptionRepository.find({
      where: {
        isActive: true,
        renewalDate: Between(now, in30Days)
      },
      relations: ['invoices']
    });

    return subscriptions.map(subscription => {
      const daysUntilRenewal = subscription.renewalDate
        ? Math.ceil((new Date(subscription.renewalDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        subscriptionId: subscription.id,
        subscriptionName: subscription.name,
        ownerEmail: subscription.ownerEmail,
        renewalDate: subscription.renewalDate,
        daysUntilRenewal,
        needsInvoiceReminder: subscription.needsInvoiceReminder,
        lastInvoiceDate: subscription.lastInvoiceDate
      };
    });
  }

  /**
   * Get analytics for a specific subscription
   */
  async getAnalytics(subscriptionId: string, currentUser: User): Promise<any> {
    const subscription = await this.findById(subscriptionId, currentUser);

    const invoices = await this.invoiceRepository.find({
      where: { subscriptionId },
      order: { uploadedAt: 'DESC' }
    });

    const totalSpend = invoices
      .filter(invoice => invoice.amount && invoice.isVerified)
      .reduce((sum, invoice) => sum + Number(invoice.amount), 0);

    const monthlyAverage = invoices.length > 0 ? totalSpend / invoices.length : 0;

    const lastInvoice = invoices.length > 0 ? invoices[0] : null;

    const daysUntilRenewal = subscription.renewalDate
      ? Math.ceil((new Date(subscription.renewalDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      totalSpend,
      monthlyAverage,
      invoiceCount: invoices.length,
      lastInvoiceDate: lastInvoice?.uploadedAt,
      renewalInfo: {
        nextRenewal: subscription.renewalDate,
        daysUntilRenewal,
        renewalReminded: subscription.needsInvoiceReminder
      },
      complianceStatus: {
        hasInvoices: invoices.length > 0,
        invoiceCoverage: 100, // Simplified calculation
        missingInvoices: 0
      }
    };
  }

  /**
   * Send renewal reminders
   */
  async sendRenewalReminders(
    daysBeforeRenewal: number = 30,
    includeInactive: boolean = false,
    currentUser: User
  ): Promise<{ remindersSent: number; subscriptionsProcessed: number; errors: string[] }> {
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can send renewal reminders');
    }

    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() + daysBeforeRenewal);

    const whereCondition: any = {
      renewalDate: Between(now, cutoffDate)
    };

    if (!includeInactive) {
      whereCondition.isActive = true;
    }

    const subscriptions = await this.subscriptionRepository.find({
      where: whereCondition,
      relations: ['owner']
    });

    let remindersSent = 0;
    const errors: string[] = [];

    // In a real implementation, you would send emails here
    // For now, we'll just return success for all
    for (const subscription of subscriptions) {
      try {
        // Simulate sending email reminder
        remindersSent++;
      } catch (error) {
        errors.push(`Failed to send reminder for ${subscription.name}: ${error.message}`);
      }
    }

    return {
      remindersSent,
      subscriptionsProcessed: subscriptions.length,
      errors
    };
  }

  /**
   * Private helper methods
   */
  private validateSubscriptionData(data: CreateSubscriptionDto): void {
    if (!data.name || data.name.trim().length === 0) {
      throw new BadRequestException('Subscription name is required');
    }

    if (data.price < 0) {
      throw new BadRequestException('Price cannot be negative');
    }

    if (!Object.values(BillingFrequency).includes(data.billingFrequency)) {
      throw new BadRequestException('Invalid billing frequency');
    }

    if (!Object.values(PaymentMethod).includes(data.paymentMethod)) {
      throw new BadRequestException('Invalid payment method');
    }

    if (!this.isValidEmail(data.ownerEmail)) {
      throw new BadRequestException('Invalid email format');
    }

    if (!this.isValidUUID(data.ownerId)) {
      throw new BadRequestException('Invalid owner ID format');
    }
  }

  private applyRoleBasedFiltering(queryBuilder: any, currentUser: User): void {
    if (currentUser.role === UserRole.EMPLOYEE) {
      queryBuilder.andWhere('subscription.ownerId = :userId', { userId: currentUser.id });
    } else if (currentUser.role === UserRole.TEAM_LEAD) {
      // TeamLead can see team member subscriptions
      // For now, we'll allow all (in real implementation, filter by team)
    }
    // Admins can see all subscriptions
  }

  private validateAccessToSubscription(subscription: Subscription, currentUser: User): void {
    if (currentUser.role === UserRole.EMPLOYEE && subscription.ownerId !== currentUser.id) {
      throw new ForbiddenException('Access denied to this subscription');
    }

    if (currentUser.role === UserRole.TEAM_LEAD) {
      // TeamLead validation would check if subscription owner is in their team
      // For now, we'll allow access (implement team checking in real scenario)
    }
    // Admins have access to all subscriptions
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  private generateCSVExport(subscriptions: Subscription[], timestamp: string): { buffer: Buffer; filename: string; contentType: string } {
    const headers = [
      'ID', 'Name', 'Price', 'Billing Frequency', 'Payment Method',
      'Owner Email', 'Renewal Date', 'Is Active', 'Created At',
      'Total Paid', 'Last Invoice Date', 'Invoice Count'
    ];

    const rows = subscriptions.map(sub => [
      sub.id,
      sub.name,
      sub.price,
      sub.billingFrequency,
      sub.paymentMethod,
      sub.ownerEmail,
      sub.renewalDate ? sub.renewalDate.toISOString().split('T')[0] : '',
      sub.isActive,
      sub.createdAt.toISOString().split('T')[0],
      sub.totalPaid,
      sub.lastInvoiceDate ? sub.lastInvoiceDate.toISOString().split('T')[0] : '',
      sub.invoices ? sub.invoices.length : 0
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return {
      buffer: Buffer.from(csvContent, 'utf-8'),
      filename: `subscriptions_export_${timestamp}.csv`,
      contentType: 'application/octet-stream'
    };
  }

  private generateExcelExport(subscriptions: Subscription[], timestamp: string): { buffer: Buffer; filename: string; contentType: string } {
    const headers = [
      'ID', 'Name', 'Price', 'Billing Frequency', 'Payment Method',
      'Owner Email', 'Renewal Date', 'Is Active', 'Created At',
      'Total Paid', 'Last Invoice Date', 'Invoice Count'
    ];

    const data = subscriptions.map(sub => ({
      'ID': sub.id,
      'Name': sub.name,
      'Price': sub.price,
      'Billing Frequency': sub.billingFrequency,
      'Payment Method': sub.paymentMethod,
      'Owner Email': sub.ownerEmail,
      'Renewal Date': sub.renewalDate ? sub.renewalDate.toISOString().split('T')[0] : '',
      'Is Active': sub.isActive,
      'Created At': sub.createdAt.toISOString().split('T')[0],
      'Total Paid': sub.totalPaid,
      'Last Invoice Date': sub.lastInvoiceDate ? sub.lastInvoiceDate.toISOString().split('T')[0] : '',
      'Invoice Count': sub.invoices ? sub.invoices.length : 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Subscriptions');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return {
      buffer: Buffer.from(buffer),
      filename: `subscriptions_export_${timestamp}.xlsx`,
      contentType: 'application/octet-stream'
    };
  }

  private async generatePDFExport(subscriptions: Subscription[], timestamp: string): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('error', reject);

      // PDF Header
      doc.fontSize(20).text('Subscriptions Export Report', 50, 50);
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, 50, 80);
      doc.fontSize(12).text(`Total Subscriptions: ${subscriptions.length}`, 50, 100);

      let yPosition = 140;

      subscriptions.forEach((sub, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        doc.fontSize(14).text(`${index + 1}. ${sub.name}`, 50, yPosition);
        yPosition += 20;

        doc.fontSize(10)
          .text(`Price: $${sub.price} (${sub.billingFrequency})`, 70, yPosition)
          .text(`Payment: ${sub.paymentMethod}`, 70, yPosition + 15)
          .text(`Owner: ${sub.ownerEmail}`, 70, yPosition + 30)
          .text(`Status: ${sub.isActive ? 'Active' : 'Inactive'}`, 70, yPosition + 45)
          .text(`Total Paid: $${sub.totalPaid}`, 70, yPosition + 60);

        yPosition += 90;
      });

      doc.end();

      doc.on('end', () => {
        const buffer = Buffer.concat(buffers);
        resolve({
          buffer,
          filename: `subscriptions_export_${timestamp}.pdf`,
          contentType: 'application/octet-stream'
        });
      });
    });
  }
}