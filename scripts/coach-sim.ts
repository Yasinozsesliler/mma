// Antrenör Modu dengesi: otomatik hoca 15 yıl oynar (köşede doğru talimat ~%60, olaylarda rastgele seçim).
import { boutPlans, cornerCall, gymLevel, GYM_LEVELS, signCost, signStudent, startBout, upgradeGym, weakOf } from '../src/engine/academy';
import { advanceCoachWeek, chooseEvent, coachGoals, createCoachGame, learnSkill, setFocus, SKILLS, type CoachSkill } from '../src/engine/coachMode';
import { PLANS } from '../src/engine/fight';

const RUNS = Number(process.env.RUNS ?? 20);
const YEARS = Number(process.env.YEARS ?? 15);
const tot = { ucc: 0, champ: 0, awards: 0, broke: 0, lvl: 0, goals: 0, rank: 0, firstUcc: 0, firstChamp: 0, para: 0 };
for (let run = 0; run < RUNS; run++) {
  const s = createCoachGame({ ad: 'Test', soyad: 'Hoca', lakap: '', uyruk: 'tr' }, false);
  let firstUcc = 0, firstChamp = 0, minPara = s.para;
  for (let w = 0; w < YEARS * 52; w++) {
    const r = s.antrenor!;
    const g = s.salon!;
    if (r.olay) chooseEvent(s, Math.floor(Math.random() * r.olay.secenekler.length));
    if (r.yilSonu) delete r.yilSonu;
    while (r.puan > 0) {
      const opts = (Object.keys(SKILLS) as CoachSkill[]).filter((k) => r.beceri[k] < 3);
      if (!opts.length) break;
      learnSkill(s, opts[Math.floor(Math.random() * opts.length)]);
    }
    // Kayıt: en yüksek potansiyelli adayı al
    const cand = [...(g.adaylar?.list ?? [])].sort((a, b) => b.potansiyel - a.potansiyel)[0];
    if (cand && g.ogrenciler.length < gymLevel(g).kapasite && s.para > signCost(cand) + 5000) signStudent(s, cand.id);
    const next = GYM_LEVELS[g.seviye];
    if (next && s.para > next.maliyet + 20000) upgradeGym(s);
    g.ogrenciler.forEach((st) => {
      setFocus(s, st.id, weakOf(st.stats));
      if (st.mac) {
        const plans = boutPlans(st.mac);
        const good = plans.find((p) => PLANS[p].hedef.includes(weakOf(st.mac!.rakip.stats))) ?? plans[0];
        startBout(s, st.id, Math.random() < 0.7 ? good : plans[0]);
        // Oyuncu raunt aralarında %60 doğru talimat verir
        let done = null as ReturnType<typeof cornerCall>;
        while (st.mac?.kose && !done) {
          const k = st.mac.kose;
          const key = ({ onde: 'sakin', geride: 'bas', yakin: 'govde', onde_yorgun: 'nefes', rakip_yorgun: 'bas', kesik: 'kesik', sarsildi: 'nefes', rakip_sarsildi: 'bitir', yerde: 'kalk', rakip_ayak: 'bacak', rakip_govde: 'govde' } as const)[k.durum];
          done = cornerCall(s, st.id, Math.random() < 0.6 && k.secenek.includes(key) ? key : k.secenek[Math.floor(Math.random() * k.secenek.length)]);
        }
      }
    });
    advanceCoachWeek(s);
    minPara = Math.min(minPara, s.para);
    if (!firstUcc && (g.uccSayisi ?? 0) > 0) firstUcc = Math.ceil((w + 1) / 52);
    if (!firstChamp && (g.sampiyonSayisi ?? 0) > 0) firstChamp = Math.ceil((w + 1) / 52);
  }
  const g = s.salon!;
  tot.ucc += g.uccSayisi ?? 0;
  tot.champ += g.sampiyonSayisi ?? 0;
  tot.awards += s.antrenor!.oduller.length;
  tot.broke += minPara < 0 ? 1 : 0;
  tot.lvl += s.antrenor!.seviye;
  tot.goals += coachGoals(s).filter((x) => x.tamam).length;
  tot.rank += g.enIyiSira ?? 99;
  tot.firstUcc += firstUcc || YEARS + 1;
  tot.firstChamp += firstChamp || YEARS + 1;
  tot.para += s.para;
}
const a = (n: number) => (n / RUNS).toFixed(1);
console.log(`${RUNS} koşu × ${YEARS} yıl`);
console.log(`UCC'ye çıkan ${a(tot.ucc)} · şampiyon ${a(tot.champ)} · Yılın Antrenörü ${a(tot.awards)} · seviye ${a(tot.lvl)} · hedef ${a(tot.goals)}/9`);
console.log(`ilk UCC ${a(tot.firstUcc)}. yıl · ilk şampiyon ${a(tot.firstChamp)}. yıl · en iyi sıra ${a(tot.rank)} · para ${Math.round(tot.para / RUNS)} · eksiye düşen ${tot.broke}/${RUNS}`);
