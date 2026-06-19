import { clearSession } from '../../lib/auth';

export async function POST({ cookies, redirect }: any) {
  clearSession(cookies);
  return redirect('/login');
}

export async function GET({ cookies, redirect }: any) {
  clearSession(cookies);
  return redirect('/login');
}
