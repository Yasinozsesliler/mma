// Yeni görünüm: dövüş seçenek kartı (oyun planı, karar anı, kritik an). Canlı dövüş düğmeleriyle aynı dil:
// eğik koyu cam zemin, renkli kenar, ikon halkası, başlık ve açıklama, uyarı rozetleri. Klasik görünümde çizilmez.
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import { LOC } from '../i18n';
import { lowPerf } from '../perfPref';
import { Choice, Icon, type IconName } from './components';
import { currentLook } from '../lookPref';
import { C, F } from './theme';

export type OptBadge = { text: string; color: string; icon?: IconName };

export function FightOption({ icon, n, title, desc, color, badges, dim, onPress, disabled, selected }: { icon?: IconName; n?: number; title: string; desc?: string; color: string; badges?: OptBadge[]; dim?: boolean; onPress: () => void; disabled?: boolean; selected?: boolean }) {
  const low = lowPerf();
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        sfx('click');
        onPress();
      }}
      style={({ pressed }) => [o.card, { borderColor: color + (dim ? '44' : '88') }, dim && { opacity: 0.7 }, disabled && { opacity: 0.4 }, selected && { borderColor: color, borderWidth: 2 }, pressed && { backgroundColor: color + '33', borderColor: color, transform: [{ skewX: '-6deg' }, { scale: 0.985 }] }]}>
      {low ? null : <LinearGradient colors={['#1d2027', '#0e1014', '#08090b']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />}
      {low ? null : <LinearGradient colors={[color + '30', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 0 }} style={StyleSheet.absoluteFill} pointerEvents="none" />}
      <View style={o.gloss} pointerEvents="none" />
      <View style={[o.edge, { backgroundColor: color }]} pointerEvents="none" />
      <View style={o.inner}>
        <View style={[o.badge, { borderColor: color, backgroundColor: color + '22' }]}>
          {icon ? <Icon name={icon} size={20} color={color} /> : <Text style={[o.num, { color }]}>{n ?? ''}</Text>}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={o.title} numberOfLines={2}>
            {title.toLocaleUpperCase(LOC)}
          </Text>
          {desc ? <Text style={o.desc}>{desc}</Text> : null}
          {badges?.length ? (
            <View style={o.badges}>
              {badges.map((b) => (
                <View key={b.text} style={[o.chip, { borderColor: b.color + '88', backgroundColor: b.color + '1a' }]}>
                  {b.icon ? <Icon name={b.icon} size={11} color={b.color} /> : null}
                  <Text style={[o.chipText, { color: b.color }]}>{b.text}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        <Icon name={selected ? 'check-circle' : 'chevron-right'} size={22} color={color} />
      </View>
    </Pressable>
  );
}

/** Seçenek bölümü başlığı: ikon, büyük başlık ve isteğe bağlı açıklama. */
export function FightPrompt({ kicker, text, color, icon }: { kicker: string; text?: string; color: string; icon: IconName }) {
  return (
    <LinearGradient colors={[color + '2a', '#0c0d10']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[o.prompt, { borderColor: color + '88' }]}>
      <View style={[o.badge, { borderColor: color, backgroundColor: color + '22', width: 34, height: 34 }]}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[o.pKicker, { color }]}>{kicker}</Text>
        {text ? <Text style={o.pText}>{text}</Text> : null}
      </View>
    </LinearGradient>
  );
}

const o = StyleSheet.create({
  card: { borderWidth: 1.2, borderRadius: 6, backgroundColor: '#0b0c0f', overflow: 'hidden', marginBottom: 10, transform: [{ skewX: '-6deg' }] },
  gloss: { position: 'absolute', left: 0, right: 0, top: 0, height: '40%', backgroundColor: 'rgba(255,255,255,0.04)' },
  edge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 16, paddingRight: 10, transform: [{ skewX: '6deg' }] },
  badge: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  num: { fontFamily: F.display, fontSize: 20 },
  title: { color: '#f6f7f9', fontFamily: F.display, fontSize: 16, letterSpacing: 1.2 },
  desc: { color: '#b8bec9', fontFamily: F.body, fontSize: 12.5, lineHeight: 17 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  chipText: { fontFamily: F.bold, fontSize: 10.5 },
  prompt: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 6, padding: 12, marginBottom: 12 },
  pKicker: { fontFamily: F.display, fontSize: 14, letterSpacing: 1.5 },
  pText: { color: C.text, fontFamily: F.semi, fontSize: 14, lineHeight: 20 },
});

/** Choice ile aynı arayüz: yeni görünümde FightOption, klasikte Choice (kamp adımları için). */
export function CampChoice(p: { n?: number; label: string; desc?: string; onPress: () => void; disabled?: boolean; tone?: 'red' | 'gold' | 'plain'; selected?: boolean; icon?: IconName }) {
  if (currentLook() !== 'yeni') return <Choice {...p} />;
  const color = p.tone === 'gold' ? C.gold : p.tone === 'plain' ? '#9aa3b2' : C.red;
  return <FightOption icon={p.icon} n={p.n} title={p.label} desc={p.desc} color={color} disabled={p.disabled} selected={p.selected} onPress={p.onPress} />;
}
