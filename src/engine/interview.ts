// Kafes içi röportaj: seçenekler dövüşün bağlamına göre üretilir, her birinin sonucu vardır.
// Her cümlenin birden çok söylenişi ve sonucu vardır; aynı röportaj iki kez aynı çıkmaz.
import { COUNTRIES, ORGS } from './data';
import { rankedOpponent } from './division';
import { chance, clamp, fill, pick, shuffle } from './rng';
import type { GameState, Method, OrgId } from './types';

export interface InterviewCtx {
  won: boolean;
  draw: boolean;
  yontem: Method;
  raunt: number;
  maxRaunt: number;
  org: OrgId;
  oppId: string;
  opp: string; // soyad
  unvanKazandi: boolean;
  unvanSavundu: boolean;
  rovansKazandi: boolean;
  trashOnce: boolean;
  sakatDovustu: boolean;
  hedefId?: string;
  hedef?: string;
  hedefRank?: number;
  sampiyonId?: string;
  sampiyon?: string;
  bonus: number;
  // Genişletilmiş bağlam (eski kayıtlarda olmayabilir)
  pKd?: number;
  oKd?: number;
  geriDonus?: boolean;
  surpriz?: boolean;
  ilkPro?: boolean;
  orgIlk?: boolean;
  kiloKacirdi?: boolean;
  kisilik?: string;
  uyruk?: string;
  seri?: number;
  savas?: boolean;
  cift?: boolean;
}

interface Line {
  id: string;
  ozel: boolean;
  when: (c: InterviewCtx, s: GameState) => boolean;
  text: string[];
  apply: (c: InterviewCtx, s: GameState) => string;
}

const pop = (s: GameState, d: number) => {
  s.populerlik = clamp(s.populerlik + d, 0, 100);
  return d === 0 ? '' : ` (Popülerlik ${d > 0 ? '+' : ''}${d})`;
};
const mot = (s: GameState, d: number) => {
  s.motivasyon = Math.max(-2, Math.min(2, s.motivasyon + d));
  return d > 0 ? ' (Sonraki kampta motivasyon bonusu)' : d < 0 ? ' (Motivasyon düştü)' : '';
};
const rival = (s: GameState, c: InterviewCtx) => s.rakipler.find((r) => r.id === c.oppId);
const isKO = (c: InterviewCtx) => c.yontem === 'KO' || c.yontem === 'TKO';
const isDec = (c: InterviewCtx) => ['UD', 'SD', 'MD'].includes(c.yontem);
const close = (c: InterviewCtx) => c.yontem === 'SD' || c.yontem === 'MD';
const lost = (c: InterviewCtx) => !c.won && !c.draw;
const kotuKisilik = (c: InterviewCtx) => ['Trash talk ustası', 'Kibirli', 'Öfkeli', 'Şovmen'].includes(c.kisilik ?? '');

