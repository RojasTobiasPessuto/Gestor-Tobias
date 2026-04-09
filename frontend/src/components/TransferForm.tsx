import { useEffect, useState } from 'react';
import { getAccounts, createTransaction } from '../api';
import type { Account } from '../api';
import toast from 'react-hot-toast';
import TransactionReceipt from './TransactionReceipt';
import type { ReceiptData } from './TransactionReceipt';

export default function TransferForm() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  useEffect(() => { getAccounts().then(setAccounts); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromId || !toId || !amount || submitting) return;
    if (fromId === toId) { toast.error('Las cuentas deben ser diferentes'); return; }
    setSubmitting(true);
    try {
      const from = accounts.find((a) => a.id === parseInt(fromId));
      const to = accounts.find((a) => a.id === parseInt(toId));
      const amt = parseFloat(amount);
      const balanceBefore = from ? Number(from.balance) : 0;
      const balanceBeforeTo = to ? Number(to.balance) : 0;
      await createTransaction({
        type: 'TRANSFERENCIA',
        amount: amt,
        account_id: parseInt(fromId),
        account_to_id: parseInt(toId),
        comment: comment || undefined,
        date,
      });
      toast.success('Transferencia realizada');
      setReceipt({
        type: 'TRANSFERENCIA',
        amount: amt,
        account: from?.name || '',
        currency: from?.currency,
        accountTo: to?.name || '',
        currencyTo: to?.currency,
        comment: comment || undefined,
        date,
        balanceBefore,
        balanceAfter: balanceBefore - amt,
        balanceBeforeTo,
        balanceAfterTo: balanceBeforeTo + amt,
      });
      setAmount('');
      setComment('');
      const updated = await getAccounts();
      setAccounts(updated);
    } finally {
      setSubmitting(false);
    }
  };

  if (receipt) {
    return <TransactionReceipt data={receipt} onClose={() => setReceipt(null)} />;
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <label>
        Cuenta Origen
        <select value={fromId} onChange={(e) => setFromId(e.target.value)} required>
          <option value="">Seleccionar...</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>
      <label>
        Cuenta Destino
        <select value={toId} onChange={(e) => setToId(e.target.value)} required>
          <option value="">Seleccionar...</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>
      <label>
        Monto
        <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </label>
      <label>
        Comentario
        <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>
      <label>
        Fecha
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>
      <button type="submit" disabled={submitting}>{submitting ? 'Procesando...' : 'Transferir'}</button>
    </form>
  );
}
