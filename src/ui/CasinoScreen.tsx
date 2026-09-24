import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { money } from '../engine/career';
import {
  dealerPlay,
  drawCard,
  handValue,
  isBlackjack,
  payout,
  placeBet,
  RED,
  settleBlackjack,
  spinRoulette,
  spinSlot,
  type Card as PCard,
  type RouletteBet,
} from '../engine/casino';
import type { GameState } from '../engine/types';
import { Button, Card, P, Screen, SLANT, Title } from './components';
import type { Act } from './GameScreens';
import { C, F, R } from './theme';

const BETS = [100, 500, 1000, 5000, 25000, 100000];

function BetPicker({ s, bet, setBet }: { s: GameState; bet: number; setBet: (n: number) => void }) {
  return (
    <View style={cz.bets}>
      {BETS.map((b) => {
        const ok = s.para >= b;
        return (
          <Pressable key={b} disabled={!ok} onPress={() => setBet(b)} style={[cz.chip, bet === b && cz.chipOn, !ok && { opacity: 0.3 }]}>
            <Text style={[cz.chipText, bet === b && { color: '#1f1605' }]}>{b >= 1000 ? `${b / 1000}K` : b}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Result({ text, good }: { text: string | null; good?: boolean }) {
  if (!text) return null;
  return (
    <View style={[cz.result, { borderColor: good ? C.green : C.red }]}>
      <Text style={[cz.resultText, { color: good ? C.green : C.text }]}>{text}</Text>
    </View>
  );
}

// ---------- Slot ----------

function Slot({ s, act }: { s: GameState; act: Act }) {
  const [bet, setBet] = useState(100);
  const [reels, setReels] = useState(['🥊', '🏆', '7️⃣']);
  const [msg, setMsg] = useState<{ t: string; g: boolean } | null>(null);
  const spin = () =>
    act((x) => {
      if (!placeBet(x, bet)) return;
      const r = spinSlot();
      const win = Math.round(bet * r.carpan);
      const side = payout(x, bet, win);
      setReels(r.reels);
      setMsg({
        t: (r.carpan >= 6 ? `🎉 JACKPOT! ×${r.carpan} → +${money(win)}` : win > 0 ? `${money(win)} geri aldın (×${r.carpan})` : `Kaybettin: -${money(bet)}`) + (side ? `\n${side}` : ''),
        g: win > bet,
      });
    });
  return (
    <>
      <LinearGradient colors={['#2a0608', '#0a0203']} style={cz.machine}>
        <Text style={[cz.machineTitle, SLANT]}>KAFES SLOT</Text>
        <View style={cz.reels}>
          {reels.map((r, i) => (
            <View key={i} style={cz.reel}>
              <Text style={cz.reelText}>{r}</Text>
            </View>
          ))}
        </View>
        <Text style={cz.pay}>3× 7️⃣ = ×150 · 3× 🏆 = ×50 · 3× 💰 = ×20 · 3× 🔥 = ×12 · 3× 🥊/🥋 = ×6 · ikili = ×1</Text>
      </LinearGradient>
      <BetPicker s={s} bet={bet} setBet={setBet} />
      <Button label={`Çevir (${money(bet)})`} icon="slot-machine" tone="gold" disabled={s.para < bet} onPress={spin} />
      <Result text={msg?.t ?? null} good={msg?.g} />
    </>
  );
}

// ---------- Blackjack ----------

function CardView({ c, hidden }: { c: PCard; hidden?: boolean }) {
  const red = c.s === '♥' || c.s === '♦';
  if (hidden)
    return (
      <View style={[cz.card, { backgroundColor: C.redDeep }]}>
        <Text style={[cz.cardText, { color: '#fff' }]}>?</Text>
      </View>
    );
  return (
    <View style={cz.card}>
      <Text style={[cz.cardText, { color: red ? '#c1121f' : '#111' }]}>{c.r}</Text>
      <Text style={[cz.cardSuit, { color: red ? '#c1121f' : '#111' }]}>{c.s}</Text>
    </View>
  );
}

function Blackjack({ s, act }: { s: GameState; act: Act }) {
  const [bet, setBet] = useState(500);
  const [stake, setStake] = useState(0);
  const [p, setP] = useState<PCard[]>([]);
  const [d, setD] = useState<PCard[]>([]);
  const [phase, setPhase] = useState<'bet' | 'play' | 'done'>('bet');
  const [msg, setMsg] = useState<{ t: string; g: boolean } | null>(null);

  const finish = (ph: PCard[], dh: PCard[], st: number) => {
    const dealer = handValue(ph) > 21 ? dh : dealerPlay(dh);
    const r = settleBlackjack(ph, dealer);
    const win = Math.round(st * r.carpan);
    act((x) => {
      const side = payout(x, st, win);
      const label = { blackjack: '🂡 BLACKJACK! ', kazandin: '✅ Kazandın! ', kaybettin: '❌ Kaybettin. ', berabere: '➖ Berabere. ' }[r.sonuc];
      setMsg({ t: `${label}${win > st ? `+${money(win - st)}` : win === st ? 'Bahis iade' : `-${money(st)}`}${side ? `\n${side}` : ''}`, g: win > st });
    });
    setD(dealer);
    setPhase('done');
  };

  const deal = () =>
    act((x) => {
      if (!placeBet(x, bet)) return;
      const ph = [drawCard(), drawCard()];
      const dh = [drawCard(), drawCard()];
      setP(ph);
      setD(dh);
      setStake(bet);
      setMsg(null);
      setPhase('play');
      if (isBlackjack(ph) || isBlackjack(dh)) setTimeout(() => finish(ph, dh, bet), 0);
    });
  const hit = () => {
    const ph = [...p, drawCard()];
    setP(ph);
    if (handValue(ph) >= 21) finish(ph, d, stake);
  };
  const double = () =>
    act((x) => {
      if (!placeBet(x, stake)) return;
      const ph = [...p, drawCard()];
      setP(ph);
      setStake(stake * 2);
      setTimeout(() => finish(ph, d, stake * 2), 0);
    });

  return (
    <>
      <LinearGradient colors={['#0c3a1f', '#04150b']} style={cz.table}>
        <Text style={cz.tableLabel}>KRUPİYE {phase !== 'bet' ? `· ${phase === 'play' ? '?' : handValue(d)}` : ''}</Text>
        <View style={cz.hand}>{d.map((c, i) => <CardView key={i} c={c} hidden={phase === 'play' && i === 1} />)}</View>
        <View style={{ height: 18 }} />
        <Text style={cz.tableLabel}>SEN {p.length ? `· ${handValue(p)}` : ''}</Text>
        <View style={cz.hand}>{p.map((c, i) => <CardView key={i} c={c} />)}</View>
        {phase !== 'bet' ? <Text style={[cz.tableLabel, { marginTop: 10 }]}>BAHİS: {money(stake)}</Text> : null}
      </LinearGradient>
      {phase === 'play' ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button label="Kart çek" onPress={hit} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Dur" tone="gold" onPress={() => finish(p, d, stake)} />
          </View>
          {p.length === 2 && s.para >= stake ? (
            <View style={{ flex: 1 }}>
              <Button label="×2" tone="ghost" onPress={double} />
            </View>
          ) : null}
        </View>
      ) : (
        <>
          <BetPicker s={s} bet={bet} setBet={setBet} />
          <Button label={`Dağıt (${money(bet)})`} icon="cards-playing" tone="gold" disabled={s.para < bet} onPress={deal} />
        </>
      )}
      <Result text={msg?.t ?? null} good={msg?.g} />
    </>
  );
}

// ---------- Rulet ----------

const RBETS: { key: RouletteBet; ad: string; renk: string }[] = [
  { key: 'kirmizi', ad: 'KIRMIZI', renk: '#c1121f' },
  { key: 'siyah', ad: 'SİYAH', renk: '#222' },
  { key: 'tek', ad: 'TEK', renk: C.cardAlt },
  { key: 'cift', ad: 'ÇİFT', renk: C.cardAlt },
  { key: 'dusuk', ad: '1-18', renk: C.cardAlt },
  { key: 'yuksek', ad: '19-36', renk: C.cardAlt },
];

function Roulette({ s, act }: { s: GameState; act: Act }) {
  const [bet, setBet] = useState(500);
  const [choice, setChoice] = useState<RouletteBet>('kirmizi');
  const [num, setNum] = useState(17);
  const [last, setLast] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ t: string; g: boolean } | null>(null);
  const spin = () =>
    act((x) => {
      if (!placeBet(x, bet)) return;
      const r = spinRoulette(choice);
      const win = bet * r.carpan;
      const side = payout(x, bet, win);
      setLast(r.sayi);
      setMsg({ t: (win ? `✅ ${r.sayi}! +${money(win - bet)}` : `❌ ${r.sayi}. -${money(bet)}`) + (side ? `\n${side}` : ''), g: win > 0 });
    });
  const col = (n: number) => (n === 0 ? '#0c7a3a' : RED.has(n) ? '#c1121f' : '#1a1a1a');
  return (
    <>
      <LinearGradient colors={['#0c3a1f', '#04150b']} style={[cz.table, { alignItems: 'center' }]}>
        <View style={[cz.ball, { backgroundColor: last == null ? C.cardAlt : col(last) }]}>
          <Text style={cz.ballText}>{last ?? '?'}</Text>
        </View>
        <Text style={[cz.tableLabel, { marginTop: 8 }]}>RENK/TEK-ÇİFT/YARI ×2 · TEK SAYI ×36</Text>
      </LinearGradient>
      <View style={cz.rbets}>
        {RBETS.map((b) => (
          <Pressable key={String(b.key)} onPress={() => setChoice(b.key)} style={[cz.rbet, { backgroundColor: b.renk }, choice === b.key && cz.rbetOn]}>
            <Text style={cz.rbetText}>{b.ad}</Text>
          </Pressable>
        ))}
      </View>
      <View style={cz.numRow}>
        <Pressable onPress={() => setNum((n) => (n + 36) % 37)} style={cz.step}>
          <Text style={cz.rbetText}>−</Text>
        </Pressable>
        <Pressable onPress={() => setChoice(num)} style={[cz.rbet, { flex: 1, backgroundColor: col(num) }, choice === num && typeof choice === 'number' && cz.rbetOn]}>
          <Text style={cz.rbetText}>SAYI: {num}</Text>
        </Pressable>
        <Pressable onPress={() => setNum((n) => (n + 1) % 37)} style={cz.step}>
          <Text style={cz.rbetText}>+</Text>
        </Pressable>
      </View>
      <BetPicker s={s} bet={bet} setBet={setBet} />
      <Button label={`Çevir (${money(bet)})`} icon="poker-chip" tone="gold" disabled={s.para < bet} onPress={spin} />
      <Result text={msg?.t ?? null} good={msg?.g} />
    </>
  );
}

// ---------- Ekran ----------

export function CasinoScreen({ s, act }: { s: GameState; act: Act }) {
  const [game, setGame] = useState<'slot' | 'bj' | 'rulet'>('slot');
  const net = s.kumar?.net ?? 0;
  return (
    <Screen footer={<Button label="Kumarhaneden çık" icon="arrow-left" tone="ghost" onPress={() => act((x) => (x.phase = 'hub'))} />}>
      <Title kicker="GECE HAYATI" sub="Kasa her zaman kazanır. Büyük bahisler paparazzilerin dikkatini çeker.">
        Kumarhane
      </Title>
      {s.kumar?.uyari && s.kumar.sonHafta === s.hafta ? (
        <Card accent={C.orange}>
          <P style={{ marginBottom: 0 }}>⚠️ {s.kumar.uyari}</P>
        </Card>
      ) : null}
      <View style={cz.wallet}>
        <View>
          <Text style={cz.walletLabel}>BAKİYE</Text>
          <Text style={[cz.walletVal, SLANT]}>{money(s.para)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={cz.walletLabel}>KUMAR NET</Text>
          <Text style={[cz.walletNet, { color: net >= 0 ? C.green : C.red }]}>
            {net >= 0 ? '+' : ''}
            {money(net)}
          </Text>
        </View>
      </View>
      <View style={cz.tabs}>
        {(
          [
            ['slot', 'SLOT'],
            ['bj', 'BLACKJACK'],
            ['rulet', 'RULET'],
          ] as const
        ).map(([k, l]) => (
          <Pressable key={k} onPress={() => setGame(k)} style={[cz.tab, game === k && cz.tabOn]}>
            <Text style={[cz.tabText, game === k && { color: '#fff' }]}>{l}</Text>
          </Pressable>
        ))}
      </View>
      {game === 'slot' ? <Slot s={s} act={act} /> : game === 'bj' ? <Blackjack s={s} act={act} /> : <Roulette s={s} act={act} />}
      {s.para < 100 ? (
        <Card accent={C.red}>
          <P style={{ marginBottom: 0 }}>Cebinde oynayacak para kalmadı. Belki de kafese dönme vakti.</P>
        </Card>
      ) : null}
    </Screen>
  );
}

const cz = StyleSheet.create({
  wallet: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: R, padding: 14, marginBottom: 12 },
  walletLabel: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1.5 },
  walletVal: { color: C.gold, fontFamily: F.display, fontSize: 28 },
  walletNet: { fontFamily: F.display, fontSize: 18, marginTop: 6 },
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 4, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, transform: [{ skewX: '-8deg' }] },
  tabOn: { backgroundColor: C.red, borderColor: C.red },
  tabText: { color: C.dim, fontFamily: F.display, fontSize: 13, letterSpacing: 1 },
  machine: { borderRadius: R, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: C.goldDeep, marginBottom: 12 },
  machineTitle: { color: C.gold, fontFamily: F.display, fontSize: 22, letterSpacing: 3, marginBottom: 12 },
  reels: { flexDirection: 'row', gap: 10 },
  reel: { width: 78, height: 88, borderRadius: 6, backgroundColor: '#f4f1ea', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.gold },
  reelText: { fontSize: 42 },
  pay: { color: C.dim, fontFamily: F.body, fontSize: 10, textAlign: 'center', marginTop: 12, lineHeight: 15 },
  bets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { width: 50, height: 50, borderRadius: 25, borderWidth: 3, borderStyle: 'dashed', borderColor: C.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1208' },
  chipOn: { backgroundColor: C.gold },
  chipText: { color: C.gold, fontFamily: F.display, fontSize: 14 },
  result: { borderWidth: 1, borderRadius: R, padding: 12, marginTop: 12, backgroundColor: C.card },
  resultText: { fontFamily: F.bold, fontSize: 15, lineHeight: 22 },
  table: { borderRadius: R, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: '#3a2a0a' },
  tableLabel: { color: 'rgba(255,255,255,0.75)', fontFamily: F.display, fontSize: 12, letterSpacing: 1.5, marginBottom: 6 },
  hand: { flexDirection: 'row', gap: 8, minHeight: 74 },
  card: { width: 50, height: 72, borderRadius: 5, backgroundColor: '#f4f1ea', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#999' },
  cardText: { fontFamily: F.display, fontSize: 20 },
  cardSuit: { fontSize: 18 },
  ball: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.gold },
  ballText: { color: '#fff', fontFamily: F.display, fontSize: 32 },
  rbets: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  rbet: { width: '31.5%', paddingVertical: 12, alignItems: 'center', borderRadius: 4, borderWidth: 2, borderColor: 'transparent' },
  rbetOn: { borderColor: C.gold },
  rbetText: { color: '#fff', fontFamily: F.display, fontSize: 14, letterSpacing: 1 },
  numRow: { flexDirection: 'row', gap: 6, marginBottom: 12, alignItems: 'center' },
  step: { width: 48, paddingVertical: 12, alignItems: 'center', backgroundColor: C.cardAlt, borderRadius: 4 },
});
