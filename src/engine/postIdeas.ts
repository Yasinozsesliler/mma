// Oyuncunun paylaşım önerileri: kariyer durumuna göre (rakip, kemer, son maç, yaşam) değişen, kategorili ve geniş havuz.
import { L } from '../i18n';
import { ORGS } from './data';
import { currentOrg } from './character';
import { fmtFollowers, followers } from './fame';
import { fill } from './rng';
import { brandById } from './sponsors';
import type { GameState } from './types';

export type IdeaKat = 'kamp' | 'trash' | 'saygi' | 'taraftar' | 'motivasyon' | 'yasam' | 'meydan' | 'sonuc' | 'sponsor' | 'soru';

export const IDEA_KATS: { id: IdeaKat; ad: string; ikon: string }[] = [
  { id: 'kamp', ad: L("Kamp"), ikon: 'dumbbell' },
  { id: 'trash', ad: L("Trash talk"), ikon: 'fire' },
  { id: 'meydan', ad: L("Meydan oku"), ikon: 'sword-cross' },
  { id: 'sonuc', ad: L("Son maç"), ikon: 'trophy-outline' },
  { id: 'saygi', ad: L("Saygı"), ikon: 'handshake' },
  { id: 'taraftar', ad: L("Taraftar"), ikon: 'account-heart' },
  { id: 'motivasyon', ad: L("Motivasyon"), ikon: 'lightning-bolt' },
  { id: 'yasam', ad: L("Yaşam"), ikon: 'sunglasses' },
  { id: 'sponsor', ad: L("Sponsor"), ikon: 'briefcase' },
  { id: 'soru', ad: L("Soru"), ikon: 'help-circle-outline' },
];

