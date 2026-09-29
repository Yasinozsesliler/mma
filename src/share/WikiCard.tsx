// Kafespedia paylaşım kartının yerel (Android) çizimi: 360×640 birim, yakalanınca 1080×1920.
import { Platform, StyleSheet, Text, View } from 'react-native';
import { L } from '../i18n';
import { FighterAvatar } from '../ui/FighterAvatar';
import { C, F } from '../ui/theme';
import type { ShareCardData } from './types';

export const SERIF = Platform.select({ android: 'serif', ios: 'Georgia', default: 'Georgia, "Times New Roman", serif' });
export const WIKI = { text: '#202122', gray: '#54595d', line: '#a2a9b1', box: '#f8f9fa', head: '#cedff2', link: '#3366cc' };

export function WikiCardBody({ data, store }: { data: ShareCardData; store: string }) {
  const w = data.wiki!;
  return (
    <View style={st.card}>
      <View style={st.top}>
        <View style={st.logo}>
          <Text style={st.logoK}>K</Text>
        </View>
        <View>
          <Text style={st.brand}>{L("Kafespedia")}</Text>
          <Text style={st.brandSub}>{L("Özgür dövüş ansiklopedisi")}</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={st.title} numberOfLines={1} adjustsFontSizeToFit>
          {data.baslik}
        </Text>
        <View style={st.rule} />
        <Text style={st.from}>{L("Kafespedia, özgür dövüş ansiklopedisi")}</Text>
        <View style={st.info}>
          <Text style={st.infoHead} numberOfLines={1}>
            {data.lakap ? `${data.ad} “${data.lakap}”` : data.ad}
          </Text>
          <View style={{ alignItems: 'center', paddingVertical: 6 }}>
            <FighterAvatar look={data.look} size={112} ring={WIKI.line} bg="#eaecf0" />
          </View>
          {w.bilgi.map(([k, v]) => (
            <View key={k} style={st.row}>
              <Text style={st.key}>{k}</Text>
              <Text style={st.val} numberOfLines={1}>
                {v}
              </Text>
            </View>
          ))}
        </View>
        <Text style={st.ozet} numberOfLines={7}>
          {w.ozet}
        </Text>
      </View>
      <View style={st.foot}>
        <Text style={st.invite}>{L("YOL: Kafesten Kemere · Kendi efsaneni yaz")}</Text>
        <Text style={st.store}>{store}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { width: 360, height: 640, backgroundColor: '#ffffff' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, paddingHorizontal: 14, backgroundColor: WIKI.box, borderBottomWidth: 1, borderBottomColor: WIKI.line },
  logo: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: WIKI.text, alignItems: 'center', justifyContent: 'center' },
  logoK: { fontFamily: SERIF, fontSize: 17, color: WIKI.text },
  brand: { fontFamily: SERIF, fontSize: 17, color: WIKI.text },
  brandSub: { fontFamily: SERIF, fontSize: 8, color: WIKI.gray },
  title: { fontFamily: SERIF, fontSize: 28, color: WIKI.text, marginTop: 12 },
  rule: { height: 1, backgroundColor: WIKI.line, marginTop: 2 },
  from: { fontFamily: SERIF, fontSize: 9, color: WIKI.gray, fontStyle: 'italic', marginTop: 3 },
  info: { borderWidth: 1, borderColor: WIKI.line, backgroundColor: WIKI.box, marginTop: 8, padding: 4 },
  infoHead: { backgroundColor: WIKI.head, fontFamily: SERIF, fontWeight: 'bold', fontSize: 12, color: WIKI.text, textAlign: 'center', paddingVertical: 3 },
  row: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eaecf0', paddingVertical: 2, paddingHorizontal: 4 },
  key: { width: 118, fontFamily: F.bold, fontSize: 9.5, color: WIKI.text },
  val: { flex: 1, fontFamily: F.body, fontSize: 9.5, color: WIKI.text },
  ozet: { fontFamily: SERIF, fontSize: 11.5, lineHeight: 16, color: WIKI.text, marginTop: 8 },
  foot: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 50, backgroundColor: '#0b0c10', borderTopWidth: 2, borderTopColor: C.red, alignItems: 'center', justifyContent: 'center' },
  invite: { color: '#fff', fontFamily: F.display, fontSize: 13 },
  store: { color: C.gold, fontFamily: F.bold, fontSize: 12, marginTop: 1 },
});
