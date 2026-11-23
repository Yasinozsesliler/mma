// Hakem Modu ekranları: başlangıç (karakter + ad + ülke + deneme/paket), sekmeli kariyer merkezi
// (Kariyer · Gelişim · Hayat · Profil), kafes sahnesinde maç (akış, karar anı kartı, raunt sonu puan kartı)
// ve Yılın Hakemi töreni.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { track } from '../analytics';
import { sfx, useSoundScene } from '../audio';
import { money } from '../engine/career';
import { BACKGROUNDS, COUNTRIES } from '../engine/data';
import { fmtFollowers } from '../engine/fame';
import {
  answerExam,
  canReplay,
  cardHint,
  cardLabel,
  createRefRun,
  decide,
  finishBout,
  finishExam,
  replayMoment,
  promoteReq,
  REF_TRIAL,
  scoreRound,
  startBout,
  TIER_NAME,
  trialOver,
  YEAR_BOUTS,
  fighterName,
  type Card as RefCard,
  type RefBout,
  type RefFighter,
  type RefRun,
} from '../engine/referee';
import type { RefTier } from '../engine/referee';
import {
  canRefreshRefOffers,
  chooseEvent,
  closeCeremony,
  DEFAULT_REF_LOOK,
  myRank,
  REF_SKILLS,
  refRanking,
  seminarCost,
  SEMINARS,
  SKILL_MAX,
  skillCost,
  skillLvl,
  restWeek,
  refreshRefOffers,
  takeSeminar,
  TIER_COLOR,
  upgradeSkill,
  type RefOffer,
} from '../engine/refereeCareer';
import {
  choosePerk,
  CONTRACT_BOUTS,
  EXAM_PASS,
  EXAM_QUESTIONS,
  HATIRA_METIN,
  hallWorthy,
  iliski,
  imaj,
  KIYAFETLER,
  kiyafetRenk,
  mentorText,
  ORG_TARZ,
  PERKS,
  pendingPerks,
  RETIRE_MIN,
  saygi,
  TAG_INFO,
  TARZ_ACIK,
  TARZ_NAME,
  tarzOf,
  TIER_ORGS,
  yorgun,
  type PerkSlot,
} from '../engine/refereeDepth';
import { orgName } from '../engine/refereeCareer';
import { lookFor } from '../engine/tale';
import type { Appearance, FightState } from '../engine/types';
import { L, LOC } from '../i18n';
import { buyErrorText, buy, PURCHASES, restorePurchases, useOwned, usePrice } from '../monetization';
import { REF_SKU, ULTIMATE_SKU } from '../monetization/skus';
import { actRef, retireRef, setRun, useHall, useRefRun } from '../refereeStore';
import { CageView } from './CageView';
import { AdOffer } from './AdOffer';
import { Bar, Button, CageBg, Card, Choice, Icon, Screen, SLANT, type IconName } from './components';
import { LookPicker } from './CreateScreen';
import { FullPackLink } from './ShopSheet';
import { FighterAvatar } from './FighterAvatar';
import { HubNav, type NavItem } from './HubNav';
import { C, F, R } from './theme';
import { canExtendTrial, extendTrial, TRIAL_EXT_MAX } from '../engine/referee';
import { useLook } from '../lookPref';
import { ArenaBackdrop } from './ArenaBackdrop';
import { cityTint } from './arenaArt';
import { CITIES } from '../engine/worldMap';
import { BroadcastScore } from './NewFight';
import { Standing } from './NewCareer';

export function useRefUnlocked() {
  const owned = useOwned();
  return !PURCHASES || owned.has(REF_SKU) || owned.has(ULTIMATE_SKU);
}

/** Hakem Modu satın alma kutusu. */
export function RefPack({ lead }: { lead?: string }) {
  const price = usePrice(REF_SKU);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  if (!PURCHASES) return null;
  return (
    <LinearGradient colors={['#2a0d10', '#140809']} style={rs.pack}>
      {lead ? <Text style={rs.packLead}>{lead}</Text> : null}
      <Text style={rs.packText}>{L("Tek seferlik alım: sınırsız hakemlik kariyeri, UCC şampiyonluk maçları ve Yılın Hakemi ödülleri.")}</Text>
      <Button
        label={price ? L("Hakem Modu · {0}", [price]) : L("Hakem Modu'nu al")}
        icon="whistle"
        tone="gold"
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          setMsg('');
          const r = await buy(REF_SKU);
          setBusy(false);
          if (r === 'ok') sfx('fanfare');
          else if (r === 'hata') setMsg(buyErrorText());
        }}
      />
      <Pressable onPress={async () => setMsg((await restorePurchases()) ? L("Satın alımların geri yüklendi.") : L("Bu hesapta satın alma bulunamadı."))} hitSlop={8} style={{ alignSelf: 'center', marginTop: 8 }}>
        <Text style={rs.link}>{L("Satın alımları geri yükle")}</Text>
      </Pressable>
      <FullPackLink kaynak="hakem_kilit" />
      {msg ? <Text style={rs.packText}>{msg}</Text> : null}
    </LinearGradient>
  );
}

export function RefereeScreen({ onExit }: { onExit: () => void }) {
  const r = useRefRun();
  const unlocked = useRefUnlocked();
  // Paket alındı (ya da geri yüklendi): deneme kalkar
  useEffect(() => {
    if (r?.deneme && unlocked) actRef((x) => (x.deneme = false));
  }, [r?.deneme, unlocked]);
  if (!r) return <RefStart unlocked={unlocked} onExit={onExit} />;
  if (r.emekli) return <RetiredView r={r} onExit={onExit} />;
  if (r.aktif) return <BoutView r={r} b={r.aktif} />;
  if (r.sinav) return <ExamView r={r} />;
  if (r.toren) return <Ceremony r={r} />;
  return <RefHub r={r} unlocked={unlocked} onExit={onExit} />;
}

// ---------- Başlangıç: hakemini oluştur ----------

const REF_COUNTRIES = ['tr', 'us', 'br', 'ru', 'pl', 'gb', 'ie', 'mx', 'jp', 'kz', 'az', 'ge'];
const countryName = (k?: string) => (k && COUNTRIES[k] ? COUNTRIES[k].ad : k ?? '');

const REF_STAND_KIT = { shorts: '#15161a', trim: '#fff', glove: '#000', ref: true } as const;
const REF_ARENA: Record<RefTier, 0 | 1 | 2 | 3> = { amator: 0, bolgesel: 1, buyuk: 2, ucc: 3 };
/** Yayın bandı için kısa organizasyon adı: uzun adların baş harfleri (Şehir Amatör Ligi → ŞAL). */
const shortOrg = (ad: string) => {
  const up = ad.toLocaleUpperCase(LOC);
  const w = up.split(/\s+/).filter(Boolean);
  return up.length <= 7 || w.length < 2 ? up : w.map((x) => x[0]).join('').slice(0, 5);
};
/** Hakem maçının şehri (ad olarak gelir) → ışık tonu. */
const tintOfCity = (ad?: string) => cityTint(CITIES.find((x) => x.ad === ad)?.id);

