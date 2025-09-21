import { User } from './user.entity';
import { Invoice } from './invoice.entity';
export declare enum BillingFrequency {
    MONTHLY = "Monthly",
    YEARLY = "Yearly"
}
export declare enum PaymentMethod {
    COMPANY_CARD = "CompanyCard",
    PERSONAL_REIMBURSED = "PersonalReimbursed"
}
export declare class Subscription {
    id: string;
    name: string;
    price: number;
    billingFrequency: BillingFrequency;
    paymentMethod: PaymentMethod;
    ownerId: string;
    ownerEmail: string;
    renewalDate: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    owner: User;
    invoices: Invoice[];
    get totalPaid(): number;
    get lastInvoiceDate(): Date | null;
    get needsInvoiceReminder(): boolean;
}
