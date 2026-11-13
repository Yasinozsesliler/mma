// Menajer Modu: dövüşçü dosyası, sinematik face-off ve maç izleme ekranları.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import { BACKGROUNDS, WEIGHT_CLASSES } from '../engine/data';
import { ARC, faceOffLines, fightBeats, fullName, KISILIK, M_TIER_NAME, MADDE, orgName, rawL, rekorOf, rkSoyad, starsOf, type MFighter, type MKayit, type Rakip } from '../engine/manager';
import { lookFor } from '../engine/tale';
import type { FightState, OrgId } from '../engine/types';
import { L, LOC } from '../i18n';
import { CageView } from './CageView';
import { Bar, Button, CageBg, Icon, SLANT } from './components';
import { FighterAvatar } from './FighterAvatar';
import { C, F, R } from './theme';

const $ = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n)).toLocaleString(LOC)}`;
export const mLook = (f: Pick<MFighter, 'id' | 'ulke' | 'kadin'>) => lookFor({ id: f.id, uyruk: f.ulke, kadin: f.kadin });
export const rLook = (rk: Rakip, kadin: boolean) => rk.look ?? lookFor({ id: `rk-${rk.ad}`, uyruk: rk.ulke, kadin });
export const TIER_COLOR = {
  amator: C.dim,
  bolgesel: C.blue,
  buyuk: C.orange,
  ucc: C.gold,
} as const;
const RED_KIT = { shorts: '#b5121b', trim: '#ffffff', glove: '#c1121f' };

// ---------- Küçük parçalar ----------

/** Son maçların G/M dizisi (en yenisi solda) */
export function FormPills({ f, n = 5, size = 18 }: { f: MFighter; n?: number; size?: number }) {
  const ms = (f.maclar ?? []).slice(0, n);
  if (!ms.length) return <Text style={v.faint}>{L("Henüz maç yok")}</Text>;
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {ms.map((m) => (
        <View
          key={m.id}
          style={[
            v.pill,
            {
              width: size,
              height: size,
              backgroundColor: m.w ? '#12351f' : '#3a1216',
              borderColor: m.w ? C.green : C.red,
            },
          ]}
        >
          <Text style={[v.pillText, { color: m.w ? C.green : C.red, fontSize: size * 0.55 }]}>{m.w ? L("G") : L("M")}</Text>
        </View>
      ))}
    </View>
  );
}

/** Güç gelişimi: maçlardaki güç + bugün */
function PowerTrend({ f }: { f: MFighter }) {
  const pts = [
    ...(f.maclar ?? [])
      .slice(0, 11)
      .map((m) => m.guc)
      .reverse(),
    f.guc,
  ];
  if (pts.length < 2) return null;
  const lo = Math.min(...pts) - 2;
  const hi = Math.max(...pts) + 1;
  return (
    <View style={v.trend}>
      {pts.map((p, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
          <View
            style={{
              width: '62%',
              height: 6 + ((p - lo) / Math.max(1, hi - lo)) * 46,
              borderRadius: 3,
              backgroundColor: i === pts.length - 1 ? C.gold : '#2a3d5c',
            }}
          />
        </View>
      ))}
    </View>
  );
}

function Stat({ label, value, color = C.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={v.stat}>
      <Text style={[v.statVal, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={v.statLabel}>{label}</Text>
    </View>
  );
}

function FightRow({ f, m, onWatch }: { f: MFighter; m: MKayit; onWatch: () => void }) {
  return (
    <Pressable onPress={onWatch} style={({ pressed }) => [v.fRow, pressed && { opacity: 0.7 }]}>
      <View
        style={[
          v.res,
          {
            backgroundColor: m.w ? '#12351f' : '#3a1216',
            borderColor: m.w ? C.green : C.red,
          },
        ]}
      >
        <Text style={[v.resText, { color: m.w ? C.green : C.red }]}>{m.w ? L("G") : L("M")}</Text>
      </View>
      <FighterAvatar look={rLook(m.rk, f.kadin)} size={34} ring={C.blue} />
      <View style={{ flex: 1 }}>
        <Text style={v.fRowName} numberOfLines={1}>
          {m.unvan ? '🏆 ' : m.sup ? '⭐ ' : ''}
          {m.rk.ad}
        </Text>
        <Text style={v.faint} numberOfLines={2}>
          {L("{0} · {1}, {2}. raunt · {3}. hafta", [orgName(m.org), m.kod, m.ra, m.h])}
        </Text>
      </View>
      <View style={v.watchBtn}>
        <Icon name="play" size={14} color={C.gold} />
        <Text style={v.watchText}>{L("İzle")}</Text>
      </View>
    </Pressable>
  );
}

// ---------- Dövüşçü dosyası ----------

export function MgrDossier({
  f,
  hafta,
  onClose,
  actions,
}: {
  f: MFighter;
  hafta: number;
  onClose: () => void;
  /** Meydan okuma / serbest bırakma gibi menajer işlemleri */
  actions?: React.ReactNode;
}) {
  const [watch, setWatch] = useState<MKayit | null>(null);
  const [face, setFace] = useState(false);
  const tc = f.sampiyon ? C.gold : TIER_COLOR[f.tier];
  const seri = f.seri > 0 ? L("{0}G seri", [f.seri]) : f.seri < 0 ? L("{0}M seri", [-f.seri]) : '—';
  const bg = BACKGROUNDS[f.stil]?.ad ?? f.stil;
  const ko = (f.maclar ?? []).filter((m) => m.w && (m.kod === 'KO' || m.kod === 'TKO')).length;
  const sub = (f.maclar ?? []).filter((m) => m.w && m.kod === 'SUB').length;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={v.modal}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}>
          <LinearGradient colors={f.sampiyon ? ['#2a2108', '#0e0f12', '#08090b'] : ['#0d1a2a', '#0e0f12', '#08090b']} locations={[0, 0.6, 1]} style={[v.head, { borderColor: tc + '66' }]}>
            <CageBg opacity={0.05} />
            <Pressable onPress={onClose} hitSlop={12} style={v.close}>
              <Icon name="close" size={22} color={C.dim} />
            </Pressable>
            <FighterAvatar look={mLook(f)} size={104} ring={tc} />
            {f.lakap ? <Text style={v.nick}>“{f.lakap.toLocaleUpperCase(LOC)}”</Text> : null}
            <Text style={[v.bigName, SLANT]} numberOfLines={1} adjustsFontSizeToFit>
              {fullName(f).toLocaleUpperCase(LOC)}
            </Text>
            <Text style={v.sub}>
              {f.yas} · {WEIGHT_CLASSES[f.siklet].ad} · {L(f.ulke)} · {bg}
            </Text>
            <View style={[v.tierBadge, { borderColor: tc }]}>
              <Text style={[v.tierText, { color: tc }]}>
                {f.sampiyon
                  ? L("🏆 {0} ŞAMPİYONU", [f.sozlesme ? orgName(f.sozlesme.org).toLocaleUpperCase(LOC) : M_TIER_NAME[f.tier]().toLocaleUpperCase(LOC)])
                  : f.sozlesme
                    ? `${orgName(f.sozlesme.org).toLocaleUpperCase(LOC)} · #${f.sira}`
                    : M_TIER_NAME[f.tier]().toLocaleUpperCase(LOC)}
              </Text>
            </View>
            <View style={v.stats}>
              <Stat label={L("REKOR")} value={rekorOf(f)} />
              <Stat label={L("GÜÇ")} value={String(f.guc)} color={C.gold} />
              <Stat label={L("SERİ")} value={seri} color={f.seri > 0 ? C.green : f.seri < 0 ? C.red : C.dim} />
              <Stat label={L("ŞÖHRET")} value={String(f.un ?? 0)} color={C.orange} />
            </View>
          </LinearGradient>

          {f.mac ? (
            <Pressable onPress={() => setFace(true)} style={({ pressed }) => [v.nextFight, pressed && { opacity: 0.8 }]}>
              <LinearGradient colors={f.mac.unvan || f.mac.super ? ['#2a2108', '#0c0d10'] : ['#14161a', '#0c0d10']} style={v.nextInner}>
                <Text style={v.kicker}>{f.mac.unvan ? L("SIRADAKİ · ÜNVAN MAÇI") : f.mac.super ? L("SIRADAKİ · SÜPER DÖVÜŞ") : L("SIRADAKİ MAÇ")}</Text>
                <View style={v.vsRow}>
                  <FighterAvatar look={mLook(f)} size={46} ring={C.red} />
                  <Text style={[v.vsSmall, SLANT]}>VS</Text>
                  <FighterAvatar look={rLook(f.mac.rakip, f.kadin)} size={46} ring={C.blue} />
                  <View style={{ flex: 1 }}>
                    <Text style={v.fRowName} numberOfLines={1}>
                      {f.mac.rakip.ad}
                    </Text>
                    <Text style={v.faint} numberOfLines={1}>
                      {L("{0} · güç {1} · {2}. hafta", [f.mac.rakip.rekor, f.mac.rakip.guc, f.mac.hafta])}
                    </Text>
                    <Text style={v.faint} numberOfLines={1}>
                      {f.mac.hafta === hafta ? L("🥊 BU HAFTA · {0}", [orgName(f.mac.org)]) : L("{0} hafta sonra · {1}", [f.mac.hafta - hafta, orgName(f.mac.org)])}
                    </Text>
                  </View>
                </View>
                <View style={v.faceCta}>
                  <Icon name="movie-open" size={15} color={C.gold} />
                  <Text style={v.watchText}>{L("Face-off'u izle")}</Text>
                </View>
              </LinearGradient>
            </Pressable>
          ) : null}

          <View style={v.box}>
            <Text style={v.kicker}>{L("FORM")}</Text>
            <FormPills f={f} n={8} size={22} />
            {(f.maclar?.length ?? 0) > 1 ? (
              <>
                <Text style={[v.kicker, { marginTop: 12 }]}>{L("GÜÇ GELİŞİMİ")}</Text>
                <PowerTrend f={f} />
              </>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Stat label={L("NAKAVT")} value={String(ko)} />
              <Stat label={L("SUBMISSION")} value={String(sub)} />
              <Stat label={L("POTANSİYEL")} value={'★'.repeat(starsOf(f.pot))} color={C.gold} />
            </View>
          </View>

          <View style={v.box}>
            <Text style={v.kicker}>{L("DURUM")}</Text>
            <Bar value={f.guven} color={f.guven < 30 ? C.red : f.guven < 55 ? C.orange : C.green} label={L("Sana güveni")} right={String(f.guven)} />
            <Bar value={f.hasar} color={f.hasar >= 60 ? C.red : C.dim} label={L("Birikmiş hasar")} right={String(f.hasar)} />
            <Bar value={f.un ?? 0} color={C.orange} label={L("Şöhret")} right={String(f.un ?? 0)} />
            {f.sakat ? <Text style={[v.line, { color: C.orange }]}>{L("🩹 Sakat: {0} hafta", [f.sakat])}</Text> : null}
            {f.riskli ? <Text style={[v.line, { color: C.red }]}>{L("⚠️ Doktor uyarısına rağmen dövüşüyor")}</Text> : null}
            {f.hikaye && f.hikaye.adim >= 0 ? <Text style={[v.line, { color: C.gold }]}>{L("📖 Hikâye: {0}", [ARC[f.hikaye.tip].ad()])}</Text> : null}
            <Text style={v.line}>{L("Kişilik: {0}. {1}", [KISILIK[f.kisilik].ad(), KISILIK[f.kisilik].aciklama()])}</Text>
            <Text style={v.line}>{L("Komisyon: %{0} · Kariyer kazancı: {1} · Ajansta {2} hafta", [f.kom, $(f.kazanc), Math.max(0, hafta - f.katilis)])}</Text>
            {f.sozlesme ? (
              <Text style={v.line}>
                {L("Sözleşme: {0} · {1} maç kaldı · maç başı {2} + {3} bonus", [orgName(f.sozlesme.org), f.sozlesme.kalan, $(f.sozlesme.ucret), $(f.sozlesme.bonus)])}
                {f.sozlesme.maddeler.length ? `\n${L("Maddeler")}: ${f.sozlesme.maddeler.map((m) => MADDE[m].ad()).join(' · ')}` : ''}
              </Text>
            ) : null}
          </View>

          <View style={v.box}>
            <Text style={v.kicker}>{L("MAÇ GEÇMİŞİ")}</Text>
            {f.maclar?.length ? f.maclar.map((m) => <FightRow key={m.id} f={f} m={m} onWatch={() => setWatch(m)} />) : <Text style={v.line}>{L("Ajansla henüz maça çıkmadı. İlk maçı Teklifler sekmesinden ayarla.")}</Text>}
          </View>

          {actions ? <View style={v.box}>{actions}</View> : null}
        </ScrollView>
      </View>
      {watch ? <MgrWatch f={f} m={watch} onClose={() => setWatch(null)} /> : null}
      {face && f.mac ? <FaceOffModal f={f} rk={f.mac.rakip} org={f.mac.org} unvan={f.mac.unvan} sup={!!f.mac.super} onClose={() => setFace(false)} /> : null}
    </Modal>
  );
}

