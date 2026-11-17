'use client';

import { useEffect, useRef } from 'react';
import { getBrowserClient } from '@/lib/supabase/browser';

/**
 * Calls onChange when the database signals a change on the public `shop` channel,
 * every pollMs as a fallback, and when the tab becomes visible again.
 */
export function useShopChanges(onChange: () => void, pollMs: number): void {
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  });

  useEffect(() => {
    const fire = () => latest.current();
    const channel = getBrowserClient()
      .channel('shop', { config: { private: false } })
      .on('broadcast', { event: 'changed' }, fire)
      .subscribe();
    const timer = window.setInterval(fire, pollMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') fire();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      void getBrowserClient().removeChannel(channel);
    };
  }, [pollMs]);
}
