import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { Debt, DebtType, DebtStatus } from './debt.entity.js';
import { RecurringTemplate } from './recurring-template.entity.js';
import { Account, Currency } from '../accounts/account.entity.js';
import { Transaction, TransactionType } from '../transactions/transaction.entity.js';
import { todayBA } from '../common/date.util.js';
import {
  CreateDebtDto, UpdateDebtDto, PayDebtDto,
  CreateTemplateDto, UpdateTemplateDto, GenerateMonthDto, CreateInstallmentDto,
} from './debt.dto.js';

const ME_DEBEN_USD = 'ME DEBEN';
const ME_DEBEN_ARS = 'ME DEBEN ARS';

@Injectable()
export class DebtsService {
  constructor(
    @InjectRepository(Debt) private readonly repo: Repository<Debt>,
    @InjectRepository(RecurringTemplate) private readonly templateRepo: Repository<RecurringTemplate>,
    private readonly dataSource: DataSource,
  ) {}

  // Devuelve la cuenta acumuladora ME DEBEN de la moneda indicada, creandola si no existe.
  private async getOrCreateMeDeben(
    accountRepo: Repository<Account>,
    currency: 'ARS' | 'USD',
  ): Promise<Account> {
    const name = currency === 'USD' ? ME_DEBEN_USD : ME_DEBEN_ARS;
    let account = await accountRepo.findOneBy({ name });
    if (!account) {
      account = accountRepo.create({
        name,
        balance: 0,
        currency: currency === 'USD' ? Currency.USD : Currency.ARS,
      });
      account = await accountRepo.save(account);
    }
    return account;
  }

