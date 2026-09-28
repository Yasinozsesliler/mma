// Salonlar, kamp yerleri ve tatiller.
import { L } from '../i18n';
import type { StatKey } from './types';

export interface Gym {
  id: string;
  ulke: string; // COUNTRIES anahtarı; 'elit' = dünya çapında
  salon: string;
  antrenor: string;
  kalite: number; // 1-10: kamp gelişimi ve haftalık ücret
  uzmanlik: StatKey; // bu alana odaklanan kamplar %35 daha verimli
  aciklama: string;
  imza: number; // kariyer ortasında geçiş ücreti
}

const g = (ulke: string, id: string, salon: string, antrenor: string, kalite: number, uzmanlik: StatKey, aciklama: string): Gym => ({
  id: `${ulke}-${id}`,
  ulke,
  salon,
  antrenor,
  kalite,
  uzmanlik,
  aciklama,
  imza: kalite * kalite * 400,
});

export const GYMS: Gym[] = [
  g('tr', 'kapali', L("Kapalıçarşı Dövüş Kulübü"), L("Hakkı Usta"), 4, 'vurus', L("İstanbul’un en eski boks salonu. Eski usul, sert eller.")),
  g('tr', 'kirkpinar', L("Kırkpınar Güreş Evi"), L("Pehlivan Rıza Hoca"), 5, 'gures', L("Edirne’den çıkan ağır güreş ekolü. Minderde ezersin.")),
  g('tr', 'mahalle', L("Mahalle Spor Salonu"), L("Cemil Abi"), 2, 'kondisyon', L("Ucuz, samimi, eksik ekipman. Ama kalp var.")),
  g('us', 'iron', L("Iron Ridge MMA"), L("Coach Dale Brennan"), 5, 'gures', L("Kolej güreşçilerinin MMA’ya geçiş noktası.")),
  g('us', 'vegas', L("Neon Fight Factory (Vegas)"), L("Tony “Vegas” Moretti"), 6, 'vurus', L("Profesyonel boksörlerle sparring imkânı.")),
  g('us', 'garage', L("Garaj Dövüş Kulübü"), L("Big Earl"), 2, 'cene', L("Bir garajda sert sparring. Kafan sağlamlaşır, beynin sarsılır.")),
  g('br', 'leao', L("Academia Leão Dourado"), L("Mestre Tião Barbosa"), 5, 'yer', L("Rio’nun efsane BJJ akademisi. Her köşede bir kara kuşak.")),
  g('br', 'favela', L("Favela Muay Thai Projesi"), L("Professor Kiko"), 3, 'vurus', L("Sokaktan çıkan çocuklar için. Aç kurtlar yetiştirir.")),
  g('br', 'nova', L("Nova Arena Team"), L("Fábio Rezende"), 6, 'kondisyon', L("Modern MMA takımı. Güçlü sparring havuzu.")),
  g('ru', 'kaspiy', L("Kaspiy Güreş Evi"), L("Magomed Aliyev"), 6, 'gures', L("Dağıstan’ın dağlarında güreş. Acımasız ve etkili.")),
  g('ru', 'sambo', L("Moskova Sambo-70"), L("Viktor Orlov"), 5, 'yer', L("Bacak kilitleri ve fırlatmalar. Sovyet disiplini.")),
  g('ru', 'bodrum', L("Bodrum Kat Boks"), L("Igor Pavlov"), 3, 'cene', L("Isıtması olmayan bir bodrum. Soğuk, sert, dayanıklı.")),
  g('gb', 'northside', L("Northside Fight Lab"), L("Gaz Whitmore"), 4, 'vurus', L("İngiliz boks geleneği, hareketli ayaklar.")),
  g('gb', 'kbox', L("London Fightwerks"), L("Nicky Parrish"), 5, 'iq', L("Teknik ve taktik odaklı. Oyun planı ustaları.")),
  g('gb', 'pub', L("Pub Arkası Salon"), L("Old Terry"), 2, 'cene', L("Birahanenin arkasında bir ring. Hepsi bu.")),
  g('ie', 'liffey', L("Liffey Combat"), L("Seamus Doyle"), 4, 'vurus', L("Dublin’in karakter dolu salonu. Hareket ve sabır.")),
  g('ie', 'straight', L("Straight Line Gym"), L("Owen Kavanagh"), 6, 'hiz', L("Mesafe ve zamanlama üzerine kurulu bir felsefe.")),
  g('ie', 'docks', L("Docklands Boks"), L("Mick Fitz"), 2, 'kondisyon', L("Liman işçilerinin boks kulübü.")),
  g('fr', 'cercle', L("Le Cercle MMA"), L("Rémi Garnier"), 4, 'hiz', L("Savate kökenli tekme tekniği.")),
  g('fr', 'paris', L("Paris Grappling Elite"), L("Karim Belkacem"), 5, 'yer', L("Avrupa’nın en iyi no-gi takımlarından.")),
  g('fr', 'banlieue', L("Banliyö Boks Derneği"), L("Moussa Traoré"), 3, 'vurus', L("Az imkân, çok hırs.")),
  g('de', 'kampfwerk', L("Kampfwerk Köln"), L("Jens Hartmann"), 4, 'kondisyon', L("Alman mühendisliğiyle kondisyon planları.")),
  g('de', 'berlin', L("Berlin Kickbox Akademie"), L("Lars Vogel"), 5, 'vurus', L("Hollanda tarzı kickboks, ağır low kickler.")),
  g('de', 'verein', L("Köy Spor Kulübü"), L("Hans Brenner"), 2, 'gures', L("Amatör güreş kulübü, tek bir minder.")),
  g('pl', 'wilk', L("Wilk Team"), L("Marek Zając"), 5, 'gures', L("Polonya’nın sert grappling okulu.")),
  g('pl', 'krakow', L("Kraków Fight Club"), L("Paweł Nowak"), 4, 'vurus', L("KSF yıldızları buradan çıktı.")),
  g('pl', 'hala', L("Spor Salonu No:3"), L("Zbigniew"), 2, 'kondisyon', L("Belediyenin eski salonu.")),
  g('cz', 'brno', L("Brno Fight Club"), L("Tomáš Novák"), 4, 'vurus', L("Hexagon’un gözdesi. Kalabalık sparring.")),
  g('cz', 'praha', L("Praha Jiu-Jitsu"), L("Jan Dvořák"), 5, 'yer', L("Sakin, teknik, sabırlı.")),
  g('cz', 'ostrava', L("Ostrava Maden Kulübü"), L("Old Vašek"), 2, 'cene', L("Madencilerin kulübü. Sert insanlar.")),
  g('ge', 'tiflis', L("Tiflis Güreş Akademisi"), L("Levan Beridze"), 5, 'gures', L("Olimpiyat güreşçilerinin yuvası.")),
  g('ge', 'judo', L("Gürcü Judo Merkezi"), L("Zurab Gogua"), 5, 'gures', L("Fırlatmada dünya ekolü.")),
  g('ge', 'dag', L("Dağ Köyü Salonu"), L("Giorgi Dede"), 2, 'kondisyon', L("Yüksek rakım, sade hayat.")),
  g('kz', 'bozkir', L("Bozkır Savaşçıları"), L("Nurlan Seitkali"), 4, 'gures', L("Kuşak güreşi geleneği.")),
  g('kz', 'almaty', L("Almaty Boks Merkezi"), L("Serik Akhmetov"), 6, 'vurus', L("Olimpik boks ekolü. Kusursuz teknik.")),
  g('kz', 'kovboy', L("Stepler Kulübü"), L("Ermek Aga"), 2, 'cene', L("Temel ama inatçı.")),
  g('mx', 'guerrero', L("Casa del Guerrero"), L("Don Chuy Ramírez"), 4, 'vurus', L("Meksika boks okulu: gövde çalışması ve cesaret.")),
  g('mx', 'altitud', L("Altitud Fight Team"), L("Luis Carranza"), 5, 'kondisyon', L("Mexico City’nin yüksekliğinde kondisyon.")),
  g('mx', 'barrio', L("Barrio Boxeo"), L("Tío Pepe"), 2, 'cene', L("Mahallenin sert boks salonu.")),
  g('jp', 'kaze', L("Kaze Dojo"), L("Hiroshi Tanabe"), 5, 'iq', L("Disiplin, sabır, teknik mükemmellik.")),
  g('jp', 'shooto', L("Tokyo Shootfight Gym"), L("Ken Ishida"), 5, 'yer', L("Japon submission geleneği.")),
  g('jp', 'karate', L("Kyokushin Honbu"), L("Sensei Oyamada"), 4, 'cene', L("Tam temas karate. Acıya alışırsın.")),
  g('ng', 'lagos', L("Lagos Lions Gym"), L("Emeka Obi"), 4, 'vurus', L("Afrika’nın yükselen yıldızları.")),
  g('ng', 'wrestle', L("Naija Wrestling Club"), L("Chief Adewale"), 4, 'gures', L("Geleneksel Nijerya güreşi.")),
  g('ng', 'street', L("Sokak Kulübü"), L("Big Sunny"), 2, 'kondisyon', L("Toz toprak içinde bir ring.")),
  g('au', 'southern', L("Southern Cross MMA"), L("Brad Kinsella"), 5, 'kondisyon', L("Sörf ve sprint: kondisyon canavarı yapar.")),
  g('au', 'city', L("Harbour City Kickboxing Sydney"), L("Tane Wiremu"), 6, 'iq', L("Oyun planı dehası antrenörler.")),
  g('au', 'outback', L("Outback Boks"), L("Crocodile Ron"), 2, 'cene', L("Çiftlikte ağır işler ve sparring.")),
  g('az', 'xezer', L("Xəzər Döyüş Klubu"), L("Elnur Qasımov"), 4, 'gures', L("Serbest güreş ve sambo geleneği.")),
  g('az', 'baku', L("Bakü Elit MMA"), L("Rüstəm Məmmədov"), 5, 'vurus', L("Genç ve iddialı bir takım.")),
  g('az', 'kend', L("Kənd Güleş"), L("Əli Baba"), 2, 'kondisyon', L("Köy güreşi, dağ koşuları.")),
  // Dünya çapında elit salonlar (kariyer ortasında)
  g('elit', 'summit', L("Summit Combat Center"), L("Rico Valdez"), 8, 'kondisyon', L("Dünyanın en iyi performans laboratuvarlarından.")),
  g('elit', 'kaspiyelit', L("Kaspiy Elite (Mahaçkale)"), L("Abdurakhman Gadzhiev"), 9, 'gures', L("Şampiyon güreşçilerin fabrikası.")),
  g('elit', 'tiger', L("Tigris Kamp (Phuket)"), L("Kru Somsak"), 7, 'vurus', L("Tayland’da dirsek ve diz ustalığı.")),
  g('elit', 'altitude', L("Altitude MMA (Denver)"), L("Jim Kowalski"), 10, 'iq', L("Oyun planı dehası. En pahalısı.")),
  g('elit', 'atos', L("Ataque BJJ Global"), L("André Galhardo Jr."), 8, 'yer', L("Dünya BJJ şampiyonlarının evi.")),
];

