// Menajer Modu denge simülasyonu: basit bir bot ajansı yönetir (teklif kabul, aday imzası, mesajlara rastgele cevap).
// Kullanım: npx tsx scripts/manager-sim.ts [kariyer=200] [hafta=208] [senaryo=sifir]
import { acceptOffer, advanceWeek, agencyRanking, answer, bekleyen, createMgrRun, ofisOf, OFIS, openTable, signCandidate, tableAsk, upgradeOffice, type Senaryo } from '../src/engine/manager';
import { pick } from '../src/engine/rng';

const N = Number(process.argv[2] ?? 200);
const W = Number(process.argv[3] ?? 208);
const SEN = (process.argv[4] ?? 'sifir') as Senaryo;

const out = { batti: 0, para: [] as number[], gelir: [] as number[], kemer: 0, ucc: 0, buyuk: 0, kadro: [] as number[], ayrilan: 0, odul: 0, ilk: 0, hedef: 0, itibar: [] as number[] };
for (let i = 0; i < N; i++) {
  const r = createMgrRun('Bot', 'Menajer', 'Bot Ajans', SEN, false);
  for (let w = 0; w < W && !r.emekli; w++) {
    for (const m of bekleyen(r)) answer(r, m.id, pick(m.secenekler!).k);
    // Aday: kapasite varsa en iyi tahminli adaya %15
    if (r.kadro.length < ofisOf(r).kapasite && r.adaylar.length) {
      const a = [...r.adaylar].sort((x, y) => y.tahmin - x.tahmin)[0];
      if (r.para > a.imza + 3000) signCandidate(r, a.id, 15);
    }
    if (OFIS[r.ofis + 1] && r.para > OFIS[r.ofis + 1].maliyet * 2) upgradeOffice(r);
    // Teklifler: sözleşme > unvan > denk maç; bazen pazarlık
    for (const f of r.kadro) {
      const ts = r.teklifler.filter((t) => t.fid === f.id);
      if (!ts.length) continue;
      const t = ts.find((x) => x.tip === 'sozlesme') ?? ts.find((x) => x.unvan) ?? ts.sort((a, b) => (a.rakip?.guc ?? 0) - (b.rakip?.guc ?? 0))[0];
      if (Math.random() < 0.5) {
        openTable(r, t.id);
        tableAsk(r, t.id, 'ucret');
      }
      if (r.teklifler.some((x) => x.id === t.id)) acceptOffer(r, t.id);
    }
    advanceWeek(r);
  }
  if (r.emekli) out.batti++;
  out.para.push(r.para);
  out.gelir.push(r.gelir);
  out.kemer += r.sampiyonluk;
  if (r.gecmis.some((g) => g.includes('UCC'))) out.ucc++;
  out.kadro.push(r.kadro.length);
  out.ayrilan += r.ayrilan;
  out.odul += r.oduller.length;
  out.itibar.push(r.itibar);
  if (agencyRanking(r).sira === 1) out.ilk++;
  if (r.hedef?.tamam) out.hedef++;
}
const avg = (a: number[]) => Math.round(a.reduce((x, y) => x + y, 0) / a.length);
const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
console.log(`Senaryo ${SEN} · ${N} kariyer · ${W} hafta`);
console.log(`battı %${Math.round((out.batti / N) * 100)} · hedef %${Math.round((out.hedef / N) * 100)} · sıralamada 1. %${Math.round((out.ilk / N) * 100)}`);
console.log(`para ort ${avg(out.para)} medyan ${med(out.para)} · toplam komisyon ort ${avg(out.gelir)}`);
console.log(`kemer/kariyer ${(out.kemer / N).toFixed(2)} · UCC'ye ulaşan %${Math.round((out.ucc / N) * 100)} · kadro ort ${avg(out.kadro)} · ayrılan/kariyer ${(out.ayrilan / N).toFixed(2)} · ödül/kariyer ${(out.odul / N).toFixed(2)} · itibar ort ${avg(out.itibar)}`);
