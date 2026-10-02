// Zorluk seviyeleri ve meydan okuma modları. Zorluk: rakip gücü, ücret ve sakatlık riski.
// Meydan okuma: özel kurallı kariyer; her dövüşten sonra hedef ve başarısızlık koşulu kontrol edilir.
import { L } from '../i18n';
import type { Background, GameState } from './types';

export type Difficulty = 'kolay' | 'normal' | 'efsane';

export const DIFFICULTIES: Record<Difficulty, { ad: () => string; aciklama: () => string; rakip: number; ucret: number; sakatlik: number }> = {
  kolay: { ad: () => L("Kolay"), aciklama: () => L("Rakipler biraz zayıf, ücretler %20 fazla, sakatlık nadir."), rakip: -4, ucret: 1.2, sakatlik: 0.7 },
  normal: { ad: () => L("Normal"), aciklama: () => L("Oyunun dengeli hâli."), rakip: 0, ucret: 1, sakatlik: 1 },
  efsane: { ad: () => L("Efsane"), aciklama: () => L("Rakipler güçlü, ücretler %20 az, sakatlıklar sık. Gerçek bir sınav."), rakip: 4, ucret: 0.8, sakatlik: 1.4 },
};

export const diffOf = (s: GameState) => DIFFICULTIES[s.zorluk ?? 'normal'];

export type ChallengeId = 'sonsans' | 'sokak' | 'demir' | 'yenilmez' | 'hizli';

export interface Challenge {
  id: ChallengeId;
  durum: 'devam' | 'basarili' | 'basarisiz';
}

export const CHALLENGES: Record<ChallengeId, { ad: () => string; aciklama: () => string; icon: string; yas?: number; gecmis?: Background }> = {
  sonsans: { ad: () => L("Son Şans"), aciklama: () => L("35 yaşında başla. Emekli olmadan bir kemer kazan."), icon: 'timer-sand', yas: 35 },
  sokak: { ad: () => L("Sokaktan Zirveye"), aciklama: () => L("Sokak dövüşçüsü olarak başla. 25 profesyonel maç içinde UCC'ye gir."), icon: 'road-variant', gecmis: 'sokak' },
  demir: { ad: () => L("Demir Adam"), aciklama: () => L("İlk nakavt yenilgin kariyerini bitirir. UCC şampiyonu ol."), icon: 'shield-alert' },
  yenilmez: { ad: () => L("Yenilmez"), aciklama: () => L("İlk profesyonel mağlubiyet kariyerini bitirir. 7-0'a ulaş."), icon: 'infinity' },
  hizli: { ad: () => L("Hızlı Yükseliş"), aciklama: () => L("Toplam 40 maç içinde UCC şampiyonu ol."), icon: 'rocket-launch' },
};

const proFights = (s: GameState) => s.rekor.g + s.rekor.m + s.rekor.b;
const total = (s: GameState) => proFights(s) + s.amator.g + s.amator.m + s.amator.b;
const uccChamp = (s: GameState) => (s.kemerler ?? []).some((b) => b.org === 'ufc');

/** Dövüş sonrası meydan okuma kontrolü. Kariyeri bitiren başarısızlıklarda emeklilik. */
export function challengeCheck(s: GameState, won: boolean, koLoss: boolean): string[] {
  const m = s.meydan;
  if (!m || m.durum !== 'devam') return [];
  const ad = CHALLENGES[m.id].ad();
  let ok = false;
  let fail = false;
  let biter = false;
  switch (m.id) {
    case 'sonsans':
      ok = (s.kemerler ?? []).length > 0;
      break;
    case 'sokak':
      ok = s.stage === 'ufc';
      fail = !ok && proFights(s) >= 25;
      break;
    case 'demir':
      ok = uccChamp(s);
      fail = koLoss;
      biter = koLoss;
      break;
    case 'yenilmez':
      ok = s.rekor.g >= 7 && s.rekor.m === 0;
      fail = s.rekor.m > 0;
      biter = fail;
      break;
    case 'hizli':
      ok = uccChamp(s);
      fail = !ok && total(s) >= 40;
      break;
  }
  if (ok) {
    m.durum = 'basarili';
    s.haberler.unshift(L("🏅 MEYDAN OKUMA TAMAMLANDI: {0}!", [ad]));
    return [L("🏅 MEYDAN OKUMA TAMAMLANDI: {0}! Ana menüde rozetin parlıyor.", [ad])];
  }
  if (fail) {
    m.durum = 'basarisiz';
    s.haberler.unshift(L("💔 Meydan okuma başarısız: {0}.", [ad]));
    if (biter) s.meydanBitti = true;
    return [biter ? L("💔 {0} sona erdi: kural bozuldu, kariyer burada bitiyor.", [ad]) : L("💔 Meydan okuma başarısız: {0}. Kariyerine normal devam edebilirsin.", [ad])];
  }
  return [];
}

/** Yaş sınırına gelindiyse "Son Şans" kaybedilir (emeklilikte çağrılır). */
export function challengeOnRetire(s: GameState) {
  const m = s.meydan;
  if (m && m.durum === 'devam') m.durum = 'basarisiz';
}