export const gymById = (id: string) => GYMS.find((x) => x.id === id);
export const gymsFor = (ulke: string) => GYMS.filter((x) => x.ulke === ulke);

// ---------- Kamp yerleri ----------

export interface CampSite {
  id: string;
  ad: string;
  aciklama: string;
  ikon: string;
  haftalik: number; // haftalık sabit ücret (salon ücreti eklenmez)
  salonUcreti: boolean; // true = salonun haftalık ücreti uygulanır
  bonusStat?: StatKey; // bu alana odaklanırsan ek gelişim
  carpan: number; // genel gelişim çarpanı
  kalite?: number; // salon dışı kamplarda antrenör kalitesi
  risk: number; // sakatlık riski çarpanı
  puan: number; // ek gelişim puanı
  minStage?: 'amator' | 'bolgesel' | 'buyuk' | 'ufc';
}

export const CAMP_SITES: CampSite[] = [
  { id: 'salon', ad: L("Kendi salonunda"), aciklama: L("Hocan ve takım arkadaşlarınla alışık olduğun düzen."), ikon: 'home-group', haftalik: 0, salonUcreti: true, carpan: 1, risk: 1, puan: 0 },
  { id: 'ev', ad: L("Evde tek başına"), aciklama: L("Neredeyse bedava. Az gelişim ama sakatlanma riski de az."), ikon: 'home-outline', haftalik: 0, salonUcreti: false, carpan: 0.6, kalite: 2, risk: 0.6, puan: 0 },
  { id: 'tayland', ad: L("Tayland Muay Thai kampı"), aciklama: L("Phuket’te günde iki antrenman. Ayakta dövüş çok gelişir."), ikon: 'fire', haftalik: 900, salonUcreti: false, bonusStat: 'vurus', carpan: 1.15, kalite: 7, risk: 1.2, puan: 1, minStage: 'bolgesel' },
  { id: 'dagistan', ad: L("Dağıstan güreş kampı"), aciklama: L("Dağlarda koşu, minderde acımasız güreş."), ikon: 'arm-flex', haftalik: 1100, salonUcreti: false, bonusStat: 'gures', carpan: 1.15, kalite: 8, risk: 1.25, puan: 1, minStage: 'bolgesel' },
  { id: 'brezilya', ad: L("Rio BJJ akademisi"), aciklama: L("Kara kuşaklarla her gün rulling."), ikon: 'lock', haftalik: 1000, salonUcreti: false, bonusStat: 'yer', carpan: 1.15, kalite: 7, risk: 1.1, puan: 1, minStage: 'bolgesel' },
  { id: 'irtifa', ad: L("Yüksek irtifa kampı (Big Bear)"), aciklama: L("Oksijen az, ciğerler büyür. Kondisyon zirve yapar."), ikon: 'image-filter-hdr', haftalik: 1600, salonUcreti: false, bonusStat: 'kondisyon', carpan: 1.2, kalite: 8, risk: 1, puan: 1, minStage: 'buyuk' },
  { id: 'elit', ad: L("Elit performans merkezi"), aciklama: L("Bilim insanları, fizyoterapistler, en iyi sparring. Her şey gelişir."), ikon: 'flask', haftalik: 4500, salonUcreti: false, carpan: 1.45, kalite: 10, risk: 0.8, puan: 2, minStage: 'buyuk' },
];