  // Aplica (sign=1) o revierte (sign=-1) el efecto de una deuda ME_DEBEN sobre los saldos:
  // suma al acumulador ME DEBEN de la moneda y, si hay cuenta origen, descuenta de ella.
  private async applyMeDebenEffect(
    accountRepo: Repository<Account>,
    currency: 'ARS' | 'USD',
    amount: number,
    sourceAccountId: number | null,
    sign: 1 | -1,
  ) {
    const meDeben = await this.getOrCreateMeDeben(accountRepo, currency);
    meDeben.balance = Number(meDeben.balance) + sign * amount;
    await accountRepo.save(meDeben);

    if (sourceAccountId) {
      const source = await accountRepo.findOneBy({ id: sourceAccountId });
      if (!source) throw new BadRequestException('Cuenta origen no encontrada');
      if (sign === 1 && source.currency !== currency) {
        throw new BadRequestException(
          `La cuenta origen debe ser en ${currency} (misma moneda que la deuda)`,
        );
      }
      source.balance = Number(source.balance) - sign * amount;
      await accountRepo.save(source);
    }
  }

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
        templateId: null,
        installmentGroup: null,
        installmentNumber: null,
        installmentTotal: null,
        installmentDescription: null,
        categories: dto.categories ?? [],
        sourceAccountId: dto.type === DebtType.ME_DEBEN ? (dto.source_account_id ?? null) : null,
      });

      if (dto.type === DebtType.ME_DEBEN) {
        // Impacta el acumulador ME DEBEN de la moneda de la deuda (y descuenta de la
        // cuenta origen si se presto plata real). Valida que la moneda coincida.
        await this.applyMeDebenEffect(
          accountRepo,
          dto.currency,
          dto.amount,
          dto.source_account_id ?? null,
          1,
        );
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

      // Para ME_DEBEN, revertir el efecto anterior sobre los saldos y aplicar el nuevo.
      // Asi se manejan de forma unificada los cambios de monto, moneda y cuenta origen.
      if (debt.type === DebtType.ME_DEBEN) {
        const newCurrency = dto.currency ?? debt.currency;
        const newAmount = dto.amount !== undefined ? dto.amount : Number(debt.amount);
        const newSource =
          dto.source_account_id !== undefined ? dto.source_account_id : debt.sourceAccountId;

        await this.applyMeDebenEffect(accountRepo, debt.currency, Number(debt.amount), debt.sourceAccountId, -1);
        await this.applyMeDebenEffect(accountRepo, newCurrency, newAmount, newSource ?? null, 1);

        debt.sourceAccountId = newSource ?? null;
      }

      if (dto.person !== undefined) debt.person = dto.person;
      if (dto.amount !== undefined) debt.amount = dto.amount;
      if (dto.currency !== undefined) debt.currency = dto.currency;
      if (dto.description !== undefined) debt.description = dto.description;
      if (dto.date !== undefined) debt.date = dto.date;
      if (dto.categories !== undefined) debt.categories = dto.categories;

      return debtRepo.save(debt);
    });
  }

  async remove(id: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const debtRepo = manager.getRepository(Debt);
      const accountRepo = manager.getRepository(Account);

      const debt = await debtRepo.findOneBy({ id });
      if (!debt) throw new NotFoundException(`Deuda #${id} no encontrada`);

      if (debt.status === DebtStatus.PENDIENTE && debt.type === DebtType.ME_DEBEN) {
        await this.applyMeDebenEffect(
          accountRepo,
          debt.currency,
          Number(debt.amount),
          debt.sourceAccountId,
          -1,
        );
      }

      await debtRepo.remove(debt);
    });
  }

  async pay(id: number, dto: PayDebtDto): Promise<Debt> {
    return this.dataSource.transaction(async (manager) => {
      const debtRepo = manager.getRepository(Debt);
      const templateRepo = manager.getRepository(RecurringTemplate);
      const accountRepo = manager.getRepository(Account);
      const txRepo = manager.getRepository(Transaction);

      const debt = await debtRepo.findOneBy({ id });
      if (!debt) throw new NotFoundException(`Deuda #${id} no encontrada`);
      if (debt.status === DebtStatus.PAGADO) {
        throw new BadRequestException('La deuda ya esta pagada');
      }

      const targetAccount = await accountRepo.findOneBy({ id: dto.account_id });
      if (!targetAccount) throw new BadRequestException('Cuenta no encontrada');

      const paidDate = dto.paidDate || todayBA();
      // Monto originalmente registrado (lo que se acumulo como "por cobrar" al crear la deuda)
      const originalAmount = Number(debt.amount);
      // Permitir override de amount al pagar
      const amount = dto.amount !== undefined ? Number(dto.amount) : originalAmount;

      // La cuenta debe ser de la misma moneda que la deuda: no convertimos automaticamente.
      if (targetAccount.currency !== debt.currency) {
        throw new BadRequestException(
          `La cuenta debe ser en ${debt.currency} (misma moneda que la deuda)`,
        );
      }

      if (debt.type === DebtType.ME_DEBEN) {
        // Sacar del acumulador lo que se habia registrado como por cobrar...
        const meDeben = await this.getOrCreateMeDeben(accountRepo, debt.currency);
        meDeben.balance = Number(meDeben.balance) - originalAmount;
        await accountRepo.save(meDeben);

        // ...y acreditar el monto realmente cobrado en la cuenta destino.
        targetAccount.balance = Number(targetAccount.balance) + amount;
        await accountRepo.save(targetAccount);

        const tx = txRepo.create({
          type: TransactionType.INGRESO,
          amount,
          account_id: targetAccount.id,
          account_to_id: null,
          categories: (debt.categories && debt.categories.length > 0) ? debt.categories : ['ME DEBE'],
          comment: `Pago de deuda: ${debt.person}${debt.description ? ' - ' + debt.description : ''}`,
          exchangeRate: null,
          date: paidDate,
        });
        await txRepo.save(tx);
      } else {
        targetAccount.balance = Number(targetAccount.balance) - amount;
        await accountRepo.save(targetAccount);

        const tx = txRepo.create({
          type: TransactionType.GASTO,
          amount,
          account_id: targetAccount.id,
          account_to_id: null,
          categories: (debt.categories && debt.categories.length > 0) ? debt.categories : ['PRESTAMO'],
          comment: `Pago de deuda: ${debt.person}${debt.description ? ' - ' + debt.description : ''}`,
          exchangeRate: null,
          date: paidDate,
        });
        await txRepo.save(tx);
      }

      debt.amount = amount;
      debt.status = DebtStatus.PAGADO;
      debt.paidDate = paidDate;
      debt.paidAccountId = targetAccount.id;
      const saved = await debtRepo.save(debt);

      // Si la deuda venia de una plantilla, actualizar defaultAmount con el monto pagado
      if (debt.templateId) {
        const template = await templateRepo.findOneBy({ id: debt.templateId });
        if (template) {
          template.defaultAmount = amount;
          await templateRepo.save(template);
        }
      }

      return saved;
    });
  }

  // ========== TEMPLATES (Pagos recurrentes) ==========

  findAllTemplates(activeOnly?: boolean): Promise<RecurringTemplate[]> {
    const where = activeOnly ? { active: true } : {};
    return this.templateRepo.find({ where, order: { active: 'DESC', name: 'ASC' } });
  }

  createTemplate(dto: CreateTemplateDto): Promise<RecurringTemplate> {
    const template = this.templateRepo.create({
      name: dto.name,
      person: dto.person,
      defaultAmount: dto.defaultAmount,
      currency: dto.currency,
      description: dto.description ?? null,
      active: true,
      lastGeneratedMonth: null,
      categories: dto.categories ?? [],
    });
    return this.templateRepo.save(template);
  }

  async updateTemplate(id: number, dto: UpdateTemplateDto): Promise<RecurringTemplate> {
    const template = await this.templateRepo.findOneBy({ id });
    if (!template) throw new NotFoundException(`Plantilla #${id} no encontrada`);
    if (dto.name !== undefined) template.name = dto.name;
    if (dto.person !== undefined) template.person = dto.person;
    if (dto.defaultAmount !== undefined) template.defaultAmount = dto.defaultAmount;
    if (dto.currency !== undefined) template.currency = dto.currency;
    if (dto.description !== undefined) template.description = dto.description;
    if (dto.active !== undefined) template.active = dto.active;
    if (dto.categories !== undefined) template.categories = dto.categories;
    return this.templateRepo.save(template);
  }

  async removeTemplate(id: number): Promise<void> {
    const template = await this.templateRepo.findOneBy({ id });
    if (!template) throw new NotFoundException(`Plantilla #${id} no encontrada`);
    await this.templateRepo.remove(template);
  }

  async generateMonthlyDebts(dto: GenerateMonthDto): Promise<Debt[]> {
    return this.dataSource.transaction(async (manager) => {
      const debtRepo = manager.getRepository(Debt);
      const templateRepo = manager.getRepository(RecurringTemplate);

      // Plantillas activas que NO se hayan generado para este mes
      const templates = await templateRepo.find({ where: { active: true } });
      const pendientes = templates.filter((t) => t.lastGeneratedMonth !== dto.month);

      // Si vienen items en el DTO, usar esos montos; si no, defaultAmount
      const itemMap = new Map<number, number>();
      if (dto.items) {
        for (const it of dto.items) itemMap.set(it.templateId, it.amount);
      }

      const created: Debt[] = [];
      for (const t of pendientes) {
        // Si vienen items y este template no esta incluido, saltarlo
        if (dto.items && !itemMap.has(t.id)) continue;
        const amount = itemMap.get(t.id) ?? Number(t.defaultAmount);
        const debt = debtRepo.create({
          type: DebtType.YO_DEBO,
          person: t.person,
          amount,
          currency: t.currency,
          description: t.description ?? t.name,
          date: dto.date,
          status: DebtStatus.PENDIENTE,
          paidDate: null,
          paidAccountId: null,
          templateId: t.id,
          installmentGroup: null,
          installmentNumber: null,
          installmentTotal: null,
          installmentDescription: null,
          categories: t.categories ?? [],
        });
        const saved = await debtRepo.save(debt);
        created.push(saved);
        t.lastGeneratedMonth = dto.month;
        await templateRepo.save(t);
      }

      return created;
    });
  }

  async createInstallmentPurchase(dto: CreateInstallmentDto): Promise<Debt[]> {
    return this.dataSource.transaction(async (manager) => {
      const debtRepo = manager.getRepository(Debt);

      if (dto.installments < 1) throw new BadRequestException('Cantidad de cuotas invalida');
      const groupId = randomUUID();
      const cuotaAmount = Number((dto.totalAmount / dto.installments).toFixed(6));

      const [year, month, day] = dto.firstDate.split('-').map(Number);
      const created: Debt[] = [];
      for (let i = 0; i < dto.installments; i++) {
        // Sumar i meses a la fecha de la primera cuota
        const d = new Date(year, month - 1 + i, day);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        const debt = debtRepo.create({
          type: DebtType.YO_DEBO,
          person: dto.person,
          amount: cuotaAmount,
          currency: dto.currency,
          description: `${dto.description} - Cuota ${i + 1}/${dto.installments}`,
          date: dateStr,
          status: DebtStatus.PENDIENTE,
          paidDate: null,
          paidAccountId: null,
          templateId: null,
          installmentGroup: groupId,
          installmentNumber: i + 1,
          installmentTotal: dto.installments,
          installmentDescription: dto.description,
          categories: dto.categories ?? [],
        });
        const saved = await debtRepo.save(debt);
        created.push(saved);
      }
      return created;
    });
  }
}
