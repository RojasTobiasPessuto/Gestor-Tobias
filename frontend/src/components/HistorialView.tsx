import { useEffect, useState } from 'react';
import { getTransactions } from '../api';
import type { Transaction, TransactionType } from '../api';
import { format } from 'date-fns';

const typeLabels: Record<TransactionType, string> = {
  INGRESO: 'Ingreso', GASTO: 'Gasto', TRANSFERENCIA: 'Transferencia',
  VENTA_DOLARES: 'Venta USD', COMPRA_DOLARES: 'Compra USD',
};
const typeColors: Record<TransactionType, string> = {
  INGRESO: '#22c55e', GASTO: '#ef4444', TRANSFERENCIA: '#3b82f6',
  VENTA_DOLARES: '#f59e0b', COMPRA_DOLARES: '#8b5cf6',
};

export default function HistorialView() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<TransactionType | ''>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getTransactions(filter || undefined)
      .then(setTransactions)
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <div className="filter-bar">
        <select value={filter} onChange={(e) => setFilter(e.target.value as TransactionType | '')}>
          <option value="">Todos</option>
          {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {loading ? <p className="loading">Cargando...</p> : transactions.length === 0 ? <p className="empty">No hay transacciones</p> : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Fecha</th><th>Tipo</th><th>Monto</th><th>Cuenta</th><th>Destino</th><th>Categoria</th><th>Comentario</th></tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{format(new Date(tx.date), 'dd/MM/yyyy')}</td>
                  <td><span className="badge" style={{ backgroundColor: typeColors[tx.type] }}>{typeLabels[tx.type]}</span></td>
                  <td className="amount">{tx.type === 'GASTO' ? '-' : ''}{Number(tx.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                  <td>{tx.account?.name}</td>
                  <td>{tx.accountTo?.name ?? '-'}</td>
                  <td>{tx.category ?? '-'}</td>
                  <td>{tx.comment ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
