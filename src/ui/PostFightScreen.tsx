import { L, LOC } from '../i18n';
import { askReview } from '../review';
import { maybeInterstitial, maybeStartWelcome, noteInterstitialShown, usePrice } from '../monetization';
import { DEAL_SKU } from '../monetization/skus';
import { DealPopup } from './ShopSheet';
import { adShootAmount, canWinBonus, careerFights, claimAdShoot, claimWinBonus, winBonusAmount } from '../engine/rewards';
import { AdOffer } from './AdOffer';
import { FullVersionNudge } from './PremiumCard';
import { NightResults } from './FightNight';
import { CoachTip } from './CoachTip';
import { winCard } from '../share/build';
import { ShareButton } from '../share/ShareButton';
import { sfx } from '../audio';
import type { Sfx } from '../audio/types';
import { CountText, PopIn } from './anim';
import { useEffect, useState } from 'react';
import Svg, { Defs, Ellipse, LinearGradient as SvgLinear, Polygon, RadialGradient, Stop } from 'react-native-svg';
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
import { useLook } from '../lookPref';
import { PostHero } from './NewPostFight';
import { NewGrowth } from './NewGrowth';
import { C, F, R } from './theme';

type Tone = { ana: string; hero: readonly [string, string, string]; kicker: string; baslik: string; ikon: IconName };

const TONES: Record<'win' | 'loss' | 'draw' | 'nc', Tone> = {
  win: { ana: C.gold, hero: ['#3a2a07', '#120d03', '#040405'], kicker: L("ZAFER"), baslik: L("KAZANDIN"), ikon: 'trophy' },
  loss: { ana: '#ff4d5e', hero: ['#3a0710', '#120305', '#040405'], kicker: L("MAĞLUBİYET"), baslik: L("KAYBETTİN"), ikon: 'heart-broken' },
  draw: { ana: '#b9c3cf', hero: ['#20252c', '#0b0d10', '#040405'], kicker: L("BERABERE"), baslik: L("KAZANAN YOK"), ikon: 'scale-balance' },
  nc: { ana: C.orange, hero: ['#3a1f07', '#120903', '#040405'], kicker: L("NO CONTEST"), baslik: L("GEÇERSİZ"), ikon: 'cancel' },
};

// Üstteki kutucuklarda zaten gösterilen satırlar rapora tekrar yazılmaz.
const IN_TILES = [/^🔥 (Popülerlik|Popularity|Popularidad|Popularidade|Популярность)/, /^📲 (Takipçi|Followers|Seguidores|Подписчики)/, /^⭐ \+\d+ (gelişim|skill|puntos|pontos|очков)/, /^🩹 (Sağlık|Temiz|Health|You came out clean|Salud|Saliste limpio|Saúde|Você saiu ileso|Здоровье|Вы вышли без повреждений)/];

function splitEmoji(line: string): [string, string] {
  const i = line.indexOf(' ');
  const head = i > 0 ? line.slice(0, i) : '';
  return head && !/[\p{L}\p{N}]/u.test(head) ? [head, line.slice(i + 1)] : ['•', line];
}

