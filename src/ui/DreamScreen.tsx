// Hayalî Maçlar ekranı: günün efsane eşleşmesi → plan → dövüş → sonuç ve albüm. Günde bir hak, reklamla bir hak daha.
import { noteGoal } from '../dailyGoals';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSoundScene } from '../audio';
import { finishFight } from '../engine/career';
import { WEIGHT_CLASSES } from '../engine/data';
import {
  albumProgress,
  dayNumber,
  dreamGame,
  dreamMe,
  dreamName,
  dreamOpponent,
  dreamPairs,
  dreamSpec,
  dreamTitle,
  emptyDream,
  endDreamFight,
  pairKey,
  recordDream,
  triesLeft,
  type DreamResult,
  type DreamSpec,
  type DreamStore,
} from '../engine/dreamFight';
import { LEGENDS } from '../engine/legendRun';
import type { GameState, PlanKey } from '../engine/types';
import { L, LOC } from '../i18n';
import { LEGENDS_STORE, MONETIZATION } from '../monetization';
import { getPref, setPref } from '../prefs';
import { ShareButton } from '../share/ShareButton';
import type { ShareCardData } from '../share/types';
import { AdOffer } from './AdOffer';
import { Compare } from './Compare';
import { Button, Card, Icon, Screen, SLANT, Title, upName } from './components';
import { resultText } from './DailyScreen';
import { FighterAvatar } from './FighterAvatar';
import { useLegendUnlocked } from './LegendScreens';
import { requestLegend } from '../legendNav';
import { StudioEntry, StudioScreen } from './StudioScreen';
import { addSeasonXp } from '../season';
import { FightScreen } from './FightScreen';
import { PlanPicker } from './PlanPicker';
import { C, F } from './theme';

const STORE_KEY = 'yol_hayali';
const MATCH_KEY = 'yol_hayali_mac';

export function loadDream(): DreamStore {
  try {
    const raw = getPref(STORE_KEY);
    return raw ? { ...emptyDream(), ...JSON.parse(raw) } : emptyDream();
  } catch {
    return emptyDream();
  }
}

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

export function DreamScreen({ onExit }: { onExit: () => void }) {
  const gun = dayNumber();
  const [spec] = useState<DreamSpec>(() => dreamSpec(gun));
  const [store, setStore] = useState<DreamStore>(loadDream);
  const [game, setGame] = useState<GameState | null>(() => loadMatch(gun));
  const [son, setSon] = useState<DreamResult | null>(null);
  const [studio, setStudio] = useState(false);
  const gRef = useRef<GameState | null>(game);
  const kalan = triesLeft(store, gun);
  const bugun = store.gunler[gun] ?? [];

  const finish = (s: GameState) => {
    const r = s.pending.dovus!.sonuc!;
    const res: DreamResult = { sonuc: r.kazanan === 'p' ? 'G' : r.kazanan === 'o' ? 'M' : 'B', yontem: r.yontem, raunt: r.raunt };
    const next = recordDream(loadDream(), spec, res);
    setPref(STORE_KEY, JSON.stringify(next));
    addSeasonXp('hayali');
    noteGoal('hayali');
    setPref(MATCH_KEY, '');
    endDreamFight();
    setStore(next);
    setSon(res);
    gRef.current = null;
    setGame(null);
  };

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
    setSon(null);
    const s = dreamGame(spec, plan, bugun.length);
    gRef.current = s;
    setPref(MATCH_KEY, JSON.stringify({ gun, s }));
    setGame(s);
  };

  const extra = () => {
    const next = { ...loadDream(), ekHak: gun };
    setPref(STORE_KEY, JSON.stringify(next));
    setStore(next);
    setSon(null);
  };

  if (game) return <DreamFight s={game} act={act} />;
  if (studio) return <StudioScreen onBack={() => setStudio(false)} />;
  if (kalan > 0 && !son) return <DreamIntro spec={spec} store={store} deneme={bugun.length} onStart={start} onStudio={() => setStudio(true)} />;
  return <DreamResultView spec={spec} store={store} r={son ?? bugun[bugun.length - 1]} canExtra={kalan === 0 && store.ekHak !== gun && !bugun.some((x) => x.sonuc === 'G')} onExtra={extra} onAgain={() => setSon(null)} again={kalan > 0} onExit={onExit} onStudio={() => setStudio(true)} />;
}

function DreamFight({ s, act }: { s: GameState; act: (fn: (s: GameState) => void) => void }) {
  useSoundScene('fight');
  return <FightScreen s={s} act={act} />;
}

