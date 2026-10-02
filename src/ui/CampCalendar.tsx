// Takvim ekranları: kamp süresi, serbest haftalar, hafta hafta kamp ve premium kamp sonu.
import { PartnerMomentCard } from './PartnerMomentCard';
import { L, LOC } from '../i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { campLengthsFor, CAMP_LENGTH_INFO, currentEvent, FREE_ACTS } from '../engine/calendar';
import { campQuote } from '../engine/camp';
import { DRILLS, drillDone, drillGrade, drillOfWeek } from '../engine/drills';
import { money } from '../engine/career';
import { TECHNIQUES, techLevel, MAX_TECH, xpNeed } from '../engine/techniques';
import type { GameState } from '../engine/types';
import { STAT_LABELS } from '../engine/types';
import { Button, Icon, Screen, Section, SLANT, type IconName } from './components';
import type { Act } from './GameScreens';
import { SkillPanel } from './SkillPanel';
import { TechniquePanel } from './TechniquePanel';
import { DrillGame } from './DrillGame';
import { lookFor } from '../engine/tale';
import { C, F, R } from './theme';

type Choose = (v: string | number) => void;

const days = (w: number) => L("{0} gün", [w * 7]);

/** Maça kadar olan haftalar: geçen, şimdiki, serbest, kamp ve maç haftası. */
export function Timeline({ s }: { s: GameState }) {
  const k = s.pending.kamp!;
  const total = k.macHafta ?? k.hafta;
  const free = total - k.hafta;
  const doneFree = k.takvimIdx ?? 0;
  const doneCamp = k.kampIdx ?? 0;
  const cells = Array.from({ length: total }, (_, i) => {
    const camp = i >= free;
    const done = camp ? i - free < doneCamp : i < doneFree;
    const current = !done && (camp ? i - free === doneCamp && k.step === 'haftalik' : i === doneFree && k.step === 'takvim');
    const ev = !camp && (k.olaylar ?? []).some((e) => e.idx === i);
    return { camp, done, current, ev, last: i === total - 1 };
  });
  return (
    <View style={cc.tl}>
      <View style={cc.tlRow}>
        {cells.map((c, i) => (
          <View
            key={i}
            style={[
              cc.cell,
              { backgroundColor: c.done ? (c.camp ? '#6a3a10' : '#2a2d33') : c.camp ? '#2a1a08' : '#15161a', borderColor: c.camp ? '#8a5a14' : C.border },
              c.current && { borderColor: C.red, borderWidth: 2 },
              c.last && { borderColor: C.gold, backgroundColor: '#3a2a07' },
            ]}
          >
            {c.last ? <Text style={cc.cellIcon}>🥊</Text> : c.ev ? <View style={cc.evDot} /> : null}
          </View>
        ))}
      </View>
      <View style={cc.legend}>
        <Text style={cc.legendText}>{L("⬜ Serbest")}</Text>
        <Text style={[cc.legendText, { color: '#d99a3a' }]}>{L("🟧 Kamp")}</Text>
        <Text style={[cc.legendText, { color: C.gold }]}>{L("🥊 Maç")}</Text>
        <Text style={[cc.legendText, { color: '#3aa8ff' }]}>{L("● Etkinlik")}</Text>
      </View>
    </View>
  );
}

function FightDateHero({ s, children }: { s: GameState; children?: ReactNode }) {
  const k = s.pending.kamp!;
  const o = s.pending.rakip!;
  const left = (k.macHafta ?? k.hafta) - (k.takvimIdx ?? 0) - (k.kampIdx ?? 0);
  return (
    <LinearGradient colors={['#1d0a0e', '#0c0d10']} style={cc.hero}>
      <Text style={cc.kicker}>{L("MAÇ TAKVİMİ")}</Text>
      <Text style={[cc.big, SLANT]}>{left} {L("HAFTA")}</Text>
      <Text style={cc.sub}>
        {o.ad} {o.soyad} {L("ile maça")}{' '}{days(left)} {L("kaldı")}
      </Text>
      <Timeline s={s} />
      {children}
    </LinearGradient>
  );
}

// ---------- Kamp süresi ----------

