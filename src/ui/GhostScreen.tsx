// Hayalet Maç ekranı: kendi dövüşçünün kodunu paylaş, arkadaşının kodunu yapıştır, onun dövüşçüsüyle 5 raunt kapış.
// Herkese ücretsiz; ödül yok, yalnızca aradaki karne (oyunu arkadaştan arkadaşa yayan bir meydan okuma).
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { track } from '../analytics';
import { useSoundScene } from '../audio';
import { shareText } from '../challenge';
import { finishFight } from '../engine/career';
import { isCoach } from '../engine/coachMode';
import { endDreamFight, heavierClass, studioGame, type DreamFighter } from '../engine/dreamFight';
import type { GameState, PlanKey } from '../engine/types';
import { addGhost, clearPendingGhost, ghostCode, ghostLink, parseGhost, pendingGhost, recordGhost, removeGhost, useGhosts, type Ghost } from '../ghost';
import { L, LOC } from '../i18n';
import { myLegendOf, useMyLegends } from '../myLegends';
import { Compare } from './Compare';
import { Button, Card, Icon, Screen, SLANT, Title, upName } from './components';
import { resultText } from './DailyScreen';
import { FighterAvatar } from './FighterAvatar';
import { FightScreen } from './FightScreen';
import { PlanPicker } from './PlanPicker';
import { C, F } from './theme';

type Res = { sonuc: 'G' | 'M' | 'B'; yontem: string; raunt: number };
const fname = (f: DreamFighter) => `${f.ad} ${f.soyad}`;

function inviteText(f: DreamFighter) {
  const code = ghostCode(f);
  const link = ghostLink(code);
  return `${L("🥊 {0} “{1}” seni kafese çağırıyor! YOL: Kafesten Kemere'de Hayalet Maç'a bu kodu yapıştır:", [fname(f), f.lakap || f.soyad])}\n\n${code}${link ? `\n\n${link}` : ''}`;
}

