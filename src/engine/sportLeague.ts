// Dövüş Sporları Ligleri: MMA maçları arasında başka bir sporun ligine davet. Maç kendi kurallarıyla canlı oynanır
// (boks: yalnızca yumruk; tekme, indirme ve yer dövüşü yok). Sonuç MMA karnesine işlenmez; ligin kendi karnesi,
// sıralaması ve kemeri vardır. Galibiyet para, takipçi ve az miktarda gelişim puanı verir (her sporda sınırlı).
import { L, LOC } from '../i18n';
import { advanceWeeks } from './character';
import { addFollowers, fmtDelta, followers } from './fame';
import { addMemento } from './memories';
import { addPost } from './social';
import { startFight } from './fight';
import { generateOpponent } from './opponents';
import { chance, clamp, randInt } from './rng';
import { techLevels } from './techniques';
import { afterRosterBout, ensureRoster, pickRosterOpponent, type LigKisi } from './sportRoster';
import type { FightState, GameState, Opponent, Stage, Stats } from './types';

import { SPORT_TACTICS, type Sport } from './sportRules';

export type { Sport };
/** Şimdilik açık olan ligler (diğerleri sonraki sürümlerde) */
export const OPEN_SPORTS: Sport[] = ['boks', 'muaythai', 'grappling', 'gures'];

export type SportRec = { g: number; m: number; ko: number; /** 1 = 1 numaralı yarışmacı, 11 = sıralama dışı */ sira: number; kemer: boolean; savunma: number; /** Verilen gelişim puanı */ bonus: number; /** Kazanılan kemer sayısı (kaybedip geri alınca artar) */ kemerler?: number; /** Kalıcı lig kadrosu (sportRoster.ts) */ kadro?: LigKisi[] };
export type SportBout = { spor: Sport; rakip: Opponent; ucret: number; unvan: boolean; adim: 'hazir' | 'dovus' | 'sonuc'; dovus?: FightState; notlar?: string[]; kazandi?: boolean; /** Bu maçta kemer kazanıldı (kutlama sahnesi) */ yeniKemer?: boolean; /** Ödenen ücret ve ödüllü reklamla ek ücret alındı mı */ odenen?: number; katlandi?: boolean; /** Rakibin kadrodaki yeri */ kadroIdx?: number };

export const SPORTS: Record<Sport, { ad: () => string; spor: () => string; kisa: string; renk: string; icon: string; kural: () => string }> = {
  boks: { spor: () => L("Boks"), ad: () => L("Altın Eldiven Boks Ligi"), kisa: 'AEB', renk: '#d4a017', icon: 'boxing-glove', kural: () => L("Yalnızca yumruk: jab, direkt, kaç, gard. Tekme, indirme ve yer dövüşü yok.") },
  muaythai: { spor: () => L("Muay Thai"), ad: () => L("Sekiz Silah Muay Thai Ligi"), kisa: 'SSM', renk: '#e63946', icon: 'karate', kural: () => L("Yumruk, tekme, diz ve dirsek; indirme ve yer dövüşü yok.") },
  grappling: { spor: () => L("Grappling"), ad: () => L("Kilit Grappling Ligi"), kisa: 'KGL', renk: '#7b2cbf', icon: 'lock', kural: () => L("Vuruş yok: indir, pozisyon al, kilitle.") },
  gures: { spor: () => L("Güreş"), ad: () => L("Er Meydanı Güreş Ligi"), kisa: 'EMG', renk: '#2a9d8f', icon: 'human-handsup', kural: () => L("Vuruş yok: indirme ve çevirme puanı, tuşla biter.") },
};

export const sportTactics = (sp: Sport) => SPORT_TACTICS[sp];

export const UNRANKED = 11;
export const recOf = (s: GameState, sp: Sport): SportRec => s.sporlar?.[sp] ?? { g: 0, m: 0, ko: 0, sira: UNRANKED, kemer: false, savunma: 0, bonus: 0 };
const saveRec = (s: GameState, sp: Sport, r: SportRec) => (s.sporlar = { ...(s.sporlar ?? {}), [sp]: r });

/** Ligler profesyonel kariyerde açılır (Efsane Yolu ve Antrenör Modu hariç). */
export const sportsOpen = (s: GameState) => s.stage !== 'amator' && !s.efsane && !s.antrenor && s.phase !== 'emeklilik';
export const SPORT_GAP = 6;
export const weeksToNext = (s: GameState) => Math.max(0, (s.sporSon ?? -99) + SPORT_GAP - s.hafta);
/** Bu an bir lig maçı alınabilir mi (MMA dövüşü ya da kamp sürmüyorsa) */
export const freeNow = (s: GameState) => sportsOpen(s) && !s.sporMac && !s.pending.kamp && !s.pending.dovus && !s.pending.rakip;
export const canBook = (s: GameState) => freeNow(s) && weeksToNext(s) === 0;

