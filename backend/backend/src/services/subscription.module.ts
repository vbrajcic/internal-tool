import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionService } from './subscription.service';
import { Subscription } from '../models/subscription.entity';
import { Invoice } from '../models/invoice.entity';
import { User } from '../models/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Invoice, User])
  ],
  providers: [SubscriptionService],
  exports: [SubscriptionService]
})
export class SubscriptionModule {}