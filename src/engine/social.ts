// Sosyal medya: dövüşçüler atışır, taraftarlar yorum yapar, maçların hikâyesi yazılır.
import { fullName, statAverage } from './character';
import { bump } from './istat';
import { BACKGROUNDS, COUNTRIES, JOURNALISTS, ORGS } from './data';
import { currentOrg } from './character';
import { chance, clamp, fill, pick, randInt, uid } from './rng';
import type { GameState, Opponent, Post } from './types';
import { followers, npcFollowers } from './fame';

const MAX_POSTS = 60;

const slug = (t: string) =>
  t
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .normalize('NFD')
    .replace(/[^a-z0-9]/g, '');

export const handleOf = (ad: string, soyad: string) => `@${slug(ad)}${slug(soyad)}`.slice(0, 20);
export const playerHandle = (s: GameState) => handleOf(s.fighter.ad, s.fighter.soyad);
const oppHandle = (o: Opponent) => handleOf(o.ad, o.soyad);

/** Dövüşçünün paylaşımı kendi takipçisine göre beğeni alır. */
const npcLikes = (s: GameState, o: Opponent) => Math.round(npcFollowers(s, o) * 0.03 * (0.5 + Math.random()));

/** Beğeni sayısı takipçiye göre: büyüdükçe paylaşımların da büyür. */
function likes(s: GameState, base = 1) {
  return Math.round((10 + followers(s) * 0.035) * base * (0.5 + Math.random()));
}

export function addPost(s: GameState, p: Omit<Post, 'id' | 'hafta' | 'begeni'> & { begeni?: number }) {
  s.sosyal = s.sosyal ?? [];
  s.sosyal.unshift({ id: uid(), hafta: s.hafta, begeni: p.begeni ?? likes(s, 0.3), ...p });
  s.sosyal = s.sosyal.slice(0, MAX_POSTS);
}

// ---------- Şablonlar ----------

const TRASH_PRE = [
  '{ph} ile aynı kafese girmek için sabırsızlanıyorum. Sabırsızlığım onun korkusundan büyük. 😈',
  'Kamp raporu: {ph} dövüşünü 100 kez izledim. Açığını buldum. Sürpriz olmayacak.',
  'Bahis tavsiyesi: {ph} aleyhine her şeyinizi yatırın. 💰',
  '{ph}’ın hocası bile bu maçı kabul ettiği için ona kızıyormuş. 😂',
  'Tartıda göz göze geleceğiz {ph}. Gözlerini kaçırma.',
  '{ph} sıkletin en abartılı ismi. {hafta} hafta sonra balon patlıyor. 🎈',
  '{ph} mi? {org}’da bana verilen en kolay maç bu. {hafta} hafta sonra görürüz.',
  '{ph} kafeste görüşürüz. Hastane masrafını ben öderim, merak etme.',
  'Çenen cam gibi {p}. İlk sağ elimde dağılacak.',
  '{ph} sosyal medyada çok cesur. Bakalım kafes kapısı kapanınca da öyle mi?',
  'Herkes {p} diyor… Ben kimseyi görmüyorum. 🥱',
  '{ph} taraftarlarına söyleyin, mendillerini hazırlasınlar.',
];
const RESPECT_PRE = [
  '{ph} kariyerini takip ediyorum, ciddi bir yetenek. Ama bu gece benim gecem olacak.',
  'Bu maç ikimiz için de büyük fırsat. {ph}, sağlıklı bir kamp dilerim.',
  '{ph} ile dövüşmek onur. Hazırlığım tam, en iyi hâlimle geleceğim.',
  'Saygı duyduğum bir rakip: {ph}. Ama kazanan ben olacağım.',
  'Kamp bitti. {ph}, iyi bir savaş olsun. 🤝',
];
const OPP_WON = [
  '{ph} söylemiştim. Sıradaki! 👋',
  'Bu gece bir şey kanıtladım. {ph}, iyi dövüştün ama yeterli değildi.',
  'Kemer yolu devam ediyor. {ph} sadece bir basamaktı.',
];
const OPP_LOST_GOOD = ['{ph} bu gece daha iyiydi. Tebrikler şampiyon adayı. Geri döneceğim.', 'Ders aldım. {ph} gerçek bir savaşçı. 🤝'];
const OPP_LOST_BAD = ['Hakemler bu gece beni soydu. {ph} bunu biliyor.', 'Şanslı yumruktu {ph}. Rövanşta gerçeği göreceksin.', 'Tek kelime: RÖVANŞ. {ph} kaçmasın.'];

