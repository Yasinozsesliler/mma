// Kafes içi röportaj: seçenekler dövüşün bağlamına göre üretilir, her birinin sonucu vardır.
// Her cümlenin birden çok söylenişi ve sonucu vardır; aynı röportaj iki kez aynı çıkmaz.
import { L, LOC } from '../i18n';
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
  return d === 0 ? '' : L(" (Popülerlik {0}{1})", [d > 0 ? '+' : '', d]);
};
const mot = (s: GameState, d: number) => {
  s.motivasyon = Math.max(-2, Math.min(2, s.motivasyon + d));
  return d > 0 ? L(" (Sonraki kampta motivasyon bonusu)") : d < 0 ? L(" (Motivasyon düştü)") : '';
};
const rival = (s: GameState, c: InterviewCtx) => s.rakipler.find((r) => r.id === c.oppId);
const isKO = (c: InterviewCtx) => c.yontem === 'KO' || c.yontem === 'TKO';
const isDec = (c: InterviewCtx) => ['UD', 'SD', 'MD'].includes(c.yontem);
const close = (c: InterviewCtx) => c.yontem === 'SD' || c.yontem === 'MD';
const lost = (c: InterviewCtx) => !c.won && !c.draw;
const kotuKisilik = (c: InterviewCtx) => [L("Trash talk ustası"), L("Kibirli"), L("Öfkeli"), L("Şovmen")].includes(c.kisilik ?? '');

