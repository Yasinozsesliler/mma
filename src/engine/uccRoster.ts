// UCC kadrosu: her sıkletin şampiyonları, yıldızları ve efsaneleri (gerçek dövüşçüleri çağrıştıran ama birebir aynı olmayan isimler ve lakaplar).
// Sıra önemli: ilk isim şampiyonluk adayı, sonrakiler sıralamaya göre. Kadro biterse rastgele dövüşçü üretilir.
import { L } from '../i18n';
import { rand } from './rng';
import type { Background, GameState, WeightClass } from './types';

export interface Star {
  /** Editör: orijinal isimden kalıcı kimlik (ad değişse de aynı kişi) */
  key?: string;
  ad: string;
  soyad: string;
  lakap: string;
  uyruk: string;
  stil: Background;
}

const s = (ad: string, soyad: string, lakap: string, uyruk: string, stil: Background): Star => ({ ad, soyad, lakap, uyruk, stil });
const US = 'ABD';
const BR = L("Brezilya");
const RU = L("Rusya");
const UK = L("Birleşik Krallık");
const AU = L("Avustralya");
const FR = L("Fransa");
const PL = L("Polonya");
const MX = L("Meksika");
const GE = L("Gürcistan");
const KZ = L("Kazakistan");
const NG = L("Nijerya");
const CN = L("Çin");
const IE = L("İrlanda");
const SE = L("İsveç");
const NL = L("Hollanda");
const CZ = L("Çekya");
const DE = L("Almanya");
const CU = L("Küba");
const KR = L("Güney Kore");
const JP = L("Japonya");
const CM = L("Kamerun");
const TR = L("Türkiye");
const CL = L("Şili");
const ZA = L("Güney Afrika");
const KG = L("Kırgızistan");