export function CampLengthStep({ s, header, choose }: { s: GameState; header: ReactNode; choose: Choose }) {
  const k = s.pending.kamp!;
  const mac = k.macHafta ?? k.hafta;
  return (
    <Screen>
      {header}
      <FightDateHero s={s} />
      <Text style={cc.title}>{L("Kamp süresini seç")}</Text>
      <Text style={cc.hint}>{L("Kamptan önceki haftalar serbest: teknik çalışır, spar yapar, etkinliklere katılırsın. Uzun kamp daha çok geliştirir ama pahalıdır ve yıpratır.")}</Text>
      {campLengthsFor(mac).map((w) => {
        const info = CAMP_LENGTH_INFO[w] ?? { carpan: 1, risk: 1, not: '' };
        const q = campQuote(s, 'salon', w).toplam;
        const rec = w === Math.min(8, mac);
        return (
          <Pressable key={w} onPress={() => choose(w)} style={({ pressed }) => [cc.len, rec && { borderColor: C.gold }, pressed && { backgroundColor: '#15161b' }]}>
            <View style={cc.lenWeeks}>
              <Text style={[cc.lenNum, rec && { color: C.gold }]}>{w}</Text>
              <Text style={cc.lenUnit}>{L("HAFTA")}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={cc.lenTitle}>
                {info.not} {rec ? <Text style={{ color: C.gold }}>{L("· Önerilen")}</Text> : null}
              </Text>
              <Text style={cc.lenMeta}>
                
                {L("Gelişim ×")}{info.carpan} {L("· Sakatlık riski ×")}{info.risk}
                {q ? L(" · Salon ~{0}", [money(q)]) : ''}
              </Text>
              <Text style={cc.lenMeta}>{mac - w > 0 ? L("Kamptan önce {0} serbest hafta", [mac - w]) : L("Hemen kampa gir")}</Text>
            </View>
            <Icon name="chevron-right" size={22} color={C.faint} />
          </Pressable>
        );
      })}
    </Screen>
  );
}

// ---------- Serbest haftalar ----------

