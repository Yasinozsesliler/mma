// Oyun planı seçimi: rakip keşif raporu, hocanın önerisi ve gruplanmış plan kartları.
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PLANS, type PlanGroup } from '../engine/fight';
import { describeOpponent, strongest, weakest } from '../engine/opponents';
import { lookFor } from '../engine/tale';
import type { GameState, PlanKey } from '../engine/types';
import { STAT_LABELS } from '../engine/types';
import { Icon, OctIcon, Section, SLANT, upName, type IconName } from './components';
import { FighterAvatar } from './FighterAvatar';
import { C, F, R } from './theme';

const GROUPS: { id: PlanGroup; ad: string; renk: string; ikon: IconName }[] = [
  { id: 'ayakta', ad: 'AYAKTA', renk: C.red, ikon: 'boxing-glove' },
  { id: 'yer', ad: 'GÜREŞ VE YER', renk: '#3aa8ff', ikon: 'arm-flex' },
  { id: 'strateji', ad: 'STRATEJİ', renk: C.gold, ikon: 'chess-knight' },
];

export function PlanPicker({ s, onPick }: { s: GameState; onPick: (p: PlanKey) => void }) {
  const o = s.pending.rakip!;
  const weak = weakest(o);
  const strong = strongest(o);
  const d = describeOpponent(o);
  const keys = Object.keys(PLANS) as PlanKey[];
  const fits = keys.filter((k) => PLANS[k].hedef.includes(weak));
  const rec = fits[0];
  return (
    <>
      <LinearGradient colors={['#1a0d10', '#0c0d10']} style={pp.scout}>
        <View style={pp.scoutHead}>
          <FighterAvatar look={lookFor(o)} size={64} ring={C.blue} />
          <View style={{ flex: 1 }}>
            <Text style={pp.kicker}>KEŞİF RAPORU</Text>
            <Text style={[pp.oppName, SLANT]} numberOfLines={1}>
              {upName(`${o.ad} ${o.soyad}`, o.uyruk)}
            </Text>
            <Text style={pp.meta}>{d.stil}</Text>
          </View>
        </View>
        <View style={pp.traits}>
          <View style={[pp.trait, { borderColor: '#ff4d5e55' }]}>
            <Text style={pp.traitLabel}>ZAYIF YÖNÜ</Text>
            <Text style={[pp.traitVal, { color: '#ff4d5e' }]}>{STAT_LABELS[weak]}</Text>
            <Text style={pp.traitNum}>{o.stats[weak]}</Text>
          </View>
          <View style={[pp.trait, { borderColor: C.green + '55' }]}>
            <Text style={pp.traitLabel}>GÜÇLÜ YÖNÜ</Text>
            <Text style={[pp.traitVal, { color: C.green }]}>{STAT_LABELS[strong]}</Text>
            <Text style={pp.traitNum}>{o.stats[strong]}</Text>
          </View>
        </View>
        {rec ? (
          <View style={pp.coach}>
            <Icon name="whistle" size={16} color={C.gold} />
            <Text style={pp.coachText}>
              {s.takim.antrenor}: “{STAT_LABELS[weak]} tarafı zayıf. <Text style={{ color: C.gold }}>{PLANS[rec].ad}</Text> ile gidersek plan tam oturur.”
            </Text>
          </View>
        ) : null}
      </LinearGradient>

      <Text style={pp.hint}>Zaafa uygun plan dövüşte etkisini ikiye katlar. Her planın bir bedeli var.</Text>

      {GROUPS.map((g) => (
        <View key={g.id}>
          <Section>{g.ad}</Section>
          {keys
            .filter((k) => PLANS[k].grup === g.id)
            .map((k) => {
              const p = PLANS[k];
              const fit = fits.includes(k);
              return (
                <Pressable key={k} onPress={() => onPick(k)} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
                  <LinearGradient colors={fit ? ['#241a07', '#0e0d0a'] : ['#111216', '#0a0a0c']} style={[pp.card, { borderColor: fit ? C.goldDeep : C.border }]}>
                    <View style={[pp.stripe, { backgroundColor: g.renk }]} />
                    <OctIcon name={p.ikon as IconName} color={g.renk} size={46} />
                    <View style={{ flex: 1 }}>
                      <View style={pp.titleRow}>
                        <Text style={[pp.tag, { color: g.renk }]}>{p.kisa.toUpperCase()}</Text>
                        {fit ? (
                          <View style={pp.fit}>
                            <Icon name="target" size={11} color="#000" />
                            <Text style={pp.fitText}>ZAAFA UYGUN ×2</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[pp.name, SLANT]}>{p.ad}</Text>
                      <Text style={pp.desc}>{p.aciklama}</Text>
                      <View style={pp.line}>
                        <Icon name="plus-circle" size={13} color={C.green} />
                        <Text style={pp.plus}>{p.avantaj}</Text>
                      </View>
                      <View style={pp.line}>
                        <Icon name="alert-circle" size={13} color="#ff4d5e" />
                        <Text style={pp.minus}>{p.risk}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </Pressable>
              );
            })}
        </View>
      ))}
    </>
  );
}

const pp = StyleSheet.create({
  scout: { borderRadius: R + 4, borderWidth: 1, borderColor: '#3a1a20', padding: 14, marginBottom: 8 },
  scoutHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kicker: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 2.5 },
  oppName: { color: C.text, fontFamily: F.display, fontSize: 22, lineHeight: 26 },
  meta: { color: C.dim, fontFamily: F.body, fontSize: 12 },
  traits: { flexDirection: 'row', gap: 8, marginTop: 12 },
  trait: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  traitLabel: { color: C.faint, fontFamily: F.display, fontSize: 9, letterSpacing: 1.5 },
  traitVal: { fontFamily: F.display, fontSize: 18, marginTop: 2 },
  traitNum: { color: C.dim, fontFamily: F.display, fontSize: 12 },
  coach: { flexDirection: 'row', gap: 8, marginTop: 12, backgroundColor: '#1a1407', borderRadius: 8, borderWidth: 1, borderColor: '#4a3810', padding: 10 },
  coachText: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
  hint: { color: C.faint, fontFamily: F.body, fontSize: 12, marginBottom: 2 },
  card: { flexDirection: 'row', gap: 12, borderRadius: R, borderWidth: 1, padding: 12, paddingLeft: 16, marginBottom: 8, overflow: 'hidden' },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  tag: { fontFamily: F.display, fontSize: 10, letterSpacing: 2 },
  fit: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.gold, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2, transform: [{ skewX: '-10deg' }] },
  fitText: { color: '#000', fontFamily: F.display, fontSize: 9, letterSpacing: 1 },
  name: { color: C.text, fontFamily: F.display, fontSize: 17, lineHeight: 21, marginTop: 1 },
  desc: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  plus: { flex: 1, color: '#9fe3bb', fontFamily: F.medium, fontSize: 12 },
  minus: { flex: 1, color: '#f3a3ab', fontFamily: F.medium, fontSize: 12 },
});
