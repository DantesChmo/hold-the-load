'use client';

import { useEffect, useRef, useState } from 'react';
import { rpsAt } from '@/lib/sim';
import { fmt } from '@/lib/store';
import type { View } from '@/lib/view';

const H = 120, PAD = 16, BOTTOM = 16, TOP = 6, SAMPLES = 220;

/** График нагрузки: вся кривая уровня, пройденная часть, и пунктир — сколько держит текущая схема. */
export function LoadChart({ view }: { view: View }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(800);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const L = view.level, t = view.t;
  // В бесконечном режиме окно едет вместе со временем.
  const t0 = L.endless ? Math.max(0, t - 50) : 0, t1 = L.endless ? t0 + 80 : L.duration;
  const pts: [number, number][] = [];
  let max = 0;
  for (let i = 0; i <= SAMPLES; i++) {
    const x = t0 + (t1 - t0) * i / SAMPLES, v = rpsAt(L, x);
    pts.push([x, v]);
    if (v > max) max = v;
  }
  const cap = view.cap;
  const top = Math.max(max, Math.min(cap.rps, max * 1.6)) * 1.18, ph = H - BOTTOM - TOP;
  const X = (x: number) => PAD + (w - PAD * 2) * (x - t0) / (t1 - t0);
  const Y = (v: number) => TOP + ph * (1 - Math.min(1, v / top));

  const line = pts.map(([x, v], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  const now = Math.min(t, t1), px = X(now), nowY = Y(rpsAt(L, t));
  const past = pts.filter(([x]) => x <= now);
  const area = `M${X(t0)},${Y(0)}` + past.map(([x, v]) => `L${X(x).toFixed(1)},${Y(v).toFixed(1)}`).join('') +
    `L${px},${nowY}L${px},${Y(0)}Z`;
  const cy = Y(cap.rps), over = view.m.R > cap.rps, capColor = over ? '#f0364b' : '#d97a00';

  return (
    <div ref={box} className="relative mx-3 mb-3 mt-2.5 h-[120px] flex-none overflow-hidden rounded-3xl bg-panel">
      <svg width={w} height={H} className="num block text-[12px]">
        <path d={area} fill="#5340ff" fillOpacity="0.16" />
        <path d={line} fill="none" stroke="#5340ff" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {view.errTimes.filter((x) => x >= t0).map((x) => (
          <rect key={x} x={X(x) - 1} y={H - BOTTOM + 2} width="2.5" height="5" fill="#f0364b" />
        ))}
        <line x1={PAD} x2={w - PAD} y1={cy} y2={cy} stroke={capColor} strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" />
        <text x={w - PAD - 2} y={cy > 20 ? cy - 5 : cy + 13} textAnchor="end" fill={capColor} stroke="#fff" strokeWidth="3" paintOrder="stroke">
          схема держит ≈ {fmt(cap.rps)} RPS, упрётся в {cap.limit === 'app' ? 'серверы' : 'базу'}
        </text>
        <line x1={px} x2={px} y1={4} y2={H - BOTTOM} stroke="#17172b" strokeWidth="1.5" />
        <circle cx={px} cy={nowY} r="5" fill="#17172b" stroke="#fff" strokeWidth="2" />
        <text x={PAD + 2} y={H - 4} fill="#6a6a85">
          {L.endless ? `${Math.floor(t)} с` : `${Math.floor(t)} / ${L.duration} с`}
        </text>
        <text x={w - PAD} y={H - 4} textAnchor="end" fill="#6a6a85">нагрузка, RPS</text>
      </svg>
    </div>
  );
}
