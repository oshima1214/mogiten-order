'use client';

import { elapsedMinutes, isOverdue } from '@/lib/staff/board';
import type { StaffAction, StaffOrder } from '@/lib/types';

type Props = {
  order: StaffOrder;
  nowMs: number;
  busy: boolean;
  onAction: (order: StaffOrder, action: StaffAction) => void;
};

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });

const itemsText = (o: StaffOrder) => o.items.map((l) => `${l.name} ×${l.quantity}`).join(' · ');

export function CookingCard({ order, nowMs, busy, onAction }: Props) {
  const overdue = isOverdue(order.createdAt, nowMs);
  return (
    <li className={`card flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4 ${overdue ? 'ring-2 ring-wait ring-inset' : ''}`}>
      <span className="w-14 text-[34px] font-bold">{order.number}</span>
      <div className="flex min-w-40 flex-1 flex-col gap-1">
        <span className="text-[17px] font-semibold">{itemsText(order)}</span>
        <span className={`text-[13px] ${overdue ? 'font-semibold text-wait-ink' : 'text-sub'}`}>
          {time(order.createdAt)} · {elapsedMinutes(order.createdAt, nowMs)}分経過
        </span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction(order, 'cancel')}
          className="h-11 rounded-xl px-3.5 text-[15px] text-sub disabled:opacity-40"
        >
          取消
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction(order, 'complete')}
          className="btn-primary h-13 px-7"
        >
          完成
        </button>
      </div>
    </li>
  );
}

export function ReadyCard({ order, busy, onAction }: Props) {
  return (
    <li className="card flex flex-col gap-3 px-5 py-4">
      <div className="flex items-center gap-4">
        <span className="text-[34px] font-bold text-done">{order.number}</span>
        <div className="flex flex-col gap-0.5">
          <span className="text-[17px] font-semibold">{itemsText(order)}</span>
          <span className="text-[13px] text-sub">金券 {order.totalTickets}枚</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction(order, 'deliver')}
          className="h-12 flex-1 rounded-xl bg-done text-[17px] font-semibold text-white disabled:opacity-40"
        >
          受渡済
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction(order, 'revert')}
          className="h-12 rounded-xl bg-ground px-3.5 text-[15px] disabled:opacity-40"
        >
          調理中に戻す
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction(order, 'cancel')}
          className="h-12 rounded-xl px-3.5 text-[15px] text-sub disabled:opacity-40"
        >
          取消
        </button>
      </div>
    </li>
  );
}
