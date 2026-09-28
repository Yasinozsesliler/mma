/** Ekranın ses ortamı: menü ve kulüp müziği, dövüşte seyirci, kutlamada coşku. */
export type Scene = 'off' | 'menu' | 'hub' | 'fight' | 'celebrate';

export type Sfx =
  | 'click'
  | 'punch'
  | 'body'
  | 'heavy'
  | 'whoosh'
  | 'slam'
  | 'lock'
  | 'tap'
  | 'ooh'
  | 'roar'
  | 'applause'
  | 'bell'
  | 'bell2'
  | 'chime'
  | 'cash'
  | 'win'
  | 'lose'
  | 'fanfare'
  | 'flash'
  | 'swell';

export type SoundSettings = { muzik: boolean; efekt: boolean };