const LINES: Line[] = [
  // ================= GALİBİYET: genel =================
  {
    id: 'saygi', ozel: false, when: (c) => c.won,
    text: ['{opp} gerçek bir savaşçı. Bu gece bana her şeyi yaptırdı.', '{opp}’a saygım sonsuz. Kafeste yürek gösterdi.', 'Bu zafer kadar {opp}’ın mücadelesi de alkışı hak ediyor.'],
    apply: (c, s) => {
      const r = rival(s, c);
      if (r) r.rivalry = Math.max(0, r.rivalry - 1);
      return pick(['Salon seni ayakta alkışladı. Olgun bir galip.', 'Rakibin köşesinden bile alkış geldi. Sportmenliğin konuşuldu.', 'Yorumcular: “İşte şampiyon karakteri.”']) + pop(s, 1);
    },
  },
  {
    id: 'memleket', ozel: false, when: (c) => c.won,
    text: ['Bu zafer {memleket} için!', '{memleket}, bu gece sizin için dövüştüm!', 'Anneme ve {memleket}’teki herkese selam olsun!'],
    apply: (c, s) => pick([`${s.fighter.memleket}’te insanlar sokağa döküldü, kornalar çalıyor.`, `${s.fighter.memleket} belediyesi seni ağırlamak için tören hazırlığında.`, 'Memleketteki kahvehanelerde maç tekrar tekrar izleniyor.']) + pop(s, (COUNTRIES[s.fighter.uyruk]?.taraftar ?? 5) >= 7 ? 3 : 2),
  },
  {
    id: 'tanri', ozel: false, when: (c) => c.won,
    text: ['Önce Allah’a, sonra hocama ve takımıma teşekkür ederim.', 'Bu galibiyet salondaki herkesin. {antrenor} olmasa burada olmazdım.'],
    apply: (c, s) => pick(['Takımın kafese koşup seni omuzlarına aldı.', `${s.takim.antrenor} gözyaşlarını tutamadı.`]) + mot(s, 1) + pop(s, 1),
  },
  {
    id: 'daha_iyi', ozel: false, when: (c) => c.won,
    text: ['Bugün yüzde 70’imdi. Gerçek beni henüz görmediniz.', 'Hatalar yaptım, düzelteceğim. Bu daha başlangıç.'],
    apply: (c, s) => pick(['Özeleştirin takdir topladı, rakipler not aldı.', 'Hırsın kameraya yansıdı.']) + mot(s, 1),
  },
  // ================= GALİBİYET: bitiriş şekli =================
  {
    id: 'ko', ozel: true, when: (c) => c.won && isKO(c),
    text: ['Ellerimin ağır olduğunu söylemiştim. {raunt}. rauntta ışıkları kapattım!', 'Bu yumruğu kampta bin kez çalıştık. Bin birincisi {opp}’a geldi!', 'Uyku saati geldi {opp}. İyi geceler!'],
    apply: (c, s) => pick(['Nakavt klibin sosyal medyada milyonlarca izlendi.', 'Gecenin en çok paylaşılan anı senin yumruğun.', 'Yorumcular nakavtı “yılın nakavtı” adayı ilan etti.']) + pop(s, c.raunt === 1 ? 5 : 3),
  },
  {
    id: 'sub', ozel: true, when: (c) => c.won && c.yontem === 'SUB',
    text: ['Yer benim evim. Oraya gelen herkes tap atar.', 'Kolunu kırmak istemedim, tap attığı iyi oldu.', 'Anakonda gibi sardım. Nefes alamadı.'],
    apply: (c, s) => pick(['Yorumcular seni sıkletin en tehlikeli yer dövüşçüleri arasında saymaya başladı.', 'Güreşçiler artık seninle yere inmekten korkacak.']) + pop(s, 3),
  },
  {
    id: 'hizli', ozel: true, when: (c) => c.won && (isKO(c) || c.yontem === 'SUB') && c.raunt === 1,
    text: ['Isınamadım bile! Organizasyon bana daha zor bir rakip bulsun.', 'Maaşımın dakikası kaç para etti, hesaplayın!', 'Planım üç rauntluktu, bir raunt yetti.'],
    apply: (c, s) => pick(['“Isınamadım bile” cümlesi meme oldu!', 'Matchmaker’lar isteğini ciddiye aldı.']) + pop(s, 4),
  },
  {
    id: 'ders', ozel: true, when: (c) => c.won && c.yontem === 'UD',
    text: ['{maxRaunt} raunt boyunca ona ders verdim. Bir dahakine bitireceğim.', 'Satranç oynadım, o dama oynadı.', 'Her raundu aldım, her pozisyonu kazandım.'],
    apply: (c, s) => pick(['Bazıları “sıkıcı” dedi, ama kimse üstünlüğünü tartışmıyor.', 'Teknik direktörler performansını analiz etti: “ders niteliğinde”.']) + mot(s, 1),
  },
  {
    id: 'split_mutevazi', ozel: true, when: (c) => c.won && close(c),
    text: ['Zor bir geceydi. Bir dahaki sefere işi hakemlere bırakmayacağım.', 'Hakemler bana verdi ama {opp} de kazanmayı hak ediyordu.'],
    apply: (c, s) => pick(['Dürüst bir itiraf. Taraftarlar sana saygı duydu.', 'Rakibin bile bu sözleri paylaştı.']) + mot(s, 1) + pop(s, 1),
  },
  {
    id: 'split_iddiali', ozel: true, when: (c) => c.won && close(c),
    text: ['Açık ara kazandım! Bunu tartışan maçı izlememiş.', 'Ayrık karar mı? Hakemlerin gözlüğe ihtiyacı var, açık ara bendeydi.'],
    apply: (c, s) => (chance(0.5) ? 'Taraftarların arkanda durdu, tartışma seni daha çok konuşturdu.' + pop(s, 2) : 'Yuhalandın. Kararı bu kadar net görmeyen çok kişi vardı.' + pop(s, -3)),
  },
  // ================= GALİBİYET: dövüşün hikâyesi =================
  {
    id: 'geri_donus', ozel: true, when: (c) => c.won && !!c.geriDonus,
    text: ['Herkes bitti sandı. Ben bitmem!', 'Rauntları kaybediyordum, köşem bana inandı. Kalbim kazandı bu maçı.', 'Geriden gelmek bir karakter meselesi.'],
    apply: (c, s) => pick(['Geri dönüşün “gecenin hikâyesi” oldu.', 'Kimse ayağa kalkmadan oturmadı. Efsanevi bir dönüş.']) + mot(s, 2) + pop(s, 4),
  },
  {
    id: 'yerden_kalk', ozel: true, when: (c) => c.won && (c.pKd ?? 0) > 0,
    text: ['Beni yere indirdi, ama asıl önemli olan kalkmak.', 'Tavanı gördüm, sonra onun çenesini gördüm!', 'Yere düştüm, kalktım, kazandım. Hayat da böyle.'],
    apply: (c, s) => pick(['Çenen ve yüreğin tartışılmaz oldu.', 'Bu dayanıklılık hikâyesi motivasyon videolarına girdi.']) + pop(s, 3),
  },
  {
    id: 'surpriz', ozel: true, when: (c) => c.won && !!c.surpriz,
    text: ['Kimse benim kazanacağımı düşünmüyordu. Bahis oranları şimdi ne diyor?', 'Favori mi? Artık favori benim.', 'Beni hafife alan herkes bu gece öğrendi.'],
    apply: (c, s) => pick(['Bahisçiler şokta: yılın sürprizlerinden biri!', 'Sürpriz galibiyetin tüm spor sayfalarında.']) + pop(s, 5),
  },
  {
    id: 'savas', ozel: true, when: (c) => c.won && !!c.savas,
    text: ['Buna dövüş değil, savaş denir. {opp}’a saygılar.', 'İkimiz de kanadık. Seyirci parasının karşılığını aldı!'],
    apply: (c, s) => pick(['“Yılın dövüşü” adaylarına girdiniz.', 'Seyirciler ayakta, iki savaşçıyı da alkışladı.']) + pop(s, 3),
  },
  {
    id: 'ilk_pro', ozel: true, when: (c) => c.won && !!c.ilkPro,
    text: ['İlk profesyonel galibiyet! Bu anı ömrüm boyunca unutmayacağım.', 'Bir rüya başladı. Profesyonel olarak ilk zafer!'],
    apply: (c, s) => pick(['Profesyonel kariyerine muhteşem bir başlangıç.', 'Yerel basın “yeni bir yıldız doğuyor” başlığını attı.']) + mot(s, 1) + pop(s, 2),
  },
  {
    id: 'org_ilk', ozel: true, when: (c) => c.won && !!c.orgIlk && !c.ilkPro,
    text: ['{orgKisa}’a merhaba dedim! Bu organizasyonu sallayacağım.', 'Yeni evime ilk hediyem bu galibiyet.'],
    apply: (c, s) => pick([`${ORGS[c.org].kisa} yöneticileri yeni transferlerinden memnun.`, 'Organizasyonun resmi hesabı seni “yılın transferi” diye paylaştı.']) + pop(s, 3),
  },
  {
    id: 'seri', ozel: true, when: (c) => c.won && (c.seri ?? 0) >= 4,
    text: ['{seri} maçtır kaybetmiyorum. Kim durduracak beni?', 'Seri devam ediyor. Sıklette beni durduracak kimse yok.'],
    apply: (c, s) => pick(['Seri istatistikleri ekranlarda. Herkes kimin durduracağını tartışıyor.', 'Sıklette “yenilmez” etiketi sana yapışmaya başladı.']) + pop(s, 3),
  },
  // ================= GALİBİYET: rakip ve hedef =================
  {
    id: 'hedef', ozel: true, when: (c) => c.won && !!c.hedef,
    text: ['{hedef}! Sıradaki sensin, kaçma!', '{hedef}, seni izliyorum. Tarih ver.', '{hedef}, bu kemere giden yolda sen varsın. Çekil ya da savaş!'],
    apply: (c, s) => {
      if (chance(0.5 + s.populerlik / 200)) {
        s.cagri = c.hedefId ?? null;
        return pick([`Salon inledi. ${c.hedef} kamerasına bakıp başını salladı. Organizasyon bu maçı düşünüyor.`, `${c.hedef} sosyal medyadan cevap verdi: “Tamam.” Maç konuşuluyor!`]) + pop(s, 3);
      }
      return pick([`Salon sessiz kaldı. ${c.hedef} cevap bile vermedi.`, `${c.hedef} güldü: “Önce sıranı bekle.”`]) + pop(s, -1);
    },
  },
  {
    id: 'sampiyon', ozel: true, when: (c, s) => c.won && !!c.sampiyon && !s.sampiyon && s.rank != null && s.rank <= 5,
    text: ['Şampiyon {sampiyon}! Kemerini parlat, geliyorum!', '{sampiyon}, o kemer benim belimde daha güzel duracak.', 'Kafeste {sampiyon}’ı görmek istiyorum. Şimdi!'],
    apply: (c, s) => {
      if (chance(0.35 + s.populerlik / 150)) {
        s.cagri = c.sampiyonId ?? null;
        return 'Şampiyon kafese girdi, burun buruna geldiniz! Görüntüler her yerde. Ünvan maçı konuşuluyor.' + pop(s, 6);
      }
      return pick(['Şampiyon güldü: “Önce sırana gir.” Sosyal medyada alay konusu oldun.', 'Şampiyon röportajını izlemedi bile. Soğuk bir sessizlik.']) + pop(s, -2);
    },
  },
  {
    id: 'kibirliye', ozel: true, when: (c) => c.won && kotuKisilik(c),
    text: ['Maçtan önce çok konuşuyordun {opp}. Şimdi sessiz kalmak sana yakışıyor.', '{opp}, laf yetmiyor. Bunu öğrenmiş olmalısın.'],
    apply: (c, s) => {
      const r = rival(s, c);
      if (r) r.rivalry++;
      return pick(['Taraftarlar bu cevabı çok sevdi!', '“Sözün bittiği yer” klibin viral oldu.']) + pop(s, 4);
    },
  },
  {
    id: 'saygiliya', ozel: true, when: (c) => c.won && c.kisilik === 'Saygılı',
    text: ['{opp} gibi sporcular bu sporu güzelleştiriyor. Kucaklaşmamız her şeyi anlatıyor.'],
    apply: (c, s) => 'Kafesteki kucaklaşmanız gecenin en güzel fotoğrafı oldu.' + pop(s, 2),
  },
  {
    id: 'intikam', ozel: true, when: (c) => c.won && c.rovansKazandi,
    text: ['Hesap kapandı. Bu hikâyede son sözü ben söyledim.', 'Beni yendiğin geceyi her gün düşündüm. Bu gece o hayalet gitti.'],
    apply: (c, s) => {
      const r = rival(s, c);
      if (r) r.rivalry = 0;
      return `İntikam tamam. ${c.opp} ile olan defter kapandı.` + pop(s, 4);
    },
  },
  {
    id: 'trilogy', ozel: true, when: (c, s) => c.won && (rival(s, c)?.karsilasma ?? 0) >= 1 && !c.rovansKazandi,
    text: ['Bir kez daha kanıtladım. {opp}, üçüncü maç istersen buradayım.', 'İki kez yendim. Artık yeni isimler istiyorum.'],
    apply: (c, s) => pick(['Rekabet sıklet tarihine geçti.', 'Taraftarlar trilogy mi istiyor, yeni rakip mi? Tartışma başladı.']) + pop(s, 2),
  },
  // ================= GALİBİYET: kemer ve organizasyon =================
  {
    id: 'kemer', ozel: true, when: (c) => c.unvanKazandi && !c.cift,
    text: ['Bu kemer {memleket}’in ve ailemin!', 'Çocukken hayalini kurduğum kemer şimdi belimde!', 'Bunu bana imkânsız diyen herkese adıyorum!'],
    apply: (c, s) => pick(['Annen kafese koştu, kemeri beline birlikte taktınız.', 'Takımın seni omuzlarında taşıdı, havai fişekler patladı.']) + mot(s, 2) + pop(s, 6),
  },
  {
    id: 'cift', ozel: true, when: (c) => !!c.cift,
    text: ['İKİ KEMER! Bunu yapabilen çok az insan var. Tarihe geçtim!', 'Double champ, baby! Sıkletler bana dar geliyor!', 'Bir omzumda bir kemer, diğerinde bir kemer. Kral geri döndü!'],
    apply: (c, s) => pick(['Dünya basını manşette: TARİH YAZILDI!', 'Organizasyon başkanı iki kemeri birlikte taktı. Salon yıkıldı.']) + mot(s, 2) + pop(s, 8),
  },
  {
    id: 'savunma', ozel: true, when: (c) => c.unvanSavundu,
    text: ['Bu tahtı kimseye bırakmam. Sıradaki gelsin!', 'Kemer benim belimde, sıklet benim evim.', 'Kral hâlâ burada!'],
    apply: (c, s) => pick(['Şampiyon edası. Sıklet sana meydan okumak için sıraya girdi.', 'Hükümdarlığın tartışılmaz.']) + pop(s, 3),
  },
  {
    id: 'bonus', ozel: true, when: (c) => c.won && c.bonus > 0 && (isKO(c) || c.yontem === 'SUB'),
    text: ['{orgKisa}, o bonus çeki benim adıma yazılsın!', 'Bonusumu istiyorum, ev taksitlerim var!'],
    apply: (c, s) => {
      if (chance(0.45)) {
        const para = Math.round(c.bonus * 0.5);
        s.para += para;
        return `Organizasyon başkanı gülerek “Hak etti” dedi ve ek $${para.toLocaleString('tr-TR')} verdi!` + pop(s, 1);
      }
      return 'Başkan omuz silkti: “Bonusları ben dağıtırım.” Yine de taraftarlar sevdi.' + pop(s, 1);
    },
  },
  {
    id: 'ufc_hazir', ozel: true, when: (c, s) => c.won && s.stage === 'buyuk' && c.org !== 'dwcs' && s.populerlik >= 25,
    text: ['UFC, beni izliyorsanız: hazırım!', 'Dana White, telefon numaram değişmedi!'],
    apply: (c, s) => {
      if (s.contract && chance(0.3)) {
        s.contract.ucret = Math.round((s.contract.ucret * 0.9) / 100) * 100;
        return `${ORGS[c.org].kisa} bu sözlerden hiç hoşlanmadı. Sonraki dövüş ücretin %10 kesildi.` + pop(s, 2);
      }
      return 'UFC’nin resmi hesabı videonu paylaştı! Radardasın.' + mot(s, 1) + pop(s, 4);
    },
  },
  {
    id: 'dana', ozel: true, when: (c) => c.won && c.org === 'dwcs',
    text: ['Dana, bana o kontratı ver! Hazırım!', 'Bu gece kendimi gösterdim. Artık UFC’deyim, değil mi Dana?'],
    apply: (c, s) => {
      if (s.pending.sonrasi) s.pending.sonrasi.dwcsIkna = true;
      return 'Dana White kameralara gülümsedi. Kontrat şansın arttı.' + pop(s, 2);
    },
  },
  {
    id: 'one', ozel: true, when: (c) => c.won && c.org === 'one',
    text: ['Asya’daki taraftarlara teşekkürler! Burada kendimi evimde hissediyorum.'],
    apply: (c, s) => 'Asya medyası seni bağrına bastı. Yeni sponsor kapıları açıldı.' + pop(s, 3),
  },
  {
    id: 'pfl', ozel: true, when: (c) => c.won && c.org === 'pfl',
    text: ['Sezon benim sezonum. Playoff’larda görüşürüz!'],
    apply: (c, s) => 'PFL yayını seni sezon favorileri arasına aldı.' + mot(s, 1) + pop(s, 2),
  },
  {
    id: 'oktagon', ozel: true, when: (c) => c.won && c.org === 'oktagon',
    text: ['Bu stadyum inanılmaz! Avrupa, adımı ezberle!'],
    apply: (c, s) => 'Stadyum adını tezahürat yaptı. Avrupa medyası seni konuşuyor.' + pop(s, 3),
  },
  {
    id: 'mutevazi', ozel: true, when: (c, s) => c.won && s.stage === 'amator',
    text: ['Daha çok yolum var. Bu sadece ilk adım.', 'Amatördeyim ama hayallerim profesyonel.'],
    apply: (c, s) => 'Yerel gazete seni “ayakları yere basan yetenek” diye yazdı.' + mot(s, 1) + pop(s, 1),
  },
  {
    id: 'yasli_kurt', ozel: true, when: (c, s) => c.won && s.fighter.yas >= 35,
    text: ['Yaşlı dediler, bitti dediler. Yaşlı kurt hâlâ ısırıyor!', 'Yaş sadece bir sayı. Deneyim ise bir silah.'],
    apply: (c, s) => 'Veteran galibiyetin herkesi duygulandırdı.' + pop(s, 4),
  },
  {
    id: 'kilo_ozur', ozel: true, when: (c) => c.won && !!c.kiloKacirdi,
    text: ['Tartıyı kaçırdığım için {opp}’tan ve taraftarlardan özür dilerim.'],
    apply: (c, s) => 'Özrün kabul gördü ama bazıları galibiyetini gölgeli buluyor.' + pop(s, 1),
  },

  // ================= MAĞLUBİYET =================
  {
    id: 'bahane_yok', ozel: false, when: lost,
    text: ['Bahane yok. {opp} bu gece daha iyiydi. Daha güçlü döneceğim.', 'Kaybettim, kabul ediyorum. Ama ben kaybedince pes etmem, çalışırım.', 'Bu gece benim gecem değildi. Tebrikler {opp}.'],
    apply: (c, s) => pick(['Olgun bir duruş. Taraftarların sana olan inancı tazelendi.', 'Sportmenliğin mağlubiyeti gölgede bıraktı.']) + mot(s, 1) + pop(s, 2),
  },
  {
    id: 'rovans', ozel: false, when: lost,
    text: ['Rövanş istiyorum!', '{opp}, bu iş bitmedi. Rövanş!', 'Bir daha dövüşürsek sonuç farklı olur. Rövanş istiyorum.'],
    apply: (c, s) => {
      const r = rival(s, c);
      if (r) r.rivalry += 2;
      return pick([`${c.opp} gülümsedi: “İstediğin zaman.” Bu hikâye bitmedi.`, `${c.opp}: “Önce tekrar hak et.” Gerilim tırmanıyor.`]) + pop(s, 1);
    },
  },
  {
    id: 'aile', ozel: false, when: lost,
    text: ['Aileme ve beni destekleyen herkese özür borçluyum.', 'Beni izleyen çocuklara söz: bu yenilgiden daha güçlü çıkacağım.'],
    apply: (c, s) => pick(['Gözlerin dolu konuştun. Taraftarlar mesaj yağdırdı: “Seninleyiz.”', 'Duygusal konuşman bir milyon kez izlendi.']) + pop(s, 3),
  },
  {
    id: 'hakem', ozel: true, when: (c) => lost(c) && isDec(c),
    text: ['Hakemler yanlış karar verdi! Ben kazandım.', 'Bu bir soygun! Herkes gördü kimin kazandığını.'],
    apply: (c, s) => (close(c) ? 'Karar gerçekten tartışmalıydı. Birçok gazeteci sana hak verdi.' + pop(s, 2) : pick(['Üç hakem de aynı şeyi gördü. Yorumcular seni “kötü kaybeden” ilan etti.', 'İstatistikler ortada. İtirazın ciddiye alınmadı.']) + pop(s, -3)),
  },
  {
    id: 'hatirlamiyorum', ozel: true, when: (c) => lost(c) && c.yontem === 'KO',
    text: ['Açıkçası… son anı hatırlamıyorum. Ama geri döneceğim.', 'Işıklar söndü. Uyandığımda doktor başımdaydı. Ama bitmedim.'],
    apply: (c, s) => {
      s.saglik = clamp(s.saglik - 5, 5, 100);
      return 'Samimiyetin takdir topladı ama doktorlar seni ek kontrole aldı. (Sağlık -5)' + pop(s, 2);
    },
  },
  {
    id: 'erken', ozel: true, when: (c) => lost(c) && c.yontem === 'TKO',
    text: ['Hakem çok erken durdurdu, devam edebilirdim!', 'Sersemlemiştim ama bilincim yerindeydi. Durdurma erkendi.'],
    apply: (c, s) => (chance(0.4) ? 'Tekrar görüntüleri sana hak verdirdi. Tartışma büyüdü.' + pop(s, 2) : 'Görüntüler ortada: sallanıyordun. İnandırıcı olmadı.' + pop(s, -2)),
  },
  {
    id: 'yer_eksik', ozel: true, when: (c) => lost(c) && c.yontem === 'SUB',
    text: ['Yer oyunumda eksik var. Bunu kapatacağım, söz.', 'Tap attım çünkü kariyerim uzun. Bir daha o pozisyona düşmeyeceğim.'],
    apply: (c, s) => 'Hocan başını salladı. Bu yenilgi seni daha iyi yapacak.' + mot(s, 2) + pop(s, 1),
  },
  {
    id: 'sakat', ozel: true, when: (c) => lost(c) && c.sakatDovustu,
    text: ['Sakat dövüştüm. Bahane değil ama herkes bilsin.', 'Kampta sakatlandım ama çekilmedim. Kimse benim korktuğumu söyleyemez.'],
    apply: (c, s) => 'Sakatlığın ortaya çıkınca cesaretin konuşuldu.' + pop(s, 2),
  },
  {
    id: 'kilo_mag', ozel: true, when: (c) => lost(c) && !!c.kiloKacirdi,
    text: ['Kilo verme sürecim felaketti. Bu benim hatam.'],
    apply: (c, s) => 'Dürüstlüğün takdir edildi. Beslenme ekibini değiştirme vakti.' + mot(s, 1),
  },
  {
    id: 'trash_ozur', ozel: true, when: (c) => lost(c) && c.trashOnce,
    text: ['Maçtan önce çok konuştum. Özür dilerim, ders aldım.', 'Sözlerimi geri alıyorum. {opp} haklı çıktı.'],
    apply: (c, s) => {
      const r = rival(s, c);
      if (r) r.rivalry = Math.max(0, r.rivalry - 1);
      return 'Alçakgönüllülüğün yaralarını sardı.' + pop(s, 3);
    },
  },
  {
    id: 'trash_devam', ozel: true, when: (c) => lost(c) && c.trashOnce,
    text: ['Şanslıydı! Rövanşta göreceğiz, sözlerimin arkasındayım.', 'Kaybettim ama söylediklerimin hepsi hâlâ geçerli!'],
    apply: (c, s) => {
      const r = rival(s, c);
      if (r) r.rivalry += 2;
      return 'Kaybettikten sonra laf atmak… Sosyal medya acımasız. Ama rekabet kızıştı.' + pop(s, -3);
    },
  },
  {
    id: 'kemer_kayip', ozel: true, when: (c, s) => lost(c) && s.savunma === 0 && s.unvanlar.length > 0 && !s.sampiyon && (s.rank ?? 99) <= 2,
    text: ['Kemer gitti ama geri alacağım. Söz veriyorum.', 'Tahtımı kaybettim. Şimdi avcı benim.'],
    apply: (c, s) => 'Eski şampiyonun kararlılığı rövanş talebini güçlendirdi.' + mot(s, 2) + pop(s, 2),
  },
  {
    id: 'seri_kotu', ozel: true, when: (c) => lost(c) && (c.seri ?? 0) <= -2,
    text: ['Zor bir dönemden geçiyorum. Her şeyi sorgulayacağım: kampı, takımı, kendimi.'],
    apply: (c, s) => 'Bu olgunluk yeni bir başlangıcın işareti olabilir.' + mot(s, 1),
  },
  {
    id: 'emeklilik', ozel: true, when: (c, s) => lost(c) && ((c.seri ?? 0) <= -2 || s.fighter.yas >= 36),
    text: ['Belki de eldivenleri asma vakti gelmiştir…', 'Bilmiyorum. Ailemle konuşup karar vereceğim.'],
    apply: (c, s) => 'Salon bir anda sessizleşti. Taraftarlar “Bırakma!” diye bağırıyor.' + mot(s, -1) + pop(s, 2),
  },
  {
    id: 'kibirli_rakip', ozel: true, when: (c) => lost(c) && kotuKisilik(c),
    text: ['{opp} kazandı ama saygıyı kazanamadı. Karakteri kafesten büyük değil.'],
    apply: (c, s) => {
      const r = rival(s, c);
      if (r) r.rivalry += 1;
      return chance(0.5) ? 'Birçok taraftar sana hak verdi.' + pop(s, 2) : 'Kötü kaybeden olarak görüldün.' + pop(s, -2);
    },
  },

  // ================= BERABERLİK =================
  {
    id: 'b_rovans', ozel: false, when: (c) => c.draw,
    text: ['Bu iş bitmedi. Rövanş şart!', 'Beraberlik kimseyi tatmin etmez. Bir daha!'],
    apply: (c, s) => {
      const r = rival(s, c);
      if (r) r.rivalry += 2;
      return `${c.opp} de kabul etti. Rövanş şimdiden konuşuluyor.` + pop(s, 2);
    },
  },
  {
    id: 'b_saygi', ozel: false, when: (c) => c.draw,
    text: ['Bence kazandım, ama hakemlere saygı duyuyorum.', 'İki savaşçı, bir sonuç. Adil.'],
    apply: (c, s) => 'Sakin tavrın takdir topladı.' + pop(s, 1),
  },
  {
    id: 'b_ofke', ozel: false, when: (c) => c.draw,
    text: ['Bu bir soygun! Herkes kimin kazandığını gördü!'],
    apply: (c, s) => (chance(0.5) ? 'Taraftarlar seninle birlikte bağırdı.' + pop(s, 2) : 'Öfken hoş karşılanmadı.' + pop(s, -2)),
  },
];

