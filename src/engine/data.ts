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
  tr: { ad: 'Türkiye', egitim: 5, taraftar: 8, salon: 'Kapalıçarşı Dövüş Kulübü', antrenor: 'Hakkı Usta' },
  us: { ad: 'ABD', egitim: 9, taraftar: 6, salon: 'Iron Ridge MMA', antrenor: 'Coach Dale Brennan' },
  br: { ad: 'Brezilya', egitim: 8, taraftar: 8, salon: 'Academia Leão Dourado', antrenor: 'Mestre Tião Barbosa' },
  ru: { ad: 'Rusya (Dağıstan)', egitim: 8, taraftar: 7, salon: 'Kaspiy Güreş Evi', antrenor: 'Magomed Aliyev' },
  gb: { ad: 'Birleşik Krallık', egitim: 6, taraftar: 7, salon: 'Northside Fight Lab', antrenor: 'Gaz Whitmore' },
  ie: { ad: 'İrlanda', egitim: 5, taraftar: 9, salon: 'Liffey Combat', antrenor: 'Seamus Doyle' },
  fr: { ad: 'Fransa', egitim: 6, taraftar: 5, salon: 'Le Cercle MMA', antrenor: 'Rémi Garnier' },
  de: { ad: 'Almanya', egitim: 6, taraftar: 4, salon: 'Kampfwerk Köln', antrenor: 'Jens Hartmann' },
  pl: { ad: 'Polonya', egitim: 6, taraftar: 7, salon: 'Wilk Team', antrenor: 'Marek Zając' },
  cz: { ad: 'Çekya', egitim: 5, taraftar: 7, salon: 'Brno Fight Club', antrenor: 'Tomáš Novák' },
  ge: { ad: 'Gürcistan', egitim: 6, taraftar: 6, salon: 'Tiflis Güreş Akademisi', antrenor: 'Levan Beridze' },
  kz: { ad: 'Kazakistan', egitim: 5, taraftar: 6, salon: 'Bozkır Savaşçıları', antrenor: 'Nurlan Seitkali' },
  mx: { ad: 'Meksika', egitim: 5, taraftar: 8, salon: 'Casa del Guerrero', antrenor: 'Don Chuy Ramírez' },
  jp: { ad: 'Japonya', egitim: 6, taraftar: 5, salon: 'Kaze Dojo', antrenor: 'Hiroshi Tanabe' },
  ng: { ad: 'Nijerya', egitim: 4, taraftar: 7, salon: 'Lagos Lions Gym', antrenor: 'Emeka Obi' },
  au: { ad: 'Avustralya', egitim: 7, taraftar: 5, salon: 'Southern Cross MMA', antrenor: 'Brad Kinsella' },
  az: { ad: 'Azerbaycan', egitim: 5, taraftar: 7, salon: 'Xəzər Döyüş Klubu', antrenor: 'Elnur Qasımov' },
};

// ---------- Sıkletler ----------
export const WEIGHT_CLASSES: Record<WeightClass, { ad: string; kg: number; lb: number }> = {
  sinek: { ad: 'Sinek', kg: 57, lb: 125 },
  horoz: { ad: 'Horoz', kg: 61, lb: 135 },
  tuy: { ad: 'Tüy', kg: 66, lb: 145 },
  hafif: { ad: 'Hafif', kg: 70, lb: 155 },
  welter: { ad: 'Welter', kg: 77, lb: 170 },
  orta: { ad: 'Orta', kg: 84, lb: 185 },
  yariagir: { ad: 'Yarı Ağır', kg: 93, lb: 205 },
  agir: { ad: 'Ağır', kg: 120, lb: 265 },
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
  zorluk: 'Kolay' | 'Orta' | 'Zor';
  plan: string;
  detay: string;
}

