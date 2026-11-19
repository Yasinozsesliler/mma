// Hayalî Maç Stüdyosu (Şampiyon Paketi): istenen iki dövüşçü, istenen sıklet, istendiği kadar. Efsanelerim de seçilebilir.
// Albüme yazılmaz (albüm günün maçıyla dolar). Ayrıca emeklilik ekranındaki "Efsanelerime ekle" kartı.
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSoundScene } from '../audio';
import { finishFight } from '../engine/career';
import { WEIGHT_CLASSES } from '../engine/data';
import { endDreamFight, heavierClass, legendFighter, studioGame, WEIGHT_ORDER, type DreamFighter } from '../engine/dreamFight';
import { LEGEND_IDS } from '../engine/legendRun';
import type { GameState, PlanKey, WeightClass } from '../engine/types';
import { L, LOC } from '../i18n';
import { PURCHASES, usePremium } from '../monetization';
import { myLegendLimit, myLegendOf, removeMyLegend, saveMyLegend, useMyLegends } from '../myLegends';
import { Compare } from './Compare';
import { Button, Card, Icon, Screen, SLANT, Title, upName } from './components';
import { resultText } from './DailyScreen';
import { FighterAvatar } from './FighterAvatar';
import { FightScreen } from './FightScreen';
import { PlanPicker } from './PlanPicker';
import { BuyPremium, PremiumCompare } from './PremiumCard';
import { C, F } from './theme';

const fname = (f: DreamFighter) => `${f.ad} ${f.soyad}`;
const useStudioOpen = () => {
  const premium = usePremium();
  return premium || !PURCHASES;
};

