import { apiPost } from '../../../../lib/api';
import { getSession } from '../../../../lib/auth';

export async function POST({ params, request, cookies, redirect }: any) {
  const session = getSession(cookies);
  if (!session) return redirect('/login');

  const form = await request.formData();
  const carryoverPolicy = String(form.get('carryoverPolicy') ?? 'keep_as_remaining');

  try {
    await apiPost(`/budget-cycles/${String(params.id)}/close`, { carryoverPolicy }, session);
  } catch {
    // ignore and keep redirecting back
  }

  return redirect('/cycles');
}
