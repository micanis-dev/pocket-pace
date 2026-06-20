import { useState } from 'react';
import { Button, Card, CardBody, UIProvider, Input, Progress, Select, SelectItem } from './ui';
import { ArrowLeft, ArrowRight, Check, Gauge, Landmark, Tags } from 'lucide-react';
import { api } from '../lib/api';
import FormField from './FormField';

const steps = [
  { title: '保管先', icon: Landmark },
  { title: '周期', icon: Gauge },
  { title: 'カテゴリ', icon: Tags },
] as const;

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [account, setAccount] = useState({ name: 'メインの保管先', type: 'bank', initialBalance: 0 });
  const now = new Date();
  const [cycle, setCycle] = useState({
    name: `${now.getFullYear()}年${now.getMonth() + 1}月`,
    startDate: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    resetType: 'calendar_based',
  });
  const [categories, setCategories] = useState('食費, 日用品, 交通費');

  async function next() {
    setError('');
    if (step < 2) {
      setStep(step + 1);
      return;
    }

    setBusy(true);
    try {
      const [existingAccounts, existingCycles, existingCategories] = await Promise.all([
        api<Array<{ name: string }>>('/accounts'),
        api<Array<{ startDate: string; endDate: string }>>('/budget-cycles'),
        api<Array<{ name: string }>>('/expense-categories'),
      ]);

      if (!existingAccounts.some(x => x.name === account.name)) await api('/accounts', { method: 'POST', body: JSON.stringify(account) });
      if (!existingCycles.some(x => x.startDate === cycle.startDate && x.endDate === cycle.endDate)) {
        await api('/budget-cycles', { method: 'POST', body: JSON.stringify(cycle) });
      }

      const known = new Set(existingCategories.map(x => x.name));
      await Promise.all(
        categories
          .split(',')
          .map(x => x.trim())
          .filter(name => name && !known.has(name))
          .map(name => api('/expense-categories', { method: 'POST', body: JSON.stringify({ name }) })),
      );

      window.location.href = '/dashboard';
    } catch (e) {
      setError(e instanceof Error ? e.message : '設定を保存できませんでした');
    } finally {
      setBusy(false);
    }
  }

  return (
    <UIProvider>
      <main className="min-h-screen bg-white px-4 py-10 sm:px-6">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-8 flex items-center gap-3 text-sm font-semibold text-slate-900">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
              <Gauge size={20} />
            </span>
            初期セットアップ
          </div>

          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
            <Progress aria-label="初期セットアップの進捗" value={((step + 1) / 3) * 100} size="sm" classNames={{ indicator: 'bg-slate-900' }} />
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-500">
              {steps.map((s, i) => (
                <div key={s.title} className={`flex items-center gap-2 ${i <= step ? 'text-slate-900' : ''}`}>
                  <span className={`grid h-8 w-8 place-items-center rounded-full border ${i < step ? 'border-slate-900 bg-slate-900 text-white' : i === step ? 'border-slate-400 bg-slate-100' : 'border-slate-200 bg-white'}`}>
                    {i < step ? <Check size={14} /> : <s.icon size={14} />}
                  </span>
                  {s.title}
                </div>
              ))}
            </div>
          </div>

          <Card className="border border-slate-200 shadow-sm">
            <CardBody className="p-6 sm:p-8">
              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">最初のお金の保管先</h2>
                    <p className="mt-1 text-sm text-slate-500">普段使う銀行口座、財布、電子マネーなどを1つ登録します。</p>
                  </div>
                  <FormField label="保管先名">
                    <Input aria-label="保管先名" name="account-name" value={account.name} onValueChange={name => setAccount({ ...account, name })} />
                  </FormField>
                  <FormField label="種類">
                    <Select aria-label="保管先の種類" selectedKeys={[account.type]} onChange={e => setAccount({ ...account, type: e.target.value })}>
                      <SelectItem key="bank">銀行口座</SelectItem>
                      <SelectItem key="wallet">財布</SelectItem>
                      <SelectItem key="cash_box">現金・タンス預金</SelectItem>
                    </Select>
                  </FormField>
                  <FormField label="現在残高">
                    <Input aria-label="現在残高" type="number" min="0" value={String(account.initialBalance)} onValueChange={value => setAccount({ ...account, initialBalance: Number(value) })} startContent="¥" />
                  </FormField>
                  <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">保管先の残高は、収入・支出の入力に応じて自動で更新されます。</p>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">予算周期</h2>
                    <p className="mt-1 text-sm text-slate-500">この期間ごとに予算を区切ります。</p>
                  </div>
                  <FormField label="周期名">
                    <Input aria-label="周期名" value={cycle.name} onValueChange={name => setCycle({ ...cycle, name })} />
                  </FormField>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="開始日">
                      <Input aria-label="開始日" type="date" value={cycle.startDate} onValueChange={startDate => setCycle({ ...cycle, startDate })} />
                    </FormField>
                    <FormField label="終了日">
                      <Input aria-label="終了日" type="date" value={cycle.endDate} onValueChange={endDate => setCycle({ ...cycle, endDate })} />
                    </FormField>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">カテゴリ</h2>
                    <p className="mt-1 text-sm text-slate-500">使うカテゴリをカンマ区切りで登録します。</p>
                  </div>
                  <FormField label="カテゴリ" hint="例: 食費, 日用品, 交通費">
                    <Input aria-label="支出カテゴリ" value={categories} onValueChange={setCategories} />
                  </FormField>
                </div>
              )}

              {error && <p className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

              <div className="mt-8 flex items-center justify-between">
                <Button variant="light" isDisabled={step === 0} onPress={() => setStep(step - 1)} startContent={<ArrowLeft size={17} />}>
                  戻る
                </Button>
                <Button color="primary" className="bg-slate-900 font-medium" isLoading={busy} onPress={next} endContent={!busy && <ArrowRight size={17} />}>
                  {step === 2 ? '完了' : '次へ'}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </main>
    </UIProvider>
  );
}
