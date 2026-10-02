// Sosyal medya: dövüşçüler atışır, taraftarlar yorum yapar, maçların hikâyesi yazılır.
import { crisisTick, maybeCrisis } from './crisis';
import { L, LOC } from '../i18n';
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
    .toLocaleLowerCase(LOC)
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
  L("{ph} ile aynı kafese girmek için sabırsızlanıyorum. Sabırsızlığım onun korkusundan büyük. 😈"),
  L("Kamp raporu: {ph} dövüşünü 100 kez izledim. Açığını buldum. Sürpriz olmayacak."),
  L("Bahis tavsiyesi: {ph} aleyhine her şeyinizi yatırın. 💰"),
  L("{ph}’ın hocası bile bu maçı kabul ettiği için ona kızıyormuş. 😂"),
  L("Tartıda göz göze geleceğiz {ph}. Gözlerini kaçırma."),
  L("{ph} sıkletin en abartılı ismi. {hafta} hafta sonra balon patlıyor. 🎈"),
  L("{ph} mi? {org}’da bana verilen en kolay maç bu. {hafta} hafta sonra görürüz."),
  L("{ph} kafeste görüşürüz. Hastane masrafını ben öderim, merak etme."),
  L("Çenen cam gibi {p}. İlk sağ elimde dağılacak."),
  L("{ph} sosyal medyada çok cesur. Bakalım kafes kapısı kapanınca da öyle mi?"),
  L("Herkes {p} diyor… Ben kimseyi görmüyorum. 🥱"),
  L("{ph} taraftarlarına söyleyin, mendillerini hazırlasınlar."),
];
const RESPECT_PRE = [
  L("{ph} kariyerini takip ediyorum, ciddi bir yetenek. Ama bu gece benim gecem olacak."),
  L("Bu maç ikimiz için de büyük fırsat. {ph}, sağlıklı bir kamp dilerim."),
  L("{ph} ile dövüşmek onur. Hazırlığım tam, en iyi hâlimle geleceğim."),
  L("Saygı duyduğum bir rakip: {ph}. Ama kazanan ben olacağım."),
  L("Kamp bitti. {ph}, iyi bir savaş olsun. 🤝"),
];
const OPP_WON = [
  L("{ph} söylemiştim. Sıradaki! 👋"),
  L("Bu gece bir şey kanıtladım. {ph}, iyi dövüştün ama yeterli değildi."),
  L("Kemer yolu devam ediyor. {ph} sadece bir basamaktı."),
];
const OPP_LOST_GOOD = [L("{ph} bu gece daha iyiydi. Tebrikler şampiyon adayı. Geri döneceğim."), L("Ders aldım. {ph} gerçek bir savaşçı. 🤝")];
const OPP_LOST_BAD = [L("Hakemler bu gece beni soydu. {ph} bunu biliyor."), L("Şanslı yumruktu {ph}. Rövanşta gerçeği göreceksin."), L("Tek kelime: RÖVANŞ. {ph} kaçmasın.")];

const FAN_WIN = [
  L("{p} maçını 5. kez izliyorum, hâlâ doyamadım 🔥"),
  L("Babam 40 yıldır maç izler, “böylesini görmedim” dedi."),
  L("Bu dövüşçünün posteri odamda artık 🥊"),
  L("{p} sıkletin geleceği değil, bugünü!"),
  L("O kombinasyon ne öyle?! Geri sar, geri sar!"),
  L("Salon arkadaşlarımla izledik, ortalık yıkıldı 😂"),
  L("{p} geleceğin şampiyonu!! 🔥🔥"),
  L("Onu izlemek bir zevk. Kemer an meselesi."),
  L("{memleket} gurur duyuyor! 🇹🇷💪"),
  L("Az önce {p} maçını izledim, tüylerim diken diken."),
  L("Bir sonraki maçına bilet alıyorum, kimse beni durduramaz."),
];
const FAN_LOSS = [
  L("Oyun planı felaketti. Hoca değişmeli."),
  L("Kötü gün herkesin başına gelir. {p} döner."),
  L("Bu kadar hype’a bu performans mı? 🤡"),
  L("{p} kampta tatil mi yaptı acaba?"),
  L("Kafam hâlâ inanmıyor ya… ❤️‍🩹"),
  L("{p} abartılıyormuş, belli oldu."),
  L("Üzülme {p}, büyük şampiyonlar da kaybeder. Kalk ayağa! ❤️"),
  L("Kamp değişmeli. Bu oyun planı neydi?"),
  L("Hâlâ arkandayız {p}. 💪"),
];
const FAN_TRASH_OK = [L("HAHAHA efsane 😂🔥"), L("Bu dövüşçünün ağzı da yumrukları kadar sert!"), L("Gerilim tırmanıyor, bu maçı kaçırmam!")];
const FAN_TRASH_BAD = [L("Önce bir kemer al, sonra konuş."), L("Çok konuşan az dövüşür."), L("Bu biraz fazlaydı…")];
const FAN_RESPECT = [L("Saygılı sporcu = gerçek sporcu 👏"), L("Bu yüzden seviyoruz seni {p}."), L("Klas bir hareket.")];
const FAN_NEUTRAL = ['👊', L("Kampa odaklan şampiyon!"), L("Yeni video ne zaman?"), '🔥🔥🔥'];

