// Yeni görünüm: kariyer ana ekranı sahnesi ve maç öncesi VS sahnesi. Klasik görünümde hiç çizilmez.
// Yalnızca görünüm: oyun durumu okunur, hiçbir şey değiştirilmez. Dokunuşlar mevcut eylemleri çağırır.
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Ellipse, G } from 'react-native-svg';
import { playerKit, useCosmetics } from '../cosmetics';
import { money } from '../engine/career';
import { statAverage } from '../engine/character';
import { WEIGHT_CLASSES } from '../engine/data';
import { fmtFollowers, followers } from '../engine/fame';
import { judgePick, SLOT_LABEL } from '../engine/fightNight';
import { lookFor, physique, playerPhysique } from '../engine/tale';
import type { Appearance, FightNight, GameState, NightBout, Opponent } from '../engine/types';
import { L, LOC } from '../i18n';
import { ArenaBackdrop, GymBackdrop } from './ArenaBackdrop';
import { arenaLook, LIGHTS_ART, orgShort } from './arenaArt';
import { CageBg, Icon, SLANT, upName } from './components';
import { DEFAULT_LOOK } from './FighterAvatar';
import { Figure, HIP_H, POSES, type Kit, type PoseName } from './rig';
import { C, F } from './theme';

export { arenaOrgText, orgShort } from './arenaArt';


const shortMoney = (n: number) => (Math.abs(n) < 100_000 ? money(n) : `${n < 0 ? '-' : ''}$${fmtFollowers(Math.abs(n))}`);

/** Ayakta duran tam boy dövüşçü. flip: sola bakar. */
export function Standing({ look, kit, h, flip, pose = 'stance' }: { look: Appearance; kit: Kit; h: number; flip?: boolean; pose?: PoseName }) {
  const w = h * 0.8;
  return (
    <Svg width={w} height={h} viewBox="0 0 80 100">
      <Ellipse cx={40} cy={96} rx={22} ry={3.5} fill="#000" opacity={0.45} />
      <G transform={`translate(40 ${96 - HIP_H * 0.95}) scale(${flip ? -0.95 : 0.95} 0.95)`}>
        <Figure p={POSES[pose]} look={look} kit={kit} />
      </G>
    </Svg>
  );
}

/** 10 parçalı gösterge (kondisyon, popülerlik). */
function Segments({ label, value, colorAt }: { label: string; value: number; colorAt: (i: number) => string }) {
  const n = Math.round(Math.max(0, Math.min(100, value)) / 10);
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <Text style={k.segLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {Array.from({ length: 10 }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 6, backgroundColor: i < n ? colorAt(i) : '#2a2d34' }} />
        ))}
      </View>
    </View>
  );
}

const condColor = (i: number) => (i < 2 ? C.red : i < 4 ? C.orange : i < 6 ? C.gold : C.green);

