// Ana menüde meydan okuma modları: özel kurallı kariyerler, tamamlananlar rozetle işaretli.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCompletedChallenges } from '../challengePrefs';
import { CHALLENGES, type ChallengeId } from '../engine/challenges';
import { L } from '../i18n';
import { Icon, Section, type IconName } from './components';
import { C, F } from './theme';

export function ChallengeList({ canStart, onStart }: { canStart: boolean; onStart: (id: ChallengeId) => void }) {
  const done = useCompletedChallenges();
  const ids = Object.keys(CHALLENGES) as ChallengeId[];
  return (
    <>
      <Section>{L("MEYDAN OKUMALAR · {0}/{1}", [ids.filter((i) => done.includes(i)).length, ids.length])}</Section>
      {!canStart ? <Text style={st.warn}>{L("Meydan okuma başlatmak için boş bir kariyer yuvası gerekli.")}</Text> : null}
      {ids.map((id) => {
        const c = CHALLENGES[id];
        const ok = done.includes(id);
        return (
          <Pressable key={id} disabled={!canStart} onPress={() => onStart(id)} style={({ pressed }) => [st.card, ok && { borderColor: C.gold }, pressed && { opacity: 0.8 }, !canStart && { opacity: 0.6 }]}>
            <View style={[st.ic, { borderColor: ok ? C.gold : C.red }]}>
              <Icon name={(ok ? 'trophy' : c.icon) as IconName} size={20} color={ok ? C.gold : C.red} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.name}>{c.ad()}</Text>
              <Text style={st.desc}>{c.aciklama()}</Text>
            </View>
            {ok ? <Text style={st.badge}>{L("TAMAMLANDI")}</Text> : <Icon name="chevron-right" size={20} color={C.faint} />}
          </Pressable>
        );
      })}
    </>
  );
}

const st = StyleSheet.create({
  warn: { color: C.orange, fontFamily: F.semi, fontSize: 12, marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  ic: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  name: { color: C.text, fontFamily: F.display, fontSize: 15 },
  desc: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 16 },
  badge: { color: C.gold, fontFamily: F.display, fontSize: 10, letterSpacing: 1 },
});
