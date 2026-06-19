import type { Identity } from '../middleware/auth';
import type { AppRepository } from '../repositories/app-repository';
import { calculateBudget, validateCycleDates, type Granularity } from '../domain/budget';
import { AppError } from '../shared/errors';

const today = () => new Date().toISOString().slice(0, 10);
type User = NonNullable<Awaited<ReturnType<AppRepository['userBySubject']>>>;

export class AppService {
  constructor(private readonly repository: AppRepository) {}

  private async assertDateInCycle(userId: string, cycleId: string, date: string): Promise<void> {
    const cycle = await this.repository.cycle(userId, cycleId);
    if (date < cycle.startDate || date > cycle.endDate) throw new AppError('VALIDATION_ERROR', 'The transaction date must be inside the selected cycle', 400);
  }

  requireUser(identity: Identity): Promise<User> {
    return this.repository.userBySubject(identity.sub).then((user) => {
      if (!user) throw new AppError('NOT_FOUND', 'Sync the authenticated user with POST /me/sync first', 404);
      return user;
    });
  }
  sync(identity: Identity, input: { email: string; displayName: string }) { return this.repository.syncUser(identity.sub, input.email, input.displayName); }
  settings(userId: string) { return this.repository.settings(userId); }
  updateSettings(userId: string, input: Parameters<AppRepository['updateSettings']>[1]) { return this.repository.updateSettings(userId, input); }
  accounts(userId: string, type?: string) { return this.repository.listAccounts(userId, type); }
  account(userId: string, id: string) { return this.repository.account(userId, id); }
  createAccount(userId: string, input: Parameters<AppRepository['createAccount']>[1]) { return this.repository.createAccount(userId, input); }
  updateAccount(userId: string, id: string, input: Parameters<AppRepository['updateAccount']>[2]) { return this.repository.updateAccount(userId, id, input); }
  deleteAccount(userId: string, id: string) { return this.repository.deactivateAccount(userId, id); }
  categories(userId: string) { return this.repository.listCategories(userId); }
  createCategory(userId: string, name: string) { return this.repository.createCategory(userId, name); }
  updateCategory(userId: string, id: string, name: string) { return this.repository.updateCategory(userId, id, name); }
  deleteCategory(userId: string, id: string) { return this.repository.deactivateCategory(userId, id); }
  cards(userId: string) { return this.repository.listCards(userId); }
  createCard(userId: string, input: Parameters<AppRepository['createCard']>[1]) { return this.repository.createCard(userId, input); }
  updateCard(userId: string, id: string, input: Parameters<AppRepository['updateCard']>[2]) { return this.repository.updateCard(userId, id, input); }
  deleteCard(userId: string, id: string) { return this.repository.deactivateCard(userId, id); }
  transfers(userId: string, from?: string, to?: string) { return this.repository.listTransfers(userId, from, to); }
  createTransfer(userId: string, input: Parameters<AppRepository['createTransfer']>[1]) { return this.repository.createTransfer(userId, input); }
  cycles(userId: string, from?: string, to?: string) { return this.repository.listCycles(userId, from, to); }
  cycle(userId: string, id: string) { return this.repository.cycle(userId, id); }
  currentCycle(userId: string) { return this.repository.currentCycle(userId, today()); }
  async createCycle(userId: string, input: Parameters<AppRepository['createCycle']>[1]) {
    try { validateCycleDates(input.startDate, input.endDate); } catch (error) { throw new AppError('VALIDATION_ERROR', (error as Error).message, 400); }
    if (await this.repository.overlappingCycle(userId, input.startDate, input.endDate)) throw new AppError('CONFLICT', 'Budget cycles cannot overlap', 409);
    return this.repository.createCycle(userId, input);
  }
  async updateCycle(userId: string, id: string, input: Parameters<AppRepository['updateCycle']>[2]) {
    const old = await this.repository.cycle(userId, id); const merged = { ...old, ...input };
    try { validateCycleDates(merged.startDate, merged.endDate); } catch (error) { throw new AppError('VALIDATION_ERROR', (error as Error).message, 400); }
    if (await this.repository.overlappingCycle(userId, merged.startDate, merged.endDate, id)) throw new AppError('CONFLICT', 'Budget cycles cannot overlap', 409);
    return this.repository.updateCycle(userId, id, input);
  }
  deleteCycle(userId: string, id: string) { return this.repository.deleteCycle(userId, id); }
  incomes(userId: string, filters: Parameters<AppRepository['listIncomes']>[1]) { return this.repository.listIncomes(userId, filters); }
  async createIncome(userId: string, input: Parameters<AppRepository['createIncome']>[1]) { await this.assertDateInCycle(userId, input.cycleId, input.incomeDate); return this.repository.createIncome(userId, input); }
  async updateIncome(userId: string, id: string, input: Parameters<AppRepository['updateIncome']>[2]) { const old = await this.repository.income(userId, id); await this.assertDateInCycle(userId, input.cycleId ?? old.cycleId, input.incomeDate ?? old.incomeDate); return this.repository.updateIncome(userId, id, input); }
  deleteIncome(userId: string, id: string) { return this.repository.deleteIncome(userId, id); }
  expenses(userId: string, filters: Parameters<AppRepository['listExpenses']>[1], limit?: number) { return this.repository.listExpenses(userId, filters, limit); }
  async createExpense(userId: string, input: Parameters<AppRepository['createExpense']>[1]) { await this.assertDateInCycle(userId, input.cycleId, input.expenseDate); return this.repository.createExpense(userId, input); }
  async updateExpense(userId: string, id: string, input: Parameters<AppRepository['updateExpense']>[2]) {
    const old = await this.repository.expense(userId, id); const merged = { ...old, ...input };
    await this.assertDateInCycle(userId, merged.cycleId, merged.expenseDate);
    if (merged.paymentMethod === 'credit_card' && !merged.creditCardId) throw new AppError('VALIDATION_ERROR', 'creditCardId is required for credit_card', 400);
    if (merged.paymentMethod !== 'credit_card' && !merged.accountId) throw new AppError('VALIDATION_ERROR', 'accountId is required for non-card payments', 400);
    return this.repository.updateExpense(userId, id, input);
  }
  deleteExpense(userId: string, id: string) { return this.repository.deleteExpense(userId, id); }
  plannedExpenses(userId: string, cycleId?: string, status?: string) { return this.repository.listPlanned(userId, cycleId, status); }
  async createPlannedExpense(userId: string, input: Parameters<AppRepository['createPlanned']>[1]) { await this.assertDateInCycle(userId, input.cycleId, input.plannedDate); return this.repository.createPlanned(userId, input); }
  async confirmPlannedExpense(userId: string, id: string, input: { actualAmount: number; confirmedDate: string }) { const planned = await this.repository.planned(userId, id); await this.assertDateInCycle(userId, planned.cycleId, input.confirmedDate); return this.repository.confirmPlanned(userId, id, input.actualAmount, input.confirmedDate); }
  recurringExpenses(userId: string) { return this.repository.listRecurring(userId); }
  createRecurringExpense(userId: string, input: Parameters<AppRepository['createRecurring']>[1]) { return this.repository.createRecurring(userId, input); }
  async updateRecurringExpense(userId: string, id: string, input: Parameters<AppRepository['updateRecurring']>[2]) { const old = await this.repository.recurring(userId, id); const merged = { ...old, ...input }; if (merged.isAmountFixed && !merged.amount) throw new AppError('VALIDATION_ERROR', 'amount is required when isAmountFixed is true', 400); if (!merged.isAmountFixed && !merged.estimatedAmount) throw new AppError('VALIDATION_ERROR', 'estimatedAmount is required when isAmountFixed is false', 400); if (merged.paymentMethod === 'credit_card' && !merged.creditCardId) throw new AppError('VALIDATION_ERROR', 'creditCardId is required for credit_card', 400); if (merged.paymentMethod !== 'credit_card' && !merged.accountId) throw new AppError('VALIDATION_ERROR', 'accountId is required for non-card payments', 400); return this.repository.updateRecurring(userId, id, input); }
  deleteRecurringExpense(userId: string, id: string) { return this.repository.deactivateRecurring(userId, id); }
  generateRecurringExpense(userId: string, id: string, input: { cycleId: string; targetDate: string }) { return this.repository.generateRecurring(userId, id, input.cycleId, input.targetDate); }
  incomeRules(userId: string) { return this.repository.listIncomeRules(userId); }
  createIncomeRule(userId: string, input: Parameters<AppRepository['createIncomeRule']>[1]) { return this.repository.createIncomeRule(userId, input); }
  async generateIncomeRule(userId: string, id: string, input: { cycleId: string; incomeDate: string; amount?: number }) { await this.assertDateInCycle(userId, input.cycleId, input.incomeDate); return this.repository.generateIncomeRule(userId, id, input.cycleId, input.incomeDate, input.amount); }
  savingGoals(userId: string) { return this.repository.listSavingGoals(userId); }
  createSavingGoal(userId: string, input: Parameters<AppRepository['createSavingGoal']>[1]) { return this.repository.createSavingGoal(userId, input); }
  updateSavingGoal(userId: string, id: string, input: Parameters<AppRepository['updateSavingGoal']>[2]) { return this.repository.updateSavingGoal(userId, id, input); }
  deleteSavingGoal(userId: string, id: string) { return this.repository.deactivateSavingGoal(userId, id); }
  savingsRules(userId: string) { return this.repository.listSavingsRules(userId); }
  createSavingsRule(userId: string, input: Parameters<AppRepository['createSavingsRule']>[1]) { return this.repository.createSavingsRule(userId, input); }
  createSavingAllocation(userId: string, input: Parameters<AppRepository['createSavingAllocation']>[1]) { return this.repository.createSavingAllocation(userId, input); }
  notifications(userId: string) { return this.repository.listNotifications(userId); }
  updateNotification(userId: string, type: string, input: { enabled: boolean; timing?: string | null }) { const types = ['salary_input_reminder', 'fixed_expense_reminder', 'overspending_alert', 'cycle_end_reminder', 'missing_input_reminder']; if (!types.includes(type)) throw new AppError('VALIDATION_ERROR', 'Unknown notification type', 400); return this.repository.updateNotification(userId, type, input); }
  statements(userId: string, cardId?: string, cycleId?: string) { return this.repository.listStatements(userId, cardId, cycleId); }
  createStatement(userId: string, input: Parameters<AppRepository['createStatement']>[1]) {
    if (input.statementStartDate > input.statementEndDate) throw new AppError('VALIDATION_ERROR', 'statementStartDate must not be after statementEndDate', 400);
    return this.repository.createStatement(userId, input);
  }
  async reconciliation(userId: string, statementId: string) { const statement = await this.repository.statement(userId, statementId); const matchedExpenses = await this.repository.statementExpenses(userId, statement.creditCardId, statement.statementStartDate, statement.statementEndDate); return { statementId, billedAmount: statement.billedAmount, recordedAmount: statement.recordedAmount, differenceAmount: statement.differenceAmount, matchedExpenses, status: statement.status }; }
  async adjustStatement(userId: string, statementId: string, input: { adjustmentType: 'unknown_expense' | 'fee' | 'edit_existing_expense' | 'ignore'; amount: number; categoryId?: string; memo?: string }) {
    if (input.adjustmentType === 'ignore') return this.repository.ignoreStatementDifference(userId, statementId);
    if (input.adjustmentType === 'edit_existing_expense') throw new AppError('VALIDATION_ERROR', 'Edit the existing expense with PATCH /expenses/{expenseId}', 400);
    const statement = await this.repository.statement(userId, statementId);
    if (statement.differenceAmount < 0) throw new AppError('VALIDATION_ERROR', 'When the billed amount is lower, edit an existing expense or ignore the difference', 400);
    if (input.amount > statement.differenceAmount) throw new AppError('VALIDATION_ERROR', 'Adjustment amount cannot exceed the statement difference', 400);
    if (!input.categoryId) throw new AppError('VALIDATION_ERROR', 'categoryId is required for an adjustment expense', 400);
    return this.repository.addStatementAdjustment(userId, statementId, input.categoryId, input.amount, input.adjustmentType === 'fee' ? 'カード手数料・年会費' : '不明なカード支出', input.memo);
  }
  markStatementPaid(userId: string, id: string) { return this.repository.markStatementPaid(userId, id); }
  async summary(userId: string, cycleId: string) {
    const [cycle, settings, totals] = await Promise.all([this.repository.cycle(userId, cycleId), this.repository.settings(userId), this.repository.budgetTotals(userId, cycleId)]);
    const result = calculateBudget({ startDate: cycle.startDate, endDate: cycle.endDate, today: today(), income: totals.income, carryover: totals.carryover, fixedExpenses: totals.fixed, plannedExpenses: totals.planned, savings: totals.savings, actualExpenses: totals.actual, granularity: settings.defaultBudgetGranularity as Granularity });
    return { cycleId, period: { startDate: cycle.startDate, endDate: cycle.endDate, resetType: cycle.resetType, totalDays: result.totalDays, elapsedDays: result.elapsedDays, remainingDays: result.remainingDays }, income: { total: totals.income }, carryover: { amount: totals.carryover, policy: totals.carryover ? 'add_to_next_cycle' : null }, fixedExpenses: { total: totals.fixed }, plannedExpenses: { total: totals.planned, reflectedTotal: totals.planned }, savings: { total: totals.savings }, spendingLimit: result.spendingLimit, actualExpenses: { total: totals.actual, cash: totals.actual - totals.card, creditCard: totals.card }, remainingAmount: result.remainingAmount, budgetDisplay: result.budgetDisplay, pace: result.pace };
  }
  async currentSummary(userId: string) { const cycle = await this.currentCycle(userId); return this.summary(userId, cycle.id); }
  async closeCycle(userId: string, cycleId: string, policy: 'add_to_next_cycle' | 'move_to_savings' | 'keep_as_remaining') { const cycle = await this.repository.cycle(userId, cycleId); if (cycle.isClosed) throw new AppError('CONFLICT', 'The cycle is already closed', 409); const summary = await this.summary(userId, cycleId); const amount = Math.max(0, summary.remainingAmount); const next = policy === 'add_to_next_cycle' ? await this.repository.nextCycle(userId, cycle.endDate) : undefined; if (policy === 'add_to_next_cycle' && !next) throw new AppError('CONFLICT', 'Create the next cycle before carrying the balance forward', 409); await this.repository.closeCycle(userId, cycleId, amount, policy, next?.id); return { closedCycleId: cycleId, remainingAmount: amount, carryoverPolicy: policy, nextCycleId: next?.id ?? null }; }
  async dashboard(userId: string) { const cycle = await this.currentCycle(userId); const [summary, recent] = await Promise.all([this.summary(userId, cycle.id), this.repository.listExpenses(userId, { cycleId: cycle.id }, 5)]); return { currentCycle: cycle, budgetSummary: { spendingLimit: summary.spendingLimit, remainingAmount: summary.remainingAmount, granularity: summary.budgetDisplay.granularity, unitLabel: summary.budgetDisplay.unitLabel, availablePerUnit: summary.budgetDisplay.availablePerUnit, isOverPace: summary.pace.isOverPace }, recentExpenses: recent, alerts: [] }; }
}