function Head({ store }: { store: DreamStore }) {
  const p = albumProgress(store);
  return (
    <View style={st.head}>
      <Text style={st.kicker}>{L("HAYALÎ MAÇLAR")}</Text>
      <Text style={st.album}>{L("📒 Albüm {0}/{1}", [p.got, p.max])}</Text>
    </View>
  );
}

function Versus({ spec }: { spec: DreamSpec }) {
  const a = LEGENDS[spec.ben];
  const b = LEGENDS[spec.rakip];
  return (
    <Card>
      <View style={st.vs}>
        {[a, b].map((d, i) => (
          <View key={d.id} style={st.side}>
            <FighterAvatar look={d.gorunum} size={84} ring={i === 0 ? C.red : C.blue} />
            <Text style={[st.name, SLANT]} numberOfLines={2}>
              {upName(dreamName(d.id), d.uyruk)}
            </Text>
            <Text style={st.meta}>
              {d.bayrak} “{d.lakap()}”
            </Text>
          </View>
        ))}
      </View>
      <Text style={st.vsText}>VS</Text>
    </Card>
  );
}

function DreamIntro({ spec, store, deneme, onStart, onStudio }: { spec: DreamSpec; store: DreamStore; deneme: number; onStart: (p: PlanKey) => void; onStudio: () => void }) {
  const [preview] = useState(() => dreamGame(spec, 'ayakta', 0));
  useEffect(() => endDreamFight(), []);
  return (
    <Screen>
      <Head store={store} />
      <Title art="dev" kicker={deneme ? L("İKİNCİ HAK") : L("BUGÜNÜN EŞLEŞMESİ · HERKES AYNI MAÇI OYNUYOR")} sub={L("Zirvedeki halleriyle · {0} · 5 raunt", [WEIGHT_CLASSES[spec.siklet].ad])}>
        {dreamTitle(spec.ben, spec.rakip)}
      </Title>
      <Versus spec={spec} />
      <Compare me={dreamMe(spec).stats} opp={dreamOpponent(spec).stats} oppLabel={upName(LEGENDS[spec.rakip].soyad, LEGENDS[spec.rakip].uyruk)} />
      <Text style={st.pickTitle}>{L("{0} olarak oyun planını seç", [dreamName(spec.ben)])}</Text>
      <PlanPicker s={preview} onPick={onStart} />
      <StudioEntry onOpen={onStudio} />
    </Screen>
  );
}

function DreamResultView(p: { spec: DreamSpec; store: DreamStore; r?: DreamResult; canExtra: boolean; again: boolean; onExtra: () => void; onAgain: () => void; onExit: () => void; onStudio: () => void }) {
  const { spec, store, r } = p;
  const won = r?.sonuc === 'G';
  const prog = albumProgress(store);
  const me = LEGENDS[spec.ben];
  const card: ShareCardData = {
    tur: won ? 'bitiris' : 'kariyer',
    baslik: `⭐ ${L("HAYALÎ MAÇ")}`,
    ad: dreamName(spec.ben),
    adBuyuk: upName(dreamName(spec.ben), me.uyruk),
    lakap: me.lakap(),
    ust: (r ? resultText({ skor: 0, sonuc: r.sonuc, yontem: r.yontem as never, raunt: r.raunt }) : '').toLocaleUpperCase(LOC),
    kutular: [
      [L("RAKİP"), LEGENDS[spec.rakip].soyad],
      [L("SIKLET"), WEIGHT_CLASSES[spec.siklet].ad],
      [L("ALBÜM"), `${prog.got}/${prog.max}`],
    ],
    alt: dreamTitle(spec.ben, spec.rakip),
    look: me.gorunum,
    mesaj: L("Kafesten Kemere · Kendi dövüş efsaneni yaz"),
  };
  return (
    <Screen
      footer={
        <View style={{ gap: 8 }}>
          {r ? <ShareButton data={card} label={L("Sonucunu paylaş")} tone="gold" /> : null}
          <Button label={L("Menüye dön")} tone="ghost" icon="arrow-left" onPress={p.onExit} />
        </View>
      }
    >
      <Head store={store} />
      <Versus spec={spec} />
      {r ? (
        <View style={st.result}>
          <Text style={st.grade}>{won ? '🏆' : r.sonuc === 'B' ? '🤝' : '💪'}</Text>
          <Text style={[st.resTitle, SLANT, { color: won ? C.gold : r.sonuc === 'B' ? C.dim : C.red }]}>
            {resultText({ skor: 0, sonuc: r.sonuc, yontem: r.yontem as never, raunt: r.raunt }).toLocaleUpperCase(LOC)}
          </Text>
          {won ? <Text style={st.sub}>{L("Albüme eklendi: {0} bu eşleşmeyi kazandı.", [dreamName(spec.ben)])}</Text> : null}
        </View>
      ) : null}
      {p.again ? <Button label={L("İkinci hakkını kullan")} icon="sword-cross" tone="red" onPress={p.onAgain} /> : null}
      {p.canExtra ? (
        MONETIZATION ? (
          <AdOffer icon="sword-cross" title={L("Bir hak daha")} desc={L("Aynı eşleşmeyi bugün bir kez daha dene.")} onReward={p.onExtra} />
        ) : (
          <Button label={L("Bir hak daha")} icon="sword-cross" tone="red" onPress={p.onExtra} />
        )
      ) : null}
      {r ? <StoryLink id={spec.ben} onGo={p.onExit} /> : null}
      <StudioEntry onOpen={p.onStudio} />
      <AlbumGrid store={store} />
      <Text style={st.hint}>{L("Her gün yeni bir eşleşme. Albümü tamamlamak için her maçı iki taraftan da kazan.")}</Text>
    </Screen>
  );
}

