// Salonlar, kamp yerleri ve tatiller.
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
  g('tr', 'kapali', 'Kapalıçarşı Dövüş Kulübü', 'Hakkı Usta', 4, 'vurus', 'İstanbul’un en eski boks salonu. Eski usul, sert eller.'),
  g('tr', 'kirkpinar', 'Kırkpınar Güreş Evi', 'Pehlivan Rıza Hoca', 5, 'gures', 'Edirne’den çıkan ağır güreş ekolü. Minderde ezersin.'),
  g('tr', 'mahalle', 'Mahalle Spor Salonu', 'Cemil Abi', 2, 'kondisyon', 'Ucuz, samimi, eksik ekipman. Ama kalp var.'),
  g('us', 'iron', 'Iron Ridge MMA', 'Coach Dale Brennan', 5, 'gures', 'Kolej güreşçilerinin MMA’ya geçiş noktası.'),
  g('us', 'vegas', 'Neon Fight Factory (Vegas)', 'Tony “Vegas” Moretti', 6, 'vurus', 'Profesyonel boksörlerle sparring imkânı.'),
  g('us', 'garage', 'Garaj Dövüş Kulübü', 'Big Earl', 2, 'cene', 'Bir garajda sert sparring. Kafan sağlamlaşır, beynin sarsılır.'),
  g('br', 'leao', 'Academia Leão Dourado', 'Mestre Tião Barbosa', 5, 'yer', 'Rio’nun efsane BJJ akademisi. Her köşede bir kara kuşak.'),
  g('br', 'favela', 'Favela Muay Thai Projesi', 'Professor Kiko', 3, 'vurus', 'Sokaktan çıkan çocuklar için. Aç kurtlar yetiştirir.'),
  g('br', 'nova', 'Nova Arena Team', 'Fábio Rezende', 6, 'kondisyon', 'Modern MMA takımı. Güçlü sparring havuzu.'),
  g('ru', 'kaspiy', 'Kaspiy Güreş Evi', 'Magomed Aliyev', 6, 'gures', 'Dağıstan’ın dağlarında güreş. Acımasız ve etkili.'),
  g('ru', 'sambo', 'Moskova Sambo-70', 'Viktor Orlov', 5, 'yer', 'Bacak kilitleri ve fırlatmalar. Sovyet disiplini.'),
  g('ru', 'bodrum', 'Bodrum Kat Boks', 'Igor Pavlov', 3, 'cene', 'Isıtması olmayan bir bodrum. Soğuk, sert, dayanıklı.'),
  g('gb', 'northside', 'Northside Fight Lab', 'Gaz Whitmore', 4, 'vurus', 'İngiliz boks geleneği, hareketli ayaklar.'),
  g('gb', 'kbox', 'London Shootfighters', 'Nicky Parrish', 5, 'iq', 'Teknik ve taktik odaklı. Oyun planı ustaları.'),
  g('gb', 'pub', 'Pub Arkası Salon', 'Old Terry', 2, 'cene', 'Birahanenin arkasında bir ring. Hepsi bu.'),
  g('ie', 'liffey', 'Liffey Combat', 'Seamus Doyle', 4, 'vurus', 'Dublin’in karakter dolu salonu. Hareket ve sabır.'),
  g('ie', 'straight', 'Straight Line Gym', 'Owen Kavanagh', 6, 'hiz', 'Mesafe ve zamanlama üzerine kurulu bir felsefe.'),
  g('ie', 'docks', 'Docklands Boks', 'Mick Fitz', 2, 'kondisyon', 'Liman işçilerinin boks kulübü.'),
  g('fr', 'cercle', 'Le Cercle MMA', 'Rémi Garnier', 4, 'hiz', 'Savate kökenli tekme tekniği.'),
  g('fr', 'paris', 'Paris Grappling Elite', 'Karim Belkacem', 5, 'yer', 'Avrupa’nın en iyi no-gi takımlarından.'),
  g('fr', 'banlieue', 'Banliyö Boks Derneği', 'Moussa Traoré', 3, 'vurus', 'Az imkân, çok hırs.'),
  g('de', 'kampfwerk', 'Kampfwerk Köln', 'Jens Hartmann', 4, 'kondisyon', 'Alman mühendisliğiyle kondisyon planları.'),
  g('de', 'berlin', 'Berlin Kickbox Akademie', 'Lars Vogel', 5, 'vurus', 'Hollanda tarzı kickboks, ağır low kickler.'),
  g('de', 'verein', 'Köy Spor Kulübü', 'Hans Brenner', 2, 'gures', 'Amatör güreş kulübü, tek bir minder.'),
  g('pl', 'wilk', 'Wilk Team', 'Marek Zając', 5, 'gures', 'Polonya’nın sert grappling okulu.'),
  g('pl', 'krakow', 'Kraków Fight Club', 'Paweł Nowak', 4, 'vurus', 'KSW yıldızları buradan çıktı.'),
  g('pl', 'hala', 'Spor Salonu No:3', 'Zbigniew', 2, 'kondisyon', 'Belediyenin eski salonu.'),
  g('cz', 'brno', 'Brno Fight Club', 'Tomáš Novák', 4, 'vurus', 'Oktagon’un gözdesi. Kalabalık sparring.'),
  g('cz', 'praha', 'Praha Jiu-Jitsu', 'Jan Dvořák', 5, 'yer', 'Sakin, teknik, sabırlı.'),
  g('cz', 'ostrava', 'Ostrava Maden Kulübü', 'Old Vašek', 2, 'cene', 'Madencilerin kulübü. Sert insanlar.'),
  g('ge', 'tiflis', 'Tiflis Güreş Akademisi', 'Levan Beridze', 5, 'gures', 'Olimpiyat güreşçilerinin yuvası.'),
  g('ge', 'judo', 'Gürcü Judo Merkezi', 'Zurab Gogua', 5, 'gures', 'Fırlatmada dünya ekolü.'),
  g('ge', 'dag', 'Dağ Köyü Salonu', 'Giorgi Dede', 2, 'kondisyon', 'Yüksek rakım, sade hayat.'),
  g('kz', 'bozkir', 'Bozkır Savaşçıları', 'Nurlan Seitkali', 4, 'gures', 'Kuşak güreşi geleneği.'),
  g('kz', 'almaty', 'Almaty Boks Merkezi', 'Serik Akhmetov', 6, 'vurus', 'Olimpik boks ekolü. Kusursuz teknik.'),
  g('kz', 'kovboy', 'Stepler Kulübü', 'Ermek Aga', 2, 'cene', 'Temel ama inatçı.'),
  g('mx', 'guerrero', 'Casa del Guerrero', 'Don Chuy Ramírez', 4, 'vurus', 'Meksika boks okulu: gövde çalışması ve cesaret.'),
  g('mx', 'altitud', 'Altitud Fight Team', 'Luis Carranza', 5, 'kondisyon', 'Mexico City’nin yüksekliğinde kondisyon.'),
  g('mx', 'barrio', 'Barrio Boxeo', 'Tío Pepe', 2, 'cene', 'Mahallenin sert boks salonu.'),
  g('jp', 'kaze', 'Kaze Dojo', 'Hiroshi Tanabe', 5, 'iq', 'Disiplin, sabır, teknik mükemmellik.'),
  g('jp', 'shooto', 'Tokyo Shooto Gym', 'Ken Ishida', 5, 'yer', 'Japon submission geleneği.'),
  g('jp', 'karate', 'Kyokushin Honbu', 'Sensei Oyama', 4, 'cene', 'Tam temas karate. Acıya alışırsın.'),
  g('ng', 'lagos', 'Lagos Lions Gym', 'Emeka Obi', 4, 'vurus', 'Afrika’nın yükselen yıldızları.'),
  g('ng', 'wrestle', 'Naija Wrestling Club', 'Chief Adewale', 4, 'gures', 'Geleneksel Nijerya güreşi.'),
  g('ng', 'street', 'Sokak Kulübü', 'Big Sunny', 2, 'kondisyon', 'Toz toprak içinde bir ring.'),
  g('au', 'southern', 'Southern Cross MMA', 'Brad Kinsella', 5, 'kondisyon', 'Sörf ve sprint: kondisyon canavarı yapar.'),
  g('au', 'city', 'City Kickboxing Sydney', 'Tane Waititi', 6, 'iq', 'Oyun planı dehası antrenörler.'),
  g('au', 'outback', 'Outback Boks', 'Crocodile Ron', 2, 'cene', 'Çiftlikte ağır işler ve sparring.'),
  g('az', 'xezer', 'Xəzər Döyüş Klubu', 'Elnur Qasımov', 4, 'gures', 'Serbest güreş ve sambo geleneği.'),
  g('az', 'baku', 'Bakü Elit MMA', 'Rüstəm Məmmədov', 5, 'vurus', 'Genç ve iddialı bir takım.'),
  g('az', 'kend', 'Kənd Güleş', 'Əli Baba', 2, 'kondisyon', 'Köy güreşi, dağ koşuları.'),
  // Dünya çapında elit salonlar (kariyer ortasında)
  g('elit', 'summit', 'Summit Combat Center', 'Rico Valdez', 8, 'kondisyon', 'Dünyanın en iyi performans laboratuvarlarından.'),
  g('elit', 'kaspiyelit', 'Kaspiy Elite (Mahaçkale)', 'Abdulmanap Gadzhiev', 9, 'gures', 'Şampiyon güreşçilerin fabrikası.'),
  g('elit', 'tiger', 'Tiger Kamp (Phuket)', 'Kru Somsak', 7, 'vurus', 'Tayland’da dirsek ve diz ustalığı.'),
  g('elit', 'altitude', 'Altitude MMA (Denver)', 'Jim Kowalski', 10, 'iq', 'Oyun planı dehası. En pahalısı.'),
  g('elit', 'atos', 'Atos BJJ Global', 'André Galvão Jr.', 8, 'yer', 'Dünya BJJ şampiyonlarının evi.'),
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
  { id: 'salon', ad: 'Kendi salonunda', aciklama: 'Hocan ve takım arkadaşlarınla alışık olduğun düzen.', ikon: 'home-group', haftalik: 0, salonUcreti: true, carpan: 1, risk: 1, puan: 0 },
  { id: 'ev', ad: 'Evde tek başına', aciklama: 'Neredeyse bedava. Az gelişim ama sakatlanma riski de az.', ikon: 'home-outline', haftalik: 0, salonUcreti: false, carpan: 0.6, kalite: 2, risk: 0.6, puan: 0 },
  { id: 'tayland', ad: 'Tayland Muay Thai kampı', aciklama: 'Phuket’te günde iki antrenman. Ayakta dövüş çok gelişir.', ikon: 'fire', haftalik: 900, salonUcreti: false, bonusStat: 'vurus', carpan: 1.15, kalite: 7, risk: 1.2, puan: 1, minStage: 'bolgesel' },
  { id: 'dagistan', ad: 'Dağıstan güreş kampı', aciklama: 'Dağlarda koşu, minderde acımasız güreş.', ikon: 'arm-flex', haftalik: 1100, salonUcreti: false, bonusStat: 'gures', carpan: 1.15, kalite: 8, risk: 1.25, puan: 1, minStage: 'bolgesel' },
  { id: 'brezilya', ad: 'Rio BJJ akademisi', aciklama: 'Kara kuşaklarla her gün rulling.', ikon: 'lock', haftalik: 1000, salonUcreti: false, bonusStat: 'yer', carpan: 1.15, kalite: 7, risk: 1.1, puan: 1, minStage: 'bolgesel' },
  { id: 'irtifa', ad: 'Yüksek irtifa kampı (Big Bear)', aciklama: 'Oksijen az, ciğerler büyür. Kondisyon zirve yapar.', ikon: 'image-filter-hdr', haftalik: 1600, salonUcreti: false, bonusStat: 'kondisyon', carpan: 1.2, kalite: 8, risk: 1, puan: 1, minStage: 'buyuk' },
  { id: 'elit', ad: 'Elit performans merkezi', aciklama: 'Bilim insanları, fizyoterapistler, en iyi sparring. Her şey gelişir.', ikon: 'flask', haftalik: 4500, salonUcreti: false, carpan: 1.45, kalite: 10, risk: 0.8, puan: 2, minStage: 'buyuk' },
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
  { id: 'koy', ad: 'Memlekette aile ziyareti', aciklama: 'Annenin yemekleri, çocukluk arkadaşları.', ikon: 'home-heart', hafta: 1, fiyat: 300, saglik: 10, motivasyon: 1, populerlik: 0, disiplin: {} },
  { id: 'kapadokya', ad: 'Kapadokya balon turu', aciklama: 'Gün doğumunda balonlar, kafa dinlemek.', ikon: 'airballoon', hafta: 1, fiyat: 3500, saglik: 12, motivasyon: 1, populerlik: 1, disiplin: { kondisyon: -1 } },
  { id: 'antalya', ad: 'Antalya’da her şey dahil', aciklama: 'Deniz, kum, açık büfe. Kilo almamaya dikkat!', ikon: 'beach', hafta: 2, fiyat: 6000, saglik: 25, motivasyon: 0, populerlik: 1, disiplin: { kondisyon: -2 } },
  { id: 'bali', ad: 'Bali’de yoga ve sörf', aciklama: 'Ruhunu ve bedenini sıfırla.', ikon: 'yoga', hafta: 2, fiyat: 14000, saglik: 32, motivasyon: 1, populerlik: 2, disiplin: { kondisyon: -1 } },
  { id: 'dubai', ad: 'Dubai’de lüks tatil', aciklama: 'Süper arabalar, gökdelenler, ünlülerle fotoğraflar.', ikon: 'city', hafta: 1, fiyat: 40000, saglik: 10, motivasyon: -1, populerlik: 4, disiplin: { kondisyon: -2, hiz: -1 } },
  { id: 'maldivler', ad: 'Maldivler’de su üstü villa', aciklama: 'Telefonsuz iki hafta. Tam yenilenme.', ikon: 'palm-tree', hafta: 2, fiyat: 90000, saglik: 45, motivasyon: 0, populerlik: 3, disiplin: { kondisyon: -2 } },
  { id: 'monaco', ad: 'Monako’da yat partisi', aciklama: 'Formula 1 haftası, jet sosyete.', ikon: 'sail-boat', hafta: 1, fiyat: 250000, saglik: 0, motivasyon: -2, populerlik: 8, disiplin: { kondisyon: -3, hiz: -1, iq: -1 } },
];
