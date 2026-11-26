// Seri bölümünü birleştirir: sahne kareleri → sahne videoları → tek video + seslendirme, müzik ve efektler.
// node scripts/seri-kurgu.mjs <ffmpeg> <kare klasörü> <ses klasörü> <çıktı.mp4> [bölüm=1]
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, writeFileSync } from 'node:fs';

const [FF, KARE, SES, OUT, BOLUM = '1'] = process.argv.slice(2);
const SND = new URL('../assets/sounds/', import.meta.url).pathname;
const FPS = 30;
// Sahne sırası, süresi; her sahnedeki sesler: [dosya, sahne içi sn, ses düzeyi]
const BOLUMLER = {
  1: [
  ['vitrin', 6.0, [['ses:anlatici-n1', 0.7, 1.6], ['crowd_loop', 0, 0.12], ['punch1', 1.5, 0.12], ['punch3', 2.9, 0.12], ['ooh', 3.4, 0.1]]],
  ['kapi', 3.9, [['ses:anlatici-n2', 0.25, 1.6]]],
  ['salon', 3.0, [['punch1', 0.3, 0.55], ['punch2', 0.7, 0.55], ['punch3', 1.1, 0.6], ['ses:mert-3-m1', 1.7, 1.6]]],
  ['hoca', 3.0, [['ses:hoca-3-h1', 0.25, 1.6]]],
  ['can', 2.6, [['ses:can-2-c1', 0.25, 1.7], ['swell', 1.2, 0.25]]],
  ['meydan', 3.1, [['whoosh', 0.95, 0.45], ['body', 1.45, 0.55], ['ses:mert-3-m2', 0.35, 1.6]]],
  ['karar', 15.2, [['ses:anlatici-n3', 0.3, 1.6], ['heavy', 4.25, 0.5], ['swell', 4.3, 0.35], ['ses:anlatici-n4', 4.5, 1.6], ['tap', 5.2, 0.4], ['tap', 5.8, 0.4], ['ses:anlatici-n5', 9.8, 1.6], ['chime', 9.75, 0.35]]],
],
  // Bölüm 2 (ringe çık): İlk Dayak
  2: [
    ['b2eldiven', 5.6, [['ses:anlatici-b2n1', 0.4, 1.6], ['tap', 1.25, 0.3], ['ses:mert-b2m1', 3.9, 1.6]]],
    ['b2hakem', 3.2, [['ses:hoca-b2h1', 0.3, 1.6]]],
    ['b2dovus', 8.8, [['bell', 0.05, 0.5], ['punch1', 0.42, 0.5], ['punch2', 0.92, 0.5], ['whoosh', 1.4, 0.35], ['punch3', 2.25, 0.7], ['heavy', 2.3, 0.6], ['slam', 2.95, 0.55], ['ooh', 3.0, 0.35], ['ses:anlatici-b2n2', 3.3, 1.6], ['swell', 5.4, 0.3], ['ses:mert-b2m2', 7.4, 1.6]]],
    ['b2kalk', 2.4, [['ses:can-b2c1', 0.25, 1.7], ['bell2', 1.95, 0.55]]],
    ['b2gong', 2.4, [['ses:hoca-b2h2', 0.3, 1.6]]],
    ['b2ev', 4.3, [['ses:anne-2-b2a1', 0.3, 1.6]]],
    ['b2karar', 16.0, [['ses:anlatici-b2n3', 0.3, 1.6], ['heavy', 3.65, 0.5], ['swell', 3.7, 0.35], ['ses:anlatici-b2n4', 3.9, 1.6], ['tap', 4.6, 0.4], ['tap', 5.2, 0.4], ['ses:anlatici-b2n5', 10.5, 1.6], ['chime', 10.35, 0.35]]],
  ],
};
const SAHNE = BOLUMLER[BOLUM];
const tmp = `${KARE}/_video`;
mkdirSync(tmp, { recursive: true });
const ff = (args) => execFileSync(FF, ['-v', 'error', '-y', ...args], { stdio: 'inherit' });
let at = 0;
const audio = [];
const list = [];
for (const [ad, d, sesler] of SAHNE) {
  const n = readdirSync(`${KARE}/${ad}`).filter((f) => f.endsWith('.jpg')).length;
  const f = `${tmp}/${ad}.mp4`;
  // Kısa giriş/çıkış kararması (kesmeler sert ama göz yormasın)
  ff(['-framerate', String(FPS), '-i', `${KARE}/${ad}/%05d.jpg`, '-vf', `fade=t=in:st=0:d=0.12,fade=t=out:st=${(n / FPS - 0.12).toFixed(2)}:d=0.12,format=yuv420p`, '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-r', String(FPS), `${f}.tmp.mp4`]);
  renameSync(`${f}.tmp.mp4`, f);
  list.push(`file '${f}'`);
  for (const [s, o, v] of sesler) audio.push([s.startsWith('ses:') ? `${SES}/${s.slice(4)}.mp3` : `${SND}${s}.wav`, at + o, v]);
  at += n / FPS;
}
writeFileSync(`${tmp}/liste.txt`, list.join('\n'));
ff(['-f', 'concat', '-safe', '0', '-i', `${tmp}/liste.txt`, '-c', 'copy', `${tmp}/goruntu.mp4`]);
// Müzik: gergin alt zemin (menü müziği kısık), karar anında yükselen davul girişi
audio.push([`${SND}music_menu.wav`, 0, 0.16, true]);
audio.push([`${SND}giris_epik.wav`, at - 11.2, 0.22]);
const ins = audio.flatMap(([f, , , loop]) => (loop ? ['-stream_loop', '-1', '-i', f] : ['-i', f]));
const fc = audio.map(([, o, v], i) => `[${i + 1}:a]adelay=${Math.round(o * 1000)}|${Math.round(o * 1000)},volume=${v}[a${i}]`).join(';') +
  `;${audio.map((_, i) => `[a${i}]`).join('')}amix=inputs=${audio.length}:duration=longest:normalize=0,atrim=0:${at.toFixed(2)},afade=t=out:st=${(at - 0.8).toFixed(2)}:d=0.8,alimiter=limit=0.95[aout]`;
ff(['-i', `${tmp}/goruntu.mp4`, ...ins, '-filter_complex', fc, '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', `${OUT}.tmp.mp4`]);
renameSync(`${OUT}.tmp.mp4`, OUT);
console.log('✅', OUT, at.toFixed(1), 'sn');
