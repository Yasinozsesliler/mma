// Dövüş geçmişi: karne özeti, galibiyet yöntemleri dağılımı, filtreler ve organizasyona göre gruplanmış maç kartları.
import { L, LOC } from '../i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ORGS } from '../engine/data';
import { readIstat } from '../engine/istat';
import type { FightHistory, GameState } from '../engine/types';
import { Icon, Section, SLANT, type IconName } from './components';
import { C, F, R } from './theme';

type Filter = 'hepsi' | 'pro' | 'amator' | 'G' | 'M';

const RES = {
  G: { renk: C.green, ad: L("GALİBİYET"), kisa: 'G' },
  M: { renk: '#ff4d5e', ad: L("MAĞLUBİYET"), kisa: 'M' },
  B: { renk: C.gold, ad: L("BERABERE"), kisa: 'B' },
} as const;

const methodIcon = (y: string): IconName => (/KO|TKO/.test(y) ? 'flash' : /Submission/.test(y) ? 'lock' : /Beraberlik/.test(y) ? 'scale-balance' : 'gavel');
const methodKind = (y: string) => (/KO|TKO/.test(y) ? 'ko' : /Submission/.test(y) ? 'sub' : 'karar');

function FightCard({ h, no }: { h: FightHistory; no: number }) {
  const r = RES[h.sonuc];
  return (
    <View style={fh.card}>
      <LinearGradient colors={[r.renk + '40', r.renk + '10']} style={[fh.res, { borderColor: r.renk }]}>
        <Text style={[fh.resText, { color: r.renk }]}>{r.kisa}</Text>
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={fh.no}>#{no}</Text>
          <Text style={[fh.name, SLANT]} numberOfLines={1}>
            {h.rakip.toUpperCase()}
          </Text>
        </View>
        <View style={fh.metaRow}>
          <Icon name={methodIcon(h.yontem)} size={13} color={h.sonuc === 'G' ? r.renk : C.faint} />
          <Text style={[fh.method, h.sonuc === 'G' && { color: C.text }]}>{h.yontem}</Text>
          <Text style={fh.dot}>•</Text>
          <Text style={fh.meta}>R{h.raunt}</Text>
          <Text style={fh.dot}>•</Text>
          <Text style={fh.meta}>{h.yas} {L("yaş")}</Text>
        </View>
      </View>
      <Text style={[fh.resWord, { color: r.renk }]}>{r.ad}</Text>
    </View>
  );
}

