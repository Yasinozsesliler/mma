import { Pressable, StyleSheet, Text, View } from 'react-native';
import { money } from '../engine/career';
import {
  BUSINESSES,
  businessIncome,
  buyBusiness,
  INVESTMENTS,
  invest,
  MAX_LEVEL,
  pctChange,
  portfolioValue,
  upgradeBusiness,
  upgradeCost,
  weeklyBusinessIncome,
  withdraw,
} from '../engine/economy';
import type { GameState } from '../engine/types';
import { OctIcon, Pill, Section, SLANT, type IconName } from './components';
import type { Act } from './GameScreens';
import { C, F, R } from './theme';

const AMOUNTS = [1000, 10000, 100000, 1000000];

export function InvestPanel({ s, act, onMsg }: { s: GameState; act: Act; onMsg: (m: string) => void }) {
  const owned = new Map((s.isletmeler ?? []).map((x) => [x.id, x.seviye]));
  return (
    <>
      <View style={iv.summary}>
        <View>
          <Text style={iv.label}>HAFTALIK İŞLETME GELİRİ</Text>
          <Text style={[iv.big, SLANT, { color: C.green }]}>{money(weeklyBusinessIncome(s))}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={iv.label}>PORTFÖY</Text>
          <Text style={[iv.big, SLANT]}>{money(portfolioValue(s))}</Text>
        </View>
      </View>

      <Section>İŞLETMELER</Section>
      {BUSINESSES.map((b) => {
        const lvl = owned.get(b.id) ?? 0;
        const cost = lvl ? upgradeCost(b, lvl) : b.fiyat;
        const maxed = lvl >= MAX_LEVEL;
        const afford = s.para >= cost;
        return (
          <View key={b.id} style={[iv.card, lvl > 0 && { borderColor: C.green + '88' }]}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <OctIcon name={b.ikon as IconName} color={lvl ? C.green : C.gold} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={iv.name}>{b.ad}</Text>
                <Text style={iv.desc}>{lvl ? `${b.seviyeAdlari[lvl - 1]} · Seviye ${lvl}/${MAX_LEVEL}` : b.aciklama}</Text>
              </View>
            </View>
            <View style={iv.levels}>
              {Array.from({ length: MAX_LEVEL }, (_, i) => (
                <View key={i} style={[iv.level, { backgroundColor: i < lvl ? C.green : C.border }]} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {lvl ? <Pill text={`Şu an ${money(businessIncome(s, b, lvl))}/hafta`} icon="cash" color={C.green} /> : null}
              {!maxed ? <Pill text={`${lvl ? 'Sonraki' : 'Başlangıç'}: ${money(businessIncome(s, b, lvl + 1))}/hafta`} icon="trending-up" color={C.gold} /> : null}
              {b.populerlikEtkisi ? <Pill text="Popülerlikle artar" icon="star-four-points" color={C.dim} /> : null}
            </View>
            <View style={iv.footer}>
              <Text style={[iv.price, SLANT, !afford && !maxed && { color: C.faint }]}>{maxed ? 'EN ÜST SEVİYE' : money(cost)}</Text>
              {!maxed ? (
                <Pressable
                  disabled={!afford}
                  onPress={() => act((x) => onMsg(lvl ? upgradeBusiness(x, b.id) : buyBusiness(x, b.id)))}
                  style={({ pressed }) => [iv.btn, { opacity: !afford ? 0.35 : pressed ? 0.7 : 1 }]}
                >
                  <Text style={iv.btnText}>{!afford ? 'PARA YETMİYOR' : lvl ? 'YÜKSELT' : 'SATIN AL'}</Text>
                </Pressable>
              ) : (
                <Pill text="MAKSİMUM" icon="crown" color={C.gold} />
              )}
            </View>
          </View>
        );
      })}

      <Section>YATIRIMLAR</Section>
      {INVESTMENTS.map((d) => {
        const y = (s.yatirimlar ?? []).find((x) => x.id === d.id);
        const pct = y ? pctChange(y.deger, y.anapara) : 0;
        const riskColor = d.risk === 'Düşük' ? C.green : d.risk === 'Orta' ? C.gold : C.red;
        return (
          <View key={d.id} style={iv.card}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <OctIcon name={d.ikon as IconName} color={C.blue} size={46} />
              <View style={{ flex: 1 }}>
                <Text style={iv.name}>{d.ad}</Text>
                <Text style={iv.desc}>{d.aciklama}</Text>
              </View>
              <Pill text={`Risk: ${d.risk}`} color={riskColor} />
            </View>
            {y ? (
              <View style={iv.pos}>
                <View>
                  <Text style={iv.label}>DEĞER</Text>
                  <Text style={[iv.posVal, SLANT]}>{money(y.deger)}</Text>
                </View>
                <View>
                  <Text style={iv.label}>ANA PARA</Text>
                  <Text style={iv.posSmall}>{money(y.anapara)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={iv.label}>GETİRİ</Text>
                  <Text style={[iv.posSmall, { color: pct >= 0 ? C.green : C.red }]}>
                    {pct >= 0 ? '+' : ''}
                    {pct.toFixed(1)}%
                  </Text>
                </View>
              </View>
            ) : null}
            <View style={iv.amounts}>
              {AMOUNTS.map((a) => (
                <Pressable key={a} disabled={s.para < a} onPress={() => act((x) => onMsg(invest(x, d.id, a)))} style={[iv.amt, s.para < a && { opacity: 0.3 }]}>
                  <Text style={iv.amtText}>+{a >= 1000000 ? `${a / 1000000}M` : `${a / 1000}K`}</Text>
                </Pressable>
              ))}
              {y ? (
                <Pressable onPress={() => act((x) => onMsg(withdraw(x, d.id)))} style={[iv.amt, { borderColor: C.red }]}>
                  <Text style={[iv.amtText, { color: C.red }]}>ÇEK</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
    </>
  );
}

const iv = StyleSheet.create({
  summary: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: R, padding: 14, marginBottom: 4 },
  label: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1.5 },
  big: { color: C.text, fontFamily: F.display, fontSize: 24 },
  card: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10 },
  name: { color: C.text, fontFamily: F.display, fontSize: 17, textTransform: 'uppercase' },
  desc: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  levels: { flexDirection: 'row', gap: 4, marginVertical: 10 },
  level: { flex: 1, height: 6, borderRadius: 1, transform: [{ skewX: '-15deg' }] },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
  price: { color: C.gold, fontFamily: F.display, fontSize: 20 },
  btn: { backgroundColor: C.green, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 3, transform: [{ skewX: '-10deg' }] },
  btnText: { color: '#04140a', fontFamily: F.display, fontSize: 14, letterSpacing: 1 },
  pos: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, padding: 10, backgroundColor: '#060607', borderRadius: 6 },
  posVal: { color: C.text, fontFamily: F.display, fontSize: 18 },
  posSmall: { color: C.text, fontFamily: F.display, fontSize: 15, marginTop: 3 },
  amounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  amt: { borderWidth: 1, borderColor: C.blue, borderRadius: 3, paddingHorizontal: 10, paddingVertical: 6, transform: [{ skewX: '-8deg' }] },
  amtText: { color: C.blue, fontFamily: F.display, fontSize: 13, letterSpacing: 0.5 },
});
