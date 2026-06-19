import { z } from 'zod';

export const id = z.string().min(1).max(100);
export const money = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const balance = z.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER);
export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must use YYYY-MM-DD').refine((value) => {
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() + 1 === month && parsed.getUTCDate() === day;
}, 'date is invalid');
export const nullableId = id.nullable().optional();
export const paymentMethod = z.enum(['cash', 'bank_transfer', 'debit', 'credit_card', 'electronic_money', 'other']);

export async function parseJson(request: Request): Promise<unknown> {
  try { return await request.json(); } catch { throw new z.ZodError([{ code: 'custom', path: [], message: 'A JSON request body is required' }]); }
}
