import type { APIRoute } from 'astro';
export const POST: APIRoute = ({ cookies, redirect }) => { cookies.delete('pp_session', { path: '/' }); return redirect('/login', 303); };
export const GET = POST;