export const BACKGROUNDS: Record<Background, BackgroundInfo> = {
  boks: {
    ad: 'Boks',
    aciklama: 'Keskin eller, iyi kafa hareketi. Yerde ise kaybolmuş gibisin.',
    mods: { vurus: 16, gures: -10, yer: -12, kondisyon: 3, cene: 5, hiz: 8, iq: 2 },
    guclu: 'El kombinasyonları, kafa hareketi',
    zayif: 'Takedown savunması, yer dövüşü',
    ikon: '🥊',
    zorluk: 'Orta',
    plan: 'Ayakta kal, vuruşla boz · Kontra dövüş',
    detay: 'Yıllarca ringde el çalıştın. Kafeste en temiz yumruklar senden çıkar ve kafa hareketin sayesinde az darbe alırsın. Ama güreşçiler bacaklarına daldığında ne yapacağını bilemezsin. İlk kamplarını güreş savunmasına ayırman gerekebilir.',
  },
  muaythai: {
    ad: 'Muay Thai',
    aciklama: 'Dirsek, diz, low kick. Clinch senin evin.',
    mods: { vurus: 14, gures: -6, yer: -10, kondisyon: 6, cene: 5, hiz: 1, iq: 1 },
    guclu: 'Clinch, low kick, dirsek',
    zayif: 'Yer dövüşü',
    ikon: '🦵',
    zorluk: 'Kolay',
    plan: 'Ayakta kal · Clinch taktikleri',
    detay: 'Tayland’ın “sekiz uzuv sanatı”. Clinch’te rakibi dizlerle eritir, low kick ile ayaklarını çökertirsin. Kondisyonun ve çenen sağlam. Yere düştüğünde ise ilk işin ayağa kalkmak olmalı.',
  },
  kickboks: {
    ad: 'Kickboks',
    aciklama: 'Hızlı ayaklar, uzun menzil. Hareketli bir hedef olmak senin işin.',
    mods: { vurus: 13, gures: -8, yer: -10, kondisyon: 3, cene: -2, hiz: 11, iq: 2 },
    guclu: 'Menzil, hız, tekme çeşitliliği',
    zayif: 'Güreş, çene',
    ikon: '⚡',
    zorluk: 'Orta',
    plan: 'Mesafeyi koru · Kontra dövüş',
    detay: 'Hızlı ayaklar, uzun menzil, çeşitli tekmeler. Puan toplamakta ve hasar almadan dövüşmekte ustasın. Ama çenen hassas: bir kez yakalanırsan kalkması zor olur.',
  },
  gures: {
    ad: 'Güreş',
    aciklama: 'Rakibi yere indirmek senin için nefes almak gibi. Ayakta ise hamsın.',
    mods: { vurus: -10, gures: 20, yer: 2, kondisyon: 9, cene: 3, hiz: -3, iq: 0 },
    guclu: 'Takedown, üst kontrol, kondisyon',
    zayif: 'Ayakta vuruş, submission savunması',
    ikon: '🤼',
    zorluk: 'Kolay',
    plan: 'Güreşle yere indir, kontrol et · Tempo',
    detay: 'Minderde yetiştin, rakibi yere indirmek senin için nefes almak kadar doğal. Kondisyonun tükenmez, hakemler de üst kontrolü sever. Ayakta ise hamsın, erken nakavt riskini güreşle kapatman lazım.',
  },
  judo: {
    ad: 'Judo',
    aciklama: 'Clinch’ten fırlatmalar, denge ustalığı. Ayakta vuruşun ham.',
    mods: { vurus: -9, gures: 14, yer: 6, kondisyon: 2, cene: 0, hiz: 1, iq: 4 },
    guclu: 'Fırlatmalar, clinch kontrolü',
    zayif: 'Uzak mesafe vuruş',
    ikon: '🥋',
    zorluk: 'Orta',
    plan: 'Clinch’e gir · Güreşle yere indir',
    detay: 'Denge ve kaldıraç ustasısın. Clinch’te rakibi yakaladığın an onu havaya kaldırıp yere çarpabilirsin. Dövüş IQ’n yüksek. Uzak mesafe vuruşun ise zayıf, o yüzden mesafeyi kapatman gerekir.',
  },
  bjj: {
    ad: 'BJJ',
    aciklama: 'Sırt üstü yatsan bile tehlikelisin. Ayakta dövüşmek kâbusun.',
    mods: { vurus: -12, gures: 1, yer: 22, kondisyon: 2, cene: -4, hiz: -2, iq: 6 },
    guclu: 'Submission, guard oyunu',
    zayif: 'Ayakta vuruş, takedown',
    ikon: '🔒',
    zorluk: 'Zor',
    plan: 'Yere götür, submission ara',
    detay: 'Sırt üstü yatarken bile tehlikelisin. Kol, boyun, bacak… Her pozisyonda bir kilit görürsün. Ama önce dövüşü yere götürmen lazım, ve ayakta vuruşun en zayıf yanın. Yüksek risk, yüksek ödül.',
  },
  sambo: {
    ad: 'Sambo',
    aciklama: 'Güreş ve submission bir arada. Sert, pragmatik, yorulmaz.',
    mods: { vurus: -6, gures: 12, yer: 12, kondisyon: 5, cene: 2, hiz: -4, iq: 1 },
    guclu: 'Bacak kilitleri, fırlatmalar',
    zayif: 'Ayakta hız',
    ikon: '🐻',
    zorluk: 'Orta',
    plan: 'Güreşle yere indir · Submission ara',
    detay: 'Rus ekolünün pragmatik dövüş sanatı. Hem fırlatır hem kilitlersin. Güreş ve yer dövüşü birlikte güçlü, ayakta ise yavaşsın. Dengeli ve sert bir başlangıç.',
  },
  kyokushin: {
    ad: 'Kyokushin',
    aciklama: 'Tam temaslı karate. Acıya alışıksın, geri adım bilmezsin.',
    mods: { vurus: 11, gures: -10, yer: -12, kondisyon: 7, cene: 10, hiz: 2, iq: -1 },
    guclu: 'Dayanıklılık, ağır tekmeler',
    zayif: 'Güreş, yer dövüşü',
    ikon: '🥶',
    zorluk: 'Orta',
    plan: 'Baskı kur · Tempo',
    detay: 'Tam temaslı karate seni acıya karşı nasırlaştırdı. Çenen ve kondisyonun güçlü, ağır tekmelerin kemik kırar. Güreş ve yer dövüşünü ise neredeyse hiç bilmiyorsun.',
  },
  sokak: {
    ad: 'Sokak dövüşçüsü',
    aciklama: 'Tekniğin yok ama korkun da yok. Çenen taş gibi.',
    mods: { vurus: 8, gures: -3, yer: -8, kondisyon: -4, cene: 14, hiz: 2, iq: -10 },
    guclu: 'Çene, saldırganlık',
    zayif: 'Teknik, dövüş zekâsı, kondisyon',
    ikon: '🔥',
    zorluk: 'Zor',
    plan: 'Baskı kur',
    detay: 'Hiçbir salonda eğitim almadın, sokaklar hocan oldu. Çenen taş gibi, korkun yok. Ama teknik, strateji ve kondisyon açısından en ham başlangıç bu. Gelişim puanlarını akıllıca harcaman gerekecek.',
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
    ad: 'Şehir Amatör Ligi',
    kisa: 'AMATÖR',
    stage: 'amator',
    ucret: [0, 0],
    performansBonusu: 0,
    merdiven: 0,
    not: 'Kaval kemiği koruyucu zorunlu, hakemler erken durdurur. Para yok, tecrübe var.',
    rakipSecimi: true,
  },
  cfc: {
    ad: 'Cage Fury FC',
    kisa: 'CFC',
    stage: 'bolgesel',
    ucret: [2500, 4000],
    performansBonusu: 1000,
    merdiven: 10,
    not: 'ABD doğu yakasının efsane bölgesel ligi. Buradan UFC’ye çok yıldız çıktı.',
    rakipSecimi: true,
  },
  oktagon: {
    ad: 'Oktagon MMA',
    kisa: 'OKTAGON',
    stage: 'bolgesel',
    ucret: [3000, 5000],
    performansBonusu: 2000,
    merdiven: 10,
    not: 'Avrupa’nın en coşkulu kalabalığı. Stadyum şovları ve turnuvalar.',
    rakipSecimi: true,
  },
  pfl: {
    ad: 'PFL',
    kisa: 'PFL',
    stage: 'buyuk',
    ucret: [18000, 30000],
    performansBonusu: 10000,
    merdiven: 10,
    not: 'Sezon ve playoff sistemi. Bellator artık PFL çatısı altında. Rakibi organizasyon belirler.',
    rakipSecimi: false,
  },
  one: {
    ad: 'ONE Championship',
    kisa: 'ONE',
    stage: 'buyuk',
    ucret: [15000, 25000],
    performansBonusu: 50000,
    merdiven: 10,
    not: 'Asya’nın devi. Tartıda hidrasyon testi var, sert kilo vermek maçı iptal ettirebilir. Bonuslar dev.',
    hidrasyon: true,
    rakipSecimi: false,
  },
  mvp: {
    ad: 'MVP MMA',
    kisa: 'MVP',
    stage: 'buyuk',
    ucret: [40000, 60000],
    performansBonusu: 25000,
    merdiven: 10,
    not: 'Büyük prodüksiyon, büyük maaş, az dövüş. Şov önce gelir.',
    rakipSecimi: false,
  },
  dwcs: {
    ad: "Dana White's Contender Series",
    kisa: 'DWCS',
    stage: 'buyuk',
    ucret: [5000, 5000],
    performansBonusu: 0,
    merdiven: 0,
    not: 'Tek gece, tek şans. Kazanmak yetmez, etkilemen gerekir.',
    rakipSecimi: false,
  },
  ufc: {
    ad: 'UFC',
    kisa: 'UFC',
    stage: 'ufc',
    ucret: [10000, 12000],
    performansBonusu: 50000,
    merdiven: 15,
    not: 'Dünyanın en büyük organizasyonu. Maaş mütevazı ama popülerlik sponsorları getirir. Kaybedersen sıradaki kapı dışarısıdır.',
    rakipSecimi: false,
  },
};

