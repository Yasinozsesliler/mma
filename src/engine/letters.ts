// Taraftar mektupları ve mesajlar: maçlardan sonra ara sıra kısa, duygusal mesajlar gelir. Cevap vermek ya da
// görmezden gelmek küçük sonuçlar doğurur (popülerlik, motivasyon, takipçi, para). Her mektup kariyerde bir kez.
import { L, LOC } from '../i18n';
import { addFollowers, fmtDelta, followers } from './fame';
import { chance, clamp, pick } from './rng';
import type { GameEventState, GameState } from './types';

type Letter = {
  id: string;
  kosul: (s: GameState, son: { won: boolean; ko: boolean }) => boolean;
  baslik: () => string;
  metin: (s: GameState) => string;
  secenekler: () => string[];
  uygula: (s: GameState, i: number) => string;
};

const pop = (s: GameState, d: number) => (s.populerlik = clamp(s.populerlik + d, 0, 100));
const mot = (s: GameState, d: number) => (s.motivasyon = clamp(s.motivasyon + d, -2, 2));
const olcek = (s: GameState) => ({ amator: 100, bolgesel: 800, buyuk: 4_000, ufc: 15_000 })[s.stage];

const LETTERS: Letter[] = [
  {
    id: 'hasta',
    kosul: (s, son) => son.won && s.populerlik >= 15,
    baslik: () => L("💌 Hastaneden Bir Mektup"),
    metin: () => L("Çocuk hastanesinden bir mektup: “Her maçını yatağımdan izliyorum. Kemoterapi günlerinde senin nakavtlarını açıyorum. Bir gün gelir misin?”"),
    secenekler: () => [L("Hastaneye git"), L("İmzalı bir eldiven gönder")],
    uygula: (s, i) => {
      if (i === 0) {
        pop(s, 3);
        mot(s, 2);
        return L("Bütün koğuşu gezdin, her çocukla fotoğraf çektirdin. Gece eve döndüğünde uzun süre uyuyamadın. Popülerlik +3, motivasyon +2.");
      }
      pop(s, 1);
      return L("Annesinden bir fotoğraf geldi: eldiven yatağın başucunda asılı. Popülerlik +1.");
    },
  },
  {
    id: 'kirgin',
    kosul: (s, son) => !son.won,
    baslik: () => L("📱 Kırgın Bir Taraftar"),
    metin: () => L("Bir taraftar uzun bir mesaj yazmış: “Senin için maçın biletine maaşımı verdim. Bu gece beni utandırdın.”"),
    secenekler: () => [L("Özür dile ve söz ver"), L("Cevap verme"), L("Sert bir cevap yaz")],
    uygula: (s, i) => {
      if (i === 0) {
        mot(s, 1);
        pop(s, 1);
        return L("“Bir dahaki sefere o bilet sana değecek.” Mesajın ekran görüntüsü yayıldı, insanlar dürüstlüğünü sevdi. Motivasyon +1, popülerlik +1.");
      }
      if (i === 1) return L("Görmezden geldin. Bazı geceler susmak en iyisi.");
      pop(s, -3);
      return L("Cevabın ekran görüntüsü her yerde. “Taraftarına bağıran yıldız” manşeti çıktı. Popülerlik -3.");
    },
  },
  {
    id: 'anne',
    kosul: (s, son) => son.won && son.ko,
    baslik: () => L("✉️ Rakibin Annesinden"),
    metin: () => L("Son rakibinin annesi el yazısıyla bir mektup göndermiş: “Oğlum iyi, merak etme. Sana kızgın değilim. Sadece bir dahaki sefere yerde kalan birine biraz daha nazik ol.”"),
    secenekler: () => [L("Çiçek ve bir not gönder"), L("Mektubu sakla, kimseye söyleme")],
    uygula: (s, i) => {
      if (i === 0) {
        pop(s, 2);
        return L("Kadın notunu sosyal medyada paylaştı: “Kafeste rakip, dışarıda bir evlat.” Popülerlik +2.");
      }
      mot(s, 1);
      return L("Mektup çekmecende duruyor. Her maçtan önce bir kez okuyorsun. Motivasyon +1.");
    },
  },
  {
    id: 'okul',
    kosul: (s) => s.para > olcek(s) * 3,
    baslik: () => L("📞 Eski Bir Okul Arkadaşı"),
    metin: (s) => L("İlkokuldan sıra arkadaşın aradı. Yıllardır konuşmuyordunuz. Küçük bir dükkân açmak istiyor, senden ${0} borç istiyor.", [(olcek(s) * 2).toLocaleString(LOC)]),
    secenekler: () => [L("Ver"), L("Kibarca reddet")],
    uygula: (s, i) => {
      if (i === 0) {
        s.para -= olcek(s) * 2;
        if (chance(0.5)) {
          mot(s, 1);
          return L("Bir yıl sonra dükkânın vitrininde senin posterin ve yanında bir zarf: borcun tamamı. Motivasyon +1.");
        }
        return L("Dükkân tutmadı, arkadaşın bir daha aramadı. Para gitti ama kalbin rahat.");
      }
      return L("Anladığını söyledi. Yine de sesindeki kırgınlığı duydun.");
    },
  },
  {
    id: 'aday',
    kosul: (s) => s.gecmis.length >= 4,
    baslik: () => L("🥋 Genç Bir Dövüşçü Adayı"),
    metin: () => L("On altı yaşında biri yazmış: “Ailem dövüşmemi istemiyor. Okulu bırakıp salona mı yazılsam?”"),
    secenekler: () => [L("“Önce okulunu bitir, salon kaçmaz.”"), L("“Hayallerinin peşinden git.”")],
    uygula: (s, i) => {
      pop(s, 1);
      return i === 0 ? L("Birkaç ay sonra bir fotoğraf geldi: diploması bir elinde, eldivenleri diğerinde. Popülerlik +1.") : L("Seni idolü olarak gösteren bir video çekti; yorumlarda aileler ikiye bölündü. Popülerlik +1.");
    },
  },
  {
    id: 'nefret',
    kosul: (s) => s.populerlik >= 30,
    baslik: () => L("😠 Nefret Mesajları"),
    metin: () => L("Bir hesap haftalardır her paylaşımının altına hakaret yazıyor. Bugün ailene de laf etmiş."),
    secenekler: () => [L("Engelle ve geç"), L("Mizahla cevap ver"), L("Herkesin önünde sert cevap ver")],
    uygula: (s, i) => {
      if (i === 0) {
        mot(s, 1);
        return L("Engelledin, telefonu kapattın. Kafan rahatladı. Motivasyon +1.");
      }
      if (i === 1) {
        const d = addFollowers(s, Math.max(300, followers(s) * 0.02));
        return L("Cevabın o kadar komikti ki hesap kendini kapattı. {0} takipçi.", [fmtDelta(d)]);
      }
      pop(s, -1);
      mot(s, -1);
      return L("Tartışma günlerce sürdü; sen de yoruldun. Popülerlik -1, motivasyon -1.");
    },
  },
  {
    id: 'portre',
    kosul: (s) => s.populerlik >= 20,
    baslik: () => L("🎨 Bir Hayranın Hediyesi"),
    metin: () => L("Bir ressam hayranın, senin kemer kaldırdığın bir portreyi postayla göndermiş. Altında: “Bir gün bu gerçek olacak.”"),
    secenekler: () => [L("Salonun duvarına as ve paylaş"), L("Teşekkür mesajı gönder")],
    uygula: (s, i) => {
      if (i === 0) {
        const d = addFollowers(s, Math.max(300, followers(s) * 0.015));
        pop(s, 1);
        return L("Ressam bir gecede ünlendi, sen de takipçi kazandın. Popülerlik +1, {0} takipçi.", [fmtDelta(d)]);
      }
      mot(s, 1);
      return L("Ressam cevabını çerçeveletmiş. Motivasyon +1.");
    },
  },
];

/** Maç sonrası: ara sıra bir mektup (kariyer boyunca her biri bir kez). */
export function maybeLetter(s: GameState): GameEventState | null {
  if (s.gecmis.length < 2 || !chance(0.28)) return null;
  const last = s.gecmis[0];
  const son = { won: last?.sonuc === 'G', ko: !!last && /KO/.test(last.yontem) };
  const done = new Set(s.mektuplar ?? []);
  const uygun = LETTERS.filter((x) => !done.has(x.id) && x.kosul(s, son));
  if (!uygun.length) return null;
  const m = pick(uygun);
  return { id: `mektup:${m.id}`, baslik: m.baslik(), metin: m.metin(s), secenekler: m.secenekler(), params: {} };
}

export function chooseLetter(s: GameState, idx: number): string {
  const id = s.pending.olay!.id.split(':')[1];
  const m = LETTERS.find((x) => x.id === id);
  s.mektuplar = [...(s.mektuplar ?? []), id];
  return m ? m.uygula(s, idx) : '';
}
