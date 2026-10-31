// Podcast davetleri: maçtan sonra popüler programlar davet eder. Üç soru gelir; her cevap gündem (takipçi),
// saygınlık (popülerlik), meydan okuma ve motivasyonu etkiler. Tartışmalı cevaplar sosyal medya krizi başlatabilir.
import { L, LOC } from '../i18n';
import { ORGS } from './data';
import { addFollowers, fmtDelta, followers } from './fame';
import { forceCrisis, type CrisisType } from './crisis';
import { interviewTargets } from './interview';
import { currentOrg } from './character';
import { chance, clamp, pick, rand } from './rng';
import { fresh, oneOf } from './variety';
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
  const son = s.gecmis[0];
  const q: (Question & { kosul?: boolean })[] = [
    {
      id: 'kim',
      metin: oneOf([L("Sıklette en çok kimi yenmek istiyorsun?"), L("Hayalindeki rakip kim? Bir isim ver.")]),
      cevaplar: [
        ...(t.sampiyon ? [{ metin: L("Şampiyonu: {0}. Kemer benim olacak.", [t.sampiyon]), hype: 3, saygi: 1, cagri: 'sampiyon' as const, tepki: oneOf([L("Klip anında yayıldı. Şampiyonun ekibi cevap verdi."), L("Şampiyonun menajeri programdan sonra telefonu açtı.")]) }] : []),
        ...(t.hedef ? [{ metin: L("{0}. Adını özellikle söylüyorum.", [t.hedef]), hype: 2, saygi: 1, cagri: 'hedef' as const, tepki: oneOf([L("Meydan okuman başlık oldu."), L("{0} hikâyesinde videoyu paylaştı: “Yerimi biliyor.”", [t.hedef])]) }] : []),
        { metin: oneOf([L("Kimseyi seçmem, önüme kim gelirse."), L("İsim vermem. Kim gelirse gelsin, hazırım.")]), hype: 0, saygi: 2, tepki: oneOf([L("Olgun bir cevap. Saygı kazandın."), L("Sunucu başını salladı: “İşte profesyonel.”")]) },
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
      metin: oneOf([L("Hayatındaki en zor an neydi?"), L("Seni en çok ne yıktı, nasıl kalktın?")]),
      cevaplar: [
        { metin: L("Samimi bir hikâye anlat"), hype: 2, saygi: 3, tepki: oneOf([L("Stüdyo sessizleşti. Yorumlar duygusal mesajlarla doldu."), L("Sunucunun gözleri doldu. Bölümün en çok izlenen anı bu oldu.")]) },
        { metin: L("Espriyle geçiştir"), hype: 2, saygi: 0, tepki: oneOf([L("Kahkahalar attınız, kısa bir klip viral oldu."), L("Ciddi soruyu şakaya çevirdin; bazıları sevdi, bazıları kaçamak buldu.")]) },
        { metin: L("“Bunu konuşmak istemiyorum.”"), hype: 0, saygi: 0, tepki: L("Host konuyu değiştirdi.") },
      ],
    },
    {
      id: 'laf',
      metin: L("{0} senin için “abartılmış” dedi. Cevabın?", [rakip]),
      cevaplar: [
        { metin: oneOf([L("Kafeste konuşuruz."), L("Sözleşmeyi imzalasın, gerisini kafeste anlatırım.")]), hype: 1, saygi: 2, tepki: L("Kısa ve net. Saygı duyuldu.") },
        { metin: L("Ağır bir cevap ver"), hype: 4, saygi: -1, risk: 0.3, kriz: 'taraftarBaskini', tepki: L("Ortalık karıştı! Rakibin taraftarları ayaklandı.") },
        { metin: oneOf([L("Gülüp geç"), L("“Kim?” diye sor")]), hype: 2, saygi: 1, tepki: oneOf([L("Umursamaz tavrın çok sevildi."), L("“Kim?” anı mem oldu bile.")]) },
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
        { metin: L("Bir hikâyesini anlat: ilk tanıştığınız gün"), hype: 2, saygi: 2, tepki: L("Hocanla ilk günün hikâyesi bölümün en sevilen anı oldu.") },
      ],
    },
    {
      id: 'emeklilik',
      metin: L("Emekliliği hiç düşünüyor musun?"),
      cevaplar: [
        { metin: L("Daha yeni başlıyorum."), hype: 1, saygi: 1, motiv: 1, tepki: L("Açlığın hissediliyor.") },
        { metin: L("Kemeri alınca bırakabilirim."), hype: 2, saygi: 0, tepki: L("“Kemer ve veda” başlıkları atıldı.") },
        { metin: L("Vücudum ne zaman ‘dur’ derse."), hype: 0, saygi: 2, tepki: L("Gerçekçi bir cevap; eski dövüşçüler yorumlarda destek verdi.") },
      ],
    },
    {
      id: 'son_yenilgi',
      kosul: son?.sonuc === 'M',
      metin: oneOf([L("Son maçı kaybettin. O gece ne oldu?"), L("Son yenilgiyi tekrar izledin mi? Ne gördün?")]),
      cevaplar: [
        { metin: L("O gece daha iyi olan kazandı. Ders aldım."), hype: 0, saygi: 3, motiv: 1, tepki: L("Yenilgiyi kabullenmen büyük saygı topladı.") },
        { metin: L("Hakemler beni soydu."), hype: 3, saygi: -1, risk: 0.2, kriz: 'kesilmisVideo', tepki: L("Hakem tartışması alevlendi; organizasyon pek hoşlanmadı.") },
        { metin: L("Rövanş istiyorum. Hemen."), hype: 3, saygi: 1, tepki: L("Rövanş çağrın gündem oldu.") },
      ],
    },
    {
      id: 'son_galibiyet',
      kosul: son?.sonuc === 'G',
      metin: oneOf([L("Son maçı nasıl kazandın? Bize anlat."), L("Son galibiyetinin sırrı neydi?")]),
      cevaplar: [
        { metin: L("Kamp, kamp, kamp. Ekibimin zaferi."), hype: 0, saygi: 2, tepki: L("Ekibini öne çıkardın; salonun takipçisi patladı.") },
        { metin: L("Rakibi kamp boyunca izledim; her hareketini biliyordum."), hype: 2, saygi: 1, tepki: L("Analiz videoları bölümden kesilip paylaşıldı.") },
        { metin: L("Doğuştan yetenek. Çalışmama gerek yok."), hype: 4, saygi: -2, tepki: L("Kibirli bulundu, ama bölüm çok izlendi.") },
      ],
    },
    {
      id: 'sampiyon',
      kosul: s.sampiyon,
      metin: L("Şampiyonsun. Kemer hayatını nasıl değiştirdi?"),
      cevaplar: [
        { metin: L("Sorumluluk arttı. Her gün kemeri yeniden hak etmeliyim."), hype: 0, saygi: 3, tepki: L("Şampiyon gibi konuştun.") },
        { metin: L("Herkes artık arkadaşım oldu, ilginç."), hype: 2, saygi: 1, tepki: L("Samimi esprin çok sevildi.") },
        { metin: L("Sıradaki iki kemer. Çifte şampiyonluk geliyor."), hype: 4, saygi: 0, tepki: L("“Çifte şampiyonluk” sözü başlık oldu.") },
      ],
    },
    {
      id: 'aile',
      kosul: (s.cocuklar ?? []).length > 0,
      metin: L("Ebeveyn olmak dövüşçülüğünü nasıl etkiledi?"),
      cevaplar: [
        { metin: L("Artık kaybetmeye hakkım yok; onlar için kazanıyorum."), hype: 1, saygi: 3, motiv: 1, tepki: L("Aile hikâyen milyonlara ulaştı.") },
        { metin: L("Uykusuzluk en zor rakibim oldu."), hype: 2, saygi: 1, tepki: L("Ebeveynler yorumlarda seni sahiplendi.") },
      ],
    },
    {
      id: 'memleket',
      metin: oneOf([L("Memleketinde seni nasıl karşılıyorlar?"), L("Doğduğun yerle bağın nasıl?")]),
      cevaplar: [
        { metin: L("Her maçtan sonra mahalleye giderim. Onlar benim gücüm."), hype: 1, saygi: 2, tepki: L("Memleketinde bölüm toplu izlendi.") },
        { metin: L("Eskiden kimse inanmazdı. Şimdi herkes kuzenim."), hype: 3, saygi: 0, tepki: L("Espri tuttu ama memlekette bazıları alındı.") },
        { metin: L("Oraya bir salon açmak istiyorum."), hype: 1, saygi: 3, tepki: L("Salon hayalin yerel haberlere çıktı.") },
      ],
    },
    {
      id: 'idol',
      metin: L("Çocukken kimi izleyerek büyüdün?"),
      cevaplar: [
        { metin: L("Eski bir efsaneyi anlat, saygını göster"), hype: 1, saygi: 2, tepki: L("Efsanenin hesabı klibi paylaştı!") },
        { metin: L("Kimseyi. Ben kendi efsanemi yazıyorum."), hype: 3, saygi: -1, tepki: L("Cüretkâr bir cevap; tartışma çıktı.") },
        { metin: L("Babamı. Gerçek kahraman oydu."), hype: 1, saygi: 3, tepki: L("Duygusal an bölümün yıldızı oldu.") },
      ],
    },
    {
      id: 'ritüel',
      metin: L("Maçtan önce bir ritüelin var mı?"),
      cevaplar: [
        { metin: L("Aynı şarkı, aynı çorap. Değiştirmem."), hype: 2, saygi: 0, tepki: L("Taraftarlar şarkıyı listelere soktu.") },
        { metin: L("Sessizlik. Kimseyle konuşmam."), hype: 0, saygi: 2, tepki: L("Gizemli tavrın ilgi çekti.") },
        { metin: L("Annemi ararım. Her zaman."), hype: 1, saygi: 2, tepki: L("“Annesini arayan dövüşçü” en çok paylaşılan klip oldu.") },
      ],
    },
    {
      id: 'sosyal',
      metin: L("Sosyal medyada seninle ilgili en saçma söylenti neydi?"),
      cevaplar: [
        { metin: L("Bir söylentiyi gülerek düzelt"), hype: 3, saygi: 1, tepki: L("Kendinle dalga geçmen çok sevildi.") },
        { metin: L("Söylentileri okumam."), hype: 0, saygi: 1, tepki: L("Kısa geçtin; sunucu hayal kırıklığına uğradı.") },
        { metin: L("Bir rakibin söylentiyi yaydığını ima et"), hype: 4, saygi: -1, risk: 0.25, kriz: 'sahteHaber', tepki: L("İma büyüdü; herkes kimi kastettiğini tartışıyor.") },
      ],
    },
    {
      id: 'boks',
      metin: L("Bir boks maçı teklif gelse kabul eder misin?"),
      cevaplar: [
        { metin: L("Doğru para gelirse, neden olmasın?"), hype: 3, saygi: 0, tepki: L("Boks promotörleri kulak kabarttı.") },
        { metin: L("Ben MMA dövüşçüsüyüm. Kafes benim evim."), hype: 0, saygi: 2, tepki: L("Sporuna sadakat taraftarları mutlu etti.") },
      ],
    },
    {
      id: 'tavsiye',
      metin: L("MMA'ya başlamak isteyen gençlere tavsiyen ne?"),
      cevaplar: [
        { metin: L("Sabır. Her gün biraz daha iyi ol."), hype: 0, saygi: 3, tepki: L("Gençler yorumlarda teşekkür etti.") },
        { metin: L("Okulunu bitir, sonra kafes."), hype: 1, saygi: 2, tepki: L("Aileler bu cevaba bayıldı.") },
        { metin: L("Sert ol. Bu spor zayıfları affetmez."), hype: 2, saygi: 0, tepki: L("Sert sözler ikiye böldü.") },
      ],
    },
  ];
  return fresh(s, 'podcast', q.filter((x) => x.kosul !== false && x.cevaplar.length >= 2), 3);
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
