'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Cart } from '@/lib/cart';
import { cancelMyOrder, fetchMyOrder, fetchShop, placeOrder } from '@/lib/customer/api';
import { isMenuChangedError, messageForOrderError } from '@/lib/customer/errors';
import { browserTokenStore, type TokenStore } from '@/lib/customer/tokenStore';
import { useShopChanges } from '@/lib/realtime/useShopChanges';
import type { MenuItem, MyOrder } from '@/lib/types';
import { MenuView } from './MenuView';
import { ReadyView } from './ReadyView';
import { WaitingView } from './WaitingView';

/** Drops cart entries whose item is gone or sold out. */
function pruneCart(cart: Cart, menu: MenuItem[]): Cart {
  const orderable = new Set(menu.filter((m) => !m.isSoldOut).map((m) => m.id));
  return Object.fromEntries(Object.entries(cart).filter(([id]) => orderable.has(id)));
}

export function CustomerApp() {
  const store = useRef<TokenStore | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [persistent, setPersistent] = useState(true);
  const [shopName, setShopName] = useState('');
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Cart>({});
  const [order, setOrder] = useState<MyOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const s = (store.current ??= browserTokenStore());
    setPersistent(s.persistent);
    try {
      const token = s.load();
      if (token) {
        const mine = await fetchMyOrder(token);
        if (!mine) s.clear();
        setOrder(mine);
      } else {
        setOrder(null);
      }
      const shop = await fetchShop();
      setShopName(shop.shopName);
      setMenu(shop.menu);
      setCart((c) => pruneCart(c, shop.menu));
    } catch {
      // Network hiccup: keep showing the last known state; the next poll retries.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // Initial load reads the saved token, so it must run in the browser after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);
  useShopChanges(() => void refresh(), 15000);

  async function submit() {
    setSubmitting(true);
    setMenuError(null);
    try {
      const { token } = await placeOrder(cart);
      store.current!.save(token);
      setCart({});
      setNotice(null);
      await refresh();
    } catch (e) {
      const code = e instanceof Error ? e.message : 'unknown';
      setMenuError(messageForOrderError(code));
      if (isMenuChangedError(code)) await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel() {
    const token = store.current?.load();
    if (!token || !window.confirm('注文を取り消しますか？')) return;
    setCancelling(true);
    try {
      const result = await cancelMyOrder(token);
      if (result === 'not_cancellable') setNotice('すでに完成しているため取り消せません');
      else store.current!.clear();
      await refresh();
    } catch {
      setNotice('取り消せませんでした。もう一度お試しください');
    } finally {
      setCancelling(false);
    }
  }

  if (!loaded) {
    return <p className="m-auto text-sub">読み込み中…</p>;
  }
  if (order?.status === 'ready') {
    return <ReadyView order={order} />;
  }
  if (order) {
    return (
      <WaitingView
        shopName={shopName}
        order={order}
        persistent={persistent}
        onCancel={cancel}
        cancelling={cancelling}
        notice={notice}
      />
    );
  }
  return (
    <MenuView
      shopName={shopName}
      menu={menu}
      cart={cart}
      onCartChange={(c) => {
        setCart(c);
        setMenuError(null);
      }}
      onSubmit={submit}
      submitting={submitting}
      error={menuError}
    />
  );
}
