// Salon testi: açılış, kayıt, gelişim, maçlar (köşede / köşesiz), terfi, gelir dengesi.
// Çalıştırma: npx tsx scripts/academy-test.ts
import { gymRanking, gymScore, finishBout, GYM_LEVELS, openGym, power, signCost, signStudent, startBout, boutPlans, upgradeGym, weeklyGymNet, type CornerCall } from '../src/engine/academy';
import { advanceWeeks, createGame, rollStartingStats } from '../src/engine/character';
import { setSeed } from '../src/engine/rng';

let fails = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) fails++;
};
const input = { ad: 'Test', soyad: 'Kişi', lakap: 'Çelik', uyruk: 'tr', memleket: '', yas: 22, siklet: 'welter' as const, gecmis: 'boks' as const, hikaye: '' };

function career(seed: number, corner: 'iyi' | 'yok' | 'kotu', weeks = 260) {
  setSeed(seed);
  const s = createGame(input, rollStartingStats(input));
  s.stage = 'buyuk';
  s.populerlik = 40;
  s.takipci = 80_000;
  s.para = 10_000_000;
  openGym(s);
  const g = s.salon!;
  const log: string[] = [];
  const stats = { mac: 0, g: 0, ucc: 0, champ: 0, maxLv: 0, paraBas: s.para, terfi: 0 };
  for (let w = 0; w < weeks; w++) {
    // Kapasite boşsa aday kaydet; ara ara salonu büyüt.
    while (g.ogrenciler.length < GYM_LEVELS[g.seviye - 1].kapasite && g.adaylar?.list.length) {
      const best = [...g.adaylar.list].sort((a, b) => b.potansiyel - a.potansiyel)[0];
      signStudent(s, best.id);
    }
    if (w % 52 === 51 && g.seviye < 5) upgradeGym(s);
    const before = g.sonuclar.length ? g.sonuclar[0] : null;
    log.push(...advanceWeeks(s, 1));
    if (corner === 'yok' && g.sonuclar[0] && g.sonuclar[0] !== before) {
      stats.mac++;
      if (g.sonuclar[0].kazandi) stats.g++;
    }
    for (const st of g.ogrenciler.filter((x) => x.mac)) {
      if (corner === 'yok') continue; // 3 hafta sonra ekip dövüşür
      const plans = boutPlans(st.mac!);
      // İyi köşe: zaafa uyan planı seç, 1. raunda göre doğru talimatı ver. Kötü köşe: rastgele.
      const good = plans.find((p) => ['ayakta', 'kontra', 'bacak', 'govde', 'blitz', 'gures', 'gnp', 'yer', 'kafes', 'tempo', 'puan'].includes(p))!;
      startBout(s, st.id, corner === 'iyi' ? plans.find((p) => st.mac!.rakip && isGood(p, st.mac!.rakip.stats)) ?? good : plans[0]);
      const call: CornerCall = corner === 'iyi' ? st.mac!.r1!.dogru : (['bas', 'sakin', 'indir'] as const)[w % 3];
      const r = finishBout(s, st.id, call);
      if (r) {
        stats.mac++;
        if (r.kazandi) stats.g++;
        if (r.terfi) stats.terfi++;
      }
    }
  }
  stats.mac = g.sonuclar.length ? stats.mac : 0;
  stats.ucc = g.uccSayisi ?? 0;
  stats.champ = g.sampiyonSayisi ?? 0;
  stats.maxLv = Math.max(0, ...g.ogrenciler.map((x) => power(x.stats)));
  return { s, g, stats, log };
}

import { PLANS } from '../src/engine/fight';
import { ACHIEVEMENTS } from '../src/engine/achievements';
import { weakOf } from '../src/engine/academy';
const isGood = (p: keyof typeof PLANS, st: Parameters<typeof weakOf>[0]) => PLANS[p].hedef.includes(weakOf(st));

