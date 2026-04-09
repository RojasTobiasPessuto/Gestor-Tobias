import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Debt, DebtType, DebtStatus } from './debt.entity.js';
import { Account } from '../accounts/account.entity.js';
import { Transaction, TransactionType } from '../transactions/transaction.entity.js';
import { CreateDebtDto, UpdateDebtDto, PayDebtDto } from './debt.dto.js';

const ME_DEBEN_ACCOUNT_NAME = 'ME DEBEN';

@Injectable()
export class DebtsService {
  constructor(
    @InjectRepository(Debt) private readonly repo: Repository<Debt>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(type?: DebtType, status?: DebtStatus): Promise<Debt[]> {
    const where: { type?: DebtType; status?: DebtStatus } = {};
    if (type) where.type = type;
    if (status) where.status = status;
    return this.repo.find({ where, order: { status: 'ASC', date: 'DESC', id: 'DESC' } });
  }

  async create(dto: CreateDebtDto): Promise<Debt> {
    return this.dataSource.transaction(async (manager) => {
      const debtRepo = manager.getRepository(Debt);
      const accountRepo = manager.getRepository(Account);

      const debt = debtRepo.create({
        type: dto.type,
        person: dto.person,
        amount: dto.amount,
        currency: dto.currency,
        description: dto.description ?? null,
        date: dto.date,
        status: DebtStatus.PENDIENTE,
        paidDate: null,
        paidAccountId: null,
      });

      // Si es ME_DEBEN, sumar al saldo de ME DEBEN
      if (dto.type === DebtType.ME_DEBEN) {
        const meDeben = await accountRepo.findOneBy({ name: ME_DEBEN_ACCOUNT_NAME });
        if (!meDeben) throw new BadRequestException('Cuenta ME DEBEN no encontrada');
        meDeben.balance = Number(meDeben.balance) + dto.amount;
        await accountRepo.save(meDeben);
      }

      return debtRepo.save(debt);
    });
  }

  async update(id: number, dto: UpdateDebtDto): Promise<Debt> {
    return this.dataSource.transaction(async (manager) => {
      const debtRepo = manager.getRepository(Debt);
      const accountRepo = manager.getRepository(Account);

      const debt = await debtRepo.findOneBy({ id });
      if (!debt) throw new NotFoundException(`Deuda #${id} no encontrada`);
      if (debt.status === DebtStatus.PAGADO) {
        throw new BadRequestException('No se puede editar una deuda pagada');
      }

      // Si es ME_DEBEN y cambia el monto, ajustar el saldo
      if (debt.type === DebtType.ME_DEBEN && dto.amount !== undefined && dto.amount !== Number(debt.amount)) {
        const meDeben = await accountRepo.findOneBy({ name: ME_DEBEN_ACCOUNT_NAME });
        if (!meDeben) throw new BadRequestException('Cuenta ME DEBEN no encontrada');
        const delta = dto.amount - Number(debt.amount);
        meDeben.balance = Number(meDeben.balance) + delta;
        await accountRepo.save(meDeben);
      }

      if (dto.person !== undefined) debt.person = dto.person;
      if (dto.amount !== undefined) debt.amount = dto.amount;
      if (dto.currency !== undefined) debt.currency = dto.currency;
      if (dto.description !== undefined) debt.description = dto.description;
      if (dto.date !== undefined) debt.date = dto.date;

      return debtRepo.save(debt);
    });
  }

  async remove(id: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const debtRepo = manager.getRepository(Debt);
      const accountRepo = manager.getRepository(Account);

      const debt = await debtRepo.findOneBy({ id });
      if (!debt) throw new NotFoundException(`Deuda #${id} no encontrada`);

      // Si esta pendiente y es ME_DEBEN, revertir el saldo
      if (debt.status === DebtStatus.PENDIENTE && debt.type === DebtType.ME_DEBEN) {
        const meDeben = await accountRepo.findOneBy({ name: ME_DEBEN_ACCOUNT_NAME });
        if (meDeben) {
          meDeben.balance = Number(meDeben.balance) - Number(debt.amount);
          await accountRepo.save(meDeben);
        }
      }

      await debtRepo.remove(debt);
    });
  }

  async pay(id: number, dto: PayDebtDto): Promise<Debt> {
    return this.dataSource.transaction(async (manager) => {
      const debtRepo = manager.getRepository(Debt);
      const accountRepo = manager.getRepository(Account);
      const txRepo = manager.getRepository(Transaction);

      const debt = await debtRepo.findOneBy({ id });
      if (!debt) throw new NotFoundException(`Deuda #${id} no encontrada`);
      if (debt.status === DebtStatus.PAGADO) {
        throw new BadRequestException('La deuda ya esta pagada');
      }

      const targetAccount = await accountRepo.findOneBy({ id: dto.account_id });
      if (!targetAccount) throw new BadRequestException('Cuenta no encontrada');

      const paidDate = dto.paidDate || new Date().toISOString().slice(0, 10);
      const amount = Number(debt.amount);

      if (debt.type === DebtType.ME_DEBEN) {
        // Restar de ME DEBEN, sumar a la cuenta destino
        const meDeben = await accountRepo.findOneBy({ name: ME_DEBEN_ACCOUNT_NAME });
        if (!meDeben) throw new BadRequestException('Cuenta ME DEBEN no encontrada');
        meDeben.balance = Number(meDeben.balance) - amount;
        targetAccount.balance = Number(targetAccount.balance) + amount;
        await accountRepo.save(meDeben);
        await accountRepo.save(targetAccount);

        // Guardar registro INGRESO en historial (sin afectar saldos, ya los movimos arriba)
        const tx = txRepo.create({
          type: TransactionType.INGRESO,
          amount,
          account_id: targetAccount.id,
          account_to_id: null,
          categories: ['ME DEBE'],
          comment: `Pago de deuda: ${debt.person}${debt.description ? ' - ' + debt.description : ''}`,
          exchangeRate: null,
          date: paidDate,
        });
        await txRepo.save(tx);
      } else {
        // YO_DEBO: descontar de la cuenta destino
        targetAccount.balance = Number(targetAccount.balance) - amount;
        await accountRepo.save(targetAccount);

        // Guardar registro GASTO en historial
        const tx = txRepo.create({
          type: TransactionType.GASTO,
          amount,
          account_id: targetAccount.id,
          account_to_id: null,
          categories: ['PRESTAMO'],
          comment: `Pago de deuda: ${debt.person}${debt.description ? ' - ' + debt.description : ''}`,
          exchangeRate: null,
          date: paidDate,
        });
        await txRepo.save(tx);
      }

      debt.status = DebtStatus.PAGADO;
      debt.paidDate = paidDate;
      debt.paidAccountId = targetAccount.id;
      return debtRepo.save(debt);
    });
  }
}
