// Canlı yayın: iki dövüş arasında bir kez. 5 an (soru, bağış meydan okuması, trol, sponsor, antrenman);
// her cevap izleyiciyi ve bağışları etkiler, sert sözler kriz başlatabilir. Sonunda bağış parası ve takipçi.
import { L, LOC } from '../i18n';
import { forceCrisis, type CrisisType } from './crisis';
import { addFollowers, fmtDelta, followers } from './fame';
import { chance, clamp, pick, rand, randInt, shuffle } from './rng';
import { addTechXp, randomKnown } from './techniques';
import type { GameState } from './types';

type Option = { metin: () => string; izleyici: [number, number]; bagis?: number; risk?: number; kriz?: CrisisType; saglik?: number; teknik?: boolean; sohbet: () => string };
type Moment = { id: string; soru: (s: GameState) => string; secenekler: Option[]; kosul?: (s: GameState) => boolean };

export interface Stream {
  anlar: string[];
  idx: number;
  izleyici: number;
  zirve: number;
  bagis: number;
  sohbet: string[];
  bitti?: boolean;
  ozet?: string;
}

export const STREAM_MIN_FOLLOWERS = 5_000;
export const canStream = (s: GameState) => s.stage !== 'amator' && followers(s) >= STREAM_MIN_FOLLOWERS && (s.yayinSon ?? -1) < s.gecmis.length;

const MOMENTS: Moment[] = [
  {
    id: 'soru',
    soru: (s) => L("Sohbetten soru: “{0} hakkında ne düşünüyorsun?”", [s.bolum?.liste[0] ? `${s.bolum.liste[0].ad} ${s.bolum.liste[0].soyad}` : L("sıkletin bir numarası")]),
    secenekler: [
      { metin: () => L("Saygılı bir cevap ver"), izleyici: [-5, 10], sohbet: () => L("klas adam 👏") },
      { metin: () => L("Laf sok"), izleyici: [25, 60], risk: 0.2, kriz: 'taraftarBaskini', sohbet: () => L("OHHHH 🔥🔥🔥") },
      { metin: () => L("Espriyle geç"), izleyici: [10, 30], sohbet: () => L("hahahaha efsane 😂") },
    ],
  },
  {
    id: 'bagis',
    soru: () => L("💸 $500 bağış geldi: “Canlı yayında 50 şınav çek!”"),
    secenekler: [
      { metin: () => L("Hemen şınavlara başla"), izleyici: [20, 45], bagis: 500, saglik: -1, sohbet: () => L("MAKİNE 💪") },
      { metin: () => L("Teşekkür et, geç"), izleyici: [-10, 5], bagis: 500, sohbet: () => L("ya bi şınav çekseydin 😒") },
    ],
  },
  {
    id: 'trol',
    soru: () => L("Bir trol yazdı: “Sen bir sahtekarsın, şanslı yumruklarla kazanıyorsun.”"),
    secenekler: [
      { metin: () => L("Banla"), izleyici: [-5, 5], sohbet: () => L("ban hak etti 👍") },
      { metin: () => L("Ağır cevap ver"), izleyici: [20, 50], risk: 0.25, kriz: 'kesilmisVideo', sohbet: () => L("HAHAHA yok artık 💀") },
      { metin: () => L("Görmezden gel"), izleyici: [-10, 5], sohbet: () => L("trolü beslemedi, akıllı") },
    ],
  },
  {
    id: 'sponsor',
    kosul: (s) => (s.sponsorlar ?? []).length > 0 || !!s.marka,
    soru: (s) => L("Menajerin mesaj attı: “Şimdi {0} ürününü göster, anlaşmada var.”", [s.marka?.ad ?? L("sponsorun")]),
    secenekler: [
      { metin: () => L("Ürünü tanıt"), izleyici: [-25, -5], bagis: 1500, sohbet: () => L("reklam arası 😴") },
      { metin: () => L("Kısa ve doğal geç"), izleyici: [-5, 5], bagis: 600, sohbet: () => L("tamam tamam alırız 😄") },
    ],
  },
  {
    id: 'teknik',
    soru: (s) => L("{0} yayına katıldı: “Bir teknik gösterelim mi?”", [s.takim.antrenor]),
    secenekler: [
      { metin: () => L("Teknik dersi yap"), izleyici: [15, 35], teknik: true, sohbet: () => L("not alıyorum ✍️") },
      { metin: () => L("Sparring yap"), izleyici: [30, 60], saglik: -2, sohbet: () => L("SERT SERT 🥊") },
    ],
  },
  {
    id: 'hayran',
    soru: () => L("Küçük bir hayranın annesi yazdı: “Oğlum seni idol alıyor, ona bir şey söyler misin?”"),
    secenekler: [
      { metin: () => L("Ona özel bir mesaj gönder"), izleyici: [20, 40], sohbet: () => L("ağladım 🥹") },
      { metin: () => L("Kısa bir selam ver"), izleyici: [0, 10], sohbet: () => L("tatlıııı") },
    ],
  },
];