export function FreeWeeksStep({ s, header, choose }: { s: GameState; header: ReactNode; choose: Choose }) {
  const k = s.pending.kamp!;
  const [pickTech, setPickTech] = useState(false);
  const ev = currentEvent(s);
  const week = (k.takvimIdx ?? 0) + 1;
  const known = TECHNIQUES.filter((t) => techLevel(s, t.id) > 0 && techLevel(s, t.id) < MAX_TECH);
  return (
    <Screen footer={<Button label={L("Kampa kadar otomatik geç")} icon="fast-forward" tone="ghost" onPress={() => choose('hizli')} />}>
      {header}
      <FightDateHero s={s} />
      <View style={cc.weekHead}>
        <Text style={[cc.weekTitle, SLANT]}>{week}{L(". HAFTA")}</Text>
        <Text style={cc.weekSub}>{L("Kampa")}{' '}{k.serbest} {L("hafta · Sağlık")}{' '}{s.saglik}/100</Text>
      </View>

      {ev ? (
        <LinearGradient colors={['#0b1a2a', '#0c0d10']} style={cc.event}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name={ev.ikon as IconName} size={20} color="#3aa8ff" />
            <Text style={cc.eventTitle}>{ev.baslik}</Text>
          </View>
          <Text style={cc.eventText}>{ev.metin}</Text>
          {ev.secenekler.map((o, i) => (
            <Pressable key={i} onPress={() => choose(`olay:${i}`)} style={({ pressed }) => [cc.opt, pressed && { borderColor: '#3aa8ff' }]}>
              <Text style={cc.optTitle}>{o.ad}</Text>
              <Text style={cc.optDesc}>{o.aciklama}</Text>
            </Pressable>
          ))}
        </LinearGradient>
      ) : pickTech ? (
        <View style={cc.panel}>
          <Text style={cc.panelTitle}>{L("Hangi tekniğe yükleneceksin?")}</Text>
          {known.length ? (
            known.map((t) => (
              <Pressable key={t.id} onPress={() => { setPickTech(false); choose(`teknik:${t.id}`); }} style={({ pressed }) => [cc.techRow, pressed && { backgroundColor: '#15161b' }]}>
                <Icon name={t.ikon as IconName} size={18} color={C.gold} />
                <Text style={cc.techName}>{t.ad}</Text>
                <Text style={cc.techLv}>
                  
                  {L("Sv")}{' '}{techLevel(s, t.id)} · {s.teknik?.[t.id]?.xp ?? 0}/{xpNeed(techLevel(s, t.id))}
                </Text>
              </Pressable>
            ))
          ) : (
            <Text style={cc.hint}>{L("Henüz bildiğin bir teknik yok. Gelişim sekmesinden puanla öğrenebilirsin.")}</Text>
          )}
          <Pressable onPress={() => setPickTech(false)} style={{ alignItems: 'center', paddingTop: 8 }}>
            <Text style={cc.back}>{L("GERİ")}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={cc.grid}>
          {FREE_ACTS.map((a) => (
            <Pressable key={a.id} onPress={() => (a.id === 'teknik' ? setPickTech(true) : choose(a.id))} style={({ pressed }) => [cc.act, pressed && { backgroundColor: '#15161b', borderColor: C.red }]}>
              <Icon name={a.ikon as IconName} size={22} color={C.red} />
              <Text style={cc.actTitle}>{a.ad}</Text>
              <Text style={cc.actDesc}>{a.aciklama}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {(k.takvimLog ?? []).length ? (
        <>
          <Section>{L("TAKVİM GÜNLÜĞÜ")}</Section>
          <View style={cc.panel}>
            {(k.takvimLog ?? []).map((l, i) => (
              <Text key={i} style={[cc.log, i > 0 && cc.divider]}>
                {l}
              </Text>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

// ---------- Kamp haftaları ----------

export function CampWeeksStep({ s, header, choose }: { s: GameState; header: ReactNode; choose: Choose }) {
  const k = s.pending.kamp!;
  const done = k.kampIdx ?? 0;
  const [drill, setDrill] = useState(false);
  const oyun = drillOfWeek(s);
  const played = drillDone(s);
  const lastDrill = k.idman?.at(-1);
  return (
    <Screen
      footer={
        k.kankaAn ? undefined : (
          <>
            <Button label={done + 1 >= k.hafta ? L("Fight week’i oyna") : L("{0}. kamp haftasını oyna", [done + 1])} icon="play" onPress={() => choose('hafta')} />
            <Button label={L("Tüm kampı simüle et")} icon="fast-forward" tone="ghost" onPress={() => choose('hepsi')} />
          </>
        )
      }
    >
      {header}
      <FightDateHero s={s} />
      <PartnerMomentCard s={s} choose={choose} />
      <Text style={cc.title}>{L('Antrenman kampı · {0}/{1} hafta', [done, k.hafta])}</Text>
      <Pressable
        disabled={played}
        onPress={() => setDrill(true)}
        style={({ pressed }) => [cc.drill, played && { opacity: 0.75 }, pressed && { borderColor: C.gold }]}
      >
        <View style={cc.drillIcon}>
          <Icon name={(played ? 'check-bold' : DRILLS[oyun].ikon) as IconName} size={24} color={played ? C.green : C.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={cc.drillKicker}>{L("HAFTANIN SEANSI · İSTEĞE BAĞLI")}</Text>
          <Text style={cc.drillTitle}>{DRILLS[oyun].ad}</Text>
          <Text style={cc.drillDesc}>
            {played && lastDrill ? L("Bu hafta: {0} puan · {1}", [lastDrill.puan, drillGrade(lastDrill.puan)]) : L("15 saniyelik mini oyun. İyi oynarsan kamp daha verimli, sakatlık riski daha düşük.")}
          </Text>
        </View>
        {played ? null : <Icon name="play-circle" size={30} color={C.gold} />}
      </Pressable>
      {drill ? (
        <DrillGame
          oyun={oyun}
          pLook={s.fighter.gorunum}
          oLook={s.pending.rakip ? lookFor(s.pending.rakip) : undefined}
          onClose={() => setDrill(false)}
          onDone={(p) => {
            setDrill(false);
            choose(`idman:${p}`);
          }}
        />
      ) : null}
      <View style={cc.panel}>
        {(k.haftaLog ?? []).length ? (
          (k.haftaLog ?? []).map((l, i) => (
            <View key={i} style={[cc.campRow, i > 0 && cc.divider]}>
              <View style={cc.campDot} />
              <Text style={cc.log}>{l}</Text>
            </View>
          ))
        ) : (
          <Text style={cc.hint}>{L("Kamp hazır. Haftaları tek tek oynayabilir ya da tamamını simüle edebilirsin.")}</Text>
        )}
      </View>
    </Screen>
  );
}

// ---------- Kamp sonu (premium) ----------

function Tile({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color: string; icon: IconName }) {
  return (
    <View style={cc.tile}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Icon name={icon} size={13} color={C.faint} />
        <Text style={cc.tileLabel}>{label}</Text>
      </View>
      <Text style={[cc.tileVal, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? <Text style={cc.tileSub}>{sub}</Text> : null}
    </View>
  );
}

const SUMMARY_SKIP = [/^📍/, /^📈/, /^⭐ \+/, /^💸/];

export function CampSummary({ s, act, choose }: { s: GameState; act: Act; choose: Choose }) {
  const k = s.pending.kamp!;
  const o = s.pending.rakip!;
  const r = k.sonuc;
  const rest = k.ozet.filter((l) => !SUMMARY_SKIP.some((re) => re.test(l)));
  return (
    <Screen
      footer={
        <>
          <Button label={L("Tartıya çık")} icon="scale-bathroom" tone="gold" onPress={() => choose(0)} />
          {s.stage !== 'amator' && !k.kisaHaber ? <Button label={L("Kilonu kendin yönet (son 48 saat)")} icon="scale-bathroom" tone="ghost" onPress={() => choose('kesim')} /> : null}
        </>
      }
    >
      <LinearGradient colors={['#10301f', '#08140e', '#040405']} style={cc.sumHero}>
        <View style={[cc.glowLine, { backgroundColor: C.green }]} />
        <Text style={cc.sumOrg}>{(r?.yer ?? L('KAMP')).toLocaleUpperCase(LOC)} · {k.hafta} {L("HAFTA")}</Text>
        <View style={[cc.sumKicker, { borderColor: C.green }]}>
          <Icon name="check-decagram" size={14} color={C.green} />
          <Text style={[cc.sumKickerText, { color: C.green }]}>{L("KAMP TAMAMLANDI")}</Text>
        </View>
        <Text style={[cc.sumTitle, SLANT]}>{L("HAZIRSIN")}</Text>
        <Text style={cc.sumVs}>
          
          {L("SIRADAKİ:")}{' '}<Text style={{ color: C.text }}>{`${o.ad} ${o.soyad}`.toLocaleUpperCase(LOC)}</Text>
        </Text>
        {r?.planUyum ? (
          <View style={cc.planTag}>
            <Icon name="target" size={13} color={C.gold} />
            <Text style={cc.planText}>{L("OYUN PLANI RAKİBİN ZAAFINA OTURDU")}</Text>
          </View>
        ) : null}
      </LinearGradient>

      {r ? (
        <View style={cc.tiles}>
          <Tile label={r.focus ? STAT_LABELS[r.focus].toLocaleUpperCase(LOC) : L('ODAK')} icon="trending-up" value={`+${r.artis}`} sub={r.focus ? L("Şimdi {0}", [r.yeni]) : undefined} color={C.green} />
          <Tile label={L("GELİŞİM")} icon="star-four-points" value={`+${r.puan}`} sub={L("Toplam {0} puan", [s.puan])} color={C.blue} />
          <Tile label={L("SAĞLIK")} icon="heart-pulse" value={`${r.saglik}`} sub={`${r.saglikDelta >= 0 ? '+' : ''}${r.saglikDelta} kampta`} color={r.saglik < 60 ? C.orange : C.green} />
          <Tile label={L("MASRAF")} icon="cash-minus" value={r.maliyet ? `-${money(r.maliyet)}` : '$0'} sub={L("Bakiye {0}", [money(s.para)])} color={r.maliyet ? '#ff4d5e' : C.dim} />
        </View>
      ) : null}

      {r?.teknik.length ? (
        <>
          <Section>{L("TEKNİK GELİŞİMİ")}</Section>
          <View style={cc.panel}>
            {r.teknik.map((l, i) => (
              <Text key={i} style={[cc.log, i > 0 && cc.divider]}>
                {l}
              </Text>
            ))}
          </View>
        </>
      ) : null}

      {rest.length ? (
        <>
          <Section>{L("KAMP RAPORU")}</Section>
          <View style={cc.panel}>
            {rest.map((l, i) => (
              <Text key={i} style={[cc.log, i > 0 && cc.divider]}>
                {l}
              </Text>
            ))}
          </View>
        </>
      ) : null}

      {(k.haftaLog ?? []).length ? (
        <>
          <Section>{L("KAMP GÜNLÜĞÜ")}</Section>
          <View style={cc.panel}>
            {(k.haftaLog ?? []).map((l, i) => (
              <View key={i} style={[cc.campRow, i > 0 && cc.divider]}>
                <View style={cc.campDot} />
                <Text style={cc.log}>{l}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <SkillPanel s={s} act={act} title={L("DÖVÜŞTEN ÖNCE GÜÇLEN")} />
      <TechniquePanel s={s} act={act} />
    </Screen>
  );
}

const cc = StyleSheet.create({
  hero: { borderRadius: R + 4, borderWidth: 1, borderColor: '#3a1a20', padding: 14, marginBottom: 12, alignItems: 'center' },
  kicker: { color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 3 },
  big: { color: C.text, fontFamily: F.display, fontSize: 40, lineHeight: 46 },
  sub: { color: C.dim, fontFamily: F.body, fontSize: 13, marginBottom: 10 },
  tl: { alignSelf: 'stretch' },
  tlRow: { flexDirection: 'row', gap: 3 },
  cell: { flex: 1, height: 22, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cellIcon: { fontSize: 11 },
  evDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3aa8ff' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' },
  legendText: { color: C.faint, fontFamily: F.body, fontSize: 10 },
  title: { color: C.text, fontFamily: F.display, fontSize: 20, marginBottom: 4 },
  hint: { color: C.faint, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginBottom: 10 },
  len: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 8 },
  lenWeeks: { width: 56, alignItems: 'center' },
  lenNum: { color: C.text, fontFamily: F.display, fontSize: 30, lineHeight: 34 },
  lenUnit: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1.5 },
  lenTitle: { color: C.text, fontFamily: F.semi, fontSize: 14 },
  lenMeta: { color: C.faint, fontFamily: F.body, fontSize: 12, marginTop: 2 },
  weekHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  weekTitle: { color: C.text, fontFamily: F.display, fontSize: 26 },
  weekSub: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  event: { borderRadius: R, borderWidth: 1, borderColor: '#1d4a7a', padding: 12, marginBottom: 10, gap: 8 },
  eventTitle: { color: '#3aa8ff', fontFamily: F.display, fontSize: 15, letterSpacing: 1 },
  eventText: { color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  opt: { backgroundColor: '#0c0f14', borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: 10 },
  optTitle: { color: C.text, fontFamily: F.display, fontSize: 15 },
  optDesc: { color: C.faint, fontFamily: F.body, fontSize: 12, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  act: { width: '48.8%', flexGrow: 1, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, gap: 4 },
  actTitle: { color: C.text, fontFamily: F.display, fontSize: 16 },
  actDesc: { color: C.faint, fontFamily: F.body, fontSize: 11, lineHeight: 15 },
  panel: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 8 },
  panelTitle: { color: C.text, fontFamily: F.display, fontSize: 15, marginBottom: 6 },
  techRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border },
  techName: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 14 },
  techLv: { color: C.gold, fontFamily: F.display, fontSize: 13 },
  back: { color: C.dim, fontFamily: F.display, fontSize: 12, letterSpacing: 1 },
  log: { flex: 1, color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19, paddingVertical: 6 },
  divider: { borderTopWidth: 1, borderTopColor: C.border },
  campRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  drill: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#15120a', borderRadius: R, borderWidth: 1, borderColor: C.goldDeep, padding: 12, marginBottom: 10 },
  drillIcon: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: C.goldDeep, alignItems: 'center', justifyContent: 'center' },
  drillKicker: { color: C.gold, fontFamily: F.display, fontSize: 10, letterSpacing: 1.5 },
  drillTitle: { color: C.text, fontFamily: F.display, fontSize: 17 },
  drillDesc: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  campDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d99a3a' },
  sumHero: { marginHorizontal: -16, marginTop: -16, paddingTop: 22, paddingHorizontal: 16, paddingBottom: 20, alignItems: 'center', marginBottom: 12 },
  glowLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  sumOrg: { color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 3, marginBottom: 10 },
  sumKicker: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 2, paddingHorizontal: 12, paddingVertical: 4, transform: [{ skewX: '-10deg' }] },
  sumKickerText: { fontFamily: F.display, fontSize: 13, letterSpacing: 3 },
  sumTitle: { color: '#fff', fontFamily: F.display, fontSize: 54, lineHeight: 62, marginTop: 6, textShadowColor: 'rgba(62,207,122,0.45)', textShadowRadius: 20 },
  sumVs: { color: C.dim, fontFamily: F.display, fontSize: 14, letterSpacing: 1.5 },
  planTag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, borderWidth: 1, borderColor: C.goldDeep, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  planText: { color: C.gold, fontFamily: F.display, fontSize: 11, letterSpacing: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  tile: { width: '48.8%', flexGrow: 1, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12 },
  tileLabel: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1.5 },
  tileVal: { fontFamily: F.display, fontSize: 26, marginTop: 2 },
  tileSub: { color: C.faint, fontFamily: F.body, fontSize: 11 },
});
