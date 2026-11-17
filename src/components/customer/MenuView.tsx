'use client';

import { cartTotals, MAX_QUANTITY, setQuantity, type Cart } from '@/lib/cart';
import { menuImageUrl } from '@/lib/menu/imageUrl';
import type { MenuItem } from '@/lib/types';

type Props = {
  shopName: string;
  menu: MenuItem[];
  cart: Cart;
  onCartChange: (cart: Cart) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
};

export function MenuView({ shopName, menu, cart, onCartChange, onSubmit, submitting, error }: Props) {
  const totals = cartTotals(cart, menu);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="flex flex-col gap-1 px-5 pt-12 pb-4">
        <p className="text-[13px] font-medium text-sub">{shopName}</p>
        <h1 className="text-[34px] font-bold tracking-tight">メニュー</h1>
      </header>

      <ul className="flex flex-1 flex-col gap-3 px-4 pb-4">
        {menu.length === 0 && <li className="card p-5 text-center text-sub">ただいま準備中です</li>}
        {menu.map((item) => {
          const qty = cart[item.id] ?? 0;
          const image = menuImageUrl(item.imagePath);
          return (
            <li key={item.id} className={`card flex items-center gap-3.5 p-4 ${item.isSoldOut ? 'opacity-55' : ''}`}>
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-line">
                {/* Plain <img>: Supabase serves the photo directly, no Vercel image optimization quota used. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {image && <img src={image} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-[17px] font-semibold break-words">{item.name}</p>
                {item.isSoldOut ? (
                  <p className="text-sm font-semibold">売り切れ</p>
                ) : (
                  <p className="text-sm text-sub">金券 {item.priceTickets}枚</p>
                )}
              </div>
              {!item.isSoldOut && (
                <div className="flex items-center gap-1 rounded-full bg-ground p-1">
                  <button
                    type="button"
                    aria-label={`${item.name}を減らす`}
                    disabled={qty === 0}
                    onClick={() => onCartChange(setQuantity(cart, item.id, qty - 1))}
                    className="h-11 w-11 rounded-full bg-card text-lg disabled:text-sub"
                  >
                    −
                  </button>
                  <span className={`w-6 text-center text-[17px] font-semibold ${qty === 0 ? 'text-sub' : ''}`}>
                    {qty}
                  </span>
                  <button
                    type="button"
                    aria-label={`${item.name}を増やす`}
                    disabled={qty >= MAX_QUANTITY}
                    onClick={() => onCartChange(setQuantity(cart, item.id, qty + 1))}
                    className="h-11 w-11 rounded-full bg-accent text-lg text-white disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <footer className="sticky bottom-0 flex flex-col gap-3 border-t border-[#d2d2d7] bg-white/90 px-5 pt-4 pb-8 backdrop-blur">
        {error && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {error}
          </p>
        )}
        <div className="flex items-baseline justify-between">
          <span className="text-[15px] text-sub">合計 {totals.count}点</span>
          <span className="text-xl font-bold">金券 {totals.tickets}枚</span>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={totals.count === 0 || submitting}
          className="btn-primary h-13"
        >
          {submitting ? '送信中…' : '注文する'}
        </button>
        <p className="text-center text-xs text-sub">お支払いは受け取り時に金券でお願いします</p>
      </footer>
    </div>
  );
}
