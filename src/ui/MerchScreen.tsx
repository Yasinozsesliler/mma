// Kendi markan ekranı: kuruluş, ürün hatları ve fiyat seviyeleri, kalite, reklam kampanyası, satış geçmişi.
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { money } from '../engine/career';
import { fmtFollowers } from '../engine/fame';
import {
  campaignCost,
  canStartBrand,
  launchProduct,
  merchForecast,
  MERCH_MIN_FOLLOWERS,
  PRODUCTS,
  productLocked,
  qualityCost,
  runCampaign,
  setTier,
  startBrand,
  TIERS,
  upgradeQuality,
  type PriceTier,
  type Product,
} from '../engine/merch';
import type { GameState } from '../engine/types';
import { buzz } from '../haptics';
import { L } from '../i18n';
import { Button, Icon, Screen, Section, SLANT, Title, type IconName } from './components';
import type { Act } from './GameScreens';
import { C, F } from './theme';

export function MerchScreen({ s, act }: { s: GameState; act: Act }) {
  const [name, setName] = useState(`${s.fighter.lakap || s.fighter.soyad} Wear`);
  const m = s.marka;
  const back = <Button label={L("Kariyere dön")} icon="arrow-left" tone="ghost" onPress={() => act((x) => (x.phase = 'hub'))} />;
  if (!m) {
    const ok = canStartBrand(s);
    return (
      <Screen footer={back}>
        <Title art="studyo" kicker={L("İŞ DÜNYASI")} sub={L("Adın bir marka olsun: tişört, imzalı eldiven, enerji içeceği. Her dövüşten sonra satış yapar.")}>
          {L("Kendi Markan")}
        </Title>
        <View style={st.card}>
          <Text style={st.label}>{L("Marka adı")}</Text>
          <TextInput value={name} onChangeText={setName} maxLength={24} style={st.input} placeholderTextColor={C.faint} />
          {!ok ? <Text style={st.warn}>{s.stage === 'amator' ? L("Marka kurmak için profesyonel olmalısın.") : L("En az {0} takipçi gerekiyor.", [fmtFollowers(MERCH_MIN_FOLLOWERS)])}</Text> : null}
          <Button label={L("Markayı kur")} icon="rocket-launch" tone="gold" disabled={!ok} onPress={() => act((x) => startBrand(x, name))} />
        </View>
      </Screen>
    );
  }
  const products = Object.keys(PRODUCTS) as Product[];
  const forecast = merchForecast(s);
  return (
    <Screen footer={back}>
      <LinearGradient colors={['#2a1a06', '#0b0b0e']} style={st.hero}>
        <Icon name="tag-heart" size={28} color={C.gold} />
        <Text style={[st.brand, SLANT]}>{m.ad}</Text>
        <View style={st.stats}>
          <View style={st.stat}>
            <Text style={st.statVal}>{money(m.toplam)}</Text>
            <Text style={st.statLabel}>{L("Toplam kâr")}</Text>
          </View>
          <View style={st.stat}>
            <Text style={st.statVal}>{'★'.repeat(m.kalite)}</Text>
            <Text style={st.statLabel}>{L("Kalite")}</Text>
          </View>
          <View style={st.stat}>
            <Text style={st.statVal}>{forecast ? `~${money(forecast)}` : '—'}</Text>
            <Text style={st.statLabel}>{L("Maç başı tahmin")}</Text>
          </View>
        </View>
      </LinearGradient>
      <Section>{L("ÜRÜNLER")}</Section>
      {products.map((p) => {
        const d = PRODUCTS[p];
        const tier = m.urunler[p];
        const locked = productLocked(s, p);
        return (
          <View key={p} style={st.card}>
            <View style={st.row}>
              <Icon name={d.icon as IconName} size={24} color={tier ? C.gold : C.dim} />
              <Text style={st.pname}>{d.ad()}</Text>
              {!tier ? <Text style={st.cost}>{money(d.kurulum)}</Text> : null}
            </View>
            {tier ? (
              <View style={st.tiers}>
                {(Object.keys(TIERS) as PriceTier[]).map((t) => (
                  <Pressable key={t} onPress={() => act((x) => setTier(x, p, t))} style={[st.tier, tier === t && { borderColor: C.gold, backgroundColor: '#2a2108' }]}>
                    <Text style={[st.tierText, tier === t && { color: C.gold }]}>{TIERS[t].ad()}</Text>
                  </Pressable>
                ))}
              </View>
            ) : locked ? (
              <Text style={st.warn}>{L("Büyük organizasyona geçince açılır.")}</Text>
            ) : (
              <Button label={L("Satışa çıkar")} icon="cart-plus" tone="ghost" disabled={s.para < d.kurulum} onPress={() => { buzz('basari'); act((x) => launchProduct(x, p)); }} />
            )}
          </View>
        );
      })}
      <Text style={st.hint}>{L("Premium fiyat daha çok kâr bırakır ama ancak popülerliğin yüksekse satar. Ucuz fiyat çok satar, az kazandırır.")}</Text>
      <Section>{L("BÜYÜT")}</Section>
      <View style={{ gap: 8 }}>
        <Button
          label={m.kalite >= 3 ? L("Kalite en üstte") : L("Kaliteyi artır · {0}", [money(qualityCost(m))])}
          icon="star-plus"
          tone="ghost"
          disabled={m.kalite >= 3 || s.para < qualityCost(m)}
          onPress={() => act(upgradeQuality)}
        />
        <Button
          label={m.kampanya > 0 ? L("Kampanya sürüyor ({0} maç)", [m.kampanya]) : L("Reklam kampanyası · {0}", [money(campaignCost(s))])}
          icon="bullhorn"
          tone="ghost"
          disabled={m.kampanya > 0 || s.para < campaignCost(s)}
          onPress={() => act(runCampaign)}
        />
      </View>
      {m.gecmis.length ? (
        <>
          <Section>{L("SON SATIŞLAR")}</Section>
          <View style={st.card}>
            {m.gecmis.map((g, i) => (
              <View key={i} style={st.saleRow}>
                <Text style={st.saleText}>{L("{0} ürün", [g.adet])}</Text>
                <Text style={[st.saleText, { color: C.green }]}>+{money(g.kazanc)}</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <Text style={st.hint}>{L("Satışlar her dövüşten sonra gelir. Kazanırsan daha çok satarsın.")}</Text>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  hero: { borderRadius: 14, borderWidth: 1, borderColor: '#4a3810', padding: 14, alignItems: 'center', gap: 8, marginBottom: 6 },
  brand: { color: C.gold, fontFamily: F.display, fontSize: 24, letterSpacing: 1 },
  stats: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  stat: { flex: 1, alignItems: 'center', backgroundColor: '#00000055', borderRadius: 10, paddingVertical: 8 },
  statVal: { color: C.text, fontFamily: F.display, fontSize: 14 },
  statLabel: { color: C.dim, fontFamily: F.semi, fontSize: 10 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, gap: 10, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pname: { color: C.text, fontFamily: F.semi, fontSize: 15, flex: 1 },
  cost: { color: C.gold, fontFamily: F.display, fontSize: 13 },
  tiers: { flexDirection: 'row', gap: 6 },
  tier: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  tierText: { color: C.dim, fontFamily: F.display, fontSize: 12 },
  label: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  input: { color: C.text, fontFamily: F.semi, fontSize: 16, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, backgroundColor: '#0f1014' },
  warn: { color: C.orange, fontFamily: F.semi, fontSize: 12 },
  hint: { color: C.faint, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginVertical: 6 },
  saleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  saleText: { color: C.dim, fontFamily: F.semi, fontSize: 13 },
});
