import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { User } from '../models/user.entity';
import { Team } from '../models/team.entity';
import { Equipment } from '../models/equipment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Team, Equipment])
  ],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}