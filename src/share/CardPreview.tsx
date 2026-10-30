// Yerel (Android/iOS): kart gerçek bir görünüm olarak çizilir (web tuvaliyle aynı yerleşim), 1080×1920 PNG olarak
// yakalanır (react-native-view-shot) ve telefonun paylaşım menüsüyle (expo-sharing) paylaşılır.
import { themeOf } from './themes';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { storeLine } from './storeLine';
import Svg, { Polygon } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { L, LOC } from '../i18n';
import { Belt } from '../ui/Belt';
import { FighterAvatar } from '../ui/FighterAvatar';
import { C, F } from '../ui/theme';
import type { CardHandle, ShareCardData } from './types';
import { WikiCardBody } from './WikiCard';
import { PosterView } from './PosterView';

// Tasarım 360×640 birimde yapılır, 3 kat büyütülerek 1080×1920 yakalanır.
const WD = 360;
const HT = 640;
const up = (s: string) => s.toLocaleUpperCase(LOC);

export function CardPreview({ data, onReady }: { data: ShareCardData; onReady: (h: CardHandle | null) => void }) {
  const ref = useRef<View>(null);
  useEffect(() => {
    onReady({
      share: async () => {
        if (!ref.current) return 'iptal';
        try {
          const uri = await captureRef(ref, { format: 'png', quality: 1, width: 1080, height: 1920, result: 'tmpfile' });
          if (!(await Sharing.isAvailableAsync())) return 'iptal';
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: data.mesaj });
          return 'paylasildi';
        } catch {
          return 'iptal';
        }
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const th = themeOf(data.tema);
  const accent = th.vurgu ?? (data.tur === 'kemer' || data.tur === 'kariyer' ? C.gold : C.red);
  const [ust, davet] = [data.mesaj.split('·')[0].trim(), data.mesaj.split('·').slice(1).join('·').trim()];
  const belt = !!data.kemer;
  const aS = belt ? 157 : 187;

  return (
    <View style={st.fit}>
      <View style={{ transform: [{ scale: 0.78 }] }}>
      {data.tur === 'afis' && data.afis ? (
        <View ref={ref} collapsable={false}>
          <PosterView data={data} />
        </View>
      ) : data.tur === 'wiki' ? (
        <View ref={ref} collapsable={false}>
          <WikiCardBody data={data} store={storeLine()} />
        </View>
      ) : (
      <View ref={ref} collapsable={false} style={st.card}>
        <LinearGradient colors={th.bg} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
        <Svg width={WD} height={HT} style={StyleSheet.absoluteFill}>
          {[0, 1, 2, 3].map((i) => {
            const x = -100 + i * 47;
            return <Polygon key={i} points={`${x},${HT} ${x + 9},${HT} ${x + 309},0 ${x + 300},0`} fill={th.serit} opacity={0.12} />;
          })}
        </Svg>

        <Text style={st.brand}>Y O L</Text>
        <Text style={st.sub}>{up(ust)}</Text>
        <Text style={[st.title, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
          {up(data.baslik)}
        </Text>
        <View style={[st.bar, { backgroundColor: accent }]} />

        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <FighterAvatar look={data.look} size={aS} ring={data.tur === 'kemer' ? C.gold : C.red} />
          {belt && data.kemer ? (
            <View style={{ marginTop: -30 }}>
              <Belt org={data.kemer.org} siklet={data.kemer.siklet} width={300} />
            </View>
          ) : null}
        </View>

        {data.lakap ? <Text style={st.lakap}>“{up(data.lakap)}”</Text> : null}
        <Text style={st.name} numberOfLines={1} adjustsFontSizeToFit>
          {data.adBuyuk ?? up(data.ad)}
        </Text>
        <Text style={st.ust} numberOfLines={1} adjustsFontSizeToFit>
          {data.ust}
        </Text>

        <View style={st.tiles}>
          {data.kutular.map(([lab, val], i) => (
            <View key={lab} style={[st.tile, i === 0 && { borderColor: accent }]}>
              <Text style={st.tileLab}>{up(lab)}</Text>
              <Text style={st.tileVal} numberOfLines={1} adjustsFontSizeToFit>
                {val}
              </Text>
            </View>
          ))}
        </View>
        <Text style={st.alt} numberOfLines={2}>
          {data.alt}
        </Text>

        <View style={st.foot}>
          <Text style={st.invite}>{up(davet || data.mesaj)}</Text>
          <Text style={st.store}>{storeLine()}</Text>
        </View>
      </View>
      )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  fit: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  card: { width: WD, height: HT, backgroundColor: '#0b0c10' },
  brand: { color: C.red, fontFamily: F.display, fontSize: 11, textAlign: 'center', marginTop: 22, letterSpacing: 4 },
  sub: { color: 'rgba(241,242,245,0.55)', fontFamily: F.displayMed, fontSize: 9, textAlign: 'center', marginTop: 4 },
  title: { fontFamily: F.display, fontSize: 34, textAlign: 'center', marginTop: 16, paddingHorizontal: 20, transform: [{ skewX: '-8deg' }] },
  bar: { width: 73, height: 2, alignSelf: 'center', marginTop: 4 },
  lakap: { color: C.gold, fontFamily: F.displayMed, fontSize: 17, textAlign: 'center', marginTop: 10 },
  name: { color: '#fff', fontFamily: F.display, fontSize: 44, textAlign: 'center', paddingHorizontal: 16, transform: [{ skewX: '-8deg' }] },
  ust: { color: '#d9dbe0', fontFamily: F.bold, fontSize: 14, textAlign: 'center', paddingHorizontal: 16, marginTop: 2 },
  tiles: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 14 },
  tile: { flex: 1, height: 57, borderRadius: 6, borderWidth: 1, borderColor: '#2a2d35', backgroundColor: 'rgba(18,20,25,0.92)', alignItems: 'center', justifyContent: 'center' },
  tileLab: { color: C.faint, fontFamily: F.semi, fontSize: 9 },
  tileVal: { color: '#fff', fontFamily: F.display, fontSize: 22, paddingHorizontal: 6 },
  alt: { color: '#b9bec8', fontFamily: F.body, fontSize: 13, lineHeight: 18, textAlign: 'center', paddingHorizontal: 24, marginTop: 14 },
  foot: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 50, backgroundColor: 'rgba(10,11,14,0.95)', borderTopWidth: 2, borderTopColor: C.red, alignItems: 'center', justifyContent: 'center' },
  invite: { color: '#fff', fontFamily: F.display, fontSize: 13 },
  store: { color: C.gold, fontFamily: F.bold, fontSize: 12, marginTop: 1 },
});
