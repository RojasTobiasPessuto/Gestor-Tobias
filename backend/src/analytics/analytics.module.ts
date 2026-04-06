import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../transactions/transaction.entity.js';
import { Account } from '../accounts/account.entity.js';
import { AnalyticsController } from './analytics.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, Account])],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
