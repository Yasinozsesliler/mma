import { L, LOC } from '../i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGrad, Path, Rect, Stop } from 'react-native-svg';
import { ORGS, WEIGHT_CLASSES } from '../engine/data';
import {
  ACHIEVEMENTS,
  CATEGORIES,
  HOF_ACHIEVEMENTS,
  HOF_PILLARS,
  HOF_SCORE,
  hofStatus,
  legacyTier,
  TIERS,
  type AchCategory,
  type Achievement,
} from '../engine/legacy';
import type { GameState } from '../engine/types';
import { Bar, Button, Icon, OctIcon, Screen, Section, SLANT, Title, type IconName } from './components';
import { FighterAvatar } from './FighterAvatar';
import type { Act } from './GameScreens';
import { C, F, R } from './theme';

// ---------- Başarımlar ----------

function AchRow({ a, s, ok }: { a: Achievement; s: GameState; ok: boolean }) {
  const t = TIERS[a.tier];
  const hidden = a.gizli && !ok;
  const prog = !ok && a.ilerleme ? a.ilerleme(s) : null;
  return (
    <View style={[ac.row, ok && { borderColor: t.renk + '77', backgroundColor: t.renk + '0d' }]}>
      <OctIcon name={(hidden ? 'help' : ok ? a.ikon : 'lock') as IconName} color={ok ? t.renk : C.faint} size={44} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[ac.name, !ok && { color: C.dim }]} numberOfLines={1}>
            {hidden ? L("Gizli başarım") : a.ad}
          </Text>
          {a.hof ? <Text style={ac.hofMark}>🏛</Text> : null}
        </View>
        <Text style={ac.desc}>{hidden ? L("???  Açıldığında görünecek.") : a.aciklama}</Text>
        {prog ? <Bar value={(prog[0] / prog[1]) * 100} color={t.renk} right={`${prog[0].toLocaleString(LOC)} / ${prog[1].toLocaleString(LOC)}`} /> : null}
      </View>
      <View style={[ac.tier, { borderColor: t.renk + '88' }]}>
        <Text style={[ac.tierText, { color: t.renk }]}>{t.ad}</Text>
        <Text style={ac.tierPts}>+{a.puan}</Text>
      </View>
    </View>
  );
}

