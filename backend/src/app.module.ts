import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsModule } from './accounts/accounts.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';
import { DollarModule } from './dollar/dollar.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { Account } from './accounts/account.entity.js';
import { Transaction } from './transactions/transaction.entity.js';
import { SeedService } from './seed/seed.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env['DB_HOST'],
      port: parseInt(process.env['DB_PORT'] ?? '5432'),
      username: process.env['DB_USER'],
      password: process.env['DB_PASSWORD'],
      database: process.env['DB_NAME'],
      entities: [Account, Transaction],
      synchronize: true,
      ssl: { rejectUnauthorized: false },
      extra: {
        options: 'project=uqtdmfuszsinkxrayioe',
      },
    }),
    TypeOrmModule.forFeature([Account]),
    AccountsModule,
    TransactionsModule,
    DollarModule,
    AnalyticsModule,
  ],
  providers: [SeedService],
})
export class AppModule {}
