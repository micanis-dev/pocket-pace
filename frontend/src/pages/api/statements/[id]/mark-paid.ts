import { apiPost } from '../../../../lib/api';
import { getSession } from '../../../../lib/auth';

export async function POST({ params, cookies, redirect }: any) {
  const session = getSession(cookies);
  if (!session) return redirect('/login');

  try {
    await apiPost(`/credit-card-statements/${String(params.id)}/mark-paid`, {}, session);
  } catch {
    // ignore and redirect back
  }

  return redirect('/statements');
}