/** Kariyer ana ekranı: hafta şeridi, salon sahnesi (dövüşçü, isim levhası, Kafesgram) ve asıl eylem. */
export function CareerStage({ s, onSocial, fight }: { s: GameState; onSocial: () => void; fight: { title: string; sub: string; onPress: () => void; disabled?: boolean } }) {
  useCosmetics();
  const f = s.fighter;
  const amator = s.stage === 'amator';
  const r = amator ? s.amator : s.rekor;
  const posts = (s.sosyal ?? []).filter((p) => !p.foto && p.metin).slice(0, 2);
  const stats = [
    { ad: amator ? L("AMATÖR") : L("KARNE"), val: `${r.g}-${r.m}-${r.b}`, renk: C.text },
    { ad: L("PUAN"), val: String(s.puan), renk: '#b57bff' },
    { ad: L("PARA"), val: shortMoney(s.para), renk: s.para < 0 ? '#ff4d5e' : C.green },
    { ad: L("TAKİPÇİ"), val: fmtFollowers(followers(s)), renk: C.gold },
  ];
  const sub = s.sampiyon ? L("👑 ŞAMPİYON") : !amator && s.rank ? L("#{0} SIRALAMA", [s.rank]) : orgShort(s);
  return (
    <View style={k.wrap}>
      {/* Hafta şeridi */}
      <View style={k.strip}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={k.week}>{L("HAFTA {0}", [s.hafta])}</Text>
          <View style={{ flex: 1 }} />
          <Text style={k.ovr}>{L("GÜÇ")} {Math.round(statAverage(f.stats))}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {stats.map((x) => (
            <View key={x.ad} style={{ flex: 1 }}>
              <Text style={k.segLabel}>{x.ad}</Text>
              <Text style={[k.statVal, { color: x.renk }]} numberOfLines={1} adjustsFontSizeToFit>
                {x.val}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Segments label={L("SAĞLIK {0}", [s.saglik])} value={s.saglik} colorAt={condColor} />
          <Segments label={L("POPÜLERLİK {0}", [Math.round(s.populerlik)])} value={s.populerlik} colorAt={() => C.text} />
        </View>
      </View>

      {/* Salon sahnesi */}
      <View style={k.stage}>
        <LinearGradient colors={['#1d1a14', '#0f0e0b', '#050505']} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} />
        <CageBg opacity={0.07} />
        <View style={k.floor} />
        <View style={k.tape} />
        <GymBackdrop dim={0.1} />
        <View style={k.figure} pointerEvents="none">
          <Standing look={f.gorunum ?? DEFAULT_LOOK} kit={playerKit()} h={300} />
        </View>

        <View style={k.left}>
          {posts.length ? (
            <Pressable onPress={onSocial} style={({ pressed }) => [k.panel, pressed && { borderColor: '#3aa8ff' }]}>
              <Text style={k.panelHead}>{L("KAFESGRAM")}</Text>
              {posts.map((p) => (
                <View key={p.id} style={k.post}>
                  <View style={[k.postAv, { backgroundColor: p.renk ?? C.red }]}>
                    <Text style={k.postAvText}>{(p.yazar[0] ?? '?').toLocaleUpperCase(LOC)}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={k.postName} numberOfLines={1}>
                      {p.yazar} <Text style={{ fontFamily: F.body, color: '#8b919c' }}>{p.kullanici}</Text>
                    </Text>
                    <Text style={k.postText} numberOfLines={2}>
                      {p.metin}
                    </Text>
                  </View>
                </View>
              ))}
            </Pressable>
          ) : null}
          {s.seri >= 2 ? (
            <View style={[k.panel, { borderColor: C.gold, padding: 9, gap: 3 }]}>
              <Text style={[k.panelHead, { color: C.gold, borderBottomWidth: 0, padding: 0 }]}>{L("GALİBİYET SERİSİ")}</Text>
              <Text style={k.postText}>{L("Üst üste {0} galibiyet", [s.seri])}</Text>
            </View>
          ) : null}
        </View>

        {/* İsim levhası */}
        <View style={k.plate}>
          <Text style={[k.plateName, SLANT]} numberOfLines={1}>
            {upName(`${f.ad} ${f.soyad}`, f.uyruk)}
          </Text>
          <Text style={k.plateSub}>
            {WEIGHT_CLASSES[f.siklet].ad.toLocaleUpperCase(LOC)} · {sub}
          </Text>
          {s.sampiyon && s.savunma > 0 ? <Text style={k.plateGold}>{L("{0} ÜNVAN SAVUNMASI", [s.savunma])}</Text> : null}
        </View>
      </View>

      {/* Asıl eylem */}
      <Pressable onPress={fight.onPress} disabled={fight.disabled} style={({ pressed }) => [k.cta, fight.disabled && { backgroundColor: '#23252b' }, pressed && { opacity: 0.85 }]}>
        <View style={{ flex: 1 }}>
          <Text style={k.ctaTitle}>{fight.title}</Text>
          <Text style={k.ctaSub} numberOfLines={2}>
            {fight.sub}
          </Text>
        </View>
        <Icon name="chevron-right" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

/** Maç öncesi VS sahnesi: iki köşede tam boy dövüşçüler, ortada "tale of the tape" sütunu, altta büyük isimler. */
export function VsStage({ s, g, opp, w }: { s: GameState; g: FightNight; opp: Opponent; w: number }) {
  useCosmetics();
  const f = s.fighter;
  const H = 400;
  const colW = Math.min(126, Math.round(w * 0.35));
  const pp = playerPhysique(f);
  const op = physique(opp.id, f.siklet);
  const oYas = 22 + (opp.id.charCodeAt(0) % 14);
  const pPow = Math.round(statAverage(f.stats));
  const oPow = Math.round(statAverage(opp.stats));
  // Amatörken amatör karne, profesyonelken profesyonel karne
  const rec = s.stage === 'amator' ? s.amator : s.rekor;
  /** [etiket, sol, sağ, sol sayı, sağ sayı, üstünlük vurgulansın mı] */
  const rows: [string, string, string, number, number, boolean][] = [
    [L("YAŞ"), `${f.yas}`, `${oYas}`, f.yas, oYas, false],
    [L('BOY'), `${pp.boy}`, `${op.boy}`, pp.boy, op.boy, true],
    [L("UZANMA"), `${pp.uzanma}`, `${op.uzanma}`, pp.uzanma, op.uzanma, true],
    [L("KARNE"), `${rec.g}-${rec.m}`, `${opp.rekor.g}-${opp.rekor.m}`, rec.g - rec.m, opp.rekor.g - opp.rekor.m, true],
    [L("GÜÇ"), `${pPow}`, `${oPow}`, pPow, oPow, true],
  ];
  const rounds = s.pending.dovus?.maxRaunt;
  const oKit: Kit = { shorts: '#1c4fc4', trim: '#f1f2f5', glove: '#1c4fc4' };
  const split = (n: string) => {
    const p = n.trim().split(/\s+/);
    return p.length > 1 ? [p.slice(0, -1).join(' '), p[p.length - 1]] : ['', n];
  };
  const [pa, pb] = split(upName(`${f.ad} ${f.soyad}`, f.uyruk));
  const [oa, ob] = split(upName(`${opp.ad} ${opp.soyad}`, opp.uyruk));
  const fh = 290;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={[v.stage, { height: H }]}>
        {/* Arena: kalabalık karanlığı, kafes deseni, iki köşe ışığı */}
        <LinearGradient colors={['#14161c', '#0a0b0f', '#040405']} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} />
        <CageBg opacity={0.08} />
        <ArenaBackdrop w={w} h={H} s={s} />
        <LinearGradient colors={['rgba(193,18,31,0.35)', 'rgba(193,18,31,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 0.45, y: 0.5 }} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(28,79,196,0)', 'rgba(28,79,196,0.35)']} start={{ x: 0.55, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        <View style={{ position: 'absolute', left: -w * 0.24, bottom: 18 }} pointerEvents="none">
          <Standing look={f.gorunum ?? DEFAULT_LOOK} kit={playerKit()} h={fh} />
        </View>
        <View style={{ position: 'absolute', right: -w * 0.24, bottom: 18 }} pointerEvents="none">
          <Standing look={lookFor(opp)} kit={oKit} h={fh} flip />
        </View>
        <LinearGradient colors={['transparent', 'rgba(4,4,5,0.85)']} locations={[0.78, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />

        {/* Orta sütun */}
        <View style={[v.col, { width: colW, left: (w - colW) / 2 }]}>
          <Text style={v.org}>{orgShort(s)}</Text>
          <Text style={v.weight} numberOfLines={1} adjustsFontSizeToFit>
            {WEIGHT_CLASSES[f.siklet].ad.toLocaleUpperCase(LOC)}
          </Text>
          {opp.champion || g.konum === 'anaMac' ? <Text style={v.tag}>{opp.champion ? L("ÜNVAN MAÇI") : SLOT_LABEL[g.konum]}</Text> : null}
          {rows.map(([ad, a, b, x, y, hl]) => {
            const left = hl && x > y;
            const right = hl && y > x;
            return (
              <View key={ad} style={v.row}>
                <Text style={[v.val, left && v.valMe]}>{a}</Text>
                <Text style={v.label} numberOfLines={1}>
                  {ad}
                </Text>
                <Text style={[v.val, right && v.valOpp]}>{b}</Text>
              </View>
            );
          })}
          {rounds ? <Text style={v.rounds}>{L("{0} RAUNT", [rounds])}</Text> : null}
        </View>

        {/* İsimler */}
        <View style={[v.name, { left: 10, maxWidth: (w - colW) / 2 + 14 }]}>
          {pa ? <Text style={v.nameTop} numberOfLines={1}>{pa}</Text> : null}
          <Text style={v.nameBig} numberOfLines={1} adjustsFontSizeToFit>
            {pb}
          </Text>
          <Text style={[v.nameSub, { color: '#ff6b6b' }]} numberOfLines={1}>
            {flagOf(f.uyruk)} {f.lakap ? `“${f.lakap.toLocaleUpperCase(LOC)}”` : ''}
          </Text>
        </View>
        <View style={[v.name, { right: 10, alignItems: 'flex-end', maxWidth: (w - colW) / 2 + 14 }]}>
          {oa ? <Text style={[v.nameTop, { textAlign: 'right' }]} numberOfLines={1}>{oa}</Text> : null}
          <Text style={[v.nameBig, { textAlign: 'right' }]} numberOfLines={1} adjustsFontSizeToFit>
            {ob}
          </Text>
          <Text style={[v.nameSub, { color: '#7fa8ff', textAlign: 'right' }]} numberOfLines={1}>
            {opp.champion ? `👑 ${L("ŞAMPİYON")} ` : ''}
            {flagOf(opp.uyruk)}
          </Text>
        </View>
      </View>
      <View style={v.meta}>
        <Text style={v.metaText} numberOfLines={1}>
          {g.ad.toLocaleUpperCase(LOC)} · {SLOT_LABEL[g.konum]}
        </Text>
        <Text style={v.metaText}>
          {g.sehir ? `${g.sehir} · ` : ''}
          {L("Seyirci")}: <Text style={{ color: C.text, fontFamily: F.bold }}>{g.seyirci.toLocaleString(LOC)}</Text>
        </Text>
      </View>
    </View>
  );
}

const k = StyleSheet.create({
  wrap: { marginBottom: 12, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  strip: { padding: 12, gap: 8, backgroundColor: '#08090b', borderBottomWidth: 1, borderBottomColor: C.border },
  week: { color: C.text, fontFamily: F.display, fontSize: 15, letterSpacing: 1 },
  ovr: { color: C.gold, fontFamily: F.black, fontSize: 10, letterSpacing: 1 },
  segLabel: { color: '#8b919c', fontFamily: F.bold, fontSize: 9, letterSpacing: 1.2 },
  statVal: { fontFamily: F.display, fontSize: 16 },
  stage: { height: 330, overflow: 'hidden' },
  floor: { position: 'absolute', left: 0, right: 0, bottom: -20, height: 70, backgroundColor: '#1d170b', transform: [{ skewY: '-3deg' }] },
  tape: { position: 'absolute', left: 0, right: 0, bottom: 34, height: 6, backgroundColor: C.gold, opacity: 0.35 },
  figure: { position: 'absolute', right: -30, bottom: 0 },
  left: { position: 'absolute', left: 10, top: 10, width: '56%', gap: 8 },
  panel: { backgroundColor: 'rgba(10,11,14,0.92)', borderWidth: 1, borderColor: '#2a2d34' },
  panelHead: { color: C.text, fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  post: { flexDirection: 'row', gap: 8, paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#14161a' },
  postAv: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  postAvText: { color: '#040405', fontFamily: F.black, fontSize: 10 },
  postName: { color: C.text, fontFamily: F.bold, fontSize: 10.5 },
  postText: { color: '#c3c8d1', fontFamily: F.body, fontSize: 10.5, lineHeight: 14 },
  plate: { position: 'absolute', right: 0, bottom: 52, alignItems: 'flex-end', gap: 4, maxWidth: '80%' },
  plateName: { backgroundColor: C.text, color: '#040405', fontFamily: F.display, fontSize: 20, letterSpacing: 1, paddingLeft: 16, paddingRight: 12, paddingVertical: 2 },
  plateSub: { backgroundColor: '#040405', borderWidth: 1, borderColor: '#2a2d34', color: C.text, fontFamily: F.bold, fontSize: 10, letterSpacing: 1.2, paddingHorizontal: 10, paddingVertical: 4 },
  plateGold: { backgroundColor: C.gold, color: '#1f1605', fontFamily: F.black, fontSize: 10, letterSpacing: 1.2, paddingHorizontal: 10, paddingVertical: 4 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.red, paddingHorizontal: 14, paddingVertical: 12, minHeight: 56 },
  ctaTitle: { color: '#fff', fontFamily: F.display, fontSize: 18, letterSpacing: 1.5 },
  ctaSub: { color: 'rgba(255,255,255,0.85)', fontFamily: F.body, fontSize: 11.5, lineHeight: 15 },
});

const v = StyleSheet.create({
  stage: { borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: '#1c1f25' },
  col: { position: 'absolute', top: 10, bottom: 92, backgroundColor: 'rgba(16,20,34,0.82)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'stretch', paddingHorizontal: 4, paddingTop: 8, gap: 6 },
  org: { alignSelf: 'center', backgroundColor: C.red, color: '#fff', fontFamily: F.display, fontSize: 18, letterSpacing: 1, paddingHorizontal: 10, paddingVertical: 2, overflow: 'hidden' },
  weight: { color: C.text, fontFamily: F.display, fontSize: 14, letterSpacing: 1, textAlign: 'center' },
  tag: { alignSelf: 'center', color: C.gold, fontFamily: F.black, fontSize: 8.5, letterSpacing: 1.2, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', paddingVertical: 4, paddingHorizontal: 2, gap: 2 },
  val: { minWidth: 27, color: C.text, fontFamily: F.display, fontSize: 13, textAlign: 'center', paddingHorizontal: 2, overflow: 'hidden' },
  valMe: { backgroundColor: C.text, color: '#040405' },
  valOpp: { backgroundColor: C.red, color: '#fff' },
  label: { flex: 1, color: '#c3c8d1', fontFamily: F.black, fontSize: 7.5, letterSpacing: 0.2, textAlign: 'center' },
  rounds: { alignSelf: 'center', color: '#8b919c', fontFamily: F.black, fontSize: 9, letterSpacing: 1.5, marginTop: 2 },
  name: { position: 'absolute', bottom: 10 },
  nameTop: { color: '#e4e6eb', fontFamily: F.display, fontSize: 15, letterSpacing: 1, textShadowColor: '#000', textShadowRadius: 6 },
  nameBig: { color: '#fff', fontFamily: F.display, fontSize: 30, lineHeight: 33, letterSpacing: 0.5, textShadowColor: '#000', textShadowRadius: 8 },
  nameSub: { fontFamily: F.black, fontSize: 10, letterSpacing: 1.2 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 8 },
  metaText: { flexShrink: 1, color: C.dim, fontFamily: F.body, fontSize: 11.5 },
});

// ---------- Afiş düzeninde gecenin kartı ----------

/** Ülke adı (seçili dilde ya da Türkçe) veya iki harfli kod → bayrak emojisi. */
const ISO: [string, string][] = [
  ['ABD', 'us'], ['Almanya', 'de'], ['Avustralya', 'au'], ['Azerbaycan', 'az'], ['Birleşik Krallık', 'gb'], ['Brezilya', 'br'], ['Çekya', 'cz'], ['Çin', 'cn'],
  ['Fransa', 'fr'], ['Güney Kore', 'kr'], ['Gürcistan', 'ge'], ['Hollanda', 'nl'], ['İrlanda', 'ie'], ['İsveç', 'se'], ['Japonya', 'jp'], ['Kamerun', 'cm'],
  ['Kazakistan', 'kz'], ['Küba', 'cu'], ['Meksika', 'mx'], ['Nijerya', 'ng'], ['Polonya', 'pl'], ['Rusya', 'ru'], ['Rusya (Dağıstan)', 'ru'], ['Şili', 'cl'],
  ['Tayland', 'th'], ['Türkiye', 'tr'], ['Kanada', 'ca'], ['Hırvatistan', 'hr'],
];
let isoMap: Map<string, string> | null = null;
function isoOf(country: string): string | undefined {
  if (!isoMap) {
    isoMap = new Map();
    for (const [tr, code] of ISO) {
      isoMap.set(tr.toLocaleLowerCase('tr-TR'), code);
      isoMap.set(L(tr).toLocaleLowerCase(LOC), code);
    }
  }
  return /^[a-z]{2}$/.test(country) ? country : isoMap.get(country.toLocaleLowerCase(LOC)) ?? isoMap.get(country.toLocaleLowerCase('tr-TR'));
}
export function flagOf(country?: string): string {
  if (!country) return '';
  const c = isoOf(country);
  if (!c) return '';
  return String.fromCodePoint(...[...c.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

export type PosterRow = { key: number; b?: NightBout; shown: boolean; dim: boolean; pick?: { k: 0 | 1; bit?: boolean }; head?: string };

function Corner({ country, name, rec, side, win, lose }: { country?: string; name: string; rec?: string; side: 'l' | 'r'; win?: boolean; lose?: boolean }) {
  const r = side === 'r';
  return (
    <View style={[p.corner, r && { flexDirection: 'row-reverse' }]}>
      <Text style={p.flag}>{flagOf(country) || '🏳️'}</Text>
      {rec ? <Text style={p.rec}>{rec}</Text> : null}
      <Text style={[p.name, r && { textAlign: 'right' }, win && { color: C.gold }, lose && { color: '#6b7a99', textDecorationLine: 'line-through' }]} numberOfLines={1} adjustsFontSizeToFit>
        {cornerName(name, country)}
      </Text>
    </View>
  );
}

/** "Yuri Zhukov" → "Y. ZHUKOV"; Türkçe büyük harf yalnızca Türk isimlerinde. */
function cornerName(name: string, country?: string) {
  const parts = name.trim().split(/\s+/);
  const n = parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(' ')}` : name;
  return country && isoOf(country) === 'tr' && LOC === 'tr-TR' ? n.toLocaleUpperCase('tr-TR') : n.toUpperCase();
}

/** Gecenin kartı, yayın afişi gibi: organizasyon, "ANA KART", her maçta sıklet etiketi, bayraklar ve karneler. */
export function PosterCard({ s, g, opp, rows, bitti, methodText }: { s: GameState; g: FightNight; opp: Opponent; rows: PosterRow[]; bitti: boolean; methodText: (b: NightBout) => string }) {
  const f = s.fighter;
  const look = arenaLook(s);
  return (
    <LinearGradient colors={['#13254d', '#0a1430', '#050a18']} locations={[0, 0.45, 1]} style={p.wrap}>
      <CageBg opacity={0.05} />
      {/* Üstte arena bandı: ışıklar ve tribün, alta doğru afiş rengine kaybolur */}
      <View style={p.art} pointerEvents="none">
        <Image source={LIGHTS_ART[look.tier]} style={StyleSheet.absoluteFill} resizeMode="cover" />
        {look.tint ? <LinearGradient colors={[look.tint + '55', look.tint + '00']} locations={[0, 0.8]} style={StyleSheet.absoluteFill} /> : null}
        <LinearGradient colors={['rgba(10,20,45,0)', 'rgba(14,28,60,0.25)', '#0d1a3a']} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} />
      </View>
      <View style={p.head}>
        <Text style={p.org}>{orgShort(s)}</Text>
        <Text style={p.event} numberOfLines={1}>
          {g.ad.toLocaleUpperCase(LOC)}
        </Text>
      </View>
      {rows.map(({ key, b, shown, dim, pick, head }) => (
        <View key={key}>
          {head ? <Text style={p.title}>{head}</Text> : null}
          {b ? (
            <View style={[p.bout, dim && { opacity: 0.6 }, pick && { borderColor: C.gold + '88' }]}>
              <Text style={p.label}>
                {pick ? (shown ? (judgePick(b, pick).dogru ? '✓ ' : '✗ ') : '🔮 ') : ''}
                {L("{0} MAÇI", [WEIGHT_CLASSES[b.siklet].ad.toLocaleUpperCase(LOC)])}
              </Text>
              <View style={p.line}>
                <Corner country={b.ua} name={b.a} rec={b.ra} side="l" win={shown && b.kazanan === 0} lose={shown && b.kazanan === 1} />
                <Text style={p.vs}>vs</Text>
                <Corner country={b.ub} name={b.b} rec={b.rb} side="r" win={shown && b.kazanan === 1} lose={shown && b.kazanan === 0} />
              </View>
              {shown ? <Text style={p.result}>{methodText(b)}</Text> : null}
            </View>
          ) : (
            <LinearGradient colors={['#8f0a17', '#3a0509']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[p.bout, p.me]}>
              <Text style={[p.label, { color: bitti ? C.gold : '#ffd9dc' }]}>
                {SLOT_LABEL[g.konum]} · {bitti ? L("SIRA SENDE") : L("SEN")}
              </Text>
              <View style={p.line}>
                <Corner country={f.uyruk} name={`${f.ad} ${f.soyad}`} rec={s.stage === 'amator' ? `${s.amator.g}-${s.amator.m}` : `${s.rekor.g}-${s.rekor.m}`} side="l" />
                <Text style={[p.vs, { color: '#fff' }]}>vs</Text>
                <Corner country={opp.uyruk} name={`${opp.ad} ${opp.soyad}`} rec={`${opp.rekor.g}-${opp.rekor.m}`} side="r" />
              </View>
            </LinearGradient>
          )}
        </View>
      ))}
      <View style={p.foot}>
        <Text style={p.footText}>{[g.sehir, L("{0} seyirci", [g.seyirci.toLocaleString(LOC)])].filter(Boolean).join(' · ')}</Text>
      </View>
    </LinearGradient>
  );
}

const p = StyleSheet.create({
  wrap: { borderRadius: 6, borderWidth: 1, borderColor: '#24365f', paddingHorizontal: 10, paddingTop: 14, paddingBottom: 10, overflow: 'hidden' },
  art: { position: 'absolute', left: 0, right: 0, top: 0, height: 200, overflow: 'hidden' },
  head: { alignItems: 'center', gap: 6, marginBottom: 4, paddingTop: 34 },
  org: { backgroundColor: C.gold, color: '#1f1605', fontFamily: F.display, fontSize: 18, letterSpacing: 1, paddingHorizontal: 10, paddingVertical: 2, overflow: 'hidden' },
  event: { color: '#c7d3ee', fontFamily: F.black, fontSize: 10, letterSpacing: 2 },
  title: { color: C.text, fontFamily: F.display, fontSize: 30, letterSpacing: 1.5, textAlign: 'center', marginTop: 8, marginBottom: 6 },
  bout: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'transparent', paddingVertical: 7, paddingHorizontal: 4, gap: 3 },
  me: { borderRadius: 3, borderColor: C.red, marginVertical: 4 },
  label: { color: C.gold, fontFamily: F.display, fontSize: 10.5, letterSpacing: 1, fontStyle: 'italic', textAlign: 'center' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  corner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
  flag: { fontSize: 15 },
  rec: { backgroundColor: '#f1f2f5', color: '#0a1430', fontFamily: F.black, fontSize: 9, paddingHorizontal: 4, paddingVertical: 1, overflow: 'hidden' },
  name: { flex: 1, color: C.text, fontFamily: F.display, fontSize: 14, letterSpacing: 0.3 },
  vs: { color: C.gold, fontFamily: F.display, fontSize: 12, fontStyle: 'italic' },
  result: { color: '#9fb0d4', fontFamily: F.bold, fontSize: 10, letterSpacing: 1, textAlign: 'center' },
  foot: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', marginTop: 6, paddingTop: 8, alignItems: 'center' },
  footText: { color: '#9fb0d4', fontFamily: F.semi, fontSize: 11.5 },
});
