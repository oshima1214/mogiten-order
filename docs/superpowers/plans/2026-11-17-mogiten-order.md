# 模擬店 注文・呼び出しシステム Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** お客さんがスマホでセルフ注文し、自分の番号・状態・待ち組数を確認でき、スタッフが1画面で調理〜受け渡しを回し、管理画面でメニューを編集し、売上を集計できる1店舗用 Web アプリを作る。

**Architecture:** Next.js(App Router)が全画面とスタッフ用 API を持ち、Vercel で公開する。データは Supabase(PostgreSQL)。お客さんのブラウザは anon キーで、許可した DB 関数(RPC)とメニュー読み取りだけを直接呼ぶ。スタッフ/管理操作は Next.js の Route Handler が合言葉セッションを確認してから service_role キーで実行する。注文やメニューが変わると DB トリガーが Realtime の公開ブロードキャスト `shop` に中身のない「変わった」合図を送り、各画面は自分に許された経路で再取得する(定期再取得も併用)。

**Tech Stack:** Node 22, Next.js 16(App Router, TypeScript), React 19, Tailwind CSS 4, @supabase/supabase-js 2, Vitest 3, @electric-sql/pglite(DB テストを Docker なしで実行)

**Spec:** `docs/superpowers/specs/2026-11-17-mogiten-order-design.md`(画面見本:https://claude.ai/artifact/LyGx1X5NZyCkWG8vuNRA3W)

## Global Constraints

- 画面の文言はすべて日本語。値段は「金券 N 枚」で表示し、円は扱わない
- 注文の状態は `cooking` / `ready` / `delivered` / `cancelled` の4つのみ
- 番号は営業日ごとに 1 から。営業日 = `Asia/Tokyo` の日付
- 1品目あたり 1 注文の数量は 1〜10
- 「前に N 組」= 同じ営業日・`cooking`・自分より番号が小さい注文の数
- お客さんの取り消しは `cooking` の間だけ
- 経過 10 分以上の調理中注文を強調表示
- 集計は `delivered` の注文だけを数える
- 注文が付いた品目は削除せず `is_visible = false` にする
- 音・バイブ・プッシュ通知・待ち時間の目安は実装しない
- `SUPABASE_SERVICE_ROLE_KEY` をクライアントのバンドルに含めない(service client を使うファイルは `import 'server-only'`)
- 環境変数:`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STAFF_PASSCODE`, `SESSION_SECRET`
- 見た目は画面見本に合わせる:背景 `#F5F5F7`、カード `#FFFFFF` 角丸 16px、文字 `#1D1D1F`/補助 `#6E6E73`、主ボタン `#0071E3`、完成色 `#1A7F37`、調理中バッジ 文字 `#8A4B00` 背景 `#FFF4E5`、フォント `-apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif`。タップ領域 44px 以上

## Review Focus

1. **メニューを見ている間に売り切れた品目を注文** → `place_order` が `sold_out` で拒否し、画面は「売り切れになった商品があります」と出してメニューを再取得する(Task 2, Task 5 にテスト)
2. **2台のスタッフ端末が同じ注文を同時に操作 / 完成ボタンの二度押し** → 2回目は `invalid_transition` で拒否、画面は落ちずに再取得する(Task 3, Task 6 にテスト)
3. **お客さんが取り消した瞬間にスタッフが完成を押した** → 後から来た方が拒否され、お客さん側は「すでに完成しているため取り消せません」と表示(Task 2, Task 5 にテスト)
4. **前日の注文トークンが残ったまま翌日開く / 受渡済・取消済のトークン** → メニュー画面を出し、トークンを消す(Task 2, Task 5 にテスト)
5. **localStorage が使えないブラウザ(プライベートモード等)** → 例外で落ちず、メモリ上で注文を続けられる(Task 5 にテスト)

---

## File Structure

```
mogiten-order/
  supabase/
    migrations/0001_schema.sql        テーブル・RLS・権限
    migrations/0002_customer_rpc.sql  place_order / get_my_order / cancel_my_order
    migrations/0003_staff_rpc.sql     staff_list_orders / staff_update_order / sales_summary / admin_* / broadcast trigger
    storage.sql                       menu-images バケット(本番セットアップ時のみ適用)
    seed.sql                          店名と見本メニュー
  tests/db/harness.ts                 PGlite + Supabase 互換シム + マイグレーション適用
  tests/db/shim.sql                   anon/service_role ロール、realtime.send スタブ
  tests/db/*.test.ts
  src/lib/types.ts                    共有型
  src/lib/cart.ts                     カート計算
  src/lib/auth/session.ts             合言葉セッションの署名/検証
  src/lib/auth/requireStaff.ts        Route Handler 用ガード
  src/lib/supabase/browser.ts         anon クライアント
  src/lib/supabase/server.ts          service_role クライアント(server-only)
  src/lib/realtime/useShopChanges.ts  合図購読 + 定期再取得フック
  src/lib/menu/imageUrl.ts
  src/lib/customer/tokenStore.ts
  src/lib/customer/api.ts
  src/lib/customer/errors.ts
  src/lib/staff/board.ts              作る数の合計・経過時間
  src/lib/admin/validate.ts
  src/proxy.ts                        /staff /admin のページ保護(Next 16 の middleware 後継)
  src/app/page.tsx                    お客さん画面
  src/app/staff/login/page.tsx
  src/app/staff/page.tsx
  src/app/staff/sales/page.tsx
  src/app/admin/page.tsx
  src/app/api/staff/login/route.ts
  src/app/api/staff/orders/route.ts
  src/app/api/staff/orders/[id]/route.ts
  src/app/api/staff/menu/[id]/sold-out/route.ts
  src/app/api/staff/sales/route.ts
  src/app/api/admin/menu/route.ts
  src/app/api/admin/menu/[id]/route.ts
  src/app/api/admin/menu/[id]/image/route.ts
  src/app/api/admin/menu/reorder/route.ts
  src/app/api/admin/settings/route.ts
  src/components/customer/{CustomerApp,MenuView,WaitingView,ReadyView}.tsx
  src/components/staff/{StaffBoard,OrderCard,SalesView}.tsx
  src/components/admin/{MenuEditor,MenuRow}.tsx
  README.md                           セットアップ・店舗追加・当日前チェック
```

## Shared Types(`src/lib/types.ts`, Task 1 で作成)

```ts
export type OrderStatus = 'cooking' | 'ready' | 'delivered' | 'cancelled';
export type MenuItem = { id: string; name: string; priceTickets: number; sortOrder: number; imagePath: string | null; isVisible: boolean; isSoldOut: boolean };
export type OrderLine = { name: string; quantity: number };
export type MyOrder = { number: number; status: OrderStatus; items: OrderLine[]; totalTickets: number; aheadCount: number; waitingTotal: number };
export type StaffOrder = { id: string; number: number; status: OrderStatus; createdAt: string; readyAt: string | null; items: OrderLine[]; totalTickets: number };
export type SalesSummary = { ticketsTotal: number; deliveredCount: number; cancelledCount: number; items: { name: string; quantity: number; tickets: number }[]; dates: string[] };
export type StaffAction = 'complete' | 'deliver' | 'revert' | 'cancel';
```

DB 関数は JSON をこの camelCase のキーで返す(変換層を作らない)。

---

### Task 1: プロジェクト雛形とカート計算

**Files:**
- Create: Next.js 雛形一式、`vitest.config.ts`、`.env.example`、`.gitignore`、`src/lib/types.ts`、`src/lib/cart.ts`
- Test: `src/lib/cart.test.ts`

**Interfaces:**
- Produces: 上記 Shared Types。`type Cart = Record<string, number>`(menuItemId → 数量)、`setQuantity(cart: Cart, id: string, qty: number): Cart`(0〜10 に丸め、0 ならキー削除)、`cartTotals(cart: Cart, menu: MenuItem[]): { count: number; tickets: number }`、`toOrderPayload(cart: Cart): { menu_item_id: string; quantity: number }[]`

- [ ] **Step 1:** `/home/user/mogiten-order` で `git init`、`npx create-next-app@16 . --ts --tailwind --app --src-dir --eslint --no-import-alias --use-npm`(既存の `docs/` は残す)。`npm i @supabase/supabase-js server-only`、`npm i -D vitest @electric-sql/pglite`。`package.json` に `"test": "vitest run"`。`.env.example` に Global Constraints の5変数を空で記載
- [ ] **Step 2: 失敗するテストを書く** `cart.test.ts`
  - `setQuantity({}, 'a', 3)` → `{a: 3}`;`setQuantity({a: 3}, 'a', 0)` → `{}`;`setQuantity({}, 'a', 11)` → `{a: 10}`;`setQuantity({}, 'a', -1)` → `{}`
  - menu `[{id:'a',priceTickets:3,…},{id:'b',priceTickets:1,…}]`、cart `{a:2,b:1}` → `cartTotals` = `{count: 3, tickets: 7}`
  - cart にメニューに無い id があれば `cartTotals` は無視する
  - `toOrderPayload({a:2})` → `[{menu_item_id:'a', quantity:2}]`
- [ ] **Step 3:** `npm test` → FAIL(未定義)
- [ ] **Step 4:** `src/lib/cart.ts` を実装
- [ ] **Step 5:** `npm test` → PASS、`npm run build` → 成功
- [ ] **Step 6:** Commit `chore: scaffold app and add cart logic`(spec も含めて初回コミット)

### Task 2: DB スキーマとお客さん用 RPC

**Files:**
- Create: `supabase/migrations/0001_schema.sql`, `supabase/migrations/0002_customer_rpc.sql`, `tests/db/shim.sql`, `tests/db/harness.ts`
- Test: `tests/db/customer.test.ts`

**Interfaces:**
- Produces(テーブル):
  - `settings(id int pk check (id = 1), shop_name text not null default '模擬店')`、id=1 の行をマイグレーションで挿入
  - `menu_items(id uuid pk default gen_random_uuid(), name text not null, price_tickets int not null check (price_tickets between 1 and 99), sort_order int not null default 0, image_path text, is_visible bool not null default true, is_sold_out bool not null default false, created_at timestamptz default now())`
  - `orders(id uuid pk, business_date date not null default app_today(), number int not null, token uuid not null unique default gen_random_uuid(), status text not null default 'cooking' check (status in ('cooking','ready','delivered','cancelled')), created_at, ready_at, delivered_at, cancelled_at timestamptz, unique(business_date, number))`
  - `order_items(order_id uuid fk on delete cascade, menu_item_id uuid fk, name text not null, price_tickets int not null, quantity int not null check (quantity between 1 and 10), primary key(order_id, menu_item_id))`(name/price は注文時点のコピー)
  - `order_counters(business_date date pk, last_number int not null)`
  - `app_today() returns date` = `(now() at time zone 'Asia/Tokyo')::date`
- Produces(RPC、すべて `security definer`、`set search_path = public`、`anon` に execute 付与):
  - `place_order(p_items jsonb) returns json` → `{"token": uuid, "number": int}`。エラーは `raise exception` のメッセージで `empty_order` / `invalid_quantity` / `item_unavailable`(存在しない・非表示)/ `sold_out`
  - `get_my_order(p_token uuid) returns json` → `MyOrder` 形、または注文が無い・営業日が今日でない・`delivered`/`cancelled` のとき `null`
  - `cancel_my_order(p_token uuid) returns text` → `'cancelled'` / `'not_cancellable'`(cooking 以外)/ `'not_found'`
- 権限:全テーブルで RLS 有効。`anon` は `menu_items`(`is_visible` の行のみ)と `settings` の select だけ。`orders`/`order_items`/`order_counters` には anon/authenticated の権限なし
- Produces(テスト基盤):`createTestDb(): Promise<{ db: PGlite; asAnon<T>(sql: string, params?: unknown[]): Promise<T[]>; asService<T>(sql, params?): Promise<T[]> }>` — `shim.sql`(ロール `anon`, `authenticated`, `service_role` の作成、`realtime.send(payload jsonb, event text, topic text, private boolean)` を `realtime.sent_log` テーブルに挿入するスタブ)→ migrations を名前順に適用。`asAnon` は `set role anon` で実行して `reset role`

- [ ] **Step 1: 失敗するテストを書く** `customer.test.ts`(各テストで新しい DB)
  - `place_order` で品目2つ → 番号 1、続けてもう1件 → 番号 2。`order_items` にその時点の名前と枚数がコピーされている
  - 営業日が違う注文が既にあっても今日の番号は 1 から(`order_counters` に前日の行を入れて確認)
  - 空配列 → `empty_order`、数量 0 と 11 → `invalid_quantity`、非表示品目 → `item_unavailable`、売り切れ品目 → `sold_out`(Review Focus 1)
  - `get_my_order`:3件注文して3件目のトークン → `aheadCount: 2, waitingTotal: 3, status: 'cooking'`, `totalTickets` が合計枚数。1件目を `ready` にすると3件目は `aheadCount: 1, waitingTotal: 2`
  - `get_my_order`:`delivered`・`cancelled`・前日の注文・存在しないトークン → `null`(Review Focus 4)
  - `cancel_my_order`:cooking → `'cancelled'`、ready → `'not_cancellable'`(Review Focus 3)、不明 → `'not_found'`
  - 権限:`asAnon('select * from orders')` がエラー、`asAnon('select * from menu_items')` は非表示品目を返さない、`asAnon` で `update menu_items` がエラー
- [ ] **Step 2:** `npm test tests/db` → FAIL
- [ ] **Step 3:** マイグレーションとハーネスを実装。採番は `insert into order_counters … on conflict (business_date) do update set last_number = order_counters.last_number + 1 returning last_number` の1文で行う(同時注文でも重複しない)。`place_order` は品目を `for share` で読み、検証後に挿入
- [ ] **Step 4:** `npm test tests/db` → PASS
- [ ] **Step 5:** Commit `feat(db): schema and customer order RPCs`

### Task 3: スタッフ・集計・管理用 DB 関数と変更の合図

**Files:**
- Create: `supabase/migrations/0003_staff_rpc.sql`, `supabase/storage.sql`, `supabase/seed.sql`
- Test: `tests/db/staff.test.ts`

**Interfaces:**
- Consumes: Task 2 のテーブルと `createTestDb`
- Produces(すべて `security definer`、`service_role` にのみ execute、`public`/`anon` から revoke):
  - `staff_list_orders() returns json` → `{"cooking": StaffOrder[], "ready": StaffOrder[]}`(今日の営業日、それぞれ番号の昇順)
  - `staff_update_order(p_id uuid, p_action text) returns text`(新しい状態)。遷移:`complete` cooking→ready(ready_at 設定)、`deliver` ready→delivered、`revert` ready→cooking(ready_at を null)、`cancel` cooking|ready→cancelled。それ以外は `raise exception 'invalid_transition'`。`update … where id = p_id and status = <期待する状態>` で判定し、0行なら例外
  - `sales_summary(p_date date) returns json` → `SalesSummary`。`p_date` が null なら全日。`delivered` の注文のみ集計、`cancelledCount` は同じ範囲の取消件数、`dates` は注文がある営業日の降順一覧(範囲に関係なく全件)。items は `order_items.name` ごと、販売数の多い順
  - `admin_delete_menu_item(p_id uuid) returns text` → 注文が付いていれば `is_visible=false` にして `'hidden'`、なければ削除して `'deleted'`
  - `admin_reorder_menu(p_ids uuid[]) returns void` → 配列の順に `sort_order` を 0,1,2… に設定
  - トリガー `notify_shop_change()`:`orders` と `menu_items` と `settings` の insert/update/delete 後に `perform realtime.send(jsonb_build_object('table', TG_TABLE_NAME), 'changed', 'shop', false)`
- `storage.sql`:公開読み取りのバケット `menu-images` を作成(本番の Supabase にだけ適用。テストでは使わない)
- `seed.sql`:店名「3年1組 模擬店」、見本メニュー 焼きそば(3枚)/フランクフルト(2枚)/ジュース(1枚)

- [ ] **Step 1: 失敗するテストを書く** `staff.test.ts`
  - 遷移表の全組み合わせ:許可されたものは新しい状態を返し、`complete` を2回 → 2回目 `invalid_transition`(Review Focus 2)、delivered に `cancel` → `invalid_transition`
  - お客さんが取消済みの注文に `complete` → `invalid_transition`(Review Focus 3 のスタッフ側)
  - `staff_list_orders` は今日の cooking/ready だけを番号順で返し、delivered/cancelled/前日分を含まない
  - `sales_summary`:delivered 2件(焼きそば×2+ジュース×1、焼きそば×1)+取消1件+cooking 1件 → `ticketsTotal: 10, deliveredCount: 2, cancelledCount: 1`, items 先頭が `{name:'焼きそば', quantity:3, tickets:9}`。日付指定で前日分が除かれる
  - `admin_delete_menu_item`:注文あり → `'hidden'` かつ行が残る、注文なし → `'deleted'`
  - `admin_reorder_menu([c,a,b])` → sort_order が c=0, a=1, b=2
  - 注文作成・状態変更・メニュー更新で `realtime.sent_log` に `topic='shop', event='changed'` の行が増える
  - `asAnon('select staff_list_orders()')` と `asAnon('select sales_summary(null)')` がエラー
- [ ] **Step 2:** `npm test tests/db` → FAIL
- [ ] **Step 3:** `0003_staff_rpc.sql`、`storage.sql`、`seed.sql` を実装
- [ ] **Step 4:** `npm test tests/db` → PASS
- [ ] **Step 5:** Commit `feat(db): staff, sales, admin functions and change broadcast`

### Task 4: 合言葉ログインとページ保護

**Files:**
- Create: `src/lib/auth/session.ts`, `src/lib/auth/requireStaff.ts`, `src/proxy.ts`, `src/app/api/staff/login/route.ts`, `src/app/staff/login/page.tsx`, `src/lib/supabase/server.ts`, `src/lib/supabase/browser.ts`
- Test: `src/lib/auth/session.test.ts`

**Interfaces:**
- Produces:
  - `createSessionToken(secret: string, nowMs: number): Promise<string>` → `"<expiresAtMs>.<hmacSha256Hex>"`、有効期限 24 時間。Web Crypto(`crypto.subtle`)を使い、Edge/Node どちらでも動く
  - `verifySessionToken(token: string | undefined, secret: string, nowMs: number): Promise<boolean>`
  - Cookie 名 `staff_session`(httpOnly, sameSite=lax, secure は本番のみ, path=/)
  - `requireStaff(request: Request): Promise<Response | null>` → 無効なら `401` の `Response`、有効なら `null`
  - `POST /api/staff/login` body `{ passcode: string }` → 一致で Cookie を設定し `204`、不一致で `401`(比較は `crypto.timingSafeEqual` 相当)
  - `proxy.ts`:`/staff/:path*`(`/staff/login` を除く)と `/admin/:path*` で Cookie を検証し、無効なら `/staff/login?next=<元のパス>` へリダイレクト
  - `createServiceClient(): SupabaseClient`(`import 'server-only'`、service_role キー)
  - `getBrowserClient(): SupabaseClient`(anon キー、シングルトン)
- ログイン画面:合言葉の入力欄(type=password, label「合言葉」)と「ログイン」ボタン、失敗時「合言葉が違います」、成功で `next` へ

- [ ] **Step 1: 失敗するテストを書く** `session.test.ts`:作ったトークンは同じ secret・期限内で `true`;24時間+1ms 後は `false`;別 secret は `false`;署名部分を1文字変えると `false`;`undefined`・`''`・`'abc'` は `false`
- [ ] **Step 2:** `npm test src/lib/auth` → FAIL
- [ ] **Step 3:** 上記ファイルを実装
- [ ] **Step 4:** `npm test` → PASS、`npm run build` → 成功
- [ ] **Step 5:** Commit `feat(auth): staff passcode session and route protection`

### Task 5: お客さん画面

**Files:**
- Create: `src/lib/customer/tokenStore.ts`, `src/lib/customer/api.ts`, `src/lib/customer/errors.ts`, `src/lib/realtime/useShopChanges.ts`, `src/lib/menu/imageUrl.ts`, `src/components/customer/CustomerApp.tsx`, `MenuView.tsx`, `WaitingView.tsx`, `ReadyView.tsx`
- Modify: `src/app/page.tsx`, `src/app/layout.tsx`(lang="ja"、フォントと背景色)
- Test: `src/lib/customer/tokenStore.test.ts`, `src/lib/customer/errors.test.ts`

**Interfaces:**
- Consumes: `getBrowserClient`、`cart.ts`、RPC `place_order` / `get_my_order` / `cancel_my_order`、`menu_items` / `settings` の select
- Produces:
  - `createTokenStore(storage: Storage | null): { load(): string | null; save(t: string): void; clear(): void }` — localStorage キー `mogiten_order_token`。`storage` が null か、操作が例外を投げたらメモリに保持
  - `messageForOrderError(code: string): string`:`sold_out` →「売り切れになった商品があります。メニューを確認してください」、`item_unavailable` →「選べなくなった商品があります。メニューを確認してください」、`invalid_quantity` →「数量は1〜10個で選んでください」、`empty_order` →「商品を選んでください」、それ以外 →「注文できませんでした。もう一度お試しください」
  - `api.ts`:`fetchShop(): Promise<{ shopName: string; menu: MenuItem[] }>`、`placeOrder(cart: Cart): Promise<{ token: string; number: number }>`(失敗時は `Error(message=code)`)、`fetchMyOrder(token): Promise<MyOrder | null>`、`cancelMyOrder(token): Promise<'cancelled' | 'not_cancellable' | 'not_found'>`
  - `useShopChanges(onChange: () => void, pollMs: number): void` — `shop` チャンネルの broadcast `changed` を購読し、`pollMs` ごと・タブが表示に戻ったとき(`visibilitychange`)にも `onChange` を呼ぶ。お客さん画面は `pollMs = 15000`
  - `menuImageUrl(path: string | null): string | null` → `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menu-images/${path}`
- 画面(見本のメニュー/待機中/できました):
  - 起動時:トークンがあれば `fetchMyOrder`。`null` ならトークンを消してメニュー(Review Focus 4)
  - メニュー:店名、品目カード(写真があれば表示、−/数/+、売り切れは薄く「売り切れ」で操作不可)、下部に「合計 N 点 / 金券 N 枚」、「注文する」(0 点のとき無効)、「お支払いは受け取り時に金券でお願いします」
  - 注文失敗:`messageForOrderError` を表示し、`sold_out`/`item_unavailable` ならメニューを再取得してカートから該当品を外す(Review Focus 1)
  - 待機中:番号、「調理中」バッジ、「あなたの前に N 組」「全体の待ち N 組」、注文内容と金券合計、「この画面は自動で更新されます。閉じても、もう一度QRコードを読むとこの画面に戻れます。」、「注文を取り消す」(確認ダイアログ後)。結果が `not_cancellable` なら「すでに完成しているため取り消せません」を表示して再取得(Review Focus 3)
  - できました:背景 `#1A7F37` 全面、「できました」、大きな番号、「金券 N 枚 をご用意のうえ、受け取り口までお越しください」、注文内容
  - localStorage が使えないときは待機画面に「この画面を閉じると注文を確認できなくなります」を表示(Review Focus 5)

- [ ] **Step 1: 失敗するテストを書く**
  - `tokenStore.test.ts`:Map ベースの Storage 互換で save→load→clear;`createTokenStore(null)` でも save→load が動く;`getItem` が throw する Storage でも例外にならず save→load が動く(Review Focus 5)
  - `errors.test.ts`:上記5コードと未知コードの文言が完全一致
- [ ] **Step 2:** `npm test src/lib/customer` → FAIL
- [ ] **Step 3:** ライブラリと画面を実装
- [ ] **Step 4:** `npm test` → PASS、`npm run build` → 成功
- [ ] **Step 5:** 手動確認(`.env.local` に開発用 Supabase を設定し、`supabase/migrations/*` と `seed.sql` を適用済みの前提):スマホ幅で 注文 → 待機中 表示 → 別タブで SQL から `ready` に更新 → 15 秒以内に「できました」へ切り替わる;タブを閉じて開き直すと待機画面に戻る
- [ ] **Step 6:** Commit `feat(customer): menu, waiting and ready screens`

### Task 6: スタッフ画面

**Files:**
- Create: `src/lib/staff/board.ts`, `src/app/api/staff/orders/route.ts`, `src/app/api/staff/orders/[id]/route.ts`, `src/app/api/staff/menu/[id]/sold-out/route.ts`, `src/components/staff/StaffBoard.tsx`, `src/components/staff/OrderCard.tsx`
- Modify: `src/app/staff/page.tsx`
- Test: `src/lib/staff/board.test.ts`, `src/app/api/staff/orders/[id]/route.test.ts`

**Interfaces:**
- Consumes: `requireStaff`、`createServiceClient`、RPC `staff_list_orders` / `staff_update_order`、`useShopChanges`
- Produces:
  - `itemTotals(orders: StaffOrder[]): OrderLine[]` — 品目名ごとの数量合計、最初に現れた順
  - `elapsedMinutes(createdAt: string, nowMs: number): number`(切り捨て)
  - `isOverdue(createdAt: string, nowMs: number): boolean` → 10 分以上で `true`
  - `GET /api/staff/orders` → `{ cooking: StaffOrder[]; ready: StaffOrder[]; menu: MenuItem[] }`(menu は表示中の品目、sort_order 順)
  - `POST /api/staff/orders/[id]` body `{ action: StaffAction }` → `200 { status }`、`invalid_transition` のとき `409 { error: 'invalid_transition' }`、不正な action は `400`
  - `POST /api/staff/menu/[id]/sold-out` body `{ isSoldOut: boolean }` → `204`
  - すべてのハンドラは最初に `requireStaff`
- 画面(見本のスタッフ画面):ヘッダー(「注文」、調理中 N 組・受け取り待ち N 組、「売上集計を見る」→ `/staff/sales`、「メニュー管理」→ `/admin`)、作る数の合計、左「調理中(古い順)」(番号・品目・時刻・「N分経過」、10分以上は枠と時刻を `#C76E00`/`#8A4B00` で強調、「取消」「完成」)、右「受け取り待ち」(番号・品目・金券枚数、「受渡済」「調理中に戻す」「取消」)、下部「販売状況」(品目ごとに 販売中/売り切れ を切り替え)。取消は確認ダイアログ。経過時間は 30 秒ごとに再計算。`pollMs = 10000`
  - 操作の応答が `409` のときは「他の端末で先に操作されました」を短く表示して再取得(Review Focus 2)。操作中はそのボタンを無効化(二度押し防止)

- [ ] **Step 1: 失敗するテストを書く**
  - `board.test.ts`:`[{items:[焼きそば×2, フランク×1]},{items:[焼きそば×1]}]` → `[{焼きそば,3},{フランク,1}]`;`isOverdue` は 9分59秒で `false`、10分0秒で `true`;`elapsedMinutes` は 90 秒で 1
  - `route.test.ts`(`requireStaff` と `createServiceClient` を `vi.mock`):未ログイン → 401;`action: 'eat'` → 400;rpc が `invalid_transition` エラーを返す → 409 `{error:'invalid_transition'}`;成功 → 200 `{status:'ready'}`
- [ ] **Step 2:** `npm test src/lib/staff src/app/api/staff` → FAIL
- [ ] **Step 3:** 実装
- [ ] **Step 4:** `npm test` → PASS、`npm run build` → 成功
- [ ] **Step 5:** 手動確認:お客さん画面から注文 → スタッフ画面に数秒以内に出る → 完成 → お客さん画面が「できました」→ 受渡済で消える;2つのタブで同じ注文を完成 → 片方に「他の端末で先に操作されました」;売り切れにするとお客さんのメニューで選べなくなる
- [ ] **Step 6:** Commit `feat(staff): order board with realtime updates`

### Task 7: 売上集計ページ

**Files:**
- Create: `src/app/api/staff/sales/route.ts`, `src/components/staff/SalesView.tsx`
- Modify: `src/app/staff/sales/page.tsx`
- Test: `src/app/api/staff/sales/route.test.ts`

**Interfaces:**
- Consumes: `requireStaff`、`createServiceClient`、RPC `sales_summary`
- Produces:`GET /api/staff/sales?date=YYYY-MM-DD|all`(省略時は今日の営業日)→ `SalesSummary`。日付の形式が不正なら `400`
- 画面(見本の売上集計):「‹ 注文に戻る」、日付の切り替え(`dates` の各日を「M/D」+「合計」)、カード3枚(受け取り済みの金券 N 枚 / 受け渡した注文 N 件 / 取り消し N 件)、品目ごとの表(品目・横棒(最大を100%)・個数・金券)。注文が無い日は「まだ受け渡した注文はありません」

- [ ] **Step 1: 失敗するテストを書く** `route.test.ts`(mock):未ログイン → 401;`date=2026-13-01` → 400;`date=all` で rpc に `p_date: null`;省略時は今日(Asia/Tokyo)の日付文字列を渡す(`vi.setSystemTime` で `2026-11-17T15:30:00Z` → `'2026-11-18'`)
- [ ] **Step 2:** `npm test src/app/api/staff/sales` → FAIL
- [ ] **Step 3:** 実装
- [ ] **Step 4:** `npm test` → PASS、`npm run build` → 成功
- [ ] **Step 5:** Commit `feat(staff): sales summary page`

### Task 8: メニュー管理画面

**Files:**
- Create: `src/lib/admin/validate.ts`, `src/app/api/admin/menu/route.ts`, `src/app/api/admin/menu/[id]/route.ts`, `src/app/api/admin/menu/[id]/image/route.ts`, `src/app/api/admin/menu/reorder/route.ts`, `src/app/api/admin/settings/route.ts`, `src/components/admin/MenuEditor.tsx`, `src/components/admin/MenuRow.tsx`
- Modify: `src/app/admin/page.tsx`
- Test: `src/lib/admin/validate.test.ts`

**Interfaces:**
- Consumes: `requireStaff`、`createServiceClient`、RPC `admin_delete_menu_item` / `admin_reorder_menu`、`menuImageUrl`
- Produces:
  - `validateMenuInput(input: { name?: unknown; priceTickets?: unknown }): { ok: true; value: { name: string; priceTickets: number } } | { ok: false; error: string }` — 名前は前後の空白を除いて 1〜30 文字(エラー「商品名は1〜30文字で入力してください」)、枚数は整数 1〜99(「金券の枚数は1〜99の整数で入力してください」)
  - `validateImage(file: { type: string; size: number }): string | null` — `image/jpeg|png|webp` かつ 5MB 以下なら `null`、それ以外はエラー文(「JPEG・PNG・WebPの画像を選んでください」/「画像は5MB以下にしてください」)
  - `GET /api/admin/menu` → `{ shopName: string; menu: MenuItem[] }`(非表示も含む、sort_order 順)
  - `POST /api/admin/menu` `{ name, priceTickets }` → `201 MenuItem`(sort_order は末尾)
  - `PATCH /api/admin/menu/[id]` `{ name?, priceTickets?, isVisible?, isSoldOut? }` → `200 MenuItem`
  - `DELETE /api/admin/menu/[id]` → `200 { result: 'deleted' | 'hidden' }`
  - `POST /api/admin/menu/[id]/image` multipart `file` → `menu-images/<id>/<timestamp>.<ext>` に保存し `image_path` を更新、古い画像は削除 → `200 MenuItem`。`DELETE` で画像を外す
  - `POST /api/admin/menu/reorder` `{ ids: string[] }` → `204`
  - `PATCH /api/admin/settings` `{ shopName }`(1〜30文字)→ `204`
  - 検証エラーはすべて `400 { error: <文言> }`
- 画面:見出し「メニュー管理」、「‹ 注文に戻る」、店名の入力と保存、品目一覧(写真のサムネイルと変更/削除、名前、金券枚数、表示する/しない、売り切れ、上へ/下へ、削除)、末尾に「商品を追加」。削除の結果が `hidden` のときは「注文履歴があるため、削除の代わりに非表示にしました」を表示。保存の失敗はその行にエラー文を表示

- [ ] **Step 1: 失敗するテストを書く** `validate.test.ts`:`{name:'  焼きそば ', priceTickets:3}` → ok で name `'焼きそば'`;name `''`・`'   '`・31文字 → 商品名エラー;priceTickets `0`・`100`・`1.5`・`'3'` → 枚数エラー;画像 `image/gif` → 形式エラー、`image/png` 5MB+1 バイト → サイズエラー、`image/webp` 1KB → `null`
- [ ] **Step 2:** `npm test src/lib/admin` → FAIL
- [ ] **Step 3:** 実装
- [ ] **Step 4:** `npm test` → PASS、`npm run build` → 成功
- [ ] **Step 5:** 手動確認:商品の追加 → お客さんのメニューに出る;写真の登録 → 両画面に表示;並べ替えが反映;注文済み商品の削除 → 非表示になりメッセージ表示;店名の変更がお客さん画面に反映
- [ ] **Step 6:** Commit `feat(admin): menu management`

### Task 9: README(セットアップ・店舗追加・当日前チェック)

**Files:**
- Create: `README.md`

README に以下を手順として書く(日本語):
1. Supabase プロジェクト作成 → SQL Editor で `supabase/migrations/0001〜0003` を順に実行 → `storage.sql` → 必要なら `seed.sql`。Realtime の設定で公開チャンネル(private 限定にしない)であることを確認
2. Vercel で GitHub リポジトリを Import → 5つの環境変数を設定(`SESSION_SECRET` は `openssl rand -hex 32` で作る)→ デプロイ。Hobby プランは非営利の個人利用が条件なので規約を確認すること
3. QR ポスター:公開 URL(トップページ)を QR コードにして印刷
4. スタッフ:`/staff` を開き合言葉でログイン。メニューは `/admin`
5. **店舗を追加する**:その店舗のメンバーが自分の Supabase アカウントでプロジェクトを作り 1 を実行 → 同じ Vercel アカウントで同じリポジトリから新しいプロジェクトを作り、その店舗の環境変数を設定。1人が無料枠を増やす目的で複数アカウントを作らないこと
6. **学園祭の数日前チェック**:Supabase の無料プロジェクトは1週間使われないと停止する。数日前にダッシュボードを開いて起動していることを確認し、お客さん画面で注文 → スタッフ画面で完成 → 受渡済 まで一通り試す。テスト注文は集計に入らないよう取消にする
7. 開発:`npm install`、`.env.local`、`npm run dev`、`npm test`

- [ ] **Step 1:** README を書く
- [ ] **Step 2:** `npm test` → 全 PASS、`npm run build` → 成功、`npm run lint` → エラーなし
- [ ] **Step 3:** Commit `docs: setup, multi-shop and pre-festival checklist`
