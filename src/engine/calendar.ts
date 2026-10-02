// Takvim: maç tarihi, kamp süresi, kamp öncesi serbest haftalar (etkinlikler) ve kampın hafta hafta akışı.
import { maybePartnerMoment, partnerSparName } from './partner';
import { L, LOC } from '../i18n';
import { addStat, advanceWeeks } from './character';
import { chance, clamp, pick, randInt } from './rng';
import { restMultiplier } from './shop';
import { socialTick } from './social';
import { prAdjust } from './staff';
import { trashTalkFollowers } from './fame';
import { addTechXp, randomKnown, TECHNIQUES, techLevel } from './techniques';
import type { CalEvent, GameState, Opponent } from './types';
import { STAT_LABELS } from './types';

const $ = (n: number) => `$${Math.round(n).toLocaleString(LOC)}`;
const pop = (s: GameState, d: number) => {
  const v = prAdjust(s, d);
  s.populerlik = clamp(s.populerlik + v, 0, 100);
  return v;
};

// ---------- Maç tarihi ----------

/** Maçın kaç hafta sonra olacağı. Normalde 60-90 gün; şampiyonken ve savunma sayısı arttıkça uzar. */
export function leadWeeks(s: GameState, o: Opponent, kisa: boolean): number {
  if (kisa) return randInt(2, 4);
  // İlk amatör maç kısa tutulur: yeni oyuncu kafese çabuk girsin.
  if (s.stage === 'amator') return s.amator.g + s.amator.m + s.amator.b === 0 ? 4 : randInt(5, 8);
  const champ = o.champion || s.sampiyon;
  if (!champ) return randInt(7, 11);
  const savunma = (s.kemerler ?? []).filter((b) => b.aktif).reduce((a, b) => a + b.savunma, 0);
  return randInt(10, 13) + Math.min(3, Math.floor(savunma / 2));
}

export const weeksToDays = (w: number) => w * 7;

// ---------- Kamp süresi ----------

export const CAMP_LENGTHS = [4, 6, 8, 10, 12] as const;
export const CAMP_LENGTH_INFO: Record<number, { carpan: number; risk: number; not: string }> = {
  4: { carpan: 0.75, risk: 0.7, not: L("Kısa ve ucuz. Az gelişim.") },
  6: { carpan: 0.9, risk: 0.85, not: L("Hızlı hazırlık.") },
  8: { carpan: 1, risk: 1, not: L("Standart kamp.") },
  10: { carpan: 1.1, risk: 1.12, not: L("Derin hazırlık, daha pahalı.") },
  12: { carpan: 1.18, risk: 1.25, not: L("Uzun kamp: en çok gelişim, en yüksek masraf ve yıpranma.") },
};

export const campLengthsFor = (macHafta: number) => {
  const ok = CAMP_LENGTHS.filter((w) => w <= macHafta);
  return ok.length ? [...ok] : [macHafta];
};

/** Kamp süresi seçildi: kalan haftalar serbest takvim olur, bazı haftalara etkinlik planlanır. */
export function setCampLength(s: GameState, weeks: number) {
  const k = s.pending.kamp!;
  const mac = k.macHafta ?? weeks;
  k.hafta = Math.min(weeks, mac);
  k.serbest = mac - k.hafta;
  k.takvimIdx = 0;
  k.takvimLog = [];
  k.olaylar = planEvents(s, k.serbest);
  if (k.serbest > 0) k.step = 'takvim';
  else afterFreeWeeks(k);
}

/** Serbest haftalar bitti: planlı kampta doğrudan kamp haftalarına, değilse adım adım plana. */
function afterFreeWeeks(k: NonNullable<GameState['pending']['kamp']>) {
  if (k.planli) {
    k.kampIdx = 0;
    k.haftaLog = [];
    k.step = 'haftalik';
  } else k.step = 'yer';
}

// ---------- Serbest haftalar ----------

