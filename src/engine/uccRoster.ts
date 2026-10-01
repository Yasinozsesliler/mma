// UCC kadrosu: her sıkletin şampiyonları, yıldızları ve efsaneleri (PES tarzı benzer isimler, İngilizce lakaplar).
// Sıra önemli: ilk isim şampiyonluk adayı, sonrakiler sıralamaya göre. Kadro biterse rastgele dövüşçü üretilir.
import { L } from '../i18n';
import { rand } from './rng';
import type { Background, GameState, WeightClass } from './types';

export interface Star {
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
    s('Jon', 'Jonnes', 'Bones', US, 'gures'),
    s('Tom', 'Aspinal', 'Big Tom', UK, 'bjj'),
    s('Ciryl', 'Gann', 'Bon Gamin', FR, 'kickboks'),
    s('Stipe', 'Miochic', 'The Fireman', US, 'boks'),
    s('Alexander', 'Volkoff', 'Drago', RU, 'kickboks'),
    s('Sergey', 'Pavlovic', 'The Bear', RU, 'boks'),
    s('Curtis', 'Blaydez', 'Razor', US, 'gures'),
    s('Jailton', 'Almeyda', 'Malhadinho', BR, 'bjj'),
    s('Derrick', 'Luis', 'The Black Beast', US, 'sokak'),
    s('Francis', 'Nganou', 'The Predator', CM, 'boks'),
    s('Marcin', 'Tybora', 'The Pole', PL, 'judo'),
    s('Serghei', 'Spivak', 'Polar Bear', RU, 'gures'),
    s('Junior', 'dos Santoz', 'Cigano', BR, 'boks'),
    s('Cain', 'Velasques', 'Brown Pride', US, 'gures'),
  ],
  yariagir: [
    s('Alex', 'Pereyra', 'Poatan', BR, 'kickboks'),
    s('Magomed', 'Ankalayev', 'The Silent Storm', RU, 'sambo'),
    s('Jiri', 'Prohazka', 'BJP', CZ, 'kickboks'),
    s('Jamahal', 'Hil', 'Sweet Dreams', US, 'boks'),
    s('Jan', 'Blahowicz', 'Polish Power', PL, 'kickboks'),
    s('Khalil', 'Rountre', 'The War Horse', US, 'muaythai'),
    s('Aleksandar', 'Rakich', 'Rocket', DE, 'kickboks'),
    s('Volkan', 'Özdemirr', 'No Time', TR, 'boks'),
    s('Carlos', 'Ulburg', 'Black Jag', AU, 'kickboks'),
    s('Dominick', 'Reyez', 'The Devastator', US, 'kickboks'),
    s('Anthony', 'Smit', 'Lionheart', US, 'sokak'),
    s('Glover', 'Texeira', 'Old Man Strength', BR, 'bjj'),
    s('Daniel', 'Cormiere', 'DC', US, 'gures'),
  ],
  orta: [
    s('Dricus', 'Du Plesis', 'Stillknocks', ZA, 'sokak'),
    s('Khamzat', 'Chimayev', 'Borz', SE, 'gures'),
    s('Israel', 'Adesanyia', 'The Last Stylebender', NG, 'kickboks'),
    s('Sean', 'Strickand', 'Tarzan', US, 'boks'),
    s('Robert', 'Whittacker', 'The Reaper', AU, 'kickboks'),
    s('Nassourdine', 'Imavow', 'The Sniper', FR, 'kickboks'),
    s('Caio', 'Borallho', 'The Natural', BR, 'bjj'),
    s('Reinier', 'de Rider', 'The Dutch Knight', NL, 'bjj'),
    s('Paulo', 'Kosta', 'Borrachinha', BR, 'sokak'),
    s('Jared', 'Canonier', 'Killa Gorilla', US, 'boks'),
    s('Brendan', 'Alen', 'All In', US, 'bjj'),
    s('Anderson', 'Sylva', 'The Spider', BR, 'muaythai'),
    s('Michael', 'Bisbing', 'The Count', UK, 'kickboks'),
  ],
  welter: [
    s('Belal', 'Muhammed', 'Remember the Name', US, 'gures'),
    s('Jack', 'Della Madalena', 'JDM', AU, 'boks'),
    s('Shavkat', 'Rahmonov', 'Nomad', KZ, 'sambo'),
    s('Leon', 'Edwardz', 'Rocky', UK, 'kickboks'),
    s('Kamaru', 'Usmann', 'The Nigerian Nightmare', NG, 'gures'),
    s('Sean', 'Bradey', 'The Philly Assassin', US, 'bjj'),
    s('Ian', 'Machado Gary', 'The Future', IE, 'kickboks'),
    s('Carlos', 'Pratez', 'The Nightmare', BR, 'muaythai'),
    s('Joaquin', 'Bucley', 'New Mansa', US, 'kickboks'),
    s('Colby', 'Covinton', 'Chaos', US, 'gures'),
    s('Gilbert', 'Burnz', 'Durinho', BR, 'bjj'),
    s('Stephen', 'Tompson', 'Wonderboy', US, 'kyokushin'),
    s('Jorge', 'Masvidall', 'Gamebred', CU, 'sokak'),
    s('Georges', 'St-Pier', 'Rush', FR, 'gures'),
  ],
  hafif: [
    s('Islam', 'Mahachev', 'The Dagestani', RU, 'sambo'),
    s('Arman', 'Tsarukian', 'Ahalkalakets', GE, 'gures'),
    s('Charles', 'Oliviera', 'do Bronx', BR, 'bjj'),
    s('Justin', 'Gaethjie', 'The Highlight', US, 'gures'),
    s('Dustin', 'Porier', 'The Diamond', US, 'boks'),
    s('Max', 'Holoway', 'Blessed', US, 'kickboks'),
    s('Mateusz', 'Gamroth', 'Gamer', PL, 'gures'),
    s('Paddy', 'Pimbllett', 'The Baddy', UK, 'bjj'),
    s('Benoit', 'Saint-Deni', 'God of War', FR, 'sambo'),
    s('Dan', 'Hoocker', 'The Hangman', AU, 'kickboks'),
    s('Michael', 'Chandlar', 'Iron', US, 'gures'),
    s('Beneil', 'Darius', 'Benny', US, 'bjj'),
    s('Connor', 'McGreggor', 'Notorious', IE, 'boks'),
    s('Tony', 'Fergusson', 'El Cucuy', US, 'sokak'),
    s('Khabib', 'Nurmagometov', 'The Eagle', RU, 'sambo'),
  ],
  tuy: [
    s('Ilia', 'Topurya', 'El Matador', GE, 'boks'),
    s('Alexander', 'Volkanovsky', 'The Great', AU, 'gures'),
    s('Diego', 'Lopez', 'El Toro', BR, 'bjj'),
    s('Movsar', 'Yevloev', 'The Shadow', RU, 'gures'),
    s('Yair', 'Rodrigez', 'El Pantera', MX, 'kickboks'),
    s('Lerone', 'Murphey', 'The Miracle', UK, 'boks'),
    s('Brian', 'Ortegah', 'T-City', US, 'bjj'),
    s('Arnold', 'Alen', 'Almighty', UK, 'kickboks'),
    s('Josh', 'Emmet', 'The Hammer', US, 'gures'),
    s('Calvin', 'Katar', 'The Boston Finisher', US, 'boks'),
    s('Chan Sung', 'Jong', 'The Korean Zombie', KR, 'sokak'),
    s('Jose', 'Aldoo', 'Scarface', BR, 'muaythai'),
  ],
  horoz: [
    s('Merab', 'Dvalisvili', 'The Machine', GE, 'gures'),
    s('Sean', "O'Maley", 'Suga', US, 'kickboks'),
    s('Umar', 'Nurmagometov', 'The Young Eagle', RU, 'sambo'),
    s('Pyotr', 'Yan', 'No Mercy', RU, 'boks'),
    s('Cory', 'Sandhagan', 'Sandman', US, 'kickboks'),
    s('Aljamain', 'Sterlin', 'Funk Master', US, 'gures'),
    s('Deiveson', 'Figueredo', 'Deus da Guerra', BR, 'bjj'),
    s('Song', 'Yadonq', 'Kung Fu Kid', CN, 'kickboks'),
    s('Mario', 'Bautysta', 'The Bad Boy', US, 'bjj'),
    s('Marlon', 'Verra', 'Chito', CL, 'muaythai'),
    s('Henry', 'Cejudoo', 'Triple C', US, 'gures'),
    s('Dominick', 'Kruz', 'The Dominator', US, 'gures'),
  ],
  sinek: [
    s('Alexandre', 'Pantojja', 'The Cannibal', BR, 'bjj'),
    s('Joshua', 'Vann', 'The Fearless', US, 'boks'),
    s('Brandon', 'Royvall', 'Raw Dawg', US, 'bjj'),
    s('Brandon', 'Morenno', 'The Assassin Baby', MX, 'boks'),
    s('Kai', 'Kara-Franse', "Don't Blink", AU, 'kickboks'),
    s('Tatsuro', 'Tayra', 'The Prodigy', JP, 'bjj'),
    s('Amir', 'Albasi', 'The Prince', UK, 'bjj'),
    s('Asu', 'Almabaev', 'Zulfikar', KZ, 'gures'),
    s('Muhammad', 'Mokayev', 'The Punisher', UK, 'gures'),
    s('Steve', 'Ercegg', 'Astroboy', AU, 'bjj'),
    s('Demetrius', 'Jonson', 'Mighty Mouse', US, 'gures'),
  ],
};

