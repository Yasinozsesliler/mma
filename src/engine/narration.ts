// Şablon anlatımlar. {p} = oyuncu, {o} = rakip, {sub} = submission adı.
// İsimler hep yalın halde kullanılır, çünkü Türkçe ek uyumu isimden isime değişir.
import { L } from '../i18n';
import { fill, pick } from './rng';
import type { Tactic } from './types';

type Side = 'p' | 'o';

const STRIKE: Record<Exclude<Tactic, 'takedown'>, string[]> = {
  baski: [
    L("{A} rakibini kafese dayıyor ve sol-sağ-sol hook serisini boşaltıyor!"),
    L("{A} ileri yürüyor, gövdeye gömülen bir hook ile rakibinin nefesini kesiyor."),
    L("{A} durmadan bastırıyor; ağır bir sağ el yüze temiz iniyor!"),
    L("{A} rakibini köşeye sıkıştırıp dirsekle tamamlanan bir kombinasyon bağlıyor."),
  ],
  kontra: [
    L("{B} saldırıya geliyor ama {A} tam zamanında bir kontra sağ krosla karşılıyor!"),
    L("{A} geri adım atıyor, rakip boşluğa düşüyor ve kısa bir sol hook yiyor."),
    L("{A} sabırla bekliyor… ve {B} içeri girdiği anda sert bir kontra patlıyor!"),
  ],
  mesafe: [
    L("{A} jab ile mesafeyi yönetiyor, rakibin yüzü kızarmaya başladı."),
    L("{A} dışarıdan sert bir low kick yapıştırıp çıkıyor. Ön bacak zorlanıyor."),
    L("{A} açıdan çıkıp jab-kros ile puan topluyor, rakibi boşa savuruyor."),
    L("{A} uzun bir ön tekme ile rakibin atağını durduruyor."),
  ],
  clinch: [
    L("{A} clinch’te ense kontrolü aldı, dizler gövdeye art arda iniyor!"),
    L("{A} clinch’ten çıkarken kısa bir dirsek savuruyor, kaşın üstüne değdi!"),
    L("{A} rakibini kafese yaslayıp kirli boksla yıpratıyor."),
  ],
};

const TD_OK = [
  L("{A} seviye değiştirip çift bacak dalıyor… ve rakibini yere çarpıyor!"),
  L("{A} clinch’ten kalça atarak rakibini yere savuruyor. Temiz fırlatma!"),
  L("{A} tek bacağı yakaladı, kafese yaslayıp rakibini yere indirdi."),
];
const TD_FAIL = [
  L("{A} takedown’a dalıyor ama {B} sprawl ile savunuyor ve ayağa dönüyor."),
  L("{A} bacağa gidiyor, {B} kafese yaslanıp dengesini koruyor. Boşa enerji."),
  L("{A} dalış yaptı ama {B} diz kaldırarak girişi cezalandırdı!"),
];
const GROUND = [
  L("{A} üstte ağır basıyor, ground and pound ile rakibini hırpalıyor."),
  L("{A} half guard’dan geçip yan kontrole kuruldu, dirsekler iniyor."),
  L("{A} mount’a çıktı! Seyirci ayağa kalkıyor."),
  L("{A} sırtı aldı, iki kanca içeride. Tehlike büyük!"),
];
const EXCHANGE_EVEN = [
  L("İki dövüşçü ortada karşılıklı vuruşuyor, net bir üstünlük yok."),
  L("Temkinli bir bölüm; ikisi de fint atıyor, kimse ilk hatayı yapmak istemiyor."),
];

