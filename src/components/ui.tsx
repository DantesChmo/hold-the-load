import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} title="К уровням" className="flex items-baseline gap-2.5">
      <b className="font-mono text-[22px] font-extrabold text-bad [text-shadow:0_0_14px_rgba(255,77,109,.6)]">503</b>
      <span className="hidden text-xs uppercase tracking-widest text-dim sm:inline">тренажёр System Design</span>
    </button>
  );
}

export function Header({ children, onLogo }: { children?: ReactNode; onLogo?: () => void }) {
  return (
    <header className="flex items-center gap-4 border-b border-line bg-bg/80 px-4 py-2.5">
      <Logo onClick={onLogo} />
      {children}
    </header>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary'; active?: boolean };

export function Btn({ variant = 'default', active, className, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'rounded-lg border px-3 py-1.5 transition',
        variant === 'primary'
          ? 'border-accent bg-accent font-bold text-[#04121a] hover:brightness-110'
          : 'border-line bg-panel2 hover:border-accent',
        active && 'border-warn text-warn',
        className,
      )}
    />
  );
}

export function Stars({ n, big }: { n: number; big?: boolean }) {
  return (
    <span className={cn(big ? 'text-4xl tracking-[6px]' : 'text-[15px] tracking-[2px]')} aria-label={`${n} из 3 звёзд`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < n ? 'text-warn [text-shadow:0_0_12px_rgba(255,209,102,.6)]' : 'text-[#2a3552]'}>★</span>
      ))}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line px-1.5 font-mono text-[11px] font-semibold text-dim">{children}</kbd>;
}
