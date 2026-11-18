// Yeni görünüm: kariyer ana ekranı sahnesi ve maç öncesi VS sahnesi. Klasik görünümde hiç çizilmez.
// Yalnızca görünüm: oyun durumu okunur, hiçbir şey değiştirilmez. Dokunuşlar mevcut eylemleri çağırır.
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { ClipPath, Defs, Ellipse, G, LinearGradient as SvgLinear, Polygon, Stop } from 'react-native-svg';
import { playerKit, useCosmetics } from '../cosmetics';
import { money } from '../engine/career';
import { currentOrg, statAverage } from '../engine/character';
import { ORGS, WEIGHT_CLASSES } from '../engine/data';
import { fmtFollowers, followers } from '../engine/fame';
import { judgePick, SLOT_LABEL } from '../engine/fightNight';
import { lookFor, physique, playerPhysique } from '../engine/tale';
import type { Appearance, FightNight, GameState, NightBout, Opponent } from '../engine/types';
import { L, LOC } from '../i18n';
import { CageBg, Icon, SLANT, upName } from './components';
import { DEFAULT_LOOK } from './FighterAvatar';
import { Figure, HIP_H, POSES, type Kit } from './rig';
import { C, F } from './theme';

/** Rozet için organizasyon kısaltması. Profesyonelken sözleşme boşta olsa bile asla "AMATÖR" yazmaz. */
export function orgShort(s: GameState): string {
  const id = currentOrg(s);
  if (id === 'amator' && s.stage !== 'amator') return 'PRO';
  return ORGS[id].kisa;
}

const shortMoney = (n: number) => (Math.abs(n) < 100_000 ? money(n) : `${n < 0 ? '-' : ''}$${fmtFollowers(Math.abs(n))}`);

