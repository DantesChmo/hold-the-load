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
    <aside className="m-3 flex-none overflow-auto rounded-3xl bg-panel p-2 lg:mb-3 lg:ml-0 lg:mt-0 lg:w-[310px]">
      <h3 className="px-3 pb-1.5 pt-2.5 font-display text-[15px] font-semibold">Достроить систему</h3>
      {ORDER.map((k, i) => {
        const a = ACTIONS[k], { res, cost, total } = view.actions[k];
        const count = res.locked ? 'нет на этом уровне' : a.max > 1 ? `${total}/${a.max}` : total ? '✓' : '';
        return (
          <button
            key={k}
            type="button"
            data-action={k}
            aria-disabled={!res.ok}
            onClick={() => onBuy(k)}
            className={cn(
              'grid w-full grid-cols-[26px_1fr_auto] items-baseline gap-x-2 gap-y-0.5 rounded-2xl px-3 py-2.5 text-left transition-colors',
              res.ok ? 'hover:bg-panel2 active:bg-accent/15' : 'cursor-not-allowed',
              res.locked && 'opacity-40',
              flash === k && 'bg-ok/20',
            )}
          >
            <Kbd>{i + 1}</Kbd>
            <span className={cn('text-[14px] font-semibold', !res.ok && 'opacity-55')}>
              {a.name}
              <em className="num ml-1.5 text-[13px] font-normal not-italic text-dim">{count}</em>
            </span>
            <span className={cn('num rounded-full px-2.5 py-0.5 text-[13px] font-semibold',
              res.locked || res.max ? 'hidden' : res.ok ? 'bg-accent text-white' : 'bg-panel2 text-dim')}>
              ${cost}
            </span>
            <span className={cn('col-span-2 col-start-2 text-[13px] leading-snug text-dim', !res.ok && 'opacity-70')}>{a.desc}</span>
            {!res.ok && !res.locked && (
              <span className="col-span-2 col-start-2 text-[13px] font-medium text-warn">{res.why}</span>
            )}
          </button>
        );
      })}
      <p className="px-3 pb-2 pt-3 text-[13px] leading-relaxed text-dim">
        Клавиши <Kbd>1</Kbd>–<Kbd>7</Kbd> — построить, <Kbd>Пробел</Kbd> — пауза. Схему можно двигать и масштабировать.
      </p>
    </aside>
  );
}