function RefStart({ unlocked, onExit }: { unlocked: boolean; onExit: () => void }) {
  const yeni = useLook() === 'yeni';
  const [ad, setAd] = useState('');
  const [soyad, setSoyad] = useState('');
  const [ulke, setUlke] = useState('tr');
  const [look, setLook] = useState<Appearance>({ ...DEFAULT_REF_LOOK });
  const [edit, setEdit] = useState(false);
  return (
    <Screen
      footer={
        <View style={{ gap: 8 }}>
          <Button
            label={unlocked ? L("Hakemliğe başla") : L("Ücretsiz dene ({0} maç)", [REF_TRIAL])}
            icon="whistle"
            tone="gold"
            onPress={() => {
              track('referee_start', { deneme: unlocked ? 0 : 1 });
              setRun(createRefRun(ad, soyad, !unlocked, { gorunum: look, ulke }));
            }}
          />
          <Button label={L("Menüye dön")} icon="arrow-left" tone="ghost" onPress={onExit} />
        </View>
      }
    >
      <LinearGradient colors={['#2a0d10', '#0d0a0b']} style={[rs.hero, yeni && rs.stageHero]}>
        {yeni ? (
          <>
            {/* Kafesin ortasında sen: seçtiğin görünümle tam boy hakem, arkada amatör salon */}
            <ArenaBackdrop tier={0} dim={0.3} tint="#c1121f" />
            <View style={rs.refFig} pointerEvents="none">
              <Standing look={look} kit={REF_STAND_KIT} h={250} pose="refIdle" />
            </View>
            <LinearGradient colors={['rgba(13,10,11,0.8)', 'rgba(13,10,11,0)', 'rgba(13,10,11,0.92)']} locations={[0, 0.35, 0.9]} style={StyleSheet.absoluteFill} pointerEvents="none" />
          </>
        ) : null}
        {yeni ? null : <Icon name="whistle" size={36} color={C.red} />}
        <Text style={[rs.heroTitle, SLANT]}>{L("HAKEM MODU")}</Text>
        <Text style={rs.heroText}>{L("Kafesin içindeki üçüncü kişi sensin. Bir dövüşçünün kariyerini, hatta hayatını korumak senin kararına bağlı.")}</Text>
      </LinearGradient>
      <View style={{ gap: 10, marginVertical: 14 }}>
        {(
          [
            ['hand-back-left', L("Kafeste maçı canlı izle: sarsılan dövüşçü, sıkılan kilit, faul, kesik… durdur ya da devam ettir.")],
            ['clipboard-text', L("Her raunt sonunda istatistiklere bakıp puan kartını doldur: 10-9, 10-8, 10-10.")],
            ['calendar-star', L("Organizasyonların tekliflerinden maçını seç: alt kart, ana kart, ünvan maçı.")],
            ['chart-line', L("Beceri puanlarıyla okuma, pozisyon, sakinlik ve kural bilgini geliştir.")],
            ['cellphone-message', L("Sosyal medya, basın, sponsorlar ve komisyon: her kararın bir yankısı var.")],
            ['trophy', L("Amatör gecelerden UCC'ye yüksel, Yılın Hakemi töreninde sahneye çık.")],
          ] as [IconName, string][]
        ).map(([icon, t]) => (
          <View key={icon} style={rs.bullet}>
            <Icon name={icon} size={18} color={C.red} />
            <Text style={rs.bulletText}>{t}</Text>
          </View>
        ))}
      </View>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <FighterAvatar look={look} size={72} ring={C.red} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={rs.label}>{L("HAKEMİN ADI")}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput value={ad} onChangeText={setAd} placeholder={L("Ad")} placeholderTextColor={C.faint} style={[rs.input, { flex: 1, minWidth: 0, width: 0 }]} maxLength={16} />
              <TextInput value={soyad} onChangeText={setSoyad} placeholder={L("Soyad")} placeholderTextColor={C.faint} style={[rs.input, { flex: 1, minWidth: 0, width: 0 }]} maxLength={18} />
            </View>
          </View>
        </View>
        <Text style={[rs.label, { marginTop: 12 }]}>{L("ÜLKE")}</Text>
        <View style={rs.chips}>
          {REF_COUNTRIES.filter((k) => COUNTRIES[k]).map((k) => (
            <Pressable key={k} onPress={() => setUlke(k)} style={[rs.chip, ulke === k && rs.chipOn]}>
              <Text style={[rs.chipText, ulke === k && { color: '#1a0406' }]}>{COUNTRIES[k].ad}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ marginTop: 12 }}>
          <Button label={edit ? L("Görünümü kapat") : L("Görünümünü oluştur")} icon="account-edit" tone="ghost" onPress={() => setEdit(!edit)} />
        </View>
      </Card>
      {edit ? <LookPicker look={look} onChange={setLook} /> : null}
      {!unlocked ? <RefPack lead={L("İlk {0} maç ücretsiz.", [REF_TRIAL])} /> : null}
    </Screen>
  );
}

// ---------- Kariyer merkezi ----------

type Tab = 'kariyer' | 'gelisim' | 'hayat' | 'profil';

function RefHub({ r, unlocked, onExit }: { r: RefRun; unlocked: boolean; onExit: () => void }) {
  const [tab, setTab] = useState<Tab>('kariyer');
  const nav: NavItem<Tab>[] = [
    { key: 'kariyer', label: L("Kariyer"), icon: 'whistle', badge: r.olay ? '!' : null },
    { key: 'gelisim', label: L("Gelişim"), icon: 'chart-line', badge: pendingPerks(r).length ? '★' : (r.bp ?? 0) > 0 ? r.bp : null },
    { key: 'hayat', label: L("Hayat"), icon: 'cellphone-message' },
    { key: 'profil', label: L("Profil"), icon: 'account' },
  ];
  return (
    <Screen key={tab} footer={<HubNav items={nav} value={tab} onChange={setTab} />}>
      <RefHero r={r} />
      {tab === 'kariyer' ? <CareerTab r={r} unlocked={unlocked} onExit={onExit} /> : null}
      {tab === 'gelisim' ? <GrowthTab r={r} /> : null}
      {tab === 'hayat' ? <LifeTab r={r} /> : null}
      {tab === 'profil' ? <ProfileTab r={r} onExit={onExit} /> : null}
    </Screen>
  );
}

function RefHero({ r }: { r: RefRun }) {
  const tc = TIER_COLOR[r.seviye];
  const yeni = useLook() === 'yeni';
  return (
    <LinearGradient colors={r.seviye === 'ucc' ? ['#2e2206', '#0e0c07', '#08090b'] : ['#240710', '#0e0f12', '#08090b']} locations={[0, 0.55, 1]} style={[rs.heroCard, yeni && { borderColor: tc + '88', paddingTop: 90 }]}>
      {yeni ? (
        <>
          <ArenaBackdrop tier={REF_ARENA[r.seviye]} gold={r.seviye === 'ucc'} tint={null} dim={0.2} />
          <LinearGradient colors={['rgba(8,9,11,0.1)', 'rgba(8,9,11,0.55)', 'rgba(8,9,11,0.95)']} locations={[0, 0.35, 0.7]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        </>
      ) : (
        <CageBg opacity={0.05} />
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <FighterAvatar look={r.gorunum ?? DEFAULT_REF_LOOK} size={64} ring={tc} />
        <View style={{ flex: 1 }}>
          <Text style={rs.nick}>{L("🏁 HAKEM")}</Text>
          <Text style={[rs.name, SLANT]} numberOfLines={1} adjustsFontSizeToFit>
            {`${r.ad} ${r.soyad}`.trim().toLocaleUpperCase(LOC)}
          </Text>
          <View style={rs.heroChips}>
            <Text style={[rs.heroChip, { color: tc }]}>{TIER_NAME[r.seviye]().toLocaleUpperCase(LOC)}</Text>
            <Text style={rs.dot}>•</Text>
            <Text style={rs.heroChip}>{countryName(r.ulke).toLocaleUpperCase(LOC)}</Text>
            <Text style={rs.dot}>•</Text>
            <Text style={[rs.heroChip, { color: C.text }]}>{L("#{0} SIRALAMA", [myRank(r)])}</Text>
          </View>
        </View>
      </View>
      <View style={rs.meters}>
        <Meter label={L("MAÇ")} value={String(r.mac)} />
        <Meter label={L("PARA")} value={money(r.para ?? 0)} color={C.green} />
        <Meter label={L("TAKİPÇİ")} value={fmtFollowers(r.takipci ?? 0)} color={C.gold} />
      </View>
      <View style={{ marginTop: 8 }}>
        <Bar value={r.itibar} color={C.gold} label={L("Komisyon güveni")} right={String(r.itibar)} />
        <Bar value={saygi(r)} color={C.green} label={L("Dövüşçü saygısı")} right={String(saygi(r))} />
        <Bar value={imaj(r)} color={C.blue} label={L("Taraftar imajı")} right={String(imaj(r))} />
      </View>
      <View style={[rs.heroChips, { marginTop: 4 }]}>
        <Text style={[rs.heroChip, { color: C.text }]}>{L("TARZ: {0}", [TARZ_NAME[tarzOf(r)]().toLocaleUpperCase(LOC)])}</Text>
        <Text style={rs.dot}>•</Text>
        <Text style={[rs.heroChip, { color: yorgun(r) >= 60 ? C.orange : C.dim }]}>{L("YORGUNLUK %{0}", [yorgun(r)])}</Text>
      </View>
    </LinearGradient>
  );
}

function Meter({ label, value, color = C.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={rs.meter}>
      <Text style={rs.meterLabel}>{label}</Text>
      <Text style={[rs.meterVal, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function CareerTab({ r, unlocked, onExit }: { r: RefRun; unlocked: boolean; onExit: () => void }) {
  const kilit = trialOver(r) && !unlocked;
  const req = promoteReq(r);
  return (
    <>
      {r.olay ? <EventCard r={r} /> : null}
      {r.sonMesaj && !r.olay ? (
        <View style={rs.notice}>
          <Icon name="information" size={18} color={C.gold} />
          <Text style={rs.noticeText}>{r.sonMesaj}</Text>
        </View>
      ) : null}
      {r.son ? <LastBout r={r} /> : null}
      {kilit && canExtendTrial(r) ? <AdOffer yer="deneme_hakem" icon="play-circle" title={L("Bir maç daha yönet")} desc={L("Kısa bir reklam izle, bir maç daha hakemlik yap. Kalan hak: {0}", [TRIAL_EXT_MAX - (r.ek ?? 0)])} onReward={() => actRef(extendTrial)} /> : null}
      {kilit ? <RefPack lead={L("Deneme bitti. Kafes seni bekliyor:")} /> : null}
      {r.sozlesme ? (
        <View style={[rs.notice, { borderColor: C.gold }]}>
          <Icon name="file-sign" size={18} color={C.gold} />
          <Text style={rs.noticeText}>{L("Sözleşme: {0} · {1} maç kaldı · ücretler ×{2}", [r.sozlesme.orgAd, r.sozlesme.kalan, String(r.sozlesme.carpan).replace('.', ',')])}</Text>
        </View>
      ) : null}
      {yorgun(r) >= 60 ? (
        <View style={[rs.notice, { borderColor: C.orange + '88', backgroundColor: '#1d140b' }]}>
          <Icon name="sleep" size={18} color={C.orange} />
          <Text style={rs.noticeText}>{L("Yorgunsun: okuma ve pozisyon becerilerin maçta bir seviye düşük çalışır. Bir hafta dinlenmeyi düşün.")}</Text>
        </View>
      ) : null}
      <Text style={rs.section}>{L("MAÇ TEKLİFLERİ")}</Text>
      {(r.teklifler ?? []).map((o, i) => (
        <OfferCard key={i} o={o} disabled={kilit || !!r.olay} onPress={() => {
          track('referee_bout', { anaKart: o.anaKart ? 1 : 0, unvan: o.unvan ? 1 : 0 });
          sfx('bell');
          actRef((x) => startBout(x, i));
        }} />
      ))}
      {!kilit && !r.olay && canRefreshRefOffers(r) ? (
        <AdOffer yer="hakem_teklif" icon="phone-refresh" title={L("Teklifleri yenile")} desc={L("Birkaç telefon aç: organizasyonları kırmadan yeni maç teklifleri gelsin.")} onReward={() => actRef(refreshRefOffers)} />
      ) : null}
      {r.olay ? <Text style={rs.small}>{L("Önce bekleyen durumu çöz.")}</Text> : null}
      <Button
        label={L("Bu hafta dinlen · yorgunluk -45")}
        icon="sleep"
        tone="ghost"
        disabled={kilit || !!r.olay || yorgun(r) === 0}
        onPress={() => actRef(restWeek)}
      />
      <Card>
        <Text style={rs.kicker}>{L("KARİYER YOLU")}</Text>
        <Bar value={r.itibar} color={r.itibar >= 70 ? C.gold : r.itibar >= 35 ? C.green : C.orange} label={L("İtibar")} right={`${r.itibar}/100`} />
        <Text style={rs.small}>
          {req ? L("Terfi için: itibar {0} ve {1} maç ({2}/{1}), ardından lisans sınavı", [req[0], req[1], r.mac]) : r.itibar >= 85 ? L("UCC şampiyonluk maçlarına atanabilirsin.") : L("Şampiyonluk maçları için itibar 85.")}
        </Text>
        {(r.sinavBekle ?? 0) > r.mac ? <Text style={[rs.small, { color: C.orange }]}>{L("Lisans sınavına yeniden girmek için {0} maç daha.", [(r.sinavBekle ?? 0) - r.mac])}</Text> : null}
        <Text style={rs.small}>{L("Bu yıl {0}/{1} maç · yıl sonunda Yılın Hakemi töreni", [r.yilMac, YEAR_BOUTS])}</Text>
      </Card>
      <Button label={L("Menüye dön")} icon="arrow-left" tone="ghost" onPress={onExit} />
    </>
  );
}

function OfferCard({ o, onPress, disabled }: { o: RefOffer; onPress: () => void; disabled?: boolean }) {
  const accent = o.unvan ? C.gold : o.anaKart ? C.red : C.border;
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [{ opacity: disabled ? 0.45 : pressed ? 0.85 : 1, marginBottom: 8 }]}>
      <LinearGradient colors={o.unvan ? ['#3a2a06', '#141007'] : o.anaKart ? ['#2a0b10', '#121014'] : ['#16181d', '#101115']} style={[rs.offer, { borderColor: accent }]}>
        <View style={[rs.offerIcon, { borderColor: accent }]}>
          <Icon name={o.unvan ? 'trophy' : o.anaKart ? 'star' : 'whistle'} size={22} color={o.unvan ? C.gold : o.anaKart ? C.red : C.dim} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {o.sozlesme ? <Text style={[rs.badge, { backgroundColor: C.gold }]}>{L("SÖZLEŞME · {0} MAÇ", [CONTRACT_BOUTS])}</Text> : null}
            {o.unvan ? <Text style={[rs.badge, { backgroundColor: C.gold }]}>{L("ÜNVAN MAÇI")}</Text> : o.anaKart ? <Text style={[rs.badge, { backgroundColor: C.red, color: '#fff' }]}>{L("ANA KART")}</Text> : <Text style={[rs.badge, { backgroundColor: '#2a2d35', color: C.dim }]}>{L("ALT KART")}</Text>}
            <Text style={rs.offerCity}>{o.sehir}</Text>
          </View>
          <Text style={[rs.offerOrg, SLANT]} numberOfLines={1}>
            {o.org}
          </Text>
          <Text style={rs.offerSub}>{o.unvan ? L("5 raunt · baskı yüksek, itibar etkisi büyük") : o.anaKart ? L("3 raunt · gözler üstünde, itibar etkisi daha büyük") : L("3 raunt · sakin bir gece")}</Text>
          {o.sozlesme ? <Text style={[rs.offerSub, { color: C.gold }]}>{L("İmzalarsan sonraki {0} maçın bu organizasyondan gelir; ücretler daha yüksek, ünvan maçı şansı artar.", [CONTRACT_BOUTS])}</Text> : null}
          <View style={ds.chips}>
            {(o.etiketler ?? []).map((t) => (
              <View key={t} style={[ds.chip, { borderColor: C.orange + '88' }]}>
                <Icon name={TAG_INFO[t].icon as IconName} size={11} color={C.orange} />
                <Text style={[ds.chipT, { color: C.orange }]}>{TAG_INFO[t].ad()}</Text>
              </View>
            ))}
            {o.yayin ? <Text style={ds.chipPlain}>{L("📺 Canlı yayın")}</Text> : null}
            {o.uzak ? <Text style={ds.chipPlain}>{L("✈️ Uzak şehir")}</Text> : null}
            {o.evSahibi ? <Text style={ds.chipPlain}>{L("🏟️ Ev sahibi salon")}</Text> : null}
            {o.tarzUyum ? <Text style={[ds.chipPlain, { color: C.green, borderColor: C.green + '66' }]}>{L("👍 Tarzını seviyor")}</Text> : null}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={rs.offerPay}>{money(o.ucret)}</Text>
          <Icon name="chevron-right" size={22} color={C.dim} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function EventCard({ r }: { r: RefRun }) {
  const ev = r.olay!;
  return (
    <Card accent={C.orange}>
      <Text style={[rs.kicker, { color: C.orange }]}>{ev.baslik}</Text>
      <Text style={rs.text}>{ev.metin}</Text>
      {ev.secenekler.map((o, i) => (
        <Choice key={i} label={o.ad} onPress={() => actRef((x) => chooseEvent(x, i))} />
      ))}
    </Card>
  );
}

const KIND_ICON: Record<string, string> = { sarsildi: '💥', kilit: '🔒', faul: '⚠️', kesik: '🩸', durgun: '⏸️' };

function LastBout({ r }: { r: RefRun }) {
  const s = r.son!;
  return (
    <Card accent={s.puan >= 5 ? C.green : s.puan >= -4 ? C.orange : C.red}>
      <Text style={rs.kicker}>{L("SON MAÇ · {0}", [s.sonuc.toLocaleUpperCase(LOC)])}</Text>
      <Text style={[rs.verdict, SLANT, { color: s.puan >= 5 ? C.gold : s.puan >= -4 ? C.text : C.red }]}>{s.not}</Text>
      <Text style={rs.small}>{L("Maç puanın {0} · itibar {1}", [s.puan, s.itibar >= 0 ? `+${s.itibar}` : s.itibar])}</Text>
      {s.para != null ? (
        <View style={rs.gains}>
          <Text style={[rs.gain, { color: C.green }]}>+{money(s.para)}</Text>
          {s.bonus ? <Text style={[rs.gain, { color: C.gold }]}>{L("Gecenin hakemi bonusu")}</Text> : null}
          <Text style={[rs.gain, { color: C.gold }]}>+{fmtFollowers(s.takipci ?? 0)} {L("takipçi")}</Text>
          {s.bp ? <Text style={[rs.gain, { color: C.blue }]}>+{s.bp} {L("beceri puanı")}</Text> : null}
        </View>
      ) : null}
      {s.saygi != null ? <Text style={rs.small}>{L("Komisyon {0} · Saygı {1} · İmaj {2}", [sign(s.itibar), sign(s.saygi), sign(s.imaj ?? 0)])}</Text> : null}
      {s.mentor ? <Text style={[rs.text, { color: C.gold }]}>🎯 {s.mentor}</Text> : null}
      {s.sinav ? <Text style={[rs.text, { color: C.gold, fontFamily: F.bold }]}>{L("🎓 Terfi şartlarını tamamladın: lisans sınavı seni bekliyor.")}</Text> : null}
      {s.terfi ? <Text style={[rs.text, { color: C.gold, fontFamily: F.bold }]}>{L("⬆️ TERFİ! Artık {0} maçlarını yönetiyorsun.", [TIER_NAME[s.terfi]()])}</Text> : null}
      {s.kararlar.map((k, i) => (
        <View key={i}>
          <Text style={[rs.small, { color: k.puan > 0 ? C.green : k.puan < 0 ? C.red : C.dim }]}>
            {KIND_ICON[k.kind]} {k.not}
          </Text>
          {s.analiz && k.dogru ? (
            <View style={ds.analysis}>
              <Text style={ds.anaLine}>{L("Senin kararın: {0} · Doğrusu: {1}", [k.secilen ?? '', k.dogru])}</Text>
              {k.neden ? <Text style={ds.anaWhy}>{k.neden}</Text> : null}
            </View>
          ) : null}
        </View>
      ))}
      {!s.analiz && s.kararlar.some((k) => k.dogru) ? (
        <Button
          label={L("Maçı analiz et · +1 beceri puanı")}
          icon="movie-search"
          tone="ghost"
          onPress={() =>
            actRef((x) => {
              if (x.son && !x.son.analiz) {
                x.son.analiz = true;
                x.bp = (x.bp ?? 0) + 1;
              }
            })
          }
        />
      ) : null}
      {s.kartlar.length ? <Text style={rs.small}>{L("Puan kartları: {0}/{1} birebir", [s.kartlar.filter((k) => k.benim === k.dogru).length, s.kartlar.length])}</Text> : null}
    </Card>
  );
}

// ---------- Gelişim ----------

function GrowthTab({ r }: { r: RefRun }) {
  const pend = pendingPerks(r);
  const req = promoteReq(r);
  return (
    <>
      {pend.map((slot) => {
        const sk = REF_SKILLS.find((x) => slot.startsWith(x.key))!;
        return (
          <Card key={slot} accent={C.gold}>
            <Text style={rs.kicker}>{L("UZMANLIK SEÇ · {0} {1}", [sk.ad().toLocaleUpperCase(LOC), slot.slice(-1)])}</Text>
            <Text style={rs.small}>{L("İkisinden birini seç; seçimin kalıcı.")}</Text>
            {(['a', 'b'] as const).map((v) => (
              <Choice
                key={v}
                label={PERKS[slot][v].ad()}
                desc={PERKS[slot][v].acik()}
                tone="gold"
                onPress={() => {
                  sfx('chime');
                  actRef((x) => choosePerk(x, slot, v));
                }}
              />
            ))}
          </Card>
        );
      })}
      <MentorCard r={r} />
      <Card>
        <Text style={rs.kicker}>{L("LİSANS")}</Text>
        <Text style={rs.text}>{L("Şu anki lisansın: {0}", [TIER_NAME[r.seviye]()])}</Text>
        <Text style={rs.small}>
          {req
            ? L("Sıradaki lisans için komisyon güveni {0} ve {1} maç gerekir; sonra {2} soruluk kural sınavına girersin ({3} doğru yeter).", [req[0], req[1], 5, EXAM_PASS])
            : L("En üst lisanstasın: UCC.")}
        </Text>
      </Card>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={rs.kicker}>{L("BECERİLER")}</Text>
          <Text style={[rs.kicker, { color: (r.bp ?? 0) > 0 ? C.gold : C.faint }]}>{L("{0} PUAN", [r.bp ?? 0])}</Text>
        </View>
        <Text style={rs.small}>{L("Beceri puanı: iyi yönetilen maç +1, kusursuz maç +2, terfi +2, seminerler ve olaylar.")}</Text>
        {REF_SKILLS.map((sk) => {
          const lv = skillLvl(r, sk.key);
          const cost = skillCost(lv);
          const can = lv < SKILL_MAX && (r.bp ?? 0) >= cost;
          return (
            <View key={sk.key} style={rs.skill}>
              <View style={rs.skillIcon}>
                <Icon name={sk.icon as IconName} size={20} color={lv ? C.gold : C.dim} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={rs.skillName}>{sk.ad()}</Text>
                  <View style={{ flexDirection: 'row', gap: 3 }}>
                    {Array.from({ length: SKILL_MAX }, (_, i) => (
                      <View key={i} style={[rs.pip, i < lv && { backgroundColor: C.gold, borderColor: C.gold }]} />
                    ))}
                  </View>
                </View>
                <Text style={rs.skillDesc}>{sk.acik()}</Text>
                {([3, 5] as const).map((n) => {
                  const v = r.uzmanlik?.[`${sk.key}${n}` as PerkSlot];
                  return v ? (
                    <Text key={n} style={ds.perk}>
                      ★ {PERKS[`${sk.key}${n}` as PerkSlot][v].ad()}
                    </Text>
                  ) : lv < n ? (
                    <Text key={n} style={[ds.perk, { color: C.faint }]}>{L("Seviye {0}: uzmanlık seçimi", [n])}</Text>
                  ) : null;
                })}
              </View>
              <Pressable
                disabled={!can}
                onPress={() => {
                  sfx('chime');
                  actRef((x) => upgradeSkill(x, sk.key));
                }}
                style={[rs.plus, !can && { opacity: 0.35 }]}
              >
                <Icon name="plus" size={18} color="#fff" />
                {lv < SKILL_MAX ? <Text style={rs.plusCost}>{cost}</Text> : null}
              </Pressable>
            </View>
          );
        })}
      </Card>
      <Card>
        <Text style={rs.kicker}>{L("SEMİNERLER")}</Text>
        <Text style={rs.small}>{r.seminer ? L("Bu maç arasında seminer aldın. Sıradaki maçtan sonra yenisi açılır.") : L("Maçlar arasında bir seminere katılabilirsin.")}</Text>
        {SEMINARS.map((s) => {
          const cost = seminarCost(r, s.id);
          const ok = !r.seminer && (r.para ?? 0) >= cost;
          return <Choice key={s.id} label={`${s.ad()} · ${money(cost)}`} desc={`${s.acik()} +${s.bp} ${L("beceri puanı")}`} tone="gold" disabled={!ok} onPress={() => actRef((x) => takeSeminar(x, s.id))} />;
        })}
      </Card>
    </>
  );
}

// ---------- Hayat ----------

function LifeTab({ r }: { r: RefRun }) {
  const akis = r.akis ?? [];
  return (
    <>
      <Card>
        <Text style={rs.kicker}>{L("SOSYAL MEDYA")}</Text>
        <Text style={rs.small}>{L("{0} takipçi · ün {1}/100", [fmtFollowers(r.takipci ?? 0), r.un ?? 0])}</Text>
        {!akis.length ? <Text style={rs.text}>{L("Henüz kimse senden bahsetmiyor. İlk maçından sonra herkes konuşacak.")}</Text> : null}
        {akis.slice(0, 12).map((p, i) => (
          <View key={i} style={rs.post}>
            <View style={[rs.postAvatar, { backgroundColor: p.ton === 'iyi' ? '#1d3a26' : p.ton === 'kotu' ? '#3a1a1d' : '#22252c' }]}>
              <Text style={rs.postInit}>{p.kim.slice(0, 1).toLocaleUpperCase(LOC)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={rs.postName} numberOfLines={1}>
                {p.kim} <Text style={rs.postHandle}>{p.kul}</Text>
              </Text>
              <Text style={rs.postText}>{p.metin}</Text>
              <Text style={rs.postLike}>♥ {fmtFollowers(p.begeni)}</Text>
            </View>
          </View>
        ))}
      </Card>
      <Card>
        <Text style={rs.kicker}>{L("ÖDÜLLER")}</Text>
        {r.oduller.length ? r.oduller.map((o, i) => <Text key={i} style={rs.text}>🏆 {o}</Text>) : <Text style={rs.small}>{L("Henüz ödül yok. Her yıl sonu Yılın Hakemi töreni yapılır.")}</Text>}
      </Card>
    </>
  );
}

// ---------- Profil ----------

function ProfileTab({ r, onExit }: { r: RefRun; onExit: () => void }) {
  const [edit, setEdit] = useState(false);
  const rank = refRanking(r);
  const stats: [string, string][] = [
    [L("Maç"), String(r.mac)],
    [L("Kusursuz"), String(r.kusursuz)],
    [L("Ünvan maçı"), String(r.unvanMaci)],
    [L("Doğru karar"), String(r.dogru)],
    [L("Hatalı karar"), String(r.yanlis)],
    [L("Toplam kazanç"), money(r.kazanc ?? 0)],
  ];
  return (
    <>
      <Card>
        <Text style={rs.kicker}>{L("İSTATİSTİKLER")}</Text>
        <View style={rs.grid}>
          {stats.map(([k, v]) => (
            <View key={k} style={rs.cell}>
              <Text style={rs.cellVal}>{v}</Text>
              <Text style={rs.cellLab}>{k}</Text>
            </View>
          ))}
        </View>
        <Button label={edit ? L("Görünümü kapat") : L("Görünümü düzenle")} icon="account-edit" tone="ghost" onPress={() => setEdit(!edit)} />
      </Card>
      {edit ? <LookPicker look={r.gorunum ?? DEFAULT_REF_LOOK} onChange={(g) => actRef((x) => (x.gorunum = g))} /> : null}
      <StyleCard r={r} />
      <OrgsCard r={r} />
      <OutfitCard r={r} />
      {r.hafiza?.length ? (
        <Card>
          <Text style={rs.kicker}>{L("SENİ HATIRLAYANLAR")}</Text>
          <Text style={rs.small}>{L("Bu dövüşçüler bir gün yine senin maçına çıkabilir.")}</Text>
          {r.hafiza.slice(0, 6).map((h) => (
            <Text key={h.ad} style={rs.text}>
              👀 {h.ad} · {HATIRA_METIN[h.neden]()}
            </Text>
          ))}
        </Card>
      ) : null}
      <Card>
        <Text style={rs.kicker}>{L("HAKEM SIRALAMASI")}</Text>
        {r.rakipHakem ? <Text style={rs.small}>{L("⚔️ Ezeli rakibin: {0}. Basın sizi sürekli kıyaslıyor.", [r.rakipHakem])}</Text> : null}
        {rank.map((x, i) => (
          <View key={i} style={[rs.rankRow, x.sen && rs.rankMe]}>
            <Text style={[rs.rankNo, i < 3 && { color: C.gold }]}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[rs.rankName, x.sen && { color: C.gold }]} numberOfLines={1}>
                {x.sen ? L("{0} (SEN)", [x.ad]) : x.ad === r.rakipHakem ? `⚔️ ${x.ad}` : x.ad}
              </Text>
              <Text style={rs.rankSub}>
                {TIER_NAME[x.tier]()} · {x.sen ? countryName(x.ulke) : x.ulke}
              </Text>
            </View>
            <Text style={rs.rankPts}>{x.itibar}</Text>
          </View>
        ))}
      </Card>
      {r.gecmis.length ? (
        <Card>
          <Text style={rs.kicker}>{L("SON MAÇLAR")}</Text>
          {r.gecmis.slice(0, 10).map((g, i) => (
            <View key={i} style={rs.hist}>
              <Text style={rs.histName} numberOfLines={1}>
                {g.a.split(' ').slice(-1)[0]} – {g.b.split(' ').slice(-1)[0]}
              </Text>
              <Text style={[rs.histNote, { color: g.puan >= 5 ? C.green : g.puan >= -4 ? C.dim : C.red }]} numberOfLines={1}>
                {g.not}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
      <RetireCard r={r} />
      <HallCard />
      <Button label={L("Menüye dön")} icon="arrow-left" tone="ghost" onPress={onExit} />
    </>
  );
}

const sign = (n: number) => (n > 0 ? `+${n}` : String(n));

function MentorCard({ r }: { r: RefRun }) {
  const t = r.mentor;
  return (
    <Card>
      <Text style={rs.kicker}>{L("MENTOR · {0}", [(r.mentorAd ?? '').toLocaleUpperCase(LOC)])}</Text>
      {t ? (
        <>
          <Text style={rs.text}>🎯 {mentorText(t)}</Text>
          <Bar value={(t.ilerleme / t.hedef) * 100} color={C.gold} label={L("İlerleme")} right={`${t.ilerleme}/${t.hedef}`} />
          <Text style={rs.small}>{L("Ödül: +2 beceri puanı ve para. Tamamlanan görev sayısı: {0}", [r.mentorTamam ?? 0])}</Text>
        </>
      ) : (
        <Text style={rs.small}>{L("İki maç yönettikten sonra kıdemli bir hakem sana görevler vermeye başlayacak.")}</Text>
      )}
    </Card>
  );
}

function StyleCard({ r }: { r: RefRun }) {
  const t = tarzOf(r);
  const sev = TIER_ORGS[r.seviye].filter((o) => ORG_TARZ[o] === t).map(orgName);
  return (
    <Card>
      <Text style={rs.kicker}>{L("HAKEM TARZIN")}</Text>
      <Text style={[rs.verdict, SLANT]}>{TARZ_NAME[t]()}</Text>
      <Text style={rs.small}>{TARZ_ACIK[t]()}</Text>
      <View style={ds.styleTrack}>
        <View style={[ds.styleDot, { left: `${Math.round(((r.tarz ?? 0) + 100) / 2)}%` }]} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={ds.styleEnd}>{TARZ_NAME.koruyucu()}</Text>
        <Text style={ds.styleEnd}>{TARZ_NAME.serbest()}</Text>
      </View>
      <Text style={rs.small}>{L("Tarzın gri anlardaki ve hatalı kararlarından oluşur. Tarzını seven organizasyonlar daha çok öder.")}</Text>
      {sev.length ? <Text style={[rs.small, { color: C.green }]}>{L("Tarzını sevenler: {0}", [sev.join(', ')])}</Text> : null}
    </Card>
  );
}

function OrgsCard({ r }: { r: RefRun }) {
  return (
    <Card>
      <Text style={rs.kicker}>{L("ORGANİZASYONLAR")}</Text>
      <Text style={rs.small}>{L("Teklifi kabul ettiğin organizasyonla ilişkin güçlenir, geri çevirdiklerinle biraz bozulur. İlişkisi 20'yi geçen organizasyon sözleşme teklif edebilir.")}</Text>
      {TIER_ORGS[r.seviye].map((o) => {
        const v = iliski(r, o);
        return (
          <View key={o} style={ds.orgRow}>
            <View style={{ flex: 1 }}>
              <Text style={rs.text} numberOfLines={1}>
                {orgName(o)}
              </Text>
              <Text style={ds.orgSub}>{L("Sevdiği tarz: {0}", [TARZ_NAME[ORG_TARZ[o]]()])}</Text>
            </View>
            <Text style={[ds.orgVal, { color: v >= 20 ? C.gold : v > 0 ? C.green : v < 0 ? C.red : C.dim }]}>{sign(v)}</Text>
          </View>
        );
      })}
    </Card>
  );
}

function OutfitCard({ r }: { r: RefRun }) {
  return (
    <Card>
      <Text style={rs.kicker}>{L("HAKEM KIYAFETİ")}</Text>
      <Text style={rs.small}>{L("Yalnızca görünüm: kafeste gömleğin bu renkte olur.")}</Text>
      <View style={ds.outfits}>
        {KIYAFETLER.map((k) => {
          const acik = k.acik(r);
          const sec = (r.kiyafet ?? 'klasik') === k.id;
          return (
            <Pressable key={k.id} disabled={!acik} onPress={() => actRef((x) => (x.kiyafet = k.id))} style={[ds.outfit, sec && { borderColor: C.gold }, !acik && { opacity: 0.45 }]}>
              <View style={[ds.swatch, { backgroundColor: k.renk }]}>{!acik ? <Icon name="lock" size={14} color="#fff" /> : null}</View>
              <Text style={ds.outfitName} numberOfLines={1}>
                {k.ad()}
              </Text>
              <Text style={ds.outfitReq} numberOfLines={2}>
                {acik ? (sec ? L("Giyiliyor") : L("Giy")) : k.kosul()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

function RetireCard({ r }: { r: RefRun }) {
  const [ask, setAsk] = useState(false);
  if (r.mac < RETIRE_MIN) return <Text style={[rs.small, { marginBottom: 10 }]}>{L("Emeklilik {0} maçtan sonra açılır.", [RETIRE_MIN])}</Text>;
  return (
    <Card>
      <Text style={rs.kicker}>{L("EMEKLİLİK")}</Text>
      <Text style={rs.small}>{hallWorthy(r) ? L("Bugün bırakırsan adın Hakem Onur Listesi'ne yazılır.") : L("Onur Listesi için: iki Yılın Hakemi ödülü, 25 kusursuz maç ya da UCC'de 60 maç ve 80 komisyon güveni.")}</Text>
      {!ask ? (
        <Button label={L("Kariyerini noktala")} icon="flag-checkered" tone="ghost" onPress={() => setAsk(true)} />
      ) : (
        <>
          <Text style={rs.text}>{L("Emeklilikten sonra ne yapacaksın? Bu karar kalıcı.")}</Text>
          <Choice label={L("Hakem eğitmeni ol")} desc={L("Yeni nesil hakemleri yetiştir.")} tone="gold" onPress={() => retireRef('egitmen')} />
          <Choice label={L("TV yorumcusu ol")} desc={L("Maçları bu kez stüdyodan yorumla.")} tone="gold" onPress={() => retireRef('yorumcu')} />
          <Button label={L("Vazgeç")} tone="ghost" onPress={() => setAsk(false)} />
        </>
      )}
    </Card>
  );
}

function HallCard() {
  const hall = useHall();
  if (!hall.length) return null;
  return (
    <Card>
      <Text style={rs.kicker}>{L("HAKEM ONUR LİSTESİ")}</Text>
      {hall.map((h, i) => (
        <Text key={i} style={rs.text}>
          {h.onur ? '🏛️' : '🏁'} {h.ad} · {TIER_NAME[h.seviye]()} · {L("{0} maç", [h.mac])}
          {h.oduller ? ` · 🏆${h.oduller}` : ''}
        </Text>
      ))}
    </Card>
  );
}

// ---------- Lisans sınavı ----------

function ExamView({ r }: { r: RefRun }) {
  const ex = r.sinav!;
  const [goster, setGoster] = useState<number | null>(null);
  const i = ex.cevap.findIndex((c) => c == null);
  const bitti = i < 0;
  const dogru = ex.sorular.filter((q, j) => ex.cevap[j] === EXAM_QUESTIONS[q].d).length;
  const q = goster != null ? EXAM_QUESTIONS[ex.sorular[goster]] : !bitti ? EXAM_QUESTIONS[ex.sorular[i]] : null;
  return (
    <Screen>
      <Card accent={C.gold}>
        <Text style={rs.kicker}>{L("LİSANS SINAVI · {0}", [TIER_NAME[ex.tier]().toLocaleUpperCase(LOC)])}</Text>
        <Text style={rs.small}>{L("{0} soru · geçmek için {1} doğru. Kalırsan iki maç sonra yeniden girebilirsin.", [ex.sorular.length, EXAM_PASS])}</Text>
        <Bar value={(ex.cevap.filter((c) => c != null).length / ex.sorular.length) * 100} color={C.gold} right={`${ex.cevap.filter((c) => c != null).length}/${ex.sorular.length}`} />
      </Card>
      {q ? (
        <Card>
          <Text style={rs.kicker}>{L("SORU {0}", [(goster ?? i) + 1])}</Text>
          <Text style={rs.text}>{q.q()}</Text>
          {q.a.map((a, k) => {
            const cev = goster != null ? ex.cevap[goster] : null;
            const tone = cev == null ? 'plain' : k === q.d ? 'gold' : k === cev ? 'red' : 'plain';
            return (
              <Choice
                key={k}
                label={a()}
                tone={tone}
                selected={cev === k}
                disabled={cev != null}
                onPress={() => {
                  actRef((x) => answerExam(x, i, k));
                  setGoster(i);
                  sfx(k === q.d ? 'chime' : 'click');
                }}
              />
            );
          })}
          {goster != null ? (
            <>
              <Text style={[rs.text, { color: ex.cevap[goster] === q.d ? C.green : C.red }]}>{ex.cevap[goster] === q.d ? L("✓ Doğru") : L("✗ Doğrusu: {0}", [q.a[q.d]()])}</Text>
              <Button label={bitti ? L("Sonucu gör") : L("Sonraki soru")} icon="arrow-right" tone="gold" onPress={() => setGoster(null)} />
            </>
          ) : null}
        </Card>
      ) : (
        <Card accent={dogru >= EXAM_PASS ? C.green : C.red}>
          <Text style={[rs.verdict, SLANT, { color: dogru >= EXAM_PASS ? C.gold : C.red }]}>{dogru >= EXAM_PASS ? L("GEÇTİN!") : L("KALDIN")}</Text>
          <Text style={rs.text}>{L("{0}/{1} doğru.", [dogru, ex.sorular.length])}</Text>
          <Button label={dogru >= EXAM_PASS ? L("Yeni lisansını al") : L("Kariyere dön")} icon="school" tone="gold" onPress={() => actRef((x) => void finishExam(x))} />
        </Card>
      )}
    </Screen>
  );
}

// ---------- Emeklilik ----------

function RetiredView({ r, onExit }: { r: RefRun; onExit: () => void }) {
  const hall = useHall();
  const me = hall[0];
  return (
    <Screen>
      <LinearGradient colors={['#2e2206', '#0e0c07', '#08090b']} style={rs.heroCard}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <FighterAvatar look={r.gorunum ?? DEFAULT_REF_LOOK} size={84} ring={C.gold} />
          <Text style={[rs.name, SLANT]}>{`${r.ad} ${r.soyad}`.trim().toLocaleUpperCase(LOC)}</Text>
          <Text style={rs.kicker}>{me?.onur ? L("🏛️ HAKEM ONUR LİSTESİ'NDE") : L("🏁 EMEKLİ HAKEM")}</Text>
        </View>
      </LinearGradient>
      <Card>
        <Text style={rs.text}>{L("{0} maç · {1} kusursuz yönetim · {2} ödül · son lisans: {3}", [r.mac, r.kusursuz, r.oduller.length, TIER_NAME[r.seviye]()])}</Text>
        <Text style={rs.text}>{me?.yol === 'yorumcu' ? L("Artık maçları stüdyodan yorumluyorsun. İzleyiciler kafesin içini en iyi senin anlattığını söylüyor.") : L("Artık hakem eğitmenisin. Yetiştirdiğin gençler bir gün UCC kafesinde senin yerini alacak.")}</Text>
      </Card>
      <HallCard />
      <Button label={L("Yeni hakem kariyeri")} icon="whistle" tone="gold" onPress={() => setRun(null)} />
      <Button label={L("Menüye dön")} icon="arrow-left" tone="ghost" onPress={onExit} />
    </Screen>
  );
}

// ---------- Yılın Hakemi töreni ----------

function Ceremony({ r }: { r: RefRun }) {
  const t = r.toren!;
  const [step, setStep] = useState(0);
  const n = t.adaylar.length;
  const win = t.adaylar[t.kazanan];
  useEffect(() => {
    const at = step <= n ? 650 : step === n + 1 ? 1800 : 0;
    if (!at) return;
    const tm = setTimeout(() => {
      const next = step + 1;
      if (next <= n) sfx('whoosh');
      if (next === n + 1) sfx('swell');
      if (next === n + 2) sfx(win.sen ? 'fanfare' : 'applause');
      setStep(next);
    }, at);
    return () => clearTimeout(tm);
  }, [step, n, win.sen]);
  const reveal = step >= n + 2;
  useSoundScene('celebrate');
  return (
    <Screen footer={reveal ? <Button label={win.sen ? L("Ödülünü al") : L("Devam")} icon={win.sen ? 'trophy' : 'arrow-right'} tone="gold" onPress={() => actRef(closeCeremony)} /> : undefined}>
      <LinearGradient colors={['#3a0d14', '#1a0a0c', '#0b0809']} style={rs.stage}>
        <Text style={rs.stageKicker}>{L("{0}. YIL · GALA GECESİ", [t.yil])}</Text>
        <Text style={[rs.stageTitle, SLANT]}>{L("YILIN HAKEMİ")}</Text>
        <Text style={rs.small}>{L("Adaylar")}</Text>
      </LinearGradient>
      {t.adaylar.map((a, i) =>
        step > i ? (
          <View key={i} style={[rs.nominee, reveal && i === t.kazanan && rs.nomineeWin, reveal && i !== t.kazanan && { opacity: 0.55 }]}>
            <FighterAvatar look={a.sen ? r.gorunum ?? DEFAULT_REF_LOOK : lookFor({ id: a.ad, uyruk: a.ulke })} size={52} ring={reveal && i === t.kazanan ? C.gold : '#5a5e68'} />
            <View style={{ flex: 1 }}>
              <Text style={[rs.nomName, a.sen && { color: C.gold }]} numberOfLines={1}>
                {a.sen ? L("{0} (SEN)", [a.ad]) : a.ad}
              </Text>
              <Text style={rs.small}>{a.sen ? countryName(a.ulke) : a.ulke}</Text>
            </View>
            {reveal ? <Text style={rs.nomScore}>{a.ort.toFixed(1)}</Text> : null}
          </View>
        ) : null,
      )}
      {step === n + 1 ? <Text style={[rs.envelope, SLANT]}>{L("Ve kazanan…")}</Text> : null}
      {reveal ? (
        <Card accent={win.sen ? C.gold : undefined}>
          <Text style={[rs.verdict, SLANT, { color: win.sen ? C.gold : C.text }]}>{win.sen ? L("🏆 YILIN HAKEMİ SENSİN!") : L("Kazanan: {0}", [win.ad])}</Text>
          <Text style={rs.text}>
            {win.sen ? L("Ödül: {0} · +2 beceri puanı · ün ve takipçi.", [money(t.odul)]) : L("Maç başı ortalaman {0}. Gelecek yıl sahne senin olabilir.", [t.adaylar.find((a) => a.sen)?.ort.toFixed(1)])}
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

// ---------- Maç ----------

const RED_KIT = { shorts: '#b5121b', trim: '#ffffff', glove: '#c1121f' };
const looks = (b: RefBout): [Appearance, Appearance] => [lookFor({ id: b.a.ad, uyruk: b.a.ulke, kadin: b.kadin }), lookFor({ id: b.b.ad, uyruk: b.b.ulke, kadin: b.kadin })];

/** Kafes sahnesi için hakem maçını dövüş durumuna çevirir (sahne yalnızca bu alanları okur). */
function cageState(b: RefBout, log: string[]): FightState {
  const an = b.an;
  const crit = an && (an.kind === 'sarsildi' || an.kind === 'kilit');
  return {
    pAd: fighterName(b, 0),
    oAd: fighterName(b, 1),
    raunt: b.raunt,
    pHasar: Math.max(0, Math.min(100, 100 - b.hp[0])),
    oHasar: Math.max(0, Math.min(100, 100 - b.hp[1])),
    log,
    durum: b.sonuc ? 'bitti' : b.kart ? 'rauntSonu' : crit ? 'kritik' : 'canli',
    kritik: an?.kind === 'sarsildi' ? (an.side === 1 ? 'rakipSersem' : 'sarsildin') : an?.kind === 'kilit' ? (an.side === 1 ? 'subFirsat' : 'subTehlike') : null,
    subAdi: b.subAdi ?? '',
    mods: {},
    sonuc: b.sonuc ? { kazanan: b.sonuc.kazanan == null ? 'berabere' : b.sonuc.kazanan === 0 ? 'p' : 'o', yontem: b.sonuc.yontem } : undefined,
  } as unknown as FightState;
}

function BoutView({ r, b }: { r: RefRun; b: RefBout }) {
  useSoundScene('fight');
  const yeni = useLook() === 'yeni';
  const [shown, setShown] = useState(0);
  const [len, setLen] = useState(b.log.length);
  const [lk] = useState(() => looks(b));
  // Log yenilendiğinde (yeni raunt) baştan akar; uzadığında kaldığı yerden devam eder.
  if (b.log.length !== len) {
    setLen(b.log.length);
    if (b.log.length < len) setShown(0);
  }
  useEffect(() => {
    if (shown >= b.log.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), 900);
    return () => clearTimeout(t);
  }, [shown, b.log.length]);
  const ready = shown >= b.log.length;
  const cageLog = ready && b.an ? [...b.log, b.an.metin] : b.log;
  const cageShown = ready && b.an ? b.log.length + 1 : Math.min(shown, b.log.length);
  return (
    <Screen
      footer={
        ready && b.sonuc ? (
          <Button
            label={L("Maçı bitir")}
            icon="flag-checkered"
            tone="gold"
            onPress={() => {
              actRef(finishBout);
              track('referee_bout_end');
            }}
          />
        ) : !ready ? (
          <Button label={L("Hızlı geç")} icon="fast-forward" tone="ghost" onPress={() => setShown(b.log.length)} />
        ) : undefined
      }
    >
      {yeni ? (
        <BroadcastScore
          pName={b.a.ad.split(' ').slice(-1)[0]}
          oName={b.b.ad.split(' ').slice(-1)[0]}
          pHp={b.hp[0]}
          oHp={b.hp[1]}
          pSta={b.hp[0]}
          oSta={b.hp[1]}
          org={shortOrg(b.org ?? TIER_NAME[r.seviye]())}
          round={b.sonuc ? L("BİTTİ") : `R${b.raunt}`}
          caption={[b.unvan ? L("ÜNVAN") : b.anaKart ? L("ANA KART") : null, b.sehir, L("R{0}/{1}", [b.raunt, b.maxRaunt])].filter(Boolean).join(' · ').toLocaleUpperCase(LOC)}
          style={{ marginBottom: 10 }}
        />
      ) : (
      <>
      <View style={rs.boutTop}>
        <Text style={rs.boutOrg} numberOfLines={1}>
          {[b.org, b.sehir].filter(Boolean).join(' · ').toLocaleUpperCase(LOC) || TIER_NAME[r.seviye]().toLocaleUpperCase(LOC)}
        </Text>
        {b.unvan ? <Text style={rs.title}>{L("ÜNVAN")}</Text> : b.anaKart ? <Text style={[rs.title, { backgroundColor: C.red, color: '#fff' }]}>{L("ANA KART")}</Text> : null}
      </View>
      <View style={rs.vs}>
        <Corner f={b.a} hp={b.hp[0]} color={C.red} look={lk[0]} />
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text style={rs.round}>{b.sonuc ? L("BİTTİ") : L("R{0}/{1}", [b.raunt, b.maxRaunt])}</Text>
          <FighterAvatar look={r.gorunum ?? DEFAULT_REF_LOOK} size={30} ring={C.gold} />
        </View>
        <Corner f={b.b} hp={b.hp[1]} color={C.blue} look={lk[1]} right />
      </View>
      </>
      )}
      {b.etiketler?.length || b.yayin || b.evSahibi ? (
        <View style={[ds.chips, { justifyContent: 'center', marginBottom: 6 }]}>
          {(b.etiketler ?? []).map((t) => (
            <Text key={t} style={[ds.chipPlain, { color: C.orange, borderColor: C.orange + '66' }]}>
              {TAG_INFO[t].ad()}
            </Text>
          ))}
          {b.yayin ? <Text style={ds.chipPlain}>{L("📺 Canlı yayın")}</Text> : null}
          {b.evSahibi ? <Text style={ds.chipPlain}>{L("🏟️ Ev sahibi salon")}</Text> : null}
        </View>
      ) : null}
      <CageView fs={cageState(b, cageLog)} shown={cageShown} pLook={lk[0]} oLook={lk[1]} rLook={r.gorunum ?? DEFAULT_REF_LOOK} rShirt={kiyafetRenk(r)} pKitOverride={RED_KIT} noReplay arena={yeni ? { tier: REF_ARENA[r.seviye], logo: b.org, tint: tintOfCity(b.sehir) } : undefined} />
      <View style={rs.logBox}>
        {b.log.slice(0, shown).slice(-4).map((t, i) => (
          <Text key={`${b.raunt}-${i}-${t}`} style={[rs.logLine, t.startsWith('📋') && { color: C.gold }]}>
            {t}
          </Text>
        ))}
      </View>
      {ready && b.an ? <MomentCard b={b} /> : null}
      {ready && b.kart ? <ScoreCard b={b} /> : null}
    </Screen>
  );
}

function Corner({ f, hp, color, right, look }: { f: RefFighter; hp: number; color: string; right?: boolean; look: Appearance }) {
  return (
    <View style={{ flex: 1, flexDirection: right ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
      <FighterAvatar look={look} size={44} ring={color} />
      <View style={{ flex: 1, alignItems: right ? 'flex-end' : 'flex-start', gap: 2 }}>
        <Text style={[rs.cName, { color }]} numberOfLines={1}>
          {f.ad.split(' ').slice(-1)[0].toLocaleUpperCase(LOC)}
        </Text>
        <Text style={rs.cMeta} numberOfLines={1}>
          {f.rekor} · {BACKGROUNDS[f.stil].ad}
        </Text>
        <View style={rs.hpTrack}>
          <View style={[rs.hpFill, { width: `${Math.max(3, Math.min(100, hp))}%`, backgroundColor: color, alignSelf: right ? 'flex-end' : 'flex-start' }]} />
        </View>
      </View>
    </View>
  );
}

function MomentCard({ b }: { b: RefBout }) {
  const an = b.an!;
  useEffect(() => {
    sfx('swell', 0.8);
  }, [an.metin]);
  return (
    <LinearGradient colors={['#2a1a08', '#120d07']} style={rs.moment}>
      <Text style={rs.momentKicker}>
        {KIND_ICON[an.kind]} {L("KARAR ANI")}
      </Text>
      <Text style={rs.momentText}>{an.metin}</Text>
      {an.ipuclari.map((t) => (
        <View key={t} style={rs.clue}>
          <View style={[rs.clueDot, t.startsWith('🔎') && { backgroundColor: C.green }, t.startsWith('📘') && { backgroundColor: C.blue }]} />
          <Text style={[rs.clueText, (t.startsWith('🔎') || t.startsWith('📺')) && { color: C.green }, t.startsWith('📘') && { color: '#8fb8ff' }]}>{t}</Text>
        </View>
      ))}
      {canReplay(b) ? <Button label={L("📺 Tekrar izle (maç başına 1)")} tone="ghost" onPress={() => actRef((x) => x.aktif && replayMoment(x.aktif))} /> : null}
      <View style={{ gap: 8, marginTop: 6 }}>
        {an.secenekler.map((o, i) => (
          <Button
            key={o.key}
            label={o.ad}
            tone={i === 0 ? 'red' : 'ghost'}
            onPress={() => {
              if (o.key === 'dur' || o.key === 'dq' || o.key === 'ayir') sfx('slam');
              actRef((x) => x.aktif && decide(x.aktif, o.key));
            }}
          />
        ))}
      </View>
    </LinearGradient>
  );
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function ScoreCard({ b }: { b: RefBout }) {
  const s = b.stats;
  const hint = cardHint(b);
  const rows: [string, string, string][] = [
    [L("Önemli vuruş"), String(s.sig[0]), String(s.sig[1])],
    [L("Takedown"), String(s.td[0]), String(s.td[1])],
    [L("Kontrol süresi"), fmt(s.ctrl[0]), fmt(s.ctrl[1])],
    [L("Knockdown"), String(s.kd[0]), String(s.kd[1])],
  ];
  const cards: RefCard[] = ['10-9a', '10-9b', '10-8a', '10-8b', '10-10'];
  return (
    <View style={rs.score}>
      <Text style={rs.momentKicker}>{L("📋 {0}. RAUNT PUAN KARTI", [b.raunt])}</Text>
      <View style={rs.sRow}>
        <Text style={[rs.sVal, { color: C.red }]}>{b.a.ad.split(' ').slice(-1)[0]}</Text>
        <Text style={rs.sLab} />
        <Text style={[rs.sVal, { color: C.blue }]}>{b.b.ad.split(' ').slice(-1)[0]}</Text>
      </View>
      {rows.map(([lab, x, y]) => (
        <View key={lab} style={rs.sRow}>
          <Text style={rs.sVal}>{x}</Text>
          <Text style={rs.sLab}>{lab}</Text>
          <Text style={rs.sVal}>{y}</Text>
        </View>
      ))}
      {hint.pts ? (
        <View style={rs.sRow}>
          <Text style={[rs.sVal, { color: '#8fb8ff' }]}>{hint.pts[0]}</Text>
          <Text style={[rs.sLab, { color: '#8fb8ff' }]}>{L("📘 Puan hesabı")}</Text>
          <Text style={[rs.sVal, { color: '#8fb8ff' }]}>{hint.pts[1]}</Text>
        </View>
      ) : null}
      {hint.lead !== undefined ? (
        <Text style={[rs.small, { color: '#8fb8ff' }]}>
          {hint.lead == null ? L("📘 Kural bilgin: bu raunt başa baş.") : L("📘 Kural bilgin: bu rauntta {0} önde.", [hint.lead === 0 ? L("Kırmızı") : L("Mavi")])}
        </Text>
      ) : (
        <Text style={rs.small}>{L("İpucu: knockdown ve ezici üstünlük 10-8 getirir; yakın rauntta etkili vuruş ve kontrol belirleyicidir.")}</Text>
      )}
      <View style={rs.cards}>
        {cards.map((c) => (
          <Pressable
            key={c}
            onPress={() => {
              sfx('click');
              actRef((x) => x.aktif && scoreRound(x.aktif, c));
            }}
            style={({ pressed }) => [rs.cardBtn, { borderColor: hint.card === c ? C.gold : c === '10-10' ? C.border : c.endsWith('a') ? C.red : C.blue }, hint.card === c && { borderWidth: 2 }, pressed && { backgroundColor: '#1d1f25' }]}
          >
            <Text style={[rs.cardBtnT, { color: c === '10-10' ? C.dim : c.endsWith('a') ? C.red : C.blue }]}>{cardLabel(c)}</Text>
            {hint.card === c ? <Text style={rs.suggest}>{L("önerilen")}</Text> : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const rs = StyleSheet.create({
  pack: { borderRadius: R + 2, borderWidth: 1, borderColor: '#5a1d24', padding: 14, gap: 8, marginBottom: 10 },
  packLead: { color: C.red, fontFamily: F.bold, fontSize: 14 },
  packText: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  link: { color: C.faint, fontFamily: F.semi, fontSize: 12, textDecorationLine: 'underline' },
  hero: { borderRadius: R + 4, borderWidth: 1, borderColor: '#5a1d24', padding: 16, alignItems: 'center', gap: 6 },
  heroTitle: { color: C.text, fontFamily: F.display, fontSize: 26 },
  heroText: { color: C.dim, fontFamily: F.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  bullet: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bulletText: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  label: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1.5, marginBottom: 4 },
  input: { backgroundColor: '#0d0f13', borderWidth: 1, borderColor: C.border, borderRadius: R, color: C.text, fontFamily: F.semi, fontSize: 15, paddingHorizontal: 12, paddingVertical: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#0d0f13' },
  chipOn: { backgroundColor: C.red, borderColor: C.red },
  chipText: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  stageHero: { minHeight: 330, justifyContent: 'flex-end', overflow: 'hidden' },
  refFig: { position: 'absolute', left: 0, right: 0, bottom: 40, alignItems: 'center' },
  heroCard: { borderRadius: R + 4, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#3a1a20', overflow: 'hidden' },
  nick: { color: C.gold, fontFamily: F.displayMed, fontSize: 11, letterSpacing: 1.5 },
  name: { color: C.text, fontFamily: F.display, fontSize: 24, lineHeight: 28 },
  heroChips: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' },
  heroChip: { color: C.dim, fontFamily: F.display, fontSize: 11, letterSpacing: 1 },
  dot: { color: C.faint, fontSize: 10 },
  meters: { flexDirection: 'row', marginTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', paddingTop: 12 },
  meter: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  meterLabel: { color: C.faint, fontFamily: F.display, fontSize: 9, letterSpacing: 1.5 },
  meterVal: { fontFamily: F.display, fontSize: 18, marginTop: 1 },
  section: { color: C.text, fontFamily: F.display, fontSize: 14, letterSpacing: 1.5, marginTop: 4, marginBottom: 8 },
  offer: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: R + 2, borderWidth: 1, padding: 12 },
  offerIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  badge: { color: '#111', fontFamily: F.display, fontSize: 9.5, letterSpacing: 1, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 3, overflow: 'hidden' },
  offerCity: { color: C.faint, fontFamily: F.semi, fontSize: 11 },
  offerOrg: { color: C.text, fontFamily: F.display, fontSize: 18, marginTop: 2 },
  offerSub: { color: C.dim, fontFamily: F.body, fontSize: 11.5, marginTop: 1 },
  offerPay: { color: C.green, fontFamily: F.display, fontSize: 16 },
  notice: { flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: C.gold + '66', borderRadius: R, padding: 12, marginBottom: 10, backgroundColor: '#1a160b' },
  noticeText: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 18 },
  kicker: { color: C.gold, fontFamily: F.semi, fontSize: 11, letterSpacing: 1.5, marginBottom: 6 },
  text: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 19, marginBottom: 6 },
  small: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 4 },
  verdict: { fontFamily: F.display, fontSize: 22, marginVertical: 2 },
  gains: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  gain: { fontFamily: F.display, fontSize: 13, letterSpacing: 0.5 },
  hist: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 4, borderTopWidth: 1, borderTopColor: C.border },
  histName: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 12 },
  histNote: { fontFamily: F.semi, fontSize: 12 },
  skill: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border },
  skillIcon: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  skillName: { color: C.text, fontFamily: F.display, fontSize: 15 },
  skillDesc: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 16, marginTop: 2 },
  pip: { width: 9, height: 9, borderRadius: 2, borderWidth: 1, borderColor: C.faint },
  plus: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  plusCost: { position: 'absolute', bottom: -6, right: -4, color: '#111', backgroundColor: C.gold, fontFamily: F.bold, fontSize: 10, borderRadius: 7, paddingHorizontal: 4, overflow: 'hidden' },
  post: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border },
  postAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  postInit: { color: C.text, fontFamily: F.display, fontSize: 15 },
  postName: { color: C.text, fontFamily: F.bold, fontSize: 13 },
  postHandle: { color: C.faint, fontFamily: F.body, fontSize: 12 },
  postText: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 18, marginTop: 2 },
  postLike: { color: C.faint, fontFamily: F.semi, fontSize: 11, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  cell: { width: '31%', flexGrow: 1, backgroundColor: '#0f1014', borderRadius: R, borderWidth: 1, borderColor: C.border, paddingVertical: 10, alignItems: 'center' },
  cellVal: { color: C.text, fontFamily: F.display, fontSize: 18 },
  cellLab: { color: C.faint, fontFamily: F.semi, fontSize: 10.5, marginTop: 2 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: C.border },
  rankMe: { backgroundColor: '#2a2106', borderRadius: 8, borderTopColor: 'transparent' },
  rankNo: { width: 22, color: C.dim, fontFamily: F.display, fontSize: 16, textAlign: 'center' },
  rankName: { color: C.text, fontFamily: F.semi, fontSize: 13 },
  rankSub: { color: C.faint, fontFamily: F.body, fontSize: 11 },
  rankPts: { color: C.text, fontFamily: F.display, fontSize: 15 },
  stage: { borderRadius: R + 4, borderWidth: 1, borderColor: '#6a2a1a', padding: 18, alignItems: 'center', marginBottom: 12 },
  stageKicker: { color: C.gold, fontFamily: F.display, fontSize: 11, letterSpacing: 2 },
  stageTitle: { color: C.text, fontFamily: F.display, fontSize: 34, marginTop: 4 },
  nominee: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: R + 2, borderWidth: 1, borderColor: C.border, padding: 10, marginBottom: 8 },
  nomineeWin: { borderColor: C.gold, backgroundColor: '#2a2106' },
  nomName: { color: C.text, fontFamily: F.display, fontSize: 16 },
  nomScore: { color: C.gold, fontFamily: F.display, fontSize: 20 },
  envelope: { color: C.gold, fontFamily: F.display, fontSize: 26, textAlign: 'center', marginVertical: 14 },
  boutTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 },
  boutOrg: { color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 1.5 },
  vs: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  round: { color: C.gold, fontFamily: F.display, fontSize: 16 },
  title: { color: '#111', backgroundColor: C.gold, fontFamily: F.display, fontSize: 10, paddingHorizontal: 6, borderRadius: 3, overflow: 'hidden' },
  cName: { fontFamily: F.display, fontSize: 15 },
  cMeta: { color: C.faint, fontFamily: F.body, fontSize: 10.5 },
  hpTrack: { width: '100%', height: 5, backgroundColor: '#22242b', borderRadius: 3, overflow: 'hidden', marginTop: 3 },
  hpFill: { height: 5, borderRadius: 3 },
  logBox: { backgroundColor: '#0f1014', borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 10, gap: 5, minHeight: 84, marginBottom: 10 },
  logLine: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 18 },
  moment: { borderRadius: R, borderWidth: 1, borderColor: C.gold + '88', padding: 12, gap: 6 },
  momentKicker: { color: C.gold, fontFamily: F.display, fontSize: 13, letterSpacing: 1.5 },
  momentText: { color: '#fff', fontFamily: F.bold, fontSize: 15, lineHeight: 21 },
  clue: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  clueDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold, marginTop: 7 },
  clueText: { flex: 1, color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  score: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, gap: 4 },
  sRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  sVal: { width: 90, color: C.text, fontFamily: F.bold, fontSize: 14, textAlign: 'center' },
  sLab: { flex: 1, color: C.faint, fontFamily: F.semi, fontSize: 12, textAlign: 'center' },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  cardBtn: { flexGrow: 1, minWidth: '30%', borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  cardBtnT: { fontFamily: F.display, fontSize: 13 },
  suggest: { color: C.gold, fontFamily: F.semi, fontSize: 9.5, marginTop: 1 },
});

const ds = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  chipT: { fontFamily: F.semi, fontSize: 10 },
  chipPlain: { color: C.dim, fontFamily: F.semi, fontSize: 10, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  analysis: { marginLeft: 18, marginTop: 2, marginBottom: 4, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: C.border },
  anaLine: { color: C.text, fontFamily: F.semi, fontSize: 11.5 },
  anaWhy: { color: C.dim, fontFamily: F.body, fontSize: 11.5, lineHeight: 16 },
  perk: { color: C.gold, fontFamily: F.semi, fontSize: 11, marginTop: 2 },
  styleTrack: { height: 8, borderRadius: 4, backgroundColor: '#22252c', marginTop: 10, marginBottom: 4 },
  styleDot: { position: 'absolute', top: -4, width: 16, height: 16, marginLeft: -8, borderRadius: 8, backgroundColor: C.gold, borderWidth: 2, borderColor: '#000' },
  styleEnd: { color: C.faint, fontFamily: F.semi, fontSize: 10 },
  orgRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderTopWidth: 1, borderTopColor: C.border },
  orgSub: { color: C.faint, fontFamily: F.body, fontSize: 11, marginTop: -4 },
  orgVal: { fontFamily: F.display, fontSize: 18, minWidth: 40, textAlign: 'right' },
  outfits: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  outfit: { width: '30%', flexGrow: 1, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 8, alignItems: 'center', gap: 4 },
  swatch: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ffffff33' },
  outfitName: { color: C.text, fontFamily: F.semi, fontSize: 11 },
  outfitReq: { color: C.faint, fontFamily: F.body, fontSize: 10, textAlign: 'center' },
});
