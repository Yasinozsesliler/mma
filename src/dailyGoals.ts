// Günlük Hedefler durumu (cihazda, bütün kariyerler ve modlar ortak). Sayaçlar oyunun her yerinden `noteGoal` ile artar.
import { useSyncExternalStore } from 'react';
import { dayNumber } from './engine/daily';
import { addGoal, type GoalKind, type GoalState } from './engine/dailyGoals';
import { getPref, setPref } from './prefs';

const KEY = 'yol_hedef';

function load(): GoalState | undefined {
  try {
    const r = JSON.parse(getPref(KEY) || 'null') as GoalState | null;
    return r && typeof r.gun === 'number' ? r : undefined;
  } catch {
    return undefined;
  }
}

let st = load();
const subs = new Set<() => void>();

export const getGoals = () => st;
export function setGoals(next: GoalState) {
  st = next;
  setPref(KEY, JSON.stringify(st));
  subs.forEach((f) => f());
}

export function noteGoal(k: GoalKind, times = 1) {
  if (times <= 0) return;
  try {
    setGoals(addGoal(st, dayNumber(), k, times));
  } catch {
    // sayaç oyunu asla durdurmaz
  }
}

export function useGoals(): GoalState | undefined {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => st,
    () => st,
  );
}
