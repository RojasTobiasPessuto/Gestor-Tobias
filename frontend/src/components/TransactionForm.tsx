import { useEffect, useState } from 'react';
import { getAccounts, getCategories, createCategory, deleteCategory } from '../api';
import type { Account, CategoryItem } from '../api';
import { Plus, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';
import TransactionReceipt from './TransactionReceipt';
import type { ReceiptData } from './TransactionReceipt';

interface SubmitData {
  amount: number;
  account_id: number;
  categories: string[];
  comment: string;
  date: string;
}

interface Props {
  onSubmit: (data: SubmitData) => Promise<void>;
  submitLabel: string;
  type: 'INGRESO' | 'GASTO';
}

export default function TransactionForm({ onSubmit, submitLabel, type }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [catSearch, setCatSearch] = useState('');
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const loadCategories = () => getCategories().then(setCategories);

  useEffect(() => {
    getAccounts().then(setAccounts);
    loadCategories();
  }, []);

  const filtered = categories.filter((c) => c.type === type);
  const searchableAvailable = filtered.filter(
    (c) => !selectedCats.includes(c.name) && c.name.toLowerCase().includes(catSearch.toLowerCase()),
  );

  const toggleCategory = (name: string) => {
    setSelectedCats((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !amount || selectedCats.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const acct = accounts.find((a) => a.id === parseInt(accountId));
      const balanceBefore = acct ? Number(acct.balance) : 0;
      const amt = parseFloat(amount);
      const balanceAfter = type === 'INGRESO' ? balanceBefore + amt : balanceBefore - amt;
      await onSubmit({
        amount: amt,
        account_id: parseInt(accountId),
        categories: selectedCats,
        comment,
        date,
      });
      setReceipt({
        type,
        amount: amt,
        account: acct?.name || '',
        currency: acct?.currency || 'ARS',
        categories: selectedCats,
        comment: comment || undefined,
        date,
        balanceBefore,
        balanceAfter,
      });
      setAmount('');
      setComment('');
      setSelectedCats([]);
      // Refrescar accounts para tener el balance actualizado
      const updated = await getAccounts();
      setAccounts(updated);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCat = async () => {
    if (!newCatName.trim()) return;
    await createCategory({ name: newCatName, type });
    setNewCatName('');
    loadCategories();
  };

  const handleDeleteCat = async (id: number) => {
    await deleteCategory(id);
    loadCategories();
  };

  if (receipt) {
    return <TransactionReceipt data={receipt} onClose={() => setReceipt(null)} />;
  }

  return (
    <div>
      <form className="form-card" onSubmit={handleSubmit}>
        <label>
          Cuenta
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
            <option value="">Seleccionar...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>
        <label>
          Monto
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>

        <div className="multi-cat-field">
          <span className="multi-cat-label">Categorias</span>
          {selectedCats.length > 0 && (
            <div className="cat-chips">
              {selectedCats.map((c) => (
                <span key={c} className="cat-chip selected">
                  {c}
                  <button type="button" onClick={() => toggleCategory(c)}><X size={11} /></button>
                </span>
              ))}
            </div>
          )}
          <input
            type="text"
            className="cat-search-input"
            placeholder="Buscar categoria..."
            value={catSearch}
            onChange={(e) => setCatSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchableAvailable.length > 0) {
                e.preventDefault();
                toggleCategory(searchableAvailable[0].name);
                setCatSearch('');
              }
            }}
          />
          <div className="cat-options">
            {searchableAvailable.length === 0 ? (
              <span className="cat-empty">Sin coincidencias</span>
            ) : (
              searchableAvailable.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="cat-option"
                  onClick={() => { toggleCategory(c.name); setCatSearch(''); }}
                >
                  + {c.name}
                </button>
              ))
            )}
          </div>
        </div>

        <label>
          Comentario
          <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} />
        </label>
        <label>
          Fecha
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <button type="submit" disabled={submitting || selectedCats.length === 0}>
          {submitting ? 'Procesando...' : submitLabel}
        </button>
      </form>

      <button className="cat-toggle" onClick={() => setShowCatManager(!showCatManager)}>
        {showCatManager ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        Administrar categorias
      </button>

      {showCatManager && (
        <div className="cat-manager">
          <div className="cat-add-row">
            <input
              type="text"
              placeholder="Nueva categoria..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCat())}
            />
            <button onClick={handleAddCat}><Plus size={14} /></button>
          </div>
          <ul className="cat-list">
            {filtered.map((c) => (
              <li key={c.id}>
                <span>{c.name}</span>
                <button className="btn-icon delete" onClick={() => handleDeleteCat(c.id)}>
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