const BG: Partial<Record<GameState['fighter']['gecmis'], Sport>> = { boks: 'boks', kickboks: 'muaythai', muaythai: 'muaythai', gures: 'gures', bjj: 'grappling', judo: 'grappling', sambo: 'grappling' };

/** MMA maçından sonra: ara sıra bir ligden davet (kökeni o sporsa daha sık). */
export function maybeSportInvite(s: GameState) {
  if (!sportsOpen(s) || s.sporMac || s.sporDavet || weeksToNext(s) > 0) return;
  const own = BG[s.fighter.gecmis];
  const sp: Sport = own && OPEN_SPORTS.includes(own) ? own : OPEN_SPORTS[randInt(0, OPEN_SPORTS.length - 1)] ?? 'boks';
  if (!chance(own === sp ? 0.55 : 0.3)) return;
  s.sporDavet = { spor: sp, hafta: s.hafta };
  s.haberler.unshift(L("📨 {0} seni ringe davet ediyor. Maç MMA karnene işlenmez.", [SPORTS[sp].ad()]));
}

const PAY: Record<Stage, number> = { amator: 0, bolgesel: 6_000, buyuk: 20_000, ufc: 45_000 };
export const purseOf = (s: GameState, r: SportRec, unvan: boolean) => Math.round((PAY[s.stage] * (1 + (UNRANKED - r.sira) * 0.08) * (unvan ? 2 : 1)) / 500) * 500;

/** Sporun rakibi: o sporun uzmanı; MMA'nın diğer alanları zayıf. */
export function sportOpponent(s: GameState, sp: Sport, r: SportRec, unvan: boolean): Opponent {
  const zorluk = r.sira <= 3 || unvan ? 1 : r.sira <= 7 ? 0 : -1;
  const o = generateOpponent(s, { zorluk, org: 'cfc' });
  const st: Stats = { ...o.stats };
  const up = (k: keyof Stats, v: number) => (st[k] = clamp(st[k] + v, 20, 99));
  if (sp === 'boks') {
    // Uzmanlık sıralamayla artar: sıralama dışı rakipler başlangıç seviyesinde
    const k = unvan ? 1 : r.sira <= 3 ? 0.85 : r.sira <= 7 ? 0.6 : 0.3;
    up('vurus', Math.round(7 * k));
    up('hiz', Math.round(5 * k));
    up('cene', Math.round(4 * k));
    up('gures', -18);
    up('yer', -18);
  } else if (sp === 'grappling' || sp === 'gures') {
    const k = unvan ? 1 : r.sira <= 3 ? 0.85 : r.sira <= 7 ? 0.6 : 0.3;
    up(sp === 'grappling' ? 'yer' : 'gures', Math.round(7 * k));
    up(sp === 'grappling' ? 'gures' : 'kondisyon', Math.round(4 * k));
    up('iq', Math.round(3 * k));
    up('vurus', -15);
  } else if (sp === 'muaythai') {
    const k = unvan ? 1 : r.sira <= 3 ? 0.85 : r.sira <= 7 ? 0.6 : 0.3;
    up('vurus', Math.round(5 * k));
    up('kondisyon', Math.round(6 * k));
    up('cene', Math.round(4 * k));
    up('gures', Math.round(3 * k) - 8);
    up('yer', -18);
  }
  const g = randInt(8, 26) + Math.round((UNRANKED - r.sira) * 1.5);
  return {
    ...o,
    stil: sp === 'boks' ? 'boks' : sp === 'muaythai' ? 'muaythai' : sp === 'grappling' ? 'bjj' : 'gures',
    stats: st,
    rekor: { g, m: randInt(0, 5), b: randInt(0, 2) },
    rank: unvan && r.kemer ? randInt(1, 3) : unvan ? null : Math.max(1, r.sira - 1 - randInt(0, 2)),
    champion: unvan && !r.kemer,
    rivalry: 0,
    karsilasma: 0,
    huylar: [],
    huyBilinen: [],
  };
}