// ---------- Kurgusal isim havuzları ----------
export const NAME_POOLS: { ulke: string; ad: string[]; soyad: string[] }[] = [
  { ulke: 'ABD', ad: ['Tyler', 'Marcus', 'Cody', 'Jalen', 'Brody', 'Devon', 'Wyatt', 'Trevor', 'Dante', 'Colby', 'Reggie', 'Austin'], soyad: ['Hargrove', 'Mitchell', 'Pruitt', 'Dawson', 'Kincaid', 'Rourke', 'Sallee', 'Whitfield', 'Garrison', 'Boone', 'Calloway', 'Stroud'] },
  { ulke: 'Brezilya', ad: ['Thiago', 'Rafael', 'Diego', 'Caio', 'Bruno', 'Wanderlei', 'Gilberto', 'Renan', 'Edson', 'Luan', 'Vitor'], soyad: ['Moraes', 'Lacerda', 'Pimentel', 'Batista', 'Coutinho', 'Farias', 'Nogueira', 'Teixeira', 'Brandão', 'Quintela', 'Arruda'] },
  { ulke: 'Rusya', ad: ['Dmitri', 'Artem', 'Ruslan', 'Kirill', 'Zaur', 'Islam', 'Shamil', 'Magomed', 'Timur', 'Rasul', 'Yuri'], soyad: ['Volkov', 'Sorokin', 'Magomedov', 'Gadzhiev', 'Belov', 'Kurbanov', 'Abdulaev', 'Zhukov', 'Omarov', 'Tagirov', 'Kasimov'] },
  { ulke: 'Polonya', ad: ['Kamil', 'Piotr', 'Szymon', 'Łukasz', 'Mateusz', 'Bartosz', 'Tomasz'], soyad: ['Wróbel', 'Kowalczyk', 'Mazur', 'Nowicki', 'Grabowski', 'Pawlak', 'Sikora'] },
  { ulke: 'Meksika', ad: ['Alejandro', 'Emiliano', 'Iker', 'Santiago', 'Rodrigo', 'Joaquín', 'Mateo'], soyad: ['Ortega', 'Villalobos', 'Cárdenas', 'Salgado', 'Quiroga', 'Montaño', 'Rentería'] },
  { ulke: 'Japonya', ad: ['Kenta', 'Ryo', 'Daichi', 'Shun', 'Takeru', 'Yuto', 'Haruki'], soyad: ['Moriyama', 'Kishida', 'Hayashi', 'Sakurai', 'Onodera', 'Fujimoto', 'Kanemura'] },
  { ulke: 'Nijerya', ad: ['Chidi', 'Tunde', 'Obinna', 'Femi', 'Kelechi', 'Ayodele'], soyad: ['Adeyemi', 'Okonkwo', 'Balogun', 'Eze', 'Nwosu', 'Olatunji'] },
  { ulke: 'Birleşik Krallık', ad: ['Callum', 'Jack', 'Reece', 'Liam', 'Kieran', 'Declan', 'Ashley'], soyad: ['Hollis', 'Pembroke', 'Tate', 'Ashworth', 'Barrow', 'Fairbanks', 'Crowther'] },
  { ulke: 'İrlanda', ad: ['Cian', 'Oisín', 'Darragh', 'Rory', 'Fionn'], soyad: ['Gallagher', 'Keane', 'Byrne', 'Moloney', 'Quinlan'] },
  { ulke: 'Gürcistan', ad: ['Giorgi', 'Zurab', 'Irakli', 'Levan', 'Davit', 'Nika'], soyad: ['Kapanadze', 'Lomidze', 'Tsereteli', 'Gelashvili', 'Mamulashvili', 'Kvaratskhelia'] },
  { ulke: 'Kazakistan', ad: ['Arman', 'Yerlan', 'Daulet', 'Nursultan', 'Askar'], soyad: ['Abenov', 'Zhakupov', 'Serikbayev', 'Tokayev', 'Mukhamedov'] },
  { ulke: 'Fransa', ad: ['Mathis', 'Yanis', 'Théo', 'Karim', 'Enzo', 'Bastien'], soyad: ['Lemaire', 'Duchamp', 'Bensaïd', 'Rousseau', 'Marchetti', 'Diallo'] },
  { ulke: 'Türkiye', ad: ['Burak', 'Emre', 'Oğuz', 'Serkan', 'Tolga', 'Kaan', 'Mert', 'Volkan', 'Cenk', 'Barış'], soyad: ['Karakaya', 'Yıldırım', 'Demirtaş', 'Aslan', 'Çelikkol', 'Kocabaş', 'Tunç', 'Özbek', 'Sarıkaya', 'Erdem'] },
  { ulke: 'Azerbaycan', ad: ['Elvin', 'Rauf', 'Tural', 'Orxan'], soyad: ['Məmmədov', 'Hüseynli', 'Əliyev', 'Quliyev'] },
  { ulke: 'Avustralya', ad: ['Brock', 'Nathan', 'Jarrah', 'Lachlan', 'Mitchell'], soyad: ['Keane', 'McAllister', 'Doherty', 'Whitlock', 'Harlow'] },
  { ulke: 'Tayland', ad: ['Somchai', 'Anan', 'Kittisak', 'Petch', 'Sakda'], soyad: ['Sitthichai', 'Petchyindee', 'Kaewsamrit', 'Sor Rungvisai', 'Banchamek'] },
  { ulke: 'Hollanda', ad: ['Daan', 'Jorrit', 'Sem', 'Rico'], soyad: ['de Vries', 'Bakker', 'van Dijk', 'Visser'] },
  { ulke: 'İsveç', ad: ['Oskar', 'Linus', 'Viktor', 'Emil'], soyad: ['Lindqvist', 'Bergström', 'Nyberg', 'Holm'] },
  { ulke: 'Küba', ad: ['Yoel', 'Yosvany', 'Lázaro', 'Dairon'], soyad: ['Rodríguez', 'Céspedes', 'Mendieta', 'Arencibia'] },
  { ulke: 'Güney Kore', ad: ['Min-jun', 'Seung-woo', 'Ji-hoon', 'Dong-hyun'], soyad: ['Park', 'Kang', 'Choi', 'Jung'] },
  { ulke: 'Çin', ad: ['Wei', 'Jian', 'Hao', 'Zhen'], soyad: ['Li', 'Zhang', 'Wu', 'Song'] },
  { ulke: 'Şili', ad: ['Ignacio', 'Benjamín', 'Tomás'], soyad: ['Fuentes', 'Araya', 'Sepúlveda'] },
  { ulke: 'Kamerun', ad: ['Francis', 'Serge', 'Blaise'], soyad: ['Mbarga', 'Ngono', 'Etoundi'] },
];

