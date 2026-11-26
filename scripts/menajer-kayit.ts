// Menajer Modu reklamı için iki kayıt: "Tek yıldız" senaryosu motorla oynatılır.
// <on.json>: şampiyonun ünvan maçı bu hafta (face-off), <son.json>: maçtan sonra (kazandı, kafeste izlenebilir).
// Çalıştırma: npx tsx scripts/menajer-kayit.ts <on.json> <son.json>
import { writeFileSync } from 'node:fs';
import { acceptOffer, advanceWeek, answer, bekleyen, createMgrRun, signCandidate, type MgrRun } from '../src/engine/manager';

const [onF, sonF] = process.argv.slice(2);
const play = (r: MgrRun) => {
  for (const m of bekleyen(r)) answer(r, m.id, m.secenekler![0].k);
  for (const t of [...r.teklifler]) acceptOffer(r, t.id, t.super ? 'ppv' : undefined);
  if (r.kadro.length < 3 && r.adaylar[0]) signCandidate(r, r.adaylar[0].id, 20);
};
for (let deneme = 0; deneme < 400; deneme++) {
  const r = createMgrRun('Yasin', 'Özses', 'Kartal Yönetim', 'yildiz', false);
  for (let w = 0; w < 40; w++) {
    play(r);
    advanceWeek(r);
    const champ = r.kadro.find((f) => f.mac?.hafta === r.hafta && f.mac.unvan && f.mac.org === 'ufc');
    if (!champ) continue;
    const on = JSON.stringify(r);
    const g0 = champ.g;
    const rakip = champ.mac!.rakip;
    play(r);
    advanceWeek(r);
    const c = r.kadro.find((f) => f.id === champ.id);
    // Rakip daha güçlüyken kazanılan ünvan maçı: hikâyesi olan bir zafer
    if (c && c.g > g0 && rakip.guc > c.guc) {
      writeFileSync(onF, on);
      writeFileSync(sonF, JSON.stringify(r));
      console.log('deneme', deneme, 'hafta', r.hafta, c.ad, c.soyad, c.guc, 'vs', rakip.ad, rakip.guc, '→', (r.rapor ?? []).join(' | ').slice(0, 300));
      process.exit(0);
    }
    break;
  }
}
console.log('bulunamadı');
