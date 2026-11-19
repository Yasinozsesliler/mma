import { L, LOC } from '../i18n';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLook } from '../lookPref';
import { SCENE_ART } from './sceneArt';
import { money } from '../engine/career';
import { AGENTS, COUNTRIES } from '../engine/data';
import { acceptSponsor, brandById, rejectSponsor, sponsorSlots, startHaggle } from '../engine/sponsors';
import { HagglePanel } from './HagglePanel';
import { agentSeverance, agentSigning, agentUnlocked, availableGyms, fireAgent, hireAgent, switchGym } from '../engine/team';
import type { GameState } from '../engine/types';
import { STAT_LABELS } from '../engine/types';
import { Button, Card, Icon, OctIcon, P, Pill, Screen, Section, SLANT, Title } from './components';
import type { Act } from './GameScreens';
import { StaffPanel } from './StaffPanel';
import { bondColor, bondLabel } from '../engine/coachBond';
import { CoverImage } from './CoverImage';
import { C, F, R } from './theme';

function Stars({ n }: { n: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 10 }, (_, i) => (
        <View key={i} style={[tm.star, { backgroundColor: i < n ? C.gold : C.border }]} />
      ))}
    </View>
  );
}

/** 10 üzerinden kaliteyi beş yıldızla gösterir (yarım yıldız dahil). */
function StarRow({ n }: { n: number }) {
  const v = Math.max(0, Math.min(10, n)) / 2;
  return (
    <View style={{ flexDirection: 'row', gap: 1, marginTop: 3 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <Icon key={i} name={v >= i + 1 ? 'star' : v >= i + 0.5 ? 'star-half-full' : 'star-outline'} size={15} color={C.gold} />
      ))}
    </View>
  );
}

