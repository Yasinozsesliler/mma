// Antrenör Modu: dövüşçü değil hoca olarak oynanan ayrı kariyer. Salon (academy.ts) baştan senin; öğrenci
// yetiştirir, köşelerinde durur, haftaları kendin ilerletirsin. Üstüne: antrenör becerileri, öğrenci başına
// antrenman odağı, salon olayları, Yılın Antrenörü ödülü ve hedefler. Satın alınmadan ilk DENEME haftası oynanır.
import { L, LOC } from '../i18n';
import { gymLevel, gymRanking, gymTick, power, refreshCandidates, TIERS, type Student, type Tier } from './academy';
import { createGame, rollStartingStats, type NewFighterInput } from './character';
import { COUNTRIES } from './data';
import { chance, clamp, pick, randInt } from './rng';
import type { GameState, StatKey } from './types';
import { STAT_KEYS, STAT_LABELS } from './types';

export type CoachSkill = 'taktik' | 'gelisim' | 'gozcu' | 'motivasyon' | 'menajer';
export type Focus = StatKey | 'denge';

export interface CoachEvent {
  id: EventId;
  /** İlgili öğrenci (varsa) */
  ogrenci?: string;
  metin: string;
  secenekler: string[];
}

export interface CoachRun {
  xp: number;
  seviye: number;
  /** Harcanmamış beceri puanı */
  puan: number;
  beceri: Record<CoachSkill, number>;
  /** Öğrenci kimliği → antrenman odağı */
  odak: Record<string, Focus>;
  olay?: CoachEvent;
  /** Son olayın haftası (olaylar seyrek gelsin) */
  olayHafta: number;
  /** İçinde bulunulan yılın sayaçları (Yılın Antrenörü) */
  yil: { no: number; g: number; m: number; terfi: number; sampiyon: number };
  /** Kazanılan Yılın Antrenörü ödülleri (yıl numaraları) */
  oduller: number[];
  /** Son yıl sonu sonucu (bir kez gösterilir) */
  yilSonu?: { no: number; kazandi: boolean; satir: string };
  /** Satın alınmadan oynanıyor; DENEME haftasında durur */
  deneme?: boolean;
  bekle?: boolean;
}

export const DENEME = 20;
export const SKILL_MAX = 3;
export const START_MONEY = 25_000;

export const SKILLS: Record<CoachSkill, { ad: () => string; aciklama: () => string; ikon: string }> = {
  taktik: { ad: () => L("Taktik"), aciklama: () => L("Doğru köşe talimatı daha çok etkiler."), ikon: 'strategy' },
  gelisim: { ad: () => L("Antrenman"), aciklama: () => L("Öğrenciler her hafta daha hızlı gelişir."), ikon: 'dumbbell' },
  gozcu: { ad: () => L("Gözcülük"), aciklama: () => L("Yetenek avında daha yüksek potansiyelli adaylar."), ikon: 'binoculars' },
  motivasyon: { ad: () => L("Motivasyon"), aciklama: () => L("Mağlubiyet morali daha az bozar."), ikon: 'heart-pulse' },
  menajer: { ad: () => L("Menajerlik"), aciklama: () => L("Maç ücretlerinden salona daha büyük pay."), ikon: 'briefcase' },
};

const $ = (n: number) => `$${Math.round(n).toLocaleString(LOC)}`;

export const isCoach = (s: GameState) => !!s.antrenor;
export const xpNeeded = (lv: number) => 80 + lv * 60;

export function createCoachGame(isim: { ad: string; soyad: string; lakap: string; uyruk: string; kadin?: boolean }, deneme: boolean): GameState {
  const uyruk = COUNTRIES[isim.uyruk] ? isim.uyruk : 'tr';
  const input: NewFighterInput = {
    ad: isim.ad.trim() || L("Hoca"),
    soyad: isim.soyad.trim() || L("Usta"),
    lakap: isim.lakap.trim(),
    uyruk,
    memleket: COUNTRIES[uyruk].ad,
    yas: 34,
    siklet: 'orta',
    gecmis: 'kickboks',
    hikaye: '',
    kadin: isim.kadin,
  };
  const s = createGame(input, rollStartingStats(input, false));
  s.para = START_MONEY;
  // Eski bir dövüşçü olarak biraz tanınırsın: garaj salonu ilk haftadan küçük de olsa kâra geçer
  s.populerlik = 30;
  s.phase = 'antrenor';
  s.salon = { ad: L("{0} Dövüş Akademisi", [input.lakap || input.soyad]), seviye: 1, un: 15, uye: 30, acilis: s.hafta, ogrenciler: [], sonuclar: [], kasa: 0 };
  s.antrenor = {
    xp: 0,
    seviye: 1,
    puan: 1,
    beceri: { taktik: 0, gelisim: 0, gozcu: 0, motivasyon: 0, menajer: 0 },
    odak: {},
    olayHafta: s.hafta,
    yil: { no: 1, g: 0, m: 0, terfi: 0, sampiyon: 0 },
    oduller: [],
    ...(deneme ? { deneme: true } : {}),
  };
  refreshCandidates(s, true);
  s.salon.sira = gymRanking(s).sira;
  s.haberler = [L("🧢 {0} kapılarını açtı. Garajda iki torba, bir ring ve büyük bir hayal.", [s.salon.ad])];
  return s;
}