export const FREE_ACTS = [
  { id: 'teknik', ad: L("Teknik çalışması"), ikon: 'target-account', aciklama: L("Bir bitiriş tekniğine yüklen: ustalık +3 (iyi hocayla +4).") },
  { id: 'spar', ad: L("Spar"), ikon: 'boxing-glove', aciklama: L("Başka bir dövüşçüyle sert spar. Ustalık ve IQ şansı, küçük sakatlık riski.") },
  { id: 'dinlen', ad: L("Dinlen"), ikon: 'bed', aciklama: L("Vücudunu toparla: sağlık artar.") },
  { id: 'medya', ad: L("Medya ve reklam"), ikon: 'camera', aciklama: L("Röportaj, reklam çekimi: popülerlik, bazen para.") },
] as const;

const FALLBACK_NAMES = [L("Diego Alvarez"), L("Timur Bekov"), L("Jake Morrison"), L("Luka Novak"), L("Rafael Costa"), L("Ömer Kaplan"), L("Sean Doyle"), L("Arman Petrosyan")];

/** Sıklet listesinden (yoksa havuzdan) bir dövüşçü adı. */
export function partnerName(s: GameState): string {
  const opp = s.pending.rakip;
  const list = (s.bolum?.liste ?? []).filter((o) => o.id !== opp?.id);
  if (list.length) {
    const o = pick(list);
    return `${o.ad} ${o.soyad}`;
  }
  return pick(FALLBACK_NAMES);
}

type EventDef = { id: string; baslik: string; ikon: string; proOnly?: boolean; metin: (s: GameState, n: string) => string; secenekler: { ad: string; aciklama: string }[] };

const EVENTS: EventDef[] = [
  {
    id: 'basinTuru',
    baslik: L("ORGANİZASYON BASIN TURU"),
    ikon: 'microphone-variant',
    proOnly: true,
    metin: (s) => L("Organizasyon maçın tanıtımı için şehir şehir basın turu düzenliyor. {0} de sahnede olacak.", [s.pending.rakip?.soyad ?? L("Rakibin")]),
    secenekler: [
      { ad: L("Profesyonel ol"), aciklama: L("Güvenli, az ama kesin popülerlik.") },
      { ad: L("Ortalığı ateşle"), aciklama: L("Trash talk: büyük kazanç ya da ters tepme.") },
      { ad: L("Katılma"), aciklama: L("Antrenmana odaklan. Organizasyon hoşnut olmaz.") },
    ],
  },
  {
    id: 'hayir',
    baslik: L("HAYIR ETKİNLİĞİ"),
    ikon: 'hand-heart',
    metin: (_s, n) => L("Çocuk hastanesi için düzenlenen etkinliğe {0} ve birkaç dövüşçü daha katılıyor.", [n]),
    secenekler: [
      { ad: L("Katıl ve bağış yap"), aciklama: L("Para gider; popülerlik ve motivasyon gelir.") },
      { ad: L("Sadece katıl"), aciklama: L("Biraz popülerlik.") },
      { ad: L("Gitme"), aciklama: L("Bir şey değişmez.") },
    ],
  },
  {
    id: 'podcast',
    baslik: L("PODCAST DAVETİ"),
    ikon: 'podcast',
    metin: (_s, n) => L("Popüler bir MMA podcast’i seni {0} ile aynı yayına çağırdı.", [n]),
    secenekler: [
      { ad: L("Eğlenceli sohbet"), aciklama: L("Samimi görün, popülerlik kazan.") },
      { ad: L("Laf sok"), aciklama: L("Viral olabilir… ya da rezil.") },
      { ad: L("Reddet"), aciklama: L("Zamanını antrenmana ayır.") },
    ],
  },
  {
    id: 'ortak',
    baslik: L("ORTAK ANTRENMAN"),
    ikon: 'account-group',
    metin: (_s, n) => L("{0} seni salonuna davet etti. Birlikte çalışmak, teknik paylaşmak istiyor.", [n]),
    secenekler: [
      { ad: L("Sert spar"), aciklama: L("Çok şey öğrenirsin ama sakatlanabilirsin.") },
      { ad: L("Teknik paylaşımı"), aciklama: L("Yeni bir teknik öğrenme şansı.") },
      { ad: L("Nazikçe reddet"), aciklama: L("Kendi programına sadık kal.") },
    ],
  },
  {
    id: 'taraftar',
    baslik: L("TARAFTAR BULUŞMASI"),
    ikon: 'account-heart',
    metin: () => L("Bir AVM’de imza günü düzenleniyor. Kuyruk kapıya kadar uzamış."),
    secenekler: [
      { ad: L("Saatlerce imza dağıt"), aciklama: L("Taraftarların seni sevecek, biraz yorulursun.") },
      { ad: L("Kısa tut"), aciklama: L("Biraz popülerlik.") },
    ],
  },
];

