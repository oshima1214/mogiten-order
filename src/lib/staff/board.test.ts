import { describe, expect, it } from 'vitest';
import type { StaffOrder } from '@/lib/types';
import { elapsedMinutes, isOverdue, itemTotals, OVERDUE_MINUTES } from './board';

const order = (items: [string, number][]): StaffOrder => ({
  id: 'x',
  number: 1,
  status: 'cooking',
  createdAt: '2026-11-17T03:00:00.000Z',
  readyAt: null,
  items: items.map(([name, quantity]) => ({ name, quantity })),
  totalTickets: 0,
});

describe('itemTotals', () => {
  it('sums per item in first-seen order', () => {
    expect(
      itemTotals([
        order([
          ['焼きそば', 2],
          ['フランク', 1],
        ]),
        order([['焼きそば', 1]]),
      ]),
    ).toEqual([
      { name: '焼きそば', quantity: 3 },
      { name: 'フランク', quantity: 1 },
    ]);
  });

  it('is empty without orders', () => expect(itemTotals([])).toEqual([]));
});

describe('elapsed time', () => {
  const created = '2026-11-17T03:00:00.000Z';
  const at = (ms: number) => Date.parse(created) + ms;

  it('floors to whole minutes', () => expect(elapsedMinutes(created, at(90_000))).toBe(1));
  it('never goes negative', () => expect(elapsedMinutes(created, at(-5_000))).toBe(0));
  it('uses a 10 minute threshold', () => expect(OVERDUE_MINUTES).toBe(10));
  it('is not overdue at 9:59', () => expect(isOverdue(created, at(599_000))).toBe(false));
  it('is overdue at 10:00', () => expect(isOverdue(created, at(600_000))).toBe(true));
});