/** Hafta (salon açılışından beri). */
export const coachWeek = (s: GameState) => s.hafta - (s.salon?.acilis ?? 0);
/** Yıl içindeki hafta (1-52). */
export const weekOfYear = (s: GameState) => (coachWeek(s) % 52) + 1;

// ---------- Beceriler ----------

export function learnSkill(s: GameState, k: CoachSkill) {
  const r = s.antrenor;
  if (!r || r.puan <= 0 || r.beceri[k] >= SKILL_MAX) return;
  r.puan--;
  r.beceri[k]++;
}

export function addCoachXp(s: GameState, n: number): string | null {
  const r = s.antrenor;
  if (!r) return null;
  r.xp += n;
  let up = false;
  while (r.xp >= xpNeeded(r.seviye)) {
    r.xp -= xpNeeded(r.seviye);
    r.seviye++;
    r.puan++;
    up = true;
  }
  return up ? L("⭐ Antrenör seviyen {0} oldu! Bir beceri puanı kazandın.", [r.seviye]) : null;
}

export function setFocus(s: GameState, id: string, f: Focus) {
  if (s.antrenor) s.antrenor.odak[id] = f;
}

// ---------- Olaylar ----------

type EventId = 'transfer' | 'gece' | 'sakatlik' | 'sponsor' | 'belgesel' | 'sokak' | 'kilo' | 'rakipHoca';

const studentName = (st: Student) => `${st.ad} ${st.soyad}`;
const best = (s: GameState) => [...(s.salon?.ogrenciler ?? [])].sort((a, b) => power(b.stats) - power(a.stats))[0];

const EVENTS: Record<EventId, { kosul: (s: GameState) => Student | true | null; kur: (s: GameState, st?: Student) => Omit<CoachEvent, 'id' | 'ogrenci'> }> = {
  transfer: {
    kosul: (s) => {
      const b = best(s);
      return b && b.seviye !== 'amator' ? b : null;
    },
    kur: (s, st) => ({
      metin: L("Büyük bir salon {0} için teklif yaptı: “Bizde daha iyi kamp, daha büyük maçlar.” {1} kararsız.", [studentName(st!), st!.ad]),
      secenekler: [L("Prim ver, kalsın ({0})", [$(transferCost(st!))]), L("Kalbine konuş"), L("Gitmesine izin ver")],
    }),
  },
  gece: {
    kosul: (s) => (s.salon?.ogrenciler ?? []).filter((x) => x.yas < 26)[0] ?? null,
    kur: (s, st) => ({
      metin: L("{0} maçtan önceki gece kulüpte görüntülendi. Sosyal medya çalkalanıyor.", [studentName(st!)]),
      secenekler: [L("Ceza ver: bir hafta çift antrenman"), L("Konuş ve geç"), L("Görmezden gel")],
    }),
  },
  sakatlik: {
    kosul: (s) => (s.salon?.ogrenciler ?? []).find((x) => !x.mac) ?? null,
    kur: (s, st) => ({
      metin: L("{0} sparring'de dizini burktu. Doktor iki seçenek sunuyor.", [studentName(st!)]),
      secenekler: [L("Dinlensin (sıradaki maç ertelenir)"), L("Bandajla devam etsin")],
    }),
  },
  sponsor: {
    kosul: (s) => ((s.salon?.un ?? 0) >= 20 ? true : null),
    kur: (s) => ({
      metin: L("Mahalledeki bir enerji içeceği markası salonun duvarına logo koymak istiyor: {0}.", [$(sponsorPay(s))]),
      secenekler: [L("Kabul et"), L("Reddet: salonun havası bozulmasın")],
    }),
  },
  belgesel: {
    kosul: (s) => ((s.salon?.ogrenciler.length ?? 0) >= 2 ? true : null),
    kur: () => ({
      metin: L("Bir belgesel ekibi bir ay boyunca salonu çekmek istiyor. Ün getirir ama kameralar dikkat dağıtır."),
      secenekler: [L("Kapılar açık"), L("Kibarca reddet")],
    }),
  },
  sokak: {
    kosul: (s) => ((s.salon?.ogrenciler.length ?? 0) < gymLevel(s.salon!).kapasite ? true : null),
    kur: () => ({
      metin: L("Salonun önünde her akşam gölge boksu yapan bir genç var. Parası yok, ama gözlerinde bir şey var."),
      secenekler: [L("Ücretsiz kaydet"), L("Bir dahaki sefere")],
    }),
  },
  kilo: {
    kosul: (s) => (s.salon?.ogrenciler ?? []).find((x) => !x.mac && x.siklet !== 'agir') ?? null,
    kur: (s, st) => ({
      metin: L("{0} kilo düşmekte çok zorlanıyor. Tartıda her seferinde kriz.", [studentName(st!)]),
      secenekler: [L("Bir üst sıklete çıksın"), L("Diyetisyen tut ({0})", [$(4_000)]), L("Dişini sıksın")],
    }),
  },
  rakipHoca: {
    kosul: (s) => ((s.salon?.sonuclar.length ?? 0) >= 3 ? true : null),
    kur: (s) => ({
      metin: L("Rakip bir hoca röportajında {0} için “garaj salonu, oyuncak dövüşçüler” dedi.", [s.salon!.ad]),
      secenekler: [L("Kafeste cevap veririz"), L("Sosyal medyada sert cevap ver")],
    }),
  },
};

