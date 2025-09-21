import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Team } from './team.entity';
import { Equipment } from './equipment.entity';
import { Subscription } from './subscription.entity';
import { Request } from './request.entity';

export enum UserRole {
  EMPLOYEE = 'Employee',
  TEAM_LEAD = 'TeamLead',
  ADMIN = 'Admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true, nullable: true })
  authId: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.EMPLOYEE,
  })
  role: UserRole;

  @Column({ type: 'uuid', nullable: true })
  teamId: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Team, team => team.members)
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @OneToMany(() => Equipment, equipment => equipment.currentOwner)
  assignedEquipment: Equipment[];

  @OneToMany(() => Subscription, subscription => subscription.owner)
  subscriptions: Subscription[];

  @OneToMany(() => Request, request => request.requester)
  requests: Request[];

  @OneToMany(() => Request, request => request.teamLead)
  teamLeadRequests: Request[];

  @OneToMany(() => Request, request => request.admin)
  adminRequests: Request[];
}