export const UCC_MEN: Record<WeightClass, Star[]> = {
  agir: [
    s('Jonah', 'Jonsby', 'Skeleton', US, 'gures'),
    s('Tommy', 'Aspwell', 'Big T', UK, 'bjj'),
    s('Cyrille', 'Gannet', 'Le Gamin', FR, 'kickboks'),
    s('Stipo', 'Miocevic', 'The Firefighter', US, 'boks'),
    s('Aleksei', 'Volkhov', 'Ivan', RU, 'kickboks'),
    s('Sergei', 'Pavlenko', 'Grizzly', RU, 'boks'),
    s('Curt', 'Blaydon', 'Blade', US, 'gures'),
    s('Jairo', 'Almeira', 'Malhado', BR, 'bjj'),
    s('Derek', 'Luiz', 'The Dark Beast', US, 'sokak'),
    s('Franco', 'Nganda', 'The Hunter', CM, 'boks'),
    s('Martin', 'Tyborski', 'The Polish Pillar', PL, 'judo'),
    s('Sergiu', 'Spivakov', 'Ice Bear', RU, 'gures'),
    s('Junio', 'dos Santana', 'Gitano', BR, 'boks'),
    s('Caleb', 'Velasco', 'Brown Fury', US, 'gures'),
  ],
  yariagir: [
    s('Alessandro', 'Pereira Neto', 'Stone Hand', BR, 'kickboks'),
    s('Magomet', 'Ankarov', 'The Quiet Storm', RU, 'sambo'),
    s('Jirka', 'Prohasek', 'Samurai', CZ, 'kickboks'),
    s('Jamal', 'Hillman', 'Sweet Sleep', US, 'boks'),
    s('Janek', 'Blachowski', 'Polish Hammer', PL, 'kickboks'),
    s('Khalid', 'Roundtree', 'The Iron Horse', US, 'muaythai'),
    s('Aleksandr', 'Rakovic', 'Missile', DE, 'kickboks'),
    s('Volkan', 'Özdemiroğlu', 'Right Now', TR, 'boks'),
    s('Carl', 'Ulberg', 'Black Panther', AU, 'kickboks'),
    s('Dominic', 'Reyna', 'The Destroyer', US, 'kickboks'),
    s('Tony', 'Smithson', 'Braveheart', US, 'sokak'),
    s('Glauber', 'Teixas', 'Old School', BR, 'bjj'),
    s('Danny', 'Cormack', 'Big Daddy', US, 'gures'),
  ],
  orta: [
    s('Dirk', 'du Plooy', 'Still Standing', ZA, 'sokak'),
    s('Khamzad', 'Chimaev', 'Wolf', SE, 'gures'),
    s('Isaiah', 'Adeyanju', 'The Style Bender', NG, 'kickboks'),
    s('Shawn', 'Strickler', 'Jungle Man', US, 'boks'),
    s('Rob', 'Whitfield', 'The Harvester', AU, 'kickboks'),
    s('Nasrudin', 'Imanov', 'The Marksman', FR, 'kickboks'),
    s('Kaio', 'Borralho Lima', 'The Natural One', BR, 'bjj'),
    s('Rein', 'de Ruiter', 'The Flying Dutchman', NL, 'bjj'),
    s('Paolo', 'Costela', 'Borracha', BR, 'sokak'),
    s('Jarrod', 'Cannon', 'Silverback', US, 'boks'),
    s('Brennan', 'Allison', 'All Out', US, 'bjj'),
    s('Andre', 'Silvano', 'The Tarantula', BR, 'muaythai'),
    s('Mike', 'Bisby', 'The Earl', UK, 'kickboks'),
  ],
  welter: [
    s('Bilal', 'Mahmoud', 'Know the Name', US, 'gures'),
    s('Jake', 'Della Marina', 'JDM Jr', AU, 'boks'),
    s('Shavkhat', 'Rakhmanov', 'The Nomad King', KZ, 'sambo'),
    s('Leo', 'Edwardson', 'Rocky Road', UK, 'kickboks'),
    s('Kamal', 'Usmanov', 'The Lagos Nightmare', NG, 'gures'),
    s('Shane', 'Bradford', 'The Philly Hitman', US, 'bjj'),
    s('Iain', 'Machado', 'The Tomorrow', IE, 'kickboks'),
    s('Carlo', 'Prates Junior', 'Bad Dream', BR, 'muaythai'),
    s('Joaquim', 'Buckland', 'Young Mansa', US, 'kickboks'),
    s('Colton', 'Covey', 'Mayhem', US, 'gures'),
    s('Gilberto', 'Barnes', 'Durão', BR, 'bjj'),
    s('Stefan', 'Thomason', 'Wonder Kid', US, 'kyokushin'),
    s('George', 'Masvidal Cruz', 'Street Jesus', CU, 'sokak'),
    s('Georges', 'Saint-Pierron', 'The Professor', FR, 'gures'),
  ],
  hafif: [
    s('Islam', 'Makhachov', 'The Mountain Eagle', RU, 'sambo'),
    s('Armen', 'Tsarukov', 'Akhalkalaki Tiger', GE, 'gures'),
    s('Carlos', 'Olivares', 'do Morro', BR, 'bjj'),
    s('Justus', 'Gatling', 'The Highlight Reel', US, 'gures'),
    s('Dusty', 'Poirot', 'The Gem', US, 'boks'),
    s('Maxime', 'Holland', 'Blessed One', US, 'kickboks'),
    s('Mateo', 'Gamrot', 'Gamer Boy', PL, 'gures'),
    s('Paddy', 'Pimbley', 'The Scouser', UK, 'bjj'),
    s('Benoît', 'Saint-Denys', 'War God', FR, 'sambo'),
    s('Danny', 'Hookham', 'The Gallows', AU, 'kickboks'),
    s('Mike', 'Chandleton', 'Iron Mike', US, 'gures'),
    s('Benil', 'Dariush Khan', 'Benny Boy', US, 'bjj'),
    s('Conor', 'McGrath', 'The Infamous', IE, 'boks'),
    s('Toni', 'Ferguson Ruiz', 'Boogeyman', US, 'sokak'),
    s('Khabir', 'Nurmagaliev', 'The Falcon', RU, 'sambo'),
  ],
  tuy: [
    s('Iliya', 'Topuridze', 'The Matador', GE, 'boks'),
    s('Alex', 'Volkanov', 'The Great One', AU, 'gures'),
    s('Diogo', 'Lopes Neto', 'The Bull', BR, 'bjj'),
    s('Movladi', 'Yevloyev', 'Shadow Man', RU, 'gures'),
    s('Yahir', 'Rodriguera', 'The Jaguar', MX, 'kickboks'),
    s('Lerome', 'Murphy Jr', 'The Wonder', UK, 'boks'),
    s('Bryan', 'Ortiga', 'Tee City', US, 'bjj'),
    s('Arnie', 'Allison', 'All Mighty', UK, 'kickboks'),
    s('Joshua', 'Emmerson', 'The Sledge', US, 'gures'),
    s('Calvino', 'Kattar Jr', 'The Boston Closer', US, 'boks'),
    s('Chan Woo', 'Jung', 'The Seoul Zombie', KR, 'sokak'),
    s('José', 'Aldana', 'Scar', BR, 'muaythai'),
  ],
  horoz: [
    s('Merabi', 'Dvalidze', 'The Engine', GE, 'gures'),
    s('Shaun', "O'Malley", 'Sugar', US, 'kickboks'),
    s('Umar', 'Nurmagaliev', 'The Young Falcon', RU, 'sambo'),
    s('Pyotr', 'Yanov', 'Merciless', RU, 'boks'),
    s('Corey', 'Sandhaven', 'Sandstorm', US, 'kickboks'),
    s('Aljamal', 'Sterling', 'Funk Lord', US, 'gures'),
    s('Deivison', 'Figueira', 'God of Battle', BR, 'bjj'),
    s('Song', 'Yadong Li', 'Kung Fu Boy', CN, 'kickboks'),
    s('Marius', 'Bautista', 'Bad Boy Mario', US, 'bjj'),
    s('Marlo', 'Vera Cruz', 'Chito Loco', CL, 'muaythai'),
    s('Hank', 'Cejudez', 'Triple Crown', US, 'gures'),
    s('Dominik', 'Cruise', 'The Dominant', US, 'gures'),
  ],
  sinek: [
    s('Alessandro', 'Pantoja Lima', 'The Man-Eater', BR, 'bjj'),
    s('Josh', 'Vance', 'Fearless', US, 'boks'),
    s('Brandan', 'Royal', 'Raw Dog', US, 'bjj'),
    s('Brando', 'Moreno Cruz', 'The Baby Assassin', MX, 'boks'),
    s('Kai', 'Kara-Frost', "Don't Look Away", AU, 'kickboks'),
    s('Tatsuya', 'Taira', 'The Natural Talent', JP, 'bjj'),
    s('Amin', 'Albazi', 'The Little Prince', UK, 'bjj'),
    s('Asan', 'Almabekov', 'Zulfiqar', KZ, 'gures'),
    s('Mohammad', 'Mokaev', 'The Enforcer', UK, 'gures'),
    s('Stevie', 'Erceg', 'Astro Kid', AU, 'bjj'),
    s('Demetrio', 'Johnston', 'Mighty Mite', US, 'gures'),
  ],
};