const FAN_WIN = [
  '{p} maçını 5. kez izliyorum, hâlâ doyamadım 🔥',
  'Babam 40 yıldır maç izler, “böylesini görmedim” dedi.',
  'Bu adamın posteri odamda artık 🥊',
  '{p} sıkletin geleceği değil, bugünü!',
  'O kombinasyon ne öyle?! Geri sar, geri sar!',
  'Salon arkadaşlarımla izledik, ortalık yıkıldı 😂',
  '{p} geleceğin şampiyonu!! 🔥🔥',
  'Bu adamı izlemek bir zevk. Kemer an meselesi.',
  '{memleket} gurur duyuyor! 🇹🇷💪',
  'Az önce {p} maçını izledim, tüylerim diken diken.',
  'Bir sonraki maçına bilet alıyorum, kimse beni durduramaz.',
];
const FAN_LOSS = [
  'Oyun planı felaketti. Hoca değişmeli.',
  'Kötü gün herkesin başına gelir. {p} döner.',
  'Bu kadar hype’a bu performans mı? 🤡',
  '{p} kampta tatil mi yaptı acaba?',
  'Kafam hâlâ inanmıyor ya… ❤️‍🩹',
  '{p} abartılıyormuş, belli oldu.',
  'Üzülme {p}, büyük şampiyonlar da kaybeder. Kalk ayağa! ❤️',
  'Kamp değişmeli. Bu oyun planı neydi?',
  'Hâlâ arkandayız {p}. 💪',
];
const FAN_TRASH_OK = ['HAHAHA efsane 😂🔥', 'Bu adamın ağzı da yumrukları kadar sert!', 'Gerilim tırmanıyor, bu maçı kaçırmam!'];
const FAN_TRASH_BAD = ['Önce bir kemer al, sonra konuş.', 'Çok konuşan az dövüşür.', 'Bu biraz fazlaydı…'];
const FAN_RESPECT = ['Saygılı sporcu = gerçek sporcu 👏', 'Bu yüzden seviyoruz seni {p}.', 'Klas bir hareket.'];
const FAN_NEUTRAL = ['👊', 'Kampa odaklan şampiyon!', 'Yeni video ne zaman?', '🔥🔥🔥'];

const TRASH_WORDS = ['korkak', 'kaçıyor', 'kaçma', 'ezece', 'yenerim', 'yok ederim', 'uyut', 'bitir', 'sahtekar', 'abartıl', 'zayıf', 'hastane', 'dağıt', 'gömece', 'çöp', 'ağlat', 'döverim', 'sıradaki sen', 'hazır ol', 'boş konuş', 'kemerini al'];
const RESPECT_WORDS = ['saygı', 'teşekkür', 'onur', 'tebrik', 'iyi dövüş', 'helal', 'başarılar', 'minnettar', 'değerli', '🤝', 'büyük savaşçı'];

// ---------- Maç hikâyeleri ----------

function storyFor(s: GameState, o: Opponent): string {
  const p = fullName(s.fighter);
  const on = `${o.ad} “${o.lakap}” ${o.soyad}`;
  const org = ORGS[currentOrg(s)].kisa;
  const striker = (b: string) => ['boks', 'muaythai', 'kickboks', 'kyokushin', 'sokak'].includes(b);
  const favori = statAverage(s.fighter.stats) >= statAverage(o.stats) ? s.fighter.soyad : o.soyad;
  if (o.sonSonuc === 'M') return `🔥 İNTİKAM GECESİ: ${p}, kendisini yenen ${on} karşısında. İlk maç ${o.soyad} lehine bitmişti. Bu sefer?`;
  if (o.sonSonuc) return `🔁 RÖVANŞ: ${p} ve ${on} yeniden karşı karşıya. İlk maçın galibi ${s.fighter.soyad}. Tarih tekerrür eder mi?`;
  if (o.champion) return `🏆 KEMER SAVAŞI: ${org} şampiyonu ${on}, tahtını yükselen isim ${p}’ye karşı koruyor. 5 raunt, tek kemer.`;
  if (s.sampiyon) return `🏆 UNVAN SAVUNMASI: Şampiyon ${p}, aç kurt ${on} karşısında. Kemer el değiştirir mi?`;
  if (s.seri >= 3) return `📈 YENİLMEZLİK SERİSİ: ${p} ${s.seri} maçtır kaybetmiyor. ${on} bu seriyi bitirecek kişi olabilir mi?`;
  if (striker(s.fighter.gecmis) !== striker(o.stil))
    return `⚔️ STİL SAVAŞI: ${BACKGROUNDS[s.fighter.gecmis].ad} ustası ${p} vs ${BACKGROUNDS[o.stil].ad} uzmanı ${on}. Vuruşçu mu kazanır, güreşçi mi?`;
  if (o.kisilik === 'Trash talk ustası' || o.kisilik === 'Kibirli')
    return `🎤 SÖZ SAVAŞI: ${on} haftalardır ${p} hakkında konuşuyor. Kafeste sözlerin bedeli ödenecek.`;
  return `📰 ${org} bu hafta: ${p} vs ${on}. Bahisçiler ${favori} tarafını favori görüyor.`;
}

// ---------- Olay tetikleyicileri ----------

