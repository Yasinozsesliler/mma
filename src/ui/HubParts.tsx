import { L, LOC } from '../i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { money, REST_WEEKS, rest, restPreview } from '../engine/career';
import { statAverage } from '../engine/character';
import { ORGS, WEIGHT_CLASSES } from '../engine/data';
import { rankingRows } from '../engine/division';
import { ligAcik } from '../engine/amateurLeague';
import { LeagueCard } from './LeagueCard';
import { describeOpponent } from '../engine/opponents';
import { BACKGROUNDS } from '../engine/data';
import type { GameState } from '../engine/types';
import { Card, Icon, P, Pill, SLANT, upName, type IconName } from './components';
import { Compare } from './Compare';
import type { Act } from './GameScreens';
import { C, F, R, statColor } from './theme';

// ---------- Haber akışı ----------

interface NewsStyle {
  tag: string;
  color: string;
  icon: IconName;
}

function newsStyle(h: string): NewsStyle {
  if (h.startsWith('✅')) return { tag: L("GALİBİYET"), color: C.green, icon: 'check-bold' };
  if (h.startsWith('❌')) return { tag: L("MAĞLUBİYET"), color: C.red, icon: 'close-thick' };
  if (h.startsWith('➖')) return { tag: L("BERABERLİK"), color: C.gold, icon: 'scale-balance' };
  if (h.includes('🏆')) return { tag: L("ÜNVAN"), color: C.gold, icon: 'crown' };
  if (h.startsWith('✍️')) return { tag: L("KONTRAT"), color: C.blue, icon: 'file-sign' };
  if (h.startsWith('🛍️')) return { tag: L("YAŞAM"), color: '#b57bff', icon: 'shopping' };
  if (/^(🚑|🩹|🛌)/u.test(h)) return { tag: L("SAĞLIK"), color: C.orange, icon: 'medical-bag' };
  if (h.startsWith('📋')) return { tag: L("SIRALAMA"), color: C.blue, icon: 'podium' };
  if (/^(📉|✂️)/u.test(h)) return { tag: L("KRİZ"), color: C.red, icon: 'trending-down' };
  if (h.startsWith('⭐')) return { tag: L("GELİŞİM"), color: C.gold, icon: 'star-four-points' };
  if (/^\p{Extended_Pictographic}/u.test(h) && h.includes(':')) return { tag: L('OLAY'), color: '#5ec8d8', icon: 'newspaper-variant-outline' };
  return { tag: L("HABER"), color: C.dim, icon: 'newspaper-variant-outline' };
}

/** Baştaki emojiyi atıp başlık ve gövdeyi ayırır. */
function splitNews(h: string) {
  const clean = h.replace(/^[\p{Extended_Pictographic}️‍\s]+/u, '');
  const i = clean.indexOf(': ');
  if (i > 0 && i < 48) return { baslik: clean.slice(0, i), govde: clean.slice(i + 2) };
  return { baslik: '', govde: clean };
}