const TRASH_WORDS = ['korkak', L("kaçıyor"), L("kaçma"), 'ezece', 'yenerim', L("yok ederim"), 'uyut', 'bitir', 'sahtekar', L("abartıl"), L("zayıf"), 'hastane', L("dağıt"), L("gömece"), L("çöp"), L("ağlat"), L("döverim"), L("sıradaki sen"), L("hazır ol"), L("boş konuş"), L("kemerini al")];
const RESPECT_WORDS = [L("saygı"), L("teşekkür"), 'onur', 'tebrik', L("iyi dövüş"), 'helal', L("başarılar"), 'minnettar', L("değerli"), '🤝', L("büyük savaşçı")];

// ---------- Maç hikâyeleri ----------

function storyFor(s: GameState, o: Opponent): string {
  const p = fullName(s.fighter);
  const on = `${o.ad} “${o.lakap}” ${o.soyad}`;
  const org = ORGS[currentOrg(s)].kisa;
  const striker = (b: string) => ['boks', 'muaythai', 'kickboks', 'kyokushin', 'sokak'].includes(b);
  const favori = statAverage(s.fighter.stats) >= statAverage(o.stats) ? s.fighter.soyad : o.soyad;
  if (o.sonSonuc === 'M') return L("🔥 İNTİKAM GECESİ: {0}, kendisini yenen {1} karşısında. İlk maç {2} lehine bitmişti. Bu sefer?", [p, on, o.soyad]);
  if (o.sonSonuc) return L("🔁 RÖVANŞ: {0} ve {1} yeniden karşı karşıya. İlk maçın galibi {2}. Tarih tekerrür eder mi?", [p, on, s.fighter.soyad]);
  if (o.champion) return L("🏆 KEMER SAVAŞI: {0} şampiyonu {1}, tahtını yükselen isim {2}’ye karşı koruyor. 5 raunt, tek kemer.", [org, on, p]);
  if (s.sampiyon) return L("🏆 UNVAN SAVUNMASI: Şampiyon {0}, aç kurt {1} karşısında. Kemer el değiştirir mi?", [p, on]);
  if (s.seri >= 3) return L("📈 YENİLMEZLİK SERİSİ: {0} {1} maçtır kaybetmiyor. {2} bu seriyi bitirecek kişi olabilir mi?", [p, s.seri, on]);
  if (striker(s.fighter.gecmis) !== striker(o.stil))
    return L("⚔️ STİL SAVAŞI: {0} ustası {1} vs {2} uzmanı {3}. Vuruşçu mu kazanır, güreşçi mi?", [BACKGROUNDS[s.fighter.gecmis].ad, p, BACKGROUNDS[o.stil].ad, on]);
  if (o.kisilik === L("Trash talk ustası") || o.kisilik === L("Kibirli"))
    return L("🎤 SÖZ SAVAŞI: {0} haftalardır {1} hakkında konuşuyor. Kafeste sözlerin bedeli ödenecek.", [on, p]);
  return L("📰 {0} bu hafta: {1} vs {2}. Bahisçiler {3} tarafını favori görüyor.", [org, p, on, favori]);
}

// ---------- Olay tetikleyicileri ----------