/** Kamp başında: maçın hikâyesi, rakibin paylaşımı, taraftar yorumu. */
export function socialCampStart(s: GameState) {
  const o = s.pending.rakip;
  if (!o) return;
  const vars = { p: s.fighter.soyad, ph: playerHandle(s), org: ORGS[currentOrg(s)].kisa, hafta: s.pending.kamp?.hafta ?? 8 };
  addPost(s, { yazar: pick(JOURNALISTS).split(' (')[0], kullanici: '@kafespostasi', tur: 'hikaye', metin: storyFor(s, o), begeni: likes(s, 0.8) });
  const trashy = ['Trash talk ustası', 'Kibirli', 'Öfkeli', 'Şovmen'].includes(o.kisilik);
  addPost(s, {
    yazar: `${o.ad} ${o.soyad}`,
    kullanici: oppHandle(o),
    tur: 'dovuscu',
    metin: fill(pick(trashy ? TRASH_PRE : RESPECT_PRE), vars),
    hedefId: o.id,
    renk: trashy ? '#e63946' : '#3a86ff',
    begeni: likes(s, trashy ? 0.7 : 0.3),
  });
}

/** Dövüş sonrası: basın, rakibin tepkisi, taraftarlar ve sıklette başka atışmalar. */
export function socialAfterFight(s: GameState, o: Opponent, won: boolean, draw: boolean, yontem: string, divNotes: string[]) {
  const vars = { p: s.fighter.soyad, ph: playerHandle(s), memleket: s.fighter.memleket };
  const sonuc = draw ? 'berabere kaldı' : won ? `${yontem} ile kazandı` : `${yontem} ile kaybetti`;
  addPost(s, { yazar: 'MMA Türkiye', kullanici: '@mmaturkiye', tur: 'medya', metin: `SON DAKİKA: ${fullName(s.fighter)}, ${o.ad} ${o.soyad} karşısında ${sonuc}.`, begeni: likes(s, 0.6) });
  const kotu = ['Trash talk ustası', 'Kibirli', 'Öfkeli'].includes(o.kisilik);
  addPost(s, {
    yazar: `${o.ad} ${o.soyad}`,
    kullanici: oppHandle(o),
    tur: 'dovuscu',
    metin: fill(pick(won ? (kotu ? OPP_LOST_BAD : OPP_LOST_GOOD) : OPP_WON), vars),
    hedefId: o.id,
    renk: won && kotu ? '#e63946' : '#3a86ff',
  });
  for (let i = randInt(1, 2); i > 0; i--)
    addPost(s, { yazar: pick(['Kafes Aşığı', 'Nakavt Nuri', 'MMA Ultras', 'Tribün Kaplanı', 'Octagon Oğuz', 'Ringside Rüya']), kullanici: `@taraftar${randInt(10, 999)}`, tur: 'taraftar', metin: fill(pick(won ? FAN_WIN : FAN_LOSS), vars) });
  divNotes.forEach((n) => addPost(s, { yazar: `${ORGS[currentOrg(s)].kisa} Resmi`, kullanici: `@${slug(ORGS[currentOrg(s)].kisa)}`, tur: 'organizasyon', metin: n.replace(/^\S+\s/, '') }));
  if (s.bolum && s.bolum.liste.length > 3 && chance(0.5)) npcFeud(s);
}

/** Sıklette iki dövüşçü birbirine sallar: arka plan hikâyesi. */
function npcFeud(s: GameState) {
  const b = s.bolum!;
  const i = randInt(0, b.liste.length - 2);
  const a = b.liste[i];
  const c = b.liste[i + 1];
  const vars = { a: oppHandle(a), c: oppHandle(c), cs: c.soyad, as: a.soyad };
  const lines = [
    ['{c} sıralamada benim arkamda kalmaya alışsın. 😂', '{a} konuşacağına kafese gel. Tarih ver, oradayım.'],
    ['{c} en son ne zaman bitirdin birini? Kimse hatırlamıyor.', '{a} bitirmek için önce ayakta kalman lazım. Kolay gelsin.'],
    ['Organizasyon beni {c} ile eşleştirsin. 90 saniye yeter.', '{a} 90 saniye mi? Sen o sürede nefesini bile toparlayamazsın.'],
  ];
  const [x, y] = pick(lines);
  addPost(s, { yazar: `${a.ad} ${a.soyad}`, kullanici: oppHandle(a), tur: 'dovuscu', metin: fill(x, vars), renk: '#f2c14e' });
  addPost(s, { yazar: `${c.ad} ${c.soyad}`, kullanici: oppHandle(c), tur: 'dovuscu', metin: fill(y, vars), renk: '#f2c14e' });
}

// ---------- Oyuncu paylaşımları ----------

function findMention(s: GameState, text: string): Opponent | null {
  const t = text.toLocaleLowerCase('tr-TR');
  const pool: Opponent[] = [...s.rakipler, ...(s.bolum?.liste ?? []), ...(s.bolum?.sampiyon ? [s.bolum.sampiyon] : []), ...(s.pending.rakip ? [s.pending.rakip] : [])];
  return (
    pool.find(
      (o) =>
        t.includes(o.soyad.toLocaleLowerCase('tr-TR')) ||
        t.includes(o.lakap.toLocaleLowerCase('tr-TR')) ||
        t.includes(oppHandle(o)),
    ) ?? null
  );
}

