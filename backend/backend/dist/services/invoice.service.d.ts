import { Repository } from 'typeorm';
import { Invoice } from '../models/invoice.entity';
import { Subscription } from '../models/subscription.entity';
import { User } from '../models/user.entity';
import { S3Service } from './s3.service';
export interface CreateInvoiceDto {
    subscriptionId: string;
    amount?: number;
    invoiceDate?: Date;
    description?: string;
}
export interface UpdateInvoiceDto {
    amount?: number;
    invoiceDate?: Date;
    description?: string;
}
export interface VerifyInvoiceDto {
    amount?: number;
    invoiceDate?: Date;
    description?: string;
    notes?: string;
}
export interface InvoiceUploadMetadata {
    fileName: string;
    fileSize: number;
    contentType: string;
    amount?: number;
    invoiceDate?: Date;
    description?: string;
}
export interface InvoiceStats {
    totalInvoices: number;
    verifiedInvoices: number;
    unverifiedInvoices: number;
    totalAmount: number;
    averageAmount: number;
    invoicesThisMonth: number;
    pendingVerification: number;
    overdueVerification: number;
}
export declare class InvoiceService {
    private invoiceRepository;
    private subscriptionRepository;
    private userRepository;
    private s3Service;
    private readonly MAX_FILE_SIZE;
    private readonly ALLOWED_MIME_TYPES;
    private readonly VERIFICATION_DEADLINE_DAYS;
    constructor(invoiceRepository: Repository<Invoice>, subscriptionRepository: Repository<Subscription>, userRepository: Repository<User>, s3Service: S3Service);
    uploadInvoice(subscriptionId: string, file: Express.Multer.File, metadata: InvoiceUploadMetadata, uploader: User): Promise<Invoice>;
    findBySubscription(subscriptionId: string, user: User): Promise<Invoice[]>;
    findById(id: string, user: User): Promise<Invoice>;
    verifyInvoice(id: string, verificationData: VerifyInvoiceDto, verifier: User): Promise<Invoice>;
    unverifyInvoice(id: string, user: User): Promise<Invoice>;
    downloadInvoice(id: string, user: User): Promise<string>;
    updateInvoice(id: string, updateData: UpdateInvoiceDto, user: User): Promise<Invoice>;
    deleteInvoice(id: string, user: User): Promise<void>;
    getInvoiceStats(): Promise<InvoiceStats>;
    getInvoicesForVerification(user: User): Promise<Invoice[]>;
    getOverdueInvoices(user: User): Promise<Invoice[]>;
    bulkVerifyInvoices(invoiceIds: string[], verifier: User): Promise<Invoice[]>;
    private extractFileMetadata;
    private generateS3Key;
    private validateFile;
    private validateInvoiceMetadata;
    private validateSubscriptionAccess;
    getMyInvoices(user: User): Promise<Invoice[]>;
    searchInvoices(filters: {
        subscriptionId?: string;
        isVerified?: boolean;
        startDate?: Date;
        endDate?: Date;
        minAmount?: number;
        maxAmount?: number;
    }, user: User): Promise<Invoice[]>;
}
