/* Раскладка схемы: из состояния игры — узлы и связи в координатах холста. */
import type { GameState, Kind } from './sim';

export const VW = 1040;
export const VH = 600;

export type NodeKind = 'users' | 'hub' | 'db' | Exclude<Kind, 'shard'>;
export type NodeState = 'on' | 'pending' | 'ghost';

export interface LNode {
  id: string;
  kind: NodeKind;
  /** Центр узла. */
  x: number;
  y: number;
  w: number;
  h: number;
  state: NodeState;
  /** Прогресс развёртывания, 0..1. */
  prog: number;
  idx?: number;
  shard?: number;
}

export interface LEdge {
  id: string;
  source: string;
  target: string;
  alpha: number;
  muted?: boolean;
}

export interface Layout {
  nodes: LNode[];
  edges: LEdge[];
  byId: Record<string, LNode>;
}

export function computeLayout(s: GameState): Layout {
  const c = s.c, nodes: LNode[] = [];
  const has = (k: Kind) => s.level.unlocked.includes(k);
  const pend = (k: Kind) => s.pending.filter((p) => p.kind === k);
  const prog = (p: { from: number; at: number }) => Math.min(1, (s.t - p.from) / (p.at - p.from));
  const add = (n: LNode) => nodes.push(n);

  const single = (k: 'cdn' | 'lb' | 'cache' | 'queue', x: number, y: number, w: number, h: number) => {
    const p = pend(k)[0];
    if (c[k]) add({ id: k, kind: k, x, y, w, h, state: 'on', prog: 1 });
    else if (p) add({ id: k, kind: k, x, y, w, h, state: 'pending', prog: prog(p) });
    else if (has(k)) add({ id: k, kind: k, x, y, w, h, state: 'ghost', prog: 0 });
  };

  add({ id: 'users', kind: 'users', x: 80, y: 300, w: 118, h: 60, state: 'on', prog: 1 });
  single('cdn', 262, 95, 100, 52);
  single('lb', 262, 300, 124, 52);

  const ap = pend('app'), an = c.app + ap.length, gap = Math.min(60, 470 / an), ah = Math.min(44, gap - 8);
  for (let i = 0; i < an; i++) {
    const on = i < c.app;
    add({ id: 'app' + i, kind: 'app', idx: i, x: 452, y: 300 + (i - (an - 1) / 2) * gap, w: 96, h: ah,
      state: on ? 'on' : 'pending', prog: on ? 1 : prog(ap[i - c.app]) });
  }

  single('cache', 640, 95, 100, 52);
  single('queue', 640, 505, 112, 52);
  if (!c.cache || !c.queue) add({ id: 'hub', kind: 'hub', x: 640, y: 300, w: 14, h: 14, state: 'on', prog: 1 });

  const sp = pend('shard'), sn = c.shard + sp.length, rp = pend('replica'), rn = c.replica + rp.length;
  for (let j = 0; j < sn; j++) {
    const y = 300 + (j - (sn - 1) / 2) * 112, on = j < c.shard, pg = on ? 1 : prog(sp[j - c.shard]);
    add({ id: 'db' + j, kind: 'db', idx: j, x: 818, y, w: 104, h: 52, state: on ? 'on' : 'pending', prog: pg });
    for (let r = 0; r < rn; r++) {
      const ron = on && r < c.replica;
      add({ id: `rep${j}_${r}`, kind: 'replica', shard: j, idx: r, x: 908 + r * 40, y, w: 32, h: 32,
        state: ron ? 'on' : 'pending', prog: ron ? 1 : r < c.replica ? pg : prog(rp[r - c.replica]) });
    }
  }

  const byId: Record<string, LNode> = {};
  for (const n of nodes) byId[n.id] = n;

  const edges: LEdge[] = [];
  const link = (a: string, b: string, alpha: number, muted?: boolean) => {
    if (byId[a] && byId[b]) edges.push({ id: `${a}>${b}`, source: a, target: b, alpha, muted });
  };
  const apps = nodes.filter((n) => n.kind === 'app' && n.state === 'on');
  const dbs = nodes.filter((n) => n.kind === 'db' && n.state === 'on');
  if (c.cdn) link('users', 'cdn', 0.35);
  if (c.lb) {
    link('users', 'lb', 0.35);
    for (const a of apps) link('lb', a.id, 0.28);
  } else link('users', 'app0', 0.35);
  for (const a of apps) {
    if (c.cache) link(a.id, 'cache', 0.18);
    if (c.queue) link(a.id, 'queue', 0.18);
    link(a.id, 'hub', 0.18);
  }
  for (const d of dbs) {
    if (c.cache) link('cache', d.id, 0.25);
    if (c.queue) link('queue', d.id, 0.25);
    link('hub', d.id, 0.25);
  }
  for (const r of nodes) if (r.kind === 'replica' && r.state === 'on') link('db' + r.shard, r.id, 0.55, true);

  return { nodes, edges, byId };
}

/** Кривая связи между центрами узлов — по ней же летят частицы. */
export function curvePoint(a: { x: number; y: number }, b: { x: number; y: number }, u: number) {
  const mx = (a.x + b.x) / 2, v = 1 - u;
  return {
    x: v * v * v * a.x + 3 * v * v * u * mx + 3 * v * u * u * mx + u * u * u * b.x,
    y: v * v * v * a.y + 3 * v * v * u * a.y + 3 * v * u * u * b.y + u * u * u * b.y,
  };
}
export const curvePath = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const mx = (a.x + b.x) / 2;
  return `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
};
