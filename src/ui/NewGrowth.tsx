// Yeni görünüm: Gelişim sekmesi. Klasik görünümde hiç çizilmez.
// Özellikler ve teknikler AYAKTA / YER OYUNU / SAĞLIK VE ZİHİN kartlarında yıldızlarla; satıra dokununca ayrıntı açılır.
// Puan harcama, öğrenme ve geliştirme mevcut motor fonksiyonlarıyla yapılır (spendPoint, upgradeTech); kurallar aynı.
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ageCap } from '../engine/character';
import { perkPointsFree } from '../engine/perks';
import { canSpend, spendPoint, statCost } from '../engine/progression';
import { canSign, SIGNATURE_LEVEL } from '../engine/signature';
import { canUpgradeTech, MAX_TECH, TECHNIQUES, techCost, techLevel, upgradeTech, xpNeed, type TechDef } from '../engine/techniques';
import type { GameState, StatKey } from '../engine/types';
import { STAT_LABELS } from '../engine/types';
import { L, LOC } from '../i18n';
import { Icon } from './components';
import type { Act } from './GameScreens';
import { LegendPanel } from './LegendPanel';
import { PerkTree } from './PerkTree';
import { HINTS } from './SkillPanel';
import { TechniquePanel } from './TechniquePanel';
import { C, F } from './theme';

type Tab = 'ozellik' | 'yetenek' | 'imza';
type Cat = { id: string; ad: string; renk: [string, string]; stats: StatKey[]; tech: (t: TechDef) => boolean };

const CATS: Cat[] = [
  { id: 'ayakta', ad: L("AYAKTA"), renk: ['#c2410c', '#7c1d06'], stats: ['vurus', 'hiz'], tech: (t) => t.tur === 'vurus' || (t.tur === 'ozel' && !t.yer) },
  { id: 'yer', ad: L("YER OYUNU"), renk: ['#3730a3', '#1e1b5c'], stats: ['gures', 'yer'], tech: (t) => t.tur === 'sub' || (t.tur === 'ozel' && !!t.yer) },
  { id: 'zihin', ad: L("SAĞLIK VE ZİHİN"), renk: ['#15803d', '#0b4021'], stats: ['kondisyon', 'cene', 'iq'], tech: () => false },
];

const statStars = (v: number) => Math.round((v / 20) * 2) / 2;

/** 0-5 arası yıldız; yarım yıldız desteklenir. */
function Stars({ n, size = 12 }: { n: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {Array.from({ length: 5 }, (_, i) => {
        const v = n - i;
        return <Icon key={i} name={v >= 1 ? 'star' : v >= 0.5 ? 'star-half-full' : 'star'} size={size + 2} color={v >= 0.5 ? C.text : '#3a3d44'} />;
      })}
    </View>
  );
}

type Row = { key: string; ad: string; tur: string; n: number; up: boolean; stat?: StatKey; tech?: TechDef };

