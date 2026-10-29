// Efsane Yolları: gerçek kariyer kalıplarından esinlenen hazır dövüşçülerle bölüm bölüm hikâye modu.
// Her bölümün bir ana hedefi (1 yıldız) ve tarihe sadık iki ek yıldızı var. Hikâye, oyunun kendi sistemleriyle
// (organizasyonlar, sıklet değiştirme, crossover boks, sponsorlar, marka, salon) oynanır; senaryolu anlar bölüm başında gelir.
// İsimler normal oyundaki UCC kadrosu gibi gerçeği çağrıştırır ama birebir aynı değildir; oyuncu başlarken adı değiştirebilir.
// Bölümler: legendKral.ts, legendDahi.ts, legendProfesor.ts, legendYenilmez.ts; tipler ve yardımcılar legendKit.ts.
import { L } from '../i18n';
import { createGame, rollStartingStats, type NewFighterInput } from './character';
import { ensureDivision } from './division';
import { addFollowers, followers, initialFollowers } from './fame';
import { DAHI } from './legendDahi';
import { $, type Chapter, type LegendDef, type LegendFight, type LegendId, type LegendPress, type LegendRun } from './legendKit';
import { KRAL } from './legendKral';
import { PROFESOR } from './legendProfesor';
import { YENILMEZ } from './legendYenilmez';
import { KRALICE } from './legendKralice';
import { ORUMCEK } from './legendOrumcek';
import { IMPARATOR } from './legendImparator';
import { clamp } from './rng';
import type { GameState, Opponent, StatKey } from './types';

export type { Chapter, LegendDef, LegendFight, LegendId, LegendRun } from './legendKit';

// ---------- Efsaneler ----------

