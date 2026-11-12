export type Kind = 'lb' | 'app' | 'cdn' | 'cache' | 'replica' | 'shard' | 'queue';

export interface Action {
  name: string;
  short: string;
  cost: number;
  max: number;
  desc: string;
}

export interface Level {
  id: string;
  title: string;
  tagline: string;
  /** Концепция, которой учит уровень. */
  teach: string;
  brief: string;
  goal: string;
  /** Вывод после прохождения: что сказать на интервью. */
  lesson: string;
  unlocked: Kind[];
  /** Доля статики во всём трафике. */
  static: number;
  /** Доля записи среди динамических запросов. */
  write: number;
  /** Доля чтений, на которые отвечает кэш. */
  hit: number;
  start: number;
  /** Доход, $ за 1000 успешных запросов. */
  income: number;
  duration: number;
  /** Кривая нагрузки: точки [секунда, RPS]. */
  curve?: [number, number][];
  rps?: (t: number) => number;
  endless?: boolean;
}

export interface StageNode {
  /** Очередь ожидания по классам запросов. */
  b: number[];
  util: number;
  wait: number;
  in: number;
  dropFrac: number;
}

export interface Metrics {
  R: number;
  st: number;
  rd: number;
  wr: number;
  ok: number;
  drop: number;
  income: number;
  latency: number;
  cdn: { rate: number };
  lb: { rate: number };
  app: { util: number; wait: number; dropFrac: number; in: number; staticShare: number; cap: number };
  cache: { util: number; hitFrac: number; in: number; hits: number };
  db: {
    util: number; wait: number; dropFrac: number; readU: number; writeU: number;
    reads: number; writes: number; cap: number; nodes: number; shards: number;
  };
  queue: { fill: number; backlog: number; drain: number; dropFrac: number; in: number };
}

export interface Pending {
  kind: Kind;
  from: number;
  at: number;
}

export type Blame = 'app' | 'dbRead' | 'dbWrite' | 'queue';

export interface GameState {
  level: Level;
  t: number;
  money: number;
  /** Запас SLA, 0..100. */
  hp: number;
  /** Развёрнутые компоненты. */
  c: Record<Kind, number>;
  pending: Pending[];
  n: { app: StageNode; db: StageNode };
  /** Сообщений в очереди. */
  q: number;
  /** Сглаженная доля ошибок. */
  err: number;
  over: 'win' | 'lose' | null;
  m: Metrics;
  hist: { t: number; err: number; R: number }[];
  histAt: number;
  tot: { in: number; ok: number; fail: number; spent: number; peak: number };
  blame: Record<Blame, number>;
}

export interface BuyResult {
  ok: boolean;
  why?: string;
  locked?: boolean;
  max?: boolean;
  poor?: boolean;
}

export interface Issue {
  id: 'app' | 'db' | 'cache' | 'queue';
  util: number;
  sev: 'warn' | 'crit';
  title: string;
  text: string;
  fixes: Kind[];
}
