import { AppError } from '../shared/errors';

export interface Identity { sub: string; email?: string }

export function authenticate(request: Request): Identity {
  const email = request.headers.get('x-pocket-pace-user')?.trim().toLowerCase();
  if (!email) throw new AppError('UNAUTHORIZED', 'A local user is required', 401);
  return { sub: `local:${email}`, email };
}
