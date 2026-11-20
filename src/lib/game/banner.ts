import type { MyOrder } from '@/lib/types';

export type GameBanner = { kind: 'ready'; number: number } | { kind: 'notice'; text: string } | null;

/** What to announce on top of the game so a playing customer never misses news about their order. */
export function gameBanner(order: MyOrder | null, notice: string | null): GameBanner {
  if (order?.status === 'ready') return { kind: 'ready', number: order.number };
  if (!order && notice) return { kind: 'notice', text: notice };
  return null;
}
