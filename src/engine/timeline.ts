// Kariyer zaman çizelgesi: dövüş geçmişi, kemerler, salon, Onur Listesi ve rozetlerden önemli anları çıkarır.
// Ayrı bir kayıt tutmaz; eski kayıtlarda da çalışır.
import { L } from '../i18n';
import { ORGS, WEIGHT_CLASSES } from './data';
import { AWARD_NAMES } from './awards';
import type { GameState, OrgId } from './types';

export type MomentKind = 'ilk' | 'galibiyet' | 'ko' | 'sub' | 'maglubiyet' | 'pro' | 'org' | 'kemer' | 'salon' | 'hof' | 'kilometre' | 'seri' | 'odul';

export interface Moment {
  yas: number;
  /** Aynı yaştaki anları sıralamak için (dövüş sırası) */
  sira: number;
  tur: MomentKind;
  baslik: string;
  alt: string;
}

const SUB_LABELS = new Set(['Submission', 'Sumisión', 'Poddanie', 'Finalização', 'Сдача']);
const isKO = (y: string) => y === 'KO' || y === 'TKO';
const isSub = (y: string) => SUB_LABELS.has(y) || y === L("Submission");

export function careerTimeline(s: GameState): Moment[] {
  const out: Moment[] = [];
  const fights = [...s.gecmis].reverse(); // eskiden yeniye
  const seenOrg = new Set<OrgId>();
  let wins = 0;
  let streak = 0;
  let bestStreakMark = 0;
  let firstWin = false;
  let firstKO = false;
  let firstSub = false;
  let firstLoss = false;
  let pro = false;
  fights.forEach((f, i) => {
    const push = (tur: MomentKind, baslik: string, alt: string) => out.push({ yas: f.yas, sira: i, tur, baslik, alt });
    const vs = L("Rakip: {0}", [f.rakip]);
    if (i === 0) push('ilk', L("İlk dövüş"), `${vs} · ${f.sonuc === 'G' ? L("Galibiyet") : f.sonuc === 'M' ? L("Mağlubiyet") : L("Beraberlik")}`);
    if (!seenOrg.has(f.org)) {
      seenOrg.add(f.org);
      if (f.org !== 'amator') {
        if (!pro) {
          pro = true;
          push('pro', L("Profesyonel oldu"), L("İlk profesyonel maçı: {0}", [ORGS[f.org]?.ad ?? f.org]));
        } else push('org', f.org === 'ufc' ? L("UCC'ye ilk adım") : L("Yeni organizasyon: {0}", [ORGS[f.org]?.ad ?? f.org]), vs);
      }
    }
    if (f.sonuc === 'G') {
      wins++;
      streak++;
      if (!firstWin) {
        firstWin = true;
        push('galibiyet', L("İlk galibiyet"), `${vs} · ${f.yontem}`);
      }
      if (isKO(f.yontem) && !firstKO) {
        firstKO = true;
        push('ko', L("İlk nakavt"), L("{0} · {1}. raunt", [vs, f.raunt]));
      }
      if (isSub(f.yontem) && !firstSub) {
        firstSub = true;
        push('sub', L("İlk submission"), L("{0} · {1}. raunt", [vs, f.raunt]));
      }
      if ([10, 25, 50, 75, 100].includes(wins)) push('kilometre', L("{0}. galibiyet", [wins]), `${vs} · ${f.yontem}`);
      if (streak >= 5 && streak > bestStreakMark && streak % 5 === 0) {
        bestStreakMark = streak;
        push('seri', L("{0} maçlık seri", [streak]), L("Art arda {0} galibiyet", [streak]));
      }
    } else {
      streak = 0;
      if (f.sonuc === 'M' && !firstLoss) {
        firstLoss = true;
        push('maglubiyet', L("İlk mağlubiyet"), `${vs} · ${f.yontem}`);
      }
    }
  });
  const n = fights.length;
  const yasAt = (hafta: number) => Math.max(fights[0]?.yas ?? s.fighter.yas, Math.floor(s.fighter.yas - (s.hafta - hafta) / 52));
  (s.kemerler ?? []).forEach((b) =>
    out.push({ yas: b.yas, sira: n, tur: 'kemer', baslik: L("{0} şampiyonu", [ORGS[b.org]?.kisa ?? b.org]), alt: b.savunma ? L("{0} sıklet · {1} savunma", [WEIGHT_CLASSES[b.siklet].ad, b.savunma]) : L("{0} sıklet", [WEIGHT_CLASSES[b.siklet].ad]) }),
  );
  (s.oduller ?? []).forEach((o) => out.push({ yas: o.yas, sira: n, tur: 'odul', baslik: AWARD_NAMES[o.kat](), alt: L("Yıl sonu ödülü") }));
  if (s.salon) out.push({ yas: yasAt(s.salon.acilis), sira: n, tur: 'salon', baslik: L("Kendi salonunu açtı"), alt: s.salon.ad });
  if (s.hof) out.push({ yas: s.hof.yas, sira: n + 1, tur: 'hof', baslik: L("Hall of Fame"), alt: L("Adı ölümsüzleşti") });
  return out.sort((a, b) => a.yas - b.yas || a.sira - b.sira);
}

export const MOMENT_ICON: Record<MomentKind, string> = {
  ilk: 'flag-checkered',
  galibiyet: 'trophy-outline',
  ko: 'flash',
  sub: 'lock',
  maglubiyet: 'heart-broken',
  pro: 'briefcase-check',
  org: 'stairs-up',
  kemer: 'crown',
  salon: 'weight-lifter',
  hof: 'pillar',
  kilometre: 'medal',
  seri: 'fire',
  odul: 'trophy-award',
};

/** Paylaşım kartı için kısa yolculuk satırı: "İlk dövüş: 18 · İlk KO: 19 · Kemer: 26" */
export function journeyLine(m: Moment[]): string {
  const pickFirst = (t: MomentKind) => m.find((x) => x.tur === t);
  const parts: string[] = [];
  const add = (t: MomentKind, label: string) => {
    const x = pickFirst(t);
    if (x) parts.push(`${label}: ${x.yas}`);
  };
  add('ilk', L("İlk dövüş"));
  add('ko', L("İlk KO"));
  add('pro', L("Pro"));
  if (m.some((x) => x.tur === 'org' && x.baslik === L("UCC'ye ilk adım"))) parts.push(`UCC: ${m.find((x) => x.baslik === L("UCC'ye ilk adım"))!.yas}`);
  add('kemer', L("Kemer"));
  add('hof', 'HOF');
  return parts.join(' · ');
}
