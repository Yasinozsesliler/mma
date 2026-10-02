// Salon arkadaşı (antrenman ortağı): kamplarda karar anları gelir, bağ yükselirse köşene geçer (dövüşte IQ +1),
// bağ dibe vurursa salonu terk eder ve rakibine dönüşür.
import { L, LOC } from '../i18n';
import { generateOpponent } from './opponents';
import { chance, clamp, pick } from './rng';
import type { GameState, Opponent, Stats } from './types';

export interface Partner {
  o: Opponent;
  bag: number;
  durum: 'normal' | 'kanka' | 'rakip';
  /** Son karar anının yaşandığı kamp (dövüş sayısı) */
  son?: number;
}

export type MomentId = 'sertSpar' | 'kilo' | 'bilgi' | 'gece' | 'borc' | 'koseci' | 'ihanet';

export interface PartnerMoment {
  id: MomentId;
  metin: string;
  secenekler: string[];
  /** Borç miktarı vb. */
  x?: number;
  sonuc?: string;
}

const name = (p: Partner) => `${p.o.ad} ${p.o.soyad}`;
const add = (m: Partial<Stats>, k: keyof Stats, n: number) => (m[k] = (m[k] ?? 0) + n);

/** Profesyonel kampla birlikte salona bir antrenman ortağı gelir. */
export function ensurePartner(s: GameState) {
  if (s.kanka || s.stage === 'amator') return;
  const o = generateOpponent(s, { zorluk: 0, org: 'amator' });
  s.kanka = { o: { ...o, id: `kanka-${o.id}`, rekor: { ...o.rekor } }, bag: 10, durum: 'normal' };
  s.haberler.unshift(L("🤝 Salona yeni biri geldi: {0} “{1}”. Antrenman ortağın olacak.", [`${o.ad} ${o.soyad}`, o.lakap]));
}

/** Kamp haftasında (en fazla kamp başına bir kez) karar anı çıkabilir. */
export function maybePartnerMoment(s: GameState) {
  const p = s.kanka;
  const k = s.pending.kamp;
  if (!p || !k || p.durum === 'rakip' || k.kankaAn || k.kankaBitti) return;
  const fights = s.gecmis.length;
  if (p.son === fights) return;
  const n = name(p);
  let m: PartnerMoment | null = null;
  if (p.bag <= -40) {
    m = { id: 'ihanet', metin: L("{0} salonu terk etti. Giderken bağırdı: “Senin gölgende kalmayacağım. Kafeste görüşürüz!”", [n]), secenekler: [L("Kapı orada")] };
  } else if (p.bag >= 60 && p.durum === 'normal') {
    m = { id: 'koseci', metin: L("{0} artık kardeşin gibi. “Bundan sonra her maçında köşende ben olacağım,” dedi.", [n]), secenekler: [L("Kardeşim benim 🤝")] };
  } else if (chance(0.4)) {
    const id = pick<MomentId>(['sertSpar', 'kilo', 'bilgi', 'gece', 'borc']);
    const opp = s.pending.rakip?.soyad ?? L("rakibin");
    if (id === 'sertSpar')
      m = { id, metin: L("{0} sparringde seni fena sarstı, bütün salon güldü.", [n]), secenekler: [L("Ertesi gün sen de sert gir"), L("Tebrik et, ondan öğren"), L("Hocana şikâyet et")] };
    else if (id === 'kilo') m = { id, metin: L("{0} kilo vermekte zorlanıyor. Gece seninle koşmak istiyor.", [n]), secenekler: [L("Birlikte koş"), L("Kendi programına odaklan")] };
    else if (id === 'bilgi') m = { id, metin: L("{0}, {1} ile eskiden aynı salondaydı. Zayıf noktalarını anlatmak istiyor.", [n, opp]), secenekler: [L("Dinle"), L("Gerek yok, planım hazır")] };
    else if (id === 'gece') m = { id, metin: L("{0} hafta sonu kulübe gitmeyi teklif ediyor. “Bir gece bir şey olmaz!”", [n]), secenekler: [L("Git"), L("Reddet")] };
    else {
      const x = Math.max(300, Math.round((s.para * 0.04) / 100) * 100);
      m = { id, x, metin: L("{0} kirasını ödeyemiyor, senden ${1} borç istiyor.", [n, x.toLocaleString(LOC)]), secenekler: [L("Ver"), L("Veremem")] };
    }
  }
  if (m) {
    k.kankaAn = m;
    p.son = fights;
  }
}