export function NewsFeed({ items }: { items: string[] }) {
  if (!items.length) return null;
  const [first, ...rest] = items;
  const fs = newsStyle(first);
  const f = splitNews(first);
  return (
    <>
      <LinearGradient colors={['#5a0f18', '#1a0b0e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={nf.breaking}>
        <View style={nf.breakingHead}>
          <View style={[nf.breakingTag, SLANT]}>
            <Text style={nf.breakingTagText}>{L("SON DAKİKA")}</Text>
          </View>
          <View style={[nf.tag, { borderColor: fs.color }]}>
            <Icon name={fs.icon} size={11} color={fs.color} />
            <Text style={[nf.tagText, { color: fs.color }]}>{fs.tag}</Text>
          </View>
        </View>
        {f.baslik ? <Text style={[nf.bigHead, SLANT]}>{f.baslik.toLocaleUpperCase(LOC)}</Text> : null}
        <Text style={nf.bigBody}>{f.govde}</Text>
      </LinearGradient>
      {rest.map((h, i) => {
        const ns = newsStyle(h);
        const n = splitNews(h);
        return (
          <View key={i} style={nf.item}>
            <View style={[nf.stripe, { backgroundColor: ns.color }]} />
            <View style={{ flex: 1 }}>
              <View style={[nf.tag, { borderColor: ns.color + '99', marginBottom: 4 }]}>
                <Icon name={ns.icon} size={11} color={ns.color} />
                <Text style={[nf.tagText, { color: ns.color }]}>{ns.tag}</Text>
              </View>
              {n.baslik ? <Text style={nf.head}>{n.baslik}</Text> : null}
              <Text style={nf.body}>{n.govde}</Text>
            </View>
          </View>
        );
      })}
    </>
  );
}

// ---------- Sıralama ----------

export function RankingList({ s }: { s: GameState }) {
  const rows = rankingRows(s);
  const [open, setOpen] = useState<string | null>(null);
  if (ligAcik(s)) return <LeagueCard s={s} />;
  if (!s.bolum || !rows.length) {
    return (
      <Card>
        <P dim style={{ marginBottom: 0 }}>
          {s.stage === 'amator'
            ? L("Amatör ligde resmi sıralama yok. Profesyonel olduğunda organizasyonunun sıklet sıralaması burada açılacak.")
            : L("Bu organizasyonda sıralama yok. Tek gecelik bir fırsat: kazanırsan kapılar açılır.")}
        </P>
      </Card>
    );
  }
  const org = ORGS[s.bolum.org];
  return (
    <>
      <View style={rk.header}>
        <Text style={[rk.headerTitle, SLANT]}>{org.kisa} · {L("{0} Sıklet", [WEIGHT_CLASSES[s.fighter.siklet].ad]).toLocaleUpperCase(LOC)}</Text>
        <Text style={rk.headerSub}>{L("Resmi sıralama · Bir dövüşçüye dokun, istatistiklerini gör")}</Text>
      </View>
      {rows.map((row) => {
        const champ = row.rank === 'C';
        const me = !!row.player;
        const o = row.opp;
        const name = me ? `${s.fighter.ad} ${s.fighter.soyad}` : o ? `${o.ad} ${o.soyad}` : '—';
        const nick = me ? s.fighter.lakap : o?.lakap;
        const rec = me ? `${s.rekor.g}-${s.rekor.m}-${s.rekor.b}` : o ? `${o.rekor.g}-${o.rekor.m}-${o.rekor.b}` : '';
        const ovr = Math.round(statAverage(me ? s.fighter.stats : (o?.stats ?? s.fighter.stats)));
        const isOpen = !!o && open === o.id;
        const d = o ? describeOpponent(o) : null;
        return (
          <View key={String(row.rank)}>
          <Pressable
            disabled={!o}
            onPress={() => o && setOpen(isOpen ? null : o.id)}
            style={({ pressed }) => [rk.row, champ && rk.champRow, me && rk.meRow, isOpen && { borderColor: C.blue, marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }, pressed && { opacity: 0.8 }]}
          >
            {champ ? <LinearGradient colors={['#4a3508', '#1a1508']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} /> : null}
            <View style={[rk.rankBox, SLANT, champ && { backgroundColor: C.gold }, me && { backgroundColor: C.red }]}>
              {champ ? <Icon name="crown" size={18} color="#1f1605" /> : <Text style={[rk.rankText, me && { color: '#fff' }]}>{row.rank}</Text>}
            </View>
            <View style={{ flex: 1 }}>
              {nick ? <Text style={[rk.nick, champ && { color: C.gold }]}>“{nick}”</Text> : null}
              <Text style={[rk.name, me && { color: C.red }]} numberOfLines={1}>
                {upName(name, me ? s.fighter.uyruk : o?.uyruk)}
                {me ? L('  (SEN)') : ''}
              </Text>
              <Text style={rk.meta}>
                {me ? L("Sen") : o?.uyruk} · {rec}
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={[rk.ovr, { color: statColor(ovr) }]}>{ovr}</Text>
              <Text style={rk.ovrLabel}>{L("GÜÇ")}</Text>
            </View>
            {o ? <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.faint} /> : null}
          </Pressable>
          {isOpen && o && d ? (
            <View style={rk.detail}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <Pill text={BACKGROUNDS[o.stil].ad} icon="karate" color={C.dim} />
                <Pill text={o.kisilik} icon="account-voice" color={C.dim} />
                <Pill text={L("Güçlü: {0}", [d.guclu])} icon="arrow-up-bold-circle" color={C.green} />
                <Pill text={L("Zayıf: {0}", [d.zayif])} icon="alert-octagon" color={C.red} />
              </View>
              <Compare me={s.fighter.stats} opp={o.stats} oppLabel={upName(o.soyad, o.uyruk)} />
            </View>
          ) : null}
          </View>
        );
      })}
      {s.rank == null && !s.sampiyon ? <P dim>{L("Henüz sıralamada değilsin. Galibiyetlerle listeye gir.")}</P> : null}
    </>
  );
}

// ---------- Dinlenme ----------

export function RestPicker({ s, act, onDone }: { s: GameState; act: Act; onDone: () => void }) {
  return (
    <Card accent={C.green}>
      <Text style={[rk.headerTitle, SLANT, { marginBottom: 8 }]}>{L("NE KADAR DİNLENECEKSİN?")}</Text>
      {REST_WEEKS.map((w) => {
        const p = restPreview(s, w);
        return (
          <Pressable
            key={w}
            onPress={() => {
              act((x) => rest(x, w));
              onDone();
            }}
            style={({ pressed }) => [rp.opt, pressed && { backgroundColor: C.cardAlt }]}
          >
            <View style={[rp.weeks, SLANT]}>
              <Text style={rp.weeksNum}>{w}</Text>
              <Text style={rp.weeksLabel}>{L("HAFTA")}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={rp.barBg}>
                <View style={[rp.barNow, { width: `${s.saglik}%` }]} />
                <View style={[rp.barGain, { left: `${s.saglik}%`, width: `${p.yeniSaglik - s.saglik}%` }]} />
              </View>
              <Text style={rp.line}>
                
                {L("Sağlık")}{' '}{s.saglik} → <Text style={{ color: C.green, fontFamily: F.bold }}>{p.yeniSaglik}</Text> (+{p.yeniSaglik - s.saglik})
                {p.maliyet ? `  ·  ${money(p.maliyet)}` : L("  ·  Ücretsiz")}
              </Text>
              {p.iyilesen.length ? <Text style={[rp.line, { color: C.green }]}>{L("İyileşir:")}{' '}{p.iyilesen.join(', ')}</Text> : null}
              {p.kalan.length ? <Text style={[rp.line, { color: C.orange }]}>{L("Sürer:")}{' '}{p.kalan.join(', ')}</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </Card>
  );
}

const nf = StyleSheet.create({
  breaking: { borderRadius: R, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#6a1a24' },
  breakingHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  breakingTag: { backgroundColor: C.red, paddingHorizontal: 8, paddingVertical: 2 },
  breakingTagText: { color: '#fff', fontFamily: F.display, fontSize: 11, letterSpacing: 1.5 },
  bigHead: { color: C.text, fontFamily: F.display, fontSize: 20, lineHeight: 25, marginBottom: 4 },
  bigBody: { color: C.text, fontFamily: F.medium, fontSize: 15, lineHeight: 22 },
  item: { flexDirection: 'row', gap: 12, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 8, overflow: 'hidden' },
  stripe: { width: 3, borderRadius: 2, alignSelf: 'stretch' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderWidth: 1, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 1 },
  tagText: { fontFamily: F.display, fontSize: 10, letterSpacing: 1 },
  head: { color: C.text, fontFamily: F.bold, fontSize: 14, marginBottom: 2 },
  body: { color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
});

const rk = StyleSheet.create({
  header: { marginBottom: 10 },
  headerTitle: { color: C.text, fontFamily: F.display, fontSize: 18, letterSpacing: 1 },
  headerSub: { color: C.faint, fontFamily: F.body, fontSize: 12 },
  row: { overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingHorizontal: 10, borderRadius: R, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, marginBottom: 6 },
  champRow: { borderColor: C.goldDeep, paddingVertical: 12 },
  meRow: { borderColor: C.red, backgroundColor: C.redDim },
  rankBox: { width: 36, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: C.cardAlt, borderRadius: 3 },
  rankText: { color: C.text, fontFamily: F.display, fontSize: 18 },
  nick: { color: C.faint, fontFamily: F.displayMed, fontSize: 10, letterSpacing: 1 },
  name: { color: C.text, fontFamily: F.display, fontSize: 16 },
  meta: { color: C.dim, fontFamily: F.body, fontSize: 11 },
  ovr: { fontFamily: F.display, fontSize: 20 },
  ovrLabel: { color: C.faint, fontFamily: F.display, fontSize: 8, letterSpacing: 1 },
  detail: { borderWidth: 1, borderTopWidth: 0, borderColor: C.blue, backgroundColor: '#07090d', borderBottomLeftRadius: R, borderBottomRightRadius: R, padding: 12, marginBottom: 6 },
});

const rp = StyleSheet.create({
  opt: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: R, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  weeks: { width: 52, alignItems: 'center', backgroundColor: C.green + '22', borderWidth: 1, borderColor: C.green, borderRadius: 3, paddingVertical: 4 },
  weeksNum: { color: C.green, fontFamily: F.display, fontSize: 22, lineHeight: 26 },
  weeksLabel: { color: C.green, fontFamily: F.display, fontSize: 9, letterSpacing: 1 },
  barBg: { height: 8, backgroundColor: '#0b0c10', borderRadius: 2, overflow: 'hidden', marginBottom: 5, borderWidth: 1, borderColor: C.border },
  barNow: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: C.dim },
  barGain: { position: 'absolute', top: 0, bottom: 0, backgroundColor: C.green },
  line: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
});
