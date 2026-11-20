'use client';

import { Component, type ReactNode } from 'react';

/** If the game fails (e.g. its code cannot be downloaded on bad Wi-Fi), close it instead of blanking the order screen. */
export class GameBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
