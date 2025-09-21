import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  ACCESS_DENIED = 'ACCESS_DENIED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  ROLE_CHANGE = 'ROLE_CHANGE',
}

@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['userId', 'timestamp'])
@Index(['action', 'timestamp'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  entityType: string; // Table name (users, equipment, etc.)

  @Column({ type: 'uuid' })
  @Index()
  entityId: string; // ID of the affected record

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({ type: 'uuid' })
  userId: string; // Who performed the action

  @Column('jsonb', { nullable: true })
  oldValues: Record<string, any>; // Previous state

  @Column('jsonb', { nullable: true })
  newValues: Record<string, any>; // New state

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>; // Additional context (IP, user agent, etc.)

  @CreateDateColumn()
  @Index()
  timestamp: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  // Virtual properties
  get changesSummary(): string[] {
    const changes: string[] = [];

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

  get isRecent(): boolean {
    const now = new Date();
    const logTime = new Date(this.timestamp);
    const minutesSinceLog = (now.getTime() - logTime.getTime()) / (1000 * 60);
    return minutesSinceLog <= 60; // Consider recent if within last hour
  }

  get isSensitiveAction(): boolean {
    const sensitiveActions = [
      AuditAction.DELETE,
      AuditAction.ROLE_CHANGE,
      AuditAction.PASSWORD_CHANGE,
      AuditAction.ACCESS_DENIED,
    ];
    return sensitiveActions.includes(this.action);
  }

  get clientInfo(): { ip?: string; userAgent?: string; location?: string } {
    return {
      ip: this.metadata?.ip,
      userAgent: this.metadata?.userAgent,
      location: this.metadata?.location,
    };
  }

  get hasChanges(): boolean {
    return this.action === AuditAction.UPDATE && this.changesSummary.length > 0;
  }

  // Static methods for creating audit logs
  static forCreate(
    entityType: string,
    entityId: string,
    userId: string,
    newValues: Record<string, any>,
    metadata?: Record<string, any>
  ): Partial<AuditLog> {
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

  static forUpdate(
    entityType: string,
    entityId: string,
    userId: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    metadata?: Record<string, any>
  ): Partial<AuditLog> {
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

  static forDelete(
    entityType: string,
    entityId: string,
    userId: string,
    oldValues: Record<string, any>,
    metadata?: Record<string, any>
  ): Partial<AuditLog> {
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

  static forSecurityEvent(
    action: AuditAction.LOGIN | AuditAction.LOGOUT | AuditAction.ACCESS_DENIED | AuditAction.PASSWORD_CHANGE,
    userId: string,
    entityId: string,
    metadata?: Record<string, any>
  ): Partial<AuditLog> {
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

  // Query helpers
  static getQueryByEntity(entityType: string, entityId: string) {
    return { entityType, entityId };
  }

  static getQueryByUser(userId: string) {
    return { userId };
  }

  static getQueryByAction(action: AuditAction) {
    return { action };
  }

  static getQueryByDateRange(startDate: Date, endDate: Date) {
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
}