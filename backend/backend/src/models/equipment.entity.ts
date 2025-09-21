import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, BeforeInsert } from 'typeorm';
import { User } from './user.entity';
import { Transfer } from './transfer.entity';
import { Request } from './request.entity';
import * as QRCode from 'qrcode';

export enum EquipmentType {
  LAPTOP = 'Laptop',
  DISPLAY = 'Display',
  PHONE = 'Phone',
  TABLET = 'Tablet',
  DONGLE = 'Dongle',
  KEYBOARD = 'Keyboard',
  MOUSE = 'Mouse',
  FURNITURE = 'Furniture',
}

export enum EquipmentStatus {
  AVAILABLE = 'Available',
  ASSIGNED = 'Assigned',
  PENDING = 'Pending',
  BROKEN = 'Broken',
  STOLEN = 'Stolen',
}

export enum ClassificationTag {
  PROFICO = 'Profico',
  ZOPI = 'ZOPI',
  LEASING = 'Leasing',
}

export enum Condition {
  NEW = 'New',
  GOOD = 'Good',
  FAIR = 'Fair',
  POOR = 'Poor',
}

@Entity('equipment')
export class Equipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  serialNumber: string;

  @Column({ unique: true })
  qrCode: string;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column({
    type: 'enum',
    enum: EquipmentType,
  })
  type: EquipmentType;

  @Column({
    type: 'enum',
    enum: EquipmentStatus,
    default: EquipmentStatus.AVAILABLE,
  })
  status: EquipmentStatus;

  @Column({ type: 'date' })
  purchaseDate: Date;

  @Column({
    type: 'enum',
    enum: ClassificationTag,
  })
  classificationTag: ClassificationTag;

  @Column({ type: 'uuid', nullable: true })
  currentOwnerId: string;

  @Column({
    type: 'enum',
    enum: Condition,
    default: Condition.NEW,
  })
  condition: Condition;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, user => user.assignedEquipment)
  @JoinColumn({ name: 'currentOwnerId' })
  currentOwner: User;

  @OneToMany(() => Transfer, transfer => transfer.equipment)
  transfers: Transfer[];

  @OneToMany(() => Request, request => request.equipment)
  requests: Request[];

  @BeforeInsert()
  async generateQRCode() {
    if (!this.qrCode) {
      this.qrCode = await QRCode.toDataURL(this.id);
    }
  }
}