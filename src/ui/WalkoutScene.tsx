// Dövüş gecesi açılışı: kafese yürüyüş ve ring anonsu ("Kırmızı köşede…"). Giriş müziği ve kıyafet burada sahnelenir.
// Büyük maçlarda (ilk maç, ana maç, unvan, ezeli rakip) tam anons; diğerlerinde kısa sürüm. Dokununca geçilir.
import { fanLevel, SONGS, UNLOCKS, walkoutCrowd } from '../engine/fanClub';
import { isAway } from '../engine/worldMap';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, G, RadialGradient, Stop } from 'react-native-svg';
import { announce, stopAnnounce } from '../announcer';
import { playWalkout, sfx, walkoutSeconds } from '../audio';
import { playerKit, walkoutNow } from '../cosmetics';
import { currentOrg } from '../engine/character';
import { COUNTRIES, ORGS, WEIGHT_CLASSES } from '../engine/data';
import { oppRecord } from '../engine/opponents';
import { lookFor } from '../engine/tale';
import type { GameState } from '../engine/types';
import { L, LOC } from '../i18n';
import { Logo, upName } from './components';
import { DEFAULT_LOOK } from './FighterAvatar';
import { Figure, HIP_H, POSES } from './rig';
import { C, F } from './theme';

type Card = { kicker: string; lines: string[]; name?: string; nick?: string; side?: 'p' | 'o'; ms: number; say?: string };

/** Spikerin okuyacağı isim: ad, "lakap", soyad. */
const spoken = (x: { ad: string; soyad: string; lakap?: string }) => [x.ad, x.lakap ? `"${x.lakap}"` : '', x.soyad].filter(Boolean).join(', ');

const BLUE_KIT = { shorts: '#1f4fbf', trim: '#ffffff', glove: '#1740a8' };

/** Bu dövüş için anons kartları (tam ya da kısa). */
function script(s: GameState): Card[] {
  const fs = s.pending.dovus!;
  const o = fs.opp;
  const f = s.fighter;
  const org = ORGS[currentOrg(s)];
  const pro = s.stage !== 'amator';
  const r = pro ? s.rekor : s.amator;
  const big = fs.unvanMaci || fs.anaMac || s.ezeli?.id === o.id || s.gecmis.length === 0;
  const pCard: Card = {
    kicker: big ? L("VE KIRMIZI KÖŞEDE…") : L("KIRMIZI KÖŞEDE…"),
    lines: [L("{0} galibiyet, {1} mağlubiyet", [r.g, r.m]), [...new Set([f.memleket, COUNTRIES[f.uyruk]?.ad].filter(Boolean))].join(' · ')],
    nick: f.lakap,
    name: upName(`${f.ad} ${f.soyad}`, f.uyruk),
    side: 'p',
    ms: 4200,
    say: !big ? L("Kırmızı köşede! {0}!", [spoken(f)]) : r.g + r.m === 0 ? L("Ve kırmızı köşede! İlk maçına çıkıyor… {0}!", [spoken(f)]) : L("Ve kırmızı köşede! {0} galibiyet, {1} mağlubiyet… {2}!", [r.g, r.m, spoken(f)]),
  };
  const crowd = walkoutCrowd(s, isAway(s, o.sehir));
  const fanCard: Card[] = crowd ? [{ kicker: L("TRİBÜNLER AYAKTA…"), lines: [crowd.baslik.toLocaleUpperCase(LOC), crowd.satirlar[crowd.satirlar.length - 1]], ms: 2400, say: crowd.soz }] : [];
  const kulup = s.kulup;
  if (kulup?.sarki != null && fanLevel(s) >= UNLOCKS.sarki) pCard.lines = [...pCard.lines, `🎵 ${SONGS()[kulup.sarki]}`];
  if (!big) return [...fanCard, pCard, { kicker: L("KURALLAR BELLİ. DÖVÜŞÜN!"), lines: [], ms: 1300, say: L("Kurallar belli. Dövüşün!") }];
  const baslik = fs.unvanMaci
    ? L("{0} sıklet şampiyonluk maçı", [WEIGHT_CLASSES[f.siklet].ad])
    : s.ezeli?.id === o.id
      ? L("Ezeli rakipler yine karşı karşıya")
      : L("{0} sıklet · {1} raunt", [WEIGHT_CLASSES[f.siklet].ad, fs.maxRaunt]);
  return [
    { kicker: L("BAYANLAR VE BAYLAR…"), lines: [org.ad.toLocaleUpperCase(LOC), baslik], ms: 2600, say: L("Bayanlar ve baylar! {0}. {1}!", [org.ad, baslik.replace(/ · /g, ', ')]) },
    {
      kicker: L("MAVİ KÖŞEDE…"),
      lines: [L("Rekor: {0}", [oppRecord(o)]), o.uyruk],
      nick: o.lakap,
      name: upName(`${o.ad} ${o.soyad}`, o.uyruk),
      side: 'o',
      ms: 3200,
      say: L("Mavi köşede! {0}!", [spoken(o)]),
    },
    ...fanCard,
    pCard,
    { kicker: L("HAYDİ BAŞLAYALIM!"), lines: [], ms: 1500, say: L("Haydi başlayalım!") },
  ];
}

