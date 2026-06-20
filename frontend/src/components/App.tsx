import { useEffect, useState, type ReactNode, type SubmitEvent } from "react";
import {
  Avatar,
  Button,
  Card,
  CardBody,
  Chip,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  UIProvider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Progress,
  Select,
  SelectItem,
  Switch,
  Tab,
  Tabs,
  Textarea,
  Tooltip,
} from "./ui";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  Bell,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Gauge,
  HandCoins,
  Landmark,
  LayoutDashboard,
  Menu,
  Moon,
  MoreHorizontal,
  Pencil,
  PiggyBank,
  Plus,
  ReceiptText,
  Repeat2,
  Search,
  Settings2,
  Sun,
  Tags,
  Trash2,
  TrendingDown,
  WalletCards,
  X,
} from "lucide-react";
import { api, shortDate, yen } from "../lib/api";
import FormField from "./FormField";

type Item = Record<string, any>;
type Dashboard = {
  currentCycle: Item;
  budgetSummary: {
    spendingLimit: number;
    remainingAmount: number;
    granularity: string;
    unitLabel: string;
    availablePerUnit: number;
    isOverPace: boolean;
  };
  recentExpenses: Item[];
  alerts: Item[];
};
const emptyDashboard: Dashboard = {
  currentCycle: { id: "", name: "予算周期未設定", startDate: "", endDate: "" },
  budgetSummary: {
    spendingLimit: 0,
    remainingAmount: 0,
    granularity: "daily",
    unitLabel: "今日",
    availablePerUnit: 0,
    isOverPace: false,
  },
  recentExpenses: [],
  alerts: [],
};
const nav = [
  ["/dashboard", "ホーム", LayoutDashboard],
  ["/expenses", "支出", ReceiptText],
  ["/planning", "予定・固定費", CalendarClock],
  ["/incomes", "収入", CircleDollarSign],
  ["/income-rules", "給与設定", Repeat2],
  ["/savings", "貯金", PiggyBank],
  ["/accounts", "残高・保管先", Landmark],
  ["/transfers", "資金移動", ArrowRightLeft],
  ["/cards", "カード", CreditCard],
  ["/statements", "請求・照合", WalletCards],
] as const;
const settings = [
  ["/settings/preferences", "表示・通知", Settings2],
  ["/settings/budget", "予算周期", CalendarDays],
  ["/settings/categories", "カテゴリ", Tags],
] as const;
const labels: Record<string, string> = {
  cash: "現金",
  bank_transfer: "口座",
  credit_card: "カード",
  electronic_money: "電子マネー",
  bank: "銀行口座",
  wallet: "財布",
  cash_box: "現金",
  other: "その他",
  salary: "給与",
  temporary: "臨時収入",
  refund: "返金",
  side_job: "副業",
  allowance: "お小遣い",
};
const currentPath = () =>
  typeof window === "undefined" ? "/dashboard" : window.location.pathname;

