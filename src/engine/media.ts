// Ünlülük ve medya: ünün arttıkça film, belgesel, reklam yüzü, talk show, dergi kapağı ve dizi teklifleri gelir.
// Para ve şöhret getirir ama kamptan çalar: kabul edilen projeden sonraki kampta gelişim azalır.
// Projeler Kafespedia'daki "Medya" bölümünde ve profilde birikir.
import { L, LOC } from '../i18n';
import { addFollowers, fmtDelta, followers } from './fame';
import { chance, clamp, pick } from './rng';
import type { GameEventState, GameState } from './types';

export type MediaKind = 'film' | 'belgesel' | 'reklam' | 'talkshow' | 'kapak' | 'dizi';
export interface MediaWork {
  tur: MediaKind;
  ad: string;
  yil: number;
  yas: number;
}

const OLCEK: Record<GameState['stage'], number> = { amator: 0, bolgesel: 3_000, buyuk: 20_000, ufc: 90_000 };

const FILM = [L("Son Raunt"), L("Demir Yumruk"), L("Kafes: Kan ve Onur"), L("Gece Avcısı"), L("Sokak Kralı"), L("Kırık Burun")];
const DIZI = [L("Mahalle"), L("Ringin Gölgesi"), L("Aile Bağları"), L("Gece Vardiyası")];
const MARKA = [L("Titan Sportswear"), L("Volt Enerji İçeceği"), L("Kartal Saat"), L("Atlas Otomotiv")];
const SHOW = [L("Gece Yarısı Şov"), L("Sabah Kahvesi"), L("Tam Kadro"), L("Gerçek Konuşmalar")];
const DERGI = [L("Spor Dünyası"), L("Erkek Stili"), L("Fight Magazine"), L("Kapak Kızı ve Oğlanları")];

type Def = {
  pop: number;
  baslik: () => string;
  metin: (s: GameState, ad: string) => string;
  ad: (s: GameState) => string;
  para: number;
  takipci: number;
  populer: number;
  /** Sonraki kampta gelişim cezası (0.25 = %25 daha az) */
  yorgun: number;
  kabul: () => string;
};

const DEFS: Record<MediaKind, Def> = {
  film: {
    pop: 55,
    baslik: () => L("🎬 Film Teklifi"),
    metin: (s, ad) => L("Bir yapımcı seni “{0}” adlı aksiyon filminde kötü adam olarak istiyor. Çekimler üç hafta, Hollywood'dan bir yönetmen.", [ad]),
    ad: () => pick(FILM),
    para: 3,
    takipci: 0.12,
    populer: 5,
    yorgun: 0.35,
    kabul: () => L("Sette herkes senden korktu, sonra sevdi. Fragman bir günde 20 milyon izlendi."),
  },
  belgesel: {
    pop: 40,
    baslik: () => L("🎥 Belgesel Teklifi"),
    metin: (s) => L("Bir yayın platformu senin hayatını anlatan bir belgesel çekmek istiyor. Kamera ekibi bir sonraki kampın boyunca peşinde olacak; memleketine, ailene de gidecekler."),
    ad: (s) => `${s.fighter.ad} ${s.fighter.soyad}: ${L("Kafesten Kemere")}`,
    para: 1.5,
    takipci: 0.08,
    populer: 4,
    yorgun: 0.15,
    kabul: () => L("Kamera her şeyi çekti: sabah koşularını, kesimin zor anlarını, annenin mutfağını. İzleyiciler seni tanıdı."),
  },
  reklam: {
    pop: 30,
    baslik: () => L("📺 Reklam Yüzü"),
    metin: (s, ad) => L("{0} yeni kampanyasının yüzü olmanı istiyor. Bir günlük çekim, ülke çapında billboard.", [ad]),
    ad: () => pick(MARKA),
    para: 1,
    takipci: 0.04,
    populer: 2,
    yorgun: 0.05,
    kabul: () => L("Şehrin her köşesinde yüzün var. Annen her billboard'un fotoğrafını çekiyor."),
  },
  talkshow: {
    pop: 25,
    baslik: () => L("🎙️ Talk Show Daveti"),
    metin: (s, ad) => L("“{0}” programı seni konuk olarak çağırdı. Sunucu ünlü, şaka kaldırırsa salon seninle.", [ad]),
    ad: () => pick(SHOW),
    para: 0.3,
    takipci: 0.05,
    populer: 3,
    yorgun: 0,
    kabul: () => L("Sunucuya canlı yayında armbar gösterdin. Klip her yerde."),
  },
  kapak: {
    pop: 45,
    baslik: () => L("📰 Dergi Kapağı"),
    metin: (s, ad) => L("{0} dergisi seni kapağa koymak istiyor. Bir günlük çekim, büyük bir röportaj.", [ad]),
    ad: () => pick(DERGI),
    para: 0.6,
    takipci: 0.04,
    populer: 3,
    yorgun: 0,
    kabul: () => L("Kapak büfelerde tükendi. Bir kopyası salonun duvarında."),
  },
  dizi: {
    pop: 50,
    baslik: () => L("📺 Dizi Konuk Rolü"),
    metin: (s, ad) => L("Sevilen dizi “{0}” bir bölümde seni kendini oynaman için istiyor. İki hafta çekim.", [ad]),
    ad: () => pick(DIZI),
    para: 1.5,
    takipci: 0.07,
    populer: 3,
    yorgun: 0.2,
    kabul: () => L("Sahnen sosyal medyada dolaştı. Senaristler “bir sezon daha gel” diyor."),
  },
};

