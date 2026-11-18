// Yeni görünüm: Gelişim sekmesi. Klasik görünümde hiç çizilmez.
// Özellikler ve teknikler AYAKTA / YER OYUNU / SAĞLIK VE ZİHİN kartlarında yıldızlarla; satıra dokununca ayrıntı açılır.
// Puan harcama, öğrenme ve geliştirme mevcut motor fonksiyonlarıyla yapılır (spendPoint, upgradeTech); kurallar aynı.
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ageCap } from '../engine/character';
import { BRANCHES, canTakePerk, hasPerk, nextPerkAt, perkPointsFree, PERKS, takePerk, type PerkBranch, type PerkId } from '../engine/perks';
import { buzz } from '../haptics';
import { LEGENDS, legendCostText, legendStatus, trainWithLegend } from '../engine/legends';
import { lookFor } from '../engine/tale';
import { canSpend, spendPoint, statCost } from '../engine/progression';
import { canSign, SIGNATURE_LEVEL } from '../engine/signature';
import { canUpgradeTech, MAX_TECH, TECHNIQUES, techById, techCost, techLevel, upgradeTech, xpNeed, type TechDef } from '../engine/techniques';
import type { GameState, StatKey } from '../engine/types';
import { STAT_LABELS } from '../engine/types';
import { L, LOC } from '../i18n';
import { Icon, type IconName } from './components';
import type { Act } from './GameScreens';
import { FighterAvatar } from './FighterAvatar';
import { flagOf } from './NewCareer';
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
          <NewPerkTree s={s} act={act} />
          <NewLegends s={s} act={act} />
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

// ---------- Yetenek ağacı (yeni görünüm): her dal ayrı panel, ikonlu düğümler ve bağlantı çizgileri ----------

const PERK_ICON: Record<PerkId, IconName> = {
  agirEl: 'weight', demirCene: 'shield-half-full', bitirici: 'skull-crossbones',
  guresMakinesi: 'arm-flex', kafesKontrolu: 'fence', boga: 'cow',
  kondisyonCanavari: 'lungs', cabukIyilesme: 'bandage', kiloUstasi: 'scale-bathroom',
  sogukkanli: 'snowflake', kampci: 'tent', hizUstasi: 'flash',
  sovmen: 'microphone-variant', isAdami: 'briefcase', yildiz: 'star-shooting',
};

