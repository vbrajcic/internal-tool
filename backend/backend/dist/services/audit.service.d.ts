import { Repository } from 'typeorm';
import { Db } from 'mongodb';
import { AuditLog, AuditAction } from '../models/audit-log.entity';
import { User } from '../models/user.entity';
export interface AuditLogData {
    entityType: string;
    entityId: string;
    action: AuditAction;
    userId: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    metadata?: Record<string, any>;
}
export interface PaginationOptions {
    page?: number;
    limit?: number;
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
export interface AuditFilters {
    entityType?: string;
    entityId?: string;
    action?: AuditAction;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    isSensitive?: boolean;
}
export interface UserActivitySummary {
    userId: string;
    activities: AuditLog[];
    loginSummary: {
        totalLogins: number;
        lastLogin?: Date;
        failedAttempts: number;
    };
    activityCounts: Record<AuditAction, number>;
    riskScore: number;
}
export interface ComplianceReport {
    reportId: string;
    generatedAt: Date;
    reportType: string;
    startDate: Date;
    endDate: Date;
    executive_summary: {
        totalAuditRecords: number;
        criticalEvents: number;
        complianceScore: number;
        dataRetentionCompliance: boolean;
    };
    asset_inventory: {
        total_assets: number;
        asset_utilization: number;
        compliance_percentage: number;
        recent_changes: number;
    };
    financial_summary: {
        total_subscription_spend: number;
        invoice_coverage: number;
        payment_method_breakdown: Record<string, number>;
    };
    access_controls: {
        user_activities: number;
        role_changes: number;
        failed_access_attempts: number;
    };
    data_retention: {
        retention_years: number;
        oldest_record: Date;
        newest_record: Date;
        records_due_for_deletion: number;
    };
    audit_trail_integrity: {
        total_records: number;
        immutable_records: number;
        integrity_score: number;
    };
}
export interface AuditSummary {
    totalRecords: number;
    recordsByAction: Record<AuditAction, number>;
    recordsByEntity: Record<string, number>;
    recentActivity: number;
    sensitiveEvents: number;
    retentionCompliance: {
        oldestRecord: Date;
        recordsToDelete: number;
        compliancePercentage: number;
    };
}
export interface ChangeStreamEvent {
    _id: any;
    operationType: 'insert' | 'update' | 'delete' | 'replace';
    documentKey: {
        _id: any;
    };
    fullDocument?: any;
    updateDescription?: {
        updatedFields: Record<string, any>;
        removedFields: string[];
    };
    ns: {
        db: string;
        coll: string;
    };
    clusterTime: any;
}
export interface MongoAuditDocument {
    _id?: any;
    entityType: string;
    entityId: string;
    action: AuditAction;
    userId: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    metadata?: Record<string, any>;
    timestamp: Date;
    checksum?: string;
    retentionDate: Date;
}
export declare class AuditService {
    private readonly auditRepository;
    private readonly userRepository;
    private readonly mongodb;
    private readonly logger;
    private auditCollection;
    private changeStream;
    private readonly RETENTION_YEARS;
    private readonly MONITORED_ENTITIES;
    constructor(auditRepository: Repository<AuditLog>, userRepository: Repository<User>, mongodb: Db);
    private initializeAuditCollection;
    private startChangeStreamMonitoring;
    private handleChangeStreamEvent;
    logChange(entityType: string, entityId: string, action: AuditAction, userId: string, oldValues?: Record<string, any>, newValues?: Record<string, any>, metadata?: Record<string, any>): Promise<string>;
    getEntityAuditLog(entityType: string, entityId: string, pagination?: PaginationOptions): Promise<PaginatedResult<MongoAuditDocument>>;
    getUserActivity(userId: string, startDate?: Date, endDate?: Date, pagination?: PaginationOptions): Promise<UserActivitySummary>;
    getAuditSummary(): Promise<AuditSummary>;
    getComplianceReport(startDate: Date, endDate: Date): Promise<ComplianceReport>;
    getRetentionInfo(): Promise<{
        retentionYears: number;
        oldestRecord?: Date;
        newestRecord?: Date;
        totalRecords: number;
        recordsDueForDeletion: number;
    }>;
    monitorChanges(): Promise<{
        status: string;
        monitoring: boolean;
    }>;
    searchAuditLogs(filters: AuditFilters, pagination?: PaginationOptions): Promise<PaginatedResult<MongoAuditDocument>>;
    enforceRetentionPolicy(): Promise<{
        deletedCount: number;
    }>;
    validateAuditAccess(user: User, auditLog?: AuditLog): Promise<boolean>;
    getAnonymizedAuditData(startDate: Date, endDate: Date): Promise<MongoAuditDocument[]>;
    private generateChecksum;
    private sanitizeDocument;
    private capitalizeEntityType;
    private calculateUserRiskScore;
    private calculateSubscriptionSpend;
    private convertMongoToAuditLog;
    private hashUserId;
    private hashIp;
    private anonymizePersonalData;
    private hashEmail;
    onModuleDestroy(): Promise<void>;
}