export const LEGENDS: Record<LegendId, LegendDef> = {
  kral: {
    id: 'kral',
    ad: 'Conor',
    soyad: 'McGrath',
    lakap: () => 'The Infamous',
    uyruk: 'ie',
    memleket: () => L("Dublin"),
    bayrak: '🇮🇪',
    renk: '#169b62',
    ozet: () => L("Tesisatçı çıraklığından işsizlik yardımına, oradan iki sıklette şampiyonluğa ve asrın boks maçına. Kafesin en büyük şovmeni."),
    etiketler: () => [L("Çifte şampiyon"), L("13 saniye"), L("Asrın boks maçı")],
    oynanabilir: true,
    ucretsiz: true,
    yas: 18,
    siklet: 'tuy',
    gecmis: 'boks',
    boy: 175,
    // Yana taralı saç, kızıl kahve gür sakal, mavi gözler, kalın kaşlar, göğüste ve kolda dövme
    gorunum: { ten: 0, sac: 'yanayrik', sacRenk: 3, goz: 3, sakal: 'tam', yara: false, dovme: true, dovmeler: ['gogus', 'kol'], kas: 2, yuz: 1, burun: 1 },
    statMod: { vurus: 6, hiz: 3, iq: 4, kondisyon: -3 },
    para: 400,
    populerlik: 14,
    bolumler: KRAL,
    odulKozmetik: 'sort_kral',
    final: () => L("Tesisatçı çıraklığından dünyanın en çok kazanan sporcusuna. Hikâyeyi kendi yumruklarınla yeniden yazdın."),
  },
  dahi: {
    id: 'dahi',
    ad: 'Jonah',
    soyad: 'Jonsby',
    lakap: () => 'Skeleton',
    uyruk: 'us',
    memleket: () => L("Rochester, New York"),
    bayrak: '🇺🇸',
    renk: '#3a86ff',
    ozet: () => L("23 yaşında en genç şampiyon. Kafeste kimsenin çözemediği bir bulmaca; kafes dışında kendi en büyük rakibi."),
    etiketler: () => [L("En genç şampiyon"), L("Ezeli rakip"), L("Ağır sıklet")],
    oynanabilir: true,
    ucretsiz: true,
    yas: 20,
    siklet: 'yariagir',
    gecmis: 'gures',
    boy: 193,
    // Kazınmış saç, kirli sakal, uzun yüz, göğüste yazı dövmesi
    gorunum: { ten: 6, sac: 'kazik', sacRenk: 0, goz: 0, sakal: 'kirli', yara: false, dovme: false, dovmeler: ['gogus'], yuz: 3, kas: 1, burun: 0 },
    statMod: { gures: 5, iq: 4, hiz: 2, cene: -1 },
    para: 600,
    populerlik: 8,
    hoca: () => 'Greg Jacks',
    salon: () => 'Jacks Wink MMA',
    bolumler: DAHI,
    odulKozmetik: 'sort_dahi',
    final: () => L("Güreş minderinden iki sıklette şampiyonluğa. Kafeste kimse seni yenemedi; tek rakibin hep kendindin."),
  },
  profesor: {
    id: 'profesor',
    ad: 'Georges',
    soyad: 'Saint-Pierron',
    lakap: () => 'The Professor',
    uyruk: 'fr',
    memleket: () => L("Montreal"),
    bayrak: '🇨🇦',
    renk: '#e63946',
    ozet: () => L("Karate ile başlayan, her yenilgiyi rövanşta silen kusursuz taktisyen. Welter'ın en uzun soluklu hükümdarı."),
    etiketler: () => [L("Rövanş ustası"), L("Welter hükümdarı"), L("Onur Listesi")],
    oynanabilir: true,
    ucretsiz: true,
    yas: 20,
    siklet: 'welter',
    gecmis: 'kyokushin',
    boy: 178,
    // Kısa saç, sakalsız, köşeli çene
    gorunum: { ten: 1, sac: 'kisa', sacRenk: 0, goz: 1, sakal: 'yok', yara: false, dovme: false, yuz: 1, kas: 1, burun: 0 },
    statMod: { kondisyon: 4, iq: 5, gures: 3, hiz: -2 },
    para: 300,
    populerlik: 6,
    hoca: () => 'Firas Zahir',
    salon: () => 'Trident Gym',
    bolumler: PROFESOR,
    odulKozmetik: 'sort_profesor',
    final: () => L("Zorbalardan kaçan çocuktan Onur Listesi'ne. Disiplinin, yeteneği her zaman yenebileceğini kanıtladın."),
  },
  yenilmez: {
    id: 'yenilmez',
    ad: 'Khabir',
    soyad: 'Nurmagaliev',
    lakap: () => 'The Falcon',
    uyruk: 'ru',
    memleket: () => L("Dağıstan"),
    bayrak: '🏔️',
    renk: '#f2c14e',
    ozet: () => L("Dağlarda ayılarla güreşerek büyüyen çocuk. Kimse onu yerde tutamadı, kimse onu yenemedi: 29-0."),
    etiketler: () => [L("29-0"), L("Hiç yenilmedi"), L("Asrın gecesi")],
    oynanabilir: true,
    ucretsiz: true,
    yas: 20,
    siklet: 'hafif',
    gecmis: 'sambo',
    boy: 178,
    // Gür sakal, yuvarlak yüz, güreşçi kulağı
    gorunum: { ten: 1, sac: 'kisa', sacRenk: 0, goz: 0, sakal: 'tam', yara: false, dovme: false, yuz: 2, kas: 2, burun: 1, kulak: 1 },
    statMod: { gures: 7, yer: 4, kondisyon: 2, vurus: -3 },
    para: 200,
    populerlik: 5,
    hoca: () => 'Abdulmenaf Nurmagaliev',
    salon: () => L("Kartal Salonu"),
    bolumler: YENILMEZ,
    odulKozmetik: 'sort_yenilmez',
    final: () => L("Dağların çocuğundan yenilmez bir şampiyona, oradan babasının salonunu taşıyan bir hocaya. Söz verdin ve tuttun."),
  },
  kralice: {
    id: 'kralice',
    ad: 'Rhonda',
    soyad: 'Rousseau',
    lakap: () => 'Rowdy Rho',
    uyruk: 'us',
    memleket: () => L("Riverside, Kaliforniya"),
    bayrak: '🇺🇸',
    renk: '#ff4d8d',
    ozet: () => L("Judo olimpiyat madalyalı kol kilidi kraliçesi. UCC'nin ilk kadın şampiyonu ve kadın MMA'nın kapılarını açan isim."),
    etiketler: () => [L("İlk kadın şampiyon"), L("Kol kilidi"), L("Hollywood")],
    oynanabilir: true,
    ucretsiz: true,
    yas: 21,
    siklet: 'horoz',
    gecmis: 'judo',
    boy: 170,
    // Sarı at kuyruğu, mavi gözler
    gorunum: { ten: 0, sac: 'atkuyrugu', sacRenk: 5, goz: 3, sakal: 'yok', yara: false, dovme: false, kadin: true, yuz: 0, kas: 1, dudak: 2 },
    statMod: { gures: 5, yer: 5, iq: 2, vurus: -2 },
    para: 300,
    populerlik: 10,
    hoca: () => 'Edmond Tarvan',
    salon: () => 'Glendale Fight Club',
    bolumler: KRALICE,
    odulKozmetik: 'sort_kralice',
    final: () => L("Tatamideki küçük kızdan kadınların ilk UCC şampiyonuna. Sen kapıyı açtın; arkandan binlerce kadın geçti."),
  },
  orumcek: {
    id: 'orumcek',
    ad: 'Andre',
    soyad: 'Silvano',
    lakap: () => 'The Tarantula',
    uyruk: 'br',
    memleket: () => L("Curitiba"),
    bayrak: '🇧🇷',
    renk: '#00a859',
    ozet: () => L("Curitiba'nın yoksul sokaklarından kafesin en zarif nakavtçısına. Kollarını indirip rakiplerini davet eden adam."),
    etiketler: () => [L("Rekor saltanat"), L("Matrix"), L("40 yaşında kafeste")],
    oynanabilir: true,
    ucretsiz: true,
    yas: 22,
    siklet: 'orta',
    gecmis: 'muaythai',
    boy: 188,
    // Kel, keçi sakalı, uzun yüz
    gorunum: { ten: 4, sac: 'kel', sacRenk: 0, goz: 0, sakal: 'keci', yara: false, dovme: false, yuz: 3, kas: 1, burun: 1 },
    statMod: { vurus: 6, hiz: 4, iq: 4, gures: -4 },
    para: 200,
    populerlik: 6,
    hoca: () => 'Mestre Ramos',
    salon: () => 'Chuta Box Academy',
    bolumler: ORUMCEK,
    odulKozmetik: 'sort_orumcek',
    final: () => L("Duvar arkasından ders izleyen çocuktan kafesin en zarif sanatçısına. Ağını ördün; tarih o ağa takıldı."),
  },
  imparator: {
    id: 'imparator',
    ad: 'Fyodor',
    soyad: 'Yemelyanov',
    lakap: () => 'The Last Tsar',
    uyruk: 'ru',
    memleket: () => L("Stary Oskol"),
    bayrak: '🇷🇺',
    renk: '#9ad1ff',
    ozet: () => L("Hiç gülümsemeyen adam. Japonya'nın dev arenalarında on yıl yenilmeyen, UCC'yi reddeden son imparator."),
    etiketler: () => [L("On yıl yenilmez"), L("UCC'yi reddetti"), L("Son İmparator")],
    oynanabilir: true,
    ucretsiz: true,
    yas: 21,
    siklet: 'agir',
    gecmis: 'sambo',
    boy: 183,
    // Kısa açık kahve saç, sakalsız, yuvarlak yüz, mavi gözler
    gorunum: { ten: 0, sac: 'kisa', sacRenk: 2, goz: 3, sakal: 'yok', yara: false, dovme: false, yuz: 2, kas: 1, burun: 1 },
    statMod: { yer: 4, vurus: 4, cene: 3, kondisyon: 2, hiz: -3 },
    para: 150,
    populerlik: 4,
    hoca: () => 'Vladimir Voronov',
    salon: () => L("Kızıl Şeytan Spor Kulübü"),
    bolumler: IMPARATOR,
    odulKozmetik: 'sort_imparator',
    final: () => L("Demir şehrin sessiz çocuğundan tarihin en büyük ağır sıkletlerinden birine. Tahtı kimse elinden almadı; kendin indin."),
  },
};

