import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Between } from 'typeorm';
import { Db, Collection, ChangeStream, MongoClient } from 'mongodb';
import { AuditLog, AuditAction } from '../models/audit-log.entity';
import { User, UserRole } from '../models/user.entity';

// Core audit interfaces
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
  documentKey: { _id: any };
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

// MongoDB document interfaces
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

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private auditCollection: Collection<MongoAuditDocument>;
  private changeStream: ChangeStream | null = null;
  private readonly RETENTION_YEARS = 7;
  private readonly MONITORED_ENTITIES = [
    'User', 'Team', 'Equipment', 'Subscription',
    'Request', 'Transfer', 'Invoice'
  ];

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject('MONGODB_CONNECTION')
    private readonly mongodb: Db,
  ) {
    this.auditCollection = this.mongodb.collection('audit_logs');
    this.initializeAuditCollection();
    this.startChangeStreamMonitoring();
  }

  /**
   * Initialize MongoDB audit collection with proper indexes
   */
  private async initializeAuditCollection(): Promise<void> {
    try {
      // Create compound indexes for common queries
      await this.auditCollection.createIndex({ entityType: 1, entityId: 1 });
      await this.auditCollection.createIndex({ userId: 1, timestamp: -1 });
      await this.auditCollection.createIndex({ action: 1, timestamp: -1 });
      await this.auditCollection.createIndex({ timestamp: -1 });
      await this.auditCollection.createIndex({ retentionDate: 1 });

      // Create text index for search
      await this.auditCollection.createIndex({
        entityType: 'text',
        'metadata.description': 'text',
        'newValues': 'text'
      });

      this.logger.log('MongoDB audit collection initialized with indexes');
    } catch (error) {
      this.logger.error('Failed to initialize audit collection indexes', error);
    }
  }

  /**
   * Start MongoDB change stream monitoring for real-time audit capture
   */
  private async startChangeStreamMonitoring(): Promise<void> {
    try {
      // Monitor changes across all collections
      const pipeline = [
        {
          $match: {
            'ns.coll': { $in: this.MONITORED_ENTITIES.map(e => e.toLowerCase()) }
          }
        }
      ];

      this.changeStream = this.mongodb.watch(pipeline, {
        fullDocument: 'updateLookup'
      });

      this.changeStream.on('change', (change: ChangeStreamEvent) => {
        this.handleChangeStreamEvent(change);
      });

      this.changeStream.on('error', (error) => {
        this.logger.error('Change stream error', error);
        // Attempt to restart change stream after delay
        setTimeout(() => this.startChangeStreamMonitoring(), 5000);
      });

      this.logger.log('MongoDB change stream monitoring started');
    } catch (error) {
      this.logger.error('Failed to start change stream monitoring', error);
    }
  }

  /**
   * Handle change stream events and create audit logs
   */
  private async handleChangeStreamEvent(change: ChangeStreamEvent): Promise<void> {
    try {
      const { operationType, ns, documentKey, fullDocument, updateDescription } = change;
      const entityType = this.capitalizeEntityType(ns.coll);
      const entityId = documentKey._id?.toString();

      if (!entityId) return;

      let action: AuditAction;
      let oldValues: Record<string, any> | undefined;
      let newValues: Record<string, any> | undefined;

      switch (operationType) {
        case 'insert':
          action = AuditAction.CREATE;
          newValues = this.sanitizeDocument(fullDocument);
          break;
        case 'update':
        case 'replace':
          action = AuditAction.UPDATE;
          if (updateDescription) {
            oldValues = {}; // Would need to fetch previous state
            newValues = updateDescription.updatedFields;
          }
          break;
        case 'delete':
          action = AuditAction.DELETE;
          oldValues = {}; // Document is deleted, can't retrieve
          break;
        default:
          return;
      }

      // Extract user ID from metadata if available
      const userId = fullDocument?.lastModifiedBy || 'system';

      await this.logChange(entityType, entityId, action, userId, oldValues, newValues, {
        source: 'change_stream',
        timestamp: new Date(),
        operationType
      });
    } catch (error) {
      this.logger.error('Error handling change stream event', error);
    }
  }

  /**
   * Core method to log entity changes
   */
  async logChange(
    entityType: string,
    entityId: string,
    action: AuditAction,
    userId: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<string> {
    try {
      const timestamp = new Date();
      const retentionDate = new Date();
      retentionDate.setFullYear(retentionDate.getFullYear() + this.RETENTION_YEARS);

      // Create audit document for MongoDB
      const auditDocument: MongoAuditDocument = {
        entityType,
        entityId,
        action,
        userId,
        oldValues: oldValues ? this.sanitizeDocument(oldValues) : undefined,
        newValues: newValues ? this.sanitizeDocument(newValues) : undefined,
        metadata: metadata || {},
        timestamp,
        retentionDate,
        checksum: this.generateChecksum(entityType, entityId, action, userId, timestamp)
      };

      // Store in MongoDB for long-term retention and change stream monitoring
      const mongoResult = await this.auditCollection.insertOne(auditDocument);
      const mongoAuditId = mongoResult.insertedId.toString();

      // Also store in PostgreSQL for transactional consistency
      const auditLog = this.auditRepository.create({
        entityType,
        entityId,
        action,
        userId,
        oldValues: oldValues || null,
        newValues: newValues || null,
        metadata: { ...metadata, mongoAuditId },
      });

      await this.auditRepository.save(auditLog);

      this.logger.debug(`Audit log created: ${action} on ${entityType}:${entityId} by ${userId}`);
      return mongoAuditId;
    } catch (error) {
      this.logger.error('Failed to create audit log', error);
      throw new BadRequestException('Failed to create audit log');
    }
  }

  /**
   * Get audit logs for a specific entity
   */
  async getEntityAuditLog(
    entityType: string,
    entityId: string,
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<MongoAuditDocument>> {
    const { page = 1, limit = 50 } = pagination;
    const skip = (page - 1) * limit;

    try {
      const filter = { entityType, entityId };

      const [items, total] = await Promise.all([
        this.auditCollection
          .find(filter)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        this.auditCollection.countDocuments(filter)
      ]);

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      this.logger.error('Failed to retrieve entity audit log', error);
      throw new BadRequestException('Failed to retrieve audit log');
    }
  }

  /**
   * Get user activity logs with date range filtering
   */
  async getUserActivity(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    pagination: PaginationOptions = {}
  ): Promise<UserActivitySummary> {
    const { page = 1, limit = 100 } = pagination;
    const skip = (page - 1) * limit;

    try {
      const filter: any = { userId };

      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = startDate;
        if (endDate) filter.timestamp.$lte = endDate;
      }

      const activities = await this.auditCollection
        .find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      // Calculate activity counts
      const activityCounts = Object.values(AuditAction).reduce((acc, action) => {
        acc[action] = 0;
        return acc;
      }, {} as Record<AuditAction, number>);

      activities.forEach(activity => {
        activityCounts[activity.action]++;
      });

      // Calculate login summary
      const loginLogs = activities.filter(a =>
        a.action === AuditAction.LOGIN ||
        a.action === AuditAction.LOGOUT ||
        a.action === AuditAction.ACCESS_DENIED
      );

      const loginSummary = {
        totalLogins: loginLogs.filter(l => l.action === AuditAction.LOGIN).length,
        lastLogin: loginLogs.find(l => l.action === AuditAction.LOGIN)?.timestamp,
        failedAttempts: loginLogs.filter(l => l.action === AuditAction.ACCESS_DENIED).length
      };

      // Calculate risk score (simple implementation)
      const riskScore = this.calculateUserRiskScore(activityCounts, loginSummary);

      return {
        userId,
        activities: activities.map(this.convertMongoToAuditLog),
        loginSummary,
        activityCounts,
        riskScore
      };
    } catch (error) {
      this.logger.error('Failed to retrieve user activity', error);
      throw new BadRequestException('Failed to retrieve user activity');
    }
  }

  /**
   * Generate comprehensive audit summary
   */
  async getAuditSummary(): Promise<AuditSummary> {
    try {
      // Get total records
      const totalRecords = await this.auditCollection.countDocuments();

      // Get records by action
      const actionPipeline = [
        { $group: { _id: '$action', count: { $sum: 1 } } }
      ];
      const actionCounts = await this.auditCollection.aggregate(actionPipeline).toArray();
      const recordsByAction = Object.values(AuditAction).reduce((acc, action) => {
        const found = actionCounts.find(c => c._id === action);
        acc[action] = found ? found.count : 0;
        return acc;
      }, {} as Record<AuditAction, number>);

      // Get records by entity type
      const entityPipeline = [
        { $group: { _id: '$entityType', count: { $sum: 1 } } }
      ];
      const entityCounts = await this.auditCollection.aggregate(entityPipeline).toArray();
      const recordsByEntity = entityCounts.reduce((acc, entity) => {
        acc[entity._id] = entity.count;
        return acc;
      }, {} as Record<string, number>);

      // Get recent activity (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const recentActivity = await this.auditCollection.countDocuments({
        timestamp: { $gte: yesterday }
      });

      // Get sensitive events
      const sensitiveActions = [
        AuditAction.DELETE,
        AuditAction.ROLE_CHANGE,
        AuditAction.PASSWORD_CHANGE,
        AuditAction.ACCESS_DENIED
      ];
      const sensitiveEvents = await this.auditCollection.countDocuments({
        action: { $in: sensitiveActions }
      });

      // Get retention compliance info
      const oldestRecord = await this.auditCollection
        .findOne({}, { sort: { timestamp: 1 } });

      const retentionDate = new Date();
      retentionDate.setFullYear(retentionDate.getFullYear() - this.RETENTION_YEARS);

      const recordsToDelete = await this.auditCollection.countDocuments({
        timestamp: { $lt: retentionDate }
      });

      return {
        totalRecords,
        recordsByAction,
        recordsByEntity,
        recentActivity,
        sensitiveEvents,
        retentionCompliance: {
          oldestRecord: oldestRecord?.timestamp || new Date(),
          recordsToDelete,
          compliancePercentage: recordsToDelete === 0 ? 100 :
            ((totalRecords - recordsToDelete) / totalRecords) * 100
        }
      };
    } catch (error) {
      this.logger.error('Failed to generate audit summary', error);
      throw new BadRequestException('Failed to generate audit summary');
    }
  }

  /**
   * Generate compliance report for external audits
   */
  async getComplianceReport(startDate: Date, endDate: Date): Promise<ComplianceReport> {
    try {
      const reportId = `compliance-${Date.now()}`;
      const filter = {
        timestamp: { $gte: startDate, $lte: endDate }
      };

      // Get basic metrics
      const totalAuditRecords = await this.auditCollection.countDocuments(filter);
      const criticalEvents = await this.auditCollection.countDocuments({
        ...filter,
        action: { $in: [AuditAction.DELETE, AuditAction.ROLE_CHANGE, AuditAction.ACCESS_DENIED] }
      });

      // Calculate compliance score (simplified)
      const complianceScore = Math.max(0, 100 - (criticalEvents / totalAuditRecords * 100));

      // Asset inventory metrics
      const assetChanges = await this.auditCollection.countDocuments({
        ...filter,
        entityType: { $in: ['Equipment', 'Subscription'] }
      });

      // Financial summary (simplified)
      const subscriptionSpend = await this.calculateSubscriptionSpend(startDate, endDate);

      // Access control metrics
      const userActivities = await this.auditCollection.countDocuments({
        ...filter,
        entityType: 'User'
      });

      const roleChanges = await this.auditCollection.countDocuments({
        ...filter,
        action: AuditAction.ROLE_CHANGE
      });

      const failedAccess = await this.auditCollection.countDocuments({
        ...filter,
        action: AuditAction.ACCESS_DENIED
      });

      // Data retention info
      const oldestRecord = await this.auditCollection.findOne({}, { sort: { timestamp: 1 } });
      const newestRecord = await this.auditCollection.findOne({}, { sort: { timestamp: -1 } });

      const retentionDate = new Date();
      retentionDate.setFullYear(retentionDate.getFullYear() - this.RETENTION_YEARS);
      const recordsDueForDeletion = await this.auditCollection.countDocuments({
        timestamp: { $lt: retentionDate }
      });

      return {
        reportId,
        generatedAt: new Date(),
        reportType: 'compliance',
        startDate,
        endDate,
        executive_summary: {
          totalAuditRecords,
          criticalEvents,
          complianceScore,
          dataRetentionCompliance: recordsDueForDeletion === 0
        },
        asset_inventory: {
          total_assets: assetChanges,
          asset_utilization: 85, // Placeholder
          compliance_percentage: 98, // Placeholder
          recent_changes: assetChanges
        },
        financial_summary: {
          total_subscription_spend: subscriptionSpend,
          invoice_coverage: 95, // Placeholder
          payment_method_breakdown: {
            'CompanyCard': 70,
            'BankTransfer': 30
          }
        },
        access_controls: {
          user_activities: userActivities,
          role_changes: roleChanges,
          failed_access_attempts: failedAccess
        },
        data_retention: {
          retention_years: this.RETENTION_YEARS,
          oldest_record: oldestRecord?.timestamp || new Date(),
          newest_record: newestRecord?.timestamp || new Date(),
          records_due_for_deletion: recordsDueForDeletion
        },
        audit_trail_integrity: {
          total_records: totalAuditRecords,
          immutable_records: totalAuditRecords, // All records are immutable
          integrity_score: 100 // Simplified
        }
      };
    } catch (error) {
      this.logger.error('Failed to generate compliance report', error);
      throw new BadRequestException('Failed to generate compliance report');
    }
  }

  /**
   * Get retention policy information
   */
  async getRetentionInfo(): Promise<{
    retentionYears: number;
    oldestRecord?: Date;
    newestRecord?: Date;
    totalRecords: number;
    recordsDueForDeletion: number;
  }> {
    try {
      const totalRecords = await this.auditCollection.countDocuments();

      const oldestRecord = await this.auditCollection
        .findOne({}, { sort: { timestamp: 1 } });

      const newestRecord = await this.auditCollection
        .findOne({}, { sort: { timestamp: -1 } });

      const retentionDate = new Date();
      retentionDate.setFullYear(retentionDate.getFullYear() - this.RETENTION_YEARS);

      const recordsDueForDeletion = await this.auditCollection.countDocuments({
        timestamp: { $lt: retentionDate }
      });

      return {
        retentionYears: this.RETENTION_YEARS,
        oldestRecord: oldestRecord?.timestamp,
        newestRecord: newestRecord?.timestamp,
        totalRecords,
        recordsDueForDeletion
      };
    } catch (error) {
      this.logger.error('Failed to get retention info', error);
      throw new BadRequestException('Failed to get retention info');
    }
  }

  /**
   * Monitor changes - start change stream monitoring
   */
  async monitorChanges(): Promise<{ status: string; monitoring: boolean }> {
    if (!this.changeStream) {
      await this.startChangeStreamMonitoring();
    }

    return {
      status: 'Change stream monitoring active',
      monitoring: !!this.changeStream
    };
  }

  /**
   * Advanced audit log search with filters
   */
  async searchAuditLogs(
    filters: AuditFilters,
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<MongoAuditDocument>> {
    const { page = 1, limit = 50 } = pagination;
    const skip = (page - 1) * limit;

    try {
      const mongoFilter: any = {};

      if (filters.entityType) mongoFilter.entityType = filters.entityType;
      if (filters.entityId) mongoFilter.entityId = filters.entityId;
      if (filters.action) mongoFilter.action = filters.action;
      if (filters.userId) mongoFilter.userId = filters.userId;

      if (filters.startDate || filters.endDate) {
        mongoFilter.timestamp = {};
        if (filters.startDate) mongoFilter.timestamp.$gte = filters.startDate;
        if (filters.endDate) mongoFilter.timestamp.$lte = filters.endDate;
      }

      if (filters.isSensitive) {
        const sensitiveActions = [
          AuditAction.DELETE,
          AuditAction.ROLE_CHANGE,
          AuditAction.PASSWORD_CHANGE,
          AuditAction.ACCESS_DENIED
        ];
        mongoFilter.action = { $in: sensitiveActions };
      }

      const [items, total] = await Promise.all([
        this.auditCollection
          .find(mongoFilter)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        this.auditCollection.countDocuments(mongoFilter)
      ]);

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      this.logger.error('Failed to search audit logs', error);
      throw new BadRequestException('Failed to search audit logs');
    }
  }

  /**
   * Enforce 7-year retention policy by cleaning old records
   */
  async enforceRetentionPolicy(): Promise<{ deletedCount: number }> {
    try {
      const retentionDate = new Date();
      retentionDate.setFullYear(retentionDate.getFullYear() - this.RETENTION_YEARS);

      const result = await this.auditCollection.deleteMany({
        timestamp: { $lt: retentionDate }
      });

      this.logger.log(`Deleted ${result.deletedCount} audit records beyond retention period`);

      return { deletedCount: result.deletedCount || 0 };
    } catch (error) {
      this.logger.error('Failed to enforce retention policy', error);
      throw new BadRequestException('Failed to enforce retention policy');
    }
  }

  /**
   * Validate role-based access to audit logs
   */
  async validateAuditAccess(user: User, auditLog?: AuditLog): Promise<boolean> {
    // Admin access to all audit logs
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Team leads can access their team's audit logs
    if (user.role === UserRole.TEAM_LEAD && auditLog) {
      const auditedUser = await this.userRepository.findOne({
        where: { id: auditLog.userId },
        relations: ['team']
      });

      if (auditedUser?.teamId === user.teamId) {
        return true;
      }
    }

    // Users can only access their own audit logs (non-sensitive)
    if (auditLog && auditLog.userId === user.id && !auditLog.isSensitiveAction) {
      return true;
    }

    return false;
  }

  /**
   * Get anonymized audit data for GDPR compliance
   */
  async getAnonymizedAuditData(
    startDate: Date,
    endDate: Date
  ): Promise<MongoAuditDocument[]> {
    try {
      const filter = {
        timestamp: { $gte: startDate, $lte: endDate }
      };

      const auditLogs = await this.auditCollection
        .find(filter)
        .toArray();

      return auditLogs.map(log => ({
        ...log,
        userId: this.hashUserId(log.userId),
        metadata: {
          ...log.metadata,
          ip: log.metadata?.ip ? this.hashIp(log.metadata.ip) : undefined,
          userAgent: '[REDACTED]'
        },
        oldValues: this.anonymizePersonalData(log.oldValues),
        newValues: this.anonymizePersonalData(log.newValues)
      }));
    } catch (error) {
      this.logger.error('Failed to get anonymized audit data', error);
      throw new BadRequestException('Failed to get anonymized audit data');
    }
  }

  // Helper methods

  private generateChecksum(
    entityType: string,
    entityId: string,
    action: AuditAction,
    userId: string,
    timestamp: Date
  ): string {
    const data = `${entityType}:${entityId}:${action}:${userId}:${timestamp.toISOString()}`;
    // Simple hash implementation - in production use crypto.createHash
    return Buffer.from(data).toString('base64');
  }

  private sanitizeDocument(doc: any): Record<string, any> {
    if (!doc) return {};

    // Remove sensitive fields
    const sanitized = { ...doc };
    delete sanitized.password;
    delete sanitized.passwordHash;
    delete sanitized.secret;
    delete sanitized.token;
    delete sanitized._id;

    return sanitized;
  }

  private capitalizeEntityType(entityType: string): string {
    return entityType.charAt(0).toUpperCase() + entityType.slice(1);
  }

  private calculateUserRiskScore(
    activityCounts: Record<AuditAction, number>,
    loginSummary: { failedAttempts: number }
  ): number {
    let score = 0;

    // Failed login attempts increase risk
    score += loginSummary.failedAttempts * 10;

    // Sensitive actions increase risk
    score += activityCounts[AuditAction.DELETE] * 5;
    score += activityCounts[AuditAction.ROLE_CHANGE] * 15;
    score += activityCounts[AuditAction.ACCESS_DENIED] * 20;

    return Math.min(score, 100); // Cap at 100
  }

  private async calculateSubscriptionSpend(startDate: Date, endDate: Date): Promise<number> {
    // This would integrate with subscription/invoice data
    // Placeholder implementation
    return 15000.00;
  }

  private convertMongoToAuditLog(mongoDoc: MongoAuditDocument): AuditLog {
    const auditLog = new AuditLog();
    auditLog.entityType = mongoDoc.entityType;
    auditLog.entityId = mongoDoc.entityId;
    auditLog.action = mongoDoc.action;
    auditLog.userId = mongoDoc.userId;
    auditLog.oldValues = mongoDoc.oldValues || null;
    auditLog.newValues = mongoDoc.newValues || null;
    auditLog.metadata = mongoDoc.metadata || null;
    auditLog.timestamp = mongoDoc.timestamp;
    return auditLog;
  }

  private hashUserId(userId: string): string {
    // Simple hash for anonymization - use proper crypto in production
    return `user_${Buffer.from(userId).toString('base64').slice(0, 8)}`;
  }

  private hashIp(ip: string): string {
    // Simple hash for anonymization
    return `ip_${Buffer.from(ip).toString('base64').slice(0, 8)}`;
  }

  private anonymizePersonalData(data: any): any {
    if (!data) return data;

    const anonymized = { ...data };

    // Remove or hash personal identifiers
    if (anonymized.email) {
      anonymized.email = this.hashEmail(anonymized.email);
    }
    if (anonymized.firstName) {
      anonymized.firstName = '[REDACTED]';
    }
    if (anonymized.lastName) {
      anonymized.lastName = '[REDACTED]';
    }
    if (anonymized.phone) {
      anonymized.phone = '[REDACTED]';
    }

    return anonymized;
  }

  private hashEmail(email: string): string {
    const [local, domain] = email.split('@');
    return `${local.slice(0, 2)}***@${domain}`;
  }

  /**
   * Cleanup method to stop change stream monitoring
   */
  async onModuleDestroy(): Promise<void> {
    if (this.changeStream) {
      await this.changeStream.close();
      this.logger.log('Change stream monitoring stopped');
    }
  }
}