'use client';

import { useState, type FormEvent } from 'react';

export default function StaffLoginPage() {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/staff/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ passcode }),
    }).catch(() => null);
    setBusy(false);
    if (res?.status === 204) {
      const next = new URLSearchParams(window.location.search).get('next');
      window.location.href = next && next.startsWith('/') && !next.startsWith('//') ? next : '/staff';
      return;
    }
    setError(res ? '合言葉が違います' : '接続できませんでした。もう一度お試しください');
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="card flex w-full max-w-sm flex-col gap-4 p-6">
        <h1 className="text-2xl font-bold">スタッフログイン</h1>
        <label className="flex flex-col gap-2 text-sm font-semibold text-sub">
          合言葉
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            autoFocus
            className="h-12 rounded-xl bg-ground px-4 text-base font-normal text-ink outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        {error && <p className="text-sm font-semibold text-danger">{error}</p>}
        <button type="submit" disabled={busy || !passcode} className="btn-primary h-12">
          ログイン
        </button>
      </form>
    </main>
  );
}