/** Kamp başında: maçın hikâyesi, rakibin paylaşımı, taraftar yorumu. */
export function socialCampStart(s: GameState) {
  const o = s.pending.rakip;
  if (!o) return;
  const vars = { p: s.fighter.soyad, ph: playerHandle(s), org: ORGS[currentOrg(s)].kisa, hafta: s.pending.kamp?.hafta ?? 8 };
  addPost(s, { yazar: pick(JOURNALISTS).split(' (')[0], kullanici: '@kafespostasi', tur: 'hikaye', metin: storyFor(s, o), begeni: likes(s, 0.8) });
  const trashy = [L("Trash talk ustası"), L("Kibirli"), L("Öfkeli"), L("Şovmen")].includes(o.kisilik);
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
  const sonuc = draw ? L("berabere kaldı") : won ? L("{0} ile kazandı", [yontem]) : L("{0} ile kaybetti", [yontem]);
  addPost(s, { yazar: L("MMA Türkiye"), kullanici: '@mmaturkiye', tur: 'medya', metin: L("SON DAKİKA: {0}, {1} {2} karşısında {3}.", [fullName(s.fighter), o.ad, o.soyad, sonuc]), begeni: likes(s, 0.6) });
  const kotu = [L("Trash talk ustası"), L("Kibirli"), L("Öfkeli")].includes(o.kisilik);
  addPost(s, {
    yazar: `${o.ad} ${o.soyad}`,
    kullanici: oppHandle(o),
    tur: 'dovuscu',
    metin: fill(pick(won ? (kotu ? OPP_LOST_BAD : OPP_LOST_GOOD) : OPP_WON), vars),
    hedefId: o.id,
    renk: won && kotu ? '#e63946' : '#3a86ff',
  });
  for (let i = randInt(1, 2); i > 0; i--)
    addPost(s, { yazar: pick([L("Kafes Aşığı"), L("Nakavt Nuri"), L("MMA Ultras"), L("Tribün Kaplanı"), L("Octagon Oğuz"), L("Ringside Rüya")]), kullanici: `@taraftar${randInt(10, 999)}`, tur: 'taraftar', metin: fill(pick(won ? FAN_WIN : FAN_LOSS), vars) });
  divNotes.forEach((n) => addPost(s, { yazar: L("{0} Resmi", [ORGS[currentOrg(s)].kisa]), kullanici: `@${slug(ORGS[currentOrg(s)].kisa)}`, tur: 'organizasyon', metin: n.replace(/^\S+\s/, '') }));
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
    [L("{c} sıralamada benim arkamda kalmaya alışsın. 😂"), L("{a} konuşacağına kafese gel. Tarih ver, oradayım.")],
    [L("{c} en son ne zaman bitirdin birini? Kimse hatırlamıyor."), L("{a} bitirmek için önce ayakta kalman lazım. Kolay gelsin.")],
    [L("Organizasyon beni {c} ile eşleştirsin. 90 saniye yeter."), L("{a} 90 saniye mi? Sen o sürede nefesini bile toparlayamazsın.")],
  ];
  const [x, y] = pick(lines);
  addPost(s, { yazar: `${a.ad} ${a.soyad}`, kullanici: oppHandle(a), tur: 'dovuscu', metin: fill(x, vars), renk: '#f2c14e' });
  addPost(s, { yazar: `${c.ad} ${c.soyad}`, kullanici: oppHandle(c), tur: 'dovuscu', metin: fill(y, vars), renk: '#f2c14e' });
}

// ---------- Oyuncu paylaşımları ----------

function findMention(s: GameState, text: string): Opponent | null {
  const t = text.toLocaleLowerCase(LOC);
  const pool: Opponent[] = [...s.rakipler, ...(s.bolum?.liste ?? []), ...(s.bolum?.sampiyon ? [s.bolum.sampiyon] : []), ...(s.pending.rakip ? [s.pending.rakip] : [])];
  return (
    pool.find(
      (o) =>
        t.includes(o.soyad.toLocaleLowerCase(LOC)) ||
        t.includes(o.lakap.toLocaleLowerCase(LOC)) ||
        t.includes(oppHandle(o)),
    ) ?? null
  );
}

