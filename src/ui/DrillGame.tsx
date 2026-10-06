// Antrenman mini oyunları: pad çalışması (kombinasyon), takedown savunması (okuma + sprawl), ip atlama (ritim).
// Her kamp haftası rastgele biri gelir; sonuç 0–100 puan olarak kampa yazılır.
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import { DRILLS, drillGrade, type DrillId } from '../engine/drills';
import type { Appearance } from '../engine/types';
import { buzz } from '../haptics';
import { L, LOC } from '../i18n';
import { Button, Icon, SLANT, type IconName } from './components';
import { PadMitts } from './drills/PadMitts';
import { TakedownGame } from './drills/TakedownGame';
import { SparGame } from './drills/SparGame';
import { RopeGame } from './drills/RopeGame';
import { C, F } from './theme';

// ---------- Kabuk: tanıtım → geri sayım → oyun → sonuç ----------

export function DrillGame({ oyun, onDone, onClose, pLook, oLook }: { oyun: DrillId; onDone: (puan: number) => void; onClose: () => void; pLook?: Appearance; oLook?: Appearance }) {
  const [phase, setPhase] = useState<'intro' | 'sayim' | 'oyun' | 'son'>('intro');
  const [n, setN] = useState(3);
  const [puan, setPuan] = useState(0);
  const d = DRILLS[oyun];

  useEffect(() => {
    if (phase !== 'sayim') return;
    if (n === 0) {
      const t = setTimeout(() => setPhase('oyun'), 0);
      return () => clearTimeout(t);
    }
    sfx('click');
    const t = setTimeout(() => setN((x) => x - 1), 650);
    return () => clearTimeout(t);
  }, [phase, n]);

  const end = (p: number) => {
    setPuan(Math.round(p));
    setPhase('son');
    sfx(p >= 65 ? 'applause' : 'bell');
    buzz(p >= 65 ? 'basari' : 'hafif');
  };

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} transparent={false}>
      <View style={g.root}>
        <View style={g.top}>
          <Icon name={d.ikon as IconName} size={20} color={C.gold} />
          <Text style={g.title}>{d.ad.toLocaleUpperCase(LOC)}</Text>
          {phase !== 'son' ? (
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel={L("Kapat")}>
              <Icon name="close" size={22} color={C.faint} />
            </Pressable>
          ) : (
            <View style={{ width: 22 }} />
          )}
        </View>
        {phase === 'intro' ? (
          <View style={g.intro}>
            <View style={g.introIcon}>
              <Icon name={d.ikon as IconName} size={64} color={C.gold} />
            </View>
            <Text style={g.introText}>{d.aciklama}</Text>
            <Text style={g.introSub}>{L("İyi oynarsan kamp daha verimli geçer ve sakatlık riski azalır. Oynamazsan kamp normal sonucunu verir.")}</Text>
            <Button label={L("Başla")} icon="play" tone="gold" onPress={() => setPhase('sayim')} />
          </View>
        ) : phase === 'sayim' ? (
          <View style={g.center}>
            <Text style={[g.count, SLANT]}>{n || L("BAŞLA")}</Text>
          </View>
        ) : phase === 'oyun' ? (
          oyun === 'pad' ? (
            <PadMitts onEnd={end} />
          ) : oyun === 'refleks' ? (
            <TakedownGame onEnd={end} pLook={pLook} oLook={oLook} />
          ) : oyun === 'spar' ? (
            <SparGame onEnd={end} pLook={pLook} oLook={oLook} />
          ) : (
            <RopeGame onEnd={end} pLook={pLook} />
          )
        ) : (
          <View style={g.intro}>
            <Text style={[g.score, SLANT, { color: puan >= 65 ? C.gold : puan >= 40 ? C.text : C.red }]}>{puan}</Text>
            <Text style={g.grade}>{drillGrade(puan).toLocaleUpperCase(LOC)}</Text>
            <Text style={g.introSub}>{L("Seans sonucu kamp raporuna eklendi.")}</Text>
            <Button label={L("Kampa dön")} icon="check" tone="gold" onPress={() => onDone(puan)} />
          </View>
        )}
      </View>
    </Modal>
  );
}

const g = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060607', paddingTop: 18, paddingHorizontal: 16, paddingBottom: 24, width: '100%', maxWidth: 560, alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { flex: 1, color: C.gold, fontFamily: F.display, fontSize: 18, letterSpacing: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  ropeBox: { width: 180, height: 170, alignItems: 'center', justifyContent: 'flex-end' },
  ball: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#1b170b', borderWidth: 2, borderColor: C.goldDeep, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  ground: { width: 180, height: 4, borderRadius: 2, backgroundColor: C.red },
  intro: { flex: 1, alignItems: 'stretch', justifyContent: 'center', gap: 16 },
  introIcon: { alignSelf: 'center', width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: C.goldDeep, alignItems: 'center', justifyContent: 'center', backgroundColor: '#15120a' },
  introText: { color: C.text, fontFamily: F.semi, fontSize: 17, lineHeight: 24, textAlign: 'center' },
  introSub: { color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  count: { color: C.gold, fontFamily: F.display, fontSize: 96 },
  score: { fontFamily: F.display, fontSize: 96, textAlign: 'center', lineHeight: 104 },
  grade: { color: C.text, fontFamily: F.display, fontSize: 22, letterSpacing: 2, textAlign: 'center' },
});
