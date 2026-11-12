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
      className="fixed inset-0 z-50 grid place-items-center bg-[#04070e]/80 p-4 backdrop-blur-sm"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ scale: 0.94, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="max-h-full w-full max-w-[560px] overflow-auto rounded-2xl border border-line bg-panel p-6"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function Facts({ items }: { items: [string, string][] }) {
  return (
    <div className="mb-3.5 grid grid-cols-3 gap-2">
      {items.map(([value, label]) => (
        <div key={label} className="rounded-lg bg-panel2 px-2.5 py-2 text-xs text-dim">
          <b className="block font-mono text-[17px] text-ink">{value}</b>
          {label}
        </div>
      ))}
    </div>
  );
}

function Note({ title, tone, children }: { title: string; tone: 'ok' | 'bad'; children: ReactNode }) {
  return (
    <div className={cn('mb-3.5 rounded-[10px] border px-3 py-2.5 text-[13.5px]',
      tone === 'ok' ? 'border-ok/30 bg-ok/10 text-[#cfe9dd]' : 'border-bad/35 bg-bad/10 text-[#f2cfd6]')}>
      <b className="mb-0.5 block">{title}</b>
      {children}
    </div>
  );
}

const Eyebrow = ({ children, bad }: { children: ReactNode; bad?: boolean }) => (
  <div className={cn('font-mono text-xs font-semibold uppercase tracking-widest', bad ? 'text-bad' : 'text-accent')}>{children}</div>
);

export function Briefing({ level, idx, onGo, onMenu }: { level: Level; idx: number; onGo: () => void; onMenu: () => void }) {
  const peak = level.curve ? fmt(Math.max(...level.curve.map((p) => p[1]))) : '∞';
  return (
    <Modal>
      <Eyebrow>{level.endless ? 'Режим на рекорд' : `Уровень ${idx + 1}`} · {level.teach}</Eyebrow>
      <h2 className="mb-2 mt-1 text-[26px] font-bold">{level.title}</h2>
      <p className="mb-3 text-[#b8c4dd]">{level.brief}</p>
      <div className="mb-3 rounded-r-lg border-l-[3px] border-accent bg-panel2 px-3 py-1.5">{level.goal}</div>
      <Facts items={[[peak, 'пик, RPS'], [pct(level.static), 'статика'], [pct(level.write), 'запись в динамике']]} />
      <p className="mb-4 text-[#b8c4dd]">
        Следи за графиком внизу: пунктир — сколько держит твоя схема, кривая — что придёт. Компонент разворачивается{' '}
        {DEPLOY} секунды, так что строй заранее.
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Btn onClick={onMenu} className="px-4 py-2">К уровням</Btn>
        <Btn variant="primary" autoFocus onClick={onGo} data-testid="go" className="px-4 py-2">Поехали</Btn>
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
        <Eyebrow>Система выстояла</Eyebrow>
        <div className="my-1"><Stars n={stars} big /></div>
        <h2 className="mb-2 text-[26px] font-bold text-ok">{L.title} — пройдено</h2>
        <Facts items={facts} />
        <Note title="Что сказать на интервью" tone="ok">{L.lesson}</Note>
        {stars < 3 && (
          <p className="mb-4 text-[#b8c4dd]">
            Три звезды дают за доступность 99,9% («три девятки»), две — за 99%. Строй до того, как утилизация дойдёт до 100%.
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Btn onClick={onMenu} className="px-4 py-2">К уровням</Btn>
          <Btn onClick={onRetry} variant={onNext ? 'default' : 'primary'} className="px-4 py-2">Ещё раз</Btn>
          {onNext && <Btn variant="primary" autoFocus onClick={onNext} className="px-4 py-2">Дальше</Btn>}
        </div>
      </Modal>
    );
  }
  return (
    <Modal>
      <Eyebrow bad>503 Service Unavailable</Eyebrow>
      <h2 className="mb-2 mt-1 text-[26px] font-bold text-bad">
        {L.endless ? `Удержано ${fmt(view.tot.peak)} RPS` : 'Система легла'}
      </h2>
      {newRecord && <p className="mb-3 font-semibold text-warn">Новый рекорд!</p>}
      <Facts items={facts} />
      <Note title="Постмортем" tone="bad">{POSTMORTEM[view.worst]}</Note>
      {L.endless && <Note title="Вывод" tone="ok">{L.lesson}</Note>}
      <div className="flex flex-wrap justify-end gap-2">
        <Btn onClick={onMenu} className="px-4 py-2">К уровням</Btn>
        <Btn variant="primary" autoFocus onClick={onRetry} className="px-4 py-2">Ещё раз</Btn>
      </div>
    </Modal>
  );
}
