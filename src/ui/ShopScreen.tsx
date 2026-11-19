import { L } from '../i18n';
import { sfx } from '../audio';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { money } from '../engine/career';
import { VACATIONS } from '../engine/gyms';
import { buy, fightItemMods, itemBonusTotal, itemEffects, ITEM_STAT_CAP, ITEM_TOTAL_CAP, outclassed, owns, SHOP, takeVacation, type ShopCategory, type ShopItem } from '../engine/shop';
import { STAT_LABELS } from '../engine/types';
import type { GameState } from '../engine/types';
import { Button, Card, Icon, OctIcon, P, Pill, Screen, SLANT, Title, type IconName } from './components';
import type { Act } from './GameScreens';
import { InvestPanel } from './InvestPanel';
import { PetPanel } from './PetPanel';
import { ItemArt } from './ItemArt';
import { C, F, R } from './theme';

type Tab = ShopCategory | 'yatirim' | 'tatil' | 'hayvan';

const SUBS: [NonNullable<ShopItem['alt']>, string, IconName][] = [
  ['ev', 'EV', 'home-city'],
  ['araba', L("ARABA"), 'car-sports'],
  ['saat', L("SAAT & TAKI"), 'watch'],
  ['teknoloji', L("TEKNOLOJİ"), 'controller-classic'],
  ['moda', L('MODA'), 'hanger'],
  ['tasit', L("TAŞIT"), 'airplane'],
  ['diger', L("DİĞER"), 'palette'],
];
const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: 'ekipman', label: L("EKİPMAN"), icon: 'boxing-glove' },
  { key: 'yasam', label: L("YAŞAM"), icon: 'home-heart' },
  { key: 'yatirim', label: L("YATIRIM"), icon: 'chart-line' },
  { key: 'hayvan', label: L("HAYVAN"), icon: 'paw' },
  { key: 'tatil', label: L("TATİL"), icon: 'beach' },
];

