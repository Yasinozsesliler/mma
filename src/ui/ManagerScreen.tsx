// Menajer Modu ekranı: telefon (mesajlar ve kararlar), kadro, teklifler + yetenek avı, ajans.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { track } from '../analytics';
import { sfx } from '../audio';
import {
  acceptOffer,
  advanceWeek,
  agencyRanking,
  answer,
  createMeydan,
  kapali,
  MEYDAN_HAFTA,
  meydanKodu,
  meydanPaylas,
  meydanSenaryo,
  meydanSkor,
  ppvEstimate,
  provoke,
  readMeydan,
  TARZ,
  TARZ_ESIK,
  tarzOf,
  type TarzKey,
  bekleyen,
  canAdvance,
  createMgrRun,
  declineOffer,
  fullName,
  KISILIK,
  leaveTable,
  M_TIER_NAME,
  MADDE,
  markRead,
  MGR_TRIAL_WEEKS,
  ofisOf,
  OFIS,
  okunmamis,
  openTable,
  orgName,
  rekorOf,
  rkSoyad,
  type MKayit,
  releaseFighter,
  SENARYO,
  signCandidate,
  starsOf,
  tableAsk,
  trialOver,
  unvanOf,
  upgradeOffice,
  type Aday,
  type Madde,
  type Mesaj,
  type MFighter,
  type MgrRun,
  type Rol,
  type Senaryo,
  type Teklif,
} from '../engine/manager';
import type { OrgId } from '../engine/types';
import { WEIGHT_CLASSES } from '../engine/data';
import { L, LOC } from '../i18n';
import { buy, PURCHASES, restorePurchases, useOwned, usePrice } from '../monetization';
import { MGR_SKU, ULTIMATE_SKU } from '../monetization/skus';
import { actMgr, closeAgency, meydanBest, peekRun, saveMeydanBest, setMgrRun, setMgrSlot, useMgrHall, useMgrRun, useMgrSlot } from '../managerStore';
import { Bar, Button, CageBg, Card, Choice, Icon, Screen, SLANT, type IconName } from './components';
import { FighterAvatar } from './FighterAvatar';
import { FaceOffModal, FormPills, MgrDossier, MgrWatch, mLook, rLook, TIER_COLOR } from './ManagerViews';
import { HubNav, type NavItem } from './HubNav';
import { FullPackLink } from './ShopSheet';
import { C, F, R } from './theme';

