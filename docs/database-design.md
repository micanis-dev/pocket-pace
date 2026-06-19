# Pocket-Pace DB 設計案

## 目的

Pocket-Pace は、家計簿アプリというよりも、設定した周期ごとに使用限度額を決めることで、今の周期であといくら使えるかを管理するアプリである。

DB設計では、以下を重視する。

- 収入、支出、予定支出、貯金を周期単位で集計できること
- クレジットカード払いを利用日基準で支出として扱えること
- カード請求額は支出ではなく、過去支出の支払いとして扱えること
- 口座間の資金移動を支出として扱わないこと
- 将来的な通知、繰り返し入力、貯金目的管理に拡張できること

---

## 1. users

ユーザー本体を管理する。

Auth0 を利用する前提なので、アプリ側では `auth0_user_id` を保持する。

```sql
users
- id
- auth0_user_id
- email
- display_name
- created_at
- updated_at
```

### 備考

- `auth0_user_id` はユニーク制約を付ける。
- `email` も基本的にはユニーク制約を付けてよい。
- 認証情報そのものは Auth0 に任せる。

---

## 2. user_settings

ユーザーごとの表示・基本設定を管理する。

```sql
user_settings
- id
- user_id
- theme
- theme_color
- currency
- default_cycle_type
- default_budget_granularity
- notification_enabled
- created_at
- updated_at
```

### theme

```text
light
dark
system
```

### default_cycle_type

```text
calendar_based
salary_based
custom
```

### default_budget_granularity

```text
daily
weekly
biweekly
monthly
```

### 備考

元案では `users_setting` だったが、テーブル名としては `user_settings` の方が自然である。

---

## 3. accounts

銀行口座、財布、タンス預金、電子マネーなど、残高を持つ場所を管理する。

```sql
accounts
- id
- user_id
- name
- type
- initial_balance
- current_balance
- is_active
- created_at
- updated_at
```

### type

```text
bank
wallet
cash_box
electronic_money
other
```

### 備考

`current_balance` は便利だが、収入・支出・資金移動と二重管理になる。

そのため、以下の操作では必ずトランザクションで更新する。

- 収入作成時に加算
- 支出作成時に減算
- 支出削除時に戻す
- 収入削除時に戻す
- 口座間資金移動時に移動元から減算し、移動先へ加算
- カード請求の引き落とし時に引き落とし口座から減算

---

## 4. credit_cards

クレジットカードを管理する。

```sql
credit_cards
- id
- user_id
- name
- closing_day
- payment_day
- withdrawal_account_id
- is_active
- created_at
- updated_at
```

### 備考

カード支出は利用日基準で `expenses` に登録する。

カード請求額は支出ではなく、過去に登録したカード支出の支払いとして扱う。

---

## 5. account_transfers

口座間の資金移動を管理する。

```sql
account_transfers
- id
- user_id
- from_account_id
- to_account_id
- amount
- transfer_date
- memo
- created_at
- updated_at
```

### 備考

これは支出ではない。

例えば、銀行口座から財布に現金を下ろした場合、資産の置き場所が変わっただけである。

そのため `expenses` には登録しない。

---

## 6. budget_cycles

お金を管理する周期を管理する。

```sql
budget_cycles
- id
- user_id
- name
- start_date
- end_date
- reset_type
- created_at
- updated_at
```

### reset_type

```text
calendar_based
salary_based
custom
```

### バリデーション

- `start_date <= end_date`
- 最短1日
- 最長1か月
- 同一ユーザー内で周期が重複しないことが望ましい

---

## 7. incomes

収入の実績を管理する。

```sql
incomes
- id
- user_id
- cycle_id
- account_id
- name
- amount
- income_date
- type
- created_at
- updated_at
```

### type

```text
salary
temporary
refund
side_job
allowance
other
```

### 備考

給与も臨時収入も、最終的には `incomes` に実績として登録する。

---

## 8. income_rules

給与などの定期収入ルールを管理する。

```sql
income_rules
- id
- user_id
- account_id
- name
- amount
- income_day
- input_mode
- is_active
- created_at
- updated_at
```

### input_mode

```text
auto
manual_reminder
```

### 備考

実際に発生した収入は `incomes` に登録する。

`income_rules` はあくまで自動生成や通知のための設定である。

---

## 9. expense_categories

支出カテゴリを管理する。

```sql
expense_categories
- id
- user_id
- name
- is_active
- created_at
- updated_at
```

### 備考

元案では `expenses_categories` だったが、英語としては `expense_categories` の方が自然である。

既存支出に使われているカテゴリは物理削除せず、`is_active = false` にするのが安全である。

---

## 10. expenses

実際に発生した支出を管理する。

```sql
expenses
- id
- user_id
- cycle_id
- account_id
- credit_card_id
- category_id
- recurring_expense_id
- planned_expense_id
- name
- amount
- expense_date
- payment_method
- memo
- is_adjustment
- created_at
- updated_at
```