export function playerPost(s: GameState, text: string): string {
  const metin = text.trim().slice(0, 280);
  if (!metin) return L("Boş bir paylaşım yapamazsın.");
  bump(s, 'gonderi');
  const t = metin.toLocaleLowerCase(LOC);
  const trash = TRASH_WORDS.some((w) => t.includes(w));
  const respect = RESPECT_WORDS.some((w) => t.includes(w));
  const target = findMention(s, metin);
  const recent = (s.sosyal ?? []).filter((p) => p.tur === 'oyuncu' && p.hafta === s.hafta).length;
  const vars = { p: s.fighter.soyad, ph: playerHandle(s), memleket: s.fighter.memleket };
  let sonuc = '';
  let pop = 0;

  if (recent >= 3) {
    pop = -1;
    sonuc = L("Aynı hafta içinde çok fazla paylaşım yaptın. Takipçiler bıkmaya başladı.");
  } else if (trash) {
    const ok = chance(0.45 + s.fighter.stats.iq / 300 + s.populerlik / 300);
    pop = ok ? (target ? 4 : 2) : -2;
    sonuc = ok ? L("Paylaşımın patladı! Herkes bundan bahsediyor.") : L("Laf sokman ters tepti. Yorumlar pek hoş değil.");
    if (target) {
      const r = s.rakipler.find((x) => x.id === target.id);
      if (r) r.rivalry++;
      if (ok && s.bolum?.liste.some((x) => x.id === target.id) && chance(0.35)) {
        s.cagri = target.id;
        sonuc += L(" {0} bu atışmayı fark etti; {1} ile maç gündemde!", [ORGS[currentOrg(s)].kisa, target.soyad]);
      }
    }
  } else if (respect) {
    pop = 1;
    sonuc = L("Saygılı tavrın takdir topladı.");
  } else {
    pop = chance(0.5) ? 1 : 0;
    sonuc = L("Takipçilerin paylaşımını beğendi.");
  }
  s.populerlik = clamp(s.populerlik + pop, 0, 100);

  const yanitlar: { yazar: string; metin: string }[] = [];
  if (target) {
    const kotu = [L("Trash talk ustası"), L("Kibirli"), L("Öfkeli"), L("Şovmen")].includes(target.kisilik);
    const cevap = trash
      ? pick(kotu ? [L("Klavye savaşçısı. Kafeste görüşürüz {ph}."), L("{ph} önce sıralamada yukarı çık, sonra konuşuruz."), L("Seni gördüğüm yerde uyuturum {ph}. 😴")] : [L("Konuşmak kolay {ph}. Ben kafeste cevap veririm."), L("{ph} bu tavrı yakıştıramadım.")])
      : respect
        ? pick([L("Karşılıklı saygı 🤝 {ph}"), L("Teşekkürler kardeşim, başarılar.")])
        : pick(['👀', L("{ph} ne demek istiyorsun?")]);
    yanitlar.push({ yazar: `${target.ad} ${target.soyad}`, metin: fill(cevap, vars) });
  }
  yanitlar.push({ yazar: pick([L("Kafes Aşığı"), L("MMA Ultras"), L("Tribün Kaplanı")]), metin: fill(pick(trash ? (pop > 0 ? FAN_TRASH_OK : FAN_TRASH_BAD) : respect ? FAN_RESPECT : FAN_NEUTRAL), vars) });

  addPost(s, { yazar: fullName(s.fighter), kullanici: playerHandle(s), tur: 'oyuncu', metin, begeni: likes(s, pop > 0 ? 1 : 0.4), yanitlar, renk: '#e63946' });
  return `${sonuc}${pop ? L(" (Popülerlik {0}{1})", [pop > 0 ? '+' : '', pop]) : ''}`;
}

export const REPLY_TONES = [
  { key: 'sert', ad: L("Sert cevap"), ikon: 'fire' },
  { key: 'espri', ad: L("Esprili geç"), ikon: 'emoticon-lol-outline' },
  { key: 'saygi', ad: L("Saygılı ol"), ikon: 'handshake' },
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
    metin = pick([L("{0}, kafeste bu kadar konuşkan olmayacaksın.", [ad]), L("{0} yazdığın her kelimeyi yumruk olarak geri alacaksın.", [ad]), L("Tarih ver {0}. Gerisi laf.", [ad])]);
    sonuc = ok ? L("Cevabın viral oldu, rekabet kızıştı!") : L("Cevabın biraz fazla kaçtı, eleştiri aldın.");
  } else if (tone === 'espri') {
    pop = chance(0.6) ? 2 : 0;
    metin = pick([L("{0} güzel yazmışsın, kim yazdı? 😂", [ad]), L("{0} klavyede şampiyon olmuşsun, tebrikler 🏆⌨️", [ad]), L("Tamam {0}, maç günü görüşürüz. Kaçmazsan. 😏", [ad])]);
    sonuc = pop ? L("Esprin çok beğenildi.") : L("Espri pek tutmadı.");
  } else {
    pop = 1;
    if (r) r.rivalry = Math.max(0, r.rivalry - 1);
    metin = pick([L("Saygılar {0}. Kafeste en iyimizi görelim.", [ad]), L("{0}, iyi bir savaş olacak. 🤝", [ad])]);
    sonuc = L("Olgun tavrın takdir topladı.");
  }
  s.populerlik = clamp(s.populerlik + pop, 0, 100);
  post.yanitlar = [...(post.yanitlar ?? []), { yazar: fullName(s.fighter), metin }];
  return `${sonuc}${pop ? L(" (Popülerlik {0}{1})", [pop > 0 ? '+' : '', pop]) : ''}`;
}

