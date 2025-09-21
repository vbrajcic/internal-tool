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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = exports.AuditAction = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
var AuditAction;
(function (AuditAction) {
    AuditAction["CREATE"] = "CREATE";
    AuditAction["UPDATE"] = "UPDATE";
    AuditAction["DELETE"] = "DELETE";
    AuditAction["LOGIN"] = "LOGIN";
    AuditAction["LOGOUT"] = "LOGOUT";
    AuditAction["ACCESS_DENIED"] = "ACCESS_DENIED";
    AuditAction["PASSWORD_CHANGE"] = "PASSWORD_CHANGE";
    AuditAction["ROLE_CHANGE"] = "ROLE_CHANGE";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
let AuditLog = class AuditLog {
    get changesSummary() {
        const changes = [];
        if (!this.oldValues || !this.newValues) {
            return changes;
        }
        Object.keys(this.newValues).forEach(key => {
            const oldValue = this.oldValues[key];
            const newValue = this.newValues[key];
            if (oldValue !== newValue) {
                changes.push(`${key}: ${oldValue} → ${newValue}`);
            }
        });
        return changes;
    }
    get isRecent() {
        const now = new Date();
        const logTime = new Date(this.timestamp);
        const minutesSinceLog = (now.getTime() - logTime.getTime()) / (1000 * 60);
        return minutesSinceLog <= 60;
    }
    get isSensitiveAction() {
        const sensitiveActions = [
            AuditAction.DELETE,
            AuditAction.ROLE_CHANGE,
            AuditAction.PASSWORD_CHANGE,
            AuditAction.ACCESS_DENIED,
        ];
        return sensitiveActions.includes(this.action);
    }
    get clientInfo() {
        return {
            ip: this.metadata?.ip,
            userAgent: this.metadata?.userAgent,
            location: this.metadata?.location,
        };
    }
    get hasChanges() {
        return this.action === AuditAction.UPDATE && this.changesSummary.length > 0;
    }
    static forCreate(entityType, entityId, userId, newValues, metadata) {
        return {
            entityType,
            entityId,
            action: AuditAction.CREATE,
            userId,
            oldValues: null,
            newValues,
            metadata,
        };
    }
    static forUpdate(entityType, entityId, userId, oldValues, newValues, metadata) {
        return {
            entityType,
            entityId,
            action: AuditAction.UPDATE,
            userId,
            oldValues,
            newValues,
            metadata,
        };
    }
    static forDelete(entityType, entityId, userId, oldValues, metadata) {
        return {
            entityType,
            entityId,
            action: AuditAction.DELETE,
            userId,
            oldValues,
            newValues: null,
            metadata,
        };
    }
    static forSecurityEvent(action, userId, entityId, metadata) {
        return {
            entityType: 'security_event',
            entityId,
            action,
            userId,
            oldValues: null,
            newValues: null,
            metadata,
        };
    }
    static getQueryByEntity(entityType, entityId) {
        return { entityType, entityId };
    }
    static getQueryByUser(userId) {
        return { userId };
    }
    static getQueryByAction(action) {
        return { action };
    }
    static getQueryByDateRange(startDate, endDate) {
        return {
            timestamp: {
                $gte: startDate,
                $lte: endDate,
            },
        };
    }
    static getSensitiveActionsQuery() {
        return {
            action: {
                $in: [
                    AuditAction.DELETE,
                    AuditAction.ROLE_CHANGE,
                    AuditAction.PASSWORD_CHANGE,
                    AuditAction.ACCESS_DENIED,
                ],
            },
        };
    }
};
exports.AuditLog = AuditLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AuditLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], AuditLog.prototype, "entityType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], AuditLog.prototype, "entityId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: AuditAction,
    }),
    __metadata("design:type", String)
], AuditLog.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], AuditLog.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "oldValues", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "newValues", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Date)
], AuditLog.prototype, "timestamp", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.User)
], AuditLog.prototype, "user", void 0);
exports.AuditLog = AuditLog = __decorate([
    (0, typeorm_1.Entity)('audit_logs'),
    (0, typeorm_1.Index)(['entityType', 'entityId']),
    (0, typeorm_1.Index)(['userId', 'timestamp']),
    (0, typeorm_1.Index)(['action', 'timestamp'])
], AuditLog);
//# sourceMappingURL=audit-log.entity.js.map