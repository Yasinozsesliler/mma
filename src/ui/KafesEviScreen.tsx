// Kafes Evi realite şovu: ev sahneleri (seçimler), dövüş öncesi plan, gerçek kafes dövüşü ve eleme tablosu.
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { finishFight, nextKafesEvi } from '../engine/career';
import { PLANS } from '../engine/fight';
import {
  acceptKafesEvi,
  chooseScene,
  declineKafesEvi,
  finishKeFight,
  KE_PLAYER,
  KE_ROUNDS,
  keBracket,
  keFightNotes,
  keOpponent,
  kafesEviInvite,
  SCENES,
  startKeFight,
  type KafesEvi,
} from '../engine/kafesEvi';
import { weakest } from '../engine/opponents';
import { lookFor } from '../engine/tale';
import type { GameState, PlanKey } from '../engine/types';
import { buzz } from '../haptics';
import { L } from '../i18n';
import { Button, Card, Icon, Screen, Section, SLANT, Title } from './components';
import { FighterAvatar } from './FighterAvatar';
import { FightScreen } from './FightScreen';
import type { Act } from './GameScreens';
import { C, F } from './theme';

const PLAN_CHOICES: PlanKey[] = ['ayakta', 'kontra', 'gures', 'blitz'];

/** Ana ekranda davet kartı. */
export function KafesEviInvite({ s, act }: { s: GameState; act: Act }) {
  if (!kafesEviInvite(s)) return null;
  return (
    <LinearGradient colors={['#2a0b2e', '#0d0710']} style={st.box}>
      <View style={st.head}>
        <Icon name="television-classic" size={20} color="#ff6bd6" />
        <Text style={[st.title, SLANT]}>{L("KAFES EVİ SEÇMELERİ")}</Text>
      </View>
      <Text style={st.text}>
        {L("Realite şovu yeni sezon için seni istiyor: 8 dövüşçü aynı evde, her hafta eleme maçı. Maçlar karnene işlenmez. Şampiyona büyük organizasyon kontratı ve $20.000.")}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button label={L("Eve gir")} icon="home-import-outline" tone="gold" onPress={() => act(acceptKafesEvi)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={L("Reddet")} icon="close" tone="ghost" onPress={() => act(declineKafesEvi)} />
        </View>
      </View>
    </LinearGradient>
  );
}

function Meter({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={st.meter}>
      <Text style={st.meterLabel}>{label}</Text>
      <Text style={[st.meterVal, { color }]}>{value}</Text>
    </View>
  );
}

function Housemates({ k }: { k: KafesEvi }) {
  const live = k.tur === 0 ? null : k.turlar[k.tur - 1];
  return (
    <View style={st.mates}>
      {k.rakipler.map((o) => {
        const out = live ? !live.includes(o.id) : false;
        const r = k.iliski[o.id] ?? 0;
        const face = k.muttefik === o.id ? '🤝' : r <= -2 ? '😤' : r >= 2 ? '🙂' : '';
        return (
          <View key={o.id} style={[st.mate, out && { opacity: 0.3 }]}>
            <FighterAvatar look={lookFor(o)} size={38} ring={out ? C.border : C.dim} />
            <Text style={st.mateName} numberOfLines={1}>
              {face}
              {o.soyad}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function Bracket({ k }: { k: KafesEvi }) {
  const rows = keBracket(k);
  return (
    <Card>
      {rows.map((p, i) => (
        <View key={p.id} style={[st.bRow, i % 2 === 1 && { marginBottom: 8 }]}>
          <Text style={[st.bName, p.id === KE_PLAYER && { color: C.red }]} numberOfLines={1}>
            {p.id === KE_PLAYER ? L("SEN") : `${p.ad} ${p.soyad}`}
          </Text>
          <Text style={st.bTur}>{'●'.repeat(p.tur) || '–'}</Text>
        </View>
      ))}
    </Card>
  );
}

function KeFight({ s, act }: { s: GameState; act: Act }) {
  const k = s.kafesEvi!;
  const shadow: GameState = { ...s, pending: { ...s.pending, dovus: k.dovus } };
  const fAct: Act = (fn) => {
    if (fn === finishFight) return act(finishKeFight);
    act((x) => {
      const sh: GameState = { ...x, pending: { ...x.pending, dovus: x.kafesEvi!.dovus } };
      fn(sh);
      x.kafesEvi!.dovus = sh.pending.dovus;
    });
  };
  return <FightScreen s={shadow} act={fAct} />;
}

export function KafesEviScreen({ s, act }: { s: GameState; act: Act }) {
  const k = s.kafesEvi;
  if (!k || k.durum !== 'aktif') return null;
  if (k.adim === 'dovus' && k.dovus) return <KeFight s={s} act={act} />;
  const o = keOpponent(k);
  const head = (
    <>
      <Title art="salon" kicker={L("KAFES EVİ · {0}", [KE_ROUNDS()[k.tur]])} sub={L("Kameralar 7/24 açık. Ne yaparsan ekranda.")}>
        {k.adim === 'sonuc' ? L("Bölüm sonu") : k.adim === 'plan' ? L("Dövüş gecesi") : L("Bölüm {0}", [k.tur * 2 + k.sahneSay + 1])}
      </Title>
      <View style={st.meters}>
        <Meter label={L("EKRAN SÜRESİ")} value={`${k.ekran}/100`} color="#ff6bd6" />
        <Meter label={L("ODAK")} value={`${k.odak > 0 ? '+' : ''}${k.odak}`} color={k.odak >= 0 ? C.green : C.red} />
        <Meter label={L("MÜTTEFİK")} value={k.muttefik ? (k.rakipler.find((x) => x.id === k.muttefik)?.soyad ?? '—') : '—'} color={C.gold} />
      </View>
      <Housemates k={k} />
    </>
  );

  if (k.adim === 'sonuc') {
    return (
      <Screen footer={<Button label={k.sonuc ? L("Evden çık") : L("Sonraki bölüm")} icon="arrow-right" tone="gold" onPress={() => act(nextKafesEvi)} />}>
        {head}
        <Card accent={k.sonuc === 'sampiyon' ? C.gold : undefined}>
          {(k.sonNot ?? []).map((n, i) => (
            <Text key={i} style={st.note}>
              {n}
            </Text>
          ))}
        </Card>
        <Section>{L("ELEME TABLOSU")}</Section>
        <Bracket k={k} />
      </Screen>
    );
  }

  if (k.adim === 'plan' && o) {
    const notes = keFightNotes(k, o);
    const tip = k.muttefik && k.muttefik !== o.id ? weakest(o) : null;
    return (
      <Screen>
        {head}
        {k.sonSahne ? <Text style={st.prev}>{k.sonSahne}</Text> : null}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <FighterAvatar look={lookFor(o)} size={64} />
            <View style={{ flex: 1 }}>
              <Text style={st.oppName}>
                {`${o.ad} "${o.lakap}" ${o.soyad}`}
              </Text>
              <Text style={st.dim}>{o.uyruk}</Text>
            </View>
          </View>
          {notes.map((n, i) => (
            <Text key={i} style={st.note}>
              {n}
            </Text>
          ))}
        </Card>
        <Section>{L("OYUN PLANI")}</Section>
        <View style={{ gap: 8 }}>
          {PLAN_CHOICES.map((p) => (
            <Button
              key={p}
              label={`${PLANS[p].kisa}${tip && PLANS[p].hedef.includes(tip) ? ' ★' : ''}`}
              icon={PLANS[p].ikon as never}
              tone={tip && PLANS[p].hedef.includes(tip) ? 'gold' : 'red'}
              onPress={() => {
                buzz('basari');
                act((x) => startKeFight(x, p));
              }}
            />
          ))}
        </View>
      </Screen>
    );
  }

  const sc = k.sahne ? SCENES[k.sahne.id] : null;
  const hedef = k.sahne ? k.rakipler.find((x) => x.id === k.sahne!.hedef)?.soyad ?? '' : '';
  return (
    <Screen>
      {head}
      {k.sonSahne ? <Text style={st.prev}>{k.sonSahne}</Text> : null}
      {sc ? (
        <Card accent="#ff6bd6">
          <Text style={st.sceneTitle}>{sc.baslik()}</Text>
          <Text style={st.sceneText}>{sc.metin(hedef)}</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {sc.secenekler.map((c, i) => (
              <Button key={i} label={c.ad()} tone="ghost" onPress={() => act((x) => chooseScene(x, i))} />
            ))}
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

const st = StyleSheet.create({
  box: { borderRadius: 14, padding: 14, gap: 10, marginBottom: 12, borderWidth: 1, borderColor: '#5a1f60' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#ff6bd6', fontFamily: F.display, fontSize: 17, letterSpacing: 0.5 },
  text: { color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  meters: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  meter: { flex: 1, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 8, alignItems: 'center' },
  meterLabel: { color: C.faint, fontFamily: F.semi, fontSize: 10 },
  meterVal: { fontFamily: F.display, fontSize: 18 },
  mates: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginBottom: 12 },
  mate: { width: '25%', alignItems: 'center', gap: 2 },
  mateName: { color: C.dim, fontFamily: F.semi, fontSize: 10 },
  prev: { color: C.gold, fontFamily: F.semi, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  sceneTitle: { color: C.text, fontFamily: F.display, fontSize: 20, marginBottom: 6 },
  sceneText: { color: C.dim, fontFamily: F.body, fontSize: 14, lineHeight: 21 },
  oppName: { color: C.text, fontFamily: F.bold, fontSize: 16 },
  dim: { color: C.dim, fontFamily: F.body, fontSize: 12 },
  note: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 20, marginTop: 6 },
  bRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  bName: { color: C.text, fontFamily: F.semi, fontSize: 13, flex: 1 },
  bTur: { color: C.gold, fontFamily: F.bold, fontSize: 13 },
});
