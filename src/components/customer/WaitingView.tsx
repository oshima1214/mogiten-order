'use client';

import type { MyOrder } from '@/lib/types';
import { CookingAnimation } from './CookingAnimation';

type Props = {
  shopName: string;
  order: MyOrder;
  persistent: boolean;
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

export function WaitingView({ shopName, order, persistent }: Props) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 pt-12 pb-8">
      <p className="mx-1 text-[13px] font-medium text-sub">{shopName}</p>

      <section className="flex flex-col items-center gap-1.5 rounded-3xl bg-card px-6 pt-6 pb-7">
        <p className="text-[15px] text-sub">あなたの番号</p>
        <p className="text-[88px] leading-none font-bold tracking-tighter">{order.number}</p>
        <CookingAnimation />
        <p className="flex items-center gap-2 rounded-full bg-wait-soft px-4 py-2 text-wait-ink">
          <span className="h-2 w-2 rounded-full bg-wait" aria-hidden="true" />
          <span className="text-[15px] font-semibold">調理中</span>
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 rounded-[20px] bg-card p-5">
          <p className="text-[13px] text-sub">あなたの前に</p>
          <p className="text-[34px] font-bold">
            {order.aheadCount}
            <span className="ml-0.5 text-[17px] font-semibold">組</span>
          </p>
        </div>
        <div className="flex flex-col gap-1 rounded-[20px] bg-card p-5">
          <p className="text-[13px] text-sub">全体の待ち</p>
          <p className="text-[34px] font-bold">
            {order.waitingTotal}
            <span className="ml-0.5 text-[17px] font-semibold">組</span>
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-3 rounded-[20px] bg-card p-5">
        <p className="text-[13px] font-semibold text-sub">ご注文内容</p>
        <OrderLines order={order} tone="light" />
        <div className="h-px bg-line" />
        <div className="flex justify-between text-[17px] font-bold">
          <span>お支払い</span>
          <span>金券 {order.totalTickets}枚</span>
        </div>
      </section>

      <p className="mx-1 text-[13px] leading-relaxed text-sub">
        {persistent
          ? 'この画面は自動で更新されます。閉じても、もう一度QRコードを読むとこの画面に戻れます。'
          : 'この画面は自動で更新されます。この画面を閉じると注文を確認できなくなります。'}
      </p>
      <p className="mx-1 text-[13px] leading-relaxed text-sub">注文の変更・取り消しは店頭のスタッフにお声がけください。</p>
    </div>
  );
}
