import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipmentService } from './equipment.service';
import { Equipment } from '../models/equipment.entity';
import { User } from '../models/user.entity';
import { Transfer } from '../models/transfer.entity';
import { AuditLog } from '../models/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Equipment, User, Transfer, AuditLog])
  ],
  providers: [EquipmentService],
  exports: [EquipmentService],
})
export class EquipmentModule {}