// Maç afişi (360×640 tasarım birimi): iki köşe karşı karşıya, ortada VS. Yerelde paylaşım görüntüsü ve
// oyun içi önizleme olarak kullanılır; web'deki tuval çizimi (render.web.ts) aynı yerleşimi izler.
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { storeLine } from './storeLine';
import Svg, { Polygon } from 'react-native-svg';
import { L, LOC } from '../i18n';
import { FighterAvatar } from '../ui/FighterAvatar';
import { C, F } from '../ui/theme';
import type { ShareCardData } from './types';

export const POSTER_W = 360;
export const POSTER_H = 640;
const up = (s: string) => s.toLocaleUpperCase(LOC);

export function PosterView({ data, store = true }: { data: ShareCardData; store?: boolean }) {
  const a = data.afis!;
  const accent = a.altin ? C.gold : C.red;
  return (
    <View style={st.card}>
      <LinearGradient colors={['#3a0710', '#0b0c10', '#071433']} start={{ x: 0, y: 0.3 }} end={{ x: 1, y: 0.7 }} style={StyleSheet.absoluteFill} />
      <Svg width={POSTER_W} height={POSTER_H} style={StyleSheet.absoluteFill}>
        <Polygon points={`170,0 190,0 150,${POSTER_H} 130,${POSTER_H}`} fill={accent} opacity={0.18} />
        <Polygon points={`0,${POSTER_H - 120} ${POSTER_W},${POSTER_H - 190} ${POSTER_W},${POSTER_H} 0,${POSTER_H}`} fill="#000" opacity={0.45} />
      </Svg>
      <Text style={st.brand}>Y O L</Text>
      <Text style={[st.org, { color: accent }]}>{up(a.org)}</Text>
      <Text style={st.title} numberOfLines={1} adjustsFontSizeToFit>
        {up(data.baslik)}
      </Text>
      <Text style={st.meta}>{up(a.etiket)}</Text>

      <View style={st.faces}>
        <View style={st.side}>
          <FighterAvatar look={data.look} size={150} ring={C.red} />
        </View>
        <View style={st.side}>
          <FighterAvatar look={a.oLook} size={150} ring={C.blue} />
        </View>
        <Text style={[st.vs, { color: accent }]}>VS</Text>
      </View>

      <View style={st.names}>
        <View style={st.nameCol}>
          {data.lakap ? <Text style={[st.nick, { color: C.red }]} numberOfLines={1}>“{up(data.lakap)}”</Text> : null}
          <Text style={st.name} numberOfLines={1} adjustsFontSizeToFit>
            {a.pSoyad}
          </Text>
          <Text style={st.rec}>{a.pRekor}</Text>
        </View>
        <View style={st.nameCol}>
          {a.oLakap ? <Text style={[st.nick, { color: '#6ea8ff' }]} numberOfLines={1}>“{up(a.oLakap)}”</Text> : null}
          <Text style={st.name} numberOfLines={1} adjustsFontSizeToFit>
            {a.oSoyad}
          </Text>
          <Text style={st.rec}>{a.oRekor}</Text>
        </View>
      </View>

      <View style={st.when}>
        <Text style={[st.date, { color: accent }]}>{a.tarih}</Text>
        <Text style={st.city}>📍 {up(a.sehir)}</Text>
        {a.hype ? <Text style={st.hype}>{a.hype}</Text> : null}
      </View>

      <View style={[st.foot, { borderTopColor: accent }]}>
        <Text style={st.invite}>{up(data.mesaj.split('·').slice(1).join('·').trim() || data.mesaj)}</Text>
        {store ? <Text style={st.store}>{storeLine()}</Text> : null}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { width: POSTER_W, height: POSTER_H, backgroundColor: '#0b0c10', overflow: 'hidden' },
  brand: { color: C.red, fontFamily: F.display, fontSize: 11, textAlign: 'center', marginTop: 20, letterSpacing: 4 },
  org: { fontFamily: F.display, fontSize: 30, textAlign: 'center', marginTop: 10, letterSpacing: 2 },
  title: { color: '#fff', fontFamily: F.display, fontSize: 38, textAlign: 'center', paddingHorizontal: 20, transform: [{ skewX: '-8deg' }] },
  meta: { color: 'rgba(241,242,245,0.6)', fontFamily: F.displayMed, fontSize: 12, textAlign: 'center', marginTop: 2 },
  faces: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, marginTop: 30 },
  side: { alignItems: 'center' },
  vs: { position: 'absolute', left: 0, right: 0, top: 46, textAlign: 'center', fontFamily: F.display, fontSize: 52, transform: [{ skewX: '-10deg' }], textShadowColor: '#000', textShadowRadius: 12 },
  names: { flexDirection: 'row', paddingHorizontal: 12, marginTop: 12, gap: 8 },
  nameCol: { flex: 1, alignItems: 'center' },
  nick: { fontFamily: F.displayMed, fontSize: 12 },
  name: { color: '#fff', fontFamily: F.display, fontSize: 30, transform: [{ skewX: '-8deg' }] },
  rec: { color: '#d9dbe0', fontFamily: F.bold, fontSize: 14 },
  when: { alignItems: 'center', marginTop: 38, gap: 4 },
  date: { fontFamily: F.display, fontSize: 24, letterSpacing: 1 },
  city: { color: '#fff', fontFamily: F.bold, fontSize: 15 },
  hype: { color: 'rgba(241,242,245,0.7)', fontFamily: F.semi, fontSize: 12, marginTop: 4 },
  foot: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 50, backgroundColor: 'rgba(10,11,14,0.95)', borderTopWidth: 2, alignItems: 'center', justifyContent: 'center' },
  invite: { color: '#fff', fontFamily: F.display, fontSize: 13 },
  store: { color: C.gold, fontFamily: F.bold, fontSize: 12, marginTop: 1 },
});
