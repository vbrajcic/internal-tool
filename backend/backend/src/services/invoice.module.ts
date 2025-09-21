import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { InvoiceService } from './invoice.service';
import { S3Service } from './s3.service';
import { Invoice } from '../models/invoice.entity';
import { Subscription } from '../models/subscription.entity';
import { User } from '../models/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, Subscription, User]),
    ConfigModule,
  ],
  providers: [InvoiceService, S3Service],
  exports: [InvoiceService, S3Service],
})
export class InvoiceModule {}