/** Ödül kutucuğu: sırayla büyüyerek gelir, değer sıfırdan sayar ve gelince kendi sesini çalar. */
function Tile({ label, value, sub, color, icon, i, count, snd }: { label: string; value: string; sub?: string; color: string; icon: IconName; i: number; count?: { n: number; fmt: (n: number) => string }; snd?: Sfx }) {
  const delay = 350 + i * 320;
  useEffect(() => {
    if (!snd) return;
    const t = setTimeout(() => sfx(snd, 0.8), delay);
    return () => clearTimeout(t);
  }, [snd, delay]);
  return (
    <PopIn delay={delay} style={[pf.tile, i > 0 && pf.tileDiv]}>
      <View style={pf.tileHead}>
        <Icon name={icon} size={12} color={color} />
        <Text style={pf.tileLabel} numberOfLines={1}>{label}</Text>
      </View>
      {count ? (
        <CountText value={count.n} format={count.fmt} fromZero delay={delay} ms={900} style={[pf.tileVal, { color }]} numberOfLines={1} />
      ) : (
        <Text style={[pf.tileVal, { color }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      )}
      {sub ? <Text style={pf.tileSub} numberOfLines={1}>{sub}</Text> : null}
    </PopIn>
  );
}

/** Sonuç sahnesinin ışıkları: tepeden iki spot konisi ve köşelerin altında zemin parıltısı. */
function Stage({ color }: { color: string }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none">
      <Defs>
        <SvgLinear id="pfCone" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#fff4d6" stopOpacity={0.16} />
          <Stop offset="1" stopColor="#fff4d6" stopOpacity={0} />
        </SvgLinear>
        <RadialGradient id="pfFloor" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={0.28} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Polygon points="22,0 30,0 46,78 4,78" fill="url(#pfCone)" />
      <Polygon points="70,0 78,0 96,78 54,78" fill="url(#pfCone)" />
      <Ellipse cx={50} cy={86} rx={52} ry={12} fill="url(#pfFloor)" />
    </Svg>
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

/** Gecenin özeti satırı: para satırlarında tutar sağ sütunda. */
type Row = { e: string; txt: string; am?: string; neg?: boolean };
function toRow(l: string): Row {
  const [e, txt] = splitEmoji(l);
  if (!l.includes('$')) return { e, txt };
  const am = txt.match(/[+-]?\$[\d.,]+/);
  const label = (am ? txt.replace(am[0], '') : txt).replace(/:\s*/, ' ').replace(/\s+/g, ' ').replace(/[:\s]+$/, '').trim();
  return { e, txt: label, am: am ? (am[0].startsWith('$') ? `+${am[0]}` : am[0]) : undefined, neg: am?.[0].startsWith('-') };
}

const SHOW = 4;

export function PostFightScreen({ s, act }: { s: GameState; act: Act }) {
  const ps = s.pending.sonrasi!;
  const [hepsi, setHepsi] = useState(false);
  const [gelisim, setGelisim] = useState(false);
  const o = ps.ozet;
  const key = o?.nc ? 'nc' : ps.berabere ? 'draw' : ps.kazandi ? 'win' : 'loss';
  const t = TONES[key];
  const opp = s.pending.rakip;
  const pWin = key === 'draw' || key === 'nc' ? null : key === 'win';
  const yeni = useLook() === 'yeni';
  useEffect(() => {
    sfx(key === 'win' ? 'win' : key === 'loss' ? 'lose' : 'applause');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Para satırları önce, ardından gecenin olayları; üstte zaten gösterilenler çıkarılır
  const rest = ps.satirlar.slice(1).filter((l) => !IN_TILES.some((re) => re.test(l)) && !l.startsWith('🏛️'));
  const tarih = ps.satirlar.filter((l) => l.startsWith('🏛️'));
  const rows = [...rest.filter((l) => l.includes('$')), ...rest.filter((l) => !l.includes('$'))].map(toRow);
  const shown = hepsi ? rows : rows.slice(0, SHOW);

  return (
    <Screen
      footer={
        ps.roportajSonucu ? (
          <View style={{ gap: 8 }}>
            {key === 'win' && !s.kutlama ? <ShareButton data={winCard(s)} label={L("Zaferini paylaş")} /> : null}
            <Button label={s.kutlama ? L("Kutlamaya geç") : L("Devam")} icon={s.kutlama ? 'trophy' : 'arrow-right'} tone={s.kutlama || key === 'win' ? 'gold' : 'red'} onPress={async () => {
                const reklam = await maybeInterstitial(careerFights(s), key === 'loss');
                if (reklam) noteInterstitialShown();
                act(continueAfterPost);
                // Mutlu an: en az 3 maçlık galibiyet serisi (reklamın hemen ardından değil).
                if (!reklam && key === 'win' && !s.kutlama && s.seri >= 3 && careerFights(s) >= 6) void askReview();
              }} />
          </View>
        ) : undefined
      }
    >
      <CoachTip s={s} act={act} id="macSonrasi" />
      {yeni && o ? <PostHero s={s} o={o} pWin={pWin} tone={t.ana} title={t.baslik} /> : (
      <LinearGradient colors={t.hero} style={pf.hero}>
        <Stage color={t.ana} />
        <View style={[pf.glowLine, { backgroundColor: t.ana }]} />
        <Text style={pf.org}>{o ? `${ORGS[o.org].ad}${o.unvan ? L(" · ÜNVAN MAÇI") : ''}`.toLocaleUpperCase(LOC) : t.kicker}</Text>
        <Text style={[pf.title, SLANT, { textShadowColor: t.ana + '88' }]}>{t.baslik}</Text>
        {o ? (
          <>
            <View style={[pf.plate, { borderColor: t.ana + '66' }]}>
              <Text style={[pf.method, { color: t.ana }]}>{o.yontem.toLocaleUpperCase(LOC)}</Text>
              {o.teknik ? (
                <>
                  <View style={pf.plateDot} />
                  <Text style={pf.plateText} numberOfLines={1}>{o.teknik.toLocaleUpperCase(LOC)}</Text>
                </>
              ) : null}
              <View style={pf.plateDot} />
              <Text style={pf.plateText}>{L("R{0} · {1}", [o.raunt, o.sure])}</Text>
            </View>
            {o.kartlar ? <Text style={pf.cards}>{L("Hakem kartları:")}{' '}{o.kartlar}</Text> : null}
          </>
        ) : (
          <Text style={pf.cards}>{ps.satirlar[0]}</Text>
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
      )}

      {o ? (
        <LinearGradient colors={['#16171c', '#0e0f12']} style={pf.tiles}>
          <Tile i={0} snd={o.kazanc > 0 ? 'cash' : undefined} label={L("KAZANÇ")} icon="cash" value={o.kazanc > 0 ? `+${money(o.kazanc)}` : '$0'} count={o.kazanc > 0 ? { n: o.kazanc, fmt: (n) => `+${money(n)}` } : undefined} sub={o.bonus ? L("{0} bonus dahil", [o.bonus]) : o.amator ? L("Amatör") : L("Net")} color={o.kazanc > 0 ? C.green : C.dim} />
          <Tile i={1} snd={(o.takipciDelta ?? o.popDelta) > 0 ? 'chime' : undefined} label={L("TAKİPÇİ")} icon="account-group" value={o.takipciDelta != null ? fmtDelta(o.takipciDelta) : `${o.popDelta >= 0 ? '+' : ''}${o.popDelta}`} count={o.takipciDelta != null ? { n: o.takipciDelta, fmt: fmtDelta } : undefined} sub={o.takipci != null ? fmtFollowers(o.takipci) : undefined} color={(o.takipciDelta ?? o.popDelta) >= 0 ? C.gold : '#ff4d5e'} />
          <Tile i={2} snd={o.puan > 0 ? 'flash' : undefined} label={L("GELİŞİM")} icon="star-four-points" value={`+${o.puan}`} count={{ n: o.puan, fmt: (n) => `+${n}` }} sub={L("puan")} color={C.blue} />
          <Tile i={3} label={L("SAĞLIK")} icon="heart-pulse" value={`${o.saglik}`} sub={o.hasar ? `-${o.hasar}` : L("Temiz")} color={o.saglik < 50 ? '#ff4d5e' : o.saglik < 75 ? C.orange : C.green} />
        </LinearGradient>
      ) : null}

      {o?.anlar?.length ? (
        <View style={pf.moments}>
          <Text style={pf.momentsTitle}>{L("MAÇIN EN İYİ ANLARI")}</Text>
          {o.anlar.map((m, i) => (
            <PopIn key={i} delay={500 + i * 280}>
              <View style={[pf.moment, { borderLeftColor: m.biz ? t.ana : '#5a5f6a' }]}>
                <Text style={pf.momentIcon}>{m.ikon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={pf.momentRound}>{L("RAUNT {0}", [m.r])}</Text>
                  <Text style={pf.momentText}>{m.metin}</Text>
                </View>
              </View>
            </PopIn>
          ))}
        </View>
      ) : null}

      {/* Galibiyet primi: yalnızca galibiyette, bir kez (ödüllü reklam; Şampiyon Paketi'nde anında) */}
      {canWinBonus(s) ? (
        <AdOffer icon="cash-plus" title={L("Galibiyet primi")} desc={L("Organizasyon bu geceki performansını ödüllendiriyor: +{0}", [money(winBonusAmount(s))])} onReward={() => act((x) => void claimWinBonus(x))} />
      ) : null}
      {ps.galibiyetPrimi ? <Text style={pf.shootDone}>{L("💰 Galibiyet primi: +{0}", [money(ps.galibiyetPrimi)])}</Text> : null}

      {/* Röportaj: gecenin tek kararı, hemen sonucun altında */}
      {ps.roportajSonucu ? (
        <LinearGradient colors={['#1a1509', '#0d0d10']} style={pf.micDone}>
          <Icon name="microphone-variant" size={18} color={C.gold} />
          <Text style={pf.micDoneText}>{ps.roportajSonucu}</Text>
        </LinearGradient>
      ) : (
        <LinearGradient colors={['#17130a', '#0c0d10']} style={pf.micCard}>
          <View style={pf.micHead}>
            <View style={[pf.micIcon, { borderColor: t.ana }]}>
              <Icon name="microphone-variant" size={18} color={t.ana} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={pf.micTitle}>{L("KAFES İÇİ RÖPORTAJ")}</Text>
              <Text style={pf.micHint}>{L("Mikrofon sana uzatıldı. Ne diyeceksin?")}</Text>
            </View>
          </View>
          {ps.roportajSecenekleri.map((q, i) => (
            <Pressable key={i} onPress={() => act((x) => interview(x, i))} style={({ pressed }) => [pf.quote, pressed && { borderColor: t.ana, backgroundColor: '#1b1c22' }]}>
              <Text style={[pf.quoteMark, { color: t.ana }]}>“</Text>
              <Text style={pf.quoteText}>{q}</Text>
              <Icon name="chevron-right" size={18} color={C.faint} />
            </Pressable>
          ))}
        </LinearGradient>
      )}

      {tarih.map((l) => (
        <LinearGradient key={l} colors={['#4a3508', '#1a1508']} style={pf.tarih}>
          <Text style={pf.tarihText}>{l}</Text>
        </LinearGradient>
      ))}
      {ps.roportajSonucu ? <FullVersionNudge /> : null}
      {ps.roportajSonucu && key === 'win' ? <WelcomeDeal fights={careerFights(s)} /> : null}

      {ps.roportajSonucu && s.puan > 0 ? (
        gelisim ? (
          yeni ? <NewGrowth s={s} act={act} /> : <SkillPanel s={s} act={act} />
        ) : (
          <Pressable onPress={() => setGelisim(true)} style={({ pressed }) => [pf.skillBar, pressed && { opacity: 0.85 }]}>
            <Icon name="star-four-points" size={18} color="#111" />
            <Text style={pf.skillText}>{L("{0} gelişim puanın var", [s.puan])}</Text>
            <Text style={pf.skillCta}>{L("DAĞIT")}</Text>
            <Icon name="chevron-right" size={18} color="#111" />
          </Pressable>
        )
      ) : null}

      {ps.roportajSonucu && !ps.reklamCekimi ? (
        <AdOffer
          icon="movie-open"
          title={L("Sponsor reklam çekimi")}
          desc={L("Bir markanın reklamında oyna: +{0}", [money(adShootAmount(s))])}
          onReward={() => act((x) => void claimAdShoot(x))}
        />
      ) : null}
      {ps.reklamCekimi ? <Text style={pf.shootDone}>{L("🎬 Reklam çekimi: +{0}", [money(ps.reklamCekimi)])}</Text> : null}

      {ps.roportajSonucu ? <NightResults s={s} act={act} /> : null}

      {rows.length ? (
        <>
          <Section>{L("GECENİN ÖZETİ")}</Section>
          <View style={pf.panel}>
            {shown.map((r, i) => (
              <View key={i} style={[pf.reportRow, i > 0 && pf.divider]}>
                <View style={pf.emoBox}>
                  <Text style={pf.emo}>{r.e}</Text>
                </View>
                <Text style={pf.reportText}>{r.txt}</Text>
                {r.am ? <Text style={[pf.moneyVal, r.neg && { color: '#ff4d5e' }]}>{r.am}</Text> : null}
              </View>
            ))}
            {rows.length > SHOW ? (
              <Pressable onPress={() => setHepsi((v) => !v)} style={[pf.more, pf.divider]}>
                <Text style={pf.moreText}>{hepsi ? L("Daha az göster") : L("Tümünü göster (+{0})", [rows.length - SHOW])}</Text>
                <Icon name={hepsi ? 'chevron-up' : 'chevron-down'} size={16} color={C.dim} />
              </Pressable>
            ) : null}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const pf = StyleSheet.create({
  tarih: { borderRadius: 12, borderWidth: 1, borderColor: C.gold, padding: 14, marginBottom: 10 },
  tarihText: { color: C.gold, fontFamily: F.semi, fontSize: 14, lineHeight: 20 },
  moments: { backgroundColor: '#111216', borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, gap: 8, marginBottom: 12 },
  momentsTitle: { color: C.dim, fontFamily: F.display, fontSize: 11, letterSpacing: 2 },
  moment: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#17181d', borderRadius: 8, borderLeftWidth: 3, paddingVertical: 8, paddingHorizontal: 10 },
  momentIcon: { fontSize: 20 },
  momentRound: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1.5 },
  momentText: { color: C.text, fontFamily: F.semi, fontSize: 13, lineHeight: 18 },
  shootDone: { color: C.green, fontFamily: F.bold, fontSize: 13, textAlign: 'center', marginVertical: 8 },
  hero: { marginHorizontal: -16, marginTop: -16, paddingTop: 20, paddingHorizontal: 16, paddingBottom: 16, alignItems: 'center', marginBottom: 12, overflow: 'hidden' },
  glowLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.9 },
  org: { color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 3 },
  title: { color: '#fff', fontFamily: F.display, fontSize: 56, lineHeight: 64, letterSpacing: 1, marginTop: 2, textShadowRadius: 24 },
  plate: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#00000066', maxWidth: '100%' },
  plateDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.faint },
  plateText: { color: C.text, fontFamily: F.display, fontSize: 13, letterSpacing: 1, flexShrink: 1 },
  method: { fontFamily: F.display, fontSize: 16, letterSpacing: 1.5 },
  cards: { color: C.faint, fontFamily: F.body, fontSize: 12, marginTop: 6 },
  corners: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 14, alignSelf: 'stretch' },
  corner: { flex: 1, alignItems: 'center', gap: 4 },
  winTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 2, transform: [{ skewX: '-10deg' }] },
  winTagText: { color: '#000', fontFamily: F.display, fontSize: 10, letterSpacing: 1.5 },
  cornerName: { color: C.text, fontFamily: F.display, fontSize: 16, lineHeight: 20, textAlign: 'center', marginTop: 4 },
  cornerSub: { color: C.faint, fontFamily: F.body, fontSize: 11 },
  cornerRec: { color: C.dim, fontFamily: F.display, fontSize: 18, letterSpacing: 1 },
  vs: { width: 36, alignItems: 'center', paddingTop: 58 },
  vsText: { color: C.faint, fontFamily: F.display, fontSize: 16, letterSpacing: 1 },
  tiles: { flexDirection: 'row', borderRadius: R, borderWidth: 1, borderColor: C.border, paddingVertical: 12, marginBottom: 12 },
  tile: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  tileDiv: { borderLeftWidth: 1, borderLeftColor: C.border },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tileLabel: { color: C.faint, fontFamily: F.display, fontSize: 9, letterSpacing: 1.2 },
  tileVal: { fontFamily: F.display, fontSize: 19, marginTop: 4, alignSelf: 'stretch', textAlign: 'center' },
  tileSub: { color: C.faint, fontFamily: F.body, fontSize: 10, marginTop: 1 },
  micCard: { borderRadius: R, borderWidth: 1, borderColor: C.goldDeep, padding: 12, gap: 8, marginBottom: 12 },
  micHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  micIcon: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  micTitle: { color: C.text, fontFamily: F.display, fontSize: 15, letterSpacing: 1 },
  micDone: { flexDirection: 'row', gap: 10, borderRadius: R, borderWidth: 1, borderColor: C.goldDeep, padding: 12, marginBottom: 12 },
  micDoneText: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  skillBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.gold, borderRadius: R, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12 },
  skillText: { flex: 1, color: '#111', fontFamily: F.bold, fontSize: 14 },
  skillCta: { color: '#111', fontFamily: F.display, fontSize: 14, letterSpacing: 1 },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10 },
  moreText: { color: C.dim, fontFamily: F.semi, fontSize: 12, letterSpacing: 0.5 },
  panel: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 6 },
  divider: { borderTopWidth: 1, borderTopColor: C.border },
  moneyVal: { color: C.green, fontFamily: F.display, fontSize: 15, textAlign: 'right', maxWidth: '50%' },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  emoBox: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.cardAlt, alignItems: 'center', justifyContent: 'center' },
  emo: { fontSize: 15 },
  reportText: { flex: 1, color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  micHint: { color: C.faint, fontFamily: F.body, fontSize: 12 },
  quote: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ffffff08', borderRadius: R, borderWidth: 1, borderColor: C.border, paddingVertical: 10, paddingHorizontal: 12 },
  quoteMark: { fontFamily: F.display, fontSize: 28, lineHeight: 30, marginTop: -2 },
  quoteText: { flex: 1, color: C.text, fontFamily: F.medium, fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
});

/** Galibiyetten sonra: 3. maçla Hoş Geldin Fırsatı penceresi açılır ve duyurusu bir kez çıkar. */
function WelcomeDeal({ fights }: { fights: number }) {
  const ready = !!usePrice(DEAL_SKU);
  useEffect(() => maybeStartWelcome(fights, ready), [fights, ready]);
  return <DealPopup />;
}