export function NewGrowth({ s, act }: { s: GameState; act: Act }) {
  const [tab, setTab] = useState<Tab>('ozellik');
  const [sel, setSel] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const perk = perkPointsFree(s);
  const tabs: { key: Tab; ad: string; badge?: number }[] = [
    { key: 'ozellik', ad: L("ÖZELLİK VE TEKNİK") },
    { key: 'yetenek', ad: L("YETENEKLER"), badge: perk || undefined },
    { key: 'imza', ad: L("İMZA HAREKET") },
  ];
  const rowsOf = (c: Cat): Row[] => [
    ...c.stats.map((k) => ({ key: `s:${k}`, ad: STAT_LABELS[k], tur: L("ÖZELLİK"), n: statStars(s.fighter.stats[k]), up: canSpend(s, k), stat: k })),
    ...TECHNIQUES.filter((t) => c.tech(t) && (all || techLevel(s, t.id) > 0)).map((t) => ({ key: `t:${t.id}`, ad: t.ad, tur: L("TEKNİK"), n: techLevel(s, t.id), up: canUpgradeTech(s, t.id), tech: t })),
  ];
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={g.head}>
        <Text style={g.title}>{L("GELİŞİM")}</Text>
        <View style={g.points}>
          <Icon name="star" size={14} color="#b57bff" />
          <Text style={g.pointsText}>{L('{0} puan', [s.puan])}</Text>
        </View>
      </View>
      <View style={g.tabs}>
        {tabs.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[g.tab, tab === t.key && { borderBottomColor: C.red }]}>
            <Text style={[g.tabText, tab === t.key && { color: C.text }]}>
              {t.ad}
              {t.badge ? <Text style={{ color: C.gold }}> · {t.badge}</Text> : null}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'ozellik' ? (
        <View style={{ gap: 12, paddingTop: 12 }}>
          {CATS.map((c) => {
            const rows = rowsOf(c);
            const avg = c.stats.reduce((a, k) => a + s.fighter.stats[k], 0) / c.stats.length;
            return (
              <View key={c.id} style={g.cat}>
                <LinearGradient colors={c.renk} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={g.band}>
                  <Text style={g.bandTitle}>{c.ad}</Text>
                  <Stars n={statStars(avg)} size={13} />
                </LinearGradient>
                {rows.map((r) => (
                  <View key={r.key}>
                    <Pressable onPress={() => setSel(sel === r.key ? null : r.key)} style={({ pressed }) => [g.row, sel === r.key && g.rowSel, pressed && { backgroundColor: '#15161b' }]}>
                      <Text style={[g.rowName, sel === r.key && { fontFamily: F.bold }]} numberOfLines={1}>
                        {r.ad}
                      </Text>
                      <Text style={g.rowKind}>{r.tur}</Text>
                      {r.stat ? <Text style={g.rowVal}>{s.fighter.stats[r.stat]}</Text> : null}
                      <View style={{ width: 78, alignItems: 'flex-end' }}>
                        <Stars n={r.n} />
                      </View>
                      <Text style={[g.rowUp, !r.up && { color: 'transparent' }]}>▲</Text>
                    </Pressable>
                    {sel === r.key ? <Detail s={s} act={act} r={r} onSign={() => setTab('imza')} /> : null}
                  </View>
                ))}
              </View>
            );
          })}
          <Pressable onPress={() => setAll(!all)} style={g.toggle}>
            <Text style={g.toggleText}>{all ? L("SADECE BİLDİKLERİM") : L("TÜM TEKNİKLERİ GÖSTER")}</Text>
          </Pressable>
          <Text style={g.foot}>{L("Puan kazanmak için kamp yap ve dövüş. Galibiyet ve bitiriş daha çok kazandırır. Maliyet: 60’a kadar 1, 78’e kadar 2, 90’a kadar 3, sonrası 4 puan.")}</Text>
        </View>
      ) : tab === 'yetenek' ? (
        <View style={{ paddingTop: 4 }}>
          <PerkTree s={s} act={act} />
          <LegendPanel s={s} act={act} />
        </View>
      ) : (
        <View style={{ paddingTop: 4 }}>
          <TechniquePanel s={s} act={act} />
        </View>
      )}
    </View>
  );
}

