import { useEffect, useState } from 'react';
import { getTransactions, deleteTransaction, updateTransaction, getAccounts, getCategories } from '../api';
import type { Transaction, TransactionType, Account, CategoryItem } from '../api';
import { Pencil, Trash2, Check, X, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDateDisplay, daysAgoBA } from '../utils/date';
import { accountLabel } from '../utils/account';

const typeLabels: Record<TransactionType, string> = {
  INGRESO: 'Ingreso', GASTO: 'Gasto', TRANSFERENCIA: 'Transferencia',
  VENTA_DOLARES: 'Venta USD', COMPRA_DOLARES: 'Compra USD', AJUSTE: 'Ajuste',
};
const typeColors: Record<TransactionType, string> = {
  INGRESO: '#22c55e', GASTO: '#ef4444', TRANSFERENCIA: '#3b82f6',
  VENTA_DOLARES: '#f59e0b', COMPRA_DOLARES: '#8b5cf6', AJUSTE: '#8b8d9e',
};

interface EditState {
  amount: string;
  account_id: string;
  account_to_id: string;
  categories: string[];
  comment: string;
  exchangeRate: string;
  date: string;
}

export default function HistorialView() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [filter, setFilter] = useState<TransactionType | ''>('');
  const [catFilter, setCatFilter] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [daysBack, setDaysBack] = useState<number | null>(30);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    const searching = search.length > 0;
    // Al buscar por palabra: sin limite de fecha (busca en todo el historial).
    // Sin busqueda: solo los ultimos `daysBack` dias (null = todo).
    const desde = searching || daysBack === null ? undefined : daysAgoBA(daysBack);
    getTransactions(
      filter || undefined,
      catFilter.length > 0 ? catFilter : undefined,
      desde,
      undefined,
      searching ? search : undefined,
    )
      .then(setTransactions)
      .finally(() => setLoading(false));
  };

  // Debounce del buscador
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    getAccounts().then(setAccounts);
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, catFilter, search, daysBack]);

  const ingresoCats = categories.filter((c) => c.type === 'INGRESO');
  const gastoCats = categories.filter((c) => c.type === 'GASTO');

  const toggleCatFilter = (name: string) => {
    setCatFilter((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name],
    );
  };

  const startEdit = (tx: Transaction) => {
    setEditId(tx.id);
    setEdit({
      amount: String(tx.amount),
      account_id: String(tx.account_id),
      account_to_id: tx.account_to_id ? String(tx.account_to_id) : '',
      categories: tx.categories || [],
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
    if (!edit || saving) return;
    setSaving(true);
    try {
      await updateTransaction(tx.id, {
        type: tx.type,
        amount: parseFloat(edit.amount),
        account_id: parseInt(edit.account_id),
        account_to_id: edit.account_to_id ? parseInt(edit.account_to_id) : undefined,
        categories: edit.categories,
        comment: edit.comment || undefined,
        exchangeRate: edit.exchangeRate ? parseFloat(edit.exchangeRate) : undefined,
        date: edit.date,
      });
      toast.success('Transaccion actualizada');
      cancelEdit();
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tx: Transaction) => {
    if (!confirm(`Eliminar esta transaccion?\n${typeLabels[tx.type]} - ${Number(tx.amount).toLocaleString('es-AR')}`)) return;
    try {
      await deleteTransaction(tx.id);
      toast.success('Transaccion eliminada y saldo revertido');
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  const toggleEditCat = (name: string) => {
    if (!edit) return;
    setEdit({
      ...edit,
      categories: edit.categories.includes(name)
        ? edit.categories.filter((c) => c !== name)
        : [...edit.categories, name],
    });
  };

  const editFilteredCats = (txType: TransactionType) =>
    txType === 'INGRESO' ? ingresoCats : txType === 'GASTO' ? gastoCats : [];

  const availableFilterCats =
    filter === 'INGRESO' ? ingresoCats :
    filter === 'GASTO' ? gastoCats :
    categories;

  return (
    <div>
      <div className="filter-bar" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div className="hist-search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Buscar en la descripción / comentario..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button type="button" onClick={() => setSearchInput('')} title="Limpiar búsqueda"><X size={14} /></button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select value={filter} onChange={(e) => { setFilter(e.target.value as TransactionType | ''); setCatFilter([]); }}>
            <option value="">Todos los tipos</option>
            {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {catFilter.length > 0 && (
            <button className="clear-filters" onClick={() => setCatFilter([])}>
              <X size={12} /> Limpiar categorias
            </button>
          )}
        </div>
        {availableFilterCats.length > 0 && (
          <div className="cat-filter-chips">
            {catFilter.map((c) => (
              <span key={c} className="cat-chip selected" onClick={() => toggleCatFilter(c)}>
                {c} <X size={11} />
              </span>
            ))}
            {availableFilterCats.filter((c) => !catFilter.includes(c.name)).map((c) => (
              <span key={c.id} className={`cat-chip ${c.type === 'INGRESO' ? 'ing' : 'gas'}`} onClick={() => toggleCatFilter(c.name)}>
                + {c.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="hist-window">
        {search ? (
          <span>Buscando "{search}" en todo el historial · {transactions.length} resultado{transactions.length === 1 ? '' : 's'}</span>
        ) : (
          <>
            <span>
              {daysBack === null ? 'Mostrando todo el historial' : `Mostrando últimos ${daysBack} días`} · {transactions.length} movimientos
            </span>
            {daysBack !== null && (
              <span style={{ display: 'flex', gap: '0.4rem' }}>
                <button type="button" className="hist-load-btn" onClick={() => setDaysBack((d) => (d ?? 30) + 30)}>+ 30 días</button>
                <button type="button" className="hist-load-btn" onClick={() => setDaysBack(null)}>Cargar todo</button>
              </span>
            )}
          </>
        )}
      </div>

      {loading ? <p className="loading">Cargando...</p> : transactions.length === 0 ? <p className="empty">No hay transacciones</p> : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Fecha</th><th>Tipo</th><th>Monto</th><th>Cuenta</th><th>Destino</th>
                <th>Categorias</th><th>Comentario</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const isEditing = editId === tx.id && edit;
                const needsCat = tx.type === 'INGRESO' || tx.type === 'GASTO';
                const needsDest = tx.type !== 'INGRESO' && tx.type !== 'GASTO' && tx.type !== 'AJUSTE';
                return (
                  <tr key={tx.id}>
                    {isEditing && edit ? (
                      <>
                        <td><input className="edit-input" type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></td>
                        <td><span className="badge" style={{ backgroundColor: typeColors[tx.type] }}>{typeLabels[tx.type]}</span></td>
                        <td><input className="edit-input" type="number" step="0.01" value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} /></td>
                        <td>
                          <select className="edit-input" value={edit.account_id} onChange={(e) => setEdit({ ...edit, account_id: e.target.value })}>
                            {accounts.map((a) => <option key={a.id} value={a.id}>{accountLabel(a)}</option>)}
                          </select>
                        </td>
                        <td>
                          {needsDest ? (
                            <select className="edit-input" value={edit.account_to_id} onChange={(e) => setEdit({ ...edit, account_to_id: e.target.value })}>
                              {accounts.map((a) => <option key={a.id} value={a.id}>{accountLabel(a)}</option>)}
                            </select>
                          ) : '-'}
                        </td>
                        <td>
                          {needsCat ? (
                            <div className="edit-cat-chips">
                              {edit.categories.map((c) => (
                                <span key={c} className="cat-chip selected" onClick={() => toggleEditCat(c)}>{c} <X size={10} /></span>
                              ))}
                              {editFilteredCats(tx.type).filter((c) => !edit.categories.includes(c.name)).map((c) => (
                                <span key={c.id} className="cat-chip" onClick={() => toggleEditCat(c.name)}>+ {c.name}</span>
                              ))}
                            </div>
                          ) : '-'}
                        </td>
                        <td><textarea className="edit-input" rows={2} value={edit.comment} onChange={(e) => setEdit({ ...edit, comment: e.target.value })} /></td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-icon save" onClick={() => saveEdit(tx)} disabled={saving}><Check size={14} /></button>
                            <button className="btn-icon cancel" onClick={cancelEdit} disabled={saving}><X size={14} /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{formatDateDisplay(tx.date)}</td>
                        <td><span className="badge" style={{ backgroundColor: typeColors[tx.type] }}>{typeLabels[tx.type]}</span></td>
                        <td className="amount">{tx.type === 'GASTO' ? '-' : ''}{Number(tx.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        <td>{tx.account?.name}</td>
                        <td>{tx.accountTo?.name ?? '-'}</td>
                        <td>
                          {tx.categories && tx.categories.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
                              {tx.categories.map((c) => (
                                <span key={c} className="cat-chip-small">{c}</span>
                              ))}
                            </div>
                          ) : '-'}
                        </td>
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
