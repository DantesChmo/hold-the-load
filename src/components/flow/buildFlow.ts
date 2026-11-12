/* Перевод раскладки и метрик в узлы и связи React Flow. */
import { Position, type Edge, type Node } from '@xyflow/react';
import type { LNode, NodeKind, NodeState } from '@/lib/layout';
import { ACTIONS, type Kind } from '@/lib/sim';
import type { View } from '@/lib/view';
import { fmt, pct } from '@/lib/store';

export type Tone = 'ok' | 'warn' | 'bad' | 'idle';

export type SvcData = {
  kind: NodeKind;
  state: NodeState;
  prog: number;
  w: number;
  h: number;
  title: string;
  sub: string;
  /** Утилизация 0..1+, null — если у узла её нет. */
  util: number | null;
  tone: Tone;
  /** Узел прямо сейчас теряет запросы. */
  crit: boolean;
  tip: { title: string; desc: string; stats: string[] };
  ghost?: { kind: Kind; label: string; cost: number };
};
export type SvcNode = Node<SvcData, 'svc'>;
export type FlowEdgeData = { sx: number; sy: number; tx: number; ty: number; alpha: number; muted: boolean };
export type FlowEdge = Edge<FlowEdgeData, 'flow'>;

const INFO: Record<NodeKind, [string, string]> = {
  users: ['Пользователи', 'Источник нагрузки. Каждая точка — пачка запросов.'],
  cdn: ['CDN', 'Сеть edge-серверов. Забирает на себя раздачу статики: картинки, стили, скрипты.'],
  lb: ['Балансировщик', 'Единая точка входа: раскидывает запросы по серверам приложений.'],
  app: ['Сервер приложений', 'Stateless-бэкенд. Обрабатывает запрос и ходит в кэш и базу. 500 RPS на сервер.'],
  hub: ['Сеть', 'Запросы от серверов к базе данных.'],
  cache: ['Кэш', 'Хранит в памяти ответы на частые чтения. Попадание — запрос не доходит до базы.'],
  queue: ['Очередь', 'Буфер записей. Принимает мгновенно, отдаёт в базу с той скоростью, которую та выдержит.'],
  db: ['База данных (мастер шарда)', 'Принимает запись и чтение. Запись в 4 раза дороже чтения.'],
  replica: ['Read-реплика', 'Копия мастера: берёт на себя чтение, но обязана повторять каждую запись.'],
};

export const toneOf = (u: number | null): Tone => (u == null ? 'idle' : u < 0.6 ? 'ok' : u < 0.85 ? 'warn' : 'bad');

function describe(n: LNode, v: View) {
  const m = v.m, c = v.c;
  let title = '', sub = '', util: number | null = null, crit = false, stats: string[] = [];
  const dbStats = [
    `Чтение ${fmt(m.db.reads)}/с · запись ${fmt(m.db.writes)}/с`,
    `Доля записи в работе: ${pct(m.db.writeU / Math.max(1, m.db.writeU + m.db.readU))}`,
    `Ожидание: ${fmt(m.db.wait * 1000)} мс`,
  ];
  switch (n.kind) {
    case 'users':
      title = 'Пользователи'; sub = `${fmt(m.R)} RPS`;
      stats = [`Статика ${fmt(m.st)} · чтение ${fmt(m.rd)} · запись ${fmt(m.wr)}`];
      break;
    case 'cdn':
      title = 'CDN'; sub = `${fmt(m.cdn.rate)} RPS`; stats = [`Отдаёт ${fmt(m.cdn.rate)} RPS статики`];
      break;
    case 'lb':
      title = 'Балансировщик'; sub = `${fmt(m.lb.rate)} RPS`; stats = [`Серверов за ним: ${c.app}`];
      break;
    case 'app':
      title = `APP ${n.idx! + 1}`; sub = pct(m.app.util); util = m.app.util; crit = m.app.dropFrac > 0.001;
      stats = [`Слой: ${fmt(m.app.util * m.app.cap)} из ${fmt(m.app.cap)} RPS`, `Ожидание: ${fmt(m.app.wait * 1000)} мс`];
      break;
    case 'cache':
      title = c.cache > 1 ? `Кэш ×${c.cache}` : 'Кэш'; sub = pct(m.cache.util); util = m.cache.util;
      stats = [`Чтений ${fmt(m.cache.in)}/с · попаданий ${pct(m.cache.hitFrac)}`];
      break;
    case 'queue':
      title = 'Очередь'; sub = `${fmt(m.queue.backlog)} сообщ.`; util = m.queue.fill; crit = m.queue.dropFrac > 0.001;
      stats = [`Приток ${fmt(m.queue.in)}/с · разбор ${fmt(m.queue.drain)}/с`, `Заполнена на ${pct(m.queue.fill)}`];
      break;
    case 'db':
      title = `БД · шард ${n.idx! + 1}`; sub = pct(m.db.util); util = m.db.util; crit = m.db.dropFrac > 0.001; stats = dbStats;
      break;
    case 'replica':
      title = 'R'; util = m.db.util; crit = m.db.dropFrac > 0.001; stats = dbStats;
      break;
  }
  if (n.state !== 'on') { util = null; crit = false; stats = n.state === 'pending' ? ['Разворачивается…'] : []; }
  return { title, sub, util, crit, stats };
}

export function buildFlow(v: View): { nodes: SvcNode[]; edges: FlowEdge[] } {
  const layout = v.layout;
  const nodes = layout.nodes.map((n): SvcNode => {
    const d = describe(n, v), [tipTitle, tipDesc] = INFO[n.kind];
    const kind = n.kind as Kind;
    return {
      id: n.id,
      type: 'svc',
      position: { x: n.x, y: n.y },
      width: n.w,
      height: n.h,
      measured: { width: n.w, height: n.h },
      // Точки крепления заданы явно: связи идут из центра в центр, измерять DOM не нужно.
      handles: [
        { type: 'source', position: Position.Right, x: n.w / 2, y: n.h / 2, width: 1, height: 1 },
        { type: 'target', position: Position.Left, x: n.w / 2, y: n.h / 2, width: 1, height: 1 },
      ],
      zIndex: n.state === 'ghost' ? 0 : 1,
      data: {
        kind: n.kind, state: n.state, prog: n.prog, w: n.w, h: n.h,
        title: d.title, sub: d.sub, util: d.util, tone: toneOf(d.util), crit: d.crit,
        tip: { title: tipTitle, desc: tipDesc, stats: d.stats },
        ghost: n.state === 'ghost'
          ? { kind, label: ACTIONS[kind].short, cost: v.actions[kind].cost }
          : undefined,
      },
    };
  });
  const edges = layout.edges.map((e): FlowEdge => {
    const a = layout.byId[e.source], b = layout.byId[e.target];
    return {
      id: e.id, source: e.source, target: e.target, type: 'flow',
      data: { sx: a.x, sy: a.y, tx: b.x, ty: b.y, alpha: e.alpha, muted: !!e.muted },
    };
  });
  return { nodes, edges };
}
