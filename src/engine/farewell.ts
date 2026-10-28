// Veda maçı: 35 yaşından sonra oyuncu son maçını ilan edebilir. Rakip kariyerin büyük rakiplerinden biri (varsa ezeli
// rakip), maç büyük maç sayılır, girişte spiker kariyeri anlatır. Sonuç ne olursa olsun maçtan sonra emeklilik gelir;
// hocanın son sözleri ve salonun uğurlaması emeklilik ekranında kalır.
import { L } from '../i18n';
import { currentOrg, fullName } from './character';
import { activeNemesis, nemesisOpponent } from './nemesis';
import { generateOpponent } from './opponents';
import { clamp } from './rng';
import { addPost } from './social';
import type { GameState, Opponent } from './types';

export interface Farewell {
  /** İlan edildiği andaki dövüş sayısı: veda maçı bundan sonraki ilk maç. */
  dovus: number;
  hafta: number;
  rakip?: string;
  sonuc?: 'G' | 'M' | 'B';
  yontem?: string;
}

const VEDA_YAS = 35;
const proFights = (s: GameState) => s.gecmis.filter((h) => h.org !== 'amator').length;

/** Ana ekranda "Veda maçını ilan et" görünür mü? */
export function canAnnounceFarewell(s: GameState) {
  if (s.phase !== 'hub' || s.veda || s.stage === 'amator' || s.meydanBitti) return false;
  if (s.fighter.yas < VEDA_YAS || proFights(s) < 8) return false;
  // Grand Prix sürüyorsa önce turnuva biter; dönüşün ilk maçı zaten başlı başına bir sahne.
  if (s.gp && !s.gp.bitti) return false;
  if (s.geriDonus && s.geriDonus.dovus === s.gecmis.length) return false;
  return !s.pending.rakip;
}

export const isFarewellFight = (s: GameState) => !!s.veda && !s.veda.sonuc && s.veda.dovus === s.gecmis.length;

export function announceFarewell(s: GameState) {
  if (!canAnnounceFarewell(s)) return;
  s.veda = { dovus: s.gecmis.length, hafta: s.hafta };
  s.populerlik = clamp(s.populerlik + 4, 0, 100);
  s.haberler.unshift(L("👋 {0} son maçını ilan etti: \"Bir kez daha kafese çıkacağım, sonra eldivenleri asacağım.\"", [fullName(s.fighter)]));
  addPost(s, { yazar: L("MMA Kulis"), kullanici: '@mmakulis', tur: 'medya', metin: L("🚨 SON DAKİKA: {0} veda maçının tarihini verdi. Bir devrin sonu yaklaşıyor.", [fullName(s.fighter)]) });
}

/** Veda maçının rakibi: süren ezeli rekabet, yoksa en çok çekişilen eski rakip, o da yoksa denk bir isim. */
export function farewellOpponent(s: GameState): Opponent {
  let o: Opponent;
  if (activeNemesis(s)) o = nemesisOpponent(s);
  else {
    o = generateOpponent(s, { zorluk: 0, org: currentOrg(s) });
    const eski = [...s.rakipler].filter((r) => r.rivalry >= 1).sort((a, b) => b.rivalry - a.rivalry)[0];
    if (eski) Object.assign(o, { id: eski.id, ad: eski.ad, soyad: eski.soyad, lakap: eski.lakap, uyruk: eski.uyruk, stil: eski.stil, kisilik: eski.kisilik, rivalry: eski.rivalry, karsilasma: eski.karsilasma, sonSonuc: eski.sonSonuc });
  }
  o.champion = false;
  o.etiket = L("👋 VEDA MAÇI");
  o.riskMetni = o.karsilasma
    ? L("Kariyerinin son maçı, tanıdık bir yüzle. Sonuç ne olursa olsun bu gece salon senin için ayakta.")
    : L("Kariyerinin son maçı. Sonuç ne olursa olsun bu gece salon senin için ayakta.");
  return o;
}

/** finishFight içinde, maç karneye işlendikten sonra çağrılır. */
export function farewellAfter(s: GameState, won: boolean, draw: boolean, yontem: string, rakip: string): string[] {
  const v = s.veda;
  if (!v || v.sonuc || v.dovus !== s.gecmis.length - 1) return [];
  v.sonuc = won ? 'G' : draw ? 'B' : 'M';
  v.yontem = yontem;
  v.rakip = rakip;
  s.populerlik = clamp(s.populerlik + (won ? 8 : 4), 0, 100);
  const ad = fullName(s.fighter);
  s.haberler.unshift(
    won
      ? L("👋 {0} kariyerini galibiyetle kapattı. Salon dakikalarca ayakta alkışladı.", [ad])
      : L("👋 {0} son maçında kaybetti ama salon onu ayakta uğurladı.", [ad]),
  );
  addPost(s, { yazar: L("Taraftar"), kullanici: '@kafestribunu', tur: 'taraftar', metin: L("Teşekkürler {0}. Her maçında ayağa kalktık, bu gece de kalktık. 👋❤️", [s.fighter.lakap || s.fighter.ad]) });
  return [won ? L("👋 VEDA GALİBİYETİ! Son maçını kazanarak bırakıyorsun. Popülerlik +8.") : L("👋 Son maç istediğin gibi bitmedi. Ama salon seni ayakta uğurladı. Popülerlik +4."), coachFarewell(s)];
}

/** Hocanın son sözleri (veda maçından sonra). */
export function coachFarewell(s: GameState) {
  const hoca = s.hoca?.ad ?? s.takim.antrenor;
  const v = s.veda;
  return v?.sonuc === 'G'
    ? L("🥋 {0}: \"Salona ilk girdiğin gün ellerin titriyordu. Bak şimdi… Seninle gurur duyuyorum evlat.\"", [hoca])
    : L("🥋 {0}: \"Bu gece kaybetmedin. Bu kariyer, bu salon, bu insanlar… hepsi senin zaferin.\"", [hoca]);
}

/** Veda maçı az önce oynandıysa röportajdan sonra emeklilik gelir (sonradan "son bir dans" dönüşü etkilenmez). */
export const farewellDone = (s: GameState) => !!s.veda?.sonuc && s.veda.dovus === s.gecmis.length - 1;
