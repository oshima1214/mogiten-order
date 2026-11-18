'use client';

import { useState } from 'react';
import { shrinkImage } from '@/lib/admin/resize';
import { validateImage } from '@/lib/admin/validate';
import { menuImageUrl } from '@/lib/menu/imageUrl';
import type { MenuItem } from '@/lib/types';

type Props = {
  item: MenuItem;
  isFirst: boolean;
  isLast: boolean;
  onChanged: () => Promise<void>;
  onMove: (dir: -1 | 1) => void;
};

async function errorOf(res: Response | null): Promise<string> {
  if (!res) return '接続できませんでした。もう一度お試しください';
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error && !/^[a-z_]+$/.test(body.error) ? body.error : '保存できませんでした。もう一度お試しください';
}

export function MenuRow({ item, isFirst, isLast, onChanged, onMove }: Props) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.priceTickets));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = name !== item.name || price !== String(item.priceTickets);
  const image = menuImageUrl(item.imagePath);

  async function run(fn: () => Promise<Response | null>) {
    setBusy(true);
    setError(null);
    const res = await fn().catch(() => null);
    if (!res?.ok) setError(await errorOf(res));
    await onChanged();
    setBusy(false);
    return res;
  }

  const patch = (body: Record<string, unknown>) =>
    run(() =>
      fetch(`/api/admin/menu/${item.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );

  async function upload(original: File) {
    const file = await shrinkImage(original);
    const invalid = validateImage(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    const form = new FormData();
    form.append('file', file);
    await run(() => fetch(`/api/admin/menu/${item.id}/image`, { method: 'POST', body: form }));
  }

  async function remove() {
    if (!window.confirm(`「${item.name}」を削除しますか？売上の記録は残ります`)) return;
    await run(() => fetch(`/api/admin/menu/${item.id}`, { method: 'DELETE' }));
  }

  return (
    <li className={`card flex flex-col gap-3 p-4 ${item.isVisible ? '' : 'opacity-60'}`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col items-center gap-1.5">
          <div className="h-16 w-16 overflow-hidden rounded-xl bg-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {image && <img src={image} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="flex gap-2 text-[13px]">
            <label className="cursor-pointer font-semibold text-accent-strong">
              {image ? '変更' : '写真'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) void upload(f);
                }}
              />
            </label>
            {image && (
              <button type="button" disabled={busy} onClick={() => void run(() => fetch(`/api/admin/menu/${item.id}/image`, { method: 'DELETE' }))} className="text-sub">
                削除
              </button>
            )}
          </div>
        </div>

        <label className="flex min-w-40 flex-1 flex-col gap-1 text-[13px] text-sub">
          商品名
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            className="h-11 rounded-xl bg-ground px-3 text-[17px] text-ink outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <label className="flex w-28 flex-col gap-1 text-[13px] text-sub">
          金券(枚)
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="numeric"
            className="h-11 rounded-xl bg-ground px-3 text-[17px] text-ink outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        {dirty && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void patch({ name, priceTickets: Number(price.trim() === '' ? NaN : price) })}
            className="btn-primary h-11 self-end px-5"
          >
            保存
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          aria-pressed={item.isVisible}
          onClick={() => void patch({ isVisible: !item.isVisible })}
          className={`h-11 rounded-full px-4 text-[15px] font-semibold ${item.isVisible ? 'bg-done-soft text-done-ink' : 'bg-line'}`}
        >
          {item.isVisible ? 'メニューに表示中' : '非表示'}
        </button>
        <button
          type="button"
          disabled={busy}
          aria-pressed={item.isSoldOut}
          onClick={() => void patch({ isSoldOut: !item.isSoldOut })}
          className={`h-11 rounded-full px-4 text-[15px] font-semibold ${item.isSoldOut ? 'bg-line' : 'bg-done-soft text-done-ink'}`}
        >
          {item.isSoldOut ? '売り切れ' : '販売中'}
        </button>
        <div className="flex-1" />
        <button type="button" aria-label={`${item.name}を上へ`} disabled={busy || isFirst} onClick={() => onMove(-1)} className="h-11 w-11 rounded-full bg-ground disabled:opacity-30">
          ↑
        </button>
        <button type="button" aria-label={`${item.name}を下へ`} disabled={busy || isLast} onClick={() => onMove(1)} className="h-11 w-11 rounded-full bg-ground disabled:opacity-30">
          ↓
        </button>
        <button type="button" disabled={busy} onClick={() => void remove()} className="h-11 rounded-xl px-3 text-[15px] text-danger">
          削除
        </button>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
    </li>
  );
}
