// Kariyer kararları zinciri: profesyonelde yaklaşık iki yılda bir büyük bir yol ayrımı gelir (yurt dışındaki elit
// bir salona taşınmak, memlekete dönmek, büyük bir ajansla imzalamak, kötü adam imajı, aileye ara vermek, boks
// kapısını aralamak). Seçim kariyerine bir "dönem" adı verir; dönemler Kafespedia'da ve belgeselde görünür.
import { L, LOC } from '../i18n';
import { advanceWeeks } from './character';
import { AGENTS } from './data';
import { addFollowers, followers } from './fame';
import { gymsFor } from './gyms';
import { clamp, pick, shuffle } from './rng';
import { applyGym } from './team';
import type { GameEventState, GameState } from './types';

export type EraId = 'tasin' | 'memleket' | 'ajans' | 'kotu' | 'aile' | 'boks';
export interface Era {
  id: EraId;
  ad: string;
  yas: number;
  hafta: number;
}

const ARALIK = 100;

const ERAS: Record<EraId, { ad: () => string; secenek: (s: GameState) => string; uygun: (s: GameState) => boolean; uygula: (s: GameState) => string }> = {
  tasin: {
    ad: () => L("Yurt dışı yılları"),
    secenek: () => L("Dünyanın en iyi salonlarından birine taşın"),
    uygun: (s) => gymsFor('elit').some((g) => g.kalite > s.takim.antrenorKalite && g.id !== s.takim.salonId),
    uygula: (s) => {
      const gym = pick(gymsFor('elit').filter((g) => g.kalite > s.takim.antrenorKalite && g.id !== s.takim.salonId));
      const cost = Math.round(gym.imza / 3);
      s.para -= cost;
      applyGym(s, gym);
      s.motivasyon = clamp(s.motivasyon - 1, -2, 2);
      return L("Valizlerini topladın: yeni evin {0}, yeni hocan {1} (kalite {2}/10). Taşınma masrafı ${3}. Yabancı bir şehirde ilk haftalar zor geçecek (motivasyon -1).", [gym.salon, gym.antrenor, gym.kalite, cost.toLocaleString(LOC)]);
    },
  },
  memleket: {
    ad: () => L("Eve dönüş"),
    secenek: () => L("Memleketine dön, köklerine yakın çalış"),
    uygun: (s) => !!s.fighter.memleket,
    uygula: (s) => {
      s.motivasyon = 2;
      s.populerlik = clamp(s.populerlik + 4, 0, 100);
      return L("{0} seni bayramla karşıladı. Eski salonun kapısına adın yazıldı. Motivasyon tavan, popülerlik +4.", [s.fighter.memleket || L("Memleketin")]);
    },
  },
  ajans: {
    ad: () => L("Büyük ajans dönemi"),
    secenek: () => L("Dünyanın en büyük menajerlik ajansıyla imzala"),
    uygun: (s) => s.stage === 'buyuk' || s.stage === 'ufc',
    uygula: (s) => {
      const a = [...AGENTS].sort((x, y) => y.kalite - x.kalite)[0];
      s.takim.menajer = a.ad;
      s.takim.menajerKalite = a.kalite;
      s.takim.menajerPay = Math.max(a.pay, 0.18);
      const t = addFollowers(s, Math.max(2_000, followers(s) * 0.08));
      s.populerlik = clamp(s.populerlik + 3, 0, 100);
      return L("{0} artık senin menajerin. Komisyon yüksek (%{1}) ama kapılar ardına kadar açık. Popülerlik +3, +{2} takipçi.", [a.ad, Math.round(s.takim.menajerPay * 100), Math.round(t).toLocaleString(LOC)]);
    },
  },
  kotu: {
    ad: () => L("Kötü adam dönemi"),
    secenek: () => L("İmajını değiştir: herkesin sevmekten nefret ettiği adam ol"),
    uygun: () => true,
    uygula: (s) => {
      s.populerlik = clamp(s.populerlik + 6, 0, 100);
      const t = addFollowers(s, Math.max(3_000, followers(s) * 0.12));
      if (s.hoca) s.hoca.bag = clamp(s.hoca.bag - 10, 0, 100);
      return L("Siyah takım elbise, kibirli bakışlar, her röportajda bir bomba. Tribünler seni yuhalıyor ama herkes izliyor. Popülerlik +6, +{0} takipçi; hocan pek memnun değil.", [Math.round(t).toLocaleString(LOC)]);
    },
  },
  aile: {
    ad: () => L("Sessiz yıllar"),
    secenek: () => L("Üç ay ara ver, ailene ve kendine zaman ayır"),
    uygun: () => true,
    uygula: (s) => {
      const notes = advanceWeeks(s, 12);
      s.saglik = 100;
      s.beyin = Math.max(0, (s.beyin ?? 0) - 3);
      s.motivasyon = 2;
      s.populerlik = clamp(s.populerlik - 3, 0, 100);
      return L("Telefonu kapattın, üç ay boyunca sadece yaşadın. Vücudun ve kafan yenilendi (sağlık 100, motivasyon tavan) ama gündemden düştün (popülerlik -3). {0}", [notes.join(' ')]).trim();
    },
  },
  boks: {
    ad: () => L("Boks macerası"),
    secenek: () => L("Boks dünyasına kapıyı arala, süper maç kovala"),
    uygun: (s) => (s.stage === 'buyuk' || s.stage === 'ufc') && !s.boksYapildi && !s.boksTeklif && !s.boks,
    uygula: (s) => {
      s.populerlik = clamp(s.populerlik + 3, 0, 100);
      s.boksKapi = true;
      return L("Boks salonlarında görünmeye başladın, menajerin telefonları açtı. Bir süper maç teklifi gelmesi an meselesi (popülerlik +3).");
    },
  },
};

const DONEM_ACILIS = () => L("Kariyerinin bir yol ayrımındasın. Önümüzdeki yıllar nasıl geçecek?");

/** Zamanı geldiyse yol ayrımı olayı. */
export function eraDecision(s: GameState): GameEventState | null {
  if (s.stage === 'amator' || s.gecmis.length < 8) return null;
  const son = s.donemSon ?? (s.donemler?.length ? s.donemler[s.donemler.length - 1].hafta : 0);
  if (s.hafta - son < ARALIK) return null;
  const used = new Set((s.donemler ?? []).map((d) => d.id));
  const ids = shuffle((Object.keys(ERAS) as EraId[]).filter((id) => !used.has(id) && ERAS[id].uygun(s))).slice(0, 3);
  if (ids.length < 2) return null;
  return {
    id: `donem:${ids.join(',')}`,
    baslik: L("🧭 Yol Ayrımı"),
    metin: L("{0} yaşındasın. {1}", [s.fighter.yas, DONEM_ACILIS()]),
    secenekler: [...ids.map((id) => ERAS[id].secenek(s)), L("Her şey yolunda, devam")],
    params: {},
  };
}

export function chooseEra(s: GameState, idx: number): string {
  const ids = s.pending.olay!.id.split(':')[1].split(',') as EraId[];
  s.donemSon = s.hafta;
  const id = ids[idx];
  if (!id) return L("Hiçbir şeyi değiştirmedin. Bazen en iyi karar, yola devam etmektir.");
  const sonuc = ERAS[id].uygula(s);
  s.donemler = [...(s.donemler ?? []), { id, ad: ERAS[id].ad(), yas: s.fighter.yas, hafta: s.hafta }];
  s.haberler.unshift(L("🧭 {0} için yeni bir dönem: {1}", [s.fighter.soyad, ERAS[id].ad()]));
  return sonuc;
}
