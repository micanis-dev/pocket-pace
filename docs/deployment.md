# デプロイ手順

Pocket-Pace API は Cloudflare Workers と Cloudflare D1 へデプロイする。
パッケージ管理とコマンド実行には Bun を使用し、Bun 自体は devbox で管理する。

## 環境

| 環境 | Worker | D1 | URL |
| --- | --- | --- | --- |
| local | Wrangler local | `pocket-pace-local` | `http://localhost:8787` |
| preview | `pocket-pace-api-preview` | `pocket-pace-preview` | `https://pocket-pace-api-preview.micanis.dev` |
| production | `pocket-pace-api-production` | `pocket-pace-production` | `https://pocket-pace-api-production.micanis.dev` |

D1 Binding はすべて `DB` とする。アプリケーションは `env.DB` でデータベースへアクセスするため、Wranglerが提案するデータベース名由来のBindingへ変更しないこと。

## 前提条件

```sh
devbox install
devbox run install
```

Cloudflareへログインする。

```sh
cd api
bunx wrangler login
bunx wrangler whoami
```

## ローカル実行

初回のみローカル設定を作成する。

```sh
cd api
cp .dev.vars.example .dev.vars
```

ローカルD1へマイグレーションを適用してWorkerを起動する。

```sh
bun run db:migrate:local
bun run dev
```

動作確認:

```sh
curl http://localhost:8787/health
```

`DEV_AUTH_BYPASS=true` はローカル開発専用である。previewとproductionには設定しない。

## Auth0設定

各リモート環境には以下のSecretsが必要である。

| Secret | 内容 |
| --- | --- |
| `AUTH0_DOMAIN` | Auth0テナントドメイン。`https://`と末尾の`/`は含めない |
| `AUTH0_AUDIENCE` | Auth0 APIのIdentifier。フロントエンドがトークン取得時に指定するaudienceと同じ値 |

登録:

```sh
cd api
bunx wrangler secret put AUTH0_DOMAIN --env preview
bunx wrangler secret put AUTH0_AUDIENCE --env preview
bunx wrangler secret put AUTH0_DOMAIN --env production
bunx wrangler secret put AUTH0_AUDIENCE --env production
```

登録状況の確認ではSecret名だけが表示され、値は表示されない。

```sh
bunx wrangler secret list --env preview
bunx wrangler secret list --env production
```

## 初回デプロイ

D1は環境ごとに作成する。

```sh
cd api
bunx wrangler d1 create pocket-pace-preview
bunx wrangler d1 create pocket-pace-production
```

作成時にWranglerから設定ファイルへの自動追加を確認された場合は `no` を選び、出力された `database_id` を `wrangler.jsonc` の対応する環境へ設定する。

### preview

```sh
cd api
bunx wrangler d1 migrations apply DB --remote --env preview
bunx wrangler deploy --env preview
curl https://pocket-pace-api-preview.micanis.dev/health
```

### production

previewで動作確認後にproductionへ反映する。

```sh
cd api
bunx wrangler d1 migrations apply DB --remote --env production
bunx wrangler deploy --env production
curl https://pocket-pace-api-production.micanis.dev/health
```

正常時のレスポンス:

```json
{"status":"ok"}
```

## 通常のリリース

1. 品質チェックを通す。
2. previewのD1マイグレーションとWorkerを更新する。
3. previewでAPIを検証する。
4. productionのD1マイグレーションとWorkerを更新する。
5. productionのヘルスチェックを行う。

```sh
devbox run check
devbox run test

cd api
bunx wrangler d1 migrations apply DB --remote --env preview
bunx wrangler deploy --env preview
curl --fail-with-body https://pocket-pace-api-preview.micanis.dev/health

bunx wrangler d1 migrations apply DB --remote --env production
bunx wrangler deploy --env production
curl --fail-with-body https://pocket-pace-api-production.micanis.dev/health
```

マイグレーションは必ずWorkerより先に適用する。productionへ進む前にpreviewで同じマイグレーションとWorkerの組み合わせを検証する。

## 状態確認

### デプロイ

```sh
cd api
bunx wrangler deployments status --env preview
bunx wrangler deployments status --env production
bunx wrangler deployments list --env preview
bunx wrangler deployments list --env production
```

### D1マイグレーション

```sh
cd api
bunx wrangler d1 migrations list DB --remote --env preview
bunx wrangler d1 migrations list DB --remote --env production
```

`No migrations to apply` であれば最新状態である。

## ロールバック

Workerに問題がある場合は、対象環境のデプロイ履歴を確認して直前のバージョンへ戻す。

```sh
cd api
bunx wrangler deployments list --env preview
bunx wrangler rollback <VERSION_ID> --env preview

bunx wrangler deployments list --env production
bunx wrangler rollback <VERSION_ID> --env production
```

D1のスキーマ変更はWorkerのロールバックとは別に扱う。適用済みマイグレーションファイルは編集せず、修正が必要な場合は新しいマイグレーションを追加する。破壊的な変更をproductionへ適用する前には、Cloudflare D1のバックアップ・復元方法を確認する。

## 注意事項

- `api/.dev.vars`、Auth0の値、Cloudflareの認証情報をGitへ追加しない。
- productionに `DEV_AUTH_BYPASS` を設定しない。
- `wrangler.jsonc` のBinding名は `DB` のまま維持する。
- previewとproductionで同じD1を共有しない。
- APIをブラウザ上の別Originから呼ぶ場合は、許可するOriginを限定したCORS設定が別途必要になる。
