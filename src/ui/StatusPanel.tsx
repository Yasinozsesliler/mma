import { L } from '../i18n';
import { brainColor, brainLabel, brainOf } from '../engine/brain';
import { useFrame } from '../cosmetics';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { money, rankLabel, STAGE_LABELS } from '../engine/career';
import { KIMLIK } from '../engine/identity';
import { titleNow } from '../cosmetics';
import { seasonBadges } from '../season';
import { fmtFollowers, followers, followerTier } from '../engine/fame';
import { currentOrg, statAverage } from '../engine/character';
import { BACKGROUNDS, COUNTRIES, ORGS, WEIGHT_CLASSES } from '../engine/data';
import type { GameState } from '../engine/types';
import { STAT_KEYS, STAT_LABELS } from '../engine/types';
import { CageBg, Icon, Pill, SLANT, octPoints, type IconName } from './components';
import { FighterAvatar } from './FighterAvatar';
import { C, F, R, statColor } from './theme';

export const FLAGS: Record<string, string> = {
  tr: '🇹🇷', us: '🇺🇸', br: '🇧🇷', ru: '🇷🇺', gb: '🇬🇧', ie: '🇮🇪', fr: '🇫🇷', de: '🇩🇪', pl: '🇵🇱',
  cz: '🇨🇿', ge: '🇬🇪', kz: '🇰🇿', mx: '🇲🇽', jp: '🇯🇵', ng: '🇳🇬', au: '🇦🇺', az: '🇦🇿',
};

const oct = (r: number) => octPoints(r);

/** Sekizgen içinde genel güç puanı. */
export function OvrBadge({ value, size = 76 }: { value: number; size?: number }) {
  const col = statColor(value);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
        <Polygon points={oct(49)} fill={col} />
        <Polygon points={oct(44)} fill="#101217" />
      </Svg>
      <Text style={[fc.ovr, { color: col, fontSize: size * 0.4 }]}>{value}</Text>
      <Text style={fc.ovrLabel}>{L("GÜÇ")}</Text>
    </View>
  );
}

