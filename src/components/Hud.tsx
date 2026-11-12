import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { fmt } from '@/lib/store';
import type { View } from '@/lib/view';

function Tile({ label, value, note, tone, className }: {
  label: ReactNode; value?: ReactNode; note: ReactNode; tone?: string; className?: string;
}) {
  return (
    <div className={cn('min-w-0 rounded-[10px] border border-line bg-panel px-3 py-2', className)}>
      <div className="text-[11px] uppercase tracking-wider text-dim">{label}</div>
      {value != null && <div className={cn('whitespace-nowrap font-mono text-[22px] font-bold leading-tight', tone)}>{value}</div>}
      <div className="whitespace-nowrap text-[11px] text-dim">{note}</div>
    </div>
  );
}

export function Hud({ view }: { view: View }) {
  const { m, err, hp } = view;
  const hurt = err > 0.01;
  return (
    <div className="grid grid-cols-2 gap-2.5 px-3 pt-2.5 lg:grid-cols-[repeat(4,1fr)_1.5fr]">
      <Tile label="Нагрузка" value={fmt(m.R)} note="RPS" />
      <Tile
        label="Ошибки сейчас"
        value={(err * 100).toFixed(err < 0.1 ? 1 : 0) + '%'}
        tone={hurt ? 'text-bad' : err > 0.002 ? 'text-warn' : undefined}
        note={`доступность ${(view.avail * 100).toFixed(2)}%`}
      />
      <Tile
        label="Задержка"
        value={fmt(m.latency)}
        tone={m.latency > 800 ? 'text-bad' : m.latency > 250 ? 'text-warn' : undefined}
        note="мс"
      />
      <Tile label="Бюджет" value={'$' + fmt(Math.floor(view.money))} tone="text-ok" note={`+$${m.income.toFixed(1)}/с`} />
      <div
        data-testid="sla"
        className={cn('col-span-2 min-w-0 rounded-[10px] border bg-panel px-3 py-2 lg:col-span-1',
          hurt ? 'animate-hurt border-bad' : 'border-line')}
      >
        <div className="text-[11px] uppercase tracking-wider text-dim">SLA {Math.ceil(hp)}%</div>
        <div className="my-1.5 h-3 overflow-hidden rounded-md bg-[#1b2540]">
          <div
            className={cn('h-full rounded-md transition-[width,background-color] duration-200',
              hp > 60 ? 'bg-ok' : hp > 30 ? 'bg-warn' : 'bg-bad')}
            style={{ width: `${hp}%` }}
          />
        </div>
        <div className="text-[11px] text-dim">упадёт до нуля — инцидент</div>
      </div>
    </div>
  );
}
