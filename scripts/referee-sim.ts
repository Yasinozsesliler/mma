// Hakem Modu denge testi: üç bot (ipuçlarını doğru okuyan, rastgele, hep "devam") kariyer oynar.
// Çalıştırma: npx tsx scripts/referee-sim.ts
import { answerExam, cardWinner, createRefRun, decide, finishBout, finishExam, scoreRound, startBout, trueCard, type Card, type RefRun } from '../src/engine/referee';
import { EXAM_QUESTIONS } from '../src/engine/refereeDepth';
import { pick } from '../src/engine/rng';

type Bot = 'iyi' | 'rastgele' | 'devam';
const CARDS: Card[] = ['10-9a', '10-9b', '10-8a', '10-8b', '10-10'];

function play(bot: Bot, n: number) {
  const r: RefRun = createRefRun('T', 'B', false);
  let bitis = 0;
  let momentN = 0;
  const firstUcc: number[] = [];
  for (let i = 0; i < n; i++) {
    startBout(r);
    const b = r.aktif!;
    for (let g = 0; g < 200 && !b.sonuc; g++) {
      if (b.an) {
        momentN++;
        const keys = b.an.secenekler.map((o) => o.key);
        const t = b.an.truth;
        const good = t === 'gri' ? 'dur' : keys.includes(t as never) ? t : 'bekle';
        decide(b, bot === 'iyi' ? good : bot === 'devam' ? (keys.includes('devam') ? 'devam' : keys.includes('bekle') ? 'bekle' : 'uyar') : pick(keys));
      } else if (b.kart) {
        const t = trueCard(b);
        // İyi bot istatistikleri okur ama 10-8'leri bazen kaçırır.
        const c = bot === 'iyi' ? (t.startsWith('10-8') && Math.random() < 0.4 ? (`10-9${t.slice(-1)}` as Card) : t) : bot === 'devam' ? (cardWinner(t) === 0 ? '10-9a' : '10-9b') : pick(CARDS);
        scoreRound(b, c);
      }
    }
    if (b.sonuc!.yontem !== 'UD' && b.sonuc!.yontem !== 'DRAW') bitis++;
    finishBout(r);
    // Lisans sınavı: iyi bot çoğunu bilir, diğerleri rastgele
    if (r.sinav) {
      const s = r.sinav;
      s.sorular.forEach((q, j) => answerExam(r, j, bot === 'iyi' && Math.random() < 0.9 ? EXAM_QUESTIONS[q].d : Math.floor(Math.random() * 3)));
      finishExam(r);
    }
    if (r.seviye === 'ucc' && !firstUcc.length) firstUcc.push(r.mac);
    r.yilSonu = undefined;
  }
  return `${bot.padEnd(9)} saygı ${String(r.saygi).padStart(3)} imaj ${String(r.imaj).padStart(3)} tarz ${String(r.tarz).padStart(4)} · seviye ${r.seviye.padEnd(8)} itibar ${String(r.itibar).padStart(3)} · UCC'ye ${firstUcc[0] ?? '-'}. maçta · bitiriş %${Math.round((bitis / n) * 100)} · maç başı an ${(momentN / n).toFixed(1)} · ödül ${r.oduller.length} · doğru/yanlış ${r.dogru}/${r.yanlis}`;
}

for (const bot of ['iyi', 'rastgele', 'devam'] as Bot[]) for (let k = 0; k < 3; k++) console.log(play(bot, 60));