const POOL: Record<IdeaKat, string[]> = {
  kamp: [
    L("Kampın {n}. haftası. Ciğerler yanıyor ama zihin berrak. 🥊"),
    L("Sabah 5’te koşu, öğlen spar, akşam grappling. {rakip}, ben hazırım. #Kamp"),
    L("{hoca} bugün beni yere serdi. Kafeste kimse bunu yapamayacak. 😤"),
    L("Yeni bir silah geliştiriyoruz. Maç gecesi göreceksiniz… 🤫"),
    L("Kilo kontrolde, zihin net. {rakip} gelsin."),
    L("{salon}’da bir gece daha. Işıklar sönene kadar buradayım. 💡"),
    L("Bugün 10 raunt spar. Yoruldum ama durmadım."),
    L("Video analiz günü: {rakip}’in her hareketini ezberliyorum. 🎬"),
    L("Buz banyosu, masaj, uyku. Savaşçı dinlenmeyi de bilir. 🧊"),
    L("Kamp güncellemesi: sağlıklı, aç ve tehlikeli. 🐺"),
  ],
  trash: [
    L("{rakip} kafeste beni görünce kaçacak yer arayacak. 😂"),
    L("{rakip}, sosyal medyada çok cesursun. Kafeste görüşürüz."),
    L("Bu gece {rakip} uyumayacak. Çünkü maç gecesi uyutacağım. 💤"),
    L("{rakip} diye bir dövüşçü yok, sadece bir sonraki kurbanım var."),
    L("{rakip} hayranları, şimdiden mendilleri hazırlayın. 🤧"),
    L("{rakip}’in çenesi o kadar dayanıklı değil, herkes biliyor."),
    L("Kamera önünde herkes aslan. Kafes kapısı kapanınca görürüz {rakip}."),
    L("{rakip}, hazır ol. Kariyerinin en kötü gecesi yaklaşıyor."),
    L("Söylediklerimin arkasındayım: {rakip} bu maçı bitiremeyecek."),
  ],
  meydan: [
    L("{sampiyon}, kemerini hazırla. Geliyorum. 🏆"),
    L("{sampiyon} benden kaçıyor. {org}, bu maçı yapın!"),
    L("Sıklette kimse benimle dövüşmek istemiyor. Sıradaki kim? 👀"),
    L("{sampiyon}, tahtında rahat oturma. Sıra bende."),
    L("İlk 5’e giren herkese açık davet: kafeste görüşelim."),
    L("{org}, bana bir şampiyonluk maçı borçlusunuz. Hak ettim."),
    L("Adımı unutmayın. Yakında o kemer bende olacak."),
  ],
  sonuc: [],
  saygi: [
    L("{rakip} gerçek bir savaşçı. Maç gecesi en iyi hâlimizle karşılaşacağız. 🤝"),
    L("Rakibime saygım sonsuz. Ama kazanan ben olacağım."),
    L("{hoca} ve tüm takımıma teşekkürler. Bu yol tek başına yürünmez."),
    L("Sıklette herkes çok çalışıyor. Bu yüzden bu spor güzel."),
    L("Yenildiğim her maç bana bir şey öğretti. Hepsine minnettarım."),
    L("Rakiplerime saygı, taraftarlara sevgi. Gerisi kafeste. 🙏"),
  ],
  taraftar: [
    L("{takipci} kişi! İnanılmaz. Her birinize teşekkür ederim. ❤️"),
    L("Maç gecesi tribünler yine bizim olsun! Kim geliyor? 🙌"),
    L("Bir taraftarım bugün bana el yazısı mektup verdi. Ağladım. 🥹"),
    L("{memleket}, bu zafer senin için!"),
    L("Sorularınızı yazın, en iyilerini bu akşam cevaplayacağım. 👇"),
    L("Bu yolculukta yanımda olan herkese: sizin sayenizde buradayım."),
  ],
  motivasyon: [
    L("Kimse sana inanmasa da sen kendine inan. 💯"),
    L("Ter antrenmanda akar ki kan kafeste akmasın."),
    L("Düştüğün yer değil, kalktığın yer seni tanımlar."),
    L("Bugün acı, yarın zafer. 🔥"),
    L("Yetenek başlatır, disiplin bitirir."),
    L("Her sabah aynı soru: bugün dünden daha iyi miyim?"),
    L("Kolay olsaydı herkes şampiyon olurdu."),
  ],
  yasam: [
    L("Bugün dinlenme günü. Ailemle kahvaltı. Savaşçılar da insan. ❤️"),
    L("Yeni tatlı yasak listesi: hepsi. 🍰❌"),
    L("Bir kahve, biraz müzik, sonra tekrar salon. ☕🎧"),
    L("Hayatımda iki şey var: kafes ve sevdiklerim."),
  ],
  sponsor: [
    L("{sponsor} ile yola devam! Teşekkürler ekip. 🤝"),
    L("Maç gecesi {sponsor} logosuyla kafesteyim. 💪"),
    L("{sponsor} ailesine katılmak gurur verici. Birlikte zirveye!"),
  ],
  soru: [
    L("Soru: sıradaki maçımı nakavtla mı bitireyim, submission ile mi? 👇"),
    L("Sizce sıklette en tehlikeli isim kim? Yorumlara yazın."),
    L("Tüm zamanların en iyisi kim sizce? Tartışalım. 🐐"),
    L("Maç gecesi hangi şarkıyla çıkayım? Önerilere açığım. 🎵"),
    L("Hangi rakiple dövüşmemi istersiniz? En çok beğenilen yorumu {org}’a ileteceğim."),
  ],
};

function contextVars(s: GameState) {
  const opp = s.pending.rakip;
  const champ = s.bolum?.sampiyon;
  const sponsor = (s.sponsorlar ?? [])[0];
  return {
    rakip: opp ? opp.soyad : s.bolum?.liste[0]?.soyad ?? L("sıradaki rakibim"),
    sampiyon: s.sampiyon ? L("Herkes") : champ ? `${champ.ad} ${champ.soyad}` : L("Şampiyon"),
    org: ORGS[currentOrg(s)].kisa,
    hoca: s.takim.antrenor,
    salon: s.takim.salon,
    memleket: s.fighter.memleket,
    takipci: fmtFollowers(followers(s)),
    sponsor: sponsor ? brandById(sponsor.marka)?.ad ?? 'sponsorum' : 'sponsorum',
    n: String(((s.pending.kamp?.kampIdx ?? 0) || 1)),
  };
}

