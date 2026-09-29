// Günün Dövüşü ekranı: senaryo → plan seçimi → dövüş → sonuç (skor, seri, paylaş). Günde tek hak.
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSoundScene } from '../audio';
import { finishFight } from '../engine/career';
import {
  dailyGame,
  dailyScore,
  dailySpec,
  dayNumber,
  emptyDaily,
  endDailyFight,
  grade,
  liveStreak,
  msToNextDay,
  recordDaily,
  TWISTS,
  type DailyResult,
  type DailySpec,
  type DailyStore,
} from '../engine/daily';
import { BACKGROUNDS, WEIGHT_CLASSES } from '../engine/data';
import { lookFor } from '../engine/tale';
import type { GameState, PlanKey } from '../engine/types';
import { L, LOC } from '../i18n';
import { askReview } from '../review';
import { challengeFor, challengeLink, shareText } from '../challenge';
import { getPref, setPref } from '../prefs';
import { ShareButton } from '../share/ShareButton';
import { enableNotifications, NOTIFY, rescheduleNotifications, useNotifyState } from '../notify';
import type { ShareCardData } from '../share/types';
import { Compare } from './Compare';
import { Button, Card, Icon, Screen, SLANT, Title, upName, type IconName } from './components';
import { FighterAvatar } from './FighterAvatar';
import { FightScreen } from './FightScreen';
import { PlanPicker } from './PlanPicker';
import { C, F } from './theme';

const STORE_KEY = 'yol_gunluk';
const MATCH_KEY = 'yol_gunluk_mac';

export function loadDaily(): DailyStore {
  try {
    const raw = getPref(STORE_KEY);
    return raw ? { ...emptyDaily(), ...JSON.parse(raw) } : emptyDaily();
  } catch {
    return emptyDaily();
  }
}

