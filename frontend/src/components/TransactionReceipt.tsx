import { CheckCircle } from 'lucide-react';

export interface ReceiptData {
  type: string;
  amount: number;
  account: string;
  accountTo?: string;
  category?: string;
  comment?: string;
  date: string;
  exchangeRate?: number;
  converted?: number;
  balanceBefore?: number;
  balanceAfter?: number;
}

const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const typeLabels: Record<string, string> = {
  INGRESO: 'Ingreso',
  GASTO: 'Gasto',
  TRANSFERENCIA: 'Transferencia',
  VENTA_DOLARES: 'Venta de Dolares',
  COMPRA_DOLARES: 'Compra de Dolares',
};

const typeColors: Record<string, string> = {
  INGRESO: 'var(--green)',
  GASTO: 'var(--red)',
  TRANSFERENCIA: 'var(--blue)',
  VENTA_DOLARES: 'var(--yellow)',
  COMPRA_DOLARES: 'var(--accent)',
};

export default function TransactionReceipt({ data, onClose }: { data: ReceiptData; onClose: () => void }) {
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
          <strong>{data.type === 'GASTO' ? '-' : ''}{fmt(data.amount)}</strong>
        </div>
        <div className="receipt-row">
          <span>Cuenta</span>
          <strong>{data.account}</strong>
        </div>
        {data.accountTo && (
          <div className="receipt-row">
            <span>Destino</span>
            <strong>{data.accountTo}</strong>
          </div>
        )}
        {data.category && (
          <div className="receipt-row">
            <span>Categoria</span>
            <strong>{data.category}</strong>
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
          <strong>{data.date.split('-').reverse().join('/')}</strong>
        </div>
        {data.exchangeRate && (
          <div className="receipt-row">
            <span>Tasa</span>
            <strong>{fmt(data.exchangeRate)}</strong>
          </div>
        )}
        {data.converted !== undefined && (
          <div className="receipt-row highlight">
            <span>{data.type === 'VENTA_DOLARES' ? 'Recibido' : 'Obtenido'}</span>
            <strong>{data.type === 'VENTA_DOLARES' ? '$' : 'US$'}{fmt(data.converted)}</strong>
          </div>
        )}
      </div>
      <button className="receipt-btn" onClick={onClose}>Aceptar</button>
    </div>
  );
}