function AchievementList({ s }: { s: GameState }) {
  const [kat, setKat] = useState<AchCategory | 'hepsi'>('hepsi');
  const [durum, setDurum] = useState<'hepsi' | 'acik' | 'kilitli'>('hepsi');
  const earned = new Set(s.basarimlar ?? []);
  const total = ACHIEVEMENTS.length;
  const got = ACHIEVEMENTS.filter((a) => earned.has(a.id)).length;
  const list = ACHIEVEMENTS.filter((a) => (kat === 'hepsi' || a.kat === kat) && (durum === 'hepsi' || (durum === 'acik') === earned.has(a.id)));
  // Açılanlar üstte, sonra en yakın olanlar
  const sorted = [...list].sort((x, y) => {
    const ox = earned.has(x.id) ? 1 : 0;
    const oy = earned.has(y.id) ? 1 : 0;
    if (ox !== oy) return oy - ox;
    const px = x.ilerleme ? x.ilerleme(s)[0] / x.ilerleme(s)[1] : 0;
    const py = y.ilerleme ? y.ilerleme(s)[0] / y.ilerleme(s)[1] : 0;
    return py - px;
  });
  return (
    <>
      <LinearGradient colors={['#1b1405', '#0c0d10']} style={ac.summary}>
        <View>
          <Text style={ac.sumLabel}>{L("AÇILAN BAŞARIM")}</Text>
          <Text style={[ac.sumBig, SLANT]}>
            {got}
            <Text style={ac.sumOf}> / {total}</Text>
          </Text>
        </View>
        <View style={ac.tierCounts}>
          {(Object.keys(TIERS) as (keyof typeof TIERS)[]).map((k) => {
            const all = ACHIEVEMENTS.filter((a) => a.tier === k);
            const n = all.filter((a) => earned.has(a.id)).length;
            return (
              <View key={k} style={ac.tc}>
                <View style={[ac.dot, { backgroundColor: TIERS[k].renk }]} />
                <Text style={ac.tcText}>
                  {TIERS[k].ad} {n}/{all.length}
                </Text>
              </View>
            );
          })}
        </View>
      </LinearGradient>
      <Bar value={(got / total) * 100} color={C.gold} />

      <View style={ac.chips}>
        {[{ id: 'hepsi' as const, ad: L("TÜMÜ"), ikon: 'view-grid' }, ...CATEGORIES].map((c) => {
          const on = kat === c.id;
          const n = c.id === 'hepsi' ? got : ACHIEVEMENTS.filter((a) => a.kat === c.id && earned.has(a.id)).length;
          const all = c.id === 'hepsi' ? total : ACHIEVEMENTS.filter((a) => a.kat === c.id).length;
          return (
            <Pressable key={c.id} onPress={() => setKat(c.id)} style={[ac.chip, on && ac.chipOn]}>
              <Icon name={c.ikon as IconName} size={13} color={on ? '#000' : C.dim} />
              <Text style={[ac.chipText, on && { color: '#000' }]}>
                {c.ad} {n}/{all}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={[ac.chips, { marginTop: -4 }]}>
        {(
          [
            ['hepsi', L("HEPSİ")],
            ['acik', L("AÇILANLAR")],
            ['kilitli', L("KİLİTLİ")],
          ] as const
        ).map(([k, l]) => (
          <Pressable key={k} onPress={() => setDurum(k)} style={[ac.chip, ac.chipSmall, durum === k && { borderColor: C.gold }]}>
            <Text style={[ac.chipText, durum === k && { color: C.gold }]}>{l}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={ac.note}>{L("🏛 işaretli başarımlar Onur Listesi (Hall of Fame) eşikleridir.")}</Text>
      {sorted.map((a) => (
        <AchRow key={a.id} a={a} s={s} ok={earned.has(a.id)} />
      ))}
    </>
  );
}

// ---------- Hall of Fame ----------

/** Tapınak cephesi: alınlık, sütunlar, basamaklar. Açılan eşik kadar sütun altın yanar. */
function Pantheon({ lit, total, inducted }: { lit: number; total: number; inducted: boolean }) {
  const cols = 7;
  const litCols = inducted ? cols : Math.round((Math.min(lit, total) / total) * cols);
  const w = 320;
  const gap = w / (cols + 1);
  return (
    <Svg width="100%" height={190} viewBox={`0 0 ${w} 190`}>
      <Defs>
        <SvgGrad id="gold" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#8a5a14" />
          <Stop offset="0.45" stopColor="#f7d57a" />
          <Stop offset="1" stopColor="#8a5a14" />
        </SvgGrad>
        <SvgGrad id="stone" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#23252b" />
          <Stop offset="0.45" stopColor="#4a4e57" />
          <Stop offset="1" stopColor="#23252b" />
        </SvgGrad>
        <SvgGrad id="roof" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={inducted ? '#f7d57a' : '#555a64'} />
          <Stop offset="1" stopColor={inducted ? '#b07d24' : '#2a2d33'} />
        </SvgGrad>
      </Defs>
      {/* Alınlık */}
      <Path d={L("M10 52 L{0} 8 L{1} 52 Z", [w / 2, w - 10])} fill="url(#roof)" />
      <Path d={L("M34 46 L{0} 20 L{1} 46 Z", [w / 2, w - 34])} fill="#0b0b0d" opacity={0.55} />
      <Rect x={6} y={52} width={w - 12} height={10} fill="url(#roof)" />
      <Rect x={14} y={62} width={w - 28} height={5} fill={inducted ? '#8a5a14' : '#2a2d33'} />
      {/* Sütunlar */}
      {Array.from({ length: cols }, (_, i) => {
        const x = gap * (i + 1) - 9;
        const on = i < litCols;
        return (
          <Path
            key={i}
            d={L("M{0} 67 h24 v6 h-3 v86 h3 v6 h-24 v-6 h3 v-86 h-3 Z", [x - 3])}
            fill={on ? 'url(#gold)' : 'url(#stone)'}
            opacity={on ? 1 : 0.8}
          />
        );
      })}
      {/* Basamaklar */}
      <Rect x={10} y={165} width={w - 20} height={8} fill={inducted ? '#b07d24' : '#34373f'} />
      <Rect x={2} y={173} width={w - 4} height={8} fill={inducted ? '#8a5a14' : '#26282e'} />
    </Svg>
  );
}

function HallOfFame({ s }: { s: GameState }) {
  const st = hofStatus(s);
  const inducted = !!s.hof;
  const tier = legacyTier(st.skor);
  const earned = new Set(s.basarimlar ?? []);
  const belts = s.kemerler ?? [];
  const r = s.rekor;
  return (
    <>
      <LinearGradient colors={inducted ? ['#3a2a07', '#140f04', '#040405'] : ['#17181c', '#0b0b0d', '#040405']} style={hf.hero}>
        <Text style={[hf.kicker, { color: inducted ? C.gold : C.faint }]}>MMA</Text>
        <Text style={[hf.title, SLANT, { color: inducted ? '#fff' : C.dim }, inducted && hf.glow]}>{L("HALL OF FAME")}</Text>
        <Text style={hf.sub}>{L("ONUR LİSTESİ")}</Text>
        <Pantheon lit={st.acik.length} total={HOF_PILLARS} inducted={inducted} />
      </LinearGradient>

      {/* Plaket */}
      <LinearGradient colors={inducted ? ['#f7d57a', '#c8902e', '#8a5a14'] : ['#3a3d45', '#23252b', '#17181c']} style={hf.plaqueOuter}>
        <View style={hf.plaque}>
          <View style={hf.laurels}>
            <Text style={[hf.laurel, !inducted && { opacity: 0.25 }]}>🌿</Text>
            <FighterAvatar look={s.fighter.gorunum} size={110} ring={inducted ? C.gold : '#4a4e57'} />
            <Text style={[hf.laurel, { transform: [{ scaleX: -1 }] }, !inducted && { opacity: 0.25 }]}>🌿</Text>
          </View>
          {s.fighter.lakap ? <Text style={[hf.nick, { color: inducted ? C.gold : C.faint }]}>“{s.fighter.lakap.toLocaleUpperCase(LOC)}”</Text> : null}
          <Text style={[hf.name, SLANT]}>{`${s.fighter.ad} ${s.fighter.soyad}`.toLocaleUpperCase(LOC)}</Text>
          <Text style={hf.meta}>
            {s.fighter.memleket} · {WEIGHT_CLASSES[s.fighter.siklet].ad} {L("Sıklet")}
          </Text>
          <View style={hf.statRow}>
            {[
              [`${r.g}-${r.m}-${r.b}`, L("KARNE")],
              [`${r.ko}`, 'KO/TKO'],
              [`${r.sub}`, 'SUB'],
              [`${belts.length}`, L("KEMER")],
            ].map(([v, l]) => (
              <View key={l} style={hf.stat}>
                <Text style={[hf.statVal, { color: inducted ? C.gold : C.text }]}>{v}</Text>
                <Text style={hf.statLabel}>{l}</Text>
              </View>
            ))}
          </View>
          {belts.length ? (
            <Text style={hf.belts}>
              {belts.map((b) => `🏆 ${ORGS[b.org].kisa} ${WEIGHT_CLASSES[b.siklet].ad}${b.savunma ? L(" ({0} savunma)", [b.savunma]) : ''}`).join('   ')}
            </Text>
          ) : null}
          <View style={[hf.stamp, { borderColor: inducted ? C.gold : C.faint }]}>
            <Text style={[hf.stampText, { color: inducted ? C.gold : C.faint }]}>
              {inducted ? L("ONUR LİSTESİ ÜYESİ · {0} YAŞINDA SEÇİLDİ", [s.hof!.yas]) : L("HENÜZ SEÇİLMEDİ")}
            </Text>
          </View>
          <Text style={[hf.tier, { color: tier.renk }]}>{tier.ad}</Text>
        </View>
      </LinearGradient>

      <Section>{L("ONUR LİSTESİ EŞİKLERİ")}</Section>
      <View style={hf.reqCard}>
        <Req ok={st.skor >= HOF_SCORE} label={L("Efsane puanı")} value={`${st.skor} / ${HOF_SCORE}`} pct={(st.skor / HOF_SCORE) * 100} />
        <Req ok={st.acik.length >= HOF_PILLARS} label={L("🏛 Onur başarımları")} value={`${st.acik.length} / ${HOF_PILLARS}`} pct={(st.acik.length / HOF_PILLARS) * 100} />
        <Text style={hf.reqNote}>
          
          {L("Onur Listesi’ne girmek için efsane puanın")}{' '}{HOF_SCORE}{L("’e ulaşmalı ve aşağıdaki")}{' '}{HOF_ACHIEVEMENTS.length} {L("zorlu başarımdan en az")}{' '}{HOF_PILLARS} {L("tanesini açmalısın. Tüm kariyerin boyunca açık kalır.")}
        </Text>
      </View>
      <View style={hf.pillars}>
        {HOF_ACHIEVEMENTS.map((a) => {
          const ok = earned.has(a.id);
          const p = !ok && a.ilerleme ? a.ilerleme(s) : null;
          return (
            <View key={a.id} style={[hf.pillar, ok && { borderColor: C.gold, backgroundColor: '#1c1505' }]}>
              <Icon name={(ok ? a.ikon : 'pillar') as IconName} size={24} color={ok ? C.gold : '#4a4e57'} />
              <Text style={[hf.pillarName, ok && { color: C.gold }]} numberOfLines={2}>
                {a.ad}
              </Text>
              <Text style={hf.pillarDesc} numberOfLines={2}>
                {a.aciklama}
              </Text>
              {p ? <Text style={hf.pillarProg}>{`${p[0]}/${p[1]}`}</Text> : null}
            </View>
          );
        })}
      </View>
    </>
  );
}

function Req({ ok, label, value, pct }: { ok: boolean; label: string; value: string; pct: number }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name={ok ? 'check-circle' : 'circle-outline'} size={18} color={ok ? C.green : C.faint} />
        <Text style={hf.reqLabel}>{label}</Text>
        <Text style={[hf.reqVal, ok && { color: C.green }]}>{value}</Text>
      </View>
      <Bar value={pct} color={ok ? C.green : C.gold} />
    </View>
  );
}

export function AchievementsScreen({ s, act }: { s: GameState; act: Act }) {
  const [tab, setTab] = useState<'basarim' | 'hof'>(s.hof && !s.hof.goruldu ? 'hof' : 'basarim');
  return (
    <Screen
      footer={
        <Button
          label={L("Kariyere dön")}
          icon="arrow-left"
          tone="ghost"
          onPress={() =>
            act((x) => {
              if (x.hof) x.hof.goruldu = true;
              x.phase = 'hub';
            })
          }
        />
      }
    >
      <Title kicker={L("MİRAS")} sub={L("Kafeste ve kafes dışında bıraktığın iz.")}>
        
        {L("Başarımlar")}
      </Title>
      <View style={ac.tabs}>
        {(
          [
            ['basarim', L("BAŞARIMLAR"), 'medal'],
            ['hof', L("HALL OF FAME"), 'pillar'],
          ] as const
        ).map(([k, l, ic]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[ac.tab, tab === k && (k === 'hof' ? ac.tabHof : ac.tabOn)]}>
            <Icon name={ic} size={15} color={tab === k ? (k === 'hof' ? '#000' : '#fff') : C.dim} />
            <Text style={[ac.tabText, tab === k && { color: k === 'hof' ? '#000' : '#fff' }]}>{l}</Text>
          </Pressable>
        ))}
      </View>
      {tab === 'basarim' ? <AchievementList s={s} /> : <HallOfFame s={s} />}
    </Screen>
  );
}

const ac = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center', paddingVertical: 11, borderRadius: 4, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, transform: [{ skewX: '-8deg' }] },
  tabOn: { backgroundColor: C.red, borderColor: C.red },
  tabHof: { backgroundColor: C.gold, borderColor: C.gold },
  tabText: { color: C.dim, fontFamily: F.display, fontSize: 13, letterSpacing: 1 },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: R, borderWidth: 1, borderColor: '#3a2c0c', padding: 14, marginBottom: 4 },
  sumLabel: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1.5 },
  sumBig: { color: C.gold, fontFamily: F.display, fontSize: 40, lineHeight: 46 },
  sumOf: { color: C.dim, fontSize: 20 },
  tierCounts: { gap: 3 },
  tc: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tcText: { color: C.dim, fontFamily: F.semi, fontSize: 11 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 3, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, transform: [{ skewX: '-8deg' }] },
  chipSmall: { paddingVertical: 5 },
  chipOn: { backgroundColor: C.gold, borderColor: C.gold },
  chipText: { color: C.dim, fontFamily: F.display, fontSize: 11, letterSpacing: 0.6 },
  note: { color: C.faint, fontFamily: F.body, fontSize: 12, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 10, marginBottom: 8 },
  name: { color: C.text, fontFamily: F.display, fontSize: 15, flexShrink: 1 },
  hofMark: { fontSize: 12 },
  desc: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 16 },
  tier: { alignItems: 'center', borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 4, minWidth: 52 },
  tierText: { fontFamily: F.display, fontSize: 10, letterSpacing: 0.8 },
  tierPts: { color: C.faint, fontFamily: F.semi, fontSize: 10 },
});

