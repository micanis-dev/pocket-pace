export type Granularity = 'daily' | 'weekly' | 'biweekly' | 'monthly';
export interface BudgetInput { startDate: string; endDate: string; today: string; income: number; carryover: number; fixedExpenses: number; plannedExpenses: number; savings: number; actualExpenses: number; granularity: Granularity }

const day = 86_400_000;
const parse = (value: string) => Date.parse(`${value}T00:00:00Z`);
const inclusiveDays = (start: string, end: string) => Math.floor((parse(end) - parse(start)) / day) + 1;

export function validateCycleDates(startDate: string, endDate: string): void {
  const days = inclusiveDays(startDate, endDate);
  if (days < 1 || days > 31) throw new Error('A budget cycle must contain between 1 and 31 days');
}

export function calculateBudget(input: BudgetInput) {
  const totalDays = inclusiveDays(input.startDate, input.endDate);
  const today = Math.min(Math.max(parse(input.today), parse(input.startDate)), parse(input.endDate));
  const elapsedDays = Math.floor((today - parse(input.startDate)) / day) + 1;
  const remainingDays = Math.max(1, totalDays - elapsedDays + 1);
  const spendingLimit = input.income + input.carryover - input.fixedExpenses - input.plannedExpenses - input.savings;
  const remainingAmount = spendingLimit - input.actualExpenses;
  const unitDays = input.granularity === 'weekly' ? 7 : input.granularity === 'biweekly' ? 14 : input.granularity === 'monthly' ? remainingDays : 1;
  const remainingUnits = input.granularity === 'monthly' ? 1 : Math.ceil(remainingDays / unitDays);
  const labels = { daily: '1日あたり', weekly: '1週間あたり', biweekly: '2週間あたり', monthly: '今期全体' } as const;
  return {
    totalDays, elapsedDays, remainingDays, spendingLimit, remainingAmount,
    budgetDisplay: { granularity: input.granularity, unitLabel: labels[input.granularity], availablePerUnit: Math.floor(remainingAmount / remainingUnits), remainingUnits },
    pace: { currentDailyAverage: Math.floor(input.actualExpenses / elapsedDays), expectedDailyAverage: Math.floor(spendingLimit / totalDays), isOverPace: input.actualExpenses / elapsedDays > spendingLimit / totalDays },
  };
}
