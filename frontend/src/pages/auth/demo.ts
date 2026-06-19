import { clearSession, setSession } from '../../lib/auth';
import { apiPost } from '../../lib/api';
import { config } from '../../lib/config';

export async function POST({ request, cookies, redirect }: any) {
  if (!config.allowDemoLogin) {
    return redirect('/login?error=demo_disabled');
  }

  const form = await request.formData();
  const displayName = String(form.get('displayName') ?? 'Demo User').trim() || 'Demo User';
  const email = String(form.get('email') ?? 'demo@example.com').trim() || 'demo@example.com';

  try {
    await apiPost('/me/sync', { email, displayName });
  } catch {
    // Development mode can fall back to the local bypass; production should not expose this path.
  }

  clearSession(cookies);
  setSession(cookies, { mode: 'demo', email, displayName }, 60 * 60 * 24 * 30);

  return redirect('/');
}
