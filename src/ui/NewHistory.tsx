// Yeni görünüm: maç geçmişi. Klasik görünümde hiç çizilmez; yalnızca okur, oyun durumunu değiştirmez.
// Üstte karne ve bitiriş dağılımı, filtreler; her maç sol kenarı sonuç renginde bir kart, dokununca ayrıntı açılır.
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ORGS } from '../engine/data';
import { readIstat } from '../engine/istat';
import { lookFor } from '../engine/tale';
import type { FightHistory, GameState } from '../engine/types';
import { cityPin } from '../engine/worldMap';
import { L, LANG } from '../i18n';
import { careerCard } from '../share/build';
import { ShareButton } from '../share/ShareButton';
import { Icon, SLANT, type IconName } from './components';
import { FighterAvatar } from './FighterAvatar';
import { flagOf } from './NewCareer';
import { C, F } from './theme';

type Filter = 'hepsi' | 'pro' | 'amator' | 'G' | 'M';
const RES = { G: { renk: C.green, kisa: 'G' }, M: { renk: '#ff4d5e', kisa: 'M' }, B: { renk: C.gold, kisa: 'B' } } as const;
const kind = (y: string) => (/KO|TKO/.test(y) ? 'ko' : /Submission/.test(y) ? 'sub' : 'karar');
const KIND_ICON: Record<string, IconName> = { ko: 'flash', sub: 'lock', karar: 'gavel' };
const shortMethod = (y: string) => (/TKO/.test(y) ? 'TKO' : /KO/.test(y) ? 'KO' : /Submission/.test(y) ? 'SUB' : /Beraberlik/.test(y) ? L("BERABERE") : L("KARAR"));