function Info({ icon, label, value, color, wide }: { icon: IconName; label: string; value: string; color?: string; wide?: boolean }) {
  return (
    <View style={[fc.info, wide && { width: '100%' }]}>
      <Icon name={icon} size={16} color={color ?? C.faint} />
      <View style={{ flex: 1 }}>
        <Text style={fc.infoLabel}>{label}</Text>
        <Text style={[fc.infoVal, color ? { color } : null]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export function StatusPanel({ s, compact }: { s: GameState; compact?: boolean }) {
  const frame = useFrame();
  const f = s.fighter;
  const org = currentOrg(s);
  // Amatördeyken amatör karnesi, profesyonelde profesyonel karne ana karne olarak gösterilir.
  const amator = s.stage === 'amator';
  const r = amator ? s.amator : s.rekor;
  const a = s.amator;
  const ovr = Math.round(statAverage(f.stats));
  return (
    <LinearGradient colors={['#22060b', '#0e0f12', '#08090b']} locations={[0, 0.45, 1]} style={fc.card}>
      <CageBg opacity={0.06} />
      <View style={fc.head}>
        <FighterAvatar look={f.gorunum} size={84} ring={frame ?? (s.sampiyon ? C.gold : C.red)} />
        <View style={{ flex: 1 }}>
          {f.lakap ? <Text style={fc.nick}>“{f.lakap}”</Text> : null}
          <Text style={[fc.name, SLANT]} numberOfLines={2}>
            {f.ad} {f.soyad}
          </Text>
          <Text style={fc.meta}>
            {FLAGS[f.uyruk] ?? ''} {COUNTRIES[f.uyruk]?.ad} · {f.memleket} · {f.yas} {L("yaş")}
          </Text>
        </View>
        <OvrBadge value={ovr} size={58} />
      </View>

      <View style={fc.pills}>
        <Pill text={`${WEIGHT_CLASSES[f.siklet].ad} ${WEIGHT_CLASSES[f.siklet].kg}kg`} icon="scale-bathroom" color={C.dim} />
        <Pill text={BACKGROUNDS[f.gecmis].ad} icon="karate" color={C.dim} />
        <Pill text={ORGS[org].kisa} icon="office-building" color={C.blue} />
        <Pill text={rankLabel(s)} icon={s.sampiyon ? 'crown' : 'podium'} color={s.sampiyon ? C.gold : C.red} />
      </View>

      <View style={fc.stats}>
        {STAT_KEYS.map((k) => {
          const v = f.stats[k];
          return (
            <View key={k} style={fc.stat}>
              <Text style={fc.statLabel}>{STAT_LABELS[k]}</Text>
              <Text style={[fc.statVal, { color: statColor(v) }]}>{v}</Text>
              <View style={fc.statBar}>
                <View style={{ width: `${v}%`, height: '100%', backgroundColor: statColor(v), borderRadius: 2 }} />
              </View>
            </View>
          );
        })}
        <View style={[fc.stat, { borderColor: C.gold + '55' }]}>
          <Text style={fc.statLabel}>{L("Puan")}</Text>
          <Text style={[fc.statVal, { color: s.puan ? C.gold : C.faint }]}>{s.puan}</Text>
          <Text style={[fc.statLabel, { fontSize: 9 }]}>{L("gelişim")}</Text>
        </View>
      </View>

      <View style={fc.infoGrid}>
        <Info wide icon="trophy-outline" label={amator ? L("Amatör karne") : L("Profesyonel karne")} value={L("{0}-{1}-{2}  ·  KO {3} · SUB {4} · KRR {5}", [r.g, r.m, r.b, r.ko, r.sub, r.karar])} />
        {!amator && a.g + a.m + a.b > 0 ? <Info wide icon="school-outline" label={L("Amatör karne")} value={L("{0}-{1}-{2}  ·  KO {3} · SUB {4} · KRR {5}", [a.g, a.m, a.b, a.ko, a.sub, a.karar])} /> : null}
        <Info icon="cash" label={L("Para")} value={money(s.para)} color={s.para < 0 ? C.red : undefined} />
        <Info icon="account-group" label={L("Takipçi")} value={`${fmtFollowers(followers(s))} · ${followerTier(followers(s))}`} />
        <Info icon="heart-pulse" label={L("Sağlık")} value={`${s.saglik}/100`} color={s.saglik < 60 ? C.orange : undefined} />
        <Info icon="brain" label={L("Beyin hasarı")} value={`${brainOf(s)}/100 · ${brainLabel(brainOf(s))}`} color={brainOf(s) >= 30 ? brainColor(brainOf(s)) : undefined} />
        <Info icon="file-sign" label={L("Kontrat")} value={s.contract ? L("{0} dövüş kaldı", [s.contract.kalan]) : L("Yok")} />
        <Info icon="stairs-up" label={L("Aşama")} value={STAGE_LABELS[s.stage].replace(/^Aşama \d · /, '')} />
        {titleNow() ? <Info wide icon="medal" label={L("Unvan")} value={titleNow()!} color={C.gold} /> : null}
        {seasonBadges().length ? <Info wide icon="trophy-variant" label={L("Sezon Şampiyonu rozeti")} value={`🏅 × ${seasonBadges().length}`} color={C.gold} /> : null}
        <Info wide icon="sword-cross" label={L("Dövüş kimliği")} value={s.kimlik?.id ? `${KIMLIK[s.kimlik.id].ikon} ${KIMLIK[s.kimlik.id].ad()}` : L("Henüz oluşmadı · Nasıl dövüştüğünle doğar")} />
      </View>

      {s.sakatliklar.length ? (
        <View style={[fc.pills, { marginTop: 8 }]}>
          {s.sakatliklar.map((i, n) => (
            <Pill key={n} text={L("{0} · {1} hf", [i.ad, i.hafta])} icon="bandage" color={C.orange} />
          ))}
        </View>
      ) : null}
      {!compact ? (
        <View style={fc.team}>
          <Icon name="whistle" size={15} color={C.faint} />
          <Text style={fc.teamText} numberOfLines={2}>
            {s.takim.salon} · {s.takim.antrenor} ({s.takim.antrenorKalite}/10)
            {s.takim.menajer ? L(" · Menajer: {0}", [s.takim.menajer]) : ''}
          </Text>
        </View>
      ) : null}
      {s.unvanlar.length ? (
        <View style={fc.team}>
          <Icon name="crown" size={15} color={C.gold} />
          <Text style={[fc.teamText, { color: C.gold }]}>{s.unvanlar.join(' · ')}</Text>
        </View>
      ) : null}
    </LinearGradient>
  );
}

const fc = StyleSheet.create({
  card: { borderRadius: R + 4, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#3a1a20' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ovr: { fontFamily: F.display, lineHeight: undefined, marginTop: -4 },
  ovrLabel: { color: C.faint, fontFamily: F.display, fontSize: 9, letterSpacing: 1.5, marginTop: -4 },
  nick: { color: C.gold, fontFamily: F.displayMed, fontSize: 14, letterSpacing: 1, textTransform: 'uppercase' },
  name: { color: C.text, fontFamily: F.display, fontSize: 26, lineHeight: 30, textTransform: 'uppercase' },
  meta: { color: C.dim, fontFamily: F.body, fontSize: 12, marginTop: 2 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  stat: { width: '23.5%', backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  statLabel: { color: C.faint, fontFamily: F.semi, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  statVal: { fontFamily: F.display, fontSize: 24, lineHeight: 30 },
  statBar: { width: '80%', height: 3, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, rowGap: 10 },
  info: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 6 },
  infoLabel: { color: C.faint, fontFamily: F.semi, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  infoVal: { color: C.text, fontFamily: F.semi, fontSize: 13 },
  team: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
  teamText: { flex: 1, color: C.dim, fontFamily: F.body, fontSize: 12 },
});