const LINES: Line[] = [
  // ================= GALİBİYET: genel =================
  {
    id: 'saygi', ozel: false, when: (c) => c.won,
    text: [L("{opp} gerçek bir savaşçı. Bu gece bana her şeyi yaptırdı."), L("{opp}’a saygım sonsuz. Kafeste yürek gösterdi."), L("Bu zafer kadar {opp}’ın mücadelesi de alkışı hak ediyor.")],
    apply: (c, s) => {
      const r = rival(s, c);
      if (r) r.rivalry = Math.max(0, r.rivalry - 1);
      return pick([L("Salon seni ayakta alkışladı. Olgun bir galip."), L("Rakibin köşesinden bile alkış geldi. Sportmenliğin konuşuldu."), L("Yorumcular: “İşte şampiyon karakteri.”")]) + pop(s, 1);
    },
  },
  {
    id: 'memleket', ozel: false, when: (c) => c.won,
    text: [L("Bu zafer {memleket} için!"), L("{memleket}, bu gece sizin için dövüştüm!"), L("Anneme ve {memleket}’teki herkese selam olsun!")],
    apply: (c, s) => pick([L("{0}’te insanlar sokağa döküldü, kornalar çalıyor.", [s.fighter.memleket]), L("{0} belediyesi seni ağırlamak için tören hazırlığında.", [s.fighter.memleket]), L("Memleketteki kahvehanelerde maç tekrar tekrar izleniyor.")]) + pop(s, (COUNTRIES[s.fighter.uyruk]?.taraftar ?? 5) >= 7 ? 3 : 2),
  },
  {
    id: 'tanri', ozel: false, when: (c) => c.won,
    text: [L("Önce Allah’a, sonra hocama ve takımıma teşekkür ederim."), L("Bu galibiyet salondaki herkesin. {antrenor} olmasa burada olmazdım.")],
    apply: (c, s) => pick([L("Takımın kafese koşup seni omuzlarına aldı."), L("{0} gözyaşlarını tutamadı.", [s.takim.antrenor])]) + mot(s, 1) + pop(s, 1),
  },
  {
    id: 'daha_iyi', ozel: false, when: (c) => c.won,
    text: [L("Bugün yüzde 70’imdi. Gerçek beni henüz görmediniz."), L("Hatalar yaptım, düzelteceğim. Bu daha başlangıç.")],
    apply: (c, s) => pick([L("Özeleştirin takdir topladı, rakipler not aldı."), L("Hırsın kameraya yansıdı.")]) + mot(s, 1),
  },
  // ================= GALİBİYET: bitiriş şekli =================
  {
    id: 'ko', ozel: true, when: (c) => c.won && isKO(c),
    text: [L("Ellerimin ağır olduğunu söylemiştim. {raunt}. rauntta ışıkları kapattım!"), L("Bu yumruğu kampta bin kez çalıştık. Bin birincisi {opp}’a geldi!"), L("Uyku saati geldi {opp}. İyi geceler!")],
    apply: (c, s) => pick([L("Nakavt klibin sosyal medyada milyonlarca izlendi."), L("Gecenin en çok paylaşılan anı senin yumruğun."), L("Yorumcular nakavtı “yılın nakavtı” adayı ilan etti.")]) + pop(s, c.raunt === 1 ? 5 : 3),
  },
  {
    id: 'sub', ozel: true, when: (c) => c.won && c.yontem === 'SUB',
    text: [L("Yer benim evim. Oraya gelen herkes tap atar."), L("Kolunu kırmak istemedim, tap attığı iyi oldu."), L("Anakonda gibi sardım. Nefes alamadı.")],
    apply: (c, s) => pick([L("Yorumcular seni sıkletin en tehlikeli yer dövüşçüleri arasında saymaya başladı."), L("Güreşçiler artık seninle yere inmekten korkacak.")]) + pop(s, 3),
  },
  {
    id: 'hizli', ozel: true, when: (c) => c.won && (isKO(c) || c.yontem === 'SUB') && c.raunt === 1,
    text: [L("Isınamadım bile! Organizasyon bana daha zor bir rakip bulsun."), L("Maaşımın dakikası kaç para etti, hesaplayın!"), L("Planım üç rauntluktu, bir raunt yetti.")],
    apply: (c, s) => pick([L("“Isınamadım bile” cümlesi meme oldu!"), L("Matchmaker’lar isteğini ciddiye aldı.")]) + pop(s, 4),
  },
  {
    id: 'ders', ozel: true, when: (c) => c.won && c.yontem === 'UD',
    text: [L("{maxRaunt} raunt boyunca ona ders verdim. Bir dahakine bitireceğim."), L("Satranç oynadım, o dama oynadı."), L("Her raundu aldım, her pozisyonu kazandım.")],
    apply: (c, s) => pick([L("Bazıları “sıkıcı” dedi, ama kimse üstünlüğünü tartışmıyor."), L("Teknik direktörler performansını analiz etti: “ders niteliğinde”.")]) + mot(s, 1),
  },
  {
    id: 'split_mutevazi', ozel: true, when: (c) => c.won && close(c),
    text: [L("Zor bir geceydi. Bir dahaki sefere işi hakemlere bırakmayacağım."), L("Hakemler bana verdi ama {opp} de kazanmayı hak ediyordu.")],
    apply: (c, s) => pick([L("Dürüst bir itiraf. Taraftarlar sana saygı duydu."), L("Rakibin bile bu sözleri paylaştı.")]) + mot(s, 1) + pop(s, 1),
  },
  {
    id: 'split_iddiali', ozel: true, when: (c) => c.won && close(c),
    text: [L("Açık ara kazandım! Bunu tartışan maçı izlememiş."), L("Ayrık karar mı? Hakemlerin gözlüğe ihtiyacı var, açık ara bendeydi.")],
    apply: (c, s) => (chance(0.5) ? L("Taraftarların arkanda durdu, tartışma seni daha çok konuşturdu.") + pop(s, 2) : L("Yuhalandın. Kararı bu kadar net görmeyen çok kişi vardı.") + pop(s, -3)),
  },
  // ================= GALİBİYET: dövüşün hikâyesi =================
  {
    id: 'geri_donus', ozel: true, when: (c) => c.won && !!c.geriDonus,
    text: [L("Herkes bitti sandı. Ben bitmem!"), L("Rauntları kaybediyordum, köşem bana inandı. Kalbim kazandı bu maçı."), L("Geriden gelmek bir karakter meselesi.")],
    apply: (c, s) => pick([L("Geri dönüşün “gecenin hikâyesi” oldu."), L("Kimse ayağa kalkmadan oturmadı. Efsanevi bir dönüş.")]) + mot(s, 2) + pop(s, 4),
  },
  {
    id: 'yerden_kalk', ozel: true, when: (c) => c.won && (c.pKd ?? 0) > 0,
    text: [L("Beni yere indirdi, ama asıl önemli olan kalkmak."), L("Tavanı gördüm, sonra onun çenesini gördüm!"), L("Yere düştüm, kalktım, kazandım. Hayat da böyle.")],
    apply: (c, s) => pick([L("Çenen ve yüreğin tartışılmaz oldu."), L("Bu dayanıklılık hikâyesi motivasyon videolarına girdi.")]) + pop(s, 3),
  },
  {
    id: 'surpriz', ozel: true, when: (c) => c.won && !!c.surpriz,
    text: [L("Kimse benim kazanacağımı düşünmüyordu. Bahis oranları şimdi ne diyor?"), L("Favori mi? Artık favori benim."), L("Beni hafife alan herkes bu gece öğrendi.")],
    apply: (c, s) => pick([L("Bahisçiler şokta: yılın sürprizlerinden biri!"), L("Sürpriz galibiyetin tüm spor sayfalarında.")]) + pop(s, 5),
  },
  {
    id: 'savas', ozel: true, when: (c) => c.won && !!c.savas,
    text: [L("Buna dövüş değil, savaş denir. {opp}’a saygılar."), L("İkimiz de kanadık. Seyirci parasının karşılığını aldı!")],
    apply: (c, s) => pick([L("“Yılın dövüşü” adaylarına girdiniz."), L("Seyirciler ayakta, iki savaşçıyı da alkışladı.")]) + pop(s, 3),
  },
  {
    id: 'ilk_pro', ozel: true, when: (c) => c.won && !!c.ilkPro,
    text: [L("İlk profesyonel galibiyet! Bu anı ömrüm boyunca unutmayacağım."), L("Bir rüya başladı. Profesyonel olarak ilk zafer!")],
    apply: (c, s) => pick([L("Profesyonel kariyerine muhteşem bir başlangıç."), L("Yerel basın “yeni bir yıldız doğuyor” başlığını attı.")]) + mot(s, 1) + pop(s, 2),
  },
  {
    id: 'org_ilk', ozel: true, when: (c) => c.won && !!c.orgIlk && !c.ilkPro,
    text: [L("{orgKisa}’a merhaba dedim! Bu organizasyonu sallayacağım."), L("Yeni evime ilk hediyem bu galibiyet.")],
    apply: (c, s) => pick([L("{0} yöneticileri yeni transferlerinden memnun.", [ORGS[c.org].kisa]), L("Organizasyonun resmi hesabı seni “yılın transferi” diye paylaştı.")]) + pop(s, 3),
  },
  {
    id: 'seri', ozel: true, when: (c) => c.won && (c.seri ?? 0) >= 4,
    text: [L("{seri} maçtır kaybetmiyorum. Kim durduracak beni?"), L("Seri devam ediyor. Sıklette beni durduracak kimse yok.")],
    apply: (c, s) => pick([L("Seri istatistikleri ekranlarda. Herkes kimin durduracağını tartışıyor."), L("Sıklette “yenilmez” etiketi sana yapışmaya başladı.")]) + pop(s, 3),
  },
  // ================= GALİBİYET: rakip ve hedef =================
  {
    id: 'hedef', ozel: true, when: (c) => c.won && !!c.hedef,
    text: [L("{hedef}! Sıradaki sensin, kaçma!"), L("{hedef}, seni izliyorum. Tarih ver."), L("{hedef}, bu kemere giden yolda sen varsın. Çekil ya da savaş!")],
    apply: (c, s) => {
      if (chance(0.5 + s.populerlik / 200)) {
        s.cagri = c.hedefId ?? null;
        return pick([L("Salon inledi. {0} kamerasına bakıp başını salladı. Organizasyon bu maçı düşünüyor.", [c.hedef]), L("{0} sosyal medyadan cevap verdi: “Tamam.” Maç konuşuluyor!", [c.hedef])]) + pop(s, 3);
      }
      return pick([L("Salon sessiz kaldı. {0} cevap bile vermedi.", [c.hedef]), L("{0} güldü: “Önce sıranı bekle.”", [c.hedef])]) + pop(s, -1);
    },
  },
  {
    id: 'sampiyon', ozel: true, when: (c, s) => c.won && !!c.sampiyon && !s.sampiyon && s.rank != null && s.rank <= 5,
    text: [L("Şampiyon {sampiyon}! Kemerini parlat, geliyorum!"), L("{sampiyon}, o kemer benim belimde daha güzel duracak."), L("Kafeste {sampiyon}’ı görmek istiyorum. Şimdi!")],
    apply: (c, s) => {
      if (chance(0.35 + s.populerlik / 150)) {
        s.cagri = c.sampiyonId ?? null;
        return L("Şampiyon kafese girdi, burun buruna geldiniz! Görüntüler her yerde. Ünvan maçı konuşuluyor.") + pop(s, 6);
      }
      return pick([L("Şampiyon güldü: “Önce sırana gir.” Sosyal medyada alay konusu oldun."), L("Şampiyon röportajını izlemedi bile. Soğuk bir sessizlik.")]) + pop(s, -2);
    },
  },
  {
    id: 'kibirliye', ozel: true, when: (c) => c.won && kotuKisilik(c),
    text: [L("Maçtan önce çok konuşuyordun {opp}. Şimdi sessiz kalmak sana yakışıyor."), L("{opp}, laf yetmiyor. Bunu öğrenmiş olmalısın.")],
    apply: (c, s) => {
      const r = rival(s, c);
      if (r) r.rivalry++;
      return pick([L("Taraftarlar bu cevabı çok sevdi!"), L("“Sözün bittiği yer” klibin viral oldu.")]) + pop(s, 4);
    },
  },
  {
    id: 'saygiliya', ozel: true, when: (c) => c.won && c.kisilik === L("Saygılı"),
    text: [L("{opp} gibi sporcular bu sporu güzelleştiriyor. Kucaklaşmamız her şeyi anlatıyor.")],
    apply: (c, s) => L("Kafesteki kucaklaşmanız gecenin en güzel fotoğrafı oldu.") + pop(s, 2),
  },
  {
    id: 'intikam', ozel: true, when: (c) => c.won && c.rovansKazandi,
    text: [L("Hesap kapandı. Bu hikâyede son sözü ben söyledim."), L("Beni yendiğin geceyi her gün düşündüm. Bu gece o hayalet gitti.")],
    apply: (c, s) => {
      const r = rival(s, c);
      if (r) r.rivalry = 0;
      return L("İntikam tamam. {0} ile olan defter kapandı.", [c.opp]) + pop(s, 4);
    },
  },
  {
    id: 'trilogy', ozel: true, when: (c, s) => c.won && (rival(s, c)?.karsilasma ?? 0) >= 1 && !c.rovansKazandi,
    text: [L("Bir kez daha kanıtladım. {opp}, üçüncü maç istersen buradayım."), L("İki kez yendim. Artık yeni isimler istiyorum.")],
    apply: (c, s) => pick([L("Rekabet sıklet tarihine geçti."), L("Taraftarlar trilogy mi istiyor, yeni rakip mi? Tartışma başladı.")]) + pop(s, 2),
  },
  // ================= GALİBİYET: kemer ve organizasyon =================
  {
    id: 'kemer', ozel: true, when: (c) => c.unvanKazandi && !c.cift,
    text: [L("Bu kemer {memleket}’in ve ailemin!"), L("Çocukken hayalini kurduğum kemer şimdi belimde!"), L("Bunu bana imkânsız diyen herkese adıyorum!")],
    apply: (c, s) => pick([L("Annen kafese koştu, kemeri beline birlikte taktınız."), L("Takımın seni omuzlarında taşıdı, havai fişekler patladı.")]) + mot(s, 2) + pop(s, 6),
  },
  {
    id: 'cift', ozel: true, when: (c) => !!c.cift,
    text: [L("Aynı anda birden fazla kemer! Bunu yapabilen çok az insan var. Tarihe geçtim!"), L("Sıkletler bana dar geliyor! Kemerleri say bakalım!"), L("Omuzlarımda kemerler, kral geri döndü!")],
    apply: (c, s) => pick([L("Dünya basını manşette: TARİH YAZILDI!"), L("Organizasyon başkanı iki kemeri birlikte taktı. Salon yıkıldı.")]) + mot(s, 2) + pop(s, 8),
  },
  {
    id: 'savunma', ozel: true, when: (c) => c.unvanSavundu,
    text: [L("Bu tahtı kimseye bırakmam. Sıradaki gelsin!"), L("Kemer benim belimde, sıklet benim evim."), L("Kral hâlâ burada!")],
    apply: (c, s) => pick([L("Şampiyon edası. Sıklet sana meydan okumak için sıraya girdi."), L("Hükümdarlığın tartışılmaz.")]) + pop(s, 3),
  },
  {
    id: 'bonus', ozel: true, when: (c) => c.won && c.bonus > 0 && (isKO(c) || c.yontem === 'SUB'),
    text: [L("{orgKisa}, o bonus çeki benim adıma yazılsın!"), L("Bonusumu istiyorum, ev taksitlerim var!")],
    apply: (c, s) => {
      if (chance(0.45)) {
        const para = Math.round(c.bonus * 0.5);
        s.para += para;
        return L("Organizasyon başkanı gülerek “Hak etti” dedi ve ek ${0} verdi!", [para.toLocaleString(LOC)]) + pop(s, 1);
      }
      return L("Başkan omuz silkti: “Bonusları ben dağıtırım.” Yine de taraftarlar sevdi.") + pop(s, 1);
    },
  },
  {
    id: 'ufc_hazir', ozel: true, when: (c, s) => c.won && s.stage === 'buyuk' && c.org !== 'dwcs' && s.populerlik >= 25,
    text: [L("UFC, beni izliyorsanız: hazırım!"), L("Dana White, telefon numaram değişmedi!")],
    apply: (c, s) => {
      if (s.contract && chance(0.3)) {
        s.contract.ucret = Math.round((s.contract.ucret * 0.9) / 100) * 100;
        return L("{0} bu sözlerden hiç hoşlanmadı. Sonraki dövüş ücretin %10 kesildi.", [ORGS[c.org].kisa]) + pop(s, 2);
      }
      return L("UFC’nin resmi hesabı videonu paylaştı! Radardasın.") + mot(s, 1) + pop(s, 4);
    },
  },
  {
    id: 'dana', ozel: true, when: (c) => c.won && c.org === 'dwcs',
    text: [L("Dana, bana o kontratı ver! Hazırım!"), L("Bu gece kendimi gösterdim. Artık UFC’deyim, değil mi Dana?")],
    apply: (c, s) => {
      if (s.pending.sonrasi) s.pending.sonrasi.dwcsIkna = true;
      return L("Dana White kameralara gülümsedi. Kontrat şansın arttı.") + pop(s, 2);
    },
  },
  {
    id: 'one', ozel: true, when: (c) => c.won && c.org === 'one',
    text: [L("Asya’daki taraftarlara teşekkürler! Burada kendimi evimde hissediyorum.")],
    apply: (c, s) => L("Asya medyası seni bağrına bastı. Yeni sponsor kapıları açıldı.") + pop(s, 3),
  },
  {
    id: 'pfl', ozel: true, when: (c) => c.won && c.org === 'pfl',
    text: [L("Sezon benim sezonum. Playoff’larda görüşürüz!")],
    apply: (c, s) => L("PFL yayını seni sezon favorileri arasına aldı.") + mot(s, 1) + pop(s, 2),
  },
  {
    id: 'oktagon', ozel: true, when: (c) => c.won && c.org === 'oktagon',
    text: [L("Bu stadyum inanılmaz! Avrupa, adımı ezberle!")],
    apply: (c, s) => L("Stadyum adını tezahürat yaptı. Avrupa medyası seni konuşuyor.") + pop(s, 3),
  },
  {
    id: 'mutevazi', ozel: true, when: (c, s) => c.won && s.stage === 'amator',
    text: [L("Daha çok yolum var. Bu sadece ilk adım."), L("Amatördeyim ama hayallerim profesyonel.")],
    apply: (c, s) => L("Yerel gazete seni “ayakları yere basan yetenek” diye yazdı.") + mot(s, 1) + pop(s, 1),
  },
  {
    id: 'yasli_kurt', ozel: true, when: (c, s) => c.won && s.fighter.yas >= 35,
    text: [L("Yaşlı dediler, bitti dediler. Yaşlı kurt hâlâ ısırıyor!"), L("Yaş sadece bir sayı. Deneyim ise bir silah.")],
    apply: (c, s) => L("Veteran galibiyetin herkesi duygulandırdı.") + pop(s, 4),
  },
  {
    id: 'kilo_ozur', ozel: true, when: (c) => c.won && !!c.kiloKacirdi,
    text: [L("Tartıyı kaçırdığım için {opp}’tan ve taraftarlardan özür dilerim.")],
    apply: (c, s) => L("Özrün kabul gördü ama bazıları galibiyetini gölgeli buluyor.") + pop(s, 1),
  },

  // ================= MAĞLUBİYET =================
  {
    id: 'bahane_yok', ozel: false, when: lost,
    text: [L("Bahane yok. {opp} bu gece daha iyiydi. Daha güçlü döneceğim."), L("Kaybettim, kabul ediyorum. Ama ben kaybedince pes etmem, çalışırım."), L("Bu gece benim gecem değildi. Tebrikler {opp}.")],
    apply: (c, s) => pick([L("Olgun bir duruş. Taraftarların sana olan inancı tazelendi."), L("Sportmenliğin mağlubiyeti gölgede bıraktı.")]) + mot(s, 1) + pop(s, 2),
  },
  {
    id: 'rovans', ozel: false, when: lost,
    text: [L("Rövanş istiyorum!"), L("{opp}, bu iş bitmedi. Rövanş!"), L("Bir daha dövüşürsek sonuç farklı olur. Rövanş istiyorum.")],
    apply: (c, s) => {
      const r = rival(s, c);
      if (r) r.rivalry += 2;
      return pick([L("{0} gülümsedi: “İstediğin zaman.” Bu hikâye bitmedi.", [c.opp]), L("{0}: “Önce tekrar hak et.” Gerilim tırmanıyor.", [c.opp])]) + pop(s, 1);
    },
  },
  {
    id: 'aile', ozel: false, when: lost,
    text: [L("Aileme ve beni destekleyen herkese özür borçluyum."), L("Beni izleyen çocuklara söz: bu yenilgiden daha güçlü çıkacağım.")],
    apply: (c, s) => pick([L("Gözlerin dolu konuştun. Taraftarlar mesaj yağdırdı: “Seninleyiz.”"), L("Duygusal konuşman bir milyon kez izlendi.")]) + pop(s, 3),
  },
  {
    id: 'hakem', ozel: true, when: (c) => lost(c) && isDec(c),
    text: [L("Hakemler yanlış karar verdi! Ben kazandım."), L("Bu bir soygun! Herkes gördü kimin kazandığını.")],
    apply: (c, s) => (close(c) ? L("Karar gerçekten tartışmalıydı. Birçok gazeteci sana hak verdi.") + pop(s, 2) : pick([L("Üç hakem de aynı şeyi gördü. Yorumcular seni “kötü kaybeden” ilan etti."), L("İstatistikler ortada. İtirazın ciddiye alınmadı.")]) + pop(s, -3)),
  },
  {
    id: 'hatirlamiyorum', ozel: true, when: (c) => lost(c) && c.yontem === 'KO',
    text: [L("Açıkçası… son anı hatırlamıyorum. Ama geri döneceğim."), L("Işıklar söndü. Uyandığımda doktor başımdaydı. Ama bitmedim.")],
    apply: (c, s) => {
      s.saglik = clamp(s.saglik - 5, 5, 100);
      return L("Samimiyetin takdir topladı ama doktorlar seni ek kontrole aldı. (Sağlık -5)") + pop(s, 2);
    },
  },
  {
    id: 'erken', ozel: true, when: (c) => lost(c) && c.yontem === 'TKO',
    text: [L("Hakem çok erken durdurdu, devam edebilirdim!"), L("Sersemlemiştim ama bilincim yerindeydi. Durdurma erkendi.")],
    apply: (c, s) => (chance(0.4) ? L("Tekrar görüntüleri sana hak verdirdi. Tartışma büyüdü.") + pop(s, 2) : L("Görüntüler ortada: sallanıyordun. İnandırıcı olmadı.") + pop(s, -2)),
  },
  {
    id: 'yer_eksik', ozel: true, when: (c) => lost(c) && c.yontem === 'SUB',
    text: [L("Yer oyunumda eksik var. Bunu kapatacağım, söz."), L("Tap attım çünkü kariyerim uzun. Bir daha o pozisyona düşmeyeceğim.")],
    apply: (c, s) => L("Hocan başını salladı. Bu yenilgi seni daha iyi yapacak.") + mot(s, 2) + pop(s, 1),
  },
  {
    id: 'sakat', ozel: true, when: (c) => lost(c) && c.sakatDovustu,
    text: [L("Sakat dövüştüm. Bahane değil ama herkes bilsin."), L("Kampta sakatlandım ama çekilmedim. Kimse benim korktuğumu söyleyemez.")],
    apply: (c, s) => L("Sakatlığın ortaya çıkınca cesaretin konuşuldu.") + pop(s, 2),
  },
  {
    id: 'kilo_mag', ozel: true, when: (c) => lost(c) && !!c.kiloKacirdi,
    text: [L("Kilo verme sürecim felaketti. Bu benim hatam.")],
    apply: (c, s) => L("Dürüstlüğün takdir edildi. Beslenme ekibini değiştirme vakti.") + mot(s, 1),
  },
  {
    id: 'trash_ozur', ozel: true, when: (c) => lost(c) && c.trashOnce,
    text: [L("Maçtan önce çok konuştum. Özür dilerim, ders aldım."), L("Sözlerimi geri alıyorum. {opp} haklı çıktı.")],
    apply: (c, s) => {
      const r = rival(s, c);
      if (r) r.rivalry = Math.max(0, r.rivalry - 1);
      return L("Alçakgönüllülüğün yaralarını sardı.") + pop(s, 3);
    },
  },
  {
    id: 'trash_devam', ozel: true, when: (c) => lost(c) && c.trashOnce,
    text: [L("Şanslıydı! Rövanşta göreceğiz, sözlerimin arkasındayım."), L("Kaybettim ama söylediklerimin hepsi hâlâ geçerli!")],
    apply: (c, s) => {
      const r = rival(s, c);
      if (r) r.rivalry += 2;
      return L("Kaybettikten sonra laf atmak… Sosyal medya acımasız. Ama rekabet kızıştı.") + pop(s, -3);
    },
  },
  {
    id: 'kemer_kayip', ozel: true, when: (c, s) => lost(c) && s.savunma === 0 && s.unvanlar.length > 0 && !s.sampiyon && (s.rank ?? 99) <= 2,
    text: [L("Kemer gitti ama geri alacağım. Söz veriyorum."), L("Tahtımı kaybettim. Şimdi avcı benim.")],
    apply: (c, s) => L("Eski şampiyonun kararlılığı rövanş talebini güçlendirdi.") + mot(s, 2) + pop(s, 2),
  },
  {
    id: 'seri_kotu', ozel: true, when: (c) => lost(c) && (c.seri ?? 0) <= -2,
    text: [L("Zor bir dönemden geçiyorum. Her şeyi sorgulayacağım: kampı, takımı, kendimi.")],
    apply: (c, s) => L("Bu olgunluk yeni bir başlangıcın işareti olabilir.") + mot(s, 1),
  },
  {
    id: 'emeklilik', ozel: true, when: (c, s) => lost(c) && ((c.seri ?? 0) <= -2 || s.fighter.yas >= 36),
    text: [L("Belki de eldivenleri asma vakti gelmiştir…"), L("Bilmiyorum. Ailemle konuşup karar vereceğim.")],
    apply: (c, s) => L("Salon bir anda sessizleşti. Taraftarlar “Bırakma!” diye bağırıyor.") + mot(s, -1) + pop(s, 2),
  },
  {
    id: 'kibirli_rakip', ozel: true, when: (c) => lost(c) && kotuKisilik(c),
    text: [L("{opp} kazandı ama saygıyı kazanamadı. Karakteri kafesten büyük değil.")],
    apply: (c, s) => {
      const r = rival(s, c);
      if (r) r.rivalry += 1;
      return chance(0.5) ? L("Birçok taraftar sana hak verdi.") + pop(s, 2) : L("Kötü kaybeden olarak görüldün.") + pop(s, -2);
    },
  },

  // ================= BERABERLİK =================
  {
    id: 'b_rovans', ozel: false, when: (c) => c.draw,
    text: [L("Bu iş bitmedi. Rövanş şart!"), L("Beraberlik kimseyi tatmin etmez. Bir daha!")],
    apply: (c, s) => {
      const r = rival(s, c);
      if (r) r.rivalry += 2;
      return L("{0} de kabul etti. Rövanş şimdiden konuşuluyor.", [c.opp]) + pop(s, 2);
    },
  },
  {
    id: 'b_saygi', ozel: false, when: (c) => c.draw,
    text: [L("Bence kazandım, ama hakemlere saygı duyuyorum."), L("İki savaşçı, bir sonuç. Adil.")],
    apply: (c, s) => L("Sakin tavrın takdir topladı.") + pop(s, 1),
  },
  {
    id: 'b_ofke', ozel: false, when: (c) => c.draw,
    text: [L("Bu bir soygun! Herkes kimin kazandığını gördü!")],
    apply: (c, s) => (chance(0.5) ? L("Taraftarlar seninle birlikte bağırdı.") + pop(s, 2) : L("Öfken hoş karşılanmadı.") + pop(s, -2)),
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
