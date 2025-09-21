import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'uuid' })
  leadId: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToOne(() => User)
  @JoinColumn({ name: 'leadId' })
  lead: User;

  @OneToMany(() => User, user => user.team)
  members: User[];

  // Virtual property for team equipment (through members)
  get teamEquipment() {
    if (!this.members) return [];
    return this.members.reduce((equipment, member) => {
      return equipment.concat(member.assignedEquipment || []);
    }, []);
  }
}