export function StudioScreen({ onBack }: { onBack: () => void }) {
  const open = useStudioOpen();
  const mine = useMyLegends();
  const [ben, setBen] = useState<DreamFighter | null>(null);
  const [rakip, setRakip] = useState<DreamFighter | null>(null);
  const [siklet, setSiklet] = useState<WeightClass | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [son, setSon] = useState<{ sonuc: 'G' | 'M' | 'B'; yontem: string; raunt: number } | null>(null);
  const gRef = useRef<GameState | null>(null);
  const all: DreamFighter[] = [...mine, ...LEGEND_IDS.map(legendFighter)];

  const act = (fn: (s: GameState) => void) => {
    const cur = gRef.current;
    if (!cur) return;
    if (fn === finishFight) {
      const r = cur.pending.dovus!.sonuc!;
      setSon({ sonuc: r.kazanan === 'p' ? 'G' : r.kazanan === 'o' ? 'M' : 'B', yontem: r.yontem, raunt: r.raunt });
      endDreamFight();
      gRef.current = null;
      setGame(null);
      return;
    }
    fn(cur);
    const copy = { ...cur };
    gRef.current = copy;
    setGame(copy);
  };
  const start = (plan: PlanKey) => {
    if (!ben || !rakip) return;
    const s = studioGame(ben, rakip, siklet ?? heavierClass(ben.siklet, rakip.siklet), plan);
    gRef.current = s;
    setSon(null);
    setGame(s);
  };

  if (game) return <StudioFight s={game} act={act} />;

  if (!open)
    return (
      <Screen footer={<Button label={L("Geri")} icon="arrow-left" tone="ghost" onPress={onBack} />}>
        <Title art="studyo" kicker={L("👑 ŞAMPİYON PAKETİ")} sub={L("İstediğin iki dövüşçü, istediğin sıklet, istediğin kadar maç. Kendi efsanelerini de efsanelere karşı dövüştür.")}>
          {L("Hayalî Maç Stüdyosu")}
        </Title>
        <View style={[st.grid, { opacity: 0.5 }]}>
          {all.slice(0, 6).map((f) => (
            <View key={f.key} style={st.cell}>
              <FighterAvatar look={f.gorunum} size={48} />
              <Text style={st.cellName} numberOfLines={1}>
                {upName(f.soyad, f.uyruk)}
              </Text>
            </View>
          ))}
        </View>
        <PremiumCompare />
        <View style={{ height: 10 }} />
        <BuyPremium />
      </Screen>
    );

  if (son && ben && rakip)
    return (
      <Screen
        footer={
          <View style={{ gap: 8 }}>
            <Button label={L("Rövanş")} icon="sword-cross" tone="red" onPress={() => setSon(null)} />
            <Button
              label={L("Yeni eşleşme")}
              icon="shuffle-variant"
              tone="ghost"
              onPress={() => {
                setSon(null);
                setBen(null);
                setRakip(null);
                setSiklet(null);
              }}
            />
          </View>
        }
      >
        <Versus a={ben} b={rakip} />
        <View style={st.result}>
          <Text style={st.grade}>{son.sonuc === 'G' ? '🏆' : son.sonuc === 'B' ? '🤝' : '💪'}</Text>
          <Text style={[st.resTitle, SLANT, { color: son.sonuc === 'G' ? C.gold : son.sonuc === 'B' ? C.dim : C.red }]}>
            {resultText({ skor: 0, sonuc: son.sonuc, yontem: son.yontem as never, raunt: son.raunt }).toLocaleUpperCase(LOC)}
          </Text>
        </View>
      </Screen>
    );

  // 1) Kendi dövüşçün 2) rakip (aynı kategori) 3) sıklet ve plan
  if (!ben || !rakip) {
    const choosing = !ben ? 'ben' : 'rakip';
    const list = all.filter((f) => !ben || (f.key !== ben.key && !!f.kadin === !!ben.kadin));
    return (
      <Screen footer={<Button label={ben ? L("Geri") : L("Hayalî Maçlar'a dön")} icon="arrow-left" tone="ghost" onPress={() => (ben ? setBen(null) : onBack())} />}>
        <Title kicker={L("HAYALÎ MAÇ STÜDYOSU")} sub={choosing === 'ben' ? L("Kimi yöneteceksin?") : L("Rakibini seç.")}>
          {choosing === 'ben' ? L("Kırmızı köşe") : L("Mavi köşe")}
        </Title>
        {mine.length === 0 && choosing === 'ben' ? <Text style={st.hint}>{L("Emekli olan dövüşçülerini emeklilik ekranından Efsanelerim'e ekleyebilirsin; burada efsanelere karşı dövüşürler.")}</Text> : null}
        <View style={st.grid}>
          {list.map((f) => {
            const isMine = f.key.startsWith('my-');
            return (
              <Pressable
                key={f.key}
                onPress={() => (choosing === 'ben' ? setBen(f) : (setRakip(f), setSiklet(heavierClass(ben!.siklet, f.siklet))))}
                style={({ pressed }) => [st.cell, isMine && { borderColor: C.gold + '88' }, pressed && { borderColor: C.gold }]}
              >
                <FighterAvatar look={f.gorunum} size={52} ring={isMine ? C.gold : undefined} />
                <Text style={st.cellName} numberOfLines={1}>
                  {upName(f.soyad, f.uyruk)}
                </Text>
                <Text style={st.cellMeta} numberOfLines={1}>
                  {isMine ? L("⭐ Efsanem") : f.lakap}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Screen>
    );
  }

  const w = siklet ?? heavierClass(ben.siklet, rakip.siklet);
  return (
    <Screen footer={<Button label={L("Rakibi değiştir")} icon="arrow-left" tone="ghost" onPress={() => setRakip(null)} />}>
      <Title kicker={L("HAYALÎ MAÇ STÜDYOSU")} sub={L("Zirvedeki halleriyle · 5 raunt")}>
        {L("{0} vs {1}", [upName(ben.soyad, ben.uyruk), upName(rakip.soyad, rakip.uyruk)])}
      </Title>
      <Versus a={ben} b={rakip} />
      <Text style={st.pick}>{L("SIKLET")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {WEIGHT_ORDER.map((k) => (
          <Pressable key={k} onPress={() => setSiklet(k)} style={[st.chip, w === k && st.chipOn]}>
            <Text style={[st.chipText, w === k && { color: '#111' }]}>{WEIGHT_CLASSES[k].ad}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Compare me={ben.stats} opp={rakip.stats} oppLabel={upName(rakip.soyad, rakip.uyruk)} />
      <Text style={st.pick}>{L("{0} olarak oyun planını seç", [fname(ben)])}</Text>
      <StudioPlan ben={ben} rakip={rakip} siklet={w} onPick={start} />
    </Screen>
  );
}

function StudioPlan({ ben, rakip, siklet, onPick }: { ben: DreamFighter; rakip: DreamFighter; siklet: WeightClass; onPick: (p: PlanKey) => void }) {
  const [preview] = useState(() => studioGame(ben, rakip, siklet, 'ayakta'));
  useEffect(() => endDreamFight(), []);
  return <PlanPicker s={preview} onPick={onPick} />;
}

function StudioFight({ s, act }: { s: GameState; act: (fn: (s: GameState) => void) => void }) {
  useSoundScene('fight');
  return <FightScreen s={s} act={act} />;
}

function Versus({ a, b }: { a: DreamFighter; b: DreamFighter }) {
  return (
    <Card>
      <View style={st.vs}>
        {[a, b].map((f, i) => (
          <View key={f.key} style={st.side}>
            <FighterAvatar look={f.gorunum} size={78} ring={i === 0 ? C.red : C.blue} />
            <Text style={[st.name, SLANT]} numberOfLines={2}>
              {upName(fname(f), f.uyruk)}
            </Text>
            <Text style={st.meta}>
              {f.rekor.g}-{f.rekor.m}-{f.rekor.b}
            </Text>
          </View>
        ))}
      </View>
      <Text style={st.vsText}>VS</Text>
    </Card>
  );
}

/** Hayalî Maçlar ekranında stüdyoya giriş kartı. */
export function StudioEntry({ onOpen }: { onOpen: () => void }) {
  const open = useStudioOpen();
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [st.entry, pressed && { borderColor: C.gold }]}>
      <Icon name="movie-open-star" size={24} color={C.gold} />
      <View style={{ flex: 1 }}>
        <Text style={st.entryTitle}>{L("Hayalî Maç Stüdyosu")}</Text>
        <Text style={st.entrySub}>{L("İstediğin iki dövüşçü, istediğin sıklet, sınırsız maç. Kendi efsanelerin de burada.")}</Text>
      </View>
      {open ? <Icon name="chevron-right" size={20} color={C.gold} /> : <Text style={st.badge}>👑</Text>}
    </Pressable>
  );
}

const useSaved = (s: GameState) => {
  const mine = useMyLegends();
  return mine.some((x) => x.key === myLegendOf(s).key);
};

/** Menüdeki emekli kariyer kartında: tek dokunuşla Efsanelerim'e ekle. */
export function MyLegendLink({ s }: { s: GameState }) {
  const premium = usePremium();
  const saved = useSaved(s);
  const [res, setRes] = useState<'ok' | 'var' | 'dolu' | null>(null);
  const unlimited = premium || !PURCHASES;
  if (saved) return <Text style={[st.linkRow, { color: C.green }]}>{L("⭐ Efsanelerinde · Hayalî Maç Stüdyosu'nda dövüşebilir")}</Text>;
  if (res === 'dolu') return <Text style={[st.linkRow, { color: C.orange }]}>{L("Efsanelerim dolu. 👑 Şampiyon Paketi ile 10 efsane.")}</Text>;
  return (
    <Pressable onPress={() => setRes(saveMyLegend(s, unlimited))} hitSlop={6}>
      <Text style={st.linkRow}>{L("⭐ Efsanelerime ekle (Hayalî Maç Stüdyosu)")}</Text>
    </Pressable>
  );
}

/** Emeklilik ekranı: dövüşçüyü zirvedeki haliyle Efsanelerim'e ekle. */
export function SaveMyLegendCard({ s }: { s: GameState }) {
  const premium = usePremium();
  const mine = useMyLegends();
  const unlimited = premium || !PURCHASES;
  const [res, setRes] = useState<'ok' | 'var' | 'dolu' | null>(null);
  const saved = useSaved(s);
  return (
    <Card accent={C.gold}>
      <Text style={st.kicker}>{L("⭐ EFSANELERİM")}</Text>
      <Text style={st.text}>{L("{0} zirvedeki haliyle kaydedilsin; Hayalî Maç Stüdyosu'nda Conor'a, Khabir'e ve diğer efsanelere karşı dövüşsün.", [`${s.fighter.ad} ${s.fighter.soyad}`])}</Text>
      {saved ? (
        <Text style={[st.text, { color: C.green, fontFamily: F.bold }]}>{L("✓ Efsanelerinde")}</Text>
      ) : res === 'dolu' ? (
        <>
          <Text style={[st.text, { color: C.orange }]}>
            {L("Efsanelerim dolu ({0}/{1}). Şampiyon Paketi ile 10 efsane kaydedebilirsin ya da eskisinin yerine kaydedebilirsin.", [mine.length, myLegendLimit(unlimited)])}
          </Text>
          {PURCHASES && !premium ? <BuyPremium /> : null}
          {mine.length ? (
            <Pressable onPress={() => (removeMyLegend(mine[0].key), setRes(null))} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
              <Text style={st.link}>{L("{0} yerine kaydet", [`${mine[0].ad} ${mine[0].soyad}`])}</Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <Button label={L("Efsanelerime ekle")} icon="star" tone="gold" onPress={() => setRes(saveMyLegend(s, unlimited))} />
      )}
    </Card>
  );
}

const st = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6, marginBottom: 12 },
  cell: { width: '31%', flexGrow: 1, alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 8, gap: 3 },
  cellName: { color: C.text, fontFamily: F.display, fontSize: 13, marginTop: 4, maxWidth: '100%' },
  cellMeta: { color: C.dim, fontFamily: F.semi, fontSize: 10, maxWidth: '100%' },
  hint: { color: C.dim, fontFamily: F.body, fontSize: 12.5, lineHeight: 18, marginBottom: 6 },
  pick: { color: C.gold, fontFamily: F.display, fontSize: 14, letterSpacing: 1, marginTop: 12, marginBottom: 6 },
  chip: { borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: C.gold, borderColor: C.gold },
  chipText: { color: C.text, fontFamily: F.semi, fontSize: 12 },
  vs: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  side: { flex: 1, alignItems: 'center', gap: 6 },
  vsText: { position: 'absolute', alignSelf: 'center', top: 40, color: C.gold, fontFamily: F.display, fontSize: 22 },
  name: { color: C.text, fontFamily: F.display, fontSize: 15, textAlign: 'center' },
  meta: { color: C.dim, fontFamily: F.semi, fontSize: 12, textAlign: 'center' },
  result: { alignItems: 'center', paddingVertical: 14, gap: 6 },
  grade: { fontSize: 56 },
  resTitle: { fontFamily: F.display, fontSize: 26, textAlign: 'center' },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.gold + '66', borderRadius: 14, padding: 12, marginTop: 12, backgroundColor: '#15110a' },
  entryTitle: { color: C.gold, fontFamily: F.bold, fontSize: 14 },
  entrySub: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 16, marginTop: 2 },
  badge: { fontSize: 18 },
  kicker: { color: C.gold, fontFamily: F.semi, fontSize: 11, letterSpacing: 1.5, marginBottom: 4 },
  text: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 19, marginBottom: 8 },
  link: { color: C.gold, fontFamily: F.semi, fontSize: 12, textDecorationLine: 'underline' },
  linkRow: { color: C.gold, fontFamily: F.semi, fontSize: 12, marginTop: 10 },
});
