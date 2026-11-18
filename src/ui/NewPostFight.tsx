// Yeni görünüm: maç sonu sahnesi. Hakem kazananın kolunu kaldırır, kaybeden boynu bükük; üstte büyük sonuç,
// altta yayın bandı (kazananın adı, yöntem, raunt ve süre). Klasik görünümde hiç çizilmez; yalnızca okur.
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, G, LinearGradient as SvgLinear, Polygon, Stop } from 'react-native-svg';
import { playerKit, useCosmetics } from '../cosmetics';
import { ORGS } from '../engine/data';
import { lookFor } from '../engine/tale';
import type { Appearance, GameState } from '../engine/types';
import { L, LOC } from '../i18n';
import { CageBg, SLANT, upName } from './components';
import { DEFAULT_LOOK } from './FighterAvatar';
import { flagOf } from './NewCareer';
import { Figure, HIP_H, POSES, type Kit, type PoseName } from './rig';
import { C, F } from './theme';

const REF_LOOK: Appearance = { ten: 1, sac: 'kazik', sacRenk: 7, goz: 0, sakal: 'yok', yara: false, dovme: false };
const BLUE: Kit = { shorts: '#1f4fbf', trim: '#ffffff', glove: '#1740a8' };
const REF_KIT: Kit = { shorts: '#15161a', trim: '#fff', glove: '#000', ref: true };

type Ozet = NonNullable<NonNullable<GameState['pending']['sonrasi']>['ozet']>;

function Fig({ x, pose, look, kit, flip, op = 1 }: { x: number; pose: PoseName; look: Appearance; kit: Kit; flip?: boolean; op?: number }) {
  return (
    <G opacity={op} transform={`translate(${x} ${118 - HIP_H * 1.05}) scale(${flip ? -1.05 : 1.05} 1.05)`}>
      <Figure p={POSES[pose]} look={look} kit={kit} />
    </G>
  );
}

