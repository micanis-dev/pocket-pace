import { ZodError } from 'zod';

export type ErrorCode = 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_ERROR';

export class AppError extends Error {
  constructor(public readonly code: ErrorCode, message: string, public readonly status: number) { super(message); }
}

export function errorResponse(error: unknown, requestId: string): Response {
  if (error instanceof ZodError) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message ?? 'Invalid request', requestId } }, { status: 400 });
  }
  if (error instanceof AppError) {
    return Response.json({ error: { code: error.code, message: error.message, requestId } }, { status: error.status });
  }
  if (error instanceof Error && (error.message.includes('UNIQUE constraint failed') || error.message.includes('FOREIGN KEY constraint failed'))) {
    return Response.json({ error: { code: 'CONFLICT', message: 'The request conflicts with existing data', requestId } }, { status: 409 });
  }
  console.error({ requestId, error });
  return Response.json({ error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred', requestId } }, { status: 500 });
}
