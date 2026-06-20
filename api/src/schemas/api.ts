import { z } from 'zod';
import { balance, date, id, money, nullableId, paymentMethod } from './common';

export const syncUserSchema = z.object({ email: z.string().email(), displayName: z.string().trim().min(1).max(100) }).strict();
export const settingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(), themeColor: z.string().trim().min(1).max(30).optional(), currency: z.string().length(3).optional(),
  defaultCycleType: z.enum(['calendar_based', 'salary_based', 'custom']).optional(), defaultBudgetGranularity: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional(),
  defaultCategoryId: nullableId.optional(), defaultPaymentMethod: paymentMethod.optional(), defaultAccountId: nullableId.optional(), defaultCreditCardId: nullableId.optional(),
  notificationEnabled: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one setting is required');
export const createAccountSchema = z.object({ name: z.string().trim().min(1).max(100), type: z.enum(['bank', 'wallet', 'cash_box', 'electronic_money', 'other']), initialBalance: balance.optional().default(0) }).strict();
export const updateAccountSchema = createAccountSchema.pick({ name: true, type: true }).partial().strict();
export const categorySchema = z.object({ name: z.string().trim().min(1).max(100) }).strict();
export const createCardSchema = z.object({ name: z.string().trim().min(1).max(100), closingDay: z.number().int().min(1).max(31), paymentDay: z.number().int().min(1).max(31), withdrawalAccountId: id }).strict();
export const updateCardSchema = createCardSchema.partial().strict();
export const cycleSchema = z.object({ name: z.string().trim().min(1).max(100), startDate: date, endDate: date, resetType: z.enum(['calendar_based', 'salary_based', 'custom']) }).strict();
export const updateCycleSchema = cycleSchema.partial().strict();
export const incomeSchema = z.object({ cycleId: id, accountId: id, name: z.string().trim().min(1).max(100), amount: money, incomeDate: date, type: z.enum(['salary', 'temporary', 'refund', 'side_job', 'allowance', 'other']) }).strict();
export const updateIncomeSchema = incomeSchema.partial().strict();
const expenseBaseSchema = z.object({ cycleId: id, accountId: nullableId, creditCardId: nullableId, categoryId: id, name: z.string().trim().min(1).max(100), amount: money, expenseDate: date, paymentMethod, memo: z.string().max(500).nullable().optional() }).strict();
export const expenseSchema = expenseBaseSchema.superRefine((value, context) => {
  if (value.paymentMethod === 'credit_card' && !value.creditCardId) context.addIssue({ code: 'custom', path: ['creditCardId'], message: 'creditCardId is required for credit_card' });
  if (value.paymentMethod !== 'credit_card' && !value.accountId) context.addIssue({ code: 'custom', path: ['accountId'], message: 'accountId is required for non-card payments' });
});
export const updateExpenseSchema = expenseBaseSchema.partial().strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required');
export const statementSchema = z.object({ creditCardId: id, cycleId: id, statementStartDate: date, statementEndDate: date, paymentDate: date, billedAmount: money }).strict();
export const adjustmentSchema = z.object({ adjustmentType: z.enum(['unknown_expense', 'fee', 'edit_existing_expense', 'ignore']), amount: money, categoryId: id.optional(), memo: z.string().max(500).optional() }).strict();
export const transferSchema = z.object({ fromAccountId: id, toAccountId: id, amount: money, transferDate: date, memo: z.string().max(500).optional() }).strict().refine((value) => value.fromAccountId !== value.toAccountId, { message: 'fromAccountId and toAccountId must differ', path: ['toAccountId'] });
export const plannedExpenseSchema = z.object({ cycleId: id, accountId: nullableId, creditCardId: nullableId, categoryId: id, name: z.string().trim().min(1).max(100), estimatedAmount: money, plannedDate: date, paymentMethod, reflectToBudget: z.boolean(), memo: z.string().max(500).optional() }).strict().superRefine((value, context) => {
  if (value.paymentMethod === 'credit_card' && !value.creditCardId) context.addIssue({ code: 'custom', path: ['creditCardId'], message: 'creditCardId is required for credit_card' });
  if (value.paymentMethod !== 'credit_card' && !value.accountId) context.addIssue({ code: 'custom', path: ['accountId'], message: 'accountId is required for non-card payments' });
});
export const confirmPlannedSchema = z.object({ actualAmount: money, confirmedDate: date }).strict();
export const recurringExpenseSchema = z.object({ accountId: nullableId, creditCardId: nullableId, categoryId: id, name: z.string().trim().min(1).max(100), amount: money.optional(), paymentMethod, billingDay: z.number().int().min(1).max(31), isAmountFixed: z.boolean(), estimatedAmount: money.optional() }).strict().superRefine((value, context) => {
  if (value.isAmountFixed && !value.amount) context.addIssue({ code: 'custom', path: ['amount'], message: 'amount is required when isAmountFixed is true' });
  if (!value.isAmountFixed && !value.estimatedAmount) context.addIssue({ code: 'custom', path: ['estimatedAmount'], message: 'estimatedAmount is required when isAmountFixed is false' });
  if (value.paymentMethod === 'credit_card' && !value.creditCardId) context.addIssue({ code: 'custom', path: ['creditCardId'], message: 'creditCardId is required for credit_card' });
  if (value.paymentMethod !== 'credit_card' && !value.accountId) context.addIssue({ code: 'custom', path: ['accountId'], message: 'accountId is required for non-card payments' });
});
export const updateRecurringExpenseSchema = z.object({ accountId: nullableId, creditCardId: nullableId, categoryId: id.optional(), name: z.string().trim().min(1).max(100).optional(), amount: money.nullable().optional(), paymentMethod: paymentMethod.optional(), billingDay: z.number().int().min(1).max(31).optional(), isAmountFixed: z.boolean().optional(), estimatedAmount: money.nullable().optional() }).strict();
export const generateRecurringSchema = z.object({ cycleId: id, targetDate: date }).strict();
export const incomeRuleSchema = z.object({ accountId: id, name: z.string().trim().min(1).max(100), amount: money, incomeDay: z.number().int().min(1).max(31), inputMode: z.enum(['auto', 'manual_reminder']) }).strict();
export const generateIncomeSchema = z.object({ cycleId: id, incomeDate: date, amount: money.optional() }).strict();
export const savingGoalSchema = z.object({ name: z.string().trim().min(1).max(100), targetAmount: money }).strict();
export const updateSavingGoalSchema = savingGoalSchema.partial().strict();
const savingsRuleBaseSchema = z.object({ name: z.string().trim().min(1).max(100), savingGoalId: id.optional(), type: z.enum(['fixed_amount', 'income_percentage', 'manual']), amount: money.optional(), percentage: z.number().int().min(1).max(100).optional() }).strict();
export const savingsRuleSchema = savingsRuleBaseSchema.superRefine((value, context) => {
  if (value.type === 'fixed_amount' && !value.amount) context.addIssue({ code: 'custom', path: ['amount'], message: 'amount is required for fixed_amount' });
  if (value.type === 'income_percentage' && !value.percentage) context.addIssue({ code: 'custom', path: ['percentage'], message: 'percentage is required for income_percentage' });
});
export const updateSavingsRuleSchema = z.object({ name: z.string().trim().min(1).max(100).optional(), savingGoalId: nullableId.optional(), type: z.enum(['fixed_amount', 'income_percentage', 'manual']).optional(), amount: money.nullable().optional(), percentage: z.number().int().min(1).max(100).nullable().optional() }).strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required').superRefine((value, context) => {
  if (value.type === 'fixed_amount' && !value.amount) context.addIssue({ code: 'custom', path: ['amount'], message: 'amount is required for fixed_amount' });
  if (value.type === 'income_percentage' && !value.percentage) context.addIssue({ code: 'custom', path: ['percentage'], message: 'percentage is required for income_percentage' });
});
export const savingAllocationSchema = z.object({ cycleId: id, incomeId: id.optional(), savingGoalId: id, amount: money }).strict();
export const closeCycleSchema = z.object({ carryoverPolicy: z.enum(['add_to_next_cycle', 'move_to_savings', 'keep_as_remaining']) }).strict();
export const notificationSchema = z.object({ enabled: z.boolean(), timing: z.string().max(100).nullable().optional() }).strict();