// ---------- Sinematik face-off ----------

const tm = (x: Animated.Value, to: number, ms = 300, e = Easing.out(Easing.cubic)) =>
  Animated.timing(x, {
    toValue: to,
    duration: ms,
    easing: e,
    useNativeDriver: true,
  });

function FaceOffScene({ f, rk, org, unvan, sup, onDone }: { f: MFighter; rk: Rakip; org: OrgId; unvan: boolean; sup: boolean; onDone?: () => void }) {
  const [a] = useState(() => ({
    bars: new Animated.Value(0),
    title: new Animated.Value(0),
    l: new Animated.Value(-1),
    r: new Animated.Value(1),
    vs: new Animated.Value(0),
    flash: new Animated.Value(0),
    shake: new Animated.Value(0),
    q1: new Animated.Value(0),
    q2: new Animated.Value(0),
    tape: new Animated.Value(0),
  }));
  const [q1, q2] = useMemo(() => faceOffLines(f, unvan), [f, unvan]);
  const [ended, setEnded] = useState(false);
  useEffect(() => {
    const T: ReturnType<typeof setTimeout>[] = [];
    T.push(setTimeout(() => sfx('whoosh'), 350));
    T.push(setTimeout(() => sfx('slam'), 1250));
    T.push(setTimeout(() => sfx('ooh'), 2300));
    const shake = Animated.sequence([0, 1, 2, 3, 4, 5].map((i) => tm(a.shake, i % 2 ? -5 : 5, 45, Easing.linear)).concat(tm(a.shake, 0, 45)));
    Animated.sequence([
      tm(a.bars, 1, 450),
      tm(a.title, 1, 400),
      Animated.parallel([tm(a.l, 0, 650, Easing.out(Easing.back(1.1))), tm(a.r, 0, 650, Easing.out(Easing.back(1.1)))]),
      Animated.parallel([
        Animated.sequence([tm(a.flash, 1, 70), tm(a.flash, 0, 450)]),
        Animated.spring(a.vs, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
        shake,
      ]),
      Animated.delay(250),
      tm(a.q1, 1, 400),
      Animated.delay(900),
      tm(a.q2, 1, 400),
      Animated.delay(500),
      tm(a.tape, 1, 500),
    ]).start(() => setEnded(true));
    return () => T.forEach(clearTimeout);
  }, [a]);
  const slide = (x: Animated.Value) => ({
    transform: [{ translateX: Animated.multiply(x, 260) }, { translateX: a.shake }],
  });
  const fade = (x: Animated.Value, dy = 10) => ({
    opacity: x,
    transform: [
      {
        translateY: x.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }),
      },
    ],
  });
  const rows: [string, string, string][] = [
    [rekorOf(f), L("REKOR"), rk.rekor],
    [String(f.guc), L("GÜÇ"), String(rk.guc)],
    [BACKGROUNDS[f.stil]?.ad ?? f.stil, L("STİL"), BACKGROUNDS[rk.stil]?.ad ?? rk.stil],
    [L(f.ulke), L("ÜLKE"), L(rk.ulke)],
  ];
  return (
    <View style={v.scene}>
      <LinearGradient colors={['#000', unvan || sup ? '#1f1705' : '#0a1220', '#000']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <Animated.View style={[v.spot, { opacity: a.title }]} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <Defs>
            <RadialGradient id="sp" cx="50" cy="38" r="50" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={unvan || sup ? '#ffd27a' : '#9cc4ff'} stopOpacity="0.22" />
              <Stop offset="1" stopColor="#000" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="50" cy="38" rx="60" ry="50" fill="url(#sp)" />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          v.bar,
          {
            top: 0,
            transform: [
              {
                translateY: a.bars.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-60, 0],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          v.bar,
          {
            bottom: 0,
            transform: [
              {
                translateY: a.bars.interpolate({
                  inputRange: [0, 1],
                  outputRange: [60, 0],
                }),
              },
            ],
          },
        ]}
      />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Animated.View style={[{ alignItems: 'center' }, fade(a.title, -10)]}>
          <Text style={v.sceneKicker}>{orgName(org).toLocaleUpperCase(LOC)}</Text>
          <Text style={[v.sceneTitle, SLANT, { color: unvan || sup ? C.gold : C.text }]}>{unvan ? L("ÜNVAN MAÇI") : sup ? L("SÜPER DÖVÜŞ") : L("YÜZ YÜZE")}</Text>
        </Animated.View>
        <View style={v.faceRow}>
          <Animated.View style={[v.faceSide, slide(a.l)]}>
            <FighterAvatar look={mLook(f)} size={112} ring={C.red} />
            <Text style={v.faceName} numberOfLines={1}>
              {f.soyad.toLocaleUpperCase(LOC)}
            </Text>
          </Animated.View>
          <Animated.View style={[v.faceSide, slide(a.r)]}>
            <FighterAvatar look={rLook(rk, f.kadin)} size={112} ring={C.blue} />
            <Text style={v.faceName} numberOfLines={1}>
              {rkSoyad(rk).toLocaleUpperCase(LOC)}
            </Text>
          </Animated.View>
          <Animated.Text
            style={[
              v.vs,
              SLANT,
              {
                opacity: a.vs,
                transform: [
                  {
                    scale: a.vs.interpolate({
                      inputRange: [0, 1],
                      outputRange: [2.6, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            VS
          </Animated.Text>
        </View>
        <Animated.View style={[v.quote, { alignSelf: 'flex-start', borderColor: C.red }, fade(a.q1)]}>
          <Text style={v.quoteText}>“{q1}”</Text>
        </Animated.View>
        <Animated.View style={[v.quote, { alignSelf: 'flex-end', borderColor: C.blue }, fade(a.q2)]}>
          <Text style={v.quoteText}>“{q2}”</Text>
        </Animated.View>
        <Animated.View style={[v.tape, fade(a.tape)]}>
          {rows.map(([x, l, y]) => (
            <View key={l} style={v.tapeRow}>
              <Text style={[v.tapeVal, { textAlign: 'left' }]} numberOfLines={1}>
                {x}
              </Text>
              <Text style={v.tapeLabel}>{l}</Text>
              <Text style={[v.tapeVal, { textAlign: 'right' }]} numberOfLines={1}>
                {y}
              </Text>
            </View>
          ))}
        </Animated.View>
      </View>
      <Animated.View style={[v.flash, { opacity: a.flash }]} pointerEvents="none" />
      {onDone ? (
        <View style={v.sceneBtns}>
          <Button label={ended ? L("Maça geç") : L("Atla")} icon={ended ? 'boxing-glove' : 'skip-next'} tone={ended ? 'gold' : 'ghost'} onPress={onDone} />
        </View>
      ) : null}
    </View>
  );
}

export function FaceOffModal({ f, rk, org, unvan, sup, onClose }: { f: MFighter; rk: Rakip; org: OrgId; unvan: boolean; sup: boolean; onClose: () => void }) {
  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <FaceOffScene f={f} rk={rk} org={org} unvan={unvan} sup={sup} />
        <View style={v.sceneBtns}>
          <Button label={L("Kapat")} icon="close" tone="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

// ---------- Maçı izle ----------

export function MgrWatch({ f, m, onClose }: { f: MFighter; m: MKayit; onClose: () => void }) {
  const [step, setStep] = useState<'face' | 'mac' | 'sonuc'>('face');
  const lines = useMemo(() => fightBeats(f, m), [f, m]);
  // Kafes sahnesi hareketleri Türkçe anlatımdan okur; ekrandaki yazı seçili dilde
  const cageLines = useMemo(() => fightBeats(f, m, rawL), [f, m]);
  const [shown, setShown] = useState(0);
  const playing = step === 'mac' && shown < lines.length;
  useEffect(() => {
    if (!playing) return;
    const next = lines[shown];
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 400 : next?.startsWith('—') ? 1500 : 950);
    return () => clearTimeout(t);
  }, [playing, shown, lines]);
  useEffect(() => {
    if (step === 'mac' && shown >= lines.length) {
      const t = setTimeout(() => {
        setStep('sonuc');
        sfx(m.w ? 'applause' : 'ooh');
      }, 2600);
      return () => clearTimeout(t);
    }
  }, [step, shown, lines.length, m.w]);
  const raunt = lines.slice(0, Math.max(1, shown)).filter((l) => l.startsWith('—')).length || 1;
  const prog = shown / Math.max(1, lines.length);
  const done = shown >= lines.length;
  const fs = {
    pAd: f.soyad,
    oAd: rkSoyad(m.rk),
    raunt,
    maxRaunt: m.top,
    pHasar: Math.round(prog * (m.w ? 30 : 75)),
    oHasar: Math.round(prog * (m.w ? 75 : 30)),
    log: cageLines,
    durum: done ? 'bitti' : 'canli',
    kritik: null,
    subAdi: '',
    sonuc: { kazanan: m.w ? 'p' : 'o', yontem: m.kod },
  } as unknown as FightState;
  const cur = lines[Math.max(0, shown - 1)] ?? '';
  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {step === 'face' ? (
          <FaceOffScene f={f} rk={m.rk} org={m.org} unvan={!!m.unvan} sup={!!m.sup} onDone={() => (sfx('bell'), setStep('mac'))} />
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 40, gap: 12 }}>
            <View style={v.watchHead}>
              <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <Text style={[v.cornerName, { color: C.red }]} numberOfLines={1}>
                  {f.soyad.toLocaleUpperCase(LOC)}
                </Text>
                <Text style={v.faint}>{rekorOf(f)}</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={v.sceneKicker}>{orgName(m.org).toLocaleUpperCase(LOC)}</Text>
                <Text style={[v.roundText, SLANT]}>{L("{0}. RAUNT", [raunt])}</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={[v.cornerName, { color: C.blue }]} numberOfLines={1}>
                  {rkSoyad(m.rk).toLocaleUpperCase(LOC)}
                </Text>
                <Text style={v.faint}>{m.rk.rekor}</Text>
              </View>
            </View>
            <View style={v.rounds}>
              {Array.from({ length: m.top }, (_, i) => (
                <View
                  key={i}
                  style={[
                    v.roundDot,
                    i + 1 < raunt && {
                      backgroundColor: '#1d2a40',
                      borderColor: C.blue,
                    },
                    i + 1 === raunt && { borderColor: C.gold },
                  ]}
                >
                  <Text style={[v.roundNo, i + 1 === raunt && { color: C.gold }]}>{i + 1}</Text>
                </View>
              ))}
            </View>
            <CageView fs={fs} shown={shown} pLook={mLook(f)} oLook={rLook(m.rk, f.kadin)} pKitOverride={RED_KIT} noReplay />
            {step === 'mac' ? (
              <View style={v.caption}>
                <Text style={v.captionText} numberOfLines={2}>
                  {cur}
                </Text>
                {!done ? (
                  <Pressable onPress={() => setShown(lines.length)} hitSlop={8}>
                    <Text style={v.link}>{L("Hızlı geç")}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <LinearGradient colors={m.w ? ['#0f2a18', '#08090b'] : ['#2a0a0f', '#08090b']} style={[v.result, { borderColor: m.w ? C.green : C.red }]}>
                <Text style={[v.resultTitle, SLANT, { color: m.w ? C.green : C.red }]}>{m.w ? L("KAZANDI!") : L("KAYBETTİ")}</Text>
                <Text style={v.resultSub}>{L("{0} · {1}. raunt", [m.y, m.ra])}</Text>
                {m.satir.map((l, i) => (
                  <Text key={i} style={v.line}>
                    {l}
                  </Text>
                ))}
                <Text style={[v.line, { color: C.green }]}>{L("Ajansın komisyonu: {0}", [$(m.kom)])}</Text>
              </LinearGradient>
            )}
            <Button label={step === 'sonuc' ? L("Kapat") : L("Çık")} icon="close" tone={step === 'sonuc' ? 'gold' : 'ghost'} onPress={onClose} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const v = StyleSheet.create({
  modal: { flex: 1, backgroundColor: C.bg },
  faint: { color: C.faint, fontFamily: F.body, fontSize: 11.5, marginTop: 1 },
  line: {
    color: C.dim,
    fontFamily: F.body,
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 4,
  },
  link: {
    color: C.faint,
    fontFamily: F.semi,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  pill: {
    borderRadius: 5,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { fontFamily: F.display },
  head: {
    borderRadius: R + 6,
    borderWidth: 1,
    padding: 18,
    paddingTop: 22,
    alignItems: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  close: { position: 'absolute', top: 12, right: 12, zIndex: 2 },
  nick: {
    color: C.gold,
    fontFamily: F.displayMed,
    fontSize: 12,
    letterSpacing: 1.5,
    marginTop: 8,
  },
  bigName: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 28,
    lineHeight: 32,
  },
  sub: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  tierBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 6,
  },
  tierText: { fontFamily: F.display, fontSize: 11, letterSpacing: 1.2 },
  stats: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 12,
  },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  statVal: { fontFamily: F.display, fontSize: 18 },
  statLabel: {
    color: C.faint,
    fontFamily: F.display,
    fontSize: 9,
    letterSpacing: 1.4,
    marginTop: 2,
  },
  box: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R + 2,
    padding: 14,
    backgroundColor: C.card,
  },
  kicker: {
    color: C.gold,
    fontFamily: F.semi,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  trend: { flexDirection: 'row', height: 56, alignItems: 'flex-end', gap: 2 },
  nextFight: {
    borderRadius: R + 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.goldDeep,
  },
  nextInner: { padding: 14 },
  vsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vsSmall: { color: C.gold, fontFamily: F.display, fontSize: 16 },
  faceCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    marginTop: 10,
  },
  fRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  fRowName: { color: C.text, fontFamily: F.bold, fontSize: 14 },
  res: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resText: { fontFamily: F.display, fontSize: 13 },
  watchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: C.goldDeep,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  watchText: { color: C.gold, fontFamily: F.semi, fontSize: 12 },
  // Face-off sahnesi
  scene: {
    flex: 1,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 100,
  },
  spot: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 34,
    backgroundColor: '#000',
    zIndex: 3,
  },
  sceneKicker: {
    color: C.dim,
    fontFamily: F.display,
    fontSize: 11,
    letterSpacing: 2.5,
  },
  sceneTitle: { fontFamily: F.display, fontSize: 30, marginTop: 2 },
  faceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 26,
    marginBottom: 14,
  },
  faceSide: { alignItems: 'center', gap: 8, width: '44%' },
  faceName: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 18,
    letterSpacing: 1,
  },
  vs: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    top: 34,
    color: C.gold,
    fontFamily: F.display,
    fontSize: 44,
    textShadowColor: '#000',
    textShadowRadius: 12,
  },
  quote: {
    maxWidth: '82%',
    borderLeftWidth: 3,
    backgroundColor: '#ffffff0d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 8,
  },
  quoteText: {
    color: C.text,
    fontFamily: F.semi,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  tape: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#ffffff1a',
    borderRadius: R + 2,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#00000088',
  },
  tapeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ffffff14',
  },
  tapeVal: { flex: 1, color: C.text, fontFamily: F.bold, fontSize: 13 },
  tapeLabel: {
    width: 80,
    textAlign: 'center',
    color: C.faint,
    fontFamily: F.display,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  flash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
  },
  sceneBtns: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 28,
    zIndex: 4,
  },
  // Maç ekranı
  watchHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cornerName: { fontFamily: F.display, fontSize: 16 },
  roundText: { color: C.text, fontFamily: F.display, fontSize: 20 },
  rounds: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  roundDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundNo: { color: C.faint, fontFamily: F.display, fontSize: 12 },
  caption: {
    minHeight: 64,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R,
    padding: 12,
    backgroundColor: '#0c0d10',
    gap: 8,
  },
  captionText: {
    color: C.text,
    fontFamily: F.semi,
    fontSize: 14,
    lineHeight: 20,
  },
  result: {
    borderWidth: 1,
    borderRadius: R + 4,
    padding: 16,
    alignItems: 'center',
  },
  resultTitle: { fontFamily: F.display, fontSize: 32 },
  resultSub: {
    color: C.text,
    fontFamily: F.semi,
    fontSize: 14,
    marginBottom: 4,
  },
});
