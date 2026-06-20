import { Router, type IRequest } from 'itty-router';
import type { Env } from './env';
import type { Identity } from './middleware/auth';
import { createDb } from './db/client';
import { AppRepository } from './repositories/app-repository';
import { AppService } from './use-cases/app-service';
import { adjustmentSchema, categorySchema, closeCycleSchema, confirmPlannedSchema, createAccountSchema, createCardSchema, cycleSchema, expenseSchema, generateIncomeSchema, generateRecurringSchema, incomeRuleSchema, incomeSchema, notificationSchema, plannedExpenseSchema, recurringExpenseSchema, savingAllocationSchema, savingGoalSchema, savingsRuleSchema, settingsSchema, statementSchema, syncUserSchema, transferSchema, updateAccountSchema, updateCardSchema, updateCycleSchema, updateExpenseSchema, updateIncomeSchema, updateRecurringExpenseSchema, updateSavingGoalSchema, updateSavingsRuleSchema } from './schemas/api';
import { parseJson } from './schemas/common';

const router = Router<IRequest, [Env, Identity]>();
const service = (env: Env) => new AppService(new AppRepository(createDb(env.DB)));
const body = async <T>(request: Request, schema: { parse(value: unknown): T }) => schema.parse(await parseJson(request));
const query = (request: Request) => new URL(request.url).searchParams;
const id = (request: IRequest, key: string) => request.params[key] as string;
const clean = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map(clean) as T;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([key]) => key !== 'userId').map(([key, item]) => [key, clean(item)]);
    return Object.fromEntries(entries) as T;
  }
  return value;
};
const json = (value: unknown, status = 200) => Response.json(clean(value), { status });
const noContent = () => new Response(null, { status: 204 });
const user = async (env: Env, identity: Identity) => service(env).requireUser(identity);

router.get('/health', () => json({ status: 'ok' }));
router.get('/me', async (_request, env, identity) => json(await user(env, identity)));
router.post('/me/sync', async (request, env, identity) => json(await service(env).sync(identity, await body(request, syncUserSchema)), 201));
router.get('/debug/db', async (request, env) => {
  const table = query(request).get('table');
  const tablesResult = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all<{ name: string }>();
  const tables = (tablesResult.results ?? []).map(row => row.name).filter(Boolean);
  const stats = await Promise.all(tables.map(async name => {
    const result = await env.DB.prepare(`SELECT COUNT(*) AS count FROM "${name.replaceAll('"', '""')}"`).all<{ count: number }>();
    return { name, count: Number(result.results?.[0]?.count ?? 0) };
  }));
  if (!table) return json({ tables: stats });
  if (!tables.includes(table)) return json({ error: { code: 'NOT_FOUND', message: 'Table was not found' } }, 404);
  const columnsResult = await env.DB.prepare(`PRAGMA table_info("${table.replaceAll('"', '""')}")`).all<Record<string, unknown>>();
  const rowsResult = await env.DB.prepare(`SELECT * FROM "${table.replaceAll('"', '""')}" ORDER BY rowid DESC LIMIT 50`).all<Record<string, unknown>>();
  return json({ tables: stats, table, columns: columnsResult.results ?? [], rows: rowsResult.results ?? [] });
});

router.get('/user-settings', async (_request, env, identity) => { const current = await user(env, identity); return json(await service(env).settings(current.id)); });
router.patch('/user-settings', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).updateSettings(current.id, await body(request, settingsSchema))); });

router.get('/accounts', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).accounts(current.id, query(request).get('type') ?? undefined)); });
router.post('/accounts', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).createAccount(current.id, await body(request, createAccountSchema)), 201); });
router.get('/accounts/:accountId', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).account(current.id, id(request, 'accountId'))); });
router.patch('/accounts/:accountId', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).updateAccount(current.id, id(request, 'accountId'), await body(request, updateAccountSchema))); });
router.delete('/accounts/:accountId', async (request, env, identity) => { const current = await user(env, identity); await service(env).deleteAccount(current.id, id(request, 'accountId')); return noContent(); });

router.get('/expense-categories', async (_request, env, identity) => { const current = await user(env, identity); return json(await service(env).categories(current.id)); });
router.post('/expense-categories', async (request, env, identity) => { const current = await user(env, identity); const input = await body(request, categorySchema); return json(await service(env).createCategory(current.id, input.name), 201); });
router.patch('/expense-categories/:categoryId', async (request, env, identity) => { const current = await user(env, identity); const input = await body(request, categorySchema); return json(await service(env).updateCategory(current.id, id(request, 'categoryId'), input.name)); });
router.delete('/expense-categories/:categoryId', async (request, env, identity) => { const current = await user(env, identity); await service(env).deleteCategory(current.id, id(request, 'categoryId')); return noContent(); });

