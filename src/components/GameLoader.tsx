'use client';

import dynamic from 'next/dynamic';

// Игра целиком клиентская: canvas, requestAnimationFrame и прогресс в localStorage.
const Game = dynamic(() => import('./Game').then((m) => m.Game), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center font-mono text-dim">загрузка…</div>,
});

export function GameLoader() {
  return <Game />;
}
