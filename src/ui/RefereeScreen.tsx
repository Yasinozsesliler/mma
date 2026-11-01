// Hakem Modu ekranları: başlangıç (ad + deneme/paket), kariyer merkezi (itibar, terfi, geçmiş, yıl sonu),
// maç (akış, karar anı kartı, raunt sonu puan kartı) ve maç sonu özeti.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { track } from '../analytics';
import { sfx, useSoundScene } from '../audio';
import { BACKGROUNDS } from '../engine/data';
import {
  cardLabel,
  closeYearEnd,
  createRefRun,
  decide,
  finishBout,
  promoteReq,
  REF_TRIAL,
  scoreRound,
  startBout,
  TIER_NAME,
  trialOver,
  YEAR_BOUTS,
  type Card as RefCard,
  type RefBout,
  type RefFighter,
  type RefRun,
} from '../engine/referee';
import { L, LOC } from '../i18n';
import { buy, PURCHASES, restorePurchases, useOwned, usePrice } from '../monetization';
import { REF_SKU } from '../monetization/skus';
import { actRef, setRun, useRefRun } from '../refereeStore';
import { Bar, Button, Card, Icon, Screen, SLANT, Title, type IconName } from './components';
import { C, F, R } from './theme';

export function useRefUnlocked() {
  const owned = useOwned();
  return !PURCHASES || owned.has(REF_SKU);
}

/** Hakem Modu satın alma kutusu. */
export function RefPack({ lead }: { lead?: string }) {
  const price = usePrice(REF_SKU);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  if (!PURCHASES) return null;
  return (
    <LinearGradient colors={['#2a0d10', '#140809']} style={rs.pack}>
      {lead ? <Text style={rs.packLead}>{lead}</Text> : null}
      <Text style={rs.packText}>{L("Tek seferlik alım: sınırsız hakemlik kariyeri, UCC şampiyonluk maçları ve Yılın Hakemi ödülleri.")}</Text>
      <Button
        label={price ? L("Hakem Modu · {0}", [price]) : L("Hakem Modu'nu al")}
        icon="whistle"
        tone="gold"
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          setMsg('');
          const r = await buy(REF_SKU);
          setBusy(false);
          if (r === 'ok') sfx('fanfare');
          else if (r === 'hata') setMsg(L("Satın alma şu an yapılamadı. Biraz sonra tekrar dene."));
        }}
      />
      <Pressable onPress={async () => setMsg((await restorePurchases()) ? L("Satın alımların geri yüklendi.") : L("Bu hesapta satın alma bulunamadı."))} hitSlop={8} style={{ alignSelf: 'center', marginTop: 8 }}>
        <Text style={rs.link}>{L("Satın alımları geri yükle")}</Text>
      </Pressable>
      {msg ? <Text style={rs.packText}>{msg}</Text> : null}
    </LinearGradient>
  );
}

export function RefereeScreen({ onExit }: { onExit: () => void }) {
  const r = useRefRun();
  const unlocked = useRefUnlocked();
  // Paket alındı (ya da geri yüklendi): deneme kalkar
  useEffect(() => {
    if (r?.deneme && unlocked) actRef((x) => (x.deneme = false));
  }, [r?.deneme, unlocked]);
  if (!r) return <RefStart unlocked={unlocked} onExit={onExit} />;
  if (r.aktif) return <BoutView r={r} b={r.aktif} />;
  return <RefHub r={r} unlocked={unlocked} onExit={onExit} />;
}