### payment_method

```text
cash
bank_transfer
debit
credit_card
electronic_money
other
```

### 備考

現金・銀行払いの場合は `account_id` を使う。

クレジットカード払いの場合は `credit_card_id` を使う。

カード払いでも、使用可能額には利用日基準で即時反映する。

カード請求の引き落とし時には、支出を新規作成しない。

`recurring_expense_id` または `planned_expense_id` により、使用限度額で控除済みの固定費・予定支出から生成された実支出を識別する。これらは現在残額の計算で二重に控除しない。

---

## 11. recurring_expenses

固定費・サブスクの繰り返し設定を管理する。

```sql
recurring_expenses
- id
- user_id
- account_id
- credit_card_id
- category_id
- name
- amount
- payment_method
- billing_day
- is_amount_fixed
- estimated_amount
- is_active
- created_at
- updated_at
```

### 備考

実際に発生した支出は `expenses` に生成する。

金額未確定の固定費は、`planned_expenses` として生成してもよい。

---

## 12. planned_expenses

金額未確定の固定費予定や、今後発生予定の支出を管理する。

```sql
planned_expenses
- id
- user_id
- cycle_id
- account_id
- credit_card_id
- category_id
- name
- estimated_amount
- actual_amount
- planned_date
- confirmed_date
- payment_method
- reflect_to_budget
- status
- memo
- created_at
- updated_at
```

### status

```text
planned
confirmed
cancelled
```

### 備考

`reflect_to_budget = true` の場合、予定支出として使用可能額に反映する。

金額が確定したら `expenses` に変換し、`status = confirmed` にする。

---

## 13. savings_rules

貯金ルールを管理する。

```sql
savings_rules
- id
- user_id
- name
- type
- amount
- percentage
- is_active
- created_at
- updated_at
```

### type

```text
fixed_amount
income_percentage
manual
```

### 備考

元案では `cycle_id` が含まれていたが、貯金ルールは周期をまたいで使う設定である。

そのため、`cycle_id` は持たせない方が自然である。

実際に周期内で発生した貯金は `saving_allocations` で管理する。

---

## 14. saving_goals

目的別貯金を管理する。

```sql
saving_goals
- id
- user_id
- name
- target_amount
- current_amount
- is_active
- created_at
- updated_at
```

### 例

- 旅行用
- 車用
- 引っ越し用
- 緊急用
- 欲しいもの用

---

## 15. saving_allocations

収入や周期に対して、どの貯金目的にいくら振り分けたかを管理する。

```sql
saving_allocations
- id
- user_id
- cycle_id
- income_id
- saving_goal_id
- amount
- created_at
- updated_at
```

### 備考

これはアプリ上の目安として扱う。

実際に口座間でお金を移した場合は、別途 `account_transfers` にも記録する。

---

## 16. cycle_carryovers

周期終了時の繰り越しを管理する。

```sql
cycle_carryovers
- id
- user_id
- from_cycle_id
- to_cycle_id
- amount
- policy
- created_at
- updated_at
```

### policy

```text
add_to_next_cycle
move_to_savings
keep_as_remaining
```

### 備考

繰り越しを履歴として残すため、`budget_cycles` に直接持たせるよりも別テーブルの方が扱いやすい。

`to_cycle_id` は `add_to_next_cycle` の場合だけ設定し、それ以外では `NULL` とする。

---

## 17. credit_card_statements

カード請求額と、日々記録したカード支出の照合を管理する。

```sql
credit_card_statements
- id
- user_id
- credit_card_id
- cycle_id
- statement_start_date
- statement_end_date
- payment_date
- billed_amount
- recorded_amount
- difference_amount
- status
- created_at
- updated_at
```

### status

```text
draft
matched
unmatched
adjusted
ignored
paid
```

### 備考

`recorded_amount` は、対象期間内の `expenses` のうち、同じ `credit_card_id` を持つ支出合計である。

カード請求額と記録済み支出に差額がある場合、差額を調整できる。

---

## 18. notification_settings

通知種類ごとの設定を管理する。

```sql
notification_settings
- id
- user_id
- type
- enabled
- timing
- created_at
- updated_at
```

### type

```text
salary_input_reminder
fixed_expense_reminder
overspending_alert
cycle_end_reminder
missing_input_reminder
```

### 備考

`user_settings.notification_enabled` は全体のオン・オフとして使う。

通知ごとの細かい制御は `notification_settings` で行う。

---

## MVP で最低限必要なテーブル

最初の実装で最低限必要なテーブルは以下である。

```text
users
user_settings
accounts
credit_cards
budget_cycles
incomes
expense_categories
expenses
credit_card_statements
```

以下は後続でもよい。

```text
notification_settings
saving_allocations
cycle_carryovers
income_rules
planned_expenses
recurring_expenses
savings_rules
saving_goals
account_transfers
```

ただし、将来的に必要になる可能性が高いため、設計上は最初から考慮しておくとよい。
