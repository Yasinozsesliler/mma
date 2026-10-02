// Raunt arası köşe anı: nefes zamanlaması (kondisyon +1..+3) ve kesik varsa cutman'e yardım (doktor riski yarıya iner).
// Etkisi bilerek küçük: dövüşü değiştirmez, köşeyi hissettirir.
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import type { FightState } from '../engine/types';
import { buzz } from '../haptics';
import { L } from '../i18n';
import { INSTANT } from './drills/common';
import { C, F } from './theme';

const BREATH_MS = 1800;
const CUT_MS = 3000;
const CUT_TAPS = 6;

function Breath({ onDone }: { onDone: (q: number) => void }) {
  const [p, setP] = useState(0);
  const [res, setRes] = useState<number | null>(null);
  const t0 = useRef(0);
  useEffect(() => {
    if (res != null) return;
    t0.current = Date.now();
    const id = setInterval(() => {
      const x = ((Date.now() - t0.current) % BREATH_MS) / BREATH_MS;
      setP(x < 0.5 ? x * 2 : 2 - x * 2);
    }, 30);
    return () => clearInterval(id);
  }, [res]);
  const tap = () => {
    if (res != null) return;
    // Nefesin en dolu anı (p≈1) en iyisi
    const q = Math.max(0, 1 - Math.abs(1 - p) * 2.2);
    setRes(q);
    sfx(q > 0.7 ? 'chime' : 'click');
    buzz(q > 0.7 ? 'basari' : 'hafif');
    onDone(q);
  };
  return (
    <Pressable {...INSTANT} onPressIn={tap} style={st.game}>
      <View style={st.ringWrap}>
        <View style={[st.ring, { transform: [{ scale: 0.4 + p * 0.6 }], borderColor: p > 0.85 ? C.green : C.blue }]} />
        <View style={st.target} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.title}>{L("Nefesini topla")}</Text>
        <Text style={st.desc}>{res == null ? L("Halka en büyükken dokun.") : res > 0.7 ? L("Derin nefes! Kondisyon +3") : res > 0.3 ? L("İyi nefes. Kondisyon +2") : L("Kesik kesik nefes. Kondisyon +1")}</Text>
      </View>
    </Pressable>
  );
}

function Cut({ onDone }: { onDone: (ok: boolean) => void }) {
  const [taps, setTaps] = useState(0);
  const [left, setLeft] = useState(1);
  const [state, setState] = useState<'hazir' | 'oyun' | 'tamam' | 'olmadi'>('hazir');
  const tapsRef = useRef(0);
  useEffect(() => {
    if (state !== 'oyun') return;
    const t0 = Date.now();
    const id = setInterval(() => {
      const l = 1 - (Date.now() - t0) / CUT_MS;
      setLeft(Math.max(0, l));
      if (l <= 0) {
        clearInterval(id);
        setState('olmadi');
        sfx('ooh');
        onDone(false);
      }
    }, 50);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const tap = () => {
    if (state === 'hazir') {
      setState('oyun');
      return;
    }
    if (state !== 'oyun') return;
    tapsRef.current++;
    setTaps(tapsRef.current);
    buzz('hafif');
    if (tapsRef.current >= CUT_TAPS) {
      setState('tamam');
      sfx('chime');
      onDone(true);
    }
  };
  return (
    <Pressable {...INSTANT} onPressIn={tap} style={[st.game, { borderColor: '#5a1a1f' }]}>
      <Text style={{ fontSize: 30 }}>{state === 'tamam' ? '🩹' : '🩸'}</Text>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={st.title}>{L("Cutman'e yardım et")}</Text>
        <Text style={st.desc}>
          {state === 'hazir'
            ? L("Başlamak için dokun, sonra 3 saniyede 6 kez bastır.")
            : state === 'oyun'
              ? L("Bastır! {0}/{1}", [taps, CUT_TAPS])
              : state === 'tamam'
                ? L("Kanama durdu. Doktor riski yarıya indi.")
                : L("Kanama sürüyor… Doktor yakından bakacak.")}
        </Text>
        {state === 'oyun' ? (
          <View style={st.bar}>
            <View style={[st.fill, { width: `${left * 100}%` }]} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function CornerMoment({ fs, onBreath, onCut }: { fs: FightState; onBreath: (q: number) => void; onCut: (ok: boolean) => void }) {
  const breathed = fs.nefesRaunt === fs.raunt;
  const cutDone = fs.kesikRaunt === fs.raunt;
  return (
    <View style={{ gap: 8, marginBottom: 10 }}>
      {!breathed ? (
        <Breath key={`b${fs.raunt}`} onDone={onBreath} />
      ) : (
        <Text style={st.done}>{(fs.nefesQ ?? 0) > 0.7 ? L("🫁 Derin nefes! Kondisyon +3") : (fs.nefesQ ?? 0) > 0.3 ? L("🫁 İyi nefes. Kondisyon +2") : L("🫁 Kesik kesik nefes. Kondisyon +1")}</Text>
      )}
      {fs.kesik && !cutDone ? <Cut key={`c${fs.raunt}`} onDone={onCut} /> : null}
      {fs.kesik && cutDone ? <Text style={st.done}>{fs.kesikBakim ? L("🩹 Kanama durdu. Doktor riski yarıya indi.") : L("🩸 Kanama sürüyor… Doktor yakından bakacak.")}</Text> : null}
    </View>
  );
}

const st = StyleSheet.create({
  game: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12 },
  ringWrap: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 46, height: 46, borderRadius: 23, borderWidth: 3 },
  target: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: '#ffffff33', borderStyle: 'dashed' },
  title: { color: C.text, fontFamily: F.semi, fontSize: 14 },
  desc: { color: C.dim, fontFamily: F.body, fontSize: 12 },
  bar: { height: 5, borderRadius: 3, backgroundColor: '#1f2228', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: C.red },
  done: { color: C.text, fontFamily: F.semi, fontSize: 13, backgroundColor: C.card, borderRadius: 10, padding: 10 },
});