/** Maçtan sonra: bu efsanenin hikâyesine geçiş (menüde Efsane Yolları açılır). */
function StoryLink({ id, onGo }: { id: DreamSpec['ben']; onGo: () => void }) {
  const unlocked = useLegendUnlocked();
  const d = LEGENDS[id];
  return (
    <Pressable
      onPress={() => {
        requestLegend(id);
        onGo();
      }}
      style={({ pressed }) => [st.story, { borderColor: pressed ? d.renk : d.renk + '66' }]}
    >
      <FighterAvatar look={d.gorunum} size={42} ring={d.renk} />
      <View style={{ flex: 1 }}>
        <Text style={st.storyTitle}>{L("{0} nasıl efsane oldu?", [dreamName(id)])}</Text>
        <Text style={st.storySub}>{unlocked(id) ? L("Hikâyesini bölüm bölüm oyna.") : LEGENDS_STORE ? L("Hikâyesini oyna: ilk 2 bölüm ücretsiz.") : L("Hikâyesini tam sürümde oyna.")}</Text>
      </View>
      <Icon name="chevron-right" size={20} color={d.renk} />
    </Pressable>
  );
}

function AlbumGrid({ store }: { store: DreamStore }) {
  return (
    <View style={st.grid}>
      {dreamPairs().map(([a, b]) => {
        const got = store.album[pairKey(a, b)] ?? [];
        return (
          <View key={pairKey(a, b)} style={[st.cell, got.length === 2 && { borderColor: C.gold }]}>
            <View style={st.cellRow}>
              <FighterAvatar look={LEGENDS[a].gorunum} size={30} ring={got.includes(a) ? C.gold : C.border} />
              <Text style={st.cellVs}>vs</Text>
              <FighterAvatar look={LEGENDS[b].gorunum} size={30} ring={got.includes(b) ? C.gold : C.border} />
            </View>
            <Text style={st.cellText}>{got.length}/2</Text>
          </View>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  story: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 10, backgroundColor: '#15110a' },
  storyTitle: { color: C.text, fontFamily: F.bold, fontSize: 14 },
  storySub: { color: C.dim, fontFamily: F.body, fontSize: 12, marginTop: 2 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  kicker: { color: C.gold, fontFamily: F.display, fontSize: 13, letterSpacing: 2 },
  album: { color: C.dim, fontFamily: F.bold, fontSize: 12 },
  vs: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  side: { flex: 1, alignItems: 'center', gap: 6 },
  vsText: { position: 'absolute', alignSelf: 'center', top: 44, color: C.gold, fontFamily: F.display, fontSize: 22 },
  name: { color: C.text, fontFamily: F.display, fontSize: 15, textAlign: 'center' },
  meta: { color: C.dim, fontFamily: F.semi, fontSize: 12, textAlign: 'center' },
  pickTitle: { color: C.gold, fontFamily: F.display, fontSize: 15, letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  result: { alignItems: 'center', paddingVertical: 14, gap: 6 },
  grade: { fontSize: 56 },
  resTitle: { fontFamily: F.display, fontSize: 26, textAlign: 'center' },
  sub: { color: C.gold, fontFamily: F.semi, fontSize: 13, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  cell: { width: '31%', flexGrow: 1, alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 8, gap: 4 },
  cellRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cellVs: { color: C.faint, fontFamily: F.bold, fontSize: 10 },
  cellText: { color: C.dim, fontFamily: F.bold, fontSize: 11 },
  hint: { color: C.dim, fontFamily: F.body, fontSize: 13, textAlign: 'center', marginTop: 12 },
});