/** Maç sonu kahraman sahnesi. pWin: true oyuncu kazandı, false rakip, null berabere / geçersiz. */
export function PostHero({ s, o, pWin, tone, title }: { s: GameState; o: Ozet; pWin: boolean | null; tone: string; title: string }) {
  useCosmetics();
  const opp = s.pending.rakip;
  const pLook = s.fighter.gorunum ?? DEFAULT_LOOK;
  const oLook = opp ? lookFor(opp) : DEFAULT_LOOK;
  const pKit = playerKit();
  const decided = pWin !== null;
  const wLook = pWin === false ? oLook : pLook;
  const wKit = pWin === false ? BLUE : pKit;
  const lLook = pWin === false ? pLook : oLook;
  const lKit = pWin === false ? pKit : BLUE;
  const wName = pWin === false ? (opp ? upName(o.rakip, opp.uyruk) : o.rakip.toUpperCase()) : upName(`${s.fighter.ad} ${s.fighter.soyad}`, s.fighter.uyruk);
  const wNick = pWin === false ? o.rakipLakap : s.fighter.lakap;
  const wFlag = pWin === false ? flagOf(opp?.uyruk) : flagOf(s.fighter.uyruk);
  const wRec = pWin === false ? o.rakipRekor : o.rekor;
  const corner = pWin === false ? C.blue : C.red;
  return (
    <View style={h.wrap}>
      <LinearGradient colors={[tone + '55', '#0c0b0a', '#040405']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <CageBg opacity={0.07} />
      <Svg width="100%" height="100%" viewBox="0 0 200 200" preserveAspectRatio="none" style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <SvgLinear id="phCone" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#fff4d6" stopOpacity={0.22} />
            <Stop offset="1" stopColor="#fff4d6" stopOpacity={0} />
          </SvgLinear>
        </Defs>
        <Polygon points="86,0 114,0 170,190 30,190" fill="url(#phCone)" />
      </Svg>
      <Text style={h.org} numberOfLines={1}>
        {`${ORGS[o.org].ad}${o.unvan ? L(" · ÜNVAN MAÇI") : ''}`.toLocaleUpperCase(LOC)}
      </Text>
      <Text style={[h.title, SLANT, { textShadowColor: tone }]} numberOfLines={1} adjustsFontSizeToFit>
        {title}
      </Text>

      {/* Sahne: kazanan, hakem, kaybeden */}
      <View style={h.stage} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 200 125">
          <Ellipse cx={100} cy={119} rx={86} ry={6} fill="#000" opacity={0.5} />
          {decided ? (
            <>
              <Fig x={152} pose="dejected" look={lLook} kit={lKit} flip op={0.55} />
              <Fig x={92} pose="refRaise" look={REF_LOOK} kit={REF_KIT} flip />
              <Fig x={64} pose="winHeld" look={wLook} kit={wKit} />
            </>
          ) : (
            <>
              <Fig x={56} pose="stance" look={pLook} kit={pKit} />
              <Fig x={100} pose="refIdle" look={REF_LOOK} kit={REF_KIT} />
              <Fig x={144} pose="stance" look={oLook} kit={BLUE} flip />
            </>
          )}
        </Svg>
      </View>

      {/* Yayın bandı */}
      <View style={h.band}>
        {decided ? (
          <View style={[h.winTag, { backgroundColor: tone }]}>
            <Text style={h.winTagText}>{L("KAZANAN")}</Text>
          </View>
        ) : null}
        <View style={h.nameRow}>
          {decided ? (
            <View style={[h.flag, { borderLeftColor: corner }]}>
              <Text style={{ fontSize: 22 }}>{wFlag || '🏳️'}</Text>
            </View>
          ) : null}
          <View style={h.nameBox}>
            {decided && wNick ? <Text style={h.nick}>“{wNick.toLocaleUpperCase(LOC)}”</Text> : null}
            <Text style={h.name} numberOfLines={1} adjustsFontSizeToFit>
              {decided ? wName : `${upName(s.fighter.soyad, s.fighter.uyruk)} · ${o.rakip.toUpperCase()}`}
            </Text>
          </View>
          {decided ? (
            <View style={h.recBox}>
              <Text style={h.recText}>{wRec}</Text>
            </View>
          ) : null}
        </View>
        <View style={h.method}>
          <Text style={[h.methodMain, { color: tone }]}>{o.yontem.toLocaleUpperCase(LOC)}</Text>
          {o.teknik ? <Text style={h.methodSub} numberOfLines={1}>· {o.teknik.toLocaleUpperCase(LOC)}</Text> : null}
          <Text style={h.methodSub}>· {L("R{0} · {1}", [o.raunt, o.sure])}</Text>
        </View>
        {o.kartlar ? <Text style={h.cards}>{L("Hakem kartları:")} {o.kartlar}</Text> : null}
      </View>
    </View>
  );
}

const h = StyleSheet.create({
  wrap: { height: 470, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2d34', marginBottom: 12 },
  org: { position: 'absolute', top: 10, left: 0, right: 0, textAlign: 'center', color: C.dim, fontFamily: F.black, fontSize: 10, letterSpacing: 2 },
  title: { marginTop: 22, textAlign: 'center', color: '#fff', fontFamily: F.display, fontSize: 46, lineHeight: 52, letterSpacing: 2, textShadowRadius: 18, paddingHorizontal: 12 },
  stage: { position: 'absolute', left: 0, right: 0, top: 70, height: 250 },
  band: { position: 'absolute', left: 10, right: 10, bottom: 12, gap: 0 },
  winTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3 },
  winTagText: { color: '#1f1605', fontFamily: F.black, fontSize: 10, letterSpacing: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'stretch' },
  flag: { width: 48, backgroundColor: 'rgba(8,9,12,0.94)', borderLeftWidth: 4, alignItems: 'center', justifyContent: 'center' },
  nameBox: { flex: 1, backgroundColor: 'rgba(28,30,36,0.95)', paddingHorizontal: 12, paddingVertical: 5, justifyContent: 'center' },
  nick: { color: C.gold, fontFamily: F.displayMed, fontSize: 12.5 },
  name: { color: '#fff', fontFamily: F.display, fontSize: 26, lineHeight: 30, letterSpacing: 0.5 },
  recBox: { backgroundColor: C.red, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  recText: { color: '#fff', fontFamily: F.display, fontSize: 17 },
  method: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(8,9,12,0.92)', paddingHorizontal: 12, paddingVertical: 7, flexWrap: 'wrap' },
  methodMain: { fontFamily: F.display, fontSize: 17, letterSpacing: 1 },
  methodSub: { color: '#cfd2d9', fontFamily: F.bold, fontSize: 12, letterSpacing: 0.8, flexShrink: 1 },
  cards: { backgroundColor: 'rgba(8,9,12,0.85)', color: C.dim, fontFamily: F.semi, fontSize: 11.5, paddingHorizontal: 12, paddingBottom: 6 },
});
