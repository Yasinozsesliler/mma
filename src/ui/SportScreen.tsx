// Dövüş Sporları Ligleri: ana ekranda davet kartı, lig ekranı (karne, sıralama, kemer), maç öncesi karşılaşma,
// ringde canlı maç (FightScreen, kural ile) ve sonuç. Maçlar MMA karnesine işlenmez.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { cosmeticById } from '../engine/cosmetics';
import { tableOf } from '../engine/sportRoster';
import { ArenaBackdrop } from './ArenaBackdrop';
import { Belt } from './Belt';
import { Standing } from './NewCareer';
import { sportKit, sportPose } from './sportLook';
import { finishFight } from '../engine/career';
import { careerFights } from '../engine/rewards';
import { maybeInterstitial, milestoneOffer, noteInterstitialShown } from '../monetization';
import { AdOffer } from './AdOffer';
import { lookFor } from '../engine/tale';
import {
  acceptSportInvite,
  canBook,
  claimSportBonus,
  closeSportBout,
  declineSportInvite,
  finishSportFight,
  freeNow,
  OPEN_SPORTS,
  recOf,
  requestSportBout,
  SPORT_BONUS_MAX,
  sportBonusAmount,
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
import { BLUE_CORNER, RED_CORNER, WatchVs } from './NewWatch';
import { C, F } from './theme';

/** Lig kemeri anı: altın arena, kollar havada dövüşçü ve ligin renginde kemer (yukarıdan iner). */
function LeagueBeltMoment({ s, spor, w }: { s: GameState; spor: Sport; w: number }) {
  const lig = SPORTS[spor];
  const skin = cosmeticById(`kem_lig_${spor}`)?.renk ?? null;
  const [drop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(drop, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }).start();
  }, [drop]);
  const H = 360;
  return (
    <View style={[st.moment, { height: H }]}>
      <ArenaBackdrop w={w} h={H} gold org={lig.kisa} sub={lig.ad().toLocaleUpperCase(LOC)} />
      <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.75)']} locations={[0.55, 1]} style={StyleSheet.absoluteFill} />
      <Text style={[st.momentKick, { backgroundColor: lig.renk }]}>{lig.ad().toLocaleUpperCase(LOC)}</Text>
      <Text style={st.momentTitle} numberOfLines={1} adjustsFontSizeToFit>
        {L("YENİ ŞAMPİYON")}
      </Text>
      <View style={st.momentFig} pointerEvents="none">
        <Standing look={s.fighter.gorunum ?? DEFAULT_LOOK} kit={sportKit(RED_CORNER, spor)} h={190} pose="win" />
      </View>
      <Animated.View style={[st.momentBelt, { opacity: drop, transform: [{ translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] }) }, { scale: drop.interpolate({ inputRange: [0, 1], outputRange: [1.3, 1] }) }] }]}>
        <Belt org="cfc" width={Math.min(230, w - 40)} skin={skin} logoText={lig.kisa} ribbonOverride={L("{0} ŞAMPİYONU", [lig.spor().toLocaleUpperCase(LOC)])} />
      </Animated.View>
    </View>
  );
}

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

