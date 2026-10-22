import { L } from '../i18n';
import type { Background, OrgId, Stage, StatKey, Stats, WeightClass } from './types';

// ---------- Ülkeler ----------
// egitim: antrenman imkânı (0-10), taraftar: taraftar desteği (0-10)
export interface Country {
  ad: string;
  egitim: number;
  taraftar: number;
  salon: string;
  antrenor: string;
}

export const COUNTRIES: Record<string, Country> = {
  tr: { ad: L("Türkiye"), egitim: 5, taraftar: 8, salon: L("Kapalıçarşı Dövüş Kulübü"), antrenor: L("Hakkı Usta") },
  us: { ad: L('ABD'), egitim: 9, taraftar: 6, salon: L("Iron Ridge MMA"), antrenor: L("Coach Dale Brennan") },
  br: { ad: L("Brezilya"), egitim: 8, taraftar: 8, salon: L("Academia Leão Dourado"), antrenor: L("Mestre Tião Barbosa") },
  ru: { ad: L("Rusya (Dağıstan)"), egitim: 8, taraftar: 7, salon: L("Kaspiy Güreş Evi"), antrenor: L("Magomed Aliyev") },
  gb: { ad: L("Birleşik Krallık"), egitim: 6, taraftar: 7, salon: L("Northside Fight Lab"), antrenor: L("Gaz Whitmore") },
  ie: { ad: L("İrlanda"), egitim: 5, taraftar: 9, salon: L("Liffey Combat"), antrenor: L("Seamus Doyle") },
  fr: { ad: L("Fransa"), egitim: 6, taraftar: 5, salon: L("Le Cercle MMA"), antrenor: L("Rémi Garnier") },
  de: { ad: L("Almanya"), egitim: 6, taraftar: 4, salon: L("Kampfwerk Köln"), antrenor: L("Jens Hartmann") },
  pl: { ad: L("Polonya"), egitim: 6, taraftar: 7, salon: L("Wilk Team"), antrenor: L("Marek Zając") },
  cz: { ad: L("Çekya"), egitim: 5, taraftar: 7, salon: L("Brno Fight Club"), antrenor: L("Tomáš Novák") },
  ge: { ad: L("Gürcistan"), egitim: 6, taraftar: 6, salon: L("Tiflis Güreş Akademisi"), antrenor: L("Levan Beridze") },
  kz: { ad: L("Kazakistan"), egitim: 5, taraftar: 6, salon: L("Bozkır Savaşçıları"), antrenor: L("Nurlan Seitkali") },
  mx: { ad: L("Meksika"), egitim: 5, taraftar: 8, salon: L("Casa del Guerrero"), antrenor: L("Don Chuy Ramírez") },
  jp: { ad: L("Japonya"), egitim: 6, taraftar: 5, salon: L("Kaze Dojo"), antrenor: L("Hiroshi Tanabe") },
  ng: { ad: L("Nijerya"), egitim: 4, taraftar: 7, salon: L("Lagos Lions Gym"), antrenor: L("Emeka Obi") },
  au: { ad: L("Avustralya"), egitim: 7, taraftar: 5, salon: L("Southern Cross MMA"), antrenor: L("Brad Kinsella") },
  az: { ad: L("Azerbaycan"), egitim: 5, taraftar: 7, salon: L("Xəzər Döyüş Klubu"), antrenor: L("Elnur Qasımov") },
};

// ---------- Sıkletler ----------
export const WEIGHT_CLASSES: Record<WeightClass, { ad: string; kg: number; lb: number }> = {
  sinek: { ad: L("Sinek"), kg: 57, lb: 125 },
  horoz: { ad: L("Horoz"), kg: 61, lb: 135 },
  tuy: { ad: L("Tüy"), kg: 66, lb: 145 },
  hafif: { ad: L("Hafif"), kg: 70, lb: 155 },
  welter: { ad: L("Welter"), kg: 77, lb: 170 },
  orta: { ad: L("Orta"), kg: 84, lb: 185 },
  yariagir: { ad: L("Yarı Ağır"), kg: 93, lb: 205 },
  agir: { ad: L("Ağır"), kg: 120, lb: 265 },
};