function book(s: GameState, sp: Sport) {
  const r = recOf(s, sp);
  // 1 numaraya yükselen kemer maçı alır; kemeri tutan savunur.
  const unvan = r.kemer || r.sira === 1;
  // Rakip kalıcı kadrodan: adı, ülkesi ve karnesi tabloda görünenle aynı
  const kadro = ensureRoster(s, sp, r.kadro);
  saveRec(s, sp, { ...r, kadro });
  const idx = pickRosterOpponent(kadro, r, unvan);
  const k = kadro[idx];
  const base = sportOpponent(s, sp, r, unvan);
  const d = Math.round((k.guc - 0.5) * 8);
  const stats = { ...base.stats };
  for (const key of Object.keys(stats) as (keyof typeof stats)[]) stats[key] = clamp(stats[key] + d, 20, 99);
  const rakip: Opponent = { ...base, id: k.id, ad: k.ad, soyad: k.soyad, lakap: k.lakap, uyruk: k.uyruk, stats, rekor: { g: k.g, m: k.m, b: 0 }, champion: unvan && !r.kemer, rank: unvan && !r.kemer ? null : idx + (r.kemer ? 1 : 0) };
  s.sporMac = { spor: sp, rakip, ucret: purseOf(s, r, unvan), unvan, adim: 'hazir', kadroIdx: idx };
  s.sporDavet = undefined;
  s.pending.sonrakiFaz = 'hub';
  s.phase = 'sporLig';
}

export function acceptSportInvite(s: GameState) {
  const d = s.sporDavet;
  if (!d || !freeNow(s)) return;
  book(s, d.spor);
}

export function declineSportInvite(s: GameState) {
  s.sporDavet = undefined;
}

/** Lig ekranından maç iste (bekleme süresi dolduysa). */
export function requestSportBout(s: GameState, sp: Sport) {
  if (!canBook(s) || !OPEN_SPORTS.includes(sp)) return;
  book(s, sp);
}

/** Maçtan vazgeç (dövüş başlamadan): karne değişmez. */
export function withdrawSportBout(s: GameState) {
  if (s.sporMac?.adim !== 'hazir') return;
  s.sporMac = undefined;
  s.phase = 'hub';
}

export function startSportFight(s: GameState) {
  const b = s.sporMac;
  if (!b || b.adim !== 'hazir') return;
  b.dovus = startFight({
    pStats: s.fighter.stats,
    pAd: s.fighter.lakap || s.fighter.soyad,
    koseAdi: s.takim.antrenor,
    opp: b.rakip,
    mods: { stats: {}, plan: 'ayakta', planUyum: false, oppStats: {}, teknik: techLevels(s), kural: b.spor },
    maxRaunt: b.unvan ? 5 : 3,
    unvanMaci: b.unvan,
    anaMac: false,
  });
  b.adim = 'dovus';
}

export const SPORT_BONUS_MAX = 8;

