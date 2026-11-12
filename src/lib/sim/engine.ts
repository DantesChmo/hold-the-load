/* Симуляция нагрузки: чистая логика без React и DOM. */
import type { Action, BuyResult, GameState, Issue, Kind, Level, Metrics, StageNode } from './types';

export const APP_CAP = 500;      // RPS на один сервер приложений
export const DB_CAP = 2000;      // «единиц работы»/с на один узел БД
export const CACHE_CAP = 4000;   // чтений/с на один узел кэша
export const W_COST = 4;         // запись в 4 раза дороже чтения
export const ST_W = 0.5;         // статика вдвое дешевле динамики для сервера
export const CDN_HIT = 0.95;     // доля статики, которую забирает CDN
export const Q_CAP = 30000;      // ёмкость очереди, сообщений
export const TIMEOUT = 1.5;      // секунд ожидания, после которых запрос отваливается
export const DEPLOY = 3;         // секунд на развёртывание компонента

export const ACTIONS: Record<Kind, Action> = {
  lb: { name: 'Балансировщик', short: 'LB', cost: 150, max: 1,
    desc: 'Распределяет запросы между серверами. Без него сервер только один.' },
  app: { name: 'Сервер приложений', short: 'APP', cost: 100, max: 10,
    desc: '+500 RPS. Горизонтальное масштабирование stateless-слоя.' },
  cdn: { name: 'CDN', short: 'CDN', cost: 300, max: 1,
    desc: 'Отдаёт 95% статики с edge-узлов, минуя твои серверы.' },
  cache: { name: 'Кэш', short: 'Кэш', cost: 250, max: 3,
    desc: 'Отвечает на повторяющиеся чтения из памяти. +4000 чтений/с на узел.' },
  replica: { name: 'Read-реплика', short: 'Реплика', cost: 200, max: 3,
    desc: 'Копия БД для чтения (в каждый шард). Запись не ускоряет.' },
  shard: { name: 'Шард БД', short: 'Шард', cost: 400, max: 4,
    desc: 'Делит данные между независимыми базами. Масштабирует и запись.' },
  queue: { name: 'Очередь', short: 'Очередь', cost: 300, max: 1,
    desc: 'Принимает записи мгновенно, а в БД отдаёт в её темпе. Сглаживает пики.' },
};

export function baseRps(L: Level, t: number): number {
  if (L.rps) return L.rps(t);
  const c = L.curve!;
  if (t <= c[0][0]) return c[0][1];
  for (let i = 1; i < c.length; i++) {
    if (t <= c[i][0]) {
      const k = (t - c[i - 1][0]) / (c[i][0] - c[i - 1][0]);
      return c[i - 1][1] + (c[i][1] - c[i - 1][1]) * k;
    }
  }
  return c[c.length - 1][1];
}

/** Нагрузка в момент t с небольшим детерминированным шумом. */
export function rpsAt(L: Level, t: number): number {
  return baseRps(L, t) * (1 + 0.035 * Math.sin(t * 1.7) + 0.025 * Math.sin(t * 4.3 + 1));
}

const stageNode = (classes: number): StageNode => ({ b: new Array(classes).fill(0), util: 0, wait: 0, in: 0, dropFrac: 0 });

export function newState(level: Level): GameState {
  const s: GameState = {
    level, t: 0, money: level.start, hp: 100,
    c: { lb: 0, cdn: 0, queue: 0, app: 1, cache: 0, replica: 0, shard: 1 },
    pending: [],
    n: { app: stageNode(3), db: stageNode(2) },
    q: 0, err: 0, over: null, m: null as unknown as Metrics, hist: [], histAt: 0,
    tot: { in: 0, ok: 0, fail: 0, spent: 0, peak: 0 },
    blame: { app: 0, dbRead: 0, dbWrite: 0, queue: 0 },
  };
  step(s, 1e-3);
  return s;
}

