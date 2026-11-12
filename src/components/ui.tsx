import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} title="К уровням" className="flex items-center gap-2.5 rounded-full">
      <b className="rounded-full bg-bad px-3 py-1 font-display text-[15px] font-bold leading-none text-white">503</b>
      <span className="hidden text-[13px] text-dim sm:inline">тренажёр System Design</span>
    </button>
  );
}

export function Header({ children, onLogo }: { children?: ReactNode; onLogo?: () => void }) {
  return (
    <header className="flex items-center gap-4 px-4 py-3">
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
        'rounded-full px-4 py-2 font-medium transition-colors',
        variant === 'primary'
          ? 'bg-accent font-semibold text-white hover:bg-ink'
          : 'bg-panel hover:bg-panel2',
        active && 'bg-warn text-white hover:bg-warn',
        className,
      )}
    />
  );
}

export function Stars({ n, big, onColor }: { n: number; big?: boolean; onColor?: boolean }) {
  return (
    <span className={cn('whitespace-nowrap', big ? 'text-4xl tracking-[4px]' : 'text-[17px] tracking-[1px]')} aria-label={`${n} из 3 звёзд`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < n ? (onColor ? 'text-white' : 'text-[#ffb400]') : onColor ? 'text-white/30' : 'text-line'}>★</span>
      ))}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="num inline-grid min-w-[22px] place-items-center rounded-md bg-panel2 px-1.5 py-0.5 font-sans text-[12px] font-semibold text-dim">
      {children}
    </kbd>
  );
}
