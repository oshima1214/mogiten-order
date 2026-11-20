'use client';

import type { MyOrder } from '@/lib/types';
import { CookingAnimation } from './CookingAnimation';
import { PlayButton } from '@/components/game/PlayButton';

type Props = {
  shopName: string;
  order: MyOrder;
  persistent: boolean;
  onPlay: () => void;
  playError: string | null;
};

export function OrderLines({ order, tone }: { order: MyOrder; tone: 'light' | 'dark' }) {
  const divider = tone === 'light' ? 'bg-line' : 'bg-white/20';
  return (
    <div className="flex flex-col gap-3">
      {order.items.map((line, i) => (
        <div key={line.name} className="flex flex-col gap-3">
          {i > 0 && <div className={`h-px ${divider}`} />}
          <div className="flex justify-between text-[17px]">
            <span>{line.name}</span>
            <span>×{line.quantity}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Everything fits on one screen (no scrolling): the illustration shrinks on short phones. */
export function WaitingView({ shopName, order, persistent, onPlay, playError }: Props) {
  const summary = order.items.map((l) => `${l.name} ×${l.quantity}`).join('、');
  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col gap-3 overflow-hidden px-4 pt-4 pb-4">
      <p className="mx-1 shrink-0 text-[13px] font-medium text-sub">{shopName}</p>

      <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 rounded-3xl bg-card px-5 py-4">
        <p className="shrink-0 text-[15px] text-sub">あなたの番号</p>
        <p className="shrink-0 text-[72px] leading-none font-bold tracking-tighter">{order.number}</p>
        <CookingAnimation className="min-h-0 w-full max-w-[300px] flex-1" />
        <p className="flex shrink-0 items-center gap-2 rounded-full bg-wait-soft px-4 py-1.5 text-wait-ink">
          <span className="h-2 w-2 rounded-full bg-wait" aria-hidden="true" />
          <span className="text-[15px] font-semibold">調理中</span>
        </p>
        <div className="mt-2 flex shrink-0 items-baseline justify-center gap-4 text-[13px] whitespace-nowrap text-sub">
          <span>
            あなたの前に <b className="text-[24px] text-ink">{order.aheadCount}</b>組
          </span>
          <span className="h-4 w-px self-center bg-line" aria-hidden="true" />
          <span>
            全体の待ち <b className="text-[24px] text-ink">{order.waitingTotal}</b>組
          </span>
        </div>
      </section>

      <section className="flex shrink-0 items-center gap-3 rounded-[20px] bg-card px-5 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-sub">ご注文</p>
          <p className="line-clamp-2 text-[15px]">{summary}</p>
        </div>
        <p className="shrink-0 text-[17px] font-bold">金券 {order.totalTickets}枚</p>
      </section>

      <PlayButton onPlay={onPlay} error={playError} className="shrink-0" />

      <p className="mx-1 shrink-0 text-[12px] leading-snug text-sub">
        {persistent ? '自動で更新されます。閉じてもQRコードを読めば戻れます。' : '自動で更新されます。閉じると注文を確認できなくなります。'}
        変更・取り消しは店頭のスタッフへ。
      </p>
    </div>
  );
}
