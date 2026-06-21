import type { APIRoute } from 'astro';
import { buildApiHeaders, createSessionToken, getAuthMode, setSessionCookie } from '../../../lib/server/auth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  if (getAuthMode() !== 'local') return redirect('/login?error=provider', 303);
  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const displayName = String(form.get('displayName') ?? '').trim();
  const mode = String(form.get('mode') ?? 'login');
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return redirect(`/${mode === 'signup' ? 'signup' : 'login'}?error=1`, 303);
  const base = import.meta.env.PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8787';
  try {
    const sessionToken = await createSessionToken({ sub: `local:${email}`, email, displayName: displayName || email });
    let resolvedDisplayName = displayName;
    if (mode === 'login') {
      const existing = await fetch(`${base}/me`, { headers: buildApiHeaders(sessionToken) });
      if (existing.status === 404) return redirect(`/signup?error=unregistered&email=${encodeURIComponent(email)}`, 303);
      if (!existing.ok) return redirect('/login?error=api', 303);
      const current = await existing.json() as { displayName?: string };
      resolvedDisplayName = current.displayName?.trim() || email;
    } else if (!resolvedDisplayName) {
      return redirect('/signup?error=1', 303);
    }
    const finalizedToken = await createSessionToken({ sub: `local:${email}`, email, displayName: resolvedDisplayName });
    const result = await fetch(`${base}/me/sync`, {
      method: 'POST', headers: buildApiHeaders(finalizedToken),
      body: JSON.stringify({ email, displayName: resolvedDisplayName }),
    });
    if (!result.ok) return redirect(`/${mode === 'signup' ? 'signup' : 'login'}?error=api`, 303);
    const [accounts, categories, currentCycle] = await Promise.all([
      fetch(`${base}/accounts`, { headers: buildApiHeaders(finalizedToken) }),
      fetch(`${base}/expense-categories`, { headers: buildApiHeaders(finalizedToken) }),
      fetch(`${base}/budget-cycles/current`, { headers: buildApiHeaders(finalizedToken) }),
    ]);
    const accountList = accounts.ok ? await accounts.json() as unknown[] : [];
    const categoryList = categories.ok ? await categories.json() as unknown[] : [];
    const setupComplete = accountList.length > 0 && categoryList.length > 0 && currentCycle.ok;
    await setSessionCookie(cookies, { sub: `local:${email}`, email, displayName: resolvedDisplayName });
    return redirect(setupComplete ? '/dashboard' : '/onboarding', 303);
  } catch {
    return redirect(`/${mode === 'signup' ? 'signup' : 'login'}?error=offline`, 303);
  }
};