function RefStart({ unlocked, onExit }: { unlocked: boolean; onExit: () => void }) {
  const [ad, setAd] = useState('');
  const [soyad, setSoyad] = useState('');
  return (
    <Screen
      footer={
        <View style={{ gap: 8 }}>
          <Button
            label={unlocked ? L("Hakemliğe başla") : L("Ücretsiz dene ({0} maç)", [REF_TRIAL])}
            icon="whistle"
            tone="gold"
            onPress={() => {
              track('referee_start', { deneme: unlocked ? 0 : 1 });
              setRun(createRefRun(ad, soyad, !unlocked));
            }}
          />
          <Button label={L("Menüye dön")} icon="arrow-left" tone="ghost" onPress={onExit} />
        </View>
      }
    >
      <LinearGradient colors={['#2a0d10', '#0d0a0b']} style={rs.hero}>
        <Icon name="whistle" size={36} color={C.red} />
        <Text style={[rs.heroTitle, SLANT]}>{L("HAKEM MODU")}</Text>
        <Text style={rs.heroText}>{L("Kafesin içindeki üçüncü kişi sensin. Bir dövüşçünün kariyerini, hatta hayatını korumak senin kararına bağlı.")}</Text>
      </LinearGradient>
      <View style={{ gap: 10, marginVertical: 14 }}>
        {(
          [
            ['hand-back-left', L("Sarsılan dövüşçü, sıkılan kilit, faul, kesik: maçı durdur ya da devam ettir.")],
            ['clipboard-text', L("Her raunt sonunda istatistiklere bakıp puan kartını doldur: 10-9, 10-8, 10-10.")],
            ['eye', L("Refleks değil, okuma: ipuçları gerçeği gösterir; gri anlarda iki karar da kabul edilir.")],
            ['trending-up', L("İtibarını yükselt: amatör gecelerden UCC şampiyonluk maçlarına çık.")],
            ['trophy', L("Her yıl sonu Yılın Hakemi ödülü için yarış.")],
          ] as [IconName, string][]
        ).map(([icon, t]) => (
          <View key={icon} style={rs.bullet}>
            <Icon name={icon} size={18} color={C.red} />
            <Text style={rs.bulletText}>{t}</Text>
          </View>
        ))}
      </View>
      <Text style={rs.label}>{L("HAKEMİN ADI")}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <TextInput value={ad} onChangeText={setAd} placeholder={L("Ad")} placeholderTextColor={C.faint} style={[rs.input, { flex: 1, minWidth: 0, width: 0 }]} maxLength={16} />
        <TextInput value={soyad} onChangeText={setSoyad} placeholder={L("Soyad")} placeholderTextColor={C.faint} style={[rs.input, { flex: 1, minWidth: 0, width: 0 }]} maxLength={18} />
      </View>
      {!unlocked ? <RefPack lead={L("İlk {0} maç ücretsiz.", [REF_TRIAL])} /> : null}
    </Screen>
  );
}

