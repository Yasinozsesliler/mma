// Kamp planı: süre, yer, odak, oyun planı, yoğunluk, kilo ve basın tek ekranda.
// Varsayılan: son kampta seçtiklerin (ilk kezse hocanın önerisi); çoğu zaman tek dokunuşla "Kampa başla".
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CAMP_LENGTH_INFO, campLengthsFor } from '../engine/calendar';
import { availableSites, campQuote, coachCampPlan, coachPlanFull, cutCost, defaultCampPlan, INTENSITY, PRESS, WEIGHT_CUTS, type CampPlan } from '../engine/camp';
import { money } from '../engine/career';
import { currentOrg } from '../engine/character';
import { ORGS } from '../engine/data';
import { PLANS } from '../engine/fight';
import { CAMP_SITES } from '../engine/gyms';
import { describeOpponent, weakest } from '../engine/opponents';
import { claimScout } from '../engine/rewards';
import { lookFor } from '../engine/tale';
import type { GameState, Intensity, PlanKey, PressChoice, StatKey, WeightCut } from '../engine/types';
import { STAT_KEYS, STAT_LABELS } from '../engine/types';
import { L } from '../i18n';
import { AdOffer } from './AdOffer';
import { Button, Icon, OctIcon, Screen, SLANT, upName, type IconName } from './components';
import { FighterAvatar } from './FighterAvatar';
import type { Act } from './GameScreens';
import { ScoutReportCard } from './ScoutReportCard';
import { OvrBadge } from './StatusPanel';
import { C, F, R } from './theme';

const STAT_ICONS: Record<StatKey, IconName> = { vurus: 'boxing-glove', gures: 'arm-flex', yer: 'lock', kondisyon: 'lungs', cene: 'shield-check', hiz: 'flash', iq: 'brain' };
const INT_ICONS: Record<Intensity, IconName> = { dusuk: 'meditation', orta: 'dumbbell', yuksek: 'weight-lifter' };
const INT_COLORS: Record<Intensity, string> = { dusuk: C.green, orta: C.gold, yuksek: C.red };
const CUT_ICONS: Record<WeightCut, IconName> = { kademeli: 'food-apple', normal: 'scale-bathroom', sert: 'alert-octagon' };
const CUT_COLORS: Record<WeightCut, string> = { kademeli: C.green, normal: C.gold, sert: C.red };
const CUT_SHORT: Record<WeightCut, string> = { kademeli: L("Kademeli"), normal: L("Normal"), sert: L("Sert") };
const PRESS_ICONS: Record<PressChoice, IconName> = { saygili: 'handshake', trash: 'microphone-variant', sessiz: 'account-voice' };
const PRESS_COLORS: Record<PressChoice, string> = { saygili: C.blue, trash: C.red, sessiz: C.dim };

