import { useEffect, useState, useCallback } from 'react';
import { getAccounts, getDollarRate, createTransaction, getAnalytics, getFilterOptions } from '../api';
import type { Account, DollarRate, AnalyticsSummary, AnalyticsFilters, FilterOptions } from '../api';
import {
  Wallet, DollarSign, TrendingUp, TrendingDown,
  ArrowLeftRight, History, BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import TransactionForm from '../components/TransactionForm';
import TransferForm from '../components/TransferForm';
import DolaresForm from '../components/DolaresForm';
import HistorialView from '../components/HistorialView';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Filter, X } from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtMonth = (m: string) => {
  const [y, mo] = m.split('-');
  return format(new Date(parseInt(y), parseInt(mo) - 1), 'MMM yyyy', { locale: es });
};

type ModalType = 'ingreso' | 'gasto' | 'transfer' | 'dolares' | 'historial' | 'metricas' | null;

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [rate, setRate] = useState<DollarRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalType>(null);

  // Metrics state
  const [metrics, setMetrics] = useState<AnalyticsSummary | null>(null);
  const [filterOpts, setFilterOpts] = useState<FilterOptions | null>(null);
  const now = new Date();
  const mesDesde = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const mesHasta = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
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

  const handleIngreso = async (data: { amount: number; account_id: number; category: string; comment: string; date: string }) => {
    await createTransaction({ type: 'INGRESO', ...data });
    toast.success('Ingreso registrado');
    loadAccounts();
    loadMetrics(filters);
  };

  const handleGasto = async (data: { amount: number; account_id: number; category: string; comment: string; date: string }) => {
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

  if (loading) return <p className="loading">Cargando...</p>;

  const arsAccounts = accounts.filter((a) => a.currency === 'ARS');
  const usdAccounts = accounts.filter((a) => a.currency === 'USD');
  const totalArs = arsAccounts.reduce((s, a) => s + Number(a.balance), 0);
  const totalUsd = usdAccounts.reduce((s, a) => s + Number(a.balance), 0);
  const promedio = rate?.promedio || 0;
  const totalEnPesos = totalArs + totalUsd * promedio;
  const totalEnDolares = totalUsd + (promedio ? totalArs / promedio : 0);
  const hasFilters = Object.values(filters).some((v) => v);

  const maxBar = metrics ? Math.max(...metrics.monthlyData.map((m) => Math.max(m.gastos, m.ingresos)), 1) : 1;
  const totalGastoCat = metrics ? metrics.gastosPorCategoria.reduce((s, c) => s + parseFloat(c.total), 0) : 0;

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
      </div>

      {/* Saldos */}
      <div className="dash-accounts">
        {accounts.map((a) => (
          <div key={a.id} className={`dash-account-card ${a.currency.toLowerCase()}`}>
            <span className="dash-acct-name">{a.name}</span>
            <span className="dash-acct-balance">
              {a.currency === 'ARS' ? '$' : 'US$'}{fmt(Number(a.balance))}
            </span>
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
          </div>
        </div>
        <div className="dash-total">
          <DollarSign size={18} />
          <div>
            <span className="dt-label">Total Dolares</span>
            <span className="dt-value">US${fmt(totalUsd)}</span>
          </div>
        </div>
        {promedio > 0 && (
          <>
            <div className="dash-total accent">
              <div>
                <span className="dt-label">Total en Pesos</span>
                <span className="dt-value">${fmt(totalEnPesos)}</span>
              </div>
            </div>
            <div className="dash-total accent">
              <div>
                <span className="dt-label">Total en Dolares</span>
                <span className="dt-value">US${fmt(totalEnDolares)}</span>
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
            Categoria
            <select value={filters.category || ''} onChange={(e) => updateFilter('category', e.target.value)}>
              <option value="">Todas</option>
              {filterOpts?.categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          {hasFilters && (
            <button className="clear-filters" onClick={clearFilters}><X size={12} /> Limpiar</button>
          )}
        </div>

        {metricsLoading && <p className="loading">Actualizando...</p>}

        {metrics && !metricsLoading && (
          <>
            {/* Resumen */}
            <div className="metrics-grid-3">
              <div className="metric-card green">
                <span className="metric-label">Ingresos</span>
                <span className="metric-value">${fmt(metrics.totales.ingresos)}</span>
              </div>
              <div className="metric-card red">
                <span className="metric-label">Gastos</span>
                <span className="metric-value">${fmt(metrics.totales.gastos)}</span>
              </div>
              <div className={`metric-card ${metrics.totales.balance >= 0 ? 'green' : 'red'}`}>
                <span className="metric-label">Balance</span>
                <span className="metric-value">${fmt(metrics.totales.balance)}</span>
              </div>
            </div>

            {/* Ingresos vs Gastos por mes */}
            {metrics.monthlyData.length > 0 && (
              <div className="chart-container">
                {metrics.monthlyData.map((m) => (
                  <div key={m.month} className="chart-row">
                    <span className="chart-label">{fmtMonth(m.month)}</span>
                    <div className="chart-bars">
                      <div className="bar-group">
                        <div className="bar bar-income" style={{ width: `${(m.ingresos / maxBar) * 100}%` }}>
                          <span className="bar-text">${fmt(m.ingresos)}</span>
                        </div>
                        <div className="bar bar-expense" style={{ width: `${(m.gastos / maxBar) * 100}%` }}>
                          <span className="bar-text">${fmt(m.gastos)}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`chart-balance ${m.balance >= 0 ? 'positive' : 'negative'}`}>
                      {m.balance >= 0 ? '+' : ''}{fmt(m.balance)}
                    </span>
                  </div>
                ))}
                <div className="chart-legend">
                  <span><span className="dot green-dot"></span> Ingresos</span>
                  <span><span className="dot red-dot"></span> Gastos</span>
                </div>
              </div>
            )}

            {/* Gastos por categoria */}
            {metrics.gastosPorCategoria.length > 0 && (
              <div className="category-list">
                {metrics.gastosPorCategoria.slice(0, 8).map((c) => {
                  const pct = totalGastoCat > 0 ? (parseFloat(c.total) / totalGastoCat) * 100 : 0;
                  return (
                    <div key={c.category} className="category-row">
                      <div className="category-info">
                        <span className="category-name">{c.category}</span>
                        <span className="category-count">{c.count} mov.</span>
                      </div>
                      <div className="category-bar-wrapper">
                        <div className="category-bar" style={{ width: `${pct}%` }}></div>
                      </div>
                      <div className="category-values">
                        <span className="category-total">${fmt(parseFloat(c.total))}</span>
                        <span className="category-pct">{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Movimientos por cuenta */}
            {metrics.movimientosPorCuenta.length > 0 && (
              <div className="table-wrapper" style={{ marginTop: '1rem' }}>
                <table>
                  <thead>
                    <tr><th>Cuenta</th><th>Ingresos</th><th>Gastos</th><th>Balance</th></tr>
                  </thead>
                  <tbody>
                    {metrics.movimientosPorCuenta.map((c) => (
                      <tr key={c.account}>
                        <td><strong>{c.account}</strong></td>
                        <td className="amount" style={{ color: 'var(--green)' }}>${fmt(c.ingresos)}</td>
                        <td className="amount" style={{ color: 'var(--red)' }}>${fmt(c.gastos)}</td>
                        <td className="amount" style={{ color: c.balance >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {c.balance >= 0 ? '+' : ''}{fmt(c.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
    </div>
  );
}