function planEvents(s: GameState, serbest: number): CalEvent[] {
  const out: CalEvent[] = [];
  const used = new Set<string>();
  const p = s.stage === 'amator' ? 0.22 : 0.4;
  for (let i = 0; i < serbest; i++) {
    if (!chance(p)) continue;
    const pool = EVENTS.filter((e) => !used.has(e.id) && (!e.proOnly || s.stage !== 'amator'));
    if (!pool.length) break;
    const e = pick(pool);
    used.add(e.id);
    out.push({ idx: i, id: e.id, baslik: e.baslik, ikon: e.ikon, metin: e.metin(s, partnerName(s)), secenekler: e.secenekler });
  }
  return out;
}

export function currentEvent(s: GameState): CalEvent | undefined {
  const k = s.pending.kamp;
  if (!k) return undefined;
  return (k.olaylar ?? []).find((e) => e.idx === (k.takvimIdx ?? 0) && !e.sonuc);
}

function resolveEvent(s: GameState, e: CalEvent, i: number): string {
  const f = s.fighter;
  switch (e.id) {
    case 'basinTuru':
      if (i === 0) return L("Profesyonel ve kendinden emin göründün. (Popülerlik +{0})", [pop(s, 2)]);
      if (i === 1) {
        s.trashTalk = true;
        if (chance(0.5 + f.stats.iq / 300)) {
          pop(s, 5);
          return L("Salon yıkıldı! Sözlerin her yerde paylaşılıyor. ({0})", [trashTalkFollowers(s, true).metin]);
        }
        pop(s, -3);
        return L("Dengeyi kaçırdın. Organizasyon uyarı verdi, sosyal medya sana yüklendi. ({0})", [trashTalkFollowers(s, false).metin]);
      }
      s.patron = { ...(s.patron ?? {}), [s.contract?.org ?? 'ufc']: ((s.patron ?? {})[s.contract?.org ?? 'ufc'] ?? 0) - 1 };
      return L("Tura katılmadın. Organizasyon memnun değil. (Popülerlik {0})", [pop(s, -2)]);
    case 'hayir': {
      if (i === 0) {
        const bagis = { amator: 100, bolgesel: 1000, buyuk: 5000, ufc: 20000 }[s.stage];
        s.para -= bagis;
        s.motivasyon = Math.min(2, s.motivasyon + 1);
        return L("{0} bağış yaptın, çocuklarla fotoğraf çektirdin. (Popülerlik +{1}, motivasyon +1)", [$(bagis), pop(s, 3)]);
      }
      if (i === 1) return L("Etkinlikte boy gösterdin. (Popülerlik +{0})", [pop(s, 1)]);
      return L("Etkinliğe gitmedin.");
    }
    case 'podcast':
      if (i === 0) return L("Kahkahalarla dolu bir yayın oldu. (Popülerlik +{0})", [pop(s, 2)]);
      if (i === 1) {
        const ok = chance(0.5);
        pop(s, ok ? 4 : -2);
        return ok ? L("Klip viral oldu! ({0})", [trashTalkFollowers(s, true).metin]) : L("Laf sokayım derken dengeyi kaçırdın. ({0})", [trashTalkFollowers(s, false).metin]);
      }
      return L("Daveti reddettin.");
    case 'ortak':
      if (i === 0) {
        const t = randomKnown(s);
        const xp = t ? ` ${addTechXp(s, t.id, 3)}.` : '';
        const iq = chance(0.2) ? addStat(f.stats, 'iq', 1) : 0;
        if (chance(0.1)) {
          s.sakatliklar.push({ ad: L("Sparda zorlanan omuz"), stat: 'yer', ceza: 4, hafta: 2 });
          return L("Sert geçti, omzun zorlandı (2 hafta).{0}", [xp]);
        }
        return L("Çok şey öğrendin.{0}{1}", [xp, iq ? L(" IQ +{0}.", [iq]) : '']);
      }
      if (i === 1) {
        const yeni = TECHNIQUES.filter((t) => techLevel(s, t.id) === 0);
        if (yeni.length && chance(0.4)) {
          const t = pick(yeni);
          addTechXp(s, t.id, 3);
          return L("Sana {0} tekniğinin inceliklerini gösterdi. Yeni teknik öğrendin: {1} (seviye 1)!", [t.ad, t.ad]);
        }
        const t = randomKnown(s);
        return t ? L("Detay çalıştınız. {0}.", [addTechXp(s, t.id, 2)]) : L("Güzel bir antrenman oldu.");
      }
      return L("Daveti nazikçe reddettin.");
    case 'taraftar':
      if (i === 0) {
        s.saglik = clamp(s.saglik - 2, 0, 100);
        return L("Yüzlerce imza, yüzlerce selfie. (Popülerlik +{0})", [pop(s, 3)]);
      }
      return L("Kısa bir imza günü. (Popülerlik +{0})", [pop(s, 1)]);
  }
  return '';
}

