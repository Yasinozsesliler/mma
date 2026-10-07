// Organizasyonum: kuruluş, kadro, keşif, gece düzenleme (mekân + bilet + otomatik kart) ve gece raporu.
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { money } from '../engine/career';
import { WEIGHT_CLASSES } from '../engine/data';
import {
  BILET,
  buildCard,
  canRunNight,
  expectedCrowd,
  foundCost,
  foundLeague,
  ITIBAR_LABEL,
  leagueNames,
  MEKAN,
  releaseFighter,
  renewFighter,
  rescout,
  rescoutFee,
  runNight,
  signFee,
  signFighter,
  tvLevel,
  type Bilet,
  type LigFighter,
  type MekanId,
} from '../engine/promoter';
import type { GameState } from '../engine/types';
import { buzz } from '../haptics';
import { L, LOC } from '../i18n';
import { Button, Icon, Screen, Section, SLANT, Title, type IconName } from './components';
import type { Act } from './GameScreens';
import { C, F, R } from './theme';

type Tab = 'gece' | 'kadro' | 'kesif' | 'rapor';

function FighterRow({ f, right }: { f: LigFighter; right?: ReactNode }) {
  return (
    <View style={ps.row}>
      <View style={ps.ovr}>
        <Text style={ps.ovrT}>{f.ovr}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ps.name} numberOfLines={1}>
          {f.ad} {f.eski ? <Text style={ps.eski}>{L("ESKİ RAKİBİN")}</Text> : null}
        </Text>
        <Text style={ps.meta}>
          {WEIGHT_CLASSES[f.siklet].ad} · {f.g}-{f.m} · {L("Pop {0}", [f.pop])} · {money(f.ucret)}/{L("maç")}
          {f.kalan > 0 ? ` · ${L("{0} maç kaldı", [f.kalan])}` : ''}
        </Text>
      </View>
      {right}
    </View>
  );
}

