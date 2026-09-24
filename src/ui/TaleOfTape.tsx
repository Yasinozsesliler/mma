import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { statAverage } from '../engine/character';
import { BACKGROUNDS, WEIGHT_CLASSES } from '../engine/data';
import { lookFor, physique } from '../engine/tale';
import type { GameState } from '../engine/types';
import { SLANT, upName } from './components';
import { FighterAvatar } from './FighterAvatar';
import { C, F, R } from './theme';

/** Tartı: iki dövüşçü yan yana, terazi okumaları ve "tale of the tape". */
export function TaleOfTape({ s }: { s: GameState }) {
  const k = s.pending.kamp!;
  const o = s.pending.rakip!;
  const f = s.fighter;
  const limit = WEIGHT_CLASSES[f.siklet].kg;
  const pp = physique(f.ad + f.soyad, f.siklet);
  const op = physique(o.id, f.siklet);
  const oYas = 22 + (o.id.charCodeAt(0) % 14);
  const rows: [string, string, string][] = [
    ['YAŞ', `${f.yas}`, `${oYas}`],
    ['BOY', `${pp.boy} cm`, `${op.boy} cm`],
    ['UZANMA', `${pp.uzanma} cm`, `${op.uzanma} cm`],
    ['DURUŞ', pp.durus.split(' ')[0], op.durus.split(' ')[0]],
    ['REKOR', `${s.rekor.g}-${s.rekor.m}-${s.rekor.b}`, `${o.rekor.g}-${o.rekor.m}-${o.rekor.b}`],
    ['STİL', BACKGROUNDS[f.gecmis].ad, BACKGROUNDS[o.stil].ad],
    ['GÜÇ', `${Math.round(statAverage(f.stats))}`, `${Math.round(statAverage(o.stats))}`],
  ];
  const Scale = ({ kg }: { kg?: number }) => {
    const miss = (kg ?? 0) > limit;
    return (
      <View style={[tt.scale, { borderColor: miss ? C.red : C.green }]}>
        <Text style={[tt.scaleVal, { color: miss ? C.red : C.green }]}>{kg?.toFixed(1) ?? '--.-'}</Text>
        <Text style={tt.scaleUnit}>KG {miss ? '· KAÇIRDI' : '· TAMAM'}</Text>
      </View>
    );
  };
  return (
    <LinearGradient colors={['#13060a', '#060607']} style={tt.card}>
      <Text style={[tt.title, SLANT]}>RESMİ TARTI · {WEIGHT_CLASSES[f.siklet].ad.toLocaleUpperCase('tr-TR')} ({limit} KG LİMİT)</Text>
      <View style={tt.heads}>
        <View style={tt.side}>
          <FighterAvatar look={f.gorunum} size={96} ring={C.red} />
          <Text style={[tt.name, SLANT, { color: C.red }]} numberOfLines={1}>
            {upName(f.soyad, f.uyruk)}
          </Text>
          <Scale kg={k.pKilo} />
        </View>
        <Text style={[tt.vs, SLANT]}>VS</Text>
        <View style={tt.side}>
          <FighterAvatar look={lookFor(o)} size={96} ring={C.blue} />
          <Text style={[tt.name, SLANT, { color: C.blue }]} numberOfLines={1}>
            {upName(o.soyad, o.uyruk)}
          </Text>
          <Scale kg={k.oKilo} />
        </View>
      </View>
      {rows.map(([label, a, b]) => (
        <View key={label} style={tt.row}>
          <Text style={[tt.val, { textAlign: 'left' }]}>{a}</Text>
          <Text style={tt.label}>{label}</Text>
          <Text style={[tt.val, { textAlign: 'right' }]}>{b}</Text>
        </View>
      ))}
      {k.kafesKilo ? <Text style={tt.note}>Rehidrasyon sonrası tahmini kafes kilon: ~{k.kafesKilo} kg</Text> : null}
    </LinearGradient>
  );
}

const tt = StyleSheet.create({
  card: { borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 12 },
  title: { color: C.gold, fontFamily: F.display, fontSize: 13, letterSpacing: 1.2, textAlign: 'center', marginBottom: 12 },
  heads: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  side: { flex: 1, alignItems: 'center', gap: 6 },
  vs: { color: C.gold, fontFamily: F.display, fontSize: 30 },
  name: { fontFamily: F.display, fontSize: 18 },
  scale: { borderWidth: 2, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#020403', alignItems: 'center' },
  scaleVal: { fontFamily: F.display, fontSize: 26, letterSpacing: 1 },
  scaleUnit: { color: C.faint, fontFamily: F.display, fontSize: 9, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: C.border },
  label: { width: 80, textAlign: 'center', color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 1.2 },
  val: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 13 },
  note: { color: C.dim, fontFamily: F.body, fontSize: 12, textAlign: 'center', marginTop: 8 },
});
