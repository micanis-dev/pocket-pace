export interface UserSession {
  mode: 'demo' | 'auth0';
  email: string;
  displayName: string;
  accessToken?: string;
  expiresAt?: number;
}

export interface CurrentCycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  resetType: string;
  isClosed: boolean;
}

export interface DashboardResponse {
  currentCycle: CurrentCycle;
  budgetSummary: {
    spendingLimit: number;
    remainingAmount: number;
    granularity: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    unitLabel: string;
    availablePerUnit: number;
    isOverPace: boolean;
  };
  recentExpenses: Expense[];
  alerts: string[];
}

export interface SummaryResponse {
  cycleId: string;
  period: {
    startDate: string;
    endDate: string;
    resetType: string;
    totalDays: number;
    elapsedDays: number;
    remainingDays: number;
  };
  income: { total: number };
  carryover: { amount: number; policy: string | null };
  fixedExpenses: { total: number };
  plannedExpenses: { total: number; reflectedTotal: number };
  savings: { total: number };
  spendingLimit: number;
  actualExpenses: { total: number; cash: number; creditCard: number };
  remainingAmount: number;
  budgetDisplay: {
    granularity: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    unitLabel: string;
    availablePerUnit: number;
    remainingUnits: number;
  };
  pace: {
    expectedSpent: number;
    actualSpent: number;
    paceRatio: number;
    isOverPace: boolean;
  };
}

export interface Account {
  id: string;
  name: string;
  type: string;
  initialBalance: number;
  currentBalance: number;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Card {
  id: string;
  name: string;
  closingDay: number;
  paymentDay: number;
  withdrawalAccountId: string;
  isActive: boolean;
}

export interface Cycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  resetType: string;
  isClosed: boolean;
}

export interface Income {
  id: string;
  cycleId: string;
  accountId: string;
  name: string;
  amount: number;
  incomeDate: string;
  type: string;
}

export interface Expense {
  id: string;
  cycleId: string;
  accountId: string | null;
  creditCardId: string | null;
  categoryId: string;
  name: string;
  amount: number;
  expenseDate: string;
  paymentMethod: string;
  memo: string | null;
  isAdjustment?: boolean;
}

export interface Statement {
  id: string;
  creditCardId: string;
  cycleId: string;
  statementStartDate: string;
  statementEndDate: string;
  paymentDate: string;
  billedAmount: number;
  recordedAmount: number;
  differenceAmount: number;
  status: string;
  paidAt: string | null;
}
