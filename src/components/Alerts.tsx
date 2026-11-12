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
              'rounded-2xl border-2 bg-panel px-4 py-3 text-[13.5px] leading-snug shadow-[0_6px_24px_rgba(23,23,43,.14)]',
              x.sev === 'crit' ? 'animate-hurt border-bad' : 'border-warn',
            )}
          >
            <b className={cn('block', x.sev === 'crit' ? 'text-bad' : 'text-warn')}>
              {x.title}
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
                    className="num rounded-full bg-accent px-3 py-1 text-[13px] font-semibold text-white transition-colors hover:bg-ink"
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
