import { Button, UIProvider, Input, Link } from './ui';
import { ArrowRight, Gauge } from 'lucide-react';
import FormField from './FormField';

export default function AuthScreen({ mode, error, initialEmail = '' }: { mode: 'login' | 'signup'; error?: string; initialEmail?: string }) {
  const signup = mode === 'signup';
  const message =
    error === 'unregistered'
      ? '未登録のメールアドレスです。新規登録を続けてください。'
      : error === 'offline'
        ? 'APIサーバーに接続できません。起動状態を確認してください。'
        : error === 'api'
          ? 'ユーザー情報を同期できませんでした。'
          : error
            ? '入力内容を確認してください。'
            : '';

  return (
    <UIProvider>
      <main className="min-h-screen bg-white px-4 py-10 sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col justify-center">
          <div className="mb-8 flex items-center gap-3 text-sm font-semibold text-slate-900">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
              <Gauge size={20} />
            </span>
            Pocket Pace
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-slate-500">{signup ? 'Sign up' : 'Login'}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-.03em] text-slate-900">{signup ? '新規登録' : 'ログイン'}</h1>
            <p className="mt-2 text-sm text-slate-500">{signup ? 'まずは名前とメールアドレスを入力してください。' : 'メールアドレスで続けます。'}</p>

            {message && <div className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</div>}

            <form action="/api/auth/login" method="post" className="mt-6 space-y-4">
              <input type="hidden" name="mode" value={mode} />
              {signup && (
                <FormField label="お名前">
                  <Input isRequired aria-label="お名前" name="displayName" placeholder="例: 山田 太郎" />
                </FormField>
              )}
              <FormField label="メールアドレス">
                <Input isRequired aria-label="メールアドレス" name="email" type="email" placeholder="you@example.com" defaultValue={initialEmail} />
              </FormField>
              <Button type="submit" color="primary" className="w-full bg-slate-900 font-medium" endContent={<ArrowRight size={18} />}>
                {signup ? '登録して開始' : 'ログイン'}
              </Button>
            </form>

            <div className="mt-5 text-center text-sm text-slate-500">
              {signup ? 'すでにアカウントがありますか？' : 'はじめて利用しますか？'}{' '}
              <Link href={signup ? '/login' : '/signup'} className="font-medium text-slate-900">
                {signup ? 'ログイン' : '新規登録'}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </UIProvider>
  );
}