export function WalkoutScene({ s, onDone: finish }: { s: GameState; onDone: () => void }) {
  const onDone = () => {
    stopAnnounce();
    finish();
  };
  const [cards] = useState(() => script(s));
  const [i, setI] = useState(0);
  const [fade] = useState(() => new Animated.Value(0));
  const [walk] = useState(() => new Animated.Value(0));
  const [pKit] = useState(playerKit);
  const card = cards[i];

  useEffect(() => {
    fade.setValue(0);
    walk.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }).start();
    if (card.side) Animated.timing(walk, { toValue: 1, duration: 1300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    if (card.side === 'p') {
      const w = walkoutNow();
      if (w) playWalkout(w);
      else sfx('roar');
    } else if (card.side === 'o') sfx('swell', 0.6);
    else if (i === cards.length - 1) sfx('bell');
    const w = card.side === 'p' ? walkoutNow() : null;
    const ms = w ? Math.max(card.ms, Math.min(6000, walkoutSeconds(w) * 1000)) : card.ms;
    // Kart en az kendi süresi kadar ekranda kalır; spiker cümlesini bitirmeden sonrakine geçilmez.
    let alive = true;
    let t: ReturnType<typeof setTimeout> | undefined;
    const wait = new Promise<void>((r) => (t = setTimeout(r, ms)));
    void Promise.all([wait, card.say ? announce(card.say, 9000) : null]).then(() => {
      if (alive) (i + 1 < cards.length ? setI(i + 1) : onDone());
    });
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const look = card.side === 'p' ? s.fighter.gorunum ?? DEFAULT_LOOK : lookFor(s.pending.dovus!.opp);
  const kit = card.side === 'p' ? pKit : BLUE_KIT;
  const color = card.side === 'p' ? C.red : card.side === 'o' ? C.blue : C.gold;
  const dir = card.side === 'o' ? 1 : -1;

  return (
    <Modal transparent animationType="fade" onRequestClose={onDone}>
      <Pressable style={st.back} onPress={onDone}>
        <LinearGradient colors={['#000', '#0b0c10', '#000']} style={StyleSheet.absoluteFill} />
        <View style={st.stage}>
          {card.side ? (
            <Animated.View style={{ opacity: fade, transform: [{ translateX: walk.interpolate({ inputRange: [0, 1], outputRange: [dir * 160, 0] }) }] }}>
              <Svg width={220} height={275} viewBox="0 0 100 125">
                <Defs>
                  <RadialGradient id="wspot" cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor={color} stopOpacity={0.55} />
                    <Stop offset="1" stopColor={color} stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Ellipse cx={50} cy={117} rx={46} ry={9} fill="url(#wspot)" />
                <Ellipse cx={50} cy={118} rx={22} ry={3.5} fill="#000" opacity={0.55} />
                <G transform={`translate(50 ${118 - HIP_H * 1.1}) scale(${card.side === 'o' ? -1.1 : 1.1} 1.1)`}>
                  <Figure p={POSES.stance} look={look} kit={kit} />
                </G>
              </Svg>
            </Animated.View>
          ) : (
            <Animated.View style={{ opacity: fade, marginBottom: 30 }}>
              <Logo size={120} />
            </Animated.View>
          )}
        </View>
        <Animated.View style={[st.text, { opacity: fade }]}>
          <Text style={[st.kicker, { color }]}>{card.kicker}</Text>
          {card.lines.map((l) => (
            <Text key={l} style={st.line}>
              {l}
            </Text>
          ))}
          {card.nick ? <Text style={st.nick}>“{card.nick.toLocaleUpperCase(LOC)}”</Text> : null}
          {card.name ? (
            <Text style={[st.name, { textShadowColor: color, fontSize: card.name.length > 20 ? 28 : card.name.length > 14 ? 34 : 40 }]} numberOfLines={2}>
              {card.name}
            </Text>
          ) : null}
        </Animated.View>
        <Text style={st.skip}>{L("Geçmek için dokun")}</Text>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  back: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 36 },
  stage: { height: 280, justifyContent: 'flex-end', alignItems: 'center' },
  text: { alignItems: 'center', paddingHorizontal: 20, marginTop: 18, marginBottom: 30, minHeight: 190 },
  kicker: { fontFamily: F.display, fontSize: 22, letterSpacing: 3, marginBottom: 8, textAlign: 'center' },
  line: { color: '#d9dbe0', fontFamily: F.semi, fontSize: 16, textAlign: 'center', marginTop: 2 },
  nick: { color: C.gold, fontFamily: F.displayMed, fontSize: 18, marginTop: 12 },
  name: { color: '#fff', fontFamily: F.display, textAlign: 'center', transform: [{ skewX: '-8deg' }], textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },
  skip: { color: C.faint, fontFamily: F.semi, fontSize: 12 },
});
