// Kendi salonun: salonu aç / büyüt, öğrenci yetiştir, maçlarında köşede dur.
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { announce } from '../announcer';
import { sfx } from '../audio';
import {
  BEKLEME,
  canOpenGym,
  GYM_MIN_FOLLOWERS,
  gymStageOk,
  CORNER_CALLS,
  boutPlans,
  describeStyle,
  finishBout,
  GYM_LEVELS,
  gymLevel,
  gymName,
  gymRanking,
  gymScore,
  openGym,
  potStars,
  power,
  releaseStudent,
  signCost,
  signStudent,
  startBout,
  TIERS,
  upgradeGym,
  weeklyGymNet,
  type BoutOutcome,
  type CornerCall,
  type RankRow,
  type Student,
} from '../engine/academy';
import { money } from '../engine/career';
import { fmtFollowers, followers } from '../engine/fame';
import { WEIGHT_CLASSES } from '../engine/data';
import { PLANS } from '../engine/fight';
import { lookFor } from '../engine/tale';
import type { GameState, PlanKey } from '../engine/types';
import { buzz } from '../haptics';
import { L, LOC } from '../i18n';
import { Bar, Button, Card, Choice, Icon, P, Pill, Screen, Section, SLANT, type IconName } from './components';
import { FighterAvatar } from './FighterAvatar';
import type { Act } from './GameScreens';
import { C, F, R } from './theme';

const TIER_COLOR = { amator: C.dim, bolgesel: C.blue, buyuk: C.orange, ucc: C.gold } as const;

const studentLook = (x: Student) => lookFor({ id: x.id, uyruk: x.uyruk, kadin: x.kadin });

