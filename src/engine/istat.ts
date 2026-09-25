// Kariyer istatistikleri: başarımlar ve Onur Listesi için tutulan sayaçlar. Bağımlılığı yok, her modül kullanabilir.
import type { GameState, Istat } from './types';

const EMPTY: Istat = {
  enIyiSeri: 0,
  r1: 0,
  bonus: 0,
  unvanMaci: 0,
  donus: 0,
  kdKalk: 0,
  surpriz: 0,
  sampiyonYen: 0,
  sonNefes: 0,
  maraton: 0,
  temiz: 0,
  inat: 0,
  bitirisSeri: 0,
  enIyiBitirisSeri: 0,
  tatil: 0,
  gonderi: 0,
  eslesme: 0,
  sevgili: 0,
  maxPara: 0,
  sikletler: [],
};

export function istat(s: GameState): Istat {
  s.istat = { ...EMPTY, ...(s.istat ?? {}) };
  return s.istat;
}

type NumKey = { [K in keyof Istat]-?: Istat[K] extends number ? K : never }[keyof Istat];

export function bump(s: GameState, k: NumKey, n = 1) {
  const i = istat(s);
  i[k] = (i[k] as number) + n;
}

/** Salt okunur erişim (çizim sırasında state değiştirmemek için). */
export const readIstat = (s: GameState): Istat => ({ ...EMPTY, ...(s.istat ?? {}) });
