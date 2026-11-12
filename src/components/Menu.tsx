'use client';

import { cn } from '@/lib/cn';
import { LEVELS, rpsAt, type Level } from '@/lib/sim';
import { fmt, useProgress } from '@/lib/store';
import { Header, Stars } from './ui';

/** У каждого уровня свой цвет плитки. «Чёрная пятница» — буквально чёрная, финал — цвета ошибки 503. */
const TILE: Record<string, string> = {
  landing: 'bg-[#2f6bff]',
  habr: 'bg-[#ff6b1a]',
  friday: 'bg-ink',
  chat: 'bg-[#0e9f64]',
  tickets: 'bg-[#e0318c]',
  social: 'bg-[#6b3df5]',
  endless: 'bg-bad',
};

const SW = 300, SH = 80;

/** Форма нагрузки уровня — та самая кривая, которую придётся выдержать. */
function Curve({ level }: { level: Level }) {
  const T = level.endless ? 160 : level.duration, N = 72;
  const vals = Array.from({ length: N + 1 }, (_, i) => rpsAt(level, T * i / N));
  const max = Math.max(...vals);
  const line = vals
    .map((v, i) => `${i ? 'L' : 'M'}${(SW * i / N).toFixed(1)},${(SH - 4 - (SH - 12) * v / max).toFixed(1)}`)
    .join('');
  return (
    <svg viewBox={`0 0 ${SW} ${SH}`} preserveAspectRatio="none" aria-hidden className="h-20 w-full">
      <path d={`${line}L${SW},${SH}L0,${SH}Z`} fill="currentColor" fillOpacity="0.16" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"
        vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Menu({ onStart }: { onStart: (level: number) => void }) {
  const stars = useProgress((p) => p.stars), record = useProgress((p) => p.record);
  // Уровни открываются по очереди; бесконечный режим — после первого.
  const isOpen = (i: number) =>
    i === 0 || (stars[LEVELS[i - 1].id] ?? 0) > 0 || (!!LEVELS[i].endless && (stars[LEVELS[0].id] ?? 0) > 0);

  return (
    <div className="flex h-full flex-col">
      <Header />
      <main className="flex-1 overflow-auto px-4 pb-16 pt-6 sm:px-8 sm:pt-10">
        <div className="mx-auto max-w-[1120px]">
          <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-tight sm:text-[64px]">
            Выдержи нагрузку
          </h1>
          <p className="mt-4 max-w-[56ch] text-[17px] leading-relaxed text-dim">
            Трафик растёт в реальном времени. Найди узкое место раньше, чем оно найдёт тебя, и дострой систему:
            балансировщик, кэш, реплики, шарды, очередь.
          </p>

          <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LEVELS.map((L, i) => {
              const open = isOpen(i);
              const peak = L.curve ? `до ${fmt(Math.max(...L.curve.map((p) => p[1])))} RPS`
                : record > 0 ? `рекорд ${fmt(record)} RPS` : 'без потолка';
              return (
                <button
                  key={L.id}
                  type="button"
                  data-level={L.id}
                  disabled={!open}
                  onClick={() => onStart(i)}
                  className={cn(
                    'flex min-h-[250px] flex-col overflow-hidden rounded-[28px] text-left transition-transform duration-150',
                    L.endless && 'sm:col-span-2 lg:col-span-3 lg:min-h-[210px]',
                    open
                      ? cn(TILE[L.id], 'text-white hover:-translate-y-1 active:translate-y-0 active:scale-[.99]')
                      : 'cursor-not-allowed bg-panel2 text-dim',
                  )}
                >
                  <span className="flex items-center justify-between px-6 pt-5">
                    <span className={cn('num rounded-full px-3 py-1 text-[13px] font-semibold', open ? 'bg-white/20' : 'bg-white/70')}>
                      {L.endless ? 'Без конца' : `Уровень ${i + 1}`}
                    </span>
                    {!L.endless && open && <Stars n={stars[L.id] ?? 0} onColor />}
                  </span>
                  <span className="mt-4 block px-6 font-display text-[21px] font-semibold leading-tight">{L.title}</span>
                  <span className={cn('mt-1.5 block px-6 text-[15px]', open && 'text-white/80')}>
                    {open ? L.tagline : `Откроется после уровня ${i}`}
                  </span>
                  <span className={cn('mt-auto block pt-3', !open && 'text-line')}>
                    <Curve level={L} />
                  </span>
                  <span className={cn('flex items-center justify-between gap-3 px-6 py-3.5 text-[13px] font-medium',
                    open ? 'bg-black/15' : 'bg-line/60')}>
                    <span className="truncate">{L.teach}</span>
                    <span className="num whitespace-nowrap">{peak}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
