// Ana ekranın sade, premium parçaları: kompakt kariyer kartı, ana eylem ve eylem kutucukları.
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { money } from '../engine/career';
import { fmtFollowers, followers } from '../engine/fame';
import { currentOrg, statAverage } from '../engine/character';
import { ORGS, WEIGHT_CLASSES } from '../engine/data';
import type { GameState } from '../engine/types';
import { CageBg, Icon, SLANT, type IconName } from './components';
import { FighterAvatar } from './FighterAvatar';
import { OvrBadge } from './StatusPanel';
import { C, F, R } from './theme';

function Meter({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: number }) {
  return (
    <View style={hh.meter}>
      <Text style={hh.meterLabel}>{label}</Text>
      <Text style={[hh.meterVal, color ? { color } : null]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub != null ? (
        <View style={hh.meterBar}>
          <View style={{ width: `${Math.max(0, Math.min(100, sub))}%`, height: '100%', backgroundColor: color ?? C.dim, borderRadius: 2 }} />
        </View>
      ) : null}
    </View>
  );
}

export function HubHero({ s }: { s: GameState }) {
  const f = s.fighter;
  const amator = s.stage === 'amator';
  const r = amator ? s.amator : s.rekor;
  const org = ORGS[currentOrg(s)];
  const health = s.saglik < 50 ? '#ff4d5e' : s.saglik < 75 ? C.orange : C.green;
  return (
    <LinearGradient colors={s.sampiyon ? ['#2e2206', '#0e0c07', '#08090b'] : ['#240710', '#0e0f12', '#08090b']} locations={[0, 0.55, 1]} style={[hh.hero, s.sampiyon && { borderColor: '#4a3810' }]}>
      <CageBg opacity={0.05} />
      <View style={hh.heroTop}>
        <FighterAvatar look={f.gorunum} size={64} ring={s.sampiyon ? C.gold : C.red} />
        <View style={{ flex: 1 }}>
          {f.lakap ? <Text style={hh.nick}>“{f.lakap.toLocaleUpperCase('tr-TR')}”</Text> : null}
          <Text style={[hh.name, SLANT]} numberOfLines={1} adjustsFontSizeToFit>
            {`${f.ad} ${f.soyad}`.toLocaleUpperCase('tr-TR')}
          </Text>
          <View style={hh.chips}>
            <Text style={hh.chip}>{f.yas} YAŞ</Text>
            <Text style={hh.dot}>•</Text>
            <Text style={hh.chip}>{WEIGHT_CLASSES[f.siklet].ad.toLocaleUpperCase('tr-TR')}</Text>
            <Text style={hh.dot}>•</Text>
            <Text style={[hh.chip, { color: C.blue }]}>{org.kisa}</Text>
            {s.sampiyon || !amator ? (
              <>
                <Text style={hh.dot}>•</Text>
                <Text style={[hh.chip, { color: s.sampiyon ? C.gold : C.text }]}>{s.sampiyon ? '👑 ŞAMPİYON' : s.rank ? `#${s.rank} SIRALAMA` : 'SIRALAMASIZ'}</Text>
              </>
            ) : null}
          </View>
        </View>
        <OvrBadge value={Math.round(statAverage(f.stats))} size={50} />
      </View>
      <View style={hh.meters}>
        <Meter label={amator ? 'AMATÖR' : 'KARNE'} value={`${r.g}-${r.m}-${r.b}`} />
        <Meter label="PARA" value={money(s.para)} color={s.para < 0 ? '#ff4d5e' : C.green} />
        <Meter label="SAĞLIK" value={`${s.saglik}`} color={health} sub={s.saglik} />
        <Meter label="TAKİPÇİ" value={fmtFollowers(followers(s))} color={C.gold} />
      </View>
    </LinearGradient>
  );
}