/** Lig sıralama tablosu: şampiyon ve ilk 10, oyuncu vurgulu. */
function LeagueTable({ s, sp }: { s: GameState; sp: Sport }) {
  const r = recOf(s, sp);
  const [open, setOpen] = useState(false);
  if (!r.kadro) return <Text style={st.small}>{L("Sıralama tablosu ilk maçında kurulur.")}</Text>;
  const rows = tableOf(s, r.kadro, r);
  const shown = open ? rows : rows.slice(0, 4).concat(rows.filter((x, i) => x.sen && i >= 4));
  return (
    <View style={st.table}>
      {shown.map((x, i) => (
        <View key={`${x.ad}${i}`} style={[st.trow, x.sen && { backgroundColor: SPORTS[sp].renk + '22', borderColor: SPORTS[sp].renk }]}>
          <Text style={[st.tpos, x.sira === 'C' && { color: C.gold }]}>{x.sira === 'C' ? '👑' : x.sira > 10 ? '—' : `#${x.sira}`}</Text>
          <Text style={[st.tname, x.sen && { color: C.text, fontFamily: F.bold }]} numberOfLines={1}>
            {x.sen ? L("{0} (sen)", [x.ad]) : x.ad}
          </Text>
          <Text style={st.trec}>{`${x.g}-${x.m}`}</Text>
        </View>
      ))}
      <Pressable onPress={() => setOpen(!open)} style={st.tmore}>
        <Text style={st.tmoreText}>{open ? L("Tabloyu kapat") : L("Tüm tablo")}</Text>
      </Pressable>
    </View>
  );
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
        <Stat label={L("SIRA")} value={r.kemer ? L("ŞAMPİYON") : r.sira >= 11 ? '—' : `#${r.sira}`} color={r.kemer ? C.gold : undefined} />
        <Stat label={L("PUAN")} value={`${r.bonus}/${SPORT_BONUS_MAX}`} />
      </View>
      {r.kemer ? (
        <View style={{ alignItems: 'center' }}>
          <Belt org="cfc" width={180} skin={cosmeticById(`kem_lig_${sp}`)?.renk ?? null} logoText={lig.kisa} ribbonOverride={L("{0} ŞAMPİYONU", [lig.spor().toLocaleUpperCase(LOC)])} />
        </View>
      ) : null}
      <LeagueTable s={s} sp={sp} />
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
        <Screen
          footer={
            <Button
              label={L("Devam")}
              icon="arrow-right"
              tone="gold"
              onPress={async () => {
                // Geçiş reklamı: kariyer kuralıyla (ilk 5 maç yok, araları geniş, yenilgiden sonra yok)
                const reklam = await maybeInterstitial(careerFights(s), !b.kazandi);
                if (reklam) noteInterstitialShown();
                const kemer = b.yeniKemer;
                act(closeSportBout);
                // Kemer kutlamasından sonra bir kez Şampiyon Paketi (reklam gösterildiyse araya girmez)
                if (kemer && !reklam) milestoneOffer('ligKemer', 'yol_teklif_ligkemer', 1200);
              }}
            />
          }
        >
          {b.yeniKemer ? (
            <LeagueBeltMoment s={s} spor={b.spor} w={w} />
          ) : (
            <Title art="arena" kicker={lig.ad().toLocaleUpperCase(LOC)} sub={`${o.ad} ${o.soyad}`}>
              {b.kazandi ? L("Ringin galibi sensin") : L("Bu gece onun gecesiydi")}
            </Title>
          )}
          <Card accent={b.kazandi ? C.green : C.red}>
            {(b.notlar ?? []).map((n, i) => (
              <Text key={i} style={st.note}>
                {n}
              </Text>
            ))}
          </Card>
          <Text style={st.small}>{L("Lig karnen: {0}-{1} · {2}", [r.g, r.m, rankText(r.sira, r.kemer)])}</Text>
          {/* Ödüllü reklam: galibiyette ücret ikiye, yenilgide teselli primi (bir kez; güç vermez) */}
          {!b.katlandi && b.odenen ? (
            <AdOffer
              yer={b.kazandi ? 'lig_ucret' : 'lig_teselli'}
              icon={b.kazandi ? 'cash-multiple' : 'hand-heart'}
              title={b.kazandi ? L("Ücretini ikiye katla") : L("Teselli primi")}
              desc={L("+${0}", [sportBonusAmount(b).toLocaleString(LOC)])}
              onReward={() => act((x) => void claimSportBonus(x))}
            />
          ) : null}
        </Screen>
      );
    }
    return (
      <Screen
        footer={
          <View style={{ gap: 8 }}>
            <Button label={b.spor === 'grappling' || b.spor === 'gures' ? (b.unvan ? L("Kemer için mindere çık") : L("Mindere çık")) : b.unvan ? L("Kemer için ringe çık") : L("Ringe çık")} icon="boxing-glove" tone="gold" onPress={() => act(startSportFight)} />
            <Button label={L("Vazgeç")} icon="close" tone="ghost" onPress={() => act(withdrawSportBout)} />
          </View>
        }
      >
        <Title art="arena" kicker={lig.ad().toLocaleUpperCase(LOC)} sub={lig.kural()}>
          {b.unvan ? (r.kemer ? L("Kemer savunması") : L("Kemer maçı")) : L("Lig maçı")}
        </Title>
        <WatchVs
          w={w}
          a={{ look: s.fighter.gorunum ?? DEFAULT_LOOK, name: `${s.fighter.ad} ${s.fighter.soyad}`, country: s.fighter.uyruk, nick: s.fighter.lakap, kit: sportKit(RED_CORNER, b.spor), pose: sportPose(b.spor) }}
          b={{ look: lookFor(o), name: `${o.ad} ${o.soyad}`, country: o.uyruk, nick: o.lakap, kit: sportKit(BLUE_CORNER, b.spor), pose: sportPose(b.spor) }}
          rows={[
            [`${r.g}-${r.m}`, L("KARNE"), `${o.rekor.g}-${o.rekor.m}`],
            [r.kemer ? L("ŞAMPİYON") : r.sira >= 11 ? '—' : `#${r.sira}`, L("SIRA"), o.champion ? L("ŞAMPİYON") : o.rank ? `#${o.rank}` : '—'],
            ...(b.spor === 'grappling' || b.spor === 'gures'
              ? ([
                  [String(s.fighter.stats.gures), L("GÜREŞ"), String(o.stats.gures)],
                  [String(s.fighter.stats.yer), L("YER"), String(o.stats.yer)],
                  [String(s.fighter.stats.iq), L("ZEKÂ"), String(o.stats.iq)],
                ] as [string, string, string][])
              : ([
                  [String(s.fighter.stats.vurus), L("VURUŞ"), String(o.stats.vurus)],
                  [String(s.fighter.stats.hiz), L("HIZ"), String(o.stats.hiz)],
                  [String(s.fighter.stats.cene), L("ÇENE"), String(o.stats.cene)],
                ] as [string, string, string][])),
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
  moment: { borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#3a2e10', backgroundColor: '#050506', marginBottom: 12 },
  momentKick: { position: 'absolute', top: 12, alignSelf: 'center', color: '#fff', fontFamily: F.black, fontSize: 10, letterSpacing: 1.4, paddingHorizontal: 8, paddingVertical: 2 },
  momentTitle: { position: 'absolute', top: 30, left: 12, right: 12, color: C.gold, fontFamily: F.display, fontSize: 34, textAlign: 'center', textShadowColor: '#000', textShadowRadius: 10 },
  momentFig: { position: 'absolute', bottom: 88, alignSelf: 'center' },
  momentBelt: { position: 'absolute', bottom: 10, alignSelf: 'center' },
  table: { gap: 3, marginBottom: 8 },
  trow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: 'transparent', backgroundColor: 'rgba(255,255,255,0.03)' },
  tpos: { width: 30, color: C.dim, fontFamily: F.display, fontSize: 13 },
  tname: { flex: 1, color: C.dim, fontFamily: F.semi, fontSize: 12.5 },
  trec: { color: C.text, fontFamily: F.display, fontSize: 13 },
  tmore: { alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 10 },
  tmoreText: { color: C.gold, fontFamily: F.bold, fontSize: 12 },
  soon: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 6, opacity: 0.7 },
  soonText: { flex: 1, color: C.dim, fontFamily: F.semi, fontSize: 13 },
});
