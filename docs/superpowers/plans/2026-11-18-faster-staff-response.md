# スタッフ操作の応答速度改善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** スタッフ画面のボタン操作を押した瞬間に反映し、サーバーを東京に置く。

**Architecture:** 純粋関数 `applyStaffAction` / `applySoldOut` で画面の状態を先に変え、そのあと API を呼ぶ。失敗したら取り直す。`latestOnly` に `invalidate()` を足し、楽観的更新より前に始まった取得結果を捨てる。Vercel の関数リージョンは `vercel.json` で `hnd1` に固定する。

**Tech Stack:** 既存のまま

**Spec:** `docs/superpowers/specs/2026-11-18-faster-staff-response-design.md`

## Global Constraints
- 受け取り待ち・調理中の列は、どちらも番号の昇順
- トーストの文言は既存のまま(「他の端末で先に操作されました」「操作できませんでした。もう一度お試しください」)

## Review Focus
1. 押した直後に、その前から走っていた自動更新の古い結果で画面が巻き戻る → `invalidate()` で捨てる(Task 1 のテスト)
2. 409 / 通信失敗 → 取り直して正しい状態に戻り、トーストが出る(StaffBoard、ブラウザで確認)
3. 存在しない id への操作 → 状態は変えない(Task 1)
4. revert で、受け取り待ちから調理中の正しい番号位置へ戻る(Task 1)
5. 同じ注文の二度押し → ボタンは busy で無効化済み。楽観的更新が二重に掛かっても壊れない(Task 1:complete を2回適用しても1件のまま)

---

### Task 1: 楽観的更新

**Files:** Create `src/lib/staff/optimistic.ts`, `src/lib/staff/optimistic.test.ts`. Modify `src/lib/latest.ts`, `src/lib/latest.test.ts`, `src/components/staff/StaffBoard.tsx`

**Interfaces:**
- `type StaffBoardState = { cooking: StaffOrder[]; ready: StaffOrder[]; menu: MenuItem[] }`
- `applyStaffAction(board: StaffBoardState, orderId: string, action: StaffAction, nowIso: string): StaffBoardState`
- `applySoldOut(board: StaffBoardState, itemId: string, isSoldOut: boolean): StaffBoardState`
- `latestOnly()` は、関数に `invalidate(): void` プロパティを付けて返す

- [ ] **Step 1: テスト**
  - complete:cooking から外れ、ready に `status:'ready'`、`readyAt: now` で番号順に入る
  - deliver / cancel(ready から):ready から消える。cancel(cooking から):cooking から消える
  - revert:ready から外れ、cooking の番号順の位置に `readyAt: null` で入る
  - 不明な id:同じ内容のまま
  - complete を2回適用しても ready に1件だけ
  - applySoldOut:該当品だけ反転し、ほかの品は変えない。入力は変更しない
  - latest:`invalidate()` 前に始まった呼び出しは STALE、後に始まったものは値を返す
- [ ] **Step 2:** `npx vitest run src/lib/staff src/lib/latest.test.ts` → FAIL
- [ ] **Step 3:** 実装し、StaffBoard の act / toggleSoldOut で、楽観的更新 → `invalidate()` → API → 失敗時はトースト → `load()` の順にする
- [ ] **Step 4:** `npm test` / `npm run lint` / `npm run build` → PASS
- [ ] **Step 5:** Commit `feat(staff): optimistic updates on the board`

### Task 2: 東京リージョンと README

**Files:** Create `vercel.json`. Modify `README.md`
- [ ] **Step 1:** `vercel.json` を `{ "regions": ["hnd1"] }` で作る
- [ ] **Step 2:** README の Supabase 準備で Tokyo を必須として明記する。「Supabase を作り直す(リージョン変更)」の節を追加する
- [ ] **Step 3:** `npm run build` → 成功。Commit `chore: run functions in Tokyo and document region move`
