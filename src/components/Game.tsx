'use client';

import { useState } from 'react';
import { LEVELS } from '@/lib/sim';
import { GameScreen } from './GameScreen';
import { Menu } from './Menu';

export function Game() {
  // run меняется при каждом запуске, чтобы уровень стартовал с чистого состояния
  const [session, setSession] = useState<{ level: number; run: number } | null>(null);
  const start = (level: number) => setSession((s) => ({ level, run: (s?.run ?? 0) + 1 }));

  if (!session) return <Menu onStart={start} />;
  return (
    <GameScreen
      key={session.run}
      levelIdx={session.level}
      onMenu={() => setSession(null)}
      onRetry={() => start(session.level)}
      onNext={session.level < LEVELS.length - 1 ? () => start(session.level + 1) : undefined}
    />
  );
}