/** Yarıda kalan dövüş (bugüne aitse): uygulama kapansa da kaldığı yerden sürer. */
function loadMatch(gun: number): GameState | null {
  try {
    const raw = getPref(MATCH_KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as { gun: number; s: GameState };
    return m.gun === gun ? m.s : null;
  } catch {
    return null;
  }
}

export function resultText(r: DailyResult) {
  if (r.sonuc === 'B') return L("Berabere");
  if (r.sonuc === 'M') return L("Mağlubiyet · {0}. raunt", [r.raunt]);
  if (r.yontem === 'SUB') return L("{0}. rauntta submission!", [r.raunt]);
  if (r.yontem === 'KO' || r.yontem === 'TKO') return L("{0}. rauntta nakavt!", [r.raunt]);
  return L("Hakem kararıyla galibiyet");
}

export function DailyScreen({ onExit }: { onExit: () => void }) {
  const gun = dayNumber();
  const [spec] = useState<DailySpec>(() => dailySpec(gun));
  const [store, setStore] = useState<DailyStore>(loadDaily);
  const [game, setGame] = useState<GameState | null>(() => loadMatch(gun));
  const gRef = useRef<GameState | null>(game);
  const today = store.kayit[gun];

  const finish = (s: GameState) => {
    const fs = s.pending.dovus!;
    const r = dailyScore(fs.sonuc!, fs.maxRaunt);
    const next = recordDaily(loadDaily(), gun, r);
    setPref(STORE_KEY, JSON.stringify(next));
    setPref(MATCH_KEY, '');
    endDailyFight();
    setStore(next);
    void rescheduleNotifications(next);
    if (r.skor >= 100 && next.toplam >= 3) void askReview();
    gRef.current = null;
    setGame(null);
  };

  // Dövüş ekranının "act"i: geçici durum üzerinde çalışır, her adımda kaydedilir; "Dövüş sonrası" sonucu yazar.
  const act = (fn: (s: GameState) => void) => {
    const cur = gRef.current;
    if (!cur) return;
    if (fn === finishFight) return finish(cur);
    fn(cur);
    const copy = { ...cur };
    gRef.current = copy;
    setPref(MATCH_KEY, JSON.stringify({ gun, s: copy }));
    setGame(copy);
  };

  const start = (plan: PlanKey) => {
    const s = dailyGame(spec, plan);
    gRef.current = s;
    setPref(MATCH_KEY, JSON.stringify({ gun, s }));
    setGame(s);
  };

  if (game && !today) return <DailyFight s={game} act={act} />;
  if (today) return <DailyResultView gun={gun} spec={spec} r={today} store={store} onExit={onExit} />;
  return <DailyIntro gun={gun} spec={spec} store={store} onStart={start} />;
}

function DailyFight({ s, act }: { s: GameState; act: (fn: (s: GameState) => void) => void }) {
  useSoundScene('fight');
  return <FightScreen s={s} act={act} />;
}

function Head({ gun, store }: { gun: number; store: DailyStore }) {
  const seri = liveStreak(store, gun);
  return (
    <View style={st.head}>
      <Text style={st.kicker}>{L("GÜNÜN DÖVÜŞÜ #{0}", [gun])}</Text>
      {seri ? <Text style={st.streak}>{L("🔥 {0} günlük seri", [seri])}</Text> : null}
    </View>
  );
}

function DailyIntro({ gun, spec, store, onStart }: { gun: number; spec: DailySpec; store: DailyStore; onStart: (p: PlanKey) => void }) {
  const t = TWISTS[spec.twist];
  const ben = spec.ben;
  const o = spec.rakip;
  // Plan seçici rakibi geçici bir durumdan okur.
  const [preview] = useState(() => dailyGame(spec, 'ayakta'));
  useEffect(() => endDailyFight(), []);
  return (
    <Screen>
      <Head gun={gun} store={store} />
      {challengeFor(gun) ? (
        <View style={st.chalBanner}>
          <Icon name="sword-cross" size={18} color={C.gold} />
          <Text style={st.chalBannerText}>{L("Bir arkadaşın bu dövüşten {0} puan aldı. Geçebilir misin?", [challengeFor(gun)!.skor])}</Text>
        </View>
      ) : null}
      <Title kicker={L("HERKES BUGÜN AYNI DÖVÜŞÜ OYNUYOR · TEK HAKKIN VAR")} sub={L("{0} sıklet · {1}", [WEIGHT_CLASSES[spec.siklet].ad, spec.twist === 'unvan' ? L("5 raunt") : L("3 raunt")])}>
        {L("Bugün kafeste sen varsın")}
      </Title>
      <Card>
        <View style={st.vs}>
          <View style={st.side}>
            <FighterAvatar look={lookFor(ben)} size={84} ring={C.red} />
            <Text style={[st.name, SLANT]} numberOfLines={2}>
              {upName(`${ben.ad} ${ben.soyad}`)}
            </Text>
            <Text style={st.meta}>
              {BACKGROUNDS[ben.stil].ikon} {BACKGROUNDS[ben.stil].ad}
            </Text>
          </View>
          <Text style={st.vsText}>VS</Text>
          <View style={st.side}>
            <FighterAvatar look={lookFor(o)} size={84} ring={C.blue} />
            <Text style={[st.name, SLANT]} numberOfLines={2}>
              {upName(`${o.ad} ${o.soyad}`)}
            </Text>
            <Text style={st.meta}>
              {BACKGROUNDS[o.stil].ikon} {BACKGROUNDS[o.stil].ad}
            </Text>
          </View>
        </View>
      </Card>
      <View style={st.twist}>
        <Icon name={t.icon as IconName} size={20} color={C.orange} />
        <View style={{ flex: 1 }}>
          <Text style={st.twistTitle}>{t.baslik}</Text>
          <Text style={st.twistText}>{t.aciklama}</Text>
        </View>
      </View>
      <Compare me={ben.stats} opp={o.stats} oppLabel={upName(o.soyad)} />
      <Text style={st.pickTitle}>{L("Oyun planını seç ve dövüşe başla")}</Text>
      <PlanPicker s={preview} onPick={onStart} />
    </Screen>
  );
}

function Countdown() {
  const [ms, setMs] = useState(msToNextDay());
  useEffect(() => {
    const t = setInterval(() => setMs(msToNextDay()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.floor(ms / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return <Text style={st.count}>{L("Yeni dövüş: {0}", [`${hh}:${mm}:${ss}`])}</Text>;
}

function DailyResultView({ gun, spec, r, store, onExit }: { gun: number; spec: DailySpec; r: DailyResult; store: DailyStore; onExit: () => void }) {
  const seri = liveStreak(store, gun);
  const g = grade(r.skor);
  const won = r.sonuc === 'G';
  const card: ShareCardData = {
    tur: won ? (r.yontem === 'KO' || r.yontem === 'TKO' || r.yontem === 'SUB' ? 'bitiris' : 'galibiyet') : 'kariyer',
    baslik: `🔥 ${L("GÜNÜN DÖVÜŞÜ #{0}", [gun])}`,
    ad: `${spec.ben.ad} ${spec.ben.soyad}`,
    adBuyuk: upName(`${spec.ben.ad} ${spec.ben.soyad}`),
    lakap: spec.ben.lakap,
    ust: resultText(r).toLocaleUpperCase(LOC),
    kutular: [
      [L("SKOR"), `${g} ${r.skor}`],
      [L("SERİ"), `🔥 ${seri}`],
      [L("RAKİP"), spec.rakip.soyad],
    ],
    alt: L("Herkes bugün aynı dövüşü oynadı. Sen daha iyisini yapabilir misin?"),
    look: lookFor(spec.ben),
    mesaj: L("Kafesten Kemere · Kendi dövüş efsaneni yaz"),
  };
  return (
    <Screen
      footer={
        <View style={{ gap: 8 }}>
          <ShareButton data={card} label={L("Sonucunu paylaş")} tone="gold" />
          <Button label={L("Menüye dön")} tone="ghost" icon="arrow-left" onPress={onExit} />
        </View>
      }
    >
      <Head gun={gun} store={store} />
      <View style={st.result}>
        <Text style={st.grade}>{g}</Text>
        <Text style={[st.resTitle, SLANT, { color: won ? C.gold : r.sonuc === 'B' ? C.dim : C.red }]}>{resultText(r).toLocaleUpperCase(LOC)}</Text>
        <Text style={st.score}>{L("Skor: {0}", [r.skor])}</Text>
      </View>
      <View style={st.stats}>
        {[
          [L("SERİ"), `🔥 ${seri}`],
          [L("EN İYİ SERİ"), String(store.enIyiSeri)],
          [L("OYNANAN"), String(store.toplam)],
        ].map(([k, v]) => (
          <View key={k} style={st.stat}>
            <Text style={st.statKey}>{k}</Text>
            <Text style={st.statVal}>{v}</Text>
          </View>
        ))}
      </View>
      <ChallengeBox gun={gun} r={r} />
      <Countdown />
      <Text style={st.hint}>{L("Yarın yeni bir dövüşçü, yeni bir rakip. Seriyi bozma!")}</Text>
      <RemindMe store={store} />
    </Screen>
  );
}

/** Meydan okuma: arkadaşının skoruyla kıyas ve bağlantıyla meydan okuma. */
function ChallengeBox({ gun, r }: { gun: number; r: DailyResult }) {
  const c = challengeFor(gun);
  const link = challengeLink(gun, r.skor);
  const [msg, setMsg] = useState('');
  if (!c && !link) return null;
  const diff = c ? r.skor - c.skor : 0;
  return (
    <View style={st.chal}>
      {c ? (
        <>
          <Text style={st.chalKicker}>{L("⚔️ MEYDAN OKUMA")}</Text>
          <View style={st.chalRow}>
            <View style={st.chalSide}>
              <Text style={st.chalLabel}>{L("SEN")}</Text>
              <Text style={[st.chalScore, diff >= 0 && { color: C.gold }]}>{r.skor}</Text>
            </View>
            <Text style={st.chalVs}>VS</Text>
            <View style={st.chalSide}>
              <Text style={st.chalLabel}>{L("ARKADAŞIN")}</Text>
              <Text style={[st.chalScore, diff < 0 && { color: C.gold }]}>{c.skor}</Text>
            </View>
          </View>
          <Text style={[st.chalRes, { color: diff > 0 ? C.green : diff < 0 ? C.red : C.dim }]}>
            {diff > 0 ? L("Meydan okumayı kazandın! 🏆") : diff < 0 ? L("{0} puan farkla kaybettin. Yarın rövanş!", [-diff]) : L("Berabere! Tam isabet.")}
          </Text>
        </>
      ) : (
        <Text style={st.chalText}>{L("Arkadaşların da aynı dövüşü oynasın: skorunu geçebilecekler mi?")}</Text>
      )}
      {link ? (
        <Button
          label={c ? L("Cevap ver: sen meydan oku") : L("Arkadaşına meydan oku")}
          icon="sword-cross"
          tone={c ? 'gold' : 'red'}
          onPress={async () => {
            const res = await shareText(L("🔥 YOL · Günün Dövüşü #{0}: {1} puan aldım {2}. Aynı dövüş, tek hak. Beni geçebilir misin? {3}", [gun, r.skor, grade(r.skor), link]));
            setMsg(res === 'kopyalandi' ? L("Bağlantı kopyalandı. Arkadaşına gönder!") : res === 'hata' ? L("Paylaşılamadı, tekrar dene.") : '');
          }}
        />
      ) : null}
      {msg ? <Text style={st.chalText}>{msg}</Text> : null}
    </View>
  );
}

/** İlk günlük dövüşten sonra: bildirim izni için doğal an. */
function RemindMe({ store }: { store: DailyStore }) {
  const ns = useNotifyState();
  if (!NOTIFY || ns !== 'sorulmadi') return null;
  return (
    <View style={st.remind}>
      <Icon name="bell-ring" size={20} color={C.gold} />
      <Text style={st.remindText}>{L("Yarınki dövüşü ve serini hatırlatalım mı?")}</Text>
      <Button
        label={L("Hatırlat")}
        tone="gold"
        onPress={async () => {
          if (await enableNotifications()) void rescheduleNotifications(store);
        }}
      />
    </View>
  );
}

const st = StyleSheet.create({
  chal: { backgroundColor: '#15120a', borderWidth: 1, borderColor: C.goldDeep, borderRadius: 12, padding: 12, gap: 10, marginTop: 14 },
  chalKicker: { color: C.gold, fontFamily: F.display, fontSize: 12, letterSpacing: 1.5, textAlign: 'center' },
  chalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  chalSide: { alignItems: 'center', minWidth: 90 },
  chalLabel: { color: C.faint, fontFamily: F.semi, fontSize: 10, letterSpacing: 1 },
  chalScore: { color: C.text, fontFamily: F.display, fontSize: 34 },
  chalVs: { color: C.faint, fontFamily: F.display, fontSize: 16 },
  chalRes: { fontFamily: F.semi, fontSize: 14, textAlign: 'center' },
  chalText: { color: C.dim, fontFamily: F.semi, fontSize: 13, textAlign: 'center' },
  chalBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#15120a', borderWidth: 1, borderColor: C.goldDeep, borderRadius: 12, padding: 12, marginBottom: 12 },
  chalBannerText: { flex: 1, color: C.gold, fontFamily: F.semi, fontSize: 14 },
  remind: { backgroundColor: '#15120a', borderWidth: 1, borderColor: C.goldDeep, borderRadius: 12, padding: 12, gap: 8, marginTop: 16, alignItems: 'center' },
  remindText: { color: C.text, fontFamily: F.semi, fontSize: 13, textAlign: 'center' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  kicker: { color: C.red, fontFamily: F.display, fontSize: 13, letterSpacing: 2 },
  streak: { color: C.orange, fontFamily: F.bold, fontSize: 13 },
  vs: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { flex: 1, alignItems: 'center', gap: 6 },
  vsText: { color: C.gold, fontFamily: F.display, fontSize: 22, marginHorizontal: 6 },
  name: { color: C.text, fontFamily: F.display, fontSize: 15, textAlign: 'center' },
  meta: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  twist: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1d1208', borderWidth: 1, borderColor: '#5a3a12', borderRadius: 12, padding: 12, marginVertical: 10 },
  twistTitle: { color: C.orange, fontFamily: F.bold, fontSize: 14 },
  twistText: { color: C.dim, fontFamily: F.body, fontSize: 12, marginTop: 2 },
  pickTitle: { color: C.gold, fontFamily: F.display, fontSize: 15, letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  result: { alignItems: 'center', paddingVertical: 18, gap: 6 },
  grade: { fontSize: 64 },
  resTitle: { fontFamily: F.display, fontSize: 30, textAlign: 'center' },
  score: { color: C.text, fontFamily: F.bold, fontSize: 16 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 6 },
  stat: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, alignItems: 'center' },
  statKey: { color: C.faint, fontFamily: F.semi, fontSize: 10, letterSpacing: 1 },
  statVal: { color: C.text, fontFamily: F.display, fontSize: 22, marginTop: 2 },
  count: { color: C.gold, fontFamily: F.display, fontSize: 18, textAlign: 'center', marginTop: 18 },
  hint: { color: C.dim, fontFamily: F.body, fontSize: 13, textAlign: 'center', marginTop: 6 },
});
