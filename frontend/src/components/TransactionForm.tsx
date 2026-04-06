import { useEffect, useState } from 'react';
import { getAccounts, getCategories, createCategory, deleteCategory } from '../api';
import type { Account, CategoryItem } from '../api';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import TransactionReceipt from './TransactionReceipt';
import type { ReceiptData } from './TransactionReceipt';

interface Props {
  onSubmit: (data: {
    amount: number;
    account_id: number;
    category: string;
    comment: string;
    date: string;
  }) => Promise<void>;
  submitLabel: string;
  type: 'INGRESO' | 'GASTO';
}

export default function TransactionForm({ onSubmit, submitLabel, type }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [comment, setComment] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const loadCategories = () => getCategories().then(setCategories);

  useEffect(() => {
    getAccounts().then(setAccounts);
    loadCategories();
  }, []);

  const filtered = categories.filter((c) => c.type === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !amount || !category) return;
    setSubmitting(true);
    try {
      const acct = accounts.find((a) => a.id === parseInt(accountId));
      await onSubmit({
        amount: parseFloat(amount),
        account_id: parseInt(accountId),
        category,
        comment,
        date,
      });
      setReceipt({
        type,
        amount: parseFloat(amount),
        account: acct?.name || '',
        category,
        comment: comment || undefined,
        date,
      });
      setAmount('');
      setComment('');
      setCategory('');
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
        <label>
          Categoria
          <select value={category} onChange={(e) => setCategory(e.target.value)} required>
            <option value="">Seleccionar...</option>
            {filtered.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </label>
        <label>
          Comentario
          <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} />
        </label>
        <label>
          Fecha
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <button type="submit" disabled={submitting}>
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