export const LEGEND_IDS = Object.keys(LEGENDS) as LegendId[];

/** Hikâyenin adı: efsanenin tam adı. */
export const legendName = (d: LegendDef) => `${d.ad} ${d.soyad}`.trim() || d.lakap();

// ---------- Başlatma ----------

/** Efsanenin hazır dövüşçüsüyle yeni kariyer. İsimler oyuncu tarafından değiştirilebilir. */
export function createLegendGame(id: LegendId, isim?: { ad?: string; soyad?: string; lakap?: string }): GameState {
  const d = LEGENDS[id];
  const input: NewFighterInput = {
    ad: isim?.ad?.trim() || d.ad,
    soyad: isim?.soyad?.trim() || d.soyad,
    lakap: isim?.lakap?.trim() || d.lakap(),
    uyruk: d.uyruk,
    memleket: d.memleket(),
    yas: d.yas,
    siklet: d.siklet,
    gecmis: d.gecmis,
    hikaye: d.ozet(),
    gorunum: d.gorunum,
    boy: d.boy,
    kadin: d.gorunum.kadin,
  };
  const stats = rollStartingStats(input, false);
  Object.entries(d.statMod).forEach(([k, v]) => (stats[k as StatKey] = clamp(stats[k as StatKey] + (v ?? 0), 10, 72)));
  const s = createGame(input, stats);
  s.para = d.para;
  s.populerlik = d.populerlik;
  s.takipci = initialFollowers(d.populerlik);
  if (d.hoca) s.takim.antrenor = d.hoca();
  if (d.salon) s.takim.salon = d.salon();
  s.efsane = { id, bolum: 0, yildiz: {}, giris: 0 };
  s.haberler.unshift(L("📖 EFSANE YOLU: {0}. Bölüm 1 başlıyor.", [legendName(d)]));
  return s;
}

