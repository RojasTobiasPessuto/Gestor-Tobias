import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './transaction.entity.js';
import { Account } from '../accounts/account.entity.js';
import { TransactionsService } from './transactions.service.js';
import { TransactionsController } from './transactions.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, Account])],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
