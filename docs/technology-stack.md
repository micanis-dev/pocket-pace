# Pocket-Pace 技術選定

## ステータス

採用決定。

Pocket-Pace のバックエンドAPIは、Cloudflare Workers上で以下の技術を使用して実装する。

| 分類 | 採用技術 | 用途 |
| --- | --- | --- |
| 言語 | TypeScript | APIとビジネスロジックの実装 |
| 実行環境 | Cloudflare Workers | APIの実行とデプロイ |
| ルーター | itty-router | HTTPメソッドとパスのルーティング |
| データベース | Cloudflare D1 | アプリケーションデータの永続化 |
| ORM | Drizzle ORM | DBスキーマ、型付きクエリ、マイグレーション生成 |
| バリデーション | Zod | リクエストと設定値の検証 |
| 認証 | Auth0 | ユーザー認証とアクセストークンの発行 |
| 開発・デプロイ | Wrangler | ローカル実行、D1操作、デプロイ |

---

## 選定理由

### TypeScript

Cloudflare Workersで正式にサポートされており、Workers APIやD1の型を利用できる。

APIの入出力、環境変数、D1の取得結果を型で管理し、実装時の不整合を減らす。

`strict` を有効にし、暗黙的な `any` は許可しない。

### itty-router

Fetch APIを前提とした小さなルーターであり、Cloudflare Workersのリクエストモデルと相性がよい。

責務は以下に限定する。

- HTTPメソッドとパスの対応付け
- 共通ミドルウェアの適用
- 404レスポンスの処理

バリデーション、認証、ビジネスロジック、DBアクセスはルート定義へ直接書かず、それぞれ別のモジュールへ分離する。

### Cloudflare D1

Cloudflare WorkersからBinding経由で直接利用できるSQLite互換データベースである。

Pocket-Paceのデータはユーザー、口座、周期、収支などの関連を持つため、KVよりリレーショナルデータベースが適している。

### Drizzle ORM

Cloudflare D1用のアダプターを使用し、DBスキーマ、クエリ、マイグレーションをTypeScriptとSQLで管理する。

Drizzleは以下の用途に限定する。

- TypeScriptによるテーブルと制約の定義
- 型付きクエリの構築
- SQLマイグレーションの生成
- DB行に対応するTypeScript型の生成

Drizzleで表現しにくいクエリでは生SQLを使用できるものとする。Repository層を維持し、Use CaseがDrizzleへ直接依存しないようにする。

### Zod

外部入力をTypeScriptの型だけで信用せず、実行時に検証するために使用する。

主な検証対象は以下とする。

- パスパラメータ
- クエリパラメータ
- JSONリクエストボディ
- 環境変数とBinding設定

APIレスポンスは原則としてTypeScriptの型で管理する。外部サービスから受け取る値など、実行時保証が必要な箇所ではレスポンスにもZodを使用する。

---

## アーキテクチャ方針

APIは以下の依存方向で構成する。

```text
routes
  -> use-cases
    -> repositories
      -> Drizzle ORM
        -> Cloudflare D1

routes
  -> schemas (Zod)

middleware
  -> Auth0 / request context
```

各層の責務は以下とする。

### routes

- itty-routerによるルート定義
- リクエストから入力値を取得する
- Zodによる入力検証を呼び出す
- Use Caseを呼び出す
- 結果をHTTPレスポンスへ変換する

### use-cases

- 予算計算などのビジネスルールを実装する
- HTTP、itty-router、D1へ直接依存しない
- 複数Repositoryを組み合わせる

### repositories

- Drizzleを通じたD1へのクエリ実行を担当する
- DBの行データをアプリケーションの型へ変換する
- Drizzle、SQL、D1固有処理をこの層へ閉じ込める

### schemas

- API入力用のZod Schemaを定義する
- Schemaから `z.infer` でTypeScript型を生成する
- 同じ構造の型を手書きで重複定義しない

### middleware

- Auth0アクセストークンの検証
- 認証済みユーザー情報のRequest Contextへの格納
- リクエストIDなどの共通処理

---

## ディレクトリ構成案

```text
api/
├── src/
│   ├── index.ts
│   ├── router.ts
│   ├── env.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── error-handler.ts
│   ├── routes/
│   │   ├── accounts.ts
│   │   ├── budgets.ts
│   │   ├── expenses.ts
│   │   └── users.ts
│   ├── schemas/
│   ├── db/
│   │   ├── client.ts
│   │   └── schema.ts
│   ├── use-cases/
│   ├── repositories/
│   ├── domain/
│   └── shared/
├── migrations/
├── test/
├── drizzle.config.ts
├── package.json
├── tsconfig.json
└── wrangler.jsonc
```

