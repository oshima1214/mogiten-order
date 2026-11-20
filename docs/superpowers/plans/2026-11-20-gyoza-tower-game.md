# 餃子タワー Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** メニュー画面と待機画面から遊べる積み上げゲームを追加する。

**Architecture:** ロジックは純粋関数で `src/lib/game/tower.ts` と `bestScore.ts` に置く。描画は `src/components/game/GyozaTower.tsx` が Canvas で行う。`GameOverlay.tsx` が全画面に重ねて表示し、呼び出しの帯も出す。`CustomerApp` がこれを `next/dynamic` で読み込む。

**Tech Stack:** 既存のまま

**Spec:** `docs/superpowers/specs/2026-11-20-gyoza-tower-game-design.md`

## Global Constraints
- 座標は「画面幅 = 1」の比率で持つ(端末の幅に依存させない)
- 速さ(画面幅/秒):`min(1.2, 0.45 + 0.08 * floor(score / 5))`
- PERFECT 補正:ずれが幅の 3% 未満なら下の餃子に合わせる
- localStorage のキー:`mogiten_gyoza_best`

## Review Focus
1. ゲーム中に注文ができあがる → 帯が出て、押すと閉じる(ブラウザで確認)
2. localStorage が使えない → 自己ベストはメモリで保持し、エラーにしない(Task 1)
3. 端でのはね返り → 揺れが画面外に出ない(Task 1)
4. 完全に外れる / 端がぴったり接するだけ → ゲームオーバー(Task 1)
5. 画面に表示していない間 → 描画ループが止まり、戻ると dt が大きく飛ばない(GyozaTower で dt を上限 0.05 秒に制限する)

### Task 1: ロジック
**Files:** `src/lib/game/tower.ts`, `src/lib/game/tower.test.ts`, `src/lib/game/bestScore.ts`, `src/lib/game/bestScore.test.ts`
**Interfaces:**
- `type Block = { x: number; width: number }`(左端と幅。画面幅 = 1)
- `dropBlock(base: Block, falling: Block): { placed: Block; cut: Block | null; perfect: boolean } | null`(null はゲームオーバー)
- `swingSpeed(score: number): number`
- `stepSwing(x: number, width: number, dir: 1 | -1, speed: number, dt: number): { x: number; dir: 1 | -1 }`(0 ≤ x ≤ 1 - width の範囲ではね返る)
- `createBestStore(storage: Storage | null): { load(): number; save(score: number): number }`(save は更新後のベストを返す)
- [ ] テスト → FAIL → 実装 → PASS → commit

### Task 2: 画面
**Files:** `src/components/game/GyozaTower.tsx`, `src/components/game/GameOverlay.tsx`。変更:`CustomerApp.tsx`, `MenuView.tsx`, `WaitingView.tsx`
- [ ] 実装 → `npm test` / lint / build → ブラウザで確認(タップで積める、ゲームオーバー、自己ベスト、ready の帯)→ commit
