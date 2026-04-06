import { useEffect, useState } from 'react';
import { getAccounts, getCategories } from '../api';
import type { Account, CategoryItem } from '../api';

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

  useEffect(() => {
    getAccounts().then(setAccounts);
    getCategories().then(setCategories);
  }, []);

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !amount || !category) return;
    setSubmitting(true);
    try {
      await onSubmit({
        amount: parseFloat(amount),
        account_id: parseInt(accountId),
        category,
        comment,
        date,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
          {filteredCategories.map((c) => (
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
  );
}