/** Oyuna başlarken ilk paylaşımlar. */
export function socialWelcome(s: GameState) {
  const c = COUNTRIES[s.fighter.uyruk];
  addPost(s, { yazar: s.takim.salon, kullanici: `@${slug(s.takim.salon).slice(0, 16)}`, tur: 'organizasyon', metin: L("Salonumuza yeni bir savaşçı katıldı: {0}. {1} bu ismi yakında çok duyacak! 🥊", [fullName(s.fighter), c?.ad ?? '']) });
}

// ---------- Haftalık akış: kulis, anket, bahis, antrenman, trol ----------

const RUMOR = [
  L("KULİS: {org} yönetimi {a} ile {b} maçını ayarlamak üzere. Tarih belli değil."),
  L("KULİS: {a} kampında sakatlık yaşadığı konuşuluyor. Takımı yalanlamadı."),
  L("KULİS: {p} için birden fazla sponsor teklif hazırlığında."),
  L("KULİS: {c} bir sonraki kemer savunmasında sürpriz bir isimle karşılaşabilir."),
  L("KULİS: {a} sıklet değiştirmeyi düşünüyor."),
  L("KULİS: {b} menajeriyle yollarını ayırdı. Kontrat müzakereleri tıkandı."),
  L("KULİS: {org} gelecek ay büyük bir organizasyon için {p} adını listeye yazdı."),
  L("KULİS: {a} ve {b} arasında salon kavgası iddiası! Görgü tanıkları konuşuyor."),
  L("KULİS: {c} kemeri boşaltmayı düşünüyor mu? Yakın çevresi sessiz."),
  L("KULİS: {p} ile ilgilenen bir film yapımcısı olduğu söyleniyor. 🎬"),
  L("KULİS: {a} doping testinden geçemedi mi? Resmi açıklama bekleniyor."),
  L("KULİS: {b} emekliliği düşünüyor. Son maçını memleketinde yapmak istiyor."),
];
const POLL = [
  L("ANKET: {a} vs {p} olsa kim kazanır? 🗳️ {a} %{x} · {p} %{y}"),
  L("ANKET: Sıkletin en iyi vuruşçusu kim? 🗳️ {a} %{x} · {p} %{y}"),
  L("ANKET: {c} kemeri daha kaç maç tutar? 🗳️ 1-2 maç %{x} · 3+ maç %{y}"),
  L("ANKET: Yılın nakavtı kimin? 🗳️ {p} %{y} · {b} %{x}"),
  L("ANKET: {p} ayakta mı daha tehlikeli, yerde mi? 🗳️ Ayakta %{x} · Yerde %{y}"),
  L("ANKET: {a} trash talk’ta haklı mı? 🗳️ Evet %{x} · Hayır %{y}"),
  L("ANKET: Sıklette bir sonraki şampiyon kim olur? 🗳️ {p} %{y} · {b} %{x}"),
  L("ANKET: {org} en iyi maçı hangisiydi? 🗳️ {a} vs {b} %{x} · {p} maçı %{y}"),
];
const ANALIZ = [
  L("📊 ANALİZ: {p} son maçlarında {stat} istatistiğinde ciddi gelişme gösterdi. Sıklet dikkat!"),
  L("📊 ANALİZ: {a} takedown savunması sıkletin en iyisi. Güreşçiler için kâbus."),
  L("📊 ANALİZ: {c} şampiyonluğunu kaybetmesi için bir “stil” gerekiyor: sabırlı bir kontra dövüşçüsü."),
  L("📊 ANALİZ: {p} popülerlik grafiği son 3 ayda dikey çıkışta."),
  L("📊 ANALİZ: {b} üçüncü rauntlarda düşüyor. Tempo onu yıkabilir."),
  L("📊 ANALİZ: {a} dakikada ortalama 5,2 isabetli vuruş atıyor. Sıklet rekoru."),
  L("📊 ANALİZ: {p} maçlarının yarısından fazlasını bitirişle kazandı. Hakemlere iş bırakmıyor."),
  L("📊 ANALİZ: {c} son beş maçta hiç yere düşmedi. Çenesi çelik gibi."),
  L("📊 ANALİZ: {b} submission savunmasında zayıf. Grappler’lar sıraya girer."),
  L("📊 ANALİZ: {p} ile {a} eşleşmesi stil olarak sıkletin en ilginç maçı olur."),
];
const TRAINING = [
  L("Sabah 5’te koşu, öğlen sparring, akşam grappling. Tatil yok. 💪 #Kamp"),
  L("Bugün 12 raunt sparring. Yeni bir silah geliştiriyoruz… 🤫"),
  L("Kilo kontrolde, zihin net. Kim hazırsa gelsin."),
  L("Yeni hocamla ilk hafta. Her şey değişiyor. 🔥"),
  L("Dinlenme günü. Ailemle kahvaltı. Savaşçılar da insan. ❤️"),
  L("Tepe koşusu günü. Bacaklar yok ama kalp var. ⛰️"),
  L("Yoga + nefes çalışması. Kafes bir zihin oyunu. 🧘"),
  L("Bugün bir gençle spar yaptım, beni çok zorladı. Gelecek parlak!"),
  L("Buz banyosu sonrası tüm hücrelerim uyandı. 🧊"),
  L("Yeni bir kombinasyon: jab, düşük tekme, overhand. Sıradaki rakip görecek."),
  L("Antrenman bitti, protein zamanı. 🥩"),
  L("Güreş hocam bugün beni 8 kez yere indirdi. Maç gecesi tersi olacak."),
  L("Gece 11’de hâlâ salondayım. Işıkları kapatan son kişi benim."),
  L("Kamp bitti. Şimdi sadece ağırlık ve sabır."),
];
const CHAMP_FLEX = [
  L("Kemer uyurken bile yanımda. 🏆 Sıradaki kim?"),
  L("Sıklette herkes birbirine laf atıyor. Ben ise kemerimle kahve içiyorum. ☕🏆"),
  L("Tahtımı isteyen çok. Hak eden yok."),
  L("Kemerin ağırlığını sadece taşıyan bilir. 🏆"),
  L("Listeye bakıyorum, hepsini daha önce izledim. Sıkıcı. 🥱"),
  L("Şampiyonluk bir unvan değil, bir yaşam biçimi."),
  L("Herkes “sıradaki” olmak istiyor. Önce sıraya girin."),
  L("Bir savunma daha, bir tarih daha. 👑"),
];
const TROLL = [
  L("{p} sosyal medyada daha iyi dövüşüyor 😂"),
  L("{p}’ın çenesi cam mı plastik mi, tartışalım."),
  L("Unpopular opinion: {p} abartılıyor."),
  L("{p} fanları bu yorumu beğenmeyecek ama… 🤷"),
  L("{p} maç gecesi değil, fotoğraf çekiminde parlıyor."),
  L("Organizasyon {p}’ı korumak için kolay rakipler buluyor. Kanıtlayamazsınız 😏"),
  L("{p} bir gün gerçek bir güreşçiyle eşleşirse görürüz."),
  L("Benim dedem {p}’dan iyi jab atar 👴🥊"),
  L("{p} hype makinesi. Değiştirin fikrimi."),
  L("{p}’ın kondisyonu 2 raunt, gerisi dua. 🙏"),
];
const FAN_ART = [
  L("{p} fan çizimim! 🎨 Etiketleyin görsün 🙏"),
  L("{p} temalı pasta yaptım, nişanıma 🎂🥊"),
  L("Oğlumun ilk kelimesi “{p}” oldu 😂"),
  L("{p} dövmesi yaptırdım, sonsuza kadar benimle 🖋️"),
  L("Okulda “büyüyünce ne olacaksın” dediler, “{p}” dedim. 🥊"),
  L("{p} maskesiyle cadılar bayramına gittim, herkes tanıdı 🎭"),
  L("Kedime {p} adını verdim. O da yerde çok iyi 🐱"),
  L("Mahallede {p} maçını dev ekranda izledik, sokak inledi! 📺"),
];
const SPONSOR = [
  L("{brand}: Şampiyonların tercihi. Yakında büyük bir isimle anlaşma duyurusu… 👀"),
  L("{brand} indirimi başladı! Kafes kodu ile %20 🥊"),
  L("{brand} yeni koleksiyon: kafesten ilham alındı. 🔥"),
  L("Maç gecesi {brand} standında imza günü! Kaçırmayın."),
  L("{brand} ailesi büyüyor. Yeni elçimizi yakında açıklıyoruz. 🤝"),
  L("{brand}: Ter senin, güç bizden. 💪"),
];
const MEME = [
  L("{p} tartıya çıkarken vs. kafese girerken 😂 [meme]"),
  L("Hakemler {a} maçını izlerken: 👀🤡"),
  L("Ben: diyete başladım. Kamp haftası pizza kokusu: 🍕😭"),
  L("{p} jab atıyor, rakip: “ne oldu bana?” 😵"),
  L("Maç gecesi tahmini yapan her uzman: 🧙‍♂️ Maç sonucu: 🤡"),
];
const HIGHLIGHT = [
  L("🎥 GÜNÜN KLİBİ: {p}’ın son maçındaki o an. 1 milyon izlenmeye koşuyor."),
  L("🎥 HAFTANIN EN İYİ 5 BİTİRİŞİ: 3 numara {p}! Sizce birinci olmalı mıydı?"),
  L("🎥 ARŞİVDEN: {c} şampiyonluğa giden yolda en zor maçı."),
  L("🎥 YAVAŞ ÇEKİM: {a}’nın o spinning tekmesi. Fizik kuralları mı?"),
];
const ODDS = [
  L("💰 BAHİS: {org} yaklaşan kartta {p} favori (1.{x}). Sürpriz arayanlara {b} (2.{y})."),
  L("💰 BAHİS: {c} kemer savunmasında 1.{x} ile önde. Uzmanlar temkinli."),
  L("💰 BAHİS: Kitaplar {p} maçının bitirişle sonlanmasına 1.{x} veriyor."),
];
const ORG_NEWS = [
  L("📢 {org} RESMİ: Gelecek ayın ana kartı açıklandı! {a} vs {b} ana maç."),
  L("📢 {org}: Yeni sezon takvimi yayında. Bilet satışları pazartesi başlıyor. 🎟️"),
  L("📢 {org}: Gecenin Performansı bonusları artırıldı. Bitirin, kazanın!"),
  L("📢 {org}: Sıralamalar güncellendi. {p} için büyük sıçrama."),
];
const COACH = [
  L("{hoca}: “{p} bu kampta hiç olmadığı kadar aç. Bu hafta çok şey gördüm.”"),
  L("{hoca}: “İnsanlar sonuçları görüyor, biz sabah 6’yı görüyoruz.”"),
  L("{hoca}: “{p}’ın en büyük silahı kafası. Gerisi detay.”"),
  L("{hoca}: “Bu salondan bir şampiyon çıkacak. Yazın bir kenara.”"),
];
const FIGHTER_LIFE = [
  L("Memleketime döndüm, mahalledeki çocuklarla antrenman yaptık. ❤️"),
  L("Yeni köpeğimle tanışın: adı Nakavt. 🐶"),
  L("Bugün annemin yemekleri. Diyet yarın. 🍲"),
  L("Kızımın okul gösterisindeydim. En zor maçım buydu 😅"),
  L("Tatil bitti, kampa dönüş. Batarya %100. 🔋"),
  L("Yeni tattoo! Anlamını tahmin edin 👇"),
  L("Kitap önerisi: “Savaş Sanatı”. Her dövüşçü okumalı. 📖"),
  L("Bugün bir çocuk hastanesini ziyaret ettik. Asıl kahramanlar onlar. 🙏"),
];
const FIGHTER_CALLOUT = [
  L("{p}, sıralamada fazla hızlı yükseliyorsun. Seni yavaşlatmaya geliyorum."),
  L("Herkes {p}’ı konuşuyor. Ben de konuşayım: kafeste görüşürüz."),
  L("{p} iyi ama henüz benim gibi biriyle karşılaşmadı. 😏"),
  L("{org}, beni {p} ile eşleştirin. Taraftar bunu istiyor."),
  L("{p}’ın son maçını izledim. Açıklarını not aldım. ✍️"),
];
const FIGHTER_THANKS = [
  L("Dün geceki destek için teşekkürler! Sizler olmasanız bu yol yürünmezdi. ❤️"),
  L("1 yıl önce kimse adımı bilmiyordu. Bugün buradayız. Teşekkürler. 🙏"),
  L("Mesajlarınızın hepsini okuyorum. Söz, sizi utandırmayacağım."),
  L("Takımıma, hocama, aileme: her şey sizin için."),
];
const BRANDS = [L("Kuvvet Protein"), L("Arslan Enerji"), L("Kafes Giyim"), L("Titan Eldiven"), L("Demir Spor"), L("Hexagon Su"), L("Pençe Ayakkabı"), L("Bozkurt Kulaklık")];
const STATS_TR: Record<string, string> = { vurus: L("vuruş"), gures: L("güreş"), yer: L("yer dövüşü"), kondisyon: 'kondisyon', cene: L("çene"), hiz: L("hız"), iq: L("dövüş zekâsı") };

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
  crisisTick(s, weeks);
  maybeCrisis(s, weeks);
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
    a: a ? `${a.ad} ${a.soyad}` : L("Sıklet favorisi"),
    b: b ? `${b.ad} ${b.soyad}` : L("bir sürpriz isim"),
    c: champ ? `${champ.ad} ${champ.soyad}` : s.sampiyon ? s.fighter.soyad : L("Şampiyon"),
    x,
    y: 100 - x,
    stat: STATS_TR[bestStat],
    brand: pick(BRANDS),
    hoca: s.takim.antrenor,
  };
  const n = Math.min(3, 1 + Math.floor(weeks / 3) + (chance(0.5) ? 1 : 0));
  const gens: (() => void)[] = [
    () => addPost(s, { yazar: L("MMA Kulis"), kullanici: '@mmakulis', tur: 'medya', metin: fresh(s, RUMOR, v) }),
    () => addPost(s, { yazar: pick(JOURNALISTS).split(' (')[0], kullanici: '@kafespostasi', tur: 'medya', metin: fresh(s, POLL, v), begeni: likes(s, 0.5) }),
    () => addPost(s, { yazar: L("Kafes Analiz"), kullanici: '@kafesanaliz', tur: 'medya', metin: fresh(s, ANALIZ, v) }),
    () => a && addPost(s, { ...handleName(a), tur: 'dovuscu', metin: fresh(s, TRAINING, v), renk: '#f2c14e' }),
    () => champ && addPost(s, { ...handleName(champ), tur: 'dovuscu', metin: fresh(s, CHAMP_FLEX, v), renk: '#f2c14e', hedefId: s.rakipler.some((r) => r.id === champ.id) ? champ.id : undefined }),
    () => addPost(s, { yazar: pick([L("Troll Tayfun"), L("Keyboard Kaan"), L("Hater Hakan"), L("Anonim Arif"), L("Yorumcu Yılmaz")]), kullanici: `@anonim${randInt(100, 9999)}`, tur: 'taraftar', metin: fresh(s, TROLL, v), begeni: likes(s, 0.1) }),
    () => addPost(s, { yazar: pick([L("Çizer Ceren"), L("Fan Fatih"), L("Maç Anası Melek"), L("Tribün Tuna"), L("Kafes Kızı Kübra")]), kullanici: `@fan${randInt(10, 999)}`, tur: 'taraftar', metin: fresh(s, FAN_ART, v) }),
    () => addPost(s, { yazar: v.brand, kullanici: `@${slug(v.brand)}`, tur: 'organizasyon', metin: fresh(s, SPONSOR, v) }),
    () => addPost(s, { yazar: L("MMA Mizah"), kullanici: '@mmamizah', tur: 'taraftar', metin: fresh(s, MEME, v), begeni: likes(s, 0.8) }),
    () => addPost(s, { yazar: L("Kafes TV"), kullanici: '@kafestv', tur: 'medya', metin: fresh(s, HIGHLIGHT, v), begeni: likes(s, 1.2) }),
    () => s.stage !== 'amator' && addPost(s, { yazar: L("Oran Ustası"), kullanici: '@oranustasi', tur: 'medya', metin: fresh(s, ODDS, { ...v, x: randInt(20, 80), y: randInt(10, 90) }) }),
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
  addPost(s, { yazar: L("Magazin Kafes"), kullanici: '@magazinkafes', tur: 'medya', metin: fill(pick([L("📸 {p} görüntülendi: {olay}"), L("PAPARAZZİ: {p}, {olay}. Kampa odaklanabilecek mi?"), L("Sosyal medyanın gündemi: {p} {olay}.")]), v) });
  addPost(s, { yazar: pick([L("Kafes Aşığı"), L("Tribün Kaplanı"), L("MMA Ultras")]), kullanici: `@taraftar${randInt(10, 999)}`, tur: 'taraftar', metin: fill(pick([L("Hak etti, keyfini çıkarsın 👑"), L("Önce kemer, sonra keyif {p}!"), L("Bu işler antrenmanı aksatmasın da… 🙄"), L("Efsane yaşam tarzı 😎")]), v) });
}
