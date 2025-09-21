import { Response } from 'express';
import { SubscriptionService, CreateSubscriptionDto, UpdateSubscriptionDto, SubscriptionExportFormat } from '../services/subscription.service';
import { InvoiceService } from '../services/invoice.service';
import { Subscription, BillingFrequency, PaymentMethod } from '../models/subscription.entity';
import { Invoice } from '../models/invoice.entity';
export declare class SubscriptionsController {
    private readonly subscriptionService;
    private readonly invoiceService;
    constructor(subscriptionService: SubscriptionService, invoiceService: InvoiceService);
    getSubscriptions(ownerId: string, isActive: boolean, billingFrequency: BillingFrequency, paymentMethod: PaymentMethod, page: number, limit: number, req: any): Promise<{
        subscriptions: Subscription[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    createSubscription(createSubscriptionDto: CreateSubscriptionDto, req: any): Promise<Subscription>;
    exportSubscriptions(res: Response, req: any, format?: SubscriptionExportFormat, startDate?: string, endDate?: string, includeInvoices?: boolean): Promise<void>;
    getSubscriptionById(id: string, req: any): Promise<Subscription>;
    updateSubscription(id: string, updateSubscriptionDto: UpdateSubscriptionDto, req: any): Promise<Subscription>;
    getSubscriptionInvoices(id: string, page: number, limit: number, req: any): Promise<{
        invoices: Invoice[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    uploadInvoice(subscriptionId: string, file: Express.Multer.File, invoiceData: {
        amount?: string;
        invoiceDate?: string;
        description?: string;
    }, req: any): Promise<Invoice>;
    getSubscriptionAnalytics(id: string, req: any): Promise<any>;
    sendRenewalReminders(reminderConfig: {
        daysBeforeRenewal?: number;
        includeInactive?: boolean;
    }, req: any): Promise<{
        remindersSent: number;
        subscriptionsProcessed: number;
        errors: string[];
    }>;
}