/** Sıkletin dövüşe etkisi: hafifler hızlı, ağırlar sert vurur. */
export const WEIGHT_MODS: Record<WeightClass, Partial<Stats>> = {
  sinek: { hiz: 6, kondisyon: 4, cene: -2 },
  horoz: { hiz: 5, kondisyon: 3 },
  tuy: { hiz: 3, kondisyon: 2 },
  hafif: { hiz: 1 },
  welter: {},
  orta: { vurus: 1, hiz: -1 },
  yariagir: { vurus: 3, hiz: -3, kondisyon: -2 },
  agir: { vurus: 5, cene: 2, hiz: -6, kondisyon: -5 },
};

// ---------- Dövüş geçmişleri ----------
export interface BackgroundInfo {
  ad: string;
  aciklama: string;
  mods: Stats;
  guclu: string;
  zayif: string;
  ikon: string;
  zorluk: string;
  plan: string;
  detay: string;
}

export const BACKGROUNDS: Record<Background, BackgroundInfo> = {
  boks: {
    ad: L("Boks"),
    aciklama: L("Keskin eller, iyi kafa hareketi. Yerde ise kaybolmuş gibisin."),
    mods: { vurus: 16, gures: -10, yer: -12, kondisyon: 3, cene: 5, hiz: 8, iq: 2 },
    guclu: L("El kombinasyonları, kafa hareketi"),
    zayif: L("Takedown savunması, yer dövüşü"),
    ikon: '🥊',
    zorluk: L("Orta"),
    plan: L("Ayakta kal, vuruşla boz · Kontra dövüş"),
    detay: L("Yıllarca ringde el çalıştın. Kafeste en temiz yumruklar senden çıkar ve kafa hareketin sayesinde az darbe alırsın. Ama güreşçiler bacaklarına daldığında ne yapacağını bilemezsin. İlk kamplarını güreş savunmasına ayırman gerekebilir."),
  },
  muaythai: {
    ad: L("Muay Thai"),
    aciklama: L("Dirsek, diz, low kick. Clinch senin evin."),
    mods: { vurus: 14, gures: -6, yer: -10, kondisyon: 6, cene: 5, hiz: 1, iq: 1 },
    guclu: L("Clinch, low kick, dirsek"),
    zayif: L("Yer dövüşü"),
    ikon: '🦵',
    zorluk: L("Kolay"),
    plan: L("Ayakta kal · Clinch taktikleri"),
    detay: L("Tayland’ın “sekiz uzuv sanatı”. Clinch’te rakibi dizlerle eritir, low kick ile ayaklarını çökertirsin. Kondisyonun ve çenen sağlam. Yere düştüğünde ise ilk işin ayağa kalkmak olmalı."),
  },
  kickboks: {
    ad: L("Kickboks"),
    aciklama: L("Hızlı ayaklar, uzun menzil. Hareketli bir hedef olmak senin işin."),
    mods: { vurus: 13, gures: -8, yer: -10, kondisyon: 3, cene: -2, hiz: 11, iq: 2 },
    guclu: L("Menzil, hız, tekme çeşitliliği"),
    zayif: L("Güreş, çene"),
    ikon: '⚡',
    zorluk: L("Orta"),
    plan: L("Mesafeyi koru · Kontra dövüş"),
    detay: L("Hızlı ayaklar, uzun menzil, çeşitli tekmeler. Puan toplamakta ve hasar almadan dövüşmekte ustasın. Ama çenen hassas: bir kez yakalanırsan kalkması zor olur."),
  },
  gures: {
    ad: L("Güreş"),
    aciklama: L("Rakibi yere indirmek senin için nefes almak gibi. Ayakta ise hamsın."),
    mods: { vurus: -10, gures: 20, yer: 2, kondisyon: 9, cene: 3, hiz: -3, iq: 0 },
    guclu: L("Takedown, üst kontrol, kondisyon"),
    zayif: L("Ayakta vuruş, submission savunması"),
    ikon: '🤼',
    zorluk: L("Kolay"),
    plan: L("Güreşle yere indir, kontrol et · Tempo"),
    detay: L("Minderde yetiştin, rakibi yere indirmek senin için nefes almak kadar doğal. Kondisyonun tükenmez, hakemler de üst kontrolü sever. Ayakta ise hamsın, erken nakavt riskini güreşle kapatman lazım."),
  },
  judo: {
    ad: L("Judo"),
    aciklama: L("Clinch’ten fırlatmalar, denge ustalığı. Ayakta vuruşun ham."),
    mods: { vurus: -9, gures: 14, yer: 6, kondisyon: 2, cene: 0, hiz: 1, iq: 4 },
    guclu: L("Fırlatmalar, clinch kontrolü"),
    zayif: L("Uzak mesafe vuruş"),
    ikon: '🥋',
    zorluk: L("Orta"),
    plan: L("Clinch’e gir · Güreşle yere indir"),
    detay: L("Denge ve kaldıraç ustasısın. Clinch’te rakibi yakaladığın an onu havaya kaldırıp yere çarpabilirsin. Dövüş IQ’n yüksek. Uzak mesafe vuruşun ise zayıf, o yüzden mesafeyi kapatman gerekir."),
  },
  bjj: {
    ad: 'BJJ',
    aciklama: L("Sırt üstü yatsan bile tehlikelisin. Ayakta dövüşmek kâbusun."),
    mods: { vurus: -12, gures: 1, yer: 22, kondisyon: 2, cene: -4, hiz: -2, iq: 6 },
    guclu: L("Submission, guard oyunu"),
    zayif: L("Ayakta vuruş, takedown"),
    ikon: '🔒',
    zorluk: L("Zor"),
    plan: L("Yere götür, submission ara"),
    detay: L("Sırt üstü yatarken bile tehlikelisin. Kol, boyun, bacak… Her pozisyonda bir kilit görürsün. Ama önce dövüşü yere götürmen lazım, ve ayakta vuruşun en zayıf yanın. Yüksek risk, yüksek ödül."),
  },
  sambo: {
    ad: L("Sambo"),
    aciklama: L("Güreş ve submission bir arada. Sert, pragmatik, yorulmaz."),
    mods: { vurus: -6, gures: 12, yer: 12, kondisyon: 5, cene: 2, hiz: -4, iq: 1 },
    guclu: L("Bacak kilitleri, fırlatmalar"),
    zayif: L("Ayakta hız"),
    ikon: '🐻',
    zorluk: L("Orta"),
    plan: L("Güreşle yere indir · Submission ara"),
    detay: L("Rus ekolünün pragmatik dövüş sanatı. Hem fırlatır hem kilitlersin. Güreş ve yer dövüşü birlikte güçlü, ayakta ise yavaşsın. Dengeli ve sert bir başlangıç."),
  },
  kyokushin: {
    ad: L("Kyokushin"),
    aciklama: L("Tam temaslı karate. Acıya alışıksın, geri adım bilmezsin."),
    mods: { vurus: 11, gures: -10, yer: -12, kondisyon: 7, cene: 10, hiz: 2, iq: -1 },
    guclu: L("Dayanıklılık, ağır tekmeler"),
    zayif: L("Güreş, yer dövüşü"),
    ikon: '🥶',
    zorluk: L("Orta"),
    plan: L("Baskı kur · Tempo"),
    detay: L("Tam temaslı karate seni acıya karşı nasırlaştırdı. Çenen ve kondisyonun güçlü, ağır tekmelerin kemik kırar. Güreş ve yer dövüşünü ise neredeyse hiç bilmiyorsun."),
  },
  sokak: {
    ad: L("Sokak dövüşçüsü"),
    aciklama: L("Tekniğin yok ama korkun da yok. Çenen taş gibi."),
    mods: { vurus: 8, gures: -3, yer: -8, kondisyon: -4, cene: 14, hiz: 2, iq: -10 },
    guclu: L("Çene, saldırganlık"),
    zayif: L("Teknik, dövüş zekâsı, kondisyon"),
    ikon: '🔥',
    zorluk: L("Zor"),
    plan: L("Baskı kur"),
    detay: L("Hiçbir salonda eğitim almadın, sokaklar hocan oldu. Çenen taş gibi, korkun yok. Ama teknik, strateji ve kondisyon açısından en ham başlangıç bu. Gelişim puanlarını akıllıca harcaman gerekecek."),
  },
};

