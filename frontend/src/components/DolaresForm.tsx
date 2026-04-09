import { useEffect, useState } from 'react';
import { getAccounts, createTransaction } from '../api';
import type { Account } from '../api';
import toast from 'react-hot-toast';
import TransactionReceipt from './TransactionReceipt';
import type { ReceiptData } from './TransactionReceipt';

export default function DolaresForm() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mode, setMode] = useState<'VENTA' | 'COMPRA'>('VENTA');
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  useEffect(() => { getAccounts().then(setAccounts); }, []);

  const converted = mode === 'VENTA'
    ? (parseFloat(amount) || 0) * (parseFloat(rate) || 0)
    : (parseFloat(amount) || 0) / (parseFloat(rate) || 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromId || !toId || !amount || !rate || submitting) return;
    setSubmitting(true);
    try {
      const txType = mode === 'VENTA' ? 'VENTA_DOLARES' : 'COMPRA_DOLARES';
      const from = accounts.find((a) => a.id === parseInt(fromId));
      const to = accounts.find((a) => a.id === parseInt(toId));
      const amt = parseFloat(amount);
      const balanceBefore = from ? Number(from.balance) : 0;
      const balanceBeforeTo = to ? Number(to.balance) : 0;
      await createTransaction({
        type: txType,
        amount: amt,
        account_id: parseInt(fromId),
        account_to_id: parseInt(toId),
        exchangeRate: parseFloat(rate),
        date,
      });
      toast.success(`${mode === 'VENTA' ? 'Venta' : 'Compra'} procesada`);
      setReceipt({
        type: txType,
        amount: amt,
        account: from?.name || '',
        currency: from?.currency,
        accountTo: to?.name || '',
        currencyTo: to?.currency,
        date,
        exchangeRate: parseFloat(rate),
        converted,
        balanceBefore,
        balanceAfter: balanceBefore - amt,
        balanceBeforeTo,
        balanceAfterTo: balanceBeforeTo + converted,
      });
      setAmount('');
      setRate('');
      const updated = await getAccounts();
      setAccounts(updated);
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2 });

  if (receipt) {
    return <TransactionReceipt data={receipt} onClose={() => setReceipt(null)} />;
  }

  return (
    <div>
      <div className="tabs" style={{ marginBottom: '1rem' }}>
        <button className={mode === 'VENTA' ? 'active' : ''} onClick={() => setMode('VENTA')}>Venta USD</button>
        <button className={mode === 'COMPRA' ? 'active' : ''} onClick={() => setMode('COMPRA')}>Compra USD</button>
      </div>
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
          {mode === 'VENTA' ? 'Cantidad USD a vender' : 'Cantidad ARS a usar'}
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
        <label>
          Tasa de Conversion
          <input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} required />
        </label>
        <label>
          Fecha
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        {amount && rate && (
          <div className="preview">
            {mode === 'VENTA' ? `Recibis: $${fmt(converted)} ARS` : `Recibis: US$${fmt(converted)}`}
          </div>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Procesando...' : mode === 'VENTA' ? 'Vender Dolares' : 'Comprar Dolares'}
        </button>
      </form>
    </div>
  );
}
