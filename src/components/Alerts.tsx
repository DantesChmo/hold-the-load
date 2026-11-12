'use client';

import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { ACTIONS, type Kind } from '@/lib/sim';
import type { View } from '@/lib/view';

/** Диагностика узких мест: что перегружено, почему и (если включены подсказки) чем лечить. */
export function Alerts({ view, hints, onBuy }: { view: View; hints: boolean; onBuy: (k: Kind) => void }) {
  return (
    <div className="absolute bottom-2.5 left-2.5 z-10 flex w-[min(380px,60%)] flex-col gap-2">
      <AnimatePresence initial={false}>
        {view.issues.map((x) => (
          <motion.div
            key={x.id}
            layout
            data-alert={x.sev}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className={cn(
              'rounded-lg border border-l-4 bg-panel/95 px-2.5 py-2 text-[12.5px]',
              x.sev === 'crit' ? 'animate-hurt border-bad' : 'border-warn',
            )}
          >
            <b className={cn('block text-[13px]', x.sev === 'crit' ? 'text-bad' : 'text-warn')}>
              {x.sev === 'crit' && '⚠ '}{x.title}
            </b>
            {x.text}
            {hints && x.fixes.length > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-dim">
                Варианты:
                {x.fixes.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => onBuy(k)}
                    className="rounded-md border border-line bg-panel2 px-2 py-0.5 text-xs text-ink transition hover:border-accent"
                  >
                    {ACTIONS[k].name} ${view.actions[k].cost}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
