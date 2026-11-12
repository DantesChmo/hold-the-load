import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { fmt } from '@/lib/store';
import type { View } from '@/lib/view';

function Stat({ label, value, note, tone }: { label: ReactNode; value: ReactNode; note: ReactNode; tone?: string }) {
  return (
    <div className="min-w-0 px-5 py-3">
      <div className="text-[13px] text-dim">{label}</div>
      <div className={cn('num whitespace-nowrap text-[28px] font-bold leading-tight tracking-tight', tone)}>{value}</div>
      <div className="num whitespace-nowrap text-[12.5px] text-dim">{note}</div>
    </div>
  );
}

export function Hud({ view }: { view: View }) {
  const { m, err, hp } = view;
  const hurt = err > 0.01;
  return (
    <div className="mx-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_300px]">
      {/* Показатели живут в одной плашке, а не в россыпи одинаковых карточек. */}
      <div className="grid grid-cols-2 rounded-3xl bg-panel sm:grid-cols-4">
        <Stat label="Нагрузка" value={fmt(m.R)} note="RPS" />
        <Stat
          label="Ошибки сейчас"
          value={(err * 100).toFixed(err < 0.1 ? 1 : 0) + '%'}
          tone={hurt ? 'text-bad' : err > 0.002 ? 'text-warn' : undefined}
          note={`доступность ${(view.avail * 100).toFixed(2)}%`}
        />
        <Stat
          label="Задержка"
          value={fmt(m.latency)}
          tone={m.latency > 800 ? 'text-bad' : m.latency > 250 ? 'text-warn' : undefined}
          note="мс"
        />
        <Stat label="Бюджет" value={'$' + fmt(Math.floor(view.money))} note={`+$${m.income.toFixed(1)}/с`} />
      </div>
      <div data-testid="sla" className={cn('min-w-0 rounded-3xl bg-panel px-5 py-3', hurt && 'animate-hurt')}>
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] text-dim">SLA</span>
          <span className={cn('num text-[28px] font-bold leading-tight tracking-tight',
            hp > 60 ? 'text-ink' : hp > 30 ? 'text-warn' : 'text-bad')}>
            {Math.ceil(hp)}%
          </span>
        </div>
        <div className="my-1 h-3.5 overflow-hidden rounded-full bg-panel2">
          <div
            className={cn('h-full rounded-full transition-[width,background-color] duration-200',
              hp > 60 ? 'bg-ok' : hp > 30 ? 'bg-warn' : 'bg-bad')}
            style={{ width: `${hp}%` }}
          />
        </div>
        <div className="text-[12.5px] text-dim">упадёт до нуля — инцидент</div>
      </div>
    </div>
  );
}
