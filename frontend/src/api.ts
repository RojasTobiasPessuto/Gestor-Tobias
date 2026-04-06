import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api',
});

// Types
export interface Account {
  id: number;
  name: string;
  balance: number;
  currency: 'ARS' | 'USD';
}

export type TransactionType =
  | 'INGRESO'
  | 'GASTO'
  | 'TRANSFERENCIA'
  | 'VENTA_DOLARES'
  | 'COMPRA_DOLARES';

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  account: Account;
  account_id: number;
  accountTo: Account | null;
  account_to_id: number | null;
  category: string | null;
  comment: string | null;
  exchangeRate: number | null;
  date: string;
  createdAt: string;
}

export interface CreateTransactionPayload {
  type: TransactionType;
  amount: number;
  account_id: number;
  account_to_id?: number;
  category?: string;
  comment?: string;
  exchangeRate?: number;
  date: string;
}

// API calls
export const getAccounts = () => api.get<Account[]>('/accounts').then((r) => r.data);
export const getTransactions = (type?: TransactionType) =>
  api.get<Transaction[]>('/transactions', { params: type ? { type } : {} }).then((r) => r.data);
export const createTransaction = (data: CreateTransactionPayload) =>
  api.post<Transaction>('/transactions', data).then((r) => r.data);
export const deleteTransaction = (id: number) => api.delete(`/transactions/${id}`);
export const updateAccount = (id: number, data: Partial<Account>) =>
  api.patch<Account>(`/accounts/${id}`, data).then((r) => r.data);

export interface DollarRate {
  compra: number;
  venta: number;
  promedio: number;
}

export const getDollarRate = () => api.get<DollarRate>('/dollar/rate').then((r) => r.data);

export interface AnalyticsSummary {
  totales: { ingresos: number; gastos: number; balance: number };
  gastoDiario: { ultimos30d: number; ultimos90d: number };
  gastosPorCategoria: { category: string; total: string; count: string }[];
  ingresosPorCategoria: { category: string; total: string; count: string }[];
  monthlyData: { month: string; ingresos: number; gastos: number; balance: number; ahorro: number }[];
  topGastos: { amount: number; category: string; comment: string; date: string; account: string }[];
  movimientosPorCuenta: { account: string; ingresos: number; gastos: number; balance: number; ingCount: number; gasCount: number }[];
  categoriasRecurrentes: { category: string; meses: number; promedio: number; total: number }[];
}

export interface AnalyticsFilters {
  desde?: string;
  hasta?: string;
  category?: string;
}

export interface FilterOptions {
  categories: string[];
  accounts: { id: number; name: string }[];
  dateRange: { min: string; max: string };
}

export const getAnalytics = (filters?: AnalyticsFilters) =>
  api.get<AnalyticsSummary>('/analytics/summary', { params: filters }).then((r) => r.data);

export const getFilterOptions = () =>
  api.get<FilterOptions>('/analytics/filters').then((r) => r.data);

export default api;
