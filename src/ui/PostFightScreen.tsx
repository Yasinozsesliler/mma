import { L, LOC } from '../i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { continueAfterPost, interview, money } from '../engine/career';
import { ORGS } from '../engine/data';
import { fmtDelta, fmtFollowers } from '../engine/fame';
import { lookFor } from '../engine/tale';
import type { Appearance, GameState } from '../engine/types';
import { Button, Icon, Screen, Section, SLANT, upName, type IconName } from './components';
import { FighterAvatar } from './FighterAvatar';
import type { Act } from './GameScreens';
import { SkillPanel } from './SkillPanel';
import { C, F, R } from './theme';

type Tone = { ana: string; hero: readonly [string, string, string]; kicker: string; baslik: string; ikon: IconName };

const TONES: Record<'win' | 'loss' | 'draw' | 'nc', Tone> = {
  win: { ana: C.gold, hero: ['#3a2a07', '#120d03', '#040405'], kicker: L("ZAFER"), baslik: L("KAZANDIN"), ikon: 'trophy' },
  loss: { ana: '#ff4d5e', hero: ['#3a0710', '#120305', '#040405'], kicker: L("MAĞLUBİYET"), baslik: L("KAYBETTİN"), ikon: 'heart-broken' },
  draw: { ana: '#b9c3cf', hero: ['#20252c', '#0b0d10', '#040405'], kicker: L("BERABERE"), baslik: L("KAZANAN YOK"), ikon: 'scale-balance' },
  nc: { ana: C.orange, hero: ['#3a1f07', '#120903', '#040405'], kicker: L("NO CONTEST"), baslik: L("GEÇERSİZ"), ikon: 'cancel' },
};

// Üstteki kutucuklarda zaten gösterilen satırlar rapora tekrar yazılmaz.
const IN_TILES = [/^🔥 (Popülerlik|Popularity)/, /^📲 (Takipçi|Followers)/, /^⭐ \+\d+ (gelişim|skill)/, /^🩹 (Sağlık|Temiz|Health|You came out clean)/];

function splitEmoji(line: string): [string, string] {
  const i = line.indexOf(' ');
  const head = i > 0 ? line.slice(0, i) : '';
  return head && !/[\p{L}\p{N}]/u.test(head) ? [head, line.slice(i + 1)] : ['•', line];
}

