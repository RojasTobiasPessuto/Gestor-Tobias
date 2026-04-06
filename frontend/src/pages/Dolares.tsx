import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getAccounts, createTransaction } from '../api';
import type { Account } from '../api';

export default function Dolares() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mode, setMode] = useState<'VENTA' | 'COMPRA'>('VENTA');
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    getAccounts().then(setAccounts);
  }, []);

  const converted =
    mode === 'VENTA'
      ? (parseFloat(amount) || 0) * (parseFloat(rate) || 0)
      : (parseFloat(amount) || 0) / (parseFloat(rate) || 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromId || !toId || !amount || !rate) return;

    await createTransaction({
      type: mode === 'VENTA' ? 'VENTA_DOLARES' : 'COMPRA_DOLARES',
      amount: parseFloat(amount),
      account_id: parseInt(fromId),
      account_to_id: parseInt(toId),
      exchangeRate: parseFloat(rate),
      date,
    });
    toast.success(`${mode === 'VENTA' ? 'Venta' : 'Compra'} de dolares procesada`);
    setAmount('');
    setRate('');
  };

  return (
    <div className="page">
      <h2>Compra / Venta de Dolares</h2>

      <div className="tabs">
        <button className={mode === 'VENTA' ? 'active' : ''} onClick={() => setMode('VENTA')}>
          Venta de USD
        </button>
        <button className={mode === 'COMPRA' ? 'active' : ''} onClick={() => setMode('COMPRA')}>
          Compra de USD
        </button>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <label>
          Cuenta Origen
          <select value={fromId} onChange={(e) => setFromId(e.target.value)} required>
            <option value="">Seleccionar...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>
        <label>
          Cuenta Destino
          <select value={toId} onChange={(e) => setToId(e.target.value)} required>
            <option value="">Seleccionar...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
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

        <div className="preview">
          {mode === 'VENTA'
            ? `Recibis: $${converted.toLocaleString('es-AR', { minimumFractionDigits: 2 })} ARS`
            : `Recibis: US$${converted.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
        </div>

        <button type="submit">
          {mode === 'VENTA' ? 'Vender Dolares' : 'Comprar Dolares'}
        </button>
      </form>
    </div>
  );
}
