// Şablon anlatımlar. {p} = oyuncu, {o} = rakip, {sub} = submission adı.
// İsimler hep yalın halde kullanılır, çünkü Türkçe ek uyumu isimden isime değişir.
import { fill, pick } from './rng';
import type { Tactic } from './types';

type Side = 'p' | 'o';

const STRIKE: Record<Exclude<Tactic, 'takedown'>, string[]> = {
  baski: [
    '{A} rakibini kafese dayıyor ve sol-sağ-sol hook serisini boşaltıyor!',
    '{A} ileri yürüyor, gövdeye gömülen bir hook ile rakibinin nefesini kesiyor.',
    '{A} durmadan bastırıyor; ağır bir sağ el yüze temiz iniyor!',
    '{A} rakibini köşeye sıkıştırıp dirsekle tamamlanan bir kombinasyon bağlıyor.',
  ],
  kontra: [
    '{B} saldırıya geliyor ama {A} tam zamanında bir kontra sağ krosla karşılıyor!',
    '{A} geri adım atıyor, rakip boşluğa düşüyor ve kısa bir sol hook yiyor.',
    '{A} sabırla bekliyor… ve {B} içeri girdiği anda sert bir kontra patlıyor!',
  ],
  mesafe: [
    '{A} jab ile mesafeyi yönetiyor, rakibin yüzü kızarmaya başladı.',
    '{A} dışarıdan sert bir low kick yapıştırıp çıkıyor. Ön bacak zorlanıyor.',
    '{A} açıdan çıkıp jab-kros ile puan topluyor, rakibi boşa savuruyor.',
    '{A} uzun bir ön tekme ile rakibin atağını durduruyor.',
  ],
  clinch: [
    '{A} clinch’te ense kontrolü aldı, dizler gövdeye art arda iniyor!',
    '{A} clinch’ten çıkarken kısa bir dirsek savuruyor, kaşın üstüne değdi!',
    '{A} rakibini kafese yaslayıp kirli boksla yıpratıyor.',
  ],
};

const TD_OK = [
  '{A} seviye değiştirip çift bacak dalıyor… ve rakibini yere çarpıyor!',
  '{A} clinch’ten kalça atarak rakibini yere savuruyor. Temiz fırlatma!',
  '{A} tek bacağı yakaladı, kafese yaslayıp rakibini yere indirdi.',
];
const TD_FAIL = [
  '{A} takedown’a dalıyor ama {B} sprawl ile savunuyor ve ayağa dönüyor.',
  '{A} bacağa gidiyor, {B} kafese yaslanıp dengesini koruyor. Boşa enerji.',
  '{A} dalış yaptı ama {B} diz kaldırarak girişi cezalandırdı!',
];
const GROUND = [
  '{A} üstte ağır basıyor, ground and pound ile rakibini hırpalıyor.',
  '{A} half guard’dan geçip yan kontrole kuruldu, dirsekler iniyor.',
  '{A} mount’a çıktı! Seyirci ayağa kalkıyor.',
  '{A} sırtı aldı, iki kanca içeride. Tehlike büyük!',
];
const EXCHANGE_EVEN = [
  'İki dövüşçü ortada karşılıklı vuruşuyor, net bir üstünlük yok.',
  'Temkinli bir bölüm; ikisi de fint atıyor, kimse ilk hatayı yapmak istemiyor.',
];

export function strikeLine(att: Side, tactic: Tactic, names: Record<Side, string>) {
  const t: Exclude<Tactic, 'takedown'> = tactic === 'takedown' ? 'baski' : tactic;
  const def: Side = att === 'p' ? 'o' : 'p';
  return fill(pick(STRIKE[t]), { A: names[att], B: names[def] });
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
    '💥 {o} SARSILDI! Dizleri titriyor, gözleri boşluğa bakıyor!',
    '💥 {o} YERE GİTTİ! Hemen doğrulmaya çalışıyor ama bacakları tutmuyor!',
  ],
  sarsildin: [
    '⚠️ Karanlık… Kulakların uğulduyor. {o} seni fena yakaladı!',
    '⚠️ YERDESİN! Tavan dönüyor, {o} üstüne geliyor!',
  ],
  rakipSersemYerde: ['💥 {o} yerde sersemledi! Dirsekler art arda iniyor, kendini koruyamıyor!'],
  sarsildinYerde: ['⚠️ Altta ağır darbeler yiyorsun, görüşün bulanıklaşıyor! {o} üstünde durmuyor!'],
  subFirsat: ['🔒 {sub} için boşluk var! Kolu/boynu yakaladın, {o} panikte!'],
  subTehlike: ['🔒 {o} {sub} kilidini oturttu! Nefesin daralıyor, zaman azalıyor!'],
};

export const TACTICS: Record<Tactic, { ad: string; aciklama: string }> = {
  baski: { ad: 'Baskı kur', aciklama: 'İleri yürü, rakibi kafese daya. Çok hasar, çok yorgunluk.' },
  kontra: { ad: 'Kontra bekle', aciklama: 'Rakip gelsin, açığını cezalandır. Baskıcılara karşı etkili.' },
  takedown: { ad: 'Takedown dene', aciklama: 'Yere indir, kontrol et, submission ara.' },
  clinch: { ad: 'Clinch’e gir', aciklama: 'Yakın mesafe: diz, dirsek, fırlatma. Hızlı rakibi yavaşlatır.' },
  mesafe: { ad: 'Mesafeyi koru', aciklama: 'Hareketli kal, jab ile puan topla, takedown’ları savun.' },
};

export const CRITICAL_OPTIONS = {
  rakipSersem: [
    { ad: 'Bitirmeye git!', aciklama: 'Her şeyi sal. Yüksek bitirme şansı ama kontra riski ve büyük yorgunluk.' },
    { ad: 'Kontrollü baskı', aciklama: 'Hedef seç, açık verme. Güvenli, bitirme şansı düşük.' },
    { ad: 'Yere indir, ground & pound', aciklama: 'Güreşine güveniyorsan hakem durdurana kadar vur.' },
  ],
  sarsildin: [
    { ad: 'Clinch’e yapış', aciklama: 'Sarıl, zaman kazan, kafanı toparla.' },
    { ad: 'Geri çekil, mesafe aç', aciklama: 'Ayakların seni taşırsa kurtulursun.' },
    { ad: 'Karşılık ver!', aciklama: 'Kumar: rakibi de sarsabilirsin… ya da ışıklar söner.' },
  ],
  subFirsat: [
    { ad: 'Sık, bitir!', aciklama: 'Tüm gücünle kilitle. Kaçarsa pozisyonu kaybedebilirsin.' },
    { ad: 'Pozisyonu koru', aciklama: 'Riske girme, üstte kal ve puan topla.' },
  ],
  subTehlike: [
    { ad: 'Sabırla savun', aciklama: 'Tekniğe güven, elleri kontrol et, açıyı kır.' },
    { ad: 'Patlayıcı kaçış', aciklama: 'Güreş gücüyle köprü kur ve sıyrıl. Çok yorar.' },
    { ad: 'Tap at (pes et)', aciklama: 'Maçı kaybedersin ama sakatlanmazsın.' },
  ],
};
