import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const timestamps = {
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
};

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  auth0UserId: text('auth0_user_id').notNull().unique(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  ...timestamps,
});

export const userSettings = sqliteTable('user_settings', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  theme: text('theme').notNull().default('system'),
  themeColor: text('theme_color').notNull().default('blue'),
  currency: text('currency').notNull().default('JPY'),
  defaultCycleType: text('default_cycle_type').notNull().default('calendar_based'),
  defaultBudgetGranularity: text('default_budget_granularity').notNull().default('daily'),
  notificationEnabled: integer('notification_enabled', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
});

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(), type: text('type').notNull(),
  initialBalance: integer('initial_balance').notNull(), currentBalance: integer('current_balance').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true), ...timestamps,
}, (table) => [uniqueIndex('accounts_user_name_idx').on(table.userId, table.name)]);

export const creditCards = sqliteTable('credit_cards', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(), closingDay: integer('closing_day').notNull(), paymentDay: integer('payment_day').notNull(),
  withdrawalAccountId: text('withdrawal_account_id').notNull().references(() => accounts.id),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true), ...timestamps,
});

export const accountTransfers = sqliteTable('account_transfers', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id),
  fromAccountId: text('from_account_id').notNull().references(() => accounts.id), toAccountId: text('to_account_id').notNull().references(() => accounts.id),
  amount: integer('amount').notNull(), transferDate: text('transfer_date').notNull(), memo: text('memo'), ...timestamps,
});

export const expenseCategories = sqliteTable('expense_categories', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(), isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true), ...timestamps,
}, (table) => [uniqueIndex('categories_user_name_idx').on(table.userId, table.name)]);

export const budgetCycles = sqliteTable('budget_cycles', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id), name: text('name').notNull(),
  startDate: text('start_date').notNull(), endDate: text('end_date').notNull(), resetType: text('reset_type').notNull(),
  isClosed: integer('is_closed', { mode: 'boolean' }).notNull().default(false), ...timestamps,
}, (table) => [uniqueIndex('cycles_user_dates_idx').on(table.userId, table.startDate, table.endDate)]);

export const incomes = sqliteTable('incomes', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id),
  cycleId: text('cycle_id').notNull().references(() => budgetCycles.id), accountId: text('account_id').notNull().references(() => accounts.id),
  name: text('name').notNull(), amount: integer('amount').notNull(), incomeDate: text('income_date').notNull(), type: text('type').notNull(), ...timestamps,
});

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id),
  cycleId: text('cycle_id').notNull().references(() => budgetCycles.id), accountId: text('account_id').references(() => accounts.id),
  creditCardId: text('credit_card_id').references(() => creditCards.id), categoryId: text('category_id').notNull().references(() => expenseCategories.id),
  recurringExpenseId: text('recurring_expense_id'), plannedExpenseId: text('planned_expense_id'), name: text('name').notNull(),
  amount: integer('amount').notNull(), expenseDate: text('expense_date').notNull(), paymentMethod: text('payment_method').notNull(),
  memo: text('memo'), isAdjustment: integer('is_adjustment', { mode: 'boolean' }).notNull().default(false), ...timestamps,
});

export const plannedExpenses = sqliteTable('planned_expenses', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id), cycleId: text('cycle_id').notNull().references(() => budgetCycles.id),
  accountId: text('account_id').references(() => accounts.id), creditCardId: text('credit_card_id').references(() => creditCards.id),
  categoryId: text('category_id').notNull().references(() => expenseCategories.id), name: text('name').notNull(),
  estimatedAmount: integer('estimated_amount').notNull(), actualAmount: integer('actual_amount'), reflectToBudget: integer('reflect_to_budget', { mode: 'boolean' }).notNull(),
  plannedDate: text('planned_date').notNull(), confirmedDate: text('confirmed_date'), paymentMethod: text('payment_method').notNull(),
  status: text('status').notNull().default('planned'), memo: text('memo'), ...timestamps,
});

export const recurringExpenses = sqliteTable('recurring_expenses', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id), accountId: text('account_id').references(() => accounts.id),
  creditCardId: text('credit_card_id').references(() => creditCards.id), categoryId: text('category_id').notNull().references(() => expenseCategories.id),
  name: text('name').notNull(), amount: integer('amount'), paymentMethod: text('payment_method').notNull(), billingDay: integer('billing_day').notNull(),
  isAmountFixed: integer('is_amount_fixed', { mode: 'boolean' }).notNull(), estimatedAmount: integer('estimated_amount'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true), ...timestamps,
});

export const incomeRules = sqliteTable('income_rules', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id), accountId: text('account_id').notNull().references(() => accounts.id),
  name: text('name').notNull(), amount: integer('amount').notNull(), incomeDay: integer('income_day').notNull(), inputMode: text('input_mode').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true), ...timestamps,
});

export const savingsRules = sqliteTable('savings_rules', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id), name: text('name').notNull(), type: text('type').notNull(),
  amount: integer('amount'), percentage: integer('percentage'), isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true), ...timestamps,
});

export const savingGoals = sqliteTable('saving_goals', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id), name: text('name').notNull(),
  targetAmount: integer('target_amount').notNull(), currentAmount: integer('current_amount').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true), ...timestamps,
});

export const savingAllocations = sqliteTable('saving_allocations', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id), cycleId: text('cycle_id').notNull().references(() => budgetCycles.id),
  incomeId: text('income_id').references(() => incomes.id), savingGoalId: text('saving_goal_id').notNull().references(() => savingGoals.id),
  amount: integer('amount').notNull(), ...timestamps,
});

export const cycleCarryovers = sqliteTable('cycle_carryovers', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id), fromCycleId: text('from_cycle_id').notNull().references(() => budgetCycles.id),
  toCycleId: text('to_cycle_id').references(() => budgetCycles.id), amount: integer('amount').notNull(), policy: text('policy').notNull(), ...timestamps,
});

export const creditCardStatements = sqliteTable('credit_card_statements', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id), creditCardId: text('credit_card_id').notNull().references(() => creditCards.id),
  cycleId: text('cycle_id').notNull().references(() => budgetCycles.id), statementStartDate: text('statement_start_date').notNull(), statementEndDate: text('statement_end_date').notNull(),
  paymentDate: text('payment_date').notNull(), billedAmount: integer('billed_amount').notNull(), recordedAmount: integer('recorded_amount').notNull(),
  differenceAmount: integer('difference_amount').notNull(), status: text('status').notNull(), paidAt: text('paid_at'), ...timestamps,
});

export const notificationSettings = sqliteTable('notification_settings', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id), type: text('type').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true), timing: text('timing'), ...timestamps,
}, (table) => [uniqueIndex('notification_user_type_idx').on(table.userId, table.type)]);
