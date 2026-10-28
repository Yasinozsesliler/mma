// Sosyal medya ana sayfası: diğer dövüşçülerin fotoğraflı paylaşımları ve haftalık hikâyeleri.
// Fotoğraflar oyuncununkiyle aynı sahnelerden (PhotoArt) çizilir; dövüşçünün kendi görünüşü ve şort rengiyle.
import { L } from '../i18n';
import { currentOrg, fullName } from './character';
import { npcFollowers } from './fame';
import { COMMENTS, FAN_NAMES, type PhotoExtra, type PhotoKind, type PhotoPost } from './gram';
import { rand, randInt, uid } from './rng';
import { addPost, handleOf } from './social';
import { lookFor } from './tale';
import type { GameState, Opponent } from './types';

type Who = Pick<Opponent, 'id' | 'ad' | 'soyad' | 'uyruk'> & { kadin?: boolean };

const CAPTIONS: Record<PhotoKind, () => string[]> = {
  antrenman: () => [L("Sabah 6. Salon boş, ben doluyum. 💪"), L("Bugünün işi bitti. Yarın daha fazlası."), L("Kamp modu: açık. 🔒"), L("Ter yalan söylemez."), L("Yeni bir kombinasyon üzerinde çalışıyoruz 🤫")],
  luks: () => [L("Çocukken hayalini kurduğum şey. 🏎️"), L("Emeğin karşılığı."), L("Biraz keyif, sonra yine salon. 😎")],
  aile: () => [L("Her şey onlar için. ❤️"), L("Kampa dönmeden önce ailemle. 🏡"), L("En büyük destekçilerim.")],
  evcil: () => [L("Antrenman ortağım bugün tembellik ediyor 🐾"), L("Evin gerçek şampiyonu. 🐶"), L("Sabah koşusunu benden iyi yapıyor.")],
  taraftar: () => [L("Bu destek her şeye değer. 🙏"), L("Sizler olmasanız bu yol yürünmezdi."), L("İmza günü harikaydı, teşekkürler! ✍️")],
  sponsor: () => [L("Yeni sponsorumla tanışın! 🤝"), L("Kampın yakıtı belli. #reklam"), L("Yeni koleksiyon geldi. 🔥")],
  kemer: () => [L("Kemer uyurken bile yanımda. 🏆"), L("Tahtımı isteyen çok, hak eden yok. 👑"), L("Bir savunma daha, bir tarih daha.")],
  zafer: () => [L("Söylemiştim. Sıradaki! 👋"), L("Bu gece bir şey kanıtladım."), L("Kemer yolu devam ediyor.")],
  afis: () => [L("Tarih belli. Kafeste görüşürüz."), L("Geri sayım başladı. ⏳")],
};
const BRANDS = () => [L("Kuvvet Protein"), L("Titan Eldiven"), L("Kafes Giyim"), L("Hexagon Su")];