const $ = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n)).toLocaleString(LOC)}`;
const look = mLook;

export function useMgrUnlocked() {
  const owned = useOwned();
  return !PURCHASES || owned.has(MGR_SKU) || owned.has(ULTIMATE_SKU);
}

/** Menajer Modu satın alma kutusu */
function MgrPack({ lead }: { lead?: string }) {
  const price = usePrice(MGR_SKU);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  if (!PURCHASES) return null;
  return (
    <LinearGradient colors={['#0d1a2a', '#08090b']} style={ms.pack}>
      {lead ? <Text style={ms.packLead}>{lead}</Text> : null}
      <Text style={ms.packText}>{L("Tek seferlik alım: sınırsız ajans kariyeri, UCC sözleşmeleri, şampiyonlar ve Yılın Menajeri ödülü.")}</Text>
      <Button
        label={price ? L("Menajer Modu · {0}", [price]) : L("Menajer Modu'nu al")}
        icon="briefcase"
        tone="gold"
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          setMsg('');
          const r = await buy(MGR_SKU);
          setBusy(false);
          if (r === 'ok') sfx('fanfare');
          else if (r === 'hata') setMsg(L("Satın alma şu an yapılamadı. Biraz sonra tekrar dene."));
        }}
      />
      <Pressable onPress={async () => setMsg((await restorePurchases()) ? L("Satın alımların geri yüklendi.") : L("Bu hesapta satın alma bulunamadı."))} hitSlop={8} style={{ alignSelf: 'center', marginTop: 8 }}>
        <Text style={ms.link}>{L("Satın alımları geri yükle")}</Text>
      </Pressable>
      <FullPackLink kaynak="menajer_kilit" />
      {msg ? <Text style={ms.packText}>{msg}</Text> : null}
    </LinearGradient>
  );
}

export function ManagerScreen({ onExit }: { onExit: () => void }) {
  const r = useMgrRun();
  const slot = useMgrSlot();
  const unlocked = useMgrUnlocked();
  const exit = () => {
    setMgrSlot('kariyer');
    onExit();
  };
  useEffect(() => {
    if (r?.deneme && unlocked) actMgr((x) => (x.deneme = false));
  }, [r?.deneme, unlocked]);
  useEffect(() => {
    if (!r && slot === 'meydan') setMgrSlot('kariyer');
  }, [r, slot]);
  if (!r) return <MgrStart unlocked={unlocked} onExit={exit} />;
  if (r.emekli) return r.meydan ? <MeydanEnd r={r} /> : <ClosedView r={r} onExit={exit} />;
  return <MgrHub r={r} onExit={exit} />;
}

// ---------- Başlangıç ----------

function MgrStart({ unlocked, onExit }: { unlocked: boolean; onExit: () => void }) {
  const [ad, setAd] = useState('');
  const [soyad, setSoyad] = useState('');
  const [ajans, setAjans] = useState('');
  const [sen, setSen] = useState<Senaryo>('sifir');
  const hall = useMgrHall();
  return (
    <Screen
      footer={
        <View style={{ gap: 8 }}>
          <Button
            label={unlocked ? L("Ajansı aç") : L("Ücretsiz dene ({0} hafta)", [MGR_TRIAL_WEEKS])}
            icon="briefcase"
            tone="gold"
            onPress={() => {
              track('manager_start', { deneme: unlocked ? 0 : 1, senaryo: sen });
              setMgrRun(createMgrRun(ad, soyad, ajans, sen, !unlocked));
            }}
          />
          <Button label={L("Menüye dön")} icon="arrow-left" tone="ghost" onPress={onExit} />
        </View>
      }
    >
      <LinearGradient colors={['#0d1a2a', '#08090b']} style={ms.hero}>
        <Icon name="briefcase" size={36} color={C.gold} />
        <Text style={[ms.heroTitle, SLANT]}>{L("MENAJER MODU")}</Text>
        <Text style={ms.heroText}>{L("Bu sefer kafese sen çıkmıyorsun. Dövüşçülerin kariyeri, parası ve sağlığı senin telefonunda.")}</Text>
      </LinearGradient>
      <View style={{ gap: 10, marginVertical: 14 }}>
        {(
          [
            ['cellphone-message', L("Telefonun hiç susmaz: dövüşçüler, patronlar, gazeteciler ve rakip menajerler. Her cevabın bir sonucu var.")],
            ['handshake', L("Organizasyonların gizli bütçesine karşı pazarlık yap; rövanş, çıkış ve sakatlık maddeleri yıllar sonra işine yarar.")],
            ['account-search', L("Yetenek avına çık, gençleri komisyon pazarlığıyla imzala, rakip ajanslardan önce davran.")],
            ['sword-cross', L("İki dövüşçün aynı kemere yürürse? Organizasyon onları birbirine eşlemek isteyecek.")],
            ['heart-pulse', L("Doktor uyarır, para çağırır. Dövüşçünün sağlığı mı, maaş günü mü?")],
            ['trophy', L("Bodrum kat ofisinden gökdelene: şampiyonlar çıkar, Yılın Menajeri ol.")],
          ] as [IconName, string][]
        ).map(([icon, t]) => (
          <View key={icon} style={ms.bullet}>
            <Icon name={icon} size={18} color={C.gold} />
            <Text style={ms.bulletText}>{t}</Text>
          </View>
        ))}
      </View>
      <MeydanCard ad={ad} soyad={soyad} ajans={ajans} />
      <Card>
        <Text style={ms.label}>{L("MENAJERİN ADI")}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput value={ad} onChangeText={setAd} placeholder={L("Ad")} placeholderTextColor={C.faint} style={[ms.input, { flex: 1, minWidth: 0, width: 0 }]} maxLength={16} />
          <TextInput value={soyad} onChangeText={setSoyad} placeholder={L("Soyad")} placeholderTextColor={C.faint} style={[ms.input, { flex: 1, minWidth: 0, width: 0 }]} maxLength={18} />
        </View>
        <Text style={[ms.label, { marginTop: 12 }]}>{L("AJANSIN ADI")}</Text>
        <TextInput value={ajans} onChangeText={setAjans} placeholder={L("Örn. Kartal Yönetim")} placeholderTextColor={C.faint} style={ms.input} maxLength={24} />
      </Card>
      <Text style={ms.section}>{L("BAŞLANGIÇ")}</Text>
      {(Object.keys(SENARYO) as Senaryo[]).map((k) => (
        <Choice key={k} icon={SENARYO[k].ikon as IconName} tone="gold" selected={sen === k} label={`${SENARYO[k].ad()} · ${SENARYO[k].zorluk()}`} desc={SENARYO[k].aciklama()} onPress={() => setSen(k)} />
      ))}
      {!unlocked ? <MgrPack lead={L("İlk {0} hafta ücretsiz.", [MGR_TRIAL_WEEKS])} /> : null}
      {hall.length ? (
        <Card>
          <Text style={ms.kicker}>{L("KAPANAN AJANSLAR")}</Text>
          {hall.slice(0, 5).map((h, i) => (
            <Text key={i} style={ms.small}>
              {L("{0} ({1}) · {2} hafta · {3} kemer · {4} komisyon", [h.ajans, h.ad, h.hafta, h.sampiyonluk, $(h.gelir)])}
            </Text>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

// ---------- Merkez ----------

type Tab = 'telefon' | 'kadro' | 'pazar' | 'ajans';

function MgrHub({ r, onExit }: { r: MgrRun; onExit: () => void }) {
  const [tab, setTab] = useState<Tab>('telefon');
  const offers = r.teklifler.length;
  const nav: NavItem<Tab>[] = [
    { key: 'telefon', label: L("Telefon"), icon: 'cellphone', badge: bekleyen(r).length ? '!' : okunmamis(r) || null },
    { key: 'kadro', label: L("Kadro"), icon: 'account-group' },
    { key: 'pazar', label: L("Teklifler"), icon: 'handshake', badge: offers || null },
    { key: 'ajans', label: L("Ajans"), icon: 'office-building' },
  ];
  return (
    <Screen key={tab} footer={<HubNav items={nav} value={tab} onChange={setTab} />}>
      <MgrHero r={r} goPhone={() => setTab('telefon')} />
      {tab === 'telefon' ? <PhoneTab r={r} /> : null}
      {tab === 'kadro' ? <SquadTab r={r} /> : null}
      {tab === 'pazar' ? <MarketTab r={r} /> : null}
      {tab === 'ajans' ? <AgencyTab r={r} onExit={onExit} /> : null}
    </Screen>
  );
}

function MgrHero({ r, goPhone }: { r: MgrRun; goPhone: () => void }) {
  const wait = bekleyen(r).length;
  const over = trialOver(r);
  return (
    <LinearGradient colors={['#0d1a2a', '#0e0f12', '#08090b']} locations={[0, 0.55, 1]} style={ms.heroCard}>
      <CageBg opacity={0.04} />
      <Text style={ms.nick}>{unvanOf(r).toLocaleUpperCase(LOC)}</Text>
      <Text style={[ms.name, SLANT]} numberOfLines={1} adjustsFontSizeToFit>
        {r.ajans.toLocaleUpperCase(LOC)}
      </Text>
      {r.meydan ? <Text style={[ms.heroSub, { color: C.gold }]}>{L("MEYDAN OKUMA {0} · {1}/{2}. hafta · skor {3}", [r.meydan.kod, r.hafta, MEYDAN_HAFTA, meydanSkor(r)])}</Text> : null}
      <Text style={ms.heroSub}>{L("{0} · {1}. yıl, {2}. hafta", [`${r.ad} ${r.soyad}`.trim(), Math.floor((r.hafta - 1) / 52) + 1, ((r.hafta - 1) % 52) + 1])}</Text>
      <View style={ms.meters}>
        <Meter label={L("KASA")} value={$(r.para)} color={r.para < 0 ? C.red : C.green} />
        <Meter label={L("KADRO")} value={`${r.kadro.length}/${ofisOf(r).kapasite}`} />
        <Meter label={L("KEMER")} value={String(r.sampiyonluk)} color={C.gold} />
      </View>
      <ThisWeek r={r} />
      <View style={{ marginTop: 8 }}>
        <Bar value={r.itibar} color={C.gold} label={L("İtibar")} right={String(r.itibar)} />
      </View>
      {over ? (
        <MgrPack lead={L("Deneme bitti. Ajansın seni bekliyor:")} />
      ) : (
        <View style={{ marginTop: 10 }}>
          <Button
            label={L("Haftayı bitir")}
            icon="calendar-arrow-right"
            tone="gold"
            onPress={() => {
              sfx('bell');
              actMgr(advanceWeek);
              goPhone();
            }}
            disabled={!canAdvance(r)}
          />
          {wait ? (
            <Pressable onPress={goPhone} hitSlop={6} style={{ alignSelf: 'center', marginTop: 6 }}>
              <Text style={ms.waitHint}>{L("📱 {0} mesaj cevabını bekliyor (cevaplamazsan kendiliğinden kapanır)", [wait])}</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </LinearGradient>
  );
}

function ThisWeek({ r }: { r: MgrRun }) {
  const [face, setFace] = useState<MFighter | null>(null);
  const fs = r.kadro.filter((f) => f.mac?.hafta === r.hafta);
  if (!fs.length) return null;
  const big = fs.find((f) => f.mac!.unvan || f.mac!.super) ?? fs[0];
  return (
    <>
      <Pressable onPress={() => setFace(big)} style={({ pressed }) => [ms.banner, pressed && { opacity: 0.8 }]}>
        <Icon name="movie-open" size={16} color={C.gold} />
        <Text style={ms.bannerText} numberOfLines={2}>
          {fs.length > 1 ? L("Bu hafta maç gecesi: {0} dövüşçün kafeste. Face-off'u izle", [fs.length]) : L("Bu hafta maç gecesi: {0} – {1}. Face-off'u izle", [big.soyad, rkSoyad(big.mac!.rakip)])}
        </Text>
        <Icon name="chevron-right" size={16} color={C.gold} />
      </Pressable>
      {face?.mac ? <FaceOffModal f={face} rk={face.mac.rakip} org={face.mac.org} unvan={face.mac.unvan} sup={!!face.mac.super} onClose={() => setFace(null)} /> : null}
    </>
  );
}

function Meter({ label, value, color = C.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={ms.meter}>
      <Text style={ms.meterLabel}>{label}</Text>
      <Text style={[ms.meterVal, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

// ---------- Telefon ----------

const ROL: Record<Rol, { ikon: IconName; renk: string }> = {
  dovuscu: { ikon: 'boxing-glove', renk: C.red },
  org: { ikon: 'office-building', renk: C.blue },
  basin: { ikon: 'microphone', renk: C.orange },
  rakip: { ikon: 'account-tie', renk: C.red },
  doktor: { ikon: 'stethoscope', renk: C.green },
  aile: { ikon: 'home-heart', renk: C.gold },
  sponsor: { ikon: 'cash-multiple', renk: C.green },
  sistem: { ikon: 'bell', renk: C.dim },
  ag: { ikon: 'account-voice', renk: C.gold },
};

function PhoneTab({ r }: { r: MgrRun }) {
  useEffect(() => {
    if (okunmamis(r)) {
      const t = setTimeout(() => actMgr(markRead), 1200);
      return () => clearTimeout(t);
    }
  }, [r]);
  const night = r.kadro.filter((f) => f.maclar?.[0]?.h === r.hafta - 1);
  // Maç sonuçları gece kartında (izlemeden önce sonucu görmemek için) gösterilir
  const rapor = night.length ? (r.rapor ?? []).filter((l, i, a) => !/^(✅|❌) /.test(l) && !(l.startsWith('   ') && a.slice(0, i).reverse().find((x) => !x.startsWith('   '))?.match(/^(✅|❌) /))) : (r.rapor ?? []);
  return (
    <>
      {night.length ? <FightNight r={r} fs={night} /> : null}
      {rapor.length ? (
        <Card accent={C.gold}>
          <Text style={ms.kicker}>{L("GEÇEN HAFTA")}</Text>
          {rapor.map((l, i) => (
            <Text key={i} style={[ms.small, { color: l.startsWith('   ') ? C.dim : C.text }]}>
              {l.trim()}
            </Text>
          ))}
        </Card>
      ) : null}
      <Text style={ms.section}>{L("MESAJLAR")}</Text>
      {r.mesajlar.length ? r.mesajlar.slice(0, 25).map((m) => <Bubble key={m.id} m={m} />) : <Text style={ms.small}>{L("Telefon şimdilik sessiz.")}</Text>}
    </>
  );
}

/** Geçen haftanın maç gecesi: her maç izlenebilir ya da sonucu doğrudan açılabilir */
function FightNight({ r, fs }: { r: MgrRun; fs: MFighter[] }) {
  const [watch, setWatch] = useState<{ f: MFighter; m: MKayit } | null>(null);
  const [seen, setSeen] = useState<Record<string, boolean>>({});
  return (
    <LinearGradient colors={['#1f1705', '#0c0d10', '#08090b']} locations={[0, 0.5, 1]} style={ms.night}>
      <CageBg opacity={0.05} />
      <Text style={ms.kicker}>{L("🥊 MAÇ GECESİ · {0}. HAFTA", [r.hafta - 1])}</Text>
      {fs.map((f) => {
        const m = f.maclar![0];
        const open = seen[m.id];
        return (
          <View key={m.id} style={ms.nightRow}>
            <FighterAvatar look={mLook(f)} size={40} ring={open ? (m.w ? C.green : C.red) : C.red} />
            <View style={{ flex: 1 }}>
              <Text style={ms.fName} numberOfLines={1}>
                {f.soyad} <Text style={{ color: C.gold }}>vs</Text> {rkSoyad(m.rk)}
              </Text>
              {open ? (
                <Text style={[ms.fMeta, { color: m.w ? C.green : C.red }]} numberOfLines={2}>
                  {m.w ? L("✅ Kazandı · {0}, {1}. raunt", [m.y, m.ra]) : L("❌ Kaybetti · {0}, {1}. raunt", [m.y, m.ra])} · {$(m.kom)}
                </Text>
              ) : (
                <Pressable onPress={() => setSeen({ ...seen, [m.id]: true })} hitSlop={6}>
                  <Text style={ms.link}>{m.unvan ? L("Ünvan maçı · sonucu göster") : L("Sonucu göster")}</Text>
                </Pressable>
              )}
            </View>
            <Pressable
              onPress={() => {
                sfx('click');
                setWatch({ f, m });
              }}
              style={({ pressed }) => [ms.nightBtn, pressed && { opacity: 0.8 }]}
            >
              <Icon name="play" size={14} color="#1f1605" />
              <Text style={ms.nightBtnText}>{L("İzle")}</Text>
            </Pressable>
          </View>
        );
      })}
      {watch ? (
        <MgrWatch
          f={watch.f}
          m={watch.m}
          onClose={() => {
            setSeen({ ...seen, [watch.m.id]: true });
            setWatch(null);
          }}
        />
      ) : null}
    </LinearGradient>
  );
}

function Bubble({ m }: { m: Mesaj }) {
  const rol = ROL[m.rol];
  const open = m.secenekler && !m.cevap;
  return (
    <View style={[ms.bubble, open && { borderColor: C.gold }, !m.okundu && { backgroundColor: '#11161f' }]}>
      <View style={ms.bubbleHead}>
        <View style={[ms.bubbleIcon, { borderColor: rol.renk }]}>
          <Icon name={rol.ikon} size={15} color={rol.renk} />
        </View>
        <Text style={ms.bubbleFrom} numberOfLines={1}>
          {m.kim}
        </Text>
        <Text style={ms.bubbleWeek}>{L("{0}. hafta", [m.hafta])}</Text>
      </View>
      <Text style={ms.bubbleText}>{m.metin}</Text>
      {open
        ? m.secenekler!.map((s) => (
            <Pressable
              key={s.k}
              onPress={() => {
                sfx('click');
                actMgr((x) => answer(x, m.id, s.k));
              }}
              style={({ pressed }) => [ms.reply, pressed && { opacity: 0.7 }]}
            >
              <Icon name="reply" size={14} color={C.gold} />
              <Text style={ms.replyText}>{s.ad}</Text>
            </Pressable>
          ))
        : null}
      {m.cevap ? (
        <View style={ms.answered}>
          <Text style={ms.answeredMe}>{L("Sen: {0}", [m.cevap])}</Text>
          {m.sonuc ? <Text style={ms.answeredRes}>{m.sonuc}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

// ---------- Kadro ----------

function SquadTab({ r }: { r: MgrRun }) {
  const [open, setOpen] = useState<string | null>(null);
  const [face, setFace] = useState<string | null>(null);
  const sel = r.kadro.find((f) => f.id === open);
  const faceF = r.kadro.find((f) => f.id === face);
  if (!r.kadro.length)
    return (
      <Card>
        <Text style={ms.text}>{L("Kadron boş. Teklifler sekmesindeki yetenek avından ilk dövüşçünü imzala.")}</Text>
      </Card>
    );
  const fixtures = r.kadro.filter((f) => f.mac).sort((a, b) => a.mac!.hafta - b.mac!.hafta);
  return (
    <>
      {fixtures.length ? (
        <>
          <Text style={ms.section}>{L("FİKSTÜR")}</Text>
          {fixtures.map((f) => (
            <FixtureRow key={f.id} f={f} hafta={r.hafta} onPress={() => setFace(f.id)} />
          ))}
        </>
      ) : null}
      <Text style={[ms.section, fixtures.length ? { marginTop: 10 } : null]}>{L("DÖVÜŞÇÜLERİN")}</Text>
      {r.kadro.map((f) => (
        <FighterCard key={f.id} f={f} onPress={() => setOpen(f.id)} />
      ))}
      {sel ? <MgrDossier f={sel} hafta={r.hafta} onClose={() => setOpen(null)} actions={<FighterActions f={sel} hafta={r.hafta} onReleased={() => setOpen(null)} />} /> : null}
      {faceF?.mac ? <FaceOffModal f={faceF} rk={faceF.mac.rakip} org={faceF.mac.org} unvan={faceF.mac.unvan} sup={!!faceF.mac.super} onClose={() => setFace(null)} /> : null}
    </>
  );
}

function FixtureRow({ f, hafta, onPress }: { f: MFighter; hafta: number; onPress: () => void }) {
  const mc = f.mac!;
  const big = mc.unvan || mc.super;
  const now = mc.hafta === hafta;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [ms.fixture, big && { borderColor: C.goldDeep }, pressed && { opacity: 0.75 }]}>
      <LinearGradient colors={big ? ['#2a2108', '#0c0d10'] : ['#121a26', '#0c0d10']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ms.fixtureInner}>
        <View style={ms.fixWeek}>
          <Text style={[ms.fixWeekNo, now && { color: C.gold }]}>{now ? L("BU") : mc.hafta - hafta}</Text>
          <Text style={ms.fixWeekLabel}>{now ? L("HAFTA") : L("HAFTA SONRA")}</Text>
        </View>
        <FighterAvatar look={mLook(f)} size={38} ring={C.red} />
        <Text style={[ms.fixVs, SLANT]}>VS</Text>
        <FighterAvatar look={rLook(mc.rakip, f.kadin)} size={38} ring={C.blue} />
        <View style={{ flex: 1 }}>
          <Text style={ms.fName} numberOfLines={1}>
            {f.soyad} – {rkSoyad(mc.rakip)}
          </Text>
          <Text style={[ms.fMeta, big && { color: C.gold }]} numberOfLines={1}>
            {mc.unvan ? L("🏆 Ünvan · {0}", [orgName(mc.org)]) : mc.super ? L("⭐ Süper dövüş · {0}", [orgName(mc.org)]) : orgName(mc.org)}
          </Text>
        </View>
        <Icon name="movie-open" size={18} color={C.gold} />
      </LinearGradient>
    </Pressable>
  );
}

function FighterCard({ f, onPress }: { f: MFighter; onPress: () => void }) {
  const tc = f.sampiyon ? C.gold : TIER_COLOR[f.tier];
  const status = f.sakat ? { t: L("🩹 Sakat · {0} hafta", [f.sakat]), c: C.orange } : f.guven < 30 ? { t: L("😠 Güveni düşük"), c: C.red } : f.hasar >= 60 ? { t: L("🩺 Hasar yüksek"), c: C.red } : f.mac ? { t: L("🥊 {0} ile maçı var", [rkSoyad(f.mac.rakip)]), c: C.text } : f.bosHafta >= 4 ? { t: L("⏳ {0} haftadır maç bekliyor", [f.bosHafta]), c: C.orange } : { t: L("✅ Hazır"), c: C.green };
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [ms.fighter, { borderColor: tc + (f.sampiyon ? 'aa' : '44') }, pressed && { opacity: 0.8 }]}>
      <LinearGradient colors={f.sampiyon ? ['#221b08', '#0c0d10'] : ['#11151c', '#0c0d10']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ms.fighterInner}>
        <View style={ms.row}>
          <FighterAvatar look={mLook(f)} size={58} ring={tc} />
          <View style={{ flex: 1 }}>
            <Text style={ms.fName} numberOfLines={1}>
              {f.sampiyon ? '🏆 ' : ''}
              {fullName(f)}
            </Text>
            <Text style={ms.fMeta} numberOfLines={1}>
              {rekorOf(f)} · {WEIGHT_CLASSES[f.siklet].ad} · {L(f.ulke)}
            </Text>
            <Text style={[ms.fMeta, { color: tc }]} numberOfLines={1}>
              {f.sozlesme ? `${orgName(f.sozlesme.org)} · #${f.sira}` : L("{0} · sözleşmesiz", [M_TIER_NAME[f.tier]()])}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={ms.power}>{f.guc}</Text>
            <Text style={ms.powerLabel}>{L("GÜÇ")}</Text>
          </View>
        </View>
        <View style={[ms.row, { marginTop: 10, justifyContent: 'space-between' }]}>
          <FormPills f={f} n={5} size={18} />
          <View style={ms.miniBars}>
            <MiniBar icon="handshake" value={f.guven} color={f.guven < 30 ? C.red : f.guven < 55 ? C.orange : C.green} />
            <MiniBar icon="heart-pulse" value={100 - f.hasar} color={f.hasar >= 60 ? C.red : C.blue} />
          </View>
        </View>
        <View style={[ms.row, { marginTop: 8, justifyContent: 'space-between' }]}>
          <Text style={[ms.status, { color: status.c }]} numberOfLines={1}>
            {status.t}
          </Text>
          <Text style={ms.open}>{L("Dosya ›")}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function MiniBar({ icon, value, color }: { icon: IconName; value: number; color: string }) {
  return (
    <View style={ms.miniBar}>
      <Icon name={icon} size={12} color={color} />
      <View style={ms.miniTrack}>
        <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', borderRadius: 3, backgroundColor: color }} />
      </View>
    </View>
  );
}