export function FightHistoryPanel({ s }: { s: GameState }) {
  const [filter, setFilter] = useState<Filter>('hepsi');
  const [all, setAll] = useState(false);
  const total = s.gecmis.length;
  const pro = s.gecmis.filter((g) => g.org !== 'amator');
  const r = s.rekor;
  const wins = pro.filter((g) => g.sonuc === 'G');
  const ko = wins.filter((g) => methodKind(g.yontem) === 'ko').length;
  const sub = wins.filter((g) => methodKind(g.yontem) === 'sub').length;
  const dec = wins.length - ko - sub;
  const finishRate = wins.length ? Math.round(((ko + sub) / wins.length) * 100) : 0;
  const best = readIstat(s).enIyiSeri;

  const list = s.gecmis
    .map((h, i) => ({ h, no: total - i }))
    .filter(({ h }) => (filter === 'hepsi' ? true : filter === 'pro' ? h.org !== 'amator' : filter === 'amator' ? h.org === 'amator' : h.sonuc === filter));
  const shown = all ? list : list.slice(0, 10);

  // Organizasyon değiştiğinde başlık
  const blocks: { org: string; items: typeof shown }[] = [];
  shown.forEach((x) => {
    const last = blocks[blocks.length - 1];
    if (last && last.org === x.h.org) last.items.push(x);
    else blocks.push({ org: x.h.org, items: [x] });
  });

  return (
    <>
      <Section>{L("DÖVÜŞ GEÇMİŞİ")}</Section>
      <LinearGradient colors={['#1c0a0e', '#0c0d10']} style={fh.summary}>
        <View style={fh.recRow}>
          <View>
            <Text style={fh.kicker}>{L("PROFESYONEL KARNE")}</Text>
            <Text style={[fh.record, SLANT]}>
              <Text style={{ color: C.green }}>{r.g}</Text>
              <Text style={fh.sep}>-</Text>
              <Text style={{ color: '#ff4d5e' }}>{r.m}</Text>
              <Text style={fh.sep}>-</Text>
              <Text style={{ color: C.gold }}>{r.b}</Text>
            </Text>
            <Text style={fh.amator}>
              
              {L("Amatör")}{' '}{s.amator.g}-{s.amator.m}-{s.amator.b}
            </Text>
          </View>
          <View style={fh.kpis}>
            <View style={fh.kpi}>
              <Text style={fh.kpiVal}>%{finishRate}</Text>
              <Text style={fh.kpiLabel}>{L("BİTİRİŞ")}</Text>
            </View>
            <View style={fh.kpi}>
              <Text style={fh.kpiVal}>{best}</Text>
              <Text style={fh.kpiLabel}>{L("EN İYİ SERİ")}</Text>
            </View>
            <View style={fh.kpi}>
              <Text style={[fh.kpiVal, { color: s.seri > 0 ? C.green : s.seri < 0 ? '#ff4d5e' : C.text }]}>{s.seri > 0 ? `${s.seri}G` : s.seri < 0 ? `${-s.seri}M` : '—'}</Text>
              <Text style={fh.kpiLabel}>{L("ŞU AN")}</Text>
            </View>
          </View>
        </View>
        {wins.length ? (
          <>
            <View style={fh.bar}>
              {[
                [ko, C.red],
                [sub, '#3aa8ff'],
                [dec, C.gold],
              ].map(([n, col], i) => (Number(n) ? <View key={i} style={{ flex: Number(n), backgroundColor: String(col) }} /> : null))}
            </View>
            <View style={fh.legend}>
              <Text style={[fh.legendText, { color: C.red }]}>{L("● KO/TKO")}{' '}{ko}</Text>
              <Text style={[fh.legendText, { color: '#3aa8ff' }]}>{L("● SUB")}{' '}{sub}</Text>
              <Text style={[fh.legendText, { color: C.gold }]}>{L("● KARAR")}{' '}{dec}</Text>
            </View>
          </>
        ) : null}
      </LinearGradient>

      <View style={fh.filters}>
        {(
          [
            ['hepsi', L("TÜMÜ")],
            ['pro', 'PRO'],
            ['amator', L("AMATÖR")],
            ['G', L("GALİBİYET")],
            ['M', L("MAĞLUBİYET")],
          ] as const
        ).map(([k, l]) => (
          <Pressable key={k} onPress={() => setFilter(k)} style={[fh.filter, filter === k && fh.filterOn]}>
            <Text style={[fh.filterText, filter === k && { color: '#fff' }]}>{l}</Text>
          </Pressable>
        ))}
      </View>

      {total === 0 ? <Text style={fh.emptyText}>{L("Henüz dövüş yok. İlk maçın burada tarihe geçecek.")}</Text> : null}
      {blocks.map((b, i) => (
        <View key={i}>
          <View style={fh.orgHead}>
            <View style={fh.orgLine} />
            <Text style={fh.orgText}>{ORGS[b.org as keyof typeof ORGS].ad.toLocaleUpperCase(LOC)}</Text>
            <View style={fh.orgLine} />
          </View>
          {b.items.map(({ h, no }) => (
            <FightCard key={no} h={h} no={no} />
          ))}
        </View>
      ))}
      {list.length > 10 ? (
        <Pressable onPress={() => setAll(!all)} style={fh.more}>
          <Text style={fh.moreText}>{all ? L("DAHA AZ GÖSTER") : L("TÜM {0} MAÇI GÖSTER", [list.length])}</Text>
          <Icon name={all ? 'chevron-up' : 'chevron-down'} size={16} color={C.dim} />
        </Pressable>
      ) : null}
    </>
  );
}

const fh = StyleSheet.create({
  summary: { borderRadius: R + 2, borderWidth: 1, borderColor: '#3a1a20', padding: 14, marginBottom: 10 },
  recRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 2 },
  record: { fontFamily: F.display, fontSize: 40, lineHeight: 46 },
  sep: { color: C.faint },
  amator: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  kpis: { gap: 6 },
  kpi: { alignItems: 'flex-end' },
  kpiVal: { color: C.text, fontFamily: F.display, fontSize: 17 },
  kpiLabel: { color: C.faint, fontFamily: F.display, fontSize: 9, letterSpacing: 1.5 },
  bar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 12, backgroundColor: '#15161a' },
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  legendText: { fontFamily: F.display, fontSize: 11, letterSpacing: 0.8 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  filter: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 3, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, transform: [{ skewX: '-8deg' }] },
  filterOn: { backgroundColor: C.red, borderColor: C.red },
  filterText: { color: C.dim, fontFamily: F.display, fontSize: 11, letterSpacing: 0.8 },
  orgHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 },
  orgLine: { flex: 1, height: 1, backgroundColor: C.border },
  orgText: { color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 2 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 10, marginBottom: 6 },
  res: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  resText: { fontFamily: F.display, fontSize: 20 },
  no: { color: C.faint, fontFamily: F.display, fontSize: 11 },
  name: { flexShrink: 1, color: C.text, fontFamily: F.display, fontSize: 15 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  method: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  meta: { color: C.faint, fontFamily: F.body, fontSize: 12 },
  dot: { color: C.faint, fontSize: 10 },
  resWord: { fontFamily: F.display, fontSize: 9, letterSpacing: 1.2 },
  emptyText: { color: C.faint, fontFamily: F.body, fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  moreText: { color: C.dim, fontFamily: F.display, fontSize: 12, letterSpacing: 1 },
});
