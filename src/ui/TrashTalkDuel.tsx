// Basın toplantısı düellosu: rakibin lafı yazılır, oyuncu süre dolmadan üç tarzdan birini seçer, salonun havası değişir.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import { lookFor } from '../engine/tale';
import { duelOutcome, DUEL_TIP, JAB_LABEL, REPLY_LABEL, type Reply } from '../engine/trashTalk';
import type { GameState } from '../engine/types';
import { buzz } from '../haptics';
import { L, LOC } from '../i18n';
import { Button, Icon, Screen, SLANT, type IconName } from './components';
import { INSTANT } from './drills/common';
import { FighterAvatar } from './FighterAvatar';
import { C, F, R } from './theme';

const ANSWER_MS = 6000;
const STYLE: Record<Reply, { icon: IconName; renk: string }> = {
  sert: { icon: 'fire', renk: C.red },
  komik: { icon: 'emoticon-lol-outline', renk: C.gold },
  soguk: { icon: 'snowflake', renk: C.blue },
};
const REACT = {
  iyi: { metin: () => L("SALON YIKILDI! 🔥"), renk: C.green },
  orta: { metin: () => L("Fena değil, birkaç kişi güldü"), renk: C.gold },
  kotu: { metin: () => L("Ters tepti… 😬"), renk: C.red },
  sus: { metin: () => L("Sustun… salon rakibe güldü 😶"), renk: C.red },
};