function FighterActions({ f, hafta, onReleased }: { f: MFighter; hafta: number; onReleased: () => void }) {
  const [sure, setSure] = useState(false);
  const [note, setNote] = useState('');
  const cool = f.kiskirt ? 4 - (hafta - f.kiskirt) : 0;
  return (
    <>
      <Text style={ms.kicker}>{L("MENAJER İŞLERİ")}</Text>
      <Button label={cool > 0 ? L("Meydan okuma {0} hafta sonra", [cool]) : L("Sosyal medyada meydan okut")} icon="bullhorn" tone="ghost" disabled={cool > 0} onPress={() => setNote(actMgr((x) => provoke(x, f.id)) ?? '')} />
      {note ? <Text style={[ms.small, { color: C.gold }]}>{note}</Text> : null}
      {sure ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              label={L("Evet, bırak")}
              tone="red"
              onPress={() => {
                actMgr((x) => releaseFighter(x, f.id));
                onReleased();
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button label={L("Vazgeç")} tone="ghost" onPress={() => setSure(false)} />
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setSure(true)} style={{ alignSelf: 'flex-start', marginTop: 10 }} hitSlop={6}>
          <Text style={ms.link}>{L("Serbest bırak")}</Text>
        </Pressable>
      )}
    </>
  );
}

