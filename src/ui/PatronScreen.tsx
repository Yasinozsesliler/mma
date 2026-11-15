// Patron Modu ekranı: ofis (haftalık rapor ve kararlar), kart planlayıcı, kadro ve serbest piyasa, Kafesgram, şirket.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { track } from '../analytics';
import { sfx } from '../audio';
import { WEIGHT_CLASSES } from '../engine/data';
import type { Kisilik, MFighter, MKayit } from '../engine/manager';
import {
  addBout,
  adRefreshMarket,
  adReplay,
  adScoutReport,
  advanceWeek,
  answer,
  bekleyen,
  bKey,
  BILET,
  bolumAd,
  bookIssue,
  boutDraw,
  boutNote,
  busy,
  canAdMarket,
  canAdReplay,
  canAdvance,
  canRun,
  cityById,
  closeOrg,
  createPatron,
  divisionOf,
  ensurePlan,
  eventName,
  fighterById,
  haftaOfYil,
  HOME_CITIES,
  ISTEK,
  itibarCap,
  KADRO_MAX,
  makeMain,
  markRead,
  MEKAN,
  MEKANLAR,
  MIN_HAZIRLIK,
  money,
  okunmamis,
  openDivision,
  ORG_RENKLER,
  orgAdi,
  orgRanking,
  P_KISILIK,
  P_SENARYO,
  P_TRIAL_NIGHTS,
  pFullName,
  pLook,
  potVisible,
  projectNight,
  replayPay,
  pRekor,
  rankOf,
  ranking,
  releaseFighter,
  removeBout,
  setDate,
  signCandidate,
  signChance,
  SPONSOR_SART,
  TANITIM,
  TANITIMLAR,
  TEKLIF,
  TESIS,
  TESISLER,
  toggleTanitim,
  trialOver,
  unvanOf,
  upgradeTesis,
  YAYIN,
  yilOf,
  DIV_COST,
  type BiletId,
  type GeceRapor,
  type Mac,
  type PatronRun,
  type PAday,
  type PFighter,
  type PKayit,
  type PKisilik,
  type PMesaj,
  type PRol,
  type PSenaryo,
  type TeklifTip,
} from '../engine/patron';
import { CITIES } from '../engine/worldMap';
import type { WeightClass } from '../engine/types';
import { L, LOC } from '../i18n';
import { buyErrorText, buy, maybeStartTrialDeal, PURCHASES, restorePurchases, useDeal, useOwned, usePrice } from '../monetization';
import { DEAL_SKU, PATRON_SKU, ULTIMATE_SKU } from '../monetization/skus';
import { actPatron, archivePatron, setNightReport, setPatron, useNightReport, usePatron, usePatronHall } from '../patronStore';
import { Bar, Button, CageBg, Card, Choice, Icon, Screen, SLANT, type IconName } from './components';
import { AdOffer } from './AdOffer';
import { OrgLogo } from './OrgLogo';
import { FighterAvatar } from './FighterAvatar';
import { HubNav, type NavItem } from './HubNav';
import { FaceOffModal, MgrWatch } from './ManagerViews';
import { PatronGram } from './PatronGram';
import { DealCard, FullPackLink } from './ShopSheet';
import { C, F, R } from './theme';

const $ = money;
const fmtK = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `${Math.round(n / 1000)}B` : n.toLocaleString(LOC));

export function usePatronUnlocked() {
  const owned = useOwned();
  return !PURCHASES || owned.has(PATRON_SKU) || owned.has(ULTIMATE_SKU);
}

// ---------- Ortak parçalar ----------

const KMAP: Record<PKisilik, Kisilik> = { yildiz: 'medya', kavgaci: 'hirsli', sessiz: 'sadik', paragoz: 'paragoz', sadik: 'sadik' };
/** Menajer Modu'nun izleme ve face-off sahnelerine uyarlama */
const toMF = (f: PFighter, hafta: number) => ({ ...f, kisilik: KMAP[f.kisilik], mac: { hafta }, tier: 'amator', sira: 1, guven: 50, kom: 0, kazanc: 0 }) as unknown as MFighter;
const toRk = (k: PKayit['rk']) => ({ ad: k.ad, ulke: k.ulke, stil: k.stil, guc: k.guc, rekor: k.rekor, look: pLook({ id: k.id, ulke: k.ulke, kadin: k.kadin }) });
const toMK = (k: PKayit): MKayit => ({ id: k.id, h: k.h, org: 'cfc', rk: toRk(k.rk), w: k.w, y: k.y, kod: k.kod, ra: k.ra, top: k.top, unvan: k.unvan, guc: 0, kom: 0, satir: [] });
const rkOfF = (f: PFighter) => toRk({ id: f.id, ad: pFullName(f), ulke: f.ulke, stil: f.stil, rekor: pRekor(f), kadin: f.kadin, guc: f.guc });

function Watch({ r, f, k, onClose }: { r: PatronRun; f: PFighter; k: PKayit; onClose: () => void }) {
  const mf = useMemo(() => toMF(f, k.h), [f, k.h]);
  const mk = useMemo(() => toMK(k), [k]);
  const mekan = r.geceler.find((g) => g.no === k.gece)?.mekan ?? 'salon';
  return <MgrWatch f={mf} m={mk} orgAd={r.org.ad} arena={{ tier: MEKANLAR.indexOf(mekan) as 0 | 1 | 2 | 3, logo: r.org.kisa, renk: r.org.renk }} onClose={onClose} />;
}

