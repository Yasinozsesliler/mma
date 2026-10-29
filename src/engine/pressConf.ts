// Basın toplantısı sahnesi: kamp bitince masada rakibinle yan yana oturursun, gazeteciler iki soru sorar.
// Alçakgönüllü, iddialı ya da esprili cevap; hype, popülerlik ve hocanla bağ değişir. İddialı konuşursan sözün
// maç gecesi seni takip eder: kazanırsan alkış, kaybedersen "sözünü yedi" manşetleri.
import { L, LOC } from '../i18n';
import { addHype } from './hype';
import { addFollowers, followers } from './fame';
import { legendPress, legendPressPayout } from './legendRun';
import { clamp, shuffle } from './rng';
import type { GameState } from './types';

export type PressStyle = 'mutevazi' | 'iddiali' | 'espri';
export interface PressQ {
  muhabir: string;
  soru: string;
  cevaplar: Record<PressStyle, string>;
  /** Efsane Yolu: tarihe sadık cevap */
  tarihi?: PressStyle;
}
export interface PressScene {
  sorular: PressQ[];
  secimler: PressStyle[];
  tepki?: string;
}

const MUHABIR = [L("Spor Dünyası"), L("MMA Kulis"), L("Kafes TV"), L("Fight Magazine"), L("Gece Bülteni")];

function questions(s: GameState): PressQ[] {
  const o = s.pending.rakip!;
  const ad = o.soyad;
  const out: Omit<PressQ, 'muhabir'>[] = [];
  if (o.champion || s.sampiyon)
    out.push({
      soru: L("Kemer masada. Cumartesi gecesi kemerin kimin belinde olacak?"),
      cevaplar: { mutevazi: L("“Kemer, daha çok çalışanın olur. Ben çalıştım.”"), iddiali: L("“Benim. Bunu şimdiden yazabilirsiniz.”"), espri: L("“Kemeri tartıya getirsinler, ölçülerimi alayım.”") },
    });
  if (o.sonSonuc === 'M')
    out.push({
      soru: L("Geçen sefer {0} seni yendi. Bu sefer ne değişecek?", [ad]),
      cevaplar: { mutevazi: L("“O gece o daha iyiydi. Hatalarımı çalıştım.”"), iddiali: L("“O gece bir kazaydı. Bu sefer erken bitireceğim.”"), espri: L("“Değişen tek şey saç modelim. Bir de sonuç.”") },
    });
  if (o.memleket)
    out.push({
      soru: L("Kendi seyircinin önünde dövüşeceksin. Baskı hissediyor musun?"),
      cevaplar: { mutevazi: L("“Onların önünde dövüşmek bir onur.”"), iddiali: L("“Baskıyı o hissetsin. Burası benim evim.”"), espri: L("“Annem ön sırada olacak, asıl baskı o.”") },
    });
  if (s.seri <= -2)
    out.push({
      soru: L("Üst üste kaybettin. Bazıları bitti diyor. Ne diyorsun?"),
      cevaplar: { mutevazi: L("“Eleştirileri hak ettim. Cevabımı kafeste vereceğim.”"), iddiali: L("“Beni gömenler cumartesi tribünde olsun.”"), espri: L("“Bitmedim, sadece uzun bir ısınma turundaydım.”") },
    });
  out.push(
    {
      soru: L("{0} hakkında ne düşünüyorsun?", [ad]),
      cevaplar: { mutevazi: L("“Saygı duyduğum bir dövüşçü. Zor bir maç olacak.”"), iddiali: L("“Abartılan bir isim. Cumartesi herkes görecek.”"), espri: L("“Sakalı güzel. Gerisini kafeste konuşuruz.”") },
    },
    {
      soru: L("Maç nasıl biter? Bir tahmin ver."),
      cevaplar: { mutevazi: L("“Kim daha iyi hazırlandıysa o kazanır.”"), iddiali: L("“İkinci raunt, nakavt. Not alın.”"), espri: L("“Ben kazanırım, o da güzel bir uyku çeker.”") },
    },
    {
      soru: L("Kamp nasıl geçti?"),
      cevaplar: { mutevazi: L("“Zor ama verimli. Ekibime teşekkür ederim.”"), iddiali: L("“Hayatımın en iyi kampı. Daha önce hiç bu kadar hazır olmadım.”"), espri: L("“Hocam beni o kadar koşturdu ki ayakkabılarım istifa etti.”") },
    },
  );
  // Bağlama özel soru varsa önce o, sonra genel bir soru
  const ozel = out.slice(0, out.length - 3);
  const genel = shuffle(out.slice(-3));
  const muhabir = shuffle(MUHABIR);
  const efsane = legendPress(s);
  const ilk = efsane ? [{ soru: efsane.soru, cevaplar: efsane.cevaplar, tarihi: efsane.tarihi }] : ozel.slice(0, 1);
  return [...ilk, ...genel].slice(0, 2).map((q, i) => ({ ...q, muhabir: muhabir[i] }));
}

