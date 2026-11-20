'use client';

type Props = { onPlay: () => void; error?: string | null; className?: string };

export function PlayButton({ onPlay, error = null, className = '' }: Props) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <button
        type="button"
        onClick={onPlay}
        className="flex items-center justify-between gap-3 rounded-[20px] bg-card px-5 py-4 text-left"
      >
        <span className="flex flex-col">
          <span className="text-[13px] text-sub">待ち時間に遊ぶ</span>
          <span className="text-[17px] font-semibold">餃子タワー</span>
        </span>
        <span className="rounded-full bg-accent px-4 py-2 text-[15px] font-semibold text-white">遊ぶ</span>
      </button>
      {error && (
        <p role="alert" className="mx-1 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
