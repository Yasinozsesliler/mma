// Antrenör Modu: dövüşçü kariyeri gibi sekmeli bir merkez (Salon · Öğrenciler · Gelişim · Hayat · Profil).
// Hoca karakteri, salonun durumu, maç günü (kafeste köşe), öğrenci profilleri, beceriler, sosyal medya,
// Yılın Antrenörü töreni. Menüden yeni Antrenör Modu kariyeri de buradan başlatılır.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { sfx, useSoundScene } from '../audio';
import { BEKLEME, boutPlans, gymLevel, gymRanking, gymScore, pendingBouts, potStars, power, releaseStudent, TEMPERS, temperOf, TIERS, weeklyGymNet, type Student } from '../engine/academy';
import { money } from '../engine/career';
import {
  advanceCoachWeek,
  chooseEvent,
  closeCoachCeremony,
  coachGoals,
  DENEME,
  focusLabel,
  learnSkill,
  setFocus,
  SKILL_MAX,
  SKILLS,
  unlockCoach,
  weekOfYear,
  xpNeeded,
  type CoachSkill,
  type Focus,
} from '../engine/coachMode';
import { COUNTRIES, WEIGHT_CLASSES } from '../engine/data';
import { fmtFollowers } from '../engine/fame';
import { lookFor } from '../engine/tale';
import type { Appearance, GameState } from '../engine/types';
import { STAT_KEYS, STAT_LABELS } from '../engine/types';
import { L, LOC } from '../i18n';
import { buy, PURCHASES, restorePurchases, useOwned, usePrice } from '../monetization';
import { COACH_SKU, ULTIMATE_SKU } from '../monetization/skus';
import { Bar, Button, CageBg, Card, Choice, Icon, SLANT, Screen, Section, type IconName } from './components';
import { LookPicker } from './CreateScreen';
import { DEFAULT_LOOK, FighterAvatar } from './FighterAvatar';
import type { Act } from './GameScreens';
import { BoutModal, GymUpgrade, RankTable, RecentBouts, Scouting, Stars, StudentCard, studentLook, TIER_COLOR, type BoutView } from './GymScreen';
import { HubNav, type NavItem } from './HubNav';
import { C, F, R } from './theme';

/** Antrenör Modu açık mı: paket sahibi ya da satın almanın olmadığı web. */
export function useCoachUnlocked() {
  const owned = useOwned();
  return !PURCHASES || owned.has(COACH_SKU) || owned.has(ULTIMATE_SKU);
}

/** Antrenör Modu paketi satın alma kutusu (menüde ve deneme sonunda). */
export function CoachPack({ lead }: { lead?: string }) {
  const price = usePrice(COACH_SKU);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  if (!PURCHASES) return null;
  return (
    <LinearGradient colors={['#0d2230', '#08121a']} style={cs.pack}>
      {lead ? <Text style={cs.packLead}>{lead}</Text> : null}
      <Text style={cs.packText}>{L("Tek seferlik alım: sınırsız antrenör kariyeri, bütün beceriler, Yılın Antrenörü ödülleri ve UCC şampiyonları.")}</Text>
      <Text style={cs.packText}>{L("Şampiyon + Koleksiyon paketine de dahil.")}</Text>
      <Button
        label={price ? L("Antrenör Modu · {0}", [price]) : L("Antrenör Modu'nu al")}
        icon="whistle"
        tone="gold"
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          setMsg('');
          const r = await buy(COACH_SKU);
          setBusy(false);
          if (r === 'ok') sfx('fanfare');
          else if (r === 'hata') setMsg(L("Satın alma şu an yapılamadı. Biraz sonra tekrar dene."));
        }}
      />
      <Pressable onPress={async () => setMsg((await restorePurchases()) ? L("Satın alımların geri yüklendi.") : L("Bu hesapta satın alma bulunamadı."))} hitSlop={8} style={{ alignSelf: 'center', marginTop: 8 }}>
        <Text style={cs.link}>{L("Satın alımları geri yükle")}</Text>
      </Pressable>
      {msg ? <Text style={cs.warn}>{msg}</Text> : null}
    </LinearGradient>
  );
}

// ---------- Üst kart: hoca ----------