export const NICKNAMES = [
  'Kasırga', 'Buz Adam', 'Cellat', 'Kobra', 'Tank', 'Gölge', 'Balyoz', 'Çakal', 'Yıldırım', 'Doktor', 'Boğa',
  'Anakonda', 'Kurt', 'Profesör', 'Fırtına', 'Taş Yumruk', 'Akrep', 'Titan', 'Bıçak', 'Deli', 'Sessiz Ölüm',
  'Kral Kobra', 'Buldozer', 'Ninja', 'Piranha', 'Çelik', 'Volkan', 'Kartal', 'Şahin', 'Barbar', 'Mimar',
  'Cerrah', 'Hayalet', 'Ejderha', 'Kuyruklu Yıldız', 'Kasap', 'Pitbull', 'Panter', 'Yılan', 'Makine', 'Terminatör',
  'Gladyatör', 'Samuray', 'Viking', 'Çekiç', 'Dinamit', 'Bomba', 'Gece Kuşu', 'Kaya', 'Leopar', 'Timsah',
  'Sfenks', 'Kara Şövalye', 'Vahşi', 'Maestro', 'Kılıç', 'Zehir', 'Çığ', 'Kırbaç', 'Tsunami', 'Kaplan',
];

export const PERSONALITIES = [
  { ad: 'Kibirli', trash: 0.8 },
  { ad: 'Sessiz profesyonel', trash: 0.1 },
  { ad: 'Trash talk ustası', trash: 1 },
  { ad: 'Saygılı', trash: 0.05 },
  { ad: 'Öfkeli', trash: 0.6 },
  { ad: 'Soğukkanlı', trash: 0.2 },
  { ad: 'Şovmen', trash: 0.7 },
];

