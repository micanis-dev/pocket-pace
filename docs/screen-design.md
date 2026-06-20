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

---

## 11. 貯金管理画面

**目的**

毎月の貯金ルールを設定し、収入または予算周期から目的別貯金へ振り分ける。

**表示項目**

- 目的別の目標額
- 目的別の現在額と達成率
- 貯金済み合計
- 登録済みの貯金ルール
- 今期の振り分け元となる収入

**操作**

- 貯金目的を追加・編集・無効化する
- 固定金額・収入割合・手動の貯金ルールを追加する
- 収入または現在の予算周期から貯金目的へ金額を振り分ける

**利用 API**

- `GET /saving-goals`
- `POST /saving-goals`
- `PATCH /saving-goals/{savingGoalId}`
- `DELETE /saving-goals/{savingGoalId}`
- `GET /savings-rules`
- `POST /savings-rules`
- `GET /incomes`
- `POST /saving-allocations`

---

## 12. 口座間資金移動画面

口座間の移動履歴を表示し、移動元・移動先・金額・日付・メモを指定して記録する。資金移動は支出へ計上しない。

**利用 API**

- `GET /account-transfers`
- `POST /account-transfers`
- `GET /accounts`

---

## 13. 予定支出・固定費画面

金額未確定の予定支出と、毎月発生する固定費・サブスクを管理する。予定支出は予算への反映有無を選択でき、確定後は実支出へ変換する。固定費は当期の支出を生成できる。

**利用 API**

- `GET /planned-expenses`
- `POST /planned-expenses`
- `POST /planned-expenses/{plannedExpenseId}/confirm`
- `GET /recurring-expenses`
- `POST /recurring-expenses`
- `DELETE /recurring-expenses/{recurringExpenseId}`
- `POST /recurring-expenses/{recurringExpenseId}/generate`

---

## 14. 給与・収入ルール画面

給与名、通常金額、給料日、入金先口座を登録し、自動入力または手動通知を選択する。自動入力は給料日以降のホーム取得時に未生成の当期分を作成する。

**利用 API**

- `GET /income-rules`
- `POST /income-rules`
- `POST /income-rules/{incomeRuleId}/generate`

---

## 15. 表示・通知設定画面

ライト・ダーク・システムテーマ、テーマカラー、通知全体と通知種別ごとの有効・無効を設定する。

**利用 API**

- `GET /user-settings`
- `PATCH /user-settings`
- `GET /notification-settings`
- `PATCH /notification-settings/{type}`

---

## 16. 周期終了・繰り越し操作

予算周期設定画面から進行中の周期を締め、残額を次周期へ追加、貯金へ移動、または残額として保持する。

**利用 API**

- `POST /budget-cycles/{cycleId}/close`
