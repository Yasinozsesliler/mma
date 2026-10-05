// Dünya turu: her maç organizasyona uygun bir şehirde yapılır. Amatör ve memleket maçları kendi ülkende,
// Hexagon Avrupa'da, ZEN Asya'da, CFC/PFC Amerika'da, UCC dünyanın dört bir yanında. Gidilen her yeni şehir
// haritada iğne olur; şehir ve kıta kilometre taşları para ve popülerlik verir (güç vermez).
import { L, LOC } from '../i18n';
import { addFollowers, fmtDelta, followers } from './fame';
import { chance, clamp, pick } from './rng';
import type { GameState, Opponent, OrgId } from './types';

export type Kita = 'avrupa' | 'kamerika' | 'gamerika' | 'asya' | 'afrika' | 'okyanusya';

export const KITALAR: Record<Kita, () => string> = {
  avrupa: () => L("Avrupa"),
  kamerika: () => L("Kuzey Amerika"),
  gamerika: () => L("Güney Amerika"),
  asya: () => L("Asya"),
  afrika: () => L("Afrika"),
  okyanusya: () => L("Okyanusya"),
};

export interface City {
  id: string;
  ad: string;
  ulke: string; // COUNTRIES anahtarı ya da kısaltma
  kita: Kita;
  lat: number;
  lon: number;
  orgs: OrgId[];
}

const c = (id: string, ad: string, ulke: string, kita: Kita, lat: number, lon: number, orgs: OrgId[]): City => ({ id, ad, ulke, kita, lat, lon, orgs });

export const CITIES: City[] = [
  // Kuzey Amerika
  c('vegas', 'Las Vegas', 'us', 'kamerika', 36.2, -115.1, ['ufc', 'dwcs', 'mvp', 'pfl']),
  c('newyork', 'New York', 'us', 'kamerika', 40.7, -74, ['ufc', 'pfl']),
  c('chicago', 'Chicago', 'us', 'kamerika', 41.9, -87.6, ['ufc', 'cfc']),
  c('houston', 'Houston', 'us', 'kamerika', 29.8, -95.4, ['ufc', 'cfc']),
  c('miami', 'Miami', 'us', 'kamerika', 25.8, -80.2, ['mvp', 'cfc', 'ufc']),
  c('denver', 'Denver', 'us', 'kamerika', 39.7, -105, ['cfc']),
  c('atlanta', 'Atlanta', 'us', 'kamerika', 33.7, -84.4, ['cfc', 'pfl']),
  c('phoenix', 'Phoenix', 'us', 'kamerika', 33.4, -112.1, ['cfc']),
  c('orlando', 'Orlando', 'us', 'kamerika', 28.5, -81.4, ['pfl', 'mvp']),
  c('toronto', 'Toronto', 'ca', 'kamerika', 43.7, -79.4, ['ufc', 'pfl']),
  c('mexico', 'Mexico City', 'mx', 'kamerika', 19.4, -99.1, ['ufc', 'cfc']),
  c('sanjuan', 'San Juan', 'pr', 'kamerika', 18.5, -66.1, ['mvp']),
  // Güney Amerika
  c('rio', 'Rio de Janeiro', 'br', 'gamerika', -22.9, -43.2, ['ufc']),
  c('saopaulo', 'São Paulo', 'br', 'gamerika', -23.5, -46.6, ['ufc', 'pfl']),
  c('buenosaires', 'Buenos Aires', 'ar', 'gamerika', -34.6, -58.4, ['pfl']),
  // Avrupa
  c('londra', L("Londra"), 'gb', 'avrupa', 51.5, -0.1, ['ufc', 'oktagon', 'pfl']),
  c('manchester', 'Manchester', 'gb', 'avrupa', 53.5, -2.2, ['ufc']),
  c('dublin', 'Dublin', 'ie', 'avrupa', 53.3, -6.3, ['ufc', 'oktagon']),
  c('paris', 'Paris', 'fr', 'avrupa', 48.9, 2.4, ['ufc', 'oktagon', 'pfl']),
  c('berlin', 'Berlin', 'de', 'avrupa', 52.5, 13.4, ['oktagon']),
  c('koln', L("Köln"), 'de', 'avrupa', 50.9, 7, ['oktagon']),
  c('prag', L("Prag"), 'cz', 'avrupa', 50.1, 14.4, ['oktagon']),
  c('bratislava', 'Bratislava', 'sk', 'avrupa', 48.1, 17.1, ['oktagon']),
  c('varsova', L("Varşova"), 'pl', 'avrupa', 52.2, 21, ['oktagon', 'ufc']),
  c('istanbul', L("İstanbul"), 'tr', 'avrupa', 41, 29, ['ufc', 'oktagon']),
  c('stockholm', 'Stockholm', 'se', 'avrupa', 59.3, 18.1, ['ufc']),
  c('amsterdam', 'Amsterdam', 'nl', 'avrupa', 52.4, 4.9, ['oktagon']),
  c('moskova', L("Moskova"), 'ru', 'avrupa', 55.8, 37.6, ['oktagon']),
  // Asya ve Orta Doğu
  c('abudabi', L("Abu Dabi"), 'ae', 'asya', 24.5, 54.4, ['ufc', 'one']),
  c('riyad', L("Riyad"), 'sa', 'asya', 24.7, 46.7, ['ufc', 'pfl']),
  c('dubai', 'Dubai', 'ae', 'asya', 25.2, 55.3, ['mvp', 'one']),
  c('baku', L("Bakü"), 'az', 'asya', 40.4, 49.9, ['ufc', 'one']),
  c('tiflis', L("Tiflis"), 'ge', 'asya', 41.7, 44.8, ['oktagon']),
  c('almati', L("Almatı"), 'kz', 'asya', 43.2, 76.9, ['one']),
  c('singapur', L("Singapur"), 'sg', 'asya', 1.3, 103.8, ['one', 'ufc']),
  c('bangkok', 'Bangkok', 'th', 'asya', 13.8, 100.5, ['one']),
  c('manila', 'Manila', 'ph', 'asya', 14.6, 121, ['one']),
  c('cakarta', L("Cakarta"), 'id', 'asya', -6.2, 106.8, ['one']),
  c('kualalumpur', 'Kuala Lumpur', 'my', 'asya', 3.1, 101.7, ['one']),
  c('tokyo', 'Tokyo', 'jp', 'asya', 35.7, 139.7, ['one', 'ufc']),
  c('sanghay', L("Şanghay"), 'cn', 'asya', 31.2, 121.5, ['one', 'ufc']),
  // Afrika
  c('lagos', 'Lagos', 'ng', 'afrika', 6.5, 3.4, ['ufc']),
  c('johannesburg', 'Johannesburg', 'za', 'afrika', -26.2, 28, ['ufc']),
  // Okyanusya
  c('sidney', L("Sidney"), 'au', 'okyanusya', -33.9, 151.2, ['ufc', 'one']),
  c('perth', 'Perth', 'au', 'okyanusya', -31.95, 115.9, ['ufc']),
  c('auckland', 'Auckland', 'nz', 'okyanusya', -36.85, 174.8, ['ufc']),
];

