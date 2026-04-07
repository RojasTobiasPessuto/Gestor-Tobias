import { useEffect, useState } from 'react';
import { getTransactions, deleteTransaction, updateTransaction, getAccounts, getCategories } from '../api';
import type { Transaction, TransactionType, Account, CategoryItem } from '../api';
import { format } from 'date-fns';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

const typeLabels: Record<TransactionType, string> = {
  INGRESO: 'Ingreso', GASTO: 'Gasto', TRANSFERENCIA: 'Transferencia',
  VENTA_DOLARES: 'Venta USD', COMPRA_DOLARES: 'Compra USD',
};
const typeColors: Record<TransactionType, string> = {
  INGRESO: '#22c55e', GASTO: '#ef4444', TRANSFERENCIA: '#3b82f6',
  VENTA_DOLARES: '#f59e0b', COMPRA_DOLARES: '#8b5cf6',
};

interface EditState {
  amount: string;
  account_id: string;
  account_to_id: string;
  category: string;
  comment: string;
  exchangeRate: string;
  date: string;
}

export default function HistorialView() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [filter, setFilter] = useState<TransactionType | ''>('');
  const [catFilter, setCatFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);

  const load = () => {
    setLoading(true);
    getTransactions(filter || undefined, catFilter || undefined).then(setTransactions).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    getAccounts().then(setAccounts);
    getCategories().then(setCategories);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, catFilter]);

  // Reset categoria si cambia el tipo y la categoria seleccionada no aplica
  useEffect(() => {
    if (catFilter && filter) {
      const exists = categories.some((c) => c.name === catFilter && c.type === filter);
      if (!exists) setCatFilter('');
    }
  }, [filter, catFilter, categories]);

  const ingresoCats = categories.filter((c) => c.type === 'INGRESO');
  const gastoCats = categories.filter((c) => c.type === 'GASTO');

  const startEdit = (tx: Transaction) => {
    setEditId(tx.id);
    setEdit({
      amount: String(tx.amount),
      account_id: String(tx.account_id),
      account_to_id: tx.account_to_id ? String(tx.account_to_id) : '',
      category: tx.category || '',
      comment: tx.comment || '',
      exchangeRate: tx.exchangeRate ? String(tx.exchangeRate) : '',
      date: tx.date,
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEdit(null);
  };

  const saveEdit = async (tx: Transaction) => {
    if (!edit) return;
    try {
      await updateTransaction(tx.id, {
        type: tx.type,
        amount: parseFloat(edit.amount),
        account_id: parseInt(edit.account_id),
        account_to_id: edit.account_to_id ? parseInt(edit.account_to_id) : undefined,
        category: edit.category || undefined,
        comment: edit.comment || undefined,
        exchangeRate: edit.exchangeRate ? parseFloat(edit.exchangeRate) : undefined,
        date: edit.date,
      });
      toast.success('Transaccion actualizada');
      cancelEdit();
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al actualizar';
      toast.error(msg);
    }
  };

  const handleDelete = async (tx: Transaction) => {
    if (!confirm(`Eliminar esta transaccion?\n${typeLabels[tx.type]} - ${Number(tx.amount).toLocaleString('es-AR')}`)) return;
    try {
      await deleteTransaction(tx.id);
      toast.success('Transaccion eliminada y saldo revertido');
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al eliminar';
      toast.error(msg);
    }
  };

  return (
    <div>
      <div className="filter-bar" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value as TransactionType | '')}>
          <option value="">Todos los tipos</option>
          {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="">Todas las categorias</option>
          {filter === 'INGRESO' && ingresoCats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          {filter === 'GASTO' && gastoCats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          {!filter && (
            <>
              <optgroup label="Ingresos">
                {ingresoCats.map((c) => <option key={`i-${c.id}`} value={c.name}>{c.name}</option>)}
              </optgroup>
              <optgroup label="Gastos">
                {gastoCats.map((c) => <option key={`g-${c.id}`} value={c.name}>{c.name}</option>)}
              </optgroup>
            </>
          )}
          {filter && filter !== 'INGRESO' && filter !== 'GASTO' && null}
        </select>
      </div>
      {loading ? <p className="loading">Cargando...</p> : transactions.length === 0 ? <p className="empty">No hay transacciones</p> : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Fecha</th><th>Tipo</th><th>Monto</th><th>Cuenta</th><th>Destino</th>
                <th>Categoria</th><th>Comentario</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const isEditing = editId === tx.id && edit;
                const needsCat = tx.type === 'INGRESO' || tx.type === 'GASTO';
                const needsDest = tx.type !== 'INGRESO' && tx.type !== 'GASTO';
                const filteredCats = needsCat ? categories.filter((c) => c.type === tx.type) : [];
                return (
                  <tr key={tx.id}>
                    {isEditing && edit ? (
                      <>
                        <td><input className="edit-input" type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></td>
                        <td><span className="badge" style={{ backgroundColor: typeColors[tx.type] }}>{typeLabels[tx.type]}</span></td>
                        <td><input className="edit-input" type="number" step="0.01" value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} /></td>
                        <td>
                          <select className="edit-input" value={edit.account_id} onChange={(e) => setEdit({ ...edit, account_id: e.target.value })}>
                            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                        </td>
                        <td>
                          {needsDest ? (
                            <select className="edit-input" value={edit.account_to_id} onChange={(e) => setEdit({ ...edit, account_to_id: e.target.value })}>
                              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                          ) : '-'}
                        </td>
                        <td>
                          {needsCat ? (
                            <select className="edit-input" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>
                              <option value="">-</option>
                              {filteredCats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                          ) : '-'}
                        </td>
                        <td><input className="edit-input" type="text" value={edit.comment} onChange={(e) => setEdit({ ...edit, comment: e.target.value })} /></td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-icon save" onClick={() => saveEdit(tx)}><Check size={14} /></button>
                            <button className="btn-icon cancel" onClick={cancelEdit}><X size={14} /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{format(new Date(tx.date), 'dd/MM/yyyy')}</td>
                        <td><span className="badge" style={{ backgroundColor: typeColors[tx.type] }}>{typeLabels[tx.type]}</span></td>
                        <td className="amount">{tx.type === 'GASTO' ? '-' : ''}{Number(tx.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        <td>{tx.account?.name}</td>
                        <td>{tx.accountTo?.name ?? '-'}</td>
                        <td>{tx.category ?? '-'}</td>
                        <td>{tx.comment ?? '-'}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-icon edit" onClick={() => startEdit(tx)}><Pencil size={14} /></button>
                            <button className="btn-icon delete" onClick={() => handleDelete(tx)}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
