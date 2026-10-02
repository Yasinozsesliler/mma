// Podcast davetleri: maçtan sonra popüler programlar davet eder. Üç soru gelir; her cevap gündem (takipçi),
// saygınlık (popülerlik), meydan okuma ve motivasyonu etkiler. Tartışmalı cevaplar sosyal medya krizi başlatabilir.
import { L, LOC } from '../i18n';
import { ORGS } from './data';
import { addFollowers, fmtDelta, followers } from './fame';
import { forceCrisis, type CrisisType } from './crisis';
import { interviewTargets } from './interview';
import { currentOrg } from './character';
import { chance, clamp, pick, rand, shuffle } from './rng';
import type { GameState } from './types';

type Answer = { metin: string; hype: number; saygi: number; risk?: number; kriz?: CrisisType; cagri?: 'sampiyon' | 'hedef'; motiv?: number; tepki: string };
type Question = { id: string; metin: string; cevaplar: Answer[] };

export interface Podcast {
  show: string;
  host: string;
  sorular: Question[];
  idx: number;
  hype: number;
  saygi: number;
  /** Davetin yapıldığı dövüş sayısı (bir sonraki dövüşe kadar geçerli) */
  dovus: number;
  son?: string;
  sonuc?: string;
  basladi?: boolean;
}

const SHOWS: [string, string][] = [
  ['The Joe Brogan Experience', 'Joe Brogan'],
  [L("MMA Saati"), 'Arial Helvani'],
  [L("Kafes Muhabbeti"), L("Kadir Usta")],
  [L("Gong Sonrası"), L("Selin Kaya")],
  ['Full Mount Podcast', 'Brendan Shaub'],
];

function questions(s: GameState): Question[] {
  const t = interviewTargets(s, true);
  const org = ORGS[currentOrg(s)].kisa;
  const hoca = s.takim.antrenor;
  const rakip = s.bolum?.liste[0] ? `${s.bolum.liste[0].ad} ${s.bolum.liste[0].soyad}` : L("bir rakibin");
  const q: Question[] = [
    {
      id: 'kim',
      metin: L("Sıklette en çok kimi yenmek istiyorsun?"),
      cevaplar: [
        ...(t.sampiyon ? [{ metin: L("Şampiyonu: {0}. Kemer benim olacak.", [t.sampiyon]), hype: 3, saygi: 1, cagri: 'sampiyon' as const, tepki: L("Klip anında yayıldı. Şampiyonun ekibi cevap verdi.") }] : []),
        ...(t.hedef ? [{ metin: L("{0}. Adını özellikle söylüyorum.", [t.hedef]), hype: 2, saygi: 1, cagri: 'hedef' as const, tepki: L("Meydan okuman başlık oldu.") }] : []),
        { metin: L("Kimseyi seçmem, önüme kim gelirse."), hype: 0, saygi: 2, tepki: L("Olgun bir cevap. Saygı kazandın.") },
      ],
    },
    {
      id: 'para',
      metin: L("{0} dövüşçülere az mı ödüyor?", [org]),
      cevaplar: [
        { metin: L("Açıkça söylüyorum: evet, sömürülüyoruz."), hype: 4, saygi: 0, risk: 0.25, kriz: 'kesilmisVideo', tepki: L("Dövüşçüler seni alkışladı, organizasyon hiç memnun değil.") },
        { metin: L("Hakkımı alıyorum, sorun yok."), hype: 0, saygi: 1, tepki: L("Kimseyi kızdırmadın.") },
        { metin: L("Para için değil, miras için dövüşüyorum."), hype: 1, saygi: 2, tepki: L("Taraftarlar bu cümleye bayıldı.") },
      ],
    },
    {
      id: 'zor',
      metin: L("Hayatındaki en zor an neydi?"),
      cevaplar: [
        { metin: L("Samimi bir hikâye anlat"), hype: 2, saygi: 3, tepki: L("Stüdyo sessizleşti. Yorumlar duygusal mesajlarla doldu.") },
        { metin: L("Espriyle geçiştir"), hype: 2, saygi: 0, tepki: L("Kahkahalar attınız, kısa bir klip viral oldu.") },
        { metin: L("“Bunu konuşmak istemiyorum.”"), hype: 0, saygi: 0, tepki: L("Host konuyu değiştirdi.") },
      ],
    },
    {
      id: 'laf',
      metin: L("{0} senin için “abartılmış” dedi. Cevabın?", [rakip]),
      cevaplar: [
        { metin: L("Kafeste konuşuruz."), hype: 1, saygi: 2, tepki: L("Kısa ve net. Saygı duyuldu.") },
        { metin: L("Ağır bir cevap ver"), hype: 4, saygi: -1, risk: 0.3, kriz: 'taraftarBaskini', tepki: L("Ortalık karıştı! Rakibin taraftarları ayaklandı.") },
        { metin: L("Gülüp geç"), hype: 2, saygi: 1, tepki: L("Umursamaz tavrın çok sevildi.") },
      ],
    },
    {
      id: 'doping',
      metin: L("Sporda doping hakkında ne düşünüyorsun?"),
      cevaplar: [
        { metin: L("Daha sert testler şart."), hype: 1, saygi: 2, tepki: L("Temiz sporun savunucusu oldun.") },
        { metin: L("Herkes kullanıyor, saklamayalım."), hype: 5, saygi: -2, risk: 0.5, kriz: 'sahteHaber', tepki: L("Bomba gibi düştü… Herkes seni konuşuyor, ama iyi anlamda değil.") },
        { metin: L("Benim işim değil, kendi işime bakarım."), hype: 0, saygi: 0, tepki: L("Pas geçtin.") },
      ],
    },
    {
      id: 'hoca',
      metin: L("Hocan {0} hakkında ne söylersin?", [hoca]),
      cevaplar: [
        { metin: L("Her şeyimi ona borçluyum."), hype: 1, saygi: 2, motiv: 1, tepki: L("Hocan programı izledi, gözleri doldu. Motivasyonun arttı.") },
        { metin: L("Bazen hiç anlaşamıyoruz."), hype: 3, saygi: -1, motiv: -1, tepki: L("Salonda hava gerildi. Hocan bu sözleri beğenmedi.") },
      ],
    },
    {
      id: 'emeklilik',
      metin: L("Emekliliği hiç düşünüyor musun?"),
      cevaplar: [
        { metin: L("Daha yeni başlıyorum."), hype: 1, saygi: 1, motiv: 1, tepki: L("Açlığın hissediliyor.") },
        { metin: L("Kemeri alınca bırakabilirim."), hype: 2, saygi: 0, tepki: L("“Kemer ve veda” başlıkları atıldı.") },
      ],
    },
  ];
  return shuffle(q.filter((x) => x.cevaplar.length >= 2)).slice(0, 3);
}