export function TeamScreen({ s, act }: { s: GameState; act: Act }) {
  const yeni = useLook() === 'yeni';
  const [tab, setTab] = useState<'salon' | 'menajer' | 'sponsor' | 'kadro'>((s.sponsorTeklif ?? []).length ? 'sponsor' : 'kadro');
  const [msg, setMsg] = useState<string | null>(null);
  const gyms = availableGyms(s);
  const bond = s.hoca && s.hoca.ad === s.takim.antrenor ? s.hoca : { bag: 55 };
  return (
    <Screen footer={<Button label={L("Kariyere dön")} icon="arrow-left" tone="ghost" onPress={() => act((x) => (x.phase = 'hub'))} />}>
      <Title art="salon" kicker={L("KÖŞENDEKİLER")} sub={L("Antrenörün kampta ne kadar gelişeceğini, menajerin ne kadar kazanacağını belirler.")}>
        
        {L("Takım")}
      </Title>
      {yeni ? (
        <View style={{ gap: 10, marginBottom: 12 }}>
          {/* Köşe kartı: antrenör */}
          <View style={[tm.corner, { borderColor: C.red + '88' }]}>
            <CoverImage source={SCENE_ART.salon.src} iw={SCENE_ART.salon.w} ih={SCENE_ART.salon.h} />
            <LinearGradient colors={['rgba(8,9,12,0.55)', 'rgba(8,9,12,0.96)']} start={{ x: 0, y: 0 }} end={{ x: 0.85, y: 0 }} style={StyleSheet.absoluteFill} />
            <View style={[tm.cornerEdge, { backgroundColor: C.red }]} />
            <View style={tm.cornerRow}>
              <OctIcon name="whistle" color={C.red} size={54} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[tm.label, { color: C.red }]}>{L("ANTRENÖRÜN")}</Text>
                <Text style={[tm.big, SLANT]} numberOfLines={1} adjustsFontSizeToFit>
                  {s.takim.antrenor.toLocaleUpperCase(LOC)}
                </Text>
                <Text style={tm.meta} numberOfLines={1}>
                  {s.takim.salon} {L("· Uzmanlık:")} {s.takim.uzmanlik ? STAT_LABELS[s.takim.uzmanlik] : '—'}
                </Text>
                <StarRow n={s.takim.antrenorKalite} />
              </View>
            </View>
            <View style={[tm.bondRow, { paddingHorizontal: 14, paddingBottom: 12 }]}>
              <Text style={tm.bondL}>{L("GÜVEN")}</Text>
              <View style={tm.bondTrack}>
                <View style={[tm.bondFill, { width: `${bond.bag}%`, backgroundColor: bondColor(bond.bag) }]} />
              </View>
              <Text style={[tm.bondT, { color: bondColor(bond.bag) }]}>{bondLabel(bond.bag)}</Text>
            </View>
          </View>
          {/* Köşe kartı: menajer */}
          <View style={[tm.corner, { borderColor: C.blue + '88' }]}>
            <CoverImage source={SCENE_ART.sehir.src} iw={SCENE_ART.sehir.w} ih={SCENE_ART.sehir.h} align="bottom" />
            <LinearGradient colors={['rgba(8,9,12,0.55)', 'rgba(8,9,12,0.96)']} start={{ x: 0, y: 0 }} end={{ x: 0.85, y: 0 }} style={StyleSheet.absoluteFill} />
            <View style={[tm.cornerEdge, { backgroundColor: C.blue }]} />
            <View style={[tm.cornerRow, { paddingBottom: 12 }]}>
              <OctIcon name="account-tie" color={C.blue} size={54} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[tm.label, { color: C.blue }]}>{L("MENAJERİN")}</Text>
                <Text style={[tm.big, SLANT]} numberOfLines={1} adjustsFontSizeToFit>
                  {(s.takim.menajer ?? L('YOK')).toLocaleUpperCase(LOC)}
                </Text>
                {s.takim.menajer ? (
                  <>
                    <Text style={tm.meta}>
                      {L("Kalite")} {s.takim.menajerKalite}{L("/10 · Komisyon %")}{Math.round(s.takim.menajerPay * 100)}
                    </Text>
                    <StarRow n={s.takim.menajerKalite} />
                  </>
                ) : (
                  <Text style={tm.meta}>{L("Pazarlıkları tek başına yapıyorsun.")}</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      ) : (
      <Card accent={C.red}>
          <Text style={tm.label}>{L("SALON VE ANTRENÖR")}</Text>
          <Text style={[tm.big, SLANT]}>{s.takim.salon.toLocaleUpperCase(LOC)}</Text>
          <Text style={tm.meta}>
            {s.takim.antrenor} {L("· Uzmanlık:")}{' '}{s.takim.uzmanlik ? STAT_LABELS[s.takim.uzmanlik] : '—'}
          </Text>
          <Stars n={s.takim.antrenorKalite} />
          <View style={tm.bondRow}>
            <Text style={tm.bondL}>{L("GÜVEN")}</Text>
            <View style={tm.bondTrack}>
              <View style={[tm.bondFill, { width: `${bond.bag}%`, backgroundColor: bondColor(bond.bag) }]} />
            </View>
            <Text style={[tm.bondT, { color: bondColor(bond.bag) }]}>{bondLabel(bond.bag)}</Text>
          </View>
          <Text style={tm.bondHint}>{L("Kazandıkça ve onun planına uydukça güven artar. Çok yüksek güven köşede IQ +1 verir; çok düşükse köşe soğur.")}</Text>
          <Text style={[tm.label, { marginTop: 12 }]}>{L("MENAJER")}</Text>
          <Text style={[tm.big, SLANT, { fontSize: 18 }]}>{s.takim.menajer ?? L('YOK')}</Text>
          {s.takim.menajer ? (
            <Text style={tm.meta}>
              
              {L("Kalite")}{' '}{s.takim.menajerKalite}{L("/10 · Komisyon %")}{Math.round(s.takim.menajerPay * 100)}
            </Text>
          ) : (
            <Text style={tm.meta}>{L("Pazarlıkları tek başına yapıyorsun.")}</Text>
          )}
        </Card>
      )}
      {msg ? (
        <Card accent={C.gold}>
          <P style={{ marginBottom: 0 }}>{msg}</P>
        </Card>
      ) : null}
      <View style={tm.tabs}>
        {(['kadro', 'salon', 'menajer', 'sponsor'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[tm.tab, tab === t && tm.tabOn]}>
            <Text style={[tm.tabText, tab === t && { color: '#fff' }]}>
              {t === 'kadro' ? L("KADRO") : t === 'salon' ? L("SALON") : t === 'menajer' ? L("MENAJER") : L("SPONSOR{0}", [(s.sponsorTeklif ?? []).length ? ` (${(s.sponsorTeklif ?? []).length})` : ''])}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'kadro' ? (
        <StaffPanel s={s} act={act} onMsg={setMsg} />
      ) : tab === 'sponsor' ? (
        <>
          <Section>{L("AKTİF SPONSORLAR · {0}/{1} SLOT", [(s.sponsorlar ?? []).length, sponsorSlots(s)])}</Section>
          {(s.sponsorlar ?? []).length === 0 ? <P dim>{L("Henüz sponsorun yok. Dövüş kazandıkça ve popülerleştikçe markalar kapını çalar.")}</P> : null}
          {(s.sponsorlar ?? []).map((d) => {
            const b = brandById(d.marka)!;
            return (
              <View key={d.id} style={[tm.card, { borderColor: C.green + '88' }]}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <OctIcon name={b.ikon as never} color={C.green} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={tm.name}>{b.ad}</Text>
                    <Text style={tm.meta}>{b.kategori} · {d.dovus} {L("dövüş kaldı")}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  <Pill text={L("Dövüş başı {0}", [money(d.dovusBasi)])} icon="cash" color={C.green} />
                  <Pill text={L("Galibiyet +{0}", [money(d.galibiyet)])} icon="trophy-outline" color={C.gold} />
                  <Pill text={L("Bitiriş +{0}", [money(d.bitiris)])} icon="fire" color={C.orange} />
                  {b.imaj ? <Pill text={L("İmaj maddesi")} icon="alert-octagon" color={C.red} /> : null}
                </View>
              </View>
            );
          })}
          <Section>{L("TEKLİFLER")}</Section>
          {(s.sponsorTeklif ?? []).length === 0 ? <P dim>{L("Bekleyen teklif yok. Her dövüşten sonra yeni markalar gelebilir.")}</P> : null}
          {(s.sponsorTeklif ?? []).map((d) => {
            const b = brandById(d.marka)!;
            return (
              <View key={d.id} style={tm.card}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <OctIcon name={b.ikon as never} color={C.gold} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={tm.name}>{b.ad}</Text>
                    <Text style={tm.meta}>{b.kategori} · {b.aciklama}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  <Pill text={L("{0} dövüş", [d.dovus])} icon="calendar-clock" color={C.dim} />
                  <Pill text={L("Dövüş başı {0}", [money(d.dovusBasi)])} icon="cash" color={C.green} />
                  <Pill text={L("Galibiyet +{0}", [money(d.galibiyet)])} icon="trophy-outline" color={C.gold} />
                  <Pill text={L("Bitiriş +{0}", [money(d.bitiris)])} icon="fire" color={C.orange} />
                  {b.imaj ? <Pill text={L("İmaj maddesi: skandalda iptal")} icon="alert-octagon" color={C.red} /> : null}
                  {b.bahis ? <Pill text={L("Tartışmalı marka: popülerlik -3")} icon="alert" color={C.red} /> : null}
                </View>
                {d.pz ? <HagglePanel d={d} act={act} setMsg={setMsg} /> : (
                <View style={[tm.footer, { gap: 8 }]}>
                  <Pressable onPress={() => act((x) => setMsg(acceptSponsor(x, d.id)))} style={({ pressed }) => [tm.btn, { opacity: pressed ? 0.7 : 1 }]}>
                    <Text style={tm.btnText}>{L("İMZALA")}</Text>
                  </Pressable>
                  {!d.pazarlik ? (
                    <Pressable onPress={() => act((x) => startHaggle(x, d.id))} style={({ pressed }) => [tm.btn, { backgroundColor: C.cardAlt, opacity: pressed ? 0.7 : 1 }]}>
                      <Text style={tm.btnText}>{L("PAZARLIK")}</Text>
                    </Pressable>
                  ) : null}
                  <Pressable onPress={() => act((x) => rejectSponsor(x, d.id))} style={({ pressed }) => [tm.btn, { backgroundColor: C.cardAlt, opacity: pressed ? 0.7 : 1 }]}>
                    <Text style={[tm.btnText, { color: C.dim }]}>{L("REDDET")}</Text>
                  </Pressable>
                </View>
                )}
              </View>
            );
          })}
        </>
      ) : tab === 'salon' ? (
        <>
          <Section>{`${COUNTRIES[s.fighter.uyruk]?.ad.toLocaleUpperCase(LOC)}${s.stage !== 'amator' ? L(" + DÜNYA ELİTİ") : ''}`}</Section>
          {gyms.map((g) => {
            const cur = s.takim.salonId === g.id;
            return (
              <View key={g.id} style={[tm.card, cur && { borderColor: C.green }]}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <OctIcon name={g.ulke === 'elit' ? 'earth' : 'whistle'} color={g.ulke === 'elit' ? C.gold : C.red} size={46} />
                  <View style={{ flex: 1 }}>
                    <Text style={tm.name}>{g.salon}</Text>
                    <Text style={tm.meta}>{g.antrenor}</Text>
                  </View>
                </View>
                <Text style={[tm.meta, { marginTop: 6 }]}>{g.aciklama}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 }}>
                  <Pill text={L("Uzmanlık: {0}", [STAT_LABELS[g.uzmanlik]])} icon="target" color={C.gold} />
                  <Pill text={L("Kamp: {0}/hafta", [money(g.kalite * 40)])} icon="cash" color={C.dim} />
                </View>
                <Stars n={g.kalite} />
                <View style={tm.footer}>
                  <Text style={[tm.price, SLANT]}>{cur ? L("MEVCUT SALONUN") : L("Geçiş: {0}", [money(g.imza)])}</Text>
                  {!cur ? (
                    <Pressable
                      disabled={s.para < g.imza}
                      onPress={() => act((x) => setMsg(switchGym(x, g.id)))}
                      style={({ pressed }) => [tm.btn, { opacity: s.para < g.imza ? 0.35 : pressed ? 0.7 : 1 }]}
                    >
                      <Text style={tm.btnText}>{s.para < g.imza ? L("PARA YETMİYOR") : L("GEÇ")}</Text>
                    </Pressable>
                  ) : (
                    <Pill text={L("AKTİF")} icon="check-decagram" color={C.green} />
                  )}
                </View>
              </View>
            );
          })}
        </>
      ) : (
        <>
          {s.takim.menajer ? (
            <Card accent={C.orange}>
              <P>{L("Yeni bir menajerle çalışmak için önce")}{' '}{s.takim.menajer} {L("ile yollarını ayırmalısın.")}</P>
              <Button label={L("Menajeri kov (tazminat {0})", [money(agentSeverance(s))])} tone="ghost" icon="account-remove" onPress={() => act((x) => setMsg(fireAgent(x)))} />
            </Card>
          ) : null}
          <Section>{L("MENAJERLER")}</Section>
          {AGENTS.map((a) => {
            const open = agentUnlocked(s, a.kalite);
            const cur = s.takim.menajer === a.ad;
            const fee = agentSigning(a.kalite);
            return (
              <View key={a.ad} style={[tm.card, cur && { borderColor: C.green }, !open && { opacity: 0.55 }]}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <OctIcon name={open ? 'account-tie' : 'lock'} color={open ? C.blue : C.faint} size={46} />
                  <View style={{ flex: 1 }}>
                    <Text style={tm.name}>{a.ad}</Text>
                    <Text style={tm.meta}>{a.aciklama}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 }}>
                  <Pill text={L("Komisyon %{0}", [Math.round(a.pay * 100)])} icon="percent" color={C.dim} />
                  <Pill text={L("Pazarlık gücü {0}/10", [a.kalite])} icon="handshake" color={C.gold} />
                </View>
                <View style={tm.footer}>
                  <Text style={[tm.price, SLANT]}>{cur ? L("MENAJERİN") : open ? L("İmza: {0}", [money(fee)]) : L("Popülerlik {0}+ gerekli", [Math.max(0, (a.kalite - 3) * 12)])}</Text>
                  {!cur && open && !s.takim.menajer ? (
                    <Pressable
                      disabled={s.para < fee}
                      onPress={() => act((x) => setMsg(hireAgent(x, a.ad)))}
                      style={({ pressed }) => [tm.btn, { opacity: s.para < fee ? 0.35 : pressed ? 0.7 : 1 }]}
                    >
                      <Text style={tm.btnText}>{s.para < fee ? L("PARA YETMİYOR") : L("ANLAŞ")}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
        </>
      )}
    </Screen>
  );
}

const tm = StyleSheet.create({
  corner: { borderWidth: 1.2, borderRadius: 6, overflow: 'hidden', backgroundColor: '#0b0c10' },
  cornerEdge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cornerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 },
  label: { color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 1.5 },
  big: { color: C.text, fontFamily: F.display, fontSize: 22 },
  meta: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  star: { width: 14, height: 5, borderRadius: 1, marginTop: 6, transform: [{ skewX: '-15deg' }] },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 4, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, transform: [{ skewX: '-8deg' }] },
  tabOn: { backgroundColor: C.red, borderColor: C.red },
  tabText: { color: C.dim, fontFamily: F.display, fontSize: 11, letterSpacing: 0.6 },
  card: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10 },
  name: { color: C.text, fontFamily: F.display, fontSize: 17, textTransform: 'uppercase' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
  price: { color: C.gold, fontFamily: F.display, fontSize: 15 },
  btn: { backgroundColor: C.red, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 3, transform: [{ skewX: '-10deg' }] },
  btnText: { color: '#fff', fontFamily: F.display, fontSize: 13, letterSpacing: 1 },
  bondRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  bondL: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1.5 },
  bondTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#1f2228', overflow: 'hidden' },
  bondFill: { height: 6, borderRadius: 3 },
  bondT: { fontFamily: F.semi, fontSize: 12 },
  bondHint: { color: C.faint, fontFamily: F.body, fontSize: 11, lineHeight: 16, marginTop: 4 },
});
