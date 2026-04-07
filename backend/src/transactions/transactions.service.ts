import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Transaction, TransactionType } from './transaction.entity.js';
import { Account } from '../accounts/account.entity.js';
import { CreateTransactionDto } from './transaction.dto.js';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(type?: TransactionType, category?: string): Promise<Transaction[]> {
    const where: { type?: TransactionType; category?: string } = {};
    if (type) where.type = type;
    if (category) where.category = category;
    return this.repo.find({ where, order: { date: 'DESC', id: 'DESC' } });
  }

  async findOne(id: number): Promise<Transaction> {
    const tx = await this.repo.findOneBy({ id });
    if (!tx) throw new NotFoundException(`Transaccion #${id} no encontrada`);
    return tx;
  }

  // Aplica el efecto de una transaccion sobre los saldos (sign = 1 aplicar, -1 revertir)
  private async applyEffect(
    manager: EntityManager,
    type: TransactionType,
    amount: number,
    account_id: number,
    account_to_id: number | null,
    exchangeRate: number | null,
    sign: 1 | -1,
  ) {
    const accountRepo = manager.getRepository(Account);
    const account = await accountRepo.findOneBy({ id: account_id });
    if (!account) throw new BadRequestException('Cuenta origen no encontrada');

    let accountTo: Account | null = null;
    if (account_to_id) {
      accountTo = await accountRepo.findOneBy({ id: account_to_id });
      if (!accountTo) throw new BadRequestException('Cuenta destino no encontrada');
    }

    switch (type) {
      case TransactionType.INGRESO:
        account.balance = Number(account.balance) + sign * amount;
        await accountRepo.save(account);
        break;

      case TransactionType.GASTO:
        account.balance = Number(account.balance) - sign * amount;
        await accountRepo.save(account);
        break;

      case TransactionType.TRANSFERENCIA:
        if (!accountTo) throw new BadRequestException('Se requiere cuenta destino');
        account.balance = Number(account.balance) - sign * amount;
        accountTo.balance = Number(accountTo.balance) + sign * amount;
        await accountRepo.save(account);
        await accountRepo.save(accountTo);
        break;

      case TransactionType.VENTA_DOLARES: {
        if (!accountTo) throw new BadRequestException('Se requiere cuenta destino');
        if (!exchangeRate) throw new BadRequestException('Se requiere tasa de conversion');
        const converted = amount * exchangeRate;
        account.balance = Number(account.balance) - sign * amount;
        accountTo.balance = Number(accountTo.balance) + sign * converted;
        await accountRepo.save(account);
        await accountRepo.save(accountTo);
        break;
      }

      case TransactionType.COMPRA_DOLARES: {
        if (!accountTo) throw new BadRequestException('Se requiere cuenta destino');
        if (!exchangeRate) throw new BadRequestException('Se requiere tasa de conversion');
        const dolares = amount / exchangeRate;
        account.balance = Number(account.balance) - sign * amount;
        accountTo.balance = Number(accountTo.balance) + sign * dolares;
        await accountRepo.save(account);
        await accountRepo.save(accountTo);
        break;
      }
    }
  }

  async create(dto: CreateTransactionDto): Promise<Transaction> {
    return this.dataSource.transaction(async (manager) => {
      await this.applyEffect(
        manager,
        dto.type,
        dto.amount,
        dto.account_id,
        dto.account_to_id ?? null,
        dto.exchangeRate ?? null,
        1,
      );

      const txRepo = manager.getRepository(Transaction);
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

  async update(id: number, dto: CreateTransactionDto): Promise<Transaction> {
    return this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(Transaction);
      const old = await txRepo.findOneBy({ id });
      if (!old) throw new NotFoundException(`Transaccion #${id} no encontrada`);

      // Revertir efecto anterior
      await this.applyEffect(
        manager,
        old.type,
        Number(old.amount),
        old.account_id,
        old.account_to_id,
        old.exchangeRate ? Number(old.exchangeRate) : null,
        -1,
      );

      // Aplicar nuevo efecto
      await this.applyEffect(
        manager,
        dto.type,
        dto.amount,
        dto.account_id,
        dto.account_to_id ?? null,
        dto.exchangeRate ?? null,
        1,
      );

      old.type = dto.type;
      old.amount = dto.amount;
      old.account_id = dto.account_id;
      old.account_to_id = dto.account_to_id ?? null;
      old.category = dto.category ?? null;
      old.comment = dto.comment ?? null;
      old.exchangeRate = dto.exchangeRate ?? null;
      old.date = dto.date;
      return txRepo.save(old);
    });
  }

  async remove(id: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(Transaction);
      const tx = await txRepo.findOneBy({ id });
      if (!tx) throw new NotFoundException(`Transaccion #${id} no encontrada`);

      // Revertir el efecto
      await this.applyEffect(
        manager,
        tx.type,
        Number(tx.amount),
        tx.account_id,
        tx.account_to_id,
        tx.exchangeRate ? Number(tx.exchangeRate) : null,
        -1,
      );

      await txRepo.remove(tx);
    });
  }
}