function Empty({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: any;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
      <div>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-slate-400">
          <Icon size={22} />
        </span>
        <h3 className="mt-4 font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-slate-400">{text}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}
function PageHead({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#655cf5]">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-.035em] sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  );
}
function Stat({
  label,
  value,
  sub,
  icon: Icon,
  tone = "violet",
}: {
  label: string;
  value: string;
  sub: string;
  icon: any;
  tone?: string;
}) {
  const c =
    tone === "green"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "red"
        ? "bg-rose-50 text-rose-600"
        : "bg-[#eeedff] text-[#5b55e7]";
  return (
    <Card className="border border-slate-100 shadow-sm">
      <CardBody className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="money mt-2 text-2xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-slate-400">{sub}</p>
          </div>
          <span className={`grid h-10 w-10 place-items-center rounded-xl ${c}`}>
            <Icon size={19} />
          </span>
        </div>
      </CardBody>
    </Card>
  );
}

export default function App({
  user,
  initialPath = "/dashboard",
}: {
  user: { displayName: string; email: string };
  initialPath?: string;
}) {
  const [path, setPath] = useState(initialPath);
  const [mobile, setMobile] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard>(emptyDashboard);
  const [loadError, setLoadError] = useState(false);
  const [modal, setModal] = useState<
    | "expense"
    | "income"
    | "account"
    | "card"
    | "category"
    | "cycle"
    | "statement"
    | null
  >(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const pop = () => setPath(currentPath());
    addEventListener("popstate", pop);
    return () => removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    api<Dashboard>("/dashboard")
      .then((d) => {
        setDashboard(d);
        setLoadError(false);
      })
      .catch(() => {
        setDashboard(emptyDashboard);
        setLoadError(true);
      });
  }, [refresh]);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    let current: Item = { theme: "system", themeColor: "blue" };
    const sync = (settings: Item) => {
      current = settings;
      applyAppearance(settings);
      setResolvedTheme(
        document.documentElement.dataset.theme === "dark" ? "dark" : "light",
      );
    };
    const systemChanged = () => {
      if (current.theme === "system") sync(current);
    };
    const manuallyChanged = (event: Event) =>
      sync((event as CustomEvent<Item>).detail);
    api<Item>("/user-settings")
      .then(sync)
      .catch(() => sync(current));
    media.addEventListener("change", systemChanged);
    addEventListener("appearance-change", manuallyChanged);
    return () => {
      media.removeEventListener("change", systemChanged);
      removeEventListener("appearance-change", manuallyChanged);
    };
  }, []);
  async function toggleTheme() {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    const settings = {
      theme: next,
      themeColor: document.documentElement.dataset.accent ?? "blue",
    };
    applyAppearance(settings);
    setResolvedTheme(next);
    dispatchEvent(new CustomEvent("appearance-change", { detail: settings }));
    await api("/user-settings", {
      method: "PATCH",
      body: JSON.stringify({ theme: next }),
    }).catch(() => {});
  }
  const go = (to: string) => {
    history.pushState({}, "", to);
    setPath(to);
    setMobile(false);
    scrollTo(0, 0);
  };
  const title =
    [...nav, ...settings].find((x) => x[0] === path)?.[1] ?? "Pocket Pace";
  return (
    <UIProvider>
      <div className="min-h-screen bg-white text-slate-900">
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col overflow-y-auto border-r border-slate-200 bg-white p-4 transition-transform lg:translate-x-0 ${mobile ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between px-2 py-3">
            <button
              onClick={() => go("/dashboard")}
              className="flex items-center gap-3 font-semibold"
            >
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#5b55e7] text-white">
                <Gauge size={21} />
              </span>
              Pocket Pace
            </button>
            <button
              className="lg:hidden"
              aria-label="メニューを閉じる"
              onClick={() => setMobile(false)}
            >
              <X />
            </button>
          </div>
          <nav className="mt-7 space-y-1">
            {nav.map(([to, label, Icon]) => (
              <button
                key={to}
                onClick={() => go(to)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${path === to ? "bg-[#eeedff] text-[#514bd5]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>
          <p className="mb-2 mt-7 px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-400">
            設定
          </p>
          <nav className="space-y-1">
            {settings.map(([to, label, Icon]) => (
              <button
                key={to}
                onClick={() => go(to)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${path === to ? "bg-[#eeedff] text-[#514bd5]" : "text-slate-500 hover:bg-slate-50"}`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">今期の残り</p>
            <p className="money mt-1 text-xl font-semibold text-slate-900">
              {yen(dashboard.budgetSummary.remainingAmount)}
            </p>
            <Progress
              aria-label="予算の残額率"
              size="sm"
              value={
                dashboard.budgetSummary.spendingLimit > 0
                  ? Math.max(
                      0,
                      (dashboard.budgetSummary.remainingAmount /
                        dashboard.budgetSummary.spendingLimit) *
                        100,
                    )
                  : 0
              }
              className="mt-3"
              classNames={{ indicator: "bg-slate-900", track: "bg-slate-200" }}
            />
          </div>
        </aside>
        {mobile && (
          <button
            aria-label="メニューを閉じる"
            className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden"
            onClick={() => setMobile(false)}
          />
        )}
        <div className="lg:pl-[260px]">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-7">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden"
                aria-label="メニューを開く"
                onClick={() => setMobile(true)}
              >
                <Menu size={22} />
              </button>
              <span className="text-sm font-semibold">{title}</span>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip
                content={
                  resolvedTheme === "dark"
                    ? "ライトテーマに切り替え"
                    : "ダークテーマに切り替え"
                }
              >
                <Button
                  isIconOnly
                  variant="light"
                  radius="full"
                  aria-label={
                    resolvedTheme === "dark"
                      ? "ライトテーマに切り替え"
                      : "ダークテーマに切り替え"
                  }
                  onPress={toggleTheme}
                >
                  {resolvedTheme === "dark" ? (
                    <Sun size={19} />
                  ) : (
                    <Moon size={19} />
                  )}
                </Button>
              </Tooltip>
              <Dropdown>
                <Tooltip content="通知">
                  <DropdownTrigger>
                    <Button
                      isIconOnly
                      variant="light"
                      radius="full"
                      aria-label="通知を開く"
                    >
                      <Bell size={19} />
                    </Button>
                  </DropdownTrigger>
                </Tooltip>
                <DropdownMenu aria-label="通知一覧">
                  {dashboard.alerts.length ? (
                    dashboard.alerts.map((alert, index) => (
                      <DropdownItem key={alert.id ?? index}>
                        {alert.message ?? String(alert)}
                      </DropdownItem>
                    ))
                  ) : (
                    <DropdownItem key="empty" isReadOnly>
                      新しい通知はありません
                    </DropdownItem>
                  )}
                </DropdownMenu>
              </Dropdown>
              <Divider orientation="vertical" className="mx-1 h-7" />
              <Dropdown>
                <DropdownTrigger>
                  <button
                    aria-label="ユーザーメニューを開く"
                    className="flex items-center gap-2"
                  >
                    <Avatar size="sm" name={user.displayName} />
                    <span className="hidden text-left sm:block">
                      <b className="block text-xs">{user.displayName}</b>
                      <span className="block text-[10px] text-slate-400">
                        {user.email}
                      </span>
                    </span>
                    <ChevronDown size={14} />
                  </button>
                </DropdownTrigger>
                <DropdownMenu>
                  <DropdownItem
                    key="logout"
                    color="danger"
                    href="/api/auth/logout"
                  >
                    ログアウト
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          </header>
          <main className="mx-auto max-w-[1280px] p-4 sm:p-7 lg:p-9" key={path}>
            {loadError && (
              <div className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                データを取得できませんでした。APIサーバーと接続設定を確認してください。
              </div>
            )}
            {path === "/dashboard" ? (
              <DashboardPage data={dashboard} add={setModal} go={go} />
            ) : path === "/expenses" ? (
              <ListPage
                kind="expenses"
                title="支出"
                description="日々の支出をまとめて確認・管理します。"
                add={() => {
                  setEditing(null);
                  setModal("expense");
                }}
                edit={(x) => {
                  setEditing(x);
                  setModal("expense");
                }}
                refresh={refresh}
              />
            ) : path === "/planning" ? (
              <PlanningPage
                cycle={dashboard.currentCycle}
                refresh={refresh}
                changed={() => setRefresh((x) => x + 1)}
              />
            ) : path === "/incomes" ? (
              <ListPage
                kind="incomes"
                title="収入"
                description="給与や臨時収入の履歴を管理します。"
                add={() => {
                  setEditing(null);
                  setModal("income");
                }}
                edit={(x) => {
                  setEditing(x);
                  setModal("income");
                }}
                refresh={refresh}
              />
            ) : path === "/income-rules" ? (
              <IncomeRulesPage
                cycle={dashboard.currentCycle}
                refresh={refresh}
                changed={() => setRefresh((x) => x + 1)}
              />
            ) : path === "/savings" ? (
              <SavingsPage
                cycle={dashboard.currentCycle}
                refresh={refresh}
                changed={() => setRefresh((x) => x + 1)}
              />
            ) : path === "/accounts" ? (
              <AccountsPage
                add={() => {
                  setEditing(null);
                  setModal("account");
                }}
                edit={(x) => {
                  setEditing(x);
                  setModal("account");
                }}
                refresh={refresh}
              />
            ) : path === "/transfers" ? (
              <TransfersPage
                refresh={refresh}
                changed={() => setRefresh((x) => x + 1)}
              />
            ) : path === "/cards" ? (
              <CardsPage
                add={() => {
                  setEditing(null);
                  setModal("card");
                }}
                edit={(x) => {
                  setEditing(x);
                  setModal("card");
                }}
                refresh={refresh}
              />
            ) : path === "/statements" ? (
              <StatementsPage
                add={() => setModal("statement")}
                refresh={refresh}
                changed={() => setRefresh((x) => x + 1)}
              />
            ) : path === "/settings/preferences" ? (
              <PreferencesPage />
            ) : path === "/settings/categories" ? (
              <CategoriesPage
                add={() => {
                  setEditing(null);
                  setModal("category");
                }}
                edit={(x) => {
                  setEditing(x);
                  setModal("category");
                }}
                refresh={refresh}
              />
            ) : (
              <BudgetPage
                add={() => {
                  setEditing(null);
                  setModal("cycle");
                }}
                refresh={refresh}
              />
            )}
          </main>
        </div>
        <EntryModal
          type={modal}
          item={editing}
          cycle={dashboard.currentCycle}
          close={() => {
            setModal(null);
            setEditing(null);
          }}
          done={() => {
            setModal(null);
            setEditing(null);
            setRefresh((x) => x + 1);
          }}
        />
      </div>
    </UIProvider>
  );
}

function DashboardPage({
  data,
  add,
  go,
}: {
  data: Dashboard;
  add: (x: "expense" | "income") => void;
  go: (path: string) => void;
}) {
  const b = data.budgetSummary;
  const used = b.spendingLimit - b.remainingAmount;
  const pct =
    b.spendingLimit > 0
      ? Math.min(100, Math.max(0, (used / b.spendingLimit) * 100))
      : 0;
  const [categories, setCategories] = useState<Item[]>([]);
  useEffect(() => {
    api<Item[]>("/expense-categories")
      .then(setCategories)
      .catch(() => {});
  }, [data.currentCycle.id]);
  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">おはようございます</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-.03em]">
            今のペース
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="bordered"
            startContent={<ArrowDownLeft size={17} />}
            onPress={() => add("income")}
          >
            収入
          </Button>
          <Button
            className="bg-slate-900 font-medium text-white"
            startContent={<Plus size={17} />}
            onPress={() => add("expense")}
          >
            支出
          </Button>
        </div>
      </div>
      <Card className="border border-slate-200 shadow-sm">
        <CardBody className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Chip size="sm" variant="flat">
                  {data.currentCycle.name}
                </Chip>
                {data.currentCycle.startDate && (
                  <span className="text-xs text-slate-500">
                    {data.currentCycle.startDate} — {data.currentCycle.endDate}
                  </span>
                )}
              </div>
              <p className="mt-5 text-sm text-slate-500">
                {b.unitLabel}使える金額
              </p>
              <p className="money mt-1 text-4xl font-semibold text-slate-900">
                {yen(b.availablePerUnit)}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                今期の残額 {yen(b.remainingAmount)}
              </p>
            </div>
            <div className="w-full max-w-md">
              <div className="mb-2 flex justify-between text-xs text-slate-500">
                <span>利用済み {yen(used)}</span>
                <span>{Math.round(pct)}%</span>
              </div>
              <Progress
                aria-label="予算の利用率"
                value={pct}
                color={b.isOverPace ? "danger" : "primary"}
                classNames={{ track: "bg-slate-200" }}
              />
            </div>
          </div>
        </CardBody>
      </Card>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Stat
          label="今期の使用限度額"
          value={yen(b.spendingLimit)}
          sub="固定費・貯金の控除後"
          icon={Gauge}
        />
        <Stat
          label="これまでの支出"
          value={yen(used)}
          sub="カード利用を含む"
          icon={TrendingDown}
          tone="red"
        />
        <Stat
          label="残り日数"
          value={`${data.currentCycle.endDate ? Math.max(0, Math.ceil((new Date(`${data.currentCycle.endDate}T23:59:59`).getTime() - Date.now()) / 86400000)) : 0}日`}
          sub="この周期が終わるまで"
          icon={CalendarDays}
          tone="green"
        />
      </div>
      <div className="mt-7 grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
        <Card className="border border-slate-200 shadow-sm">
          <CardBody className="p-0">
            <div className="flex items-center justify-between p-5">
              <div>
                <h2 className="font-semibold">最近の支出</h2>
                <p className="mt-1 text-xs text-slate-400">直近5件</p>
              </div>
              <Button
                size="sm"
                variant="light"
                endContent={<ChevronRight size={15} />}
                onPress={() => go("/expenses")}
              >
                すべて見る
              </Button>
            </div>
            <Divider />
            {data.recentExpenses.length ? (
              data.recentExpenses.map((e, i) => (
                <div key={e.id}>
                  <div className="flex items-center gap-3 px-5 py-4">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-slate-500">
                      <ReceiptText size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.name}</p>
                      <p className="text-xs text-slate-400">
                        {categories.find((c) => c.id === e.categoryId)?.name ??
                          "未分類"}
                        ・{labels[e.paymentMethod] ?? e.paymentMethod}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="money text-sm font-semibold">
                        −{yen(e.amount)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {shortDate(e.expenseDate)}
                      </p>
                    </div>
                  </div>
                  {i < data.recentExpenses.length - 1 && (
                    <Divider className="ml-[76px] w-auto" />
                  )}
                </div>
              ))
            ) : (
              <Empty
                icon={ReceiptText}
                title="支出はありません"
                text="最初の支出を記録しましょう"
              />
            )}
          </CardBody>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardBody className="p-5">
            <h2 className="font-semibold">ペース状況</h2>
            <div
              className={`mt-6 rounded-xl border p-4 text-sm ${b.isOverPace ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}
            >
              {b.isOverPace
                ? "現在の支出ペースは予算を上回っています。"
                : "このままのペースなら、周期終了時に予算が残る見込みです。"}
            </div>
            {data.alerts.map((alert, i) => (
              <div
                key={alert.id ?? i}
                className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
              >
                {alert.message ?? String(alert)}
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function useItems(path: string, refresh: number, fallback: Item[] = []) {
  const [items, setItems] = useState<Item[]>(fallback);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    api<Item[]>(path)
      .then(setItems)
      .catch(() => setItems(fallback))
      .finally(() => setLoading(false));
  }, [path, refresh]);
  return { items, loading, setItems };
}
function ListPage({
  kind,
  title,
  description,
  add,
  edit,
  refresh,
}: {
  kind: "expenses" | "incomes";
  title: string;
  description: string;
  add: () => void;
  edit: (item: Item) => void;
  refresh: number;
}) {
  const expense = kind === "expenses";
  const { items, setItems } = useItems(`/${kind}`, refresh, []);
  const [query, setQuery] = useState("");
  const [accounts, setAccounts] = useState<Item[]>([]);
  const [cards, setCards] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Item[]>([]);
  useEffect(() => {
    Promise.all([
      api<Item[]>("/accounts"),
      api<Item[]>("/credit-cards"),
      api<Item[]>("/expense-categories"),
    ])
      .then(([a, c, g]) => {
        setAccounts(a);
        setCards(c);
        setCategories(g);
      })
      .catch(() => {});
  }, [refresh]);
  const name = (list: Item[], id: string | null | undefined) =>
    list.find((x) => x.id === id)?.name;
  const filtered = items.filter((x) =>
    (x.name ?? "").toLowerCase().includes(query.toLowerCase()),
  );
  async function remove(id: string) {
    if (!confirm("このデータを削除しますか？")) return;
    await api(`/${kind}/${id}`, { method: "DELETE" });
    setItems(items.filter((x) => x.id !== id));
  }
  return (
    <>
      <PageHead
        eyebrow={expense ? "Expense history" : "Income history"}
        title={title}
        description={description}
      >
        <Button
          className="bg-[#5b55e7] font-semibold text-white"
          startContent={<Plus size={17} />}
          onPress={add}
        >
          {title}を追加
        </Button>
      </PageHead>
      <div className="mb-4">
        <Input
          aria-label={`${title}名で検索`}
          className="max-w-sm"
          placeholder={`${title}名で検索`}
          startContent={<Search size={17} className="text-slate-400" />}
          value={query}
          onValueChange={setQuery}
        />
      </div>
      <Card className="border border-slate-100 shadow-sm">
        <CardBody className="p-0">
          {filtered.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-medium">日付</th>
                    <th className="px-5 py-3 font-medium">内容</th>
                    <th className="px-5 py-3 font-medium">種類</th>
                    <th className="px-5 py-3 font-medium">支払い元 / 入金先</th>
                    <th className="px-5 py-3 text-right font-medium">金額</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((x) => (
                    <tr
                      key={x.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-4 text-sm text-slate-500">
                        {shortDate(x.expenseDate ?? x.incomeDate)}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium">{x.name}</p>
                        <p className="mt-0.5 max-w-[260px] truncate text-xs text-slate-400">
                          {x.memo ?? "メモなし"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <Chip size="sm" variant="flat">
                          {expense
                            ? (name(categories, x.categoryId) ?? "未分類")
                            : (labels[x.type] ?? x.type)}
                        </Chip>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">
                        {expense
                          ? x.creditCardId
                            ? name(cards, x.creditCardId)
                            : name(accounts, x.accountId)
                          : (name(accounts, x.accountId) ?? "—")}
                      </td>
                      <td
                        className={`money px-5 py-4 text-right text-sm font-semibold ${expense ? "" : "text-emerald-600"}`}
                      >
                        {expense ? "−" : "+"}
                        {yen(x.amount)}
                      </td>
                      <td className="px-4">
                        <Dropdown>
                          <DropdownTrigger>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              aria-label={`${x.name}の操作`}
                            >
                              <MoreHorizontal size={17} />
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu>
                            <DropdownItem
                              key="edit"
                              startContent={<Pencil size={15} />}
                              onPress={() => edit(x)}
                            >
                              編集
                            </DropdownItem>
                            <DropdownItem
                              key="delete"
                              color="danger"
                              startContent={<Trash2 size={15} />}
                              onPress={() => remove(x.id)}
                            >
                              削除
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              icon={expense ? ReceiptText : CircleDollarSign}
              title={`${title}はまだありません`}
              text={`「${title}を追加」から最初の記録を作成できます`}
              action={
                <Button color="primary" onPress={add}>
                  追加する
                </Button>
              }
            />
          )}
        </CardBody>
      </Card>
    </>
  );
}

function SavingsPage({
  cycle,
  refresh,
  changed,
}: {
  cycle: Item;
  refresh: number;
  changed: () => void;
}) {
  const [localRefresh, setLocalRefresh] = useState(0);
  const { items: goals, setItems: setGoals } = useItems(
    "/saving-goals",
    refresh + localRefresh,
    [],
  );
  const { items: rules } = useItems(
    "/savings-rules",
    refresh + localRefresh,
    [],
  );
  const { items: allocations } = useItems(
    `/saving-allocations${cycle.id ? `?cycleId=${cycle.id}` : ""}`,
    refresh + localRefresh,
    [],
  );
  const [incomes, setIncomes] = useState<Item[]>([]);
  const [modal, setModal] = useState<"goal" | "rule" | "allocation" | null>(
    null,
  );
  const [editing, setEditing] = useState<Item | null>(null);
  const [allocationRule, setAllocationRule] = useState<Item | null>(null);
  const [ruleType, setRuleType] = useState("fixed_amount");
  const [ruleGoalId, setRuleGoalId] = useState("");
  const [ruleAmount, setRuleAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Item[]>(`/incomes${cycle.id ? `?cycleId=${cycle.id}` : ""}`)
      .then(setIncomes)
      .catch(() => {});
  }, [cycle.id, refresh]);
  useEffect(() => {
    if (!ruleGoalId && goals.length)
      setRuleGoalId((goals.find((x) => x.isPrimary) ?? goals[0]).id);
  }, [goals, ruleGoalId]);
  const primary = goals.find((x) => x.isPrimary);
  const purposeGoals = goals.filter((x) => !x.isPrimary);
  const total = goals.reduce((sum, x) => sum + (x.currentAmount ?? 0), 0);
  const target = purposeGoals.reduce(
    (sum, x) => sum + (x.targetAmount ?? 0),
    0,
  );
  useEffect(() => {
    if (modal !== "rule") return;
    if (editing) {
      setRuleGoalId(editing.savingGoalId ?? primary?.id ?? goals[0]?.id ?? "");
      setRuleType(editing.type ?? "fixed_amount");
      setRuleAmount(
        editing.type === "fixed_amount"
          ? String(editing.amount ?? "")
          : editing.type === "income_percentage"
            ? String(editing.percentage ?? "")
            : "",
      );
      return;
    }
    setRuleGoalId((goals.find((x) => x.isPrimary) ?? goals[0])?.id ?? "");
    setRuleType("fixed_amount");
    setRuleAmount("");
  }, [editing, goals, modal, primary]);
  const selectedRuleGoal = goals.find((x) => x.id === ruleGoalId);
  const ruleSummary =
    ruleType === "fixed_amount"
      ? `毎月 ${yen(Number(ruleAmount) || 0)} を「${selectedRuleGoal?.name ?? "振り分け先"}」へ`
      : ruleType === "income_percentage"
        ? `収入の ${Number(ruleAmount) || 0}% を「${selectedRuleGoal?.name ?? "振り分け先"}」へ`
        : `金額を毎回確認して「${selectedRuleGoal?.name ?? "振り分け先"}」へ`;
  async function removeGoal(id: string) {
    if (!confirm("この貯金目的を無効にしますか？")) return;
    await api(`/saving-goals/${id}`, { method: "DELETE" });
    setGoals(goals.filter((x) => x.id !== id));
  }
  async function removeRule(id: string) {
    if (!confirm("この貯金プランを無効にしますか？")) return;
    await api(`/savings-rules/${id}`, { method: "DELETE" });
    setLocalRefresh((x) => x + 1);
  }
  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      if (modal === "goal") {
        await api(`/saving-goals${editing ? `/${editing.id}` : ""}`, {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify({
            name: data.name,
            targetAmount: Number(data.targetAmount),
          }),
        });
      } else if (modal === "rule") {
        await api(`/savings-rules${editing ? `/${editing.id}` : ""}`, {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify({
            name: data.name,
            savingGoalId: data.savingGoalId,
            type: data.ruleType,
            ...(data.ruleType === "fixed_amount" && {
              amount: Number(data.amount),
              percentage: null,
            }),
            ...(data.ruleType === "income_percentage" && {
              percentage: Number(data.percentage),
              amount: null,
            }),
            ...(data.ruleType === "manual" && { amount: null, percentage: null }),
          }),
        });
      } else {
        await api("/saving-allocations", {
          method: "POST",
          body: JSON.stringify({
            cycleId: cycle.id,
            savingGoalId: data.savingGoalId,
            amount: Number(data.amount),
            ...(data.incomeId && { incomeId: data.incomeId }),
          }),
        });
        changed();
      }
      setModal(null);
      setEditing(null);
      setAllocationRule(null);
      setRuleAmount("");
      setLocalRefresh((x) => x + 1);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "貯金情報を保存できませんでした",
      );
    } finally {
      setBusy(false);
    }
  }
  const close = () => {
    setModal(null);
    setEditing(null);
    setAllocationRule(null);
    setError("");
  };
  const suggestedAllocationAmount =
    allocationRule?.type === "fixed_amount"
      ? allocationRule.amount
      : allocationRule?.type === "income_percentage"
        ? Math.round(
            (incomes.reduce((sum, income) => sum + income.amount, 0) *
              allocationRule.percentage) /
              100,
          )
        : undefined;
  return (
    <>
      <PageHead
        eyebrow="Savings"
        title="貯金"
        description="まず通常貯金を積み立て、必要なものだけ目的別に分けられます。"
      >
        <div className="flex flex-wrap gap-2">
          <Button
            variant="bordered"
            onPress={() => {
              setEditing(null);
              setModal("rule");
            }}
          >
            貯金プランを作る
          </Button>
          <Button
            className="bg-[#5b55e7] text-white"
            startContent={<Plus size={17} />}
            onPress={() => setModal("goal")}
          >
            目的別貯金を追加
          </Button>
        </div>
      </PageHead>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat
          label="貯金済み合計"
          value={yen(total)}
          sub="通常・目的別の合計"
          icon={PiggyBank}
          tone="green"
        />
        <Stat
          label="目的別の目標額"
          value={yen(target)}
          sub={`${purposeGoals.length}件の目的`}
          icon={Gauge}
        />
        <Stat
          label="今期の収入"
          value={yen(incomes.reduce((s, x) => s + x.amount, 0))}
          sub="振り分け元"
          icon={CircleDollarSign}
        />
      </div>
      {primary && (
        <Card className="mb-6 border border-emerald-200 bg-emerald-50/60 shadow-sm">
          <CardBody className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-800">
                メインの貯金
              </p>
              <h2 className="mt-1 text-xl font-semibold">{primary.name}</h2>
              <p className="money mt-3 text-3xl font-semibold">
                {yen(primary.currentAmount)}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                使い道を決めずに貯める基本の貯金です。
              </p>
            </div>
            <Button
              color="success"
              onPress={() => {
                setEditing(primary);
                setModal("allocation");
              }}
            >
              通常貯金に追加
            </Button>
          </CardBody>
        </Card>
      )}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
        <div>
          <div className="mb-3">
            <h2 className="font-semibold">目的別貯金</h2>
            <p className="mt-1 text-sm text-slate-500">
              旅行や大型購入など、必要な場合だけ追加します。
            </p>
          </div>
          {purposeGoals.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {purposeGoals.map((goal) => {
                const pct = goal.targetAmount
                  ? Math.min(
                      100,
                      (goal.currentAmount / goal.targetAmount) * 100,
                    )
                  : 0;
                return (
                  <Card
                    key={goal.id}
                    className="border border-slate-100 shadow-sm"
                  >
                    <CardBody className="p-5">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold">{goal.name}</h3>
                        <Dropdown>
                          <DropdownTrigger>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              aria-label={`${goal.name}の操作`}
                            >
                              <MoreHorizontal size={17} />
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu>
                            <DropdownItem
                              key="edit"
                              onPress={() => {
                                setEditing(goal);
                                setModal("goal");
                              }}
                            >
                              編集
                            </DropdownItem>
                            <DropdownItem
                              key="delete"
                              color="danger"
                              onPress={() => removeGoal(goal.id)}
                            >
                              無効にする
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      </div>
                      <p className="money mt-5 text-2xl font-semibold">
                        {yen(goal.currentAmount)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        目標 {yen(goal.targetAmount)}
                      </p>
                      <Progress
                        aria-label={`${goal.name}の達成率`}
                        value={pct}
                        color="success"
                        className="mt-4"
                      />
                      <Button
                        size="sm"
                        variant="bordered"
                        className="mt-4"
                        onPress={() => {
                          setEditing(goal);
                          setModal("allocation");
                        }}
                      >
                        この目的に追加
                      </Button>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Empty
              icon={PiggyBank}
              title="目的別貯金はありません"
              text="通常貯金だけでも利用できます"
              action={
                <Button color="primary" onPress={() => setModal("goal")}>
                  目的を追加
                </Button>
              }
            />
          )}
        </div>
        <Card className="h-fit border border-slate-100 shadow-sm">
          <CardBody className="p-5">
            <h2 className="font-semibold">貯金プラン</h2>
            <p className="mt-1 text-xs text-slate-500">
              プランは「貯め方の定義」です。自動では反映されず、「このプランで追加」を押した時に下の実績へ反映されます。
            </p>
            <div className="mt-4 space-y-3">
              {rules.length ? (
                rules.map((rule) => {
                  const goal = goals.find((x) => x.id === rule.savingGoalId);
                  return (
                    <div key={rule.id} className="rounded-xl bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{rule.name}</p>
                        <Dropdown>
                          <DropdownTrigger>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              aria-label={`${rule.name}の操作`}
                            >
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu>
                            <DropdownItem
                              key="edit"
                              onPress={() => {
                                setEditing(rule);
                                setModal("rule");
                              }}
                            >
                              編集
                            </DropdownItem>
                            <DropdownItem
                              key="delete"
                              color="danger"
                              onPress={() => removeRule(rule.id)}
                            >
                              無効にする
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {rule.type === "fixed_amount"
                          ? `毎月 ${yen(rule.amount)}`
                          : rule.type === "income_percentage"
                            ? `収入の ${rule.percentage}%`
                            : "金額を毎回確認"}{" "}
                        → {goal?.name ?? "通常貯金"}
                      </p>
                      <Button
                        size="sm"
                        variant="bordered"
                        className="mt-3"
                        onPress={() => {
                          setAllocationRule(rule);
                          setEditing(goal ?? primary ?? null);
                          setModal("allocation");
                        }}
                      >
                        このプランで追加
                      </Button>
                    </div>
                  );
                })
              ) : (
                <p className="py-6 text-center text-sm text-slate-400">
                  プランは未設定です
                </p>
              )}
            </div>
            <Divider className="my-5" />
            <h3 className="font-medium">貯金の反映履歴</h3>
            <div className="mt-3 space-y-3">
              {allocations.length ? (
                allocations.slice(0, 6).map((allocation) => {
                  const goal = goals.find((x) => x.id === allocation.savingGoalId);
                  const income = incomes.find((x) => x.id === allocation.incomeId);
                  return (
                    <div
                      key={allocation.id}
                      className="rounded-xl border border-slate-100 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">
                            {goal?.name ?? "通常貯金"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {income
                              ? `${income.name} から振り分け`
                              : "周期全体から振り分け"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="money text-sm font-semibold">
                            {yen(allocation.amount)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {shortDate(allocation.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="py-4 text-center text-sm text-slate-400">
                  まだ反映された貯金はありません
                </p>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
      <Modal isOpen={!!modal} onClose={close} placement="center">
        <ModalContent>
          <form key={`${modal}-${editing?.id ?? "new"}`} onSubmit={submit}>
            <ModalHeader>
              {modal === "goal"
                ? editing
                  ? "目的別貯金を編集"
                  : "目的別貯金を追加"
                : modal === "rule"
                  ? editing
                    ? "貯金プランを編集"
                    : "貯金プランを作る"
                  : "貯金に追加する"}
            </ModalHeader>
            <ModalBody className="gap-4">
              {modal === "goal" && (
                <>
                  <FormField label="目的名">
                    <Input
                      isRequired
                      aria-label="貯金目的名"
                      name="name"
                      defaultValue={editing?.name}
                      placeholder="例：旅行用"
                    />
                  </FormField>
                  <FormField label="目標額">
                    <Input
                      isRequired
                      aria-label="目標額"
                      name="targetAmount"
                      type="number"
                      min="1"
                      defaultValue={editing?.targetAmount}
                      startContent="¥"
                    />
                  </FormField>
                </>
              )}
              {modal === "rule" && (
                <>
                  <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
                    3つ選ぶだけで、貯め方が文章で確認できます。
                  </p>
                  <FormField label="1. 振り分け先">
                    <Select
                      isRequired
                      aria-label="貯金の振り分け先"
                      name="savingGoalId"
                      selectedKeys={[ruleGoalId]}
                      onChange={(e) => setRuleGoalId(e.target.value)}
                    >
                      {goals.map((x) => (
                        <SelectItem key={x.id}>{x.name}</SelectItem>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="2. 計算方法">
                    <Select
                      isRequired
                      aria-label="貯金の計算方法"
                      name="ruleType"
                      selectedKeys={[ruleType]}
                      onChange={(e) => {
                        setRuleType(e.target.value);
                        setRuleAmount("");
                      }}
                    >
                      <SelectItem key="fixed_amount">
                        毎月、決まった金額
                      </SelectItem>
                      <SelectItem key="income_percentage">
                        収入に対する割合
                      </SelectItem>
                      <SelectItem key="manual">毎回、金額を確認</SelectItem>
                    </Select>
                  </FormField>
                  {ruleType === "fixed_amount" && (
                    <FormField label="3. 毎月の金額">
                      <Input
                        isRequired
                        aria-label="毎月の貯金額"
                        name="amount"
                        value={ruleAmount}
                        onValueChange={setRuleAmount}
                        type="number"
                        min="1"
                        startContent="¥"
                      />
                    </FormField>
                  )}
                  {ruleType === "income_percentage" && (
                    <FormField label="3. 収入に対する割合">
                      <Input
                        isRequired
                        aria-label="貯金割合"
                        name="percentage"
                        value={ruleAmount}
                        onValueChange={setRuleAmount}
                        type="number"
                        min="1"
                        max="100"
                        endContent="%"
                      />
                    </FormField>
                  )}
                  <FormField label="プラン名">
                    <Input
                      isRequired
                      aria-label="貯金プラン名"
                      name="name"
                      defaultValue={editing?.name}
                      placeholder="例：毎月の先取り貯金"
                    />
                  </FormField>
                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                    <span className="block text-xs text-slate-500">
                      このプランの内容
                    </span>
                    <b className="mt-1 block">{ruleSummary}</b>
                  </p>
                </>
              )}
              {modal === "allocation" && (
                <>
                  <p className="rounded-xl bg-slate-50 p-3 text-sm">
                    追加先: <b>{editing?.name}</b>
                  </p>
                  {allocationRule && (
                    <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                      この追加は「{allocationRule.name}」を反映します。
                      {suggestedAllocationAmount
                        ? ` 推奨額は ${yen(suggestedAllocationAmount)} です。`
                        : " 金額は今回の状況に合わせて入力します。"}
                    </p>
                  )}
                  <input
                    type="hidden"
                    name="savingGoalId"
                    value={editing?.id ?? ""}
                  />
                  <FormField label="金額">
                    <Input
                      isRequired
                      aria-label="振り分け金額"
                      name="amount"
                      type="number"
                      min="1"
                      defaultValue={suggestedAllocationAmount}
                      startContent="¥"
                    />
                  </FormField>
                  <FormField label="元になる収入（任意）">
                    <Select
                      aria-label="振り分け元の収入"
                      name="incomeId"
                      placeholder="周期全体から振り分ける"
                    >
                      {incomes.map((x) => (
                        <SelectItem key={x.id}>
                          {x.name}（{yen(x.amount)}）
                        </SelectItem>
                      ))}
                    </Select>
                  </FormField>
                </>
              )}
              {error && (
                <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                  {error}
                </p>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={close}>
                キャンセル
              </Button>
              <Button type="submit" color="primary" isLoading={busy}>
                保存する
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </>
  );
}

function TransfersPage({
  refresh,
  changed,
}: {
  refresh: number;
  changed: () => void;
}) {
  const { items } = useItems("/account-transfers", refresh, []);
  const [accounts, setAccounts] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Item[]>("/accounts")
      .then(setAccounts)
      .catch(() => {});
  }, [refresh]);
  const accountName = (id: string) =>
    accounts.find((x) => x.id === id)?.name ?? "—";
  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (data.fromAccountId === data.toAccountId) {
      setError("移動元と移動先には別の口座を選択してください");
      setBusy(false);
      return;
    }
    try {
      await api("/account-transfers", {
        method: "POST",
        body: JSON.stringify({
          fromAccountId: data.fromAccountId,
          toAccountId: data.toAccountId,
          amount: Number(data.amount),
          transferDate: data.transferDate,
          memo: data.memo || undefined,
        }),
      });
      setOpen(false);
      changed();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "資金移動を記録できませんでした",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHead
        eyebrow="Account transfers"
        title="口座間の資金移動"
        description="資産の置き場所の変更として記録し、支出には計上しません。"
      >
        <Button
          className="bg-[#5b55e7] text-white"
          startContent={<ArrowRightLeft size={17} />}
          onPress={() => setOpen(true)}
        >
          資金を移動
        </Button>
      </PageHead>
      {items.length ? (
        <Card className="border border-slate-100 shadow-sm">
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead className="border-b bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-3">日付</th>
                    <th className="px-5 py-3">移動元</th>
                    <th className="px-5 py-3">移動先</th>
                    <th className="px-5 py-3">メモ</th>
                    <th className="px-5 py-3 text-right">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((x) => (
                    <tr key={x.id} className="border-b last:border-0">
                      <td className="px-5 py-4 text-sm">
                        {shortDate(x.transferDate)}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        {accountName(x.fromAccountId)}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        {accountName(x.toAccountId)}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">
                        {x.memo ?? "—"}
                      </td>
                      <td className="money px-5 py-4 text-right font-semibold">
                        {yen(x.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Empty
          icon={ArrowRightLeft}
          title="資金移動はありません"
          text="口座間でお金を移したときに記録します"
          action={
            <Button color="primary" onPress={() => setOpen(true)}>
              資金を移動
            </Button>
          }
        />
      )}
      <Modal isOpen={open} onClose={() => setOpen(false)}>
        <ModalContent>
          <form onSubmit={submit}>
            <ModalHeader>口座間の資金移動</ModalHeader>
            <ModalBody className="gap-4">
              <FormField label="移動元">
                <Select isRequired aria-label="移動元口座" name="fromAccountId">
                  {accounts.map((x) => (
                    <SelectItem key={x.id}>
                      {x.name}（{yen(x.currentBalance)}）
                    </SelectItem>
                  ))}
                </Select>
              </FormField>
              <FormField label="移動先">
                <Select isRequired aria-label="移動先口座" name="toAccountId">
                  {accounts.map((x) => (
                    <SelectItem key={x.id}>{x.name}</SelectItem>
                  ))}
                </Select>
              </FormField>
              <FormField label="金額">
                <Input
                  isRequired
                  aria-label="移動金額"
                  name="amount"
                  type="number"
                  min="1"
                  startContent="¥"
                />
              </FormField>
              <FormField label="日付">
                <Input
                  isRequired
                  aria-label="移動日"
                  name="transferDate"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </FormField>
              <FormField label="メモ">
                <Textarea aria-label="資金移動メモ" name="memo" />
              </FormField>
              {error && (
                <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                  {error}
                </p>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={() => setOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit" color="primary" isLoading={busy}>
                移動を記録
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </>
  );
}

function IncomeRulesPage({
  cycle,
  refresh,
  changed,
}: {
  cycle: Item;
  refresh: number;
  changed: () => void;
}) {
  const { items: rules } = useItems("/income-rules", refresh, []);
  const [accounts, setAccounts] = useState<Item[]>([]);
  const [mode, setMode] = useState<"create" | "generate" | null>(null);
  const [selected, setSelected] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Item[]>("/accounts")
      .then(setAccounts)
      .catch(() => {});
  }, [refresh]);
  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      if (mode === "create")
        await api("/income-rules", {
          method: "POST",
          body: JSON.stringify({
            accountId: data.accountId,
            name: data.name,
            amount: Number(data.amount),
            incomeDay: Number(data.incomeDay),
            inputMode: data.inputMode,
          }),
        });
      else
        await api(`/income-rules/${selected?.id}/generate`, {
          method: "POST",
          body: JSON.stringify({
            cycleId: cycle.id,
            incomeDate: data.incomeDate,
            ...(data.amount && { amount: Number(data.amount) }),
          }),
        });
      setMode(null);
      changed();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "給与設定を保存できませんでした",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHead
        eyebrow="Income automation"
        title="給与・収入ルール"
        description="毎月の給与を自動入力するか、給料日に手動入力します。"
      >
        <Button
          className="bg-[#5b55e7] text-white"
          startContent={<Plus size={17} />}
          onPress={() => setMode("create")}
        >
          給与ルールを追加
        </Button>
      </PageHead>
      {rules.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rules.map((rule) => (
            <Card key={rule.id} className="border border-slate-100 shadow-sm">
              <CardBody className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={rule.inputMode === "auto" ? "success" : "warning"}
                    >
                      {rule.inputMode === "auto" ? "自動入力" : "手動通知"}
                    </Chip>
                    <h2 className="mt-3 font-semibold">{rule.name}</h2>
                  </div>
                  <Repeat2 className="text-slate-400" size={20} />
                </div>
                <p className="money mt-5 text-2xl font-semibold">
                  {yen(rule.amount)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  毎月 {rule.incomeDay}日・
                  {accounts.find((a) => a.id === rule.accountId)?.name ??
                    "入金先口座"}
                </p>
                <Button
                  variant="bordered"
                  size="sm"
                  className="mt-5"
                  onPress={() => {
                    setSelected(rule);
                    setMode("generate");
                  }}
                >
                  {rule.inputMode === "auto" ? "今期分を生成" : "収入を入力"}
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <Empty
          icon={Repeat2}
          title="給与ルールがありません"
          text="毎月の給与日と入力方法を登録してください"
          action={
            <Button color="primary" onPress={() => setMode("create")}>
              ルールを追加
            </Button>
          }
        />
      )}
      <Modal isOpen={!!mode} onClose={() => setMode(null)}>
        <ModalContent>
          <form onSubmit={submit}>
            <ModalHeader>
              {mode === "create" ? "給与ルールを追加" : "今期の収入を入力"}
            </ModalHeader>
            <ModalBody className="gap-4">
              {mode === "create" ? (
                <>
                  <FormField label="給与名">
                    <Input
                      isRequired
                      aria-label="給与名"
                      name="name"
                      placeholder="例：給与"
                    />
                  </FormField>
                  <FormField label="通常金額">
                    <Input
                      isRequired
                      aria-label="通常の給与額"
                      name="amount"
                      type="number"
                      min="1"
                      startContent="¥"
                    />
                  </FormField>
                  <FormField label="給料日">
                    <Input
                      isRequired
                      aria-label="給料日"
                      name="incomeDay"
                      type="number"
                      min="1"
                      max="31"
                    />
                  </FormField>
                  <FormField label="入金先口座">
                    <Select
                      isRequired
                      aria-label="給与の入金先口座"
                      name="accountId"
                    >
                      {accounts.map((x) => (
                        <SelectItem key={x.id}>{x.name}</SelectItem>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="入力方式">
                    <Select
                      isRequired
                      aria-label="給与の入力方式"
                      name="inputMode"
                      defaultSelectedKeys={["auto"]}
                    >
                      <SelectItem key="auto">毎月自動で同額を追加</SelectItem>
                      <SelectItem key="manual_reminder">
                        給料日に通知して手動入力
                      </SelectItem>
                    </Select>
                  </FormField>
                </>
              ) : (
                <>
                  <p className="rounded-xl bg-slate-50 p-3 text-sm">
                    {selected?.name}・通常 {yen(selected?.amount)}
                  </p>
                  <FormField label="入金日">
                    <Input
                      isRequired
                      aria-label="給与の入金日"
                      name="incomeDate"
                      type="date"
                      defaultValue={new Date().toISOString().slice(0, 10)}
                    />
                  </FormField>
                  <FormField label="金額（省略時は通常金額）">
                    <Input
                      aria-label="今回の給与額"
                      name="amount"
                      type="number"
                      min="1"
                      startContent="¥"
                    />
                  </FormField>
                </>
              )}
              {error && (
                <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                  {error}
                </p>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={() => setMode(null)}>
                キャンセル
              </Button>
              <Button type="submit" color="primary" isLoading={busy}>
                保存する
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </>
  );
}

function PlanningPage({
  cycle,
  refresh,
  changed,
}: {
  cycle: Item;
  refresh: number;
  changed: () => void;
}) {
  const [local, setLocal] = useState(0);
  const { items: planned } = useItems(
    `/planned-expenses${cycle.id ? `?cycleId=${cycle.id}` : ""}`,
    refresh + local,
    [],
  );
  const { items: recurring, setItems: setRecurring } = useItems(
    "/recurring-expenses",
    refresh + local,
    [],
  );
  const [accounts, setAccounts] = useState<Item[]>([]);
  const [cards, setCards] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Item[]>([]);
  const [modal, setModal] = useState<
    "planned" | "confirm" | "recurring" | "generate" | null
  >(null);
  const [selected, setSelected] = useState<Item | null>(null);
  const [payment, setPayment] = useState("bank_transfer");
  const [fixed, setFixed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      api<Item[]>("/accounts"),
      api<Item[]>("/credit-cards"),
      api<Item[]>("/expense-categories"),
    ])
      .then(([a, b, c]) => {
        setAccounts(a);
        setCards(b);
        setCategories(c);
      })
      .catch(() => {});
  }, [refresh]);
  const today = new Date().toISOString().slice(0, 10);
  const sourceFields = (
    <>
      <FormField label="カテゴリ">
        <Select isRequired aria-label="予定支出のカテゴリ" name="categoryId">
          {categories.map((x) => (
            <SelectItem key={x.id}>{x.name}</SelectItem>
          ))}
        </Select>
      </FormField>
      <FormField label="支払い方法">
        <Select
          isRequired
          aria-label="予定支出の支払い方法"
          name="paymentMethod"
          selectedKeys={[payment]}
          onChange={(e) => setPayment(e.target.value)}
        >
          <SelectItem key="cash">現金</SelectItem>
          <SelectItem key="bank_transfer">銀行口座</SelectItem>
          <SelectItem key="debit">デビット</SelectItem>
          <SelectItem key="credit_card">クレジットカード</SelectItem>
          <SelectItem key="electronic_money">電子マネー</SelectItem>
          <SelectItem key="other">その他</SelectItem>
        </Select>
      </FormField>
      {payment === "credit_card" ? (
        <FormField label="カード">
          <Select isRequired aria-label="予定支出のカード" name="creditCardId">
            {cards.map((x) => (
              <SelectItem key={x.id}>{x.name}</SelectItem>
            ))}
          </Select>
        </FormField>
      ) : (
        <FormField label="支払い元口座">
          <Select isRequired aria-label="予定支出の口座" name="accountId">
            {accounts.map((x) => (
              <SelectItem key={x.id}>{x.name}</SelectItem>
            ))}
          </Select>
        </FormField>
      )}
    </>
  );
  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      if (modal === "planned")
        await api("/planned-expenses", {
          method: "POST",
          body: JSON.stringify({
            cycleId: cycle.id,
            accountId: payment === "credit_card" ? null : data.accountId,
            creditCardId: payment === "credit_card" ? data.creditCardId : null,
            categoryId: data.categoryId,
            name: data.name,
            estimatedAmount: Number(data.amount),
            plannedDate: data.date,
            paymentMethod: payment,
            reflectToBudget: data.reflectToBudget === "on",
            memo: data.memo || undefined,
          }),
        });
      else if (modal === "confirm")
        await api(`/planned-expenses/${selected?.id}/confirm`, {
          method: "POST",
          body: JSON.stringify({
            actualAmount: Number(data.amount),
            confirmedDate: data.date,
          }),
        });
      else if (modal === "recurring")
        await api("/recurring-expenses", {
          method: "POST",
          body: JSON.stringify({
            accountId: payment === "credit_card" ? null : data.accountId,
            creditCardId: payment === "credit_card" ? data.creditCardId : null,
            categoryId: data.categoryId,
            name: data.name,
            paymentMethod: payment,
            billingDay: Number(data.billingDay),
            isAmountFixed: fixed,
            ...(fixed
              ? { amount: Number(data.amount) }
              : { estimatedAmount: Number(data.amount) }),
          }),
        });
      else
        await api(`/recurring-expenses/${selected?.id}/generate`, {
          method: "POST",
          body: JSON.stringify({ cycleId: cycle.id, targetDate: data.date }),
        });
      setModal(null);
      setSelected(null);
      setLocal((x) => x + 1);
      changed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "予定を保存できませんでした");
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (!confirm("この固定費を無効にしますか？")) return;
    await api(`/recurring-expenses/${id}`, { method: "DELETE" });
    setRecurring(recurring.filter((x) => x.id !== id));
    changed();
  }
  return (
    <>
      <PageHead
        eyebrow="Planned & recurring"
        title="予定支出・固定費"
        description="金額未確定の予定と、毎月発生する固定費を管理します。"
      >
        <div className="flex gap-2">
          <Button variant="bordered" onPress={() => setModal("recurring")}>
            固定費を追加
          </Button>
          <Button
            className="bg-[#5b55e7] text-white"
            onPress={() => setModal("planned")}
          >
            予定支出を追加
          </Button>
        </div>
      </PageHead>
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-semibold">今期の予定支出</h2>
          {planned.length ? (
            <div className="space-y-3">
              {planned.map((x) => (
                <Card key={x.id} className="border border-slate-100 shadow-sm">
                  <CardBody className="flex items-center gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{x.name}</p>
                        <Chip
                          size="sm"
                          color={
                            x.status === "confirmed" ? "success" : "warning"
                          }
                          variant="flat"
                        >
                          {x.status === "confirmed" ? "確定済み" : "予定"}
                        </Chip>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {x.plannedDate}・
                        {x.reflectToBudget ? "予算に反映" : "表示のみ"}
                      </p>
                    </div>
                    <p className="money font-semibold">
                      {yen(x.actualAmount ?? x.estimatedAmount)}
                    </p>
                    {x.status === "planned" && (
                      <Button
                        size="sm"
                        variant="bordered"
                        onPress={() => {
                          setSelected(x);
                          setModal("confirm");
                        }}
                      >
                        金額を確定
                      </Button>
                    )}
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : (
            <Empty
              icon={CalendarClock}
              title="予定支出はありません"
              text="光熱費など金額未確定の予定を登録できます"
            />
          )}
        </section>
        <section>
          <h2 className="mb-3 font-semibold">固定費・サブスク</h2>
          {recurring.length ? (
            <div className="space-y-3">
              {recurring.map((x) => (
                <Card key={x.id} className="border border-slate-100 shadow-sm">
                  <CardBody className="flex items-center gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{x.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        毎月 {x.billingDay}日・
                        {x.isAmountFixed ? "金額固定" : "見積額"}
                      </p>
                    </div>
                    <p className="money font-semibold">
                      {yen(x.amount ?? x.estimatedAmount)}
                    </p>
                    <Dropdown>
                      <DropdownTrigger>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          aria-label={`${x.name}の操作`}
                        >
                          <MoreHorizontal size={17} />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu>
                        <DropdownItem
                          key="generate"
                          onPress={() => {
                            setSelected(x);
                            setModal("generate");
                          }}
                        >
                          今期の支出を生成
                        </DropdownItem>
                        <DropdownItem
                          key="delete"
                          color="danger"
                          onPress={() => remove(x.id)}
                        >
                          無効にする
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : (
            <Empty
              icon={Repeat2}
              title="固定費はありません"
              text="家賃やサブスクを登録できます"
            />
          )}
        </section>
      </div>
      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        placement="center"
        scrollBehavior="inside"
      >
        <ModalContent>
          <form onSubmit={submit}>
            <ModalHeader>
              {modal === "planned"
                ? "予定支出を追加"
                : modal === "confirm"
                  ? "予定額を確定"
                  : modal === "recurring"
                    ? "固定費を追加"
                    : "今期の支出を生成"}
            </ModalHeader>
            <ModalBody className="gap-4">
              {(modal === "planned" || modal === "recurring") && (
                <>
                  <FormField label="名称">
                    <Input
                      isRequired
                      aria-label="予定または固定費の名称"
                      name="name"
                    />
                  </FormField>
                  {modal === "recurring" && (
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                      <span className="text-sm">金額が毎月固定</span>
                      <Switch
                        aria-label="固定費の金額が固定"
                        isSelected={fixed}
                        onValueChange={setFixed}
                      />
                    </div>
                  )}
                  <FormField
                    label={
                      modal === "planned" ? "予定額" : fixed ? "金額" : "見積額"
                    }
                  >
                    <Input
                      isRequired
                      aria-label="予定または固定費の金額"
                      name="amount"
                      type="number"
                      min="1"
                      startContent="¥"
                    />
                  </FormField>
                  {modal === "planned" ? (
                    <FormField label="予定日">
                      <Input
                        isRequired
                        aria-label="予定支出日"
                        name="date"
                        type="date"
                        defaultValue={today}
                      />
                    </FormField>
                  ) : (
                    <FormField label="毎月の発生日">
                      <Input
                        isRequired
                        aria-label="固定費の発生日"
                        name="billingDay"
                        type="number"
                        min="1"
                        max="31"
                      />
                    </FormField>
                  )}
                  {sourceFields}
                  {modal === "planned" && (
                    <>
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                        <span className="text-sm">予定額を予算に反映</span>
                        <Switch
                          aria-label="予定額を予算に反映"
                          name="reflectToBudget"
                          defaultSelected
                        />
                      </div>
                      <FormField label="メモ">
                        <Textarea aria-label="予定支出メモ" name="memo" />
                      </FormField>
                    </>
                  )}
                </>
              )}
              {modal === "confirm" && (
                <>
                  <p className="rounded-xl bg-slate-50 p-3 text-sm">
                    {selected?.name}・予定 {yen(selected?.estimatedAmount)}
                  </p>
                  <FormField label="確定額">
                    <Input
                      isRequired
                      aria-label="確定した支出額"
                      name="amount"
                      type="number"
                      min="1"
                      defaultValue={selected?.estimatedAmount}
                      startContent="¥"
                    />
                  </FormField>
                  <FormField label="確定日">
                    <Input
                      isRequired
                      aria-label="支出確定日"
                      name="date"
                      type="date"
                      defaultValue={today}
                    />
                  </FormField>
                </>
              )}
              {modal === "generate" && (
                <>
                  <p className="rounded-xl bg-slate-50 p-3 text-sm">
                    {selected?.name}・
                    {yen(selected?.amount ?? selected?.estimatedAmount)}
                  </p>
                  <FormField label="発生日">
                    <Input
                      isRequired
                      aria-label="固定費の発生日"
                      name="date"
                      type="date"
                      defaultValue={today}
                    />
                  </FormField>
                </>
              )}
              {error && (
                <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                  {error}
                </p>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={() => setModal(null)}>
                キャンセル
              </Button>
              <Button type="submit" color="primary" isLoading={busy}>
                保存する
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </>
  );
}

function AccountsPage({
  add,
  edit,
  refresh,
}: {
  add: () => void;
  edit: (item: Item) => void;
  refresh: number;
}) {
  const { items, setItems } = useItems("/accounts", refresh, []);
  async function remove(id: string) {
    if (!confirm("この保管先を無効にしますか？")) return;
    await api(`/accounts/${id}`, { method: "DELETE" });
    setItems(items.filter((x) => x.id !== id));
  }
  const total = items.reduce((s, x) => s + x.currentBalance, 0);
  return (
    <>
      <PageHead
        eyebrow="Money locations"
        title="残高・保管先"
        description="銀行口座、財布、現金、電子マネーなど、お金の置き場所を管理します。"
      >
        <Button
          className="bg-[#5b55e7] text-white"
          startContent={<Plus size={17} />}
          onPress={add}
        >
          保管先を追加
        </Button>
      </PageHead>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          label="合計残高"
          value={yen(total)}
          sub={`${items.length}件の保管先`}
          icon={Landmark}
        />
        <Stat
          label="銀行口座"
          value={yen(
            items
              .filter((x) => x.type === "bank")
              .reduce((s, x) => s + x.currentBalance, 0),
          )}
          sub="銀行にあるお金"
          icon={Landmark}
          tone="green"
        />
        <Stat
          label="その他の保管先"
          value={yen(
            items
              .filter((x) => x.type !== "bank")
              .reduce((s, x) => s + x.currentBalance, 0),
          )}
          sub="財布・現金・電子マネー"
          icon={HandCoins}
        />
      </div>
      {items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((x) => (
            <Card key={x.id} className="border border-slate-100 shadow-sm">
              <CardBody className="p-5">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#eeedff] text-[#5b55e7]">
                    {x.type === "bank" ? (
                      <Landmark size={20} />
                    ) : (
                      <HandCoins size={20} />
                    )}
                  </span>
                  <Dropdown>
                    <DropdownTrigger>
                      <Button
                        isIconOnly
                        variant="light"
                        aria-label="保管先メニューを開く"
                      >
                        <MoreHorizontal size={18} />
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu>
                      <DropdownItem key="edit" onPress={() => edit(x)}>
                        編集
                      </DropdownItem>
                      <DropdownItem
                        key="delete"
                        color="danger"
                        onPress={() => remove(x.id)}
                      >
                        無効にする
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
                <p className="mt-5 text-sm text-slate-500">
                  {labels[x.type] ?? x.type}
                </p>
                <h3 className="mt-1 font-semibold">{x.name}</h3>
                <p className="money mt-4 text-2xl font-semibold">
                  {yen(x.currentBalance)}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <Empty
          icon={Landmark}
          title="保管先がありません"
          text="お金の置き場所を登録してください"
          action={
            <Button color="primary" onPress={add}>
              保管先を追加
            </Button>
          }
        />
      )}
    </>
  );
}

function CardsPage({
  add,
  edit,
  refresh,
}: {
  add: () => void;
  edit: (item: Item) => void;
  refresh: number;
}) {
  const { items, setItems } = useItems("/credit-cards", refresh, []);
  const [accounts, setAccounts] = useState<Item[]>([]);
  useEffect(() => {
    api<Item[]>("/accounts")
      .then(setAccounts)
      .catch(() => {});
  }, [refresh]);
  async function remove(id: string) {
    if (!confirm("このカードを無効にしますか？")) return;
    await api(`/credit-cards/${id}`, { method: "DELETE" });
    setItems(items.filter((x) => x.id !== id));
  }
  return (
    <>
      <PageHead
        eyebrow="Credit cards"
        title="カード管理"
        description="クレジットカードと引き落とし情報を管理します。"
      >
        <Button
          className="bg-slate-900 text-white"
          startContent={<Plus size={17} />}
          onPress={add}
        >
          カードを追加
        </Button>
      </PageHead>
      {items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((x) => (
            <Card key={x.id} className="border border-slate-200 shadow-sm">
              <CardBody className="p-5">
                <div className="flex items-center justify-between text-slate-500">
                  <CreditCard size={18} />
                  <Dropdown>
                    <DropdownTrigger>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        aria-label={`${x.name}の操作`}
                      >
                        <MoreHorizontal size={18} />
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu>
                      <DropdownItem key="edit" onPress={() => edit(x)}>
                        編集
                      </DropdownItem>
                      <DropdownItem
                        key="delete"
                        color="danger"
                        onPress={() => remove(x.id)}
                      >
                        無効にする
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
                <p className="mt-5 text-lg font-semibold">{x.name}</p>
                <div className="mt-5 space-y-2 text-sm text-slate-500">
                  <p>締め日: 毎月 {x.closingDay}日</p>
                  <p>引き落とし日: 毎月 {x.paymentDay}日</p>
                  <p>
                    引き落とし口座:{" "}
                    {accounts.find((a) => a.id === x.withdrawalAccountId)
                      ?.name ?? "—"}
                  </p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <Empty
          icon={CreditCard}
          title="カードがありません"
          text="利用中のクレジットカードを登録してください"
          action={
            <Button color="primary" onPress={add}>
              カードを追加
            </Button>
          }
        />
      )}
    </>
  );
}

function StatementsPage({
  add,
  refresh,
  changed,
}: {
  add: () => void;
  refresh: number;
  changed: () => void;
}) {
  const { items } = useItems("/credit-card-statements", refresh, []);
  const [cards, setCards] = useState<Item[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [adjustment, setAdjustment] = useState<Item | null>(null);
  useEffect(() => {
    api<Item[]>("/credit-cards")
      .then(setCards)
      .catch(() => {});
  }, [refresh]);
  async function markPaid(statement: Item) {
    setBusy(statement.id);
    setError("");
    try {
      await api(`/credit-card-statements/${statement.id}/mark-paid`, {
        method: "POST",
        body: "{}",
      });
      changed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "処理に失敗しました");
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <PageHead
        eyebrow="Reconciliation"
        title="カード請求・照合"
        description="請求額と記録済み支出を突き合わせ、二重計上を防ぎます。"
      >
        <Button
          className="bg-[#5b55e7] text-white"
          startContent={<Plus size={17} />}
          onPress={add}
        >
          請求を登録
        </Button>
      </PageHead>
      {error && (
        <div className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      {items.length ? (
        <div className="space-y-4">
          {items.map((x) => (
            <Card key={x.id} className="border border-slate-100 shadow-sm">
              <CardBody className="grid gap-5 p-5 lg:grid-cols-[1fr_repeat(3,.7fr)_auto] lg:items-center">
                <div>
                  <p className="font-semibold">
                    {cards.find((c) => c.id === x.creditCardId)?.name ??
                      "クレジットカード"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {x.statementStartDate} — {x.statementEndDate}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    支払日 {x.paymentDate}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">請求額</p>
                  <p className="money mt-1 font-semibold">
                    {yen(x.billedAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">記録済み</p>
                  <p className="money mt-1 font-semibold">
                    {yen(x.recordedAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">差額</p>
                  <p
                    className={`money mt-1 font-semibold ${x.differenceAmount ? "text-rose-600" : "text-emerald-600"}`}
                  >
                    {yen(x.differenceAmount)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip
                    color={
                      x.status === "paid"
                        ? "success"
                        : x.status === "ignored"
                          ? "default"
                          : x.differenceAmount
                            ? "warning"
                            : "primary"
                    }
                    variant="flat"
                  >
                    {x.status === "paid"
                      ? "支払済"
                      : x.status === "ignored"
                        ? "確認済み"
                        : x.differenceAmount
                          ? "要確認"
                          : "照合済"}
                  </Chip>
                  {x.status === "unmatched" && x.differenceAmount !== 0 && (
                    <Button
                      size="sm"
                      variant="bordered"
                      onPress={() => setAdjustment(x)}
                    >
                      差額を調整
                    </Button>
                  )}
                  {x.status !== "paid" &&
                    (!x.differenceAmount ||
                      ["matched", "adjusted", "ignored"].includes(
                        x.status,
                      )) && (
                      <Button
                        size="sm"
                        color="primary"
                        isLoading={busy === x.id}
                        onPress={() => markPaid(x)}
                      >
                        支払済みにする
                      </Button>
                    )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <Empty
          icon={WalletCards}
          title="照合する請求がありません"
          text="カード会社の請求が確定したら登録してください"
          action={
            <Button color="primary" onPress={add}>
              請求を登録
            </Button>
          }
        />
      )}
      <StatementAdjustmentModal
        statement={adjustment}
        close={() => setAdjustment(null)}
        done={() => {
          setAdjustment(null);
          changed();
        }}
      />
    </>
  );
}

function StatementAdjustmentModal({
  statement,
  close,
  done,
}: {
  statement: Item | null;
  close: () => void;
  done: () => void;
}) {
  const [type, setType] = useState("unknown_expense");
  const [categories, setCategories] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (statement) {
      setType(
        statement.differenceAmount < 0
          ? "edit_existing_expense"
          : "unknown_expense",
      );
      setError("");
      api<Item[]>("/expense-categories")
        .then(setCategories)
        .catch(() => {});
    }
  }, [statement]);
  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (type === "edit_existing_expense") {
      window.location.href = "/expenses";
      return;
    }
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      await api(`/credit-card-statements/${statement?.id}/adjust`, {
        method: "POST",
        body: JSON.stringify({
          adjustmentType: type,
          amount: Math.abs(statement?.differenceAmount ?? 0),
          ...(type !== "ignore" && { categoryId: data.categoryId }),
          memo: data.memo || undefined,
        }),
      });
      done();
    } catch (e) {
      setError(e instanceof Error ? e.message : "差額を調整できませんでした");
    } finally {
      setBusy(false);
    }
  }
  const options = [
    ...((statement?.differenceAmount ?? 0) > 0
      ? [
          ["unknown_expense", "不明な支出として追加"],
          ["fee", "手数料・年会費として追加"],
        ]
      : []),
    ["edit_existing_expense", "既存の支出記録を修正"],
    ["ignore", "差額を確認済みとして無視"],
  ];
  return (
    <Modal isOpen={!!statement} onClose={close} placement="center">
      <ModalContent>
        <form onSubmit={submit}>
          <ModalHeader>請求差額を調整</ModalHeader>
          <ModalBody className="gap-4">
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <span className="text-slate-500">差額</span>
              <b className="money ml-3">{yen(statement?.differenceAmount)}</b>
            </div>
            <FormField label="調整方法">
              <Select
                aria-label="調整方法"
                name="adjustmentType"
                selectedKeys={[type]}
                onChange={(e) => setType(e.target.value)}
              >
                {options.map(([key, label]) => (
                  <SelectItem key={key}>{label}</SelectItem>
                ))}
              </Select>
            </FormField>
            {["unknown_expense", "fee"].includes(type) && (
              <FormField label="カテゴリ">
                <Select
                  isRequired
                  aria-label="調整支出のカテゴリ"
                  name="categoryId"
                >
                  {categories.map((x) => (
                    <SelectItem key={x.id}>{x.name}</SelectItem>
                  ))}
                </Select>
              </FormField>
            )}
            <FormField label="メモ">
              <Textarea aria-label="調整メモ" name="memo" placeholder="任意" />
            </FormField>
            {type === "edit_existing_expense" && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                支出一覧へ移動し、対象のカード支出を編集します。
              </p>
            )}
            {error && (
              <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={close}>
              キャンセル
            </Button>
            <Button type="submit" color="primary" isLoading={busy}>
              {type === "edit_existing_expense" ? "支出一覧へ" : "調整を実行"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

const notificationTypes = [
  ["salary_input_reminder", "給料日の入力通知"],
  ["fixed_expense_reminder", "固定費の支払い予定通知"],
  ["overspending_alert", "使用ペース超過通知"],
  ["cycle_end_reminder", "周期終了前の残額通知"],
  ["missing_input_reminder", "入力忘れ通知"],
] as const;
function applyAppearance(s: Item) {
  const root = document.documentElement;
  const theme = s.theme ?? "system";
  const accent = s.themeColor ?? "blue";
  const dark =
    theme === "dark" ||
    (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.theme = dark ? "dark" : "light";
  root.dataset.accent = accent;
  root.style.colorScheme = dark ? "dark" : "light";
  localStorage.setItem("pp_theme", theme);
  localStorage.setItem("pp_accent", accent);
}
function PreferencesPage() {
  const [settingsData, setSettingsData] = useState<Item>({
    theme: "system",
    themeColor: "blue",
    currency: "JPY",
    notificationEnabled: true,
    defaultPaymentMethod: "cash",
  });
  const [notifications, setNotifications] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Item[]>([]);
  const [accounts, setAccounts] = useState<Item[]>([]);
  const [cards, setCards] = useState<Item[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      api<Item>("/user-settings"),
      api<Item[]>("/notification-settings"),
      api<Item[]>("/expense-categories"),
      api<Item[]>("/accounts"),
      api<Item[]>("/credit-cards"),
    ])
      .then(([s, n, g, a, c]) => {
        setSettingsData(s);
        setNotifications(n);
        setCategories(g);
        setAccounts(a);
        setCards(c);
        applyAppearance(s);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "設定を取得できませんでした"),
      );
  }, []);
  async function update(key: string, value: any) {
    const previous = settingsData;
    const next = { ...previous, [key]: value };
    setSettingsData(next);
    applyAppearance(next);
    dispatchEvent(new CustomEvent("appearance-change", { detail: next }));
    setError("");
    try {
      await api("/user-settings", {
        method: "PATCH",
        body: JSON.stringify({ [key]: value || null }),
      });
    } catch (e) {
      setSettingsData(previous);
      applyAppearance(previous);
      dispatchEvent(new CustomEvent("appearance-change", { detail: previous }));
      setError(e instanceof Error ? e.message : "設定を保存できませんでした");
    }
  }
  async function updateNotification(type: string, enabled: boolean) {
    const old = notifications;
    const next = [
      ...old.filter((x) => x.type !== type),
      { ...(old.find((x) => x.type === type) ?? {}), type, enabled },
    ];
    setNotifications(next);
    try {
      await api(`/notification-settings/${type}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled, timing: null }),
      });
    } catch (e) {
      setNotifications(old);
      setError(
        e instanceof Error ? e.message : "通知設定を保存できませんでした",
      );
    }
  }
  const payment = settingsData.defaultPaymentMethod ?? "cash";
  return (
    <>
      <PageHead
        eyebrow="Preferences"
        title="表示・通知設定"
        description="入力の初期値、見た目、通知を設定します。"
      />
      {error && (
        <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border border-slate-100 shadow-sm">
          <CardBody className="space-y-5 p-6">
            <div>
              <h2 className="font-semibold">支出入力の初期値</h2>
              <p className="mt-1 text-xs text-slate-500">
                支出追加時に最初から選ばれます。必要な時だけ変更できます。
              </p>
            </div>
            <FormField label="いつものカテゴリ">
              <Select
                aria-label="いつものカテゴリ"
                selectedKeys={[settingsData.defaultCategoryId ?? ""]}
                onChange={(e) => update("defaultCategoryId", e.target.value)}
                placeholder="カテゴリを選択"
              >
                {categories.map((x) => (
                  <SelectItem key={x.id}>{x.name}</SelectItem>
                ))}
              </Select>
            </FormField>
            <FormField label="メインの支払い方法">
              <Select
                aria-label="メインの支払い方法"
                selectedKeys={[payment]}
                onChange={(e) => update("defaultPaymentMethod", e.target.value)}
              >
                <SelectItem key="cash">現金</SelectItem>
                <SelectItem key="bank_transfer">銀行振込・口座振替</SelectItem>
                <SelectItem key="debit">デビットカード</SelectItem>
                <SelectItem key="credit_card">クレジットカード</SelectItem>
                <SelectItem key="electronic_money">電子マネー</SelectItem>
                <SelectItem key="other">その他</SelectItem>
              </Select>
            </FormField>
            {payment === "credit_card" ? (
              <FormField label="いつものカード">
                <Select
                  aria-label="いつものカード"
                  selectedKeys={[settingsData.defaultCreditCardId ?? ""]}
                  onChange={(e) =>
                    update("defaultCreditCardId", e.target.value)
                  }
                  placeholder="カードを選択"
                >
                  {cards.map((x) => (
                    <SelectItem key={x.id}>{x.name}</SelectItem>
                  ))}
                </Select>
              </FormField>
            ) : (
              <FormField label="いつもの支払い元">
                <Select
                  aria-label="いつもの支払い元"
                  selectedKeys={[settingsData.defaultAccountId ?? ""]}
                  onChange={(e) => update("defaultAccountId", e.target.value)}
                  placeholder="保管先を選択"
                >
                  {accounts.map((x) => (
                    <SelectItem key={x.id}>{x.name}</SelectItem>
                  ))}
                </Select>
              </FormField>
            )}
          </CardBody>
        </Card>
        <Card className="border border-slate-100 shadow-sm">
          <CardBody className="space-y-6 p-6">
            <h2 className="font-semibold">表示設定</h2>
            <FormField label="テーマ">
              <Select
                aria-label="表示テーマ"
                selectedKeys={[settingsData.theme]}
                onChange={(e) => update("theme", e.target.value)}
              >
                <SelectItem key="light">ライト</SelectItem>
                <SelectItem key="dark">ダーク</SelectItem>
                <SelectItem key="system">システム設定に合わせる</SelectItem>
              </Select>
            </FormField>
            <FormField label="テーマカラー">
              <Select
                aria-label="テーマカラー"
                selectedKeys={[settingsData.themeColor]}
                onChange={(e) => update("themeColor", e.target.value)}
              >
                <SelectItem key="blue">ブルー</SelectItem>
                <SelectItem key="green">グリーン</SelectItem>
                <SelectItem key="rose">ローズ</SelectItem>
                <SelectItem key="orange">オレンジ</SelectItem>
              </Select>
            </FormField>
            <FormField label="通貨">
              <Select
                aria-label="通貨"
                selectedKeys={[settingsData.currency]}
                onChange={(e) => update("currency", e.target.value)}
              >
                <SelectItem key="JPY">日本円（JPY）</SelectItem>
              </Select>
            </FormField>
          </CardBody>
        </Card>
        <Card className="border border-slate-100 shadow-sm lg:col-span-2">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">通知設定</h2>
                <p className="mt-1 text-xs text-slate-500">
                  必要な通知だけを有効にできます。
                </p>
              </div>
              <Switch
                aria-label="すべての通知"
                isSelected={settingsData.notificationEnabled}
                onValueChange={(v) => update("notificationEnabled", v)}
              />
            </div>
            <div className="mt-5 grid gap-x-8 sm:grid-cols-2">
              {notificationTypes.map(([type, label]) => (
                <div
                  key={type}
                  className="flex items-center justify-between border-t border-slate-100 py-4"
                >
                  <span className="text-sm">{label}</span>
                  <Switch
                    aria-label={label}
                    isDisabled={!settingsData.notificationEnabled}
                    isSelected={
                      notifications.find((x) => x.type === type)?.enabled ??
                      true
                    }
                    onValueChange={(v) => updateNotification(type, v)}
                  />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function CategoriesPage({
  add,
  edit,
  refresh,
}: {
  add: () => void;
  edit: (item: Item) => void;
  refresh: number;
}) {
  const { items, setItems } = useItems("/expense-categories", refresh, []);
  async function remove(id: string) {
    if (!confirm("カテゴリを削除しますか？")) return;
    await api(`/expense-categories/${id}`, { method: "DELETE" });
    setItems(items.filter((x) => x.id !== id));
  }
  return (
    <>
      <PageHead
        eyebrow="Categories"
        title="カテゴリ設定"
        description="支出を自分に合った分類で整理します。"
      >
        <Button
          className="bg-[#5b55e7] text-white"
          startContent={<Plus size={17} />}
          onPress={add}
        >
          カテゴリを追加
        </Button>
      </PageHead>
      <Card className="max-w-3xl border border-slate-100 shadow-sm">
        <CardBody className="p-2">
          {items.length ? (
            items.map((x, i) => (
              <div
                key={x.id}
                className={`flex items-center gap-3 px-4 py-3 ${i < items.length - 1 ? "border-b border-slate-100" : ""}`}
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eeedff] text-[#5b55e7]">
                  <Tags size={16} />
                </span>
                <span className="flex-1 text-sm font-medium">{x.name}</span>
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  aria-label={`カテゴリ ${x.name} を編集`}
                  onPress={() => edit(x)}
                >
                  <Pencil size={15} />
                </Button>
                <Button
                  isIconOnly
                  variant="light"
                  color="danger"
                  size="sm"
                  aria-label={`カテゴリ ${x.name} を削除`}
                  onPress={() => remove(x.id)}
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            ))
          ) : (
            <Empty
              icon={Tags}
              title="カテゴリがありません"
              text="支出を整理するカテゴリを追加しましょう"
              action={
                <Button color="primary" onPress={add}>
                  カテゴリを追加
                </Button>
              }
            />
          )}
        </CardBody>
      </Card>
    </>
  );
}

function BudgetPage({ add, refresh }: { add: () => void; refresh: number }) {
  const { items, setItems } = useItems("/budget-cycles", refresh, []);
  const [settingsData, setSettingsData] = useState<Item>({
    defaultCycleType: "calendar_based",
    defaultBudgetGranularity: "daily",
    notificationEnabled: true,
  });
  const [error, setError] = useState("");
  useEffect(() => {
    api<Item>("/user-settings")
      .then(setSettingsData)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "設定を取得できませんでした"),
      );
  }, [refresh]);
  async function update(key: string, value: any) {
    const previous = settingsData;
    setSettingsData({ ...previous, [key]: value });
    setError("");
    try {
      await api("/user-settings", {
        method: "PATCH",
        body: JSON.stringify({ [key]: value }),
      });
    } catch (e) {
      setSettingsData(previous);
      setError(e instanceof Error ? e.message : "設定を保存できませんでした");
    }
  }
  return (
    <>
      <PageHead
        eyebrow="Budget preferences"
        title="予算周期設定"
        description="予算をリセットする期間と、表示する単位を設定します。"
      >
        <Button
          className="bg-[#5b55e7] text-white"
          startContent={<Plus size={17} />}
          onPress={add}
        >
          周期を追加
        </Button>
      </PageHead>
      {error && (
        <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
        <Card className="border border-slate-100 shadow-sm">
          <CardBody className="p-6">
            <h2 className="font-semibold">現在の設定</h2>
            <div className="mt-6 space-y-6">
              <FormField label="標準の周期">
                <Select
                  aria-label="標準の周期"
                  selectedKeys={[settingsData.defaultCycleType]}
                  onChange={(e) => update("defaultCycleType", e.target.value)}
                >
                  <SelectItem key="calendar_based">月初から月末</SelectItem>
                  <SelectItem key="salary_based">
                    給与日から次回給与日前日
                  </SelectItem>
                  <SelectItem key="custom">カスタム期間</SelectItem>
                </Select>
              </FormField>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">
                  使える金額の表示単位
                </p>
                <Tabs
                  selectedKey={settingsData.defaultBudgetGranularity}
                  onSelectionChange={(k) =>
                    update("defaultBudgetGranularity", k)
                  }
                  color="primary"
                  variant="bordered"
                >
                  <Tab key="daily" title="1日" />
                  <Tab key="weekly" title="1週間" />
                  <Tab key="biweekly" title="2週間" />
                  <Tab key="monthly" title="1か月" />
                </Tabs>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-medium">通知を受け取る</p>
                  <p className="mt-1 text-xs text-slate-400">
                    予算超過や入力忘れをお知らせします
                  </p>
                </div>
                <Switch
                  aria-label="予算超過や入力忘れの通知を受け取る"
                  isSelected={settingsData.notificationEnabled}
                  onValueChange={(v) => update("notificationEnabled", v)}
                />
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className="border border-slate-100 shadow-sm">
          <CardBody className="p-6">
            <h2 className="font-semibold">登録済みの周期</h2>
            <div className="mt-5 space-y-3">
              {items.length ? (
                items.map((x) => (
                  <div
                    key={x.id}
                    className="rounded-xl border border-slate-100 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{x.name}</p>
                      <Chip
                        size="sm"
                        color={x.isClosed ? "default" : "success"}
                        variant="flat"
                      >
                        {x.isClosed ? "終了" : "進行中"}
                      </Chip>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {x.startDate} — {x.endDate}
                    </p>
                    {!x.isClosed && (
                      <CycleCloseButton
                        cycle={x}
                        done={() =>
                          setItems(
                            items.map((item) =>
                              item.id === x.id
                                ? { ...item, isClosed: true }
                                : item,
                            ),
                          )
                        }
                      />
                    )}
                  </div>
                ))
              ) : (
                <p className="py-10 text-center text-sm text-slate-400">
                  周期はまだありません
                </p>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function CycleCloseButton({ cycle, done }: { cycle: Item; done: () => void }) {
  const [open, setOpen] = useState(false);
  const [policy, setPolicy] = useState("keep_as_remaining");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function close() {
    setBusy(true);
    setError("");
    try {
      await api(`/budget-cycles/${cycle.id}/close`, {
        method: "POST",
        body: JSON.stringify({ carryoverPolicy: policy }),
      });
      setOpen(false);
      done();
    } catch (e) {
      setError(e instanceof Error ? e.message : "周期を締められませんでした");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        size="sm"
        variant="bordered"
        className="mt-3"
        onPress={() => setOpen(true)}
      >
        周期を締める
      </Button>
      <Modal isOpen={open} onClose={() => setOpen(false)}>
        <ModalContent>
          <ModalHeader>{cycle.name}を締める</ModalHeader>
          <ModalBody>
            <FormField label="残額の扱い">
              <Select
                aria-label="周期終了時の残額の扱い"
                selectedKeys={[policy]}
                onChange={(e) => setPolicy(e.target.value)}
              >
                <SelectItem key="add_to_next_cycle">次の周期へ追加</SelectItem>
                <SelectItem key="move_to_savings">貯金に回す</SelectItem>
                <SelectItem key="keep_as_remaining">残額として保持</SelectItem>
              </Select>
            </FormField>
            {policy === "add_to_next_cycle" && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                先に次の予算周期を作成してください。
              </p>
            )}
            {error && (
              <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button color="primary" isLoading={busy} onPress={close}>
              周期を締める
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

function EntryModal({
  type,
  item,
  cycle,
  close,
  done,
}: {
  type:
    | "expense"
    | "income"
    | "account"
    | "card"
    | "category"
    | "cycle"
    | "statement"
    | null;
  item: Item | null;
  cycle: Item;
  close: () => void;
  done: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accounts, setAccounts] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Item[]>([]);
  const [cards, setCards] = useState<Item[]>([]);
  const [cycles, setCycles] = useState<Item[]>([]);
  const [payment, setPayment] = useState("cash");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedCard, setSelectedCard] = useState("");
  useEffect(() => {
    setError("");
    if (type === "expense") {
      Promise.all([
        api<Item[]>("/accounts"),
        api<Item[]>("/expense-categories"),
        api<Item[]>("/credit-cards"),
        api<Item>("/user-settings"),
      ])
        .then(([a, g, c, s]) => {
          setAccounts(a);
          setCategories(g);
          setCards(c);
          setPayment(item?.paymentMethod ?? s.defaultPaymentMethod ?? "cash");
          setSelectedCategory(
            item?.categoryId ??
              g.find((x) => x.id === s.defaultCategoryId)?.id ??
              g[0]?.id ??
              "",
          );
          setSelectedAccount(
            item?.accountId ??
              a.find((x) => x.id === s.defaultAccountId)?.id ??
              a[0]?.id ??
              "",
          );
          setSelectedCard(
            item?.creditCardId ??
              c.find((x) => x.id === s.defaultCreditCardId)?.id ??
              c[0]?.id ??
              "",
          );
        })
        .catch(() => {});
    } else if (type === "income" || type === "card")
      api<Item[]>("/accounts")
        .then(setAccounts)
        .catch(() => {});
    if (type === "statement")
      Promise.all([api<Item[]>("/credit-cards"), api<Item[]>("/budget-cycles")])
        .then(([a, b]) => {
          setCards(a);
          setCycles(b);
        })
        .catch(() => {});
  }, [type, item]);
  const today = new Date().toISOString().slice(0, 10);
  const editing = !!item;
  const title = editing
    ? `${{ expense: "支出", income: "収入", account: "保管先", card: "カード", category: "カテゴリ", cycle: "予算周期", statement: "請求" }[type ?? "expense"]}を編集`
    : {
        expense: "支出を追加",
        income: "収入を追加",
        account: "保管先を追加",
        card: "カードを追加",
        category: "カテゴリを追加",
        cycle: "予算周期を追加",
        statement: "カード請求を登録",
      }[type ?? "expense"];
  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    let path = "";
    let payload: Item = {};
    if (type === "expense") {
      path = `/expenses${editing ? `/${item.id}` : ""}`;
      payload = {
        cycleId: item?.cycleId ?? cycle.id,
        name: data.name,
        amount: Number(data.amount),
        expenseDate: data.date,
        categoryId: data.categoryId,
        paymentMethod: data.paymentMethod,
        accountId: data.paymentMethod === "credit_card" ? null : data.accountId,
        creditCardId:
          data.paymentMethod === "credit_card" ? data.creditCardId : null,
        memo: data.memo || null,
      };
    } else if (type === "income") {
      path = `/incomes${editing ? `/${item.id}` : ""}`;
      payload = {
        cycleId: item?.cycleId ?? cycle.id,
        accountId: data.accountId,
        name: data.name,
        amount: Number(data.amount),
        incomeDate: data.date,
        type: data.incomeType,
      };
    } else if (type === "account") {
      path = `/accounts${editing ? `/${item.id}` : ""}`;
      payload = {
        name: data.name,
        type: data.accountType,
        ...(!editing && { initialBalance: Number(data.initialBalance) }),
      };
    } else if (type === "card") {
      path = `/credit-cards${editing ? `/${item.id}` : ""}`;
      payload = {
        name: data.name,
        closingDay: Number(data.closingDay),
        paymentDay: Number(data.paymentDay),
        withdrawalAccountId: data.accountId,
      };
    } else if (type === "category") {
      path = `/expense-categories${editing ? `/${item.id}` : ""}`;
      payload = { name: data.name };
    } else if (type === "statement") {
      path = "/credit-card-statements";
      payload = {
        creditCardId: data.creditCardId,
        cycleId: data.cycleId,
        statementStartDate: data.statementStartDate,
        statementEndDate: data.statementEndDate,
        paymentDate: data.paymentDate,
        billedAmount: Number(data.billedAmount),
      };
    } else {
      path = "/budget-cycles";
      payload = {
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        resetType: data.resetType,
      };
    }
    try {
      await api(path, {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      if (type === "expense" && selectedCategory)
        void api("/user-settings", {
          method: "PATCH",
          body: JSON.stringify({ defaultCategoryId: selectedCategory }),
        }).catch(() => {});
      done();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存できませんでした");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      isOpen={!!type}
      onClose={close}
      placement="center"
      scrollBehavior="inside"
      classNames={{
        backdrop: "bg-black/35",
        base: "bg-white border border-slate-200 shadow-xl",
        header: "border-b border-slate-200",
        footer: "border-t border-slate-200",
      }}
    >
      <ModalContent>
        <form key={`${type}-${item?.id ?? "new"}`} onSubmit={submit}>
          <ModalHeader>{title}</ModalHeader>
          <ModalBody className="gap-5">
            {(type === "expense" || type === "income") && (
              <div className="space-y-4">
                <FormField label="金額">
                  <Input
                    isRequired
                    aria-label="金額"
                    name="amount"
                    type="number"
                    min="1"
                    defaultValue={item?.amount}
                    startContent={
                      <span className="text-sm text-slate-400">¥</span>
                    }
                    placeholder="0"
                  />
                </FormField>
                <FormField label={type === "expense" ? "支出名" : "収入名"}>
                  <Input
                    isRequired
                    aria-label={type === "expense" ? "支出名" : "収入名"}
                    name="name"
                    defaultValue={item?.name}
                    placeholder={
                      type === "expense"
                        ? "例：スーパーマーケット"
                        : "例：6月分給与"
                    }
                  />
                </FormField>
                <FormField label="日付">
                  <Input
                    isRequired
                    aria-label="日付"
                    name="date"
                    type="date"
                    defaultValue={
                      item?.expenseDate ?? item?.incomeDate ?? today
                    }
                  />
                </FormField>
              </div>
            )}
            {type === "expense" && (
              <div className="space-y-4">
                <FormField label="カテゴリ">
                  <Select
                    isRequired
                    aria-label="カテゴリ"
                    name="categoryId"
                    selectedKeys={[selectedCategory]}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    placeholder="選択してください"
                  >
                    {categories.map((x: Item) => (
                      <SelectItem key={x.id}>{x.name}</SelectItem>
                    ))}
                  </Select>
                </FormField>
                <FormField label="支払い方法">
                  <Select
                    isRequired
                    aria-label="支払い方法"
                    name="paymentMethod"
                    selectedKeys={[payment]}
                    onChange={(e) => setPayment(e.target.value)}
                  >
                    <SelectItem key="cash">現金</SelectItem>
                    <SelectItem key="bank_transfer">
                      銀行振込・口座振替
                    </SelectItem>
                    <SelectItem key="debit">デビットカード</SelectItem>
                    <SelectItem key="credit_card">クレジットカード</SelectItem>
                    <SelectItem key="electronic_money">電子マネー</SelectItem>
                    <SelectItem key="other">その他</SelectItem>
                  </Select>
                </FormField>
                {payment === "credit_card" ? (
                  <FormField label="カード">
                    <Select
                      isRequired
                      aria-label="カード"
                      name="creditCardId"
                      selectedKeys={[selectedCard]}
                      onChange={(e) => setSelectedCard(e.target.value)}
                    >
                      {cards.map((x: Item) => (
                        <SelectItem key={x.id}>{x.name}</SelectItem>
                      ))}
                    </Select>
                  </FormField>
                ) : (
                  <FormField label="支払い元">
                    <Select
                      isRequired
                      aria-label="支払い元"
                      name="accountId"
                      selectedKeys={[selectedAccount]}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                    >
                      {accounts.map((x: Item) => (
                        <SelectItem key={x.id}>{x.name}</SelectItem>
                      ))}
                    </Select>
                  </FormField>
                )}
                <FormField label="メモ">
                  <Textarea
                    aria-label="メモ"
                    name="memo"
                    defaultValue={item?.memo ?? ""}
                    placeholder="任意"
                  />
                </FormField>
              </div>
            )}
            {type === "income" && (
              <div className="space-y-4">
                <FormField label="収入の種類">
                  <Select
                    isRequired
                    aria-label="収入の種類"
                    name="incomeType"
                    defaultSelectedKeys={[item?.type ?? "salary"]}
                  >
                    <SelectItem key="salary">給与</SelectItem>
                    <SelectItem key="temporary">臨時収入</SelectItem>
                    <SelectItem key="side_job">副業</SelectItem>
                    <SelectItem key="refund">返金</SelectItem>
                    <SelectItem key="allowance">お小遣い</SelectItem>
                    <SelectItem key="other">その他</SelectItem>
                  </Select>
                </FormField>
                <FormField label="入金先">
                  <Select
                    isRequired
                    aria-label="入金先"
                    name="accountId"
                    defaultSelectedKeys={
                      item?.accountId ? [item.accountId] : []
                    }
                  >
                    {accounts.map((x: Item) => (
                      <SelectItem key={x.id}>{x.name}</SelectItem>
                    ))}
                  </Select>
                </FormField>
              </div>
            )}
            {type === "account" && (
              <div className="space-y-4">
                <FormField label="保管先名">
                  <Input
                    isRequired
                    aria-label="保管先名"
                    name="name"
                    defaultValue={item?.name}
                  />
                </FormField>
                <FormField label="種類">
                  <Select
                    isRequired
                    aria-label="種類"
                    name="accountType"
                    defaultSelectedKeys={[item?.type ?? "bank"]}
                  >
                    <SelectItem key="bank">銀行口座</SelectItem>
                    <SelectItem key="wallet">財布</SelectItem>
                    <SelectItem key="cash_box">現金・タンス預金</SelectItem>
                    <SelectItem key="electronic_money">電子マネー</SelectItem>
                    <SelectItem key="other">その他</SelectItem>
                  </Select>
                </FormField>
                {!editing && (
                  <FormField label="初期残高">
                    <Input
                      isRequired
                      aria-label="初期残高"
                      name="initialBalance"
                      type="number"
                      min="0"
                      defaultValue="0"
                      startContent="¥"
                    />
                  </FormField>
                )}
                <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                  この保管先の残高は、収入・支出の入力に応じて自動で更新されます。
                </p>
              </div>
            )}
            {type === "card" && (
              <div className="space-y-4">
                <FormField label="カード名">
                  <Input
                    isRequired
                    aria-label="カード名"
                    name="name"
                    defaultValue={item?.name}
                  />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="締め日">
                    <Input
                      isRequired
                      aria-label="締め日"
                      name="closingDay"
                      type="number"
                      min="1"
                      max="31"
                      defaultValue={item?.closingDay}
                    />
                  </FormField>
                  <FormField label="引き落とし日">
                    <Input
                      isRequired
                      aria-label="引き落とし日"
                      name="paymentDay"
                      type="number"
                      min="1"
                      max="31"
                      defaultValue={item?.paymentDay}
                    />
                  </FormField>
                </div>
                <FormField label="引き落とし口座">
                  <Select
                    isRequired
                    aria-label="引き落とし口座"
                    name="accountId"
                    defaultSelectedKeys={
                      item?.withdrawalAccountId
                        ? [item.withdrawalAccountId]
                        : []
                    }
                  >
                    {accounts.map((x: Item) => (
                      <SelectItem key={x.id}>{x.name}</SelectItem>
                    ))}
                  </Select>
                </FormField>
              </div>
            )}
            {type === "category" && (
              <FormField label="カテゴリ名">
                <Input
                  isRequired
                  aria-label="カテゴリ名"
                  name="name"
                  defaultValue={item?.name}
                  placeholder="例：食費"
                />
              </FormField>
            )}
            {type === "statement" && (
              <div className="space-y-4">
                <FormField label="カード">
                  <Select isRequired aria-label="カード" name="creditCardId">
                    {cards.map((x) => (
                      <SelectItem key={x.id}>{x.name}</SelectItem>
                    ))}
                  </Select>
                </FormField>
                <FormField label="予算周期">
                  <Select
                    isRequired
                    aria-label="予算周期"
                    name="cycleId"
                    defaultSelectedKeys={cycle.id ? [cycle.id] : []}
                  >
                    {cycles.map((x) => (
                      <SelectItem key={x.id}>{x.name}</SelectItem>
                    ))}
                  </Select>
                </FormField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="請求対象開始日">
                    <Input
                      isRequired
                      aria-label="請求対象開始日"
                      name="statementStartDate"
                      type="date"
                      defaultValue={today}
                    />
                  </FormField>
                  <FormField label="請求対象終了日">
                    <Input
                      isRequired
                      aria-label="請求対象終了日"
                      name="statementEndDate"
                      type="date"
                      defaultValue={today}
                    />
                  </FormField>
                </div>
                <FormField label="支払日">
                  <Input
                    isRequired
                    aria-label="支払日"
                    name="paymentDate"
                    type="date"
                    defaultValue={today}
                  />
                </FormField>
                <FormField label="請求額">
                  <Input
                    isRequired
                    aria-label="請求額"
                    name="billedAmount"
                    type="number"
                    min="1"
                    startContent="¥"
                  />
                </FormField>
              </div>
            )}
            {type === "cycle" && (
              <div className="space-y-4">
                <FormField label="周期名">
                  <Input isRequired aria-label="周期名" name="name" />
                </FormField>
                <FormField label="周期タイプ">
                  <Select
                    isRequired
                    aria-label="周期タイプ"
                    name="resetType"
                    defaultSelectedKeys={["calendar_based"]}
                  >
                    <SelectItem key="calendar_based">月初から月末</SelectItem>
                    <SelectItem key="salary_based">給与日基準</SelectItem>
                    <SelectItem key="custom">カスタム</SelectItem>
                  </Select>
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="開始日">
                    <Input
                      isRequired
                      aria-label="開始日"
                      name="startDate"
                      type="date"
                    />
                  </FormField>
                  <FormField label="終了日">
                    <Input
                      isRequired
                      aria-label="終了日"
                      name="endDate"
                      type="date"
                    />
                  </FormField>
                </div>
              </div>
            )}
            {error && (
              <p className="rounded-xl bg-danger-50 p-3 text-sm text-danger-700">
                {error}
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={close}>
              キャンセル
            </Button>
            <Button
              type="submit"
              className="bg-[#5b55e7] text-white"
              isLoading={busy}
            >
              {editing ? "変更を保存" : "保存する"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
