import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const displayName = String(form.get('displayName') ?? '').trim();
  const mode = String(form.get('mode') ?? 'login');
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return redirect(`/${mode === 'signup' ? 'signup' : 'login'}?error=1`, 303);
  const base = import.meta.env.PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8787';
  try {
    let resolvedDisplayName = displayName;
    if (mode === 'login') {
      const existing = await fetch(`${base}/me`, { headers: { 'x-pocket-pace-user': email } });
      if (existing.status === 404) return redirect(`/signup?error=unregistered&email=${encodeURIComponent(email)}`, 303);
      if (!existing.ok) return redirect('/login?error=api', 303);
      const current = await existing.json() as { displayName?: string };
      resolvedDisplayName = current.displayName?.trim() || email;
    } else if (!resolvedDisplayName) {
      return redirect('/signup?error=1', 303);
    }
    const result = await fetch(`${base}/me/sync`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-pocket-pace-user': email },
      body: JSON.stringify({ email, displayName: resolvedDisplayName }),
    });
    if (!result.ok) return redirect(`/${mode === 'signup' ? 'signup' : 'login'}?error=api`, 303);
    const [accounts, categories, currentCycle] = await Promise.all([
      fetch(`${base}/accounts`, { headers: { 'x-pocket-pace-user': email } }),
      fetch(`${base}/expense-categories`, { headers: { 'x-pocket-pace-user': email } }),
      fetch(`${base}/budget-cycles/current`, { headers: { 'x-pocket-pace-user': email } }),
    ]);
    const accountList = accounts.ok ? await accounts.json() as unknown[] : [];
    const categoryList = categories.ok ? await categories.json() as unknown[] : [];
    const setupComplete = accountList.length > 0 && categoryList.length > 0 && currentCycle.ok;
    cookies.set('pp_session', JSON.stringify({ email, displayName }), { httpOnly: true, sameSite: 'lax', secure: import.meta.env.PROD, path: '/', maxAge: 60 * 60 * 24 * 30 });
    return redirect(setupComplete ? '/dashboard' : '/onboarding', 303);
  } catch {
    return redirect(`/${mode === 'signup' ? 'signup' : 'login'}?error=offline`, 303);
  }
};
