import { useEffect, useState, useCallback } from 'react';
import { getAnalytics, getFilterOptions } from '../api';
import type { AnalyticsSummary, AnalyticsFilters, FilterOptions } from '../api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Filter, X } from 'lucide-react';

const fmt = (n: number) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtMonth = (m: string) => {
  const [year, month] = m.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1);
  return format(d, 'MMM yyyy', { locale: es });
};

export default function Metricas() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const now = new Date();
  const mesActualDesde = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const mesActualHasta = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [filters, setFilters] = useState<AnalyticsFilters>({ desde: mesActualDesde, hasta: mesActualHasta });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback((f: AnalyticsFilters) => {
    setLoading(true);
    const cleanFilters = Object.fromEntries(
      Object.entries(f).filter(([, v]) => v !== '' && v !== undefined)
    );
    getAnalytics(cleanFilters as AnalyticsFilters)
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getFilterOptions().then(setOptions);
    fetchData({ desde: mesActualDesde, hasta: mesActualHasta });
  }, [fetchData, mesActualDesde, mesActualHasta]);

  const updateFilter = (key: keyof AnalyticsFilters, value: string) => {
    const next = { ...filters, [key]: value || undefined };
    setFilters(next);
    fetchData(next);
  };

  const clearFilters = () => {
    const defaults = { desde: mesActualDesde, hasta: mesActualHasta };
    setFilters(defaults);
    fetchData(defaults);
  };

  const hasFilters = Object.values(filters).some((v) => v);

  if (!data && loading) return <p className="loading">Cargando metricas...</p>;

  const maxBar = data ? Math.max(...data.monthlyData.map((m) => Math.max(m.gastos, m.ingresos)), 1) : 1;
  const totalGastoCat = data ? data.gastosPorCategoria.reduce((s, c) => s + parseFloat(c.total), 0) : 0;

  return (
    <div className="page metricas">
      <h2>Metricas</h2>

      {/* Filtros */}
      <div className="filters-bar">
        <Filter size={16} />
        <label>
          Desde
          <input
            type="date"
            value={filters.desde || ''}
            onChange={(e) => updateFilter('desde', e.target.value)}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={filters.hasta || ''}
            onChange={(e) => updateFilter('hasta', e.target.value)}
          />
        </label>
        <label>
          Categoria
          <select
            value={filters.category || ''}
            onChange={(e) => updateFilter('category', e.target.value)}
          >
            <option value="">Todas</option>
            {options?.categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        {hasFilters && (
          <button className="clear-filters" onClick={clearFilters}>
            <X size={14} /> Limpiar
          </button>
        )}
      </div>

      {loading && <p className="loading">Actualizando...</p>}

      {data && !loading && (
        <>
          {/* Resumen general */}
          <div className="metrics-grid-3">
            <div className="metric-card green">
              <span className="metric-label">Total Ingresos</span>
              <span className="metric-value">${fmt(data.totales.ingresos)}</span>
            </div>
            <div className="metric-card red">
              <span className="metric-label">Total Gastos</span>
              <span className="metric-value">${fmt(data.totales.gastos)}</span>
            </div>
            <div className={`metric-card ${data.totales.balance >= 0 ? 'green' : 'red'}`}>
              <span className="metric-label">Balance Neto</span>
              <span className="metric-value">${fmt(data.totales.balance)}</span>
            </div>
          </div>

          {/* Gasto diario promedio */}
          <div className="metrics-grid-2">
            <div className="metric-card yellow">
              <span className="metric-label">Gasto Diario Promedio (30 dias)</span>
              <span className="metric-value">${fmt(data.gastoDiario.ultimos30d)}</span>
              <span className="metric-sub">= ${fmt(data.gastoDiario.ultimos30d * 30)}/mes</span>
            </div>
            <div className="metric-card yellow">
              <span className="metric-label">Gasto Diario Promedio (90 dias)</span>
              <span className="metric-value">${fmt(data.gastoDiario.ultimos90d)}</span>
              <span className="metric-sub">= ${fmt(data.gastoDiario.ultimos90d * 30)}/mes</span>
            </div>
          </div>

          {/* Ingresos vs Gastos por mes */}
          <h3>Ingresos vs Gastos por Mes</h3>
          <div className="chart-container">
            {data.monthlyData.map((m) => (
              <div key={m.month} className="chart-row">
                <span className="chart-label">{fmtMonth(m.month)}</span>
                <div className="chart-bars">
                  <div className="bar-group">
                    <div
                      className="bar bar-income"
                      style={{ width: `${(m.ingresos / maxBar) * 100}%` }}
                    >
                      <span className="bar-text">${fmt(m.ingresos)}</span>
                    </div>
                    <div
                      className="bar bar-expense"
                      style={{ width: `${(m.gastos / maxBar) * 100}%` }}
                    >
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

          {/* Tasa de ahorro por mes */}
          <h3>Tasa de Ahorro Mensual</h3>
          <div className="savings-grid">
            {data.monthlyData.map((m) => (
              <div key={m.month} className={`savings-card ${m.ahorro >= 0 ? 'positive' : 'negative'}`}>
                <span className="savings-month">{fmtMonth(m.month)}</span>
                <span className="savings-rate">{m.ahorro.toFixed(1)}%</span>
                <span className="savings-detail">
                  {m.ahorro >= 20
                    ? 'Excelente'
                    : m.ahorro >= 10
                      ? 'Bueno'
                      : m.ahorro >= 0
                        ? 'Ajustado'
                        : 'Deficit'}
                </span>
              </div>
            ))}
          </div>

          {/* Gastos por categoría */}
          <h3>Gastos por Categoria</h3>
          <div className="category-list">
            {data.gastosPorCategoria.map((c) => {
              const pct = totalGastoCat > 0 ? (parseFloat(c.total) / totalGastoCat) * 100 : 0;
              return (
                <div key={c.category} className="category-row clickable" onClick={() => updateFilter('category', c.category)}>
                  <div className="category-info">
                    <span className="category-name">{c.category}</span>
                    <span className="category-count">{c.count} movimientos</span>
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

          {/* Gastos recurrentes */}
          <h3>Gastos Recurrentes (3+ meses)</h3>
          <p className="section-hint">Gastos que se repiten mes a mes. Aca esta tu oportunidad de recortar.</p>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Meses</th>
                  <th>Promedio/mes</th>
                  <th>Total Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {data.categoriasRecurrentes.map((r) => (
                  <tr key={r.category} className="clickable" onClick={() => updateFilter('category', r.category)}>
                    <td>{r.category}</td>
                    <td>{r.meses}</td>
                    <td>${fmt(r.promedio)}</td>
                    <td className="amount">${fmt(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Ingresos por categoría */}
          <h3>Fuentes de Ingreso</h3>
          <div className="category-list">
            {data.ingresosPorCategoria.map((c) => {
              const total = data.ingresosPorCategoria.reduce((s, x) => s + parseFloat(x.total), 0);
              const pct = total > 0 ? (parseFloat(c.total) / total) * 100 : 0;
              return (
                <div key={c.category} className="category-row clickable" onClick={() => updateFilter('category', c.category)}>
                  <div className="category-info">
                    <span className="category-name">{c.category}</span>
                    <span className="category-count">{c.count} movimientos</span>
                  </div>
                  <div className="category-bar-wrapper">
                    <div className="category-bar income" style={{ width: `${pct}%` }}></div>
                  </div>
                  <div className="category-values">
                    <span className="category-total">${fmt(parseFloat(c.total))}</span>
                    <span className="category-pct">{pct.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Movimientos por cuenta */}
          <h3>Movimientos por Cuenta</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Cuenta</th>
                  <th>Ingresos</th>
                  <th>Mov.</th>
                  <th>Gastos</th>
                  <th>Mov.</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.movimientosPorCuenta.map((c) => (
                  <tr key={c.account}>
                    <td><strong>{c.account}</strong></td>
                    <td className="amount" style={{ color: 'var(--green)' }}>${fmt(c.ingresos)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.ingCount}</td>
                    <td className="amount" style={{ color: 'var(--red)' }}>${fmt(c.gastos)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.gasCount}</td>
                    <td className="amount" style={{ color: c.balance >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {c.balance >= 0 ? '+' : ''}{fmt(c.balance)}
                    </td>
                  </tr>
                ))}
                {data.movimientosPorCuenta.length > 1 && (
                  <tr style={{ borderTop: '2px solid var(--border)' }}>
                    <td><strong>TOTAL</strong></td>
                    <td className="amount" style={{ color: 'var(--green)' }}>
                      ${fmt(data.movimientosPorCuenta.reduce((s, c) => s + c.ingresos, 0))}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {data.movimientosPorCuenta.reduce((s, c) => s + c.ingCount, 0)}
                    </td>
                    <td className="amount" style={{ color: 'var(--red)' }}>
                      ${fmt(data.movimientosPorCuenta.reduce((s, c) => s + c.gastos, 0))}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {data.movimientosPorCuenta.reduce((s, c) => s + c.gasCount, 0)}
                    </td>
                    <td className="amount" style={{ color: data.movimientosPorCuenta.reduce((s, c) => s + c.balance, 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {data.movimientosPorCuenta.reduce((s, c) => s + c.balance, 0) >= 0 ? '+' : ''}
                      {fmt(data.movimientosPorCuenta.reduce((s, c) => s + c.balance, 0))}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Top gastos */}
          <h3>Top 10 Gastos mas Grandes</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th>Categoria</th>
                  <th>Comentario</th>
                  <th>Cuenta</th>
                </tr>
              </thead>
              <tbody>
                {data.topGastos.map((g, i) => (
                  <tr key={i}>
                    <td>{format(new Date(g.date), 'dd/MM/yyyy')}</td>
                    <td className="amount">${fmt(g.amount)}</td>
                    <td>{g.category || '-'}</td>
                    <td>{g.comment || '-'}</td>
                    <td>{g.account}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