export function strikeLine(att: Side, tactic: Tactic, names: Record<Side, string>) {
  const t: Exclude<Tactic, 'takedown'> = tactic === 'takedown' ? 'baski' : tactic;
  const def: Side = att === 'p' ? 'o' : 'p';
  return fill(pick(STRIKE[t]), { A: names[att], B: names[def] });
}
// ---------- Dövüş sporları ligi anlatımı (taktik izleme) ----------
const BOKS_STRIKE: Partial<Record<Tactic, string[]>> = {
  baski: [
    L("{A} rakibini iplere dayıyor ve sol-sağ-sol hook serisini boşaltıyor!"),
    L("{A} ileri yürüyor, gövdeye gömülen bir hook ile rakibinin nefesini kesiyor."),
    L("{A} köşeye sıkıştırdı; ağır bir sağ el yüze temiz iniyor!"),
    L("{A} içeri girip aparkatla başlayan bir kombinasyon bağlıyor."),
  ],
  kontra: [
    L("{B} saldırıya geliyor ama {A} tam zamanında bir kontra sağ krosla karşılıyor!"),
    L("{A} başını eğip sıyrılıyor, rakip boşluğa düşüyor ve kısa bir sol hook yiyor."),
    L("{A} sabırla bekliyor… ve {B} içeri girdiği anda sert bir kontra patlıyor!"),
  ],
  mesafe: [
    L("{A} jab ile mesafeyi yönetiyor, rakibin yüzü kızarmaya başladı."),
    L("{A} ringin ortasında dönüp jab-kros ile puan topluyor."),
    L("{A} ayak oyunuyla açı alıp çift jab yapıştırıyor ve çıkıyor."),
    L("{A} uzun jabıyla rakibin atağını daha başlamadan kesiyor."),
  ],
};
const MT_STRIKE: Partial<Record<Tactic, string[]>> = {
  baski: [
    L("{A} ileri yürüyor; yumruk serisini sert bir orta tekmeyle bağlıyor!"),
    L("{A} rakibini iplere dayayıp dirsekle tamamlanan bir kombinasyon indiriyor."),
    L("{A} gövdeye tekme, kafaya kros: zincir hiç durmuyor!"),
  ],
  kontra: [
    L("{A} gelen tekmeyi yakaladı ve kontra kros patlattı!"),
    L("{B} tekmeye gidiyor ama {A} bloklayıp sert bir low kick ile cevap veriyor."),
    L("{A} geri adım atıyor, rakip boşluğa düşüyor ve dirsek yiyor."),
  ],
  mesafe: [
    L("{A} dışarıdan sert bir low kick yapıştırıp çıkıyor. Ön bacak zorlanıyor."),
    L("{A} teep ile mesafeyi koruyor, rakip içeri giremiyor."),
    L("{A} uzun bir orta tekmeyle puan topluyor; gövde ses verdi."),
    L("{A} yüksek tekme fırlattı, gard son anda kalktı!"),
  ],
  clinch: [
    L("{A} plum klinç aldı, dizler gövdeye art arda iniyor!"),
    L("{A} klinçten çıkarken kısa bir dirsek savuruyor, kaşın üstüne değdi!"),
    L("{A} ensesinden çekip dizi yüze gönderdi!"),
  ],
};
/** Ligde vuruş anlatımı: boks ve Muay Thai'ye özel cümleler (MMA'da STRIKE) */
export function sportStrikeLine(kural: import('./sportRules').Sport | undefined, att: Side, tactic: Tactic, names: Record<Side, string>) {
  const pool = kural === 'boks' ? BOKS_STRIKE[tactic] : kural === 'muaythai' ? MT_STRIKE[tactic] : undefined;
  if (!pool?.length) return strikeLine(att, tactic, names);
  const def: Side = att === 'p' ? 'o' : 'p';
  return fill(pick(pool), { A: names[att], B: names[def] });
}
const GRAPPLE_GROUND: Record<'grappling' | 'gures', string[]> = {
  grappling: [
    L("{A} guard'ı geçip yan kontrole kuruldu, ağırlığını veriyor."),
    L("{A} mount'a tırmandı! Rakip altta nefes almakta zorlanıyor."),
    L("{A} sırtı aldı, iki kanca içeride. Kilit arıyor!"),
    L("{A} yarım guard'dan çıkıp diz-göbek pozisyonuna geçti."),
  ],
  gures: [
    L("{A} rakibini çevirdi; sırtı mindere yaklaşıyor, puan!"),
    L("{A} yerde kontrolü aldı, rakibin omuzlarını mindere bastırıyor."),
    L("{A} köprüdeki rakibini zorluyor; tuşa çok yakın!"),
    L("{A} arkasına geçip rakibini yan çevirdi. İki puan!"),
  ],
};
export function grappleGroundLine(kural: 'grappling' | 'gures', top: Side, names: Record<Side, string>) {
  return fill(pick(GRAPPLE_GROUND[kural]), { A: names[top] });
}
const HAND_FIGHT = [
  L("{A} el kavgasını kazanıyor, bilekleri kontrol edip rakibini geri itiyor."),
  L("{A} kafa kafaya tutuşta baskı kuruyor; rakip mindere doğru geriliyor."),
  L("{A} bacaklara fint atıp rakibini dengesiz yakaladı."),
];
export function handFightLine(att: Side, names: Record<Side, string>) {
  const def: Side = att === 'p' ? 'o' : 'p';
  return fill(pick(HAND_FIGHT), { A: names[att], B: names[def] });
}
const TD_OK_MAT = [
  L("{A} seviye değiştirip çift bacak dalıyor… ve rakibini mindere çarpıyor!"),
  L("{A} kalça atarak rakibini mindere savuruyor. Temiz fırlatma!"),
  L("{A} tek bacağı yakaladı, rakibini döndürüp mindere indirdi."),
];
const TD_FAIL_MAT = [
  L("{A} bacağa dalıyor ama {B} sprawl ile savunuyor ve ayağa dönüyor."),
  L("{A} bacağa gidiyor, {B} kalçasını geri atıp dengesini koruyor. Boşa enerji."),
  L("{A} dalış yaptı ama {B} kafasını bastırıp girişi kesti."),
];
/** Minderde (grappling, güreş) dalış cümlesi: kafes ve dizle karşılama yok */
export function tdLineGrapple(att: Side, ok: boolean, names: Record<Side, string>) {
  const def: Side = att === 'p' ? 'o' : 'p';
  return fill(pick(ok ? TD_OK_MAT : TD_FAIL_MAT), { A: names[att], B: names[def] });
}