/** Ayakta duran tam boy dövüşçü. flip: sola bakar. */
export function Standing({ look, kit, h, flip }: { look: Appearance; kit: Kit; h: number; flip?: boolean }) {
  const w = h * 0.8;
  return (
    <Svg width={w} height={h} viewBox="0 0 80 100">
      <Ellipse cx={40} cy={96} rx={22} ry={3.5} fill="#000" opacity={0.45} />
      <G transform={`translate(40 ${96 - HIP_H * 0.95}) scale(${flip ? -0.95 : 0.95} 0.95)`}>
        <Figure p={POSES.stance} look={look} kit={kit} />
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

/** Maç öncesi VS sahnesi: çapraz bölünmüş köşeler, isim levhaları ve "tale of the tape". */
export function VsStage({ s, g, opp, w }: { s: GameState; g: FightNight; opp: Opponent; w: number }) {
  useCosmetics();
  const f = s.fighter;
  const H = 330;
  const pp = playerPhysique(f);
  const op = physique(opp.id, f.siklet);
  const oYas = 22 + (opp.id.charCodeAt(0) % 14);
  const pPow = Math.round(statAverage(f.stats));
  const oPow = Math.round(statAverage(opp.stats));
  const rows: [string, string, string, number, number][] = [
    [L("REKOR"), `${s.rekor.g}-${s.rekor.m}-${s.rekor.b}`, `${opp.rekor.g}-${opp.rekor.m}-${opp.rekor.b}`, s.rekor.g, opp.rekor.g],
    [L("YAŞ"), `${f.yas}`, `${oYas}`, f.yas, oYas],
    [L('BOY'), `${pp.boy} cm`, `${op.boy} cm`, pp.boy, op.boy],
    [L("UZANMA"), `${pp.uzanma} cm`, `${op.uzanma} cm`, pp.uzanma, op.uzanma],
    [L("GÜÇ"), `${pPow}`, `${oPow}`, pPow, oPow],
  ];
  const rounds = s.pending.dovus?.maxRaunt;
  const oKit: Kit = { shorts: '#1c4fc4', trim: '#f1f2f5', glove: '#1c4fc4' };
  const fh = 250;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={v.top}>
        <View style={{ flex: 1 }}>
          <Text style={v.kicker} numberOfLines={1}>
            {SLOT_LABEL[g.konum]} · {WEIGHT_CLASSES[f.siklet].ad.toLocaleUpperCase(LOC)}
          </Text>
          <Text style={v.title} numberOfLines={1} adjustsFontSizeToFit>
            {opp.champion ? L("ÜNVAN MAÇI") : g.ad.toLocaleUpperCase(LOC)}
          </Text>
        </View>
        {rounds ? <Text style={[v.rounds, SLANT]}>{L("{0} RAUNT", [rounds])}</Text> : null}
      </View>

      <View style={{ height: H, width: w, overflow: 'hidden', borderRadius: 4 }}>
        <Svg width={w} height={H} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgLinear id="vsRed" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#c1121f" />
              <Stop offset="0.55" stopColor="#6a0812" />
              <Stop offset="1" stopColor="#1a0306" />
            </SvgLinear>
            <SvgLinear id="vsBlue" x1="1" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#1c4fc4" />
              <Stop offset="0.55" stopColor="#0d2257" />
              <Stop offset="1" stopColor="#050a1a" />
            </SvgLinear>
            <ClipPath id="vsL">
              <Polygon points={`0,0 ${w * 0.64},0 ${w * 0.36},${H} 0,${H}`} />
            </ClipPath>
          </Defs>
          <Polygon points={`${w * 0.64},0 ${w},0 ${w},${H} ${w * 0.36},${H}`} fill="url(#vsBlue)" />
          <Polygon points={`0,0 ${w * 0.64},0 ${w * 0.36},${H} 0,${H}`} fill="url(#vsRed)" />
          <Polygon points={`${w * 0.63},0 ${w * 0.655},0 ${w * 0.37},${H} ${w * 0.345},${H}`} fill="#f1f2f5" />
        </Svg>
        <View style={{ position: 'absolute', right: -w * 0.1, bottom: -6 }} pointerEvents="none">
          <Standing look={lookFor(opp)} kit={oKit} h={fh} flip />
        </View>
        <View style={{ position: 'absolute', left: -w * 0.1, bottom: -6 }} pointerEvents="none">
          <Standing look={f.gorunum ?? DEFAULT_LOOK} kit={playerKit()} h={fh} />
        </View>
        <View style={v.vsWrap} pointerEvents="none">
          <Text style={v.vs}>VS</Text>
        </View>
        <View style={[v.plate, { left: 0, bottom: 12, paddingRight: 18 }]}>
          <Text style={[v.plateKicker, { color: '#c1121f' }]} numberOfLines={1}>
            {f.lakap ? `“${f.lakap.toLocaleUpperCase(LOC)}” · ` : ''}
            {f.uyruk.toLocaleUpperCase(LOC)}
          </Text>
          <Text style={v.plateName} numberOfLines={1}>
            {upName(`${f.ad} ${f.soyad}`, f.uyruk)}
          </Text>
        </View>
        <View style={[v.plate, { right: 0, top: 12, alignItems: 'flex-end', paddingLeft: 18 }]}>
          <Text style={[v.plateKicker, { color: '#1c4fc4' }]} numberOfLines={1}>
            {opp.champion ? `${L("ŞAMPİYON")} · ` : ''}
            {opp.uyruk.toLocaleUpperCase(LOC)}
          </Text>
          <Text style={v.plateName} numberOfLines={1}>
            {upName(`${opp.ad} ${opp.soyad}`, opp.uyruk)}
          </Text>
        </View>
      </View>

      <View style={{ paddingTop: 12, gap: 7 }}>
        {rows.map(([ad, a, b, x, y]) => {
          const m = Math.max(x, y) || 1;
          return (
            <View key={ad} style={v.row}>
              <Text style={[v.val, { color: x >= y ? C.text : C.dim }]}>{a}</Text>
              <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <Text style={v.label}>{ad}</Text>
                <View style={{ flexDirection: 'row', gap: 3, height: 5, alignSelf: 'stretch' }}>
                  <View style={{ flex: 1, backgroundColor: '#14161a', alignItems: 'flex-end' }}>
                    <View style={{ width: `${Math.round((x / m) * 100)}%`, height: 5, backgroundColor: C.red }} />
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#14161a' }}>
                    <View style={{ width: `${Math.round((y / m) * 100)}%`, height: 5, backgroundColor: C.blue }} />
                  </View>
                </View>
              </View>
              <Text style={[v.val, { textAlign: 'right', color: y >= x ? C.text : C.dim }]}>{b}</Text>
            </View>
          );
        })}
        <View style={v.meta}>
          {g.sehir ? <Text style={v.metaText}>{g.sehir}</Text> : null}
          <Text style={v.metaText}>
            {L("Seyirci")}: <Text style={{ color: C.text, fontFamily: F.bold }}>{g.seyirci.toLocaleString(LOC)}</Text>
          </Text>
        </View>
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
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10 },
  kicker: { color: C.gold, fontFamily: F.black, fontSize: 10, letterSpacing: 2 },
  title: { color: C.text, fontFamily: F.display, fontSize: 18, letterSpacing: 1 },
  rounds: { backgroundColor: C.red, color: '#fff', fontFamily: F.display, fontSize: 12, letterSpacing: 1.5, paddingHorizontal: 9, paddingVertical: 5, overflow: 'hidden' },
  vsWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  vs: { color: C.text, fontFamily: F.display, fontSize: 84, lineHeight: 96, fontStyle: 'italic', letterSpacing: -2, textShadowColor: '#040405', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 0 },
  plate: { position: 'absolute', backgroundColor: C.text, paddingHorizontal: 14, paddingVertical: 7, maxWidth: '62%' },
  plateKicker: { fontFamily: F.black, fontSize: 9.5, letterSpacing: 1.5 },
  plateName: { color: '#040405', fontFamily: F.display, fontSize: 21, lineHeight: 25, letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  val: { width: 72, color: C.text, fontFamily: F.display, fontSize: 16 },
  label: { color: '#8b919c', fontFamily: F.bold, fontSize: 10, letterSpacing: 1.5 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  metaText: { color: C.dim, fontFamily: F.body, fontSize: 11.5 },
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
  return (
    <LinearGradient colors={['#13254d', '#0a1430', '#050a18']} locations={[0, 0.45, 1]} style={p.wrap}>
      <CageBg opacity={0.05} />
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
                <Corner country={f.uyruk} name={`${f.ad} ${f.soyad}`} rec={`${s.rekor.g}-${s.rekor.m}`} side="l" />
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
  head: { alignItems: 'center', gap: 6, marginBottom: 4 },
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
