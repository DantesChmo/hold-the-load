import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Progress {
  /** Лучший результат по уровням: id → звёзды. */
  stars: Record<string, number>;
  /** Рекорд бесконечного режима, RPS. */
  record: number;
  hints: boolean;
  setStars: (id: string, n: number) => void;
  setRecord: (rps: number) => void;
  toggleHints: () => void;
}

export const useProgress = create<Progress>()(
  persist(
    (set) => ({
      stars: {},
      record: 0,
      hints: true,
      setStars: (id, n) => set((p) => ({ stars: { ...p.stars, [id]: Math.max(p.stars[id] ?? 0, n) } })),
      setRecord: (rps) => set((p) => ({ record: Math.max(p.record, Math.round(rps)) })),
      toggleHints: () => set((p) => ({ hints: !p.hints })),
    }),
    { name: 'sd503-progress' },
  ),
);

export const fmt = (n: number) => Math.round(n).toLocaleString('ru-RU');
export const pct = (x: number) => Math.round(x * 100) + '%';