// ---------- İlerleme ----------

export const legendOf = (s: GameState) => (s.efsane ? LEGENDS[s.efsane.id] : null);
export const currentChapter = (s: GameState): Chapter | null => {
  const r = s.efsane;
  const d = legendOf(s);
  return r && d && r.bolum < d.bolumler.length ? d.bolumler[r.bolum] : null;
};
export const legendStars = (r: LegendRun) => Object.values(r.yildiz).reduce((a, x) => a + x.length, 0);
export const legendMaxStars = (id: LegendId) => LEGENDS[id].bolumler.length * 3;

function earn(r: LegendRun, ch: Chapter, i: number) {
  const list = (r.yildiz[ch.id] ??= []);
  if (!list.includes(i)) list.push(i);
}

function startChapter(s: GameState, r: LegendRun, ch: Chapter): string[] {
  r.giris = r.bolum;
  if (ch.sonra) r.bayrak = { ...r.bayrak, sonra: true };
  return ch.basla?.(s, r) ?? [];
}

/**
 * Bölüm kontrolü: dövüşten sonra (f ile), teklif kabulünde, boks maçından sonra ve maç sonrası akışta çağrılır.
 * Ek yıldızlar bölüm boyunca birikir; ana hedef tamamlanınca ödül verilir ve sonraki bölüm başlar.
 */
export function legendCheck(s: GameState, f: LegendFight | null = null): string[] {
  const r = s.efsane;
  const d = legendOf(s);
  if (!r || !d || r.bitti) return [];
  const lines: string[] = [];
  // Dövüş dışı güvenli an: bölümün ağır olayları (kemer alma, ceza, sakatlık) ve tarihî rakip
  if (!f) {
    const cur = currentChapter(s);
    if (cur?.sonra && r.bayrak?.sonra) {
      r.bayrak.sonra = false;
      lines.push(...cur.sonra(s, r));
    }
    legendRivals(s);
  }
  for (let guard = 0; guard < 3; guard++) {
    const ch = currentChapter(s);
    if (!ch) break;
    if (f) ch.say?.(s, f, r);
    ch.yildizlar.forEach((st, i) => {
      if (!st.sonda && st.kontrol(s, f, r)) earn(r, ch, i + 1);
    });
    const ok = ch.tamam(s, r);
    if (!ok && !ch.atla?.(s)) break;
    // Reddedilen boks maçı ya da atlanan bölüm: geçilir ama ana yıldız yok
    const odul = ok ? (ch.bitir?.(s, r) ?? []) : [];
    if (ok && !(ch.id === 'parabovusu' && r.boks === 'red')) {
      earn(r, ch, 0);
      // Bölüm sonu yıldızları ödülden sonra (ör. ortaklık satışı servete eklenmiş olsun)
      ch.yildizlar.forEach((st, i) => {
        if (st.sonda && st.kontrol(s, f, r)) earn(r, ch, i + 1);
      });
    }
    const n = r.yildiz[ch.id]?.length ?? 0;
    lines.push(L("📖 BÖLÜM TAMAM: {0} · {1}", [ch.baslik(), '★'.repeat(n) + '☆'.repeat(3 - n)]));
    lines.push(...odul);
    r.bolum++;
    f = null;
    const next = currentChapter(s);
    if (next) {
      lines.push(...startChapter(s, r, next));
    } else {
      r.bitti = true;
      r.giris = r.bolum;
      if (d.odulKozmetik) s.ozelKozmetik = [...new Set([...(s.ozelKozmetik ?? []), d.odulKozmetik])];
      s.unvanlar.push(L("Efsane Yolu: {0}", [legendName(d)]));
      addFollowers(s, followers(s) * 0.1);
      lines.push(L("🏛️ EFSANE YOLU TAMAMLANDI: {0}! Toplam {1}/{2} yıldız.", [legendName(d), legendStars(r), legendMaxStars(d.id)]));
      break;
    }
  }
  lines.forEach((l) => s.haberler.unshift(l));
  return lines;
}

