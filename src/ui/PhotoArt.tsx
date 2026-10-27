// Sosyal medyadaki fotoğrafların görseli: türüne göre sahne (salon, kafes, kemer, afiş, lüks, aile, evcil…) ve filtre.
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PHOTO_FILTERS, type PhotoPost } from '../engine/gram';
import { L } from '../i18n';
import { Belt } from './Belt';
import { Icon, type IconName } from './components';
import { FighterAvatar } from './FighterAvatar';
import { C, F } from './theme';
import { CarArt, HouseArt } from './VisualArt';

type Props = { p: Pick<PhotoPost, 'tur' | 'filtre' | 'look' | 'ek' | 'viral'> & { id?: string }; size: number };

const BG: Record<PhotoPost['tur'], [string, string]> = {
  antrenman: ['#23262d', '#0b0c0f'],
  zafer: ['#5a0d16', '#120406'],
  kemer: ['#5c4410', '#140e03'],
  afis: ['#3a0a10', '#0a1a3a'],
  luks: ['#1c3554', '#0a1018'],
  aile: ['#5a2b1d', '#1a0d08'],
  evcil: ['#24452f', '#0b140e'],
  taraftar: ['#2b1d4a', '#0c0818'],
  sponsor: ['#1d2b3a', '#080c12'],
};

