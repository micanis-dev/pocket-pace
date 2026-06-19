import { config } from './config';
import type { UserSession } from './types';

export interface CookieStore {
  get(name: string): { value: string } | undefined;
  set(
    name: string,
    value: string,
    options?: { httpOnly?: boolean; sameSite?: 'lax' | 'strict' | 'none'; secure?: boolean; path?: string; maxAge?: number },
  ): void;
  delete(name: string, options?: { path?: string }): void;
}

const SESSION_COOKIE = 'pp_session';
const PKCE_COOKIE = 'pp_auth_request';

const base64UrlEncode = (value: Uint8Array | string) => {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return Buffer.from(bytes).toString('base64url');
};

const base64UrlDecode = (value: string) => Buffer.from(value, 'base64url').toString('utf8');

export const hasSession = (cookies: CookieStore) => Boolean(cookies.get(SESSION_COOKIE)?.value);

export function getSession(cookies: CookieStore): UserSession | null {
  const raw = cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(base64UrlDecode(raw)) as UserSession;
  } catch {
    return null;
  }
}

export function setSession(cookies: CookieStore, session: UserSession, maxAgeSeconds: number) {
  cookies.set(SESSION_COOKIE, base64UrlEncode(JSON.stringify(session)), {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.appBaseUrl.startsWith('https://'),
    path: '/',
    maxAge: maxAgeSeconds,
  });
}

export function clearSession(cookies: CookieStore) {
  cookies.delete(SESSION_COOKIE, { path: '/' });
  cookies.delete(PKCE_COOKIE, { path: '/auth/callback' });
}

export function setPkceRequest(
  cookies: CookieStore,
  request: { state: string; codeVerifier: string; returnTo: string },
) {
  cookies.set(PKCE_COOKIE, base64UrlEncode(JSON.stringify(request)), {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.appBaseUrl.startsWith('https://'),
    path: '/auth/callback',
    maxAge: 10 * 60,
  });
}

export function getPkceRequest(cookies: CookieStore) {
  const raw = cookies.get(PKCE_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(base64UrlDecode(raw)) as { state: string; codeVerifier: string; returnTo: string };
  } catch {
    return null;
  }
}

export function createPkceVerifier() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return base64UrlEncode(bytes);
}

export async function createPkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

export function buildAuthorizeUrl(params: {
  state: string;
  codeChallenge: string;
  returnTo: string;
}) {
  const url = new URL(`https://${config.auth0Domain}/authorize`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.auth0ClientId);
  url.searchParams.set('redirect_uri', `${config.appBaseUrl}/auth/callback`);
  url.searchParams.set('scope', 'openid profile email');
  url.searchParams.set('audience', config.auth0Audience);
  url.searchParams.set('state', params.state);
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('returnTo', params.returnTo);
  return url.toString();
}

export async function exchangeAuthCode(code: string, codeVerifier: string) {
  const response = await fetch(`https://${config.auth0Domain}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.auth0ClientId,
      code,
      code_verifier: codeVerifier,
      redirect_uri: `${config.appBaseUrl}/auth/callback`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange code: ${response.status}`);
  }

  return response.json() as Promise<{
    access_token: string;
    expires_in: number;
    token_type: 'Bearer';
    id_token?: string;
  }>;
}

export async function fetchAuth0User(accessToken: string) {
  const response = await fetch(`https://${config.auth0Domain}/userinfo`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.status}`);
  }

  return response.json() as Promise<{
    sub: string;
    email?: string;
    name?: string;
    nickname?: string;
  }>;
}
