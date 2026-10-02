// Profilde kariyer yolculuğu (zaman çizelgesi) ve haftalık etkinlik rozet koleksiyonu.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { careerTimeline, MOMENT_ICON, type MomentKind } from '../engine/timeline';
import type { GameState } from '../engine/types';
import { THEMES, type EventTheme } from '../engine/weeklyEvent';
import { L } from '../i18n';
import { timelineCard } from '../share/build';
import { ShareButton } from '../share/ShareButton';
import { Card, Icon, Section, type IconName } from './components';
import { C, F } from './theme';

const COLOR: Partial<Record<MomentKind, string>> = { kemer: C.gold, hof: C.gold, ko: C.red, sub: C.green, maglubiyet: C.faint, pro: C.blue, org: C.blue, seri: C.orange, salon: C.orange };
const SHOW = 8;

export function TimelinePanel({ s }: { s: GameState }) {
  const [all, setAll] = useState(false);
  const list = careerTimeline(s);
  const rozetler = s.rozetler ?? [];
  if (!list.length && !rozetler.length) return null;
  const shown = all ? list : list.slice(-SHOW);
  return (
    <>
      {list.length ? (
        <>
          <Section>{L("KARİYER YOLCULUĞU")}</Section>
          <Card>
            {!all && list.length > SHOW ? (
              <Pressable onPress={() => setAll(true)} style={st.more}>
                <Text style={st.moreText}>{L("Öncesini göster ({0})", [list.length - SHOW])}</Text>
              </Pressable>
            ) : null}
            {shown.map((m, i) => {
              const renk = COLOR[m.tur] ?? C.text;
              const prevYas = i > 0 ? shown[i - 1].yas : null;
              return (
                <View key={`${m.tur}${m.sira}${i}`} style={st.row}>
                  <View style={st.ageCol}>{prevYas !== m.yas ? <Text style={st.age}>{m.yas}</Text> : null}</View>
                  <View style={st.railCol}>
                    <View style={[st.rail, i === 0 && { top: 14 }, i === shown.length - 1 && { bottom: '50%' }]} />
                    <View style={[st.node, { borderColor: renk }]}>
                      <Icon name={MOMENT_ICON[m.tur] as IconName} size={13} color={renk} />
                    </View>
                  </View>
                  <View style={st.body}>
                    <Text style={[st.title, (m.tur === 'kemer' || m.tur === 'hof') && { color: C.gold }]}>{m.baslik}</Text>
                    <Text style={st.sub} numberOfLines={2}>{m.alt}</Text>
                  </View>
                </View>
              );
            })}
            <Text style={st.legend}>{L("Sol sütun: yaş")}</Text>
          </Card>
          <View style={{ marginBottom: 12 }}>
            <ShareButton data={timelineCard(s, list)} label={L("Yolculuğunu paylaş")} />
          </View>
        </>
      ) : null}
      {rozetler.length ? (
        <>
          <Section>{L("ROZET KOLEKSİYONU · {0}", [rozetler.length])}</Section>
          <Card>
            <View style={st.badges}>
              {rozetler.map((r) => {
                const [tema, hafta] = r.split(':');
                const th = THEMES[tema as EventTheme];
                if (!th) return null;
                return (
                  <View key={r} style={st.badge}>
                    <Text style={{ fontSize: 26 }}>{th.rozet}</Text>
                    <Text style={st.badgeName} numberOfLines={2}>{th.ad()}</Text>
                    <Text style={st.badgeWeek}>{L("Hafta {0}", [Number(hafta) + 1])}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        </>
      ) : null}
    </>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', minHeight: 50 },
  ageCol: { width: 30, paddingTop: 7 },
  age: { color: C.gold, fontFamily: F.display, fontSize: 15 },
  railCol: { width: 30, alignItems: 'center' },
  rail: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: C.border },
  node: { marginTop: 5, width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingLeft: 8, paddingBottom: 12, paddingTop: 4 },
  title: { color: C.text, fontFamily: F.semi, fontSize: 14 },
  sub: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 16, marginTop: 1 },
  more: { alignSelf: 'center', paddingVertical: 4, marginBottom: 6 },
  moreText: { color: C.blue, fontFamily: F.semi, fontSize: 12 },
  legend: { color: C.faint, fontFamily: F.body, fontSize: 10, marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { width: '30%', flexGrow: 1, alignItems: 'center', backgroundColor: '#15171c', borderRadius: 10, padding: 8, gap: 2 },
  badgeName: { color: C.text, fontFamily: F.semi, fontSize: 10, textAlign: 'center' },
  badgeWeek: { color: C.faint, fontFamily: F.body, fontSize: 10 },
});