// ---------- Teklifler ve yetenek avı ----------

function MarketTab({ r }: { r: MgrRun }) {
  const [note, setNote] = useState<string | null>(null);
  const byF = r.kadro.map((f) => ({ f, ts: r.teklifler.filter((t) => t.fid === f.id) })).filter((x) => x.ts.length);
  return (
    <>
      {note ? (
        <Pressable onPress={() => setNote(null)} style={ms.note}>
          <Text style={ms.noteText}>{note}</Text>
        </Pressable>
      ) : null}
      <Text style={ms.section}>{L("TEKLİFLER")}</Text>
      {byF.length ? (
        byF.map(({ f, ts }) => (
          <View key={f.id} style={{ marginBottom: 6 }}>
            <Text style={ms.forWho}>{L("{0} için", [fullName(f)])}</Text>
            {ts.map((t) => (
              <OfferCard key={t.id} r={r} t={t} f={f} setNote={setNote} />
            ))}
          </View>
        ))
      ) : (
        <Text style={ms.small}>{L("Şu an masada teklif yok. Haftayı bitirdikçe organizasyonlar arayacak.")}</Text>
      )}
      <Text style={[ms.section, { marginTop: 14 }]}>{L("YETENEK AVI")}</Text>
      {r.adaylar.length ? r.adaylar.map((a) => <CandidateCard key={a.id} r={r} a={a} setNote={setNote} />) : <Text style={ms.small}>{L("Bu dönem aday kalmadı.")}</Text>}
      <Text style={ms.small}>{L("Yeni adaylar {0} hafta sonra. Yıldızlar senin tahminin; itibarın arttıkça gözün keskinleşir.", [Math.max(0, 4 - (r.hafta - r.adayHafta))])}</Text>
    </>
  );
}

