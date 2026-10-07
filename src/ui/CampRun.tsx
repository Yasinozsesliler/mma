// Kamp akışı: maça kadarki haftalar (serbest haftalar ve kamp haftaları) kendiliğinden akar. Ekranda hafta sayacı,
// takvim ve son olaylar görünür; yalnızca bir karar gerektiğinde (takvim etkinliği, kamp seansı, kamp anı,
// antrenman ortağı, rakip kampından haber) akış durur ve kart çıkar. İstersen duraklatır ya da hızlandırırsın.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { currentEvent } from '../engine/calendar';
import { campMomentOpen } from '../engine/campMoments';
import { DRILLS, drillDone, drillOfWeek } from '../engine/drills';
import { rivalNewsOpen } from '../engine/rivalCamp';
import { lookFor } from '../engine/tale';
import type { GameState } from '../engine/types';
import { L } from '../i18n';
import { FightDateHero } from './CampCalendar';
import { Button, Icon, Screen, type IconName } from './components';
import { DrillGame } from './DrillGame';
import { FighterAvatar } from './FighterAvatar';
import { PartnerMomentCard } from './PartnerMomentCard';
import { RivalNewsCard } from './RivalNewsCard';
import { C, F, R } from './theme';

type Choose = (v: string | number) => void;

