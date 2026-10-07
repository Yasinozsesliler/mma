// İlk 10 dakika: yeni oyuncu ana ekranda kaybolmasın diye özellikler maç yaptıkça kademeli açılır ("YENİ" rozeti ve
// bir kerelik haber). "İlk adımlar" kartı oyuncuyu ödüllü beş adımla temel döngüye yönlendirir. Kariyerin ilerisinde
// (ya da profesyonelde) her şey zaten açıktır; eski kayıtlarda rozet/haber yağmuru olmaz.
import { L, LOC } from '../i18n';
import { addFollowers, fmtDelta, followers } from './fame';
import type { GameState } from './types';

export type Feature = 'hedef' | 'etkinlik' | 'album' | 'harita' | 'basarim' | 'gece' | 'salon' | 'vucut' | 'evim' | 'memleket' | 'muze' | 'tatil';

/** Özelliğin açıldığı toplam maç sayısı */
const AT: Record<Feature, number> = { hedef: 1, etkinlik: 1, album: 1, harita: 2, basarim: 2, gece: 3, salon: 4, vucut: 2, evim: 2, memleket: 3, muze: 3, tatil: 4 };
const NAMES: Record<Feature, () => string> = {
  hedef: () => L("Kariyer hedefleri"),
  etkinlik: () => L("Haftalık etkinlik"),
  album: () => L("Kart Albümü"),
  harita: () => L("Dünya turu"),
  basarim: () => L("Başarımlar"),
  gece: () => L("Gece hayatı"),
  salon: () => L("Salonum"),
  vucut: () => L("Vücudum"),
  evim: () => L("Evim"),
  memleket: () => L("Memleketim"),
  muze: () => L("Hatıralar"),
  tatil: () => L("Tatil"),
};
/** Bu maç sayısından sonra rozet gösterilmez (eski kariyerler) */
const EARLY = 12;

export const featureOpen = (s: GameState, f: Feature) => s.stage !== 'amator' || s.gecmis.length >= AT[f];
export const isNewFeature = (s: GameState, f: Feature) => featureOpen(s, f) && s.gecmis.length <= EARLY && !(s.acilanlar ?? []).includes(f);
export function seeFeature(s: GameState, f: Feature) {
  if (!(s.acilanlar ?? []).includes(f)) s.acilanlar = [...(s.acilanlar ?? []), f];
}

/** Maç sonrası: yeni açılan özellikleri bir kez haber olarak duyur. */
export function announceUnlocks(s: GameState) {
  if (s.gecmis.length > EARLY) return;
  (Object.keys(AT) as Feature[]).forEach((f) => {
    if (featureOpen(s, f) && !(s.duyurulan ?? []).includes(f)) {
      s.duyurulan = [...(s.duyurulan ?? []), f];
      s.haberler.unshift(L("🔓 Yeni açıldı: {0}", [NAMES[f]()]));
    }
  });
}

export interface FirstStep {
  id: string;
  ad: () => string;
  ipucu: () => string;
  ok: (s: GameState) => boolean;
  odul: number;
}

export const FIRST_STEPS: FirstStep[] = [
  { id: 'mac', ad: () => L("İlk maçına çık"), ipucu: () => L("\"Dövüş ayarla\" ile rakibini seç."), ok: (s) => s.gecmis.length >= 1, odul: 300 },
  { id: 'puan', ad: () => L("Gelişim puanı harca"), ipucu: () => L("\"Gelişim\" sekmesinde bir istatistiği yükselt."), ok: (s) => (s.harcanan ?? 0) >= 1, odul: 200 },
  { id: 'magaza', ad: () => L("Mağazadan bir şey al"), ipucu: () => L("Ekipman maçta küçük avantaj sağlar."), ok: (s) => s.envanter.length >= 1, odul: 250 },
  { id: 'sosyal', ad: () => L("Sosyal medyada paylaş"), ipucu: () => L("Takipçi para ve sponsor getirir."), ok: (s) => (s.sosyal ?? []).some((p) => p.tur === 'oyuncu'), odul: 150 },
  { id: 'pro', ad: () => L("Profesyonel ol"), ipucu: () => L("Amatörde 3 galibiyet al, teklifler gelsin."), ok: (s) => s.stage !== 'amator', odul: 1000 },
];

export const showFirstSteps = (s: GameState) => s.gecmis.length <= EARLY && (s.ilkAdim ?? []).length < FIRST_STEPS.length;
export const stepClaimable = (s: GameState, st: FirstStep) => st.ok(s) && !(s.ilkAdim ?? []).includes(st.id);

export function claimStep(s: GameState, id: string): string {
  const st = FIRST_STEPS.find((x) => x.id === id);
  if (!st || !stepClaimable(s, st)) return '';
  s.ilkAdim = [...(s.ilkAdim ?? []), id];
  s.para += st.odul;
  const d = addFollowers(s, Math.max(50, followers(s) * 0.02));
  const m = L("✅ {0}: +${1}, {2} takipçi.", [st.ad(), st.odul.toLocaleString(LOC), fmtDelta(d)]);
  s.haberler.unshift(m);
  return m;
}
