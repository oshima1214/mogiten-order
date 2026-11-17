'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { MenuItem } from '@/lib/types';
import { MenuRow } from './MenuRow';

type Data = { shopName: string; menu: MenuItem[] };

async function errorText(res: Response | null, fallback: string) {
  const body = res ? ((await res.json().catch(() => null)) as { error?: string } | null) : null;
  return body?.error && !/^[a-z_]+$/.test(body.error) ? body.error : fallback;
}

export function MenuEditor() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [shopName, setShopName] = useState('');
  const [shopMsg, setShopMsg] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/menu', { cache: 'no-store' }).catch(() => null);
    if (res?.status === 401) {
      router.replace('/staff/login?next=/admin');
      return;
    }
    if (res?.ok) {
      const d = (await res.json()) as Data;
      setData(d);
      return d;
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().then((d) => d && setShopName(d.shopName));
  }, [load]);

  async function saveShop(e: FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shopName }),
    }).catch(() => null);
    setShopMsg(res?.ok ? '保存しました' : await errorText(res, '保存できませんでした'));
    await load();
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    setAddError(null);
    const res = await fetch('/api/admin/menu', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: newName, priceTickets: newPrice.trim() === '' ? null : Number(newPrice) }),
    }).catch(() => null);
    if (res?.ok) {
      setNewName('');
      setNewPrice('');
    } else setAddError(await errorText(res, '追加できませんでした'));
    await load();
  }

  async function move(index: number, dir: -1 | 1) {
    if (!data) return;
    const ids = data.menu.map((m) => m.id);
    [ids[index], ids[index + dir]] = [ids[index + dir], ids[index]];
    await fetch('/api/admin/menu/reorder', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids }),
    }).catch(() => null);
    await load();
  }

  if (!data) return <p className="m-auto text-sub">読み込み中…</p>;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex items-center gap-3">
        <Link href="/staff" className="text-[15px] font-semibold text-accent-strong">
          ‹ 注文に戻る
        </Link>
        <h1 className="text-[28px] font-bold tracking-tight">メニュー管理</h1>
      </header>

      <form onSubmit={saveShop} className="card flex flex-wrap items-end gap-3 p-4">
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-[13px] text-sub">
          店名(お客さんの画面の上に表示)
          <input
            value={shopName}
            onChange={(e) => {
              setShopName(e.target.value);
              setShopMsg(null);
            }}
            maxLength={30}
            className="h-11 rounded-xl bg-ground px-3 text-[17px] text-ink outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <button type="submit" disabled={shopName === data.shopName} className="btn-primary h-11 px-5">
          保存
        </button>
        {shopMsg && <p className="w-full text-sm font-semibold text-sub">{shopMsg}</p>}
      </form>

      {message && (
        <p role="status" className="rounded-xl bg-wait-soft px-4 py-3 text-sm font-semibold text-wait-ink">
          {message}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {data.menu.length === 0 && <li className="card p-5 text-sub">まだ商品がありません。下から追加してください</li>}
        {data.menu.map((item, i) => (
          <MenuRow
            key={`${item.id}:${item.name}:${item.priceTickets}`}
            item={item}
            isFirst={i === 0}
            isLast={i === data.menu.length - 1}
            onChanged={async () => {
              await load();
            }}
            onMove={(dir) => void move(i, dir)}
            onMessage={setMessage}
          />
        ))}
      </ul>

      <form onSubmit={add} className="card flex flex-col gap-3 p-4">
        <h2 className="text-[17px] font-semibold">商品を追加</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-40 flex-1 flex-col gap-1 text-[13px] text-sub">
            商品名
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={30}
              className="h-11 rounded-xl bg-ground px-3 text-[17px] text-ink outline-none focus:ring-2 focus:ring-accent"
            />
          </label>
          <label className="flex w-28 flex-col gap-1 text-[13px] text-sub">
            金券(枚)
            <input
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              inputMode="numeric"
              className="h-11 rounded-xl bg-ground px-3 text-[17px] text-ink outline-none focus:ring-2 focus:ring-accent"
            />
          </label>
          <button type="submit" disabled={!newName.trim()} className="btn-primary h-11 px-5">
            追加
          </button>
        </div>
        {addError && <p role="alert" className="text-sm font-semibold text-danger">{addError}</p>}
      </form>
    </div>
  );
}
