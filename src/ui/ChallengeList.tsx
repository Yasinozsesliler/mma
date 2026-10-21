// Meydan okumalar: üstte ilerleme özeti, kategorilere göre gruplanmış kartlar (zorluk yıldızı, başlangıç kuralları, tamamlandı rozeti).
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCompletedChallenges } from '../challengePrefs';
import { CHALLENGE_KAT, CHALLENGES, DIFFICULTIES, type ChallengeId, type ChallengeKat } from '../engine/challenges';
import { BACKGROUNDS, WEIGHT_CLASSES } from '../engine/data';
import { L, LOC } from '../i18n';
import { Icon, SLANT, type IconName } from './components';
import { C, F } from './theme';

/** Kartın altındaki kural etiketleri: zorunlu yaş, branş, sıklet ve zorluk. */
function rules(id: ChallengeId): string[] {
  const c = CHALLENGES[id];
  const out: string[] = [];
  if (c.yas) out.push(L("{0} yaş", [c.yas]));
  if (c.gecmis) out.push(BACKGROUNDS[c.gecmis].ad);
  if (c.siklet) out.push(L("{0} Sıklet", [WEIGHT_CLASSES[c.siklet.e].ad]));
  if (c.zorluk) out.push(DIFFICULTIES[c.zorluk].ad());
  return out;
}

export function ChallengeList({ canStart, onStart }: { canStart: boolean; onStart: (id: ChallengeId) => void }) {
  const done = useCompletedChallenges();
  const ids = Object.keys(CHALLENGES) as ChallengeId[];
  const n = ids.filter((i) => done.includes(i)).length;
  const kats = Object.keys(CHALLENGE_KAT) as ChallengeKat[];
  return (
    <>
      <LinearGradient colors={['#2a0a10', '#13141a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.hero}>
        <View style={{ flex: 1 }}>
          <Text style={st.heroKicker}>{L("İLERLEME")}</Text>
          <Text style={[st.heroCount, SLANT]}>
            {n}
            <Text style={st.heroTotal}> / {ids.length}</Text>
          </Text>
          <View style={st.bar}>
            <View style={[st.barFill, { width: `${Math.round((n / ids.length) * 100)}%` }]} />
          </View>
          <Text style={st.heroSub}>{L("Her biri özel kurallı bir kariyer. Tamamladıklarına kalıcı rozet.")}</Text>
        </View>
        <View style={st.heroIcon}>
          <Icon name="sword-cross" size={30} color={C.red} />
        </View>
      </LinearGradient>
      {!canStart ? (
        <View style={st.warn}>
          <Icon name="alert-circle-outline" size={16} color={C.orange} />
          <Text style={st.warnText}>{L("Meydan okuma başlatmak için boş bir kariyer yuvası gerekli.")}</Text>
        </View>
      ) : null}
      {kats.map((k) => {
        const kat = CHALLENGE_KAT[k];
        const list = ids.filter((i) => CHALLENGES[i].kat === k);
        const kd = list.filter((i) => done.includes(i)).length;
        return (
          <View key={k} style={{ marginBottom: 14 }}>
            <View style={st.katHead}>
              <Icon name={kat.icon as IconName} size={15} color={kat.renk} />
              <Text style={[st.katTitle, { color: kat.renk }]}>{kat.ad().toLocaleUpperCase(LOC)}</Text>
              <View style={st.katLine} />
              <Text style={st.katCount}>
                {kd}/{list.length}
              </Text>
            </View>
            {list.map((id) => {
              const c = CHALLENGES[id];
              const ok = done.includes(id);
              const r = rules(id);
              return (
                <Pressable
                  key={id}
                  disabled={!canStart}
                  onPress={() => onStart(id)}
                  style={({ pressed }) => [st.card, ok && { borderColor: C.gold + '99', backgroundColor: '#1a160b' }, pressed && { transform: [{ scale: 0.985 }] }, !canStart && { opacity: 0.55 }]}
                >
                  <View style={[st.ic, { backgroundColor: (ok ? C.gold : kat.renk) + '1c', borderColor: (ok ? C.gold : kat.renk) + '66' }]}>
                    <Icon name={(ok ? 'trophy' : c.icon) as IconName} size={22} color={ok ? C.gold : kat.renk} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={st.nameRow}>
                      <Text style={st.name} numberOfLines={1}>
                        {c.ad()}
                      </Text>
                      <View style={st.stars}>
                        {[1, 2, 3].map((x) => (
                          <Icon key={x} name="star" size={11} color={x <= c.zor ? C.gold : '#ffffff1f'} />
                        ))}
                      </View>
                    </View>
                    <Text style={st.desc}>{c.aciklama()}</Text>
                    {r.length || ok ? (
                      <View style={st.tags}>
                        {ok ? <Text style={[st.tag, st.tagOk]}>{L("TAMAMLANDI")}</Text> : null}
                        {r.map((x) => (
                          <Text key={x} style={st.tag}>
                            {x}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </View>
                  <Icon name={ok ? 'replay' : 'chevron-right'} size={20} color={ok ? C.gold : C.faint} />
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </>
  );
}

const st = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: '#4a1a22', padding: 16, marginBottom: 14 },
  heroKicker: { color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 1.8 },
  heroCount: { color: C.text, fontFamily: F.display, fontSize: 38, lineHeight: 44 },
  heroTotal: { color: C.dim, fontSize: 20 },
  bar: { height: 6, borderRadius: 3, backgroundColor: '#ffffff12', overflow: 'hidden', marginTop: 4 },
  barFill: { height: '100%', backgroundColor: C.gold, borderRadius: 3 },
  heroSub: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 16, marginTop: 8 },
  heroIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.red + '1a', borderWidth: 1, borderColor: C.red + '55', alignItems: 'center', justifyContent: 'center' },
  warn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.orange + '14', borderWidth: 1, borderColor: C.orange + '44', borderRadius: 12, padding: 10, marginBottom: 12 },
  warnText: { flex: 1, color: C.orange, fontFamily: F.semi, fontSize: 12 },
  katHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginLeft: 2 },
  katTitle: { fontFamily: F.display, fontSize: 12, letterSpacing: 1.5 },
  katLine: { flex: 1, height: 1, backgroundColor: '#ffffff12', marginHorizontal: 4 },
  katCount: { color: C.faint, fontFamily: F.display, fontSize: 11 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#14151a', borderWidth: 1, borderColor: '#24262d', borderRadius: 14, padding: 12, marginBottom: 8 },
  ic: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flexShrink: 1, color: C.text, fontFamily: F.display, fontSize: 16, letterSpacing: 0.3 },
  stars: { flexDirection: 'row', gap: 1 },
  desc: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 16, marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 7 },
  tag: { color: C.text, fontFamily: F.semi, fontSize: 10, backgroundColor: '#ffffff0f', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  tagOk: { color: '#1f1605', backgroundColor: C.gold, fontFamily: F.display, letterSpacing: 0.8 },
});
