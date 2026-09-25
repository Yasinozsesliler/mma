import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { money } from '../engine/career';
import { enterCasino } from '../engine/casino';
import { breakUp, candidates, DATE_TIERS, goOnDate, makePartner, spendNight, STRIP_OPTIONS, stripPrice, treatDisease, visitStripClub, yatVar } from '../engine/nightlife';
import { treatmentCost } from '../engine/nightlifeCore';
import type { GameState } from '../engine/types';
import { Bar, Button, Card, Choice, Icon, P, Pill, Screen, Section, SLANT, Title, type IconName } from './components';
import type { Act } from './GameScreens';
import { C, F, R } from './theme';

function HealthBanner({ s, act, onMsg }: { s: GameState; act: Act; onMsg: (m: string) => void }) {
  if (!s.hastalik) return null;
  const tedavi = !!s.hastalik.tedaviBitis;
  return (
    <Card accent={tedavi ? C.gold : C.red}>
      <Text style={[nl.alertTitle, { color: tedavi ? C.gold : C.red }]}>{tedavi ? '💊 TEDAVİ SÜRÜYOR' : '⚠️ CİNSEL YOLLA BULAŞAN ENFEKSİYON'}</Text>
      <P style={{ marginBottom: 8 }}>
        {tedavi
          ? `${s.hastalik.ad} tedavisi ${Math.max(0, s.hastalik.tedaviBitis! - s.hafta)} hafta içinde bitecek.`
          : `${s.hastalik.ad}. Tedavi olmazsan sağlığın her hafta düşer, dövüşte kondisyonun ve odağın zayıflar. Maç öncesi sağlık kontrolünde yakalanırsan maçın iptal edilir.`}
      </P>
      {!tedavi ? <Button label={`Tedavi ol (${money(treatmentCost(s))})`} icon="pill" onPress={() => act((x) => onMsg(treatDisease(x)))} /> : null}
    </Card>
  );
}

function Strip({ s, act, onMsg }: { s: GameState; act: Act; onMsg: (m: string) => void }) {
  return (
    <>
      <LinearGradient colors={['#3a0630', '#0b0209']} style={nl.hero}>
        <Text style={[nl.heroTitle, SLANT]}>NEON CLUB</Text>
        <Text style={nl.heroSub}>Kırmızı ışıklar, yüksek müzik, pahalı içkiler. Kafanı dağıtır… ama bedeli var.</Text>
      </LinearGradient>
      {STRIP_OPTIONS.map((o, i) => (
        <Choice
          key={o.ad}
          icon={o.ikon as IconName}
          label={`${o.ad} · ${money(stripPrice(s, i))}`}
          desc={`${o.aciklama}\nMotivasyon +1 · Disiplin riski (kondisyon)`}
          tone={i === 1 ? 'red' : 'gold'}
          disabled={s.para < stripPrice(s, i)}
          onPress={() => act((x) => onMsg(visitStripClub(x, i)))}
        />
      ))}
    </>
  );
}

