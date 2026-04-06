import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Transaction, TransactionType } from './transaction.entity.js';
import { Account } from '../accounts/account.entity.js';
import { CreateTransactionDto } from './transaction.dto.js';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(type?: TransactionType): Promise<Transaction[]> {
    const where = type ? { type } : {};
    return this.repo.find({ where, order: { date: 'DESC', id: 'DESC' } });
  }

  async findOne(id: number): Promise<Transaction> {
    const tx = await this.repo.findOneBy({ id });
    if (!tx) throw new NotFoundException(`Transaccion #${id} no encontrada`);
    return tx;
  }

  async create(dto: CreateTransactionDto): Promise<Transaction> {
    return this.dataSource.transaction(async (manager) => {
      const accountRepo = manager.getRepository(Account);
      const txRepo = manager.getRepository(Transaction);

      const account = await accountRepo.findOneBy({ id: dto.account_id });
      if (!account) throw new BadRequestException('Cuenta origen no encontrada');

      let accountTo: Account | null = null;
      if (dto.account_to_id) {
        accountTo = await accountRepo.findOneBy({ id: dto.account_to_id });
        if (!accountTo) throw new BadRequestException('Cuenta destino no encontrada');
      }

      switch (dto.type) {
        case TransactionType.INGRESO: {
          account.balance = Number(account.balance) + dto.amount;
          await accountRepo.save(account);
          break;
        }

        case TransactionType.GASTO: {
          account.balance = Number(account.balance) - dto.amount;
          await accountRepo.save(account);
          break;
        }

        case TransactionType.TRANSFERENCIA: {
          if (!accountTo) throw new BadRequestException('Se requiere cuenta destino para transferencia');
          account.balance = Number(account.balance) - dto.amount;
          accountTo.balance = Number(accountTo.balance) + dto.amount;
          await accountRepo.save(account);
          await accountRepo.save(accountTo);
          break;
        }

        case TransactionType.VENTA_DOLARES: {
          if (!accountTo) throw new BadRequestException('Se requiere cuenta destino');
          if (!dto.exchangeRate) throw new BadRequestException('Se requiere tasa de conversion');
          const converted = dto.amount * dto.exchangeRate;
          account.balance = Number(account.balance) - dto.amount;
          accountTo.balance = Number(accountTo.balance) + converted;
          await accountRepo.save(account);
          await accountRepo.save(accountTo);
          break;
        }

        case TransactionType.COMPRA_DOLARES: {
          if (!accountTo) throw new BadRequestException('Se requiere cuenta destino');
          if (!dto.exchangeRate) throw new BadRequestException('Se requiere tasa de conversion');
          const dolares = dto.amount / dto.exchangeRate;
          account.balance = Number(account.balance) - dto.amount;
          accountTo.balance = Number(accountTo.balance) + dolares;
          await accountRepo.save(account);
          await accountRepo.save(accountTo);
          break;
        }
      }

      const tx = txRepo.create({
        ...dto,
        account_to_id: dto.account_to_id ?? null,
        category: dto.category ?? null,
        comment: dto.comment ?? null,
        exchangeRate: dto.exchangeRate ?? null,
      });
      return txRepo.save(tx);
    });
  }

  async remove(id: number): Promise<void> {
    const tx = await this.findOne(id);
    await this.repo.remove(tx);
  }
}