const transferCost = (st: Student) => ({ amator: 2_000, bolgesel: 6_000, buyuk: 15_000, ucc: 40_000 })[st.seviye];
const sponsorPay = (s: GameState) => Math.round((3_000 + (s.salon?.un ?? 0) * 150) / 500) * 500;

function maybeEvent(s: GameState) {
  const r = s.antrenor!;
  if (r.olay || coachWeek(s) - (r.olayHafta - (s.salon?.acilis ?? 0)) < 5 || !chance(0.3)) return;
  const ids = (Object.keys(EVENTS) as EventId[]).filter((id) => EVENTS[id].kosul(s));
  if (!ids.length) return;
  const id = pick(ids);
  const hit = EVENTS[id].kosul(s);
  const st = hit === true || !hit ? undefined : hit;
  r.olay = { id, ogrenci: st?.id, ...EVENTS[id].kur(s, st) };
  r.olayHafta = s.hafta;
}

/** Olay kararı. Dönüş: sonucu anlatan satır. */
export function chooseEvent(s: GameState, i: number): string {
  const r = s.antrenor;
  const g = s.salon;
  const ev = r?.olay;
  if (!r || !g || !ev) return '';
  r.olay = undefined;
  const st = ev.ogrenci ? g.ogrenciler.find((x) => x.id === ev.ogrenci) : undefined;
  const moral = (n: number) => st && (st.moral = clamp(st.moral + n, 0, 100));
  let out = '';
  switch (ev.id) {
    case 'transfer': {
      if (!st) break;
      if (i === 0) {
        const c = transferCost(st);
        if (s.para < c) {
          out = L("Kasada o kadar para yok. {0} gitti.", [st.ad]);
          g.ogrenciler = g.ogrenciler.filter((x) => x.id !== st.id);
          break;
        }
        s.para -= c;
        moral(15);
        out = L("{0} kaldı ve motivasyonu tavan yaptı.", [st.ad]);
      } else if (i === 1) {
        if (chance(0.45 + st.moral / 200 + r.beceri.motivasyon * 0.08)) {
          moral(8);
          out = L("“Beni sokaktan sen aldın hocam.” {0} kalıyor.", [st.ad]);
        } else {
          g.ogrenciler = g.ogrenciler.filter((x) => x.id !== st.id);
          g.un = clamp(g.un - 3, 0, 100);
          out = L("{0} sarıldı, teşekkür etti ve gitti.", [st.ad]);
        }
      } else {
        g.ogrenciler = g.ogrenciler.filter((x) => x.id !== st.id);
        const bonservis = transferCost(st) * 2;
        s.para += bonservis;
        out = L("{0} gitti; salon {1} bonservis aldı.", [st.ad, $(bonservis)]);
      }
      break;
    }
    case 'gece':
      if (!st) break;
      if (i === 0) {
        moral(-8);
        STAT_KEYS.forEach((k) => chance(0.35) && (st.stats[k] = Math.min(99, st.stats[k] + 1)));
        out = L("{0} homurdandı ama ter attı. Güçlendi.", [st.ad]);
      } else if (i === 1) {
        moral(4);
        out = L("Uzun bir sohbet. {0} sözünü verdi.", [st.ad]);
      } else {
        moral(6);
        g.un = clamp(g.un - 2, 0, 100);
        out = L("Haberler büyüdü, salonun adı biraz yıprandı.");
      }
      break;
    case 'sakatlik':
      if (!st) break;
      if (i === 0) {
        st.macHafta += 4;
        out = L("{0} dört hafta dinlenecek.", [st.ad]);
      } else if (chance(0.5)) {
        out = L("Şanslıydın: diz dayandı.");
      } else {
        STAT_KEYS.forEach((k) => (st.stats[k] = Math.max(8, st.stats[k] - 1)));
        moral(-10);
        out = L("Diz iyice şişti. {0} geriledi.", [st.ad]);
      }
      break;
    case 'sponsor':
      if (i === 0) {
        const p = sponsorPay(s);
        s.para += p;
        out = L("Logo duvarda, para kasada: +{0}.", [$(p)]);
      } else {
        g.un = clamp(g.un + 2, 0, 100);
        out = L("Salonun havası sende kaldı. Ün +2.");
      }
      break;
    case 'belgesel':
      if (i === 0) {
        g.un = clamp(g.un + 6, 0, 100);
        g.ogrenciler.forEach((x) => (x.moral = clamp(x.moral - 4, 0, 100)));
        out = L("Belgesel yayında! Ün +6, ama öğrenciler biraz dağıldı.");
      } else out = L("Salon sessiz kaldı, odak tam.");
      break;
    case 'sokak':
      if (i === 0) {
        refreshCandidates(s, true);
        const yeni = g.adaylar!.list[0];
        yeni.potansiyel = clamp(yeni.potansiyel + 10, 60, 92);
        yeni.moral = 90;
        g.adaylar!.list = [yeni];
        g.ogrenciler.push({ ...yeni, katilis: s.hafta, yas0: yeni.yas, macHafta: s.hafta + randInt(4, 6) });
        g.adaylar!.list = [];
        out = L("{0} {1} artık senin öğrencin. Bedava ama paha biçilmez olabilir.", [yeni.ad, yeni.soyad]);
      } else out = L("Genç bir süre sonra görünmez oldu.");
      break;
    case 'kilo':
      if (!st) break;
      if (i === 0) {
        const order = ['sinek', 'horoz', 'tuy', 'hafif', 'welter', 'orta', 'yariagir', 'agir'] as const;
        const idx = order.indexOf(st.siklet as (typeof order)[number]);
        if (idx >= 0 && idx < order.length - 1) st.siklet = order[idx + 1];
        moral(6);
        out = L("{0} bir üst sıklette rahatladı.", [st.ad]);
      } else if (i === 1) {
        if (s.para >= 4_000) {
          s.para -= 4_000;
          moral(8);
          out = L("Diyetisyen mucize yarattı.");
        } else out = L("Kasada para yok; {0} kendi başının çaresine bakacak.", [st.ad]);
      } else {
        moral(-10);
        out = L("{0} kiloyu verdi ama yüzü gülmüyor.", [st.ad]);
      }
      break;
    case 'rakipHoca':
      if (i === 0) {
        g.ogrenciler.forEach((x) => (x.moral = clamp(x.moral + 5, 0, 100)));
        out = L("Öğrencilerin hırslandı. Moral +5.");
      } else {
        g.un = clamp(g.un + (chance(0.5) ? 3 : -2), 0, 100);
        out = L("Atışma büyüdü. Bazıları sevdi, bazıları hiç sevmedi.");
      }
      break;
  }
  if (out) s.haberler.unshift(out);
  return out;
}