export function startPress(s: GameState) {
  const k = s.pending.kamp!;
  k.basinSahne = { sorular: questions(s), secimler: [] };
}

const TEPKI: Record<PressStyle, () => string> = {
  mutevazi: () => L("Salon saygıyla alkışladı. Hocan başını salladı."),
  iddiali: () => L("Flaşlar patladı! Manşetler hazır; şimdi sözünü tutman gerek."),
  espri: () => L("Salon kahkahaya boğuldu, klip şimdiden dolaşıyor."),
};

export function answerPress(s: GameState, st: PressStyle) {
  const k = s.pending.kamp!;
  const p = k.basinSahne;
  if (!p || p.secimler.length >= p.sorular.length) return;
  const q = p.sorular[p.secimler.length];
  p.secimler.push(st);
  p.tepki = TEPKI[st]();
  if (q?.tarihi === st) {
    k.efsaneSoz = true;
    p.tepki = L("📜 Tarihî söz! Salon bu cümleyi yıllarca hatırlayacak. Maçı kazanırsan manşetler senin.");
  }
  if (st === 'mutevazi') {
    s.populerlik = clamp(s.populerlik + 1, 0, 100);
    if (s.hoca) s.hoca.bag = clamp(s.hoca.bag + 2, 0, 100);
    addHype(s, 2, L("Saygılı basın"));
  } else if (st === 'iddiali') {
    s.populerlik = clamp(s.populerlik + 2, 0, 100);
    k.iddia = (k.iddia ?? 0) + 1;
    addHype(s, 7, L("İddialı sözler"));
  } else {
    addFollowers(s, Math.max(200, followers(s) * 0.01));
    addHype(s, 4, L("Basında espri"));
  }
}

/** Viral klip (reklam ödülü): basın toplantısının en sert anı paylaşılır; takipçi ve maçın bilet/PPV satışı artar. */
export const viralPay = (s: GameState) => (s.stage === 'ufc' ? 40_000 : s.stage === 'buyuk' ? 6_000 : 800);
export function claimViral(s: GameState) {
  const k = s.pending.kamp;
  if (!k?.basinSahne || k.viral) return;
  k.viral = true;
  const n = viralPay(s);
  s.para += n;
  addFollowers(s, Math.max(500, followers(s) * 0.03));
  addHype(s, 5, L("Viral klip"));
  k.basinSahne.tepki = L("📈 Klip patladı: milyonlarca izlenme. Bilet satışları arttı (+{0}).", [`$${n.toLocaleString(LOC)}`]);
}

export const pressDone = (s: GameState) => {
  const p = s.pending.kamp?.basinSahne;
  return !!p && p.secimler.length >= p.sorular.length;
};

/** Maç sonu: iddialı sözlerin hesabı. */
export function pressAfterFight(s: GameState, won: boolean): string[] {
  const efsane = won && s.pending.kamp?.efsaneSoz ? [legendPressPayout(s)] : [];
  const n = s.pending.kamp?.iddia ?? 0;
  if (!n) return efsane;
  if (won) {
    s.populerlik = clamp(s.populerlik + 2 * n, 0, 100);
    return [L("🎤 Basın toplantısındaki sözlerini tuttun! Manşet: “Dediğini yaptı.” Popülerlik +{0}", [2 * n]), ...efsane];
  }
  s.populerlik = clamp(s.populerlik - 3 * n, 0, 100);
  return [L("🎤 Basın toplantısında büyük konuştun ama kaybettin. Manşet: “Sözünü yedi.” Popülerlik -{0}", [3 * n])];
}