/** Сколько компонентов этого типа есть, считая разворачивающиеся. */
export function total(s: GameState, k: Kind): number {
  let n = s.c[k];
  for (const p of s.pending) if (p.kind === k) n++;
  return n;
}

export function cost(s: GameState, k: Kind): number {
  if (k === 'replica') return ACTIONS.replica.cost * total(s, 'shard');
  if (k === 'shard') return ACTIONS.shard.cost + ACTIONS.replica.cost * total(s, 'replica');
  return ACTIONS[k].cost;
}

export function canBuy(s: GameState, k: Kind): BuyResult {
  if (!s.level.unlocked.includes(k)) return { ok: false, locked: true, why: 'Недоступно на этом уровне' };
  if (total(s, k) >= ACTIONS[k].max) return { ok: false, max: true, why: 'Больше добавить нельзя' };
  if (k === 'app' && !s.c.lb) {
    return { ok: false, why: total(s, 'lb') ? 'Балансировщик ещё разворачивается' : 'Сначала нужен балансировщик' };
  }
  if (s.money < cost(s, k)) return { ok: false, poor: true, why: 'Не хватает денег' };
  return { ok: true };
}

export function buy(s: GameState, k: Kind): BuyResult {
  const r = canBuy(s, k);
  if (!r.ok || s.over) return r;
  const price = cost(s, k);
  s.money -= price;
  s.tot.spent += price;
  s.pending.push({ kind: k, from: s.t, at: s.t + DEPLOY });
  return r;
}

/** Узел с очередью ожидания: что не влезло в ёмкость — ждёт, что ждёт дольше TIMEOUT — теряется. */
function stage(node: StageNode, ins: number[], ws: number[], cap: number, dt: number) {
  const k = ins.length;
  const d = new Array<number>(k), out = new Array<number>(k), drop = new Array<number>(k).fill(0);
  let units = 0, inU = 0, inSum = 0;
  for (let i = 0; i < k; i++) {
    d[i] = ins[i] * dt + node.b[i];
    units += d[i] * ws[i];
    inU += ins[i] * ws[i];
    inSum += ins[i];
  }
  const capU = cap * dt, f = units <= capU ? 1 : capU / units;
  let bu = 0;
  for (let i = 0; i < k; i++) {
    const o = d[i] * f;
    out[i] = o / dt;
    node.b[i] = d[i] - o;
    bu += node.b[i] * ws[i];
  }
  const lim = cap * TIMEOUT;
  let dropped = 0;
  if (bu > lim) {
    const keep = lim / bu;
    for (let i = 0; i < k; i++) {
      const x = node.b[i] * (1 - keep);
      drop[i] = x / dt;
      node.b[i] -= x;
      dropped += x;
    }
    bu = lim;
  }
  node.util = inU / cap;
  node.wait = bu / cap;
  node.in = inSum;
  node.dropFrac = inSum > 0 ? Math.min(1, dropped / dt / inSum) : 0;
  return { out, drop };
}

