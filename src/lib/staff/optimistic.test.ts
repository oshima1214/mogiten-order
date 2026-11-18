import { describe, expect, it } from 'vitest';
import type { MenuItem, OrderStatus, StaffOrder } from '@/lib/types';
import { applySoldOut, applyStaffAction, type StaffBoardState } from './optimistic';

const NOW = '2026-11-18T03:00:00.000Z';
const order = (number: number, status: OrderStatus): StaffOrder => ({
  id: `o${number}`,
  number,
  status,
  createdAt: '2026-11-18T02:50:00.000Z',
  readyAt: status === 'ready' ? '2026-11-18T02:55:00.000Z' : null,
  items: [{ name: 'ジュース', quantity: 1 }],
  totalTickets: 1,
});
const item = (id: string, isSoldOut = false): MenuItem => ({
  id, name: id, priceTickets: 1, sortOrder: 0, imagePath: null, isVisible: true, isSoldOut,
});

const board = (): StaffBoardState => ({
  cooking: [order(1, 'cooking'), order(3, 'cooking'), order(5, 'cooking')],
  ready: [order(2, 'ready'), order(4, 'ready')],
  menu: [item('a'), item('b', true)],
});

const numbers = (os: StaffOrder[]) => os.map((o) => o.number);

describe('applyStaffAction', () => {
  it('complete moves the order to ready in number order', () => {
    const next = applyStaffAction(board(), 'o3', 'complete', NOW);
    expect(numbers(next.cooking)).toEqual([1, 5]);
    expect(numbers(next.ready)).toEqual([2, 3, 4]);
    expect(next.ready[1]).toMatchObject({ status: 'ready', readyAt: NOW });
  });

  it('deliver removes a ready order', () => {
    const next = applyStaffAction(board(), 'o2', 'deliver', NOW);
    expect(numbers(next.ready)).toEqual([4]);
    expect(numbers(next.cooking)).toEqual([1, 3, 5]);
  });

  it('cancel removes from either column', () => {
    expect(numbers(applyStaffAction(board(), 'o4', 'cancel', NOW).ready)).toEqual([2]);
    expect(numbers(applyStaffAction(board(), 'o1', 'cancel', NOW).cooking)).toEqual([3, 5]);
  });

  it('revert puts the order back into cooking at its number position', () => {
    const next = applyStaffAction(board(), 'o4', 'revert', NOW);
    expect(numbers(next.cooking)).toEqual([1, 3, 4, 5]);
    expect(numbers(next.ready)).toEqual([2]);
    expect(next.cooking[2]).toMatchObject({ status: 'cooking', readyAt: null });
  });

  it('leaves the board unchanged for an unknown order', () => {
    expect(applyStaffAction(board(), 'nope', 'complete', NOW)).toEqual(board());
  });

  it('applying complete twice keeps a single ready entry', () => {
    const once = applyStaffAction(board(), 'o3', 'complete', NOW);
    const twice = applyStaffAction(once, 'o3', 'complete', NOW);
    expect(numbers(twice.ready)).toEqual([2, 3, 4]);
  });

  it('does not mutate its input', () => {
    const b = board();
    applyStaffAction(b, 'o3', 'complete', NOW);
    expect(b).toEqual(board());
  });
});

describe('applySoldOut', () => {
  it('flips only the given item', () => {
    const b = board();
    const next = applySoldOut(b, 'a', true);
    expect(next.menu.map((m) => m.isSoldOut)).toEqual([true, true]);
    expect(b.menu[0].isSoldOut).toBe(false);
  });
});
