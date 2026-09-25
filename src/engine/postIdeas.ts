// Oyuncunun paylaşım önerileri: kariyer durumuna göre (rakip, kemer, son maç, yaşam) değişen, kategorili ve geniş havuz.
import { ORGS } from './data';
import { currentOrg } from './character';
import { fmtFollowers, followers } from './fame';
import { fill } from './rng';
import { brandById } from './sponsors';
import type { GameState } from './types';

export type IdeaKat = 'kamp' | 'trash' | 'saygi' | 'taraftar' | 'motivasyon' | 'yasam' | 'meydan' | 'sonuc' | 'sponsor' | 'soru';

export const IDEA_KATS: { id: IdeaKat; ad: string; ikon: string }[] = [
  { id: 'kamp', ad: 'Kamp', ikon: 'dumbbell' },
  { id: 'trash', ad: 'Trash talk', ikon: 'fire' },
  { id: 'meydan', ad: 'Meydan oku', ikon: 'sword-cross' },
  { id: 'sonuc', ad: 'Son maç', ikon: 'trophy-outline' },
  { id: 'saygi', ad: 'Saygı', ikon: 'handshake' },
  { id: 'taraftar', ad: 'Taraftar', ikon: 'account-heart' },
  { id: 'motivasyon', ad: 'Motivasyon', ikon: 'lightning-bolt' },
  { id: 'yasam', ad: 'Yaşam', ikon: 'sunglasses' },
  { id: 'sponsor', ad: 'Sponsor', ikon: 'briefcase' },
  { id: 'soru', ad: 'Soru', ikon: 'help-circle-outline' },
];

const POOL: Record<IdeaKat, string[]> = {
  kamp: [
    'Kampın {n}. haftası. Ciğerler yanıyor ama zihin berrak. 🥊',
    'Sabah 5’te koşu, öğlen spar, akşam grappling. {rakip}, ben hazırım. #Kamp',
    '{hoca} bugün beni yere serdi. Kafeste kimse bunu yapamayacak. 😤',
    'Yeni bir silah geliştiriyoruz. Maç gecesi göreceksiniz… 🤫',
    'Kilo kontrolde, zihin net. {rakip} gelsin.',
    '{salon}’da bir gece daha. Işıklar sönene kadar buradayım. 💡',
    'Bugün 10 raunt spar. Yoruldum ama durmadım.',
    'Video analiz günü: {rakip}’in her hareketini ezberliyorum. 🎬',
    'Buz banyosu, masaj, uyku. Savaşçı dinlenmeyi de bilir. 🧊',
    'Kamp güncellemesi: sağlıklı, aç ve tehlikeli. 🐺',
  ],
  trash: [
    '{rakip} kafeste beni görünce kaçacak yer arayacak. 😂',
    '{rakip}, sosyal medyada çok cesursun. Kafeste görüşürüz.',
    'Bu gece {rakip} uyumayacak. Çünkü maç gecesi uyutacağım. 💤',
    '{rakip} diye bir dövüşçü yok, sadece bir sonraki kurbanım var.',
    '{rakip} hayranları, şimdiden mendilleri hazırlayın. 🤧',
    '{rakip}’in çenesi o kadar dayanıklı değil, herkes biliyor.',
    'Kamera önünde herkes aslan. Kafes kapısı kapanınca görürüz {rakip}.',
    '{rakip}, hazır ol. Kariyerinin en kötü gecesi yaklaşıyor.',
    'Söylediklerimin arkasındayım: {rakip} bu maçı bitiremeyecek.',
  ],
  meydan: [
    '{sampiyon}, kemerini hazırla. Geliyorum. 🏆',
    '{sampiyon} benden kaçıyor. {org}, bu maçı yapın!',
    'Sıklette kimse benimle dövüşmek istemiyor. Sıradaki kim? 👀',
    '{sampiyon}, tahtında rahat oturma. Sıra bende.',
    'İlk 5’e giren herkese açık davet: kafeste görüşelim.',
    '{org}, bana bir şampiyonluk maçı borçlusunuz. Hak ettim.',
    'Adımı unutmayın. Yakında o kemer bende olacak.',
  ],
  sonuc: [],
  saygi: [
    '{rakip} gerçek bir savaşçı. Maç gecesi en iyi hâlimizle karşılaşacağız. 🤝',
    'Rakibime saygım sonsuz. Ama kazanan ben olacağım.',
    '{hoca} ve tüm takımıma teşekkürler. Bu yol tek başına yürünmez.',
    'Sıklette herkes çok çalışıyor. Bu yüzden bu spor güzel.',
    'Yenildiğim her maç bana bir şey öğretti. Hepsine minnettarım.',
    'Rakiplerime saygı, taraftarlara sevgi. Gerisi kafeste. 🙏',
  ],
  taraftar: [
    '{takipci} kişi! İnanılmaz. Her birinize teşekkür ederim. ❤️',
    'Maç gecesi tribünler yine bizim olsun! Kim geliyor? 🙌',
    'Bir taraftarım bugün bana el yazısı mektup verdi. Ağladım. 🥹',
    '{memleket}, bu zafer senin için!',
    'Sorularınızı yazın, en iyilerini bu akşam cevaplayacağım. 👇',
    'Bu yolculukta yanımda olan herkese: sizin sayenizde buradayım.',
  ],
  motivasyon: [
    'Kimse sana inanmasa da sen kendine inan. 💯',
    'Ter antrenmanda akar ki kan kafeste akmasın.',
    'Düştüğün yer değil, kalktığın yer seni tanımlar.',
    'Bugün acı, yarın zafer. 🔥',
    'Yetenek başlatır, disiplin bitirir.',
    'Her sabah aynı soru: bugün dünden daha iyi miyim?',
    'Kolay olsaydı herkes şampiyon olurdu.',
  ],
  yasam: [
    'Bugün dinlenme günü. Ailemle kahvaltı. Savaşçılar da insan. ❤️',
    'Yeni tatlı yasak listesi: hepsi. 🍰❌',
    'Bir kahve, biraz müzik, sonra tekrar salon. ☕🎧',
    'Hayatımda iki şey var: kafes ve sevdiklerim.',
  ],
  sponsor: [
    '{sponsor} ile yola devam! Teşekkürler ekip. 🤝',
    'Maç gecesi {sponsor} logosuyla kafesteyim. 💪',
    '{sponsor} ailesine katılmak gurur verici. Birlikte zirveye!',
  ],
  soru: [
    'Soru: sıradaki maçımı nakavtla mı bitireyim, submission ile mi? 👇',
    'Sizce sıklette en tehlikeli isim kim? Yorumlara yazın.',
    'Tüm zamanların en iyisi kim sizce? Tartışalım. 🐐',
    'Maç gecesi hangi şarkıyla çıkayım? Önerilere açığım. 🎵',
    'Hangi rakiple dövüşmemi istersiniz? En çok beğenilen yorumu {org}’a ileteceğim.',
  ],
};

