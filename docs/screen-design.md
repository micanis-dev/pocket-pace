# MVP 画面一覧

## 1. ホーム画面

**目的**

現在の周期であといくら使えるかを表示する。

**表示項目**

- 現在の予算周期
- 使用限度額
- 現在の残額
- 表示粒度ごとの使用可能額（最も大きく表示）
- 消費ペース
- 直近の支出
- アラート

**利用 API**

- `GET /dashboard`
- `GET /budget-cycles/current/summary`

---

## 2. 支出一覧画面

**目的**

登録済みの支出を確認する。

**表示項目**

- 支出日
- 支出名
- 金額
- カテゴリ
- 支払い方法
- 支払い元
- メモ

**操作**

- 支出を追加する
- 支出を編集する
- 支出を削除する

**利用 API**

- `GET /expenses`
- `DELETE /expenses/{expenseId}`

---

## 3. 支出登録・編集画面

**目的**

日々の支出を登録・編集する。

**入力項目**

- 金額
- 日付
- カテゴリ
- 支払い方法
- 口座
- クレジットカード
- メモ

**利用 API**

- `GET /accounts`
- `GET /credit-cards`
- `GET /expense-categories`
- `POST /expenses`
- `PATCH /expenses/{expenseId}`

---

## 4. 収入一覧画面

**目的**

収入を確認する。

**利用 API**

- `GET /incomes`

---

## 5. 収入登録・編集画面

**目的**

給与や臨時収入を登録する。

**利用 API**

- `GET /accounts`
- `POST /incomes`
- `PATCH /incomes/{incomeId}`

---

## 6. 口座管理画面

**目的**

銀行口座、財布、現金などの管理を行う。

**利用 API**

- `GET /accounts`
- `POST /accounts`
- `PATCH /accounts/{accountId}`
- `DELETE /accounts/{accountId}`

---

## 7. カード管理画面

**目的**

クレジットカードを管理する。

**利用 API**

- `GET /credit-cards`
- `POST /credit-cards`
- `PATCH /credit-cards/{cardId}`
- `DELETE /credit-cards/{cardId}`

---

## 8. カード請求・照合画面

**目的**

カード請求額と記録済みのカード支出を照合し、差額を調整して引き落としを記録する。

**表示項目**

- 請求対象期間
- 請求額
- 記録済み支出の合計
- 差額
- 照合状態

**操作**

- カード請求を登録する
- 差額を調整する
- 引き落とし済みにする

**利用 API**

- `GET /credit-card-statements`
- `POST /credit-card-statements`
- `GET /credit-card-statements/{statementId}/reconciliation`
- `POST /credit-card-statements/{statementId}/adjust`
- `POST /credit-card-statements/{statementId}/mark-paid`

---

## 9. 予算周期設定画面

**目的**

予算リセット周期と表示粒度を設定する。

**入力項目**

- リセット周期タイプ
- 給与日
- カスタム開始日
- カスタム終了日
- 表示粒度

**利用 API**

- `GET /user-settings`
- `PATCH /user-settings`
- `POST /budget-cycles`

---

## 10. カテゴリ設定画面

**目的**

支出カテゴリを管理する。

**利用 API**

- `GET /expense-categories`
- `POST /expense-categories`
- `PATCH /expense-categories/{categoryId}`
- `DELETE /expense-categories/{categoryId}`