APIを独立してデプロイできるよう、バックエンド関連ファイルは `api/` 配下に置く。

---

## 実装ルール

### Cloudflare Binding

D1や環境変数はBindingとして受け取り、グローバル変数へ保存しない。

```ts
export interface Env {
  DB: D1Database;
  AUTH0_DOMAIN: string;
  AUTH0_AUDIENCE: string;
}
```

Bindingの型はWranglerの設定に合わせて生成し、設定変更時に更新する。

### DBアクセス

DBアクセスにはDrizzleのD1アダプターを使用する。

```ts
const db = drizzle(env.DB);

const account = await db.query.accounts.findFirst({
  where: and(
    eq(accounts.id, accountId),
    eq(accounts.userId, userId),
  ),
});
```

すべてのユーザー所有データは、取得・更新・削除時に認証済みの `user_id` を条件へ含める。

動的な値を文字列連結でSQLへ埋め込まない。生SQLが必要な場合もDrizzleのパラメータ化されたSQL Templateを使用する。

複数SQLを一単位として実行する必要がある場合は、Drizzleが提供するD1 Batch API連携を使用し、途中状態が残らないようにする。

### マイグレーション

- DBスキーマの正本は `src/db/schema.ts` とする
- Drizzle KitでSQLを生成し、`migrations/` で管理する
- 適用済みマイグレーションファイルは変更しない
- ローカルD1で検証してからリモートD1へ適用する
- 本番適用前にバックアップとロールバック方法を確認する

### 命名

- APIのJSONフィールドは `camelCase`
- DBのテーブル名とカラム名は `snake_case`
- DB行からAPIレスポンスへの変換はRepositoryまたはMapperで明示する

### エラー処理

内部例外をそのままクライアントへ返さず、API共通形式へ変換する。

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "amount must be greater than 0"
  }
}
```

最低限、以下のエラーコードを定義する。

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
INTERNAL_ERROR
```

### 日付と金額

- 日付のみの場合は `YYYY-MM-DD`
- 日時はISO 8601形式のUTC
- 金額は日本円の整数値
- 浮動小数点数で金額計算を行わない

---

## テスト方針

テストは次の単位で分ける。

- Domain・Use Caseの単体テスト
- Zod Schemaの境界値テスト
- RepositoryとローカルD1を組み合わせた統合テスト
- WorkerへHTTPリクエストを送るAPIテスト

予算、周期、繰り越し、クレジットカード利用日の計算は中核機能であるため、ルートのテストだけで済ませずUse Case単位で網羅する。

テストランナーはVitestを使用し、Worker固有処理のテストにはCloudflare公式のWorkers向けVitest連携を使用する。

---

## 開発とデプロイ

環境は最低限、以下の3つに分ける。

```text
local
preview
production
```

- ローカル開発はWranglerとローカルD1を使用する
- Pull Requestでは型チェック、Lint、テストを実行する
- `main` ブランチへの反映後にpreviewへデプロイする
- productionへのデプロイとD1マイグレーションは明示的に実行する
- Auth0の秘密情報はリポジトリへ保存せず、CloudflareのSecretとして管理する

---

## 初期依存パッケージ

実装開始時は以下を基本とする。

### dependencies

```text
itty-router
zod
jose
drizzle-orm
```

`jose` はAuth0が発行したJWTの署名とClaimsを検証するために使用する。

### devDependencies

```text
typescript
wrangler
vitest
@cloudflare/vitest-pool-workers
drizzle-kit
eslint
```

依存は必要になった時点で追加し、用途の重複するライブラリを並行して導入しない。

---

## 採用しないもの

### Hono

今回のプロジェクトでは採用しない。ルーティングに必要な機能はitty-routerで満たし、他の責務は個別モジュールとして構成する。

### Neonなどの外部データベース

初期段階では採用しない。Cloudflare D1をデータベースとして使用し、WorkersとのBinding、運用、課金をCloudflare上で完結させる。

### Node.js専用APIへの依存

Cloudflare Workersとの互換性を優先し、ファイルシステムやNode.jsサーバーを前提とした実装は避ける。標準のFetch API、Web Crypto API、Cloudflare Bindingを使用する。
