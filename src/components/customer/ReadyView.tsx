'use client';

import type { MyOrder } from '@/lib/types';
import { OrderLines } from './WaitingView';

export function ReadyView({ order }: { order: MyOrder }) {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-done text-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pt-12 pb-8">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center" role="status">
          <svg
            aria-hidden="true"
            width="72"
            height="72"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M7.5 12.5l3 3 6-6.5" />
          </svg>
          <h1 className="mt-2 text-[34px] font-bold">できました</h1>
          <p className="text-[120px] leading-none font-bold tracking-tighter">{order.number}</p>
          <p className="mt-2 rounded-2xl bg-white/15 px-6 py-3 text-[34px] font-bold">金券 {order.totalTickets}枚</p>
          <p className="text-[17px] leading-relaxed">
            金券をご用意のうえ、
            <br />
            受け取り口までお越しください
          </p>
        </div>
        <section className="rounded-[20px] bg-white/15 p-5">
          <OrderLines order={order} tone="dark" />
        </section>
      </div>
    </div>
  );
}
