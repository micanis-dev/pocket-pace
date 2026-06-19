import { clearSession, exchangeAuthCode, fetchAuth0User, getPkceRequest, setSession } from '../../lib/auth';
import { apiPost } from '../../lib/api';

export async function GET({ cookies, redirect, request }: any) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const authRequest = getPkceRequest(cookies);

  if (!code || !state || !authRequest || authRequest.state !== state) {
    clearSession(cookies);
    return redirect('/login?error=auth');
  }

  try {
    const token = await exchangeAuthCode(code, authRequest.codeVerifier);
    const user = await fetchAuth0User(token.access_token);
    const email = user.email ?? `${user.sub}@users.noreply.local`;
    const displayName = user.name ?? user.nickname ?? email.split('@')[0] ?? 'Pocket-Pace User';

    await apiPost(
      '/me/sync',
      { email, displayName },
      {
        accessToken: token.access_token,
        email,
        displayName,
        mode: 'auth0',
      },
    );

    clearSession(cookies);
    setSession(cookies, { mode: 'auth0', email, displayName, accessToken: token.access_token, expiresAt: Date.now() + token.expires_in * 1000 }, token.expires_in);
    return redirect(authRequest.returnTo || '/');
  } catch {
    clearSession(cookies);
    return redirect('/login?error=auth');
  }
}