// ---------- Organizasyonlar ----------
export interface OrgInfo {
  ad: string;
  kisa: string;
  stage: Stage;
  ucret: [number, number]; // tipik giriş ücreti aralığı
  performansBonusu: number;
  merdiven: number; // sıralama listesinin boyu
  not: string;
  hidrasyon?: boolean;
  rakipSecimi: boolean;
}

export const ORGS: Record<OrgId, OrgInfo> = {
  amator: {
    ad: L("Şehir Amatör Ligi"),
    kisa: L("AMATÖR"),
    stage: 'amator',
    ucret: [0, 0],
    performansBonusu: 0,
    merdiven: 0,
    not: L("Kaval kemiği koruyucu zorunlu, hakemler erken durdurur. Para yok, tecrübe var."),
    rakipSecimi: true,
  },
  cfc: {
    ad: L("Cage Force FC"),
    kisa: 'CFC',
    stage: 'bolgesel',
    ucret: [2500, 4000],
    performansBonusu: 1000,
    merdiven: 10,
    not: L("ABD doğu yakasının efsane bölgesel ligi. Buradan UCC’ye çok yıldız çıktı."),
    rakipSecimi: true,
  },
  oktagon: {
    ad: L("Hexagon MMA"),
    kisa: L("HEXAGON"),
    stage: 'bolgesel',
    ucret: [3000, 5000],
    performansBonusu: 2000,
    merdiven: 10,
    not: L("Avrupa’nın en coşkulu kalabalığı. Stadyum şovları ve turnuvalar."),
    rakipSecimi: true,
  },
  pfl: {
    ad: 'PFC',
    kisa: 'PFC',
    stage: 'buyuk',
    ucret: [11000, 18000],
    performansBonusu: 10000,
    merdiven: 10,
    not: L("Sezon ve playoff sistemi. Gladiator artık PFC çatısı altında. Rakibi organizasyon belirler."),
    rakipSecimi: false,
  },
  one: {
    ad: L("ZEN Championship"),
    kisa: 'ZEN',
    stage: 'buyuk',
    ucret: [9000, 15000],
    performansBonusu: 25000,
    merdiven: 10,
    not: L("Asya’nın devi. Tartıda hidrasyon testi var, sert kilo vermek maçı iptal ettirebilir. Bonuslar dev."),
    hidrasyon: true,
    rakipSecimi: false,
  },
  mvp: {
    ad: L("VIP MMA"),
    kisa: 'VIP',
    stage: 'buyuk',
    ucret: [24000, 36000],
    performansBonusu: 20000,
    merdiven: 10,
    not: L("Büyük prodüksiyon, büyük maaş, az dövüş. Şov önce gelir."),
    rakipSecimi: false,
  },
  dwcs: {
    ad: L("Dean Wyatt's Challenger Series"),
    kisa: 'DWCS',
    stage: 'buyuk',
    ucret: [5000, 5000],
    performansBonusu: 0,
    merdiven: 0,
    not: L("Tek gece, tek şans. Kazanmak yetmez, etkilemen gerekir."),
    rakipSecimi: false,
  },
  ufc: {
    ad: 'UCC',
    kisa: 'UCC',
    stage: 'ufc',
    ucret: [10000, 12000],
    performansBonusu: 50000,
    merdiven: 15,
    not: L("Dünyanın en büyük organizasyonu. Maaş mütevazı ama popülerlik sponsorları getirir. Kaybedersen sıradaki kapı dışarısıdır."),
    rakipSecimi: false,
  },
};