/** Asıl eylem: sıradaki dövüş. */
export function FightCTA({ title, sub, onPress, disabled }: { title: string; sub: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [{ opacity: disabled ? 0.45 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }]}>
      <LinearGradient colors={disabled ? ['#23252b', '#15161a'] : ['#e63946', '#8f0a17']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={hh.cta}>
        <View style={hh.ctaIcon}>
          <Icon name="sword-cross" size={26} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={hh.ctaKicker}>SIRADAKİ ADIM</Text>
          <Text style={[hh.ctaTitle, SLANT]}>{title}</Text>
          <Text style={hh.ctaSub} numberOfLines={2}>
            {sub}
          </Text>
        </View>
        <Icon name="chevron-right" size={30} color="#fff" />
      </LinearGradient>
    </Pressable>
  );
}

export function ActionGrid({ children }: { children: ReactNode }) {
  return <View style={hh.grid}>{children}</View>;
}

export function ActionTile({
  icon,
  label,
  sub,
  onPress,
  badge,
  selected,
  accent = C.red,
}: {
  icon: IconName;
  label: string;
  sub?: string;
  onPress: () => void;
  badge?: string | number | null;
  selected?: boolean;
  accent?: string;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [hh.tile, selected && { borderColor: accent, backgroundColor: '#15161b' }, pressed && { backgroundColor: '#15161b' }]}>
      <View style={[hh.tileIcon, { backgroundColor: accent + '1c', borderColor: accent + '55' }]}>
        <Icon name={icon} size={19} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={hh.tileLabel} numberOfLines={1}>
          {label}
        </Text>
        {sub ? (
          <Text style={hh.tileSub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {badge ? (
        <View style={[hh.badge, { backgroundColor: accent }]}>
          <Text style={hh.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Kısa uyarı satırı (men cezası, hastalık…). */
export function Notice({ color, icon, children, action }: { color: string; icon: IconName; children: ReactNode; action?: ReactNode }) {
  return (
    <View style={[hh.notice, { borderColor: color + '55', backgroundColor: color + '10' }]}>
      <Icon name={icon} size={18} color={color} />
      <View style={{ flex: 1, gap: 8 }}>
        <Text style={hh.noticeText}>{children}</Text>
        {action}
      </View>
    </View>
  );
}

const hh = StyleSheet.create({
  hero: { borderRadius: R + 4, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#3a1a20', overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nick: { color: C.gold, fontFamily: F.displayMed, fontSize: 11, letterSpacing: 1.5 },
  name: { color: C.text, fontFamily: F.display, fontSize: 24, lineHeight: 28 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' },
  chip: { color: C.dim, fontFamily: F.display, fontSize: 11, letterSpacing: 1 },
  dot: { color: C.faint, fontSize: 10 },
  meters: { flexDirection: 'row', marginTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', paddingTop: 12 },
  meter: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  meterLabel: { color: C.faint, fontFamily: F.display, fontSize: 9, letterSpacing: 1.5 },
  meterVal: { color: C.text, fontFamily: F.display, fontSize: 18, marginTop: 1 },
  meterBar: { width: '70%', height: 3, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden', marginTop: 3 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: R + 4, padding: 16, marginBottom: 12, shadowColor: C.red, shadowOpacity: 0.35, shadowRadius: 18 },
  ctaIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  ctaKicker: { color: 'rgba(255,255,255,0.7)', fontFamily: F.display, fontSize: 10, letterSpacing: 2 },
  ctaTitle: { color: '#fff', fontFamily: F.display, fontSize: 24, lineHeight: 28 },
  ctaSub: { color: 'rgba(255,255,255,0.8)', fontFamily: F.body, fontSize: 12, lineHeight: 16, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tile: { width: '48.8%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, paddingVertical: 12, paddingHorizontal: 10 },
  tileIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { color: C.text, fontFamily: F.display, fontSize: 15, letterSpacing: 0.3 },
  tileSub: { color: C.faint, fontFamily: F.body, fontSize: 11 },
  badge: { position: 'absolute', top: 6, right: 6, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#000', fontFamily: F.black, fontSize: 11 },
  notice: { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: R, padding: 12, marginBottom: 8 },
  noticeText: { color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 18 },
});
