// Deneme uzatma testi: Patron, Menajer ve Hakem denemesi bitince ödüllü reklamla en fazla 2 kez uzar.
// Kullanım: npx tsx scripts/trial-test.ts
import * as P from '../src/engine/patron';
import * as M from '../src/engine/manager';
import * as R from '../src/engine/referee';

const ok = (c: boolean, m: string) => { if (!c) { console.error('HATA:', m); process.exitCode = 1; } else console.log('✓', m); };

const p = P.createPatron({ ad: 'A', orgAd: 'Org', kisa: 'ORG', renk: '#e63946', sehir: 'istanbul', senaryo: 'garaj', deneme: true });
p.geceNo = P.P_TRIAL_NIGHTS - 1; ok(!P.trialOver(p), `Patron: ${P.P_TRIAL_NIGHTS - 1}. gecede deneme sürüyor`);
p.geceNo = P.P_TRIAL_NIGHTS; ok(P.trialOver(p) && P.canExtendTrial(p), `Patron: ${P.P_TRIAL_NIGHTS}. gecede bitti, uzatılabilir`);
P.extendTrial(p); ok(!P.trialOver(p), 'Patron: 1. uzatma sonrası bir gece daha');
p.geceNo++; P.extendTrial(p); p.geceNo++; ok(P.trialOver(p) && !P.canExtendTrial(p), 'Patron: 2 uzatmadan sonra kapanır');
P.extendTrial(p); ok(p.ek === 2, 'Patron: üçüncü uzatma yok');

const m = M.createMgrRun('A', 'B', 'Ajans', 'sifir', true);
m.hafta = M.MGR_TRIAL_WEEKS; ok(!M.trialOver(m), `Menajer: ${M.MGR_TRIAL_WEEKS}. haftada sürüyor`);
m.hafta = M.MGR_TRIAL_WEEKS + 1; ok(M.trialOver(m) && M.canExtendTrial(m), 'Menajer: bitti, uzatılabilir');
M.extendTrial(m); ok(!M.trialOver(m), 'Menajer: +2 hafta');
m.hafta += 2; M.extendTrial(m); m.hafta += 2; ok(M.trialOver(m) && !M.canExtendTrial(m), 'Menajer: 2 uzatmadan sonra kapanır');

const r = R.createRefRun('A', 'B', true);
r.mac = R.REF_TRIAL; ok(R.trialOver(r) && R.canExtendTrial(r), `Hakem: ${R.REF_TRIAL} maçta bitti, uzatılabilir`);
R.extendTrial(r); ok(!R.trialOver(r), 'Hakem: +1 maç');
const paid = P.createPatron({ ad: 'A', orgAd: 'Org', kisa: 'ORG', renk: '#e63946', sehir: 'istanbul', senaryo: 'garaj', deneme: false });
paid.geceNo = 99; ok(!P.trialOver(paid) && !P.canExtendTrial(paid), 'Satın almış oyuncu etkilenmez');
