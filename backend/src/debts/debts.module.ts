import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Debt } from './debt.entity.js';
import { Account } from '../accounts/account.entity.js';
import { Transaction } from '../transactions/transaction.entity.js';
import { DebtsService } from './debts.service.js';
import { DebtsController } from './debts.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Debt, Account, Transaction])],
  controllers: [DebtsController],
  providers: [DebtsService],
})
export class DebtsModule {}