/** Son maça göre dinamik cümleler. */
function resultIdeas(s: GameState): string[] {
  const g = s.gecmis[0];
  if (!g) return [L("İlk maçım yaklaşıyor. Kalbim çarpıyor ama ellerim titremiyor. 🥊")];
  if (g.sonuc === 'G')
    return [
      L("{0} karşısında {1} ile kazandım! Sıradaki kim? 🔥", [g.rakip, g.yontem]),
      L("{0}. rauntta işi bitirdim. Hazırlık konuşur. 💪", [g.raunt]),
      L("Bir galibiyet daha: {0}-{1}. Durmak yok.", [s.rekor.g, s.rekor.m]),
      L("{0}’e saygılar, zorlu bir maçtı. Ama bu gece benimdi. 🤝", [g.rakip]),
      L("Yüzümde morluk, kalbimde zafer. Teşekkürler herkese! ❤️"),
    ];
  if (g.sonuc === 'M')
    return [
      L("Bu gece o daha iyiydi. Salona dönüyorum, daha güçlü geleceğim."),
      L("{0}’i tebrik ederim. Rövanşı istiyorum. 🔁", [g.rakip]),
      L("Düştüm. Kalkacağım. Her zaman olduğu gibi."),
      L("Hakem kararlarına saygı duyuyorum ama katılmıyorum. Devam. ✊"),
      L("Mesajlarınız için teşekkürler. Bu yenilgi hikâyemin sonu değil."),
    ];
  return [L("Beraberlik kimseyi mutlu etmez. Rövanş olmalı!"), L("{0} ile işimiz bitmedi.", [g.rakip])];
}

/** Yaşam tarzına göre ek cümleler (araba, ev, sevgili, evcil hayvan…). */
function lifeIdeas(s: GameState): string[] {
  const out: string[] = [];
  const inv = s.envanter ?? [];
  if (inv.some((i) => /^araba\d/.test(i))) out.push(L("Yeni oyuncağımla antrenmana gidiyorum. 🏎️"), L("Garaja bir tane daha eklendi. Emeğin karşılığı. 🔑"));
  if (inv.some((i) => /^ev\d/.test(i))) out.push(L("Yeni evimden manzara. Çocukken hayalini bile kuramazdım. 🏡"));
  if (inv.includes('yat') || inv.includes('tekne')) out.push(L("Denizde bir gün. Kafa dinliyoruz. ⛵"));
  if (inv.includes('jet')) out.push(L("Kamp için özel jetle yola çıktık. ✈️"));
  if (s.iliski) out.push(L("{0} olmasa bu kamp çekilmezdi. ❤️", [s.iliski.ad]), L("Hafta sonu planı: sadece ikimiz. 💞"));
  (s.hayvanlar ?? []).slice(0, 2).forEach((p) => out.push(L("{0} bugün benden daha çok antrenman yaptı. 🐾", [p.ad]), L("Kampın maskotu {0}. 🐶", [p.ad])));
  if ((s.kemerler ?? []).some((b) => b.aktif)) out.push(L("Kemer uyurken bile yanımda. 🏆"), L("Sabah kahvesi, kemer ve ben. ☕🏆"));
  return out;
}

export function postIdeas(s: GameState, kat: IdeaKat, tur: number): string[] {
  const v = contextVars(s);
  let pool = kat === 'sonuc' ? resultIdeas(s) : kat === 'yasam' ? [...lifeIdeas(s), ...POOL.yasam] : POOL[kat];
  if (kat === 'sponsor' && !(s.sponsorlar ?? []).length) pool = [L("Sponsor arıyorum: ciddi teklifler DM’den. 📩"), L("Markalar, bu enerjiyi kaçırmayın. 👀")];
  // "Yenile" ile her seferinde farklı 4 öneri
  const start = (tur * 4) % Math.max(1, pool.length);
  const out: string[] = [];
  for (let i = 0; i < Math.min(4, pool.length); i++) out.push(fill(pool[(start + i) % pool.length], v));
  return out;
}