router.get('/credit-cards', async (_request, env, identity) => { const current = await user(env, identity); return json(await service(env).cards(current.id)); });
router.post('/credit-cards', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).createCard(current.id, await body(request, createCardSchema)), 201); });
router.patch('/credit-cards/:cardId', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).updateCard(current.id, id(request, 'cardId'), await body(request, updateCardSchema))); });
router.delete('/credit-cards/:cardId', async (request, env, identity) => { const current = await user(env, identity); await service(env).deleteCard(current.id, id(request, 'cardId')); return noContent(); });

router.get('/account-transfers', async (request, env, identity) => { const current = await user(env, identity); const q = query(request); return json(await service(env).transfers(current.id, q.get('from') ?? undefined, q.get('to') ?? undefined)); });
router.post('/account-transfers', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).createTransfer(current.id, await body(request, transferSchema)), 201); });

router.get('/budget-cycles/current/summary', async (_request, env, identity) => { const current = await user(env, identity); return json(await service(env).currentSummary(current.id)); });
router.get('/budget-cycles/current', async (_request, env, identity) => { const current = await user(env, identity); return json(await service(env).currentCycle(current.id)); });
router.get('/budget-cycles', async (request, env, identity) => { const current = await user(env, identity); const q = query(request); return json(await service(env).cycles(current.id, q.get('from') ?? undefined, q.get('to') ?? undefined)); });
router.post('/budget-cycles', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).createCycle(current.id, await body(request, cycleSchema)), 201); });
router.get('/budget-cycles/:cycleId/summary', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).summary(current.id, id(request, 'cycleId'))); });
router.get('/budget-cycles/:cycleId', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).cycle(current.id, id(request, 'cycleId'))); });
router.patch('/budget-cycles/:cycleId', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).updateCycle(current.id, id(request, 'cycleId'), await body(request, updateCycleSchema))); });
router.delete('/budget-cycles/:cycleId', async (request, env, identity) => { const current = await user(env, identity); await service(env).deleteCycle(current.id, id(request, 'cycleId')); return noContent(); });
router.post('/budget-cycles/:cycleId/close', async (request, env, identity) => { const current = await user(env, identity); const input = await body(request, closeCycleSchema); return json(await service(env).closeCycle(current.id, id(request, 'cycleId'), input.carryoverPolicy)); });

router.get('/incomes', async (request, env, identity) => { const current = await user(env, identity); const q = query(request); return json(await service(env).incomes(current.id, { cycleId: q.get('cycleId') ?? undefined, from: q.get('from') ?? undefined, to: q.get('to') ?? undefined, type: q.get('type') ?? undefined })); });
router.post('/incomes', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).createIncome(current.id, await body(request, incomeSchema)), 201); });
router.patch('/incomes/:incomeId', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).updateIncome(current.id, id(request, 'incomeId'), await body(request, updateIncomeSchema))); });
router.delete('/incomes/:incomeId', async (request, env, identity) => { const current = await user(env, identity); await service(env).deleteIncome(current.id, id(request, 'incomeId')); return noContent(); });

router.get('/expenses', async (request, env, identity) => { const current = await user(env, identity); const q = query(request); return json(await service(env).expenses(current.id, { cycleId: q.get('cycleId') ?? undefined, from: q.get('from') ?? undefined, to: q.get('to') ?? undefined, categoryId: q.get('categoryId') ?? undefined, paymentMethod: q.get('paymentMethod') ?? undefined })); });
router.post('/expenses', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).createExpense(current.id, await body(request, expenseSchema)), 201); });
router.patch('/expenses/:expenseId', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).updateExpense(current.id, id(request, 'expenseId'), await body(request, updateExpenseSchema))); });
router.delete('/expenses/:expenseId', async (request, env, identity) => { const current = await user(env, identity); await service(env).deleteExpense(current.id, id(request, 'expenseId')); return noContent(); });