export function step(s: GameState, dt: number): void {
  const L = s.level, c = s.c;
  s.t += dt;
  for (let i = s.pending.length - 1; i >= 0; i--) {
    if (s.t >= s.pending[i].at) {
      c[s.pending[i].kind]++;
      s.pending.splice(i, 1);
    }
  }
  const R = rpsAt(L, s.t);
  const st = R * L.static, dyn = R - st, rd = dyn * (1 - L.write), wr = dyn * L.write;
  const cdnRate = c.cdn ? st * CDN_HIT : 0, stApp = st - cdnRate;
  let ok = cdnRate, drop = 0;

  const a = stage(s.n.app, [stApp, rd, wr], [ST_W, 1, 1], c.app * APP_CAP, dt);
  ok += a.out[0];
  const dA = a.drop[0] + a.drop[1] + a.drop[2];
  drop += dA;
  const reads = a.out[1], writes = a.out[2];

  let hits = 0, cacheUtil = 0, hitFrac = 0;
  if (c.cache) {
    const cc = c.cache * CACHE_CAP;
    hits = Math.min(reads, cc) * L.hit;
    cacheUtil = reads / cc;
    hitFrac = reads > 0 ? hits / reads : 0;
    ok += hits;
  }
  const miss = reads - hits;

  const K = c.shard, n = 1 + c.replica, dbCap = K * n * DB_CAP, wW = W_COST * n;
  let dbW = writes, drain = 0, qDrop = 0;
  if (c.queue) {
    let add = writes * dt;
    const room = Q_CAP - s.q;
    if (add > room) { qDrop = (add - room) / dt; add = room; }
    s.q += add;
    ok += add / dt;
    drop += qDrop;
    // База забирает из очереди столько, сколько может, не захлёбываясь.
    const waiting = s.n.db.b[0] + s.n.db.b[1] * wW;
    const allow = Math.max(0.05 * dbCap, 0.92 * dbCap - miss - waiting) / wW;
    const dr = Math.min(s.q, allow * dt);
    s.q -= dr;
    drain = dr / dt;
    dbW = drain;
  }
  const d = stage(s.n.db, [miss, dbW], [1, wW], dbCap, dt);
  ok += d.out[0];
  if (!c.queue) ok += d.out[1];
  drop += d.drop[0] + d.drop[1];

  const e = 1 - Math.exp(-dt / 1.0);
  s.err += (Math.min(1, R > 0 ? drop / R : 0) - s.err) * e;
  if (s.err > 0.01) s.hp -= dt * (3 + 25 * s.err);
  else if (s.err < 0.002) s.hp = Math.min(100, s.hp + dt);
  const income = ok * L.income / 1000;
  s.money += income * dt;
  s.tot.in += R * dt;
  s.tot.ok += ok * dt;
  s.tot.fail += drop * dt;
  if (s.hp > 0) s.tot.peak = Math.max(s.tot.peak, R);
  s.blame.app += dA * dt;
  s.blame.queue += qDrop * dt;
  s.blame.dbRead += d.drop[0] * dt;
  s.blame.dbWrite += d.drop[1] * dt;

  s.m = {
    R, st, rd, wr, ok, drop, income,
    latency: 35 + 1000 * (s.n.app.wait + s.n.db.wait * 0.6),
    cdn: { rate: cdnRate },
    lb: { rate: R - cdnRate },
    app: {
      util: s.n.app.util, wait: s.n.app.wait, dropFrac: s.n.app.dropFrac, in: s.n.app.in,
      staticShare: (stApp * ST_W) / Math.max(1, stApp * ST_W + dyn), cap: c.app * APP_CAP,
    },
    cache: { util: cacheUtil, hitFrac, in: reads, hits },
    db: {
      util: s.n.db.util, wait: s.n.db.wait, dropFrac: s.n.db.dropFrac, readU: miss, writeU: dbW * wW,
      reads: miss, writes: dbW, cap: dbCap, nodes: n, shards: K,
    },
    queue: { fill: s.q / Q_CAP, backlog: s.q, drain, dropFrac: writes > 0 ? qDrop / writes : 0, in: writes },
  };
  if (s.t >= s.histAt) {
    s.hist.push({ t: s.t, err: s.err, R });
    s.histAt = s.t + 0.5;
  }
  if (s.hp <= 0) { s.hp = 0; s.over = 'lose'; }
  else if (s.t >= L.duration) s.over = 'win';
}

