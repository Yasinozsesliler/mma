// Menajer Modu kaydı seçili dilde (mesajlar kayda o dilde yazılır): mağaza görselleri için.
// Çalıştırma: npx tsx scripts/menajer-kayit-dil.mts <dil> <çıktı.json>
import { writeFileSync } from 'node:fs';

const [lang, out] = process.argv.slice(2);
(globalThis as { __YOL_LANG__?: string }).__YOL_LANG__ = lang;
const { setDict } = await import('../src/i18n/index');
if (lang !== 'tr') { const m = await import(`../src/i18n/${lang}.ts`); setDict(m[lang.toUpperCase()] ?? m.default); }
const { acceptOffer, advanceWeek, answer, bekleyen, createMgrRun, signCandidate } = await import('../src/engine/manager');
const { setSeed } = await import('../src/engine/rng');
setSeed(11);
const r = createMgrRun('Yasin', 'Özses', 'Kartal', 'yildiz', false);
for (let w = 0; w < 7; w++) {
  for (const m of bekleyen(r)) answer(r, m.id, m.secenekler![0].k);
  for (const t of [...r.teklifler]) acceptOffer(r, t.id, t.super ? 'ppv' : undefined);
  if (r.kadro.length < 3 && r.adaylar[0]) signCandidate(r, r.adaylar[0].id, 20);
  advanceWeek(r);
}
writeFileSync(out, JSON.stringify(r));
console.log(lang, 'hafta', r.hafta, 'mesaj', bekleyen(r).length, (r.mesajlar[0]?.metin ?? '').slice(0, 80));
