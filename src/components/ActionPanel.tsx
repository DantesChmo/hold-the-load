import { cn } from '@/lib/cn';
import { ACTIONS, ORDER, type Kind } from '@/lib/sim';
import type { View } from '@/lib/view';
import { Kbd } from './ui';

interface Props {
  view: View;
  /** Только что купленный компонент — подсветить кнопку. */
  flash: Kind | null;
  onBuy: (k: Kind) => void;
}

export function ActionPanel({ view, flash, onBuy }: Props) {
  return (
    <aside className="w-full flex-none overflow-auto border-t border-line bg-panel/60 p-3 lg:w-[290px] lg:border-l lg:border-t-0">
      <h3 className="mb-2.5 text-xs uppercase tracking-widest text-dim">Достроить систему</h3>
      {ORDER.map((k, i) => {
        const a = ACTIONS[k], { res, cost, total } = view.actions[k];
        const count = res.locked ? '🔒' : a.max > 1 ? `${total}/${a.max}` : total ? '✓' : '';
        return (
          <button
            key={k}
            type="button"
            data-action={k}
            aria-disabled={!res.ok}
            onClick={() => onBuy(k)}
            className={cn(
              'mb-2 grid w-full grid-cols-[22px_1fr_auto] items-baseline gap-x-2 gap-y-0.5 rounded-[10px] border bg-panel px-2.5 py-2 text-left transition',
              res.ok ? 'border-line hover:border-accent active:scale-[.98]' : 'cursor-not-allowed border-line',
              res.locked && 'opacity-35',
              flash === k && 'border-ok shadow-[0_0_14px_rgba(61,220,151,.35)]',
            )}
          >
            <Kbd>{i + 1}</Kbd>
            <span className={cn('font-semibold', !res.ok && 'opacity-50')}>
              {a.name}
              <em className="ml-1.5 text-xs font-normal not-italic text-dim">{count}</em>
            </span>
            <span className={cn('font-mono text-[13px] font-bold', res.ok ? 'text-ok' : 'text-dim')}>
              {res.locked || res.max ? '' : `$${cost}`}
            </span>
            <span className={cn('col-span-2 col-start-2 text-xs text-dim', !res.ok && 'opacity-50')}>{a.desc}</span>
            {!res.ok && !res.locked && (
              <span className="col-span-2 col-start-2 text-[11.5px] text-warn">{res.why}</span>
            )}
          </button>
        );
      })}
      <p className="text-xs text-dim">
        Клавиши <Kbd>1</Kbd>–<Kbd>7</Kbd> — построить, <Kbd>Пробел</Kbd> — пауза. Схему можно двигать и масштабировать.
      </p>
    </aside>
  );
}
