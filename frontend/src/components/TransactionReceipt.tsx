import { CheckCircle } from 'lucide-react';
import { formatDateDisplay } from '../utils/date';

export interface ReceiptData {
  type: string;
  amount: number;
  account: string;
  currency?: 'ARS' | 'USD';
  accountTo?: string;
  currencyTo?: 'ARS' | 'USD';
  categories?: string[];
  comment?: string;
  date: string;
  exchangeRate?: number;
  converted?: number;
  balanceBefore?: number;
  balanceAfter?: number;
  balanceBeforeTo?: number;
  balanceAfterTo?: number;
}

const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const typeLabels: Record<string, string> = {
  INGRESO: 'Ingreso',
  GASTO: 'Gasto',
  TRANSFERENCIA: 'Transferencia',
  VENTA_DOLARES: 'Venta de Dolares',
  COMPRA_DOLARES: 'Compra de Dolares',
  AJUSTE: 'Ajuste de Saldo',
};

const typeColors: Record<string, string> = {
  INGRESO: 'var(--green)',
  GASTO: 'var(--red)',
  TRANSFERENCIA: 'var(--blue)',
  VENTA_DOLARES: 'var(--yellow)',
  COMPRA_DOLARES: 'var(--accent)',
  AJUSTE: 'var(--text-muted)',
};

export default function TransactionReceipt({ data, onClose }: { data: ReceiptData; onClose: () => void }) {
  const sym = data.currency === 'USD' ? 'US$' : '$';
  const symTo = data.currencyTo === 'USD' ? 'US$' : '$';

  return (
    <div className="receipt">
      <div className="receipt-icon" style={{ color: typeColors[data.type] }}>
        <CheckCircle size={48} />
      </div>
      <h3 className="receipt-title" style={{ color: typeColors[data.type] }}>
        {typeLabels[data.type] || data.type} Registrado
      </h3>
      <div className="receipt-details">
        <div className="receipt-row">
          <span>Monto</span>
          <strong>{data.type === 'GASTO' ? '-' : ''}{sym}{fmt(data.amount)}</strong>
        </div>
        <div className="receipt-row">
          <span>Cuenta</span>
          <strong>{data.account}</strong>
        </div>
        {data.balanceBefore !== undefined && (
          <>
            <div className="receipt-row">
              <span>Saldo anterior</span>
              <strong>{sym}{fmt(data.balanceBefore)}</strong>
            </div>
            <div className="receipt-row highlight">
              <span>Saldo actual</span>
              <strong>{sym}{fmt(data.balanceAfter ?? 0)}</strong>
            </div>
          </>
        )}
        {data.accountTo && (
          <>
            <div className="receipt-row">
              <span>Cuenta destino</span>
              <strong>{data.accountTo}</strong>
            </div>
            {data.balanceBeforeTo !== undefined && (
              <>
                <div className="receipt-row">
                  <span>Saldo destino anterior</span>
                  <strong>{symTo}{fmt(data.balanceBeforeTo)}</strong>
                </div>
                <div className="receipt-row highlight">
                  <span>Saldo destino actual</span>
                  <strong>{symTo}{fmt(data.balanceAfterTo ?? 0)}</strong>
                </div>
              </>
            )}
          </>
        )}
        {data.categories && data.categories.length > 0 && (
          <div className="receipt-row">
            <span>Categorias</span>
            <strong>{data.categories.join(', ')}</strong>
          </div>
        )}
        {data.comment && (
          <div className="receipt-row">
            <span>Comentario</span>
            <strong>{data.comment}</strong>
          </div>
        )}
        <div className="receipt-row">
          <span>Fecha</span>
          <strong>{formatDateDisplay(data.date)}</strong>
        </div>
        {data.exchangeRate && (
          <div className="receipt-row">
            <span>Tasa</span>
            <strong>{fmt(data.exchangeRate)}</strong>
          </div>
        )}
        {data.converted !== undefined && (
          <div className="receipt-row highlight">
            <span>{data.type === 'VENTA_DOLARES' ? 'Recibido en ARS' : 'Recibido en USD'}</span>
            <strong>{data.type === 'VENTA_DOLARES' ? '$' : 'US$'}{fmt(data.converted)}</strong>
          </div>
        )}
      </div>
      <button className="receipt-btn" onClick={onClose}>Aceptar</button>
    </div>
  );
}