/** Karar anında seçim. */
export function choosePartner(s: GameState, i: number) {
  const p = s.kanka;
  const k = s.pending.kamp;
  const m = k?.kankaAn;
  if (!p || !k || !m || m.sonuc) return;
  const n = name(p);
  let bag = 0;
  let sonuc = '';
  switch (m.id) {
    case 'sertSpar':
      if (i === 0) {
        bag = -12;
        add(k.mods, 'vurus', 1);
        sonuc = L("Ertesi gün sen de acımadın. Aranız gerildi ama vuruşların keskinleşti (vuruş +1).");
      } else if (i === 1) {
        bag = 10;
        add(k.mods, 'iq', 1);
        sonuc = L("{0} ne yaptığını gösterdi, çok şey öğrendin (IQ +1).", [n]);
      } else {
        bag = -20;
        s.saglik = clamp(s.saglik + 5, 0, 100);
        sonuc = L("Hoca sparringleri hafifletti (sağlık +5). {0} seni ispiyoncu ilan etti.", [n]);
      }
      break;
    case 'kilo':
      if (i === 0) {
        bag = 15;
        add(k.mods, 'kondisyon', 1);
        s.saglik = clamp(s.saglik - 4, 0, 100);
        sonuc = L("Gece yarısı koşuları ikinize de iyi geldi (kondisyon +1, sağlık -4).");
      } else {
        bag = -6;
        sonuc = L("{0} yalnız koştu. Biraz kırıldı.", [n]);
      }
      break;
    case 'bilgi':
      if (i === 0) {
        bag = 5;
        add(k.oppMods, 'iq', -1);
        sonuc = L("Rakibinin alışkanlıklarını öğrendin. Kafeste bir adım öndesin (rakip IQ -1).");
      } else {
        bag = -3;
        sonuc = L("Kendi planına güvendin.");
      }
      break;
    case 'gece':
      if (i === 0) {
        bag = 12;
        s.saglik = clamp(s.saglik - 6, 0, 100);
        s.gece = { risk: (s.gece?.risk ?? 0) + 6, ziyaret: (s.gece?.ziyaret ?? 0) + 1 };
        sonuc = L("Harika bir geceydi ama sabah antrenmanı kâbustu (sağlık -6). Biri fotoğraf da çekmiş olabilir…");
      } else {
        bag = -8;
        sonuc = L("{0} “Sıkıcısın,” dedi ve tek başına gitti.", [n]);
      }
      break;
    case 'borc':
      if (i === 0 && s.para >= (m.x ?? 0)) {
        bag = 20;
        s.para -= m.x ?? 0;
        sonuc = L("{0} gözleri dolarak teşekkür etti. “Bunu asla unutmayacağım.”", [n]);
      } else {
        bag = -10;
        sonuc = L("{0} anladığını söyledi ama yüzü düştü.", [n]);
      }
      break;
    case 'koseci':
      p.durum = 'kanka';
      sonuc = L("Artık köşende bir kardeşin var: dövüşlerinde IQ +1.");
      break;
    case 'ihanet': {
      p.durum = 'rakip';
      const o: Opponent = { ...p.o, rivalry: 2, stage: s.stage, sonDovus: Math.max(0, s.gecmis.length - 3), karsilasma: 0 };
      s.rakipler = [...s.rakipler.filter((r) => r.id !== o.id), o];
      sonuc = L("{0} artık rakibin. Bir gün kafeste karşılaşacaksınız.", [n]);
      s.haberler.unshift(L("💔 Eski antrenman ortağın {0} salondan ayrıldı ve sana meydan okudu.", [n]));
      break;
    }
  }
  p.bag = clamp(p.bag + bag, -100, 100);
  m.sonuc = sonuc + (bag ? ` (${L("Bağ")} ${bag > 0 ? '+' : ''}${bag})` : '');
  k.haftaLog = [...(k.haftaLog ?? []), `🤝 ${m.sonuc}`];
}

/** Karar anı kartını kapat. */
export function closePartnerMoment(s: GameState) {
  const k = s.pending.kamp;
  if (!k?.kankaAn?.sonuc) return;
  k.kankaAn = undefined;
  k.kankaBitti = true;
}

/** Kanka köşedeyse kamp sonunda dövüş etkisi. */
export function partnerCorner(s: GameState): string | null {
  const p = s.kanka;
  const k = s.pending.kamp;
  if (!p || !k || p.durum !== 'kanka') return null;
  add(k.mods, 'iq', 1);
  return L("🤝 {0} köşende: dövüşte IQ +1.", [name(p)]);
}

/** Spar günlüğünde ortak adı (kanka varsa çoğunlukla o). */
export const partnerSparName = (s: GameState) => (s.kanka && s.kanka.durum !== 'rakip' && chance(0.6) ? name(s.kanka) : null);

export const bagLabel = (b: number) => (b >= 60 ? L("Kardeş") : b >= 25 ? L("Yakın") : b > -15 ? L("Mesafeli") : b > -40 ? L("Gergin") : L("Düşman"));