function vars(c: InterviewCtx, s: GameState): Record<string, string | number> {
  return {
    opp: c.opp,
    memleket: s.fighter.memleket,
    raunt: c.raunt,
    maxRaunt: c.maxRaunt,
    hedef: c.hedefRank ? `#${c.hedefRank} ${c.hedef}` : (c.hedef ?? ''),
    sampiyon: c.sampiyon ?? '',
    orgKisa: ORGS[c.org].kisa,
    seri: c.seri ?? 0,
    antrenor: s.takim.antrenor,
  };
}

/** Bağlama uygun 4 seçenek: önce özel olanlar (rastgele), en az bir genel seçenek. Her cümlenin söylenişi rastgele seçilir. */
export function buildInterview(s: GameState, c: InterviewCtx): { id: string; text: string }[] {
  const ok = LINES.filter((l) => l.when(c, s));
  const special = shuffle(ok.filter((l) => l.ozel)).slice(0, 3);
  const general = shuffle(ok.filter((l) => !l.ozel));
  const chosen = [...special, ...general].slice(0, 4);
  if (!chosen.some((l) => !l.ozel) && general.length) chosen[chosen.length - 1] = general[0];
  return chosen.map((l) => ({ id: l.id, text: fill(pick(l.text), vars(c, s)) }));
}

export function applyInterview(s: GameState, id: string, c: InterviewCtx): string {
  const l = LINES.find((x) => x.id === id);
  return l ? l.apply(c, s) : '';
}

export const INTERVIEW_LINE_COUNT = LINES.reduce((a, l) => a + l.text.length, 0);

/** Dövüş sonrası bağlamı: sıralamada üstteki hedef ve şampiyon. */
export function interviewTargets(s: GameState, won: boolean) {
  const out: Pick<InterviewCtx, 'hedefId' | 'hedef' | 'hedefRank' | 'sampiyonId' | 'sampiyon'> = {};
  if (!won || !s.bolum || s.sampiyon) return out;
  const L = ORGS[s.bolum.org].merdiven;
  const r = s.rank == null ? L - 2 : Math.max(1, s.rank - 2);
  const t = rankedOpponent(s, r);
  if (t) Object.assign(out, { hedefId: t.id, hedef: `${t.ad} ${t.soyad}`, hedefRank: t.rank ?? undefined });
  if (s.bolum.sampiyon) Object.assign(out, { sampiyonId: s.bolum.sampiyon.id, sampiyon: s.bolum.sampiyon.soyad });
  return out;
}