// ---------- Kurgusal isim havuzları ----------
/** İsim havuzları; kadın adları ayrı, 'slav' havuzlarında soyadı kadın biçimine çevrilir (Volkov → Volkova). */
export const NAME_POOLS: { ulke: string; ad: string[]; kadin: string[]; soyad: string[]; slav?: boolean }[] = [
  { ulke: 'ABD', ad: [L("Tyler"), L("Marcus"), L("Cody"), L("Jalen"), L("Brody"), L("Devon"), L("Wyatt"), L("Trevor"), L("Dante"), L("Colby"), L("Reggie"), L("Austin")], kadin: ['Jessica', 'Amanda', 'Brianna', 'Kayla', 'Taylor', 'Morgan', 'Paige', 'Jasmine', 'Haley', 'Destiny'], soyad: [L("Hargrove"), L("Mitchell"), L("Pruitt"), L("Dawson"), L("Kincaid"), L("Rourke"), L("Sallee"), L("Whitfield"), L("Garrison"), L("Boone"), L("Calloway"), L("Stroud")] },
  { ulke: L("Brezilya"), ad: [L("Thiago"), L("Rafael"), L("Diego"), L("Caio"), L("Bruno"), L("Wanderlei"), L("Gilberto"), L("Renan"), L("Edson"), L("Luan"), L("Vitor")], kadin: ['Juliana', 'Larissa', 'Bruna', 'Camila', 'Mayra', 'Thaís', 'Gabriela', 'Letícia'], soyad: [L("Moraes"), L("Lacerda"), L("Pimentel"), L("Batista"), L("Coutinho"), L("Farias"), L("Nogueira"), L("Teixeira"), 'Brandão', L("Quintela"), L("Arruda")] },
  { ulke: L("Rusya"), ad: [L("Dmitri"), L("Artem"), L("Ruslan"), L("Kirill"), L("Zaur"), L("Islam"), L("Shamil"), L("Magomed"), L("Timur"), L("Rasul"), L("Yuri")], kadin: ['Anastasia', 'Ekaterina', 'Irina', 'Marina', 'Olga', 'Svetlana', 'Aida', 'Madina', 'Zarina'], soyad: [L("Volkov"), L("Sorokin"), L("Magomedov"), L("Gadzhiev"), L("Belov"), L("Kurbanov"), L("Abdulaev"), L("Zhukov"), L("Omarov"), L("Tagirov"), L("Kasimov")], slav: true },
  { ulke: L("Polonya"), ad: [L("Kamil"), L("Piotr"), L("Szymon"), 'Łukasz', L("Mateusz"), L("Bartosz"), L("Tomasz")], kadin: ['Katarzyna', 'Agnieszka', 'Joanna', 'Karolina', 'Magdalena', 'Aleksandra', 'Natalia'], soyad: ['Wróbel', L("Kowalczyk"), L("Mazur"), L("Nowicki"), L("Grabowski"), L("Pawlak"), L("Sikora")], slav: true },
  { ulke: L("Meksika"), ad: [L("Alejandro"), L("Emiliano"), L("Iker"), L("Santiago"), L("Rodrigo"), 'Joaquín', L("Mateo")], kadin: ['Alexa', 'Valeria', 'Ximena', 'Daniela', 'Fernanda', 'Irene', 'Lupita'], soyad: [L("Ortega"), L("Villalobos"), 'Cárdenas', L("Salgado"), L("Quiroga"), 'Montaño', 'Rentería'] },
  { ulke: L("Japonya"), ad: [L("Kenta"), L("Ryo"), L("Daichi"), L("Shun"), L("Takeru"), L("Yuto"), L("Haruki")], kadin: ['Ayaka', 'Mizuki', 'Rin', 'Sakura', 'Yui', 'Haruka', 'Kanako'], soyad: [L("Moriyama"), L("Kishida"), L("Hayashi"), L("Sakurai"), L("Onodera"), L("Fujimoto"), L("Kanemura")] },
  { ulke: L("Nijerya"), ad: [L("Chidi"), L("Tunde"), L("Obinna"), L("Femi"), L("Kelechi"), L("Ayodele")], kadin: ['Chioma', 'Ngozi', 'Funmi', 'Adaeze', 'Bisola', 'Kemi'], soyad: [L("Adeyemi"), L("Okonkwo"), L("Balogun"), L("Eze"), L("Nwosu"), L("Olatunji")] },
  { ulke: L("Birleşik Krallık"), ad: [L("Callum"), L("Jack"), L("Reece"), L("Liam"), L("Kieran"), L("Declan"), L("Ashley")], kadin: ['Molly', 'Chloe', 'Lauren', 'Megan', 'Rosie', 'Kirsty'], soyad: [L("Hollis"), L("Pembroke"), L("Tate"), L("Ashworth"), L("Barrow"), L("Fairbanks"), L("Crowther")] },
  { ulke: L("İrlanda"), ad: [L("Cian"), 'Oisín', L("Darragh"), L("Rory"), L("Fionn")], kadin: ['Aoife', 'Siobhan', 'Niamh', 'Caoimhe', 'Ciara'], soyad: [L("Gallagher"), L("Keane"), L("Byrne"), L("Moloney"), L("Quinlan")] },
  { ulke: L("Gürcistan"), ad: [L("Giorgi"), L("Zurab"), L("Irakli"), L("Levan"), L("Davit"), L("Nika")], kadin: ['Nino', 'Tamar', 'Mariam', 'Salome', 'Ana'], soyad: [L("Kapanadze"), L("Lomidze"), L("Tsereteli"), L("Gelashvili"), L("Mamulashvili"), L("Kvaratskhelia")] },
  { ulke: L("Kazakistan"), ad: [L("Arman"), L("Yerlan"), L("Daulet"), L("Nursultan"), L("Askar")], kadin: ['Aigerim', 'Dana', 'Saule', 'Aruzhan', 'Madina'], soyad: [L("Abenov"), L("Zhakupov"), L("Serikbayev"), L("Tokayev"), L("Mukhamedov")], slav: true },
  { ulke: L("Fransa"), ad: [L("Mathis"), L("Yanis"), 'Théo', L("Karim"), L("Enzo"), L("Bastien")], kadin: ['Manon', 'Léa', 'Chloé', 'Inès', 'Camille'], soyad: [L("Lemaire"), L("Duchamp"), 'Bensaïd', L("Rousseau"), L("Marchetti"), L("Diallo")] },
  { ulke: L("Türkiye"), ad: [L("Burak"), L("Emre"), L("Oğuz"), L("Serkan"), L("Tolga"), L("Kaan"), L("Mert"), L("Volkan"), L("Cenk"), L("Barış")], kadin: ['Elif', 'Zeynep', 'Defne', 'Buse', 'Ece', 'Selin', 'Derya', 'Merve', 'Aslı', 'Gizem'], soyad: [L("Karakaya"), L("Yıldırım"), L("Demirtaş"), L("Aslan"), L("Çelikkol"), L("Kocabaş"), L("Tunç"), L("Özbek"), L("Sarıkaya"), L("Erdem")] },
  { ulke: L("Azerbaycan"), ad: [L("Elvin"), L("Rauf"), L("Tural"), L("Orxan")], kadin: ['Aysel', 'Leyla', 'Nigar', 'Günay'], soyad: ['Məmmədov', L("Hüseynli"), 'Əliyev', L("Quliyev")], slav: true },
  { ulke: L("Avustralya"), ad: [L("Brock"), L("Nathan"), L("Jarrah"), L("Lachlan"), L("Mitchell")], kadin: ['Casey', 'Tayla', 'Kiara', 'Jade', 'Brooke'], soyad: [L("Keane"), 'McAllister', L("Doherty"), L("Whitlock"), L("Harlow")] },
  { ulke: L("Tayland"), ad: [L("Somchai"), L("Anan"), L("Kittisak"), L("Petch"), L("Sakda")], kadin: ['Ploy', 'Fah', 'Mali', 'Dao', 'Nong'], soyad: [L("Sitthichai"), L("Petchyindee"), L("Kaewsamrit"), L("Sor Rungvisai"), L("Banchamek")] },
  { ulke: L("Hollanda"), ad: [L("Daan"), L("Jorrit"), L("Sem"), L("Rico")], kadin: ['Sanne', 'Femke', 'Lotte', 'Anouk'], soyad: [L("de Vries"), L("Bakker"), L("van Dijk"), L("Visser")] },
  { ulke: L("İsveç"), ad: [L("Oskar"), L("Linus"), L("Viktor"), L("Emil")], kadin: ['Elin', 'Klara', 'Saga', 'Freja'], soyad: [L("Lindqvist"), L("Bergström"), L("Nyberg"), L("Holm")] },
  { ulke: L("Küba"), ad: [L("Yoel"), L("Yosvany"), 'Lázaro', L("Dairon")], kadin: ['Yarelis', 'Idalys', 'Dayana', 'Yaimé'], soyad: ['Rodríguez', 'Céspedes', L("Mendieta"), L("Arencibia")] },
  { ulke: L("Güney Kore"), ad: ['Min-jun', 'Seung-woo', 'Ji-hoon', 'Dong-hyun'], kadin: ['Seo-yeon', 'Ji-woo', 'Min-seo', 'Ha-eun'], soyad: [L("Park"), L("Kang"), L("Choi"), L("Jung")] },
  { ulke: L("Çin"), ad: [L("Wei"), L("Jian"), L("Hao"), L("Zhen")], kadin: ['Mei', 'Xiaoling', 'Yan', 'Jing'], soyad: [L("Li"), L("Zhang"), L("Wu"), L("Song")] },
  { ulke: L("Şili"), ad: [L("Ignacio"), 'Benjamín', 'Tomás'], kadin: ['Valentina', 'Catalina', 'Javiera'], soyad: [L("Fuentes"), L("Araya"), 'Sepúlveda'] },
  { ulke: L("Kamerun"), ad: [L("Francis"), L("Serge"), L("Blaise")], kadin: ['Marie', 'Clarisse', 'Nadège'], soyad: [L("Mbarga"), L("Ngono"), L("Etoundi")] },
];