// ---------- Hafta ----------

/** Maç sonucunu antrenör kariyerine işler (academy.finishBout çağırır). */
export function noteCoachBout(s: GameState, kazandi: boolean, kose: boolean, terfi: Tier | null, sampiyon: boolean): string[] {
  const r = s.antrenor;
  if (!r) return [];
  if (kazandi) r.yil.g++;
  else r.yil.m++;
  if (terfi) r.yil.terfi++;
  if (sampiyon) r.yil.sampiyon++;
  const xp = (kazandi ? (kose ? 22 : 12) : 5) + (terfi ? (terfi === 'ucc' ? 80 : 35) : 0) + (sampiyon ? 150 : 0);
  const up = addCoachXp(s, xp);
  return up ? [up] : [];
}

function yearEnd(s: GameState): string | null {
  const r = s.antrenor!;
  const y = r.yil;
  // Galibiyet oranı, terfiler, şampiyonlar ve salon sırası; rakip hocalar yıllar geçtikçe güçlenir
  const oran = y.g + y.m ? y.g / (y.g + y.m) : 0;
  const sira = s.salon?.sira ?? 30;
  const puan = y.g * 1.5 + oran * 20 + y.terfi * 6 + y.sampiyon * 18 + (sira <= 3 ? 12 : sira <= 10 ? 6 : 0);
  const rakip = 30 + Math.min(y.no, 10) * 4 + randInt(0, 22);
  const kazandi = puan >= rakip;
  let satir: string;
  if (kazandi) {
    r.oduller.push(y.no);
    const odul = 10_000 + y.no * 2_500;
    s.para += odul;
    if (s.salon) s.salon.un = clamp(s.salon.un + 8, 0, 100);
    addCoachXp(s, 60);
    satir = L("🏆 YILIN ANTRENÖRÜ: {0}! {1}. yılın ödülü senin. Ödül {2}, ün +8.", [`${s.fighter.ad} ${s.fighter.soyad}`, y.no, $(odul)]);
  } else satir = L("🎙️ {0}. yılın antrenörü ödülünü bu yıl başkası aldı. Yıl: {1} galibiyet, {2} terfi.", [y.no, y.g, y.terfi]);
  r.yilSonu = { no: y.no, kazandi, satir };
  r.yil = { no: y.no + 1, g: 0, m: 0, terfi: 0, sampiyon: 0 };
  return satir;
}

