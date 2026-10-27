// UCC yolu: büyük organizasyonda UCC'ye giden basamaklar. Her basamak ilk geçildiğinde haber ve sosyal medya
// anı üretir; kariyer ekranındaki kart hedefi görünür kılar (orta oyun uzasa da oyuncu nereye gittiğini bilir).
import { L } from '../i18n';
import { currentOrg, fullName } from './character';
import { ORGS } from './data';
import { addPost } from './social';
import type { GameState } from './types';

/** Büyük organizasyonda yenilmezlik: en az 4 maçlık seri ve bu organizasyonda 3 galibiyet. */
export const unbeatenRun = (s: GameState) => s.seri >= 4 && s.gecmis.filter((h) => h.org === s.contract?.org && h.sonuc === 'G').length >= 3;

/** DWCS davetine hazır mı: şampiyonluk, ya da ilk 3'te popülerlik 20+, ya da ilk 5'te 2 maçlık seri, ya da ilk 8'de 3 maçlık seri, ya da yenilmez seri. */
export const dwcsReady = (s: GameState) => s.sampiyon || unbeatenRun(s) || (s.rank != null && ((s.rank <= 3 && s.populerlik >= 20) || (s.rank <= 5 && s.seri >= 2) || (s.rank <= 8 && s.seri >= 3)));

type Step = { id: string; ad: (s: GameState) => string; tamam: (s: GameState) => boolean; haber: (s: GameState) => string; yazar: string };

export const UCC_STEPS: Step[] = [
  {
    id: 'siralama',
    ad: (s) => L("{0} sıralamasına gir", [ORGS[currentOrg(s)].kisa]),
    tamam: (s) => s.rank != null || s.sampiyon,
    haber: (s) => L("📡 UCC izcisi seni izliyor: {0} sıralamasına giren {1}, Dean Wyatt'ın ekibinin raporlarına girdi.", [ORGS[currentOrg(s)].kisa, fullName(s.fighter)]),
    yazar: L("MMA Kulis"),
  },
  {
    id: 'ilk5',
    ad: () => L("İlk 5'e yüksel"),
    tamam: (s) => s.sampiyon || (s.rank != null && s.rank <= 5),
    haber: (s) => L("🗂️ Dean Wyatt'ın ekibi {0} adını kısa listeye yazdı. Birkaç büyük galibiyet daha ve telefon çalabilir.", [fullName(s.fighter)]),
    yazar: L("Kafes Analiz"),
  },
  {
    id: 'kapida',
    ad: () => L("DWCS'ye hazır ol: şampiyon ol, ya da ilk 3'te popülerlik 20+, ya da ilk 5'te 2 maçlık seri, ya da ilk 8'de 3 maçlık seri, ya da 4 maç yenilmeden git"),
    tamam: dwcsReady,
    haber: () => L("📞 Menajerin aradı: \"UCC ile görüşüyoruz. Sözleşme kapıda; bir iyi performans daha!\""),
    yazar: L("MMA Kulis"),
  },
];

/** Büyük organizasyonda yeni geçilen basamaklar: maç raporu satırları (haber ve sosyal medya da eklenir). */
export function uccMilestones(s: GameState): string[] {
  if (s.stage !== 'buyuk') return [];
  const done = new Set(s.uccYolu ?? []);
  const lines: string[] = [];
  for (const st of UCC_STEPS) {
    if (done.has(st.id) || !st.tamam(s)) continue;
    done.add(st.id);
    const h = st.haber(s);
    lines.push(h);
    s.haberler.unshift(h);
    addPost(s, { yazar: st.yazar, kullanici: st.yazar === L("MMA Kulis") ? '@mmakulis' : '@kafesanaliz', tur: 'medya', metin: h });
  }
  s.uccYolu = [...done];
  return lines;
}
