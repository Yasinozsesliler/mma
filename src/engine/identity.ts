// Dövüş kimliği: seçilmez, nasıl dövüştüğünden doğar. Küçük bir avantaj verir; medya ve rakipler buna göre konuşur.
import { L, LOC } from '../i18n';
import { addPost } from './social';
import { chance, pick } from './rng';
import type { FightState, GameState, Opponent } from './types';

export type KimlikId = 'nakavtci' | 'bogucu' | 'taktisyen' | 'sovmen';
const IDS: KimlikId[] = ['nakavtci', 'bogucu', 'taktisyen', 'sovmen'];

export interface Kimlik {
  puan: Record<KimlikId, number>;
  id?: KimlikId;
  degisim?: number;
}

export const KIMLIK: Record<KimlikId, { ad: () => string; aciklama: () => string; ikon: string }> = {
  nakavtci: { ad: () => L("Nakavtçı"), aciklama: () => L("Yumruğun konuşuyor. Sert vuruşların rakibi daha sık sarsar."), ikon: '💥' },
  bogucu: { ad: () => L("Boğucu Güreşçi"), aciklama: () => L("Yere inen kalkamıyor. Yerde kilit fırsatın daha sık gelir."), ikon: '🐍' },
  taktisyen: { ad: () => L("Taktisyen"), aciklama: () => L("Aklınla dövüşüyorsun. Rakip seni daha geç okur, köşen zaafları daha çabuk bulur."), ikon: '🧠' },
  sovmen: { ad: () => L("Şovmen"), aciklama: () => L("Salonu ayağa kaldırıyorsun. Galibiyetler daha çok popülerlik getirir."), ikon: '🎭' },
};

const ESIK = 8;
const MIN_MAC = 6;
const fightsOf = (s: GameState) => s.gecmis.length;

/** Maç sonu: puanları işler, kimlik doğarsa ya da değişirse satır döner. */
export function identityAfterFight(s: GameState, fs: FightState, won: boolean, yontem: string): string[] {
  const k: Kimlik = (s.kimlik ??= { puan: { nakavtci: 0, bogucu: 0, taktisyen: 0, sovmen: 0 } });
  IDS.forEach((id) => (k.puan[id] *= 0.96));
  const h = fs.oyuncuTaktikGecmisi ?? [];
  const pay = (...t: string[]) => (h.length ? h.filter((x) => t.includes(x)).length / h.length : 0);
  if ((fs.sov ?? 0) > 0) k.puan.sovmen += 3 * (fs.sov ?? 0);
  if (s.trashTalk) k.puan.sovmen += 1.5;
  if (won) {
    if (yontem === 'KO' || yontem === 'TKO') k.puan.nakavtci += 2.5;
    if (yontem === 'SUB') k.puan.bogucu += 3;
    if (pay('takedown', 'clinch') >= 0.5) k.puan.bogucu += 1.5;
    if (pay('baski') >= 0.5) k.puan.nakavtci += 0.5;
    if (pay('kontra', 'mesafe') >= 0.5) k.puan.taktisyen += 2;
    if (yontem === 'UD' || yontem === 'SD' || yontem === 'MD') k.puan.taktisyen += 1.5;
    if (fs.opp.champion || fs.anaMac) k.puan.sovmen += 1;
  }
  if (fightsOf(s) < MIN_MAC) return [];
  const sirali = [...IDS].sort((a, b) => k.puan[b] - k.puan[a]);
  const lider = sirali[0];
  const fark = k.puan[lider] >= k.puan[sirali[1]] * 1.25;
  if (k.puan[lider] < ESIK || !fark || k.id === lider) return [];
  // Kimlik bir kez oluştuktan sonra kolay değişmez.
  if (k.id && (k.puan[lider] < k.puan[k.id] * 1.5 || fightsOf(s) - (k.degisim ?? 0) < 5)) return [];
  const yeni = !k.id;
  k.id = lider;
  k.degisim = fightsOf(s);
  const d = KIMLIK[lider];
  const msg = yeni ? L("{0} Dövüş kimliğin oluştu: {1}! {2}", [d.ikon, d.ad(), d.aciklama()]) : L("{0} Kimliğin değişti: artık bir {1}. {2}", [d.ikon, d.ad().toLocaleLowerCase(LOC), d.aciklama()]);
  s.haberler.unshift(msg);
  addPost(s, { yazar: L("Kafes Postası"), kullanici: '@kafespostasi', tur: 'hikaye', metin: L("{0} için herkes aynı şeyi söylüyor: {1}.", [`${s.fighter.ad} ${s.fighter.soyad}`, d.ad().toLocaleLowerCase(LOC)]), renk: '#b388ff' });
  return [msg];
}

/** Rakip kampı oyuncunun kimliğini konuşur (haberlere düşer, oyunu değiştirmez). */
export function identityRivalNews(s: GameState, o: Opponent) {
  const id = s.kimlik?.id;
  if (!id || !chance(0.35)) return;
  const metin = {
    nakavtci: [L("🗞️ {0}: \"Sert vurduğunu biliyorum. Çenemi çalıştırdım.\"", [o.soyad]), L("🗞️ {0} kampında tek konu: nakavtçıya karşı nasıl ayakta kalınır?", [o.soyad])],
    bogucu: [L("🗞️ {0} bütün kampı güreş savunmasıyla geçirdi: \"Beni yere indiremeyecek.\"", [o.soyad]), L("🗞️ {0}: \"Herkes yerde boğuluyor, ben boğulmayacağım.\"", [o.soyad])],
    taktisyen: [L("🗞️ {0}: \"Çok düşünüyor. Ona düşünecek vakit bırakmayacağım.\"", [o.soyad]), L("🗞️ {0} kampı senin maçlarını kare kare izliyor.", [o.soyad])],
    sovmen: [L("🗞️ {0}: \"Kafes sirk değil. Şovunu bitireceğim.\"", [o.soyad]), L("🗞️ {0} basına konuştu: \"Bu kadar gösteriş yeter.\"", [o.soyad])],
  }[id];
  s.haberler.unshift(pick(metin));
}

export const kimlikOf = (s: GameState) => s.kimlik?.id;
