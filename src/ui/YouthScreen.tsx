// Gençlik Yolu ekranı: yılın olayı (seçim), gençlik turnuvası finali (lig kurallarıyla canlı maç), sonuç ve
// 18 yaşında MMA'ya geçiş kararı. Üstte 12'den 18'e yaş şeridi ve kazanılan madalyalar.
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { finishFight } from '../engine/career';
import { SPORTS } from '../engine/sportLeague';
import { lookFor } from '../engine/tale';
import { STAT_LABELS, type GameState, type StatKey } from '../engine/types';
import { chooseYouthEvent, eventOf, finishYouthFight, graduateYouth, MMA_AGE, nextYouthYear, startYouthFight, stayOneMoreYear, tournamentOf, YOUTH_MAX_AGE, YOUTH_START, type Youth } from '../engine/youth';
import { L, LOC } from '../i18n';
import { Button, Card, Choice, Screen, Section, Title } from './components';
import { DEFAULT_LOOK } from './FighterAvatar';
import { FightScreen } from './FightScreen';
import type { Act } from './GameScreens';
import { WatchVs } from './NewWatch';
import { C, F } from './theme';

function AgeStrip({ y }: { y: Youth }) {
  const last = Math.max(MMA_AGE, y.yas);
  return (
    <View style={st.strip}>
      {Array.from({ length: last - YOUTH_START + 1 }, (_, i) => YOUTH_START + i).map((a) => {
        const u = y.unvanlar.find((x) => x.yas === a);
        const now = a === y.yas;
        return (
          <View key={a} style={[st.age, now && { borderColor: C.gold }, a >= MMA_AGE && { borderColor: C.red + '88' }]}>
            <Text style={st.ageMedal}>{u ? (u.madalya === 'altin' ? '🥇' : '🥈') : a >= MMA_AGE ? '🥊' : now ? '•' : ''}</Text>
            <Text style={[st.ageText, now && { color: C.gold }]}>{a}</Text>
          </View>
        );
      })}
    </View>
  );
}

function YouthFight({ s, act }: { s: GameState; act: Act }) {
  const y = s.genclik!;
  const shadow: GameState = { ...s, pending: { ...s.pending, dovus: y.dovus, gece: undefined } };
  const fAct: Act = (fn) => {
    if (fn === finishFight) return act(finishYouthFight);
    act((x) => {
      const sh: GameState = { ...x, pending: { ...x.pending, dovus: x.genclik!.dovus, gece: undefined } };
      fn(sh);
      x.genclik!.dovus = sh.pending.dovus;
    });
  };
  return <FightScreen s={shadow} act={fAct} />;
}

