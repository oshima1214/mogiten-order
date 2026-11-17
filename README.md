# 模擬店 注文システム

学園祭の模擬店で使う注文・呼び出しアプリです。

- **お客さん**:店頭の QR コードを読む → スマホでメニューを選んで注文 → 自分の番号・状態・前の待ち組数を確認 → 「できました」になったら金券を持って受け取り
- **スタッフ**(`/staff`):注文の確認 → 完成 → 受渡済、売り切れの切り替え、売上集計(`/staff/sales`)
- **管理**(`/admin`):メニューの追加・編集・写真・並べ替え・表示/非表示、店名

構成:Next.js(画面とスタッフ用 API)を Vercel で公開し、データは Supabase(PostgreSQL・Realtime・Storage)に置きます。設計は `docs/superpowers/specs/2026-11-17-mogiten-order-design.md` を参照してください。

---

## 1. Supabase の準備

1. [Supabase](https://supabase.com/) でプロジェクトを作成します(リージョンは Tokyo がおすすめ)。
2. ダッシュボードの **SQL Editor** で、次のファイルの中身を **この順番で** 1つずつ貼り付けて実行します。
   1. `supabase/migrations/0001_schema.sql`
   2. `supabase/migrations/0002_customer_rpc.sql`
   3. `supabase/migrations/0003_staff_rpc.sql`
   4. `supabase/storage.sql`(メニュー写真の保存場所)
   5. `supabase/seed.sql`(見本メニュー。不要なら実行しなくてかまいません)
3. **Realtime の設定**:Project Settings → Realtime で、公開チャンネルが使える設定(「Private channels only」のような制限を **オフ**)になっていることを確認します。注文やメニューが変わったときの「変わった」という合図をこの公開チャンネルで送っています(中身は含みません)。
4. **Project Settings → API**(または API Keys)で次の3つを控えます。
   - Project URL
   - anon(public)キー
   - service_role(secret)キー ※ **絶対に公開しないこと**

## 2. Vercel で公開する

1. このリポジトリを GitHub に置きます。
2. [Vercel](https://vercel.com/) で **Add New → Project** からリポジトリを Import します。
3. **Environment Variables** に次の5つを設定します。

   | 名前 | 値 |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase の Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon キー |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role キー |
   | `STAFF_PASSCODE` | スタッフ画面の合言葉(推測されにくいもの) |
   | `SESSION_SECRET` | ランダムな長い文字列(下のコマンドで作れます) |

   ```bash
   openssl rand -hex 32
   ```

4. **Deploy** を押します。以後は GitHub に push するたびに自動で更新されます。

> Vercel の無料(Hobby)プランは **非営利の個人利用** が条件です。使う前に規約を確認してください。

## 3. 当日の使い方

- **QR ポスター**:公開 URL(トップページ、例 `https://xxxx.vercel.app/`)を QR コードにして印刷し、店頭に貼ります。全員が同じ QR を使います。
- **スタッフ**:タブレットなどで `/staff` を開き、合言葉でログインします(24時間有効)。
- **メニュー**:`/admin` で登録します。注文が入ったことのある商品は、削除すると「非表示」になります(集計を残すため)。
- 番号は毎日 1 番から始まります(日本時間の日付で区切ります)。
- お客さんの画面は開いている間、自動で更新されます(合図を受けたとき+15秒ごと)。通知や音は鳴りません。

## 4. 学園祭の数日前チェック(必ず)

Supabase の無料プロジェクトは **1週間使われないと自動で停止** します。

1. 数日前に Supabase のダッシュボードを開き、プロジェクトが動いている(Paused になっていない)ことを確認します。停止していたら Restore します。
2. 本番の URL で一通り試します:お客さんの画面で注文 → スタッフ画面に出る → 完成 → お客さんの画面が「できました」になる → 受渡済。写真の登録も試します。
3. 試した注文は集計に入らないよう、受渡済にせず **取消** にしてください。

## 5. 店舗を追加する(複数の模擬店で使う場合)

アプリは1店舗用です。店舗ごとに Supabase と Vercel のプロジェクトを1つずつ用意します。コードは同じリポジトリを使い回します。

1. **その店舗のメンバーが、自分の Supabase アカウントで** プロジェクトを作り、「1. Supabase の準備」を行います。
   - 1人が無料枠を増やす目的で複数のアカウントを作ることはしないでください(規約違反になる可能性があります)。
2. Vercel では **同じアカウント** で **Add New → Project** から同じリポジトリをもう一度 Import し、その店舗の Supabase の値と合言葉で環境変数を設定します。
3. その店舗の URL で QR ポスターを作ります。

アプリを直して GitHub に push すると、全店舗に自動で反映されます。

---

## 開発

```bash
npm install
cp .env.example .env.local   # 値を入れる(開発用の Supabase プロジェクト)
npm run dev
```

```bash
npm test    # 単体テストと DB テスト(PGlite で動くので Docker 不要)
npm run lint
npm run build
```

- DB のテストは `tests/db/` にあり、`supabase/migrations/` をそのまま PGlite に適用して、権限・番号の振り分け・状態の遷移・集計を確かめます。
- service_role キーを使うコードは `src/lib/supabase/server.ts` だけで、`server-only` によりブラウザ側に含まれないようにしています。
