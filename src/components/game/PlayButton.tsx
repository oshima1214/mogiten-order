'use client';

type Props = { onPlay: () => void; error?: string | null; className?: string };

/** Compact one-row entry to the game for the waiting screen. */
export function PlayButton({ onPlay, error = null, className = '' }: Props) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <button
        type="button"
        onClick={onPlay}
        className="flex h-12 items-center justify-between gap-3 rounded-[16px] bg-card px-4 text-left"
      >
        <span className="text-[15px]">
          <span className="text-sub">待ち時間に遊ぶ:</span>
          <span className="font-semibold">餃子タワー</span>
        </span>
        <span className="rounded-full bg-accent px-3 py-1 text-[14px] font-semibold text-white">遊ぶ</span>
      </button>
      {error && (
        <p role="alert" className="mx-1 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Low-key text link to the game, for the bottom of the menu. */
export function PlayLink({ onPlay, error = null, className = '' }: Props) {
  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <button type="button" onClick={onPlay} className="min-h-11 px-3 text-[13px] text-sub">
        待ち時間に「餃子タワー」で遊べます ›
      </button>
      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
