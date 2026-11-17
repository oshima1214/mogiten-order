import { toOrderPayload, type Cart } from '@/lib/cart';
import { MENU_COLUMNS, mapMenuRow, type MenuRow } from '@/lib/menu/mapRow';
import { getBrowserClient } from '@/lib/supabase/browser';
import type { MenuItem, MyOrder } from '@/lib/types';

const ORDER_ERROR_CODES = ['sold_out', 'item_unavailable', 'invalid_quantity', 'empty_order'];

export async function fetchShop(): Promise<{ shopName: string; menu: MenuItem[] }> {
  const sb = getBrowserClient();
  const [settings, menu] = await Promise.all([
    sb.from('settings').select('shop_name').eq('id', 1).maybeSingle(),
    sb.from('menu_items').select(MENU_COLUMNS).order('sort_order').order('created_at'),
  ]);
  if (settings.error) throw settings.error;
  if (menu.error) throw menu.error;
  return {
    shopName: settings.data?.shop_name ?? '模擬店',
    menu: (menu.data as MenuRow[]).map(mapMenuRow),
  };
}

/** Throws Error(code) where code is one of the place_order error codes, or 'unknown'. */
export async function placeOrder(cart: Cart): Promise<{ token: string; number: number }> {
  const { data, error } = await getBrowserClient().rpc('place_order', { p_items: toOrderPayload(cart) });
  if (error) {
    const code = ORDER_ERROR_CODES.find((c) => error.message?.includes(c)) ?? 'unknown';
    throw new Error(code);
  }
  return data as { token: string; number: number };
}

export async function fetchMyOrder(token: string): Promise<MyOrder | null> {
  const { data, error } = await getBrowserClient().rpc('get_my_order', { p_token: token });
  if (error) throw error;
  return (data as MyOrder | null) ?? null;
}

export async function cancelMyOrder(token: string): Promise<'cancelled' | 'not_cancellable' | 'not_found'> {
  const { data, error } = await getBrowserClient().rpc('cancel_my_order', { p_token: token });
  if (error) throw error;
  return data as 'cancelled' | 'not_cancellable' | 'not_found';
}
