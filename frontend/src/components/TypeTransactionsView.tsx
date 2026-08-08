import { useEffect, useState } from 'react';
import { getTransactions } from '../api';
import type { Transaction } from '../api';
import { formatDateDisplay } from '../utils/date';

interface Props {
  type: 'INGRESO' | 'GASTO';
  desde?: string;
  hasta?: string;
  categories?: string[];
  rate?: number; // tasa del dolar para mostrar el total convertido a ARS
}

const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function TypeTransactionsView({ type, desde, hasta, categories, rate }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const catKey = categories && categories.length ? categories.join(',') : '';

  useEffect(() => {
    setLoading(true);
    const cats = catKey ? catKey.split(',') : undefined;
    getTransactions(type, cats, desde, hasta)
      .then(setTransactions)
      .finally(() => setLoading(false));
  }, [type, desde, hasta, catKey]);

  if (loading) return <p className="loading">Cargando...</p>;
  if (transactions.length === 0) return <p className="empty">No hay transacciones en este perí­odo</p>;

  const totalArs = transactions.filter((t) => t.account?.currency === 'ARS').reduce((s, t) => s + Number(t.amount), 0);
  const totalUsd = transactions.filter((t) => t.account?.currency === 'USD').reduce((s, t) => s + Number(t.amount), 0);
  const totalConvertido = rate ? totalArs + totalUsd * rate : null;
  const color = type === 'INGRESO' ? 'green' : 'red';

  return (
    <div>
      <div className="metrics-grid-4" style={{ marginBottom: '1rem' }}>
        <div className="metric-card">
          <span className="metric-label">Cantidad</span>
          <span className="metric-value">{transactions.length}</span>
        </div>
        {totalConvertido !== null && (
          <div className={`metric-card ${color}`}>
            <span className="metric-label">Total (ARS)</span>
            <span className="metric-value">${fmt(totalConvertido)}</span>
          </div>
        )}
        {totalArs > 0 && (
          <div className={`metric-card ${color}`}>
            <span className="metric-label">En pesos</span>
            <span className="metric-value">${fmt(totalArs)}</span>
          </div>
        )}
        {totalUsd > 0 && (
          <div className={`metric-card ${color}`}>
            <span className="metric-label">En dólares</span>
            <span className="metric-value">US${fmt(totalUsd)}</span>
          </div>
        )}
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Monto</th>
              <th>Cuenta</th>
              <th>Categorías</th>
              <th>Comentario</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const sym = tx.account?.currency === 'USD' ? 'US$' : '$';
              return (
                <tr key={tx.id}>
                  <td>{formatDateDisplay(tx.date)}</td>
                  <td className="amount">{type === 'GASTO' ? '-' : ''}{sym}{fmt(Number(tx.amount))}</td>
                  <td>{tx.account?.name}</td>
                  <td>
                    {(tx.categories || []).length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
                        {(tx.categories || []).map((c) => <span key={c} className="cat-chip-small">{c}</span>)}
                      </div>
                    ) : '-'}
                  </td>
                  <td>{tx.comment ?? '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
