// Kafespedia: dövüşçünün kariyerinden otomatik yazılan ansiklopedi sayfası (bilgi kutusu, bölümler, dövüş kaydı).
// Ekranda ve paylaşım kartında aynı içerik kullanılır.
import { L, LOC } from '../i18n';
import { currentOrg } from './character';
import { BACKGROUNDS, COUNTRIES, ORGS, WEIGHT_CLASSES } from './data';
import { AWARD_NAMES } from './awards';
import { legacyScore, legacyTier } from './legacy';
import { nemesisScore } from './nemesis';
import type { FightHistory, GameState, OrgId } from './types';

export type WikiPage = {
  baslik: string;
  lakap: string;
  ozet: string;
  bilgi: [string, string][];
  bolumler: { baslik: string; metin: string }[];
  /** Şampiyonluklar ve başarılar: alt başlık ve madde listesi */
  basarilar: { baslik: string; maddeler: string[] }[];
  kayit: FightHistory[];
};

/** Oyunun başladığı yıl; hanedanın her nesli ~25 yıl sonra. */
const START_YEAR = 2026;

const rec = (h: FightHistory[]) => {
  const g = h.filter((x) => x.sonuc === 'G').length;
  const m = h.filter((x) => x.sonuc === 'M').length;
  const b = h.filter((x) => x.sonuc === 'B').length;
  return `${g}-${m}-${b}`;
};
const finishes = (h: FightHistory[]) => h.filter((x) => x.sonuc === 'G' && ['KO', 'TKO', 'SUB'].includes(x.yontem)).length;