/** Slav soyadlarının kadın biçimi (Latin ve Kiril): -ov/-ev/-in → -ova/-eva/-ina, -ski/-cki → -ska/-cka. */
export function femSurname(s: string): string {
  const rules: [RegExp, string][] = [
    [/(ski)$/, 'ska'],
    [/(cki)$/, 'cka'],
    [/(ov|ev|yev|in)$/, '$1a'],
    [/(ский)$/, 'ская'],
    [/(ов|ев|ин)$/, '$1а'],
  ];
  for (const [re, rep] of rules) if (re.test(s)) return s.replace(re, rep);
  return s;
}

export const NICKNAMES = [
  L("Kasırga"), L("Buz Adam"), L("Cellat"), L("Kobra"), L("Tank"), L("Gölge"), L("Balyoz"), L("Çakal"), L("Yıldırım"), L("Doktor"), L("Boğa"),
  L("Anakonda"), L("Kurt"), L("Profesör"), L("Fırtına"), L("Taş Yumruk"), L("Akrep"), L("Titan"), L("Bıçak"), L("Deli"), L("Sessiz Ölüm"),
  L("Kral Kobra"), L("Buldozer"), L("Ninja"), L("Piranha"), L("Çelik"), L("Volkan"), L("Kartal"), L("Şahin"), L("Barbar"), L("Mimar"),
  L("Cerrah"), L("Hayalet"), L("Ejderha"), L("Kuyruklu Yıldız"), L("Kasap"), L("Pitbull"), L("Panter"), L("Yılan"), L("Makine"), L("Terminatör"),
  L("Gladyatör"), L("Samuray"), L("Viking"), L("Çekiç"), L("Dinamit"), L("Bomba"), L("Gece Kuşu"), L("Kaya"), L("Leopar"), L("Timsah"),
  L("Sfenks"), L("Kara Şövalye"), L("Vahşi"), L("Maestro"), L("Kılıç"), L("Zehir"), L("Çığ"), L("Kırbaç"), L("Tsunami"), L("Kaplan"),
];