function Block({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={cp.block}>
      <View style={cp.blockHead}>
        <Text style={cp.blockTitle}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

function Chip({ on, label, sub, icon, color = C.gold, badge, onPress, disabled }: { on: boolean; label: string; sub?: string; icon?: IconName; color?: string; badge?: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [cp.chip, on && { borderColor: color, backgroundColor: color + '1f' }, disabled && { opacity: 0.35 }, pressed && { transform: [{ scale: 0.97 }] }]}>
      {icon ? <Icon name={icon} size={15} color={on ? color : C.dim} /> : null}
      <View>
        <Text style={[cp.chipText, on && { color: '#fff' }]}>{label}</Text>
        {sub ? <Text style={[cp.chipSub, on && { color }]}>{sub}</Text> : null}
      </View>
      {badge ? (
        <View style={cp.badge}>
          <Text style={cp.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Üçlü seçici (yoğunluk, kilo, basın). */
function Segments<T extends string>({ items, value, onChange }: { items: { key: T; label: string; icon: IconName; color: string; disabled?: boolean }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={cp.segs}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable key={it.key} disabled={it.disabled} onPress={() => onChange(it.key)} style={[cp.seg, on && { borderColor: it.color, backgroundColor: it.color + '22' }, it.disabled && { opacity: 0.35 }]}>
            <Icon name={it.icon} size={18} color={on ? it.color : C.faint} />
            <Text style={[cp.segText, on && { color: '#fff' }]} numberOfLines={1} adjustsFontSizeToFit>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  const n = Math.max(1, Math.min(5, Math.round(value * 5)));
  return (
    <View style={{ alignItems: 'center', gap: 3 }}>
      <Text style={cp.meterLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <View key={i} style={[cp.pip, { backgroundColor: i < n ? color : '#23252c' }]} />
        ))}
      </View>
    </View>
  );
}

export function CampPlanner({ s, act, choose, steps }: { s: GameState; act: Act; choose: (v: string) => void; steps: ReactNode }) {
  const k = s.pending.kamp!;
  const o = s.pending.rakip!;
  const [p, setP] = useState<CampPlan>(() => defaultCampPlan(s));
  const coach = useMemo(() => coachPlanFull(s), [s]);
  const coachFocus = coachCampPlan(s).focus;
  const set = (x: Partial<CampPlan>) => setP((cur) => ({ ...cur, ...x }));
  const d = describeOpponent(o);
  const weak = weakest(o);
  const lengths = campLengthsFor(k.macHafta ?? 8);
  const open = availableSites(s);
  const site = CAMP_SITES.find((x) => x.id === p.yer) ?? CAMP_SITES[0];
  const q = campQuote(s, p.yer, p.hafta);
  const cut = p.kilo === 'kademeli' ? cutCost(s) : 0;
  const total = q.toplam + cut;
  const len = CAMP_LENGTH_INFO[p.hafta] ?? { carpan: p.hafta / 8, risk: 1, not: '' };
  const focusBonus = (p.focus === site.bonusStat ? 1.3 : 1) * (site.salonUcreti && p.focus === s.takim.uzmanlik ? 1.35 : 1);
  const growth = (INTENSITY[p.intensity].carpan * len.carpan * site.carpan * focusBonus) / 1.9;
  const risk = (INTENSITY[p.intensity].risk * len.risk * site.risk) / 0.24;
  const fit = PLANS[p.plan].hedef.includes(weak);
  const isCoach = JSON.stringify(p) === JSON.stringify(coach);
  const pro = s.stage !== 'amator';
  const serbest = (k.macHafta ?? p.hafta) - p.hafta;
  const hidrasyon = !!ORGS[currentOrg(s)].hidrasyon;

  const footer = (
    <View style={{ gap: 10 }}>
      <View style={cp.summary}>
        <View>
          <Text style={cp.meterLabel}>{L("MASRAF")}</Text>
          <Text style={[cp.total, { color: total > s.para ? '#ff4d5e' : total ? C.text : C.green }]}>{total ? money(total) : L("Ücretsiz")}</Text>
        </View>
        <Meter label={L("GELİŞİM")} value={growth} color={C.green} />
        <Meter label={L("RİSK")} value={risk} color={risk > 0.6 ? C.red : risk > 0.35 ? C.orange : C.green} />
      </View>
      <Button label={L("Kampa başla")} icon="play" tone="gold" onPress={() => choose('plan:' + JSON.stringify(p))} />
    </View>
  );

  return (
    <Screen footer={footer}>
      <View style={cp.stack}>
        {steps}
        {/* Rakip ve maç */}
        <LinearGradient colors={['#2a0b12', '#0e0f13']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cp.hero}>
          <FighterAvatar look={lookFor(o)} size={58} ring={C.blue} />
          <View style={{ flex: 1 }}>
            <Text style={cp.kicker}>{L("KAMP PLANI · MAÇA {0} HAFTA", [k.macHafta ?? p.hafta])}</Text>
            <Text style={[cp.opp, SLANT]} numberOfLines={1} adjustsFontSizeToFit>
              VS {upName(`${o.ad} ${o.soyad}`, o.uyruk)}
            </Text>
            <Text style={cp.meta} numberOfLines={1}>
              {d.stil} · {L("Zayıf:")} <Text style={{ color: '#ff4d5e' }}>{d.zayif}</Text>
            </Text>
          </View>
          <OvrBadge value={d.guc} size={44} />
        </LinearGradient>

        <Pressable onPress={() => setP(coach)} style={({ pressed }) => [cp.coachBtn, isCoach && cp.coachOn, pressed && { opacity: 0.85 }]}>
          <Icon name={isCoach ? 'check-decagram' : 'whistle'} size={18} color={isCoach ? '#111' : C.gold} />
          <Text style={[cp.coachText, isCoach && { color: '#111' }]}>{isCoach ? L("HOCANIN PLANI SEÇİLİ") : L("HOCANIN ÖNERİSİNİ UYGULA")}</Text>
        </Pressable>

        <Block title={L("SÜRE")} right={<Text style={cp.blockNote}>{serbest > 0 ? L("Önce {0} serbest hafta", [serbest]) : L("Hemen kampa")}</Text>}>
          <View style={cp.row}>
            {lengths.map((w) => (
              <Chip key={w} on={p.hafta === w} label={L("{0} HAFTA", [w])} sub={`×${(CAMP_LENGTH_INFO[w]?.carpan ?? 1).toFixed(2)}`} onPress={() => set({ hafta: w })} />
            ))}
          </View>
          {len.not ? <Text style={cp.note}>{len.not}</Text> : null}
        </Block>

        <Block title={L("KAMP YERİ")} right={<Text style={[cp.blockNote, { color: s.para < q.toplam ? '#ff4d5e' : C.green }]}>{q.toplam ? money(q.toplam) : L("Ücretsiz")}</Text>}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
            {CAMP_SITES.map((x) => {
              const locked = !open.includes(x);
              const qq = campQuote(s, x.id, p.hafta);
              const on = p.yer === x.id;
              const bonus = x.bonusStat ? STAT_LABELS[x.bonusStat] : x.salonUcreti && s.takim.uzmanlik ? STAT_LABELS[s.takim.uzmanlik] : null;
              return (
                <Pressable key={x.id} disabled={locked} onPress={() => set({ yer: x.id })} style={[cp.site, on && cp.siteOn, locked && { opacity: 0.35 }]}>
                  <OctIcon name={(locked ? 'lock' : x.ikon) as IconName} color={on ? C.gold : C.red} size={34} />
                  <Text style={cp.siteName} numberOfLines={2}>
                    {x.ad}
                  </Text>
                  <Text style={[cp.sitePrice, { color: qq.toplam && s.para < qq.toplam ? '#ff4d5e' : C.text }]}>{qq.toplam ? money(qq.toplam) : L("Ücretsiz")}</Text>
                  <Text style={cp.siteSub} numberOfLines={2}>
                    {locked ? L("Büyük organizasyonda açılır") : [bonus ? `🔥 ${bonus}` : null, L("Gelişim ×{0}", [x.carpan])].filter(Boolean).join(' · ')}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Block>

        <Block title={L("ODAK")} right={<Text style={cp.blockNote}>{L("★ hocanın önerisi")}</Text>}>
          <View style={cp.wrap}>
            {STAT_KEYS.map((st) => (
              <Chip
                key={st}
                on={p.focus === st}
                icon={STAT_ICONS[st]}
                label={STAT_LABELS[st]}
                sub={String(s.fighter.stats[st])}
                badge={st === coachFocus ? '★' : st === site.bonusStat || (site.salonUcreti && st === s.takim.uzmanlik) ? '🔥' : undefined}
                onPress={() => set({ focus: st })}
              />
            ))}
          </View>
        </Block>

        <Block title={L("OYUN PLANI")} right={<Text style={[cp.blockNote, { color: fit ? C.gold : C.faint }]}>{fit ? L("✓ Zaafa uygun") : L("Zaaf: {0}", [STAT_LABELS[weak]])}</Text>}>
          <View style={cp.wrap}>
            {(Object.keys(PLANS) as PlanKey[]).map((pk) => (
              <Chip key={pk} on={p.plan === pk} icon={PLANS[pk].ikon as IconName} label={PLANS[pk].kisa} badge={PLANS[pk].hedef.includes(weak) ? L("ZAAF") : undefined} onPress={() => set({ plan: pk })} />
            ))}
          </View>
          <View style={cp.planBox}>
            <Text style={cp.planName}>{PLANS[p.plan].ad}</Text>
            <Text style={cp.planLine}>✅ {PLANS[p.plan].avantaj}</Text>
            <Text style={cp.planLine}>⚠️ {PLANS[p.plan].risk}</Text>
          </View>
          {k.kesif ? (
            <ScoutReportCard o={o} />
          ) : (
            <AdOffer icon="file-search" title={L("Detaylı keşif raporu")} desc={L("Rakibin dövüş alışkanlıklarını ve ona karşı en etkili taktiği öğren.")} onReward={() => act(claimScout)} />
          )}
        </Block>

        <Block title={L("YOĞUNLUK")} right={<Text style={cp.blockNote}>{L("Sağlık {0}", [s.saglik])}</Text>}>
          <Segments
            items={(Object.keys(INTENSITY) as Intensity[]).map((x) => ({ key: x, label: INTENSITY[x].ad, icon: INT_ICONS[x], color: INT_COLORS[x] }))}
            value={p.intensity}
            onChange={(v) => set({ intensity: v })}
          />
          <Text style={cp.note}>{INTENSITY[p.intensity].aciklama}</Text>
        </Block>

        <Block title={L("KİLO")} right={cut ? <Text style={cp.blockNote}>{money(cut)}</Text> : undefined}>
          <Segments
            items={(Object.keys(WEIGHT_CUTS) as WeightCut[]).map((x) => ({ key: x, label: CUT_SHORT[x], icon: CUT_ICONS[x], color: CUT_COLORS[x] }))}
            value={p.kilo}
            onChange={(v) => set({ kilo: v })}
          />
          <Text style={[cp.note, p.kilo === 'sert' && hidrasyon && { color: '#ff4d5e' }]}>
            {p.kilo === 'sert' && hidrasyon ? L("⚠️ Bu organizasyonda hidrasyon testi var: sert kilo verme maçı iptal ettirebilir.") : WEIGHT_CUTS[p.kilo].aciklama}
          </Text>
        </Block>

        {pro ? (
          <Block title={L("BASIN TOPLANTISI")}>
            <Segments
              items={(Object.keys(PRESS) as PressChoice[]).map((x) => ({ key: x, label: PRESS[x].ad, icon: PRESS_ICONS[x], color: PRESS_COLORS[x] }))}
              value={p.basin ?? 'saygili'}
              onChange={(v) => set({ basin: v })}
            />
            <Text style={cp.note}>{PRESS[p.basin ?? 'saygili'].aciklama}</Text>
          </Block>
        ) : null}
      </View>
    </Screen>
  );
}

const cp = StyleSheet.create({
  stack: { gap: 10 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: R + 4, borderWidth: 1, borderColor: '#3a1a20', padding: 12 },
  kicker: { color: C.gold, fontFamily: F.display, fontSize: 10, letterSpacing: 1.5 },
  opp: { color: '#fff', fontFamily: F.display, fontSize: 20 },
  meta: { color: C.dim, fontFamily: F.body, fontSize: 12 },
  coachBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: C.goldDeep, borderRadius: 12, paddingVertical: 10, backgroundColor: '#15120a' },
  coachOn: { backgroundColor: C.gold, borderColor: C.gold },
  coachText: { color: C.gold, fontFamily: F.display, fontSize: 13, letterSpacing: 1 },
  block: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, gap: 8 },
  blockHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  blockTitle: { color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 2 },
  blockNote: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  note: { color: C.faint, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  row: { flexDirection: 'row', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#0c0d11' },
  chipText: { color: C.dim, fontFamily: F.display, fontSize: 13, letterSpacing: 0.3 },
  chipSub: { color: C.faint, fontFamily: F.semi, fontSize: 10 },
  badge: { backgroundColor: C.gold, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1, marginLeft: 2 },
  badgeText: { color: '#111', fontFamily: F.display, fontSize: 9 },
  site: { width: 136, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, gap: 4, backgroundColor: '#0c0d11' },
  siteOn: { borderColor: C.gold, backgroundColor: '#1c1608' },
  siteName: { color: C.text, fontFamily: F.display, fontSize: 13, lineHeight: 16, minHeight: 32 },
  sitePrice: { fontFamily: F.display, fontSize: 15 },
  siteSub: { color: C.faint, fontFamily: F.body, fontSize: 10, lineHeight: 13 },
  planBox: { backgroundColor: '#0c0d11', borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 10, gap: 2 },
  planName: { color: C.text, fontFamily: F.display, fontSize: 14 },
  planLine: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  segs: { flexDirection: 'row', gap: 6 },
  seg: { flex: 1, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 4, backgroundColor: '#0c0d11' },
  segText: { color: C.dim, fontFamily: F.display, fontSize: 12 },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  meterLabel: { color: C.faint, fontFamily: F.display, fontSize: 9, letterSpacing: 1.5 },
  total: { fontFamily: F.display, fontSize: 18 },
  pip: { width: 14, height: 6, borderRadius: 3 },
});
