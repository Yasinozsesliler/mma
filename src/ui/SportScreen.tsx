// Dövüş Sporları Ligleri: ana ekranda davet kartı, lig ekranı (karne, sıralama, kemer), maç öncesi karşılaşma,
// ringde canlı maç (FightScreen, kural ile) ve sonuç. Maçlar MMA karnesine işlenmez.
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { finishFight } from '../engine/career';
import { lookFor } from '../engine/tale';
import {
  acceptSportInvite,
  canBook,
  closeSportBout,
  declineSportInvite,
  finishSportFight,
  freeNow,
  OPEN_SPORTS,
  recOf,
  requestSportBout,
  SPORT_BONUS_MAX,
  SPORTS,
  sportsOpen,
  startSportFight,
  weeksToNext,
  withdrawSportBout,
  type Sport,
} from '../engine/sportLeague';
import type { GameState } from '../engine/types';
import { L, LOC } from '../i18n';
import { Button, Card, Icon, type IconName, Screen, Section, SLANT, Title } from './components';
import { DEFAULT_LOOK } from './FighterAvatar';
import { FightScreen } from './FightScreen';
import type { Act } from './GameScreens';
import { WatchVs } from './NewWatch';
import { C, F } from './theme';

const SOON = (['boks', 'muaythai', 'grappling', 'gures'] as Sport[]).filter((sp) => !OPEN_SPORTS.includes(sp));
const rankText = (sira: number, kemer: boolean) => (kemer ? L("ŞAMPİYON") : sira >= 11 ? L("Sıralama dışı") : `#${sira}`);