export const UCC_WOMEN: Partial<Record<WeightClass, Star[]>> = {
  sinek: [
    s('Valentina', 'Shevchuk', 'The Bullet', KG, 'muaythai'),
    s('Alexia', 'Grasso Ruiz', 'Mexican Queen', MX, 'boks'),
    s('Manon', 'Fiorelli', 'The Beauty Beast', FR, 'kyokushin'),
    s('Erin', 'Blanchard', 'Ice Cold', US, 'bjj'),
    s('Natália', 'Silveira', 'Butterfly', BR, 'kickboks'),
    s('Rosa', 'Namajuna', 'Thug Rosa', US, 'kickboks'),
    s('Zhang', 'Weiying', 'Magnum Z', CN, 'sokak'),
    s('Macy', 'Barber', 'Tomorrow', US, 'sokak'),
    s('Tracey', 'Cortez', 'Firebird', US, 'bjj'),
    s('Joana', 'Jedrzejewska', 'JJ Champion', PL, 'muaythai'),
  ],
  horoz: [
    s('Kaylee', 'Harrison', 'Judo Queen', US, 'judo'),
    s('Juliana', 'Peña Cruz', 'The Vixen', US, 'bjj'),
    s('Rachel', 'Pennington', 'Rocky Rae', US, 'boks'),
    s('Ketlyn', 'Vieira', 'Fenômena', BR, 'bjj'),
    s('Irina', 'Aldana Ruiz', 'La Roble', MX, 'boks'),
    s('Norma', 'Dumont', 'Immortal', BR, 'muaythai'),
    s('Holli', 'Holmes', 'Preacher Girl', US, 'boks'),
    s('Mischa', 'Tate', 'Sweet Cup', US, 'gures'),
    s('Amandine', 'Nunes', 'The Lion Queen', BR, 'boks'),
    s('Rhonda', 'Rousseau', 'Rowdy Rho', US, 'judo'),
  ],
  tuy: [
    s('Cristiane', 'Santana', 'Cyber', BR, 'muaythai'),
    s('Germana', 'de Randt', 'Iron Woman', NL, 'kickboks'),
    s('McKenna', 'Dern', 'Jiu-Jitsu Queen', US, 'bjj'),
    s('Tatyana', 'Suárez', 'Wrestle Queen', US, 'gures'),
    s('Yan', 'Xiaolan', 'Fury Yan', CN, 'kickboks'),
    s('Virna', 'Jandira', 'Hawk', BR, 'bjj'),
    s('Marina', 'Rodrigues Lima', 'Lady Assassin', BR, 'muaythai'),
    s('Jéssica', 'Andrada', 'Pile Driver', BR, 'gures'),
    s('Meghan', 'Anderson', 'The Giantess', AU, 'kickboks'),
    s('Felícia', 'Spencer', 'Fee Nom', US, 'bjj'),
  ],
};