export function playerPost(s: GameState, text: string): string {
  const metin = text.trim().slice(0, 280);
  if (!metin) return 'Boş bir paylaşım yapamazsın.';
  bump(s, 'gonderi');
  const t = metin.toLocaleLowerCase('tr-TR');
  const trash = TRASH_WORDS.some((w) => t.includes(w));
  const respect = RESPECT_WORDS.some((w) => t.includes(w));
  const target = findMention(s, metin);
  const recent = (s.sosyal ?? []).filter((p) => p.tur === 'oyuncu' && p.hafta === s.hafta).length;
  const vars = { p: s.fighter.soyad, ph: playerHandle(s), memleket: s.fighter.memleket };
  let sonuc = '';
  let pop = 0;

  if (recent >= 3) {
    pop = -1;
    sonuc = 'Aynı hafta içinde çok fazla paylaşım yaptın. Takipçiler bıkmaya başladı.';
  } else if (trash) {
    const ok = chance(0.45 + s.fighter.stats.iq / 300 + s.populerlik / 300);
    pop = ok ? (target ? 4 : 2) : -2;
    sonuc = ok ? 'Paylaşımın patladı! Herkes bundan bahsediyor.' : 'Laf sokman ters tepti. Yorumlar pek hoş değil.';
    if (target) {
      const r = s.rakipler.find((x) => x.id === target.id);
      if (r) r.rivalry++;
      if (ok && s.bolum?.liste.some((x) => x.id === target.id) && chance(0.35)) {
        s.cagri = target.id;
        sonuc += ` ${ORGS[currentOrg(s)].kisa} bu atışmayı fark etti; ${target.soyad} ile maç gündemde!`;
      }
    }
  } else if (respect) {
    pop = 1;
    sonuc = 'Saygılı tavrın takdir topladı.';
  } else {
    pop = chance(0.5) ? 1 : 0;
    sonuc = 'Takipçilerin paylaşımını beğendi.';
  }
  s.populerlik = clamp(s.populerlik + pop, 0, 100);

  const yanitlar: { yazar: string; metin: string }[] = [];
  if (target) {
    const kotu = ['Trash talk ustası', 'Kibirli', 'Öfkeli', 'Şovmen'].includes(target.kisilik);
    const cevap = trash
      ? pick(kotu ? ['Klavye savaşçısı. Kafeste görüşürüz {ph}.', '{ph} önce sıralamada yukarı çık, sonra konuşuruz.', 'Seni gördüğüm yerde uyuturum {ph}. 😴'] : ['Konuşmak kolay {ph}. Ben kafeste cevap veririm.', '{ph} bu tavrı yakıştıramadım.'])
      : respect
        ? pick(['Karşılıklı saygı 🤝 {ph}', 'Teşekkürler kardeşim, başarılar.'])
        : pick(['👀', '{ph} ne demek istiyorsun?']);
    yanitlar.push({ yazar: `${target.ad} ${target.soyad}`, metin: fill(cevap, vars) });
  }
  yanitlar.push({ yazar: pick(['Kafes Aşığı', 'MMA Ultras', 'Tribün Kaplanı']), metin: fill(pick(trash ? (pop > 0 ? FAN_TRASH_OK : FAN_TRASH_BAD) : respect ? FAN_RESPECT : FAN_NEUTRAL), vars) });

  addPost(s, { yazar: fullName(s.fighter), kullanici: playerHandle(s), tur: 'oyuncu', metin, begeni: likes(s, pop > 0 ? 1 : 0.4), yanitlar, renk: '#e63946' });
  return `${sonuc}${pop ? ` (Popülerlik ${pop > 0 ? '+' : ''}${pop})` : ''}`;
}

export const REPLY_TONES = [
  { key: 'sert', ad: 'Sert cevap', ikon: 'fire' },
  { key: 'espri', ad: 'Esprili geç', ikon: 'emoticon-lol-outline' },
  { key: 'saygi', ad: 'Saygılı ol', ikon: 'handshake' },
] as const;

/** Bir dövüşçünün paylaşımına yanıt ver. */
export function replyToPost(s: GameState, postId: string, tone: 'sert' | 'espri' | 'saygi'): string {
  const post = s.sosyal?.find((p) => p.id === postId);
  if (!post || post.yanitlandi) return '';
  post.yanitlandi = true;
  const r = s.rakipler.find((x) => x.id === post.hedefId);
  const ad = post.yazar.split(' ').slice(-1)[0];
  let metin: string;
  let pop: number;
  let sonuc: string;
  if (tone === 'sert') {
    const ok = chance(0.55 + s.populerlik / 250);
    pop = ok ? 3 : -2;
    if (r) r.rivalry++;
    metin = pick([`${ad}, kafeste bu kadar konuşkan olmayacaksın.`, `${ad} yazdığın her kelimeyi yumruk olarak geri alacaksın.`, `Tarih ver ${ad}. Gerisi laf.`]);
    sonuc = ok ? 'Cevabın viral oldu, rekabet kızıştı!' : 'Cevabın biraz fazla kaçtı, eleştiri aldın.';
  } else if (tone === 'espri') {
    pop = chance(0.6) ? 2 : 0;
    metin = pick([`${ad} güzel yazmışsın, kim yazdı? 😂`, `${ad} klavyede şampiyon olmuşsun, tebrikler 🏆⌨️`, `Tamam ${ad}, maç günü görüşürüz. Kaçmazsan. 😏`]);
    sonuc = pop ? 'Esprin çok beğenildi.' : 'Espri pek tutmadı.';
  } else {
    pop = 1;
    if (r) r.rivalry = Math.max(0, r.rivalry - 1);
    metin = pick([`Saygılar ${ad}. Kafeste en iyimizi görelim.`, `${ad}, iyi bir savaş olacak. 🤝`]);
    sonuc = 'Olgun tavrın takdir topladı.';
  }
  s.populerlik = clamp(s.populerlik + pop, 0, 100);
  post.yanitlar = [...(post.yanitlar ?? []), { yazar: fullName(s.fighter), metin }];
  return `${sonuc}${pop ? ` (Popülerlik ${pop > 0 ? '+' : ''}${pop})` : ''}`;
}

