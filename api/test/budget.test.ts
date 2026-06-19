import { calculateBudget, validateCycleDates } from '../src/domain/budget';

describe('budget calculation', () => {
  it('calculates the spending limit, remaining amount and daily pace without double-counting reserved costs', () => {
    const result = calculateBudget({ startDate: '2026-06-01', endDate: '2026-06-30', today: '2026-06-10', income: 250_000, carryover: 10_000, fixedExpenses: 90_000, plannedExpenses: 8_000, savings: 30_000, actualExpenses: 56_000, granularity: 'daily' });
    expect(result).toMatchObject({ totalDays: 30, elapsedDays: 10, remainingDays: 21, spendingLimit: 132_000, remainingAmount: 76_000 });
    expect(result.budgetDisplay).toEqual({ granularity: 'daily', unitLabel: '1日あたり', availablePerUnit: 3619, remainingUnits: 21 });
    expect(result.pace.isOverPace).toBe(true);
  });

  it.each([
    ['weekly', 3, 25_333], ['biweekly', 2, 38_000], ['monthly', 1, 76_000],
  ] as const)('supports %s display granularity', (granularity, units, amount) => {
    const result = calculateBudget({ startDate: '2026-06-01', endDate: '2026-06-30', today: '2026-06-10', income: 132_000, carryover: 0, fixedExpenses: 0, plannedExpenses: 0, savings: 0, actualExpenses: 56_000, granularity });
    expect(result.budgetDisplay.remainingUnits).toBe(units); expect(result.budgetDisplay.availablePerUnit).toBe(amount);
  });

  it('rejects custom periods longer than one month', () => {
    expect(() => validateCycleDates('2026-06-01', '2026-07-02')).toThrow('between 1 and 31 days');
  });
});
