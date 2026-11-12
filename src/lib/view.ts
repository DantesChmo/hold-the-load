/* Снимок состояния игры для отрисовки. Симуляция мутабельна и живёт вне React —
   интерфейс видит только эти неизменяемые снимки, ~9 раз в секунду. */
import { computeLayout, type Layout } from './layout';
import {
  ORDER, availability, canBuy, capacity, cost, diagnose, total,
  type Blame, type BuyResult, type GameState, type Issue, type Kind, type Level, type Metrics,
} from './sim';

export interface ActionView {
  res: BuyResult;
  cost: number;
  total: number;
}

export interface View {
  level: Level;
  t: number;
  money: number;
  hp: number;
  err: number;
  avail: number;
  over: GameState['over'];
  m: Metrics;
  c: Record<Kind, number>;
  layout: Layout;
  issues: Issue[];
  cap: { rps: number; limit: 'app' | 'db' };
  actions: Record<Kind, ActionView>;
  /** Моменты времени, когда система теряла запросы, — для отметок на графике. */
  errTimes: number[];
  tot: GameState['tot'];
  /** Узел, на котором потеряно больше всего запросов. */
  worst: Blame;
}

export function makeView(s: GameState): View {
  const actions = {} as Record<Kind, ActionView>;
  for (const k of ORDER) actions[k] = { res: canBuy(s, k), cost: cost(s, k), total: total(s, k) };
  const blames = Object.keys(s.blame) as Blame[];
  return {
    level: s.level,
    t: s.t,
    money: s.money,
    hp: s.hp,
    err: s.err,
    avail: availability(s),
    over: s.over,
    m: s.m,
    c: { ...s.c },
    layout: computeLayout(s),
    issues: diagnose(s).slice(0, 2),
    cap: capacity(s),
    actions,
    errTimes: s.hist.filter((p) => p.err > 0.01).map((p) => p.t),
    tot: { ...s.tot },
    worst: blames.sort((a, b) => s.blame[b] - s.blame[a])[0],
  };
}