/** Oyuna başlarken ilk paylaşımlar. */
export function socialWelcome(s: GameState) {
  const c = COUNTRIES[s.fighter.uyruk];
  addPost(s, { yazar: s.takim.salon, kullanici: `@${slug(s.takim.salon).slice(0, 16)}`, tur: 'organizasyon', metin: `Salonumuza yeni bir savaşçı katıldı: ${fullName(s.fighter)}. ${c?.ad ?? ''} bu ismi yakında çok duyacak! 🥊` });
}

// ---------- Haftalık akış: kulis, anket, bahis, antrenman, trol ----------

const RUMOR = [
  'KULİS: {org} yönetimi {a} ile {b} maçını ayarlamak üzere. Tarih belli değil.',
  'KULİS: {a} kampında sakatlık yaşadığı konuşuluyor. Takımı yalanlamadı.',
  'KULİS: {p} için birden fazla sponsor teklif hazırlığında.',
  'KULİS: {c} bir sonraki kemer savunmasında sürpriz bir isimle karşılaşabilir.',
  'KULİS: {a} sıklet değiştirmeyi düşünüyor.',
  'KULİS: {b} menajeriyle yollarını ayırdı. Kontrat müzakereleri tıkandı.',
  'KULİS: {org} gelecek ay büyük bir organizasyon için {p} adını listeye yazdı.',
  'KULİS: {a} ve {b} arasında salon kavgası iddiası! Görgü tanıkları konuşuyor.',
  'KULİS: {c} kemeri boşaltmayı düşünüyor mu? Yakın çevresi sessiz.',
  'KULİS: {p} ile ilgilenen bir film yapımcısı olduğu söyleniyor. 🎬',
  'KULİS: {a} doping testinden geçemedi mi? Resmi açıklama bekleniyor.',
  'KULİS: {b} emekliliği düşünüyor. Son maçını memleketinde yapmak istiyor.',
];
const POLL = [
  'ANKET: {a} vs {p} olsa kim kazanır? 🗳️ {a} %{x} · {p} %{y}',
  'ANKET: Sıkletin en iyi vuruşçusu kim? 🗳️ {a} %{x} · {p} %{y}',
  'ANKET: {c} kemeri daha kaç maç tutar? 🗳️ 1-2 maç %{x} · 3+ maç %{y}',
  'ANKET: Yılın nakavtı kimin? 🗳️ {p} %{y} · {b} %{x}',
  'ANKET: {p} ayakta mı daha tehlikeli, yerde mi? 🗳️ Ayakta %{x} · Yerde %{y}',
  'ANKET: {a} trash talk’ta haklı mı? 🗳️ Evet %{x} · Hayır %{y}',
  'ANKET: Sıklette bir sonraki şampiyon kim olur? 🗳️ {p} %{y} · {b} %{x}',
  'ANKET: {org} en iyi maçı hangisiydi? 🗳️ {a} vs {b} %{x} · {p} maçı %{y}',
];
const ANALIZ = [
  '📊 ANALİZ: {p} son maçlarında {stat} istatistiğinde ciddi gelişme gösterdi. Sıklet dikkat!',
  '📊 ANALİZ: {a} takedown savunması sıkletin en iyisi. Güreşçiler için kâbus.',
  '📊 ANALİZ: {c} şampiyonluğunu kaybetmesi için bir “stil” gerekiyor: sabırlı bir kontra dövüşçüsü.',
  '📊 ANALİZ: {p} popülerlik grafiği son 3 ayda dikey çıkışta.',
  '📊 ANALİZ: {b} üçüncü rauntlarda düşüyor. Tempo onu yıkabilir.',
  '📊 ANALİZ: {a} dakikada ortalama 5,2 isabetli vuruş atıyor. Sıklet rekoru.',
  '📊 ANALİZ: {p} maçlarının yarısından fazlasını bitirişle kazandı. Hakemlere iş bırakmıyor.',
  '📊 ANALİZ: {c} son beş maçta hiç yere düşmedi. Çenesi çelik gibi.',
  '📊 ANALİZ: {b} submission savunmasında zayıf. Grappler’lar sıraya girer.',
  '📊 ANALİZ: {p} ile {a} eşleşmesi stil olarak sıkletin en ilginç maçı olur.',
];
const TRAINING = [
  'Sabah 5’te koşu, öğlen sparring, akşam grappling. Tatil yok. 💪 #Kamp',
  'Bugün 12 raunt sparring. Yeni bir silah geliştiriyoruz… 🤫',
  'Kilo kontrolde, zihin net. Kim hazırsa gelsin.',
  'Yeni hocamla ilk hafta. Her şey değişiyor. 🔥',
  'Dinlenme günü. Ailemle kahvaltı. Savaşçılar da insan. ❤️',
  'Tepe koşusu günü. Bacaklar yok ama kalp var. ⛰️',
  'Yoga + nefes çalışması. Kafes bir zihin oyunu. 🧘',
  'Bugün bir gençle spar yaptım, beni çok zorladı. Gelecek parlak!',
  'Buz banyosu sonrası tüm hücrelerim uyandı. 🧊',
  'Yeni bir kombinasyon: jab, düşük tekme, overhand. Sıradaki rakip görecek.',
  'Antrenman bitti, protein zamanı. 🥩',
  'Güreş hocam bugün beni 8 kez yere indirdi. Maç gecesi tersi olacak.',
  'Gece 11’de hâlâ salondayım. Işıkları kapatan son kişi benim.',
  'Kamp bitti. Şimdi sadece ağırlık ve sabır.',
];
const CHAMP_FLEX = [
  'Kemer uyurken bile yanımda. 🏆 Sıradaki kim?',
  'Sıklette herkes birbirine laf atıyor. Ben ise kemerimle kahve içiyorum. ☕🏆',
  'Tahtımı isteyen çok. Hak eden yok.',
  'Kemerin ağırlığını sadece taşıyan bilir. 🏆',
  'Listeye bakıyorum, hepsini daha önce izledim. Sıkıcı. 🥱',
  'Şampiyonluk bir unvan değil, bir yaşam biçimi.',
  'Herkes “sıradaki” olmak istiyor. Önce sıraya girin.',
  'Bir savunma daha, bir tarih daha. 👑',
];
const TROLL = [
  '{p} sosyal medyada daha iyi dövüşüyor 😂',
  '{p}’ın çenesi cam mı plastik mi, tartışalım.',
  'Unpopular opinion: {p} abartılıyor.',
  '{p} fanları bu yorumu beğenmeyecek ama… 🤷',
  '{p} maç gecesi değil, fotoğraf çekiminde parlıyor.',
  'Organizasyon {p}’ı korumak için kolay rakipler buluyor. Kanıtlayamazsınız 😏',
  '{p} bir gün gerçek bir güreşçiyle eşleşirse görürüz.',
  'Benim dedem {p}’dan iyi jab atar 👴🥊',
  '{p} hype makinesi. Değiştirin fikrimi.',
  '{p}’ın kondisyonu 2 raunt, gerisi dua. 🙏',
];
const FAN_ART = [
  '{p} fan çizimim! 🎨 Etiketleyin görsün 🙏',
  '{p} temalı pasta yaptım, nişanıma 🎂🥊',
  'Oğlumun ilk kelimesi “{p}” oldu 😂',
  '{p} dövmesi yaptırdım, sonsuza kadar benimle 🖋️',
  'Okulda “büyüyünce ne olacaksın” dediler, “{p}” dedim. 🥊',
  '{p} maskesiyle cadılar bayramına gittim, herkes tanıdı 🎭',
  'Kedime {p} adını verdim. O da yerde çok iyi 🐱',
  'Mahallede {p} maçını dev ekranda izledik, sokak inledi! 📺',
];
const SPONSOR = [
  '{brand}: Şampiyonların tercihi. Yakında büyük bir isimle anlaşma duyurusu… 👀',
  '{brand} indirimi başladı! Kafes kodu ile %20 🥊',
  '{brand} yeni koleksiyon: kafesten ilham alındı. 🔥',
  'Maç gecesi {brand} standında imza günü! Kaçırmayın.',
  '{brand} ailesi büyüyor. Yeni elçimizi yakında açıklıyoruz. 🤝',
  '{brand}: Ter senin, güç bizden. 💪',
];
const MEME = [
  '{p} tartıya çıkarken vs. kafese girerken 😂 [meme]',
  'Hakemler {a} maçını izlerken: 👀🤡',
  'Ben: diyete başladım. Kamp haftası pizza kokusu: 🍕😭',
  '{p} jab atıyor, rakip: “ne oldu bana?” 😵',
  'Maç gecesi tahmini yapan her uzman: 🧙‍♂️ Maç sonucu: 🤡',
];
const HIGHLIGHT = [
  '🎥 GÜNÜN KLİBİ: {p}’ın son maçındaki o an. 1 milyon izlenmeye koşuyor.',
  '🎥 HAFTANIN EN İYİ 5 BİTİRİŞİ: 3 numara {p}! Sizce birinci olmalı mıydı?',
  '🎥 ARŞİVDEN: {c} şampiyonluğa giden yolda en zor maçı.',
  '🎥 YAVAŞ ÇEKİM: {a}’nın o spinning tekmesi. Fizik kuralları mı?',
];
const ODDS = [
  '💰 BAHİS: {org} yaklaşan kartta {p} favori (1.{x}). Sürpriz arayanlara {b} (2.{y}).',
  '💰 BAHİS: {c} kemer savunmasında 1.{x} ile önde. Uzmanlar temkinli.',
  '💰 BAHİS: Kitaplar {p} maçının bitirişle sonlanmasına 1.{x} veriyor.',
];
const ORG_NEWS = [
  '📢 {org} RESMİ: Gelecek ayın ana kartı açıklandı! {a} vs {b} ana maç.',
  '📢 {org}: Yeni sezon takvimi yayında. Bilet satışları pazartesi başlıyor. 🎟️',
  '📢 {org}: Gecenin Performansı bonusları artırıldı. Bitirin, kazanın!',
  '📢 {org}: Sıralamalar güncellendi. {p} için büyük sıçrama.',
];
const COACH = [
  '{hoca}: “{p} bu kampta hiç olmadığı kadar aç. Bu hafta çok şey gördüm.”',
  '{hoca}: “İnsanlar sonuçları görüyor, biz sabah 6’yı görüyoruz.”',
  '{hoca}: “{p}’ın en büyük silahı kafası. Gerisi detay.”',
  '{hoca}: “Bu salondan bir şampiyon çıkacak. Yazın bir kenara.”',
];
const FIGHTER_LIFE = [
  'Memleketime döndüm, mahalledeki çocuklarla antrenman yaptık. ❤️',
  'Yeni köpeğimle tanışın: adı Nakavt. 🐶',
  'Bugün annemin yemekleri. Diyet yarın. 🍲',
  'Kızımın okul gösterisindeydim. En zor maçım buydu 😅',
  'Tatil bitti, kampa dönüş. Batarya %100. 🔋',
  'Yeni tattoo! Anlamını tahmin edin 👇',
  'Kitap önerisi: “Savaş Sanatı”. Her dövüşçü okumalı. 📖',
  'Bugün bir çocuk hastanesini ziyaret ettik. Asıl kahramanlar onlar. 🙏',
];
const FIGHTER_CALLOUT = [
  '{p}, sıralamada fazla hızlı yükseliyorsun. Seni yavaşlatmaya geliyorum.',
  'Herkes {p}’ı konuşuyor. Ben de konuşayım: kafeste görüşürüz.',
  '{p} iyi ama henüz benim gibi biriyle karşılaşmadı. 😏',
  '{org}, beni {p} ile eşleştirin. Taraftar bunu istiyor.',
  '{p}’ın son maçını izledim. Açıklarını not aldım. ✍️',
];
const FIGHTER_THANKS = [
  'Dün geceki destek için teşekkürler! Sizler olmasanız bu yol yürünmezdi. ❤️',
  '1 yıl önce kimse adımı bilmiyordu. Bugün buradayız. Teşekkürler. 🙏',
  'Mesajlarınızın hepsini okuyorum. Söz, sizi utandırmayacağım.',
  'Takımıma, hocama, aileme: her şey sizin için.',
];
const BRANDS = ['Kuvvet Protein', 'Arslan Enerji', 'Kafes Giyim', 'Titan Eldiven', 'Demir Spor', 'Oktagon Su', 'Pençe Ayakkabı', 'Bozkurt Kulaklık'];
const STATS_TR: Record<string, string> = { vurus: 'vuruş', gures: 'güreş', yer: 'yer dövüşü', kondisyon: 'kondisyon', cene: 'çene', hiz: 'hız', iq: 'dövüş zekâsı' };

