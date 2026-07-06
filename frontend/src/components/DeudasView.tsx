import { useEffect, useState } from 'react';
import {
  getDebts, createDebt, updateDebt, payDebt, deleteDebt, getAccounts,
  getTemplates, createTemplate, updateTemplate, deleteTemplate,
  generateMonthlyDebts, createInstallmentPurchase,
} from '../api';
import type { Debt, Account, RecurringTemplate, GenerateMonthItem } from '../api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Check, X, DollarSign, RefreshCw, Layers } from 'lucide-react';
import { formatDateDisplay, todayBA, currentMonthBA } from '../utils/date';
import CategoryMultiSelect from './CategoryMultiSelect';

interface Props {
  onChange?: () => void;
}

const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const currentMonth = () => currentMonthBA();
const currentDate = () => todayBA();

export default function DeudasView({ onChange }: Props) {
  const [tab, setTab] = useState<'ME_DEBEN' | 'YO_DEBO' | 'PLANTILLAS'>('ME_DEBEN');
  const [debts, setDebts] = useState<Debt[]>([]);
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Form deuda
  const [formPerson, setFormPerson] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState<'ARS' | 'USD'>('USD');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(currentDate());
  const [formSourceAccountId, setFormSourceAccountId] = useState<string>('');

  // Pay modal
  const [payId, setPayId] = useState<number | null>(null);
  const [payAccountId, setPayAccountId] = useState('');
  const [payDate, setPayDateState] = useState(currentDate());
  const [payAmount, setPayAmount] = useState('');

  // Generar mes modal
  const [showGenerate, setShowGenerate] = useState(false);
  const [genMonth, setGenMonth] = useState(currentMonth());
  const [genDate, setGenDate] = useState(currentDate());
  const [genAmounts, setGenAmounts] = useState<Record<number, string>>({});

  // Compra en cuotas modal
  const [showInstallment, setShowInstallment] = useState(false);
  const [instDescription, setInstDescription] = useState('');
  const [instPerson, setInstPerson] = useState('');
  const [instTotal, setInstTotal] = useState('');
  const [instCount, setInstCount] = useState('3');
  const [instCurrency, setInstCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [instFirstDate, setInstFirstDate] = useState(currentDate());
  const [instCategories, setInstCategories] = useState<string[]>([]);

  // Form plantilla
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editTplId, setEditTplId] = useState<number | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplPerson, setTplPerson] = useState('');
  const [tplAmount, setTplAmount] = useState('');
  const [tplCurrency, setTplCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [tplDescription, setTplDescription] = useState('');
  const [tplCategories, setTplCategories] = useState<string[]>([]);

  const loadDebts = () => {
    if (tab === 'PLANTILLAS') return;
    getDebts(tab).then(setDebts);
  };
  const loadTemplates = () => getTemplates().then(setTemplates);

  useEffect(() => {
    if (tab === 'PLANTILLAS') {
      loadTemplates();
    } else {
      loadDebts();
    }
    getAccounts().then(setAccounts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ========== DEUDAS ==========
  const resetForm = () => {
    setFormPerson('');
    setFormAmount('');
    setFormCurrency('USD');
    setFormDescription('');
    setFormDate(currentDate());
    setFormSourceAccountId('');
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
    setFormSourceAccountId(d.sourceAccountId ? String(d.sourceAccountId) : '');
    setShowForm(true);
  };

  const handleSaveDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPerson || !formAmount) return;
    const data = {
      type: tab as 'ME_DEBEN' | 'YO_DEBO',
      person: formPerson,
      amount: parseFloat(formAmount),
      currency: formCurrency,
      description: formDescription || undefined,
      date: formDate,
      source_account_id: tab === 'ME_DEBEN' && formSourceAccountId ? parseInt(formSourceAccountId) : undefined,
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
      loadDebts();
      onChange?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleDeleteDebt = async (d: Debt) => {
    if (!confirm(`Eliminar deuda de ${d.person}?`)) return;
    try {
      await deleteDebt(d.id);
      toast.success('Deuda eliminada');
      loadDebts();
      onChange?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const startPay = (d: Debt) => {
    setPayId(d.id);
    setPayAccountId('');
    setPayDateState(currentDate());
    setPayAmount(String(d.amount));
  };

  const confirmPay = async () => {
    if (!payId || !payAccountId) return;
    try {
      await payDebt(payId, {
        account_id: parseInt(payAccountId),
        paidDate: payDate,
        amount: payAmount ? parseFloat(payAmount) : undefined,
      });
      toast.success(tab === 'ME_DEBEN' ? 'Cobro registrado' : 'Pago registrado');
      setPayId(null);
      loadDebts();
      onChange?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  // ========== GENERAR MES ==========
  const openGenerate = async () => {
    const tpls = await getTemplates(true);
    setTemplates(tpls);
    const initial: Record<number, string> = {};
    tpls.forEach((t) => {
      if (t.lastGeneratedMonth !== genMonth) initial[t.id] = String(t.defaultAmount);
    });
    setGenAmounts(initial);
    setShowGenerate(true);
  };

  const confirmGenerate = async () => {
    const items: GenerateMonthItem[] = Object.entries(genAmounts)
      .filter(([, v]) => v && parseFloat(v) > 0)
      .map(([id, v]) => ({ templateId: parseInt(id), amount: parseFloat(v) }));
    if (items.length === 0) {
      toast.error('No hay plantillas para generar');
      return;
    }
    try {
      const created = await generateMonthlyDebts({ month: genMonth, date: genDate, items });
      toast.success(`${created.length} deudas generadas`);
      setShowGenerate(false);
      loadDebts();
      onChange?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  // ========== CUOTAS ==========
  const confirmInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instDescription || !instPerson || !instTotal || !instCount) return;
    try {
      const created = await createInstallmentPurchase({
        description: instDescription,
        person: instPerson,
        totalAmount: parseFloat(instTotal),
        installments: parseInt(instCount),
        currency: instCurrency,
        firstDate: instFirstDate,
        categories: instCategories,
      });
      toast.success(`${created.length} cuotas generadas`);
      setShowInstallment(false);
      setInstDescription('');
      setInstPerson('');
      setInstTotal('');
      setInstCount('3');
      setInstFirstDate(currentDate());
      setInstCategories([]);
      loadDebts();
      onChange?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  // ========== PLANTILLAS ==========
  const resetTplForm = () => {
    setTplName('');
    setTplPerson('');
    setTplAmount('');
    setTplCurrency('ARS');
    setTplDescription('');
    setTplCategories([]);
    setShowTemplateForm(false);
    setEditTplId(null);
  };

  const startEditTpl = (t: RecurringTemplate) => {
    setEditTplId(t.id);
    setTplName(t.name);
    setTplPerson(t.person);
    setTplAmount(String(t.defaultAmount));
    setTplCurrency(t.currency);
    setTplDescription(t.description || '');
    setTplCategories(t.categories || []);
    setShowTemplateForm(true);
  };

  const handleSaveTpl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName || !tplPerson || !tplAmount) return;
    const data = {
      name: tplName,
      person: tplPerson,
      defaultAmount: parseFloat(tplAmount),
      currency: tplCurrency,
      description: tplDescription || undefined,
      categories: tplCategories,
    };
    try {
      if (editTplId) {
        await updateTemplate(editTplId, data);
        toast.success('Plantilla actualizada');
      } else {
        await createTemplate(data);
        toast.success('Plantilla creada');
      }
      resetTplForm();
      loadTemplates();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleToggleTplActive = async (t: RecurringTemplate) => {
    try {
      await updateTemplate(t.id, { active: !t.active });
      loadTemplates();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleDeleteTpl = async (t: RecurringTemplate) => {
    if (!confirm(`Eliminar plantilla "${t.name}"? Las deudas ya generadas no se borraran.`)) return;
    try {
      await deleteTemplate(t.id);
      toast.success('Plantilla eliminada');
      loadTemplates();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const payingDebt = payId !== null ? debts.find((d) => d.id === payId) ?? null : null;
  const pendientes = debts.filter((d) => d.status === 'PENDIENTE');
  const pagadas = debts.filter((d) => d.status === 'PAGADO');
  const totalPendienteUsd = pendientes.filter((d) => d.currency === 'USD').reduce((s, d) => s + Number(d.amount), 0);
  const totalPendienteArs = pendientes.filter((d) => d.currency === 'ARS').reduce((s, d) => s + Number(d.amount), 0);

  // Pendiente del mes actual (filtrado por fecha)
  const mesActual = currentMonth(); // YYYY-MM
  const pendientesDelMes = pendientes.filter((d) => d.date.slice(0, 7) === mesActual);
  const pendienteMesUsd = pendientesDelMes.filter((d) => d.currency === 'USD').reduce((s, d) => s + Number(d.amount), 0);
  const pendienteMesArs = pendientesDelMes.filter((d) => d.currency === 'ARS').reduce((s, d) => s + Number(d.amount), 0);
  const mesLabel = new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  return (
    <div className="deudas-view">
      <div className="tabs" style={{ marginBottom: '1rem' }}>
        <button className={tab === 'ME_DEBEN' ? 'active' : ''} onClick={() => { setTab('ME_DEBEN'); resetForm(); }}>
          Me Deben
        </button>
        <button className={tab === 'YO_DEBO' ? 'active' : ''} onClick={() => { setTab('YO_DEBO'); resetForm(); }}>
          Yo Debo
        </button>
        <button className={tab === 'PLANTILLAS' ? 'active' : ''} onClick={() => { setTab('PLANTILLAS'); resetForm(); }}>
          Plantillas
        </button>
      </div>

      {tab !== 'PLANTILLAS' && (
        <>
          {/* Totales pendientes - DEL MES (solo YO_DEBO) */}
          {tab === 'YO_DEBO' && (
            <>
              <h4 className="cat-section-title" style={{ borderColor: 'var(--red)', color: 'var(--red)', textTransform: 'capitalize' }}>
                A pagar en {mesLabel}
              </h4>
              <div className="metrics-grid-3" style={{ marginBottom: '1rem' }}>
                <div className="metric-card red">
                  <span className="metric-label">Este mes USD</span>
                  <span className="metric-value">US${fmt(pendienteMesUsd)}</span>
                </div>
                <div className="metric-card red">
                  <span className="metric-label">Este mes ARS</span>
                  <span className="metric-value">${fmt(pendienteMesArs)}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Items este mes</span>
                  <span className="metric-value">{pendientesDelMes.length}</span>
                </div>
              </div>
            </>
          )}

          {/* Totales pendientes - GENERAL */}
          <h4 className="cat-section-title" style={{ borderColor: 'var(--yellow)', color: 'var(--yellow)' }}>
            Total pendiente
          </h4>
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

          {/* Botones de accion */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {!showForm && (
              <button className="receipt-btn" onClick={() => setShowForm(true)}>
                <Plus size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                {tab === 'ME_DEBEN' ? 'Nueva deuda' : 'Nueva deuda'}
              </button>
            )}
            {tab === 'YO_DEBO' && (
              <>
                <button className="receipt-btn" style={{ background: 'var(--blue)' }} onClick={openGenerate}>
                  <RefreshCw size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  Generar pagos del mes
                </button>
                <button className="receipt-btn" style={{ background: 'var(--yellow)' }} onClick={() => setShowInstallment(true)}>
                  <Layers size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  Compra en cuotas
                </button>
              </>
            )}
          </div>

          {/* Formulario deuda */}
          {showForm && (
            <form className="form-card" onSubmit={handleSaveDebt} style={{ marginBottom: '1rem' }}>
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
                <select value={formCurrency} onChange={(e) => { setFormCurrency(e.target.value as 'ARS' | 'USD'); setFormSourceAccountId(''); }}>
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </label>
              <label>
                Descripcion
                <textarea rows={3} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
              </label>
              <label>
                Fecha
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required />
              </label>
              {tab === 'ME_DEBEN' && (
                <label>
                  Cuenta origen <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(opcional - solo si la plata salio de una de tus cuentas)</span>
                  <select value={formSourceAccountId} onChange={(e) => setFormSourceAccountId(e.target.value)}>
                    <option value="">Sin cuenta (no descontar)</option>
                    {accounts.filter((a) => !a.name.startsWith('ME DEBEN') && a.currency === formCurrency).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </label>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit">{editId ? 'Guardar' : 'Registrar'}</button>
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
                    <th>Descripcion / Origen</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pendientes.map((d) => (
                    <tr key={d.id}>
                      <td><strong>{d.person}</strong></td>
                      <td className="amount">{d.currency === 'USD' ? 'US$' : '$'}{fmt(Number(d.amount))}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span>{d.description || '-'}</span>
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                            {d.templateId && (
                              <span className="cat-chip-small" style={{ background: 'rgba(59, 130, 246, 0.18)', color: 'var(--blue)' }}>
                                Recurrente
                              </span>
                            )}
                            {d.installmentGroup && (
                              <span className="cat-chip-small" style={{ background: 'rgba(245, 158, 11, 0.18)', color: 'var(--yellow)' }}>
                                Cuota {d.installmentNumber}/{d.installmentTotal}
                                {d.installmentDescription ? ` — ${d.installmentDescription}` : ''}
                              </span>
                            )}
                            {(d.categories || []).map((c) => (
                              <span key={c} className="cat-chip-small">{c}</span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td>{formatDateDisplay(d.date)}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-icon save" title="Marcar pagada" onClick={() => startPay(d)}>
                            <DollarSign size={14} />
                          </button>
                          <button className="btn-icon edit" onClick={() => startEdit(d)}>
                            <Pencil size={14} />
                          </button>
                          <button className="btn-icon delete" onClick={() => handleDeleteDebt(d)}>
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
                        <td>{d.paidDate ? formatDateDisplay(d.paidDate) : '-'}</td>
                        <td>
                          <button className="btn-icon delete" onClick={() => handleDeleteDebt(d)}>
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
        </>
      )}

      {/* ========== TAB PLANTILLAS ========== */}
      {tab === 'PLANTILLAS' && (
        <>
          {!showTemplateForm && (
            <button className="receipt-btn" onClick={() => setShowTemplateForm(true)} style={{ marginBottom: '1rem' }}>
              <Plus size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Nueva plantilla
            </button>
          )}

          {showTemplateForm && (
            <form className="form-card" onSubmit={handleSaveTpl} style={{ marginBottom: '1rem' }}>
              <label>
                Nombre (ej: Alquiler, Luz)
                <input type="text" value={tplName} onChange={(e) => setTplName(e.target.value)} required />
              </label>
              <label>
                A quien le pago
                <input type="text" value={tplPerson} onChange={(e) => setTplPerson(e.target.value)} required />
              </label>
              <label>
                Monto sugerido
                <input type="number" step="0.01" value={tplAmount} onChange={(e) => setTplAmount(e.target.value)} required />
              </label>
              <label>
                Moneda
                <select value={tplCurrency} onChange={(e) => setTplCurrency(e.target.value as 'ARS' | 'USD')}>
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </label>
              <label>
                Descripcion
                <textarea rows={3} value={tplDescription} onChange={(e) => setTplDescription(e.target.value)} />
              </label>
              <CategoryMultiSelect selected={tplCategories} onChange={setTplCategories} type="GASTO" />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit">{editTplId ? 'Guardar' : 'Crear'}</button>
                <button type="button" onClick={resetTplForm} style={{ background: 'var(--bg-input)' }}>Cancelar</button>
              </div>
            </form>
          )}

          {templates.length === 0 ? (
            <p className="empty">No hay plantillas</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Persona</th>
                    <th>Ultimo monto</th>
                    <th>Categorias</th>
                    <th>Ultimo mes</th>
                    <th>Activa</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={t.id} style={{ opacity: t.active ? 1 : 0.5 }}>
                      <td><strong>{t.name}</strong></td>
                      <td>{t.person}</td>
                      <td className="amount">{t.currency === 'USD' ? 'US$' : '$'}{fmt(Number(t.defaultAmount))}</td>
                      <td>
                        {(t.categories || []).length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
                            {(t.categories || []).map((c) => (
                              <span key={c} className="cat-chip-small">{c}</span>
                            ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td>{t.lastGeneratedMonth || '-'}</td>
                      <td>
                        <button
                          className="btn-icon"
                          style={{ background: t.active ? 'rgba(34,197,94,0.15)' : 'rgba(139,141,158,0.15)', color: t.active ? 'var(--green)' : 'var(--text-muted)' }}
                          onClick={() => handleToggleTplActive(t)}
                          title={t.active ? 'Desactivar' : 'Activar'}
                        >
                          {t.active ? <Check size={14} /> : <X size={14} />}
                        </button>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-icon edit" onClick={() => startEditTpl(t)}><Pencil size={14} /></button>
                          <button className="btn-icon delete" onClick={() => handleDeleteTpl(t)}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ========== MODAL DE PAGO ========== */}
      {payId !== null && (
        <div className="pay-modal-overlay" onClick={() => setPayId(null)}>
          <div className="pay-modal" onClick={(e) => e.stopPropagation()}>
            <h4>{tab === 'ME_DEBEN' ? 'Registrar cobro' : 'Registrar pago'}</h4>
            <label>
              Monto (podes ajustarlo si difiere)
              <input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </label>
            <label>
              {tab === 'ME_DEBEN' ? 'Cuenta donde recibis' : 'Cuenta de donde sale'}
              <select value={payAccountId} onChange={(e) => setPayAccountId(e.target.value)}>
                <option value="">Seleccionar...</option>
                {accounts
                  .filter((a) => !a.name.startsWith('ME DEBEN') && (!payingDebt || a.currency === payingDebt.currency))
                  .map((a) => (
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

      {/* ========== MODAL GENERAR MES ========== */}
      {showGenerate && (
        <div className="pay-modal-overlay" onClick={() => setShowGenerate(false)}>
          <div className="pay-modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <h4>Generar pagos del mes</h4>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <label style={{ flex: 1 }}>
                Mes
                <input type="month" value={genMonth} onChange={(e) => setGenMonth(e.target.value)} />
              </label>
              <label style={{ flex: 1 }}>
                Fecha
                <input type="date" value={genDate} onChange={(e) => setGenDate(e.target.value)} />
              </label>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto', marginTop: '0.5rem' }}>
              {templates.filter((t) => t.active && t.lastGeneratedMonth !== genMonth).length === 0 ? (
                <p className="empty">Todas las plantillas ya estan generadas para este mes</p>
              ) : (
                templates.filter((t) => t.active && t.lastGeneratedMonth !== genMonth).map((t) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '0.85rem' }}>{t.name}</strong>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.person}</div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.currency === 'USD' ? 'US$' : '$'}</span>
                    <input
                      type="number"
                      step="0.01"
                      style={{ width: 110 }}
                      value={genAmounts[t.id] ?? ''}
                      onChange={(e) => setGenAmounts({ ...genAmounts, [t.id]: e.target.value })}
                    />
                  </div>
                ))
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button onClick={confirmGenerate} className="receipt-btn"><Check size={14} /> Generar</button>
              <button onClick={() => setShowGenerate(false)} className="receipt-btn" style={{ background: 'var(--bg-input)' }}>
                <X size={14} /> Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL CUOTAS ========== */}
      {showInstallment && (
        <div className="pay-modal-overlay" onClick={() => setShowInstallment(false)}>
          <div className="pay-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Compra en cuotas</h4>
            <form onSubmit={confirmInstallment} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <label>
                Descripcion (ej: Celular Samsung)
                <textarea rows={3} value={instDescription} onChange={(e) => setInstDescription(e.target.value)} required />
              </label>
              <label>
                A quien le pago / origen
                <input type="text" value={instPerson} onChange={(e) => setInstPerson(e.target.value)} required />
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <label style={{ flex: 1 }}>
                  Monto total
                  <input type="number" step="0.01" value={instTotal} onChange={(e) => setInstTotal(e.target.value)} required />
                </label>
                <label style={{ width: 120 }}>
                  Cantidad cuotas
                  <input type="number" min="1" value={instCount} onChange={(e) => setInstCount(e.target.value)} required />
                </label>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <label style={{ width: 120 }}>
                  Moneda
                  <select value={instCurrency} onChange={(e) => setInstCurrency(e.target.value as 'ARS' | 'USD')}>
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
                <label style={{ flex: 1 }}>
                  Fecha primera cuota
                  <input type="date" value={instFirstDate} onChange={(e) => setInstFirstDate(e.target.value)} required />
                </label>
              </div>
              {instTotal && instCount && parseInt(instCount) > 0 && (
                <div className="preview">
                  Cada cuota: {instCurrency === 'USD' ? 'US$' : '$'}{fmt(parseFloat(instTotal) / parseInt(instCount))}
                </div>
              )}
              <CategoryMultiSelect selected={instCategories} onChange={setInstCategories} type="GASTO" />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button type="submit" className="receipt-btn"><Check size={14} /> Generar cuotas</button>
                <button type="button" onClick={() => setShowInstallment(false)} className="receipt-btn" style={{ background: 'var(--bg-input)' }}>
                  <X size={14} /> Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