function Decision({ kicker, renk, ikon, metin, children }: { kicker: string; renk: string; ikon: IconName; metin: string; children: ReactNode }) {
  return (
    <View style={[st.dec, { borderColor: renk }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={ikon} size={16} color={renk} />
        <Text style={[st.decK, { color: renk }]}>{kicker}</Text>
      </View>
      <Text style={st.decT}>{metin}</Text>
      {children}
    </View>
  );
}

export function CampRun({ s, header, choose }: { s: GameState; header: ReactNode; choose: Choose }) {
  const k = s.pending.kamp!;
  const takvim = k.step === 'takvim';
  const ev = takvim ? currentEvent(s) : undefined;
  const seans = !takvim && !k.kisaHaber && !k.seansKarar && !drillDone(s) && (k.kampIdx ?? 0) === 0;
  const an = !takvim && campMomentOpen(s) ? k.kampAn : undefined;
  const karar = !!ev || seans || !!k.kankaAn || rivalNewsOpen(s) || !!an;
  const [dur, setDur] = useState(false);
  const [hizli, setHizli] = useState(false);
  const [oyun, setOyun] = useState(false);
  const toplam = k.macHafta ?? k.hafta;
  const gecen = (k.takvimIdx ?? 0) + (k.kampIdx ?? 0);

  // Akış: karar yoksa ve duraklatılmadıysa haftalar kendiliğinden ilerler
  useEffect(() => {
    if (dur || karar || oyun) return;
    const t = setTimeout(() => choose(takvim ? 'oto1' : 'hafta'), hizli ? 220 : takvim ? 700 : 1100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dur, karar, oyun, hizli, k.takvimIdx, k.kampIdx, k.step]);

  // Tek sayaç: serbest haftalar ve kamp haftaları maça kadar 1, 2, 3… diye numaralanır (yeniden eskiye)
  const strip = (l: string) => l.replace(/^\d+\. [^·]+· /, '');
  const free = [...(k.takvimLog ?? [])].reverse().map((l, i) => ({ n: i + 1, t: strip(l) }));
  const kamp = (k.haftaLog ?? []).filter((l) => /^\d+\. /.test(l)).map((l, i) => ({ n: free.length + i + 1, t: strip(l) }));
  const ekstra = (k.haftaLog ?? []).filter((l) => !/^\d+\. /.test(l)).map((t) => ({ n: 0, t }));
  const log = [...free, ...kamp, ...ekstra];
  const son = [...free, ...kamp].slice(-5).reverse();
  const evre = takvim ? L("KAMP ÖNCESİ") : (k.kampIdx ?? 0) + 1 >= k.hafta ? L("FIGHT WEEK") : L("ANTRENMAN KAMPI");

  return (
    <Screen
      footer={
        karar ? undefined : (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button label={dur ? L("Devam") : L("Duraklat")} icon={dur ? 'play' : 'pause'} tone="ghost" onPress={() => setDur(!dur)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={hizli ? L("Normal hız") : L("Hızlandır")} icon="fast-forward" tone={hizli ? 'gold' : 'ghost'} onPress={() => (setHizli(!hizli), setDur(false))} />
            </View>
          </View>
        )
      }
    >
      {header}
      <FightDateHero s={s} />

      <LinearGradient colors={['#17130a', '#0c0d10']} style={st.now}>
        <FighterAvatar look={s.fighter.gorunum} size={52} ring={karar ? C.gold : dur ? C.faint : C.red} />
        <View style={{ flex: 1 }}>
          <Text style={st.nowK}>
            {evre} · {L("{0}/{1} hafta", [gecen, toplam])}
          </Text>
          <Text style={st.nowT} numberOfLines={3}>
            {karar ? L("Bir karar seni bekliyor.") : dur ? L("Duraklatıldı.") : son[0]?.t ?? L("Kamp başlıyor…")}
          </Text>
        </View>
        {!karar && !dur ? <View style={st.live} /> : null}
      </LinearGradient>
      <View style={st.bar}>
        <View style={[st.fill, { width: `${(gecen / Math.max(1, toplam)) * 100}%` }]} />
      </View>

      {/* Karar kartları */}
      {ev ? (
        <Decision kicker={L("TAKVİMDE BİR FIRSAT")} renk="#3aa8ff" ikon={ev.ikon as IconName} metin={`${ev.baslik}: ${ev.metin}`}>
          {ev.secenekler.map((o, i) => (
            <Pressable key={i} onPress={() => choose(`olay:${i}`)} style={({ pressed }) => [st.opt, pressed && { borderColor: '#3aa8ff' }]}>
              <Text style={st.optT}>{o.ad}</Text>
              <Text style={st.optD}>{o.aciklama}</Text>
            </Pressable>
          ))}
        </Decision>
      ) : null}
      {seans ? (
        <Decision kicker={L("KAMP SEANSI · İSTEĞE BAĞLI")} renk={C.gold} ikon={DRILLS[drillOfWeek(s)].ikon as IconName} metin={L("{0}: 15 saniyelik bir mini oyun. İyi oynarsan bütün kamp daha verimli geçer, sakatlık riski düşer.", [DRILLS[drillOfWeek(s)].ad])}>
          <View style={{ gap: 8 }}>
            <Button label={L("Seansı oyna")} icon="play" tone="gold" onPress={() => setOyun(true)} />
            <Button label={L("Atla, kamp aksın")} icon="fast-forward" tone="ghost" onPress={() => choose('seansAtla')} />
          </View>
        </Decision>
      ) : null}
      {an ? (
        <Decision kicker={L("KAMPTA BİR AN")} renk={C.orange} ikon="whistle" metin={an.metin}>
          {an.sonuc ? (
            <>
              <Text style={st.res}>{an.sonuc}</Text>
              <Button label={L("Devam")} icon="arrow-right" tone="ghost" onPress={() => choose('anKapat')} />
            </>
          ) : (
            <View style={{ gap: 8 }}>
              {an.secenekler.map((o, i) => (
                <Button key={o} label={o} tone={i === 0 ? 'gold' : 'ghost'} onPress={() => choose(`an:${i}`)} />
              ))}
            </View>
          )}
        </Decision>
      ) : null}
      <PartnerMomentCard s={s} choose={choose} />
      <RivalNewsCard s={s} choose={choose} />

      {oyun ? (
        <DrillGame
          oyun={drillOfWeek(s)}
          pLook={s.fighter.gorunum}
          oLook={s.pending.rakip ? lookFor(s.pending.rakip) : undefined}
          onClose={() => setOyun(false)}
          onDone={(p) => {
            setOyun(false);
            choose(`idman:${p}`);
          }}
        />
      ) : null}

      <Text style={st.logH}>{L("SON OLAYLAR")}</Text>
      <View style={st.log}>
        {son.length ? (
          son.map((l, i) => (
            <View key={`${log.length}-${i}`} style={[st.logRow, i > 0 && st.div, i === 0 && { opacity: 1 }]}>
              <Text style={[st.wk, i === 0 && { color: C.gold }]}>{L("{0}. HF", [l.n])}</Text>
              <Text style={[st.logT, i === 0 && { color: C.text }]}>{l.t}</Text>
            </View>
          ))
        ) : (
          <Text style={st.hint}>{L("Kamp hazır. Haftalar kendiliğinden akacak; bir karar gerektiğinde duracak.")}</Text>
        )}
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  now: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: R, borderWidth: 1, borderColor: C.goldDeep, padding: 12, marginTop: 10 },
  nowK: { color: C.gold, fontFamily: F.display, fontSize: 11, letterSpacing: 1.5 },
  nowT: { color: C.text, fontFamily: F.semi, fontSize: 14, lineHeight: 20, marginTop: 2 },
  live: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.red },
  bar: { height: 6, borderRadius: 3, backgroundColor: '#1f2228', overflow: 'hidden', marginTop: 8, marginBottom: 10 },
  fill: { height: 6, borderRadius: 3, backgroundColor: C.red },
  dec: { backgroundColor: C.card, borderWidth: 1.5, borderRadius: 14, padding: 12, gap: 10, marginBottom: 12 },
  decK: { fontFamily: F.semi, fontSize: 10, letterSpacing: 1.5 },
  decT: { color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  res: { color: C.gold, fontFamily: F.semi, fontSize: 13, lineHeight: 19 },
  opt: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, backgroundColor: '#101116' },
  optT: { color: C.text, fontFamily: F.bold, fontSize: 14 },
  optD: { color: C.faint, fontFamily: F.body, fontSize: 12, marginTop: 2 },
  logH: { color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 2, marginTop: 4, marginBottom: 6 },
  log: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 4 },
  logRow: { flexDirection: 'row', gap: 10, paddingVertical: 9, opacity: 0.75 },
  div: { borderTopWidth: 1, borderTopColor: C.border },
  wk: { width: 38, color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 0.5, marginTop: 2 },
  logT: { flex: 1, color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  hint: { color: C.faint, fontFamily: F.body, fontSize: 13, paddingVertical: 10 },
});
