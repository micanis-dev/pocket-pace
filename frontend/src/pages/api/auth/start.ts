import type { APIRoute } from 'astro';
import { getAuthMode, getOidcConfig, randomToken, setOAuthCookie, sha256base64url } from '../../../lib/server/auth';

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  if (getAuthMode() !== 'oidc') return redirect('/login', 303);
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const verifier = randomToken(48);
  const state = randomToken(24);
  await setOAuthCookie(cookies, { state, verifier, mode });

  const config = getOidcConfig();
  const target = new URL(config.authorizationEndpoint);
  target.searchParams.set('response_type', 'code');
  target.searchParams.set('client_id', config.clientId);
  target.searchParams.set('redirect_uri', config.redirectUri);
  target.searchParams.set('scope', 'openid profile email');
  target.searchParams.set('state', state);
  target.searchParams.set('code_challenge', await sha256base64url(verifier));
  target.searchParams.set('code_challenge_method', 'S256');
  return redirect(target.toString(), 303);
};
