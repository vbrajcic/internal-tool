import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Equipment } from './equipment.entity';
import { User } from './user.entity';

export enum TransferType {
  ASSIGNMENT = 'Assignment',
  RETURN = 'Return',
  TRANSFER = 'Transfer',
  DECOMMISSION = 'Decommission',
}

@Entity('transfers')
export class Transfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  equipmentId: string;

  @Column({ type: 'uuid', nullable: true })
  fromUserId: string;

  @Column({ type: 'uuid', nullable: true })
  toUserId: string;

  @Column({
    type: 'enum',
    enum: TransferType,
  })
  transferType: TransferType;

  @Column('text')
  reason: string;

  @Column({ default: false })
  fromUserConfirmed: boolean;

  @Column({ default: false })
  toUserConfirmed: boolean;

  @Column({ default: false })
  adminConfirmed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  transferredAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Equipment, equipment => equipment.transfers)
  @JoinColumn({ name: 'equipmentId' })
  equipment: Equipment;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'fromUserId' })
  fromUser: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'toUserId' })
  toUser: User;

  // Virtual properties
  get isCompleted(): boolean {
    return this.transferredAt !== null;
  }

  get isPending(): boolean {
    return !this.isCompleted;
  }

  get requiresFromUserConfirmation(): boolean {
    return this.fromUserId !== null && !this.fromUserConfirmed;
  }

  get requiresToUserConfirmation(): boolean {
    return this.toUserId !== null && !this.toUserConfirmed;
  }

  get requiresAdminConfirmation(): boolean {
    return !this.adminConfirmed;
  }

  get allConfirmationsReceived(): boolean {
    const fromConfirmed = this.fromUserId === null || this.fromUserConfirmed;
    const toConfirmed = this.toUserId === null || this.toUserConfirmed;
    return fromConfirmed && toConfirmed && this.adminConfirmed;
  }

  get transferDescription(): string {
    switch (this.transferType) {
      case TransferType.ASSIGNMENT:
        return `Assignment to ${this.toUser?.firstName} ${this.toUser?.lastName}`;
      case TransferType.RETURN:
        return `Return from ${this.fromUser?.firstName} ${this.fromUser?.lastName} to equipment pool`;
      case TransferType.TRANSFER:
        return `Transfer from ${this.fromUser?.firstName} ${this.fromUser?.lastName} to ${this.toUser?.firstName} ${this.toUser?.lastName}`;
      case TransferType.DECOMMISSION:
        return `Decommissioning from ${this.fromUser?.firstName} ${this.fromUser?.lastName}`;
      default:
        return 'Unknown transfer type';
    }
  }

  // Business logic methods
  confirmByFromUser(): void {
    if (!this.fromUserId) {
      throw new Error('No from user to confirm transfer');
    }
    if (this.fromUserConfirmed) {
      throw new Error('Transfer already confirmed by from user');
    }
    if (this.isCompleted) {
      throw new Error('Transfer already completed');
    }

    this.fromUserConfirmed = true;
    this.checkAndCompleteTransfer();
  }

  confirmByToUser(): void {
    if (!this.toUserId) {
      throw new Error('No to user to confirm transfer');
    }
    if (this.toUserConfirmed) {
      throw new Error('Transfer already confirmed by to user');
    }
    if (this.isCompleted) {
      throw new Error('Transfer already completed');
    }

    this.toUserConfirmed = true;
    this.checkAndCompleteTransfer();
  }

  confirmByAdmin(): void {
    if (this.adminConfirmed) {
      throw new Error('Transfer already confirmed by admin');
    }
    if (this.isCompleted) {
      throw new Error('Transfer already completed');
    }

    this.adminConfirmed = true;
    this.checkAndCompleteTransfer();
  }

  private checkAndCompleteTransfer(): void {
    if (this.allConfirmationsReceived && !this.isCompleted) {
      this.transferredAt = new Date();
    }
  }

  static determineTransferType(fromUserId: string | null, toUserId: string | null): TransferType {
    if (!fromUserId && toUserId) {
      return TransferType.ASSIGNMENT;
    }
    if (fromUserId && !toUserId) {
      return TransferType.RETURN;
    }
    if (fromUserId && toUserId) {
      return TransferType.TRANSFER;
    }
    return TransferType.DECOMMISSION;
  }
}