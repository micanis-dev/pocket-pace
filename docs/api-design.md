# Pocket-Pace API 設計案

## 目的

Pocket-Pace は、設定した周期ごとに使用限度額を決めることで、お金の使いすぎを防ぐアプリである。

API設計では、単なる家計簿CRUDではなく、以下を中心に設計する。

- 今期の使用限度額を計算する
- 今期の残額を表示する
- 今日使える金額を表示する
- クレジットカード払いを利用日基準で反映する
- カード請求額を支出ではなく、過去支出の支払いとして扱う
- 予定支出、固定費、貯金、繰り越しを予算計算に反映する

---

## API 共通方針

### 認証

Auth0 を利用する。

各APIでは、Auth0 のアクセストークンからユーザーを特定する。

リクエストで `userId` は基本的に受け取らない。

### 日付

日付のみを扱う場合は `YYYY-MM-DD` を使う。

日時を扱う場合は ISO 8601 形式を使う。

### 金額

日本円を前提とする場合、小数は使わず整数で扱う。

```json
{
  "amount": 1200
}
```

### エラーレスポンス例

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "amount must be greater than 0"
  }
}
```

---

## 1. ユーザー API

### GET `/me`

ログイン中のユーザー情報を取得する。

#### Response

```json
{
  "id": "user_01",
  "auth0UserId": "auth0|xxxx",
  "email": "user@example.com",
  "displayName": "micanis",
  "createdAt": "2026-06-19T10:00:00Z"
}
```

---

### POST `/me/sync`

Auth0ログイン後、アプリ側DBにユーザーを作成または同期する。

#### Request

```json
{
  "email": "user@example.com",
  "displayName": "micanis"
}
```

#### Response

```json
{
  "id": "user_01",
  "email": "user@example.com",
  "displayName": "micanis"
}
```

---

## 2. ユーザー設定 API

### GET `/user-settings`

ユーザー設定を取得する。

#### Response

```json
{
  "theme": "dark",
  "themeColor": "blue",
  "currency": "JPY",
  "defaultCycleType": "calendar_based",
  "defaultBudgetGranularity": "daily",
  "notificationEnabled": true
}
```

---

### PATCH `/user-settings`

ユーザー設定を更新する。

#### Request

```json
{
  "theme": "light",
  "themeColor": "green",
  "currency": "JPY",
  "defaultCycleType": "salary_based",
  "defaultBudgetGranularity": "weekly",
  "notificationEnabled": true
}
```

---

## 3. 口座 API

### GET `/accounts`

口座一覧を取得する。

#### Query

```text
?type=bank
```

#### Response

```json
[
  {
    "id": "acc_01",
    "name": "メイン口座",
    "type": "bank",
    "initialBalance": 100000,
    "currentBalance": 85000
  }
]
```

---

### POST `/accounts`

口座を作成する。

#### Request

```json
{
  "name": "メイン口座",
  "type": "bank",
  "initialBalance": 100000
}
```

---

### GET `/accounts/{accountId}`

口座詳細を取得する。

---

### PATCH `/accounts/{accountId}`

口座情報を更新する。

#### Request

```json
{
  "name": "生活費口座",
  "type": "bank"
}
```

---

### DELETE `/accounts/{accountId}`

口座を削除、または無効化する。

既存データに紐づいている場合は、物理削除ではなく `is_active = false` にする。

---

## 4. 口座間資金移動 API

### GET `/account-transfers`

資金移動一覧を取得する。

#### Query

```text
?from=2026-06-01&to=2026-06-30
```

---

### POST `/account-transfers`

資金移動を記録する。

#### Request

```json
{
  "fromAccountId": "acc_01",
  "toAccountId": "acc_02",
  "amount": 10000,
  "transferDate": "2026-06-19",
  "memo": "生活費として現金を引き出し"
}
```

#### Response

```json
{
  "id": "transfer_01",
  "fromAccountId": "acc_01",
  "toAccountId": "acc_02",
  "amount": 10000,
  "transferDate": "2026-06-19"
}
```

#### 処理内容

```text
from_account.current_balance -= amount
to_account.current_balance += amount
```

これは支出ではないため、`expenses` には登録しない。

---

## 5. クレジットカード API

### GET `/credit-cards`

カード一覧を取得する。

#### Response

```json
[
  {
    "id": "card_01",
    "name": "楽天カード",
    "closingDay": 31,
    "paymentDay": 27,
    "withdrawalAccountId": "acc_01"
  }
]
```

---

### POST `/credit-cards`

カードを登録する。

#### Request

```json
{
  "name": "楽天カード",
  "closingDay": 31,
  "paymentDay": 27,
  "withdrawalAccountId": "acc_01"
}
```

---

### PATCH `/credit-cards/{cardId}`

カード情報を更新する。

---

### DELETE `/credit-cards/{cardId}`

カードを無効化する。

---

## 6. 支出カテゴリ API

### GET `/expense-categories`

カテゴリ一覧を取得する。

---

### POST `/expense-categories`

カテゴリを作成する。

#### Request

```json
{
  "name": "食費"
}
```

---

### PATCH `/expense-categories/{categoryId}`

カテゴリ名を更新する。

---

### DELETE `/expense-categories/{categoryId}`

カテゴリを削除、または無効化する。

---

## 7. 支出 API

### GET `/expenses`

支出一覧を取得する。

#### Query

```text
?cycleId=cycle_01
?from=2026-06-01&to=2026-06-30
?categoryId=cat_01
?paymentMethod=credit_card
```

#### Response

```json
[
  {
    "id": "exp_01",
    "cycleId": "cycle_01",
    "accountId": null,
    "creditCardId": "card_01",
    "categoryId": "cat_01",
    "name": "コンビニ",
    "amount": 850,
    "expenseDate": "2026-06-19",
    "paymentMethod": "credit_card",
    "memo": "昼食"
  }
]
```

---

### POST `/expenses`

支出を作成する。

#### Request

```json
{
  "cycleId": "cycle_01",
  "accountId": null,
  "creditCardId": "card_01",
  "categoryId": "cat_01",
  "name": "コンビニ",
  "amount": 850,
  "expenseDate": "2026-06-19",
  "paymentMethod": "credit_card",
  "memo": "昼食"
}
```

#### Response

```json
{
  "id": "exp_01",
  "cycleId": "cycle_01",
  "amount": 850,
  "expenseDate": "2026-06-19",
  "paymentMethod": "credit_card"
}
```

#### 注意点

カード払いでも、今期の使用可能額から即時に差し引く。

カード請求の引き落とし時には、支出として二重計上しない。

---

### PATCH `/expenses/{expenseId}`

支出を更新する。

---

### DELETE `/expenses/{expenseId}`

支出を削除する。

---

## 8. 予定支出 API

### GET `/planned-expenses`

予定支出一覧を取得する。

#### Query

```text
?cycleId=cycle_01
?status=planned
```

---

### POST `/planned-expenses`

予定支出を作成する。

#### Request

```json
{
  "cycleId": "cycle_01",
  "accountId": "acc_01",
  "creditCardId": null,
  "categoryId": "cat_01",
  "name": "電気代",
  "estimatedAmount": 8000,
  "plannedDate": "2026-06-25",
  "paymentMethod": "bank_transfer",
  "reflectToBudget": true,
  "memo": "金額未確定"
}
```

---

### POST `/planned-expenses/{plannedExpenseId}/confirm`

予定支出を実支出に変換する。

#### Request

```json
{
  "actualAmount": 7420,
  "confirmedDate": "2026-06-24"
}
```

#### Response

```json
{
  "plannedExpenseId": "pexp_01",
  "expenseId": "exp_10",
  "status": "confirmed",
  "actualAmount": 7420
}
```

---

## 9. 固定費・サブスク API

### GET `/recurring-expenses`

固定費一覧を取得する。

---

### POST `/recurring-expenses`

固定費を登録する。

#### Request

```json
{
  "accountId": "acc_01",
  "creditCardId": null,
  "categoryId": "cat_02",
  "name": "家賃",
  "amount": 70000,
  "paymentMethod": "bank_transfer",
  "billingDay": 25,
  "isAmountFixed": true
}
```

---

### PATCH `/recurring-expenses/{recurringExpenseId}`

固定費設定を更新する。

---

### DELETE `/recurring-expenses/{recurringExpenseId}`

固定費設定を停止する。

---

### POST `/recurring-expenses/{recurringExpenseId}/generate`

固定費設定から、対象周期の支出または予定支出を生成する。

#### Request

```json
{
  "cycleId": "cycle_01",
  "targetDate": "2026-06-25"
}
```

---

## 10. 収入 API

### GET `/incomes`

収入一覧を取得する。

#### Query

```text
?cycleId=cycle_01
?from=2026-06-01&to=2026-06-30
?type=salary
```

---

### POST `/incomes`

収入を登録する。

#### Request

```json
{
  "cycleId": "cycle_01",
  "accountId": "acc_01",
  "name": "給与",
  "amount": 250000,
  "incomeDate": "2026-06-25",
  "type": "salary"
}
```

---

### PATCH `/incomes/{incomeId}`

収入を更新する。

---

### DELETE `/incomes/{incomeId}`

収入を削除する。

---

## 11. 給与ルール API

### GET `/income-rules`

給与ルール一覧を取得する。

---

### POST `/income-rules`

給与ルールを作成する。

#### Request

```json
{
  "accountId": "acc_01",
  "name": "給与",
  "amount": 250000,
  "incomeDay": 25,
  "inputMode": "manual_reminder"
}
```

---

### POST `/income-rules/{incomeRuleId}/generate`

給与ルールから収入を生成する。

#### Request

```json
{
  "cycleId": "cycle_01",
  "incomeDate": "2026-06-25",
  "amount": 248000
}
```

変動給与の場合は、生成時に金額を上書きできる。

---

## 12. 管理周期 API

### GET `/budget-cycles`

管理周期一覧を取得する。

#### Query

```text
?from=2026-06-01&to=2026-06-30
```

---

### POST `/budget-cycles`

管理周期を作成する。

#### Request

```json
{
  "name": "2026年6月後半",
  "startDate": "2026-06-16",
  "endDate": "2026-06-30",
  "resetType": "custom"
}
```

---

### GET `/budget-cycles/current`

現在の周期を取得する。

#### Response

```json
{
  "id": "cycle_01",
  "name": "2026年6月",
  "startDate": "2026-06-01",
  "endDate": "2026-06-30",
  "resetType": "custom"
}
```

---

### GET `/budget-cycles/{cycleId}`

周期詳細を取得する。

---

### PATCH `/budget-cycles/{cycleId}`

周期情報を更新する。

---

### DELETE `/budget-cycles/{cycleId}`

周期を削除、またはアーカイブする。

支出・収入が紐づいている場合は、基本的に削除不可にする。

---

## 13. 使用可能額・残額 API

### GET `/budget-cycles/{cycleId}/summary`

周期ごとの予算サマリーを取得する。

ここでいう周期は、予算をリセットする単位である。

基本的には1か月単位であり、月初から月末、給与日から次回給与日前日、またはカスタム期間で設定される。

また、`budgetDisplay` では、その周期内の使用可能額をどの粒度で表示するかを返す。

表示粒度は、1日単位、1週間単位、2週間単位、1か月単位から選択できる。

#### Response

```json
{
  "cycleId": "cycle_01",
  "period": {
    "startDate": "2026-06-25",
    "endDate": "2026-07-24",
    "resetType": "salary_based",
    "totalDays": 30,
    "elapsedDays": 10,
    "remainingDays": 20
  },
  "income": {
    "total": 250000
  },
  "carryover": {
    "amount": 10000,
    "policy": "add_to_next_cycle"
  },
  "fixedExpenses": {
    "total": 90000
  },
  "plannedExpenses": {
    "total": 12000,
    "reflectedTotal": 8000
  },
  "savings": {
    "total": 30000
  },
  "spendingLimit": 132000,
  "actualExpenses": {
    "total": 56000,
    "cash": 12000,
    "creditCard": 44000
  },
  "remainingAmount": 76000,
  "budgetDisplay": {
    "granularity": "daily",
    "unitLabel": "1日あたり",
    "availablePerUnit": 3800,
    "remainingUnits": 20
  },
  "pace": {
    "currentDailyAverage": 5600,
    "expectedDailyAverage": 4400,
    "isOverPace": true
  }
}
```

`actualExpenses` は、使用限度額から追加で差し引く実支出を表す。固定費、および使用限度額へ反映済みの予定支出から変換した実支出は、二重控除を避けるため含めない。

### `period.resetType`

予算リセット周期の種類を表す。

```text
calendar_based
salary_based
custom
```

#### `calendar_based`

月初から月末までを1周期とする。

例は以下のとおり。

```text
2026-06-01 〜 2026-06-30
```

#### `salary_based`

給与日から次回給与日前日までを1周期とする。

例は以下のとおり。

```text
2026-06-25 〜 2026-07-24
```

#### `custom`

ユーザーが任意に設定した開始日と終了日を1周期とする。期間は最長1か月とする。

---

### `budgetDisplay.granularity`

使用可能額をどの粒度で表示するかを表す。

```text
daily
weekly
biweekly
monthly
```

#### `daily`

残額を残り日数で割り、1日あたり使える金額を表示する。

```json
{
  "granularity": "daily",
  "unitLabel": "1日あたり",
  "availablePerUnit": 3800,
  "remainingUnits": 20
}
```

#### `weekly`

残額を残り週数で割り、1週間あたり使える金額を表示する。

```json
{
  "granularity": "weekly",
  "unitLabel": "1週間あたり",
  "availablePerUnit": 25333,
  "remainingUnits": 3
}
```

#### `biweekly`

残額を残り2週間の区間数で割り、2週間あたり使える金額を表示する。

```json
{
  "granularity": "biweekly",
  "unitLabel": "2週間あたり",
  "availablePerUnit": 38000,
  "remainingUnits": 2
}
```

#### `monthly`

周期全体であといくら使えるかを表示する。

```json
{
  "granularity": "monthly",
  "unitLabel": "今期全体",
  "availablePerUnit": 76000,
  "remainingUnits": 1
}
```

---

### 計算式

```text
使用限度額 = 総収入 + 繰り越し - 固定費 - 予算反映対象の予定支出 - 貯金額
```

```text
現在残額 = 使用限度額 - 今期の予算控除対象となる実支出
```

固定費、および使用限度額へ反映済みの予定支出から変換した実支出は、使用限度額の計算時に控除済みであるため、現在残額の計算では再度控除しない。予定額と確定額に差がある場合は、使用限度額側を確定額で再計算する。

```text
1日あたり使える金額 = 現在残額 / 残り日数
```

```text
1週間あたり使える金額 = 現在残額 / 残り週数
```

```text
2週間あたり使える金額 = 現在残額 / 残り2週間の区間数
```

```text
1か月あたり使える金額 = 現在残額
```

---

### ペース判定

```text
想定1日あたり使用額 = 使用限度額 / 周期の総日数
```

```text
現在の1日あたり平均支出 = 今期の予算控除対象となる実支出 / 経過日数
```

```text
現在の1日あたり平均支出 > 想定1日あたり使用額 の場合、使いすぎと判定する
```

`budgetDisplay.granularity` は表示用の粒度であり、

ペース判定そのものは日割りで計算する。

これにより、表示粒度が1週間単位や1か月単位の場合でも、

内部的には日ごとの消費ペースをもとに使いすぎを判定できる。

---

### GET `/budget-cycles/current/summary`

現在の周期の予算サマリーを取得する。

ホーム画面ではこのAPIを中心に使う。

---

## 14. 繰り越し API

### POST `/budget-cycles/{cycleId}/close`

周期を締める。

`carryoverPolicy` は `add_to_next_cycle`、`move_to_savings`、`keep_as_remaining` のいずれかを指定する。

#### Request

```json
{
  "carryoverPolicy": "add_to_next_cycle"
}
```

#### Response

```json
{
  "closedCycleId": "cycle_01",
  "remainingAmount": 12000,
  "carryoverPolicy": "add_to_next_cycle",
  "nextCycleId": "cycle_02"
}
```

---

## 15. 貯金 API

### GET `/saving-goals`

貯金目的一覧を取得する。

---

### POST `/saving-goals`

貯金目的を作成する。

#### Request

```json
{
  "name": "旅行用",
  "targetAmount": 200000
}
```

---

### PATCH `/saving-goals/{savingGoalId}`

貯金目的を更新する。

---

### DELETE `/saving-goals/{savingGoalId}`

貯金目的を無効化する。

---

### GET `/savings-rules`

貯金ルール一覧を取得する。

---

### POST `/savings-rules`

貯金ルールを作成する。

#### Request

```json
{
  "name": "毎月貯金",
  "type": "fixed_amount",
  "amount": 30000
}
```

---

### POST `/saving-allocations`

収入から貯金目的へ振り分ける。

#### Request

```json
{
  "cycleId": "cycle_01",
  "incomeId": "inc_01",
  "savingGoalId": "goal_01",
  "amount": 10000
}
```

---

## 16. カード請求・照合 API

### GET `/credit-card-statements`

カード請求一覧を取得する。

#### Query

```text
?creditCardId=card_01
?cycleId=cycle_01
```

---

### POST `/credit-card-statements`

カード請求を登録する。

#### Request

```json
{
  "creditCardId": "card_01",
  "cycleId": "cycle_01",
  "statementStartDate": "2026-05-01",
  "statementEndDate": "2026-05-31",
  "paymentDate": "2026-06-27",
  "billedAmount": 52300
}
```

#### Response

```json
{
  "id": "stmt_01",
  "creditCardId": "card_01",
  "billedAmount": 52300,
  "recordedAmount": 51000,
  "differenceAmount": 1300,
  "status": "unmatched"
}
```

---

### GET `/credit-card-statements/{statementId}/reconciliation`

カード請求と記録済み支出の照合結果を取得する。

#### Response

```json
{
  "statementId": "stmt_01",
  "billedAmount": 52300,
  "recordedAmount": 51000,
  "differenceAmount": 1300,
  "matchedExpenses": [
    {
      "id": "exp_01",
      "name": "スーパー",
      "amount": 3000,
      "expenseDate": "2026-05-10"
    }
  ],
  "status": "unmatched"
}
```

---

### POST `/credit-card-statements/{statementId}/adjust`

差額を調整する。

#### Request

```json
{
  "adjustmentType": "unknown_expense",
  "amount": 1300,
  "categoryId": "cat_unknown",
  "memo": "明細不一致分"
}
```

#### `adjustmentType`

```text
unknown_expense
fee
edit_existing_expense
ignore
```

---

### POST `/credit-card-statements/{statementId}/mark-paid`

カード請求の引き落としを記録する。

#### Response

```json
{
  "statementId": "stmt_01",
  "status": "paid",
  "withdrawalAccountId": "acc_01",
  "paidAmount": 52300
}
```

この処理では、銀行口座の残高は減る。

ただし、支出としては新規計上しない。

---

## 17. 通知設定 API

### GET `/notification-settings`

通知設定一覧を取得する。

---

### PATCH `/notification-settings/{type}`

通知設定を更新する。

#### Request

```json
{
  "enabled": true,
  "timing": "one_day_before"
}
```

---

## 18. ダッシュボード API

### GET `/dashboard`

現在の周期、残額、直近支出、通知などをまとめて取得する。

#### Response

```json
{
  "currentCycle": {
    "id": "cycle_01",
    "name": "2026年6月",
    "startDate": "2026-06-01",
    "endDate": "2026-06-30"
  },
  "budgetSummary": {
    "spendingLimit": 132000,
    "remainingAmount": 76000,
    "granularity": "daily",
    "unitLabel": "一日あたり",
    "availablePerUnit": 3800,
    "isOverPace": true
  },
  "recentExpenses": [
    {
      "id": "exp_01",
      "name": "コンビニ",
      "amount": 850,
      "expenseDate": "2026-06-19"
    }
  ],
  "alerts": [
    {
      "type": "salary_input_reminder",
      "message": "給与の入力予定日を過ぎています"
    }
  ]
}
```

---

## MVP で優先する API

### 最優先

```text
GET /me
POST /me/sync
GET /user-settings
PATCH /user-settings
GET /accounts
POST /accounts
PATCH /accounts/{accountId}
DELETE /accounts/{accountId}
GET /expense-categories
POST /expense-categories
PATCH /expense-categories/{categoryId}
DELETE /expense-categories/{categoryId}
GET /budget-cycles/current
POST /budget-cycles
GET /budget-cycles/{cycleId}/summary
GET /budget-cycles/current/summary
GET /incomes
POST /incomes
PATCH /incomes/{incomeId}
DELETE /incomes/{incomeId}
GET /expenses
POST /expenses
PATCH /expenses/{expenseId}
DELETE /expenses/{expenseId}
GET /dashboard
```

### カード機能で必須

```text
GET /credit-cards
POST /credit-cards
PATCH /credit-cards/{cardId}
DELETE /credit-cards/{cardId}
GET /credit-card-statements
POST /credit-card-statements
GET /credit-card-statements/{statementId}/reconciliation
POST /credit-card-statements/{statementId}/adjust
POST /credit-card-statements/{statementId}/mark-paid
```

### 後回しでもよいAPI

```text
GET /account-transfers
POST /account-transfers
GET /planned-expenses
POST /planned-expenses
POST /planned-expenses/{plannedExpenseId}/confirm
GET /recurring-expenses
POST /recurring-expenses
POST /recurring-expenses/{recurringExpenseId}/generate
GET /income-rules
POST /income-rules
POST /income-rules/{incomeRuleId}/generate
GET /saving-goals
POST /saving-goals
GET /notification-settings
PATCH /notification-settings/{type}
```

---

## 重要な設計判断

### 1. カード払いは利用日基準で支出にする

カード払いは、支払日ではなく利用日を基準に `expenses` に登録する。

これにより、今期の使用可能額から即時に差し引ける。

### 2. カード請求は支出にしない

カード請求額は、過去に記録した支出の支払いである。

そのため、請求額をそのまま `expenses` に登録すると二重計上になる。

### 3. 口座間資金移動は支出にしない

銀行口座から財布に移しただけでは、資産の置き場所が変わっただけである。

そのため、`account_transfers` として管理する。

### 4. ホーム画面は `/dashboard` と `/budget-cycles/current/summary` を中心にする

Pocket-Pace の価値は、入力そのものではなく、今期あといくら使えるかを分かりやすく表示することである。

そのため、集計系APIを重要視する。
