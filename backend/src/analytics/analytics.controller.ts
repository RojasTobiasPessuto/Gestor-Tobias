import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Transaction } from '../transactions/transaction.entity.js';
import { Account } from '../accounts/account.entity.js';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
    @InjectRepository(Account) private readonly acctRepo: Repository<Account>,
  ) {}

  private applyFilters(
    qb: SelectQueryBuilder<Transaction>,
    alias: string,
    filters: { desde?: string; hasta?: string; category?: string; account_id?: string },
  ) {
    if (filters.desde) qb.andWhere(`${alias}.date >= :desde`, { desde: filters.desde });
    if (filters.hasta) qb.andWhere(`${alias}.date <= :hasta`, { hasta: filters.hasta });
    if (filters.category) qb.andWhere(`${alias}.category = :category`, { category: filters.category });
    if (filters.account_id) qb.andWhere(`${alias}.account_id = :account_id`, { account_id: parseInt(filters.account_id) });
    return qb;
  }

  @Get('filters')
  async getFilterOptions() {
    const categories = await this.txRepo
      .createQueryBuilder('t')
      .select('DISTINCT t.category', 'category')
      .where('t.category IS NOT NULL')
      .orderBy('t.category', 'ASC')
      .getRawMany();

    const accounts = await this.acctRepo.find({ order: { id: 'ASC' } });

    const dateRange = await this.txRepo
      .createQueryBuilder('t')
      .select('MIN(t.date)', 'min')
      .addSelect('MAX(t.date)', 'max')
      .getRawOne();

    return {
      categories: categories.map((c) => c.category),
      accounts: accounts.map((a) => ({ id: a.id, name: a.name })),
      dateRange: { min: dateRange.min, max: dateRange.max },
    };
  }

  @Get('summary')
  async getSummary(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('category') category?: string,
    @Query('account_id') account_id?: string,
  ) {
    const filters = { desde, hasta, category, account_id };

    // Gastos por categoría + moneda
    const gastosCatQb = this.txRepo
      .createQueryBuilder('t')
      .innerJoin('t.account', 'a')
      .select('t.category', 'category')
      .addSelect('a.currency', 'currency')
      .addSelect('SUM(t.amount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where("t.type = 'GASTO'")
      .andWhere('t.category IS NOT NULL');
    this.applyFilters(gastosCatQb, 't', filters);
    const gastosPorCategoria = await gastosCatQb.groupBy('t.category').addGroupBy('a.currency').orderBy('total', 'DESC').getRawMany();

    // Ingresos por categoría + moneda
    const ingresosCatQb = this.txRepo
      .createQueryBuilder('t')
      .innerJoin('t.account', 'a')
      .select('t.category', 'category')
      .addSelect('a.currency', 'currency')
      .addSelect('SUM(t.amount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where("t.type = 'INGRESO'")
      .andWhere('t.category IS NOT NULL');
    this.applyFilters(ingresosCatQb, 't', filters);
    const ingresosPorCategoria = await ingresosCatQb.groupBy('t.category').addGroupBy('a.currency').orderBy('total', 'DESC').getRawMany();

    // Por mes + moneda
    const porMesQb = this.txRepo
      .createQueryBuilder('t')
      .innerJoin('t.account', 'a')
      .select("TO_CHAR(t.date, 'YYYY-MM')", 'month')
      .addSelect('t.type', 'type')
      .addSelect('a.currency', 'currency')
      .addSelect('SUM(t.amount)', 'total')
      .where("t.type IN ('INGRESO', 'GASTO')");
    this.applyFilters(porMesQb, 't', filters);
    const porMes = await porMesQb
      .groupBy("TO_CHAR(t.date, 'YYYY-MM')")
      .addGroupBy('t.type')
      .addGroupBy('a.currency')
      .orderBy("TO_CHAR(t.date, 'YYYY-MM')", 'ASC')
      .getRawMany();

    type MonthData = { ingArs: number; gasArs: number; ingUsd: number; gasUsd: number };
    const meses: Record<string, MonthData> = {};
    for (const row of porMes) {
      if (!meses[row.month]) meses[row.month] = { ingArs: 0, gasArs: 0, ingUsd: 0, gasUsd: 0 };
      const m = meses[row.month];
      if (row.type === 'INGRESO' && row.currency === 'ARS') m.ingArs = parseFloat(row.total);
      if (row.type === 'GASTO' && row.currency === 'ARS') m.gasArs = parseFloat(row.total);
      if (row.type === 'INGRESO' && row.currency === 'USD') m.ingUsd = parseFloat(row.total);
      if (row.type === 'GASTO' && row.currency === 'USD') m.gasUsd = parseFloat(row.total);
    }
    const monthlyData = Object.entries(meses).map(([month, d]) => ({
      month,
      ingArs: d.ingArs, gasArs: d.gasArs, balanceArs: d.ingArs - d.gasArs,
      ingUsd: d.ingUsd, gasUsd: d.gasUsd, balanceUsd: d.ingUsd - d.gasUsd,
    }));

    // Totales por moneda
    const totalesPorMonedaQb = this.txRepo
      .createQueryBuilder('t')
      .innerJoin('t.account', 'a')
      .select('a.currency', 'currency')
      .addSelect('t.type', 'type')
      .addSelect('SUM(t.amount)', 'total')
      .where("t.type IN ('INGRESO', 'GASTO')");
    this.applyFilters(totalesPorMonedaQb, 't', filters);
    const totalesPorMoneda = await totalesPorMonedaQb
      .groupBy('a.currency')
      .addGroupBy('t.type')
      .getRawMany();

    const totales = { ars: { ingresos: 0, gastos: 0 }, usd: { ingresos: 0, gastos: 0 } };
    for (const row of totalesPorMoneda) {
      const cur = row.currency === 'ARS' ? 'ars' : 'usd';
      if (row.type === 'INGRESO') totales[cur].ingresos = parseFloat(row.total);
      if (row.type === 'GASTO') totales[cur].gastos = parseFloat(row.total);
    }

    // Gasto diario (siempre sin filtros de categoría/cuenta para que sea representativo)
    const hace30 = new Date();
    hace30.setDate(hace30.getDate() - 30);
    const gastos30Qb = this.txRepo
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total')
      .where("t.type = 'GASTO'")
      .andWhere('t.date >= :d30', { d30: hace30.toISOString().slice(0, 10) });
    if (filters.account_id) gastos30Qb.andWhere('t.account_id = :aid30', { aid30: parseInt(filters.account_id) });
    if (filters.category) gastos30Qb.andWhere('t.category = :cat30', { cat30: filters.category });
    const gastos30d = await gastos30Qb.getRawOne();

    const hace90 = new Date();
    hace90.setDate(hace90.getDate() - 90);
    const gastos90Qb = this.txRepo
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total')
      .where("t.type = 'GASTO'")
      .andWhere('t.date >= :d90', { d90: hace90.toISOString().slice(0, 10) });
    if (filters.account_id) gastos90Qb.andWhere('t.account_id = :aid90', { aid90: parseInt(filters.account_id) });
    if (filters.category) gastos90Qb.andWhere('t.category = :cat90', { cat90: filters.category });
    const gastos90d = await gastos90Qb.getRawOne();

    // Top gastos
    const topQb = this.txRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.account', 'a')
      .where("t.type = 'GASTO'");
    this.applyFilters(topQb, 't', filters);
    const topGastos = await topQb.orderBy('t.amount', 'DESC').limit(10).getMany();

    // Movimientos por cuenta (ingresos y gastos)
    const movPorCuentaQb = this.txRepo
      .createQueryBuilder('t')
      .innerJoin('t.account', 'a')
      .select('a.name', 'account')
      .addSelect('t.type', 'type')
      .addSelect('SUM(t.amount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where("t.type IN ('INGRESO', 'GASTO')");
    this.applyFilters(movPorCuentaQb, 't', filters);
    const movPorCuentaRaw = await movPorCuentaQb.groupBy('a.name').addGroupBy('t.type').orderBy('a.name', 'ASC').getRawMany();

    const cuentasMap: Record<string, { ingresos: number; gastos: number; ingCount: number; gasCount: number }> = {};
    for (const row of movPorCuentaRaw) {
      if (!cuentasMap[row.account]) cuentasMap[row.account] = { ingresos: 0, gastos: 0, ingCount: 0, gasCount: 0 };
      if (row.type === 'INGRESO') {
        cuentasMap[row.account].ingresos = parseFloat(row.total);
        cuentasMap[row.account].ingCount = parseInt(row.count);
      }
      if (row.type === 'GASTO') {
        cuentasMap[row.account].gastos = parseFloat(row.total);
        cuentasMap[row.account].gasCount = parseInt(row.count);
      }
    }
    const movimientosPorCuenta = Object.entries(cuentasMap).map(([account, d]) => ({
      account,
      ingresos: d.ingresos,
      gastos: d.gastos,
      balance: d.ingresos - d.gastos,
      ingCount: d.ingCount,
      gasCount: d.gasCount,
    }));

    // Recurrentes
    const recQb = this.txRepo
      .createQueryBuilder('t')
      .select('t.category', 'category')
      .addSelect("COUNT(DISTINCT TO_CHAR(t.date, 'YYYY-MM'))", 'meses')
      .addSelect('AVG(t.amount)', 'promedio')
      .addSelect('SUM(t.amount)', 'total')
      .where("t.type = 'GASTO'")
      .andWhere('t.category IS NOT NULL');
    this.applyFilters(recQb, 't', filters);
    const categoriasRecurrentes = await recQb
      .groupBy('t.category')
      .having("COUNT(DISTINCT TO_CHAR(t.date, 'YYYY-MM')) >= 3")
      .orderBy('total', 'DESC')
      .getRawMany();

    return {
      totales,
      gastoDiario: {
        ultimos30d: parseFloat(gastos30d.total) / 30 || 0,
        ultimos90d: parseFloat(gastos90d.total) / 90 || 0,
      },
      gastosPorCategoria,
      ingresosPorCategoria,
      monthlyData,
      topGastos: topGastos.map((t) => ({
        amount: Number(t.amount),
        category: t.category,
        comment: t.comment,
        date: t.date,
        account: t.account?.name,
      })),
      movimientosPorCuenta,
      categoriasRecurrentes: categoriasRecurrentes.map((r) => ({
        category: r.category,
        meses: parseInt(r.meses),
        promedio: parseFloat(r.promedio),
        total: parseFloat(r.total),
      })),
    };
  }
}
