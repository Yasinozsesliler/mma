// Yalnızca kullanılan ikon seti içe aktarılır (diğer setler paketi ve çevrimdışı indirmeyi şişirir).
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { createContext, useContext, useEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Path, Pattern, Polygon, Rect } from 'react-native-svg';
import { C, F, G, R } from './theme';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** İsimleri büyük harfe çevirir: Türkçe/Azerice isimlerde Türkçe kural (i→İ), yabancı isimlerde standart (Whitlock → WHITLOCK). */
const TR_NAMES = new Set(['tr', 'az', 'Türkiye', 'Azerbaycan']);
export const upName = (n: string, uyruk?: string) => (uyruk && TR_NAMES.has(uyruk) ? n.toLocaleUpperCase('tr-TR') : n.toUpperCase());

/** UFC yayın grafiklerindeki eğik (italik) duruş. */
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

export function TopBar({ label, onMenu }: { label: string; onMenu: () => void }) {
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: '#020203' }}>
      <View style={st.topbar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Logo size={30} />
          <View>
            <Text style={st.topBrand}>YOL · KAFESTEN KEMERE</Text>
            <Text style={[st.topLabel, SLANT]}>{label.toLocaleUpperCase('tr-TR')}</Text>
          </View>
        </View>
        <Pressable onPress={onMenu} style={({ pressed }) => [st.topBtn, { opacity: pressed ? 0.6 : 1 }]}>
          <Icon name="menu" size={16} color={C.text} />
          <Text style={st.topBtnText}>ANA MENÜ</Text>
        </Pressable>
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
  return (
    <SafeAreaView style={st.safe} edges={topBar ? ['bottom'] : ['top', 'bottom']}>
      <CageBg />
      <LinearGradient colors={['rgba(200,20,35,0.14)', 'rgba(4,4,5,0)']} style={st.glow} pointerEvents="none" />
      <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
        <FadeIn>{children}</FadeIn>
      </ScrollView>
      {footer ? <View style={st.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function Title({ children, sub, kicker }: { children: ReactNode; sub?: string; kicker?: string }) {
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
  return (
    <Pressable
      onPress={onPress}
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
      <Text style={[st.btnText, { color: textColor }]}>{label.toLocaleUpperCase('tr-TR')}</Text>
    </View>
  );
  return (
    <Pressable
      onPress={onPress}
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
  topBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 7 },
  topBtnText: { color: C.text, fontSize: 12, fontFamily: F.display, letterSpacing: 1 },
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