/** Basit, saf karıştırma (hikâyeler her çizimde aynı çıksın diye rastgelelik yok). */
const hash = (t: string) => [...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const at = <T,>(arr: T[], h: number) => arr[h % arr.length];

const lookOf = (o: Who) => lookFor({ id: o.id, uyruk: o.uyruk, kadin: o.kadin });

function extraFor(s: GameState, tur: PhotoKind, h: number): PhotoExtra | undefined {
  if (tur === 'sponsor') return { marka: at(BRANDS(), h) };
  if (tur === 'aile') return { emoji: at(['👨‍👩‍👧', '👩‍❤️‍👨', '👵', '👨‍👦'], h), ad: L("Ailem") };
  if (tur === 'evcil') return { emoji: at(['🐶', '🐱', '🐕', '🐈'], h) };
  if (tur === 'luks') return { tasit: at(['motorbike', 'ferry', 'airplane'], h) };
  if (tur === 'kemer') return { org: currentOrg(s), siklet: s.fighter.siklet };
  return undefined;
}

/** Bir dövüşçünün fotoğraf paylaşımı (akışa eklenmeden önceki hâli). */
export function npcPhotoPost(s: GameState, o: Who, tur: PhotoKind, aciklama: string, ek?: PhotoExtra): PhotoPost {
  const begeni = Math.max(40, Math.round(npcFollowers(s, o as Opponent) * 0.04 * (0.5 + rand())));
  const names = [...FAN_NAMES].sort(() => rand() - 0.5);
  const yorumlar = [...COMMENTS[tur]].sort(() => rand() - 0.5).slice(0, 2).map((metin, i) => ({ yazar: names[i], metin }));
  return { id: uid(), tur, hafta: s.hafta, aciklama, begeni, yorumSay: Math.max(2, Math.round(begeni * 0.02)), yorumlar, filtre: rand() < 0.6 ? 0 : randInt(1, 3), delta: 0, look: lookOf(o), ek: ek ?? extraFor(s, tur, randInt(0, 999)), sahip: o.id };
}

/** Dövüşçü fotoğraf paylaşır (haftalık akış). */
export function npcPhoto(s: GameState, o: Opponent, tur: PhotoKind, aciklama?: string, ek?: PhotoExtra) {
  const metin = aciklama ?? at(CAPTIONS[tur](), randInt(0, 99));
  const foto = npcPhotoPost(s, o, tur, metin, ek);
  addPost(s, { yazar: `${o.ad} ${o.soyad}`, kullanici: handleOf(o.ad, o.soyad), tur: 'dovuscu', metin, begeni: foto.begeni, foto, hedefId: s.rakipler.some((r) => r.id === o.id) ? o.id : undefined, renk: '#f2c14e' });
}

/** Oyuncuyu da içeren sahnelerde (maç afişi, zafer) karşı taraf oyuncunun kendisi. */
export const vsPlayer = (s: GameState, extra: PhotoExtra = {}): PhotoExtra => ({ ...extra, rakip: fullName(s.fighter), rakipLook: s.fighter.gorunum, rakipOyuncu: true });

export function toggleLike(s: GameState, postId: string) {
  const p = s.sosyal?.find((x) => x.id === postId);
  if (p) p.begendin = !p.begendin;
}

// ---------- Hikâyeler ----------

export interface Story {
  id: string;
  ad: string;
  kullanici: string;
  etiket?: string;
  foto: Pick<PhotoPost, 'tur' | 'filtre' | 'look' | 'ek' | 'sahip'> & { id: string };
  metin: string;
}

/** Bu haftanın hikâyeleri: sıradaki rakip, şampiyon, ezeli rakip, sıralamadan birkaç isim. Saf: aynı hafta hep aynı. */
export function storiesFor(s: GameState): Story[] {
  const kisiler: { o: Who; etiket?: string; tur?: PhotoKind }[] = [];
  const add = (o: Who | null | undefined, etiket?: string, tur?: PhotoKind) => {
    if (o && !kisiler.some((k) => k.o.id === o.id)) kisiler.push({ o, etiket, tur });
  };
  const rakip = s.pending.rakip;
  add(rakip, L("Rakibin"), 'antrenman');
  add(s.bolum?.sampiyon, L("Şampiyon"), 'kemer');
  if (s.ezeli && !s.ezeli.bitti) add({ ...s.ezeli, kadin: s.fighter.kadin }, L("Ezeli rakip"));
  (s.bolum?.liste ?? []).slice(0, 8).forEach((o) => {
    if (kisiler.length < 7 && hash(`${o.id}${s.hafta}`) % 3 !== 0) add(o);
  });
  const turler: PhotoKind[] = ['antrenman', 'antrenman', 'luks', 'aile', 'evcil', 'taraftar'];
  return kisiler.map(({ o, etiket, tur }) => {
    const h = hash(`${o.id}#${s.hafta}`);
    const t = tur ?? at(turler, h);
    const look = lookOf(o);
    return {
      id: `${o.id}-${s.hafta}`,
      ad: `${o.ad} ${o.soyad}`,
      kullanici: handleOf(o.ad, o.soyad),
      etiket,
      foto: { id: `st-${o.id}-${s.hafta}`, tur: t, filtre: h % 4 === 0 ? 1 : 0, look, ek: extraFor(s, t, h), sahip: o.id },
      metin: at(CAPTIONS[t](), h >>> 3),
    };
  });
}

export const storySeen = (s: GameState, id: string) => s.hikayeGorulen?.hafta === s.hafta && s.hikayeGorulen.ids.includes(id);

export function markStorySeen(s: GameState, id: string) {
  if (s.hikayeGorulen?.hafta !== s.hafta) s.hikayeGorulen = { hafta: s.hafta, ids: [] };
  if (!s.hikayeGorulen.ids.includes(id)) s.hikayeGorulen.ids.push(id);
}