// Açılış ve temel akış
setSeed(1);
{
  const s = createGame(input, rollStartingStats(input));
  s.para = 1_000_000;
  s.takipci = 80_000;
  openGym(s);
  check(!s.salon, 'amatörken salon açılmaz');
  s.stage = 'bolgesel';
  openGym(s);
  check(!s.salon, 'bölgeselde salon açılmaz');
  s.stage = 'buyuk';
  s.takipci = 20_000;
  openGym(s);
  check(!s.salon, '50 binden az takipçiyle açılmaz');
  s.takipci = 80_000;
  s.para = 100_000;
  openGym(s);
  check(!s.salon, 'para yetmezse açılmaz');
  s.para = 155_000;
  openGym(s);
  check(!!s.salon && s.para === 5_000, 'açılış 150 bin dolar');
  check(s.salon!.adaylar!.list.length === 3, '3 aday gelir');
  const c = s.salon!.adaylar!.list[0];
  const cost = signCost(c);
  s.para += 50_000;
  signStudent(s, c.id);
  check(s.salon!.ogrenciler.length === 1 && s.para === 55_000 - cost, `kayıt ücreti düşüldü (${cost})`);
  advanceWeeks(s, 8);
  const st = s.salon!.ogrenciler[0];
  check(!!st.mac, `8 hafta içinde ilk maç geldi (rakip ${st.mac?.rakip.soyad})`);
  const r0 = gymRanking(s);
  console.log(`   sıralama: ${r0.sira}/${r0.rows.length} (puan ${gymScore(s.salon!)}, 1. ${r0.rows[0].ad} ${r0.rows[0].puan})`);
  check(r0.rows.length >= 30 && r0.sira > r0.rows.length * 0.7, 'yeni salon sıralamanın alt kısmında başlar');
  const net = weeklyGymNet(s.salon!);
  console.log(`   8. hafta: ${s.salon!.uye} üye, haftalık net ${net}`);
}

const runs = (corner: 'iyi' | 'yok' | 'kotu') => {
  const all = [11, 12, 13, 14, 15, 16, 17, 18].map((seed) => career(seed, corner).stats);
  const sum = (k: keyof (typeof all)[0]) => all.reduce((a, x) => a + (x[k] as number), 0) / all.length;
  return { mac: sum('mac'), oran: sum('g') / Math.max(1, sum('mac')), ucc: sum('ucc'), champ: sum('champ'), terfi: sum('terfi') };
};
const iyi = runs('iyi');
const kotu = runs('kotu');
const yok = runs('yok');
console.log(`   5 yıl · iyi köşe: ${iyi.mac.toFixed(1)} maç, %${(iyi.oran * 100).toFixed(0)} galibiyet, ${iyi.terfi.toFixed(1)} terfi, ${iyi.ucc.toFixed(2)} UCC, ${iyi.champ.toFixed(2)} şampiyon`);
console.log(`   5 yıl · kötü köşe: %${(kotu.oran * 100).toFixed(0)} galibiyet, ${kotu.ucc.toFixed(2)} UCC`);
console.log(`   5 yıl · köşe yok: %${(yok.oran * 100).toFixed(0)} galibiyet, ${yok.ucc.toFixed(2)} UCC`);
check(iyi.oran > kotu.oran + 0.08, 'iyi köşe kararları belirgin fark yaratır');
check(iyi.oran > yok.oran, 'köşede durmak, durmamaktan iyi');
check(iyi.ucc >= 0.5 && iyi.ucc <= 4, "iyi yönetilen salon 5 yılda UCC'ye öğrenci çıkarır ama kolay değil");

// Gelir dengesi
const { g, s, log } = career(21, 'iyi');
console.log(`   5 yıl sonra: seviye ${g.seviye}, ün ${g.un}, ${g.uye} üye, haftalık net ${weeklyGymNet(g)}, toplam kasa ${g.kasa}, öğrenci ${g.ogrenciler.length}`);
check(weeklyGymNet(g) > 0, 'büyümüş salon kâr ediyor');
const rk = gymRanking(s);
console.log(`   5 yıl sonra sıralama: ${rk.sira}/${rk.rows.length} (puan ${gymScore(g)})`);
check(rk.sira <= 5, "iyi yönetilen salon 5 yılda ilk 5'e girer");
check(log.some((h) => h.includes('en iyi') || h.includes('1 numaralı')), 'sıralama haberi çıktı');
console.log('   ' + log.filter((h) => h.includes('en iyi') || h.includes('1 numaralı')).join(' | '));
check(g.kasa < 8_000_000, 'salon parayı patlatmıyor');
const acik = ACHIEVEMENTS.filter((x) => x.kat === 'salon' && x.check(s)).map((x) => x.id);
console.log('   açılan salon başarımları:', acik.join(', '));
check(['salon_ac', 'salon_g1', 'salon_kose10', 'salon_lv5', 'salon_ucc', 'salon_ilk10'].every((id) => acik.includes(id)), 'salon başarımları açılıyor');
check(s.haberler.every((h) => !h.includes('undefined') && !h.includes('NaN')), 'haberlerde undefined/NaN yok');

console.log(fails ? `\n${fails} kontrol başarısız` : '\nTümü geçti');
process.exit(fails ? 1 : 0);
