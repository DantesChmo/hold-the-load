import { createContext, memo, useContext } from 'react';
import type { NodeProps } from '@xyflow/react';
import { cn } from '@/lib/cn';
import type { Kind } from '@/lib/sim';
import type { SvcData, SvcNode as SvcNodeType, Tone } from './buildFlow';

const BORDER: Record<Tone, string> = { ok: 'border-ok bg-[#e9f8f1]', warn: 'border-warn bg-[#fff3df]', bad: 'border-bad bg-[#ffe9eb]', idle: 'border-ink bg-node' };
const TEXT: Record<Tone, string> = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', idle: 'text-dim' };
const FILL: Record<Tone, string> = { ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', idle: 'bg-ink' };

/** Покупка компонента по клику на пустой слот схемы. */
export const BuyContext = createContext<(k: Kind) => void>(() => {});

function Tip({ tip }: { tip: SvcData['tip'] }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-60 -translate-x-1/2 rounded-2xl bg-ink p-3 text-left text-[12.5px] font-normal leading-snug shadow-[0_8px_28px_rgba(23,23,43,.35)] group-hover:block">
      <b className="block text-[13px] text-white">{tip.title}</b>
      <p className="mt-0.5 text-white/70">{tip.desc}</p>
      {tip.stats.map((line) => (
        <div key={line} className="num mt-1 text-[12.5px] text-white">{line}</div>
      ))}
    </div>
  );
}

function SvcNodeView({ data }: NodeProps<SvcNodeType>) {
  const { kind, state, w, h, tone, crit, util } = data;
  const size = { width: w, height: h };
  const onBuy = useContext(BuyContext);

  if (kind === 'hub') {
    return <div style={size} className="rounded-full border-2 border-dim bg-panel" />;
  }

  if (state === 'ghost' && data.ghost) {
    return (
      <button
        type="button"
        style={size}
        onClick={() => onBuy(data.ghost!.kind)}
        className="nodrag nopan group relative flex cursor-pointer flex-col items-center justify-center rounded-[14px] border-2 border-dashed border-accent/50 bg-[#f3f1ff] text-accent transition-colors hover:border-accent hover:bg-[#e4e0ff]"
      >
        <span className="text-[12.5px] font-semibold leading-tight">+ {data.ghost.label}</span>
        <span className="num text-[11.5px] leading-tight">${data.ghost.cost}</span>
        <Tip tip={{ ...data.tip, stats: [`Нажми, чтобы построить — $${data.ghost.cost}`] }} />
      </button>
    );
  }

  if (state === 'pending') {
    return (
      <div style={size} className="group relative overflow-visible">
        <div className="absolute inset-0 overflow-hidden rounded-[14px] border-2 border-dashed border-dim bg-node">
          <div className="h-full bg-accent/15 transition-[width] duration-150 ease-linear" style={{ width: `${data.prog * 100}%` }} />
        </div>
        {kind !== 'replica' && (
          <span className="absolute inset-0 grid place-items-center text-[11px] text-dim">деплой…</span>
        )}
        <Tip tip={data.tip} />
      </div>
    );
  }

  const box = cn(
    'group relative rounded-[14px] border-2 transition-colors duration-200',
    BORDER[tone],
    crit && 'animate-shake !bg-node-crit',
  );

  if (kind === 'replica') {
    return (
      <div style={size} className={cn(box, 'grid place-items-center')}>
        <span className={cn('num text-[11.5px] font-bold', TEXT[tone])}>R</span>
        <Tip tip={data.tip} />
      </div>
    );
  }

  const compact = h < 38;
  return (
    <div style={size} className={box}>
      <div className={cn('flex h-full px-2 pb-1', compact ? 'items-center justify-between' : 'flex-col items-center justify-center')}>
        <span className="whitespace-nowrap text-[12px] font-semibold leading-tight text-ink">{data.title}</span>
        <span className={cn('num whitespace-nowrap text-[11.5px] font-bold leading-tight', TEXT[tone])}>{data.sub}</span>
      </div>
      {util != null && (
        <div className="absolute inset-x-2.5 bottom-[4px] h-[3px] overflow-hidden rounded-full bg-ink/10">
          <div className={cn('h-full transition-[width] duration-150', FILL[tone])} style={{ width: `${Math.min(1, util) * 100}%` }} />
        </div>
      )}
      <Tip tip={data.tip} />
    </div>
  );
}

export const SvcNode = memo(SvcNodeView);
