'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { tokyoToday } from '@/lib/date';
import type { SalesSummary } from '@/lib/types';

const label = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

export function SalesView() {
  const [selected, setSelected] = useState<string | null>(null); // null until mounted; 'all' or YYYY-MM-DD
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (date: string) => {
    const res = await fetch(`/api/staff/sales?date=${date}`, { cache: 'no-store' }).catch(() => null);
    if (res?.ok) {
      setSummary(await res.json());
      setFailed(false);
    } else setFailed(true);
  }, []);

  function select(date: string) {
    setSelected(date);
    void load(date);
  }

  useEffect(() => {
    // Today is only known in the browser (not at prerender), so pick it after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    select(tokyoToday());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = selected ? tokyoToday() : null;
  const dates = summary ? [...new Set([...(today ? [today] : []), ...summary.dates])].sort().reverse() : [];
  const tabs = [...dates.map((d) => ({ key: d, text: label(d) })), { key: 'all', text: '合計' }];
  const max = Math.max(1, ...(summary?.items.map((i) => i.quantity) ?? [1]));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/staff" className="text-[15px] font-semibold text-accent-strong">
            ‹ 注文に戻る
          </Link>
          <h1 className="text-[28px] font-bold tracking-tight">売上集計</h1>
        </div>
        <div className="flex flex-wrap gap-1 rounded-[10px] bg-line p-[3px]" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={selected === t.key}
              onClick={() => select(t.key)}
              className={`h-11 rounded-lg px-4 text-[15px] ${selected === t.key ? 'bg-card font-semibold' : ''}`}
            >
              {t.text}
            </button>
          ))}
        </div>
      </header>

      {failed && <p className="text-sm font-semibold text-danger">読み込めませんでした。もう一度お試しください</p>}

      {summary && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ['受け取り済みの金券', summary.ticketsTotal, '枚'],
              ['受け渡した注文', summary.deliveredCount, '件'],
              ['取り消し', summary.cancelledCount, '件'],
            ].map(([title, value, unit]) => (
              <div key={title} className="card flex flex-col gap-1 p-5">
                <span className="text-[13px] text-sub">{title}</span>
                <span className="text-[34px] font-bold">
                  {value}
                  <span className="ml-1 text-[17px]">{unit}</span>
                </span>
              </div>
            ))}
          </div>

          <section className="card flex flex-col gap-4 px-6 py-5">
            <h2 className="text-[17px] font-semibold">品目ごとの販売数</h2>
            {summary.items.length === 0 ? (
              <p className="text-sub">まだ受け渡した注文はありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] border-separate border-spacing-y-3.5">
                  <thead>
                    <tr className="text-left text-[13px] text-sub">
                      <th className="w-36 font-normal">品目</th>
                      <th className="font-normal">
                        <span className="sr-only">割合</span>
                      </th>
                      <th className="w-20 text-right font-normal">個数</th>
                      <th className="w-24 text-right font-normal">金券</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.items.map((i) => (
                      <tr key={i.name} className="text-[17px]">
                        <td className="pr-4">{i.name}</td>
                        <td className="pr-4">
                          <div className="h-3 rounded-full bg-ground" aria-hidden="true">
                            <div
                              className="h-3 rounded-full bg-accent"
                              style={{ width: `${(i.quantity / max) * 100}%` }}
                            />
                          </div>
                        </td>
                        <td className="text-right font-semibold">{i.quantity}</td>
                        <td className="text-right">{i.tickets}枚</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <p className="mx-1 text-[13px] text-sub">「受渡済」を押した注文だけを数えています。</p>
        </>
      )}
    </div>
  );
}