function contextVars(s: GameState) {
  const opp = s.pending.rakip;
  const champ = s.bolum?.sampiyon;
  const sponsor = (s.sponsorlar ?? [])[0];
  return {
    rakip: opp ? opp.soyad : s.bolum?.liste[0]?.soyad ?? 'sıradaki rakibim',
    sampiyon: s.sampiyon ? 'Herkes' : champ ? `${champ.ad} ${champ.soyad}` : 'Şampiyon',
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
  if (!g) return ['İlk maçım yaklaşıyor. Kalbim çarpıyor ama ellerim titremiyor. 🥊'];
  if (g.sonuc === 'G')
    return [
      `${g.rakip} karşısında ${g.yontem} ile kazandım! Sıradaki kim? 🔥`,
      `${g.raunt}. rauntta işi bitirdim. Hazırlık konuşur. 💪`,
      `Bir galibiyet daha: ${s.rekor.g}-${s.rekor.m}. Durmak yok.`,
      `${g.rakip}’e saygılar, zorlu bir maçtı. Ama bu gece benimdi. 🤝`,
      'Yüzümde morluk, kalbimde zafer. Teşekkürler herkese! ❤️',
    ];
  if (g.sonuc === 'M')
    return [
      'Bu gece o daha iyiydi. Salona dönüyorum, daha güçlü geleceğim.',
      `${g.rakip}’i tebrik ederim. Rövanşı istiyorum. 🔁`,
      'Düştüm. Kalkacağım. Her zaman olduğu gibi.',
      'Hakem kararlarına saygı duyuyorum ama katılmıyorum. Devam. ✊',
      'Mesajlarınız için teşekkürler. Bu yenilgi hikâyemin sonu değil.',
    ];
  return ['Beraberlik kimseyi mutlu etmez. Rövanş olmalı!', `${g.rakip} ile işimiz bitmedi.`];
}

/** Yaşam tarzına göre ek cümleler (araba, ev, sevgili, evcil hayvan…). */
function lifeIdeas(s: GameState): string[] {
  const out: string[] = [];
  const inv = s.envanter ?? [];
  if (inv.some((i) => /^araba\d/.test(i))) out.push('Yeni oyuncağımla antrenmana gidiyorum. 🏎️', 'Garaja bir tane daha eklendi. Emeğin karşılığı. 🔑');
  if (inv.some((i) => /^ev\d/.test(i))) out.push('Yeni evimden manzara. Çocukken hayalini bile kuramazdım. 🏡');
  if (inv.includes('yat') || inv.includes('tekne')) out.push('Denizde bir gün. Kafa dinliyoruz. ⛵');
  if (inv.includes('jet')) out.push('Kamp için özel jetle yola çıktık. ✈️');
  if (s.iliski) out.push(`${s.iliski.ad} olmasa bu kamp çekilmezdi. ❤️`, 'Hafta sonu planı: sadece ikimiz. 💞');
  (s.hayvanlar ?? []).slice(0, 2).forEach((p) => out.push(`${p.ad} bugün benden daha çok antrenman yaptı. 🐾`, `Kampın maskotu ${p.ad}. 🐶`));
  if ((s.kemerler ?? []).some((b) => b.aktif)) out.push('Kemer uyurken bile yanımda. 🏆', 'Sabah kahvesi, kemer ve ben. ☕🏆');
  return out;
}

export function postIdeas(s: GameState, kat: IdeaKat, tur: number): string[] {
  const v = contextVars(s);
  let pool = kat === 'sonuc' ? resultIdeas(s) : kat === 'yasam' ? [...lifeIdeas(s), ...POOL.yasam] : POOL[kat];
  if (kat === 'sponsor' && !(s.sponsorlar ?? []).length) pool = ['Sponsor arıyorum: ciddi teklifler DM’den. 📩', 'Markalar, bu enerjiyi kaçırmayın. 👀'];
  // "Yenile" ile her seferinde farklı 4 öneri
  const start = (tur * 4) % Math.max(1, pool.length);
  const out: string[] = [];
  for (let i = 0; i < Math.min(4, pool.length); i++) out.push(fill(pool[(start + i) % pool.length], v));
  return out;
}
