import type { AstroCookies } from 'astro';

export type AuthMode = 'local' | 'oidc';

export interface SessionClaims {
  sub: string;
  email: string;
  displayName: string;
  iat: number;
  exp: number;
  iss: 'pocket-pace-frontend';
  aud: 'pocket-pace-api';
}

interface OAuthState {
  state: string;
  verifier: string;
  mode: 'login' | 'signup';
  iat: number;
  exp: number;
}

interface OidcEnv {
  issuer: string;
  clientId: string;
  clientSecret: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
  logoutEndpoint?: string;
  redirectUri: string;
}

const SESSION_COOKIE = 'pp_session';
const OAUTH_COOKIE = 'pp_oauth';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const OAUTH_TTL_SECONDS = 60 * 10;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const encodeBase64url = (value: Uint8Array) => {
  const binary = Array.from(value, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
};

const decodeBase64url = (value: string) => {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const json = (value: unknown) => JSON.stringify(value);

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return encodeBase64url(new Uint8Array(signature));
}

function getSessionSecret() {
  const secret = import.meta.env.AUTH_SESSION_SECRET?.trim();
  if (secret) return secret;
  if (import.meta.env.PROD) throw new Error('AUTH_SESSION_SECRET is required in production');
  return 'local-development-session-secret';
}

export function getAuthMode(): AuthMode {
  return import.meta.env.AUTH_MODE === 'oidc' || import.meta.env.PUBLIC_AUTH_MODE === 'oidc' ? 'oidc' : 'local';
}

export function getPublicAuthMode(): AuthMode {
  return getAuthMode();
}

export async function createSessionToken(input: { sub: string; email: string; displayName: string }, now = Math.floor(Date.now() / 1000)) {
  const header = encodeBase64url(encoder.encode(json({ alg: 'HS256', typ: 'JWT' })));
  const payload = encodeBase64url(encoder.encode(json({
    sub: input.sub,
    email: input.email,
    displayName: input.displayName,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
    iss: 'pocket-pace-frontend',
    aud: 'pocket-pace-api',
  } satisfies SessionClaims)));
  const signature = await sign(`${header}.${payload}`, getSessionSecret());
  return `${header}.${payload}.${signature}`;
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) return null;
  if (await sign(`${header}.${payload}`, getSessionSecret()) !== signature) return null;
  const parsedHeader = JSON.parse(decoder.decode(decodeBase64url(header))) as { alg?: string; typ?: string };
  if (parsedHeader.alg !== 'HS256' || parsedHeader.typ !== 'JWT') return null;
  const claims = JSON.parse(decoder.decode(decodeBase64url(payload))) as SessionClaims;
  if (claims.iss !== 'pocket-pace-frontend' || claims.aud !== 'pocket-pace-api') return null;
  if (!claims.sub || !claims.email || !claims.displayName) return null;
  if (claims.exp <= Math.floor(Date.now() / 1000)) return null;
  return claims;
}

export async function getSession(cookies: AstroCookies) {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getSessionToken(cookies: AstroCookies) {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token || !await verifySessionToken(token)) return null;
  return token;
}

export async function setSessionCookie(cookies: AstroCookies, claims: { sub: string; email: string; displayName: string }) {
  cookies.set(SESSION_COOKIE, await createSessionToken(claims), {
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(cookies: AstroCookies) {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

async function createOAuthState(value: Omit<OAuthState, 'iat' | 'exp'>, now = Math.floor(Date.now() / 1000)) {
  const payload = encodeBase64url(encoder.encode(json({ ...value, iat: now, exp: now + OAUTH_TTL_SECONDS } satisfies OAuthState)));
  return `${payload}.${await sign(payload, getSessionSecret())}`;
}

async function verifyOAuthState(token: string): Promise<OAuthState | null> {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  if (await sign(payload, getSessionSecret()) !== signature) return null;
  const state = JSON.parse(decoder.decode(decodeBase64url(payload))) as OAuthState;
  if (state.exp <= Math.floor(Date.now() / 1000)) return null;
  return state;
}

export async function setOAuthCookie(
  cookies: AstroCookies,
  value: Omit<OAuthState, 'iat' | 'exp'>,
) {
  cookies.set(OAUTH_COOKIE, await createOAuthState(value), {
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    path: '/',
    maxAge: OAUTH_TTL_SECONDS,
  });
}

export async function readOAuthCookie(cookies: AstroCookies) {
  const token = cookies.get(OAUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyOAuthState(token);
}

export function clearOAuthCookie(cookies: AstroCookies) {
  cookies.delete(OAUTH_COOKIE, { path: '/' });
}

export function randomToken(size = 32) {
  return encodeBase64url(crypto.getRandomValues(new Uint8Array(size)));
}

export async function sha256base64url(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return encodeBase64url(new Uint8Array(digest));
}

export function getOidcConfig(): OidcEnv {
  const values = {
    PUBLIC_APP_BASE_URL: import.meta.env.PUBLIC_APP_BASE_URL?.trim(),
    OIDC_ISSUER: import.meta.env.OIDC_ISSUER?.trim(),
    OIDC_CLIENT_ID: import.meta.env.OIDC_CLIENT_ID?.trim(),
    OIDC_CLIENT_SECRET: import.meta.env.OIDC_CLIENT_SECRET?.trim(),
    OIDC_AUTHORIZATION_ENDPOINT: import.meta.env.OIDC_AUTHORIZATION_ENDPOINT?.trim(),
    OIDC_TOKEN_ENDPOINT: import.meta.env.OIDC_TOKEN_ENDPOINT?.trim(),
    OIDC_USERINFO_ENDPOINT: import.meta.env.OIDC_USERINFO_ENDPOINT?.trim(),
  };
  const missing = Object.entries(values).filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`Missing OIDC environment variables: ${missing.join(', ')}`);
  }
  const redirectBase = values.PUBLIC_APP_BASE_URL!;
  const issuer = values.OIDC_ISSUER!;
  const clientId = values.OIDC_CLIENT_ID!;
  const clientSecret = values.OIDC_CLIENT_SECRET!;
  const authorizationEndpoint = values.OIDC_AUTHORIZATION_ENDPOINT!;
  const tokenEndpoint = values.OIDC_TOKEN_ENDPOINT!;
  const userinfoEndpoint = values.OIDC_USERINFO_ENDPOINT!;
  return {
    issuer,
    clientId,
    clientSecret,
    authorizationEndpoint,
    tokenEndpoint,
    userinfoEndpoint,
    logoutEndpoint: import.meta.env.OIDC_LOGOUT_ENDPOINT?.trim() || undefined,
    redirectUri: new URL('/api/auth/callback', redirectBase).toString(),
  };
}

export function buildApiHeaders(token: string, contentType = 'application/json') {
  return { authorization: `Bearer ${token}`, 'content-type': contentType };
}
