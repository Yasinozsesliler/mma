import { L } from '../i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { canSpend, spendPoint, statCost } from '../engine/progression';
import type { GameState, StatKey } from '../engine/types';
import { STAT_KEYS, STAT_LABELS } from '../engine/types';
import { Card, Icon, type IconName } from './components';
import type { Act } from './GameScreens';
import { C, F } from './theme';

const ICONS: Record<StatKey, IconName> = {
  vurus: 'boxing-glove',
  gures: 'arm-flex',
  yer: 'lock',
  kondisyon: 'lungs',
  cene: 'shield-check',
  hiz: 'flash',
  iq: 'brain',
};

const HINTS: Record<StatKey, string> = {
  vurus: L("Ayakta hasar ve isabet"),
  gures: L("Takedown ve takedown savunması"),
  yer: L("Submission ve yer kontrolü"),
  kondisyon: L("Geç rauntlarda tempo"),
  cene: L("Sarsılmaya direnç"),
  hiz: L("Kombinasyon ve kaçış"),
  iq: L("Her alanı biraz güçlendirir"),
};

export function SkillPanel({ s, act, title = L("GELİŞİM") }: { s: GameState; act: Act; title?: string }) {
  return (
    <Card accent={C.gold}>
      <View style={sp.head}>
        <Text style={sp.title}>⭐ {title}</Text>
        <Text style={[sp.points, s.puan === 0 && { color: C.faint }]}>{L('{0} puan', [s.puan])}</Text>
      </View>
      {STAT_KEYS.map((k) => {
        const v = s.fighter.stats[k];
        const ok = canSpend(s, k);
        return (
          <View key={k} style={sp.row}>
            <View style={sp.icon}>
              <Icon name={ICONS[k]} size={18} color={C.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={sp.labelRow}>
                <Text style={sp.label}>{STAT_LABELS[k]}</Text>
                <Text style={sp.val}>{v}</Text>
              </View>
              <View style={sp.barBg}>
                <View style={[sp.barFill, { width: `${v}%` }]} />
              </View>
              <Text style={sp.hint}>{HINTS[k]}</Text>
            </View>
            <Pressable
              disabled={!ok}
              onPress={() => act((x) => spendPoint(x, k))}
              style={({ pressed }) => [sp.plus, { opacity: !ok ? 0.3 : pressed ? 0.6 : 1 }]}
            >
              <Text style={sp.plusText}>+1</Text>
              <Text style={sp.cost}>{v >= 99 ? 'MAX' : `${statCost(v)} puan`}</Text>
            </Pressable>
          </View>
        );
      })}
      <Text style={sp.foot}>
        
        {L("Puan kazanmak için kamp yap ve dövüş. Galibiyet ve bitiriş daha çok kazandırır. Maliyet: 50’ye kadar 1, 70’e kadar 2, 85’e kadar 3, sonrası 4 puan.")}
      </Text>
    </Card>
  );
}

const sp = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { color: C.gold, fontFamily: F.display, fontSize: 16, letterSpacing: 1.5 },
  icon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.gold + '14', alignItems: 'center', justifyContent: 'center' },
  points: { color: C.gold, fontSize: 22, fontFamily: F.display },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7, borderTopWidth: 1, borderTopColor: C.border },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: C.text, fontFamily: F.bold, fontSize: 14 },
  val: { color: C.text, fontFamily: F.display, fontSize: 17 },
  barBg: { height: 6, backgroundColor: C.cardAlt, borderRadius: 3, marginVertical: 4, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: C.gold, borderRadius: 3 },
  hint: { color: C.faint, fontFamily: F.body, fontSize: 11 },
  plus: { width: 64, paddingVertical: 8, borderRadius: 10, backgroundColor: C.gold, alignItems: 'center' },
  plusText: { color: '#1a1406', fontFamily: F.display, fontSize: 17 },
  cost: { color: '#1a1406', fontSize: 10, fontFamily: F.bold },
  foot: { color: C.faint, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 8 },
});