function CoachHero({ s }: { s: GameState }) {
  const r = s.antrenor!;
  const g = s.salon!;
  const rank = gymRanking(s);
  const lv = gymLevel(g);
  return (
    <LinearGradient colors={['#0d2230', '#0b1218', '#08090b']} locations={[0, 0.55, 1]} style={cs.hero}>
      <CageBg opacity={0.05} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <FighterAvatar look={s.fighter.gorunum ?? DEFAULT_LOOK} size={64} ring={C.blue} />
        <View style={{ flex: 1 }}>
          <Text style={cs.kicker}>{L("ANTRENÖR · SEVİYE {0}", [r.seviye])}</Text>
          <Text style={[cs.name, SLANT]} numberOfLines={1} adjustsFontSizeToFit>
            {`${s.fighter.ad} ${s.fighter.soyad}`.toLocaleUpperCase(LOC)}
          </Text>
          <View style={cs.chips}>
            <Text style={[cs.chip, { color: C.gold }]} numberOfLines={1}>
              {g.ad.toLocaleUpperCase(LOC)}
            </Text>
          </View>
          <View style={cs.chips}>
            <Text style={cs.chip}>{lv.ad.toLocaleUpperCase(LOC)}</Text>
            <Text style={cs.dot}>•</Text>
            <Text style={[cs.chip, { color: C.text }]}>{L("#{0} SALON", [rank.sira])}</Text>
            <Text style={cs.dot}>•</Text>
            <Text style={cs.chip}>{L("{0}. YIL · {1}. HAFTA", [r.yil.no, weekOfYear(s)])}</Text>
          </View>
        </View>
      </View>
      <View style={{ marginTop: 10 }}>
        <Bar value={(r.xp / xpNeeded(r.seviye)) * 100} color={C.blue} label={L("TECRÜBE {0}/{1}", [r.xp, xpNeeded(r.seviye)])} />
      </View>
      <View style={cs.meters}>
        <Meter label={L("KASA")} value={money(s.para)} color={s.para < 0 ? C.red : C.green} />
        <Meter label={L("ÜN")} value={String(Math.round(g.un))} color={C.gold} />
        <Meter label={L("ÖĞRENCİ")} value={`${g.ogrenciler.length}/${lv.kapasite}`} />
        <Meter label={L("TAKİPÇİ")} value={fmtFollowers(r.takipci ?? 1_200)} color={C.gold} />
      </View>
    </LinearGradient>
  );
}

