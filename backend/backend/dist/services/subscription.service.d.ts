import { Repository } from 'typeorm';
import { Subscription, BillingFrequency, PaymentMethod } from '../models/subscription.entity';
import { Invoice } from '../models/invoice.entity';
import { User } from '../models/user.entity';
export declare enum SubscriptionExportFormat {
    EXCEL = "excel",
    PDF = "pdf",
    CSV = "csv"
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
export declare class SubscriptionService {
    private subscriptionRepository;
    private invoiceRepository;
    private userRepository;
    constructor(subscriptionRepository: Repository<Subscription>, invoiceRepository: Repository<Invoice>, userRepository: Repository<User>);
    create(subscriptionData: CreateSubscriptionDto, currentUser: User): Promise<Subscription>;
    findAll(filters: SubscriptionFilters, pagination: PaginationOptions, currentUser: User): Promise<PaginatedResult<Subscription>>;
    findById(id: string, currentUser: User): Promise<Subscription>;
    update(id: string, updateData: UpdateSubscriptionDto, currentUser: User): Promise<Subscription>;
    deactivate(id: string, currentUser: User): Promise<Subscription>;
    getInvoices(subscriptionId: string, currentUser: User): Promise<Invoice[]>;
    exportSubscriptions(format: 'csv' | 'excel' | 'pdf', filters: ExportFilters, currentUser: User): Promise<{
        buffer: Buffer;
        filename: string;
        contentType: string;
    }>;
    getCostAnalysis(): Promise<CostAnalysis>;
    getSubscriptionStats(): Promise<SubscriptionStats>;
    getRenewalReminders(): Promise<RenewalReminder[]>;
    getAnalytics(subscriptionId: string, currentUser: User): Promise<any>;
    sendRenewalReminders(daysBeforeRenewal: number, includeInactive: boolean, currentUser: User): Promise<{
        remindersSent: number;
        subscriptionsProcessed: number;
        errors: string[];
    }>;
    private validateSubscriptionData;
    private applyRoleBasedFiltering;
    private validateAccessToSubscription;
    private isValidEmail;
    private isValidUUID;
    private generateCSVExport;
    private generateExcelExport;
    private generatePDFExport;
}