export const SUBMISSIONS = [
  'arkadan boğma (RNC)', 'giyotin', 'armbar', 'üçgen boğma', 'kimura', "d'arce boğma", 'heel hook', 'arm-triangle',
];

export const AGENTS = [
  { ad: 'Kuzen Tarık', kalite: 2, pay: 0.05, aciklama: 'Ailenden biri. Güvenilir ama sektörü tanımıyor.' },
  { ad: 'Selim Kaptan', kalite: 4, pay: 0.1, aciklama: 'Bölgesel organizasyonlarla sıkı ilişkiler.' },
  { ad: 'Oleg Dranko', kalite: 5, pay: 0.1, aciklama: 'Doğu Avrupa bağlantıları güçlü, sert pazarlıkçı.' },
  { ad: 'Vera Castellanos', kalite: 6, pay: 0.12, aciklama: 'Sponsorluk anlaşmalarında usta.' },
  { ad: 'Ayla Sezer', kalite: 7, pay: 0.13, aciklama: 'PFL ve ONE ile doğrudan hat.' },
  { ad: 'Marty "Mürekkep" Feld', kalite: 8, pay: 0.15, aciklama: 'Kontratları mürekkebi kurumadan imzalatır.' },
  { ad: 'Dom Alvarez (Apex Sports)', kalite: 10, pay: 0.2, aciklama: 'Şampiyonların menajeri. UFC kapısını tekmeyle açar.' },
];