/** Bir serbest haftayı oynar. act: 'teknik:<id>' | 'spar' | 'dinlen' | 'medya' | 'olay:<seçenek>' */
export function freeWeek(s: GameState, act: string): string {
  const k = s.pending.kamp!;
  if (!k.serbest) return '';
  const hafta = (k.takvimIdx ?? 0) + 1;
  let msg = '';
  const ev = currentEvent(s);
  if (ev && act.startsWith('olay:')) {
    msg = `${ev.baslik}: ${resolveEvent(s, ev, Number(act.slice(5)))}`;
    ev.sonuc = msg;
  } else if (act.startsWith('teknik:')) {
    msg = L("🎯 Teknik çalışması: {0}.", [addTechXp(s, act.slice(7), 3 + (s.takim.antrenorKalite >= 7 ? 1 : 0))]);
  } else if (act === 'spar') {
    const n = partnerName(s);
    const t = randomKnown(s);
    const iyi = chance(0.55);
    const xp = t && iyi ? ` ${addTechXp(s, t.id, 1)}.` : '';
    if (chance(0.07)) {
      s.sakatliklar.push({ ad: L("Sparda burkulan bilek"), stat: 'vurus', ceza: 4, hafta: randInt(1, 3) });
      msg = L("🥊 {0} ile spar: bileğin burkuldu.{1}", [n, xp]);
    } else {
      const iq = iyi && chance(0.1) ? addStat(s.fighter.stats, 'iq', 1) : 0;
      msg = L("🥊 {0} ile 5 raunt spar: {1}.{2}{3}", [n, iyi ? L("üstün taraf sendin") : L("zorlandın ama öğrendin"), xp, iq ? L(" IQ +{0}.", [iq]) : '']);
    }
  } else if (act === 'dinlen') {
    const g = Math.round(7 * restMultiplier(s));
    s.saglik = clamp(s.saglik + g, 0, 100);
    msg = L("🛌 Dinlendin. Sağlık +{0} ({1}/100).", [g, s.saglik]);
  } else if (act === 'medya') {
    const v = pop(s, randInt(1, 2));
    const ucret = chance(0.35) ? { amator: 0, bolgesel: 500, buyuk: 2500, ufc: 8000 }[s.stage] : 0;
    s.para += ucret;
    msg = L("📺 Röportaj ve reklam çekimi. (Popülerlik +{0}{1})", [v, ucret ? `, +${$(ucret)}` : '']);
  }
  const notes = advanceWeeks(s, 1);
  socialTick(s, 1);
  k.takvimIdx = hafta;
  k.serbest = (k.serbest ?? 1) - 1;
  k.takvimLog = [L("{0}. hafta · {1}{2}", [hafta, msg, notes.length ? ` ${notes.join(' ')}` : '']), ...(k.takvimLog ?? [])];
  if (k.serbest <= 0) afterFreeWeeks(k);
  return msg;
}

