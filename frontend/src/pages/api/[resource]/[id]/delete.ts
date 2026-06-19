import { apiDelete } from '../../../../lib/api';
import { getSession } from '../../../../lib/auth';
import { redirectPath } from '../../../../lib/forms';

const resourceToPath: Record<string, string> = {
  accounts: '/accounts',
  cards: '/credit-cards',
  categories: '/expense-categories',
  cycles: '/budget-cycles',
  expenses: '/expenses',
  incomes: '/incomes',
};

export async function POST({ params, cookies, redirect }: any) {
  const session = getSession(cookies);
  if (!session) return redirect('/login');

  const resource = String(params.resource ?? '');
  const id = String(params.id ?? '');
  const apiPath = resourceToPath[resource];
  if (!apiPath || !id) return redirect(redirectPath(resource));

  try {
    await apiDelete(`${apiPath}/${id}`, session);
  } catch {
    // ignore and redirect back with the current state
  }

  return redirect(redirectPath(resource));
}