/** Dövüşten sonra davet gelebilir. */
export function maybePodcast(s: GameState) {
  if (s.stage === 'amator' || s.populerlik < 15 || followers(s) < 5000) return;
  if (s.podcast && s.podcast.dovus === s.gecmis.length) return;
  s.podcast = undefined;
  const last = s.podcastSon ?? -99;
  if (s.gecmis.length - last < 4 || !chance(0.2 + s.populerlik / 400)) return;
  const [show, host] = pick(SHOWS);
  s.podcast = { show, host, sorular: questions(s), idx: 0, hype: 0, saygi: 0, dovus: s.gecmis.length };
  s.haberler.unshift(L("🎙️ {0} programına davet edildin. Sunucu: {1}.", [show, host]));
}

export function podcastAnswer(s: GameState, i: number) {
  const p = s.podcast;
  if (!p || p.sonuc) return;
  p.basladi = true;
  const q = p.sorular[p.idx];
  const a = q?.cevaplar[i];
  if (!a) return;
  p.hype += a.hype;
  p.saygi += a.saygi;
  if (a.motiv) s.motivasyon = clamp(s.motivasyon + a.motiv, -2, 2);
  if (a.cagri) {
    const t = interviewTargets(s, true);
    s.cagri = (a.cagri === 'sampiyon' ? t.sampiyonId : t.hedefId) ?? s.cagri;
  }
  let tepki = a.tepki;
  if (a.risk && a.kriz && chance(a.risk) && forceCrisis(s, a.kriz)) tepki += ' ' + L("🔥 Sözlerin krize dönüştü!");
  p.son = tepki;
  p.idx++;
  if (p.idx >= p.sorular.length) finishPodcast(s);
}

function finishPodcast(s: GameState) {
  const p = s.podcast!;
  const F = followers(s);
  const d = addFollowers(s, F * (0.01 + p.hype * 0.008) * (0.8 + rand() * 0.4) + 200);
  s.populerlik = clamp(s.populerlik + Math.round(p.saygi / 2), 0, 100);
  s.podcastSon = s.gecmis.length;
  const izlenme = Math.round((F * (0.3 + p.hype * 0.15) + 5000) / 1000) * 1000;
  p.sonuc = L("Bölüm {0} kez izlendi. Takipçi {1}, popülerlik {2}.", [izlenme.toLocaleString(LOC), fmtDelta(d), `${p.saygi >= 0 ? '+' : ''}${Math.round(p.saygi / 2)}`]);
  s.haberler.unshift(`🎙️ ${p.show}: ${p.sonuc}`);
}

export function declinePodcast(s: GameState) {
  s.podcast = undefined;
}

export function closePodcast(s: GameState) {
  if (s.podcast?.sonuc) s.podcast = undefined;
  s.phase = 'hub';
}