export function PromoterScreen({ s, act }: { s: GameState; act: Act }) {
  const [tab, setTab] = useState<Tab>('gece');
  const [mekan, setMekan] = useState<MekanId>('salon');
  const [bilet, setBilet] = useState<Bilet>('normal');
  const [ad, setAd] = useState(() => leagueNames(s)[0]);
  const [msg, setMsg] = useState<string | null>(null);
  const lig = s.lig;
  // Kariyer sürerken yalnızca tanıtım: organizasyon emeklilikte kurulur.
  const emekli = s.pending.sonrakiFaz === 'emeklilik';
  const exit = () => act((x) => (x.phase = emekli ? 'emeklilik' : 'hub'));
  const footer = <Button label={emekli ? L("Emeklilik ekranına dön") : L("Kariyere dön")} icon="arrow-left" tone="ghost" onPress={exit} />;

  if (!emekli) {
    const ozellik: [IconName, string][] = [
      ['account-search', L("Dövüşçü keşfet ve imzala; eski rakiplerin de kapını çalar")],
      ['stadium-variant', L("Mekânı ve bilet fiyatını seç: salondan stadyuma")],
      ['television-classic', L("İtibarını büyüt, yayın anlaşmaları kap")],
      ['chart-box', L("Her gecenin gelir-gider raporu ve Gecenin Performansı")],
    ];
    return (
      <Screen footer={footer}>
        <Title kicker={L("KARİYER SONRASI")} sub={L("Eldivenlerini astığında hikâyen bitmiyor: kendi dövüş organizasyonunu kurup bu sefer afişi sen yazacaksın.")}>
          {L("Organizasyonum")}
        </Title>
        <LinearGradient colors={['#2a1a08', '#0b0c0f']} style={ps.locked}>
          <Icon name="lock-clock" size={30} color={C.gold} />
          <Text style={ps.lockedT}>{L("Emekli olunca açılır")}</Text>
          <Text style={ps.lockedS}>{L("Kariyerin bittiğinde emeklilik ekranında “Kendi organizasyonunu kur” düğmesi çıkar. Kuruluş: {0}.", [money(foundCost())])}</Text>
        </LinearGradient>
        <Section>{L("SENİ NELER BEKLİYOR")}</Section>
        <View style={{ gap: 6 }}>
          {ozellik.map(([ikon, t]) => (
            <View key={t} style={ps.pick}>
              <Icon name={ikon} size={20} color={C.gold} />
              <Text style={[ps.pickT, { flex: 1, color: C.text, fontFamily: F.semi }]}>{t}</Text>
            </View>
          ))}
        </View>
      </Screen>
    );
  }

  if (!lig) {
    const cost = foundCost();
    return (
      <Screen footer={footer}>
        <Title kicker={L("PATRON SENSİN")} sub={L("Kendi dövüş organizasyonunu kur: dövüşçü imzala, gece düzenle, bilet sat, yayın anlaşması yap. Bu sefer afişi sen yazıyorsun.")}>
          {L("Organizasyonum")}
        </Title>
        <Section>{L("ADINI SEÇ")}</Section>
        <View style={{ gap: 6 }}>
          {leagueNames(s).map((n) => (
            <Pressable key={n} onPress={() => setAd(n)} style={[ps.pick, ad === n && ps.pickOn]}>
              <Icon name={ad === n ? 'radiobox-marked' : 'radiobox-blank'} size={18} color={ad === n ? C.gold : C.faint} />
              <Text style={[ps.pickT, ad === n && { color: C.text }]}>{n}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ marginTop: 14 }}>
          <Button
            label={L("Kur · {0}", [money(cost)])}
            icon="office-building"
            tone="gold"
            disabled={s.para < cost}
            onPress={() => {
              buzz('basari');
              act((x) => setMsg(foundLeague(x, ad)));
            }}
          />
          {s.para < cost ? <Text style={ps.warn}>{L("Kuruluş için {0} gerekiyor.", [money(cost)])}</Text> : null}
        </View>
      </Screen>
    );
  }

  const card = buildCard(s, MEKAN[mekan].mac);
  const exp = expectedCrowd(s, mekan, bilet);
  const can = canRunNight(s) && lig.itibar >= MEKAN[mekan].itibar;
  const biten = lig.kadro.filter((f) => f.kalan <= 0);
  const tabs: { k: Tab; ad: string; ikon: IconName }[] = [
    { k: 'gece', ad: L("Gece"), ikon: 'calendar-star' },
    { k: 'kadro', ad: L("Kadro {0}", [lig.kadro.length]), ikon: 'account-group' },
    { k: 'kesif', ad: L("Keşif"), ikon: 'account-search' },
    { k: 'rapor', ad: L("Rapor"), ikon: 'chart-box' },
  ];
  return (
    <Screen footer={footer}>
      <LinearGradient colors={['#2a1a08', '#0b0c0f']} style={ps.hero}>
        <Text style={ps.kicker}>{L("ORGANİZASYONUM")}</Text>
        <Text style={[ps.title, SLANT]}>{lig.ad}</Text>
        <Text style={ps.sub}>
          {ITIBAR_LABEL(lig.itibar)} · {L("{0} gece", [lig.geceler])} · {L("TV seviyesi {0}", [tvLevel(lig.itibar)])}
        </Text>
        <View style={ps.repRow}>
          <Text style={ps.repL}>{L("İTİBAR")}</Text>
          <View style={ps.repTrack}>
            <View style={[ps.repFill, { width: `${lig.itibar}%` }]} />
          </View>
          <Text style={ps.repV}>{lig.itibar}</Text>
        </View>
        <View style={ps.stats}>
          <View style={ps.stat}>
            <Text style={ps.statL}>{L("KASA")}</Text>
            <Text style={ps.statV}>{money(s.para)}</Text>
          </View>
          <View style={ps.stat}>
            <Text style={ps.statL}>{L("TOPLAM KÂR")}</Text>
            <Text style={[ps.statV, { color: lig.toplamKar >= 0 ? C.green : '#ff4d5e' }]}>{money(lig.toplamKar)}</Text>
          </View>
        </View>
      </LinearGradient>
      {msg ? <Text style={ps.msg}>{msg}</Text> : null}
      <View style={ps.tabs}>
        {tabs.map((t) => (
          <Pressable key={t.k} onPress={() => (setTab(t.k), setMsg(null))} style={[ps.tab, tab === t.k && ps.tabOn]}>
            <Icon name={t.ikon} size={16} color={tab === t.k ? C.gold : C.dim} />
            <Text style={[ps.tabT, tab === t.k && { color: C.text }]}>{t.ad}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'gece' ? (
        <>
          <Section>{L("MEKÂN")}</Section>
          <View style={{ gap: 6 }}>
            {(Object.keys(MEKAN) as MekanId[]).map((k) => {
              const m = MEKAN[k];
              const kilit = lig.itibar < m.itibar;
              return (
                <Pressable key={k} disabled={kilit} onPress={() => setMekan(k)} style={[ps.pick, mekan === k && ps.pickOn, kilit && { opacity: 0.45 }]}>
                  <Icon name={(kilit ? 'lock-outline' : m.ikon) as IconName} size={20} color={mekan === k ? C.gold : C.dim} />
                  <View style={{ flex: 1 }}>
                    <Text style={[ps.pickT, mekan === k && { color: C.text }]}>{m.ad()}</Text>
                    <Text style={ps.meta}>{kilit ? L("İtibar {0} gerekli", [m.itibar]) : L("{0} kişi · kira {1} · {2} maç", [m.kap.toLocaleString(LOC), money(m.maliyet), m.mac])}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Section>{L("BİLET FİYATI")}</Section>
          <View style={ps.biletRow}>
            {(Object.keys(BILET) as Bilet[]).map((k) => (
              <Pressable key={k} onPress={() => setBilet(k)} style={[ps.bilet, bilet === k && ps.pickOn]}>
                <Text style={[ps.pickT, bilet === k && { color: C.text }]}>{BILET[k].ad()}</Text>
                <Text style={ps.meta}>${Math.round(BILET[k].fiyat * (1 + lig.itibar / 120))}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={ps.expect}>{L("Beklenen seyirci: ~{0} / {1}", [exp.toLocaleString(LOC), MEKAN[mekan].kap.toLocaleString(LOC)])}</Text>
          <Section>{L("KART · {0} MAÇ", [card.length])}</Section>
          {card.length ? (
            <View style={ps.cardBox}>
              {card.map(([a, b], i) => (
                <View key={a.id} style={[ps.bout, i === 0 && ps.main]}>
                  {i === 0 ? <Text style={ps.mainT}>{L("ANA MAÇ")}</Text> : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={ps.boutN} numberOfLines={1}>
                      {a.ad}
                    </Text>
                    <Text style={ps.vs}>{a.ovr} · {b.ovr}</Text>
                    <Text style={[ps.boutN, { textAlign: 'right' }]} numberOfLines={1}>
                      {b.ad}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={ps.note}>{L("Gece düzenlemek için kontratı süren en az 4 dövüşçü gerekiyor. Keşif sekmesinden imzala.")}</Text>
          )}
          <View style={{ marginTop: 12 }}>
            <Button
              label={L("Geceyi düzenle")}
              icon="party-popper"
              tone="gold"
              disabled={!can}
              onPress={() => {
                buzz('basari');
                act((x) => runNight(x, mekan, bilet));
                setTab('rapor');
              }}
            />
          </View>
        </>
      ) : null}

      {tab === 'kadro' ? (
        <>
          {biten.length ? <Text style={ps.warn}>{L("{0} dövüşçünün kontratı bitti: yenile ya da bırak.", [biten.length])}</Text> : null}
          <View style={{ gap: 6 }}>
            {lig.kadro.length ? (
              lig.kadro.map((f) => (
                <FighterRow
                  key={f.id}
                  f={f}
                  right={
                    f.kalan <= 0 ? (
                      <View style={{ gap: 4 }}>
                        <Pressable onPress={() => act((x) => setMsg(renewFighter(x, f.id)))} style={ps.mini}>
                          <Text style={ps.miniT}>{L("YENİLE")}</Text>
                        </Pressable>
                        <Pressable onPress={() => act((x) => releaseFighter(x, f.id))} style={[ps.mini, { borderColor: C.border }]}>
                          <Text style={[ps.miniT, { color: C.dim }]}>{L("BIRAK")}</Text>
                        </Pressable>
                      </View>
                    ) : null
                  }
                />
              ))
            ) : (
              <Text style={ps.note}>{L("Kadron boş. Keşif sekmesinden dövüşçü imzala.")}</Text>
            )}
          </View>
        </>
      ) : null}

      {tab === 'kesif' ? (
        <>
          <View style={{ gap: 6 }}>
            {lig.aday.map((f) => (
              <FighterRow
                key={f.id}
                f={f}
                right={
                  <Pressable disabled={s.para < signFee(f)} onPress={() => act((x) => setMsg(signFighter(x, f.id)))} style={[ps.mini, s.para < signFee(f) && { opacity: 0.4 }]}>
                    <Text style={ps.miniT}>{L("İMZALA")}</Text>
                    <Text style={ps.miniS}>{money(signFee(f))}</Text>
                  </Pressable>
                }
              />
            ))}
          </View>
          <View style={{ marginTop: 10 }}>
            <Button label={L("Yeni adaylar · {0}", [money(rescoutFee(s))])} icon="refresh" tone="ghost" onPress={() => act((x) => setMsg(rescout(x)))} />
          </View>
          <Text style={ps.note}>{L("İmza parası, maç başı ücretin iki katıdır. Kontrat 4 maç sürer. Her geceden sonra yeni adaylar gelir.")}</Text>
        </>
      ) : null}

      {tab === 'rapor' ? (
        lig.son ? (
          <>
            <LinearGradient colors={lig.son.kar >= 0 ? ['#0f2418', '#0b0c0f'] : ['#2a0f12', '#0b0c0f']} style={ps.report}>
              <Text style={ps.kicker}>{L("{0} · GECE {1}", [lig.ad, lig.son.no])}</Text>
              <Text style={[ps.big, { color: lig.son.kar >= 0 ? C.green : '#ff4d5e' }]}>{`${lig.son.kar >= 0 ? '+' : '-'}${money(Math.abs(lig.son.kar))}`}</Text>
              <Text style={ps.sub}>
                {L("{0} / {1} seyirci · {2}", [lig.son.seyirci.toLocaleString(LOC), lig.son.kapasite.toLocaleString(LOC), MEKAN[lig.son.mekan].ad()])} · {L("İtibar {0}{1}", [lig.son.itibarDelta >= 0 ? '+' : '', lig.son.itibarDelta])}
              </Text>
            </LinearGradient>
            <View style={ps.ledger}>
              {[
                [L("Bilet"), lig.son.bilet$],
                [L("Yayın"), lig.son.tv$],
                [L("Sponsor"), lig.son.sponsor$],
                [L("Mekân"), -lig.son.mekan$],
                [L("Ücretler ve prodüksiyon"), -lig.son.ucret$],
                [L("Gecenin Performansı bonusu"), -lig.son.bonus$],
              ].map(([k, v]) => (
                <View key={String(k)} style={ps.led}>
                  <Text style={ps.ledK}>{k}</Text>
                  <Text style={[ps.ledV, { color: Number(v) >= 0 ? C.green : '#ff4d5e' }]}>{`${Number(v) >= 0 ? '+' : '-'}${money(Math.abs(Number(v)))}`}</Text>
                </View>
              ))}
            </View>
            <Section>{L("SONUÇLAR")}</Section>
            <View style={ps.cardBox}>
              {lig.son.sonuclar.map((r, i) => (
                <View key={i} style={[ps.bout, r.ana && ps.main]}>
                  <Text style={ps.res}>
                    <Text style={{ color: C.text, fontFamily: F.bold }}>{r.kazanan}</Text> {L("yendi")} {r.kaybeden}
                  </Text>
                  <Text style={ps.meta}>{r.yontem === 'KARAR' ? L("Karar") : r.yontem} · R{r.raunt}</Text>
                </View>
              ))}
            </View>
            {lig.son.gecePerf ? <Text style={ps.perf}>{L("⭐ Gecenin Performansı: {0}", [lig.son.gecePerf])}</Text> : null}
          </>
        ) : (
          <Text style={ps.note}>{L("Henüz gece düzenlemedin.")}</Text>
        )
      ) : null}
    </Screen>
  );
}

const ps = StyleSheet.create({
  hero: { marginHorizontal: -16, marginTop: -16, padding: 16, paddingTop: 20, marginBottom: 10 },
  kicker: { color: C.gold, fontFamily: F.display, fontSize: 11, letterSpacing: 3 },
  title: { color: '#fff', fontFamily: F.display, fontSize: 32, marginTop: 2 },
  sub: { color: C.dim, fontFamily: F.semi, fontSize: 12, marginTop: 2 },
  repRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  repL: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1.5 },
  repTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#1f2228', overflow: 'hidden' },
  repFill: { height: 6, borderRadius: 3, backgroundColor: C.gold },
  repV: { color: C.gold, fontFamily: F.display, fontSize: 14 },
  stats: { flexDirection: 'row', marginTop: 10 },
  stat: { flex: 1 },
  statL: { color: C.faint, fontFamily: F.display, fontSize: 9, letterSpacing: 1.2 },
  statV: { color: C.text, fontFamily: F.display, fontSize: 17, marginTop: 2 },
  msg: { color: C.gold, fontFamily: F.semi, fontSize: 13, textAlign: 'center', marginBottom: 8 },
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, borderRadius: R, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  tabOn: { borderColor: C.gold, backgroundColor: '#1d1708' },
  tabT: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12 },
  pickOn: { borderColor: C.gold, backgroundColor: '#1d1708' },
  pickT: { color: C.dim, fontFamily: F.bold, fontSize: 14 },
  locked: { borderRadius: R, borderWidth: 1, borderColor: C.goldDeep, padding: 16, alignItems: 'center', gap: 6, marginBottom: 6 },
  lockedT: { color: C.gold, fontFamily: F.display, fontSize: 18, letterSpacing: 1 },
  lockedS: { color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  warn: { color: C.orange, fontFamily: F.semi, fontSize: 12, textAlign: 'center', marginVertical: 6 },
  meta: { color: C.faint, fontFamily: F.body, fontSize: 11, marginTop: 1 },
  biletRow: { flexDirection: 'row', gap: 6 },
  bilet: { flex: 1, alignItems: 'center', backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, paddingVertical: 10 },
  expect: { color: C.dim, fontFamily: F.semi, fontSize: 12, textAlign: 'center', marginTop: 8 },
  cardBox: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 8, gap: 4 },
  bout: { paddingVertical: 8, paddingHorizontal: 8, borderRadius: 8 },
  main: { borderWidth: 1, borderColor: C.gold, backgroundColor: '#1d1708' },
  mainT: { color: C.gold, fontFamily: F.display, fontSize: 10, letterSpacing: 1.5, marginBottom: 2 },
  boutN: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 13 },
  vs: { color: C.faint, fontFamily: F.display, fontSize: 11, marginHorizontal: 8 },
  note: { color: C.faint, fontFamily: F.body, fontSize: 12, lineHeight: 18, marginTop: 8, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 10 },
  ovr: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#1d1708', borderWidth: 1, borderColor: C.goldDeep, alignItems: 'center', justifyContent: 'center' },
  ovrT: { color: C.gold, fontFamily: F.display, fontSize: 16 },
  name: { color: C.text, fontFamily: F.bold, fontSize: 13 },
  eski: { color: '#c86bff', fontFamily: F.display, fontSize: 9, letterSpacing: 1 },
  mini: { alignItems: 'center', borderWidth: 1.5, borderColor: C.gold, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 8, minWidth: 70 },
  miniT: { color: C.text, fontFamily: F.display, fontSize: 11, letterSpacing: 1 },
  miniS: { color: C.gold, fontFamily: F.semi, fontSize: 10 },
  report: { borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 14, alignItems: 'center' },
  big: { fontFamily: F.display, fontSize: 34, marginTop: 4 },
  ledger: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 4, marginTop: 10 },
  led: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.border },
  ledK: { color: C.dim, fontFamily: F.body, fontSize: 13 },
  ledV: { fontFamily: F.display, fontSize: 13 },
  res: { color: C.dim, fontFamily: F.body, fontSize: 13 },
  perf: { color: C.gold, fontFamily: F.semi, fontSize: 13, textAlign: 'center', marginTop: 10 },
});