export function NewHistory({ s }: { s: GameState }) {
  const [filter, setFilter] = useState<Filter>('hepsi');
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const total = s.gecmis.length;
  const r = s.rekor;
  const wins = s.gecmis.filter((g) => g.org !== 'amator' && g.sonuc === 'G');
  const ko = wins.filter((g) => kind(g.yontem) === 'ko').length;
  const sub = wins.filter((g) => kind(g.yontem) === 'sub').length;
  const dec = wins.length - ko - sub;
  const finish = wins.length ? Math.round(((ko + sub) / wins.length) * 100) : 0;
  const best = readIstat(s).enIyiSeri;
  const list = s.gecmis
    .map((h, i) => ({ h, no: total - i }))
    .filter(({ h }) => (filter === 'hepsi' ? true : filter === 'pro' ? h.org !== 'amator' : filter === 'amator' ? h.org === 'amator' : h.sonuc === filter));
  const shown = all ? list : list.slice(0, 10);
  const rivalOf = (h: FightHistory) => (h.rakipId ? s.rakipler.find((o) => o.id === h.rakipId) : undefined);
  /** Aynı rakiple bütün maçlar: aranızdaki seri. */
  const h2h = (h: FightHistory) => {
    const same = s.gecmis.filter((x) => (h.rakipId ? x.rakipId === h.rakipId : x.rakip === h.rakip));
    return { n: same.length, g: same.filter((x) => x.sonuc === 'G').length, m: same.filter((x) => x.sonuc === 'M').length };
  };
  return (
    <View style={{ marginTop: 8 }}>
      {/* Başlık ve karne */}
      <View style={h.head}>
        <Text style={h.title}>
          {L("DÖVÜŞ GEÇMİŞİ")}
        </Text>
        <View style={h.recPill}>
          <Text style={h.recPillText}>
            {s.stage === 'amator' ? `${s.amator.g}-${s.amator.m}${s.amator.b ? `-${s.amator.b}` : ''}` : `${r.g}-${r.m}${r.b ? `-${r.b}` : ''}`}
          </Text>
        </View>
      </View>
      <LinearGradient colors={['#1c0a0e', '#0c0d10']} style={h.summary}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            [L("BİTİRİŞ"), LANG === 'tr' ? `%${finish}` : `${finish}%`, C.text],
            [L("EN İYİ SERİ"), String(best), C.gold],
            [L("ŞU AN"), s.seri > 0 ? `${s.seri}G` : s.seri < 0 ? `${-s.seri}M` : '—', s.seri > 0 ? C.green : s.seri < 0 ? '#ff4d5e' : C.text],
            s.stage === 'amator' ? [L("AMATÖR"), `${s.amator.g}-${s.amator.m}`, C.dim] : [L("NAKAVT"), String(ko), C.red],
          ].map(([ad, v, c]) => (
            <View key={ad} style={h.tile}>
              <Text style={h.tileLabel} numberOfLines={1}>
                {ad}
              </Text>
              <Text style={[h.tileVal, { color: c }]} numberOfLines={1} adjustsFontSizeToFit>
                {v}
              </Text>
            </View>
          ))}
        </View>
        {wins.length ? (
          <View style={{ gap: 6, marginTop: 12 }}>
            {[
              [L("KO/TKO"), ko, C.red],
              ['SUB', sub, '#3aa8ff'],
              [L("KARAR"), dec, C.gold],
            ].map(([ad, v, c]) => (
              <View key={ad as string} style={h.methodRow}>
                <Text style={[h.methodLabel, { color: c as string }]}>{ad as string}</Text>
                <View style={h.methodTrack}>
                  <View style={{ width: `${Math.round(((v as number) / wins.length) * 100)}%`, height: 6, backgroundColor: c as string }} />
                </View>
                <Text style={h.methodVal}>{v as number}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </LinearGradient>

      {/* Filtreler */}
      <View style={h.filters}>
        {(
          [
            ['hepsi', L("TÜMÜ")],
            ['pro', 'PRO'],
            ['amator', L("AMATÖR")],
            ['G', L("GALİBİYET")],
            ['M', L("MAĞLUBİYET")],
          ] as const
        ).map(([k, l]) => (
          <Pressable key={k} onPress={() => setFilter(k)} style={[h.filter, filter === k && h.filterOn]}>
            <Text style={[h.filterText, filter === k && { color: '#040405' }]}>{l}</Text>
          </Pressable>
        ))}
      </View>

      {total === 0 ? <Text style={h.empty}>{L("Henüz dövüş yok. İlk maçın burada tarihe geçecek.")}</Text> : null}

      {/* Maç kartları */}
      <View style={{ gap: 8 }}>
        {shown.map(({ h: x, no }) => {
          const res = RES[x.sonuc];
          const o = rivalOf(x);
          const look = o ? lookFor(o) : lookFor({ id: x.rakipId ?? x.rakip, uyruk: '' });
          const on = open === no;
          const city = x.sehir ? cityPin(s, x.sehir) : undefined;
          const org = ORGS[x.org as keyof typeof ORGS];
          const hh = on ? h2h(x) : null;
          return (
            <Pressable key={no} onPress={() => setOpen(on ? null : no)} style={({ pressed }) => [h.card, { borderLeftColor: res.renk }, on && { borderColor: res.renk + '88' }, pressed && { opacity: 0.85 }]}>
              <View style={h.row}>
                <Text style={h.no}>{no}</Text>
                <View style={h.av}>
                  <FighterAvatar look={look} size={40} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={[h.name, SLANT]} numberOfLines={1}>
                    {x.rakip.toUpperCase()}
                  </Text>
                  <Text style={h.detail} numberOfLines={1}>
                    R{x.raunt} · {org?.kisa ?? ''}
                    {city ? ` · ${city.ad}` : ''}
                  </Text>
                </View>
                <View style={h.method}>
                  <Icon name={KIND_ICON[kind(x.yontem)]} size={12} color={x.sonuc === 'G' ? res.renk : C.faint} />
                  <Text style={h.methodText}>{shortMethod(x.yontem)}</Text>
                </View>
                <Text style={[h.res, { color: res.renk }]}>{res.kisa}</Text>
              </View>
              {on ? (
                <View style={h.open}>
                  <View style={h.openGrid}>
                    {[
                      [L("YÖNTEM"), x.yontem],
                      [L("RAUNT"), String(x.raunt)],
                      [L("YAŞIN"), String(x.yas)],
                      [L("ORGANİZASYON"), org?.ad ?? ''],
                    ].map(([a, b]) => (
                      <View key={a} style={h.openTile}>
                        <Text style={h.tileLabel}>{a}</Text>
                        <Text style={h.openVal} numberOfLines={2}>
                          {b}
                        </Text>
                      </View>
                    ))}
                  </View>
                  {x.rakipLakap || o ? (
                    <Text style={h.openLine}>
                      {o ? `${flagOf(o.uyruk)} ` : ''}
                      {x.rakipLakap ? `“${x.rakipLakap}”` : ''}
                      {o ? `${x.rakipLakap ? ' · ' : ''}${o.uyruk} · ${o.rekor.g}-${o.rekor.m}-${o.rekor.b}` : ''}
                    </Text>
                  ) : null}
                  {hh && hh.n > 1 ? (
                    <View style={h.h2h}>
                      <Text style={h.h2hLabel}>{L("ARANIZDA")}</Text>
                      <Text style={h.h2hVal}>
                        <Text style={{ color: C.green }}>{hh.g}</Text>
                        <Text style={{ color: C.faint }}> - </Text>
                        <Text style={{ color: '#ff4d5e' }}>{hh.m}</Text>
                      </Text>
                      <Text style={h.h2hSub}>{L("{0} karşılaşma", [hh.n])}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {list.length > 10 ? (
        <Pressable onPress={() => setAll(!all)} style={h.more}>
          <Text style={h.moreText}>{all ? L("DAHA AZ GÖSTER") : L("TÜM {0} MAÇI GÖSTER", [list.length])}</Text>
          <Icon name={all ? 'chevron-up' : 'chevron-down'} size={16} color={C.dim} />
        </Pressable>
      ) : null}
      {total > 0 ? (
        <View style={{ marginTop: 12 }}>
          <ShareButton data={careerCard(s)} label={L("Kariyer kartını paylaş")} tone="gold" />
        </View>
      ) : null}
    </View>
  );
}

const h = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  title: { color: C.text, fontFamily: F.display, fontSize: 20, letterSpacing: 1.5 },
  recPill: { backgroundColor: '#0f2a1b', borderWidth: 1, borderColor: '#1f6b40', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 3 },
  recPillText: { color: C.green, fontFamily: F.display, fontSize: 16 },
  summary: { borderWidth: 1, borderColor: '#3a1a20', borderRadius: 6, padding: 12, marginBottom: 10 },
  tile: { flex: 1, minWidth: 0, backgroundColor: '#0a0b0e', borderWidth: 1, borderColor: C.border, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 7, gap: 2 },
  tileLabel: { color: '#8b919c', fontFamily: F.bold, fontSize: 9, letterSpacing: 0.5 },
  tileVal: { fontFamily: F.display, fontSize: 18 },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  methodLabel: { width: 56, fontFamily: F.display, fontSize: 11, letterSpacing: 0.5 },
  methodTrack: { flex: 1, height: 6, backgroundColor: '#1c1f25' },
  methodVal: { width: 26, color: C.text, fontFamily: F.display, fontSize: 13, textAlign: 'right' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  filter: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  filterOn: { backgroundColor: C.text, borderColor: C.text },
  filterText: { color: '#c3c8d1', fontFamily: F.semi, fontSize: 12 },
  empty: { color: C.faint, fontFamily: F.body, fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  card: { backgroundColor: '#111317', borderWidth: 1, borderColor: C.border, borderLeftWidth: 4, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  no: { width: 24, color: '#8b919c', fontFamily: F.display, fontSize: 15 },
  av: { width: 40, height: 40, borderRadius: 4, backgroundColor: '#1c1f25', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  name: { color: C.text, fontFamily: F.display, fontSize: 15, letterSpacing: 0.5 },
  detail: { color: '#8b919c', fontFamily: F.body, fontSize: 11 },
  method: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  methodText: { color: '#c3c8d1', fontFamily: F.black, fontSize: 10.5, letterSpacing: 1 },
  res: { width: 16, fontFamily: F.display, fontSize: 18, textAlign: 'right' },
  open: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border, gap: 8 },
  openGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  openTile: { width: '48.5%', flexGrow: 1, backgroundColor: '#0a0b0e', borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 7, gap: 2 },
  openVal: { color: C.text, fontFamily: F.display, fontSize: 14 },
  openLine: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  h2h: { flexDirection: 'row', alignItems: 'baseline', gap: 10, backgroundColor: '#0a0b0e', borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 8 },
  h2hLabel: { color: '#8b919c', fontFamily: F.black, fontSize: 9.5, letterSpacing: 1.2 },
  h2hVal: { fontFamily: F.display, fontSize: 18 },
  h2hSub: { color: C.dim, fontFamily: F.body, fontSize: 11 },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  moreText: { color: C.dim, fontFamily: F.display, fontSize: 12, letterSpacing: 1 },
});