export const siteById = (id: string) => CAMP_SITES.find((x) => x.id === id) ?? CAMP_SITES[0];

// ---------- Tatiller ----------

export interface Vacation {
  id: string;
  ad: string;
  aciklama: string;
  ikon: string;
  hafta: number;
  fiyat: number;
  saglik: number;
  motivasyon: number;
  populerlik: number;
  /** Disiplin kaybı: istatistik düşüşleri (form kaybı) */
  disiplin: Partial<Record<StatKey, number>>;
}

export const VACATIONS: Vacation[] = [
  { id: 'koy', ad: L("Memlekette aile ziyareti"), aciklama: L("Annenin yemekleri, çocukluk arkadaşları."), ikon: 'home-heart', hafta: 1, fiyat: 300, saglik: 10, motivasyon: 1, populerlik: 0, disiplin: {} },
  { id: 'kapadokya', ad: L("Kapadokya balon turu"), aciklama: L("Gün doğumunda balonlar, kafa dinlemek."), ikon: 'airballoon', hafta: 1, fiyat: 3500, saglik: 12, motivasyon: 1, populerlik: 1, disiplin: { kondisyon: -1 } },
  { id: 'antalya', ad: L("Antalya’da her şey dahil"), aciklama: L("Deniz, kum, açık büfe. Kilo almamaya dikkat!"), ikon: 'beach', hafta: 2, fiyat: 6000, saglik: 25, motivasyon: 0, populerlik: 1, disiplin: { kondisyon: -2 } },
  { id: 'bali', ad: L("Bali’de yoga ve sörf"), aciklama: L("Ruhunu ve bedenini sıfırla."), ikon: 'yoga', hafta: 2, fiyat: 14000, saglik: 32, motivasyon: 1, populerlik: 2, disiplin: { kondisyon: -1 } },
  { id: 'dubai', ad: L("Dubai’de lüks tatil"), aciklama: L("Süper arabalar, gökdelenler, ünlülerle fotoğraflar."), ikon: 'city', hafta: 1, fiyat: 40000, saglik: 10, motivasyon: -1, populerlik: 4, disiplin: { kondisyon: -2, hiz: -1 } },
  { id: 'maldivler', ad: L("Maldivler’de su üstü villa"), aciklama: L("Telefonsuz iki hafta. Tam yenilenme."), ikon: 'palm-tree', hafta: 2, fiyat: 90000, saglik: 45, motivasyon: 0, populerlik: 3, disiplin: { kondisyon: -2 } },
  { id: 'monaco', ad: L("Monako’da yat partisi"), aciklama: L("Formula 1 haftası, jet sosyete."), ikon: 'sail-boat', hafta: 1, fiyat: 250000, saglik: 0, motivasyon: -2, populerlik: 8, disiplin: { kondisyon: -3, hiz: -1, iq: -1 } },
];