/** Kadın kariyerinde UCC'nin kadın sıkletleri. */
export const UCC_WOMEN_CLASSES: WeightClass[] = ['sinek', 'horoz', 'tuy'];

export const rosterFor = (siklet: WeightClass, kadin: boolean): Star[] => (kadin ? UCC_WOMEN[siklet] ?? [] : UCC_MEN[siklet]) ?? [];

/**
 * UCC'de rakip için yıldız seçer: şampiyon kadronun ilki, sıralamadaki n. sıra kadronun n. ismi (kullanılmışsa ilk boş).
 * Kadro bittiyse null (rastgele dövüşçü üretilir).
 */
export function pickStar(s: GameState, siklet: WeightClass, kadin: boolean, rank: number | null, champion: boolean, used: Set<string>): Star | null {
  const list = rosterFor(siklet, kadin);
  // Oyuncu kadrodaki bir isimle oynuyorsa (Efsane Yolu) kendisiyle eşleşmez
  const me = `${s.fighter.ad} ${s.fighter.soyad}`;
  const free = (x: Star) => !used.has(`${x.ad} ${x.soyad}`) && `${x.ad} ${x.soyad}` !== me;
  if (champion) return list.find(free) ?? null;
  const want = rank != null ? Math.min(list.length - 1, Math.max(1, rank)) : 1 + Math.floor(rand() * Math.max(1, list.length - 1));
  for (let i = 0; i < list.length; i++) {
    const x = list[(want + i) % list.length];
    if ((want + i) % list.length === 0 && !s.sampiyon && list.length > 1) continue; // ilk isim şampiyonluk için ayrılır
    if (free(x)) return x;
  }
  return null;
}