function Dates({ s, act, onMsg }: { s: GameState; act: Act; onMsg: (m: string) => void }) {
  // Liste act() ile üretilir (NightlifeScreen'deki efekt); çizim sırasında durum değiştirilmez.
  const list = s.adaylar?.hafta === s.hafta ? s.adaylar.list : [];
  return (
    <>
      {s.iliski ? (
        <LinearGradient colors={['#3a0a1c', '#12060a']} style={nl.partner}>
          <Text style={{ fontSize: 38 }}>{s.iliski.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={nl.label}>SEVGİLİN</Text>
            <Text style={[nl.name, SLANT]}>💞 {s.iliski.ad.toLocaleUpperCase('tr-TR')}</Text>
            <Text style={nl.meta}>{s.iliski.meslek} · Kamp motivasyonu +1. Başkalarıyla görüşürsen yakalanabilirsin.</Text>
          </View>
          <Pressable onPress={() => act((x) => onMsg(breakUp(x)))} style={nl.small}>
            <Text style={nl.smallText}>AYRIL</Text>
          </Pressable>
        </LinearGradient>
      ) : null}
      <Section>BU HAFTANIN TANIŞMALARI</Section>
      {list.map((c) => {
        const partner = s.iliski?.id === c.id;
        return (
          <View key={c.id} style={[nl.card, partner && { borderColor: '#e0457b' }]}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <View style={nl.avatar}>
                <Text style={{ fontSize: 30 }}>{c.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={nl.name}>
                  {c.ad}, {c.yas}
                </Text>
                <Text style={nl.meta}>
                  {c.meslek}
                  {c.unlu ? ' · ⭐ Ünlü' : ''} · Uyum %{c.uyum}
                </Text>
              </View>
              {partner ? <Pill text="SEVGİLİN" icon="heart" color="#e0457b" /> : null}
            </View>
            <Bar value={c.seviye} color="#e0457b" label="İlişki" right={`${c.seviye}/100`} />
            <View style={nl.tiers}>
              {DATE_TIERS.map((t, i) => {
                const cost = i === 3 && yatVar(s) ? 1500 : t.fiyat;
                return (
                  <Pressable key={t.ad} disabled={s.para < cost} onPress={() => act((x) => onMsg(goOnDate(x, c.id, i)))} style={[nl.tier, s.para < cost && { opacity: 0.3 }]}>
                    <Icon name={t.ikon as IconName} size={16} color={C.text} />
                    <Text style={nl.tierText}>{t.ad}</Text>
                    <Text style={nl.tierPrice}>{money(cost)}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {c.seviye >= 30 ? (
                <Pressable onPress={() => act((x) => onMsg(spendNight(x, c.id)))} style={[nl.small, { flex: 1 }]}>
                  <Text style={nl.smallText}>GECEYİ BİRLİKTE GEÇİR</Text>
                </Pressable>
              ) : null}
              {c.seviye >= 70 && !partner ? (
                <Pressable onPress={() => act((x) => onMsg(makePartner(x, c.id)))} style={[nl.small, { flex: 1, backgroundColor: '#e0457b' }]}>
                  <Text style={nl.smallText}>💞 SEVGİLİ OL</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
      <P dim>Tanışma listesi her hafta yenilenir; ilişkin ilerleyenler listede kalır.</P>
    </>
  );
}

export function NightlifeScreen({ s, act }: { s: GameState; act: Act }) {
  const [tab, setTab] = useState<'strip' | 'date'>('date');
  const [msg, setMsg] = useState<string | null>(null);
  const risk = s.gece?.risk ?? 0;
  useEffect(() => {
    if (s.adaylar?.hafta !== s.hafta) act((x) => void candidates(x));
  }, [s.hafta, s.adaylar?.hafta, act]);
  return (
    <Screen footer={<Button label="Kariyere dön" icon="arrow-left" tone="ghost" onPress={() => act((x) => (x.phase = 'hub'))} />}>
      <Title kicker="GECE HAYATI" sub="Kafes dışındaki hayatın. Eğlenceli, pahalı ve riskli.">
        Şehrin Işıkları
      </Title>
      <HealthBanner s={s} act={act} onMsg={setMsg} />
      <View style={nl.riskBox}>
        <Text style={nl.label}>SAĞLIK RİSKİ</Text>
        <Bar value={(risk / 12) * 100} color={risk > 6 ? C.red : risk > 3 ? C.orange : C.green} label="Seviye" right={risk > 6 ? 'YÜKSEK' : risk > 3 ? 'ORTA' : 'DÜŞÜK'} />
        <Text style={nl.meta}>Riskli davranışlar birikir, haftalar geçtikçe azalır. Çok sık gidersen enfeksiyon kapma ihtimalin artar.</Text>
      </View>
      {msg ? (
        <Card accent={C.gold}>
          <P style={{ marginBottom: 0 }}>{msg}</P>
        </Card>
      ) : null}
      <View style={nl.tabs}>
        {(
          [
            ['date', 'RANDEVU', 'heart-multiple'],
            ['strip', 'STRİPTİZ KULÜBÜ', 'glass-cocktail'],
          ] as const
        ).map(([k, l, ic]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[nl.tab, tab === k && nl.tabOn]}>
            <Icon name={ic} size={14} color={tab === k ? '#fff' : C.dim} />
            <Text style={[nl.tabText, tab === k && { color: '#fff' }]}>{l}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => act((x) => { x.phase = 'kumarhane'; enterCasino(x); })} style={nl.tab}>
          <Icon name="cards-playing" size={14} color={C.dim} />
          <Text style={nl.tabText}>KUMARHANE</Text>
        </Pressable>
      </View>
      {tab === 'strip' ? <Strip s={s} act={act} onMsg={setMsg} /> : <Dates s={s} act={act} onMsg={setMsg} />}
    </Screen>
  );
}

const nl = StyleSheet.create({
  alertTitle: { fontFamily: F.display, fontSize: 14, letterSpacing: 1, marginBottom: 6 },
  riskBox: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 12 },
  label: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1.5 },
  meta: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  tab: { flex: 1, flexDirection: 'row', gap: 5, justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: 4, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, transform: [{ skewX: '-8deg' }] },
  tabOn: { backgroundColor: '#b0184f', borderColor: '#b0184f' },
  tabText: { color: C.dim, fontFamily: F.display, fontSize: 11, letterSpacing: 0.6 },
  hero: { borderRadius: R, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#6a1a58' },
  heroTitle: { color: '#ff4fd8', fontFamily: F.display, fontSize: 30, letterSpacing: 3, textShadowColor: '#ff4fd8', textShadowRadius: 12 },
  heroSub: { color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  partner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: R, borderWidth: 1, borderColor: '#e0457b', padding: 12, marginBottom: 6 },
  card: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 10 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#e0457b22', borderWidth: 1, borderColor: '#e0457b', alignItems: 'center', justifyContent: 'center' },
  name: { color: C.text, fontFamily: F.display, fontSize: 18 },
  tiers: { flexDirection: 'row', gap: 6, marginTop: 8 },
  tier: { flex: 1, alignItems: 'center', gap: 2, backgroundColor: C.cardAlt, borderRadius: 6, paddingVertical: 7, borderWidth: 1, borderColor: C.border },
  tierText: { color: C.text, fontFamily: F.semi, fontSize: 10, textAlign: 'center' },
  tierPrice: { color: C.gold, fontFamily: F.display, fontSize: 11 },
  small: { backgroundColor: C.cardAlt, borderRadius: 3, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', transform: [{ skewX: '-8deg' }] },
  smallText: { color: '#fff', fontFamily: F.display, fontSize: 12, letterSpacing: 0.8 },
});
