// Hayran buluşması mini oyunu: sıradaki hayranın isteğini (imza, selfie, sarılma) süre bitmeden doğru düğmeyle karşıla.
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import type { Appearance } from '../engine/types';
import { buzz } from '../haptics';
import { L } from '../i18n';
import { INSTANT, rnd } from './drills/common';
import { Button, SLANT } from './components';
import { FighterAvatar } from './FighterAvatar';
import { C, F } from './theme';

type Req = 'imza' | 'selfie' | 'sarilma';
const REQ: Record<Req, { emoji: string; ad: () => string; renk: string }> = {
  imza: { emoji: '✍️', ad: () => L("İmza"), renk: C.gold },
  selfie: { emoji: '🤳', ad: () => L("Selfie"), renk: C.blue },
  sarilma: { emoji: '🤗', ad: () => L("Sarılma"), renk: C.green },
};
const KEYS: Req[] = ['imza', 'selfie', 'sarilma'];
const FANS = 12;
const SAC: Appearance['sac'][] = ['kisa', 'uzun', 'kazik', 'topuz', 'atkuyrugu', 'afro', 'kel', 'orgu'];

function makeFans() {
  return Array.from({ length: FANS }, (_, i) => ({
    req: KEYS[Math.floor(rnd() * 3)],
    look: { ten: Math.floor(rnd() * 7), sac: SAC[Math.floor(rnd() * SAC.length)], sacRenk: Math.floor(rnd() * 8), goz: Math.floor(rnd() * 3), sakal: 'yok', yara: false, dovme: false } as Appearance,
    // Sıra ilerledikçe sabır kısalır
    ms: Math.max(1100, 2300 - i * 100),
  }));
}

export function FanMeetGame({ onDone, onClose }: { onDone: (puan: number) => void; onClose: () => void }) {
  const [fans] = useState(makeFans);
  const [phase, setPhase] = useState<'intro' | 'oyun' | 'son'>('intro');
  const [i, setI] = useState(0);
  const [mutlu, setMutlu] = useState(0);
  const [fb, setFb] = useState<{ ok: boolean; t: number } | null>(null);
  const [left, setLeft] = useState(1);
  const done = useRef(false);

  const next = (ok: boolean) => {
    if (done.current) return;
    if (ok) {
      setMutlu((m) => m + 1);
      sfx('click');
      buzz('hafif');
    } else {
      sfx('whoosh');
      buzz('hata');
    }
    setFb({ ok, t: Date.now() });
    if (i + 1 >= FANS) {
      done.current = true;
      setPhase('son');
      sfx('applause');
    } else setI(i + 1);
  };

  // Hayranın sabrı: süre biterse küsüp gider
  useEffect(() => {
    if (phase !== 'oyun') return;
    const t0 = Date.now();
    const ms = fans[i].ms;
    const id = setInterval(() => {
      const l = 1 - (Date.now() - t0) / ms;
      setLeft(Math.max(0, l));
      if (l <= 0) {
        clearInterval(id);
        next(false);
      }
    }, 50);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, i]);

  const f = fans[Math.min(i, FANS - 1)];
  const puan = Math.round((mutlu / FANS) * 100);
  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={st.root}>
        <Text style={[st.title, SLANT]}>{L("HAYRAN BULUŞMASI")}</Text>
        {phase === 'intro' ? (
          <View style={st.center}>
            <Text style={st.text}>{L("Sıradaki hayran ne istiyorsa onu ver: imza, selfie ya da sarılma. Geç kalırsan küsüp gider!")}</Text>
            <Button label={L("Başla")} icon="play" tone="gold" onPress={() => setPhase('oyun')} />
            <Button label={L("Vazgeç")} icon="close" tone="ghost" onPress={onClose} />
          </View>
        ) : phase === 'oyun' ? (
          <>
            <Text style={st.count}>{L("Hayran {0}/{1} · Mutlu: {2}", [i + 1, FANS, mutlu])}</Text>
            <View style={st.center}>
              <FighterAvatar look={f.look} size={110} ring={REQ[f.req].renk} />
              <View style={[st.bubble, { borderColor: REQ[f.req].renk }]}>
                <Text style={{ fontSize: 44 }}>{REQ[f.req].emoji}</Text>
              </View>
              <View style={st.timer}>
                <View style={[st.timerFill, { width: `${left * 100}%`, backgroundColor: left < 0.35 ? C.red : C.gold }]} />
              </View>
              {fb ? <Text style={[st.fb, { color: fb.ok ? C.green : C.red }]}>{fb.ok ? L("😊 Mutlu!") : L("😠 Küstü!")}</Text> : <Text style={st.fb}> </Text>}
            </View>
            <View style={st.btns}>
              {KEYS.map((k) => (
                <Pressable key={k} {...INSTANT} onPressIn={() => next(k === f.req)} style={({ pressed }) => [st.btn, { borderColor: REQ[k].renk }, pressed && { backgroundColor: REQ[k].renk + '40' }]}>
                  <Text style={{ fontSize: 30 }}>{REQ[k].emoji}</Text>
                  <Text style={[st.btnText, { color: REQ[k].renk }]}>{REQ[k].ad()}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <View style={st.center}>
            <Text style={[st.score, SLANT]}>{puan}</Text>
            <Text style={st.text}>{L("{0} hayrandan {1} tanesi mutlu ayrıldı.", [FANS, mutlu])}</Text>
            <Button label={L("Bitir")} icon="check-bold" tone="gold" onPress={() => onDone(puan)} />
          </View>
        )}
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, padding: 16, paddingTop: 40, gap: 14 },
  title: { color: C.gold, fontFamily: F.display, fontSize: 22, textAlign: 'center', letterSpacing: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, alignSelf: 'stretch' },
  text: { color: C.text, fontFamily: F.body, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  count: { color: C.dim, fontFamily: F.semi, fontSize: 13, textAlign: 'center' },
  bubble: { borderWidth: 2, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 6, backgroundColor: C.card },
  timer: { width: '70%', height: 8, borderRadius: 4, backgroundColor: '#1f2228', overflow: 'hidden' },
  timerFill: { height: '100%' },
  fb: { fontFamily: F.display, fontSize: 16, minHeight: 22 },
  btns: { flexDirection: 'row', gap: 10, paddingBottom: 24 },
  btn: { flex: 1, alignItems: 'center', gap: 4, borderWidth: 2, borderRadius: 16, paddingVertical: 16, backgroundColor: C.card },
  btnText: { fontFamily: F.display, fontSize: 13 },
  score: { color: C.gold, fontFamily: F.display, fontSize: 64 },
});