export const ELITE_GYMS = [
  { salon: 'Summit Combat Center', antrenor: 'Rico Valdez', kalite: 8, maliyet: 6000 },
  { salon: 'Kaspiy Elite (Mahaçkale)', antrenor: 'Abdulmanap Gadzhiev', kalite: 9, maliyet: 12000 },
  { salon: 'Nova Arena Team', antrenor: 'Fábio Rezende', kalite: 7, maliyet: 3500 },
  { salon: 'Tiger Kamp (Phuket)', antrenor: 'Kru Somsak', kalite: 7, maliyet: 4000 },
  { salon: 'Altitude MMA (Denver)', antrenor: 'Jim Kowalski', kalite: 10, maliyet: 20000 },
];

export const JOURNALISTS = ['Ceren Aydemir (Kafes Postası)', 'Rob Tillman (Fight Beat)', 'Lucía Paredes (Octagon Latino)'];

/** Sıklet ve geçmiş modlarını uygulayıp 1-100 arasına sıkıştırır. */
export function baseStatsFor(bg: Background, level: number): Stats {
  const m = BACKGROUNDS[bg].mods;
  const out = {} as Stats;
  (Object.keys(m) as StatKey[]).forEach((k) => {
    out[k] = Math.max(1, Math.min(100, Math.round(level + m[k])));
  });
  return out;
}