/** Ana ekranda davet kartı. */
export function SportInvite({ s, act }: { s: GameState; act: Act }) {
  const d = s.sporDavet;
  if (!d || !freeNow(s)) return null;
  const lig = SPORTS[d.spor];
  const r = recOf(s, d.spor);
  return (
    <LinearGradient colors={[lig.renk + '33', '#0b0b0d']} style={st.box}>
      <View style={st.head}>
        <Icon name={lig.icon as IconName} size={20} color={lig.renk} />
        <Text style={[st.title, SLANT, { color: lig.renk }]}>{lig.ad().toLocaleUpperCase(LOC)}</Text>
      </View>
      <Text style={st.text}>{L("Seni ringe davet ediyorlar. Kendi kuralları, kendi kemeri var; maç MMA karnene işlenmez. Kazanırsan para, takipçi ve gelişim puanı.")}</Text>
      <Text style={[st.small, { color: lig.renk }]}>{lig.kural()}</Text>
      {r.g + r.m ? <Text style={st.small}>{L("Lig karnen: {0}-{1} · {2}", [r.g, r.m, rankText(r.sira, r.kemer)])}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button label={L("Kabul et")} icon="check" tone="gold" onPress={() => act(acceptSportInvite)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={L("Şimdi değil")} icon="close" tone="ghost" onPress={() => act(declineSportInvite)} />
        </View>
      </View>
    </LinearGradient>
  );
}

function SportFight({ s, act }: { s: GameState; act: Act }) {
  const b = s.sporMac!;
  // Kariyerin dövüş gecesi bilgisi lig maçına karışmasın
  const shadow: GameState = { ...s, pending: { ...s.pending, dovus: b.dovus, gece: undefined } };
  const fAct: Act = (fn) => {
    if (fn === finishFight) return act(finishSportFight);
    act((x) => {
      const sh: GameState = { ...x, pending: { ...x.pending, dovus: x.sporMac!.dovus, gece: undefined } };
      fn(sh);
      x.sporMac!.dovus = sh.pending.dovus;
    });
  };
  return <FightScreen s={shadow} act={fAct} />;
}

function LeagueRow({ s, sp, act }: { s: GameState; sp: Sport; act: Act }) {
  const lig = SPORTS[sp];
  const r = recOf(s, sp);
  const wait = weeksToNext(s);
  return (
    <Card accent={lig.renk}>
      <View style={st.head}>
        <Icon name={lig.icon as IconName} size={20} color={lig.renk} />
        <Text style={[st.title, SLANT, { color: lig.renk, flex: 1 }]} numberOfLines={1} adjustsFontSizeToFit>
          {lig.ad().toLocaleUpperCase(LOC)}
        </Text>
      </View>
      <Text style={[st.small, { color: C.dim }]}>{lig.kural()}</Text>
      <View style={st.stats}>
        <Stat label={L("KARNE")} value={`${r.g}-${r.m}`} />
        <Stat label={L("NAKAVT")} value={String(r.ko)} />
        <Stat label={L("SIRA")} value={rankText(r.sira, r.kemer)} color={r.kemer ? C.gold : undefined} />
        <Stat label={L("PUAN")} value={`${r.bonus}/${SPORT_BONUS_MAX}`} />
      </View>
      {r.kemer ? <Text style={[st.small, { color: C.gold }]}>{L("🏆 Kemer sende · {0} savunma", [r.savunma])}</Text> : r.sira === 1 ? <Text style={[st.small, { color: C.gold }]}>{L("Sıradaki maç kemer maçı!")}</Text> : null}
      <Button
        label={canBook(s) ? (r.kemer ? L("Kemerini savun") : r.sira === 1 ? L("Kemer maçı iste") : L("Maç iste")) : wait ? L("{0} hafta sonra yeni maç", [wait]) : L("Önce MMA maçını bitir")}
        icon="boxing-glove"
        tone={canBook(s) ? 'gold' : 'ghost'}
        disabled={!canBook(s)}
        onPress={() => act((x) => requestSportBout(x, sp))}
      />
    </Card>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={st.stat}>
      <Text style={st.statLabel}>{label}</Text>
      <Text style={[st.statVal, color ? { color } : null]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

export function SportScreen({ s, act }: { s: GameState; act: Act }) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 520) - 32;
  const b = s.sporMac;
  if (b?.adim === 'dovus' && b.dovus) return <SportFight s={s} act={act} />;

  if (b) {
    const lig = SPORTS[b.spor];
    const r = recOf(s, b.spor);
    const o = b.rakip;
    if (b.adim === 'sonuc') {
      return (
        <Screen footer={<Button label={L("Devam")} icon="arrow-right" tone="gold" onPress={() => act(closeSportBout)} />}>
          <Title art="arena" kicker={lig.ad().toLocaleUpperCase(LOC)} sub={`${o.ad} ${o.soyad}`}>
            {b.kazandi ? L("Ringin galibi sensin") : L("Bu gece onun gecesiydi")}
          </Title>
          <Card accent={b.kazandi ? C.green : C.red}>
            {(b.notlar ?? []).map((n, i) => (
              <Text key={i} style={st.note}>
                {n}
              </Text>
            ))}
          </Card>
          <Text style={st.small}>{L("Lig karnen: {0}-{1} · {2}", [r.g, r.m, rankText(r.sira, r.kemer)])}</Text>
        </Screen>
      );
    }
    return (
      <Screen
        footer={
          <View style={{ gap: 8 }}>
            <Button label={b.unvan ? L("Kemer için ringe çık") : L("Ringe çık")} icon="boxing-glove" tone="gold" onPress={() => act(startSportFight)} />
            <Button label={L("Vazgeç")} icon="close" tone="ghost" onPress={() => act(withdrawSportBout)} />
          </View>
        }
      >
        <Title art="arena" kicker={lig.ad().toLocaleUpperCase(LOC)} sub={lig.kural()}>
          {b.unvan ? (r.kemer ? L("Kemer savunması") : L("Kemer maçı")) : L("Lig maçı")}
        </Title>
        <WatchVs
          w={w}
          a={{ look: s.fighter.gorunum ?? DEFAULT_LOOK, name: `${s.fighter.ad} ${s.fighter.soyad}`, country: s.fighter.uyruk, nick: s.fighter.lakap }}
          b={{ look: lookFor(o), name: `${o.ad} ${o.soyad}`, country: o.uyruk, nick: o.lakap }}
          rows={[
            [`${r.g}-${r.m}`, L("KARNE"), `${o.rekor.g}-${o.rekor.m}`],
            [r.kemer ? L("ŞAMPİYON") : r.sira >= 11 ? '—' : `#${r.sira}`, L("SIRA"), o.champion ? L("ŞAMPİYON") : o.rank ? `#${o.rank}` : '—'],
            [String(s.fighter.stats.vurus), L("VURUŞ"), String(o.stats.vurus)],
            [String(s.fighter.stats.hiz), L("HIZ"), String(o.stats.hiz)],
            [String(s.fighter.stats.cene), L("ÇENE"), String(o.stats.cene)],
          ]}
          arena={{ tier: b.unvan ? 3 : 1, org: lig.kisa, sub: lig.ad().toLocaleUpperCase(LOC) }}
          title={b.unvan ? L("ÜNVAN") : L("{0} RAUNT", [3])}
        />
        <Card>
          <Text style={st.note}>{L("💵 Ücret: ${0} (galibiyette %50 fazlası)", [b.ucret.toLocaleString(LOC)])}</Text>
          <Text style={st.note}>{L("Maç MMA karnene işlenmez. İki hafta sürer; aldığın hasarın bir kısmı sağlığına yansır.")}</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen footer={<Button label={L("Geri")} icon="arrow-left" tone="ghost" onPress={() => act((x) => (x.phase = 'hub'))} />}>
      <Title art="salon" kicker={L("DÖVÜŞ SPORLARI")} sub={L("MMA maçlarının arasında başka sporların ringine çık: kendi kuralları, kendi kemerleri.")}>
        {L("Ligler")}
      </Title>
      {sportsOpen(s) ? null : <Text style={st.small}>{L("Ligler profesyonel kariyerde açılır.")}</Text>}
      {OPEN_SPORTS.map((sp) => (
        <LeagueRow key={sp} s={s} sp={sp} act={act} />
      ))}
      {SOON.length ? <Section>{L("YAKINDA")}</Section> : null}
      {SOON.map((sp) => (
        <View key={sp} style={[st.soon, { borderColor: SPORTS[sp].renk + '55' }]}>
          <Icon name={SPORTS[sp].icon as IconName} size={16} color={SPORTS[sp].renk} />
          <Text style={st.soonText} numberOfLines={1}>
            {SPORTS[sp].ad()}
          </Text>
        </View>
      ))}
    </Screen>
  );
}

const st = StyleSheet.create({
  box: { borderRadius: 12, padding: 12, gap: 8, marginVertical: 6, borderWidth: 1, borderColor: '#2a2a30' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: F.display, fontSize: 18, letterSpacing: 0.5 },
  text: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 18 },
  small: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  note: { color: C.text, fontFamily: F.semi, fontSize: 13, lineHeight: 20 },
  stats: { flexDirection: 'row', gap: 6, marginVertical: 6 },
  stat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
  statLabel: { color: C.faint, fontFamily: F.black, fontSize: 9, letterSpacing: 1 },
  statVal: { color: C.text, fontFamily: F.display, fontSize: 16 },
  soon: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 6, opacity: 0.7 },
  soonText: { flex: 1, color: C.dim, fontFamily: F.semi, fontSize: 13 },
});