export function tdLine(att: Side, ok: boolean, names: Record<Side, string>) {
  const def: Side = att === 'p' ? 'o' : 'p';
  return fill(pick(ok ? TD_OK : TD_FAIL), { A: names[att], B: names[def] });
}
export function groundLine(top: Side, names: Record<Side, string>) {
  return fill(pick(GROUND), { A: names[top] });
}
export function evenLine() {
  return pick(EXCHANGE_EVEN);
}

export const CRITICAL_INTRO = {
  rakipSersem: [
    L("💥 {o} SARSILDI! Dizleri titriyor, gözleri boşluğa bakıyor!"),
    L("💥 {o} YERE GİTTİ! Hemen doğrulmaya çalışıyor ama bacakları tutmuyor!"),
  ],
  sarsildin: [
    L("⚠️ Karanlık… Kulakların uğulduyor. {o} seni fena yakaladı!"),
    L("⚠️ YERDESİN! Tavan dönüyor, {o} üstüne geliyor!"),
  ],
  rakipSersemYerde: [L("💥 {o} yerde sersemledi! Dirsekler art arda iniyor, kendini koruyamıyor!")],
  sarsildinYerde: [L("⚠️ Altta ağır darbeler yiyorsun, görüşün bulanıklaşıyor! {o} üstünde durmuyor!")],
  subFirsat: [L("🔒 {sub} için boşluk var! Kolu/boynu yakaladın, {o} panikte!")],
  subTehlike: [L("🔒 {o} {sub} kilidini oturttu! Nefesin daralıyor, zaman azalıyor!")],
};

export const TACTICS: Record<Tactic, { ad: string; aciklama: string }> = {
  baski: { ad: L("Baskı kur"), aciklama: L("İleri yürü, rakibi kafese daya. Çok hasar, çok yorgunluk.") },
  kontra: { ad: L("Kontra bekle"), aciklama: L("Rakip gelsin, açığını cezalandır. Baskıcılara karşı etkili.") },
  takedown: { ad: L("Takedown dene"), aciklama: L("Yere indir, kontrol et, submission ara.") },
  clinch: { ad: L("Clinch’e gir"), aciklama: L("Yakın mesafe: diz, dirsek, fırlatma. Hızlı rakibi yavaşlatır.") },
  mesafe: { ad: L("Mesafeyi koru"), aciklama: L("Hareketli kal, jab ile puan topla, takedown’ları savun.") },
};

