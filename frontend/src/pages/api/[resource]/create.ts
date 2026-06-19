import { apiPost } from '../../../lib/api';
import { getSession } from '../../../lib/auth';
import { number, optionalNullableText, requiredText, text } from '../../../lib/forms';

const resourceToPath: Record<string, string> = {
  accounts: '/accounts',
  cards: '/credit-cards',
  categories: '/expense-categories',
  cycles: '/budget-cycles',
  expenses: '/expenses',
  incomes: '/incomes',
  statements: '/credit-card-statements',
};

const redirectTo: Record<string, string> = {
  accounts: '/accounts',
  cards: '/cards',
  categories: '/categories',
  cycles: '/cycles',
  expenses: '/expenses',
  incomes: '/incomes',
  statements: '/statements',
};

export async function POST({ params, request, cookies, redirect }: any) {
  const session = getSession(cookies);
  if (!session) return redirect('/login');

  const resource = String(params.resource ?? '');
  const apiPath = resourceToPath[resource];
  const returnPath = redirectTo[resource] ?? '/';
  if (!apiPath) return redirect(returnPath);

  const form = await request.formData();
  const body = buildBody(resource, form);

  try {
    await apiPost(apiPath, body, session);
    return redirect(returnPath);
  } catch (error) {
    return redirect(`${returnPath}?error=${encodeURIComponent(error instanceof Error ? error.message : 'Failed to save')}`);
  }
}

function buildBody(resource: string, form: FormData) {
  switch (resource) {
    case 'accounts':
      return {
        name: requiredText(form, 'name'),
        type: requiredText(form, 'type'),
        initialBalance: number(form, 'initialBalance', 0),
      };
    case 'cards':
      return {
        name: requiredText(form, 'name'),
        closingDay: number(form, 'closingDay'),
        paymentDay: number(form, 'paymentDay'),
        withdrawalAccountId: requiredText(form, 'withdrawalAccountId'),
      };
    case 'categories':
      return { name: requiredText(form, 'name') };
    case 'cycles':
      return {
        name: requiredText(form, 'name'),
        startDate: requiredText(form, 'startDate'),
        endDate: requiredText(form, 'endDate'),
        resetType: requiredText(form, 'resetType'),
      };
    case 'expenses':
      return {
        cycleId: requiredText(form, 'cycleId'),
        accountId: optionalNullableText(form, 'accountId'),
        creditCardId: optionalNullableText(form, 'creditCardId'),
        categoryId: requiredText(form, 'categoryId'),
        name: requiredText(form, 'name'),
        amount: number(form, 'amount'),
        expenseDate: requiredText(form, 'expenseDate'),
        paymentMethod: requiredText(form, 'paymentMethod'),
        memo: text(form, 'memo') || null,
      };
    case 'incomes':
      return {
        cycleId: requiredText(form, 'cycleId'),
        accountId: requiredText(form, 'accountId'),
        name: requiredText(form, 'name'),
        amount: number(form, 'amount'),
        incomeDate: requiredText(form, 'incomeDate'),
        type: requiredText(form, 'type'),
      };
    case 'statements':
      return {
        creditCardId: requiredText(form, 'creditCardId'),
        cycleId: requiredText(form, 'cycleId'),
        statementStartDate: requiredText(form, 'statementStartDate'),
        statementEndDate: requiredText(form, 'statementEndDate'),
        paymentDate: requiredText(form, 'paymentDate'),
        billedAmount: number(form, 'billedAmount'),
      };
    default:
      return {};
  }
}