export const MEDIA_ICON: Record<MediaKind, string> = { film: 'movie-open', belgesel: 'video-vintage', reklam: 'billboard', talkshow: 'microphone-variant', kapak: 'newspaper-variant', dizi: 'television-classic' };
export const MEDIA_LABEL: Record<MediaKind, () => string> = {
  film: () => L("Film"),
  belgesel: () => L("Belgesel"),
  reklam: () => L("Reklam"),
  talkshow: () => L("Talk show"),
  kapak: () => L("Dergi kapağı"),
  dizi: () => L("Dizi"),
};

const payOf = (s: GameState, d: Def) => Math.round((OLCEK[s.stage] * d.para * (0.7 + s.populerlik / 100)) / 500) * 500;

/** Uygun bir medya teklifi (en az 3 dövüşte bir, popülerliğe göre). */
export function mediaOffer(s: GameState): GameEventState | null {
  if (s.stage === 'amator' || s.gecmis.length - (s.medyaSon ?? -99) < 3) return null;
  const belgeselVar = (s.medya ?? []).some((m) => m.tur === 'belgesel');
  const uygun = (Object.keys(DEFS) as MediaKind[]).filter((k) => s.populerlik >= DEFS[k].pop && !(k === 'belgesel' && belgeselVar));
  if (!uygun.length || !chance(0.45)) return null;
  const tur = pick(uygun);
  const d = DEFS[tur];
  const ad = d.ad(s);
  const para = payOf(s, d);
  const yorgunluk = d.yorgun ? L("Sonraki kampta gelişim %{0} azalır.", [Math.round(d.yorgun * 100)]) : L("Kampına etkisi yok.");
  return {
    id: `medya:${tur}`,
    baslik: d.baslik(),
    metin: `${d.metin(s, ad)}\n\n${L("Ücret: ${0}", [para.toLocaleString(LOC)])} · ${yorgunluk}`,
    secenekler: [L("Kabul et"), L("Reddet, odak kafeste")],
    params: { ad, para },
  };
}

export function chooseMedia(s: GameState, idx: number): string {
  const ev = s.pending.olay!;
  const tur = ev.id.split(':')[1] as MediaKind;
  const d = DEFS[tur];
  s.medyaSon = s.gecmis.length;
  if (idx === 1) {
    s.motivasyon = clamp(s.motivasyon + 1, -2, 2);
    return L("“Şu an tek işim dövüşmek.” Hocan bu cevabı çok sevdi. Motivasyon +1.");
  }
  const para = Number(ev.params.para);
  s.para += para;
  s.populerlik = clamp(s.populerlik + d.populer, 0, 100);
  const t = addFollowers(s, Math.max(500, followers(s) * d.takipci));
  if (d.yorgun) s.medyaYorgun = Math.max(s.medyaYorgun ?? 0, d.yorgun);
  s.medya = [...(s.medya ?? []), { tur, ad: String(ev.params.ad || L("Kafesten Kemere")), yil: s.hafta, yas: s.fighter.yas }];
  s.haberler.unshift(L("🎬 {0}: {1} projesinde yer aldı.", [s.fighter.soyad, MEDIA_LABEL[tur]()]));
  return L("{0} +${1}, popülerlik +{2}, {3} takipçi.", [d.kabul(), para.toLocaleString(LOC), d.populer, fmtDelta(t)]);
}

/** Kamp başında: medya yorgunluğu gelişim çarpanına yansır ve tüketilir. */
export function mediaFatigue(s: GameState) {
  const y = s.medyaYorgun ?? 0;
  s.medyaYorgun = 0;
  return 1 - y;
}
