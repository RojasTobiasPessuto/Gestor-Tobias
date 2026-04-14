import { useEffect, useState } from 'react';
import { getTransactions } from '../api';
import type { Transaction } from '../api';
import { formatDateDisplay } from '../utils/date';

interface Props {
  category: string;
  desde?: string;
  hasta?: string;
  type?: 'INGRESO' | 'GASTO';
}

const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CategoryTransactionsView({ category, desde, hasta, type }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getTransactions(type, [category], desde, hasta)
      .then(setTransactions)
      .finally(() => setLoading(false));
  }, [category, desde, hasta, type]);

  if (loading) return <p className="loading">Cargando...</p>;
  if (transactions.length === 0) return <p className="empty">No hay transacciones para esta categoria</p>;

  // Totales por moneda
  const totalArs = transactions.filter((t) => t.account?.currency === 'ARS').reduce((s, t) => s + Number(t.amount), 0);
  const totalUsd = transactions.filter((t) => t.account?.currency === 'USD').reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div>
      {/* Resumen */}
      <div className="metrics-grid-3" style={{ marginBottom: '1rem' }}>
        <div className="metric-card">
          <span className="metric-label">Cantidad</span>
          <span className="metric-value">{transactions.length}</span>
        </div>
        {totalArs > 0 && (
          <div className="metric-card green">
            <span className="metric-label">Total ARS</span>
            <span className="metric-value">${fmt(totalArs)}</span>
          </div>
        )}
        {totalUsd > 0 && (
          <div className="metric-card green">
            <span className="metric-label">Total USD</span>
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
              <th>Otras categorias</th>
              <th>Comentario</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const sym = tx.account?.currency === 'USD' ? 'US$' : '$';
              const otherCats = (tx.categories || []).filter((c) => c !== category);
              return (
                <tr key={tx.id}>
                  <td>{formatDateDisplay(tx.date)}</td>
                  <td className="amount">{tx.type === 'GASTO' ? '-' : ''}{sym}{fmt(Number(tx.amount))}</td>
                  <td>{tx.account?.name}</td>
                  <td>
                    {otherCats.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
                        {otherCats.map((c) => <span key={c} className="cat-chip-small">{c}</span>)}
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