/** Bir hafta ilerlet. Dönüş: haftanın notları. */
export function advanceCoachWeek(s: GameState): string[] {
  const r = s.antrenor;
  if (!r || r.bekle || r.olay) return [];
  s.hafta++;
  const notes = gymTick(s, 1);
  if (coachWeek(s) > 0 && coachWeek(s) % 52 === 0) {
    const y = yearEnd(s);
    if (y) notes.push(y);
  }
  maybeEvent(s);
  if (r.deneme && coachWeek(s) >= DENEME) {
    r.bekle = true;
    notes.push(L("⏸️ Deneme süresi bitti. Antrenör Modu paketiyle salonun kaldığı yerden devam eder."));
  }
  notes.slice().reverse().forEach((n) => s.haberler.unshift(n));
  s.haberler = s.haberler.slice(0, 40);
  return notes;
}

/** Paket alındı: deneme kalkar. */
export function unlockCoach(s: GameState) {
  const r = s.antrenor;
  if (!r) return;
  delete r.deneme;
  delete r.bekle;
}

// ---------- Hedefler ----------

export interface CoachGoal {
  ad: string;
  tamam: boolean;
}

export function coachGoals(s: GameState): CoachGoal[] {
  const g = s.salon;
  const r = s.antrenor;
  if (!g || !r) return [];
  const tiers = new Set(g.ogrenciler.map((x) => x.seviye));
  return [
    { ad: L("İlk galibiyet"), tamam: (g.galibiyet ?? 0) >= 1 },
    { ad: L("Bir öğrenciyi bölgesel lige çıkar"), tamam: tiers.has('bolgesel') || tiers.has('buyuk') || tiers.has('ucc') || (g.uccSayisi ?? 0) > 0 },
    { ad: L("Salonu büyüt (Mahalle salonu)"), tamam: g.seviye >= 2 },
    { ad: L("Büyük organizasyonda bir öğrenci"), tamam: tiers.has('buyuk') || tiers.has('ucc') || (g.uccSayisi ?? 0) > 0 },
    { ad: L("UCC'ye öğrenci gönder"), tamam: (g.uccSayisi ?? 0) > 0 },
    { ad: L("Dünyanın en iyi 10 salonu"), tamam: (g.enIyiSira ?? 99) <= 10 },
    { ad: L("Yılın Antrenörü ödülü"), tamam: r.oduller.length > 0 },
    { ad: L("UCC şampiyonu yetiştir"), tamam: (g.sampiyonSayisi ?? 0) > 0 },
    { ad: L("Dünyanın 1 numaralı salonu"), tamam: (g.enIyiSira ?? 99) <= 1 },
  ];
}

export const focusLabel = (f: Focus) => (f === 'denge' ? L("Dengeli") : STAT_LABELS[f]);
export const tierName = (t: Tier) => TIERS[t].ad;
