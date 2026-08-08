import { useEffect, useState, useCallback, useRef } from 'react';
import { getAccounts, getDollarRate, createTransaction, getAnalytics, getFilterOptions, adjustAccountBalance, deleteAccount, getBackup, restoreBackup } from '../api';
import type { Account, DollarRate, AnalyticsSummary, AnalyticsFilters, FilterOptions } from '../api';
import {
  Wallet, DollarSign, TrendingUp, TrendingDown,
  ArrowLeftRight, History, BarChart3, HandCoins, Trash2, LogOut, Download, Upload,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/AuthContext';
import Modal from '../components/Modal';
import TransactionForm from '../components/TransactionForm';
import TransferForm from '../components/TransferForm';
import DolaresForm from '../components/DolaresForm';
import HistorialView from '../components/HistorialView';
import DeudasView from '../components/DeudasView';
import CategoryTransactionsView from '../components/CategoryTransactionsView';
import { firstDayOfMonthBA, lastDayOfMonthBA, todayBA } from '../utils/date';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Filter, X } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';

const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtMonth = (m: string) => {
  const [y, mo] = m.split('-');
  return format(new Date(parseInt(y), parseInt(mo) - 1), 'MMM yyyy', { locale: es });
};

type ModalType = 'ingreso' | 'gasto' | 'transfer' | 'dolares' | 'historial' | 'metricas' | 'deudas' | null;