function Stars({ n, of = 5, color = C.gold }: { n: number; of?: number; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {Array.from({ length: of }, (_, i) => (
        <Icon key={i} name={i < n ? 'star' : 'star-outline'} size={13} color={i < n ? color : C.faint} />
      ))}
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={gy.stat}>
      <Text style={gy.statLabel}>{label}</Text>
      <Text style={[gy.statVal, color ? { color } : null]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

// ---------- Salon yokken ----------

function OpenGym({ s, act }: { s: GameState; act: Act }) {
  const cost = GYM_LEVELS[0].maliyet;
  const ok = canOpenGym(s);
  const rich = s.para >= cost;
  return (
    <Screen footer={<Button label={L("Ana ekrana dön")} icon="arrow-left" tone="ghost" onPress={() => act((x) => (x.phase = 'hub'))} />}>
      <LinearGradient colors={['#2a1d06', '#0e0c07', '#08090b']} style={gy.hero}>
        <View style={gy.heroIcon}>
          <Icon name="weight-lifter" size={44} color={C.gold} />
        </View>
        <Text style={gy.kicker}>{L("YENİ")}</Text>
        <Text style={[gy.title, SLANT]}>{L("KENDİ SALONUN")}</Text>
        <Text style={gy.heroText}>{gymName(s)}</Text>
      </LinearGradient>
      <Card accent={C.gold}>
        {[
          ['account-group', L("Üyeler aidat öder: salonun ünü ve senin şöhretin büyüdükçe gelir artar.")],
          ['school', L("Genç yetenekleri kaydet, salonda her hafta gelişsinler.")],
          ['bullhorn', L("Maçlarında köşelerinde dur: oyun planını ve raunt arası talimatı sen verirsin.")],
          ['trophy', L("Amatörden UCC'ye çıkar: her terfi salonun adını büyütür, maç ücretlerinden pay alırsın.")],
        ].map(([icon, t]) => (
          <View key={icon} style={gy.bullet}>
            <Icon name={icon as IconName} size={18} color={C.gold} />
            <Text style={gy.bulletText}>{t}</Text>
          </View>
        ))}
      </Card>
      <Card accent={ok ? C.green : C.orange}>
        <Text style={gy.cardKicker}>{L("AÇILIŞ ŞARTLARI")}</Text>
        {[
          [gymStageOk(s), L("Büyük organizasyonda ya da UCC'de dövüşmek")],
          [followers(s) >= GYM_MIN_FOLLOWERS, L("En az {0} takipçi (şu an {1})", [fmtFollowers(GYM_MIN_FOLLOWERS), fmtFollowers(followers(s))])],
          [rich, L("Açılış için {0} (şu an {1})", [money(cost), money(s.para)])],
        ].map(([done, t]) => (
          <View key={t as string} style={gy.bullet}>
            <Icon name={done ? 'check-circle' : 'circle-outline'} size={18} color={done ? C.green : C.faint} />
            <Text style={[gy.bulletText, !done && { color: C.dim }]}>{t as string}</Text>
          </View>
        ))}
      </Card>
      <Button label={L("Salonu aç · {0}", [money(cost)])} icon="key" tone="gold" disabled={!ok || !rich} onPress={() => act(openGym)} />
    </Screen>
  );
}

// ---------- Öğrenci kartı ----------

function StudentCard({ st, onRelease }: { st: Student; onRelease?: () => void }) {
  const [sure, setSure] = useState(false);
  const pw = power(st.stats);
  return (
    <View style={gy.student}>
      <View style={gy.row}>
        <FighterAvatar look={studentLook(st)} size={50} ring={TIER_COLOR[st.seviye]} />
        <View style={{ flex: 1 }}>
          <Text style={gy.nick}>“{st.lakap.toLocaleUpperCase(LOC)}”</Text>
          <Text style={gy.name} numberOfLines={1}>
            {st.ad} {st.soyad}
          </Text>
          <Text style={gy.meta} numberOfLines={1}>
            {st.yas} · {WEIGHT_CLASSES[st.siklet].ad} · {st.uyruk}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Pill text={st.sampiyon ? L("👑 ŞAMPİYON") : TIERS[st.seviye].ad.toLocaleUpperCase(LOC)} color={st.sampiyon ? C.gold : TIER_COLOR[st.seviye]} />
          <Text style={gy.record}>
            {st.rekor.g}-{st.rekor.m}-{st.rekor.b}
          </Text>
        </View>
      </View>
      <Bar value={pw} color={C.green} label={L("GÜÇ {0}", [pw])} />
      <View style={[gy.row, { justifyContent: 'space-between', marginTop: 2 }]}>
        <View style={[gy.row, { gap: 6 }]}>
          <Text style={gy.meta}>{L("Potansiyel")}</Text>
          <Stars n={potStars(st)} />
        </View>
        <Text style={gy.meta}>
          {st.mac ? L("🥊 Maç günü!") : L("Sıradaki maç: {0} hafta", [Math.max(1, st.macHafta)])}
        </Text>
      </View>
      <Bar value={st.moral} color={st.moral < 30 ? C.red : st.moral < 60 ? C.orange : C.blue} label={L("MORAL")} />
      {onRelease ? (
        sure ? (
          <View style={[gy.row, { gap: 8, marginTop: 6 }]}>
            <View style={{ flex: 1 }}>
              <Button label={L("Vazgeç")} tone="ghost" onPress={() => setSure(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={L("Yollarını ayır")} onPress={onRelease} />
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setSure(true)} hitSlop={6} style={{ alignSelf: 'flex-end', marginTop: 4 }}>
            <Text style={gy.link}>{L("Yollarını ayır")}</Text>
          </Pressable>
        )
      ) : null}
    </View>
  );
}

// ---------- Köşede dur ----------

type BoutView = { st: Student; rakip: NonNullable<Student['mac']>['rakip']; plans: PlanKey[] };

function BoutModal({ s, view, act, onClose }: { s: GameState; view: BoutView; act: Act; onClose: () => void }) {
  const { st, rakip, plans } = view;
  const live = s.salon?.ogrenciler.find((x) => x.id === st.id);
  const r1 = live?.mac?.r1;
  const [out, setOut] = useState<BoutOutcome | null>(null);
  const step = out ? 'sonuc' : r1 ? 'kose' : 'plan';
  const rakipLook = lookFor({ id: st.id + rakip.soyad, uyruk: rakip.uyruk, kadin: rakip.kadin });

  const finish = (call: CornerCall) => {
    const box: { r: BoutOutcome | null } = { r: null };
    act((x) => {
      box.r = finishBout(x, st.id, call);
    });
    const res = box.r;
    if (!res) return;
    setOut(res);
    sfx(res.kazandi ? 'win' : 'lose');
    buzz(res.kazandi ? 'basari' : 'hata');
    if (res.kazandi) void announce(L("Kazanan… {0}!", [`${st.ad}, "${st.lakap}", ${st.soyad}`]));
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={gy.modal}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <View style={gy.vs}>
            <View style={gy.vsSide}>
              <FighterAvatar look={studentLook(st)} size={64} ring={C.red} />
              <Text style={gy.vsName} numberOfLines={1}>
                {st.soyad.toLocaleUpperCase(LOC)}
              </Text>
              <Text style={gy.meta}>
                {st.rekor.g}-{st.rekor.m} · {L("GÜÇ {0}", [power(st.stats)])}
              </Text>
            </View>
            <Text style={[gy.vsText, SLANT]}>VS</Text>
            <View style={gy.vsSide}>
              <FighterAvatar look={rakipLook} size={64} ring={C.blue} />
              <Text style={gy.vsName} numberOfLines={1}>
                {rakip.soyad.toLocaleUpperCase(LOC)}
              </Text>
              <Text style={gy.meta}>
                {rakip.rekor.g}-{rakip.rekor.m} · {L("GÜÇ {0}", [power(rakip.stats)])}
              </Text>
            </View>
          </View>
          <Text style={gy.tier}>{TIERS[st.seviye].ad.toLocaleUpperCase(LOC)} · {WEIGHT_CLASSES[st.siklet].ad.toLocaleUpperCase(LOC)}</Text>

          {step === 'plan' ? (
            <>
              <Card accent={C.blue}>
                <Text style={gy.cardKicker}>{L("KEŞİF RAPORU")}</Text>
                <Text style={gy.cardText}>{describeStyle(rakip)}</Text>
              </Card>
              <Text style={gy.q}>{L("Oyun planını sen belirle:")}</Text>
              {plans.map((p) => (
                <Choice key={p} icon={PLANS[p].ikon as IconName} label={PLANS[p].ad} desc={PLANS[p].aciklama} tone="gold" onPress={() => act((x) => startBout(x, st.id, p))} />
              ))}
            </>
          ) : step === 'kose' && r1 ? (
            <>
              <Card accent={r1.onde ? C.green : C.red}>
                <Text style={gy.cardKicker}>{L("RAUNT ARASI")}</Text>
                <Text style={gy.cardText}>{r1.metin}</Text>
              </Card>
              <Text style={gy.q}>{L("{0} köşede sana bakıyor. Talimatın ne?", [st.ad])}</Text>
              {(Object.keys(CORNER_CALLS) as CornerCall[]).map((c) => (
                <Choice key={c} icon={CORNER_CALLS[c].ikon as IconName} label={CORNER_CALLS[c].ad} desc={CORNER_CALLS[c].aciklama} onPress={() => finish(c)} />
              ))}
            </>
          ) : out ? (
            <>
              <LinearGradient colors={out.kazandi ? ['#10301f', '#08140e'] : ['#301014', '#140809']} style={gy.result}>
                <Text style={[gy.resultTitle, SLANT, { color: out.kazandi ? C.green : C.red }]}>{out.kazandi ? L("KAZANDI!") : L("KAYBETTİ")}</Text>
                <Text style={gy.meta}>{out.yontem}</Text>
              </LinearGradient>
              <Card>
                {out.satirlar.map((l, i) => (
                  <Text key={i} style={[gy.cardText, i > 0 && gy.divider]}>
                    {l}
                  </Text>
                ))}
              </Card>
            </>
          ) : null}
        </ScrollView>
        <View style={gy.modalFooter}>
          {out ? <Button label={L("Salona dön")} icon="check" tone="gold" onPress={onClose} /> : <Button label={L("Sonra")} tone="ghost" onPress={onClose} />}
        </View>
      </View>
    </Modal>
  );
}

// ---------- Salon sıralaması ----------

function RankTable({ rows, sira, puan }: { rows: RankRow[]; sira: number; puan: number }) {
  const [all, setAll] = useState(false);
  // Kısa görünüm: ilk 5 ve senin çevren (bir üst, bir alt).
  const show = all ? rows.map((_, i) => i) : [...new Set([0, 1, 2, 3, 4, sira - 2, sira - 1, sira].filter((i) => i >= 0 && i < rows.length))].sort((a, b) => a - b);
  return (
    <>
      <Section>{L("SALON SIRALAMASI")}</Section>
      <View style={gy.table}>
        {show.map((i, k) => {
          const r = rows[i];
          const gap = k > 0 && i - show[k - 1] > 1;
          return (
            <View key={r.id}>
              {gap ? <Text style={gy.gap}>⋯</Text> : null}
              <View style={[gy.rankRow, r.sen && gy.rankMe]}>
                <Text style={[gy.rankNo, i < 3 && { color: [C.gold, '#c0c6cf', '#cd7f32'][i] }]}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[gy.rankName, r.sen && { color: C.gold }]} numberOfLines={1}>
                    {r.ad}
                    {r.sen ? L(" (SEN)") : ''}
                  </Text>
                  <Text style={gy.meta} numberOfLines={1}>
                    {r.ulke}
                  </Text>
                </View>
                <Text style={[gy.rankPts, r.sen && { color: C.gold }]}>{r.puan.toLocaleString(LOC)}</Text>
              </View>
            </View>
          );
        })}
        <Pressable onPress={() => setAll(!all)} hitSlop={6} style={{ alignSelf: 'center', paddingTop: 8 }}>
          <Text style={gy.link}>{all ? L("Kısalt") : L("Tüm sıralamayı gör ({0} salon)", [rows.length])}</Text>
        </Pressable>
      </View>
      <Text style={gy.hint}>{L("Puanın {0}. Ün, salon seviyesi, üyeler, öğrencilerinin galibiyetleri, UCC'ye çıkanlar ve şampiyonlar puan kazandırır.", [puan.toLocaleString(LOC)])}</Text>
    </>
  );
}

// ---------- Salon ----------

export function GymScreen({ s, act }: { s: GameState; act: Act }) {
  const [bout, setBout] = useState<BoutView | null>(null);
  const g = s.salon;
  if (!g) return <OpenGym s={s} act={act} />;
  const lv = gymLevel(g);
  const next = GYM_LEVELS[g.seviye];
  const net = weeklyGymNet(g);
  const full = g.ogrenciler.length >= lv.kapasite;
  const bouts = g.ogrenciler.filter((x) => x.mac);
  const yeniAday = Math.max(0, 8 - (s.hafta - (g.adaylar?.hafta ?? s.hafta)));
  const rank = gymRanking(s);

  return (
    <Screen footer={<Button label={L("Ana ekrana dön")} icon="arrow-left" tone="ghost" onPress={() => act((x) => (x.phase = 'hub'))} />}>
      <LinearGradient colors={['#2a1d06', '#0e0c07', '#08090b']} style={gy.hero}>
        <Text style={gy.kicker}>{lv.ad.toLocaleUpperCase(LOC)}</Text>
        <Text style={[gy.title, SLANT]} numberOfLines={2} adjustsFontSizeToFit>
          {g.ad.toLocaleUpperCase(LOC)}
        </Text>
        <Stars n={g.seviye} />
        <View style={gy.rankPill}>
          <Icon name="podium-gold" size={14} color={C.gold} />
          <Text style={gy.rankPillText}>{L("DÜNYA SIRALAMASI #{0} / {1}", [rank.sira, rank.rows.length])}</Text>
        </View>
        <View style={gy.stats}>
          <Stat label={L("ÜYE")} value={`${g.uye}/${lv.maxUye}`} />
          <Stat label={L("HAFTALIK")} value={`${net >= 0 ? '+' : '-'}${money(Math.abs(net))}`} color={net >= 0 ? C.green : C.red} />
          <Stat label={L("ÖĞRENCİ")} value={`${g.ogrenciler.length}/${lv.kapasite}`} />
          <Stat label={L("ÜN")} value={`${Math.round(g.un)}`} color={C.gold} />
        </View>
        <View style={{ alignSelf: 'stretch' }}>
          <Bar value={g.un} color={C.gold} />
        </View>
        {g.uccSayisi || g.sampiyonSayisi ? (
          <Text style={gy.meta}>
            {L("UCC'ye çıkan öğrenci: {0}", [g.uccSayisi ?? 0])}
            {g.sampiyonSayisi ? L(" · Şampiyon: {0}", [g.sampiyonSayisi]) : ''}
          </Text>
        ) : null}
      </LinearGradient>

      {bouts.length ? (
        <>
          <Section>{L("MAÇ GÜNÜ")}</Section>
          {bouts.map((st) => (
            <Pressable
              key={st.id}
              onPress={() => setBout({ st, rakip: st.mac!.rakip, plans: boutPlans(st.mac!) })}
              style={({ pressed }) => [gy.bout, pressed && { borderColor: C.gold }]}
            >
              <FighterAvatar look={studentLook(st)} size={42} ring={C.red} />
              <View style={{ flex: 1 }}>
                <Text style={gy.boutTitle} numberOfLines={1}>
                  {st.soyad} vs {st.mac!.rakip.soyad}
                </Text>
                <Text style={gy.meta}>{L("{0} · {1} hafta içinde gelmezsen ekip köşede durur", [TIERS[st.seviye].ad, Math.max(1, BEKLEME - (s.hafta - st.mac!.hafta))])}</Text>
              </View>
              <View style={gy.boutBtn}>
                <Icon name="bullhorn" size={16} color="#1f1605" />
                <Text style={gy.boutBtnText}>{L("KÖŞE")}</Text>
              </View>
            </Pressable>
          ))}
        </>
      ) : null}

      <RankTable rows={rank.rows} sira={rank.sira} puan={gymScore(g)} />

      <Section>{L("ÖĞRENCİLER ({0}/{1})", [g.ogrenciler.length, lv.kapasite])}</Section>
      {g.ogrenciler.length ? (
        g.ogrenciler.map((st) => <StudentCard key={st.id} st={{ ...st, macHafta: st.macHafta - s.hafta }} onRelease={() => act((x) => releaseStudent(x, st.id))} />)
      ) : (
        <P dim>{L("Henüz öğrencin yok. Aşağıdaki yetenek avından ilk öğrencini seç.")}</P>
      )}

      <Section>{L("YETENEK AVI")}</Section>
      {full ? <P dim>{L("Salon dolu. Daha fazla öğrenci için salonu büyüt.")}</P> : null}
      {(g.adaylar?.list ?? []).map((c) => {
        const cost = signCost(c);
        return (
          <View key={c.id} style={gy.student}>
            <View style={gy.row}>
              <FighterAvatar look={studentLook(c)} size={46} ring={C.border} />
              <View style={{ flex: 1 }}>
                <Text style={gy.name} numberOfLines={1}>
                  {c.ad} {c.soyad}
                </Text>
                <Text style={gy.meta} numberOfLines={1}>
                  {c.yas} · {WEIGHT_CLASSES[c.siklet].ad} · {c.uyruk}
                </Text>
                <Text style={gy.meta} numberOfLines={2}>
                  {describeStyle(c)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={gy.record}>{L("GÜÇ {0}", [power(c.stats)])}</Text>
                <Stars n={potStars(c)} />
              </View>
            </View>
            <Button label={L("Kaydet · {0}", [money(cost)])} icon="draw-pen" tone="gold" disabled={full || s.para < cost} onPress={() => act((x) => signStudent(x, c.id))} />
          </View>
        );
      })}
      <Text style={gy.hint}>{L("Yıldızlar hocanın gözüyle potansiyel. Yeni adaylar {0} hafta sonra.", [yeniAday])}</Text>

      {next ? (
        <>
          <Section>{L("SALONU BÜYÜT")}</Section>
          <Card accent={C.gold}>
            <Text style={gy.cardKicker}>{next.ad.toLocaleUpperCase(LOC)}</Text>
            <Text style={gy.cardText}>{L("{0} öğrenci kapasitesi · en fazla {1} üye · %{2} daha hızlı gelişim · haftalık kira {3}", [next.kapasite, next.maxUye, Math.round((next.gelisim / lv.gelisim - 1) * 100), money(next.kira)])}</Text>
            <Button label={L("Büyüt · {0}", [money(next.maliyet)])} icon="arrow-up-bold" tone="gold" disabled={s.para < next.maliyet} onPress={() => act(upgradeGym)} />
          </Card>
        </>
      ) : null}

      {g.sonuclar.length ? (
        <>
          <Section>{L("SON MAÇLAR")}</Section>
          <Card>
            {g.sonuclar.slice(0, 8).map((r, i) => (
              <Text key={i} style={[gy.cardText, i > 0 && gy.divider]}>
                {r.kazandi ? '✅' : '❌'} {r.ogrenci} vs {r.rakip} · {r.yontem}
                {r.kose ? '' : L(" (ekip)")}
              </Text>
            ))}
          </Card>
        </>
      ) : null}

      {bout ? <BoutModal s={s} view={bout} act={act} onClose={() => setBout(null)} /> : null}
    </Screen>
  );
}

const gy = StyleSheet.create({
  hero: { borderRadius: R + 4, borderWidth: 1, borderColor: '#4a3810', padding: 16, alignItems: 'center', gap: 6, marginBottom: 12 },
  heroIcon: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: C.goldDeep, alignItems: 'center', justifyContent: 'center', backgroundColor: '#15120a', marginBottom: 4 },
  kicker: { color: C.gold, fontFamily: F.display, fontSize: 11, letterSpacing: 3 },
  title: { color: '#fff', fontFamily: F.display, fontSize: 30, lineHeight: 36, textAlign: 'center' },
  heroText: { color: C.dim, fontFamily: F.semi, fontSize: 14 },
  stats: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 8 },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { color: C.faint, fontFamily: F.display, fontSize: 9, letterSpacing: 1.5 },
  statVal: { color: C.text, fontFamily: F.display, fontSize: 18 },
  bullet: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginVertical: 5 },
  bulletText: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  student: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 8, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nick: { color: C.gold, fontFamily: F.displayMed, fontSize: 10, letterSpacing: 1 },
  name: { color: C.text, fontFamily: F.display, fontSize: 17 },
  meta: { color: C.faint, fontFamily: F.body, fontSize: 12 },
  record: { color: C.text, fontFamily: F.display, fontSize: 15 },
  link: { color: C.faint, fontFamily: F.semi, fontSize: 12, textDecorationLine: 'underline' },
  hint: { color: C.faint, fontFamily: F.body, fontSize: 11, textAlign: 'center', marginBottom: 8 },
  bout: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1a0c10', borderRadius: R, borderWidth: 1, borderColor: '#5a1a22', padding: 12, marginBottom: 8 },
  boutTitle: { color: C.text, fontFamily: F.display, fontSize: 16 },
  boutBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.gold, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  boutBtnText: { color: '#1f1605', fontFamily: F.display, fontSize: 12, letterSpacing: 1 },
  rankPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.goldDeep, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 4 },
  rankPillText: { color: C.gold, fontFamily: F.display, fontSize: 11, letterSpacing: 1 },
  table: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 8, marginBottom: 4 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingHorizontal: 6, borderRadius: 8 },
  rankMe: { backgroundColor: '#2a1d06', borderWidth: 1, borderColor: C.goldDeep },
  rankNo: { width: 26, textAlign: 'center', color: C.dim, fontFamily: F.display, fontSize: 16 },
  rankName: { color: C.text, fontFamily: F.semi, fontSize: 14 },
  rankPts: { color: C.dim, fontFamily: F.display, fontSize: 15 },
  gap: { color: C.faint, textAlign: 'center', fontSize: 14, lineHeight: 14 },
  modal: { flex: 1, backgroundColor: C.bg, width: '100%', maxWidth: 560, alignSelf: 'center' },
  modalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: C.border },
  vs: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  vsSide: { flex: 1, alignItems: 'center', gap: 4 },
  vsName: { color: C.text, fontFamily: F.display, fontSize: 18 },
  vsText: { color: C.gold, fontFamily: F.display, fontSize: 30 },
  tier: { color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 2, textAlign: 'center' },
  cardKicker: { color: C.gold, fontFamily: F.display, fontSize: 11, letterSpacing: 2, marginBottom: 4 },
  cardText: { color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20, paddingVertical: 4 },
  divider: { borderTopWidth: 1, borderTopColor: C.border },
  q: { color: C.text, fontFamily: F.display, fontSize: 16, marginTop: 4 },
  result: { borderRadius: R + 4, padding: 18, alignItems: 'center' },
  resultTitle: { fontFamily: F.display, fontSize: 40 },
});
