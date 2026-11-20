'use client';

import { useEffect, useRef } from 'react';
import type { CartLine } from '@/lib/cart';

type Props = {
  lines: CartLine[];
  totalTickets: number;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Bottom sheet shown before an order is sent: customers cannot cancel afterwards. */
export function ConfirmSheet({ lines, totalTickets, onConfirm, onCancel }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button type="button" aria-label="戻る" onClick={onCancel} className="absolute inset-0 bg-black/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="sheet-in relative flex max-h-[85dvh] w-full max-w-md flex-col gap-4 rounded-t-3xl bg-card px-5 pt-3 pb-8"
      >
        <div className="mx-auto h-1.5 w-10 rounded-full bg-line" aria-hidden="true" />
        <h2 id="confirm-title" className="text-xl font-bold">
          この内容で注文しますか？
        </h2>
        <ul className="flex flex-col gap-3 overflow-y-auto">
          {lines.map((l, i) => (
            <li key={l.id} className="flex flex-col gap-3">
              {i > 0 && <div className="h-px bg-line" />}
              <div className="flex items-baseline justify-between gap-3 text-[17px]">
                <span className="min-w-0 break-words">{l.name}</span>
                <span className="shrink-0">
                  ×{l.quantity}
                  <span className="ml-3 text-[15px] text-sub">金券 {l.tickets}枚</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-[15px] text-sub">お支払い(受け取り時)</span>
          <span className="text-xl font-bold">金券 {totalTickets}枚</span>
        </div>
        <p className="rounded-xl bg-ground px-4 py-3 text-[13px] leading-relaxed text-sub">
          注文を確定すると、この画面からは取り消せません。変更・取り消しは店頭のスタッフにお声がけください。
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-13 flex-1 rounded-[14px] bg-ground text-[17px] font-semibold"
          >
            戻る
          </button>
          <button ref={confirmRef} type="button" onClick={onConfirm} className="btn-primary h-13 flex-[2]">
            注文を確定する
          </button>
        </div>
      </div>
    </div>
  );
}