export function GhostScreen({ saves, onExit }: { saves: (GameState | null)[]; onExit: () => void }) {
  const legends = useMyLegends();
  const ghosts = useGhosts();
  const mine: DreamFighter[] = [];
  [...saves.filter((s): s is GameState => !!s && !isCoach(s)).map(myLegendOf), ...legends].forEach((f) => {
    if (!mine.some((x) => x.key === f.key)) mine.push(f);
  });
  const [kod, setKod] = useState(mine[0]?.key ?? null);
  const [metin, setMetin] = useState('');
  // Bağlantıyla gelen meydan okuma kendiliğinden listeye girer.
  const [msg, setMsg] = useState(() => {
    const p = pendingGhost();
    if (!p) return '';
    clearPendingGhost();
    return addGhost(p) !== 'dolu' ? L("👻 {0} meydan okudu! Listende, hemen dövüşebilirsin.", [fname(p)]) : '';
  });
  const [rakip, setRakip] = useState<Ghost | null>(null);
  const [ben, setBen] = useState<DreamFighter | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [son, setSon] = useState<Res | null>(null);
  const gRef = useRef<GameState | null>(null);

  const act = (fn: (s: GameState) => void) => {
    const cur = gRef.current;
    if (!cur) return;
    if (fn === finishFight) {
      const r = cur.pending.dovus!.sonuc!;
      const sonuc = r.kazanan === 'p' ? 'G' : r.kazanan === 'o' ? 'M' : 'B';
      if (rakip) recordGhost(rakip.key, sonuc);
      track('ghost_fight_end', { sonuc });
      setSon({ sonuc, yontem: r.yontem, raunt: r.raunt });
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
    const s = studioGame(ben, rakip, heavierClass(ben.siklet, rakip.siklet), plan);
    gRef.current = s;
    setSon(null);
    setGame(s);
  };
  const add = () => {
    const f = parseGhost(metin);
    if (!f) return setMsg(L("Kod okunamadı. Mesajın tamamını ya da HYL1: ile başlayan kısmı yapıştır."));
    if (mine.some((x) => x.key === f.key)) return setMsg(L("Bu senin kendi dövüşçün."));
    const r = addGhost(f);
    setMsg(r === 'ok' ? L("👻 {0} listene eklendi.", [fname(f)]) : r === 'var' ? L("{0} zaten listende.", [fname(f)]) : L("Liste dolu. Eski bir hayaleti sil."));
    if (r === 'ok') {
      setMetin('');
      track('ghost_added');
    }
  };
  const share = async (f: DreamFighter) => {
    const r = await shareText(inviteText(f));
    track('ghost_share');
    setMsg(r === 'kopyalandi' ? L("Kod panoya kopyalandı. Arkadaşına gönder!") : r === 'hata' ? L("Paylaşılamadı, tekrar dene.") : '');
  };

  if (game) return <GhostFight s={game} act={act} />;

  const back = () => {
    setSon(null);
    setBen(null);
    setRakip(null);
  };

  // Sonuç
  if (son && ben && rakip) {
    const g = ghosts.find((x) => x.key === rakip.key) ?? rakip;
    const brag = `${L("👻 Hayalet Maç: {0} karşısında {1}: {2}. Sıra sende, beni yenebilir misin?", [fname(rakip), fname(ben), resultText({ skor: 0, sonuc: son.sonuc, yontem: son.yontem as never, raunt: son.raunt })])}\n\n${inviteText(ben)}`;
    return (
      <Screen
        footer={
          <View style={{ gap: 8 }}>
            <Button label={L("Rövanş")} icon="sword-cross" tone="red" onPress={() => setSon(null)} />
            <Button label={L("Sonucu paylaş ve meydan oku")} icon="share-variant" tone="gold" onPress={() => void shareText(brag).then(() => track('ghost_result_share'))} />
            <Button label={L("Hayalet listesine dön")} icon="arrow-left" tone="ghost" onPress={back} />
          </View>
        }
      >
        <Versus a={ben} b={rakip} />
        <View style={st.result}>
          <Text style={st.grade}>{son.sonuc === 'G' ? '🏆' : son.sonuc === 'B' ? '🤝' : '💪'}</Text>
          <Text style={[st.resTitle, SLANT, { color: son.sonuc === 'G' ? C.gold : son.sonuc === 'B' ? C.dim : C.red }]}>
            {resultText({ skor: 0, sonuc: son.sonuc, yontem: son.yontem as never, raunt: son.raunt }).toLocaleUpperCase(LOC)}
          </Text>
          <Text style={st.meta}>{L("Aranızdaki karne: {0}-{1}-{2}", [g.g, g.m, g.b])}</Text>
        </View>
      </Screen>
    );
  }

  // Plan seçimi
  if (ben && rakip)
    return (
      <Screen footer={<Button label={L("Dövüşçünü değiştir")} icon="arrow-left" tone="ghost" onPress={() => setBen(null)} />}>
        <Title kicker={L("👻 HAYALET MAÇ")} sub={L("Zirvedeki halleriyle · 5 raunt")}>
          {L("{0} vs {1}", [upName(ben.soyad, ben.uyruk), upName(rakip.soyad, rakip.uyruk)])}
        </Title>
        <Versus a={ben} b={rakip} />
        <Compare me={ben.stats} opp={rakip.stats} oppLabel={upName(rakip.soyad, rakip.uyruk)} />
        <Text style={st.pick}>{L("{0} olarak oyun planını seç", [fname(ben)])}</Text>
        <GhostPlan ben={ben} rakip={rakip} onPick={start} />
      </Screen>
    );

  // Hayalete karşı kendi dövüşçünü seç (aynı kategori)
  if (rakip) {
    const list = mine.filter((f) => !!f.kadin === !!rakip.kadin);
    return (
      <Screen footer={<Button label={L("Geri")} icon="arrow-left" tone="ghost" onPress={() => setRakip(null)} />}>
        <Title kicker={L("👻 HAYALET MAÇ")} sub={L("{0} karşısına kimi çıkaracaksın?", [fname(rakip)])}>
          {L("Kırmızı köşe")}
        </Title>
        {list.length === 0 ? <Text style={st.hint}>{L("Bu kategoride dövüşçün yok. Önce bir kariyer başlat.")}</Text> : null}
        <View style={st.grid}>
          {list.map((f) => (
            <Pressable key={f.key} onPress={() => setBen(f)} style={({ pressed }) => [st.cell, pressed && { borderColor: C.gold }]}>
              <FighterAvatar look={f.gorunum} size={52} />
              <Text style={st.cellName} numberOfLines={1}>
                {upName(f.soyad, f.uyruk)}
              </Text>
              <Text style={st.cellMeta}>
                {f.rekor.g}-{f.rekor.m}-{f.rekor.b}
              </Text>
            </Pressable>
          ))}
        </View>
      </Screen>
    );
  }

  const kodF = mine.find((f) => f.key === kod) ?? mine[0];
  return (
    <Screen footer={<Button label={L("Menüye dön")} icon="arrow-left" tone="ghost" onPress={onExit} />}>
      <Title kicker={L("👻 HAYALET MAÇ")} sub={L("Arkadaşının dövüşçüsü yapay zekâyla karşına çıkar. Sen de kodunu paylaş, seninkiyle dövüşsünler.")}>
        {L("Hayalet Maç")}
      </Title>
      {msg ? <Text style={st.msg}>{msg}</Text> : null}

      <Card>
        <Text style={st.kicker}>{L("SENİN KODUN")}</Text>
        {mine.length === 0 ? (
          <Text style={st.hint}>{L("Kod paylaşmak için önce bir kariyer başlat.")}</Text>
        ) : (
          <>
            <View style={st.chips}>
              {mine.map((f) => (
                <Pressable key={f.key} onPress={() => setKod(f.key)} style={[st.chip, kodF?.key === f.key && st.chipOn]}>
                  <Text style={[st.chipText, kodF?.key === f.key && { color: '#111' }]} numberOfLines={1}>
                    {upName(f.soyad, f.uyruk)} · {f.rekor.g}-{f.rekor.m}
                  </Text>
                </Pressable>
              ))}
            </View>
            {kodF ? <Button label={L("{0} ile meydan oku", [kodF.lakap || kodF.soyad])} icon="share-variant" tone="gold" onPress={() => void share(kodF)} /> : null}
          </>
        )}
      </Card>

      <Card>
        <Text style={st.kicker}>{L("ARKADAŞININ KODU")}</Text>
        <TextInput value={metin} onChangeText={setMetin} placeholder="HYL1:…" placeholderTextColor={C.faint} multiline style={st.input} autoCorrect={false} autoCapitalize="none" />
        <Button label={L("Hayaleti ekle")} icon="ghost" tone="ghost" disabled={!metin.trim()} onPress={add} />
      </Card>

      <Text style={st.pick}>{L("HAYALETLERİN")}</Text>
      {ghosts.length === 0 ? <Text style={st.hint}>{L("Henüz hayaletin yok. Arkadaşlarından kod iste ya da kendi kodunu paylaş.")}</Text> : null}
      {ghosts.map((g) => (
        <Pressable key={g.key} onPress={() => setRakip(g)} style={({ pressed }) => [st.row, pressed && { borderColor: C.gold }]}>
          <FighterAvatar look={g.gorunum} size={46} ring={C.blue} />
          <View style={{ flex: 1 }}>
            <Text style={st.rowName} numberOfLines={1}>
              {upName(fname(g), g.uyruk)}
            </Text>
            <Text style={st.meta} numberOfLines={1}>
              {g.lakap ? `“${g.lakap}” · ` : ''}
              {g.rekor.g}-{g.rekor.m}-{g.rekor.b}
            </Text>
            <Text style={[st.meta, { color: g.g > g.m ? C.green : g.m > g.g ? C.red : C.dim }]}>{g.g + g.m + g.b ? L("Karnen: {0}-{1}-{2}", [g.g, g.m, g.b]) : L("Henüz dövüşmediniz")}</Text>
          </View>
          <Icon name="sword-cross" size={20} color={C.gold} />
          <Pressable onPress={() => removeGhost(g.key)} hitSlop={10}>
            <Icon name="close" size={18} color={C.faint} />
          </Pressable>
        </Pressable>
      ))}
    </Screen>
  );
}

function GhostPlan({ ben, rakip, onPick }: { ben: DreamFighter; rakip: DreamFighter; onPick: (p: PlanKey) => void }) {
  const [preview] = useState(() => studioGame(ben, rakip, heavierClass(ben.siklet, rakip.siklet), 'ayakta'));
  useEffect(() => endDreamFight(), []);
  return <PlanPicker s={preview} onPick={onPick} />;
}

function GhostFight({ s, act }: { s: GameState; act: (fn: (s: GameState) => void) => void }) {
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

const st = StyleSheet.create({
  kicker: { color: C.gold, fontFamily: F.semi, fontSize: 11, letterSpacing: 1.5, marginBottom: 8 },
  msg: { color: C.gold, fontFamily: F.semi, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  hint: { color: C.dim, fontFamily: F.body, fontSize: 12.5, lineHeight: 18, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: { borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, maxWidth: '100%' },
  chipOn: { backgroundColor: C.gold, borderColor: C.gold },
  chipText: { color: C.text, fontFamily: F.semi, fontSize: 12 },
  input: { minHeight: 80, maxHeight: 160, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, color: C.text, fontFamily: F.body, fontSize: 12, textAlignVertical: 'top', backgroundColor: '#08090b', marginBottom: 10 },
  pick: { color: C.gold, fontFamily: F.display, fontSize: 14, letterSpacing: 1, marginTop: 12, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, marginBottom: 8 },
  rowName: { color: C.text, fontFamily: F.display, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6, marginBottom: 12 },
  cell: { width: '31%', flexGrow: 1, alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 8, gap: 3 },
  cellName: { color: C.text, fontFamily: F.display, fontSize: 13, marginTop: 4, maxWidth: '100%' },
  cellMeta: { color: C.dim, fontFamily: F.semi, fontSize: 10 },
  vs: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  side: { flex: 1, alignItems: 'center', gap: 6 },
  vsText: { position: 'absolute', alignSelf: 'center', top: 40, color: C.gold, fontFamily: F.display, fontSize: 22 },
  name: { color: C.text, fontFamily: F.display, fontSize: 15, textAlign: 'center' },
  meta: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  result: { alignItems: 'center', paddingVertical: 14, gap: 6 },
  grade: { fontSize: 56 },
  resTitle: { fontFamily: F.display, fontSize: 26, textAlign: 'center' },
});