router.get('/planned-expenses', async (request, env, identity) => { const current = await user(env, identity); const q = query(request); return json(await service(env).plannedExpenses(current.id, q.get('cycleId') ?? undefined, q.get('status') ?? undefined)); });
router.post('/planned-expenses', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).createPlannedExpense(current.id, await body(request, plannedExpenseSchema)), 201); });
router.post('/planned-expenses/:plannedExpenseId/confirm', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).confirmPlannedExpense(current.id, id(request, 'plannedExpenseId'), await body(request, confirmPlannedSchema))); });

router.get('/recurring-expenses', async (_request, env, identity) => { const current = await user(env, identity); return json(await service(env).recurringExpenses(current.id)); });
router.post('/recurring-expenses', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).createRecurringExpense(current.id, await body(request, recurringExpenseSchema)), 201); });
router.patch('/recurring-expenses/:recurringExpenseId', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).updateRecurringExpense(current.id, id(request, 'recurringExpenseId'), await body(request, updateRecurringExpenseSchema))); });
router.delete('/recurring-expenses/:recurringExpenseId', async (request, env, identity) => { const current = await user(env, identity); await service(env).deleteRecurringExpense(current.id, id(request, 'recurringExpenseId')); return noContent(); });
router.post('/recurring-expenses/:recurringExpenseId/generate', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).generateRecurringExpense(current.id, id(request, 'recurringExpenseId'), await body(request, generateRecurringSchema)), 201); });

router.get('/income-rules', async (_request, env, identity) => { const current = await user(env, identity); return json(await service(env).incomeRules(current.id)); });
router.post('/income-rules', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).createIncomeRule(current.id, await body(request, incomeRuleSchema)), 201); });
router.post('/income-rules/:incomeRuleId/generate', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).generateIncomeRule(current.id, id(request, 'incomeRuleId'), await body(request, generateIncomeSchema)), 201); });

router.get('/saving-goals', async (_request, env, identity) => { const current = await user(env, identity); return json(await service(env).savingGoals(current.id)); });
router.post('/saving-goals', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).createSavingGoal(current.id, await body(request, savingGoalSchema)), 201); });
router.patch('/saving-goals/:savingGoalId', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).updateSavingGoal(current.id, id(request, 'savingGoalId'), await body(request, updateSavingGoalSchema))); });
router.delete('/saving-goals/:savingGoalId', async (request, env, identity) => { const current = await user(env, identity); await service(env).deleteSavingGoal(current.id, id(request, 'savingGoalId')); return noContent(); });
router.get('/savings-rules', async (_request, env, identity) => { const current = await user(env, identity); return json(await service(env).savingsRules(current.id)); });
router.post('/savings-rules', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).createSavingsRule(current.id, await body(request, savingsRuleSchema)), 201); });
router.patch('/savings-rules/:savingRuleId', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).updateSavingsRule(current.id, id(request, 'savingRuleId'), await body(request, updateSavingsRuleSchema))); });
router.delete('/savings-rules/:savingRuleId', async (request, env, identity) => { const current = await user(env, identity); await service(env).deleteSavingsRule(current.id, id(request, 'savingRuleId')); return noContent(); });
router.get('/saving-allocations', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).savingAllocations(current.id, query(request).get('cycleId') ?? undefined)); });
router.post('/saving-allocations', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).createSavingAllocation(current.id, await body(request, savingAllocationSchema)), 201); });

router.get('/credit-card-statements', async (request, env, identity) => { const current = await user(env, identity); const q = query(request); return json(await service(env).statements(current.id, q.get('creditCardId') ?? undefined, q.get('cycleId') ?? undefined)); });
router.post('/credit-card-statements', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).createStatement(current.id, await body(request, statementSchema)), 201); });
router.get('/credit-card-statements/:statementId/reconciliation', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).reconciliation(current.id, id(request, 'statementId'))); });
router.post('/credit-card-statements/:statementId/adjust', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).adjustStatement(current.id, id(request, 'statementId'), await body(request, adjustmentSchema))); });
router.post('/credit-card-statements/:statementId/mark-paid', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).markStatementPaid(current.id, id(request, 'statementId'))); });

router.get('/notification-settings', async (_request, env, identity) => { const current = await user(env, identity); return json(await service(env).notifications(current.id)); });
router.patch('/notification-settings/:type', async (request, env, identity) => { const current = await user(env, identity); return json(await service(env).updateNotification(current.id, id(request, 'type'), await body(request, notificationSchema))); });

router.get('/dashboard', async (_request, env, identity) => { const current = await user(env, identity); return json(await service(env).dashboard(current.id)); });
router.all('*', () => json({ error: { code: 'NOT_FOUND', message: 'Route was not found' } }, 404));

export { router };