export function TrashTalkDuel({ s, header, choose }: { s: GameState; header: ReactNode; choose: (v: string | number) => void }) {
  const d = s.pending.kamp!.duello!;
  const o = s.pending.rakip!;
  const tur = d.cevaplar.length;
  // lafi: rakip konuşuyor · cevap: süre işliyor · tepki: salonun tepkisi · son: sonuç
  const [phase, setPhase] = useState<'lafi' | 'cevap' | 'tepki' | 'son'>(d.bitti ? 'son' : 'lafi');
  const [chars, setChars] = useState(0);
  const [left, setLeft] = useState(ANSWER_MS);
  const answered = useRef(false);
  const lafi = d.laflar[Math.min(tur, d.laflar.length - 1)];

  // Rakibin lafı harf harf yazılır
  useEffect(() => {
    if (phase !== 'lafi') return;
    answered.current = false;
    let n = 0;
    const id = setInterval(() => {
      n += 2;
      setChars(n);
      if (n >= lafi.metin.length) {
        clearInterval(id);
        setTimeout(() => {
          setLeft(ANSWER_MS);
          setPhase('cevap');
        }, 350);
      }
    }, 28);
    return () => clearInterval(id);
  }, [phase, lafi.metin]);

  const answer = (a: Reply | 'sus') => {
    if (answered.current) return;
    answered.current = true;
    choose(a);
    setPhase('tepki');
  };

  // Cevap süresi
  useEffect(() => {
    if (phase !== 'cevap') return;
    const t0 = Date.now();
    const id = setInterval(() => {
      const l = ANSWER_MS - (Date.now() - t0);
      setLeft(l);
      if (l <= 0) {
        clearInterval(id);
        answer('sus');
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, tur]);

  // Tepkinin sesi ve titreşimi, sonra sıradaki tur
  useEffect(() => {
    if (phase !== 'tepki' || !d.son) return;
    const dr = d.son.derece;
    sfx(dr === 'iyi' ? 'roar' : dr === 'orta' ? 'applause' : 'ooh', dr === 'orta' ? 0.6 : 1);
    buzz(dr === 'iyi' ? 'basari' : dr === 'orta' ? 'hafif' : 'hata');
    const id = setTimeout(() => {
      setChars(0);
      setPhase(d.bitti ? 'son' : 'lafi');
    }, dr === 'iyi' || dr === 'orta' ? 1500 : 2600);
    return () => clearTimeout(id);
  }, [phase, d.son, d.bitti]);

  const sonuc = duelOutcome(d);
  const meterPct = Math.abs(d.hava) / 2; // 0..50 (yarım çubuk)
  const etkiler =
    sonuc === 'kazandi'
      ? [L("Popülerlik +6"), L("Takipçi patlaması"), L("Rakip IQ -2 (sinirli)")]
      : sonuc === 'berabere'
        ? [L("Popülerlik +2"), L("Rakip gaza geldi: vuruş ve kondisyon +2")]
        : [L("Popülerlik -2"), L("Takipçi kaybı"), L("Rakip gaza geldi: vuruş ve kondisyon +2")];

  return (
    <Screen footer={phase === 'son' ? <Button label={L("Devam")} icon="arrow-right" tone="gold" onPress={() => choose('devam')} /> : undefined}>
      {header}
      <LinearGradient colors={['#1d0a0e', '#0c0d11']} style={st.stage}>
        <Text style={[st.kicker, SLANT]}>{L("BASIN TOPLANTISI")}</Text>
        <View style={st.row}>
          <View style={st.side}>
            <FighterAvatar look={s.fighter.gorunum} size={78} ring={C.red} />
            <Text style={st.name} numberOfLines={1}>{s.fighter.soyad.toLocaleUpperCase(LOC)}</Text>
          </View>
          <View style={st.mid}>
            <Text style={st.vs}>🎤</Text>
            <View style={st.rounds}>
              {d.laflar.map((_, i) => {
                const dr = d.dereceler?.[i];
                return <View key={i} style={[st.dot, dr && { backgroundColor: dr === 'iyi' ? C.green : dr === 'orta' ? C.gold : C.red }, i === tur && phase !== 'son' && { borderColor: C.gold }]} />;
              })}
            </View>
          </View>
          <View style={st.side}>
            <FighterAvatar look={lookFor(o)} size={78} ring={C.blue} />
            <Text style={st.name} numberOfLines={1}>{o.soyad.toLocaleUpperCase(LOC)}</Text>
          </View>
        </View>
        {/* Salonun havası */}
        <View style={st.meterWrap}>
          <Text style={st.meterLabel}>{L("SALON")}</Text>
          <View style={st.meter}>
            <View style={st.meterMid} />
            {d.hava >= 0 ? (
              <View style={[st.fill, { right: '50%', width: `${meterPct}%`, backgroundColor: C.red }]} />
            ) : (
              <View style={[st.fill, { left: '50%', width: `${meterPct}%`, backgroundColor: C.blue }]} />
            )}
          </View>
        </View>
      </LinearGradient>

      {phase === 'lafi' || phase === 'cevap' ? (
        <View style={st.bubble}>
          <View style={st.bubbleHead}>
            <Text style={st.who}>{o.soyad.toLocaleUpperCase(LOC)}</Text>
            {phase === 'cevap' ? <Text style={st.chip}>{JAB_LABEL[lafi.tip]()}</Text> : null}
          </View>
          <Text style={st.jab}>“{lafi.metin.slice(0, chars)}{chars < lafi.metin.length ? '▌' : ''}”</Text>
        </View>
      ) : null}

      {phase === 'cevap' ? (
        <>
          <View style={st.timer}>
            <View style={[st.timerFill, { width: `${Math.max(0, left / ANSWER_MS) * 100}%`, backgroundColor: left < 2000 ? C.red : C.gold }]} />
          </View>
          {d.secenekler[tur].map((c) => (
            <Pressable key={c.tarz} {...INSTANT} onPress={() => answer(c.tarz)} style={({ pressed }) => [st.opt, { borderColor: STYLE[c.tarz].renk }, pressed && { opacity: 0.7 }]}>
              <View style={[st.optIc, { backgroundColor: STYLE[c.tarz].renk }]}>
                <Icon name={STYLE[c.tarz].icon} size={18} color="#0b0b0e" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.optTag, { color: STYLE[c.tarz].renk }]}>{REPLY_LABEL[c.tarz]().toLocaleUpperCase(LOC)}</Text>
                <Text style={st.optText}>“{c.metin}”</Text>
              </View>
            </Pressable>
          ))}
          <Pressable onPress={() => choose('oto')} style={st.auto}>
            <Text style={st.autoText}>{L("Otomatik geç")}</Text>
          </Pressable>
        </>
      ) : null}

      {phase === 'tepki' && d.son ? (
        <View style={[st.react, { borderColor: REACT[d.son.derece].renk }]}>
          <Text style={[st.reactText, { color: REACT[d.son.derece].renk }]}>{REACT[d.son.derece].metin()}</Text>
          <Text style={st.reactPts}>{d.son.puan > 0 ? `+${d.son.puan}` : d.son.puan}</Text>
          {d.son.derece === 'kotu' || d.son.derece === 'sus' ? <Text style={st.tip}>{DUEL_TIP()}</Text> : null}
        </View>
      ) : null}

      {phase === 'son' ? (
        <View style={[st.result, { borderColor: sonuc === 'kazandi' ? C.gold : sonuc === 'berabere' ? C.border : C.red }]}>
          <Text style={[st.resTitle, SLANT, { color: sonuc === 'kazandi' ? C.gold : sonuc === 'berabere' ? C.text : C.red }]}>
            {sonuc === 'kazandi' ? L("BASIN TOPLANTISINI KAZANDIN!") : sonuc === 'berabere' ? L("KİMSE ÜSTÜN GELEMEDİ") : L("RAKİP SENİ EZDİ")}
          </Text>
          {etkiler.map((e) => (
            <View key={e} style={st.effRow}>
              <Icon name={sonuc === 'kazandi' ? 'check-circle' : 'information'} size={16} color={sonuc === 'kazandi' ? C.green : C.dim} />
              <Text style={st.eff}>{e}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const st = StyleSheet.create({
  stage: { borderRadius: R + 2, borderWidth: 1, borderColor: '#3a1a20', padding: 14, marginBottom: 12, gap: 12 },
  kicker: { color: C.red, fontFamily: F.display, fontSize: 18, letterSpacing: 2, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  side: { flex: 1, alignItems: 'center', gap: 6 },
  name: { color: C.text, fontFamily: F.display, fontSize: 13, letterSpacing: 1 },
  mid: { alignItems: 'center', gap: 8, width: 70 },
  vs: { fontSize: 30 },
  rounds: { flexDirection: 'row', gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: C.border, backgroundColor: '#1a1c22' },
  meterWrap: { gap: 4 },
  meterLabel: { color: C.dim, fontFamily: F.semi, fontSize: 10, letterSpacing: 2, textAlign: 'center' },
  meter: { height: 10, borderRadius: 5, backgroundColor: '#1f2228', overflow: 'hidden' },
  meterMid: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: '#555a66', zIndex: 2 },
  fill: { position: 'absolute', top: 0, bottom: 0 },
  bubble: { backgroundColor: '#101a33', borderRadius: 14, borderTopRightRadius: 2, borderWidth: 1, borderColor: '#24407a', padding: 14, marginBottom: 12, gap: 6 },
  bubbleHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  who: { color: C.blue, fontFamily: F.display, fontSize: 12, letterSpacing: 1.5 },
  chip: { color: '#9fc0ff', fontFamily: F.semi, fontSize: 11, borderWidth: 1, borderColor: '#24407a', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  jab: { color: C.text, fontFamily: F.semi, fontSize: 16, lineHeight: 23, minHeight: 46 },
  timer: { height: 6, borderRadius: 3, backgroundColor: '#1f2228', overflow: 'hidden', marginBottom: 10 },
  timerFill: { height: '100%' },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderWidth: 1.5, borderRadius: 12, padding: 12, marginBottom: 8 },
  optIc: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  optTag: { fontFamily: F.display, fontSize: 11, letterSpacing: 1.5 },
  optText: { color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 19, marginTop: 2 },
  auto: { alignSelf: 'center', padding: 8 },
  autoText: { color: C.faint, fontFamily: F.semi, fontSize: 12, textDecorationLine: 'underline' },
  react: { borderWidth: 1.5, borderRadius: 14, padding: 18, alignItems: 'center', gap: 6, backgroundColor: C.card },
  reactText: { fontFamily: F.display, fontSize: 20, letterSpacing: 1, textAlign: 'center' },
  reactPts: { color: C.dim, fontFamily: F.display, fontSize: 14 },
  tip: { color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 6 },
  result: { borderWidth: 1.5, borderRadius: 14, padding: 16, gap: 10, backgroundColor: C.card },
  resTitle: { fontFamily: F.display, fontSize: 20, letterSpacing: 1, textAlign: 'center', marginBottom: 4 },
  effRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eff: { color: C.text, fontFamily: F.body, fontSize: 14, flex: 1 },
});