export function wikiOf(s: GameState): WikiPage {
  const f = s.fighter;
  const ad = `${f.ad} ${f.soyad}`;
  const ulke = COUNTRIES[f.uyruk]?.ad ?? f.uyruk;
  const dogum = START_YEAR + ((s.nesil ?? 1) - 1) * 25 - f.baslangicYasi;
  const emekli = s.phase === 'emeklilik';
  const pro = [...s.gecmis].filter((h) => h.org !== 'amator').reverse();
  const r = s.rekor;
  const org = currentOrg(s);
  const kemerler = s.kemerler ?? [];

  // Giriş
  const ozet = [
    L("{0} (d. {1}, {2}), {3} kökenli profesyonel karma dövüş sanatları (MMA) dövüşçüsü.", [ad, dogum, f.memleket || ulke, ulke]),
    emekli
      ? L("{0} yaşında emekliye ayrıldı.", [f.yas])
      : s.stage === 'amator'
        ? L("Halen amatör seviyede, {0} sıklette mücadele ediyor.", [WEIGHT_CLASSES[f.siklet].ad])
        : org === 'amator'
          ? L("Şu an serbest oyuncu; yeni bir organizasyonla anlaşma arıyor.")
          : org === 'dwcs'
          ? L("Halen UCC kontratı için Dean Wyatt's Challenger Series sahnesinde.")
          : L("Halen {0} bünyesinde {1} sıklette mücadele ediyor.", [ORGS[org].ad, WEIGHT_CLASSES[f.siklet].ad]),
    s.stage !== 'amator' || pro.length
      ? L("Profesyonel rekoru: {0} galibiyet, {1} mağlubiyet, {2} beraberlik ({3} nakavt, {4} submission).", [r.g, r.m, r.b, r.ko, r.sub])
      : '',
    kemerler.length ? L("Kariyerinde {0} şampiyonluk kemeri kazandı.", [kemerler.length]) : '',
    s.hof ? L("Onur Listesi (Hall of Fame) üyesi.") : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Bilgi kutusu
  const bilgi: [string, string][] = [
    [L("Doğum"), `${dogum} · ${f.memleket || ulke}`],
    [L("Uyruk"), ulke],
    [L("Sıklet"), WEIGHT_CLASSES[f.siklet].ad],
    ...(f.boy ? ([[L("Boy"), `${f.boy} cm`]] as [string, string][]) : []),
    [L("Branş"), BACKGROUNDS[f.gecmis].ad],
    [L("Takım"), s.takim.salon],
    [L("Antrenör"), s.takim.antrenor],
    [L("Profesyonel rekor"), `${r.g}-${r.m}-${r.b}`],
    [L("Nakavt ile"), String(r.ko)],
    [L("Submission ile"), String(r.sub)],
    [L("Amatör rekor"), `${s.amator.g}-${s.amator.m}-${s.amator.b}`],
    ...(!emekli && s.stage !== 'amator' ? ([[L("Organizasyon"), org === 'amator' ? L("Serbest oyuncu") : ORGS[org].ad]] as [string, string][]) : []),
    ...(kemerler.length ? ([[L("Unvanlar"), String(kemerler.length)]] as [string, string][]) : []),
    ...((s.oduller ?? []).length ? ([[L("Yıl sonu ödülleri"), String((s.oduller ?? []).length)]] as [string, string][]) : []),
    [L("Durum"), emekli ? L("Emekli") : L("Aktif")],
  ];

  const bolumler: { baslik: string; metin: string }[] = [];
  if (f.hikaye?.trim()) bolumler.push({ baslik: L("Erken yaşamı"), metin: f.hikaye.trim() });

  const am = s.amator;
  bolumler.push({
    baslik: L("Amatör kariyeri"),
    metin:
      s.stage === 'amator' && !emekli
        ? L("Dövüş kariyerine {0} salonunda başladı. Amatör rekoru şu an {1}-{2}-{3}.", [s.takim.salon, am.g, am.m, am.b])
        : L("Amatör kariyerini {0}-{1}-{2} rekorla tamamlayıp profesyonelliğe geçti.", [am.g, am.m, am.b]),
  });

  if (pro.length) {
    // Organizasyonlara göre dönemler (kronolojik); DWCS'nin tek maçlık davetleri ayrı özetlenir.
    const donem: { org: OrgId; h: FightHistory[] }[] = [];
    for (const h of pro.filter((x) => x.org !== 'dwcs')) {
      const last = donem[donem.length - 1];
      if (last && last.org === h.org) last.h.push(h);
      else donem.push({ org: h.org, h: [h] });
    }
    const yas = (h: FightHistory[]) => (h[0].yas === h[h.length - 1].yas ? String(h[0].yas) : `${h[0].yas}–${h[h.length - 1].yas}`);
    const satirlar = donem.map((d) => L("{0} ({1} yaş): {2} rekor, {3} bitiriş.", [ORGS[d.org]?.ad ?? d.org, yas(d.h), rec(d.h), finishes(d.h)]));
    const dw = pro.filter((x) => x.org === 'dwcs');
    if (dw.length) satirlar.push(L("Dean Wyatt's Challenger Series: {0} davet, {1} rekor.", [dw.length, rec(dw)]));
    const unvan = kemerler.map((b) =>
      b.savunma
        ? L("{0} yaşında {1} {2} sıklet şampiyonu oldu ve kemeri {3} kez savundu.", [b.yas, ORGS[b.org].kisa, WEIGHT_CLASSES[b.siklet].ad, b.savunma])
        : L("{0} yaşında {1} {2} sıklet şampiyonu oldu.", [b.yas, ORGS[b.org].kisa, WEIGHT_CLASSES[b.siklet].ad]),
    );
    bolumler.push({ baslik: L("Profesyonel kariyeri"), metin: [...satirlar, ...unvan].join('\n') });
  }

  const n = s.ezeli;
  if (n && n.g + n.m + n.b > 0) {
    const son = n.bitti ? (n.m > n.g ? L("Rekabeti üstün tamamladı.") : L("Rakibi seriyi önde bitirdi.")) : L("Rekabet hâlâ sürüyor.");
    bolumler.push({
      baslik: L("Rekabetler"),
      metin: L("En bilinen rekabeti {0} “{1}” {2} ile yaşadı; aralarındaki seri {3}. {4}", [n.ad, n.lakap, n.soyad, nemesisScore(n), son]),
    });
  }

  const aile: string[] = [];
  const eb = (s.hanedan ?? [])[(s.hanedan ?? []).length - 1];
  if (eb) aile.push(L("Dövüşçü bir ailenin {0}. kuşağı. Ebeveyni {1} {2} de profesyonel dövüşçüydü ({3}-{4}-{5}, {6} kemer).", [s.nesil ?? 2, eb.ad, eb.soyad, eb.rekor.g, eb.rekor.m, eb.rekor.b, eb.kemer]));
  aile.push(L("{0} salonunda {1} ile çalışıyor.", [s.takim.salon, s.takim.antrenor]));
  bolumler.push({ baslik: L("Kişisel yaşamı"), metin: aile.join(' ') });

  const skor = legacyScore(s);
  bolumler.push({
    baslik: L("Mirası"),
    metin: L("Uzmanlar onu “{0}” olarak değerlendiriyor. Efsane puanı {1}; {2} başarım kazandı.", [legacyTier(skor).ad.toLocaleLowerCase(LOC), skor, (s.basarimlar ?? []).length]),
  });

  // Şampiyonluklar ve başarılar
  const basarilar: { baslik: string; maddeler: string[] }[] = [];
  const kemerAdi = (b: (typeof kemerler)[number]) => L("{0} {1} Sıklet Şampiyonu", [ORGS[b.org].ad, WEIGHT_CLASSES[b.siklet].ad]);
  if (kemerler.length) {
    basarilar.push({
      baslik: L("Şampiyonluk kemerleri"),
      maddeler: kemerler.map((b) =>
        [kemerAdi(b), L("{0} yaşında", [b.yas]), b.savunma ? L("{0} savunma", [b.savunma]) : '', b.aktif ? L("halen elinde") : ''].filter(Boolean).join(' · '),
      ),
    });
  }
  // Kemer ünvanları yukarıda; buraya yalnızca Grand Prix ve crossover zaferleri (her dilde bu kelimeler geçer)
  const turnuva = (s.unvanlar ?? []).filter((u) => /grand prix|гран-при|crossover|кроссовер/i.test(u));
  if (s.kafesEvi?.sonuc === 'sampiyon') turnuva.unshift(L("Kafes Evi realite şovu şampiyonu"));
  if (turnuva.length) basarilar.push({ baslik: L("Turnuvalar ve özel zaferler"), maddeler: turnuva });
  const od = s.oduller ?? [];
  if (od.length) {
    basarilar.push({
      baslik: L("Yıl sonu ödülleri"),
      maddeler: od.map((o) => `${AWARD_NAMES[o.kat]()} · ${o.yil != null ? L("{0}. yıl", [o.yil]) : L("{0} yaş", [o.yas])}${o.not ? ` (${o.not})` : ''}`),
    });
  }

  return { baslik: ad, lakap: f.lakap, ozet, bilgi, bolumler, basarilar, kayit: s.gecmis.filter((h) => h.org !== 'amator').slice(0, 15) };
}
