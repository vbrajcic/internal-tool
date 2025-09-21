import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TransferService } from './transfer.service';
import { Transfer } from '../models/transfer.entity';
import { Equipment } from '../models/equipment.entity';
import { User } from '../models/user.entity';
import { AuditLog } from '../models/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transfer,
      Equipment,
      User,
      AuditLog,
    ]),
  ],
  providers: [TransferService],
  exports: [TransferService],
})
export class TransferModule {}