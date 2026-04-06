import { useEffect, useState } from 'react';
import { getAccounts, getDollarRate } from '../api';
import type { Account, DollarRate } from '../api';
import { Wallet, DollarSign, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [rate, setRate] = useState<DollarRate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAccounts(), getDollarRate()])
      .then(([accts, r]) => {
        setAccounts(accts);
        setRate(r);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading">Cargando...</p>;

  const arsAccounts = accounts.filter((a) => a.currency === 'ARS');
  const usdAccounts = accounts.filter((a) => a.currency === 'USD');
  const totalArs = arsAccounts.reduce((s, a) => s + Number(a.balance), 0);
  const totalUsd = usdAccounts.reduce((s, a) => s + Number(a.balance), 0);
  const promedio = rate?.promedio || 0;
  const usdToArs = totalUsd * promedio;
  const totalEnPesos = totalArs + usdToArs;
  const totalEnDolares = totalUsd + (promedio ? totalArs / promedio : 0);

  const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="page">
      <h2>Dashboard</h2>

      {/* Cotizacion dolar */}
      {rate && rate.promedio > 0 && (
        <div className="dollar-rate-bar">
          <TrendingUp size={18} />
          <span>Dolar Blue Cordoba:</span>
          <span className="rate-value">Compra ${fmt(rate.compra)}</span>
          <span className="rate-value">Venta ${fmt(rate.venta)}</span>
          <span className="rate-value highlight">Promedio ${fmt(rate.promedio)}</span>
        </div>
      )}

      {/* Totales generales */}
      <div className="totals-row">
        <div className="total-card ars">
          <Wallet size={24} />
          <div>
            <span className="total-label">Total Pesos</span>
            <span className="total-value">${fmt(totalArs)}</span>
          </div>
        </div>
        <div className="total-card usd">
          <DollarSign size={24} />
          <div>
            <span className="total-label">Total Dolares</span>
            <span className="total-value">US${fmt(totalUsd)}</span>
          </div>
        </div>
      </div>

      {/* Equivalencias */}
      {promedio > 0 && (
        <div className="totals-row">
          <div className="total-card equiv">
            <div>
              <span className="total-label">Total en Pesos (real)</span>
              <span className="total-value">${fmt(totalEnPesos)}</span>
            </div>
          </div>
          <div className="total-card equiv">
            <div>
              <span className="total-label">Total en Dolares (real)</span>
              <span className="total-value">US${fmt(totalEnDolares)}</span>
            </div>
          </div>
          <div className="total-card equiv">
            <div>
              <span className="total-label">USD a ARS</span>
              <span className="total-value">${fmt(usdToArs)}</span>
            </div>
          </div>
        </div>
      )}

      <h3>Cuentas</h3>
      <div className="accounts-grid">
        {accounts.map((a) => (
          <div key={a.id} className={`account-card ${a.currency.toLowerCase()}`}>
            <span className="account-name">{a.name}</span>
            <span className="account-balance">
              {a.currency === 'ARS' ? '$' : 'US$'}
              {fmt(Number(a.balance))}
            </span>
            {a.currency === 'USD' && promedio > 0 && (
              <span className="account-equiv">
                = ${fmt(Number(a.balance) * promedio)} ARS
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
