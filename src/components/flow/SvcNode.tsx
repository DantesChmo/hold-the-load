import { createContext, memo, useContext } from 'react';
import type { NodeProps } from '@xyflow/react';
import { cn } from '@/lib/cn';
import type { Kind } from '@/lib/sim';
import type { SvcData, SvcNode as SvcNodeType, Tone } from './buildFlow';

const BORDER: Record<Tone, string> = { ok: 'border-ok', warn: 'border-warn', bad: 'border-bad', idle: 'border-stat' };
const TEXT: Record<Tone, string> = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', idle: 'text-dim' };
const FILL: Record<Tone, string> = { ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', idle: 'bg-stat' };

/** Покупка компонента по клику на пустой слот схемы. */
export const BuyContext = createContext<(k: Kind) => void>(() => {});

function Tip({ tip }: { tip: SvcData['tip'] }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-60 -translate-x-1/2 rounded-lg border border-line bg-bg/95 p-2.5 text-left text-xs shadow-xl group-hover:block">
      <b className="block text-[13px] text-ink">{tip.title}</b>
      <p className="mt-0.5 text-dim">{tip.desc}</p>
      {tip.stats.map((line) => (
        <div key={line} className="mt-1 font-mono text-[11px] text-ink">{line}</div>
      ))}
    </div>
  );
}

function SvcNodeView({ data }: NodeProps<SvcNodeType>) {
  const { kind, state, w, h, tone, crit, util } = data;
  const size = { width: w, height: h };
  const onBuy = useContext(BuyContext);

  if (kind === 'hub') {
    return <div style={size} className="rotate-45 border border-accent bg-line" />;
  }

  if (state === 'ghost' && data.ghost) {
    return (
      <button
        type="button"
        style={size}
        onClick={() => onBuy(data.ghost!.kind)}
        className="nodrag nopan group relative flex cursor-pointer flex-col items-center justify-center rounded-[10px] border border-dashed border-accent/50 bg-stage text-accent/70 transition hover:border-accent hover:bg-accent/10 hover:text-accent"
      >
        <span className="text-xs font-semibold">+ {data.ghost.label}</span>
        <span className="font-mono text-[10px]">${data.ghost.cost}</span>
        <Tip tip={{ ...data.tip, stats: [`Нажми, чтобы построить — $${data.ghost.cost}`] }} />
      </button>
    );
  }

  if (state === 'pending') {
    return (
      <div style={size} className="group relative overflow-visible">
        <div className="absolute inset-0 overflow-hidden rounded-[10px] border border-dashed border-dim bg-node">
          <div className="h-full bg-accent/20 transition-[width] duration-150 ease-linear" style={{ width: `${data.prog * 100}%` }} />
        </div>
        {kind !== 'replica' && (
          <span className="absolute inset-0 grid place-items-center text-[11px] text-dim">деплой…</span>
        )}
        <Tip tip={data.tip} />
      </div>
    );
  }

  const hot = util != null && util > 0.85;
  const box = cn(
    'group relative rounded-[10px] border-[1.5px] transition-colors duration-200',
    BORDER[tone],
    crit ? 'animate-shake bg-node-crit shadow-[0_0_22px_rgba(255,77,109,.75)]' : 'bg-node',
    !crit && hot && 'shadow-[0_0_10px_rgba(255,77,109,.45)]',
  );

  if (kind === 'replica') {
    return (
      <div style={size} className={cn(box, 'grid place-items-center')}>
        <span className={cn('font-mono text-[11px] font-bold', TEXT[tone])}>R</span>
        <Tip tip={data.tip} />
      </div>
    );
  }

  const compact = h < 38;
  return (
    <div style={size} className={box}>
      <div className={cn('flex h-full px-2 pb-1', compact ? 'items-center justify-between' : 'flex-col items-center justify-center')}>
        <span className="whitespace-nowrap text-xs font-semibold leading-tight text-ink">{data.title}</span>
        <span className={cn('whitespace-nowrap font-mono text-[11px] font-bold leading-tight', TEXT[tone])}>{data.sub}</span>
      </div>
      {util != null && (
        <div className="absolute inset-x-1.5 bottom-[3px] h-[2.5px] overflow-hidden rounded bg-white/10">
          <div className={cn('h-full transition-[width] duration-150', FILL[tone])} style={{ width: `${Math.min(1, util) * 100}%` }} />
        </div>
      )}
      <Tip tip={data.tip} />
    </div>
  );
}

export const SvcNode = memo(SvcNodeView);
