# メニューの完全削除と注文データの削除 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 注文が付いたメニューも本当に削除でき、管理画面から注文データを一括削除できるようにする。

**Architecture:** 新しいマイグレーション 0004 で、`order_items.menu_item_id` を nullable にし、外部キーを `on delete set null` に変える(主キーはサロゲートの `id` に置き換え)。注文の JSON を作る関数は left join にする。`admin_delete_menu_item` は常に削除する。service_role 専用の `admin_reset_orders()` を追加する。管理画面では削除の文言を変え、確認入力付きのリセット欄を足す。

**Tech Stack:** 既存のまま(Next.js 16, Supabase, Vitest, PGlite)

**Spec:** `docs/superpowers/specs/2026-11-18-menu-delete-and-order-reset-design.md`

## Global Constraints

- 実行済みの `0001`〜`0003` は変更しない。変更はすべて `supabase/migrations/0004_menu_delete_and_order_reset.sql` に入れる
- 注文内容の並び:`menu_items.sort_order` 昇順、削除済み(null)は末尾、同順位は `oi.name` 順
- 削除確認の文言:`「<名前>」を削除しますか?売上の記録は残ります`
- リセットの確認語は `削除`(完全一致)。誤り時のエラー:`確認のため「削除」と入力してください`
- リセットで消すのは `orders` / `order_items` / `order_counters` のみ
- Supabase の safeupdate 対策として、DELETE には必ず WHERE 句を付ける(`where true`)

## Review Focus

1. 調理中の注文に含まれるメニューを削除 → スタッフ画面とお客さん画面に、その行が名前付きで残る(Task 1 のテスト)
2. リセット時にお客さんのスマホにトークンが残っている → `get_my_order` が null を返し、メニューに戻る(Task 1)
3. リセット後の注文 → 番号が 1 から(Task 1)
4. 削除した品を含む売上 → 集計に名前・個数・枚数が残る(Task 1)
5. リセット API に未ログイン、または確認語の誤り → 401 / 400 で何も消さない(Task 2)

---

### Task 1: マイグレーション 0004

**Files:**
- Create: `supabase/migrations/0004_menu_delete_and_order_reset.sql`
- Modify: `tests/db/staff.test.ts`(admin functions の hidden テストを置き換え、新しいテストを追加)

**Interfaces:**
- Produces:`admin_delete_menu_item(p_id uuid) returns text` → 常に `'deleted'`(存在しない id も `'deleted'`)。`admin_reset_orders() returns void`(service_role のみ)。`order_json` / `get_my_order` は left join に変更(戻り値の形は同じ)

- [ ] **Step 1: 失敗するテストを書く**(`tests/db/staff.test.ts`)
  - `deletes an item that has orders and keeps the order lines`:注文後に `admin_delete_menu_item(juice)` が `'deleted'` を返し、`menu_items` に行がない。`staff_list_orders().cooking[0].items` に `{name:'ジュース', quantity:1}` が残る。`get_my_order(token).items` にも残る
  - `lists deleted items last`:焼きそば+ジュースの注文で焼きそばを削除すると、items が `[ジュース, 焼きそば]` の順になる
  - `keeps sales for deleted items`:受渡済の後に品を削除しても、`sales_summary(null).items` に同じ行が残る
  - `admin_reset_orders`:注文3件(1件は受渡済)の後に実行すると、orders / order_items / order_counters が 0 件。直後の `place_order` の番号が 1。旧トークンの `get_my_order` は null。menu_items と settings の件数は変わらない。`realtime.sent_log` に合図が増える
  - 権限テストの it.each に `select admin_reset_orders()` を追加
- [ ] **Step 2:** `npx vitest run tests/db` → 新しいテストが FAIL
- [ ] **Step 3:** 0004 を実装する
  - `order_items`:主キーを `id bigint generated always as identity` に置き換え、`unique(order_id, menu_item_id)` を追加
  - `menu_item_id`:`drop not null`。外部キー `order_items_menu_item_id_fkey` を `on delete set null` で作り直す
  - `order_json` / `get_my_order` を `create or replace` で left join にする
  - `admin_delete_menu_item` を、常に削除するように置き換える
  - `admin_reset_orders` を追加し、権限は revoke / grant する
- [ ] **Step 4:** `npm test` → 全件 PASS
- [ ] **Step 5:** Commit `feat(db): allow deleting ordered menu items and resetting orders`

### Task 2: API と管理画面

**Files:**
- Create: `src/app/api/admin/orders/reset/route.ts`、`src/app/api/admin/orders/reset/route.test.ts`、`src/components/admin/ResetOrders.tsx`
- Modify: `src/components/admin/MenuRow.tsx`(確認文言の変更、hidden メッセージの削除)、`src/components/admin/MenuEditor.tsx`(`ResetOrders` を最下部に置く)、`README.md`(0004 の適用手順とリセットの説明)

**Interfaces:**
- Consumes:`requireStaff`、`createServiceClient`、RPC `admin_reset_orders`
- Produces:`POST /api/admin/orders/reset` body `{ confirm: '削除' }` → `204`。確認語の誤りは `400 { error: '確認のため「削除」と入力してください' }`。未ログインは `401`。DB エラーは `500`
- `RESET_CONFIRM_WORD = '削除'`(`src/lib/admin/validate.ts` に export し、画面と API で共有)

- [ ] **Step 1: 失敗するテストを書く**(`route.test.ts`、`requireStaff` と `createServiceClient` は vi.mock)
  - 未ログイン → 401、rpc は呼ばない
  - `{confirm:'さくじょ'}` と `{}` → 400、エラー文言が完全一致、rpc は呼ばない
  - `{confirm:'削除'}` → 204、`rpc('admin_reset_orders')` が呼ばれる
  - rpc がエラー → 500
- [ ] **Step 2:** `npx vitest run src/app/api/admin` → FAIL
- [ ] **Step 3:** ルートと画面を実装する
  - `ResetOrders` の見出しは「注文データの削除」。説明は「すべての注文・売上の記録・番号を削除します。元に戻せません。メニューと写真は残ります。」
  - 入力欄のラベルは「確認のため「削除」と入力」。ボタン「注文データを削除」は、確認語が一致したときだけ押せる。背景は `#C5221F`、文字は白
  - 成功時は「注文データを削除しました」と表示する
- [ ] **Step 4:** `npm test` → PASS、`npm run lint` → エラーなし、`npm run build` → 成功
- [ ] **Step 5:** ブラウザでの確認(スタブ環境):注文あり品の削除で一覧から消え、集計に残ること。リセット後に集計が 0、次の番号が 1、お客さんのスマホがメニューに戻ること
- [ ] **Step 6:** Commit `feat(admin): delete ordered menu items and reset order data`
