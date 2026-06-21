import { AppError } from '../shared/errors';
import type { Env } from '../env';
import { verifySessionToken } from './session';

export interface Identity { sub: string; email?: string }

export async function authenticate(request: Request, env: Env): Promise<Identity> {
  const authorization = request.headers.get('authorization')?.trim();
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length).trim();
    const secret = env.AUTH_SESSION_SECRET?.trim() || 'local-development-session-secret';
    const claims = await verifySessionToken(token, secret);
    return { sub: claims.sub, email: claims.email };
  }
  const email = request.headers.get('x-pocket-pace-user')?.trim().toLowerCase();
  if (!email) throw new AppError('UNAUTHORIZED', 'Authentication is required', 401);
  if ((env.AUTH_MODE ?? 'local') !== 'local') throw new AppError('UNAUTHORIZED', 'Local identity headers are disabled', 401);
  return { sub: `local:${email}`, email };
}