export const PERSONALITIES = [
  { ad: L("Kibirli"), trash: 0.8 },
  { ad: L("Sessiz profesyonel"), trash: 0.1 },
  { ad: L("Trash talk ustası"), trash: 1 },
  { ad: L("Saygılı"), trash: 0.05 },
  { ad: L("Öfkeli"), trash: 0.6 },
  { ad: L("Soğukkanlı"), trash: 0.2 },
  { ad: L("Şovmen"), trash: 0.7 },
];

export const SUBMISSIONS = [
  L("arkadan boğma (RNC)"), 'giyotin', 'armbar', L("üçgen boğma"), 'kimura', L("d'arce boğma"), L("heel hook"), 'arm-triangle',
];

export const AGENTS = [
  { ad: L("Kuzen Tarık"), kalite: 2, pay: 0.05, aciklama: L("Ailenden biri. Güvenilir ama sektörü tanımıyor.") },
  { ad: L("Selim Kaptan"), kalite: 4, pay: 0.1, aciklama: L("Bölgesel organizasyonlarla sıkı ilişkiler.") },
  { ad: L("Oleg Dranko"), kalite: 5, pay: 0.1, aciklama: L("Doğu Avrupa bağlantıları güçlü, sert pazarlıkçı.") },
  { ad: L("Vera Castellanos"), kalite: 6, pay: 0.12, aciklama: L("Sponsorluk anlaşmalarında usta.") },
  { ad: L("Ayla Sezer"), kalite: 7, pay: 0.13, aciklama: L("PFC ve ZEN ile doğrudan hat.") },
  { ad: L("Marty \"Mürekkep\" Feld"), kalite: 8, pay: 0.15, aciklama: L("Kontratları mürekkebi kurumadan imzalatır.") },
  { ad: L("Dom Alvarez (Apex Sports)"), kalite: 10, pay: 0.2, aciklama: L("Şampiyonların menajeri. UCC kapısını tekmeyle açar.") },
];