function ItemCard({ s, it, act, onMsg }: { s: GameState; it: ShopItem; act: Act; onMsg: (m: string) => void }) {
  const have = owns(s, it.id);
  const better = !have && outclassed(s, it);
  const afford = s.para >= it.fiyat;
  const color = it.kategori === 'ekipman' ? C.red : '#b57bff';
  return (
    <View style={[sh.card, have && { borderColor: C.green }]}>
      {it.art ? (
        <View style={sh.art}>
          <ItemArt art={it.art} width={280} />
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        {it.art ? null : <OctIcon name={it.ikon as IconName} color={have ? C.green : color} size={50} />}
        <View style={{ flex: 1 }}>
          <Text style={sh.name}>{it.ad}</Text>
          <Text style={sh.desc}>{it.aciklama}</Text>
        </View>
      </View>
      <View style={sh.effects}>
        {itemEffects(it).map((e) => (
          <Pill key={e} text={e} color={C.gold} />
        ))}
      </View>
      <View style={sh.footer}>
        <Text style={[sh.price, SLANT, !afford && !have && { color: C.faint }]}>{money(it.fiyat)}</Text>
        {have ? (
          <Pill text={L("SAHİPSİN")} icon="check-decagram" color={C.green} />
        ) : better ? (
          <Pill text={L("DAHA İYİSİ SENDE")} color={C.faint} />
        ) : (
          <Pressable
            disabled={!afford}
            onPress={() =>
              act((x) => {
                const before = x.para;
                onMsg(buy(x, it.id));
                if (x.para < before) sfx('cash');
              })
            }
            style={({ pressed }) => [sh.buy, { opacity: !afford ? 0.35 : pressed ? 0.7 : 1 }]}
          >
            <Text style={sh.buyText}>{afford ? L("SATIN AL") : L("PARA YETMİYOR")}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function ShopScreen({ s, act, start = 'ekipman' }: { s: GameState; act: Act; start?: Tab }) {
  const [tab, setTab] = useState<Tab>(start);
  const [alt, setAlt] = useState<NonNullable<ShopItem['alt']>>('ev');
  const [msg, setMsg] = useState<string | null>(null);
  const items = SHOP.filter((i) => i.kategori === tab && (tab !== 'yasam' || (i.alt ?? 'diger') === alt)).sort((a, b) => a.fiyat - b.fiyat);
  return (
    <Screen footer={<Button label={L("Kariyere dön")} icon="arrow-left" tone="ghost" onPress={() => act((x) => (x.phase = 'hub'))} />}>
      <Title art="salon" kicker={L("DÖVÜŞÇÜ MAĞAZASI")} sub={L("Ekipmanlar kafeste kalıcı bonus verir. Yaşam eşyaları popülerlik, motivasyon ve daha hızlı iyileşme sağlar.")}>
        
        {L("Mağaza")}
      </Title>
      <LinearGradient colors={['#1d3a24', '#101a13']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={sh.wallet}>
        <Text style={sh.walletLabel}>{L("BAKİYE")}</Text>
        <Text style={[sh.walletVal, SLANT]}>{money(s.para)}</Text>
      </LinearGradient>
      {msg ? (
        <Card accent={C.gold}>
          <P style={{ marginBottom: 0 }}>{msg}</P>
        </Card>
      ) : null}
      <View style={sh.tabs}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[sh.tab, tab === t.key && sh.tabOn]}>
            <Text style={[sh.tabText, tab === t.key && { color: '#fff' }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      {tab === 'ekipman' ? (
        <View style={sh.capBox}>
          <Text style={sh.capLabel}>{L("EKİPMAN BONUSU ·")}{' '}{itemBonusTotal(s)}/{ITEM_TOTAL_CAP}</Text>
          <View style={sh.capBar}>
            <View style={{ width: `${(itemBonusTotal(s) / ITEM_TOTAL_CAP) * 100}%`, height: '100%', backgroundColor: C.gold }} />
          </View>
          <Text style={sh.capNote}>
            {Object.entries(fightItemMods(s)).map(([k, v]) => `+${v} ${STAT_LABELS[k as keyof typeof STAT_LABELS]}`).join(' · ') || L("Henüz ekipman bonusun yok.")}
            {L("\nBir istatistiğe en fazla +{0}, toplamda en fazla +{1} ekipman bonusu gelir.", [ITEM_STAT_CAP, ITEM_TOTAL_CAP])}
          </Text>
        </View>
      ) : null}
      {tab === 'yasam' ? (
        <View style={sh.subs}>
          {SUBS.map(([k, l, ic]) => (
            <Pressable key={k} onPress={() => setAlt(k)} style={[sh.sub, alt === k && sh.subOn]}>
              <Icon name={ic} size={14} color={alt === k ? '#1f1605' : C.dim} />
              <Text style={[sh.subText, alt === k && { color: '#1f1605' }]}>{l}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {tab === 'yatirim' ? <InvestPanel s={s} act={act} onMsg={setMsg} /> : null}
      {tab === 'hayvan' ? <PetPanel s={s} act={act} onMsg={setMsg} /> : null}
      {tab === 'yatirim' || tab === 'hayvan' ? null : tab === 'tatil'
        ? VACATIONS.map((v) => {
            const afford = s.para >= v.fiyat;
            return (
              <View key={v.id} style={sh.card}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <OctIcon name={v.ikon as IconName} color="#2ec4b6" size={50} />
                  <View style={{ flex: 1 }}>
                    <Text style={sh.name}>{v.ad}</Text>
                    <Text style={sh.desc}>{v.aciklama}</Text>
                  </View>
                </View>
                <View style={sh.effects}>
                  <Pill text={`${v.hafta} hafta`} icon="calendar-clock" color={C.dim} />
                  <Pill text={L("+{0} sağlık", [v.saglik])} icon="heart-pulse" color={C.green} />
                  {v.motivasyon ? <Pill text={`${v.motivasyon > 0 ? '+' : ''}${v.motivasyon} motivasyon`} icon="fire" color={v.motivasyon > 0 ? C.gold : C.red} /> : null}
                  {v.populerlik ? <Pill text={L("+{0} popülerlik", [v.populerlik])} icon="star-four-points" color={C.gold} /> : null}
                  {Object.entries(v.disiplin).map(([k, d]) => (
                    <Pill key={k} text={`${d} ${({ kondisyon: L("Kondisyon"), hiz: L("Hız"), iq: 'IQ' } as Record<string, string>)[k] ?? k} (disiplin)`} icon="alert-octagon" color={C.red} />
                  ))}
                </View>
                <View style={sh.footer}>
                  <Text style={[sh.price, SLANT, !afford && { color: C.faint }]}>{money(v.fiyat)}</Text>
                  <Pressable
                    disabled={!afford}
                    onPress={() => act((x) => setMsg(takeVacation(x, v.id)))}
                    style={({ pressed }) => [sh.buy, { backgroundColor: '#1a8a80', opacity: !afford ? 0.35 : pressed ? 0.7 : 1 }]}
                  >
                    <Text style={sh.buyText}>{afford ? L("TATİLE ÇIK") : L("PARA YETMİYOR")}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        : items.map((it) => <ItemCard key={it.id} s={s} it={it} act={act} onMsg={setMsg} />)}
    </Screen>
  );
}

const sh = StyleSheet.create({
  subs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  sub: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, borderRadius: 3, paddingHorizontal: 10, paddingVertical: 7, transform: [{ skewX: '-8deg' }] },
  subOn: { backgroundColor: C.gold, borderColor: C.gold },
  subText: { color: C.dim, fontFamily: F.display, fontSize: 12, letterSpacing: 0.6 },
  art: { alignItems: 'center', backgroundColor: '#07080b', borderRadius: 6, paddingVertical: 6, marginBottom: 10 },
  capBox: { backgroundColor: C.card, borderWidth: 1, borderColor: C.goldDeep, borderRadius: R, padding: 12, marginBottom: 12 },
  capLabel: { color: C.gold, fontFamily: F.display, fontSize: 12, letterSpacing: 1.5 },
  capBar: { height: 8, backgroundColor: '#060607', borderRadius: 2, overflow: 'hidden', marginVertical: 8, borderWidth: 1, borderColor: C.border },
  capNote: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  wallet: { borderRadius: R, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#2f6b3f' },
  walletLabel: { color: C.green, fontFamily: F.display, fontSize: 11, letterSpacing: 2 },
  walletVal: { color: '#fff', fontFamily: F.display, fontSize: 32 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 10, paddingHorizontal: 2, alignItems: 'center', borderRadius: 4, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, transform: [{ skewX: '-8deg' }] },
  tabOn: { backgroundColor: C.red, borderColor: C.red },
  tabText: { color: C.dim, fontFamily: F.display, fontSize: 12, letterSpacing: 0.8 },
  card: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10 },
  name: { color: C.text, fontFamily: F.display, fontSize: 18, textTransform: 'uppercase' },
  desc: { color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 18, marginTop: 2 },
  effects: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
  price: { color: C.gold, fontFamily: F.display, fontSize: 22 },
  buy: { backgroundColor: C.red, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 3, transform: [{ skewX: '-10deg' }] },
  buyText: { color: '#fff', fontFamily: F.display, fontSize: 14, letterSpacing: 1 },
});
