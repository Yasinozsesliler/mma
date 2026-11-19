// Yalnızca kullanılan ikon seti içe aktarılır (diğer setler paketi ve çevrimdışı indirmeyi şişirir).
import { L, LANG, LOC } from '../i18n';
import { setSoundSettings, sfx, useSoundSettings } from '../audio';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { createContext, useContext, useEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Path, Pattern, Polygon, Rect } from 'react-native-svg';
import { CoverImage } from './CoverImage';
import { C, F, G, R } from './theme';
import { useLook } from '../lookPref';
import { SCENE_ART, type SceneKey } from './sceneArt';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** İsimleri büyük harfe çevirir: Türkçe/Azerice isimlerde Türkçe kural (i→İ), yabancı isimlerde standart (Whitlock → WHITLOCK). */
const TR_NAMES = new Set(['tr', 'az', L("Türkiye"), L("Azerbaycan")]);
export const upName = (n: string, uyruk?: string) => (LANG === 'tr' && uyruk && TR_NAMES.has(uyruk) ? n.toLocaleUpperCase('tr-TR') : n.toUpperCase());

/** UCC yayın grafiklerindeki eğik (italik) duruş. */
export const SLANT = { transform: [{ skewX: '-8deg' }] } as const;

export function Icon({ name, size = 18, color = C.dim }: { name: IconName; size?: number; color?: string }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

export const octPoints = (r: number, cx = 50, cy = 50) =>
  Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 8) * (2 * i + 1);
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');

/** Sekizgen kafes + altın kemer logosu. */
export function Logo({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Polygon points={octPoints(48)} fill={C.red} />
      <Polygon points={octPoints(41)} fill={C.bg} />
      <Rect x={14} y={43} width={72} height={14} rx={2} fill={C.goldDeep} />
      <Rect x={14} y={45.5} width={72} height={9} rx={2} fill={C.gold} />
      <Polygon points={octPoints(15)} fill={C.goldDeep} />
      <Polygon points={octPoints(11)} fill={C.gold} />
      <Polygon points={octPoints(5)} fill={C.red} />
    </Svg>
  );
}

/** Sekizgen çerçeveli ikon (kafes motifi). */
export function OctIcon({ name, color = C.red, size = 44 }: { name: IconName; color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
        <Polygon points={octPoints(48)} fill={color + '26'} stroke={color} strokeWidth={4} />
      </Svg>
      <Icon name={name} size={size * 0.46} color={color} />
    </View>
  );
}

/** Kafes teli deseni: tüm ekranların arkasında çok hafif bir çapraz örgü. */
export function CageBg({ opacity = 0.04 }: { opacity?: number }) {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id="cage" width={22} height={22} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <Path d="M0 0 H22 M0 0 V22" stroke="#ffffff" strokeOpacity={opacity} strokeWidth={1.2} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill="url(#cage)" />
    </Svg>
  );
}

/** Üstte TopBar varsa ekran üst güvenli alanı tekrar eklemez. */
export const HasTopBar = createContext(false);

function MuteButton() {
  const ses = useSoundSettings();
  const on = ses.muzik || ses.efekt;
  return (
    <Pressable
      onPress={() => setSoundSettings({ muzik: !on, efekt: !on })}
      hitSlop={8}
      style={({ pressed }) => [st.topBtn, { paddingHorizontal: 9, opacity: pressed ? 0.6 : 1 }]}
    >
      <Icon name={on ? 'volume-high' : 'volume-off'} size={16} color={on ? C.text : C.faint} />
    </Pressable>
  );
}

export function TopBar({ label, onMenu }: { label: string; onMenu: () => void }) {
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: '#020203' }}>
      <View style={st.topbar}>
        {/* Sol taraf daralabilir (uzun başlıklar kısalır); sağdaki düğmeler hep tam görünür */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, marginRight: 8 }}>
          <Logo size={30} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.topBrand} numberOfLines={1}>{L("YOL · KAFESTEN KEMERE")}</Text>
            <Text style={[st.topLabel, SLANT]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{label.toLocaleUpperCase(LOC)}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <MuteButton />
          <Pressable onPress={onMenu} style={({ pressed }) => [st.topBtn, { opacity: pressed ? 0.6 : 1 }]}>
            <Icon name="menu" size={16} color={C.text} />
            <Text style={[st.topBtnText, L("ANA MENÜ").length > 10 && { fontSize: 10.5, letterSpacing: 0.4 }]} numberOfLines={1}>{L("ANA MENÜ")}</Text>
          </Pressable>
        </View>
      </View>
      <LinearGradient colors={[C.red, C.redDeep, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 2 }} />
    </SafeAreaView>
  );
}