const bonusText = (y: Youth) =>
  (Object.entries(y.bonus) as [StatKey, number][])
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${STAT_LABELS[k]} +${v}`)
    .join(' · ');

export function YouthScreen({ s, act }: { s: GameState; act: Act }) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 520) - 32;
  const y = s.genclik;
  if (!y) return null;
  if (y.adim === 'dovus' && y.dovus) return <YouthFight s={s} act={act} />;
  const spor = SPORTS[y.spor];
  const t = tournamentOf(s, y);
  const head = (sub: string, art: 'ev' | 'salon' | 'arena', title: string) => (
    <>
      <Title art={art} kicker={L("GENÇLİK YOLU · {0} YAŞ · {1}", [y.yas, spor.spor().toLocaleUpperCase(LOC)])} sub={sub}>
        {title}
      </Title>
      <AgeStrip y={y} />
    </>
  );

  if (y.adim === 'olay') {
    const e = eventOf(y.olay);
    return (
      <Screen>
        {head(L("Her yıl bir karar, her yıl bir turnuva. 18'inde MMA seni bekliyor."), 'ev', L("{0} yaşındasın", [y.yas]))}
        <Card accent={spor.renk}>
          <Text style={st.event}>{e?.metin()}</Text>
        </Card>
        {e?.secenekler.map((o, i) => <Choice key={i} n={i + 1} label={o.ad()} tone="gold" onPress={() => act((x) => chooseYouthEvent(x, i))} />)}
      </Screen>
    );
  }

  if (y.adim === 'hazir' && y.rakip) {
    const o = y.rakip;
    return (
      <Screen footer={<Button label={L("Finale çık")} icon="trophy" tone="gold" onPress={() => act(startYouthFight)} />}>
        {head(spor.kural(), 'salon', t.ad)}
        {(y.notlar ?? []).map((n, i) => (
          <Text key={i} style={st.note}>
            {n}
          </Text>
        ))}
        <WatchVs
          w={w}
          a={{ look: s.fighter.gorunum ?? DEFAULT_LOOK, name: `${s.fighter.ad} ${s.fighter.soyad}`, country: s.fighter.uyruk, nick: s.fighter.lakap }}
          b={{ look: lookFor(o), name: `${o.ad} ${o.soyad}`, country: o.uyruk, nick: o.lakap }}
          rows={[
            [`${y.rekor.g}-${y.rekor.m}`, L("KARNE"), `${o.rekor.g}-${o.rekor.m}`],
            [String(y.yas), L("YAŞ"), String(y.yas + (t.seviye >= 2 ? 1 : 0))],
          ]}
          arena={{ tier: t.seviye >= 3 ? 3 : t.seviye >= 2 ? 2 : 0, org: L("GENÇ"), sub: t.ad.toLocaleUpperCase(LOC) }}
          title={L("FİNAL")}
        />
      </Screen>
    );
  }

  if (y.adim === 'sonuc') {
    return (
      <Screen footer={<Button label={y.yas + 1 >= MMA_AGE ? L("18 yaşına gir") : L("Sonraki yıl")} icon="arrow-right" tone="gold" onPress={() => act(nextYouthYear)} />}>
        {head(t.ad, 'arena', y.kazandi ? L("Altın madalya!") : L("Gümüş madalya"))}
        <Card accent={y.kazandi ? C.gold : C.dim}>
          {(y.notlar ?? []).map((n, i) => (
            <Text key={i} style={st.note}>
              {n}
            </Text>
          ))}
        </Card>
        {bonusText(y) ? <Text style={st.small}>{L("Gençlik kazanımları: {0}", [bonusText(y)])}</Text> : null}
      </Screen>
    );
  }

  // Karar: MMA'ya geç ya da bir yıl daha
  const altin = y.unvanlar.filter((u) => u.madalya === 'altin').length;
  return (
    <Screen
      footer={
        <View style={{ gap: 8 }}>
          <Button label={L("MMA'ya geç ({0} yaş)", [y.yas])} icon="sword-cross" tone="gold" onPress={() => act(graduateYouth)} />
          {y.yas < YOUTH_MAX_AGE ? <Button label={L("Bir yıl daha {0} ({1} yaş)", [spor.spor(), y.yas + 1])} icon="calendar-plus" tone="ghost" onPress={() => act(stayOneMoreYear)} /> : null}
        </View>
      }
    >
      {head(L("Kafes seni çağırıyor. Erken geçersen gelişecek zamanın çok olur; bir yıl daha kalırsan biraz daha olgun başlarsın."), 'arena', L("Karar anı"))}
      <Card accent={C.gold}>
        <Text style={st.big}>{L("{0} altın · {1} gümüş", [altin, y.unvanlar.length - altin])}</Text>
        <Text style={st.small}>{L("Gençlik karnesi: {0}-{1}", [y.rekor.g, y.rekor.m])}</Text>
        {bonusText(y) ? <Text style={st.note}>{L("MMA'ya taşınan kazanımlar: {0}", [bonusText(y)])}</Text> : null}
      </Card>
      <Section>{L("MADALYALAR")}</Section>
      {y.unvanlar.map((u, i) => (
        <Text key={i} style={st.note}>
          {u.madalya === 'altin' ? '🥇' : '🥈'} {u.yas} · {u.ad}
        </Text>
      ))}
    </Screen>
  );
}

const st = StyleSheet.create({
  strip: { flexDirection: 'row', gap: 4, marginBottom: 10 },
  age: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#2a2d35', borderRadius: 8, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.03)' },
  ageMedal: { fontSize: 13, height: 17, color: C.gold },
  ageText: { color: C.dim, fontFamily: F.bold, fontSize: 11 },
  event: { color: C.text, fontFamily: F.semi, fontSize: 15, lineHeight: 22 },
  note: { color: C.text, fontFamily: F.semi, fontSize: 13, lineHeight: 20, marginBottom: 4 },
  small: { color: C.dim, fontFamily: F.semi, fontSize: 12, marginTop: 4 },
  big: { color: C.gold, fontFamily: F.display, fontSize: 24 },
});