function Base({ p, size }: Props) {
  const u = size / 100;
  const ek = p.ek ?? {};
  const av = (sz: number, ring = '#ffffff22') => <FighterAvatar look={p.look} size={sz * u} ring={ring} bg="transparent" />;
  const deco = (name: IconName, x: number, y: number, sz: number, color = '#ffffff14', rot = 0) => (
    <View style={{ position: 'absolute', left: x * u, top: y * u, transform: [{ rotate: `${rot}deg` }] }}>
      <Icon name={name} size={sz * u} color={color} />
    </View>
  );
  const tag = (t: string, color = '#fff', bg = '#00000088') => (
    <View style={[st.tag, { backgroundColor: bg, paddingHorizontal: 3 * u, paddingVertical: 1.2 * u, borderRadius: 2 * u }]}>
      <Text style={{ color, fontFamily: F.display, fontSize: 5.2 * u, letterSpacing: 0.4 * u }} numberOfLines={1}>
        {t}
      </Text>
    </View>
  );

  let scene: React.ReactNode;
  switch (p.tur) {
    case 'antrenman':
      scene = (
        <>
          {deco('dumbbell', 6, 8, 18, '#ffffff12', -20)}
          {deco('boxing-glove', 74, 12, 18, '#e6394633', 15)}
          <View style={[st.bag, { left: 72 * u, top: 30 * u, width: 14 * u, height: 44 * u, borderRadius: 5 * u }]} />
          <View style={{ position: 'absolute', left: 12 * u, bottom: 0 }}>{av(64)}</View>
          <View style={{ position: 'absolute', left: 6 * u, bottom: 6 * u }}>{tag(L("KAMP"), C.gold)}</View>
        </>
      );
      break;
    case 'zafer':
      scene = (
        <>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={{ position: 'absolute', left: (i * 18 - 4) * u, top: 0, width: 0.8 * u, height: size, backgroundColor: '#ffffff10', transform: [{ rotate: '35deg' }] }} />
          ))}
          <View style={{ position: 'absolute', alignSelf: 'center', bottom: 0 }}>{av(70, C.red)}</View>
          <Text style={[st.big, { fontSize: 22 * u, top: 4 * u, color: '#ffffffdd' }]}>W</Text>
          <View style={{ position: 'absolute', left: 5 * u, bottom: 6 * u }}>{tag(ek.yontem ? `${ek.yontem}` : L("ZAFER"), '#fff', C.red)}</View>
          {ek.rakip ? <View style={{ position: 'absolute', right: 5 * u, bottom: 6 * u }}>{tag(`vs ${ek.rakip}`)}</View> : null}
        </>
      );
      break;
    case 'kemer':
      scene = (
        <>
          {deco('crown', 40, 2, 20, '#f2c14e55')}
          <View style={{ position: 'absolute', alignSelf: 'center', top: 14 * u }}>{av(52, C.gold)}</View>
          {ek.org ? (
            <View style={{ position: 'absolute', alignSelf: 'center', bottom: 8 * u }}>
              <Belt org={ek.org} siklet={ek.siklet} width={86 * u} />
            </View>
          ) : null}
        </>
      );
      break;
    case 'afis':
      scene = (
        <>
          <View style={{ position: 'absolute', left: 0, top: 0, width: size / 2, height: size, backgroundColor: '#e6394630' }} />
          <View style={{ position: 'absolute', left: -4 * u, bottom: 8 * u }}>{av(56, C.red)}</View>
          <View style={{ position: 'absolute', right: -4 * u, bottom: 8 * u, transform: [{ scaleX: -1 }] }}>
            <FighterAvatar look={ek.rakipLook} size={56 * u} ring="#3a86ff" bg="transparent" />
          </View>
          <Text style={[st.big, { fontSize: 20 * u, top: 34 * u, color: C.gold }]}>VS</Text>
          <Text style={[st.big, { fontSize: 7 * u, top: 6 * u, color: '#fff', letterSpacing: 1 * u }]}>{L("DÖVÜŞ GECESİ")}</Text>
          {ek.rakip ? <View style={{ position: 'absolute', alignSelf: 'center', bottom: 3 * u }}>{tag(ek.rakip.toLocaleUpperCase(), '#fff', '#3a86ffaa')}</View> : null}
        </>
      );
      break;
    case 'luks':
      scene = (
        <>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 30 * u, backgroundColor: '#00000055' }} />
          {deco('white-balance-sunny', 74, 6, 16, '#f2c14e55')}
          <View style={{ position: 'absolute', left: 2 * u, bottom: 22 * u }}>{av(42)}</View>
          <View style={{ position: 'absolute', right: 2 * u, bottom: 4 * u }}>
            {ek.araba ? (
              <CarArt model={ek.araba.model} color={ek.araba.renk} width={72 * u} />
            ) : ek.ev ? (
              <HouseArt model={ek.ev} width={64 * u} />
            ) : (
              <Icon name={(ek.tasit ?? 'ferry') as IconName} size={52 * u} color="#e8ecf2" />
            )}
          </View>
        </>
      );
      break;
    case 'aile':
    case 'evcil':
      scene = (
        <>
          {deco('heart', 70, 8, 14, '#ff6b8155', 12)}
          {deco('heart', 10, 14, 9, '#ff6b8144', -12)}
          <View style={{ position: 'absolute', left: 6 * u, bottom: 0 }}>{av(60)}</View>
          <Text style={{ position: 'absolute', right: 8 * u, bottom: (p.tur === 'evcil' ? 6 : 14) * u, fontSize: (p.tur === 'evcil' ? 34 : 30) * u }}>{ek.emoji ?? '❤️'}</Text>
          {ek.ad ? <View style={{ position: 'absolute', right: 6 * u, top: 6 * u }}>{tag(ek.ad)}</View> : null}
        </>
      );
      break;
    case 'taraftar':
      scene = (
        <>
          {Array.from({ length: 24 }).map((_, i) => (
            <View key={i} style={{ position: 'absolute', left: ((i * 37) % 100) * u, top: (52 + ((i * 13) % 40)) * u, width: 9 * u, height: 9 * u, borderRadius: 5 * u, backgroundColor: ['#ffffff18', '#e6394633', '#f2c14e2a'][i % 3] }} />
          ))}
          {deco('cellphone', 8, 20, 12, '#ffffff33', -15)}
          {deco('cellphone', 80, 24, 12, '#ffffff33', 15)}
          <View style={{ position: 'absolute', alignSelf: 'center', bottom: 6 * u }}>{av(54)}</View>
        </>
      );
      break;
    case 'sponsor':
      scene = (
        <>
          <View style={{ position: 'absolute', alignSelf: 'center', top: 10 * u, borderWidth: 0.6 * u, borderColor: '#ffffff55', paddingHorizontal: 6 * u, paddingVertical: 2 * u, borderRadius: 2 * u }}>
            <Text style={{ color: '#fff', fontFamily: F.display, fontSize: 8 * u, letterSpacing: 1 * u }} numberOfLines={1}>
              {(ek.marka ?? '').toLocaleUpperCase()}
            </Text>
          </View>
          <View style={{ position: 'absolute', alignSelf: 'center', bottom: 0 }}>{av(62)}</View>
          {deco('shopping', 72, 58, 18, '#f2c14e88')}
          <View style={{ position: 'absolute', left: 5 * u, bottom: 6 * u }}>{tag('#ad', '#fff')}</View>
        </>
      );
      break;
  }
  const flt = PHOTO_FILTERS[p.filtre] ?? PHOTO_FILTERS[0];
  return (
    <View style={{ width: size, height: size, overflow: 'hidden', backgroundColor: '#000' }}>
      <LinearGradient colors={BG[p.tur]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {scene}
      {flt.renk ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: flt.renk, opacity: flt.op }]} /> : null}
      <LinearGradient pointerEvents="none" colors={['transparent', '#00000066']} style={[StyleSheet.absoluteFill, { top: size * 0.6 }]} />
      {p.viral ? (
        <View style={{ position: 'absolute', right: 4 * u, top: 4 * u }}>
          <Icon name="rocket-launch" size={9 * u} color={C.gold} />
        </View>
      ) : null}
    </View>
  );
}

export const PhotoArt = memo(Base, (a, b) => a.size === b.size && (a.p === b.p || (!!a.p.id && a.p.id === b.p.id)));

const st = StyleSheet.create({
  bag: { position: 'absolute', backgroundColor: '#7a1d24', borderWidth: 1, borderColor: '#00000066' },
  big: { position: 'absolute', alignSelf: 'center', fontFamily: F.display },
  tag: { alignSelf: 'flex-start' },
});