function RefHub({ r, unlocked, onExit }: { r: RefRun; unlocked: boolean; onExit: () => void }) {
  const req = promoteReq(r);
  const kilit = trialOver(r) && !unlocked;
  return (
    <Screen
      footer={
        <View style={{ gap: 8 }}>
          {kilit ? null : (
            <Button
              label={r.son ? L("Sıradaki maç") : L("İlk maçına çık")}
              icon="whistle"
              tone="red"
              onPress={() => {
                track('referee_bout');
                actRef(startBout);
              }}
            />
          )}
          <Button label={L("Menüye dön")} icon="arrow-left" tone="ghost" onPress={onExit} />
        </View>
      }
    >
      <Title kicker={L("🏁 HAKEM · {0}", [TIER_NAME[r.seviye]().toLocaleUpperCase(LOC)])} sub={L("{0} maç · {1} kusursuz · yıl {2}", [r.mac, r.kusursuz, r.yil])}>
        {`${r.ad} ${r.soyad}`.trim()}
      </Title>
      <Card>
        <Bar value={r.itibar} color={r.itibar >= 70 ? C.gold : r.itibar >= 35 ? C.green : C.orange} label={L("İtibar")} right={`${r.itibar}/100`} />
        <Text style={rs.small}>
          {req ? L("Terfi için: itibar {0} ve {1} maç ({2}/{1})", [req[0], req[1], r.mac]) : r.itibar >= 85 ? L("UCC şampiyonluk maçlarına atanabilirsin.") : L("Şampiyonluk maçları için itibar 85.")}
        </Text>
        <Text style={rs.small}>{L("Doğru karar {0} · hatalı karar {1} · bu yıl {2}/{3} maç", [r.dogru, r.yanlis, r.yilMac, YEAR_BOUTS])}</Text>
      </Card>
      {r.yilSonu ? (
        <Card accent={r.yilSonu.odul ? C.gold : undefined}>
          <Text style={rs.kicker}>{L("YIL SONU · {0}. YIL", [r.yilSonu.yil])}</Text>
          <Text style={rs.text}>
            {r.yilSonu.odul ? L("🏆 Yılın Hakemi seçildin! Maç başı ortalama puanın {0}.", [r.yilSonu.ort]) : L("Maç başı ortalama puanın {0}. Yılın Hakemi için 8 gerekiyordu.", [r.yilSonu.ort])}
          </Text>
          <Button label={L("Devam")} tone="ghost" onPress={() => actRef(closeYearEnd)} />
        </Card>
      ) : null}
      {r.son ? <LastBout r={r} /> : null}
      {kilit ? <RefPack lead={L("Deneme bitti. Kafes seni bekliyor:")} /> : null}
      {r.oduller.length ? (
        <Card>
          <Text style={rs.kicker}>{L("ÖDÜLLER")}</Text>
          {r.oduller.map((o, i) => (
            <Text key={i} style={rs.text}>
              🏆 {o}
            </Text>
          ))}
        </Card>
      ) : null}
      {r.gecmis.length ? (
        <Card>
          <Text style={rs.kicker}>{L("SON MAÇLAR")}</Text>
          {r.gecmis.slice(0, 8).map((g, i) => (
            <View key={i} style={rs.hist}>
              <Text style={rs.histName} numberOfLines={1}>
                {g.a.split(' ').slice(-1)[0]} – {g.b.split(' ').slice(-1)[0]}
              </Text>
              <Text style={[rs.histNote, { color: g.puan >= 5 ? C.green : g.puan >= -4 ? C.dim : C.red }]} numberOfLines={1}>
                {g.not}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const KIND_ICON: Record<string, string> = { sarsildi: '💥', kilit: '🔒', faul: '⚠️', kesik: '🩸', durgun: '⏸️' };

function LastBout({ r }: { r: RefRun }) {
  const s = r.son!;
  return (
    <Card accent={s.puan >= 5 ? C.green : s.puan >= -4 ? C.orange : C.red}>
      <Text style={rs.kicker}>{L("SON MAÇ · {0}", [s.sonuc.toLocaleUpperCase(LOC)])}</Text>
      <Text style={[rs.verdict, SLANT, { color: s.puan >= 5 ? C.gold : s.puan >= -4 ? C.text : C.red }]}>{s.not}</Text>
      <Text style={rs.small}>{L("Maç puanın {0} · itibar {1}", [s.puan, s.itibar >= 0 ? `+${s.itibar}` : s.itibar])}</Text>
      {s.terfi ? <Text style={[rs.text, { color: C.gold, fontFamily: F.bold }]}>{L("⬆️ TERFİ! Artık {0} maçlarını yönetiyorsun.", [TIER_NAME[s.terfi]()])}</Text> : null}
      {s.kararlar.map((k, i) => (
        <Text key={i} style={[rs.small, { color: k.puan > 0 ? C.green : k.puan < 0 ? C.red : C.dim }]}>
          {KIND_ICON[k.kind]} {k.not}
        </Text>
      ))}
      {s.kartlar.length ? (
        <Text style={rs.small}>
          {L("Puan kartları: {0}/{1} birebir", [s.kartlar.filter((k) => k.benim === k.dogru).length, s.kartlar.length])}
        </Text>
      ) : null}
    </Card>
  );
}

// ---------- Maç ----------

function BoutView({ r, b }: { r: RefRun; b: RefBout }) {
  useSoundScene('fight');
  const [shown, setShown] = useState(0);
  const [len, setLen] = useState(b.log.length);
  // Log yenilendiğinde (yeni raunt) baştan akar; uzadığında kaldığı yerden devam eder.
  if (b.log.length !== len) {
    setLen(b.log.length);
    if (b.log.length < len) setShown(0);
  }
  useEffect(() => {
    if (shown >= b.log.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), 650);
    return () => clearTimeout(t);
  }, [shown, b.log.length]);
  const ready = shown >= b.log.length;
  return (
    <Screen
      footer={
        ready && b.sonuc ? (
          <Button
            label={L("Maçı bitir")}
            icon="flag-checkered"
            tone="gold"
            onPress={() => {
              actRef(finishBout);
              track('referee_bout_end');
            }}
          />
        ) : !ready ? (
          <Button label={L("Hızlı geç")} icon="fast-forward" tone="ghost" onPress={() => setShown(b.log.length)} />
        ) : undefined
      }
    >
      <View style={rs.vs}>
        <Corner f={b.a} hp={b.hp[0]} color={C.red} />
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text style={rs.round}>{b.sonuc ? L("BİTTİ") : L("R{0}/{1}", [b.raunt, b.maxRaunt])}</Text>
          {b.unvan ? <Text style={rs.title}>{L("ÜNVAN")}</Text> : null}
        </View>
        <Corner f={b.b} hp={b.hp[1]} color={C.blue} right />
      </View>
      <View style={rs.logBox}>
        {b.log.slice(0, shown).slice(-9).map((t, i) => (
          <Text key={`${b.raunt}-${i}-${t}`} style={[rs.logLine, t.startsWith('📋') && { color: C.gold }]}>
            {t}
          </Text>
        ))}
      </View>
      {ready && b.an ? <MomentCard b={b} /> : null}
      {ready && b.kart ? <ScoreCard b={b} /> : null}
    </Screen>
  );
}

function Corner({ f, hp, color, right }: { f: RefFighter; hp: number; color: string; right?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: right ? 'flex-end' : 'flex-start', gap: 2 }}>
      <Text style={[rs.cName, { color }]} numberOfLines={1}>
        {f.ad.split(' ').slice(-1)[0].toLocaleUpperCase(LOC)}
      </Text>
      <Text style={rs.cMeta} numberOfLines={1}>
        {f.rekor} · {BACKGROUNDS[f.stil].ad}
      </Text>
      <View style={rs.hpTrack}>
        <View style={[rs.hpFill, { width: `${Math.max(3, Math.min(100, hp))}%`, backgroundColor: color, alignSelf: right ? 'flex-end' : 'flex-start' }]} />
      </View>
    </View>
  );
}

function MomentCard({ b }: { b: RefBout }) {
  const an = b.an!;
  return (
    <LinearGradient colors={['#2a1a08', '#120d07']} style={rs.moment}>
      <Text style={rs.momentKicker}>
        {KIND_ICON[an.kind]} {L("KARAR ANI")}
      </Text>
      <Text style={rs.momentText}>{an.metin}</Text>
      {an.ipuclari.map((t) => (
        <View key={t} style={rs.clue}>
          <View style={rs.clueDot} />
          <Text style={rs.clueText}>{t}</Text>
        </View>
      ))}
      <View style={{ gap: 8, marginTop: 6 }}>
        {an.secenekler.map((o, i) => (
          <Button key={o.key} label={o.ad} tone={i === 0 ? 'red' : 'ghost'} onPress={() => actRef((x) => x.aktif && decide(x.aktif, o.key))} />
        ))}
      </View>
    </LinearGradient>
  );
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function ScoreCard({ b }: { b: RefBout }) {
  const s = b.stats;
  const rows: [string, string, string][] = [
    [L("Önemli vuruş"), String(s.sig[0]), String(s.sig[1])],
    [L("Takedown"), String(s.td[0]), String(s.td[1])],
    [L("Kontrol süresi"), fmt(s.ctrl[0]), fmt(s.ctrl[1])],
    [L("Knockdown"), String(s.kd[0]), String(s.kd[1])],
  ];
  const cards: RefCard[] = ['10-9a', '10-9b', '10-8a', '10-8b', '10-10'];
  return (
    <View style={rs.score}>
      <Text style={rs.momentKicker}>{L("📋 {0}. RAUNT PUAN KARTI", [b.raunt])}</Text>
      <View style={rs.sRow}>
        <Text style={[rs.sVal, { color: C.red }]}>{b.a.ad.split(' ').slice(-1)[0]}</Text>
        <Text style={rs.sLab} />
        <Text style={[rs.sVal, { color: C.blue }]}>{b.b.ad.split(' ').slice(-1)[0]}</Text>
      </View>
      {rows.map(([lab, x, y]) => (
        <View key={lab} style={rs.sRow}>
          <Text style={rs.sVal}>{x}</Text>
          <Text style={rs.sLab}>{lab}</Text>
          <Text style={rs.sVal}>{y}</Text>
        </View>
      ))}
      <Text style={rs.small}>{L("İpucu: knockdown ve ezici üstünlük 10-8 getirir; yakın rauntta etkili vuruş ve kontrol belirleyicidir.")}</Text>
      <View style={rs.cards}>
        {cards.map((c) => (
          <Pressable key={c} onPress={() => actRef((x) => x.aktif && scoreRound(x.aktif, c))} style={({ pressed }) => [rs.cardBtn, { borderColor: c === '10-10' ? C.border : c.endsWith('a') ? C.red : C.blue }, pressed && { backgroundColor: '#1d1f25' }]}>
            <Text style={[rs.cardBtnT, { color: c === '10-10' ? C.dim : c.endsWith('a') ? C.red : C.blue }]}>{cardLabel(c)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const rs = StyleSheet.create({
  pack: { borderRadius: R + 2, borderWidth: 1, borderColor: '#5a1d24', padding: 14, gap: 8, marginBottom: 10 },
  packLead: { color: C.red, fontFamily: F.bold, fontSize: 14 },
  packText: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  link: { color: C.faint, fontFamily: F.semi, fontSize: 12, textDecorationLine: 'underline' },
  hero: { borderRadius: R + 4, borderWidth: 1, borderColor: '#5a1d24', padding: 16, alignItems: 'center', gap: 6 },
  heroTitle: { color: C.text, fontFamily: F.display, fontSize: 26 },
  heroText: { color: C.dim, fontFamily: F.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  bullet: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bulletText: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  label: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1.5, marginBottom: 4 },
  input: { backgroundColor: '#0d0f13', borderWidth: 1, borderColor: C.border, borderRadius: R, color: C.text, fontFamily: F.semi, fontSize: 15, paddingHorizontal: 12, paddingVertical: 10 },
  kicker: { color: C.gold, fontFamily: F.semi, fontSize: 11, letterSpacing: 1.5, marginBottom: 6 },
  text: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 19, marginBottom: 6 },
  small: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 4 },
  verdict: { fontFamily: F.display, fontSize: 22, marginVertical: 2 },
  hist: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 4, borderTopWidth: 1, borderTopColor: C.border },
  histName: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 12 },
  histNote: { fontFamily: F.semi, fontSize: 12 },
  vs: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  round: { color: C.gold, fontFamily: F.display, fontSize: 16 },
  title: { color: '#111', backgroundColor: C.gold, fontFamily: F.display, fontSize: 10, paddingHorizontal: 6, borderRadius: 3 },
  cName: { fontFamily: F.display, fontSize: 16 },
  cMeta: { color: C.faint, fontFamily: F.body, fontSize: 11 },
  hpTrack: { width: '100%', height: 5, backgroundColor: '#22242b', borderRadius: 3, overflow: 'hidden', marginTop: 3 },
  hpFill: { height: 5, borderRadius: 3 },
  logBox: { backgroundColor: '#0f1014', borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 10, gap: 6, minHeight: 120, marginBottom: 10 },
  logLine: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  moment: { borderRadius: R, borderWidth: 1, borderColor: C.gold + '88', padding: 12, gap: 6 },
  momentKicker: { color: C.gold, fontFamily: F.display, fontSize: 13, letterSpacing: 1.5 },
  momentText: { color: '#fff', fontFamily: F.bold, fontSize: 15, lineHeight: 21 },
  clue: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  clueDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold, marginTop: 7 },
  clueText: { flex: 1, color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  score: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, gap: 4 },
  sRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  sVal: { width: 90, color: C.text, fontFamily: F.bold, fontSize: 14, textAlign: 'center' },
  sLab: { flex: 1, color: C.faint, fontFamily: F.semi, fontSize: 12, textAlign: 'center' },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  cardBtn: { flexGrow: 1, minWidth: '30%', borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  cardBtnT: { fontFamily: F.display, fontSize: 13 },
});
