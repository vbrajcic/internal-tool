import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamService } from './team.service';
import { Team } from '../models/team.entity';
import { User } from '../models/user.entity';
import { Equipment } from '../models/equipment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Team, User, Equipment])
  ],
  providers: [TeamService],
  exports: [TeamService],
})
export class TeamModule {}