const hf = StyleSheet.create({
  hero: { alignItems: 'center', borderRadius: R, paddingTop: 18, paddingHorizontal: 12, marginBottom: 12, borderWidth: 1, borderColor: '#2a2410' },
  kicker: { fontFamily: F.display, fontSize: 13, letterSpacing: 8 },
  title: { fontFamily: F.display, fontSize: 42, letterSpacing: 2, lineHeight: 48 },
  glow: { textShadowColor: C.gold, textShadowRadius: 18 },
  sub: { color: C.faint, fontFamily: F.display, fontSize: 12, letterSpacing: 5, marginBottom: 4 },
  plaqueOuter: { borderRadius: R + 4, padding: 4, marginBottom: 6 },
  plaque: { backgroundColor: '#0b0a08', borderRadius: R, padding: 16, alignItems: 'center' },
  laurels: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  laurel: { fontSize: 44 },
  nick: { fontFamily: F.display, fontSize: 14, letterSpacing: 1.5, marginTop: 10 },
  name: { color: C.text, fontFamily: F.display, fontSize: 28, textAlign: 'center', lineHeight: 34 },
  meta: { color: C.dim, fontFamily: F.body, fontSize: 13 },
  statRow: { flexDirection: 'row', gap: 6, marginTop: 12, alignSelf: 'stretch' },
  stat: { flex: 1, alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#2a2410', paddingVertical: 8 },
  statVal: { fontFamily: F.display, fontSize: 20 },
  statLabel: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1 },
  belts: { color: C.dim, fontFamily: F.semi, fontSize: 12, textAlign: 'center', marginTop: 10, lineHeight: 18 },
  stamp: { borderWidth: 2, borderRadius: 3, paddingHorizontal: 12, paddingVertical: 6, marginTop: 14, transform: [{ rotate: '-3deg' }] },
  stampText: { fontFamily: F.display, fontSize: 13, letterSpacing: 1.5 },
  tier: { fontFamily: F.display, fontSize: 12, letterSpacing: 1, marginTop: 10 },
  reqCard: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 10 },
  reqLabel: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 14 },
  reqVal: { color: C.gold, fontFamily: F.display, fontSize: 15 },
  reqNote: { color: C.faint, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 4 },
  pillars: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pillar: { width: '48.5%', backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 10, alignItems: 'center', gap: 3 },
  pillarName: { color: C.dim, fontFamily: F.display, fontSize: 13, textAlign: 'center' },
  pillarDesc: { color: C.faint, fontFamily: F.body, fontSize: 11, textAlign: 'center', lineHeight: 14 },
  pillarProg: { color: C.gold, fontFamily: F.display, fontSize: 12 },
});