/** Seçili özellik ya da tekniğin ayrıntısı ve geliştirme düğmesi. */
function Detail({ s, act, r, onSign }: { s: GameState; act: Act; r: Row; onSign: () => void }) {
  let desc = '';
  let durum = '';
  let col = C.green;
  let cost = 0;
  let can = r.up;
  let bar: { label: string; v: number; max: number } | null = null;
  let btn = L("GELİŞTİR");
  if (r.stat) {
    const v = s.fighter.stats[r.stat];
    const cap = Math.min(99, ageCap(s.fighter.yas, r.stat));
    desc = HINTS[r.stat];
    cost = statCost(v);
    bar = { label: STAT_LABELS[r.stat], v, max: 99 };
    if (v >= 99) { durum = L("ZİRVEDE"); col = C.gold; }
    else if (v >= cap) { durum = L("YAŞ SINIRINDA"); col = C.orange; }
    else if (!can) { durum = L("PUAN YETMİYOR"); col = C.faint; }
    else durum = L("GELİŞTİRİLEBİLİR");
    btn = L("GELİŞTİR · +1");
  } else if (r.tech) {
    const sv = techLevel(s, r.tech.id);
    const xp = s.teknik?.[r.tech.id]?.xp ?? 0;
    desc = r.tech.aciklama;
    cost = techCost(sv);
    if (sv > 0 && sv < MAX_TECH) bar = { label: L("ustalık"), v: xp, max: xpNeed(sv) };
    if (sv >= MAX_TECH) { durum = L('USTA'); col = C.gold; can = false; }
    else if (!can) { durum = L("PUAN YETMİYOR"); col = C.faint; }
    else durum = sv ? L("GELİŞTİRİLEBİLİR") : L("ÖĞRENİLEBİLİR");
    btn = sv ? L("GELİŞTİR") : L("ÖĞREN");
  }
  const sign = r.tech && canSign(s, r.tech.id) && s.imza?.teknik !== r.tech.id;
  return (
    <View style={g.detail}>
      <View style={{ padding: 12, paddingBottom: 8, gap: 4 }}>
        <Text style={g.dName}>{r.ad.toLocaleUpperCase(LOC)}</Text>
        <Text style={g.dKind}>{r.tur}</Text>
        {desc ? <Text style={g.dDesc}>{desc}</Text> : null}
      </View>
      <LinearGradient colors={col === C.green ? ['#0f2a1b', '#0a1610'] : ['#16171b', '#0d0e11']} style={[g.dState, { borderTopColor: col + '66' }]}>
        <Text style={[g.dStateText, { color: col }]}>{durum}</Text>
        <Stars n={r.n} size={20} />
        {bar ? (
          <View style={{ alignSelf: 'stretch', gap: 3 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={g.dBarLabel}>{bar.label}</Text>
              <Text style={g.dBarLabel}>
                {bar.v} / {bar.max}
              </Text>
            </View>
            <View style={g.dBar}>
              <View style={{ width: `${Math.min(100, (bar.v / bar.max) * 100)}%`, height: 5, backgroundColor: col }} />
            </View>
          </View>
        ) : null}
        {r.tech && techLevel(s, r.tech.id) > 0 && techLevel(s, r.tech.id) < SIGNATURE_LEVEL && !s.imza ? (
          <Text style={g.dBarLabel}>{L("Bir tekniği {0}. ustalık seviyesine getirince ona kendi adını verip imza hareketin yapabilirsin.", [SIGNATURE_LEVEL])}</Text>
        ) : null}
      </LinearGradient>
      <View style={g.dFoot}>
        {durum === L('USTA') || durum === L("ZİRVEDE") ? (
          <View />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="star" size={15} color="#b57bff" />
            <Text style={g.dCost}>{L('{0} puan', [cost])}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {sign ? (
            <Pressable onPress={onSign} style={({ pressed }) => [g.dBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.gold }, pressed && { opacity: 0.7 }]}>
              <Text style={[g.dBtnText, { color: C.gold }]}>{L("İMZA YAP")}</Text>
            </Pressable>
          ) : null}
          {durum === L('USTA') || durum === L("ZİRVEDE") ? null : (
            <Pressable
              disabled={!can}
              onPress={() => act((x) => (r.stat ? spendPoint(x, r.stat) : r.tech ? upgradeTech(x, r.tech.id) : undefined))}
              style={({ pressed }) => [g.dBtn, !can && { backgroundColor: '#23252b' }, pressed && { opacity: 0.8 }]}
            >
              <Text style={[g.dBtnText, !can && { color: C.faint }]}>{btn}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const g = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 8 },
  title: { color: C.text, fontFamily: F.display, fontSize: 22, letterSpacing: 2 },
  points: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1a1230', borderWidth: 1, borderColor: '#4a3a7a', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  pointsText: { color: C.text, fontFamily: F.black, fontSize: 12.5 },
  tabs: { flexDirection: 'row', gap: 18, borderBottomWidth: 1, borderBottomColor: C.border },
  tab: { paddingTop: 8, paddingBottom: 9, borderBottomWidth: 3, borderBottomColor: 'transparent', minHeight: 44, justifyContent: 'center' },
  tabText: { color: '#8b919c', fontFamily: F.displayMed, fontSize: 13, letterSpacing: 1.2 },
  cat: { backgroundColor: '#111317', borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  band: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  bandTitle: { color: '#fff', fontFamily: F.display, fontSize: 17, letterSpacing: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 42, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: '#1a1c21', borderWidth: 2, borderColor: 'transparent' },
  rowSel: { backgroundColor: '#1a0d10', borderColor: C.red },
  rowName: { flex: 1, color: C.text, fontFamily: F.medium, fontSize: 12.5 },
  rowKind: { color: C.faint, fontFamily: F.black, fontSize: 9, letterSpacing: 1 },
  rowVal: { color: C.dim, fontFamily: F.display, fontSize: 12, width: 22, textAlign: 'right' },
  rowUp: { width: 14, color: C.green, fontFamily: F.black, fontSize: 12, textAlign: 'center' },
  detail: { backgroundColor: '#0d0f12', borderWidth: 1, borderColor: C.red, margin: 8 },
  dName: { color: C.text, fontFamily: F.display, fontSize: 18, letterSpacing: 1 },
  dKind: { color: C.orange, fontFamily: F.black, fontSize: 10, letterSpacing: 1.5 },
  dDesc: { color: '#c3c8d1', fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  dState: { borderTopWidth: 1, padding: 12, alignItems: 'center', gap: 6 },
  dStateText: { fontFamily: F.black, fontSize: 10, letterSpacing: 2 },
  dBarLabel: { color: C.dim, fontFamily: F.body, fontSize: 10.5, textAlign: 'center' },
  dBar: { height: 5, backgroundColor: C.border },
  dFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  dCost: { color: C.text, fontFamily: F.black, fontSize: 13 },
  dBtn: { backgroundColor: C.green, minHeight: 44, paddingHorizontal: 18, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  dBtnText: { color: '#052012', fontFamily: F.display, fontSize: 15, letterSpacing: 1.5 },
  toggle: { alignItems: 'center', paddingVertical: 6 },
  toggleText: { color: C.dim, fontFamily: F.display, fontSize: 12, letterSpacing: 1 },
  foot: { color: C.faint, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
});