/** Какую нагрузку (RPS) текущая схема держит устойчиво — и во что упирается. */
export function capacity(s: GameState): { rps: number; limit: 'app' | 'db' } {
  const L = s.level, c = s.c;
  const n = 1 + c.replica, dbCap = c.shard * n * DB_CAP, appCap = c.app * APP_CAP;
  const st = L.static, dyn = 1 - st, rd = dyn * (1 - L.write), wr = dyn * L.write;
  const utils = (R: number): [number, number] => {
    const appU = (st * (c.cdn ? 1 - CDN_HIT : 1) * ST_W + dyn) * R / appCap;
    const reads = rd * R;
    const hits = c.cache ? Math.min(reads, c.cache * CACHE_CAP) * L.hit : 0;
    return [appU, (reads - hits + wr * R * W_COST * n) / dbCap];
  };
  let lo = 0, hi = 200000;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2, u = utils(mid);
    if (Math.max(u[0], u[1]) > 1) hi = mid; else lo = mid;
  }
  const u = utils(lo);
  return { rps: lo, limit: u[0] >= u[1] ? 'app' : 'db' };
}

/** Диагностика: что болит и чем это лечится. */
export function diagnose(s: GameState): Issue[] {
  const m = s.m, c = s.c, out: Issue[] = [];
  const avail = (k: Kind) => s.level.unlocked.includes(k) && total(s, k) < ACTIONS[k].max;
  const pct = (x: number) => Math.round(x * 100) + '%';
  const push = (id: Issue['id'], util: number, dropping: boolean, title: string, text: string, fixes: Kind[]) =>
    out.push({ id, util, sev: dropping || util >= 1 ? 'crit' : 'warn', title, text, fixes: fixes.filter(avail) });

  if (m.app.util > 0.8) {
    const fixes: Kind[] = [];
    let text = `Нужно ${Math.round(m.app.util * m.app.cap)} RPS мощности, есть ${m.app.cap}.`;
    if (!total(s, 'cdn') && m.app.staticShare > 0.3) {
      fixes.push('cdn');
      text += ` ${pct(m.app.staticShare)} мощности уходит на раздачу статики.`;
    }
    if (!total(s, 'lb')) {
      fixes.push('lb');
      text += ' Второй сервер без балансировщика не подключить.';
    } else fixes.push('app');
    push('app', m.app.util, m.app.dropFrac > 0.001, `Серверы приложений: ${pct(m.app.util)}`, text, fixes);
  }
  if (m.db.util > 0.8) {
    const wShare = m.db.writeU / Math.max(1, m.db.readU + m.db.writeU);
    const fixes: Kind[] = [];
    let text: string;
    if (wShare > 0.5) {
      text = `${pct(wShare)} работы базы — запись. Реплики не помогут: каждую запись применяет каждая копия.`;
      fixes.push('shard');
      if (!total(s, 'queue')) fixes.push('queue');
      if (!total(s, 'cache')) fixes.push('cache');
    } else {
      text = `${pct(1 - wShare)} работы базы — чтение.`;
      if (!total(s, 'cache')) {
        fixes.push('cache');
        text += ' Многие запросы повторяются — их можно не водить в базу.';
      }
      fixes.push('replica', 'shard');
    }
    push('db', m.db.util, m.db.dropFrac > 0.001, `База данных: ${pct(m.db.util)}`, text, fixes);
  }
  if (c.cache && m.cache.util > 0.9) {
    push('cache', m.cache.util, false, `Кэш: ${pct(m.cache.util)}`,
      'Узлы кэша не успевают — лишние чтения проваливаются в базу.', ['cache']);
  }
  if (c.queue && m.queue.fill > 0.4) {
    push('queue', m.queue.fill, m.queue.dropFrac > 0.001, `Очередь заполнена на ${pct(m.queue.fill)}`,
      `Приток ${Math.round(m.queue.in)}/с, база разбирает ${Math.round(m.queue.drain)}/с. Нужна бо́льшая пропускная способность записи.`,
      ['shard']);
  }
  out.sort((x, y) => Number(y.sev === 'crit') - Number(x.sev === 'crit') || y.util - x.util);
  return out;
}

export const availability = (s: GameState) => s.tot.ok / Math.max(1, s.tot.ok + s.tot.fail);