/** Bölüm UCC'yi kapalı tutuyorsa (önce kemer) Challenger Series daveti gelmez. */
export function legendHoldsUcc(s: GameState) {
  return !!currentChapter(s)?.uccKapali;
}

/** Senaryolu UCC kapısı: bölüm gelince (bir galibiyetten sonra) Challenger Series beklenmeden teklif gelir. */
export function legendOffer(s: GameState, won: boolean): string | null {
  const ch = currentChapter(s);
  if (!ch?.uccKapi || !won || s.stage === 'ufc' || s.stage === 'amator') return null;
  const r = s.efsane!;
  if (r.bayrak?.uccBekle) {
    r.bayrak.uccBekle = false;
    return null;
  }
  return L("📞 Telefon çaldı: UCC. \"Seni izledik. Challenger Series'e gerek yok, doğrudan kadroya geliyorsun.\"");
}

/**
 * Bölümün tarihî rakibini sıklete yerleştirir: şampiyon ya da 1 numaralı aday olarak. Sıklet değişince
 * (changeWeight) ve maç sonrası akışta çağrılır; aynı bölümde bir kez.
 */
export function legendRivals(s: GameState) {
  const r = s.efsane;
  const ch = currentChapter(s);
  const rk = ch?.rakip;
  if (!r || !ch || !rk || s.fighter.siklet !== rk.siklet) return;
  if (rk.disari ? s.stage === 'ufc' || s.stage === 'amator' : s.stage !== 'ufc') return;
  const key = `rk_${ch.id}`;
  if (r.bayrak?.[key]) return;
  ensureDivision(s);
  const b = s.bolum;
  if (!b) return;
  const target: Opponent | undefined = rk.sampiyon && b.sampiyon ? b.sampiyon : b.liste[0];
  if (!target) return;
  const kim = (o: Opponent) => ({ ad: o.ad, soyad: o.soyad, lakap: o.lakap, uyruk: o.uyruk, stil: o.stil });
  const var_ = [b.sampiyon, ...b.liste].find((o) => o?.soyad === rk.soyad);
  if (var_ && var_ !== target) Object.assign(var_, kim(target));
  if (var_ !== target) Object.assign(target, { ad: rk.ad, soyad: rk.soyad, lakap: rk.lakap, uyruk: rk.uyruk(), stil: rk.stil });
  // Rakip bir efsaneyse (ör. Khabir'in hikâyesinde Conor) onun görünümüyle çıkar
  const efsane = Object.values(LEGENDS).find((x) => x.ad === rk.ad && x.soyad === rk.soyad);
  if (efsane) target.gorunum = efsane.gorunum;
  r.bayrak = { ...r.bayrak, [key]: true };
}

/** Senaryolu boks maçının sonucu (crossover.ts). */
export function legendBoxResult(s: GameState, sonuc: 'G' | 'M' | 'red', yontem?: 'KO' | 'karar') {
  const r = s.efsane;
  if (!r || currentChapter(s)?.id !== 'parabovusu') return;
  r.boks = sonuc === 'M' && yontem === 'KO' ? 'KO' : sonuc;
  legendCheck(s);
}

export function dismissLegendIntro(s: GameState) {
  if (s.efsane) s.efsane.giris = undefined;
}

// ---------- Basın toplantısı ve hocanın notu ----------

/** Bölümün tarihî basın sorusu (pressConf.ts ilk soru olarak kullanır). */
export function legendPress(s: GameState): LegendPress | null {
  return currentChapter(s)?.basin?.() ?? null;
}

/** Tarihî söz tutturulup maç kazanılırsa: senaryoya uygun ek PPV/bilet geliri. */
export function legendPressPayout(s: GameState): string {
  const n = s.stage === 'ufc' ? 150_000 : s.stage === 'buyuk' ? 15_000 : 2_500;
  s.para += n;
  s.populerlik = clamp(s.populerlik + 2, 0, 100);
  return L("📜 Basın toplantısındaki tarihî sözün tuttu! Manşetler seni yazıyor: ek gelir {0}, popülerlik +2.", [$(n)]);
}

export const noteOpen = (s: GameState, ch: Chapter) => !!s.efsane?.bayrak?.[`not_${ch.id}`];

/** Hocanın notu (reklamla açılır): bölümün yıldızları için ayrıntılı taktik. */
export function openNote(s: GameState) {
  const ch = currentChapter(s);
  if (!s.efsane || !ch?.not) return;
  s.efsane.bayrak = { ...s.efsane.bayrak, [`not_${ch.id}`]: true };
}
