// Antrenör Modu ana ekranı: salon ekranının üstüne antrenör paneli (seviye, beceriler, olay, yıl sonu, hedefler)
// ve haftayı ilerleten alt çubuk. Menüden yeni Antrenör Modu kariyeri de buradan başlatılır.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { sfx } from '../audio';
import { pendingBouts, type Student } from '../engine/academy';
import { money } from '../engine/career';
import {
  advanceCoachWeek,
  chooseEvent,
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
import { COUNTRIES } from '../engine/data';
import type { GameState } from '../engine/types';
import { STAT_KEYS } from '../engine/types';
import { L, LOC } from '../i18n';
import { buy, PURCHASES, restorePurchases, useOwned, usePrice } from '../monetization';
import { COACH_SKU } from '../monetization/skus';
import { Bar, Button, Card, Choice, Icon, Section, SLANT, type IconName } from './components';
import type { Act } from './GameScreens';
import { GymScreen } from './GymScreen';
import { C, F, R } from './theme';

/** Antrenör Modu açık mı: paket sahibi ya da satın almanın olmadığı web. */
export function useCoachUnlocked() {
  const owned = useOwned();
  return !PURCHASES || owned.has(COACH_SKU);
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

// ---------- Panel parçaları ----------

function Header({ s }: { s: GameState }) {
  const r = s.antrenor!;
  return (
    <LinearGradient colors={['#0d2230', '#0a0f14']} style={cs.head}>
      <View style={cs.headRow}>
        <View style={cs.badge}>
          <Icon name="whistle" size={22} color={C.blue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={cs.kicker}>{L("ANTRENÖR · SEVİYE {0}", [r.seviye])}</Text>
          <Text style={[cs.name, SLANT]} numberOfLines={1}>
            {`${s.fighter.ad} ${s.fighter.soyad}`.toLocaleUpperCase(LOC)}
          </Text>
          <Text style={cs.meta}>
            {L("{0}. yıl · {1}. hafta", [r.yil.no, weekOfYear(s)])}
            {r.oduller.length ? ` · 🏆 ${r.oduller.length}` : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={cs.money}>{money(s.para)}</Text>
          <Text style={cs.meta}>{L("KASA")}</Text>
        </View>
      </View>
      <Bar value={(r.xp / xpNeeded(r.seviye)) * 100} color={C.blue} label={L("TECRÜBE {0}/{1}", [r.xp, xpNeeded(r.seviye)])} />
      <View style={cs.yearRow}>
        <Text style={cs.yearText}>{L("Bu yıl: {0}G-{1}M · {2} terfi", [r.yil.g, r.yil.m, r.yil.terfi])}</Text>
        {r.deneme ? <Text style={[cs.yearText, { color: C.gold }]}>{L("Deneme: {0}/{1} hafta", [Math.min(DENEME, s.hafta - (s.salon?.acilis ?? 0)), DENEME])}</Text> : null}
      </View>
    </LinearGradient>
  );
}

function EventCard({ s, act }: { s: GameState; act: Act }) {
  const ev = s.antrenor!.olay!;
  return (
    <Card accent={C.orange}>
      <Text style={cs.cardKicker}>{L("SALONDA BİR DURUM VAR")}</Text>
      <Text style={cs.cardText}>{ev.metin}</Text>
      {ev.secenekler.map((t, i) => (
        <Choice key={i} label={t} onPress={() => act((x) => void chooseEvent(x, i))} />
      ))}
    </Card>
  );
}

function YearEnd({ s, act }: { s: GameState; act: Act }) {
  const y = s.antrenor!.yilSonu!;
  return (
    <LinearGradient colors={y.kazandi ? ['#3a2a06', '#120d04'] : ['#1a1c22', '#0c0d10']} style={[cs.year, { borderColor: y.kazandi ? C.gold : C.border }]}>
      <Text style={[cs.yearTitle, SLANT, { color: y.kazandi ? C.gold : C.text }]}>{y.kazandi ? L("YILIN ANTRENÖRÜ!") : L("YIL SONU TÖRENİ")}</Text>
      <Text style={cs.cardText}>{y.satir}</Text>
      <Button label={L("Devam")} tone={y.kazandi ? 'gold' : 'ghost'} onPress={() => act((x) => x.antrenor && delete x.antrenor.yilSonu)} />
    </LinearGradient>
  );
}

function Skills({ s, act }: { s: GameState; act: Act }) {
  const r = s.antrenor!;
  const [open, setOpen] = useState(r.puan > 0);
  return (
    <>
      <Pressable onPress={() => setOpen(!open)} style={cs.sectionRow} hitSlop={6}>
        <Section>{r.puan > 0 ? L("BECERİLER · {0} PUAN", [r.puan]) : L("BECERİLER")}</Section>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.faint} />
      </Pressable>
      {open
        ? (Object.keys(SKILLS) as CoachSkill[]).map((k) => {
            const lv = r.beceri[k];
            const can = r.puan > 0 && lv < SKILL_MAX;
            return (
              <View key={k} style={cs.skill}>
                <Icon name={SKILLS[k].ikon as IconName} size={20} color={lv ? C.blue : C.faint} />
                <View style={{ flex: 1 }}>
                  <Text style={cs.skillName}>
                    {SKILLS[k].ad()} <Text style={{ color: C.blue }}>{'●'.repeat(lv)}</Text>
                    <Text style={{ color: C.faint }}>{'○'.repeat(SKILL_MAX - lv)}</Text>
                  </Text>
                  <Text style={cs.meta}>{SKILLS[k].aciklama()}</Text>
                </View>
                {can ? (
                  <Pressable onPress={() => act((x) => learnSkill(x, k))} style={cs.plus} hitSlop={6}>
                    <Icon name="plus" size={18} color="#04121c" />
                  </Pressable>
                ) : null}
              </View>
            );
          })
        : null}
    </>
  );
}

function Goals({ s }: { s: GameState }) {
  const goals = coachGoals(s);
  const done = goals.filter((x) => x.tamam).length;
  const [open, setOpen] = useState(false);
  const next = goals.find((x) => !x.tamam);
  return (
    <>
      <Pressable onPress={() => setOpen(!open)} style={cs.sectionRow} hitSlop={6}>
        <Section>{L("HEDEFLER · {0}/{1}", [done, goals.length])}</Section>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.faint} />
      </Pressable>
      {open ? (
        <Card>
          {goals.map((x) => (
            <View key={x.ad} style={cs.goal}>
              <Icon name={x.tamam ? 'check-circle' : 'circle-outline'} size={17} color={x.tamam ? C.green : C.faint} />
              <Text style={[cs.cardText, { flex: 1, paddingVertical: 2 }, !x.tamam && { color: C.dim }]}>{x.ad}</Text>
            </View>
          ))}
        </Card>
      ) : next ? (
        <Text style={cs.hint}>{L("Sıradaki hedef: {0}", [next.ad])}</Text>
      ) : null}
    </>
  );
}

const FOCI: Focus[] = ['denge', ...STAT_KEYS];

function FocusRow({ s, st, act }: { s: GameState; st: Student; act: Act }) {
  const cur = s.antrenor?.odak[st.id] ?? 'denge';
  return (
    <View style={{ marginTop: 4 }}>
      <Text style={cs.focusLabel}>{L("ANTRENMAN ODAĞI")}</Text>
      <View style={cs.focusRow}>
        {FOCI.map((f) => (
          <Pressable key={f} onPress={() => act((x) => setFocus(x, st.id, f))} style={[cs.chip, cur === f && cs.chipOn]}>
            <Text style={[cs.chipText, cur === f && { color: '#04121c' }]}>{focusLabel(f)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ---------- Ekran ----------

export function CoachScreen({ s, act }: { s: GameState; act: Act }) {
  const r = s.antrenor!;
  const unlocked = useCoachUnlocked();
  const [notes, setNotes] = useState<string[]>([]);
  // Paket alındı (ya da geri yüklendi): deneme kalkar
  useEffect(() => {
    if (r.deneme && unlocked) act(unlockCoach);
  }, [r.deneme, unlocked, act]);
  const bouts = pendingBouts(s);
  const blocked = !!r.olay || !!r.bekle;
  const top = (
    <>
      <Header s={s} />
      {r.yilSonu ? <YearEnd s={s} act={act} /> : null}
      {r.bekle ? <CoachPack lead={L("Deneme bitti. Salonun seni bekliyor:")} /> : null}
      {r.olay ? <EventCard s={s} act={act} /> : null}
      {notes.length ? (
        <Card>
          <Text style={cs.cardKicker}>{L("GEÇEN HAFTA")}</Text>
          {notes.map((n, i) => (
            <Text key={i} style={[cs.cardText, i > 0 && cs.divider]}>
              {n}
            </Text>
          ))}
        </Card>
      ) : null}
      <Skills s={s} act={act} />
      <Goals s={s} />
    </>
  );
  const footer = (
    <View style={{ gap: 6 }}>
      {bouts ? <Text style={cs.hint}>{L("{0} öğrencinin maçı var: köşesinde durmak için yukarıdaki MAÇ GÜNÜ'ne dokun.", [bouts])}</Text> : null}
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
        }}
      />
    </View>
  );
  return <GymScreen s={s} act={act} top={top} footer={footer} studentExtra={(st) => <FocusRow s={s} st={st} act={act} />} />;
}

// ---------- Menü: yeni Antrenör Modu ----------

const COACH_COUNTRIES = ['tr', 'us', 'br', 'ru', 'pl', 'gb', 'ie', 'mx', 'jp', 'kz', 'az', 'ge'];

export function CoachStart({ canStart, onStart }: { canStart: boolean; onStart: (isim: { ad: string; soyad: string; lakap: string; uyruk: string }, deneme: boolean) => void }) {
  const unlocked = useCoachUnlocked();
  const [ad, setAd] = useState('');
  const [soyad, setSoyad] = useState('');
  const [lakap, setLakap] = useState('');
  const [uyruk, setUyruk] = useState('tr');
  return (
    <View style={{ gap: 10 }}>
      <LinearGradient colors={['#0d2230', '#0a0f14']} style={cs.hero}>
        <Icon name="whistle" size={36} color={C.blue} />
        <Text style={[cs.heroTitle, SLANT]}>{L("ANTRENÖR MODU")}</Text>
        <Text style={cs.heroText}>{L("Bu sefer kafese sen girmiyorsun. Garaj salonundan başla, sokaktan yetenek bul, köşelerinde dur ve onları UCC kemerine taşı.")}</Text>
      </LinearGradient>
      {[
        ['account-search', L("Yetenek avı: potansiyeli yüksek gençleri bul ve kaydet.")],
        ['dumbbell', L("Her öğrenciye antrenman odağı ver: vuruş, güreş, kondisyon…")],
        ['bullhorn', L("Maç günü köşedesin: oyun planını ve raunt arası talimatı sen verirsin.")],
        ['school', L("Antrenör seviyeni yükselt: taktik, gözcülük, motivasyon, menajerlik.")],
        ['trophy', L("Salon olayları, yıl sonu Yılın Antrenörü ödülü ve dünya salon sıralaması.")],
      ].map(([icon, t]) => (
        <View key={icon} style={cs.bullet}>
          <Icon name={icon as IconName} size={18} color={C.blue} />
          <Text style={cs.bulletText}>{t}</Text>
        </View>
      ))}
      <Text style={cs.focusLabel}>{L("HOCANIN ADI")}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput style={[cs.input, { flex: 1, minWidth: 0, width: 0 }]} value={ad} onChangeText={setAd} placeholder={L("Ad")} placeholderTextColor={C.faint} maxLength={18} />
        <TextInput style={[cs.input, { flex: 1, minWidth: 0, width: 0 }]} value={soyad} onChangeText={setSoyad} placeholder={L("Soyad")} placeholderTextColor={C.faint} maxLength={18} />
      </View>
      <TextInput style={cs.input} value={lakap} onChangeText={setLakap} placeholder={L("Salonun adı için lakap (isteğe bağlı)")} placeholderTextColor={C.faint} maxLength={18} />
      <Text style={cs.focusLabel}>{L("ÜLKE")}</Text>
      <View style={cs.focusRow}>
        {COACH_COUNTRIES.filter((k) => COUNTRIES[k]).map((k) => (
          <Pressable key={k} onPress={() => setUyruk(k)} style={[cs.chip, uyruk === k && cs.chipOn]}>
            <Text style={[cs.chipText, uyruk === k && { color: '#04121c' }]}>{COUNTRIES[k].ad}</Text>
          </Pressable>
        ))}
      </View>
      {!canStart ? <Text style={cs.warn}>{L("Antrenör Modu için boş bir kariyer yuvası gerekli.")}</Text> : null}
      <Button
        label={unlocked ? L("Salonu aç") : L("{0} hafta ücretsiz dene", [DENEME])}
        icon="key"
        tone="gold"
        disabled={!canStart || !ad.trim() || !soyad.trim()}
        onPress={() => onStart({ ad, soyad, lakap, uyruk }, !unlocked)}
      />
      {!unlocked ? <CoachPack /> : null}
    </View>
  );
}

const cs = StyleSheet.create({
  head: { borderRadius: R + 2, borderWidth: 1, borderColor: '#1f4a63', padding: 14, gap: 8, marginBottom: 10 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: C.blue, alignItems: 'center', justifyContent: 'center', backgroundColor: '#071620' },
  kicker: { color: C.blue, fontFamily: F.display, fontSize: 10, letterSpacing: 2 },
  name: { color: C.text, fontFamily: F.display, fontSize: 19 },
  meta: { color: C.faint, fontFamily: F.body, fontSize: 12 },
  money: { color: C.green, fontFamily: F.display, fontSize: 17 },
  yearRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  yearText: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  cardKicker: { color: C.gold, fontFamily: F.display, fontSize: 11, letterSpacing: 2, marginBottom: 4 },
  cardText: { color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20, paddingVertical: 4 },
  divider: { borderTopWidth: 1, borderTopColor: C.border },
  year: { borderRadius: R + 2, borderWidth: 1, padding: 16, gap: 8, marginBottom: 10, alignItems: 'stretch' },
  yearTitle: { fontFamily: F.display, fontSize: 26, textAlign: 'center' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 10, marginBottom: 6 },
  skillName: { color: C.text, fontFamily: F.bold, fontSize: 14 },
  plus: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hint: { color: C.faint, fontFamily: F.body, fontSize: 12, textAlign: 'center', marginBottom: 6 },
  focusLabel: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1.5, marginBottom: 4 },
  focusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#0d0f13' },
  chipOn: { backgroundColor: C.blue, borderColor: C.blue },
  chipText: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  pack: { borderRadius: R + 2, borderWidth: 1, borderColor: '#1f4a63', padding: 14, gap: 8, marginBottom: 10 },
  packLead: { color: C.blue, fontFamily: F.bold, fontSize: 14 },
  packText: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  link: { color: C.faint, fontFamily: F.semi, fontSize: 12, textDecorationLine: 'underline' },
  warn: { color: C.orange, fontFamily: F.semi, fontSize: 12, textAlign: 'center' },
  hero: { borderRadius: R + 4, borderWidth: 1, borderColor: '#1f4a63', padding: 16, alignItems: 'center', gap: 6 },
  heroTitle: { color: C.text, fontFamily: F.display, fontSize: 26 },
  heroText: { color: C.dim, fontFamily: F.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  bullet: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bulletText: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  input: { backgroundColor: '#0d0f13', borderWidth: 1, borderColor: C.border, borderRadius: R, color: C.text, fontFamily: F.semi, fontSize: 15, paddingHorizontal: 12, paddingVertical: 10 },
});