function Meter({ label, value, color = C.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={cs.meter}>
      <Text style={cs.meterLabel}>{label}</Text>
      <Text style={[cs.meterVal, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

// ---------- Salon sekmesi ----------

function EventCard({ s, act }: { s: GameState; act: Act }) {
  const ev = s.antrenor!.olay!;
  const st = ev.ogrenci ? s.salon?.ogrenciler.find((x) => x.id === ev.ogrenci) : undefined;
  return (
    <Card accent={C.orange}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        {st ? <FighterAvatar look={studentLook(st)} size={40} ring={C.orange} /> : <Icon name="alert-circle" size={26} color={C.orange} />}
        <Text style={[cs.cardKicker, { flex: 1, color: C.orange }]}>{L("SALONDA BİR DURUM VAR")}</Text>
      </View>
      <Text style={cs.cardText}>{ev.metin}</Text>
      {ev.secenekler.map((t, i) => (
        <Choice key={i} label={t} onPress={() => act((x) => void chooseEvent(x, i))} />
      ))}
    </Card>
  );
}

function WeekNotes({ notes }: { notes: string[] }) {
  if (!notes.length) return null;
  return (
    <Card>
      <Text style={cs.cardKicker}>{L("GEÇEN HAFTA")}</Text>
      {notes.map((n, i) => (
        <Text key={i} style={[cs.cardText, i > 0 && cs.divider]}>
          {n}
        </Text>
      ))}
    </Card>
  );
}

function FightDay({ s, onCorner }: { s: GameState; onCorner: (v: BoutView) => void }) {
  const bouts = (s.salon?.ogrenciler ?? []).filter((x) => x.mac);
  if (!bouts.length) return null;
  return (
    <>
      <Section>{L("MAÇ GÜNÜ")}</Section>
      {bouts.map((st) => {
        const rk = st.mac!.rakip;
        const left = Math.max(1, BEKLEME - (s.hafta - st.mac!.hafta));
        return (
          <Pressable key={st.id} onPress={() => onCorner({ st, rakip: rk, plans: boutPlans(st.mac!) })} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginBottom: 8 }]}>
            <LinearGradient colors={['#e63946', '#8f0a17']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cs.fight}>
              <FighterAvatar look={studentLook(st)} size={46} ring="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={cs.fightKicker}>{L("KÖŞEDE SENİ BEKLİYOR · {0}", [TIERS[st.seviye].ad.toLocaleUpperCase(LOC)])}</Text>
                <Text style={[cs.fightTitle, SLANT]} numberOfLines={1}>
                  {st.soyad.toLocaleUpperCase(LOC)} vs {rk.soyad.toLocaleUpperCase(LOC)}
                </Text>
                <Text style={cs.fightSub}>{L("{0} hafta içinde gelmezsen ekip köşede durur", [left])}</Text>
              </View>
              <FighterAvatar look={lookFor({ id: st.id + rk.soyad, uyruk: rk.uyruk, kadin: rk.kadin })} size={46} ring="#9fc4ff" />
            </LinearGradient>
          </Pressable>
        );
      })}
    </>
  );
}

function Calendar({ s }: { s: GameState }) {
  const list = (s.salon?.ogrenciler ?? []).filter((x) => !x.mac).sort((a, b) => a.macHafta - b.macHafta);
  if (!list.length) return null;
  return (
    <>
      <Section>{L("TAKVİM")}</Section>
      <Card>
        {list.map((st, i) => {
          const w = Math.max(1, st.macHafta - s.hafta);
          return (
            <View key={st.id} style={[cs.calRow, i > 0 && cs.divider]}>
              <FighterAvatar look={studentLook(st)} size={34} ring={TIER_COLOR[st.seviye]} />
              <Text style={[cs.cardText, { flex: 1 }]} numberOfLines={1}>
                {st.ad} {st.soyad}
              </Text>
              <Text style={[cs.calWeeks, w <= 1 && { color: C.red }]}>{w <= 1 ? L("Bu hafta") : L("{0} hafta", [w])}</Text>
            </View>
          );
        })}
      </Card>
    </>
  );
}

function GymCard({ s }: { s: GameState }) {
  const g = s.salon!;
  const lv = gymLevel(g);
  const net = weeklyGymNet(g);
  return (
    <LinearGradient colors={['#2a1d06', '#0e0c07']} style={cs.gym}>
      <Text style={cs.gymKicker}>{lv.ad.toLocaleUpperCase(LOC)}</Text>
      <Text style={[cs.gymTitle, SLANT]} numberOfLines={1} adjustsFontSizeToFit>
        {g.ad.toLocaleUpperCase(LOC)}
      </Text>
      <Stars n={g.seviye} />
      <View style={cs.gymStats}>
        <Meter label={L("ÜYE")} value={`${g.uye}/${lv.maxUye}`} />
        <Meter label={L("HAFTALIK")} value={`${net >= 0 ? '+' : '-'}${money(Math.abs(net))}`} color={net >= 0 ? C.green : C.red} />
        <Meter label={L("PUAN")} value={gymScore(g).toLocaleString(LOC)} color={C.gold} />
      </View>
    </LinearGradient>
  );
}

function SalonTab({ s, act, notes, onCorner }: { s: GameState; act: Act; notes: string[]; onCorner: (v: BoutView) => void }) {
  const r = s.antrenor!;
  const next = coachGoals(s).find((x) => !x.tamam);
  return (
    <>
      {r.bekle ? <CoachPack lead={L("Deneme bitti. Salonun seni bekliyor:")} /> : null}
      {r.olay ? <EventCard s={s} act={act} /> : null}
      <FightDay s={s} onCorner={onCorner} />
      <WeekNotes notes={notes} />
      <GymCard s={s} />
      <Calendar s={s} />
      {next ? (
        <View style={cs.goalPill}>
          <Icon name="flag-checkered" size={16} color={C.gold} />
          <Text style={cs.goalText}>{L("Sıradaki hedef: {0}", [next.ad])}</Text>
        </View>
      ) : null}
      <RecentBouts s={s} />
    </>
  );
}

// ---------- Öğrenciler ----------

const FOCI: Focus[] = ['denge', ...STAT_KEYS];

function FocusRow({ s, st, act }: { s: GameState; st: Student; act: Act }) {
  const cur = s.antrenor?.odak[st.id] ?? 'denge';
  return (
    <View style={{ marginTop: 4 }}>
      <Text style={cs.focusLabel}>{L("ANTRENMAN ODAĞI")}</Text>
      <View style={cs.focusRow}>
        {FOCI.map((f) => (
          <Pressable key={f} onPress={() => act((x) => setFocus(x, st.id, f))} style={[cs.fchip, cur === f && cs.fchipOn]}>
            <Text style={[cs.fchipText, cur === f && { color: '#04121c' }]}>{focusLabel(f)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function StudentsTab({ s, act, onOpen }: { s: GameState; act: Act; onOpen: (id: string) => void }) {
  const g = s.salon!;
  const lv = gymLevel(g);
  return (
    <>
      <Section>{L("ÖĞRENCİLER ({0}/{1})", [g.ogrenciler.length, lv.kapasite])}</Section>
      {g.ogrenciler.length ? (
        g.ogrenciler.map((st) => (
          <StudentCard key={st.id} st={{ ...st, macHafta: st.macHafta - s.hafta }} onOpen={() => onOpen(st.id)} onRelease={() => act((x) => releaseStudent(x, st.id))} extra={<FocusRow s={s} st={st} act={act} />} />
        ))
      ) : (
        <Text style={cs.hint}>{L("Henüz öğrencin yok. Aşağıdaki yetenek avından ilk öğrencini seç.")}</Text>
      )}
      <Scouting s={s} act={act} />
    </>
  );
}

function StudentSheet({ s, id, act, onClose }: { s: GameState; id: string; act: Act; onClose: () => void }) {
  const st = s.salon?.ogrenciler.find((x) => x.id === id);
  if (!st) return null;
  const name = `${st.ad} ${st.soyad}`;
  const results = (s.salon?.sonuclar ?? []).filter((x) => x.ogrenci === name).slice(0, 6);
  const t = TEMPERS[temperOf(st)];
  const pw = power(st.stats);
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={cs.modal}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <LinearGradient colors={['#1a2a36', '#0b1015']} style={cs.sheetHero}>
            <FighterAvatar look={studentLook(st)} size={96} ring={TIER_COLOR[st.seviye]} />
            {st.lakap ? <Text style={cs.sheetNick}>“{st.lakap.toLocaleUpperCase(LOC)}”</Text> : null}
            <Text style={[cs.sheetName, SLANT]}>{name.toLocaleUpperCase(LOC)}</Text>
            <Text style={cs.meta}>
              {st.yas} · {WEIGHT_CLASSES[st.siklet].ad} · {st.uyruk}
            </Text>
            <View style={cs.sheetRow}>
              <Meter label={L("KARNE")} value={`${st.rekor.g}-${st.rekor.m}-${st.rekor.b}`} />
              <Meter label={L("GÜÇ")} value={String(pw)} color={C.green} />
              <Meter label={L("SEVİYE")} value={st.sampiyon ? '👑' : TIERS[st.seviye].ad} color={TIER_COLOR[st.seviye]} />
            </View>
          </LinearGradient>
          <Card>
            <Text style={cs.cardKicker}>{L("ÖZELLİKLER")}</Text>
            {STAT_KEYS.map((k) => (
              <Bar key={k} value={st.stats[k]} color={st.stats[k] >= 70 ? C.gold : st.stats[k] >= 50 ? C.green : C.orange} label={STAT_LABELS[k]} right={String(st.stats[k])} />
            ))}
            <View style={[cs.calRow, { marginTop: 6 }]}>
              <Text style={[cs.meta, { flex: 1 }]}>{L("Potansiyel")}</Text>
              <Stars n={potStars(st)} />
            </View>
          </Card>
          <Card>
            <Text style={cs.cardKicker}>{L("KARAKTER")}</Text>
            <Text style={cs.cardText}>
              <Text style={{ fontFamily: F.bold }}>{t.ad()}</Text> · {t.aciklama()}
            </Text>
            <Bar value={st.moral} color={st.moral < 30 ? C.red : st.moral < 60 ? C.orange : C.blue} label={L("MORAL")} right={String(Math.round(st.moral))} />
            {st.lig ? <Text style={cs.meta}>{L("Bu ligde: {0}G · {1}M", [st.lig.g, st.lig.m])}</Text> : null}
            <FocusRow s={s} st={st} act={act} />
          </Card>
          {results.length ? (
            <Card>
              <Text style={cs.cardKicker}>{L("SON MAÇLARI")}</Text>
              {results.map((x, i) => (
                <Text key={i} style={[cs.cardText, i > 0 && cs.divider]}>
                  {x.kazandi ? '✅' : '❌'} vs {x.rakip} · {x.yontem}
                </Text>
              ))}
            </Card>
          ) : null}
        </ScrollView>
        <View style={cs.modalFooter}>
          <Button label={L("Kapat")} icon="close" tone="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

// ---------- Gelişim ----------

function GrowthTab({ s, act }: { s: GameState; act: Act }) {
  const r = s.antrenor!;
  const goals = coachGoals(s);
  return (
    <>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={cs.cardKicker}>{L("BECERİLER")}</Text>
          <Text style={[cs.cardKicker, { color: r.puan > 0 ? C.gold : C.faint }]}>{L("{0} PUAN", [r.puan])}</Text>
        </View>
        <Text style={cs.meta}>{L("Her seviye atladığında bir beceri puanı. Tecrübe: galibiyetler, köşede kazanılan maçlar, terfiler ve şampiyonluklar.")}</Text>
        {(Object.keys(SKILLS) as CoachSkill[]).map((k) => {
          const lv = r.beceri[k];
          const can = r.puan > 0 && lv < SKILL_MAX;
          return (
            <View key={k} style={cs.skill}>
              <View style={cs.skillIcon}>
                <Icon name={SKILLS[k].ikon as IconName} size={20} color={lv ? C.blue : C.faint} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={cs.skillName}>{SKILLS[k].ad()}</Text>
                  <View style={{ flexDirection: 'row', gap: 3 }}>
                    {Array.from({ length: SKILL_MAX }, (_, i) => (
                      <View key={i} style={[cs.pip, i < lv && { backgroundColor: C.blue, borderColor: C.blue }]} />
                    ))}
                  </View>
                </View>
                <Text style={cs.meta}>{SKILLS[k].aciklama()}</Text>
              </View>
              <Pressable
                disabled={!can}
                onPress={() => {
                  sfx('chime');
                  act((x) => learnSkill(x, k));
                }}
                style={[cs.plus, !can && { opacity: 0.35 }]}
                hitSlop={6}
              >
                <Icon name="plus" size={18} color="#04121c" />
              </Pressable>
            </View>
          );
        })}
      </Card>
      <GymUpgrade s={s} act={act} />
      <Section>{L("HEDEFLER · {0}/{1}", [goals.filter((x) => x.tamam).length, goals.length])}</Section>
      <Card>
        {goals.map((x) => (
          <View key={x.ad} style={cs.goal}>
            <Icon name={x.tamam ? 'check-circle' : 'circle-outline'} size={17} color={x.tamam ? C.green : C.faint} />
            <Text style={[cs.cardText, { flex: 1, paddingVertical: 2 }, !x.tamam && { color: C.dim }]}>{x.ad}</Text>
          </View>
        ))}
      </Card>
    </>
  );
}

// ---------- Hayat ----------

function LifeTab({ s }: { s: GameState }) {
  const r = s.antrenor!;
  const akis = r.akis ?? [];
  return (
    <>
      <Card>
        <Text style={cs.cardKicker}>{L("SOSYAL MEDYA")}</Text>
        <Text style={cs.meta}>{L("{0} takipçi · öğrencilerin kazandıkça büyür", [fmtFollowers(r.takipci ?? 1_200)])}</Text>
        {!akis.length ? <Text style={cs.cardText}>{L("Öğrencilerin dövüştükçe herkes salonunu konuşacak.")}</Text> : null}
        {akis.slice(0, 12).map((p, i) => (
          <View key={i} style={cs.post}>
            <View style={[cs.postAvatar, { backgroundColor: p.ton === 'iyi' ? '#1d3a26' : p.ton === 'kotu' ? '#3a1a1d' : '#22252c' }]}>
              <Text style={cs.postInit}>{p.kim.slice(0, 1).toLocaleUpperCase(LOC)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={cs.postName} numberOfLines={1}>
                {p.kim} <Text style={cs.postHandle}>{p.kul}</Text>
              </Text>
              <Text style={cs.postText}>{p.metin}</Text>
              <Text style={cs.postLike}>♥ {fmtFollowers(p.begeni)}</Text>
            </View>
          </View>
        ))}
      </Card>
      <Card>
        <Text style={cs.cardKicker}>{L("SALON HABERLERİ")}</Text>
        {s.haberler.slice(0, 10).map((h, i) => (
          <Text key={i} style={[cs.cardText, i > 0 && cs.divider]}>
            {h}
          </Text>
        ))}
      </Card>
      <Card>
        <Text style={cs.cardKicker}>{L("ÖDÜLLER")}</Text>
        {r.oduller.length ? r.oduller.map((y) => <Text key={y} style={cs.cardText}>🏆 {L("Yılın Antrenörü · {0}. yıl", [y])}</Text>) : <Text style={cs.meta}>{L("Henüz ödül yok. Her yıl sonu Yılın Antrenörü töreni yapılır.")}</Text>}
      </Card>
    </>
  );
}

// ---------- Profil ----------

function ProfileTab({ s, act }: { s: GameState; act: Act }) {
  const r = s.antrenor!;
  const g = s.salon!;
  const [edit, setEdit] = useState(false);
  const rank = gymRanking(s);
  const top = r.toplam ?? { g: 0, m: 0, kose: 0 };
  const stats: [string, string][] = [
    [L("Yıl"), String(r.yil.no)],
    [L("Galibiyet"), String(top.g)],
    [L("Mağlubiyet"), String(top.m)],
    [L("Köşede galibiyet"), String(top.kose)],
    [L("UCC'ye çıkan"), String(g.uccSayisi ?? 0)],
    [L("Şampiyon"), String(g.sampiyonSayisi ?? 0)],
  ];
  return (
    <>
      <Card>
        <Text style={cs.cardKicker}>{L("KARİYER")}</Text>
        <View style={cs.grid}>
          {stats.map(([k, v]) => (
            <View key={k} style={cs.cell}>
              <Text style={cs.cellVal}>{v}</Text>
              <Text style={cs.cellLab}>{k}</Text>
            </View>
          ))}
        </View>
        <Button label={edit ? L("Görünümü kapat") : L("Görünümü düzenle")} icon="account-edit" tone="ghost" onPress={() => setEdit(!edit)} />
      </Card>
      {edit ? <LookPicker look={s.fighter.gorunum ?? DEFAULT_LOOK} onChange={(look) => act((x) => (x.fighter.gorunum = look))} /> : null}
      <RankTable rows={rank.rows} sira={rank.sira} puan={gymScore(g)} />
    </>
  );
}

// ---------- Yılın Antrenörü töreni ----------

function Ceremony({ s, act }: { s: GameState; act: Act }) {
  const t = s.antrenor!.toren!;
  const [step, setStep] = useState(0);
  const n = t.adaylar.length;
  const win = t.adaylar[t.kazanan];
  useSoundScene('celebrate');
  useEffect(() => {
    const at = step <= n ? 650 : step === n + 1 ? 1800 : 0;
    if (!at) return;
    const tm = setTimeout(() => {
      const next = step + 1;
      if (next <= n) sfx('whoosh');
      if (next === n + 1) sfx('swell');
      if (next === n + 2) sfx(win.sen ? 'fanfare' : 'applause');
      setStep(next);
    }, at);
    return () => clearTimeout(tm);
  }, [step, n, win.sen]);
  const reveal = step >= n + 2;
  return (
    <Screen footer={reveal ? <Button label={win.sen ? L("Ödülünü al") : L("Devam")} icon={win.sen ? 'trophy' : 'arrow-right'} tone="gold" onPress={() => act(closeCoachCeremony)} /> : undefined}>
      <LinearGradient colors={['#0d2a3a', '#0a141c', '#08090b']} style={cs.stage}>
        <Text style={cs.stageKicker}>{L("{0}. YIL · GALA GECESİ", [t.no])}</Text>
        <Text style={[cs.stageTitle, SLANT]}>{L("YILIN ANTRENÖRÜ")}</Text>
        <Text style={cs.meta}>{L("Adaylar")}</Text>
      </LinearGradient>
      {t.adaylar.map((a, i) =>
        step > i ? (
          <View key={i} style={[cs.nominee, reveal && i === t.kazanan && cs.nomineeWin, reveal && i !== t.kazanan && { opacity: 0.55 }]}>
            <FighterAvatar look={a.sen ? s.fighter.gorunum ?? DEFAULT_LOOK : lookFor({ id: a.ad, uyruk: a.ulke })} size={52} ring={reveal && i === t.kazanan ? C.gold : '#5a5e68'} />
            <View style={{ flex: 1 }}>
              <Text style={[cs.nomName, a.sen && { color: C.gold }]} numberOfLines={1}>
                {a.sen ? L("{0} (SEN)", [a.ad]) : a.ad}
              </Text>
              <Text style={cs.meta} numberOfLines={1}>
                {a.salon} · {a.ulke}
              </Text>
            </View>
            {reveal ? <Text style={cs.nomScore}>{a.puan}</Text> : null}
          </View>
        ) : null,
      )}
      {step === n + 1 ? <Text style={[cs.envelope, SLANT]}>{L("Ve kazanan…")}</Text> : null}
      {reveal ? (
        <Card accent={win.sen ? C.gold : undefined}>
          <Text style={[cs.verdict, SLANT, { color: win.sen ? C.gold : C.text }]}>{win.sen ? L("🏆 YILIN ANTRENÖRÜ SENSİN!") : L("Kazanan: {0}", [win.ad])}</Text>
          <Text style={cs.cardText}>{win.sen ? L("Ödül: {0} · ün +8 · tecrübe ve takipçi.", [money(t.odul)]) : L("Yıl puanın {0}. Gelecek yıl sahne senin olabilir.", [t.adaylar.find((a) => a.sen)?.puan])}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}

// ---------- Ekran ----------

type Tab = 'salon' | 'ogrenci' | 'gelisim' | 'hayat' | 'profil';

export function CoachScreen({ s, act }: { s: GameState; act: Act }) {
  const r = s.antrenor!;
  const unlocked = useCoachUnlocked();
  const [notes, setNotes] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>('salon');
  const [bout, setBout] = useState<BoutView | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  // Paket alındı (ya da geri yüklendi): deneme kalkar
  useEffect(() => {
    if (r.deneme && unlocked) act(unlockCoach);
  }, [r.deneme, unlocked, act]);
  if (r.toren) return <Ceremony s={s} act={act} />;
  const bouts = pendingBouts(s);
  const blocked = !!r.olay || !!r.bekle;
  const nav: NavItem<Tab>[] = [
    { key: 'salon', label: L("Salon"), icon: 'home-city', badge: r.olay ? '!' : bouts || null },
    { key: 'ogrenci', label: L("Öğrenciler"), icon: 'account-group' },
    { key: 'gelisim', label: L("Gelişim"), icon: 'chart-line', badge: r.puan || null },
    { key: 'hayat', label: L("Hayat"), icon: 'cellphone-message' },
    { key: 'profil', label: L("Profil"), icon: 'account' },
  ];
  const footer = (
    <View style={{ gap: 8 }}>
      {r.deneme ? <Text style={cs.hint}>{L("Deneme: {0}/{1} hafta", [Math.min(DENEME, s.hafta - (s.salon?.acilis ?? 0)), DENEME])}</Text> : null}
      <Button
        label={r.olay ? L("Önce salondaki durumu çöz") : r.bekle ? L("Deneme bitti") : L("Haftayı ilerlet")}
        icon="calendar-arrow-right"
        tone="gold"
        disabled={blocked}
        onPress={() => {
          const box: { n: string[] } = { n: [] };
          act((x) => {
            box.n = advanceCoachWeek(x);
          });
          setNotes(box.n);
          setTab('salon');
        }}
      />
      <HubNav items={nav} value={tab} onChange={setTab} />
    </View>
  );
  return (
    <Screen key={tab} footer={footer}>
      <CoachHero s={s} />
      {tab === 'salon' ? <SalonTab s={s} act={act} notes={notes} onCorner={setBout} /> : null}
      {tab === 'ogrenci' ? <StudentsTab s={s} act={act} onOpen={setSheet} /> : null}
      {tab === 'gelisim' ? <GrowthTab s={s} act={act} /> : null}
      {tab === 'hayat' ? <LifeTab s={s} /> : null}
      {tab === 'profil' ? <ProfileTab s={s} act={act} /> : null}
      {bout ? <BoutModal s={s} view={bout} act={act} onClose={() => setBout(null)} /> : null}
      {sheet ? <StudentSheet s={s} id={sheet} act={act} onClose={() => setSheet(null)} /> : null}
    </Screen>
  );
}

// ---------- Menü: yeni Antrenör Modu ----------

const COACH_COUNTRIES = ['tr', 'us', 'br', 'ru', 'pl', 'gb', 'ie', 'mx', 'jp', 'kz', 'az', 'ge'];

export function CoachStart({ canStart, onStart }: { canStart: boolean; onStart: (isim: { ad: string; soyad: string; lakap: string; uyruk: string; gorunum?: Appearance }, deneme: boolean) => void }) {
  const unlocked = useCoachUnlocked();
  const [ad, setAd] = useState('');
  const [soyad, setSoyad] = useState('');
  const [lakap, setLakap] = useState('');
  const [uyruk, setUyruk] = useState('tr');
  const [look, setLook] = useState<Appearance>({ ...DEFAULT_LOOK, sakal: 'tam', sac: 'kisa' });
  const [edit, setEdit] = useState(false);
  return (
    <View style={{ gap: 10 }}>
      <LinearGradient colors={['#0d2230', '#0a0f14']} style={cs.startHero}>
        <Icon name="whistle" size={36} color={C.blue} />
        <Text style={[cs.heroTitle, SLANT]}>{L("ANTRENÖR MODU")}</Text>
        <Text style={cs.heroText}>{L("Bu sefer kafese sen girmiyorsun. Garaj salonundan başla, sokaktan yetenek bul, köşelerinde dur ve onları UCC kemerine taşı.")}</Text>
      </LinearGradient>
      {[
        ['account-search', L("Yetenek avı: potansiyeli yüksek gençleri bul, profillerini incele ve kaydet.")],
        ['dumbbell', L("Her öğrenciye antrenman odağı ver: vuruş, güreş, kondisyon…")],
        ['bullhorn', L("Maç günü köşedesin: kafeste raunt raunt izle, oyun planını ve raunt arası talimatı sen ver.")],
        ['school', L("Antrenör seviyeni yükselt: taktik, gözcülük, motivasyon, menajerlik.")],
        ['cellphone-message', L("Sosyal medya, salon olayları, dünya salon sıralaması ve Yılın Antrenörü töreni.")],
      ].map(([icon, t]) => (
        <View key={icon} style={cs.bullet}>
          <Icon name={icon as IconName} size={18} color={C.blue} />
          <Text style={cs.bulletText}>{t}</Text>
        </View>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <FighterAvatar look={look} size={72} ring={C.blue} />
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={cs.focusLabel}>{L("HOCANIN ADI")}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput style={[cs.input, { flex: 1, minWidth: 0, width: 0 }]} value={ad} onChangeText={setAd} placeholder={L("Ad")} placeholderTextColor={C.faint} maxLength={18} />
            <TextInput style={[cs.input, { flex: 1, minWidth: 0, width: 0 }]} value={soyad} onChangeText={setSoyad} placeholder={L("Soyad")} placeholderTextColor={C.faint} maxLength={18} />
          </View>
        </View>
      </View>
      <TextInput style={cs.input} value={lakap} onChangeText={setLakap} placeholder={L("Salonun adı için lakap (isteğe bağlı)")} placeholderTextColor={C.faint} maxLength={18} />
      <Text style={cs.focusLabel}>{L("ÜLKE")}</Text>
      <View style={cs.focusRow}>
        {COACH_COUNTRIES.filter((k) => COUNTRIES[k]).map((k) => (
          <Pressable key={k} onPress={() => setUyruk(k)} style={[cs.fchip, uyruk === k && cs.fchipOn]}>
            <Text style={[cs.fchipText, uyruk === k && { color: '#04121c' }]}>{COUNTRIES[k].ad}</Text>
          </Pressable>
        ))}
      </View>
      <Button label={edit ? L("Görünümü kapat") : L("Görünümünü oluştur")} icon="account-edit" tone="ghost" onPress={() => setEdit(!edit)} />
      {edit ? <LookPicker look={look} onChange={setLook} /> : null}
      {!canStart ? <Text style={cs.warn}>{L("Antrenör Modu için boş bir kariyer yuvası gerekli.")}</Text> : null}
      <Button
        label={unlocked ? L("Salonu aç") : L("{0} hafta ücretsiz dene", [DENEME])}
        icon="key"
        tone="gold"
        disabled={!canStart || !ad.trim() || !soyad.trim()}
        onPress={() => onStart({ ad, soyad, lakap, uyruk, gorunum: look }, !unlocked)}
      />
      {!unlocked ? <CoachPack /> : null}
    </View>
  );
}

const cs = StyleSheet.create({
  hero: { borderRadius: R + 4, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#1f4a63', overflow: 'hidden' },
  kicker: { color: C.blue, fontFamily: F.display, fontSize: 10, letterSpacing: 2 },
  name: { color: C.text, fontFamily: F.display, fontSize: 24, lineHeight: 28 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' },
  chip: { color: C.dim, fontFamily: F.display, fontSize: 11, letterSpacing: 1 },
  dot: { color: C.faint, fontSize: 10 },
  meters: { flexDirection: 'row', marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', paddingTop: 12 },
  meter: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  meterLabel: { color: C.faint, fontFamily: F.display, fontSize: 9, letterSpacing: 1.5 },
  meterVal: { fontFamily: F.display, fontSize: 18, marginTop: 1 },
  meta: { color: C.faint, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  cardKicker: { color: C.gold, fontFamily: F.display, fontSize: 11, letterSpacing: 2, marginBottom: 4 },
  cardText: { color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20, paddingVertical: 4 },
  divider: { borderTopWidth: 1, borderTopColor: C.border },
  fight: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: R + 4, padding: 12, shadowColor: C.red, shadowOpacity: 0.35, shadowRadius: 16 },
  fightKicker: { color: 'rgba(255,255,255,0.75)', fontFamily: F.display, fontSize: 9.5, letterSpacing: 1.5 },
  fightTitle: { color: '#fff', fontFamily: F.display, fontSize: 20, lineHeight: 24 },
  fightSub: { color: 'rgba(255,255,255,0.8)', fontFamily: F.body, fontSize: 11.5 },
  calRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  calWeeks: { color: C.gold, fontFamily: F.display, fontSize: 13 },
  gym: { borderRadius: R + 4, borderWidth: 1, borderColor: '#4a3810', padding: 14, alignItems: 'center', gap: 4, marginBottom: 8 },
  gymKicker: { color: C.gold, fontFamily: F.display, fontSize: 10, letterSpacing: 3 },
  gymTitle: { color: '#fff', fontFamily: F.display, fontSize: 22, textAlign: 'center' },
  gymStats: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 8 },
  goalPill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.goldDeep, borderRadius: R, padding: 10, marginVertical: 6, backgroundColor: '#1a1407' },
  goalText: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 13 },
  hint: { color: C.faint, fontFamily: F.body, fontSize: 12, textAlign: 'center' },
  focusLabel: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1.5, marginBottom: 4 },
  focusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  fchip: { borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#0d0f13' },
  fchipOn: { backgroundColor: C.blue, borderColor: C.blue },
  fchipText: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  modal: { flex: 1, backgroundColor: C.bg, width: '100%', maxWidth: 560, alignSelf: 'center' },
  modalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: C.border },
  sheetHero: { borderRadius: R + 4, borderWidth: 1, borderColor: '#1f4a63', padding: 16, alignItems: 'center', gap: 4 },
  sheetNick: { color: C.gold, fontFamily: F.displayMed, fontSize: 12, letterSpacing: 1.5, marginTop: 6 },
  sheetName: { color: C.text, fontFamily: F.display, fontSize: 26, textAlign: 'center' },
  sheetRow: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', paddingTop: 10 },
  skill: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border },
  skillIcon: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  skillName: { color: C.text, fontFamily: F.display, fontSize: 15 },
  pip: { width: 10, height: 10, borderRadius: 2, borderWidth: 1, borderColor: C.faint },
  plus: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  post: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border },
  postAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  postInit: { color: C.text, fontFamily: F.display, fontSize: 15 },
  postName: { color: C.text, fontFamily: F.bold, fontSize: 13 },
  postHandle: { color: C.faint, fontFamily: F.body, fontSize: 12 },
  postText: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 18, marginTop: 2 },
  postLike: { color: C.faint, fontFamily: F.semi, fontSize: 11, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  cell: { width: '31%', flexGrow: 1, backgroundColor: '#0f1014', borderRadius: R, borderWidth: 1, borderColor: C.border, paddingVertical: 10, alignItems: 'center' },
  cellVal: { color: C.text, fontFamily: F.display, fontSize: 18 },
  cellLab: { color: C.faint, fontFamily: F.semi, fontSize: 10.5, marginTop: 2, textAlign: 'center' },
  stage: { borderRadius: R + 4, borderWidth: 1, borderColor: '#1f4a63', padding: 18, alignItems: 'center', marginBottom: 12 },
  stageKicker: { color: C.gold, fontFamily: F.display, fontSize: 11, letterSpacing: 2 },
  stageTitle: { color: C.text, fontFamily: F.display, fontSize: 32, marginTop: 4 },
  nominee: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: R + 2, borderWidth: 1, borderColor: C.border, padding: 10, marginBottom: 8 },
  nomineeWin: { borderColor: C.gold, backgroundColor: '#2a2106' },
  nomName: { color: C.text, fontFamily: F.display, fontSize: 16 },
  nomScore: { color: C.gold, fontFamily: F.display, fontSize: 20 },
  envelope: { color: C.gold, fontFamily: F.display, fontSize: 26, textAlign: 'center', marginVertical: 14 },
  verdict: { fontFamily: F.display, fontSize: 22, marginVertical: 2 },
  pack: { borderRadius: R + 2, borderWidth: 1, borderColor: '#1f4a63', padding: 14, gap: 8, marginBottom: 10 },
  packLead: { color: C.blue, fontFamily: F.bold, fontSize: 14 },
  packText: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  link: { color: C.faint, fontFamily: F.semi, fontSize: 12, textDecorationLine: 'underline' },
  warn: { color: C.orange, fontFamily: F.semi, fontSize: 12, textAlign: 'center' },
  startHero: { borderRadius: R + 4, borderWidth: 1, borderColor: '#1f4a63', padding: 16, alignItems: 'center', gap: 6 },
  heroTitle: { color: C.text, fontFamily: F.display, fontSize: 26 },
  heroText: { color: C.dim, fontFamily: F.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  bullet: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bulletText: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  input: { backgroundColor: '#0d0f13', borderWidth: 1, borderColor: C.border, borderRadius: R, color: C.text, fontFamily: F.semi, fontSize: 15, paddingHorizontal: 12, paddingVertical: 10 },
});