export const ELITE_GYMS = [
  { salon: L("Summit Combat Center"), antrenor: L("Rico Valdez"), kalite: 8, maliyet: 6000 },
  { salon: L("Kaspiy Elite (Mahaçkale)"), antrenor: L("Abdurakhman Gadzhiev"), kalite: 9, maliyet: 12000 },
  { salon: L("Nova Arena Team"), antrenor: L("Fábio Rezende"), kalite: 7, maliyet: 3500 },
  { salon: L("Tigris Kamp (Phuket)"), antrenor: L("Kru Somsak"), kalite: 7, maliyet: 4000 },
  { salon: L("Altitude MMA (Denver)"), antrenor: L("Jim Kowalski"), kalite: 10, maliyet: 20000 },
];

export const JOURNALISTS = [L("Ceren Aydemir (Kafes Postası)"), L("Rob Tillman (Fight Beat)"), L("Lucía Paredes (Octagon Latino)")];

/** Sıklet ve geçmiş modlarını uygulayıp 1-100 arasına sıkıştırır. */
export function baseStatsFor(bg: Background, level: number): Stats {
  const m = BACKGROUNDS[bg].mods;
  const out = {} as Stats;
  (Object.keys(m) as StatKey[]).forEach((k) => {
    out[k] = Math.max(1, Math.min(100, Math.round(level + m[k])));
  });
  return out;
}
