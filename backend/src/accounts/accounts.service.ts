import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Account } from './account.entity.js';
import { CreateAccountDto, UpdateAccountDto } from './account.dto.js';
import { Transaction, TransactionType } from '../transactions/transaction.entity.js';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly repo: Repository<Account>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(): Promise<Account[]> {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<Account> {
    const account = await this.repo.findOneBy({ id });
    if (!account) throw new NotFoundException(`Cuenta #${id} no encontrada`);
    return account;
  }

  create(dto: CreateAccountDto): Promise<Account> {
    const account = this.repo.create({ ...dto, balance: dto.balance ?? 0 });
    return this.repo.save(account);
  }

  async update(id: number, dto: UpdateAccountDto): Promise<Account> {
    const account = await this.findOne(id);
    Object.assign(account, dto);
    return this.repo.save(account);
  }

  async remove(id: number): Promise<void> {
    const account = await this.findOne(id);
    await this.repo.remove(account);
  }

  // Ajusta el saldo y crea una transaccion AJUSTE para auditoria
  async adjustBalance(id: number, newBalance: number, comment?: string): Promise<Account> {
    return this.dataSource.transaction(async (manager) => {
      const accountRepo = manager.getRepository(Account);
      const txRepo = manager.getRepository(Transaction);

      const account = await accountRepo.findOneBy({ id });
      if (!account) throw new NotFoundException(`Cuenta #${id} no encontrada`);

      const oldBalance = Number(account.balance);
      const delta = newBalance - oldBalance;
      if (delta === 0) return account;

      // Actualizar saldo
      account.balance = newBalance;
      await accountRepo.save(account);

      // Registrar transaccion AJUSTE
      const tx = txRepo.create({
        type: TransactionType.AJUSTE,
        amount: delta,
        account_id: account.id,
        account_to_id: null,
        categories: ['AJUSTE'],
        comment: comment || `Ajuste manual: ${oldBalance.toFixed(2)} -> ${newBalance.toFixed(2)}`,
        exchangeRate: null,
        date: new Date().toISOString().slice(0, 10),
      });
      await txRepo.save(tx);

      if (delta !== 0 && !isFinite(delta)) {
        throw new BadRequestException('Saldo invalido');
      }
      return account;
    });
  }
}
