import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Equipment, EquipmentType } from './equipment.entity';

export enum RequestStatus {
  SUBMITTED = 'Submitted',
  TEAM_LEAD_REVIEW = 'TeamLeadReview',
  ADMIN_REVIEW = 'AdminReview',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  ORDERED = 'Ordered',
  FULFILLED = 'Fulfilled',
}

export enum Decision {
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  PENDING = 'Pending',
}

@Entity('requests')
export class Request {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  requesterId: string;

  @Column({
    type: 'enum',
    enum: EquipmentType,
  })
  equipmentType: EquipmentType;

  @Column('text')
  justification: string;

  @Column('text', { nullable: true })
  specifications: string;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.SUBMITTED,
  })
  status: RequestStatus;

  @Column({ type: 'uuid' })
  teamLeadId: string;

  @Column({
    type: 'enum',
    enum: Decision,
    default: Decision.PENDING,
  })
  teamLeadDecision: Decision;

  @Column('text', { nullable: true })
  teamLeadNotes: string;

  @Column({ type: 'uuid', nullable: true })
  adminId: string;

  @Column({
    type: 'enum',
    enum: Decision,
    nullable: true,
  })
  adminDecision: Decision;

  @Column('text', { nullable: true })
  adminNotes: string;

  @Column('text', { nullable: true })
  rejectionReason: string;

  @CreateDateColumn()
  requestedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  teamLeadReviewedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  adminReviewedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  fulfilledAt: Date;

  @Column({ type: 'uuid', nullable: true })
  equipmentId: string;

  // Relations
  @ManyToOne(() => User, user => user.requests)
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  @ManyToOne(() => User, user => user.teamLeadRequests)
  @JoinColumn({ name: 'teamLeadId' })
  teamLead: User;

  @ManyToOne(() => User, user => user.adminRequests, { nullable: true })
  @JoinColumn({ name: 'adminId' })
  admin: User;

  @ManyToOne(() => Equipment, equipment => equipment.requests, { nullable: true })
  @JoinColumn({ name: 'equipmentId' })
  equipment: Equipment;

  // Virtual properties
  get isApproved(): boolean {
    return this.status === RequestStatus.APPROVED;
  }

  get isRejected(): boolean {
    return this.status === RequestStatus.REJECTED;
  }

  get isPending(): boolean {
    return [
      RequestStatus.SUBMITTED,
      RequestStatus.TEAM_LEAD_REVIEW,
      RequestStatus.ADMIN_REVIEW,
    ].includes(this.status);
  }

  get canBeAmended(): boolean {
    return this.status === RequestStatus.SUBMITTED;
  }

  get nextApprover(): 'team-lead' | 'admin' | null {
    if (this.status === RequestStatus.SUBMITTED) return 'team-lead';
    if (this.status === RequestStatus.TEAM_LEAD_REVIEW && this.teamLeadDecision === Decision.APPROVED) {
      return 'admin';
    }
    return null;
  }

  get processingTimeInHours(): number {
    const now = new Date();
    const start = new Date(this.requestedAt);
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60));
  }

  // Business logic methods
  approveByTeamLead(notes?: string): void {
    if (this.status !== RequestStatus.SUBMITTED) {
      throw new Error('Request cannot be approved in current status');
    }

    this.teamLeadDecision = Decision.APPROVED;
    this.teamLeadNotes = notes;
    this.teamLeadReviewedAt = new Date();
    this.status = RequestStatus.ADMIN_REVIEW;
  }

  rejectByTeamLead(reason: string, notes?: string): void {
    if (this.status !== RequestStatus.SUBMITTED) {
      throw new Error('Request cannot be rejected in current status');
    }

    this.teamLeadDecision = Decision.REJECTED;
    this.rejectionReason = reason;
    this.teamLeadNotes = notes;
    this.teamLeadReviewedAt = new Date();
    this.status = RequestStatus.REJECTED;
  }

  approveByAdmin(adminId: string, notes?: string): void {
    if (this.status !== RequestStatus.ADMIN_REVIEW) {
      throw new Error('Request cannot be approved by admin in current status');
    }

    this.adminId = adminId;
    this.adminDecision = Decision.APPROVED;
    this.adminNotes = notes;
    this.adminReviewedAt = new Date();
    this.status = RequestStatus.APPROVED;
  }

  rejectByAdmin(adminId: string, reason: string, notes?: string): void {
    if (this.status !== RequestStatus.ADMIN_REVIEW) {
      throw new Error('Request cannot be rejected by admin in current status');
    }

    this.adminId = adminId;
    this.adminDecision = Decision.REJECTED;
    this.rejectionReason = reason;
    this.adminNotes = notes;
    this.adminReviewedAt = new Date();
    this.status = RequestStatus.REJECTED;
  }

  fulfill(equipmentId: string): void {
    if (this.status !== RequestStatus.APPROVED) {
      throw new Error('Only approved requests can be fulfilled');
    }

    this.equipmentId = equipmentId;
    this.fulfilledAt = new Date();
    this.status = RequestStatus.FULFILLED;
  }
}