// Maç öncesi belgesel (Countdown) ve hype göstergesi. Belgesel 5 sahne: açılış, iki dövüşçünün hikâyesi,
// kafa kafaya karşılaştırma, kapanış. Dokunarak ilerler; izlenince hype +10.
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import { statAverage } from '../engine/character';
import { hypeLabel } from '../engine/hype';
import { describeOpponent, oppRecord } from '../engine/opponents';
import { lookFor } from '../engine/tale';
import { techById } from '../engine/techniques';
import type { GameState } from '../engine/types';
import { L, LOC } from '../i18n';
import { Icon, SLANT } from './components';
import { FighterAvatar } from './FighterAvatar';
import { C, F } from './theme';

export function HypeMeter({ s }: { s: GameState }) {
  const k = s.pending.kamp;
  if (!k || k.hype == null) return null;
  const h = k.hype;
  const col = h >= 85 ? C.red : h >= 65 ? C.orange : h >= 40 ? C.gold : C.dim;
  return (
    <View style={st.meter}>
      <View style={st.meterHead}>
        <Icon name="fire" size={16} color={col} />
        <Text style={[st.meterTitle, { color: col }]}>{L("HYPE {0}", [h])}</Text>
        <Text style={st.meterSub}>{hypeLabel(h)}</Text>
      </View>
      <View style={st.bar}>
        <View style={{ width: `${h}%`, height: '100%', backgroundColor: col, borderRadius: 4 }} />
      </View>
      {k.hypeLog?.length ? <Text style={st.log}>{k.hypeLog.join(' · ')}</Text> : null}
      <Text style={st.ppv}>{L("Büyük maç: hype ne kadar yüksekse PPV payın o kadar büyük.")}</Text>
    </View>
  );
}