export const UCC_WOMEN: Partial<Record<WeightClass, Star[]>> = {
  sinek: [
    s('Valentina', 'Shevcenko', 'Bullet', KG, 'muaythai'),
    s('Alexa', 'Graso', 'The Mexican Queen', MX, 'boks'),
    s('Manon', 'Fiorott', 'The Beast', FR, 'kyokushin'),
    s('Erin', 'Blanchfeld', 'Cold Blooded', US, 'bjj'),
    s('Natalia', 'Sylva', 'The Butterfly', BR, 'kickboks'),
    s('Rose', 'Namajunes', 'Thug', US, 'kickboks'),
    s('Zhang', 'Weilii', 'Magnum', CN, 'sokak'),
    s('Maycee', 'Barbor', 'The Future', US, 'sokak'),
    s('Tracy', 'Cortes', 'The Phoenix', US, 'bjj'),
    s('Joanna', 'Jedrzejcyk', 'Joanna Champion', PL, 'muaythai'),
  ],
  horoz: [
    s('Kayla', 'Harison', 'The Judo Queen', US, 'judo'),
    s('Julianna', 'Pena', 'The Venezuelan Vixen', US, 'bjj'),
    s('Raquel', 'Penington', 'Rocky', US, 'boks'),
    s('Ketlen', 'Vieyra', 'Fenomeno', BR, 'bjj'),
    s('Irene', 'Aldanna', 'Robles', MX, 'boks'),
    s('Norma', 'Dumon', 'The Immortal', BR, 'muaythai'),
    s('Holly', 'Holmm', "The Preacher's Daughter", US, 'boks'),
    s('Miesha', 'Tait', 'Cupcake', US, 'gures'),
    s('Amanda', 'Nunez', 'The Lioness', BR, 'boks'),
    s('Ronda', 'Rousy', 'Rowdy', US, 'judo'),
  ],
  tuy: [
    s('Cris', 'Cyborgg', 'The Cyborg', BR, 'muaythai'),
    s('Germaine', 'de Randamy', 'The Iron Lady', NL, 'kickboks'),
    s('Mackenzie', 'Dernn', 'The BJJ Queen', US, 'bjj'),
    s('Tatiana', 'Suares', 'The Wrestling Queen', US, 'gures'),
    s('Yan', 'Xiaonann', 'Fury', CN, 'kickboks'),
    s('Virna', 'Jandirobba', 'Carcará', BR, 'bjj'),
    s('Marina', 'Rodrigez', 'The Assassin', BR, 'muaythai'),
    s('Jessica', 'Andrad', 'Bate Estaca', BR, 'gures'),
    s('Megan', 'Andersen', 'The Giant', AU, 'kickboks'),
    s('Felicia', 'Spenser', 'FeeNom', US, 'bjj'),
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
  const free = (x: Star) => !used.has(`${x.ad} ${x.soyad}`);
  if (champion) return list.find(free) ?? null;
  const want = rank != null ? Math.min(list.length - 1, Math.max(1, rank)) : 1 + Math.floor(rand() * Math.max(1, list.length - 1));
  for (let i = 0; i < list.length; i++) {
    const x = list[(want + i) % list.length];
    if ((want + i) % list.length === 0 && !s.sampiyon && list.length > 1) continue; // ilk isim şampiyonluk için ayrılır
    if (free(x)) return x;
  }
  return null;
}
