import type { APIRoute } from 'astro';
import {
  buildApiHeaders,
  clearOAuthCookie,
  getAuthMode,
  getOidcConfig,
  readOAuthCookie,
  setSessionCookie,
} from '../../../lib/server/auth';

interface TokenResponse {
  access_token?: string;
  token_type?: string;
}

interface UserInfoResponse {
  sub?: string;
  email?: string;
  name?: string;
  preferred_username?: string;
}

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  if (getAuthMode() !== 'oidc') return redirect('/login', 303);
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauth = await readOAuthCookie(cookies);
  clearOAuthCookie(cookies);
  if (!code || !state || !oauth || oauth.state !== state) return redirect('/login?error=provider', 303);

  try {
    const config = getOidcConfig();
    const tokenResponse = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        code_verifier: oauth.verifier,
      }),
    });
    if (!tokenResponse.ok) return redirect('/login?error=provider', 303);
    const tokens = await tokenResponse.json() as TokenResponse;
    if (!tokens.access_token) return redirect('/login?error=provider', 303);

    const userInfoResponse = await fetch(config.userinfoEndpoint, {
      headers: { authorization: `Bearer ${tokens.access_token}` },
    });
    if (!userInfoResponse.ok) return redirect('/login?error=provider', 303);
    const userInfo = await userInfoResponse.json() as UserInfoResponse;
    const email = userInfo.email?.trim().toLowerCase();
    const displayName = userInfo.name?.trim() || userInfo.preferred_username?.trim() || email;
    const sub = userInfo.sub?.trim();
    if (!email || !displayName || !sub) return redirect('/login?error=provider', 303);

    await setSessionCookie(cookies, { sub: `${config.issuer}:${sub}`, email, displayName });
    const session = cookies.get('pp_session')?.value;
    if (!session) return redirect('/login?error=provider', 303);

    const base = import.meta.env.PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8787';
    const sync = await fetch(`${base}/me/sync`, {
      method: 'POST',
      headers: buildApiHeaders(session),
      body: JSON.stringify({ email, displayName }),
    });
    if (!sync.ok) return redirect('/login?error=api', 303);

    const [accounts, categories, currentCycle] = await Promise.all([
      fetch(`${base}/accounts`, { headers: buildApiHeaders(session) }),
      fetch(`${base}/expense-categories`, { headers: buildApiHeaders(session) }),
      fetch(`${base}/budget-cycles/current`, { headers: buildApiHeaders(session) }),
    ]);
    const accountList = accounts.ok ? await accounts.json() as unknown[] : [];
    const categoryList = categories.ok ? await categories.json() as unknown[] : [];
    const setupComplete = accountList.length > 0 && categoryList.length > 0 && currentCycle.ok;
    return redirect(setupComplete ? '/dashboard' : '/onboarding', 303);
  } catch {
    return redirect('/login?error=offline', 303);
  }
};
