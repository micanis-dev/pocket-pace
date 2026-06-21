import type { APIRoute } from 'astro';
import { clearSessionCookie } from '../../../lib/server/auth';
export const POST: APIRoute = ({ cookies, redirect }) => { clearSessionCookie(cookies); return redirect('/login', 303); };
export const GET = POST;
