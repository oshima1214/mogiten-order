'use client';

import { useEffect } from 'react';
import type { GameBanner } from '@/lib/game/banner';
import { GyozaTower } from './GyozaTower';

type Props = {
  /** News about the order to show on top of the game (ready / cancelled). */
  banner: GameBanner;
  onClose: () => void;
};

export function GameOverlay({ banner, onClose }: Props) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ground" role="dialog" aria-label="餃子タワー">
      {banner && (
        <div role="alert">
          <button
            type="button"
            onClick={onClose}
            className={`flex w-full items-center justify-center gap-3 px-4 py-4 ${
              banner.kind === 'ready' ? 'bg-done text-white' : 'bg-wait-soft text-wait-ink'
            }`}
          >
            <span className="text-[17px] font-bold">
              {banner.kind === 'ready' ? `できました! ${banner.number}番` : banner.text}
            </span>
            <span className="shrink-0 rounded-full bg-white/30 px-3 py-1 text-[15px] font-semibold">
              {banner.kind === 'ready' ? '受け取りへ' : '閉じる'}
            </span>
          </button>
        </div>
      )}
      <div className="flex items-center justify-between px-4 pt-3">
        <p className="text-[15px] font-semibold text-sub">待ち時間に遊ぶ</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="ゲームを閉じる"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-xl"
        >
          ×
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <GyozaTower />
      </div>
    </div>
  );
}