const RUH = { sicak: C.green, gergin: C.gold, kizgin: C.red, son: C.orange };

function OfferCard({ r, t, f, setNote }: { r: MgrRun; t: Teklif; f: MFighter; setNote: (s: string | null) => void }) {
  const m = t.masa;
  const fark = t.rakip ? t.rakip.guc - f.guc : 0;
  const zor = fark >= 5 ? L("Zor") : fark <= -5 ? L("Kolay") : L("Denk");
  const maddeler: Madde[] = ['rovans', 'cikis', 'sakatlik', 'munhasir'];
  return (
    <View style={[ms.offer, (t.unvan || t.super) && { borderColor: C.gold }, t.tip === 'sozlesme' && { borderColor: C.blue }]}>
      <View style={ms.row}>
        <View style={{ flex: 1 }}>
          <Text style={ms.offerKind}>
            {t.tip === 'sozlesme' ? L("SÖZLEŞME · {0} MAÇ", [t.macSayisi ?? 3]) : t.super ? L("⭐ SÜPER DÖVÜŞ") : t.unvan ? L("ÜNVAN MAÇI") : L("MAÇ TEKLİFİ")} · {L("{0}. haftaya kadar", [t.son])}
          </Text>
          <Text style={ms.offerOrg}>{orgName(t.org)}</Text>
          {t.rakip ? (
            <Text style={ms.offerSub}>
              {L("Rakip: {0} ({1}) · güç {2} · {3}", [t.rakip.ad, t.rakip.rekor, t.rakip.guc, zor])}
              {t.rakip.evren ? `\n${L("🌐 YOL Evreni: kariyer modundaki dövüşçün!")}` : ''}
            </Text>
          ) : null}
          {t.orgIster ? <Text style={[ms.offerSub, { color: C.gold }]}>{L("Organizasyon istiyor: {0}", [MADDE[t.orgIster].ad()])}</Text> : null}
          {t.maddeler?.length ? <Text style={[ms.offerSub, { color: C.green }]}>{L("Eklenen maddeler: {0}", [t.maddeler.map((x) => MADDE[x].ad()).join(' · ')])}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={ms.offerPay}>{$(t.ucret)}</Text>
          <Text style={ms.offerSub}>{L("+{0} bonus", [$(t.bonus)])}</Text>
          <Text style={ms.offerSub}>{L("payın %{0}: {1}", [f.kom, $((t.ucret * f.kom) / 100)])}</Text>
        </View>
      </View>
      {m ? (
        <View style={ms.table}>
          <View style={ms.row}>
            <Icon name="handshake" size={15} color={C.gold} />
            <Text style={[ms.kicker, { flex: 1, marginBottom: 0 }]}>{L("PAZARLIK MASASI")}</Text>
            <Text style={ms.patLabel}>{L("Sabır")}</Text>
            {Array.from({ length: m.sabirMax }, (_, i) => (
              <View key={i} style={[ms.pat, { backgroundColor: i < m.sabir ? RUH[m.ruh] : C.border }]} />
            ))}
          </View>
          <View style={[ms.tableBubble, { borderColor: RUH[m.ruh] }]}>
            <Text style={ms.bubbleText}>{m.mesaj}</Text>
          </View>
          {m.ruh !== 'son' ? (
            <View style={ms.chips}>
              <Chip label={L("Ücret +%15")} onPress={() => actMgr((x) => setNote(tableAsk(x, t.id, 'ucret')))} />
              <Chip label={L("Bonus +%30")} onPress={() => actMgr((x) => setNote(tableAsk(x, t.id, 'bonus')))} />
              {t.tip === 'sozlesme'
                ? maddeler
                    .filter((x) => !t.maddeler?.includes(x) && x !== t.orgIster)
                    .map((x) => <Chip key={x} label={MADDE[x].ad()} hint={MADDE[x].aciklama()} gold onPress={() => actMgr((y) => setNote(tableAsk(y, t.id, x)))} />)
                : null}
            </View>
          ) : null}
          <Pressable onPress={() => actMgr((x) => leaveTable(x, t.id))} hitSlop={6} style={{ alignSelf: 'center' }}>
            <Text style={ms.link}>{L("Masadan kalk (teklif bu haliyle kalır)")}</Text>
          </Pressable>
        </View>
      ) : null}
      {t.super ? (
        <View style={{ marginTop: 8, gap: 6 }}>
          <Text style={ms.small}>{L("PPV payı: garanti {0} + satışlardan %25. Tahmini {1}, ama satış düşük de olabilir, çok yüksek de.", [$(t.ucret * 0.25), $(ppvEstimate(f))])}</Text>
          <Button label={L("PPV payını al")} tone="gold" icon="television-play" onPress={() => actMgr((x) => setNote(acceptOffer(x, t.id, 'ppv')))} />
        </View>
      ) : null}
      <View style={[ms.row, { marginTop: 8, gap: 6 }]}>
        <View style={{ flex: 1 }}>
          <Button
            label={t.tip === 'sozlesme' ? L("İmzala") : t.super ? L("Sabit ücret") : L("Kabul")}
            tone="gold"
            onPress={() => {
              sfx('chime');
              actMgr((x) => setNote(acceptOffer(x, t.id)));
            }}
          />
        </View>
        {!m && !t.pazarlik ? (
          <View style={{ flex: 1 }}>
            <Button label={L("Pazarlık")} tone="ghost" icon="handshake" onPress={() => actMgr((x) => openTable(x, t.id))} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Button label={L("Reddet")} tone="ghost" onPress={() => actMgr((x) => declineOffer(x, t.id))} />
        </View>
      </View>
    </View>
  );
}

function Chip({ label, onPress, gold, hint }: { label: string; onPress: () => void; gold?: boolean; hint?: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [ms.chip, gold && { borderColor: C.gold }, pressed && { opacity: 0.7 }]}>
      <Text style={[ms.chipText, gold && { color: C.gold }]}>{label}</Text>
      {hint ? <Text style={ms.chipHint}>{hint}</Text> : null}
    </Pressable>
  );
}

function CandidateCard({ r, a, setNote }: { r: MgrRun; a: Aday; setNote: (s: string | null) => void }) {
  const full = r.kadro.length >= ofisOf(r).kapasite;
  return (
    <View style={ms.fighter}>
      <View style={ms.row}>
        <FighterAvatar look={look(a)} size={44} ring={TIER_COLOR[a.tier]} />
        <View style={{ flex: 1 }}>
          <Text style={ms.fName} numberOfLines={1}>
            {fullName(a)}
          </Text>
          <Text style={ms.fMeta} numberOfLines={1}>
            {a.yas} · {WEIGHT_CLASSES[a.siklet].ad} · {L(a.ulke)} · {rekorOf(a)}
          </Text>
          <Text style={ms.fMeta}>
            {M_TIER_NAME[a.tier]()} · {KISILIK[a.kisilik].ad()} · {'★'.repeat(starsOf(a.tahmin))}
            {'☆'.repeat(5 - starsOf(a.tahmin))}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={ms.power}>{a.guc}</Text>
          <Text style={ms.powerLabel}>{L("GÜÇ")}</Text>
        </View>
      </View>
      <Text style={ms.small}>{L("İmza parası {0}. Hangi komisyonu teklif edersin? Düşük komisyon kolay kabul edilir.", [$(a.imza)])}</Text>
      <View style={[ms.row, { gap: 6, marginTop: 6 }]}>
        {[10, 15, 20].map((k) => (
          <View key={k} style={{ flex: 1 }}>
            <Button label={`%${k}`} tone={k === 15 ? 'gold' : 'ghost'} disabled={full || r.para < a.imza} onPress={() => actMgr((x) => setNote(signCandidate(x, a.id, k)))} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------- Ajans ----------

function AgencyTab({ r, onExit }: { r: MgrRun; onExit: () => void }) {
  const [sure, setSure] = useState(false);
  const next = OFIS[r.ofis + 1];
  const rank = agencyRanking(r);
  const orgs = (Object.keys(r.iliski) as OrgId[]).sort((a, b) => (r.iliski[b] ?? 0) - (r.iliski[a] ?? 0));
  return (
    <>
      {r.hedef ? (
        <Card accent={r.hedef.tamam ? C.green : r.hedef.basarisiz ? C.red : C.gold}>
          <Text style={ms.kicker}>{L("SENARYO HEDEFİ")}</Text>
          <Text style={ms.text}>{r.hedef.metin}</Text>
          <Text style={ms.small}>{r.hedef.tamam ? L("✅ Tamamlandı") : r.hedef.basarisiz ? L("❌ Süre doldu") : L("Son hafta: {0}", [r.hedef.bitis])}</Text>
        </Card>
      ) : null}
      <StyleCard r={r} />
      <MarketCard r={r} />
      <Card>
        <Text style={ms.kicker}>{L("OFİS")}</Text>
        <Text style={ms.text}>{L("{0} · {1} dövüşçü kapasitesi · haftalık kira {2}", [ofisOf(r).ad(), ofisOf(r).kapasite, $(ofisOf(r).kira)])}</Text>
        {next ? <Button label={L("Taşın: {0} · {1}", [next.ad(), $(next.maliyet)])} tone="gold" icon="office-building" disabled={r.para < next.maliyet} onPress={() => actMgr(upgradeOffice)} /> : <Text style={ms.small}>{L("Şehrin en iyi ofisindesin.")}</Text>}
      </Card>
      <Card>
        <Text style={ms.kicker}>{L("AJANS SIRALAMASI")}</Text>
        {rank.rows.map((x, i) => (
          <View key={x.ad} style={[ms.row, { paddingVertical: 3 }]}>
            <Text style={[ms.rankNo, x.sen && { color: C.gold }]}>{i + 1}</Text>
            <Text style={[ms.rankName, x.sen && { color: C.gold }]} numberOfLines={1}>
              {x.ad}
            </Text>
            <Text style={ms.rankPts}>{x.puan}</Text>
          </View>
        ))}
        <Text style={ms.small}>{L("Yıl sonunda birinci olan ajans Yılın Menajeri ödülünü alır.")}</Text>
      </Card>
      {orgs.length ? (
        <Card>
          <Text style={ms.kicker}>{L("ORGANİZASYONLARLA İLİŞKİ")}</Text>
          {orgs.map((o) => {
            const v = r.iliski[o] ?? 0;
            return <Bar key={o} value={v + 50} color={v <= -30 ? C.red : v < 0 ? C.orange : C.green} label={orgName(o)} right={v <= -30 ? L("KARA LİSTE") : String(v)} />;
          })}
        </Card>
      ) : null}
      <Card>
        <Text style={ms.kicker}>{L("KARİYER")}</Text>
        <Text style={ms.small}>{L("Toplam komisyon: {0} · Şampiyonluk: {1} · Kaybedilen dövüşçü: {2}", [$(r.gelir), r.sampiyonluk, r.ayrilan])}</Text>
        {r.oduller.map((o, i) => (
          <Text key={i} style={[ms.small, { color: C.gold }]}>
            🏅 {o}
          </Text>
        ))}
        {r.gecmis.slice(0, 12).map((g, i) => (
          <Text key={i} style={ms.small}>
            {g}
          </Text>
        ))}
      </Card>
      {sure ? (
        <View style={{ gap: 8 }}>
          <Text style={ms.text}>{L("Ajans kapanır ve kariyerin Onur Listesi'ne yazılır. Emin misin?")}</Text>
          <Button
            label={L("Ajansı kapat")}
            tone="red"
            onPress={() => {
              closeAgency();
              onExit();
            }}
          />
          <Button label={L("Vazgeç")} tone="ghost" onPress={() => setSure(false)} />
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {r.meydan ? <Button label={L("Meydan okumayı kaydet ve çık")} icon="content-save" tone="ghost" onPress={() => setMgrSlot('kariyer')} /> : <MeydanCard ad={r.ad} soyad={r.soyad} ajans={r.ajans} />}
          <Button label={L("Menüye dön")} icon="arrow-left" tone="ghost" onPress={onExit} />
          <Pressable onPress={() => setSure(true)} style={{ alignSelf: 'center' }} hitSlop={8}>
            <Text style={ms.link}>{L("Ajansı kapat ve emekli ol")}</Text>
          </Pressable>
        </View>
      )}
    </>
  );
}

// ---------- Menajer tarzı ve pazar ----------

function StyleCard({ r }: { r: MgrRun }) {
  const cur = tarzOf(r);
  return (
    <Card accent={cur ? C.gold : undefined}>
      <Text style={ms.kicker}>{L("MENAJER TARZIN")}</Text>
      <Text style={ms.text}>{cur ? L("Herkes seni “{0}” olarak tanıyor.", [TARZ[cur].ad()]) : L("Tarzın kararlarınla şekillenecek. Bir eksen {0} puana ulaşıp öne geçince oturur.", [TARZ_ESIK])}</Text>
      {(Object.keys(TARZ) as TarzKey[]).map((k) => (
        <View key={k} style={{ marginBottom: 4 }}>
          <Bar value={Math.min(100, ((r.tarz?.[k] ?? 0) / (TARZ_ESIK * 2)) * 100)} color={cur === k ? C.gold : C.dim} label={TARZ[k].ad()} right={String(r.tarz?.[k] ?? 0)} />
          {cur === k ? <Text style={ms.small}>{TARZ[k].aciklama()}</Text> : null}
        </View>
      ))}
    </Card>
  );
}

function MarketCard({ r }: { r: MgrRun }) {
  const items = (Object.entries(r.pazar ?? {}) as [OrgId, { carpan: number; bitis: number; kapali?: boolean; ad?: string }][]).filter(([, p]) => p.bitis >= r.hafta);
  if (!items.length) return null;
  return (
    <Card>
      <Text style={ms.kicker}>{L("PAZAR")}</Text>
      {items.map(([o, p]) => (
        <Text key={o} style={[ms.small, { color: kapali(r, o) ? C.red : C.green }]}>
          {kapali(r, o) ? L("📉 {0} kapalı ({1}. haftaya kadar)", [orgName(o), p.bitis]) : L("💰 {0}: ücretler %{1} yukarıda ({2}. haftaya kadar)", [orgName(o), Math.round((p.carpan - 1) * 100), p.bitis])}
        </Text>
      ))}
    </Card>
  );
}

// ---------- Haftalık meydan okuma ----------

function MeydanCard({ ad, soyad, ajans }: { ad: string; soyad: string; ajans: string }) {
  const kod = meydanKodu();
  const sen = meydanSenaryo(kod);
  const cur = peekRun('meydan');
  const mine = cur?.meydan?.kod === kod ? cur : null;
  const best = meydanBest();
  const [code, setCode] = useState('');
  const [cmp, setCmp] = useState('');
  const start = () => {
    track('manager_challenge', { kod });
    setMgrRun(createMeydan(ad, soyad, ajans), 'meydan');
    setMgrSlot('meydan');
  };
  return (
    <LinearGradient colors={['#2a2006', '#0e0c07']} style={ms.challenge}>
      <View style={ms.row}>
        <Icon name="flag-checkered" size={20} color={C.gold} />
        <Text style={[ms.kicker, { flex: 1, marginBottom: 0 }]}>{L("HAFTALIK MEYDAN OKUMA · {0}", [kod])}</Text>
      </View>
      <Text style={ms.text}>{L("Bu hafta herkes aynı ajansla başlıyor: “{0}”. {1} haftada en yüksek skoru yap, kodunu arkadaşlarınla paylaş. Ücretsiz.", [SENARYO[sen].ad(), MEYDAN_HAFTA])}</Text>
      {best?.kod === kod ? <Text style={[ms.small, { color: C.gold }]}>{L("Bu haftaki en iyi skorun: {0}", [best.skor])}</Text> : null}
      {mine && !mine.emekli ? (
        <Button label={L("Devam et ({0}. hafta)", [mine.hafta])} tone="gold" icon="play" onPress={() => setMgrSlot('meydan')} />
      ) : (
        <Button label={mine ? L("Yeniden dene") : L("Meydan okumaya başla")} tone="gold" icon="flag-checkered" onPress={start} />
      )}
      <View style={[ms.row, { marginTop: 8, gap: 6 }]}>
        <TextInput value={code} onChangeText={setCode} placeholder={L("Arkadaşının kodu")} placeholderTextColor={C.faint} autoCapitalize="characters" style={[ms.input, { flex: 1, minWidth: 0, width: 0, paddingVertical: 8 }]} />
        <Pressable
          onPress={() => {
            const x = readMeydan(code);
            if (!x) return setCmp(L("Kod geçersiz."));
            const my = meydanBest();
            const mineS = my?.kod === x.kod ? my.skor : null;
            setCmp(x.kod !== kod ? L("Bu kod {0} haftasından: skor {1}.", [x.kod, x.skor]) : mineS == null ? L("Arkadaşın {0} yaptı. Sıra sende!", [x.skor]) : mineS > x.skor ? L("Sen {0}, arkadaşın {1}. Kazandın! 🏆", [mineS, x.skor]) : mineS === x.skor ? L("Berabere: {0}.", [x.skor]) : L("Arkadaşın {0}, sen {1}. Rövanş zamanı.", [x.skor, mineS]));
          }}
          style={ms.cmpBtn}
        >
          <Text style={ms.chipText}>{L("Karşılaştır")}</Text>
        </Pressable>
      </View>
      {cmp ? <Text style={[ms.small, { color: C.text }]}>{cmp}</Text> : null}
    </LinearGradient>
  );
}

function MeydanEnd({ r }: { r: MgrRun }) {
  const skor = r.meydan?.skor ?? meydanSkor(r);
  const kod = meydanPaylas(r);
  useEffect(() => {
    if (r.meydan) saveMeydanBest(r.meydan.kod, skor);
  }, [r.meydan, skor]);
  return (
    <Screen
      footer={
        <View style={{ gap: 8 }}>
          <Button label={L("Skorumu paylaş")} tone="gold" icon="share-variant" onPress={() => void Share.share({ message: L("YOL Menajer Modu haftalık meydan okumada {0} puan yaptım. Geçebilir misin? Kodum: {1}", [skor, kod]) }).catch(() => undefined)} />
          <Button
            label={L("Ajansıma dön")}
            tone="ghost"
            icon="arrow-left"
            onPress={() => setMgrSlot('kariyer')}
          />
        </View>
      }
    >
      <LinearGradient colors={['#2a2006', '#08090b']} style={ms.hero}>
        <Icon name="flag-checkered" size={36} color={C.gold} />
        <Text style={[ms.heroTitle, SLANT]}>{L("MEYDAN OKUMA BİTTİ")}</Text>
        <Text style={[ms.score]}>{skor}</Text>
        <Text style={ms.heroText}>{L("{0} haftada {1} komisyon, {2} şampiyonluk.", [MEYDAN_HAFTA, $(r.gelir), r.sampiyonluk])}</Text>
        <Text selectable style={ms.code}>{kod}</Text>
        <Text style={ms.small}>{L("Arkadaşların bu kodu Menajer Modu'ndaki meydan okuma kartına yazarak skorunu görebilir.")}</Text>
      </LinearGradient>
      {r.rapor?.map((l, i) => (
        <Text key={i} style={ms.small}>
          {l.trim()}
        </Text>
      ))}
    </Screen>
  );
}

function ClosedView({ r, onExit }: { r: MgrRun; onExit: () => void }) {
  return (
    <Screen
      footer={
        <View style={{ gap: 8 }}>
          <Button
            label={L("Onur Listesi'ne yaz ve yeni ajans kur")}
            tone="gold"
            onPress={() => {
              closeAgency();
            }}
          />
          <Button label={L("Menüye dön")} icon="arrow-left" tone="ghost" onPress={onExit} />
        </View>
      }
    >
      <LinearGradient colors={['#0d1a2a', '#08090b']} style={ms.hero}>
        <Icon name="briefcase-remove" size={36} color={C.red} />
        <Text style={[ms.heroTitle, SLANT]}>{L("AJANS KAPANDI")}</Text>
        <Text style={ms.heroText}>{L("{0}, {1} hafta sürdü. {2} şampiyonluk, {3} komisyon.", [r.ajans, r.hafta, r.sampiyonluk, $(r.gelir)])}</Text>
      </LinearGradient>
      {r.rapor?.map((l, i) => (
        <Text key={i} style={ms.small}>
          {l.trim()}
        </Text>
      ))}
    </Screen>
  );
}

const ms = StyleSheet.create({
  pack: { borderRadius: R + 2, borderWidth: 1, borderColor: '#1d3a5a', padding: 14, gap: 8, marginVertical: 10 },
  packLead: { color: C.gold, fontFamily: F.bold, fontSize: 14 },
  packText: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  link: { color: C.faint, fontFamily: F.semi, fontSize: 12, textDecorationLine: 'underline' },
  hero: { borderRadius: R + 4, borderWidth: 1, borderColor: '#1d3a5a', padding: 16, alignItems: 'center', gap: 6 },
  heroTitle: { color: C.text, fontFamily: F.display, fontSize: 26 },
  heroText: { color: C.dim, fontFamily: F.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  bullet: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bulletText: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  label: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1.5, marginBottom: 4 },
  input: { backgroundColor: '#0d0f13', borderWidth: 1, borderColor: C.border, borderRadius: R, color: C.text, fontFamily: F.semi, fontSize: 15, paddingHorizontal: 12, paddingVertical: 10 },
  section: { color: C.text, fontFamily: F.display, fontSize: 14, letterSpacing: 1.5, marginTop: 4, marginBottom: 8 },
  kicker: { color: C.gold, fontFamily: F.semi, fontSize: 11, letterSpacing: 1.5, marginBottom: 6 },
  text: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 19, marginBottom: 6 },
  small: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 3 },
  heroCard: { borderRadius: R + 4, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#1d3a5a', overflow: 'hidden' },
  nick: { color: C.gold, fontFamily: F.displayMed, fontSize: 11, letterSpacing: 1.5 },
  name: { color: C.text, fontFamily: F.display, fontSize: 24, lineHeight: 28 },
  heroSub: { color: C.dim, fontFamily: F.semi, fontSize: 12, marginTop: 2 },
  meters: { flexDirection: 'row', marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', paddingTop: 10 },
  meter: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  meterLabel: { color: C.faint, fontFamily: F.display, fontSize: 9, letterSpacing: 1.5 },
  meterVal: { fontFamily: F.display, fontSize: 18, marginTop: 1 },
  bubble: { borderWidth: 1, borderColor: C.border, borderRadius: R + 2, padding: 12, marginBottom: 8, backgroundColor: C.card },
  bubbleHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  bubbleIcon: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bubbleFrom: { flex: 1, color: C.text, fontFamily: F.bold, fontSize: 13 },
  bubbleWeek: { color: C.faint, fontFamily: F.semi, fontSize: 10 },
  bubbleText: { color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  reply: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.goldDeep, borderRadius: R, paddingHorizontal: 10, paddingVertical: 9, marginTop: 6, backgroundColor: '#15120a' },
  replyText: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 13, lineHeight: 18 },
  answered: { marginTop: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 6, gap: 3 },
  answeredMe: { color: C.gold, fontFamily: F.semi, fontSize: 12.5, alignSelf: 'flex-end', textAlign: 'right' },
  answeredRes: { color: C.dim, fontFamily: F.body, fontSize: 12.5, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fighter: { borderWidth: 1, borderColor: C.border, borderRadius: R + 4, marginBottom: 10, overflow: 'hidden' },
  fighterInner: { padding: 12 },
  miniBars: { gap: 4, width: 110 },
  miniBar: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: '#ffffff14', overflow: 'hidden' },
  status: { flex: 1, fontFamily: F.semi, fontSize: 12 },
  open: { color: C.gold, fontFamily: F.semi, fontSize: 12 },
  fixture: { borderWidth: 1, borderColor: '#1d3a5a', borderRadius: R + 2, marginBottom: 8, overflow: 'hidden' },
  fixtureInner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  fixWeek: { width: 46, alignItems: 'center' },
  fixWeekNo: { color: C.text, fontFamily: F.display, fontSize: 18 },
  fixWeekLabel: { color: C.faint, fontFamily: F.display, fontSize: 7.5, letterSpacing: 1, textAlign: 'center' },
  fixVs: { color: C.gold, fontFamily: F.display, fontSize: 12 },
  night: { borderRadius: R + 4, borderWidth: 1, borderColor: C.goldDeep, padding: 14, marginBottom: 12, overflow: 'hidden' },
  nightRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#ffffff12' },
  nightBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: C.gold },
  nightBtnText: { color: '#1f1605', fontFamily: F.bold, fontSize: 12 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, borderWidth: 1, borderColor: C.goldDeep, borderRadius: R, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#1a1508' },
  bannerText: { flex: 1, color: C.gold, fontFamily: F.semi, fontSize: 12.5 },
  fName: { color: C.text, fontFamily: F.bold, fontSize: 15 },
  fMeta: { color: C.dim, fontFamily: F.body, fontSize: 12, marginTop: 1 },
  power: { color: C.text, fontFamily: F.display, fontSize: 22 },
  powerLabel: { color: C.faint, fontFamily: F.display, fontSize: 9, letterSpacing: 1.5 },
  next: { color: C.text, fontFamily: F.semi, fontSize: 12, marginTop: 4 },
  detail: { marginTop: 6, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 6 },
  note: { borderWidth: 1, borderColor: C.gold + '88', borderRadius: R, padding: 10, marginBottom: 10, backgroundColor: '#1a160b' },
  noteText: { color: C.text, fontFamily: F.semi, fontSize: 13, lineHeight: 18 },
  forWho: { color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 1.2, marginBottom: 4 },
  offer: { borderWidth: 1, borderColor: C.border, borderRadius: R + 2, padding: 12, marginBottom: 8, backgroundColor: C.card },
  offerKind: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1.2 },
  offerOrg: { color: C.text, fontFamily: F.display, fontSize: 18, marginTop: 2 },
  offerSub: { color: C.dim, fontFamily: F.body, fontSize: 11.5, marginTop: 1 },
  offerPay: { color: C.green, fontFamily: F.display, fontSize: 18 },
  table: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#ffffff1a', paddingTop: 8, gap: 8 },
  tableBubble: { borderWidth: 1, borderRadius: 10, padding: 10, backgroundColor: '#00000066' },
  patLabel: { color: C.dim, fontFamily: F.semi, fontSize: 10, marginRight: 2 },
  pat: { width: 14, height: 6, borderRadius: 3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexGrow: 1, borderWidth: 1, borderColor: C.border, backgroundColor: '#ffffff0d', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 8, alignItems: 'center', maxWidth: '100%' },
  chipText: { color: C.text, fontFamily: F.display, fontSize: 12 },
  chipHint: { color: C.faint, fontFamily: F.body, fontSize: 10, textAlign: 'center', marginTop: 2 },
  rankNo: { width: 22, color: C.dim, fontFamily: F.display, fontSize: 14 },
  rankName: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 13 },
  rankPts: { color: C.dim, fontFamily: F.display, fontSize: 13 },
  waitHint: { color: C.gold, fontFamily: F.semi, fontSize: 12, textAlign: 'center' },
  challenge: { borderRadius: R + 2, borderWidth: 1, borderColor: C.goldDeep, padding: 14, gap: 6, marginBottom: 12 },
  cmpBtn: { borderWidth: 1, borderColor: C.gold, borderRadius: R, paddingHorizontal: 12, paddingVertical: 10 },
  score: { color: C.gold, fontFamily: F.display, fontSize: 56, lineHeight: 64 },
  code: { color: C.text, fontFamily: F.display, fontSize: 18, letterSpacing: 1, marginTop: 6 },
});