export default function Dashboard() {
  const { signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [rate, setRate] = useState<DollarRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalType>(null);

  // Adjust balance state
  const [adjustingAccount, setAdjustingAccount] = useState<Account | null>(null);
  const [newBalance, setNewBalance] = useState('');
  const [adjustComment, setAdjustComment] = useState('');
  const [savingAdjust, setSavingAdjust] = useState(false);

  // Category drilldown state
  const [drilldown, setDrilldown] = useState<{ category: string; type: 'INGRESO' | 'GASTO' } | null>(null);

  // Metrics state
  const [metrics, setMetrics] = useState<AnalyticsSummary | null>(null);
  const [filterOpts, setFilterOpts] = useState<FilterOptions | null>(null);
  const mesDesde = firstDayOfMonthBA();
  const mesHasta = lastDayOfMonthBA();
  const [filters, setFilters] = useState<AnalyticsFilters>({ desde: mesDesde, hasta: mesHasta });
  const [metricsLoading, setMetricsLoading] = useState(false);

  const loadAccounts = () => {
    Promise.all([getAccounts(), getDollarRate()])
      .then(([a, r]) => { setAccounts(a); setRate(r); })
      .finally(() => setLoading(false));
  };

  const loadMetrics = useCallback((f: AnalyticsFilters) => {
    setMetricsLoading(true);
    const clean = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '' && v !== undefined));
    getAnalytics(clean as AnalyticsFilters).then(setMetrics).finally(() => setMetricsLoading(false));
  }, []);

  useEffect(() => {
    loadAccounts();
    getFilterOptions().then(setFilterOpts);
    loadMetrics({ desde: mesDesde, hasta: mesHasta });
  }, [loadMetrics, mesDesde, mesHasta]);

  const closeAndRefresh = () => {
    setModal(null);
    loadAccounts();
    loadMetrics(filters);
  };

  const handleIngreso = async (data: { amount: number; account_id: number; categories: string[]; comment: string; date: string }) => {
    await createTransaction({ type: 'INGRESO', ...data });
    toast.success('Ingreso registrado');
    loadAccounts();
    loadMetrics(filters);
  };

  const handleGasto = async (data: { amount: number; account_id: number; categories: string[]; comment: string; date: string }) => {
    await createTransaction({ type: 'GASTO', ...data });
    toast.success('Gasto registrado');
    loadAccounts();
    loadMetrics(filters);
  };

  const updateFilter = (key: keyof AnalyticsFilters, value: string) => {
    const next = { ...filters, [key]: value || undefined };
    setFilters(next);
    loadMetrics(next);
  };

  const clearFilters = () => {
    const d = { desde: mesDesde, hasta: mesHasta };
    setFilters(d);
    loadMetrics(d);
  };

  const handleBackup = async () => {
    setBackupBusy(true);
    try {
      const data = await getBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gestor-backup-${todayBA()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Backup descargado');
    } catch {
      toast.error('No se pudo generar el backup');
    } finally {
      setBackupBusy(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      toast.error('El archivo no es un backup valido');
      return;
    }
    const confirmText = window.prompt(
      'ATENCION: esto REEMPLAZA todos tus datos actuales por los del backup. No se puede deshacer.\n\nEscribi IMPORTAR para confirmar:',
    );
    if (confirmText !== 'IMPORTAR') {
      toast('Importacion cancelada');
      return;
    }
    setBackupBusy(true);
    try {
      const res = await restoreBackup(data);
      toast.success(`Backup restaurado (${res.restored.transactions} transacciones)`);
      loadAccounts();
      loadMetrics(filters);
    } catch {
      toast.error('No se pudo restaurar el backup');
    } finally {
      setBackupBusy(false);
    }
  };

  if (loading) return <p className="loading">Cargando...</p>;

  const arsAccounts = accounts.filter((a) => a.currency === 'ARS');
  const usdAccounts = accounts.filter((a) => a.currency === 'USD');
  // Orden de las tarjetas: primero las cuentas en pesos, despues las de dolares (por id dentro de cada grupo)
  const accountsOrdered = [...accounts].sort((a, b) =>
    a.currency === b.currency ? a.id - b.id : a.currency === 'ARS' ? -1 : 1,
  );
  const meDebenUsd = Number(accounts.find((a) => a.name === 'ME DEBEN')?.balance ?? 0);
  const meDebenArs = Number(accounts.find((a) => a.name === 'ME DEBEN ARS')?.balance ?? 0);

  const totalArs = arsAccounts.reduce((s, a) => s + Number(a.balance), 0);
  const totalUsd = usdAccounts.reduce((s, a) => s + Number(a.balance), 0);
  const totalArsSinDeuda = totalArs - meDebenArs;
  const totalUsdSinDeuda = totalUsd - meDebenUsd;
  const promedio = rate?.promedio || 0;
  const totalEnPesos = totalArs + totalUsd * promedio;
  const totalEnPesosSinDeuda = totalArsSinDeuda + totalUsdSinDeuda * promedio;
  const totalEnDolares = totalUsd + (promedio ? totalArs / promedio : 0);
  const totalEnDolaresSinDeuda = totalUsdSinDeuda + (promedio ? totalArsSinDeuda / promedio : 0);
  const hasFilters = Object.values(filters).some((v) => v);

  // Convertir todo a ARS usando el promedio del dolar blue
  const toArs = (amount: number, currency: string) =>
    currency === 'USD' ? amount * promedio : amount;

  // Totales convertidos a ARS
  const totalIngresosArs = metrics
    ? metrics.totales.ars.ingresos + metrics.totales.usd.ingresos * promedio
    : 0;
  const totalGastosArs = metrics
    ? metrics.totales.ars.gastos + metrics.totales.usd.gastos * promedio
    : 0;
  const balanceArs = totalIngresosArs - totalGastosArs;
  const tasaAhorro = totalIngresosArs > 0 ? (balanceArs / totalIngresosArs) * 100 : 0;

  // Datos mensuales convertidos
  const monthlyChartData = metrics
    ? Object.values(
        metrics.monthlyData.reduce<Record<string, { month: string; Ingresos: number; Gastos: number; Balance: number }>>((acc, m) => {
          if (!acc[m.month]) acc[m.month] = { month: fmtMonth(m.month), Ingresos: 0, Gastos: 0, Balance: 0 };
          acc[m.month].Ingresos += m.ingArs + m.ingUsd * promedio;
          acc[m.month].Gastos += m.gasArs + m.gasUsd * promedio;
          acc[m.month].Balance = acc[m.month].Ingresos - acc[m.month].Gastos;
          return acc;
        }, {}),
      )
    : [];

  // Gastos por categoria (consolidados en ARS)
  const gastosCatMap: Record<string, number> = {};
  metrics?.gastosPorCategoria.forEach((c) => {
    const v = toArs(parseFloat(c.total), c.currency);
    gastosCatMap[c.category] = (gastosCatMap[c.category] || 0) + v;
  });
  const gastosCatData = Object.entries(gastosCatMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Ingresos por categoria
  const ingresosCatMap: Record<string, number> = {};
  metrics?.ingresosPorCategoria.forEach((c) => {
    const v = toArs(parseFloat(c.total), c.currency);
    ingresosCatMap[c.category] = (ingresosCatMap[c.category] || 0) + v;
  });
  const ingresosCatData = Object.entries(ingresosCatMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Cuentas en ARS
  const cuentaChartData = metrics
    ? metrics.movimientosPorCuenta.map((c) => {
        const isUsd = c.account.includes('USD') || c.account === 'ME DEBEN';
        return {
          name: c.account,
          Ingresos: isUsd ? c.ingresos * promedio : c.ingresos,
          Gastos: isUsd ? c.gastos * promedio : c.gastos,
        };
      })
    : [];

  const PIE_COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#a855f7'];

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dash-header">
        <h1>Gestor</h1>
        {rate && rate.promedio > 0 && (
          <div className="dollar-chip">
            <DollarSign size={14} />
            Blue Cordoba: ${fmt(rate.compra)} / ${fmt(rate.venta)}
            <span className="chip-highlight">Prom. ${fmt(rate.promedio)}</span>
          </div>
        )}
        <div className="dash-header-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            style={{ display: 'none' }}
          />
          <button type="button" className="header-btn" disabled={backupBusy} onClick={handleBackup} title="Descargar copia de seguridad">
            <Download size={15} /> Backup
          </button>
          <button type="button" className="header-btn" disabled={backupBusy} onClick={() => fileInputRef.current?.click()} title="Importar copia de seguridad">
            <Upload size={15} /> Importar
          </button>
          <button type="button" className="header-btn" onClick={() => signOut()} title="Cerrar sesión">
            <LogOut size={15} /> Salir
          </button>
        </div>
      </div>

      {/* Saldos */}
      <div className="dash-accounts">
        {accountsOrdered.map((a) => (
          <div
            key={a.id}
            className={`dash-account-card ${a.currency.toLowerCase()}`}
            onClick={() => { setAdjustingAccount(a); setNewBalance(String(a.balance)); setAdjustComment(''); }}
            title="Click para ajustar saldo"
          >
            <span className="dash-acct-name">{a.name}</span>
            <span className="dash-acct-balance">
              {a.currency === 'ARS' ? '$' : 'US$'}{fmt(Number(a.balance))}
            </span>
            {a.currency === 'USD' && promedio > 0 && (
              <span className="dash-acct-equiv">= ${fmt(Number(a.balance) * promedio)}</span>
            )}
          </div>
        ))}
      </div>

      {/* Totales */}
      <div className="dash-totals">
        <div className="dash-total">
          <Wallet size={18} />
          <div>
            <span className="dt-label">Total Pesos</span>
            <span className="dt-value">${fmt(totalArs)}</span>
            {meDebenArs !== 0 && <span className="dt-sub">Sin deuda: ${fmt(totalArsSinDeuda)}</span>}
          </div>
        </div>
        <div className="dash-total">
          <DollarSign size={18} />
          <div>
            <span className="dt-label">Total Dolares</span>
            <span className="dt-value">US${fmt(totalUsd)}</span>
            <span className="dt-sub">Sin deuda: US${fmt(totalUsdSinDeuda)}</span>
          </div>
        </div>
        {promedio > 0 && (
          <>
            <div className="dash-total accent">
              <div>
                <span className="dt-label">Dinero Total (ARS)</span>
                <span className="dt-value">${fmt(totalEnPesos)}</span>
                <span className="dt-sub">Sin deuda: ${fmt(totalEnPesosSinDeuda)}</span>
              </div>
            </div>
            <div className="dash-total accent">
              <div>
                <span className="dt-label">Dinero Total (USD)</span>
                <span className="dt-value">US${fmt(totalEnDolares)}</span>
                <span className="dt-sub">Sin deuda: US${fmt(totalEnDolaresSinDeuda)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Botones de accion */}
      <div className="dash-actions">
        <button className="action-btn ingreso" onClick={() => setModal('ingreso')}>
          <TrendingUp size={22} />
          <span>Ingreso</span>
        </button>
        <button className="action-btn gasto" onClick={() => setModal('gasto')}>
          <TrendingDown size={22} />
          <span>Gasto</span>
        </button>
        <button className="action-btn transfer" onClick={() => setModal('transfer')}>
          <ArrowLeftRight size={22} />
          <span>Transferencia</span>
        </button>
        <button className="action-btn dolares" onClick={() => setModal('dolares')}>
          <DollarSign size={22} />
          <span>Dolares</span>
        </button>
        <button className="action-btn historial" onClick={() => setModal('historial')}>
          <History size={22} />
          <span>Historial</span>
        </button>
        <button className="action-btn deudas" onClick={() => setModal('deudas')}>
          <HandCoins size={22} />
          <span>Deudas</span>
        </button>
      </div>

      {/* Metricas inline */}
      <div className="dash-metrics-section">
        <div className="dash-metrics-header">
          <h2><BarChart3 size={20} /> Metricas</h2>
        </div>

        {/* Filtros */}
        <div className="filters-bar compact">
          <Filter size={14} />
          <label>
            Desde
            <input type="date" value={filters.desde || ''} onChange={(e) => updateFilter('desde', e.target.value)} />
          </label>
          <label>
            Hasta
            <input type="date" value={filters.hasta || ''} onChange={(e) => updateFilter('hasta', e.target.value)} />
          </label>
          <label>
            Categorias
            <select
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                const current = filters.categories ? filters.categories.split(',').filter(Boolean) : [];
                if (!current.includes(v)) updateFilter('categories', [...current, v].join(','));
              }}
            >
              <option value="">+ Agregar...</option>
              {filterOpts?.categories
                .filter((c) => !(filters.categories || '').split(',').includes(c))
                .map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          {filters.categories && (
            <div className="cat-chips" style={{ marginBottom: '0.4rem' }}>
              {filters.categories.split(',').filter(Boolean).map((c) => (
                <span key={c} className="cat-chip selected" onClick={() => {
                  const next = filters.categories!.split(',').filter((x) => x && x !== c).join(',');
                  updateFilter('categories', next);
                }}>
                  {c} <X size={11} />
                </span>
              ))}
            </div>
          )}
          {hasFilters && (
            <button className="clear-filters" onClick={clearFilters}><X size={12} /> Limpiar</button>
          )}
        </div>

        {metricsLoading && <p className="loading">Actualizando...</p>}

        {metrics && !metricsLoading && (
          <>
            {/* Aclaracion de conversion */}
            {promedio > 0 && (
              <p className="conversion-hint">
                Todos los valores estan en pesos. USD convertido a tasa promedio del Blue: ${fmt(promedio)}
              </p>
            )}

            {/* Resumen total en ARS */}
            <div className="metrics-grid-4">
              <div className="metric-card green">
                <span className="metric-label">Ingresos Totales</span>
                <span className="metric-value">${fmt(totalIngresosArs)}</span>
              </div>
              <div className="metric-card red">
                <span className="metric-label">Gastos Totales</span>
                <span className="metric-value">${fmt(totalGastosArs)}</span>
              </div>
              <div className={`metric-card ${balanceArs >= 0 ? 'green' : 'red'}`}>
                <span className="metric-label">Balance Neto</span>
                <span className="metric-value">${fmt(balanceArs)}</span>
              </div>
              <div className={`metric-card ${tasaAhorro >= 0 ? 'yellow' : 'red'}`}>
                <span className="metric-label">Tasa de Ahorro</span>
                <span className="metric-value">{tasaAhorro.toFixed(1)}%</span>
              </div>
            </div>

            {/* Bar Chart: Ingresos vs Gastos por mes */}
            {monthlyChartData.length > 0 && (
              <div className="chart-card">
                <h4 className="chart-title">Ingresos vs Gastos por Mes</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2e3244" />
                    <XAxis dataKey="month" stroke="#8b8d9e" style={{ fontSize: '0.75rem' }} />
                    <YAxis stroke="#8b8d9e" style={{ fontSize: '0.75rem' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: '#1a1d27', border: '1px solid #2e3244', borderRadius: 8 }}
                      formatter={(v) => `$${fmt(Number(v))}`}
                    />
                    <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                    <Bar dataKey="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Line chart: Balance acumulado */}
            {monthlyChartData.length > 1 && (
              <div className="chart-card">
                <h4 className="chart-title">Balance Mensual (Tendencia)</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2e3244" />
                    <XAxis dataKey="month" stroke="#8b8d9e" style={{ fontSize: '0.75rem' }} />
                    <YAxis stroke="#8b8d9e" style={{ fontSize: '0.75rem' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: '#1a1d27', border: '1px solid #2e3244', borderRadius: 8 }}
                      formatter={(v) => `$${fmt(Number(v))}`}
                    />
                    <Line type="monotone" dataKey="Balance" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="charts-row">
              {/* Pie Chart: Gastos por categoria */}
              {gastosCatData.length > 0 && (
                <div className="chart-card half">
                  <h4 className="chart-title">Gastos por Categoria <span className="chart-hint">(click para ver transacciones)</span></h4>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={gastosCatData.slice(0, 8)}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        innerRadius={45}
                        paddingAngle={2}
                        onClick={(d) => d?.name && setDrilldown({ category: String(d.name), type: 'GASTO' })}
                        style={{ cursor: 'pointer' }}
                      >
                        {gastosCatData.slice(0, 8).map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1a1d27', border: '1px solid #2e3244', borderRadius: 8 }}
                        formatter={(v) => `$${fmt(Number(v))}`}
                      />
                      <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="cat-clickable-list">
                    {gastosCatData.slice(0, 8).map((c) => (
                      <li key={c.name} onClick={() => setDrilldown({ category: c.name, type: 'GASTO' })}>
                        <span>{c.name}</span>
                        <strong>${fmt(c.value)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pie Chart: Ingresos por categoria */}
              {ingresosCatData.length > 0 && (
                <div className="chart-card half">
                  <h4 className="chart-title">Fuentes de Ingreso <span className="chart-hint">(click para ver transacciones)</span></h4>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={ingresosCatData.slice(0, 8)}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        innerRadius={45}
                        paddingAngle={2}
                        onClick={(d) => d?.name && setDrilldown({ category: String(d.name), type: 'INGRESO' })}
                        style={{ cursor: 'pointer' }}
                      >
                        {ingresosCatData.slice(0, 8).map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1a1d27', border: '1px solid #2e3244', borderRadius: 8 }}
                        formatter={(v) => `$${fmt(Number(v))}`}
                      />
                      <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="cat-clickable-list">
                    {ingresosCatData.slice(0, 8).map((c) => (
                      <li key={c.name} onClick={() => setDrilldown({ category: c.name, type: 'INGRESO' })}>
                        <span>{c.name}</span>
                        <strong>${fmt(c.value)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Bar chart horizontal: Movimientos por cuenta */}
            {cuentaChartData.length > 0 && (
              <div className="chart-card">
                <h4 className="chart-title">Movimientos por Cuenta</h4>
                <ResponsiveContainer width="100%" height={cuentaChartData.length * 50 + 60}>
                  <BarChart data={cuentaChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#2e3244" />
                    <XAxis type="number" stroke="#8b8d9e" style={{ fontSize: '0.7rem' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="name" type="category" stroke="#8b8d9e" style={{ fontSize: '0.7rem' }} width={100} />
                    <Tooltip
                      contentStyle={{ background: '#1a1d27', border: '1px solid #2e3244', borderRadius: 8 }}
                      formatter={(v) => `$${fmt(Number(v))}`}
                    />
                    <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                    <Bar dataKey="Ingresos" fill="#22c55e" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Gastos" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modales */}
      <Modal open={modal === 'ingreso'} onClose={closeAndRefresh} title="Nuevo Ingreso">
        <TransactionForm onSubmit={handleIngreso} submitLabel="Registrar Ingreso" type="INGRESO" />
      </Modal>
      <Modal open={modal === 'gasto'} onClose={closeAndRefresh} title="Nuevo Gasto">
        <TransactionForm onSubmit={handleGasto} submitLabel="Registrar Gasto" type="GASTO" />
      </Modal>
      <Modal open={modal === 'transfer'} onClose={closeAndRefresh} title="Nueva Transferencia">
        <TransferForm />
      </Modal>
      <Modal open={modal === 'dolares'} onClose={closeAndRefresh} title="Compra / Venta de Dolares">
        <DolaresForm />
      </Modal>
      <Modal open={modal === 'historial'} onClose={() => setModal(null)} title="Historial" wide>
        <HistorialView />
      </Modal>
      <Modal open={modal === 'deudas'} onClose={closeAndRefresh} title="Gestor de Deudas" wide>
        <DeudasView onChange={() => { loadAccounts(); loadMetrics(filters); }} />
      </Modal>

      {/* Modal de transacciones por categoria */}
      <Modal
        open={drilldown !== null}
        onClose={() => setDrilldown(null)}
        title={drilldown ? `${drilldown.type === 'INGRESO' ? 'Ingresos' : 'Gastos'} de "${drilldown.category}"` : ''}
        wide
      >
        {drilldown && (
          <CategoryTransactionsView
            category={drilldown.category}
            type={drilldown.type}
            desde={filters.desde}
            hasta={filters.hasta}
          />
        )}
      </Modal>

      {/* Modal de ajuste de saldo */}
      <Modal
        open={adjustingAccount !== null}
        onClose={() => setAdjustingAccount(null)}
        title={adjustingAccount ? `Ajustar saldo - ${adjustingAccount.name}` : ''}
      >
        {adjustingAccount && (
          <form
            className="form-card"
            onSubmit={async (e) => {
              e.preventDefault();
              if (savingAdjust) return;
              setSavingAdjust(true);
              try {
                await adjustAccountBalance(
                  adjustingAccount.id,
                  parseFloat(newBalance),
                  adjustComment || undefined,
                );
                toast.success('Saldo ajustado');
                setAdjustingAccount(null);
                loadAccounts();
                loadMetrics(filters);
              } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : 'Error al ajustar');
              } finally {
                setSavingAdjust(false);
              }
            }}
          >
            <div className="receipt-row">
              <span>Saldo actual</span>
              <strong>
                {adjustingAccount.currency === 'USD' ? 'US$' : '$'}{fmt(Number(adjustingAccount.balance))}
              </strong>
            </div>
            <label>
              Nuevo saldo
              <input
                type="number"
                step="0.01"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                required
              />
            </label>
            <label>
              Comentario (opcional)
              <input
                type="text"
                value={adjustComment}
                onChange={(e) => setAdjustComment(e.target.value)}
                placeholder="Motivo del ajuste"
              />
            </label>
            {newBalance && !isNaN(parseFloat(newBalance)) && (
              <div className="preview">
                Diferencia: {parseFloat(newBalance) - Number(adjustingAccount.balance) >= 0 ? '+' : ''}
                {fmt(parseFloat(newBalance) - Number(adjustingAccount.balance))}
              </div>
            )}
            <button type="submit" disabled={savingAdjust}>
              {savingAdjust ? 'Procesando...' : 'Confirmar ajuste'}
            </button>
            {!adjustingAccount.name.startsWith('ME DEBEN') && (
              <button
                type="button"
                disabled={savingAdjust}
                onClick={async () => {
                  if (!confirm(`¿Eliminar la cuenta "${adjustingAccount.name}"? Esta acción no se puede deshacer.`)) return;
                  try {
                    await deleteAccount(adjustingAccount.id);
                    toast.success('Cuenta eliminada');
                    setAdjustingAccount(null);
                    loadAccounts();
                    loadMetrics(filters);
                  } catch (err: unknown) {
                    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                    toast.error(typeof msg === 'string' ? msg : 'No se pudo eliminar la cuenta');
                  }
                }}
                style={{ background: 'transparent', color: 'var(--red)', border: '1px solid var(--red)', marginTop: '0.5rem' }}
              >
                <Trash2 size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Eliminar cuenta
              </button>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}
