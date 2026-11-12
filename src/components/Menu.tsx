'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { LEVELS } from '@/lib/sim';
import { fmt, useProgress } from '@/lib/store';
import { Header, Stars } from './ui';

export function Menu({ onStart }: { onStart: (level: number) => void }) {
  const stars = useProgress((p) => p.stars), record = useProgress((p) => p.record);
  // Уровни открываются по очереди; бесконечный режим — после первого.
  const isOpen = (i: number) =>
    i === 0 || (stars[LEVELS[i - 1].id] ?? 0) > 0 || (!!LEVELS[i].endless && (stars[LEVELS[0].id] ?? 0) > 0);

  return (
    <div className="flex h-full flex-col">
      <Header />
      <main className="flex-1 overflow-auto px-6 pb-12 pt-8">
        <div className="mx-auto mb-7 max-w-3xl text-center">
          <h1 className="mb-2.5 bg-gradient-to-r from-accent to-ok bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-[40px]">
            Выдержи нагрузку
          </h1>
          <p className="text-base text-dim">
            Трафик растёт в реальном времени. Найди узкое место раньше, чем оно найдёт тебя, — и дострой систему:
            балансировщик, кэш, реплики, шарды, очередь.
          </p>
        </div>
        <div className="mx-auto grid max-w-[1100px] grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3.5">
          {LEVELS.map((L, i) => {
            const open = isOpen(i);
            return (
              <motion.button
                key={L.id}
                type="button"
                data-level={L.id}
                disabled={!open}
                onClick={() => onStart(i)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: open ? 1 : 0.45, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={open ? { y: -3 } : undefined}
                className={cn(
                  'relative flex min-h-[150px] flex-col gap-1.5 rounded-2xl border border-line bg-panel p-4 text-left transition-colors',
                  open ? 'hover:border-accent hover:shadow-[0_10px_30px_rgba(76,201,240,.12)]' : 'cursor-not-allowed',
                )}
              >
                <span className="font-mono text-xs font-bold text-dim">{L.endless ? '∞' : `УРОВЕНЬ ${i + 1}`}</span>
                <span className="absolute right-3.5 top-3.5">
                  {L.endless
                    ? record > 0 && <span className="font-mono text-xs font-semibold text-warn">рекорд {fmt(record)} RPS</span>
                    : <Stars n={stars[L.id] ?? 0} />}
                </span>
                <h4 className="text-[17px] font-semibold">{L.title}</h4>
                <p className="flex-1 text-[13px] text-dim">{open ? L.tagline : 'Пройди предыдущий уровень'}</p>
                <span className="self-start rounded-full border border-line px-2 py-0.5 text-[11px] text-accent">{L.teach}</span>
              </motion.button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