/** Dövüş sporları liginde taktiklerin o spora uygun adı ve açıklaması (MMA'da TACTICS). */
const SPORT_TACTIC_TEXT: Partial<Record<import('./sportRules').Sport, Partial<Record<Tactic, () => { ad: string; aciklama: string }>>>> = {
  boks: {
    baski: () => ({ ad: L("Baskı kur"), aciklama: L("İleri yürü, rakibi iplere daya. Çok hasar, çok yorgunluk.") }),
    kontra: () => ({ ad: L("Kontra bekle"), aciklama: L("Rakip gelsin, açığını kontra yumrukla cezalandır.") }),
    mesafe: () => ({ ad: L("Jab ve ayak oyunu"), aciklama: L("Jab ile puan topla, ringin ortasında dön, köşeye sıkışma.") }),
  },
  muaythai: {
    baski: () => ({ ad: L("Baskı kur"), aciklama: L("İleri yürü; tekme ve yumruk zinciriyle bastır.") }),
    kontra: () => ({ ad: L("Kontra bekle"), aciklama: L("Tekmesini yakala, açığına dirsek ve diz gönder.") }),
    mesafe: () => ({ ad: L("Uzun mesafe"), aciklama: L("Teep ve uzun tekmelerle uzakta tut, puan topla.") }),
    clinch: () => ({ ad: L("Klinç (plum)"), aciklama: L("Ensesini kontrol et; diz ve dirsekle yıprat.") }),
  },
  grappling: {
    takedown: () => ({ ad: L("İndirmeye git"), aciklama: L("Dal, yere götür; üstte pozisyon kur, kilit ara.") }),
    clinch: () => ({ ad: L("Tutuş ve fırlatma"), aciklama: L("Gövde kilidi ve fırlatma; üst pozisyonu kap.") }),
    kontra: () => ({ ad: L("Savun ve karşıla"), aciklama: L("Dalışını sprawl ile kes, sonra arkasını al.") }),
  },
  gures: {
    takedown: () => ({ ad: L("Bacağa dal"), aciklama: L("Tek ya da çift bacak; indirme puanını al.") }),
    clinch: () => ({ ad: L("Tutuş ve fırlatma"), aciklama: L("Kol bağla, belden kavra; suplex ve çevirme.") }),
    kontra: () => ({ ad: L("Savun ve karşıla"), aciklama: L("Dalışını kes, arkasına dön; tuş fırsatını bekle.") }),
  },
};
export const tacticText = (kural: import('./sportRules').Sport | undefined, t: Tactic) => (kural && SPORT_TACTIC_TEXT[kural]?.[t]?.()) || TACTICS[t];

/** Kritik an seçeneğinin o spordaki adı (boksta 'clinch' yerine sarılmak) */
export function criticalLabel(kind: keyof typeof CRITICAL_OPTIONS, i: number, kural?: import('./sportRules').Sport): { ad: string; aciklama: string } {
  if (kural === 'boks' && kind === 'sarsildin' && i === 0) return { ad: L("Sarıl, zaman kazan"), aciklama: L("Rakibine sarıl, hakem ayırana kadar kafanı toparla.") };
  return CRITICAL_OPTIONS[kind][i];
}

/** Kritik anda bu maçta gösterilecek seçeneklerin sırası (boks ve Muay Thai'de 'yere indir' yok) */
export function criticalChoices(kind: keyof typeof CRITICAL_OPTIONS, kural?: import('./sportRules').Sport): number[] {
  const all = CRITICAL_OPTIONS[kind].map((_, i) => i);
  if ((kural === 'boks' || kural === 'muaythai') && kind === 'rakipSersem') return [0, 1];
  return all;
}

export const CRITICAL_OPTIONS = {
  rakipSersem: [
    { ad: L("Bitirmeye git!"), aciklama: L("Her şeyi sal. Yüksek bitirme şansı ama kontra riski ve büyük yorgunluk.") },
    { ad: L("Kontrollü baskı"), aciklama: L("Hedef seç, açık verme. Güvenli, bitirme şansı düşük.") },
    { ad: L("Yere indir, ground & pound"), aciklama: L("Güreşine güveniyorsan hakem durdurana kadar vur.") },
  ],
  sarsildin: [
    { ad: L("Clinch’e yapış"), aciklama: L("Sarıl, zaman kazan, kafanı toparla.") },
    { ad: L("Geri çekil, mesafe aç"), aciklama: L("Ayakların seni taşırsa kurtulursun.") },
    { ad: L("Karşılık ver!"), aciklama: L("Kumar: rakibi de sarsabilirsin… ya da ışıklar söner.") },
  ],
  subFirsat: [
    { ad: L("Sık, bitir!"), aciklama: L("Tüm gücünle kilitle. Kaçarsa pozisyonu kaybedebilirsin.") },
    { ad: L("Pozisyonu koru"), aciklama: L("Riske girme, üstte kal ve puan topla.") },
  ],
  subTehlike: [
    { ad: L("Sabırla savun"), aciklama: L("Tekniğe güven, elleri kontrol et, açıyı kır.") },
    { ad: L("Patlayıcı kaçış"), aciklama: L("Güreş gücüyle köprü kur ve sıyrıl. Çok yorar.") },
    { ad: L("Tap at (pes et)"), aciklama: L("Maçı kaybedersin ama sakatlanmazsın.") },
  ],
};