function Meter({ label, value, color = C.text, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <View style={ps.meter}>
      <Text style={ps.meterLabel}>{label}</Text>
      <Text style={[ps.meterVal, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? <Text style={ps.meterSub}>{sub}</Text> : null}
    </View>
  );
}

function Chip({ label, on, onPress, disabled, color = C.red, icon }: { label: string; on?: boolean; onPress: () => void; disabled?: boolean; color?: string; icon?: IconName }) {
  return (
    <Pressable
      onPress={() => {
        sfx('click');
        onPress();
      }}
      disabled={disabled}
      style={({ pressed }) => [ps.chip, on && { backgroundColor: color, borderColor: color }, disabled && { opacity: 0.35 }, pressed && { opacity: 0.8 }]}
    >
      {icon ? <Icon name={icon} size={13} color={on ? '#fff' : C.dim} /> : null}
      <Text style={[ps.chipText, on && { color: color === C.gold ? '#1f1605' : '#fff' }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const rankLabel = (x: number | 'C' | null) => (x === 'C' ? '👑' : x == null ? '–' : `#${x}`);
const moodIcon = (m: number) => (m >= 70 ? '😀' : m >= 45 ? '🙂' : m >= 25 ? '😐' : '😠');

function FighterRow({ r, f, onPress, right }: { r: PatronRun; f: PFighter; onPress?: () => void; right?: React.ReactNode }) {
  const rk = rankOf(r, f);
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [ps.fRow, pressed && { backgroundColor: C.cardAlt }]}>
      <Text style={[ps.fRank, rk === 'C' && { color: C.gold }]}>{rankLabel(rk)}</Text>
      <FighterAvatar look={pLook(f)} size={38} ring={f.sampiyon ? C.gold : C.border} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={ps.fName} numberOfLines={1}>
          {pFullName(f)} {f.sakat > 0 ? '🤕' : ''}
          {f.akademi ? ' 🎓' : ''}
        </Text>
        <Text style={ps.fSub} numberOfLines={1}>
          {pRekor(f)} · {L("güç {0}", [f.guc])} · ⭐{f.un} · {moodIcon(f.mutlu)} · {L("{0} maç", [f.kalan])}
        </Text>
      </View>
      {right}
    </Pressable>
  );
}

// ---------- Ekran ----------

export function PatronScreen({ onExit }: { onExit: () => void }) {
  const r = usePatron();
  const unlocked = usePatronUnlocked();
  useEffect(() => {
    if (r?.deneme && unlocked) actPatron((x) => (x.deneme = false));
  }, [r?.deneme, unlocked]);
  if (!r) return <PStart unlocked={unlocked} onExit={onExit} />;
  if (r.kapandi) return <PClosed r={r} onExit={onExit} />;
  return <PHub r={r} onExit={onExit} />;
}

function PatronPack({ lead, over }: { lead?: string; over?: boolean }) {
  const price = usePrice(PATRON_SKU);
  const dealReady = !!usePrice(DEAL_SKU);
  const deal = useDeal();
  useEffect(() => {
    if (over) maybeStartTrialDeal(dealReady, 'patron');
  }, [over, dealReady]);
  const [busy_, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  if (!PURCHASES) return null;
  return (
    <LinearGradient colors={['#1d1206', '#08090b']} style={ps.pack}>
      {lead ? <Text style={ps.packLead}>{lead}</Text> : null}
      {deal ? <DealCard deal={deal} compact /> : null}
      <Text style={ps.packText}>{L("Tek seferlik alım: sınırsız gece, bütün sıkletler, stadyumlar, PPV anlaşmaları ve UCC'yi geçme yolculuğu.")}</Text>
      <Button
        label={price ? L("Patron Modu · {0}", [price]) : L("Patron Modu'nu al")}
        icon="crown"
        tone="gold"
        disabled={busy_}
        onPress={async () => {
          setBusy(true);
          setMsg('');
          const res = await buy(PATRON_SKU);
          setBusy(false);
          if (res === 'ok') sfx('fanfare');
          else if (res === 'hata') setMsg(buyErrorText());
        }}
      />
      <Pressable onPress={async () => setMsg((await restorePurchases()) ? L("Satın alımların geri yüklendi.") : L("Bu hesapta satın alma bulunamadı."))} hitSlop={8} style={{ alignSelf: 'center', marginTop: 8 }}>
        <Text style={ps.link}>{L("Satın alımları geri yükle")}</Text>
      </Pressable>
      <FullPackLink kaynak="patron_kilit" />
      {msg ? <Text style={ps.packText}>{msg}</Text> : null}
    </LinearGradient>
  );
}

// ---------- Başlangıç ----------

function PStart({ unlocked, onExit }: { unlocked: boolean; onExit: () => void }) {
  const [ad, setAd] = useState('');
  const [orgAd, setOrgAd] = useState('');
  const [kisa, setKisa] = useState('');
  const [renk, setRenk] = useState(ORG_RENKLER[0]);
  const [sehir, setSehir] = useState(HOME_CITIES[0] ?? 'istanbul');
  const [sen, setSen] = useState<PSenaryo>('garaj');
  const hall = usePatronHall();
  const preview = { org: { ad: orgAd || L("Yeni Organizasyon"), kisa: (kisa || orgAd.slice(0, 4) || 'YO').toLocaleUpperCase(LOC), renk } };
  return (
    <Screen
      footer={
        <View style={{ gap: 8 }}>
          <Button
            label={unlocked ? L("Organizasyonu kur") : L("Ücretsiz dene ({0} gece)", [P_TRIAL_NIGHTS])}
            icon="crown"
            tone="gold"
            onPress={() => {
              track('patron_start', { deneme: unlocked ? 0 : 1, senaryo: sen });
              setPatron(createPatron({ ad, orgAd, kisa, renk, sehir, senaryo: sen, deneme: !unlocked }));
            }}
          />
          <Button label={L("Menüye dön")} icon="arrow-left" tone="ghost" onPress={onExit} />
        </View>
      }
    >
      <LinearGradient colors={['#2a1a05', '#0e0f12', '#08090b']} style={ps.hero}>
        <CageBg opacity={0.05} />
        <OrgLogo r={preview} size={72} />
        <Text style={[ps.heroTitle, SLANT]}>{L("PATRON MODU")}</Text>
        <Text style={ps.heroText}>{L("Kafes senin, kurallar senin. Sıfırdan bir organizasyon kur ve UCC'yi tahtından indir.")}</Text>
      </LinearGradient>
      <View style={{ gap: 10, marginVertical: 14 }}>
        {(
          [
            ['sword-cross', L("Kartı sen kur: kim kiminle dövüşecek? Doğru eşleşme bilet sattırır, yanlışı dövüşçüyü küstürür.")],
            ['fire', L("Rakiplik ateşini yak: basın toplantıları, face-off'lar, sosyal medya kavgaları.")],
            ['crown', L("Kendi kemerlerin, kendi sıralamaların. Şampiyonlar, unvan savunmaları, rövanşlar.")],
            ['television-classic', L("Depo salonundan stadyuma, yerel kanaldan PPV'ye. Her gecenin kasası senin.")],
            ['account-tie', L("Rakip organizasyonlar yıldızlarını kapmaya çalışır. Sen de onlarınkini.")],
            ['instagram', L("Organizasyonun Kafesgram hesabını yönet: afişler, şampiyon fotoğrafları, dövüşçü atışmaları.")],
          ] as [IconName, string][]
        ).map(([icon, t]) => (
          <View key={icon} style={ps.bullet}>
            <Icon name={icon} size={18} color={C.gold} />
            <Text style={ps.bulletText}>{t}</Text>
          </View>
        ))}
      </View>
      <Card>
        <Text style={ps.label}>{L("PATRONUN ADI")}</Text>
        <TextInput value={ad} onChangeText={setAd} placeholder={L("Adın")} placeholderTextColor={C.faint} style={ps.input} maxLength={24} />
        <Text style={[ps.label, { marginTop: 12 }]}>{L("ORGANİZASYONUN ADI")}</Text>
        <TextInput value={orgAd} onChangeText={setOrgAd} placeholder={L("Örn. Anadolu Dövüş Ligi")} placeholderTextColor={C.faint} style={ps.input} maxLength={28} />
        <Text style={[ps.label, { marginTop: 12 }]}>{L("KISA AD")}</Text>
        <TextInput value={kisa} onChangeText={(t) => setKisa(t.replace(/\s/g, '').slice(0, 6))} placeholder="ADL" placeholderTextColor={C.faint} style={ps.input} maxLength={6} autoCapitalize="characters" />
        <Text style={[ps.label, { marginTop: 12 }]}>{L("RENK")}</Text>
        <View style={ps.wrap}>
          {ORG_RENKLER.map((c) => (
            <Pressable key={c} onPress={() => setRenk(c)} style={[ps.swatch, { backgroundColor: c }, renk === c && { borderColor: '#fff' }]} />
          ))}
        </View>
        <Text style={[ps.label, { marginTop: 12 }]}>{L("MERKEZ ŞEHİR")}</Text>
        <View style={ps.wrap}>
          {HOME_CITIES.map((id) => (
            <Chip key={id} label={cityById(id).ad} on={sehir === id} onPress={() => setSehir(id)} />
          ))}
        </View>
      </Card>
      <Text style={ps.section}>{L("BAŞLANGIÇ")}</Text>
      {(Object.keys(P_SENARYO) as PSenaryo[]).map((k) => (
        <Choice key={k} icon={P_SENARYO[k].ikon as IconName} tone="gold" selected={sen === k} label={`${P_SENARYO[k].ad()} · ${P_SENARYO[k].zorluk()}`} desc={P_SENARYO[k].aciklama()} onPress={() => setSen(k)} />
      ))}
      {!unlocked ? <PatronPack lead={L("İlk {0} gece ücretsiz.", [P_TRIAL_NIGHTS])} /> : null}
      {hall.length ? (
        <Card>
          <Text style={ps.kicker}>{L("TARİHE KARIŞAN ORGANİZASYONLAR")}</Text>
          {hall.slice(0, 6).map((h, i) => (
            <Text key={i} style={ps.small}>
              {L("{0} ({1}) · {2} gece · {3} kemer maçı · itibar {4}", [h.org, h.ad, h.gece, h.unvan, h.itibar])}
              {h.son === 'satis' && h.satis ? ` · ${L("UCC'ye satıldı: {0}", [$(h.satis)])}` : ''}
            </Text>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

// ---------- Kapanış ----------

function PClosed({ r, onExit }: { r: PatronRun; onExit: () => void }) {
  const t =
    r.kapandi === 'satis'
      ? L("{0}, UCC'ye {1} karşılığında satıldı. Bodrum katından dünyanın zirvesine: efsane bir hikâye.", [r.org.ad, $(r.satis ?? 0)])
      : r.kapandi === 'iflas'
        ? L("Kasa altı hafta boyunca ekside kaldı. {0} iflas etti.", [r.org.ad])
        : r.kapandi === 'kovuldu'
          ? L("Yönetim kurulu iki yıl üst üste hedef tutmadığı için seni görevden aldı.")
          : L("{0} kapılarını kapattı.", [r.org.ad]);
  return (
    <Screen
      footer={
        <View style={{ gap: 8 }}>
          <Button label={L("Yeni organizasyon")} icon="restart" tone="gold" onPress={archivePatron} />
          <Button
            label={L("Menüye dön")}
            icon="arrow-left"
            tone="ghost"
            onPress={() => {
              archivePatron();
              onExit();
            }}
          />
        </View>
      }
    >
      <LinearGradient colors={r.kapandi === 'satis' ? ['#2a1a05', '#08090b'] : ['#2a0a0f', '#08090b']} style={ps.hero}>
        <OrgLogo r={r} size={80} />
        <Text style={[ps.heroTitle, SLANT]}>{r.kapandi === 'satis' ? L("EFSANE ÇIKIŞ") : L("PERDE İNDİ")}</Text>
        <Text style={ps.heroText}>{t}</Text>
      </LinearGradient>
      <Card>
        <Text style={ps.small}>{L("{0} hafta · {1} gece · {2} seyirci", [r.hafta, r.toplam.gece, r.toplam.seyirci.toLocaleString(LOC)])}</Text>
        <Text style={ps.small}>{L("{0} kemer maçı · toplam kâr {1} · son itibar {2}", [r.toplam.unvan, $(r.toplam.kar), r.itibar])}</Text>
      </Card>
    </Screen>
  );
}

// ---------- Merkez ----------

type Tab = 'ofis' | 'kart' | 'kadro' | 'gram' | 'sirket';

function PHub({ r, onExit }: { r: PatronRun; onExit: () => void }) {
  const [tab, setTab] = useState<Tab>('ofis');
  const wait = bekleyen(r).length;
  const nav: NavItem<Tab>[] = [
    { key: 'ofis', label: L("Ofis"), icon: 'office-building', badge: wait ? '!' : okunmamis(r) || null },
    { key: 'kart', label: L("Kart"), icon: 'cards' },
    { key: 'kadro', label: L("Kadro"), icon: 'account-group' },
    { key: 'gram', label: 'Kafesgram', icon: 'instagram', badge: r.gram.dm.filter((d) => !d.okundu).length || null },
    { key: 'sirket', label: L("Şirket"), icon: 'briefcase' },
  ];
  return (
    <Screen key={tab} footer={<HubNav items={nav} value={tab} onChange={setTab} />}>
      {tab !== 'gram' ? <Hero r={r} goOffice={() => setTab('ofis')} goCard={() => setTab('kart')} /> : null}
      {tab === 'ofis' ? <OfficeTab r={r} goCard={() => setTab('kart')} /> : null}
      {tab === 'kart' ? <CardTab r={r} /> : null}
      {tab === 'kadro' ? <SquadTab r={r} /> : null}
      {tab === 'gram' ? <PatronGram r={r} /> : null}
      {tab === 'sirket' ? <CompanyTab r={r} onExit={onExit} /> : null}
      <NightModal r={r} />
    </Screen>
  );
}

function Hero({ r, goOffice, goCard }: { r: PatronRun; goOffice: () => void; goCard: () => void }) {
  const over = trialOver(r);
  const p = r.plan;
  const geceHaftasi = p && p.hafta <= r.hafta;
  const cap = itibarCap(r);
  const wait = bekleyen(r).length;
  return (
    <LinearGradient colors={[r.org.renk + '33', '#0e0f12', '#08090b']} locations={[0, 0.5, 1]} style={ps.heroCard}>
      <CageBg opacity={0.04} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <OrgLogo r={r} size={56} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={ps.nick}>{unvanOf(r).toLocaleUpperCase(LOC)}</Text>
          <Text style={[ps.name, SLANT]} numberOfLines={1} adjustsFontSizeToFit>
            {r.org.ad.toLocaleUpperCase(LOC)}
          </Text>
          <Text style={ps.heroSub}>{L("{0} · {1}. yıl, {2}. hafta", [r.ad, yilOf(r), haftaOfYil(r)])}</Text>
        </View>
      </View>
      <View style={ps.meters}>
        <Meter label={L("KASA")} value={$(r.para)} color={r.para < 0 ? C.red : C.green} />
        <Meter label={L("İTİBAR")} value={String(r.itibar)} color={C.gold} sub={L("tavan {0}", [cap])} />
        <Meter label={L("TAKİPÇİ")} value={fmtK(r.gram.takipci)} />
      </View>
      {p?.maclar.length ? (
        <Pressable onPress={goCard} style={({ pressed }) => [ps.banner, pressed && { opacity: 0.8 }]}>
          <Icon name="calendar-star" size={16} color={C.gold} />
          <Text style={ps.bannerText} numberOfLines={2}>
            {geceHaftasi ? L("BU HAFTA: {0} · {1}", [eventName(r, p), cityById(p.sehir).ad]) : L("{0} · {1} hafta sonra · {2}", [eventName(r, p), p.hafta - r.hafta, cityById(p.sehir).ad])}
          </Text>
          <Icon name="chevron-right" size={16} color={C.gold} />
        </Pressable>
      ) : (
        <Pressable onPress={goCard} style={({ pressed }) => [ps.banner, { borderColor: C.red }, pressed && { opacity: 0.8 }]}>
          <Icon name="alert-circle-outline" size={16} color={C.red} />
          <Text style={ps.bannerText}>{L("Planlanmış gece yok. Kart sekmesinden bir gece kur.")}</Text>
          <Icon name="chevron-right" size={16} color={C.red} />
        </Pressable>
      )}
      {r.kayipHafta > 0 ? <Text style={[ps.small, { color: C.red, marginTop: 6 }]}>{L("⚠️ Kasa ekside: {0}/6 hafta. Düzelmezse iflas.", [r.kayipHafta])}</Text> : null}
      {over ? (
        <PatronPack lead={L("Deneme bitti: {0} gece yaptın. Organizasyonun seni bekliyor.", [P_TRIAL_NIGHTS])} over />
      ) : (
        <View style={{ marginTop: 10 }}>
          <Button
            label={geceHaftasi && p?.maclar.length ? L("Geceyi başlat") : L("Haftayı bitir")}
            icon={geceHaftasi ? 'boxing-glove' : 'calendar-arrow-right'}
            tone="gold"
            onPress={() => {
              sfx(geceHaftasi ? 'bell' : 'click');
              const g = actPatron(advanceWeek);
              if (g) {
                track('patron_night', { no: g.no, seyirci: g.seyirci });
                setNightReport(g);
              } else goOffice();
            }}
            disabled={!canAdvance(r)}
          />
          {wait ? (
            <Pressable onPress={goOffice} hitSlop={6} style={{ alignSelf: 'center', marginTop: 6 }}>
              <Text style={ps.waitHint}>{L("📨 {0} karar seni bekliyor (cevaplamazsan kendiliğinden kapanır)", [wait])}</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </LinearGradient>
  );
}

// ---------- Gece raporu ----------

function NightModal({ r }: { r: PatronRun }) {
  const g = useNightReport();
  if (!g) return null;
  return <NightReport r={r} g={g} onClose={() => setNightReport(null)} />;
}

function NightReport({ r, g, onClose }: { r: PatronRun; g: GeceRapor; onClose: () => void }) {
  const [watch, setWatch] = useState<{ f: PFighter; k: PKayit } | null>(null);
  const gelir = Object.values(g.gelir).reduce((s, x) => s + x, 0);
  const gider = Object.values(g.gider).reduce((s, x) => s + x, 0);
  const rows: [string, number][] = (
    [
      [L("Bilet"), g.gelir.bilet],
      [L("Yayın"), g.gelir.tv],
      ['PPV', g.gelir.ppv],
      [L("Sponsor"), g.gelir.sponsor],
      [L("Ürün satışı"), g.gelir.merch],
      [L("Şehir teşviki"), g.gelir.tesvik],
      [L("Mekân"), -g.gider.mekan],
      [L("Dövüşçü ücretleri"), -g.gider.ucret],
      [L("Bonuslar"), -g.gider.bonus],
      [L("Tanıtım"), -g.gider.tanitim],
      [L("Prodüksiyon"), -g.gider.produksiyon],
    ] as [string, number][]
  ).filter(([, v]) => v !== 0);
  const find = (id: string) => fighterById(r, id);
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 44, gap: 12, maxWidth: 620, width: '100%', alignSelf: 'center' }}>
          <LinearGradient colors={[r.org.renk + '44', '#08090b']} style={ps.nightHead}>
            <OrgLogo r={r} size={48} />
            <Text style={[ps.nightTitle, SLANT]} numberOfLines={2} adjustsFontSizeToFit>
              {g.ad.toLocaleUpperCase(LOC)}
            </Text>
            <Text style={ps.heroSub}>
              {cityById(g.sehir).ad} · {MEKAN[g.mekan].ad()}
            </Text>
            <View style={ps.meters}>
              <Meter label={L("SEYİRCİ")} value={fmtK(g.seyirci)} sub={`/ ${fmtK(g.kapasite)}`} color={g.seyirci >= g.kapasite ? C.green : C.text} />
              <Meter label={L("KÂR")} value={$(g.kar)} color={g.kar >= 0 ? C.green : C.red} />
              <Meter label={L("İTİBAR")} value={g.itibarD >= 0 ? `+${g.itibarD}` : String(g.itibarD)} color={g.itibarD >= 0 ? C.gold : C.red} />
            </View>
            <Text style={ps.small}>{L("+{0} takipçi", [g.takipciD.toLocaleString(LOC)])}</Text>
          </LinearGradient>
          <Text style={ps.section}>{L("SONUÇLAR")}</Text>
          {g.sonuclar.map((x, i) => {
            const wId = x.w === 'a' ? x.a : x.b;
            const wf = find(wId);
            const k = wf?.maclar.find((m) => m.gece === g.no);
            return (
              <View key={i} style={[ps.result, i === 0 && { borderColor: C.gold }]}>
                <View style={{ flex: 1 }}>
                  <Text style={ps.resultKick}>
                    {i === 0 ? L("ANA MAÇ") : L("{0}. MAÇ", [g.sonuclar.length - i])}
                    {x.unvan ? ` · 🏆 ${L("KEMER")}` : ''}
                    {x.bonus === 'mac' ? ` · 💰 ${L("GECENİN MAÇI")}` : x.bonus === 'perf' ? ` · 💰 ${L("GECENİN PERFORMANSI")}` : ''}
                  </Text>
                  <Text style={ps.resultLine} numberOfLines={2}>
                    <Text style={{ color: x.w === 'a' ? C.green : C.dim, fontFamily: F.bold }}>{x.aAd}</Text>
                    {'  vs  '}
                    <Text style={{ color: x.w === 'b' ? C.green : C.dim, fontFamily: F.bold }}>{x.bAd}</Text>
                  </Text>
                  <Text style={ps.fSub}>
                    {L("{0}, {1}. raunt", [x.y, x.ra])} · {L("heyecan {0}", [x.perf])}
                    {x.yeniSampiyon ? ` · 👑 ${L("YENİ ŞAMPİYON")}` : ''}
                  </Text>
                </View>
                {wf && k ? (
                  <Pressable onPress={() => setWatch({ f: wf, k })} hitSlop={6} style={ps.watchBtn}>
                    <Icon name="play-circle" size={26} color={C.gold} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
          {g.notlar.length ? (
            <Card>
              {g.notlar.map((n, i) => (
                <Text key={i} style={ps.small}>
                  {n}
                </Text>
              ))}
            </Card>
          ) : null}
          {canAdReplay(r, g) ? <AdOffer yer="patron_tekrar" icon="television-play" title={L("Tekrar yayınını sat")} desc={L("Gecenin tekrarını kanallara sat: +{0}", [$(replayPay(g))])} onReward={() => actPatron(adReplay)} /> : null}
          <Text style={ps.section}>{L("KASA")}</Text>
          <Card>
            {rows.map(([k, v]) => (
              <View key={k} style={ps.moneyRow}>
                <Text style={ps.small}>{k}</Text>
                <Text style={[ps.moneyVal, { color: v >= 0 ? C.green : C.red }]}>{v >= 0 ? `+${$(v)}` : $(v)}</Text>
              </View>
            ))}
            <View style={[ps.moneyRow, { borderTopWidth: 1, borderTopColor: C.border, marginTop: 6, paddingTop: 6 }]}>
              <Text style={[ps.small, { fontFamily: F.bold, color: C.text }]}>{L("Gelir {0} · Gider {1}", [$(gelir), $(gider)])}</Text>
              <Text style={[ps.moneyVal, { color: g.kar >= 0 ? C.green : C.red }]}>{$(g.kar)}</Text>
            </View>
          </Card>
          <Button label={L("Ofise dön")} icon="check" tone="gold" onPress={onClose} />
        </ScrollView>
        {watch ? <Watch r={r} f={watch.f} k={watch.k} onClose={() => setWatch(null)} /> : null}
      </View>
    </Modal>
  );
}

// ---------- Ofis ----------

const ROL: Record<PRol, { ikon: IconName; renk: string }> = {
  dovuscu: { ikon: 'boxing-glove', renk: C.red },
  menajer: { ikon: 'account-tie', renk: C.blue },
  yayin: { ikon: 'television-classic', renk: C.gold },
  sponsor: { ikon: 'cash-multiple', renk: C.green },
  basin: { ikon: 'microphone', renk: C.orange },
  rakip: { ikon: 'office-building', renk: C.red },
  yatirimci: { ikon: 'bank', renk: C.gold },
  sistem: { ikon: 'bell', renk: C.dim },
  doktor: { ikon: 'stethoscope', renk: C.green },
  sehir: { ikon: 'city', renk: C.blue },
};

function OfficeTab({ r, goCard }: { r: PatronRun; goCard: () => void }) {
  useEffect(() => {
    if (okunmamis(r)) {
      const t = setTimeout(() => actPatron(markRead), 1200);
      return () => clearTimeout(t);
    }
  }, [r]);
  const h = r.hedef;
  return (
    <View style={{ gap: 10, marginTop: 12 }}>
      {r.rapor.length ? (
        <Card>
          <Text style={ps.kicker}>{L("GEÇEN HAFTA")}</Text>
          {r.rapor.map((l, i) => (
            <Text key={i} style={ps.small}>
              {l}
            </Text>
          ))}
        </Card>
      ) : null}
      {!r.plan?.maclar.length ? <Choice icon="cards" tone="gold" label={L("Yeni gece planla")} desc={L("Eşleşmeleri kur, şehir ve mekânı seç, biletleri sat.")} onPress={goCard} /> : null}
      {h ? (
        <Card>
          <Text style={ps.kicker}>{L("{0}. YIL HEDEFLERİ", [h.yil])}</Text>
          <Bar value={(r.yil.gelir / h.gelir) * 100} color={C.green} label={L("Gelir")} right={`${$(r.yil.gelir)} / ${$(h.gelir)}`} />
          <Bar value={(r.itibar / h.itibar) * 100} color={C.gold} label={L("İtibar")} right={`${r.itibar} / ${h.itibar}`} />
          <Bar value={(r.yil.gece / h.gece) * 100} color={C.blue} label={L("Gece")} right={`${r.yil.gece} / ${h.gece}`} />
          {r.senaryo === 'yatirimci' ? <Text style={[ps.small, { color: C.orange }]}>{L("Yönetim kurulu: iki yıl üst üste tutmazsa kovulursun ({0}/2).", [r.hedefKacti])}</Text> : null}
        </Card>
      ) : null}
      <Text style={ps.section}>{L("GELEN KUTUSU")}</Text>
      {r.mesajlar.length === 0 ? <Text style={ps.small}>{L("Sessiz bir hafta.")}</Text> : null}
      {r.mesajlar.slice(0, 25).map((m) => (
        <MsgCard key={m.id} r={r} m={m} />
      ))}
    </View>
  );
}

function MsgCard({ r, m }: { r: PatronRun; m: PMesaj }) {
  const rol = ROL[m.rol];
  const open = m.secenekler && !m.cevap;
  return (
    <View style={[ps.msg, open && { borderColor: rol.renk }, !m.okundu && { backgroundColor: C.cardAlt }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[ps.msgIcon, { borderColor: rol.renk }]}>
          <Icon name={rol.ikon} size={16} color={rol.renk} />
        </View>
        <Text style={ps.msgFrom} numberOfLines={1}>
          {m.kimden}
        </Text>
        <Text style={ps.msgWhen}>{r.hafta - m.hafta <= 0 ? L("bu hafta") : L("{0} hf önce", [r.hafta - m.hafta])}</Text>
      </View>
      <Text style={ps.msgText}>{m.metin}</Text>
      {open ? (
        <View style={{ gap: 6, marginTop: 8 }}>
          {m.secenekler!.map((s) => (
            <Pressable key={s.k} onPress={() => (sfx('click'), actPatron((x) => answer(x, m.id, s.k)))} style={({ pressed }) => [ps.opt, pressed && { backgroundColor: C.cardAlt }]}>
              <Text style={ps.optText}>{s.t}</Text>
              {s.ipucu ? <Text style={ps.optHint}>{s.ipucu}</Text> : null}
            </Pressable>
          ))}
          {m.son != null ? <Text style={ps.msgWhen}>{L("Son karar: {0} hafta", [Math.max(0, m.son - r.hafta)])}</Text> : null}
        </View>
      ) : m.sonuc ? (
        <Text style={ps.msgResult}>→ {m.sonuc}</Text>
      ) : null}
    </View>
  );
}

// ---------- Kart ----------

function CardTab({ r }: { r: PatronRun }) {
  const p = r.plan;
  const [div, setDiv] = useState(r.bolumler[0]?.key ?? '');
  const [pickA, setPickA] = useState<string | null>(null);
  const [title, setTitle] = useState(false);
  const [err, setErr] = useState('');
  const [face, setFace] = useState<Mac | null>(null);
  const [cityOpen, setCityOpen] = useState(false);
  if (!p)
    return (
      <View style={{ marginTop: 12, gap: 10 }}>
        <Card>
          <Text style={ps.kicker}>{L("YENİ GECE")}</Text>
          <Text style={ps.small}>{L("Gece numarası {0}. Hazırlık en az {1} hafta sürer: tanıtım ve bilet satışı için zaman lazım.", [r.geceNo + 1, MIN_HAZIRLIK])}</Text>
        </Card>
        <Button label={L("Gece planlamaya başla")} icon="calendar-plus" tone="gold" onPress={() => actPatron((x) => void ensurePlan(x))} />
      </View>
    );
  const pr = projectNight(r, p);
  const issue = canRun(r);
  const weeks = p.hafta - r.hafta;
  const fighters = r.kadro.filter((f) => bKey(f) === div);
  const ord = [...(divisionOf(r, div)?.sampiyon ? fighters.filter((f) => f.sampiyon) : []), ...ranking(r, div)];
  const a = pickA ? fighterById(r, pickA) : null;
  const sugg = suggestions(r);
  const tryAdd = (x: string, y: string, t: boolean) => {
    const e = actPatron((s) => addBout(s, x, y, t));
    setErr(e ?? '');
    if (!e) {
      sfx('click');
      setPickA(null);
      setTitle(false);
    }
  };
  const div0 = divisionOf(r, div);
  return (
    <View style={{ marginTop: 12, gap: 10 }}>
      <LinearGradient colors={['#14110a', '#08090b']} style={ps.poster}>
        <Text style={ps.kicker}>{eventName(r, p).toLocaleUpperCase(LOC)}</Text>
        <View style={ps.row}>
          <Pressable onPress={() => actPatron((x) => setDate(x, p.hafta - 1))} hitSlop={8} disabled={weeks <= MIN_HAZIRLIK}>
            <Icon name="minus-circle-outline" size={26} color={weeks <= MIN_HAZIRLIK ? C.faint : C.gold} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={ps.bigNum}>{weeks <= 0 ? L("BU HAFTA") : L("{0} HAFTA SONRA", [weeks])}</Text>
            <Text style={ps.small}>{L("{0}. hafta", [p.hafta])}</Text>
          </View>
          <Pressable onPress={() => actPatron((x) => setDate(x, p.hafta + 1))} hitSlop={8} disabled={weeks >= 12}>
            <Icon name="plus-circle-outline" size={26} color={weeks >= 12 ? C.faint : C.gold} />
          </Pressable>
        </View>
        {p.rakipGece ? <Text style={[ps.small, { color: C.orange }]}>{p.karsiReklam ? L("Aynı hafta rakip gecesi var, karşı reklam yapıldı.") : L("⚠️ Aynı hafta rakip organizasyonun gecesi var: satışlar düşük.")}</Text> : null}
      </LinearGradient>

      <Text style={ps.section}>{L("ŞEHİR VE MEKÂN")}</Text>
      <Pressable onPress={() => setCityOpen(!cityOpen)} style={ps.opt}>
        <Text style={ps.optText}>
          📍 {cityById(p.sehir).ad}
          {p.tesvik ? ` · ${L("teşvik {0}", [$(p.tesvik)])}` : ''}
        </Text>
        <Text style={ps.optHint}>{L("Dövüşçülerinin memleketinde gece yaparsan bilet daha çok satar.")}</Text>
      </Pressable>
      {cityOpen ? (
        <View style={ps.wrap}>
          {CITIES.map((c) => (
            <Chip
              key={c.id}
              label={c.ad}
              on={p.sehir === c.id}
              onPress={() => {
                actPatron((x) => {
                  const pl = ensurePlan(x);
                  if (pl.sehir !== c.id) pl.tesvik = undefined;
                  pl.sehir = c.id;
                });
                setCityOpen(false);
              }}
            />
          ))}
        </View>
      ) : null}
      <View style={ps.wrap}>
        {MEKANLAR.map((m) => (
          <Chip key={m} icon={MEKAN[m].ikon as IconName} label={`${MEKAN[m].ad()} · ${fmtK(MEKAN[m].kap)}`} on={p.mekan === m} disabled={MEKAN[m].itibar > r.itibar} onPress={() => actPatron((x) => void (ensurePlan(x).mekan = m))} color={C.gold} />
        ))}
      </View>
      {MEKANLAR.some((m) => MEKAN[m].itibar > r.itibar) ? <Text style={ps.hint}>{L("Sonraki mekân için itibar {0} gerekiyor.", [MEKAN[MEKANLAR.find((m) => MEKAN[m].itibar > r.itibar)!].itibar])}</Text> : null}
      <View style={ps.wrap}>
        {BILET.map((b, i) => (
          <Chip key={i} label={`${L("Bilet")}: ${b.ad()}`} on={p.bilet === i} onPress={() => actPatron((x) => void (ensurePlan(x).bilet = i as BiletId))} color={C.blue} />
        ))}
      </View>

      <Text style={ps.section}>{L("KART ({0}/8)", [p.maclar.length])}</Text>
      {p.maclar.length === 0 ? <Text style={ps.small}>{L("Kart boş. Aşağıdan önerilen eşleşmelerden birini ekle ya da kendin eşle.")}</Text> : null}
      {p.maclar.map((m, i) => (
        <BoutCard key={`${m.a}-${m.b}`} r={r} m={m} i={i} onFace={() => setFace(m)} />
      ))}

      {sugg.length ? (
        <>
          <Text style={ps.kicker}>{L("ÖNERİLEN EŞLEŞMELER")}</Text>
          {sugg.map((s) => {
            const fa = fighterById(r, s.a)!;
            const fb = fighterById(r, s.b)!;
            return (
              <Pressable key={`${s.a}${s.b}`} onPress={() => tryAdd(s.a, s.b, !!s.unvan)} style={({ pressed }) => [ps.sugg, pressed && { backgroundColor: C.cardAlt }]}>
                <Icon name="plus-circle" size={20} color={C.gold} />
                <Text style={ps.suggText} numberOfLines={1}>
                  {s.unvan ? '🏆 ' : ''}
                  {fa.soyad} vs {fb.soyad}
                </Text>
                <Text style={ps.suggMeta}>
                  {bolumAd(fa)} · 🔥{Math.round(boutDraw(r, s))}
                </Text>
              </Pressable>
            );
          })}
        </>
      ) : null}

      <Text style={ps.kicker}>{L("KENDİN EŞLE")}</Text>
      <View style={ps.wrap}>
        {r.bolumler.map((b) => (
          <Chip key={b.key} label={bolumAd(b)} on={div === b.key} onPress={() => (setDiv(b.key), setPickA(null))} color={C.blue} />
        ))}
      </View>
      {a ? (
        <View style={ps.pickBar}>
          <Text style={ps.small}>{L("{0} için rakip seç", [a.soyad])}</Text>
          <Chip label={L("Kemer maçı")} icon="crown" on={title} onPress={() => setTitle(!title)} color={C.gold} />
          <Pressable onPress={() => setPickA(null)} hitSlop={8}>
            <Icon name="close" size={18} color={C.dim} />
          </Pressable>
        </View>
      ) : (
        <Text style={ps.hint}>{div0?.sampiyon ? L("İlk dövüşçüyü seç. Kemer maçında şampiyon olmalı.") : L("Kemer boşta: iki üst sıradakini eşleyip kemer maçı yap.")}</Text>
      )}
      {ord.map((f) => {
        const issue_ = a && a.id !== f.id ? bookIssue(r, a, f, title) : null;
        const disabled = busy(r, f.id) || f.kalan <= 0 || (!!a && a.id !== f.id && !!issue_);
        return (
          <FighterRow
            key={f.id}
            r={r}
            f={f}
            onPress={disabled ? undefined : () => (a ? (a.id === f.id ? setPickA(null) : tryAdd(a.id, f.id, title)) : setPickA(f.id))}
            right={busy(r, f.id) ? <Text style={ps.tag}>{L("KARTTA")}</Text> : f.kalan <= 0 ? <Text style={[ps.tag, { color: C.red }]}>{L("SÖZLEŞME YOK")}</Text> : a?.id === f.id ? <Icon name="check-circle" size={20} color={C.gold} /> : f.soz ? <Text style={[ps.tag, { color: C.orange }]}>{L("SÖZ")}</Text> : null}
          />
        );
      })}
      {err ? <Text style={[ps.small, { color: C.red }]}>{err}</Text> : null}

      <Text style={ps.section}>{L("TANITIM")}</Text>
      {TANITIMLAR.map((t) => (
        <Pressable key={t} onPress={() => actPatron((x) => toggleTanitim(x, t))} style={({ pressed }) => [ps.promo, p.tanitim.includes(t) && { borderColor: C.gold, backgroundColor: '#1a1408' }, pressed && { opacity: 0.85 }]}>
          <Icon name={TANITIM[t].ikon as IconName} size={20} color={p.tanitim.includes(t) ? C.gold : C.dim} />
          <View style={{ flex: 1 }}>
            <Text style={ps.optText}>
              {TANITIM[t].ad()} · {$(TANITIM[t].maliyet)}
            </Text>
            <Text style={ps.optHint}>{TANITIM[t].aciklama()}</Text>
          </View>
          <Icon name={p.tanitim.includes(t) ? 'checkbox-marked' : 'checkbox-blank-outline'} size={22} color={p.tanitim.includes(t) ? C.gold : C.faint} />
        </Pressable>
      ))}
      <View style={ps.wrap}>
        <Chip label={L("Standart bonus")} on={p.bonus === 'standart'} onPress={() => actPatron((x) => void (ensurePlan(x).bonus = 'standart'))} color={C.green} />
        <Chip label={L("Cömert bonus (2x)")} on={p.bonus === 'comert'} onPress={() => actPatron((x) => void (ensurePlan(x).bonus = 'comert'))} color={C.green} />
      </View>
      <Text style={ps.hint}>{L("Bonuslar gecenin maçına ve gecenin performansına verilir. Cömert bonus dövüşçüleri mutlu eder.")}</Text>

      <Text style={ps.section}>{L("TAHMİN")}</Text>
      <Card>
        <Bar value={(pr.seyirci / pr.kapasite) * 100} color={pr.talep >= pr.kapasite ? C.green : C.gold} label={L("Seyirci")} right={`${pr.seyirci.toLocaleString(LOC)} / ${pr.kapasite.toLocaleString(LOC)}`} />
        {pr.talep > pr.kapasite * 1.15 ? <Text style={[ps.hint, { color: C.green }]}>{L("Talep kapasiteden fazla ({0}). Daha büyük mekân ya da pahalı bilet düşün.", [pr.talep.toLocaleString(LOC)])}</Text> : null}
        <View style={ps.moneyRow}>
          <Text style={ps.small}>{L("Bilet fiyatı")}</Text>
          <Text style={ps.moneyVal}>{$(pr.fiyat)}</Text>
        </View>
        <View style={ps.moneyRow}>
          <Text style={ps.small}>{L("Gelir")}</Text>
          <Text style={[ps.moneyVal, { color: C.green }]}>{$(Object.values(pr.gelir).reduce((s, x) => s + x, 0))}</Text>
        </View>
        <View style={ps.moneyRow}>
          <Text style={ps.small}>{L("Gider")}</Text>
          <Text style={[ps.moneyVal, { color: C.red }]}>{$(Object.values(pr.gider).reduce((s, x) => s + x, 0))}</Text>
        </View>
        <View style={[ps.moneyRow, { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 6, marginTop: 4 }]}>
          <Text style={[ps.small, { fontFamily: F.bold, color: C.text }]}>{L("Tahmini kâr")}</Text>
          <Text style={[ps.moneyVal, { color: pr.kar >= 0 ? C.green : C.red, fontSize: 18 }]}>{$(pr.kar)}</Text>
        </View>
      </Card>
      {issue ? <Text style={[ps.small, { color: C.orange }]}>{issue}</Text> : <Text style={[ps.small, { color: C.green }]}>{L("Kart hazır. Gece haftası gelince “Geceyi başlat”a bas.")}</Text>}
      {face ? <FacePreview r={r} m={face} onClose={() => setFace(null)} /> : null}
    </View>
  );
}

function FacePreview({ r, m, onClose }: { r: PatronRun; m: Mac; onClose: () => void }) {
  const a = fighterById(r, m.a);
  const b = fighterById(r, m.b);
  if (!a || !b) return null;
  return <FaceOffModal f={toMF(a, r.plan?.hafta ?? r.hafta)} rk={rkOfF(b)} org="cfc" orgAd={r.org.ad} unvan={!!m.unvan} sup={false} onClose={onClose} />;
}

function BoutCard({ r, m, i, onFace }: { r: PatronRun; m: Mac; i: number; onFace: () => void }) {
  const a = fighterById(r, m.a);
  const b = fighterById(r, m.b);
  if (!a || !b) return null;
  const notes = boutNote(r, m);
  return (
    <View style={[ps.bout, i === 0 && { borderColor: C.gold }]}>
      <Text style={ps.resultKick}>
        {i === 0 ? L("ANA MAÇ") : L("ALT KART")} · {bolumAd(a)}
        {m.unvan ? ` · 🏆 ${L("KEMER")}` : ''} · 🔥{Math.round(boutDraw(r, m))}
      </Text>
      <View style={ps.row}>
        <View style={ps.corner}>
          <FighterAvatar look={pLook(a)} size={44} ring={C.red} />
          <Text style={ps.cornerName} numberOfLines={1}>
            {a.soyad}
          </Text>
          <Text style={ps.fSub}>
            {rankLabel(rankOf(r, a))} · {pRekor(a)}
          </Text>
        </View>
        <Text style={[ps.vs, SLANT]}>VS</Text>
        <View style={ps.corner}>
          <FighterAvatar look={pLook(b)} size={44} ring={C.blue} />
          <Text style={ps.cornerName} numberOfLines={1}>
            {b.soyad}
          </Text>
          <Text style={ps.fSub}>
            {rankLabel(rankOf(r, b))} · {pRekor(b)}
          </Text>
        </View>
      </View>
      {notes.map((n, j) => (
        <Text key={j} style={[ps.note, { color: n.iyi ? C.green : C.orange }]}>
          {n.iyi ? '▲' : '▼'} {n.t}
        </Text>
      ))}
      <View style={[ps.row, { justifyContent: 'flex-end', gap: 14, marginTop: 6 }]}>
        <Pressable onPress={onFace} hitSlop={6}>
          <Text style={ps.link}>{L("Face-off")}</Text>
        </Pressable>
        {i > 0 ? (
          <Pressable onPress={() => actPatron((x) => makeMain(x, i))} hitSlop={6}>
            <Text style={ps.link}>{L("Ana maç yap")}</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => actPatron((x) => removeBout(x, i))} hitSlop={6}>
          <Text style={[ps.link, { color: C.red }]}>{L("Çıkar")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Her sıklet için en çekici uygun eşleşmeler */
function suggestions(r: PatronRun): Mac[] {
  const out: Mac[] = [];
  const p = r.plan;
  if (!p) return out;
  for (const d of r.bolumler) {
    const avail = r.kadro.filter((f) => bKey(f) === d.key && !busy(r, f.id) && f.kalan > 0 && f.sakat <= p.hafta - r.hafta);
    const ch = avail.find((f) => f.id === d.sampiyon);
    const rk = ranking(r, d.key).filter((f) => avail.includes(f));
    const cand: Mac[] = [];
    const titled = p.maclar.some((m) => m.unvan && bKey(fighterById(r, m.a)!) === d.key);
    if (ch && rk[0]) cand.push({ a: ch.id, b: rk[0].id, unvan: !titled || undefined });
    else if (!d.sampiyon && rk.length >= 2 && !titled) cand.push({ a: rk[0].id, b: rk[1].id, unvan: true });
    for (let i = 0; i < rk.length; i++)
      for (let j = i + 1; j < Math.min(rk.length, i + 4); j++) if (!cand.some((c) => [c.a, c.b].includes(rk[i].id) && [c.a, c.b].includes(rk[j].id))) cand.push({ a: rk[i].id, b: rk[j].id });
    out.push(...cand.sort((x, y) => boutDraw(r, y) - boutDraw(r, x)).slice(0, 2));
  }
  return out.sort((x, y) => boutDraw(r, y) - boutDraw(r, x)).slice(0, 5);
}

// ---------- Kadro ----------

function SquadTab({ r }: { r: PatronRun }) {
  const [sub, setSub] = useState<'siklet' | 'piyasa'>('siklet');
  const [div, setDiv] = useState(r.bolumler[0]?.key ?? '');
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [newDiv, setNewDiv] = useState(false);
  const d = divisionOf(r, div) ?? r.bolumler[0];
  const champ = d?.sampiyon ? fighterById(r, d.sampiyon) : undefined;
  const sel = open ? fighterById(r, open) : undefined;
  return (
    <View style={{ marginTop: 12, gap: 10 }}>
      <View style={ps.seg}>
        <Chip label={L("Sıkletler ({0}/{1})", [r.kadro.length, KADRO_MAX])} on={sub === 'siklet'} onPress={() => setSub('siklet')} />
        <Chip label={L("Serbest piyasa ({0})", [r.adaylar.length])} on={sub === 'piyasa'} onPress={() => setSub('piyasa')} />
      </View>
      {msg ? (
        <Pressable onPress={() => setMsg('')} style={ps.toast}>
          <Text style={ps.small}>{msg}</Text>
        </Pressable>
      ) : null}
      {sub === 'piyasa' ? (
        <Market r={r} onMsg={setMsg} />
      ) : (
        <>
          <View style={ps.wrap}>
            {r.bolumler.map((b) => (
              <Chip key={b.key} label={`${bolumAd(b)} (${r.kadro.filter((f) => bKey(f) === b.key).length})`} on={d?.key === b.key} onPress={() => setDiv(b.key)} color={C.blue} />
            ))}
            <Chip label={L("Sıklet aç")} icon="plus" onPress={() => setNewDiv(!newDiv)} on={newDiv} color={C.gold} />
          </View>
          {newDiv ? <NewDivision r={r} onDone={(m) => (setMsg(m), setNewDiv(false))} /> : null}
          {d ? (
            <LinearGradient colors={['#1d1606', '#08090b']} style={ps.champ}>
              <Text style={ps.kicker}>{L("{0} ŞAMPİYONU", [bolumAd(d).toLocaleUpperCase(LOC)])}</Text>
              {champ ? (
                <Pressable onPress={() => setOpen(champ.id)} style={ps.row}>
                  <FighterAvatar look={pLook(champ)} size={56} ring={C.gold} />
                  <View style={{ flex: 1 }}>
                    <Text style={ps.champName}>{pFullName(champ)}</Text>
                    <Text style={ps.fSub}>
                      {pRekor(champ)} · {L("{0} savunma", [d.savunma])} · ⭐{champ.un}
                    </Text>
                  </View>
                  <Icon name="crown" size={28} color={C.gold} />
                </Pressable>
              ) : (
                <Text style={ps.small}>{L("Kemer boşta. İki üst sıradaki dövüşçüyü kemer maçında eşle.")}</Text>
              )}
            </LinearGradient>
          ) : null}
          {d
            ? ranking(r, d.key).map((f) => (
                <FighterRow key={f.id} r={r} f={f} onPress={() => setOpen(f.id)} right={<Icon name="chevron-right" size={18} color={C.faint} />} />
              ))
            : null}
          {d && ranking(r, d.key).length < 4 ? <Text style={ps.hint}>{L("Bu sıklette az dövüşçü var. Serbest piyasadan takviye yap.")}</Text> : null}
        </>
      )}
      {sel ? <Dossier r={r} f={sel} onClose={() => setOpen(null)} onMsg={setMsg} /> : null}
    </View>
  );
}

function NewDivision({ r, onDone }: { r: PatronRun; onDone: (m: string) => void }) {
  const opts: { s: WeightClass; k: boolean }[] = [];
  for (const s of Object.keys(WEIGHT_CLASSES) as WeightClass[]) {
    opts.push({ s, k: false });
    if (['sinek', 'horoz', 'tuy', 'hafif'].includes(s)) opts.push({ s, k: true });
  }
  return (
    <Card>
      <Text style={ps.small}>{L("Yeni sıklet: {0}. Piyasaya o sıkletten adaylar düşer.", [$(DIV_COST)])}</Text>
      <View style={[ps.wrap, { marginTop: 8 }]}>
        {opts
          .filter((o) => !divisionOf(r, `${o.s}${o.k ? '_k' : ''}`))
          .map((o) => (
            <Chip key={`${o.s}${o.k}`} label={bolumAd({ siklet: o.s, kadin: o.k })} onPress={() => onDone(actPatron((x) => openDivision(x, o.s, o.k)) ?? '')} color={C.gold} />
          ))}
      </View>
    </Card>
  );
}

function Dossier({ r, f, onClose, onMsg }: { r: PatronRun; f: PFighter; onClose: () => void; onMsg: (m: string) => void }) {
  const [watch, setWatch] = useState<PKayit | null>(null);
  const [confirm, setConfirm] = useState(false);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={ps.sheetBack}>
        <View style={ps.sheet}>
          <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
            <View style={ps.row}>
              <FighterAvatar look={pLook(f)} size={72} ring={f.sampiyon ? C.gold : C.red} />
              <View style={{ flex: 1 }}>
                <Text style={ps.champName}>
                  {f.ad} {f.lakap ? `“${f.lakap}” ` : ''}
                  {f.soyad}
                </Text>
                <Text style={ps.fSub}>
                  {L(f.ulke)} · {bolumAd(f)} · {L("{0} yaş", [f.yas])} · {rankLabel(rankOf(r, f))}
                </Text>
                <Text style={ps.fSub}>
                  {pRekor(f)} · {P_KISILIK[f.kisilik].ad()}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <Icon name="close" size={24} color={C.text} />
              </Pressable>
            </View>
            <Bar value={f.guc} color={C.red} label={L("Güç")} right={String(f.guc)} />
            <Bar value={f.un} color={C.gold} label={L("Şöhret")} right={String(f.un)} />
            <Bar value={f.mutlu} color={C.green} label={L("Mutluluk")} right={`${moodIcon(f.mutlu)} ${f.mutlu}`} />
            <Bar value={100 - f.hasar} color={C.blue} label={L("Sağlık")} right={f.sakat ? L("{0} hafta sakat", [f.sakat]) : String(100 - f.hasar)} />
            {potVisible(r) ? <Text style={ps.small}>{L("Gözlemci raporu: potansiyel tavanı {0}", [f.pot])}</Text> : null}
            <Card>
              <Text style={ps.small}>{P_KISILIK[f.kisilik].aciklama()}</Text>
              <Text style={[ps.small, { color: C.gold }]}>🎯 {ISTEK[f.istek]()}</Text>
              <Text style={ps.small}>{L("Sözleşme: {0} maç kaldı · maç başı {1}", [f.kalan, $(f.ucret)])}</Text>
              {f.soz ? <Text style={[ps.small, { color: C.orange }]}>{L("Maç sözü verdin: {0}. haftaya kadar", [f.soz])}</Text> : null}
              {f.bosHafta > 8 ? <Text style={[ps.small, { color: C.orange }]}>{L("{0} haftadır maç yapmadı", [f.bosHafta])}</Text> : null}
            </Card>
            <Text style={ps.kicker}>{L("MAÇ GEÇMİŞİ")}</Text>
            {f.maclar.length === 0 ? <Text style={ps.small}>{L("Organizasyonunda henüz maç yapmadı.")}</Text> : null}
            {f.maclar.map((k) => (
              <Pressable key={k.id} onPress={() => setWatch(k)} style={({ pressed }) => [ps.histRow, pressed && { backgroundColor: C.cardAlt }]}>
                <Text style={[ps.histWL, { color: k.w ? C.green : C.red }]}>{k.w ? L("G") : L("M")}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={ps.fName} numberOfLines={1}>
                    {k.rk.ad}
                    {k.unvan ? ' 🏆' : ''}
                  </Text>
                  <Text style={ps.fSub}>{L("{0} {1} · {2}, {3}. raunt", [r.org.kisa, k.gece, k.y, k.ra])}</Text>
                </View>
                <Icon name="play-circle-outline" size={22} color={C.gold} />
              </Pressable>
            ))}
            {confirm ? (
              <View style={{ gap: 6 }}>
                <Text style={[ps.small, { color: C.orange }]}>{L("Emin misin? Kalan sözleşmenin bir kısmı tazminat olarak ödenir.")}</Text>
                <Button
                  label={L("Serbest bırak")}
                  icon="account-remove"
                  onPress={() => {
                    onMsg(actPatron((x) => releaseFighter(x, f.id)) ?? '');
                    onClose();
                  }}
                />
              </View>
            ) : (
              <Button label={L("Serbest bırak…")} icon="account-remove" tone="ghost" onPress={() => setConfirm(true)} />
            )}
          </ScrollView>
        </View>
      </View>
      {watch ? <Watch r={r} f={f} k={watch} onClose={() => setWatch(null)} /> : null}
    </Modal>
  );
}

function Market({ r, onMsg }: { r: PatronRun; onMsg: (m: string) => void }) {
  const [mac, setMac] = useState<3 | 6>(3);
  return (
    <View style={{ gap: 10 }}>
      <Text style={ps.hint}>{L("Piyasa 4 haftada bir yenilenir. Rakip organizasyonlar da aynı adayların peşinde.")}</Text>
      {canAdMarket(r) ? <AdOffer yer="patron_piyasa" icon="account-search" title={L("Yeni adaylar")} desc={L("Gözcün bir tur daha atsın: piyasa şimdi yenilensin.")} onReward={() => onMsg(actPatron(adRefreshMarket) ?? '')} /> : null}
      {!potVisible(r) ? <AdOffer yer="patron_rapor" icon="file-search" title={L("Gözlemci raporu")} desc={L("Bu hafta adayların ve dövüşçülerinin gizli potansiyelini gör.")} onReward={() => onMsg(actPatron(adScoutReport) ?? '')} /> : null}
      <View style={ps.wrap}>
        <Chip label={L("3 maçlık sözleşme")} on={mac === 3} onPress={() => setMac(3)} color={C.blue} />
        <Chip label={L("6 maçlık sözleşme")} on={mac === 6} onPress={() => setMac(6)} color={C.blue} />
      </View>
      {r.adaylar.length === 0 ? <Text style={ps.small}>{L("Şu an piyasada aday yok.")}</Text> : null}
      {r.adaylar.map((a) => (
        <Candidate key={a.id} r={r} a={a} mac={mac} onMsg={onMsg} />
      ))}
    </View>
  );
}

function Candidate({ r, a, mac, onMsg }: { r: PatronRun; a: PAday; mac: 3 | 6; onMsg: (m: string) => void }) {
  const open = !!divisionOf(r, bKey(a));
  return (
    <View style={ps.cand}>
      <View style={ps.row}>
        <FighterAvatar look={pLook(a)} size={46} ring={a.eskiUcc ? C.gold : C.border} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={ps.fName} numberOfLines={1}>
            {pFullName(a)} {a.eskiUcc ? <Text style={{ color: C.gold }}>{L("· eski UCC")}</Text> : null}
          </Text>
          <Text style={ps.fSub} numberOfLines={1}>
            {L(a.ulke)} · {bolumAd(a)} · {L("{0} yaş", [a.yas])} · {pRekor(a)}
          </Text>
          <Text style={ps.fSub} numberOfLines={1}>
            {L("güç {0}", [a.guc])} · ⭐{a.un} · {P_KISILIK[a.kisilik].ad()}
            {potVisible(r) ? ` · ${L("pot. {0}", [a.pot])}` : ''}
          </Text>
        </View>
      </View>
      <Text style={ps.small}>{L("İmza {0} · maç başı {1}", [$(a.imza), $(a.ucret)])}</Text>
      {a.rakipOrg ? <Text style={[ps.small, { color: C.orange }]}>{L("⚠️ {0} de teklif verdi", [orgAdi(a.rakipOrg)])}</Text> : null}
      {!open ? (
        <Text style={[ps.small, { color: C.orange }]}>{L("{0} sıkleti organizasyonunda yok.", [bolumAd(a)])}</Text>
      ) : (
        <View style={[ps.wrap, { marginTop: 6 }]}>
          {(Object.keys(TEKLIF) as TeklifTip[]).map((t) => (
            <Chip key={t} label={`${TEKLIF[t].ad()} · %${Math.round(signChance(r, a, t) * 100)}`} onPress={() => onMsg(actPatron((x) => signCandidate(x, a.id, t, mac)) ?? '')} color={C.gold} />
          ))}
        </View>
      )}
    </View>
  );
}

// ---------- Şirket ----------

function CompanyTab({ r, onExit }: { r: PatronRun; onExit: () => void }) {
  const [msg, setMsg] = useState('');
  const [closing, setClosing] = useState(false);
  const [rep, setRep] = useState<GeceRapor | null>(null);
  const cap = itibarCap(r);
  return (
    <View style={{ marginTop: 12, gap: 10 }}>
      {msg ? (
        <Pressable onPress={() => setMsg('')} style={ps.toast}>
          <Text style={ps.small}>{msg}</Text>
        </Pressable>
      ) : null}
      <Text style={ps.section}>{L("ORGANİZASYONLAR SAVAŞI")}</Text>
      <Card>
        {orgRanking(r).map((o, i) => (
          <View key={o.id} style={[ps.rankRow, o.ben && { backgroundColor: r.org.renk + '22' }]}>
            <Text style={ps.fRank}>{i + 1}</Text>
            <Text style={[ps.fName, { flex: 1 }, o.ben && { color: C.gold }]} numberOfLines={1}>
              {o.ad}
            </Text>
            <View style={{ width: 90 }}>
              <Bar value={o.itibar} color={o.ben ? C.gold : C.dim} />
            </View>
            <Text style={ps.rankVal}>{o.itibar}</Text>
          </View>
        ))}
        <Text style={[ps.hint, { marginTop: 6 }]}>{L("İtibar tavanın {0}: en iyi 10 dövüşçünün gücüyle belirlenir. Daha yukarı çıkmak için daha güçlü kadro kur.", [cap])}</Text>
      </Card>

      <Text style={ps.section}>{L("YAYIN VE SPONSORLAR")}</Text>
      <Card>
        {r.yayin ? (
          <>
            <Text style={ps.fName}>📺 {YAYIN[r.yayin.id].ad()}</Text>
            <Text style={ps.small}>{L("Gece başı {0} · bu dönem {1}/{2} gece · {3}. haftaya kadar", [$(r.yayin.gece), r.yayin.yapilan, r.yayin.min, r.yayin.bitis])}</Text>
          </>
        ) : (
          <Text style={ps.small}>{L("Yayın anlaşması yok: geceler internetten yayınlanıyor. İtibarın arttıkça kanallar seni arayacak.")}</Text>
        )}
        {r.sponsorlar.map((s) => (
          <Text key={s.id} style={ps.small}>
            💼 {s.marka} · {L("gece başı {0} · {1} gece kaldı", [$(s.gece), s.kalan])}
            {s.sart !== 'yok' ? ` · ${SPONSOR_SART[s.sart]()} (+${$(s.ek)})` : ''}
          </Text>
        ))}
        {!r.sponsorlar.length ? <Text style={ps.small}>{L("Sponsor yok. Teklifler ofisine gelir.")}</Text> : null}
      </Card>

      <Text style={ps.section}>{L("TESİSLER")}</Text>
      {TESISLER.map((t) => {
        const lv = r.tesis[t];
        const cost = TESIS[t].maliyet[lv];
        return (
          <View key={t} style={ps.promo}>
            <Icon name={TESIS[t].ikon as IconName} size={22} color={lv ? C.gold : C.dim} />
            <View style={{ flex: 1 }}>
              <Text style={ps.optText}>
                {TESIS[t].ad()} · {'★'.repeat(lv)}
                {'☆'.repeat(3 - lv)}
              </Text>
              <Text style={ps.optHint}>{TESIS[t].aciklama()}</Text>
            </View>
            {cost != null ? (
              <Pressable onPress={() => setMsg(actPatron((x) => upgradeTesis(x, t)) ?? '')} style={[ps.buyBtn, r.para < cost && { opacity: 0.4 }]}>
                <Text style={ps.buyText}>{$(cost)}</Text>
              </Pressable>
            ) : (
              <Text style={ps.tag}>{L("MAKS")}</Text>
            )}
          </View>
        );
      })}

      <Text style={ps.section}>{L("BU YIL")}</Text>
      <Card>
        <View style={ps.moneyRow}>
          <Text style={ps.small}>{L("Gelir")}</Text>
          <Text style={[ps.moneyVal, { color: C.green }]}>{$(r.yil.gelir)}</Text>
        </View>
        <View style={ps.moneyRow}>
          <Text style={ps.small}>{L("Gider")}</Text>
          <Text style={[ps.moneyVal, { color: C.red }]}>{$(r.yil.gider)}</Text>
        </View>
        <Text style={ps.hint}>{L("Haftalık sabit gider: ofis, kadro ve tesis bakımı.")}</Text>
        <Text style={ps.small}>{L("Toplam: {0} gece · {1} seyirci · {2} kemer maçı", [r.toplam.gece, r.toplam.seyirci.toLocaleString(LOC), r.toplam.unvan])}</Text>
      </Card>

      {r.geceler.length ? (
        <>
          <Text style={ps.section}>{L("GEÇMİŞ GECELER")}</Text>
          {r.geceler.map((g) => (
            <Pressable key={g.no} onPress={() => setRep(g)} style={({ pressed }) => [ps.histRow, pressed && { backgroundColor: C.cardAlt }]}>
              <Text style={[ps.histWL, { color: C.gold }]}>{g.no}</Text>
              <View style={{ flex: 1 }}>
                <Text style={ps.fName} numberOfLines={1}>
                  {g.ad}
                </Text>
                <Text style={ps.fSub}>
                  {cityById(g.sehir).ad} · {g.seyirci.toLocaleString(LOC)} · {$(g.kar)}
                </Text>
              </View>
              <Icon name="chevron-right" size={18} color={C.faint} />
            </Pressable>
          ))}
        </>
      ) : null}

      <View style={{ marginTop: 10, gap: 8 }}>
        <Button label={L("Menüye dön")} icon="arrow-left" tone="ghost" onPress={onExit} />
        {closing ? (
          <>
            <Text style={[ps.small, { color: C.orange }]}>{L("Organizasyon kapanır ve Onur Listesi'ne yazılır. Geri alınamaz.")}</Text>
            <Button label={L("Evet, kapat")} icon="close-octagon" onPress={() => actPatron(closeOrg)} />
          </>
        ) : (
          <Button label={L("Organizasyonu kapat…")} icon="close-octagon" tone="ghost" onPress={() => setClosing(true)} />
        )}
      </View>
      {rep ? <NightReport r={r} g={rep} onClose={() => setRep(null)} /> : null}
    </View>
  );
}

const ps = StyleSheet.create({
  hero: { borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 20, alignItems: 'center', gap: 8, overflow: 'hidden' },
  heroTitle: { color: C.gold, fontFamily: F.display, fontSize: 30, letterSpacing: 2 },
  heroText: { color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  bullet: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bulletText: { flex: 1, color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  label: { color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 1.2, marginBottom: 6 },
  input: { color: C.text, fontFamily: F.body, fontSize: 15, backgroundColor: '#060607', borderRadius: 6, padding: 10, borderWidth: 1, borderColor: C.border },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'transparent' },
  section: { color: C.gold, fontFamily: F.display, fontSize: 14, letterSpacing: 1.5, marginTop: 8 },
  kicker: { color: C.gold, fontFamily: F.display, fontSize: 12, letterSpacing: 1.2, marginBottom: 4 },
  small: { color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  hint: { color: C.faint, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  link: { color: C.gold, fontFamily: F.semi, fontSize: 13 },
  pack: { borderRadius: R, borderWidth: 1, borderColor: C.goldDeep, padding: 14, gap: 8, marginTop: 12 },
  packLead: { color: C.gold, fontFamily: F.display, fontSize: 15, letterSpacing: 1 },
  packText: { color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  heroCard: { borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 14, overflow: 'hidden' },
  nick: { color: C.gold, fontFamily: F.display, fontSize: 11, letterSpacing: 1.5 },
  name: { color: C.text, fontFamily: F.display, fontSize: 26 },
  heroSub: { color: C.faint, fontFamily: F.body, fontSize: 12 },
  meters: { flexDirection: 'row', gap: 8, marginTop: 12 },
  meter: { flex: 1, backgroundColor: '#00000066', borderRadius: 6, borderWidth: 1, borderColor: C.border, paddingVertical: 8, alignItems: 'center' },
  meterLabel: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1 },
  meterVal: { fontFamily: F.display, fontSize: 18 },
  meterSub: { color: C.faint, fontFamily: F.body, fontSize: 10 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.goldDeep, borderRadius: 6, padding: 10, marginTop: 10, backgroundColor: '#00000055' },
  bannerText: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 13 },
  waitHint: { color: C.orange, fontFamily: F.semi, fontSize: 12, textAlign: 'center' },
  msg: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12 },
  msgIcon: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  msgFrom: { flex: 1, color: C.text, fontFamily: F.bold, fontSize: 14 },
  msgWhen: { color: C.faint, fontFamily: F.body, fontSize: 11 },
  msgText: { color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20, marginTop: 6 },
  msgResult: { color: C.gold, fontFamily: F.semi, fontSize: 13, lineHeight: 18, marginTop: 8 },
  opt: { borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 10, backgroundColor: C.card },
  optText: { color: C.text, fontFamily: F.semi, fontSize: 14 },
  optHint: { color: C.faint, fontFamily: F.body, fontSize: 12, marginTop: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.cardAlt, maxWidth: '100%' },
  chipText: { color: C.dim, fontFamily: F.semi, fontSize: 12, flexShrink: 1 },
  seg: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  toast: { backgroundColor: '#1a1408', borderWidth: 1, borderColor: C.goldDeep, borderRadius: 8, padding: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  poster: { borderRadius: R, borderWidth: 1, borderColor: C.goldDeep, padding: 12, gap: 6 },
  bigNum: { color: C.text, fontFamily: F.display, fontSize: 22, letterSpacing: 1 },
  bout: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, gap: 6 },
  corner: { flex: 1, alignItems: 'center', gap: 2 },
  cornerName: { color: C.text, fontFamily: F.display, fontSize: 16 },
  vs: { color: C.gold, fontFamily: F.display, fontSize: 22 },
  note: { fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  sugg: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.goldDeep + '88', borderRadius: 6, padding: 10, backgroundColor: C.card },
  suggText: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 14 },
  suggMeta: { color: C.faint, fontFamily: F.body, fontSize: 12 },
  pickBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.gold, borderRadius: 6, padding: 8 },
  fRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: C.border, borderRadius: 4 },
  fRank: { width: 30, color: C.dim, fontFamily: F.display, fontSize: 16, textAlign: 'center' },
  fName: { color: C.text, fontFamily: F.semi, fontSize: 14 },
  fSub: { color: C.faint, fontFamily: F.body, fontSize: 12 },
  tag: { color: C.gold, fontFamily: F.display, fontSize: 10, letterSpacing: 1 },
  promo: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 10, backgroundColor: C.card },
  moneyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  moneyVal: { color: C.text, fontFamily: F.display, fontSize: 15 },
  nightHead: { borderRadius: R, borderWidth: 1, borderColor: C.goldDeep, padding: 14, alignItems: 'center', gap: 6 },
  nightTitle: { color: C.text, fontFamily: F.display, fontSize: 24, textAlign: 'center' },
  result: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 10 },
  resultKick: { color: C.gold, fontFamily: F.display, fontSize: 11, letterSpacing: 1 },
  resultLine: { color: C.text, fontFamily: F.body, fontSize: 14, marginTop: 2 },
  watchBtn: { padding: 4 },
  champ: { borderRadius: R, borderWidth: 1, borderColor: C.goldDeep, padding: 12 },
  champName: { color: C.text, fontFamily: F.display, fontSize: 18 },
  sheetBack: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: C.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16 },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  histWL: { width: 24, fontFamily: F.display, fontSize: 16, textAlign: 'center' },
  cand: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, gap: 4 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 4 },
  rankVal: { width: 30, color: C.text, fontFamily: F.display, fontSize: 15, textAlign: 'right' },
  buyBtn: { backgroundColor: C.gold, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 6 },
  buyText: { color: '#1f1605', fontFamily: F.display, fontSize: 13 },
});
