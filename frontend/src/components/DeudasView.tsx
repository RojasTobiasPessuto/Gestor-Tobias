import { useEffect, useState } from 'react';
import { getDebts, createDebt, updateDebt, payDebt, deleteDebt, getAccounts } from '../api';
import type { Debt, Account } from '../api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Check, X, DollarSign } from 'lucide-react';

interface Props {
  onChange?: () => void;
}

const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DeudasView({ onChange }: Props) {
  const [tab, setTab] = useState<'ME_DEBEN' | 'YO_DEBO'>('ME_DEBEN');
  const [debts, setDebts] = useState<Debt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [payId, setPayId] = useState<number | null>(null);
  const [payAccountId, setPayAccountId] = useState('');
  const [payDate, setPayDateState] = useState(new Date().toISOString().slice(0, 10));

  const [formPerson, setFormPerson] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState<'ARS' | 'USD'>('USD');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));

  const load = () => {
    getDebts(tab).then(setDebts);
  };

  useEffect(() => {
    load();
    getAccounts().then(setAccounts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const resetForm = () => {
    setFormPerson('');
    setFormAmount('');
    setFormCurrency('USD');
    setFormDescription('');
    setFormDate(new Date().toISOString().slice(0, 10));
    setShowForm(false);
    setEditId(null);
  };

  const startEdit = (d: Debt) => {
    setEditId(d.id);
    setFormPerson(d.person);
    setFormAmount(String(d.amount));
    setFormCurrency(d.currency);
    setFormDescription(d.description || '');
    setFormDate(d.date);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPerson || !formAmount) return;
    const data = {
      type: tab,
      person: formPerson,
      amount: parseFloat(formAmount),
      currency: formCurrency,
      description: formDescription || undefined,
      date: formDate,
    };
    try {
      if (editId) {
        await updateDebt(editId, data);
        toast.success('Deuda actualizada');
      } else {
        await createDebt(data);
        toast.success('Deuda registrada');
      }
      resetForm();
      load();
      onChange?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleDelete = async (d: Debt) => {
    if (!confirm(`Eliminar deuda de ${d.person}?`)) return;
    try {
      await deleteDebt(d.id);
      toast.success('Deuda eliminada');
      load();
      onChange?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const startPay = (d: Debt) => {
    setPayId(d.id);
    setPayAccountId('');
    setPayDateState(new Date().toISOString().slice(0, 10));
  };

  const confirmPay = async () => {
    if (!payId || !payAccountId) return;
    try {
      await payDebt(payId, { account_id: parseInt(payAccountId), paidDate: payDate });
      toast.success(tab === 'ME_DEBEN' ? 'Cobro registrado' : 'Pago registrado');
      setPayId(null);
      load();
      onChange?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const pendientes = debts.filter((d) => d.status === 'PENDIENTE');
  const pagadas = debts.filter((d) => d.status === 'PAGADO');
  const totalPendienteUsd = pendientes.filter((d) => d.currency === 'USD').reduce((s, d) => s + Number(d.amount), 0);
  const totalPendienteArs = pendientes.filter((d) => d.currency === 'ARS').reduce((s, d) => s + Number(d.amount), 0);

  return (
    <div className="deudas-view">
      <div className="tabs" style={{ marginBottom: '1rem' }}>
        <button className={tab === 'ME_DEBEN' ? 'active' : ''} onClick={() => { setTab('ME_DEBEN'); resetForm(); }}>
          Me Deben
        </button>
        <button className={tab === 'YO_DEBO' ? 'active' : ''} onClick={() => { setTab('YO_DEBO'); resetForm(); }}>
          Yo Debo
        </button>
      </div>

      {/* Totales pendientes */}
      <div className="metrics-grid-3" style={{ marginBottom: '1rem' }}>
        <div className="metric-card yellow">
          <span className="metric-label">Pendiente USD</span>
          <span className="metric-value">US${fmt(totalPendienteUsd)}</span>
        </div>
        <div className="metric-card yellow">
          <span className="metric-label">Pendiente ARS</span>
          <span className="metric-value">${fmt(totalPendienteArs)}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Items pendientes</span>
          <span className="metric-value">{pendientes.length}</span>
        </div>
      </div>

      {/* Botón crear */}
      {!showForm && (
        <button className="receipt-btn" onClick={() => setShowForm(true)} style={{ marginBottom: '1rem' }}>
          <Plus size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          {tab === 'ME_DEBEN' ? 'Registrar nueva deuda' : 'Registrar lo que debo'}
        </button>
      )}

      {/* Formulario */}
      {showForm && (
        <form className="form-card" onSubmit={handleSave} style={{ marginBottom: '1rem' }}>
          <label>
            {tab === 'ME_DEBEN' ? 'Quien me debe' : 'A quien le debo'}
            <input type="text" value={formPerson} onChange={(e) => setFormPerson(e.target.value)} required />
          </label>
          <label>
            Monto
            <input type="number" step="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} required />
          </label>
          <label>
            Moneda
            <select value={formCurrency} onChange={(e) => setFormCurrency(e.target.value as 'ARS' | 'USD')}>
              <option value="USD">USD</option>
              <option value="ARS">ARS</option>
            </select>
          </label>
          <label>
            Descripcion
            <input type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
          </label>
          <label>
            Fecha
            <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required />
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit">{editId ? 'Guardar cambios' : 'Registrar'}</button>
            <button type="button" onClick={resetForm} style={{ background: 'var(--bg-input)' }}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Pendientes */}
      <h4 className="cat-section-title" style={{ borderColor: 'var(--yellow)', color: 'var(--yellow)' }}>
        Pendientes ({pendientes.length})
      </h4>
      {pendientes.length === 0 ? (
        <p className="empty">Sin deudas pendientes</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Persona</th>
                <th>Monto</th>
                <th>Descripcion</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pendientes.map((d) => (
                <tr key={d.id}>
                  <td><strong>{d.person}</strong></td>
                  <td className="amount">{d.currency === 'USD' ? 'US$' : '$'}{fmt(Number(d.amount))}</td>
                  <td>{d.description || '-'}</td>
                  <td>{d.date.split('-').reverse().join('/')}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon save" title="Marcar como pagada" onClick={() => startPay(d)}>
                        <DollarSign size={14} />
                      </button>
                      <button className="btn-icon edit" onClick={() => startEdit(d)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn-icon delete" onClick={() => handleDelete(d)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de pago */}
      {payId !== null && (
        <div className="pay-modal-overlay" onClick={() => setPayId(null)}>
          <div className="pay-modal" onClick={(e) => e.stopPropagation()}>
            <h4>{tab === 'ME_DEBEN' ? 'Registrar cobro' : 'Registrar pago'}</h4>
            <label>
              {tab === 'ME_DEBEN' ? 'Cuenta donde recibis el dinero' : 'Cuenta de donde sale el dinero'}
              <select value={payAccountId} onChange={(e) => setPayAccountId(e.target.value)}>
                <option value="">Seleccionar...</option>
                {accounts.filter((a) => a.name !== 'ME DEBEN').map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            <label>
              Fecha
              <input type="date" value={payDate} onChange={(e) => setPayDateState(e.target.value)} />
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button onClick={confirmPay} className="receipt-btn"><Check size={14} /> Confirmar</button>
              <button onClick={() => setPayId(null)} className="receipt-btn" style={{ background: 'var(--bg-input)' }}>
                <X size={14} /> Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagadas */}
      {pagadas.length > 0 && (
        <>
          <h4 className="cat-section-title" style={{ borderColor: 'var(--green)', color: 'var(--green)', marginTop: '1.5rem' }}>
            Pagadas ({pagadas.length})
          </h4>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Monto</th>
                  <th>Descripcion</th>
                  <th>Fecha pago</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pagadas.map((d) => (
                  <tr key={d.id}>
                    <td><strong>{d.person}</strong></td>
                    <td className="amount">{d.currency === 'USD' ? 'US$' : '$'}{fmt(Number(d.amount))}</td>
                    <td>{d.description || '-'}</td>
                    <td>{d.paidDate?.split('-').reverse().join('/') || '-'}</td>
                    <td>
                      <button className="btn-icon delete" onClick={() => handleDelete(d)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