function NewPerkTree({ s, act }: { s: GameState; act: Act }) {
  const [sel, setSel] = useState<PerkId | null>(null);
  const free = perkPointsFree(s);
  const next = nextPerkAt(s);
  const selBranch = sel ? (Object.keys(BRANCHES) as PerkBranch[]).find((b) => BRANCHES[b].perkler.includes(sel)) : null;
  const selCol = selBranch ? BRANCHES[selBranch].renk : C.gold;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={t.head}>
        <Text style={t.headTitle}>{L("YETENEK AĞACI")}</Text>
        <View style={[t.free, free > 0 && { borderColor: C.gold, backgroundColor: '#1d170a' }]}>
          <Text style={[t.freeText, free > 0 && { color: C.gold }]}>{L("{0} PERK PUANI", [free])}</Text>
        </View>
      </View>
      <Text style={t.hint}>
        {s.stage === 'amator'
          ? L("Perk puanları profesyonel galibiyetlerle gelir.")
          : next
            ? L("Sıradaki perk puanı {0}. profesyonel galibiyette.", [next])
            : L("Bütün perk puanlarını kazandın.")}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
        {(Object.keys(BRANCHES) as PerkBranch[]).map((b) => {
          const br = BRANCHES[b];
          const owned = br.perkler.filter((p) => hasPerk(s, p)).length;
          return (
            <LinearGradient key={b} colors={[br.renk + '24', '#0c0d10', '#08090b']} locations={[0, 0.45, 1]} style={[t.panel, { borderColor: br.renk + '55' }]}>
              <View style={t.pHead}>
                <View style={[t.pLine, { backgroundColor: br.renk }]} />
                <Text style={[t.pTitle, { color: br.renk }]} numberOfLines={1}>
                  {br.ad().toLocaleUpperCase(LOC)}
                </Text>
                <View style={[t.pLine, { backgroundColor: br.renk }]} />
              </View>
              {/* kök düğüm: dalın simgesi */}
              <View style={[t.root, { borderColor: br.renk, backgroundColor: br.renk + '22' }]}>
                <View style={{ transform: [{ rotate: '-45deg' }] }}>
                  <Icon name={br.icon as IconName} size={26} color={br.renk} />
                </View>
              </View>
              {br.perkler.map((p) => {
                const has = hasPerk(s, p);
                const can = canTakePerk(s, p);
                const on = sel === p;
                const col = has ? br.renk : can ? C.gold : '#3a3d44';
                return (
                  <Pressable key={p} onPress={() => setSel(on ? null : p)} accessibilityLabel={PERKS[p].ad()} style={({ pressed }) => [{ alignItems: 'center' }, pressed && { opacity: 0.8 }]}>
                    <View style={[t.link, { backgroundColor: has ? br.renk : can ? C.gold + '88' : '#2a2d34' }]} />
                    <View
                      style={[
                        t.node,
                        { borderColor: col, backgroundColor: has ? br.renk + '30' : '#101115' },
                        (has || can) && { shadowColor: col, shadowOpacity: 0.7, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
                        on && { transform: [{ scale: 1.08 }], borderWidth: 2.5 },
                      ]}
                    >
                      <Icon name={PERK_ICON[p]} size={24} color={has ? '#fff' : can ? C.gold : '#5b6170'} />
                      {has ? (
                        <View style={[t.badge, { backgroundColor: br.renk }]}>
                          <Icon name="check-bold" size={9} color="#040405" />
                        </View>
                      ) : !can ? (
                        <View style={[t.badge, { backgroundColor: '#1c1f25' }]}>
                          <Icon name="lock" size={9} color="#8b919c" />
                        </View>
                      ) : null}
                    </View>
                    <Text style={[t.nodeName, { color: has ? C.text : can ? C.gold : '#8b919c' }]} numberOfLines={2}>
                      {PERKS[p].ad()}
                    </Text>
                  </Pressable>
                );
              })}
              <View style={t.pFoot}>
                <View style={t.pBar}>
                  <View style={{ width: `${(owned / br.perkler.length) * 100}%`, height: 4, backgroundColor: br.renk }} />
                </View>
                <Text style={[t.pCount, { color: owned === br.perkler.length ? br.renk : '#8b919c' }]}>
                  {owned}/{br.perkler.length}
                </Text>
              </View>
            </LinearGradient>
          );
        })}
      </ScrollView>
      {sel ? (
        <View style={[t.detail, { borderColor: selCol }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[t.dIcon, { borderColor: selCol }]}>
              <Icon name={PERK_ICON[sel]} size={22} color={selCol} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={t.dName}>{PERKS[sel].ad().toLocaleUpperCase(LOC)}</Text>
              {selBranch ? <Text style={[t.dBranch, { color: selCol }]}>{BRANCHES[selBranch].ad().toLocaleUpperCase(LOC)}</Text> : null}
            </View>
          </View>
          <Text style={t.dText}>{PERKS[sel].aciklama()}</Text>
          {hasPerk(s, sel) ? (
            <Text style={[t.dText, { color: C.green, fontFamily: F.bold }]}>{L("✓ Alındı")}</Text>
          ) : canTakePerk(s, sel) ? (
            <Pressable
              onPress={() => {
                buzz('basari');
                act((x) => takePerk(x, sel));
              }}
              style={({ pressed }) => [t.dBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={t.dBtnText}>{L("Perki al").toLocaleUpperCase(LOC)}</Text>
            </Pressable>
          ) : (
            <Text style={[t.dText, { color: C.faint }]}>{free ? L("Önce bu daldaki önceki perki almalısın.") : L("Perk puanın yok.")}</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const t = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 4 },
  headTitle: { color: C.text, fontFamily: F.display, fontSize: 17, letterSpacing: 1.5 },
  free: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  freeText: { color: C.dim, fontFamily: F.black, fontSize: 10.5, letterSpacing: 1 },
  hint: { color: C.dim, fontFamily: F.body, fontSize: 12, marginBottom: 10 },
  panel: { width: 138, borderWidth: 1, borderRadius: 4, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10, alignItems: 'center' },
  pHead: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'stretch', marginBottom: 12 },
  pLine: { flex: 1, height: 2, opacity: 0.7 },
  pTitle: { fontFamily: F.display, fontSize: 14, letterSpacing: 1.5 },
  root: { width: 56, height: 56, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }] },
  link: { width: 2, height: 18 },
  node: { width: 54, height: 54, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', right: -5, top: -5, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  nodeName: { fontFamily: F.semi, fontSize: 10.5, textAlign: 'center', marginTop: 5, minHeight: 28, width: 112 },
  pFoot: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'stretch', marginTop: 6 },
  pBar: { flex: 1, height: 4, backgroundColor: '#1c1f25' },
  pCount: { fontFamily: F.display, fontSize: 12 },
  detail: { marginTop: 12, backgroundColor: '#0d0f12', borderWidth: 1, padding: 12, gap: 8 },
  dIcon: { width: 42, height: 42, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dName: { color: C.text, fontFamily: F.display, fontSize: 17, letterSpacing: 1 },
  dBranch: { fontFamily: F.black, fontSize: 10, letterSpacing: 1.5 },
  dText: { color: '#c3c8d1', fontFamily: F.body, fontSize: 12.5, lineHeight: 18 },
  dBtn: { backgroundColor: C.gold, minHeight: 46, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  dBtnText: { color: '#1f1605', fontFamily: F.display, fontSize: 15, letterSpacing: 1.5 },
});

// ---------- Efsane ustalar (yeni görünüm): portreli kartlar, öğrettikleri, şartlar ve ders düğmesi ----------

const STAT_COLOR: Partial<Record<StatKey, string>> = { vurus: C.red, gures: C.blue, yer: '#6d5dfc', hiz: C.orange, kondisyon: C.green, cene: C.gold, iq: '#b388ff' };

function NewLegends({ s, act }: { s: GameState; act: Act }) {
  const [msg, setMsg] = useState<string | null>(null);
  if (s.stage === 'amator') return null;
  const done = (s.ustalar ?? []).length;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={t.head}>
        <Text style={t.headTitle}>{L("EFSANE USTALAR")}</Text>
        <View style={t.free}>
          <Text style={t.freeText}>{L("{0}/{1} DERS", [done, LEGENDS.length])}</Text>
        </View>
      </View>
      <Text style={t.hint}>{L("İki haftalık özel kamp: ustanın tekniği +2 seviye, uzmanlığı +1. Her usta kariyerde bir kez ders verir.")}</Text>
      {msg ? <Text style={u.msg}>{msg}</Text> : null}
      <View style={{ gap: 10 }}>
        {LEGENDS.map((l) => {
          const has = (s.ustalar ?? []).includes(l.id);
          const stt = legendStatus(s, l);
          const col = STAT_COLOR[l.stat] ?? C.gold;
          const tech = techById(l.teknik);
          const popOk = s.populerlik >= l.minPop;
          return (
            <LinearGradient key={l.id} colors={has ? ['#0f2a1b', '#0c0d10'] : [col + '22', '#0c0d10', '#08090b']} locations={has ? [0, 1] : [0, 0.5, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[u.card, { borderColor: has ? C.green + '88' : col + '55' }]}>
              <View style={[u.stripe, { backgroundColor: has ? C.green : col }]} />
              <View style={u.top}>
                <View style={[u.portrait, { borderColor: has ? C.green : C.gold }]}>
                  <FighterAvatar look={lookFor({ id: `efsane-${l.id}`, uyruk: l.uyruk })} size={62} ring={has ? C.green : C.gold} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={u.nick}>“{l.lakap.toLocaleUpperCase(LOC)}”</Text>
                  <Text style={u.name} numberOfLines={1} adjustsFontSizeToFit>
                    {l.ad.toUpperCase()}
                  </Text>
                  <Text style={u.country}>
                    {flagOf(l.uyruk)} {l.uyruk}
                  </Text>
                </View>
                {has ? (
                  <View style={u.doneBadge}>
                    <Icon name="check-bold" size={12} color="#052012" />
                    <Text style={u.doneText}>{L("DERS ALINDI")}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={u.quote}>{l.soz()}</Text>
              <View style={u.teach}>
                <View style={[u.chip, { borderColor: col + '88' }]}>
                  <Icon name={(tech?.ikon ?? 'star') as IconName} size={14} color={col} />
                  <Text style={u.chipText} numberOfLines={1}>
                    {tech?.ad ?? ''}
                  </Text>
                  <Text style={[u.chipPlus, { color: col }]}>{L("+2 SEVİYE")}</Text>
                </View>
                <View style={[u.chip2, { borderColor: col + '88' }]}>
                  <Text style={u.chipText}>{STAT_LABELS[l.stat]}</Text>
                  <Text style={[u.chipPlus, { color: col }]}>+1</Text>
                </View>
              </View>
              {has ? null : (
                <>
                  <View style={{ gap: 3 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={u.reqLabel}>{L("POPÜLERLİK")}</Text>
                      <Text style={[u.reqLabel, { color: popOk ? C.green : C.orange }]}>
                        {Math.round(s.populerlik)} / {l.minPop}
                      </Text>
                    </View>
                    <View style={u.reqBar}>
                      <View style={{ width: `${Math.min(100, (s.populerlik / l.minPop) * 100)}%`, height: 4, backgroundColor: popOk ? C.green : C.orange }} />
                    </View>
                  </View>
                  <View style={u.foot}>
                    <View style={{ flex: 1 }}>
                      <Text style={u.cost}>{legendCostText(s, l)}</Text>
                      {!stt.ok && stt.neden ? (
                        <Text style={u.why} numberOfLines={2}>
                          {stt.neden}
                        </Text>
                      ) : (
                        <Text style={[u.why, { color: C.dim }]}>{L("2 hafta özel kamp")}</Text>
                      )}
                    </View>
                    <Pressable
                      disabled={!stt.ok}
                      onPress={() => {
                        buzz('basari');
                        act((x) => setMsg(trainWithLegend(x, l.id)));
                      }}
                      style={({ pressed }) => [u.btn, !stt.ok && { backgroundColor: '#23252b' }, pressed && { opacity: 0.8 }]}
                    >
                      {!stt.ok ? <Icon name="lock" size={14} color={C.faint} /> : null}
                      <Text style={[u.btnText, !stt.ok && { color: C.faint }]}>{L("DERS AL")}</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </LinearGradient>
          );
        })}
      </View>
    </View>
  );
}

const u = StyleSheet.create({
  msg: { color: C.gold, fontFamily: F.semi, fontSize: 13, lineHeight: 18, marginBottom: 10, padding: 10, borderWidth: 1, borderColor: C.goldDeep, backgroundColor: '#15110a' },
  card: { borderWidth: 1, borderRadius: 4, padding: 12, paddingLeft: 16, gap: 10, overflow: 'hidden' },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  portrait: { borderRadius: 40 },
  nick: { color: C.gold, fontFamily: F.black, fontSize: 10, letterSpacing: 1.5 },
  name: { color: C.text, fontFamily: F.display, fontSize: 19, letterSpacing: 0.5 },
  country: { color: C.dim, fontFamily: F.semi, fontSize: 11 },
  doneBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.green, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 3, alignSelf: 'flex-start' },
  doneText: { color: '#052012', fontFamily: F.black, fontSize: 9.5, letterSpacing: 1 },
  quote: { color: '#c3c8d1', fontFamily: F.body, fontSize: 12, lineHeight: 17, fontStyle: 'italic' },
  teach: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.3)' },
  chip2: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.3)' },
  chipText: { flexShrink: 1, color: C.text, fontFamily: F.semi, fontSize: 12 },
  chipPlus: { fontFamily: F.display, fontSize: 12, letterSpacing: 0.5 },
  reqLabel: { color: '#8b919c', fontFamily: F.bold, fontSize: 9.5, letterSpacing: 1.2 },
  reqBar: { height: 4, backgroundColor: '#1c1f25' },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cost: { color: C.gold, fontFamily: F.display, fontSize: 17 },
  why: { color: C.orange, fontFamily: F.semi, fontSize: 11, lineHeight: 15 },
  btn: { flexDirection: 'row', gap: 6, backgroundColor: C.gold, minHeight: 46, paddingHorizontal: 18, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#1f1605', fontFamily: F.display, fontSize: 15, letterSpacing: 1.5 },
});
