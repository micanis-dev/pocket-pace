import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Env } from '../env';
import { AppError } from '../shared/errors';

export interface Identity { sub: string; email?: string }

const jwks = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export async function authenticate(request: Request, env: Env): Promise<Identity> {
  if (env.DEV_AUTH_BYPASS === 'true') {
    return { sub: env.DEV_AUTH_SUB ?? 'dev-user', email: env.DEV_AUTH_EMAIL };
  }
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) throw new AppError('UNAUTHORIZED', 'A bearer token is required', 401);
  const issuer = `https://${env.AUTH0_DOMAIN}/`;
  let keySet = jwks.get(issuer);
  if (!keySet) {
    keySet = createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`));
    jwks.set(issuer, keySet);
  }
  try {
    const { payload } = await jwtVerify(authorization.slice(7), keySet, { issuer, audience: env.AUTH0_AUDIENCE });
    if (!payload.sub) throw new Error('missing sub');
    return { sub: payload.sub, email: typeof payload.email === 'string' ? payload.email : undefined };
  } catch {
    throw new AppError('UNAUTHORIZED', 'The access token is invalid', 401);
  }
}