/** Lig maçı bitti: lig karnesi, sıralama, kemer, ücret ve takipçi. */
export function finishSportFight(s: GameState) {
  const b = s.sporMac;
  const fs = b?.dovus;
  const res = fs?.sonuc;
  if (!b || !fs || !res) return;
  const r = { ...recOf(s, b.spor) };
  const won = res.kazanan === 'p';
  const draw = res.kazanan === 'berabere';
  const fin = res.yontem === 'KO' || res.yontem === 'TKO';
  const lig = SPORTS[b.spor];
  const notes: string[] = [];
  if (won) {
    r.g++;
    if (fin) r.ko++;
    if (b.unvan) {
      if (r.kemer) {
        r.savunma++;
        notes.push(L("🏆 Kemerini savundun! {0} savunma.", [r.savunma]));
      } else {
        r.kemer = true;
        r.kemerler = (r.kemerler ?? 0) + 1;
        b.yeniKemer = true;
        notes.push(L("🏆 {0} ŞAMPİYONU! Kemer artık senin.", [lig.ad().toLocaleUpperCase(LOC)]));
        s.haberler.unshift(L("🏆 {0} {1} kemerini kazandı!", [`${s.fighter.ad} ${s.fighter.soyad}`, lig.ad()]));
        // Dolapta takılabilen lig kemeri, müze vitrini ve organizasyonun paylaşımı
        const koz = `kem_lig_${b.spor}`;
        if (!(s.ozelKozmetik ?? []).includes(koz)) {
          s.ozelKozmetik = [...(s.ozelKozmetik ?? []), koz];
          notes.push(L("🎽 Dolaba yeni kemer görünümü: {0}", [lig.ad()]));
        }
        const m = addMemento(s, { id: 'lig_kemer', tur: 'kemer', ad: L("Başka bir sporun kemeri"), metin: L("{0} kemeri. Kafesin dışında da şampiyon olduğunun kanıtı.", [lig.ad()]), nadir: 'efsane', kat: 'muze' });
        if (m) notes.push(m);
        addPost(s, { yazar: lig.ad(), kullanici: `@${lig.kisa.toLowerCase()}lig`, tur: 'organizasyon', metin: L("🏆 YENİ ŞAMPİYON! {0}, MMA'dan gelip kemeri aldı. Kimse beklemiyordu. 👑", [`${s.fighter.ad} ${s.fighter.soyad}`]), renk: lig.renk });
      }
      r.sira = 1;
    } else {
      const once = r.sira;
      r.sira = Math.max(1, r.sira - (fin ? 3 : 2));
      notes.push(r.sira === 1 ? L("📈 1 numaraya yükseldin: sıradaki maç kemer maçı!") : L("📈 Sıralama: {0} → {1}", [once >= UNRANKED ? '—' : once, r.sira]));
    }
  } else if (!draw) {
    r.m++;
    if (b.unvan && r.kemer) {
      r.kemer = false;
      r.savunma = 0;
      notes.push(L("💔 Kemeri kaybettin."));
    }
    r.sira = Math.min(UNRANKED, r.sira + 2);
    notes.push(L("📉 Sıralama: {0}", [r.sira >= UNRANKED ? L("sıralama dışı") : r.sira]));
  } else {
    notes.push(L("⚖️ Berabere: sıralama değişmedi."));
  }
  // Lig galibiyeti Kafesgram'da konuşulur (kemer paylaşımı ayrı)
  if (won && !b.yeniKemer) addPost(s, { yazar: lig.ad(), kullanici: `@${lig.kisa.toLowerCase()}lig`, tur: 'organizasyon', metin: fin ? L("💥 {0} ligimizde bitirişle kazandı! MMA'cılar bu işi biliyor.", [`${s.fighter.ad} ${s.fighter.soyad}`]) : L("✅ {0} ligimizde kazandı: {1}-{2}.", [`${s.fighter.ad} ${s.fighter.soyad}`, r.g, r.m]), renk: lig.renk });
  const pay = Math.round(b.ucret * (won ? 1.5 : 1));
  s.para += pay;
  b.odenen = pay;
  notes.push(L("💵 Ücret: ${0}", [pay.toLocaleString(LOC)]));
  const fans = Math.round((followers(s) * (won ? 0.015 : 0.004) + (won ? 120 : 30)) * (b.unvan ? 2 : 1) * (fin && won ? 1.3 : 1));
  notes.push(L("{0} takipçi", [fmtDelta(addFollowers(s, fans))]));
  if (won && r.bonus < SPORT_BONUS_MAX) {
    r.bonus++;
    s.puan++;
    notes.push(L("⭐ +1 gelişim puanı ({0}/{1})", [r.bonus, SPORT_BONUS_MAX]));
  }
  const hasar = Math.round(fs.pHasar * 0.25);
  if (hasar) {
    s.saglik = clamp(s.saglik - hasar, 5, 100);
    notes.push(L("🩹 Sağlık -{0} → {1}/100", [hasar, s.saglik]));
  }
  // Kadro: rakibin karnesi, kemer değişimi, diğer yarışmacıların maçları
  if (r.kadro && b.kadroIdx != null) {
    const once = recOf(s, b.spor).kemer;
    const k = afterRosterBout(r.kadro, b.kadroIdx, won, draw, fin, once, b.unvan, lig.ad());
    r.kadro = k.kadro;
    s.haberler.unshift(...k.haber);
  }
  saveRec(s, b.spor, r);
  advanceWeeks(s, 2);
  s.sporSon = s.hafta;
  b.kazandi = won;
  b.notlar = notes;
  b.dovus = undefined;
  b.adim = 'sonuc';
}

export function closeSportBout(s: GameState) {
  s.sporMac = undefined;
  s.phase = 'hub';
}

/** Ödüllü reklam (maç sonu, bir kez): galibiyette ücret bir kez daha, yenilgide teselli primi (ücretin yarısı). Güç vermez. */
export const sportBonusAmount = (b: SportBout) => Math.round((b.odenen ?? 0) * (b.kazandi ? 1 : 0.5));
export function claimSportBonus(s: GameState): string | null {
  const b = s.sporMac;
  if (!b || b.adim !== 'sonuc' || b.katlandi || !b.odenen) return null;
  const x = sportBonusAmount(b);
  s.para += x;
  b.katlandi = true;
  const t = b.kazandi ? L("💵 Ücret ikiye katlandı: +${0}", [x.toLocaleString(LOC)]) : L("💵 Teselli primi: +${0}", [x.toLocaleString(LOC)]);
  b.notlar = [...(b.notlar ?? []), t];
  return t;
}