const CHAT = [L("selam kral 👋"), L("ne zaman maç var?"), L("🔥🔥🔥"), L("kemer geliyor"), L("bu adam efsane"), L("Türkiye'den selamlar"), L("GG"), L("rakibini yer bitirir"), L("hocam şınav rekorun kaç")];

export function startStream(s: GameState) {
  if (!canStream(s)) return;
  const pool = MOMENTS.filter((m) => !m.kosul || m.kosul(s));
  const anlar = shuffle(pool).slice(0, 5).map((m) => m.id);
  const base = Math.round(Math.pow(followers(s), 0.6) * (0.5 + s.populerlik / 100));
  s.yayin = { anlar, idx: 0, izleyici: base, zirve: base, bagis: 0, sohbet: shuffle(CHAT).slice(0, 3) };
  s.yayinSon = s.gecmis.length;
  s.phase = 'yayin';
}

export const currentMoment = (s: GameState) => (s.yayin && !s.yayin.bitti ? MOMENTS.find((m) => m.id === s.yayin!.anlar[s.yayin!.idx]) : undefined);

export function streamChoice(s: GameState, i: number) {
  const y = s.yayin;
  const m = currentMoment(s);
  const o = m?.secenekler[i];
  if (!y || !m || !o) return;
  const pctChange = randInt(o.izleyici[0], o.izleyici[1]) / 100;
  y.izleyici = Math.max(10, Math.round(y.izleyici * (1 + pctChange)));
  y.zirve = Math.max(y.zirve, y.izleyici);
  // İzleyici çoksa bağış da yağar
  y.bagis += (o.bagis ?? 0) + Math.round(y.izleyici * (0.02 + rand() * 0.03));
  if (o.saglik) s.saglik = clamp(s.saglik + o.saglik, 5, 100);
  if (o.teknik) {
    const t = randomKnown(s);
    if (t) addTechXp(s, t.id, 1);
  }
  y.sohbet = [o.sohbet(), pick(CHAT), ...y.sohbet].slice(0, 6);
  if (o.risk && o.kriz && chance(o.risk) && forceCrisis(s, o.kriz)) y.sohbet = [L("🚨 klip çoktan yayıldı…"), ...y.sohbet].slice(0, 6);
  y.idx++;
  if (y.idx >= y.anlar.length) endStream(s);
}

function endStream(s: GameState) {
  const y = s.yayin!;
  y.bitti = true;
  s.para += y.bagis;
  const d = addFollowers(s, y.zirve * 0.5);
  y.ozet = L("Yayın bitti. Zirve {0} izleyici, bağışlar ${1}, {2} yeni takipçi.", [y.zirve.toLocaleString(LOC), y.bagis.toLocaleString(LOC), fmtDelta(d)]);
  s.haberler.unshift(`🔴 ${y.ozet}`);
}

export function closeStream(s: GameState) {
  s.yayin = undefined;
  s.phase = 'hub';
}
