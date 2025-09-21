"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const mongodb_1 = require("mongodb");
const audit_log_entity_1 = require("../models/audit-log.entity");
const user_entity_1 = require("../models/user.entity");
let AuditService = AuditService_1 = class AuditService {
    constructor(auditRepository, userRepository, mongodb) {
        this.auditRepository = auditRepository;
        this.userRepository = userRepository;
        this.mongodb = mongodb;
        this.logger = new common_1.Logger(AuditService_1.name);
        this.changeStream = null;
        this.RETENTION_YEARS = 7;
        this.MONITORED_ENTITIES = [
            'User', 'Team', 'Equipment', 'Subscription',
            'Request', 'Transfer', 'Invoice'
        ];
        this.auditCollection = this.mongodb.collection('audit_logs');
        this.initializeAuditCollection();
        this.startChangeStreamMonitoring();
    }
    async initializeAuditCollection() {
        try {
            await this.auditCollection.createIndex({ entityType: 1, entityId: 1 });
            await this.auditCollection.createIndex({ userId: 1, timestamp: -1 });
            await this.auditCollection.createIndex({ action: 1, timestamp: -1 });
            await this.auditCollection.createIndex({ timestamp: -1 });
            await this.auditCollection.createIndex({ retentionDate: 1 });
            await this.auditCollection.createIndex({
                entityType: 'text',
                'metadata.description': 'text',
                'newValues': 'text'
            });
            this.logger.log('MongoDB audit collection initialized with indexes');
        }
        catch (error) {
            this.logger.error('Failed to initialize audit collection indexes', error);
        }
    }
    async startChangeStreamMonitoring() {
        try {
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
            this.changeStream.on('change', (change) => {
                this.handleChangeStreamEvent(change);
            });
            this.changeStream.on('error', (error) => {
                this.logger.error('Change stream error', error);
                setTimeout(() => this.startChangeStreamMonitoring(), 5000);
            });
            this.logger.log('MongoDB change stream monitoring started');
        }
        catch (error) {
            this.logger.error('Failed to start change stream monitoring', error);
        }
    }
    async handleChangeStreamEvent(change) {
        try {
            const { operationType, ns, documentKey, fullDocument, updateDescription } = change;
            const entityType = this.capitalizeEntityType(ns.coll);
            const entityId = documentKey._id?.toString();
            if (!entityId)
                return;
            let action;
            let oldValues;
            let newValues;
            switch (operationType) {
                case 'insert':
                    action = audit_log_entity_1.AuditAction.CREATE;
                    newValues = this.sanitizeDocument(fullDocument);
                    break;
                case 'update':
                case 'replace':
                    action = audit_log_entity_1.AuditAction.UPDATE;
                    if (updateDescription) {
                        oldValues = {};
                        newValues = updateDescription.updatedFields;
                    }
                    break;
                case 'delete':
                    action = audit_log_entity_1.AuditAction.DELETE;
                    oldValues = {};
                    break;
                default:
                    return;
            }
            const userId = fullDocument?.lastModifiedBy || 'system';
            await this.logChange(entityType, entityId, action, userId, oldValues, newValues, {
                source: 'change_stream',
                timestamp: new Date(),
                operationType
            });
        }
        catch (error) {
            this.logger.error('Error handling change stream event', error);
        }
    }
    async logChange(entityType, entityId, action, userId, oldValues, newValues, metadata) {
        try {
            const timestamp = new Date();
            const retentionDate = new Date();
            retentionDate.setFullYear(retentionDate.getFullYear() + this.RETENTION_YEARS);
            const auditDocument = {
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
            const mongoResult = await this.auditCollection.insertOne(auditDocument);
            const mongoAuditId = mongoResult.insertedId.toString();
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
        }
        catch (error) {
            this.logger.error('Failed to create audit log', error);
            throw new common_1.BadRequestException('Failed to create audit log');
        }
    }
    async getEntityAuditLog(entityType, entityId, pagination = {}) {
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
        }
        catch (error) {
            this.logger.error('Failed to retrieve entity audit log', error);
            throw new common_1.BadRequestException('Failed to retrieve audit log');
        }
    }
    async getUserActivity(userId, startDate, endDate, pagination = {}) {
        const { page = 1, limit = 100 } = pagination;
        const skip = (page - 1) * limit;
        try {
            const filter = { userId };
            if (startDate || endDate) {
                filter.timestamp = {};
                if (startDate)
                    filter.timestamp.$gte = startDate;
                if (endDate)
                    filter.timestamp.$lte = endDate;
            }
            const activities = await this.auditCollection
                .find(filter)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .toArray();
            const activityCounts = Object.values(audit_log_entity_1.AuditAction).reduce((acc, action) => {
                acc[action] = 0;
                return acc;
            }, {});
            activities.forEach(activity => {
                activityCounts[activity.action]++;
            });
            const loginLogs = activities.filter(a => a.action === audit_log_entity_1.AuditAction.LOGIN ||
                a.action === audit_log_entity_1.AuditAction.LOGOUT ||
                a.action === audit_log_entity_1.AuditAction.ACCESS_DENIED);
            const loginSummary = {
                totalLogins: loginLogs.filter(l => l.action === audit_log_entity_1.AuditAction.LOGIN).length,
                lastLogin: loginLogs.find(l => l.action === audit_log_entity_1.AuditAction.LOGIN)?.timestamp,
                failedAttempts: loginLogs.filter(l => l.action === audit_log_entity_1.AuditAction.ACCESS_DENIED).length
            };
            const riskScore = this.calculateUserRiskScore(activityCounts, loginSummary);
            return {
                userId,
                activities: activities.map(this.convertMongoToAuditLog),
                loginSummary,
                activityCounts,
                riskScore
            };
        }
        catch (error) {
            this.logger.error('Failed to retrieve user activity', error);
            throw new common_1.BadRequestException('Failed to retrieve user activity');
        }
    }
    async getAuditSummary() {
        try {
            const totalRecords = await this.auditCollection.countDocuments();
            const actionPipeline = [
                { $group: { _id: '$action', count: { $sum: 1 } } }
            ];
            const actionCounts = await this.auditCollection.aggregate(actionPipeline).toArray();
            const recordsByAction = Object.values(audit_log_entity_1.AuditAction).reduce((acc, action) => {
                const found = actionCounts.find(c => c._id === action);
                acc[action] = found ? found.count : 0;
                return acc;
            }, {});
            const entityPipeline = [
                { $group: { _id: '$entityType', count: { $sum: 1 } } }
            ];
            const entityCounts = await this.auditCollection.aggregate(entityPipeline).toArray();
            const recordsByEntity = entityCounts.reduce((acc, entity) => {
                acc[entity._id] = entity.count;
                return acc;
            }, {});
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const recentActivity = await this.auditCollection.countDocuments({
                timestamp: { $gte: yesterday }
            });
            const sensitiveActions = [
                audit_log_entity_1.AuditAction.DELETE,
                audit_log_entity_1.AuditAction.ROLE_CHANGE,
                audit_log_entity_1.AuditAction.PASSWORD_CHANGE,
                audit_log_entity_1.AuditAction.ACCESS_DENIED
            ];
            const sensitiveEvents = await this.auditCollection.countDocuments({
                action: { $in: sensitiveActions }
            });
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
        }
        catch (error) {
            this.logger.error('Failed to generate audit summary', error);
            throw new common_1.BadRequestException('Failed to generate audit summary');
        }
    }
    async getComplianceReport(startDate, endDate) {
        try {
            const reportId = `compliance-${Date.now()}`;
            const filter = {
                timestamp: { $gte: startDate, $lte: endDate }
            };
            const totalAuditRecords = await this.auditCollection.countDocuments(filter);
            const criticalEvents = await this.auditCollection.countDocuments({
                ...filter,
                action: { $in: [audit_log_entity_1.AuditAction.DELETE, audit_log_entity_1.AuditAction.ROLE_CHANGE, audit_log_entity_1.AuditAction.ACCESS_DENIED] }
            });
            const complianceScore = Math.max(0, 100 - (criticalEvents / totalAuditRecords * 100));
            const assetChanges = await this.auditCollection.countDocuments({
                ...filter,
                entityType: { $in: ['Equipment', 'Subscription'] }
            });
            const subscriptionSpend = await this.calculateSubscriptionSpend(startDate, endDate);
            const userActivities = await this.auditCollection.countDocuments({
                ...filter,
                entityType: 'User'
            });
            const roleChanges = await this.auditCollection.countDocuments({
                ...filter,
                action: audit_log_entity_1.AuditAction.ROLE_CHANGE
            });
            const failedAccess = await this.auditCollection.countDocuments({
                ...filter,
                action: audit_log_entity_1.AuditAction.ACCESS_DENIED
            });
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
                    asset_utilization: 85,
                    compliance_percentage: 98,
                    recent_changes: assetChanges
                },
                financial_summary: {
                    total_subscription_spend: subscriptionSpend,
                    invoice_coverage: 95,
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
                    immutable_records: totalAuditRecords,
                    integrity_score: 100
                }
            };
        }
        catch (error) {
            this.logger.error('Failed to generate compliance report', error);
            throw new common_1.BadRequestException('Failed to generate compliance report');
        }
    }
    async getRetentionInfo() {
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
        }
        catch (error) {
            this.logger.error('Failed to get retention info', error);
            throw new common_1.BadRequestException('Failed to get retention info');
        }
    }
    async monitorChanges() {
        if (!this.changeStream) {
            await this.startChangeStreamMonitoring();
        }
        return {
            status: 'Change stream monitoring active',
            monitoring: !!this.changeStream
        };
    }
    async searchAuditLogs(filters, pagination = {}) {
        const { page = 1, limit = 50 } = pagination;
        const skip = (page - 1) * limit;
        try {
            const mongoFilter = {};
            if (filters.entityType)
                mongoFilter.entityType = filters.entityType;
            if (filters.entityId)
                mongoFilter.entityId = filters.entityId;
            if (filters.action)
                mongoFilter.action = filters.action;
            if (filters.userId)
                mongoFilter.userId = filters.userId;
            if (filters.startDate || filters.endDate) {
                mongoFilter.timestamp = {};
                if (filters.startDate)
                    mongoFilter.timestamp.$gte = filters.startDate;
                if (filters.endDate)
                    mongoFilter.timestamp.$lte = filters.endDate;
            }
            if (filters.isSensitive) {
                const sensitiveActions = [
                    audit_log_entity_1.AuditAction.DELETE,
                    audit_log_entity_1.AuditAction.ROLE_CHANGE,
                    audit_log_entity_1.AuditAction.PASSWORD_CHANGE,
                    audit_log_entity_1.AuditAction.ACCESS_DENIED
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
        }
        catch (error) {
            this.logger.error('Failed to search audit logs', error);
            throw new common_1.BadRequestException('Failed to search audit logs');
        }
    }
    async enforceRetentionPolicy() {
        try {
            const retentionDate = new Date();
            retentionDate.setFullYear(retentionDate.getFullYear() - this.RETENTION_YEARS);
            const result = await this.auditCollection.deleteMany({
                timestamp: { $lt: retentionDate }
            });
            this.logger.log(`Deleted ${result.deletedCount} audit records beyond retention period`);
            return { deletedCount: result.deletedCount || 0 };
        }
        catch (error) {
            this.logger.error('Failed to enforce retention policy', error);
            throw new common_1.BadRequestException('Failed to enforce retention policy');
        }
    }
    async validateAuditAccess(user, auditLog) {
        if (user.role === user_entity_1.UserRole.ADMIN) {
            return true;
        }
        if (user.role === user_entity_1.UserRole.TEAM_LEAD && auditLog) {
            const auditedUser = await this.userRepository.findOne({
                where: { id: auditLog.userId },
                relations: ['team']
            });
            if (auditedUser?.teamId === user.teamId) {
                return true;
            }
        }
        if (auditLog && auditLog.userId === user.id && !auditLog.isSensitiveAction) {
            return true;
        }
        return false;
    }
    async getAnonymizedAuditData(startDate, endDate) {
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
        }
        catch (error) {
            this.logger.error('Failed to get anonymized audit data', error);
            throw new common_1.BadRequestException('Failed to get anonymized audit data');
        }
    }
    generateChecksum(entityType, entityId, action, userId, timestamp) {
        const data = `${entityType}:${entityId}:${action}:${userId}:${timestamp.toISOString()}`;
        return Buffer.from(data).toString('base64');
    }
    sanitizeDocument(doc) {
        if (!doc)
            return {};
        const sanitized = { ...doc };
        delete sanitized.password;
        delete sanitized.passwordHash;
        delete sanitized.secret;
        delete sanitized.token;
        delete sanitized._id;
        return sanitized;
    }
    capitalizeEntityType(entityType) {
        return entityType.charAt(0).toUpperCase() + entityType.slice(1);
    }
    calculateUserRiskScore(activityCounts, loginSummary) {
        let score = 0;
        score += loginSummary.failedAttempts * 10;
        score += activityCounts[audit_log_entity_1.AuditAction.DELETE] * 5;
        score += activityCounts[audit_log_entity_1.AuditAction.ROLE_CHANGE] * 15;
        score += activityCounts[audit_log_entity_1.AuditAction.ACCESS_DENIED] * 20;
        return Math.min(score, 100);
    }
    async calculateSubscriptionSpend(startDate, endDate) {
        return 15000.00;
    }
    convertMongoToAuditLog(mongoDoc) {
        const auditLog = new audit_log_entity_1.AuditLog();
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
    hashUserId(userId) {
        return `user_${Buffer.from(userId).toString('base64').slice(0, 8)}`;
    }
    hashIp(ip) {
        return `ip_${Buffer.from(ip).toString('base64').slice(0, 8)}`;
    }
    anonymizePersonalData(data) {
        if (!data)
            return data;
        const anonymized = { ...data };
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
    hashEmail(email) {
        const [local, domain] = email.split('@');
        return `${local.slice(0, 2)}***@${domain}`;
    }
    async onModuleDestroy() {
        if (this.changeStream) {
            await this.changeStream.close();
            this.logger.log('Change stream monitoring stopped');
        }
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(audit_log_entity_1.AuditLog)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, common_1.Inject)('MONGODB_CONNECTION')),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        mongodb_1.Db])
], AuditService);
//# sourceMappingURL=audit.service.js.map