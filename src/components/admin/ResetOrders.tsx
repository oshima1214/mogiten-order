'use client';

import { useState, type FormEvent } from 'react';
import { RESET_CONFIRM_WORD } from '@/lib/admin/validate';

/** Danger zone: wipes every order, the sales record and the numbering. */
export function ResetOrders() {
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const res = await fetch('/api/admin/orders/reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ confirm }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setConfirm('');
      setResult({ ok: true, text: '注文データを削除しました' });
    } else {
      setResult({ ok: false, text: '削除できませんでした。もう一度お試しください' });
    }
  }

  return (
    <form onSubmit={submit} className="card mt-6 flex flex-col gap-3 p-4 ring-1 ring-danger/30 ring-inset">
      <h2 className="text-[17px] font-semibold text-danger">注文データの削除</h2>
      <p className="text-[15px] leading-relaxed text-sub">
        すべての注文・売上の記録・番号を削除します。元に戻せません。メニューと写真は残ります。
        リハーサルの試し注文を本番前に消すときなどに使ってください。
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-[13px] text-sub">
          確認のため「{RESET_CONFIRM_WORD}」と入力
          <input
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setResult(null);
            }}
            autoComplete="off"
            className="h-11 rounded-xl bg-ground px-3 text-[17px] text-ink outline-none focus:ring-2 focus:ring-danger"
          />
        </label>
        <button
          type="submit"
          disabled={busy || confirm !== RESET_CONFIRM_WORD}
          className="h-11 rounded-xl bg-danger px-5 text-[15px] font-semibold text-white disabled:opacity-40"
        >
          注文データを削除
        </button>
      </div>
      {result && (
        <p role={result.ok ? 'status' : 'alert'} className={`text-sm font-semibold ${result.ok ? 'text-done' : 'text-danger'}`}>
          {result.text}
        </p>
      )}
    </form>
  );
}
