import { config } from './config';
import type { Account, Card, Category, Cycle, DashboardResponse, Expense, Income, Statement, SummaryResponse, UserSession } from './types';

type RequestOptions = RequestInit & { session?: UserSession | null };

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function request(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers);
  if (options.session?.accessToken) headers.set('authorization', `Bearer ${options.session.accessToken}`);
  if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = response.statusText || 'Request failed';
    try {
      const payload = await response.json();
      message = payload?.error?.message ?? message;
    } catch {
      // ignore
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function apiGet<T>(path: string, session?: UserSession | null) {
  return request(path, { session }) as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown, session?: UserSession | null) {
  return request(path, {
    method: 'POST',
    session,
    body: JSON.stringify(body),
  }) as Promise<T>;
}

export async function apiPatch<T>(path: string, body: unknown, session?: UserSession | null) {
  return request(path, {
    method: 'PATCH',
    session,
    body: JSON.stringify(body),
  }) as Promise<T>;
}

export async function apiDelete(path: string, session?: UserSession | null) {
  await request(path, { method: 'DELETE', session });
}

export const loadDashboard = (session: UserSession | null) => apiGet<DashboardResponse>('/dashboard', session);
export const loadCurrentSummary = (session: UserSession | null) => apiGet<SummaryResponse>('/budget-cycles/current/summary', session);
export const loadAccounts = (session: UserSession | null) => apiGet<Account[]>('/accounts', session);
export const loadCategories = (session: UserSession | null) => apiGet<Category[]>('/expense-categories', session);
export const loadCards = (session: UserSession | null) => apiGet<Card[]>('/credit-cards', session);
export const loadCycles = (session: UserSession | null) => apiGet<Cycle[]>('/budget-cycles', session);
export const loadExpenses = (session: UserSession | null) => apiGet<Expense[]>('/expenses', session);
export const loadIncomes = (session: UserSession | null) => apiGet<Income[]>('/incomes', session);
export const loadStatements = (session: UserSession | null) => apiGet<Statement[]>('/credit-card-statements', session);
