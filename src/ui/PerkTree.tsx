// Yetenek ağacı: beş dal, üç kademe. Perk puanı profesyonel galibiyet eşiklerinde gelir.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BRANCHES, canTakePerk, hasPerk, nextPerkAt, perkPointsFree, PERKS, takePerk, type PerkBranch, type PerkId } from '../engine/perks';
import type { GameState } from '../engine/types';
import { buzz } from '../haptics';
import { L } from '../i18n';
import { Button, Icon, Section, type IconName } from './components';
import type { Act } from './GameScreens';
import { C, F } from './theme';

export function PerkTree({ s, act }: { s: GameState; act: Act }) {
  const [sel, setSel] = useState<PerkId | null>(null);
  const free = perkPointsFree(s);
  const next = nextPerkAt(s);
  return (
    <>
      <Section>{L("YETENEK AĞACI · {0} PUAN", [free])}</Section>
      <Text style={st.hint}>
        {s.stage === 'amator'
          ? L("Perk puanları profesyonel galibiyetlerle gelir.")
          : next
            ? L("Sıradaki perk puanı {0}. profesyonel galibiyette.", [next])
            : L("Bütün perk puanlarını kazandın.")}
      </Text>
      <View style={st.tree}>
        {(Object.keys(BRANCHES) as PerkBranch[]).map((b) => {
          const br = BRANCHES[b];
          return (
            <View key={b} style={st.col}>
              <Icon name={br.icon as IconName} size={18} color={br.renk} />
              <Text style={[st.branch, { color: br.renk }]}>{br.ad()}</Text>
              {br.perkler.map((p, i) => {
                const owned = hasPerk(s, p);
                const can = canTakePerk(s, p);
                return (
                  <View key={p} style={{ alignItems: 'center' }}>
                    {i > 0 ? <View style={[st.link, { backgroundColor: owned ? br.renk : C.border }]} /> : null}
                    <Pressable
                      onPress={() => setSel(sel === p ? null : p)}
                      style={[st.node, { borderColor: owned ? br.renk : can ? C.gold : C.border, backgroundColor: owned ? br.renk + '33' : C.card }, sel === p && { transform: [{ scale: 1.08 }] }]}
                    >
                      <Text style={[st.nodeText, { color: owned ? C.text : can ? C.gold : C.faint }]} numberOfLines={2}>
                        {PERKS[p].ad()}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
      {sel ? (
        <View style={st.detail}>
          <Text style={st.detailTitle}>{PERKS[sel].ad()}</Text>
          <Text style={st.detailText}>{PERKS[sel].aciklama()}</Text>
          {hasPerk(s, sel) ? (
            <Text style={[st.detailText, { color: C.green }]}>{L("✓ Alındı")}</Text>
          ) : canTakePerk(s, sel) ? (
            <Button
              label={L("Perki al")}
              icon="star-plus"
              tone="gold"
              onPress={() => {
                buzz('basari');
                act((x) => takePerk(x, sel));
              }}
            />
          ) : (
            <Text style={[st.detailText, { color: C.faint }]}>{free ? L("Önce bu daldaki önceki perki almalısın.") : L("Perk puanın yok.")}</Text>
          )}
        </View>
      ) : null}
    </>
  );
}

const st = StyleSheet.create({
  hint: { color: C.dim, fontFamily: F.body, fontSize: 12, marginBottom: 8 },
  tree: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  col: { flex: 1, alignItems: 'center', gap: 3 },
  branch: { fontFamily: F.display, fontSize: 11, marginBottom: 4 },
  link: { width: 2, height: 10 },
  node: { width: '100%', minHeight: 50, borderWidth: 1.5, borderRadius: 10, padding: 4, alignItems: 'center', justifyContent: 'center' },
  nodeText: { fontFamily: F.semi, fontSize: 10, textAlign: 'center' },
  detail: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, gap: 8, marginBottom: 12 },
  detailTitle: { color: C.text, fontFamily: F.display, fontSize: 15 },
  detailText: { color: C.dim, fontFamily: F.body, fontSize: 13 },
});
