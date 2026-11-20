'use client';

import { useEffect } from 'react';
import { GyozaTower } from './GyozaTower';

type Props = {
  /** The customer's number once their order is ready; shows the pick-up banner. */
  readyNumber: number | null;
  onClose: () => void;
};

export function GameOverlay({ readyNumber, onClose }: Props) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ground" role="dialog" aria-label="餃子タワー">
      {readyNumber !== null && (
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center gap-3 bg-done px-4 py-4 text-white"
          role="alert"
        >
          <span className="text-[17px] font-bold">できました! {readyNumber}番</span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-[15px] font-semibold">受け取りへ</span>
        </button>
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