/** Oyuncunun ülkesinin haritadaki yeri (memleket iğnesi). */
const HOME: Record<string, { lat: number; lon: number; kita: Kita }> = {
  tr: { lat: 39.9, lon: 32.9, kita: 'avrupa' },
  us: { lat: 39, lon: -98, kita: 'kamerika' },
  br: { lat: -15.8, lon: -47.9, kita: 'gamerika' },
  ru: { lat: 43, lon: 47.5, kita: 'avrupa' },
  gb: { lat: 53, lon: -1.5, kita: 'avrupa' },
  ie: { lat: 53, lon: -8, kita: 'avrupa' },
  fr: { lat: 46.5, lon: 2.5, kita: 'avrupa' },
  de: { lat: 51, lon: 10, kita: 'avrupa' },
  pl: { lat: 52, lon: 19, kita: 'avrupa' },
  cz: { lat: 49.8, lon: 15.5, kita: 'avrupa' },
  ge: { lat: 42, lon: 43.5, kita: 'asya' },
  kz: { lat: 48, lon: 68, kita: 'asya' },
  mx: { lat: 23.6, lon: -102.5, kita: 'kamerika' },
  jp: { lat: 36.2, lon: 138.3, kita: 'asya' },
  ng: { lat: 9, lon: 8, kita: 'afrika' },
  au: { lat: -25, lon: 134, kita: 'okyanusya' },
  az: { lat: 40.3, lon: 47.7, kita: 'asya' },
};

export const HOME_ID = 'ev';

export interface Pin {
  id: string;
  ad: string;
  kita: Kita;
  lat: number;
  lon: number;
}

export function homePin(s: GameState): Pin {
  const h = HOME[s.fighter.uyruk] ?? HOME.tr;
  return { id: HOME_ID, ad: s.fighter.memleket || L("Memleket"), ...h };
}

