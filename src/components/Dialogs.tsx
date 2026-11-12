'use client';

import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { DEPLOY, type Blame, type Level } from '@/lib/sim';
import { fmt, pct } from '@/lib/store';
import type { View } from '@/lib/view';
import { Btn, Stars } from './ui';

function Modal({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-full w-full max-w-[580px] overflow-auto rounded-[32px] bg-panel p-6 shadow-[0_24px_70px_rgba(23,23,43,.3)] sm:p-8"
      >
        {children}
      </div>
    </motion.div>
  );
}

function Facts({ items }: { items: [string, string][] }) {
  return (
    <div className="mb-4 grid grid-cols-3 gap-2">
      {items.map(([value, label]) => (
        <div key={label} className="rounded-2xl bg-panel2 px-4 py-3 text-[13px] text-dim">
          <b className="num block text-[24px] font-bold leading-tight tracking-tight text-ink">{value}</b>
          {label}
        </div>
      ))}
    </div>
  );
}

function Note({ title, tone, children }: { title: string; tone: 'ok' | 'bad'; children: ReactNode }) {
  return (
    <div className={cn('mb-4 rounded-2xl px-4 py-3 leading-relaxed', tone === 'ok' ? 'bg-ok/12' : 'bg-bad/10')}>
      <b className={cn('mb-0.5 block', tone === 'ok' ? 'text-ok' : 'text-bad')}>{title}</b>
      {children}
    </div>
  );
}

const Kicker = ({ children, bad }: { children: ReactNode; bad?: boolean }) => (
  <div className={cn('text-[14px]', bad ? 'font-semibold text-bad' : 'text-dim')}>{children}</div>
);

const Title = ({ children, className }: { children: ReactNode; className?: string }) => (
  <h2 className={cn('mb-3 mt-1.5 font-display text-[30px] font-bold leading-[1.1] tracking-tight', className)}>{children}</h2>
);

export function Briefing({ level, idx, onGo, onMenu }: { level: Level; idx: number; onGo: () => void; onMenu: () => void }) {
  const peak = level.curve ? fmt(Math.max(...level.curve.map((p) => p[1]))) : '∞';
  return (
    <Modal>
      <Kicker>{level.endless ? level.teach : `Уровень ${idx + 1}. ${level.teach}`}</Kicker>
      <Title>{level.title}</Title>
      <p className="mb-4 text-[15px] leading-relaxed">{level.brief}</p>
      <div className="mb-4 rounded-2xl bg-accent px-4 py-3 text-[15px] font-semibold text-white">{level.goal}</div>
      <Facts items={[[peak, 'пик, RPS'], [pct(level.static), 'статика'], [pct(level.write), 'запись в динамике']]} />
      <p className="mb-6 leading-relaxed text-dim">
        Следи за графиком внизу: пунктир — сколько держит твоя схема, кривая — что придёт. Компонент разворачивается{' '}
        {DEPLOY} секунды, так что строй заранее.
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Btn onClick={onMenu} className="bg-panel2 px-5 py-2.5 hover:bg-line">К уровням</Btn>
        <Btn variant="primary" autoFocus onClick={onGo} data-testid="go" className="px-6 py-2.5">Поехали</Btn>
      </div>
    </Modal>
  );
}

const POSTMORTEM: Record<Blame, string> = {
  app: 'Запросы терялись на серверах приложений: мощности stateless-слоя не хватило. Балансировщик и дополнительные серверы нужны до того, как утилизация дойдёт до 100%. Если много статики — сначала CDN.',
  dbRead: 'База не справилась с чтением. Повторяющиеся запросы стоит отдавать из кэша, остальное — размазать по read-репликам.',
  dbWrite: 'База не справилась с записью. Реплики тут бесполезны — каждая применяет те же записи. Запись масштабируется шардированием, а пики сглаживает очередь.',
  queue: 'Очередь переполнилась: приток записей долго превышал скорость разбора. Очередь сглаживает пик, но среднюю пропускную способность даёт только база — нужны шарды.',
};

/** Звёзды за доступность: 99,9% — три, 99% — две, прошёл — одна. */
export const starsFor = (avail: number) => (avail >= 0.999 ? 3 : avail >= 0.99 ? 2 : 1);

interface ResultProps {
  view: View;
  newRecord: boolean;
  onMenu: () => void;
  onRetry: () => void;
  onNext?: () => void;
}

export function Result({ view, newRecord, onMenu, onRetry, onNext }: ResultProps) {
  const L = view.level, win = view.over === 'win';
  const facts: [string, string][] = [
    [(view.avail * 100).toFixed(2) + '%', 'доступность'],
    [fmt(view.tot.peak), 'пик, RPS'],
    ['$' + fmt(view.tot.spent), 'потрачено'],
  ];
  if (win) {
    const stars = starsFor(view.avail);
    return (
      <Modal>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Kicker>{L.title}</Kicker>
            <Title className="text-ok">Система выстояла</Title>
          </div>
          <Stars n={stars} big />
        </div>
        <Facts items={facts} />
        <Note title="Что сказать на интервью" tone="ok">{L.lesson}</Note>
        {stars < 3 && (
          <p className="mb-6 leading-relaxed text-dim">
            Три звезды дают за доступность 99,9% («три девятки»), две — за 99%. Строй до того, как утилизация дойдёт до 100%.
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Btn onClick={onMenu} className="bg-panel2 px-5 py-2.5 hover:bg-line">К уровням</Btn>
          <Btn onClick={onRetry} variant={onNext ? 'default' : 'primary'} className={cn('px-5 py-2.5', onNext && 'bg-panel2 hover:bg-line')}>Ещё раз</Btn>
          {onNext && <Btn variant="primary" autoFocus onClick={onNext} className="px-6 py-2.5">Дальше</Btn>}
        </div>
      </Modal>
    );
  }
  return (
    <Modal>
      <Kicker bad>503 Service Unavailable</Kicker>
      <Title>{L.endless ? `Удержано ${fmt(view.tot.peak)} RPS` : 'Система легла'}</Title>
      {newRecord && <p className="mb-3 font-semibold text-warn">Новый рекорд!</p>}
      <Facts items={facts} />
      <Note title="Постмортем" tone="bad">{POSTMORTEM[view.worst]}</Note>
      {L.endless && <Note title="Вывод" tone="ok">{L.lesson}</Note>}
      <div className="flex flex-wrap justify-end gap-2">
        <Btn onClick={onMenu} className="bg-panel2 px-5 py-2.5 hover:bg-line">К уровням</Btn>
        <Btn variant="primary" autoFocus onClick={onRetry} className="px-6 py-2.5">Ещё раз</Btn>
      </div>
    </Modal>
  );
}