function Tile({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color: string; icon: IconName }) {
  return (
    <View style={pf.tile}>
      <View style={pf.tileHead}>
        <Icon name={icon} size={13} color={C.faint} />
        <Text style={pf.tileLabel}>{label}</Text>
      </View>
      <Text style={[pf.tileVal, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? <Text style={pf.tileSub}>{sub}</Text> : null}
    </View>
  );
}

function Corner({ name, sub, record, look, win, accent }: { name: string; sub: string; record: string; look?: Appearance; win: boolean | null; accent: string }) {
  return (
    <View style={[pf.corner, win === false && { opacity: 0.45 }]}>
      <View style={{ height: 20, justifyContent: 'flex-end' }}>
        {win ? (
          <View style={[pf.winTag, { backgroundColor: accent }]}>
            <Text style={pf.winTagText}>{L("KAZANAN")}</Text>
          </View>
        ) : null}
      </View>
      <FighterAvatar look={look} size={92} ring={win ? accent : '#3a3d45'} />
      <Text style={[pf.cornerName, SLANT]} numberOfLines={2}>
        {name}
      </Text>
      <Text style={pf.cornerSub} numberOfLines={1}>
        {sub}
      </Text>
      <Text style={[pf.cornerRec, win && { color: accent }]}>{record}</Text>
    </View>
  );
}

export function PostFightScreen({ s, act }: { s: GameState; act: Act }) {
  const ps = s.pending.sonrasi!;
  const o = ps.ozet;
  const key = o?.nc ? 'nc' : ps.berabere ? 'draw' : ps.kazandi ? 'win' : 'loss';
  const t = TONES[key];
  const opp = s.pending.rakip;
  const pWin = key === 'draw' || key === 'nc' ? null : key === 'win';

  const rest = ps.satirlar.slice(1).filter((l) => !IN_TILES.some((re) => re.test(l)));
  const para = rest.filter((l) => l.includes('$'));
  const rapor = rest.filter((l) => !l.includes('$'));

  return (
    <Screen
      footer={
        ps.roportajSonucu ? (
          <Button label={s.kutlama ? L("Kutlamaya geç") : L("Devam")} icon={s.kutlama ? 'trophy' : 'arrow-right'} tone={s.kutlama || key === 'win' ? 'gold' : 'red'} onPress={() => act(continueAfterPost)} />
        ) : undefined
      }
    >
      <LinearGradient colors={t.hero} style={pf.hero}>
        <View style={[pf.glowLine, { backgroundColor: t.ana }]} />
        <Text style={pf.org}>{o ? `${ORGS[o.org].ad}${o.unvan ? L(" · ÜNVAN MAÇI") : ''}`.toLocaleUpperCase(LOC) : ''}</Text>
        <View style={[pf.kicker, { borderColor: t.ana }]}>
          <Icon name={t.ikon} size={14} color={t.ana} />
          <Text style={[pf.kickerText, { color: t.ana }]}>{t.kicker}</Text>
        </View>
        <Text style={[pf.title, SLANT, key === 'win' && pf.titleGlow]}>{t.baslik}</Text>
        {o ? (
          <>
            <Text style={[pf.method, { color: t.ana }]}>{o.yontem.toLocaleUpperCase(LOC)}</Text>
            {o.teknik ? (
              <View style={[pf.techTag, { borderColor: t.ana + '88' }]}>
                <Icon name="target" size={13} color={t.ana} />
                <Text style={[pf.techText, { color: t.ana }]}>{o.teknik.toLocaleUpperCase(LOC)}</Text>
                {o.teknikNot ? <Text style={pf.techNote}> · {o.teknikNot}</Text> : null}
              </View>
            ) : null}
            <Text style={pf.when}>
              {L("{0}. RAUNT · {1}", [o.raunt, o.sure])}
            </Text>
            {o.kartlar ? <Text style={pf.cards}>{L("Hakem kartları:")}{' '}{o.kartlar}</Text> : null}
          </>
        ) : (
          <Text style={pf.when}>{ps.satirlar[0]}</Text>
        )}

        {o ? (
          <View style={pf.corners}>
            <Corner name={upName(`${s.fighter.ad} ${s.fighter.soyad}`, s.fighter.uyruk)} sub={s.fighter.lakap ? `“${s.fighter.lakap}”` : L("KIRMIZI KÖŞE")} record={o.rekor} look={s.fighter.gorunum} win={pWin} accent={t.ana} />
            <View style={pf.vs}>
              <Text style={pf.vsText}>VS</Text>
            </View>
            <Corner name={opp ? upName(o.rakip, opp.uyruk) : o.rakip.toUpperCase()} sub={`“${o.rakipLakap}”`} record={o.rakipRekor} look={opp ? lookFor(opp) : undefined} win={pWin === null ? null : !pWin} accent={t.ana} />
          </View>
        ) : null}
      </LinearGradient>

      {o ? (
        <View style={pf.tiles}>
          <Tile label={L("KAZANÇ")} icon="cash" value={o.kazanc > 0 ? `+${money(o.kazanc)}` : '$0'} sub={o.bonus ? L("{0} bonus dahil", [o.bonus]) : o.amator ? L("Amatör") : L("Net")} color={o.kazanc > 0 ? C.green : C.dim} />
          <Tile label={L("TAKİPÇİ")} icon="account-group" value={o.takipciDelta != null ? fmtDelta(o.takipciDelta) : `${o.popDelta >= 0 ? '+' : ''}${o.popDelta}`} sub={o.takipci != null ? L("Toplam {0}", [fmtFollowers(o.takipci)]) : undefined} color={(o.takipciDelta ?? o.popDelta) >= 0 ? C.gold : '#ff4d5e'} />
          <Tile label={L("GELİŞİM")} icon="star-four-points" value={`+${o.puan}`} sub="puan" color={C.blue} />
          <Tile label={L("SAĞLIK")} icon="heart-pulse" value={`${o.saglik}`} sub={o.hasar ? L("-{0} bu gece", [o.hasar]) : L("Temiz çıktın")} color={o.saglik < 50 ? '#ff4d5e' : o.saglik < 75 ? C.orange : C.green} />
        </View>
      ) : null}

      {para.length ? (
        <>
          <Section>{L("KAZANÇ DÖKÜMÜ")}</Section>
          <View style={pf.panel}>
            {para.map((l, i) => {
              const [e, txt] = splitEmoji(l);
              // Tutar ayrı sütuna, açıklama ve notlar etikete.
              const am = txt.match(/[+-]?\$[\d.,]+/);
              const label = (am ? txt.replace(am[0], '') : txt).replace(/:\s*/, ' ').replace(/\s+/g, ' ').replace(/[:\s]+$/, '').trim();
              const neg = am?.[0].startsWith('-');
              return (
                <View key={i} style={[pf.moneyRow, i > 0 && pf.divider]}>
                  <Text style={pf.emo}>{e}</Text>
                  <Text style={pf.moneyLabel}>{label}</Text>
                  {am ? <Text style={[pf.moneyVal, neg && { color: '#ff4d5e' }]}>{am[0].startsWith('$') ? `+${am[0]}` : am[0]}</Text> : null}
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      {rapor.length ? (
        <>
          <Section>{L("GECE RAPORU")}</Section>
          <View style={pf.panel}>
            {rapor.map((l, i) => {
              const [e, txt] = splitEmoji(l);
              return (
                <View key={i} style={[pf.reportRow, i > 0 && pf.divider]}>
                  <View style={pf.emoBox}>
                    <Text style={pf.emo}>{e}</Text>
                  </View>
                  <Text style={pf.reportText}>{txt}</Text>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      <Section>{L("KAFES İÇİ RÖPORTAJ")}</Section>
      {ps.roportajSonucu ? (
        <LinearGradient colors={['#15120a', '#0c0d10']} style={[pf.panel, { borderColor: C.goldDeep }]}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Icon name="microphone-variant" size={20} color={C.gold} />
            <Text style={[pf.reportText, { color: C.text }]}>{ps.roportajSonucu}</Text>
          </View>
        </LinearGradient>
      ) : (
        <>
          <Text style={pf.micHint}>{L("Mikrofon sana uzatıldı. Ne diyeceksin?")}</Text>
          {ps.roportajSecenekleri.map((q, i) => (
            <Pressable key={i} onPress={() => act((x) => interview(x, i))} style={({ pressed }) => [pf.quote, pressed && { borderColor: t.ana, backgroundColor: '#15161b' }]}>
              <Text style={[pf.quoteMark, { color: t.ana }]}>“</Text>
              <Text style={pf.quoteText}>{q}</Text>
              <Icon name="chevron-right" size={20} color={C.faint} />
            </Pressable>
          ))}
        </>
      )}
      {ps.roportajSonucu && s.puan > 0 ? <SkillPanel s={s} act={act} /> : null}
    </Screen>
  );
}

const pf = StyleSheet.create({
  hero: { marginHorizontal: -16, marginTop: -16, paddingTop: 22, paddingHorizontal: 16, paddingBottom: 18, alignItems: 'center', marginBottom: 12 },
  glowLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.9 },
  org: { color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 3, marginBottom: 10 },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 2, paddingHorizontal: 12, paddingVertical: 4, transform: [{ skewX: '-10deg' }] },
  kickerText: { fontFamily: F.display, fontSize: 13, letterSpacing: 4 },
  title: { color: '#fff', fontFamily: F.display, fontSize: 54, lineHeight: 62, letterSpacing: 1, marginTop: 6 },
  titleGlow: { textShadowColor: 'rgba(242,193,78,0.55)', textShadowRadius: 22 },
  method: { fontFamily: F.display, fontSize: 22, letterSpacing: 2, textAlign: 'center' },
  techTag: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginVertical: 4, flexWrap: 'wrap', justifyContent: 'center' },
  techText: { fontFamily: F.display, fontSize: 12, letterSpacing: 1 },
  techNote: { color: C.dim, fontFamily: F.body, fontSize: 11 },
  when: { color: C.dim, fontFamily: F.semi, fontSize: 13, letterSpacing: 1.5, marginTop: 2 },
  cards: { color: C.faint, fontFamily: F.body, fontSize: 12, marginTop: 4 },
  corners: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 16, alignSelf: 'stretch' },
  corner: { flex: 1, alignItems: 'center', gap: 4 },
  winTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 2, transform: [{ skewX: '-10deg' }] },
  winTagText: { color: '#000', fontFamily: F.display, fontSize: 10, letterSpacing: 1.5 },
  cornerName: { color: C.text, fontFamily: F.display, fontSize: 16, lineHeight: 20, textAlign: 'center', marginTop: 4 },
  cornerSub: { color: C.faint, fontFamily: F.body, fontSize: 11 },
  cornerRec: { color: C.dim, fontFamily: F.display, fontSize: 18, letterSpacing: 1 },
  vs: { width: 36, alignItems: 'center', paddingTop: 58 },
  vsText: { color: C.faint, fontFamily: F.display, fontSize: 16, letterSpacing: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  tile: { width: '48.8%', flexGrow: 1, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12 },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tileLabel: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1.5 },
  tileVal: { fontFamily: F.display, fontSize: 26, marginTop: 2 },
  tileSub: { color: C.faint, fontFamily: F.body, fontSize: 11 },
  panel: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 6 },
  divider: { borderTopWidth: 1, borderTopColor: C.border },
  moneyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  moneyLabel: { flex: 1, color: C.dim, fontFamily: F.semi, fontSize: 13 },
  moneyVal: { color: C.green, fontFamily: F.display, fontSize: 15, textAlign: 'right', maxWidth: '50%' },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  emoBox: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.cardAlt, alignItems: 'center', justifyContent: 'center' },
  emo: { fontSize: 15 },
  reportText: { flex: 1, color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  micHint: { color: C.faint, fontFamily: F.body, fontSize: 12, marginBottom: 8 },
  quote: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, paddingVertical: 12, paddingHorizontal: 12, marginBottom: 8 },
  quoteMark: { fontFamily: F.display, fontSize: 34, lineHeight: 34, marginTop: -2 },
  quoteText: { flex: 1, color: C.text, fontFamily: F.medium, fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
});