export function cityPin(s: GameState, id: string): Pin | undefined {
  if (id === HOME_ID) return homePin(s);
  return CITIES.find((x) => x.id === id);
}

/** Deplasman: maç oyuncunun ülkesi dışındaki bir şehirde. */
export function isAway(s: GameState, sehir?: string) {
  if (!sehir || sehir === HOME_ID) return false;
  return CITIES.find((x) => x.id === sehir)?.ulke !== s.fighter.uyruk;
}

/** Bir maçın şehri: memleket ve amatör maçları evde; UCC unvan maçları çoğunlukla Las Vegas'ta. */
export function pickCity(s: GameState, opp: Opponent, org: OrgId): string {
  if (org === 'amator' || opp.memleket) return HOME_ID;
  const pool = CITIES.filter((x) => x.orgs.includes(org));
  if (!pool.length) return HOME_ID;
  if (org === 'ufc' && (opp.champion || s.sampiyon) && chance(0.6)) return 'vegas';
  if (org === 'dwcs') return 'vegas';
  // Kendi ülkendeki etkinlikte kart başına konulma ihtimali
  const yerli = pool.filter((x) => x.ulke === s.fighter.uyruk);
  if (yerli.length && chance(0.15)) return pick(yerli).id;
  if (org === 'ufc' && chance(0.3)) return 'vegas';
  return pick(pool).id;
}

/** Her seçenek rakibe şehir atar (rakip seçim ekranında gösterilir). */
export function assignCities(s: GameState, opts: Opponent[], org: OrgId) {
  opts.forEach((o) => (o.sehir ??= pickCity(s, o, org)));
}

const CITY_STEPS = [3, 6, 10, 15, 20, 30];
const KITA_STEPS = [2, 3, 4, 5, 6];
const MULT: Record<GameState['stage'], number> = { amator: 1, bolgesel: 2, buyuk: 5, ufc: 12 };

export const visitedCount = (s: GameState) => Object.keys(s.sehirler ?? {}).length;
export function visitedKitalar(s: GameState): Kita[] {
  const set = new Set<Kita>();
  Object.keys(s.sehirler ?? {}).forEach((id) => {
    const p = cityPin(s, id);
    if (p) set.add(p.kita);
  });
  return [...set];
}
export const nextCityStep = (s: GameState) => CITY_STEPS.find((n) => n > visitedCount(s));
export const nextKitaStep = (s: GameState) => KITA_STEPS.find((n) => n > visitedKitalar(s).length);

/** Maç sonrası: şehri kaydet, yeni şehir/kıta haberini ve kilometre taşı ödüllerini ver. */
export function visitCity(s: GameState, id: string): string[] {
  const p = cityPin(s, id);
  if (!p) return [];
  const lines: string[] = [];
  const oncekiKita = visitedKitalar(s);
  s.sehirler ??= {};
  const yeni = !s.sehirler[id];
  s.sehirler[id] = (s.sehirler[id] ?? 0) + 1;
  if (!yeni) return lines;
  if (id !== HOME_ID) lines.push(L("📍 Yeni şehir: {0}! Dünya haritana bir iğne daha eklendi.", [p.ad]));
  if (!oncekiKita.includes(p.kita) && oncekiKita.length) lines.push(L("🌍 İlk kez {0} kıtasında dövüştün!", [KITALAR[p.kita]()]));
  s.haritaOdul ??= [];
  const n = visitedCount(s);
  if (CITY_STEPS.includes(n) && !s.haritaOdul.includes(`c${n}`)) {
    s.haritaOdul.push(`c${n}`);
    const para = Math.round(150 * n * MULT[s.stage]);
    s.para += para;
    s.populerlik = clamp(s.populerlik + 2, 0, 100);
    lines.push(L("✈️ Dünya gezgini: {0} şehir! +${1}, popülerlik +2.", [n, para.toLocaleString(LOC)]));
  }
  const k = visitedKitalar(s).length;
  if (KITA_STEPS.includes(k) && !s.haritaOdul.includes(`k${k}`)) {
    s.haritaOdul.push(`k${k}`);
    const d = addFollowers(s, Math.max(500, followers(s) * 0.05 * k));
    s.populerlik = clamp(s.populerlik + 3, 0, 100);
    lines.push(L("🌐 {0} kıtada dövüşen sayılı isimlerdensin! Popülerlik +3, {1} takipçi.", [k, fmtDelta(d)]));
  }
  return lines;
}
