/* Частицы запросов на canvas: каждая точка — пачка запросов, летящая по схеме. */
import { VH, VW, curvePoint, type LNode } from './layout';
import type { GameState } from './sim';

export const COLORS = { st: '#7aa2ff', rd: '#3ddc97', wr: '#ffb347', bad: '#ff4d6d' };
const CLS = [COLORS.st, COLORS.rd, COLORS.wr];
/** Плотность пикселей холста относительно координат схемы. */
export const CANVAS_SCALE = 2;

interface Pt { x: number; y: number; w: number; h: number }
interface Particle { pts: Pt[]; seg: number; u: number; cls: number; drop: boolean; x: number; y: number; px: number; py: number }
interface Effect { x: number; y: number; w: number; h: number; t: number; dx: number; drop: boolean; col: string }

export class ParticleSystem {
  private parts: Particle[] = [];
  private fx: Effect[] = [];
  private spawnAcc = 0;
  private drainAcc = 0;

  /** dt — игровое время; 0 на паузе (частицы замирают). */
  tick(s: GameState, byId: Record<string, LNode>, dt: number) {
    if (dt > 0) {
      const m = s.m, rate = Math.min(150, 12 * Math.sqrt(m.R / 100));
      this.spawnAcc += rate * dt;
      while (this.spawnAcc >= 1) { this.spawnAcc--; this.spawn(s, byId); }
      if (s.c.queue && m.queue.drain > 0) {
        this.drainAcc += rate * (m.queue.drain / Math.max(1, m.R)) * dt;
        while (this.drainAcc >= 1) { this.drainAcc--; this.push(byId, ['queue', dbTarget(s, false)], 2, false); }
      }
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i], a = p.pts[p.seg], b = p.pts[p.seg + 1];
      p.u += 430 * dt / Math.max(40, Math.hypot(b.x - a.x, b.y - a.y));
      p.px = p.x; p.py = p.y;
      if (p.u >= 1) {
        p.seg++; p.u = 0;
        if (p.seg >= p.pts.length - 1) {
          this.fx.push({ x: b.x, y: b.y, w: b.w, h: b.h, t: 0, dx: (Math.random() - 0.5) * 60,
            drop: p.drop, col: p.drop ? COLORS.bad : CLS[p.cls] });
          this.parts.splice(i, 1);
          continue;
        }
      }
      const q = curvePoint(p.pts[p.seg], p.pts[p.seg + 1], p.u);
      p.x = q.x; p.y = q.y;
    }
  }

  private spawn(s: GameState, byId: Record<string, LNode>) {
    const L = s.level, c = s.c, m = s.m;
    const cls = Math.random() < L.static ? 0 : Math.random() < L.write ? 2 : 1;
    const path = ['users'];
    let drop = false;
    if (cls === 0 && c.cdn && Math.random() < 0.95) path.push('cdn');
    else {
      if (c.lb) path.push('lb');
      path.push('app' + Math.floor(Math.random() * c.app));
      if (Math.random() < m.app.dropFrac) drop = true;
      else if (cls === 1) {
        if (c.cache) path.push('cache');
        if (!c.cache || Math.random() >= m.cache.hitFrac) {
          if (!c.cache) path.push('hub');
          path.push(dbTarget(s, true));
          drop = Math.random() < m.db.dropFrac;
        }
      } else if (cls === 2) {
        if (c.queue) { path.push('queue'); drop = Math.random() < m.queue.dropFrac; }
        else { path.push('hub', dbTarget(s, false)); drop = Math.random() < m.db.dropFrac; }
      }
    }
    this.push(byId, path, cls, drop);
  }

  private push(byId: Record<string, LNode>, path: string[], cls: number, drop: boolean) {
    if (this.parts.length > 900) return;
    const pts: Pt[] = [];
    for (const id of path) {
      const n = byId[id];
      if (n) pts.push({ x: n.x, y: n.y + (Math.random() - 0.5) * Math.min(14, n.h * 0.4), w: n.w, h: n.h });
    }
    if (pts.length < 2) return;
    this.parts.push({ pts, seg: 0, u: 0, cls, drop, x: pts[0].x, y: pts[0].y, px: pts[0].x, py: pts[0].y });
  }

  /** dt — реальное время кадра: вспышки доигрывают и на паузе. */
  draw(ctx: CanvasRenderingContext2D, dt: number) {
    ctx.setTransform(CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0);
    ctx.clearRect(0, 0, VW, VH);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const p of this.parts) {
      const col = CLS[p.cls];
      ctx.strokeStyle = col; ctx.globalAlpha = 0.35; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.globalAlpha = 0.95; ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.3, 0, 6.3); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t += dt / (f.drop ? 0.7 : 0.35);
      if (f.t >= 1) { this.fx.splice(i, 1); continue; }
      ctx.strokeStyle = f.col;
      if (f.drop) {
        // отказ: красный крестик осыпается из-под узла
        const r = 3 + f.t * 4, x = f.x + f.dx * (0.4 + f.t), y = f.y + f.h / 2 + 6 + f.t * 34;
        ctx.globalAlpha = 1 - f.t; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r);
        ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke();
      } else {
        // успех: кольцо расходится вокруг узла
        ctx.globalAlpha = (1 - f.t) * 0.8; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.w * 0.5 + f.t * 12, f.h * 0.5 + f.t * 10, 0, 0, 6.3); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
}

function dbTarget(s: GameState, readOnly: boolean): string {
  const j = Math.floor(Math.random() * s.c.shard);
  if (readOnly && s.c.replica) {
    const r = Math.floor(Math.random() * (s.c.replica + 1));
    if (r) return `rep${j}_${r - 1}`;
  }
  return 'db' + j;
}