/** Ekran içeriği bir kez hafifçe yukarı kayarak belirir. */
function FadeIn({ children }: { children: ReactNode }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [a]);
  return (
    <Animated.View style={{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

export function Screen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const topBar = useContext(HasTopBar);
  // Alt güvenli alan (iPhone ana ekran çubuğu) ayrıca eklenmez; alt boşluk ile birleştirilir, çift boşluk oluşmaz.
  const bottom = useSafeAreaInsets().bottom;
  return (
    <SafeAreaView style={st.safe} edges={topBar ? [] : ['top']}>
      <CageBg />
      <LinearGradient colors={['rgba(200,20,35,0.14)', 'rgba(4,4,5,0)']} style={st.glow} pointerEvents="none" />
      <ScrollView contentContainerStyle={[st.scroll, !footer && { paddingBottom: 32 + bottom }]} keyboardShouldPersistTaps="handled">
        <FadeIn>{children}</FadeIn>
      </ScrollView>
      {footer ? <View style={[st.footer, { paddingBottom: Math.max(12, bottom - 4) }]}>{footer}</View> : null}
    </SafeAreaView>
  );
}

/** art: yeni görünümde başlık, o ekrana uygun çizilmiş bir sahne bandının üstünde durur (klasikte yok sayılır). */
export function Title({ children, sub, kicker, art }: { children: ReactNode; sub?: string; kicker?: string; art?: SceneKey }) {
  const yeni = useLook() === 'yeni';
  if (yeni && art)
    return (
      <View style={{ marginBottom: 16 }}>
        <View style={st.scene}>
          <CoverImage source={SCENE_ART[art].src} iw={SCENE_ART[art].w} ih={SCENE_ART[art].h} />
          <LinearGradient colors={['rgba(5,5,7,0)', 'rgba(5,5,7,0.15)', 'rgba(5,5,7,0.9)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
          <View style={st.sceneEdge} />
          <View style={st.sceneText}>
            {kicker ? (
              <View style={st.kickerBox}>
                <Text style={st.kicker}>{kicker}</Text>
              </View>
            ) : null}
            <Text style={[st.title, SLANT, st.sceneTitle]} numberOfLines={2} adjustsFontSizeToFit>
              {children}
            </Text>
          </View>
        </View>
        {sub ? <Text style={st.sub}>{sub}</Text> : null}
      </View>
    );
  return (
    <View style={{ marginBottom: 16 }}>
      {kicker ? (
        <View style={st.kickerBox}>
          <Text style={st.kicker}>{kicker}</Text>
        </View>
      ) : null}
      <Text style={[st.title, SLANT]}>{children}</Text>
      {sub ? <Text style={st.sub}>{sub}</Text> : null}
    </View>
  );
}

export function P({ children, dim, style }: { children: ReactNode; dim?: boolean; style?: object }) {
  return <Text style={[st.p, dim && { color: C.dim }, style]}>{children}</Text>;
}

export function Card({ children, style, accent }: { children: ReactNode; style?: ViewStyle; accent?: string }) {
  return (
    <LinearGradient colors={G.card} style={[st.card, style]}>
      {accent ? <View style={[st.accent, { backgroundColor: accent }]} /> : null}
      {children}
    </LinearGradient>
  );
}

export function Choice({
  n,
  label,
  desc,
  onPress,
  disabled,
  tone,
  selected,
  icon,
}: {
  n?: number;
  label: string;
  desc?: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'red' | 'gold' | 'plain';
  selected?: boolean;
  icon?: IconName;
}) {
  const accent = tone === 'gold' ? C.gold : tone === 'plain' ? C.dim : C.red;
  const yeni = useLook() === 'yeni';
  if (yeni)
    return (
      <Pressable
        onPress={() => {
          sfx('click');
          onPress();
        }}
        disabled={disabled}
        style={({ pressed }) => [st.nChoice, { borderColor: selected ? accent : accent + '77' }, selected && { borderWidth: 2 }, disabled && { opacity: 0.4 }, pressed && { backgroundColor: accent + '2a', borderColor: accent, transform: [{ skewX: '-6deg' }, { scale: 0.985 }] }]}
      >
        <LinearGradient colors={['#1d2027', '#0e1014', '#08090b']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <LinearGradient colors={[accent + '30', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 0 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={[st.nEdge, { backgroundColor: accent }]} pointerEvents="none" />
        <View style={st.nInner}>
          <View style={[st.nBadge, { borderColor: accent, backgroundColor: accent + '22' }]}>
            {icon ? <Icon name={icon} size={20} color={accent} /> : <Text style={[st.nNum, { color: accent }]}>{n ?? ''}</Text>}
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={st.nTitle}>{label.toLocaleUpperCase(LOC)}</Text>
            {desc ? <Text style={st.nDesc}>{desc}</Text> : null}
          </View>
          <Icon name={selected ? 'check-circle' : 'chevron-right'} size={22} color={accent} />
        </View>
      </Pressable>
    );
  return (
    <Pressable
      onPress={() => {
        sfx('click');
        onPress();
      }}
      disabled={disabled}
      style={({ pressed }) => [
        st.choice,
        {
          borderColor: selected ? C.red : pressed ? accent : C.border,
          backgroundColor: selected ? C.redDim : pressed ? C.cardAlt : C.card,
          opacity: disabled ? 0.4 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      <View style={[st.choiceEdge, { backgroundColor: selected ? C.red : accent + '66' }]} />
      {icon ? (
        <OctIcon name={icon} color={accent} size={42} />
      ) : n != null ? (
        <View style={[st.num, SLANT, { backgroundColor: accent }]}>
          <Text style={st.numText}>{n}</Text>
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={st.choiceLabel}>{label}</Text>
        {desc ? <Text style={st.choiceDesc}>{desc}</Text> : null}
      </View>
      {selected ? <Icon name="check-decagram" size={22} color={C.red} /> : <Icon name="chevron-right" size={22} color={C.faint} />}
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  tone = 'red',
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  tone?: 'red' | 'gold' | 'ghost';
  disabled?: boolean;
  icon?: IconName;
}) {
  const textColor = tone === 'gold' ? '#1f1605' : tone === 'ghost' ? C.dim : '#fff';
  const inner = (
    <View style={st.btnInner}>
      {icon ? <Icon name={icon} size={18} color={textColor} /> : null}
      <Text style={[st.btnText, { color: textColor }]}>{label.toLocaleUpperCase(LOC)}</Text>
    </View>
  );
  return (
    <Pressable
      onPress={() => {
        sfx('click');
        onPress();
      }}
      disabled={disabled}
      style={({ pressed }) => [{ opacity: disabled ? 0.4 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      {tone === 'ghost' ? (
        <View style={[st.btn, st.ghost]}>{inner}</View>
      ) : (
        <LinearGradient colors={tone === 'gold' ? G.gold : G.red} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.btn, st.btnShadow]}>
          <View style={st.btnShine} />
          {inner}
        </LinearGradient>
      )}
    </Pressable>
  );
}

export function Bar({ value, color, label, right }: { value: number; color: string; label?: string; right?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <View style={{ marginVertical: 3 }}>
      {label ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={st.barLabel}>{label}</Text>
          {right ? <Text style={st.barLabel}>{right}</Text> : null}
        </View>
      ) : null}
      <View style={st.barBg}>
        <LinearGradient colors={[color, color + 'aa']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[st.barFill, { width: `${v}%` }]} />
      </View>
    </View>
  );
}

export function Pill({ text, color = C.dim, icon }: { text: string; color?: string; icon?: IconName }) {
  return (
    <View style={[st.pill, { borderColor: color + '88', backgroundColor: color + '14' }]}>
      {icon ? <Icon name={icon} size={12} color={color} /> : null}
      <Text style={[st.pillText, { color }]}>{text}</Text>
    </View>
  );
}

/** TV alt yazısı tarzı bölüm başlığı: kırmızı eğik etiket + çizgi. */
export function Section({ children }: { children: ReactNode }) {
  return (
    <View style={st.sectionRow}>
      <View style={[st.sectionTag, SLANT]}>
        <Text style={st.section}>{children}</Text>
      </View>
      <View style={st.sectionLine} />
    </View>
  );
}

export const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  glow: { position: 'absolute', left: 0, right: 0, top: 0, height: 280 },
  scroll: { padding: 16, paddingBottom: 32 },
  footer: { padding: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: '#020203', gap: 8 },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  topBrand: { color: C.red, fontSize: 9, fontFamily: F.display, letterSpacing: 2 },
  topLabel: { color: C.text, fontSize: 17, fontFamily: F.display, letterSpacing: 0.5 },
  topBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 7 },
  topBtnText: { color: C.text, fontSize: 12, fontFamily: F.display, letterSpacing: 1 },
  scene: { height: 150, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#24272e', justifyContent: 'flex-end', marginBottom: 2 },
  sceneEdge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: C.red },
  sceneText: { paddingHorizontal: 14, paddingBottom: 12 },
  sceneTitle: { textShadowColor: '#000', textShadowRadius: 8 },
  nChoice: { borderWidth: 1.2, borderRadius: 6, backgroundColor: '#0b0c0f', overflow: 'hidden', marginBottom: 10, transform: [{ skewX: '-6deg' }] },
  nEdge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  nInner: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 16, paddingRight: 10, transform: [{ skewX: '6deg' }] },
  nBadge: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  nNum: { fontFamily: F.display, fontSize: 20 },
  nTitle: { color: '#f6f7f9', fontFamily: F.display, fontSize: 16, letterSpacing: 1.2 },
  nDesc: { color: '#b8bec9', fontFamily: F.body, fontSize: 12.5, lineHeight: 17 },
  kickerBox: { alignSelf: 'flex-start', backgroundColor: C.red, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6, transform: [{ skewX: '-12deg' }] },
  kicker: { color: '#fff', fontSize: 11, fontFamily: F.display, letterSpacing: 1.5 },
  title: { color: C.text, fontSize: 32, fontFamily: F.display, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 38 },
  sub: { color: C.dim, fontSize: 14, fontFamily: F.body, marginTop: 4, lineHeight: 20 },
  p: { color: C.text, fontSize: 15, fontFamily: F.body, lineHeight: 23, marginBottom: 8 },
  card: { borderRadius: R, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  choice: { flexDirection: 'row', alignItems: 'center', borderRadius: R, padding: 12, paddingLeft: 16, marginBottom: 10, borderWidth: 1, gap: 12, overflow: 'hidden' },
  choiceEdge: { position: 'absolute', left: -6, top: -4, bottom: -4, width: 10, transform: [{ skewX: '-10deg' }] },
  num: { width: 30, height: 30, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: F.display, fontSize: 16, color: '#fff' },
  choiceLabel: { color: C.text, fontSize: 16, fontFamily: F.bold },
  choiceDesc: { color: C.dim, fontSize: 13, fontFamily: F.body, marginTop: 3, lineHeight: 18 },
  btn: { borderRadius: 4, paddingVertical: 15, alignItems: 'center', overflow: 'hidden' },
  btnShine: { position: 'absolute', top: 0, bottom: 0, right: -30, width: 60, backgroundColor: 'rgba(255,255,255,0.12)', transform: [{ skewX: '-25deg' }] },
  btnShadow: { shadowColor: C.red, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
  ghost: { borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8, transform: [{ skewX: '-8deg' }] },
  btnText: { fontFamily: F.display, fontSize: 18, letterSpacing: 1.5 },
  barLabel: { color: C.dim, fontSize: 11, fontFamily: F.display, marginBottom: 3, letterSpacing: 1 },
  barBg: { height: 8, borderRadius: 2, backgroundColor: '#0b0c10', overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  barFill: { height: '100%', borderRadius: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontFamily: F.bold, letterSpacing: 0.3 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 10 },
  sectionTag: { backgroundColor: C.red, paddingHorizontal: 10, paddingVertical: 3 },
  section: { color: '#fff', fontSize: 13, fontFamily: F.display, letterSpacing: 1.5 },
  sectionLine: { flex: 1, height: 2, backgroundColor: C.border },
});
