import { AppError } from '../shared/errors';

export interface SessionIdentity {
  sub: string;
  email: string;
  displayName?: string;
  iat: number;
  exp: number;
  iss: 'pocket-pace-frontend';
  aud: 'pocket-pace-api';
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const decodeBase64url = (value: string) => {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const encodeBase64url = (value: Uint8Array) => {
  const binary = Array.from(value, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
};

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

export async function verifySessionToken(token: string, secret: string): Promise<SessionIdentity> {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) throw new AppError('UNAUTHORIZED', 'Invalid session token', 401);
  if (await sign(`${header}.${payload}`, secret) !== signature) throw new AppError('UNAUTHORIZED', 'Invalid session token', 401);
  const parsedHeader = JSON.parse(decoder.decode(decodeBase64url(header))) as { alg?: string; typ?: string };
  if (parsedHeader.alg !== 'HS256' || parsedHeader.typ !== 'JWT') throw new AppError('UNAUTHORIZED', 'Unsupported session token', 401);
  const claims = JSON.parse(decoder.decode(decodeBase64url(payload))) as SessionIdentity;
  if (claims.iss !== 'pocket-pace-frontend' || claims.aud !== 'pocket-pace-api') throw new AppError('UNAUTHORIZED', 'Invalid session audience', 401);
  if (!claims.sub || !claims.email) throw new AppError('UNAUTHORIZED', 'Session identity is incomplete', 401);
  if (claims.exp <= Math.floor(Date.now() / 1000)) throw new AppError('UNAUTHORIZED', 'Session expired', 401);
  return claims;
}