export function CountdownDoc({ s, onClose }: { s: GameState; onClose: () => void }) {
  const [i, setI] = useState(0);
  const o = s.pending.rakip!;
  const f = s.fighter;
  const d = describeOpponent(o);
  const r = s.stage === 'amator' ? s.amator : s.rekor;
  const son = s.gecmis.slice(0, 3).map((h) => (h.sonuc === 'G' ? 'G' : h.sonuc === 'M' ? 'M' : 'B')).join(' ');
  const imza = s.imza ? s.imza.ad : techById(Object.entries(s.teknik ?? {}).sort((a, b) => b[1].sv - a[1].sv)[0]?.[0] ?? '')?.ad;
  const story = o.champion || s.sampiyon ? L("Kemer masada.") : o.memleket ? L("Memleketinde, kendi insanının önünde.") : s.ezeli?.id === o.id ? L("Ezeli rakipler bir kez daha.") : o.rivalry >= 2 ? L("Aralarındaki hesap kapanmadı.") : L("İki aç dövüşçü, tek kazanan.");
  const rows: [string, number, number][] = [
    [L("Güç"), Math.round(statAverage(f.stats)), Math.round(statAverage(o.stats))],
    [L("Vuruş"), f.stats.vurus, o.stats.vurus],
    [L("Güreş"), f.stats.gures, o.stats.gures],
    [L("Yer"), f.stats.yer, o.stats.yer],
    [L("Kondisyon"), f.stats.kondisyon, o.stats.kondisyon],
  ];
  const scenes = [
    <View key={0} style={st.scene}>
      <Text style={st.kicker}>{L("COUNTDOWN")}</Text>
      <View style={st.vsRow}>
        <FighterAvatar look={f.gorunum} size={90} ring={C.red} />
        <Text style={st.vs}>VS</Text>
        <FighterAvatar look={lookFor(o)} size={90} ring={C.blue} />
      </View>
      <Text style={[st.title, SLANT]}>
        {f.soyad.toLocaleUpperCase(LOC)} vs {o.soyad.toLocaleUpperCase(LOC)}
      </Text>
      <Text style={st.text}>{o.etiket ?? ''}</Text>
      <Text style={st.big}>{story}</Text>
    </View>,
    <View key={1} style={st.scene}>
      <FighterAvatar look={f.gorunum} size={100} ring={C.red} />
      <Text style={[st.title, SLANT]}>{`${f.ad} ${f.lakap ? `“${f.lakap}” ` : ''}${f.soyad}`}</Text>
      <Text style={st.text}>{L("{0} · {1}-{2}-{3}", [f.memleket, r.g, r.m, r.b])}</Text>
      {son ? <Text style={st.text}>{L("Son maçlar: {0}", [son])}</Text> : null}
      {imza ? <Text style={st.text}>{L("Silahı: {0}", [imza])}</Text> : null}
      <Text style={st.quote}>{L("{0}: “Bu kampta onu hiç bu kadar aç görmedim.”", [s.takim.antrenor])}</Text>
    </View>,
    <View key={2} style={st.scene}>
      <FighterAvatar look={lookFor(o)} size={100} ring={C.blue} />
      <Text style={[st.title, SLANT]}>{`${o.ad} “${o.lakap}” ${o.soyad}`}</Text>
      <Text style={st.text}>{L("{0} · {1}", [o.uyruk, oppRecord(o)])}</Text>
      <Text style={st.text}>{L("Stil: {0} · En güçlü: {1}", [d.stil, d.guclu])}</Text>
      {o.karsilasma > 0 ? <Text style={st.text}>{L("Aralarında {0} maç var.", [o.karsilasma])}</Text> : null}
      <Text style={st.quote}>{L("{0}: “Cumartesi gecesi kimin daha aç olduğunu göreceğiz.”", [o.soyad])}</Text>
    </View>,
    <View key={3} style={st.scene}>
      <Text style={st.kicker}>{L("KAFA KAFAYA")}</Text>
      {rows.map(([label, a, b]) => (
        <View key={label} style={st.row}>
          <Text style={[st.num, a >= b && { color: C.red }]}>{a}</Text>
          <Text style={st.label}>{label}</Text>
          <Text style={[st.num, b > a && { color: C.blue }]}>{b}</Text>
        </View>
      ))}
    </View>,
    <View key={4} style={st.scene}>
      <Text style={[st.big, { fontSize: 22 }]}>{L("Kafes kapısı kapandığında sözler biter.")}</Text>
      <Text style={st.text}>{L("Cumartesi gecesi. Canlı.")}</Text>
    </View>,
  ];
  const last = i >= scenes.length - 1;
  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={st.root}
        onPress={() => {
          sfx('whoosh');
          if (last) onClose();
          else setI(i + 1);
        }}
      >
        <LinearGradient colors={['#14060a', '#050506']} style={StyleSheet.absoluteFill} />
        <View style={st.dots}>
          {scenes.map((_, k) => (
            <View key={k} style={[st.dot, k <= i && { backgroundColor: C.red }]} />
          ))}
        </View>
        {scenes[i]}
        <Text style={st.tap}>{last ? L("Kapatmak için dokun") : L("Devam etmek için dokun")}</Text>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  meter: { backgroundColor: '#1a0c08', borderWidth: 1, borderColor: '#4a2410', borderRadius: 12, padding: 10, gap: 6, marginBottom: 10 },
  meterHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meterTitle: { fontFamily: F.display, fontSize: 14, letterSpacing: 1 },
  meterSub: { color: C.dim, fontFamily: F.semi, fontSize: 11, flex: 1, textAlign: 'right' },
  bar: { height: 8, borderRadius: 4, backgroundColor: '#00000066', overflow: 'hidden' },
  log: { color: C.dim, fontFamily: F.body, fontSize: 11 },
  ppv: { color: C.faint, fontFamily: F.body, fontSize: 10 },
  root: { flex: 1, padding: 20, paddingTop: 50, justifyContent: 'center' },
  dots: { position: 'absolute', top: 40, left: 20, right: 20, flexDirection: 'row', gap: 4 },
  dot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#ffffff33' },
  scene: { alignItems: 'center', gap: 12 },
  kicker: { color: C.red, fontFamily: F.display, fontSize: 14, letterSpacing: 4 },
  vsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  vs: { color: C.gold, fontFamily: F.display, fontSize: 26 },
  title: { color: C.text, fontFamily: F.display, fontSize: 22, textAlign: 'center' },
  text: { color: C.dim, fontFamily: F.semi, fontSize: 14, textAlign: 'center' },
  big: { color: C.gold, fontFamily: F.display, fontSize: 18, textAlign: 'center', marginTop: 6 },
  quote: { color: C.text, fontFamily: F.body, fontSize: 15, fontStyle: 'italic', textAlign: 'center', marginTop: 8, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', width: '80%' },
  num: { color: C.text, fontFamily: F.display, fontSize: 22, width: 60, textAlign: 'center' },
  label: { color: C.dim, fontFamily: F.semi, fontSize: 14, flex: 1, textAlign: 'center' },
  tap: { position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', color: C.faint, fontFamily: F.semi, fontSize: 12 },
});

/** Büyük maçta belgesel düğmesi: izlenince hype +10. */
export function CountdownButton({ s, onWatched }: { s: GameState; onWatched: () => void }) {
  const [open, setOpen] = useState(false);
  const k = s.pending.kamp;
  if (!k || k.hype == null || !s.pending.rakip) return null;
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [cb.btn, pressed && { opacity: 0.8 }]}>
        <Icon name="movie-open-play" size={18} color={C.gold} />
        <Text style={cb.text}>{k.belgesel ? L("Countdown'u tekrar izle") : L("📺 Countdown belgeselini izle (hype +10)")}</Text>
      </Pressable>
      {open ? (
        <CountdownDoc
          s={s}
          onClose={() => {
            setOpen(false);
            onWatched();
          }}
        />
      ) : null}
    </>
  );
}

const cb = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.gold, borderRadius: 10, padding: 10, marginBottom: 10, backgroundColor: '#1a150a' },
  text: { color: C.gold, fontFamily: F.semi, fontSize: 13, flex: 1 },
});