/** Kampa kadar kalan serbest haftaları otomatik oynar (etkinliklerde ilk seçenek). */
export function autoFreeWeeks(s: GameState) {
  const k = s.pending.kamp!;
  let guard = 0;
  while ((k.serbest ?? 0) > 0 && guard++ < 30) {
    const ev = currentEvent(s);
    if (ev) freeWeek(s, 'olay:0');
    else if (s.saglik < 80) freeWeek(s, 'dinlen');
    else {
      const t = randomKnown(s);
      freeWeek(s, t && chance(0.6) ? `teknik:${t.id}` : 'spar');
    }
  }
}

// ---------- Kamp haftaları ----------

/** Kampın bir haftasını oynar: antrenman günlüğü, spar ortakları, fight week. */
export function campWeek(s: GameState): string {
  const k = s.pending.kamp!;
  const opp = s.pending.rakip!;
  const i = (k.kampIdx ?? 0) + 1;
  const son = i >= k.hafta;
  let msg: string;
  if (i === 1) msg = L("🏁 Kamp başladı. {0} programı açıkladı: hedef {1}.", [s.takim.antrenor, opp.soyad]);
  else if (son)
    msg = s.stage === 'amator' ? L("⚖️ Maç haftası: hafif antrenman ve kilo kontrolü.") : L("📣 FIGHT WEEK: medya günü, açık antrenman ve resmi basın toplantısı. Kameralar her yerde.");
  else {
    const r = randInt(0, 4);
    if (r <= 1) {
      const t = randomKnown(s);
      const xp = t && chance(0.5) ? ` ${addTechXp(s, t.id, 1)}.` : '';
      msg = L("🥊 {0} ile spar: {1}.{2}", [partnerSparName(s) ?? partnerName(s), pick([L("temposu yüksek 5 raunt"), L("sert ama öğretici"), L("rakibinin stilini taklit etti")]), xp]);
    } else if (r === 2) {
      const t = randomKnown(s, 'sub') ?? randomKnown(s);
      msg = t ? L("🎯 Teknik günü: {0}.", [addTechXp(s, t.id, 2)]) : L("🎯 Teknik günü: temel hareketler.");
    } else if (r === 3) msg = L("🎬 Video analizi: {0} dövüşleri izlendi, {1} çalışmasına yüklenildi.", [opp.soyad, STAT_LABELS[k.focus ?? 'iq']]);
    else msg = pick([L("🏃 Kondisyon haftası: tepe koşuları ve sprint."), L("🏋️ Kuvvet haftası: ağır idmanlar."), L("🧊 Toparlanma: buz banyosu ve masaj."), L("🩸 Sparda burnun kanadı ama devam ettin.")]);
  }
  const notes = advanceWeeks(s, 1);
  socialTick(s, 1);
  if (i > 1 && !son) maybePartnerMoment(s);
  k.kampIdx = i;
  k.haftaLog = [...(k.haftaLog ?? []), L("{0}. hafta · {1}{2}", [i, msg, notes.length ? ` ${notes.join(' ')}` : ''])];
  return msg;
}
