import type { APIRoute } from 'astro';
import { buildApiHeaders, getSessionToken } from '../../../lib/server/auth';

const handler: APIRoute = async ({ params, request, cookies }) => {
  const base = import.meta.env.PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8787';
  const source = new URL(request.url);
  const target = `${base}/${params.path ?? ''}${source.search}`;
  try {
    const token = await getSessionToken(cookies);
    if (!token) return new Response(JSON.stringify({ error: { message: 'ログインが必要です' } }), { status: 401, headers: { 'content-type': 'application/json' } });
    const response = await fetch(target, {
      method: request.method,
      headers: buildApiHeaders(token, request.headers.get('content-type') ?? 'application/json'),
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
    });
    return new Response(response.body, { status: response.status, headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ error: { code: 'API_OFFLINE', message: 'APIサーバーに接続できません' } }), { status: 503, headers: { 'content-type': 'application/json' } });
  }
};
export const GET = handler; export const POST = handler; export const PATCH = handler; export const DELETE = handler;
