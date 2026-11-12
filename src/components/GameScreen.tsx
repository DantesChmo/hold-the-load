'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { computeLayout } from '@/lib/layout';
import { ParticleSystem } from '@/lib/particles';
import { ACTIONS, LEVELS, ORDER, buy, newState, step, type GameState, type Kind } from '@/lib/sim';
import { useProgress } from '@/lib/store';
import { makeView, type View } from '@/lib/view';
import { ActionPanel } from './ActionPanel';
import { Alerts } from './Alerts';
import { Briefing, Result, starsFor } from './Dialogs';
import { Hud } from './Hud';
import { LoadChart } from './LoadChart';
import { buildFlow } from './flow/buildFlow';
import { SystemGraph } from './flow/SystemGraph';
import { Btn, Header } from './ui';

type Phase = 'brief' | 'play' | 'over';
const UI_INTERVAL = 110; // мс между снимками для интерфейса
const SPEEDS = [1, 2, 3];

const LEGEND: [string, string][] = [
  ['bg-stat', 'статика'], ['bg-ok', 'чтение'], ['bg-write', 'запись'], ['bg-bad', 'отказ'],
];

interface Props {
  levelIdx: number;
  onMenu: () => void;
  onRetry: () => void;
  onNext?: () => void;
}

export function GameScreen({ levelIdx, onMenu, onRetry, onNext }: Props) {
  const level = LEVELS[levelIdx];
  const hints = useProgress((p) => p.hints), toggleHints = useProgress((p) => p.toggleHints);

  const [view, setView] = useState<View>(() => makeView(newState(level)));
  const [phase, setPhase] = useState<Phase>('brief');
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [flash, setFlash] = useState<Kind | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [newRecord, setNewRecord] = useState(false);

  const sim = useRef<GameState | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  // Игровой цикл читает управление из ref, чтобы не перезапускаться при каждом нажатии.
  const ctl = useRef({ running: false, speed: 1 });
  useEffect(() => {
    ctl.current = { running: phase === 'play' && !paused, speed };
  }, [phase, paused, speed]);

  useEffect(() => {
    const s = newState(level), particles = new ParticleSystem();
    sim.current = s;
    let raf = 0, last = performance.now(), lastUi = 0, finished = false;

    const finish = () => {
      finished = true;
      const progress = useProgress.getState(), avail = s.tot.ok / Math.max(1, s.tot.ok + s.tot.fail);
      if (s.over === 'win') progress.setStars(level.id, starsFor(avail));
      else if (level.endless) {
        setNewRecord(s.tot.peak > progress.record);
        progress.setRecord(s.tot.peak);
        progress.setStars(level.id, 1);
      }
      setView(makeView(s));
      setPhase('over');
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const run = ctl.current.running && !s.over;
      if (run) {
        let left = dt * ctl.current.speed;
        while (left > 1e-6 && !s.over) {
          const h = Math.min(left, 0.04);
          step(s, h);
          left -= h;
        }
      }
      particles.tick(s, computeLayout(s).byId, run ? dt * ctl.current.speed : 0);
      const ctx = canvas.current?.getContext('2d');
      if (ctx) particles.draw(ctx, dt);
      if (s.over && !finished) finish();
      else if (now - lastUi > UI_INTERVAL) {
        lastUi = now;
        setView(makeView(s));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [level]);

  const onBuy = useCallback((k: Kind) => {
    const s = sim.current;
    if (!s || phase !== 'play') return;
    const r = buy(s, k);
    if (r.ok) setFlash(k);
    else setToast(`${ACTIONS[k].name}: ${r.why?.toLowerCase()}`);
    setView(makeView(s));
  }, [phase]);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 350);
    return () => clearTimeout(id);
  }, [flash]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 1500);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'play' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.key >= '1' && e.key <= '7') onBuy(ORDER[Number(e.key) - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, onBuy]);

  const flow = useMemo(() => buildFlow(view), [view]);

  return (
    <div className="flex h-full flex-col">
      <Header onLogo={onMenu}>
        <div className="min-w-0 flex-1 truncate text-[16px] font-semibold">
          {level.endless ? '∞' : levelIdx + 1}. {level.title}
          <small className="ml-2 text-[13px] font-normal text-dim">{level.teach}</small>
        </div>
        <div className="flex gap-2">
          <Btn active={paused} title="Пробел" onClick={() => phase === 'play' && setPaused((p) => !p)}>
            {paused ? 'Продолжить' : 'Пауза'}
          </Btn>
          <Btn title="Скорость" data-testid="speed" className="num min-w-10 font-semibold" onClick={() => setSpeed((v) => SPEEDS[(SPEEDS.indexOf(v) + 1) % SPEEDS.length])}>
            {speed}×
          </Btn>
          <Btn title="Показывать варианты решения" onClick={toggleHints} className="hidden md:block">
            Подсказки: {hints ? 'вкл' : 'выкл'}
          </Btn>
          <Btn onClick={onRetry}>Заново</Btn>
          <Btn onClick={onMenu}>Уровни</Btn>
        </div>
      </Header>

      <div className="flex min-h-0 flex-1 flex-col overflow-auto lg:flex-row lg:overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col lg:pb-0">
          <Hud view={view} />
          <div className="relative mx-3 mt-2.5 min-h-[360px] flex-1 overflow-hidden rounded-3xl bg-stage">
            <ReactFlowProvider>
              <SystemGraph nodes={flow.nodes} edges={flow.edges} canvasRef={canvas} onBuy={onBuy} />
            </ReactFlowProvider>
            <div className="pointer-events-none absolute right-4 top-3.5 flex gap-3.5 text-[13px] text-dim">
              {LEGEND.map(([color, label]) => (
                <span key={label} className="flex items-center gap-1.5">
                  <i className={`size-2.5 rounded-full ${color}`} />{label}
                </span>
              ))}
            </div>
            {paused && phase === 'play' && (
              <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-warn px-4 py-1 text-[13px] font-semibold text-white">
                Пауза. Строить можно
              </div>
            )}
            <Alerts view={view} hints={hints} onBuy={onBuy} />
          </div>
          <LoadChart view={view} />
        </div>
        <ActionPanel view={view} flash={flash} onBuy={onBuy} />
      </div>

      {toast && (
        <div role="status" className="fixed bottom-40 left-1/2 z-40 -translate-x-1/2 rounded-full bg-ink px-5 py-2 text-[13.5px] font-medium text-white shadow-[0_6px_24px_rgba(23,23,43,.25)]">
          {toast}
        </div>
      )}
      {phase === 'brief' && <Briefing level={level} idx={levelIdx} onGo={() => setPhase('play')} onMenu={onMenu} />}
      {phase === 'over' && <Result view={view} newRecord={newRecord} onMenu={onMenu} onRetry={onRetry} onNext={onNext} />}
    </div>
  );
}
