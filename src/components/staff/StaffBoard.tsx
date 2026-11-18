'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { postJson } from '@/lib/http';
import { latestOnly, STALE } from '@/lib/latest';
import { useShopChanges } from '@/lib/realtime/useShopChanges';
import { itemTotals } from '@/lib/staff/board';
import { applySoldOut, applyStaffAction, type StaffBoardState } from '@/lib/staff/optimistic';
import type { MenuItem, StaffAction, StaffOrder } from '@/lib/types';
import { CookingCard, ReadyCard } from './OrderCard';

type Board = StaffBoardState;

export function StaffBoard() {
  const latest = useRef(latestOnly());
  // Actions still waiting for the server; refetches are not applied meanwhile so the
  // optimistic board is not overwritten by data read before the change was saved.
  const pending = useRef(0);
  const [board, setBoard] = useState<Board | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();
  // 0 until mounted: Date.now() must not run during prerender.
  const [nowMs, setNowMs] = useState(0);

  const load = useCallback(async () => {
    const res = await latest.current(
      fetch('/api/staff/orders', { cache: 'no-store' })
        .then(async (r) => ({ status: r.status, ok: r.ok, body: r.ok ? ((await r.json()) as Board) : null }))
        .catch(() => null),
    );
    if (res === STALE || pending.current > 0) return;
    if (res?.status === 401) {
      router.replace('/staff/login?next=/staff');
      return;
    }
    if (res?.body) setBoard(res.body);
    setNowMs(Date.now());
  }, [router]);

  useEffect(() => {
     
    void load();
    const tick = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(tick);
  }, [load]);
  useShopChanges(() => void load(), 10_000);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  async function withBusy(key: string, fn: () => Promise<void>) {
    setBusy((b) => new Set(b).add(key));
    try {
      await fn();
    } finally {
      setBusy((b) => {
        const n = new Set(b);
        n.delete(key);
        return n;
      });
    }
  }

  /** Shows the change at once, then saves it; on failure re-reads the real state. */
  async function optimistic(
    key: string,
    apply: (b: Board) => Board,
    send: () => Promise<Response | null>,
    onFail: (res: Response | null) => string,
  ) {
    setBoard((b) => (b ? apply(b) : b));
    latest.current.invalidate();
    pending.current++;
    await withBusy(key, async () => {
      const res = await send();
      if (!res?.ok) setToast(onFail(res));
    });
    pending.current--;
    await load();
  }

  function act(order: StaffOrder, action: StaffAction) {
    if (action === 'cancel' && !window.confirm(`${order.number}番の注文を取り消しますか？`)) return;
    void optimistic(
      order.id,
      (b) => applyStaffAction(b, order.id, action, new Date().toISOString()),
      () => postJson(`/api/staff/orders/${order.id}`, { action }),
      (res) => (res?.status === 409 ? '他の端末で先に操作されました' : '操作できませんでした。もう一度お試しください'),
    );
  }

  function toggleSoldOut(item: MenuItem) {
    void optimistic(
      item.id,
      (b) => applySoldOut(b, item.id, !item.isSoldOut),
      () => postJson(`/api/staff/menu/${item.id}/sold-out`, { isSoldOut: !item.isSoldOut }),
      () => '切り替えられませんでした。もう一度お試しください',
    );
  }

  if (!board) return <p className="m-auto text-sub">読み込み中…</p>;
  const totals = itemTotals(board.cooking);

  return (
    <div className="flex min-h-dvh flex-col gap-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-4">
          <h1 className="text-[28px] font-bold tracking-tight">注文</h1>
          <span className="text-[15px] text-sub">
            調理中 <b className="text-ink">{board.cooking.length}</b> 組 · 受け取り待ち{' '}
            <b className="text-ink">{board.ready.length}</b> 組
          </span>
        </div>
        <nav className="flex gap-2">
          <Link href="/staff/sales" className="rounded-full bg-card px-4 py-2.5 text-[15px] font-semibold text-accent-strong">
            売上集計を見る
          </Link>
          <Link href="/admin" className="rounded-full bg-card px-4 py-2.5 text-[15px] font-semibold text-accent-strong">
            メニュー管理
          </Link>
        </nav>
      </header>

      <section className="card flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4">
        <span className="text-[13px] font-semibold text-sub">作る数の合計</span>
        {totals.length === 0 && <span className="text-[15px] text-sub">なし</span>}
        {totals.map((t) => (
          <span key={t.name} className="text-xl font-bold">
            {t.name} {t.quantity}
          </span>
        ))}
      </section>

      <div className="flex flex-1 flex-wrap items-start gap-4">
        <section className="flex min-w-0 flex-[999_1_520px] flex-col gap-2.5">
          <h2 className="mx-1 text-[13px] font-semibold text-sub">調理中(古い順)</h2>
          <ul className="flex flex-col gap-2.5">
            {board.cooking.length === 0 && <li className="card p-5 text-sub">調理中の注文はありません</li>}
            {board.cooking.map((o) => (
              <CookingCard key={o.id} order={o} nowMs={nowMs} busy={busy.has(o.id)} onAction={act} />
            ))}
          </ul>
        </section>
        <section className="flex min-w-0 flex-[1_1_360px] flex-col gap-2.5">
          <h2 className="mx-1 text-[13px] font-semibold text-sub">受け取り待ち</h2>
          <ul className="flex flex-col gap-2.5">
            {board.ready.length === 0 && <li className="card p-5 text-sub">受け取り待ちはありません</li>}
            {board.ready.map((o) => (
              <ReadyCard key={o.id} order={o} nowMs={nowMs} busy={busy.has(o.id)} onAction={act} />
            ))}
          </ul>
        </section>
      </div>

      <section className="card flex flex-wrap items-center gap-2.5 px-5 py-3">
        <span className="mr-1.5 text-[13px] font-semibold text-sub">販売状況</span>
        {board.menu.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={busy.has(m.id)}
            onClick={() => toggleSoldOut(m)}
            aria-pressed={m.isSoldOut}
            className={`h-11 rounded-full px-4 text-[15px] font-semibold disabled:opacity-40 ${
              m.isSoldOut ? 'bg-line text-ink' : 'bg-done-soft text-done-ink'
            }`}
          >
            {m.name} {m.isSoldOut ? '売り切れ' : '販売中'}
          </button>
        ))}
      </section>

      {toast && (
        <p
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-white shadow-lg"
        >
          {toast}
        </p>
      )}
    </div>
  );
}
