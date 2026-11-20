'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Cart } from '@/lib/cart';
import { fetchMyOrder, fetchShop, placeOrder } from '@/lib/customer/api';
import { isMenuChangedError, messageForOrderError } from '@/lib/customer/errors';
import { applyFetched } from '@/lib/customer/orderState';
import { browserTokenStore, type TokenStore } from '@/lib/customer/tokenStore';
import { latestOnly, STALE } from '@/lib/latest';
import { useShopChanges } from '@/lib/realtime/useShopChanges';
import type { MenuItem, MyOrder } from '@/lib/types';
import { MenuView } from './MenuView';
import { ReadyView } from './ReadyView';
import { WaitingView } from './WaitingView';

// Loaded only when someone opens the game, so the menu stays light.
const GameOverlay = dynamic(() => import('@/components/game/GameOverlay').then((m) => m.GameOverlay), {
  ssr: false,
});

/** Drops cart entries whose item is gone or sold out. */
function pruneCart(cart: Cart, menu: MenuItem[]): Cart {
  const orderable = new Set(menu.filter((m) => !m.isSoldOut).map((m) => m.id));
  return Object.fromEntries(Object.entries(cart).filter(([id]) => orderable.has(id)));
}

type Snapshot = { order: MyOrder | null; clearToken: boolean; notice: string | null; shopName: string; menu: MenuItem[] };

export function CustomerApp() {
  const store = useRef<TokenStore | null>(null);
  const latest = useRef(latestOnly());
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState(false);
  const [persistent, setPersistent] = useState(true);
  const [shopName, setShopName] = useState('');
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Cart>({});
  const [order, setOrder] = useState<MyOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [gameOpen, setGameOpen] = useState(false);

  const refresh = useCallback(async () => {
    const s = (store.current ??= browserTokenStore());
    setPersistent(s.persistent);
    const token = s.load();
    const fetchAll = async (): Promise<Snapshot> => {
      const [mine, shop] = await Promise.all([token ? fetchMyOrder(token) : Promise.resolve(null), fetchShop()]);
      const applied = token ? applyFetched(mine) : { order: null, clearToken: false, notice: null };
      return { ...applied, ...shop };
    };
    try {
      const snap = await latest.current(fetchAll());
      if (snap === STALE) return;
      if (snap.clearToken) s.clear();
      if (snap.notice) setNotice(snap.notice);
      setOrder(snap.order);
      setShopName(snap.shopName);
      setMenu(snap.menu);
      setCart((c) => pruneCart(c, snap.menu));
      setOffline(false);
      setLoaded(true);
    } catch {
      // Keep showing the last known state; the next poll retries.
      setOffline(true);
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

  if (!loaded) {
    return offline ? (
      <div className="m-auto flex max-w-xs flex-col items-center gap-4 px-4 text-center" role="alert">
        <p className="text-[17px] font-semibold">接続できませんでした</p>
        <p className="text-[15px] text-sub">電波の良い場所で、もう一度お試しください。</p>
        <button type="button" onClick={() => void refresh()} className="btn-primary h-12 w-full">
          再読み込み
        </button>
      </div>
    ) : (
      <p className="m-auto text-sub">読み込み中…</p>
    );
  }
  const game = gameOpen && (
    <GameOverlay readyNumber={order?.status === 'ready' ? order.number : null} onClose={() => setGameOpen(false)} />
  );
  const openGame = () => setGameOpen(true);

  if (order?.status === 'ready') return <>{game}<ReadyView order={order} /></>;
  if (order) return <>{game}<WaitingView shopName={shopName} order={order} persistent={persistent} onPlay={openGame} /></>;
  return (
    <>
      {game}
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
        notice={notice}
        onPlay={openGame}
      />
    </>
  );
}
