import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { Debt, DebtType, DebtStatus } from './debt.entity.js';
import { RecurringTemplate } from './recurring-template.entity.js';
import { Account } from '../accounts/account.entity.js';
import { Transaction, TransactionType } from '../transactions/transaction.entity.js';
import {
  CreateDebtDto, UpdateDebtDto, PayDebtDto,
  CreateTemplateDto, UpdateTemplateDto, GenerateMonthDto, CreateInstallmentDto,
} from './debt.dto.js';

const ME_DEBEN_ACCOUNT_NAME = 'ME DEBEN';

@Injectable()
export class DebtsService {
  constructor(
    @InjectRepository(Debt) private readonly repo: Repository<Debt>,
    @InjectRepository(RecurringTemplate) private readonly templateRepo: Repository<RecurringTemplate>,
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
        templateId: null,
        installmentGroup: null,
        installmentNumber: null,
        installmentTotal: null,
        installmentDescription: null,
        categories: dto.categories ?? [],
      });

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

      const paidDate = dto.paidDate || new Date().toISOString().slice(0, 10);
      // Permitir override de amount al pagar
      const amount = dto.amount !== undefined ? Number(dto.amount) : Number(debt.amount);

      // Si el monto pagado difiere del registrado, actualizar la deuda y ajustar ME DEBEN si aplica
      if (amount !== Number(debt.amount)) {
        if (debt.type === DebtType.ME_DEBEN) {
          const meDeben = await accountRepo.findOneBy({ name: ME_DEBEN_ACCOUNT_NAME });
          if (meDeben) {
            const delta = amount - Number(debt.amount);
            meDeben.balance = Number(meDeben.balance) + delta;
            await accountRepo.save(meDeben);
          }
        }
        debt.amount = amount;
      }

      if (debt.type === DebtType.ME_DEBEN) {
        const meDeben = await accountRepo.findOneBy({ name: ME_DEBEN_ACCOUNT_NAME });
        if (!meDeben) throw new BadRequestException('Cuenta ME DEBEN no encontrada');
        meDeben.balance = Number(meDeben.balance) - amount;
        targetAccount.balance = Number(targetAccount.balance) + amount;
        await accountRepo.save(meDeben);
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
