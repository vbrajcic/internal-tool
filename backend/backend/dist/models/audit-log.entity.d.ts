import { User } from './user.entity';
export declare enum AuditAction {
    CREATE = "CREATE",
    UPDATE = "UPDATE",
    DELETE = "DELETE",
    LOGIN = "LOGIN",
    LOGOUT = "LOGOUT",
    ACCESS_DENIED = "ACCESS_DENIED",
    PASSWORD_CHANGE = "PASSWORD_CHANGE",
    ROLE_CHANGE = "ROLE_CHANGE"
}
export declare class AuditLog {
    id: string;
    entityType: string;
    entityId: string;
    action: AuditAction;
    userId: string;
    oldValues: Record<string, any>;
    newValues: Record<string, any>;
    metadata: Record<string, any>;
    timestamp: Date;
    user: User;
    get changesSummary(): string[];
    get isRecent(): boolean;
    get isSensitiveAction(): boolean;
    get clientInfo(): {
        ip?: string;
        userAgent?: string;
        location?: string;
    };
    get hasChanges(): boolean;
    static forCreate(entityType: string, entityId: string, userId: string, newValues: Record<string, any>, metadata?: Record<string, any>): Partial<AuditLog>;
    static forUpdate(entityType: string, entityId: string, userId: string, oldValues: Record<string, any>, newValues: Record<string, any>, metadata?: Record<string, any>): Partial<AuditLog>;
    static forDelete(entityType: string, entityId: string, userId: string, oldValues: Record<string, any>, metadata?: Record<string, any>): Partial<AuditLog>;
    static forSecurityEvent(action: AuditAction.LOGIN | AuditAction.LOGOUT | AuditAction.ACCESS_DENIED | AuditAction.PASSWORD_CHANGE, userId: string, entityId: string, metadata?: Record<string, any>): Partial<AuditLog>;
    static getQueryByEntity(entityType: string, entityId: string): {
        entityType: string;
        entityId: string;
    };
    static getQueryByUser(userId: string): {
        userId: string;
    };
    static getQueryByAction(action: AuditAction): {
        action: AuditAction;
    };
    static getQueryByDateRange(startDate: Date, endDate: Date): {
        timestamp: {
            $gte: Date;
            $lte: Date;
        };
    };
    static getSensitiveActionsQuery(): {
        action: {
            $in: AuditAction[];
        };
    };
}
