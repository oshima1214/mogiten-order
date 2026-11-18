import type { MenuItem, StaffAction, StaffOrder } from '@/lib/types';

export type StaffBoardState = { cooking: StaffOrder[]; ready: StaffOrder[]; menu: MenuItem[] };

const byNumber = (a: StaffOrder, b: StaffOrder) => a.number - b.number;

/** What the board looks like right after a staff action, before the server answers. */
export function applyStaffAction(
  board: StaffBoardState,
  orderId: string,
  action: StaffAction,
  nowIso: string,
): StaffBoardState {
  const target = [...board.cooking, ...board.ready].find((o) => o.id === orderId);
  if (!target) return board;
  const cooking = board.cooking.filter((o) => o.id !== orderId);
  const ready = board.ready.filter((o) => o.id !== orderId);

  if (action === 'complete') ready.push({ ...target, status: 'ready', readyAt: nowIso });
  if (action === 'revert') cooking.push({ ...target, status: 'cooking', readyAt: null });
  // deliver / cancel: the order simply leaves the board.

  return { ...board, cooking: cooking.sort(byNumber), ready: ready.sort(byNumber) };
}

export function applySoldOut(board: StaffBoardState, itemId: string, isSoldOut: boolean): StaffBoardState {
  return { ...board, menu: board.menu.map((m) => (m.id === itemId ? { ...m, isSoldOut } : m)) };
}