/** Son paylaşımlarda geçmeyen bir metin seçer (akış tekrar etmesin). */
function fresh(s: GameState, pool: string[], v: Record<string, string | number>) {
  const recent = new Set((s.sosyal ?? []).slice(0, 25).map((p) => p.metin));
  const order = [...pool].sort(() => Math.random() - 0.5);
  for (const t of order) {
    const txt = fill(t, v);
    if (!recent.has(txt)) return txt;
  }
  return fill(pick(pool), v);
}

function handleName(o: Opponent) {
  return { yazar: `${o.ad} ${o.soyad}`, kullanici: oppHandle(o) };
}

/** Zaman geçtikçe akış canlanır: 1-3 yeni paylaşım. */
export function socialTick(s: GameState, weeks = 1) {
  if (s.stage === 'amator' && chance(0.5)) return;
  const liste = s.bolum?.liste ?? [];
  const champ = s.bolum?.sampiyon ?? null;
  const a = liste.length ? pick(liste) : null;
  const b = liste.length > 1 ? pick(liste.filter((x) => x !== a)) : null;
  const x = randInt(35, 70);
  const bestStat = (Object.keys(s.fighter.stats) as (keyof typeof s.fighter.stats)[]).reduce((m, k) => (s.fighter.stats[k] > s.fighter.stats[m] ? k : m));
  const v = {
    p: s.fighter.soyad,
    org: ORGS[currentOrg(s)].kisa,
    a: a ? `${a.ad} ${a.soyad}` : 'Sıklet favorisi',
    b: b ? `${b.ad} ${b.soyad}` : 'bir sürpriz isim',
    c: champ ? `${champ.ad} ${champ.soyad}` : s.sampiyon ? s.fighter.soyad : 'Şampiyon',
    x,
    y: 100 - x,
    stat: STATS_TR[bestStat],
    brand: pick(BRANDS),
    hoca: s.takim.antrenor,
  };
  const n = Math.min(3, 1 + Math.floor(weeks / 3) + (chance(0.5) ? 1 : 0));
  const gens: (() => void)[] = [
    () => addPost(s, { yazar: 'MMA Kulis', kullanici: '@mmakulis', tur: 'medya', metin: fresh(s, RUMOR, v) }),
    () => addPost(s, { yazar: pick(JOURNALISTS).split(' (')[0], kullanici: '@kafespostasi', tur: 'medya', metin: fresh(s, POLL, v), begeni: likes(s, 0.5) }),
    () => addPost(s, { yazar: 'Kafes Analiz', kullanici: '@kafesanaliz', tur: 'medya', metin: fresh(s, ANALIZ, v) }),
    () => a && addPost(s, { ...handleName(a), tur: 'dovuscu', metin: fresh(s, TRAINING, v), renk: '#f2c14e' }),
    () => champ && addPost(s, { ...handleName(champ), tur: 'dovuscu', metin: fresh(s, CHAMP_FLEX, v), renk: '#f2c14e', hedefId: s.rakipler.some((r) => r.id === champ.id) ? champ.id : undefined }),
    () => addPost(s, { yazar: pick(['Troll Tayfun', 'Keyboard Kaan', 'Hater Hakan', 'Anonim Arif', 'Yorumcu Yılmaz']), kullanici: `@anonim${randInt(100, 9999)}`, tur: 'taraftar', metin: fresh(s, TROLL, v), begeni: likes(s, 0.1) }),
    () => addPost(s, { yazar: pick(['Çizer Ceren', 'Fan Fatih', 'Maç Anası Melek', 'Tribün Tuna', 'Kafes Kızı Kübra']), kullanici: `@fan${randInt(10, 999)}`, tur: 'taraftar', metin: fresh(s, FAN_ART, v) }),
    () => addPost(s, { yazar: v.brand, kullanici: `@${slug(v.brand)}`, tur: 'organizasyon', metin: fresh(s, SPONSOR, v) }),
    () => addPost(s, { yazar: 'MMA Mizah', kullanici: '@mmamizah', tur: 'taraftar', metin: fresh(s, MEME, v), begeni: likes(s, 0.8) }),
    () => addPost(s, { yazar: 'Kafes TV', kullanici: '@kafestv', tur: 'medya', metin: fresh(s, HIGHLIGHT, v), begeni: likes(s, 1.2) }),
    () => s.stage !== 'amator' && addPost(s, { yazar: 'Oran Ustası', kullanici: '@oranustasi', tur: 'medya', metin: fresh(s, ODDS, { ...v, x: randInt(20, 80), y: randInt(10, 90) }) }),
    () => s.stage !== 'amator' && addPost(s, { yazar: ORGS[currentOrg(s)].ad, kullanici: `@${slug(ORGS[currentOrg(s)].kisa)}`, tur: 'organizasyon', metin: fresh(s, ORG_NEWS, v) }),
    () => addPost(s, { yazar: s.takim.antrenor, kullanici: `@${slug(s.takim.antrenor).slice(0, 14)}coach`, tur: 'dovuscu', metin: fresh(s, COACH, v), renk: '#3ecf7a' }),
    () => a && b && npcFeud(s),
    () => a && addPost(s, { ...handleName(a), tur: 'dovuscu', metin: fresh(s, FIGHTER_LIFE, v), renk: '#f2c14e', begeni: npcLikes(s, a) }),
    () => b && addPost(s, { ...handleName(b), tur: 'dovuscu', metin: fresh(s, FIGHTER_THANKS, v), renk: '#f2c14e', begeni: npcLikes(s, b) }),
    () => a && s.stage !== 'amator' && addPost(s, { ...handleName(a), tur: 'dovuscu', metin: fresh(s, FIGHTER_CALLOUT, v), renk: '#e63946', hedefId: a.id, begeni: npcLikes(s, a) }),
  ];
  for (let i = 0; i < n; i++) pick(gens)();
}

/** Oyuncunun yaşam tarzına tepki: yeni araba, tatil, kumarhane… */
export function lifestylePost(s: GameState, olay: string) {
  const v = { p: s.fighter.soyad, olay };
  addPost(s, { yazar: 'Magazin Kafes', kullanici: '@magazinkafes', tur: 'medya', metin: fill(pick(['📸 {p} görüntülendi: {olay}', 'PAPARAZZİ: {p}, {olay}. Kampa odaklanabilecek mi?', 'Sosyal medyanın gündemi: {p} {olay}.']), v) });
  addPost(s, { yazar: pick(['Kafes Aşığı', 'Tribün Kaplanı', 'MMA Ultras']), kullanici: `@taraftar${randInt(10, 999)}`, tur: 'taraftar', metin: fill(pick(['Hak etti, keyfini çıkarsın 👑', 'Önce kemer, sonra keyif {p}!', 'Bu işler antrenmanı aksatmasın da… 🙄', 'Efsane yaşam tarzı 😎']), v) });
}
