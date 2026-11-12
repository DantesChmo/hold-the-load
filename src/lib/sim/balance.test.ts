/* Проверка баланса: каждый уровень должен проходиться. Запуск: npm test */
import { describe, expect, it } from 'vitest';
import { LEVELS, availability, buy, canBuy, capacity, diagnose, newState, step } from './index';
import type { GameState, Kind } from './index';

const level = (id: string) => LEVELS.find((l) => l.id === id)!;

/** Бот-новичок: чинит только то, что уже горит, по первой подсказке диагностики. */
function reactiveBot(id: string): GameState {
  const s = newState(level(id));
  let next = 0;
  while (!s.over && s.t < 400) {
    step(s, 0.04);
    if (s.t < next) continue;
    next = s.t + 0.25;
    const issue = diagnose(s)[0];
    if (!issue || s.pending.length) continue;
    for (const k of issue.fixes) {
      const r = canBuy(s, k);
      if (r.ok) { buy(s, k); break; }
      if (r.poor) break;
    }
  }
  return s;
}

/** Игрок с планом: строит по списку, как только хватает денег. */
function plannedRun(id: string, plan: Kind[]): GameState {
  const s = newState(level(id)), todo = [...plan];
  while (!s.over) {
    step(s, 0.04);
    while (todo.length && canBuy(s, todo[0]).ok) buy(s, todo.shift()!);
  }
  return s;
}

describe('баланс уровней', () => {
  it.each(['landing', 'habr', 'friday', 'chat', 'social'])('%s проходится по подсказкам', (id) => {
    const s = reactiveBot(id);
    expect(s.over).toBe('win');
    expect(availability(s)).toBeGreaterThan(0.99);
  });

  it('tickets не проходится реактивно — всплеск надо готовить заранее', () => {
    expect(reactiveBot('tickets').over).toBe('lose');
  });

  it('tickets проходится с очередью, построенной до первого всплеска', () => {
    const s = plannedRun('tickets',
      ['lb', 'queue', 'app', 'app', 'app', 'app', 'app', 'shard', 'app', 'app', 'cache', 'app', 'app', 'shard']);
    expect(s.over).toBe('win');
    expect(availability(s)).toBeGreaterThan(0.999);
  });

  it('endless рано или поздно падает, но не сразу', () => {
    const s = reactiveBot('endless');
    expect(s.over).toBe('lose');
    expect(s.tot.peak).toBeGreaterThan(5000);
  });
});

describe('правила', () => {
  it('второй сервер нельзя добавить без балансировщика', () => {
    const s = newState(level('landing'));
    expect(canBuy(s, 'app').ok).toBe(false);
    buy(s, 'lb');
    while (s.pending.length) step(s, 0.04);
    expect(canBuy(s, 'app').ok).toBe(true);
  });

  it('запись масштабируют шарды, а не реплики', () => {
    const cap = (extra?: Kind) => {
      const s = newState(level('chat'));
      s.c.app = 10; // чтобы упираться в базу, а не в серверы
      if (extra) s.c[extra]++;
      return capacity(s).rps;
    };
    expect(cap('replica')).toBeLessThan(cap() * 1.15);
    expect(cap('shard')).toBeGreaterThan(cap() * 1.9);
  });
});
