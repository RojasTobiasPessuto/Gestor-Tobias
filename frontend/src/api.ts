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
  | 'COMPRA_DOLARES'
  | 'AJUSTE';

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  account: Account;
  account_id: number;
  accountTo: Account | null;
  account_to_id: number | null;
  categories: string[];
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
  categories?: string[];
  comment?: string;
  exchangeRate?: number;
  date: string;
}

// API calls
export const getAccounts = () => api.get<Account[]>('/accounts').then((r) => r.data);
export const getTransactions = (
  type?: TransactionType,
  categories?: string[],
  desde?: string,
  hasta?: string,
) => {
  const params: Record<string, string> = {};
  if (type) params.type = type;
  if (categories && categories.length > 0) params.categories = categories.join(',');
  if (desde) params.desde = desde;
  if (hasta) params.hasta = hasta;
  return api.get<Transaction[]>('/transactions', { params }).then((r) => r.data);
};
export const createTransaction = (data: CreateTransactionPayload) =>
  api.post<Transaction>('/transactions', data).then((r) => r.data);
export const updateTransaction = (id: number, data: CreateTransactionPayload) =>
  api.put<Transaction>(`/transactions/${id}`, data).then((r) => r.data);
export const deleteTransaction = (id: number) => api.delete(`/transactions/${id}`);
export const updateAccount = (id: number, data: Partial<Account>) =>
  api.patch<Account>(`/accounts/${id}`, data).then((r) => r.data);
export const adjustAccountBalance = (id: number, balance: number, comment?: string) =>
  api.patch<Account>(`/accounts/${id}/adjust`, { balance, comment }).then((r) => r.data);

export interface DollarRate {
  compra: number;
  venta: number;
  promedio: number;
}

export const getDollarRate = () => api.get<DollarRate>('/dollar/rate').then((r) => r.data);

export interface AnalyticsSummary {
  totales: {
    ars: { ingresos: number; gastos: number };
    usd: { ingresos: number; gastos: number };
  };
  gastoDiario: { ultimos30d: number; ultimos90d: number };
  gastosPorCategoria: { category: string; currency: string; total: string; count: string }[];
  ingresosPorCategoria: { category: string; currency: string; total: string; count: string }[];
  monthlyData: { month: string; ingArs: number; gasArs: number; balanceArs: number; ingUsd: number; gasUsd: number; balanceUsd: number }[];
  topGastos: { amount: number; categories: string[]; comment: string; date: string; account: string }[];
  movimientosPorCuenta: { account: string; ingresos: number; gastos: number; balance: number; ingCount: number; gasCount: number }[];
  categoriasRecurrentes: { category: string; meses: number; promedio: number; total: number }[];
}

export interface AnalyticsFilters {
  desde?: string;
  hasta?: string;
  categories?: string;
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

export interface CategoryItem {
  id: number;
  name: string;
  type: 'INGRESO' | 'GASTO';
}

export interface Debt {
  id: number;
  type: 'ME_DEBEN' | 'YO_DEBO';
  person: string;
  amount: number;
  currency: 'ARS' | 'USD';
  description: string | null;
  date: string;
  status: 'PENDIENTE' | 'PAGADO';
  paidDate: string | null;
  paidAccountId: number | null;
}

export interface CreateDebtPayload {
  type: 'ME_DEBEN' | 'YO_DEBO';
  person: string;
  amount: number;
  currency: 'ARS' | 'USD';
  description?: string;
  date: string;
}

export const getDebts = (type?: string, status?: string) => {
  const params: Record<string, string> = {};
  if (type) params.type = type;
  if (status) params.status = status;
  return api.get<Debt[]>('/debts', { params }).then((r) => r.data);
};
export const createDebt = (data: CreateDebtPayload) =>
  api.post<Debt>('/debts', data).then((r) => r.data);
export const updateDebt = (id: number, data: Partial<CreateDebtPayload>) =>
  api.patch<Debt>(`/debts/${id}`, data).then((r) => r.data);
export const payDebt = (id: number, data: { account_id: number; paidDate?: string }) =>
  api.patch<Debt>(`/debts/${id}/pay`, data).then((r) => r.data);
export const deleteDebt = (id: number) => api.delete(`/debts/${id}`);

export const getCategories = () => api.get<CategoryItem[]>('/categories').then((r) => r.data);
export const createCategory = (data: { name: string; type?: string }) =>
  api.post<CategoryItem>('/categories', data).then((r) => r.data);
export const updateCategory = (id: number, data: { name?: string; type?: string }) =>
  api.patch<CategoryItem>(`/categories/${id}`, data).then((r) => r.data);
export const deleteCategory = (id: number) => api.delete(`/categories/${id}`);

export default api;
