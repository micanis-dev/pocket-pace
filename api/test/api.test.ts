import { applyD1Migrations, env, SELF } from 'cloudflare:test';

const call = (path: string, init?: RequestInit) => {
  const headers = new Headers(init?.headers);
  headers.set('x-pocket-pace-user', 'test@example.com');
  return SELF.fetch(`http://example.com${path}`, { ...init, headers });
};
const post = (path: string, value: unknown) => call(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) });
const callAs = (email: string, path: string, init?: RequestInit) => {
  const headers = new Headers(init?.headers);
  headers.set('x-pocket-pace-user', email);
  return SELF.fetch(`http://example.com${path}`, { ...init, headers });
};
const postAs = (email: string, path: string, value: unknown) => callAs(email, path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) });

beforeEach(async () => { await applyD1Migrations(env.DB, env.TEST_MIGRATIONS); });

describe('Pocket-Pace Worker API', () => {
  it('requires a local user identity outside the health endpoint', async () => {
    expect((await SELF.fetch('http://example.com/health')).status).toBe(200);
    expect((await SELF.fetch('http://example.com/me')).status).toBe(401);
  });

  it('runs the core budget workflow and preserves account/card accounting rules', async () => {
    expect((await call('/health')).status).toBe(200);
    expect((await call('/me')).status).toBe(404);
    const sync = await post('/me/sync', { email: 'test@example.com', displayName: 'Tester' });
    expect(sync.status).toBe(201);

    const account = await (await post('/accounts', { name: 'Main', type: 'bank', initialBalance: 100_000 })).json<Record<string, unknown>>();
    const category = await (await post('/expense-categories', { name: 'Food' })).json<Record<string, unknown>>();
    const cycle = await (await post('/budget-cycles', { name: 'June', startDate: '2026-06-01', endDate: '2026-06-30', resetType: 'calendar_based' })).json<Record<string, unknown>>();
    const income = await post('/incomes', { cycleId: cycle.id, accountId: account.id, name: 'Salary', amount: 250_000, incomeDate: '2026-06-01', type: 'salary' });
    expect(income.status).toBe(201);

    const cashExpense = await post('/expenses', { cycleId: cycle.id, accountId: account.id, categoryId: category.id, name: 'Lunch', amount: 1_000, expenseDate: '2026-06-10', paymentMethod: 'debit' });
    expect(cashExpense.status).toBe(201);
    const card = await (await post('/credit-cards', { name: 'Card', closingDay: 30, paymentDay: 27, withdrawalAccountId: account.id })).json<Record<string, unknown>>();
    expect((await post('/expenses', { cycleId: cycle.id, creditCardId: card.id, categoryId: category.id, name: 'Dinner', amount: 2_000, expenseDate: '2026-06-11', paymentMethod: 'credit_card' })).status).toBe(201);

    const currentAccount = await (await call(`/accounts/${String(account.id)}`)).json<{ currentBalance: number }>();
    expect(currentAccount.currentBalance).toBe(349_000);
    const summary = await (await call(`/budget-cycles/${String(cycle.id)}/summary`)).json<{ spendingLimit: number; remainingAmount: number; actualExpenses: { total: number; creditCard: number } }>();
    expect(summary).toMatchObject({ spendingLimit: 250_000, remainingAmount: 247_000, actualExpenses: { total: 3_000, creditCard: 2_000 } });

    const statement = await (await post('/credit-card-statements', { creditCardId: card.id, cycleId: cycle.id, statementStartDate: '2026-06-01', statementEndDate: '2026-06-30', paymentDate: '2026-06-27', billedAmount: 2_000 })).json<Record<string, unknown>>();
    expect(statement).toMatchObject({ recordedAmount: 2_000, differenceAmount: 0, status: 'matched' });
    const paid = await (await post(`/credit-card-statements/${String(statement.id)}/mark-paid`, {})).json<Record<string, unknown>>();
    expect(paid.status).toBe('paid');
    const afterPayment = await (await call(`/accounts/${String(account.id)}`)).json<{ currentBalance: number }>();
    expect(afterPayment.currentBalance).toBe(347_000);
    const afterSummary = await (await call(`/budget-cycles/${String(cycle.id)}/summary`)).json<{ actualExpenses: { total: number } }>();
    expect(afterSummary.actualExpenses.total).toBe(3_000);
  });

  it('rejects overlapping cycles', async () => {
    await post('/me/sync', { email: 'test@example.com', displayName: 'Tester' });
    expect((await post('/budget-cycles', { name: 'June 2027', startDate: '2027-06-01', endDate: '2027-06-30', resetType: 'calendar_based' })).status).toBe(201);
    const overlap = await post('/budget-cycles', { name: 'Overlap', startDate: '2027-06-15', endDate: '2027-07-14', resetType: 'custom' });
    expect(overlap.status).toBe(409);
  });

  it('supports transfers, planned and recurring costs, income rules, savings, notifications, and cycle closing', async () => {
    await post('/me/sync', { email: 'test@example.com', displayName: 'Tester' });
    const source = await (await post('/accounts', { name: 'Source 2028', type: 'bank', initialBalance: 100_000 })).json<Record<string, unknown>>();
    const target = await (await post('/accounts', { name: 'Wallet 2028', type: 'wallet', initialBalance: 0 })).json<Record<string, unknown>>();
    const category = await (await post('/expense-categories', { name: 'Utilities 2028' })).json<Record<string, unknown>>();
    const cycle = await (await post('/budget-cycles', { name: 'June 2028', startDate: '2028-06-01', endDate: '2028-06-30', resetType: 'calendar_based' })).json<Record<string, unknown>>();
    const next = await (await post('/budget-cycles', { name: 'July 2028', startDate: '2028-07-01', endDate: '2028-07-31', resetType: 'calendar_based' })).json<Record<string, unknown>>();

    expect((await post('/account-transfers', { fromAccountId: source.id, toAccountId: target.id, amount: 10_000, transferDate: '2028-06-02' })).status).toBe(201);
    const rule = await (await post('/income-rules', { accountId: source.id, name: 'Salary 2028', amount: 200_000, incomeDay: 1, inputMode: 'auto' })).json<Record<string, unknown>>();
    const generatedIncome = await (await post(`/income-rules/${String(rule.id)}/generate`, { cycleId: cycle.id, incomeDate: '2028-06-01' })).json<Record<string, unknown>>();

    const planned = await (await post('/planned-expenses', { cycleId: cycle.id, accountId: source.id, categoryId: category.id, name: 'Electricity', estimatedAmount: 8_000, plannedDate: '2028-06-20', paymentMethod: 'bank_transfer', reflectToBudget: true })).json<Record<string, unknown>>();
    expect((await post(`/planned-expenses/${String(planned.id)}/confirm`, { actualAmount: 7_000, confirmedDate: '2028-06-19' })).status).toBe(200);

    const recurring = await (await post('/recurring-expenses', { accountId: source.id, categoryId: category.id, name: 'Rent', amount: 50_000, paymentMethod: 'bank_transfer', billingDay: 25, isAmountFixed: true })).json<Record<string, unknown>>();
    expect((await post(`/recurring-expenses/${String(recurring.id)}/generate`, { cycleId: cycle.id, targetDate: '2028-06-25' })).status).toBe(201);

    const goal = await (await post('/saving-goals', { name: 'Emergency 2028', targetAmount: 500_000 })).json<Record<string, unknown>>();
    expect((await post('/savings-rules', { name: 'Monthly saving 2028', type: 'fixed_amount', amount: 20_000 })).status).toBe(201);
    expect((await post('/saving-allocations', { cycleId: cycle.id, incomeId: generatedIncome.id, savingGoalId: goal.id, amount: 20_000 })).status).toBe(201);
    expect((await call('/notification-settings/overspending_alert', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ enabled: true, timing: 'immediately' }) })).status).toBe(200);

    const summary = await (await call(`/budget-cycles/${String(cycle.id)}/summary`)).json<{ spendingLimit: number; actualExpenses: { total: number }; remainingAmount: number }>();
    expect(summary).toMatchObject({ spendingLimit: 123_000, actualExpenses: { total: 0 }, remainingAmount: 123_000 });
    const close = await (await post(`/budget-cycles/${String(cycle.id)}/close`, { carryoverPolicy: 'add_to_next_cycle' })).json<Record<string, unknown>>();
    expect(close).toMatchObject({ remainingAmount: 123_000, nextCycleId: next.id });
    const nextSummary = await (await call(`/budget-cycles/${String(next.id)}/summary`)).json<{ carryover: { amount: number } }>();
    expect(nextSummary.carryover.amount).toBe(123_000);

    const sourceAfter = await (await call(`/accounts/${String(source.id)}`)).json<{ currentBalance: number }>();
    const targetAfter = await (await call(`/accounts/${String(target.id)}`)).json<{ currentBalance: number }>();
    expect(sourceAfter.currentBalance).toBe(233_000);
    expect(targetAfter.currentBalance).toBe(10_000);
  });

  it('generates automatic salary income and reports missing manual salary on the dashboard', async () => {
    const email = 'automation@example.com';
    await postAs(email, '/me/sync', { email, displayName: 'Automation Tester' });
    const account = await (await postAs(email, '/accounts', { name: 'Salary account', type: 'bank', initialBalance: 0 })).json<Record<string, unknown>>();
    const category = await (await postAs(email, '/expense-categories', { name: 'Fixed cost' })).json<Record<string, unknown>>();
    await postAs(email, '/budget-cycles', { name: 'June 2026', startDate: '2026-06-01', endDate: '2026-06-30', resetType: 'calendar_based' });
    await postAs(email, '/income-rules', { accountId: account.id, name: 'Automatic salary', amount: 200_000, incomeDay: 1, inputMode: 'auto' });
    await postAs(email, '/income-rules', { accountId: account.id, name: 'Variable salary', amount: 50_000, incomeDay: 1, inputMode: 'manual_reminder' });
    await postAs(email, '/recurring-expenses', { accountId: account.id, categoryId: category.id, name: 'Automatic rent', amount: 10_000, paymentMethod: 'bank_transfer', billingDay: 1, isAmountFixed: true });
    await postAs(email, '/recurring-expenses', { accountId: account.id, categoryId: category.id, name: 'Variable utility', estimatedAmount: 8_000, paymentMethod: 'bank_transfer', billingDay: 25, isAmountFixed: false });

    const dashboard = await (await callAs(email, '/dashboard')).json<{ budgetSummary: { spendingLimit: number }; alerts: Array<{ type: string }> }>();
    expect(dashboard.budgetSummary.spendingLimit).toBe(182_000);
    expect(dashboard.alerts.some((alert) => alert.type === 'salary_input_reminder')).toBe(true);
    const incomes = await (await callAs(email, '/incomes')).json<Array<{ name: string }>>();
    expect(incomes.filter((income) => income.name === 'Automatic salary')).toHaveLength(1);

    await callAs(email, '/dashboard');
    const incomesAfterRefresh = await (await callAs(email, '/incomes')).json<Array<{ name: string }>>();
    expect(incomesAfterRefresh.filter((income) => income.name === 'Automatic salary')).toHaveLength(1);
    const expensesAfterRefresh = await (await callAs(email, '/expenses')).json<Array<{ name: string }>>();
    expect(expensesAfterRefresh.filter((expense) => expense.name === 'Automatic rent')).toHaveLength(1);
    const plannedAfterRefresh = await (await callAs(email, '/planned-expenses')).json<Array<{ name: string }>>();
    expect(plannedAfterRefresh.filter((expense) => expense.name === 'Variable utility')).toHaveLength(1);
  });

  it('persists expense defaults and creates one primary regular savings goal', async () => {
    const email = 'defaults@example.com';
    await postAs(email, '/me/sync', { email, displayName: 'Defaults Tester' });
    const account = await (await postAs(email, '/accounts', { name: 'Main wallet', type: 'wallet', initialBalance: 0 })).json<Record<string, unknown>>();
    const category = await (await postAs(email, '/expense-categories', { name: 'Daily' })).json<Record<string, unknown>>();
    const card = await (await postAs(email, '/credit-cards', { name: 'Main card', closingDay: 20, paymentDay: 10, withdrawalAccountId: account.id })).json<Record<string, unknown>>();
    const updated = await (await callAs(email, '/user-settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ defaultCategoryId: category.id, defaultPaymentMethod: 'credit_card', defaultAccountId: account.id, defaultCreditCardId: card.id }) })).json<Record<string, unknown>>();
    expect(updated).toMatchObject({ defaultCategoryId: category.id, defaultPaymentMethod: 'credit_card', defaultAccountId: account.id, defaultCreditCardId: card.id });

    const first = await (await callAs(email, '/saving-goals')).json<Array<Record<string, unknown>>>();
    const second = await (await callAs(email, '/saving-goals')).json<Array<Record<string, unknown>>>();
    expect(first.filter((goal) => goal.isPrimary)).toHaveLength(1);
    expect(second.filter((goal) => goal.isPrimary)).toHaveLength(1);
    const primary = second.find((goal) => goal.isPrimary)!;
    const rule = await postAs(email, '/savings-rules', { name: 'Regular saving', savingGoalId: primary.id, type: 'fixed_amount', amount: 10_000 });
    expect(rule.status).toBe(201);
    expect(await rule.json<Record<string, unknown>>()).toMatchObject({ savingGoalId: primary.id });
  });

  it('supports editing savings rules and listing saving allocation history', async () => {
    const email = 'savings-ui@example.com';
    await postAs(email, '/me/sync', { email, displayName: 'Savings UI Tester' });
    const account = await (await postAs(email, '/accounts', { name: 'Saving source', type: 'bank', initialBalance: 0 })).json<Record<string, unknown>>();
    const cycle = await (await postAs(email, '/budget-cycles', { name: 'June 2029', startDate: '2029-06-01', endDate: '2029-06-30', resetType: 'calendar_based' })).json<Record<string, unknown>>();
    const income = await (await postAs(email, '/incomes', { cycleId: cycle.id, accountId: account.id, name: 'Salary 2029', amount: 300_000, incomeDate: '2029-06-01', type: 'salary' })).json<Record<string, unknown>>();
    const goals = await (await callAs(email, '/saving-goals')).json<Array<Record<string, unknown>>>();
    const primary = goals.find((goal) => goal.isPrimary)!;

    const createdRule = await (await postAs(email, '/savings-rules', { name: 'Starter plan', savingGoalId: primary.id, type: 'fixed_amount', amount: 10_000 })).json<Record<string, unknown>>();
    const updatedRule = await (await callAs(email, `/savings-rules/${String(createdRule.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Updated plan', type: 'income_percentage', percentage: 15, amount: null }) })).json<Record<string, unknown>>();
    expect(updatedRule).toMatchObject({ name: 'Updated plan', type: 'income_percentage', percentage: 15, amount: null });

    expect((await postAs(email, '/saving-allocations', { cycleId: cycle.id, incomeId: income.id, savingGoalId: primary.id, amount: 45_000 })).status).toBe(201);
    const allocations = await (await callAs(email, `/saving-allocations?cycleId=${String(cycle.id)}`)).json<Array<Record<string, unknown>>>();
    expect(allocations[0]).toMatchObject({ savingGoalId: primary.id, incomeId: income.id, amount: 45_000 });

    expect((await callAs(email, `/savings-rules/${String(createdRule.id)}`, { method: 'DELETE' })).status).toBe(204);
    const remainingRules = await (await callAs(email, '/savings-rules')).json<Array<Record<string, unknown>>>();
    expect(remainingRules.some((rule) => rule.id === createdRule.id)).toBe(false);
  });
});
