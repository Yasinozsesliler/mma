import { L, LOC } from '../i18n';
import { FamilyPanel } from './FamilyPanel';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { money } from '../engine/career';
import { breakUp, deck, DATE_TIERS, goOnDate, makePartner, matches, spendNight, STRIP_OPTIONS, stripPrice, treatDisease, unmatch, visitStripClub, yatVar, type Candidate } from '../engine/nightlife';
import { treatmentCost } from '../engine/nightlifeCore';
import type { GameState } from '../engine/types';
import { Bar, Button, Card, Choice, Icon, P, Pill, Screen, SLANT, Title, type IconName } from './components';
import type { Act } from './GameScreens';
import { FighterAvatar } from './FighterAvatar';
import { SwipeDeck, TINDER } from './SwipeDeck';
import { C, F, R } from './theme';

function HealthBanner({ s, act, onMsg }: { s: GameState; act: Act; onMsg: (m: string) => void }) {
  if (!s.hastalik) return null;
  const tedavi = !!s.hastalik.tedaviBitis;
  return (
    <Card accent={tedavi ? C.gold : C.red}>
      <Text style={[nl.alertTitle, { color: tedavi ? C.gold : C.red }]}>{tedavi ? L("💊 TEDAVİ SÜRÜYOR") : L("⚠️ CİNSEL YOLLA BULAŞAN ENFEKSİYON")}</Text>
      <P style={{ marginBottom: 8 }}>
        {tedavi
          ? L("{0} tedavisi {1} hafta içinde bitecek.", [s.hastalik.ad, Math.max(0, s.hastalik.tedaviBitis! - s.hafta)])
          : L("{0}. Tedavi olmazsan sağlığın her hafta düşer, dövüşte kondisyonun ve odağın zayıflar. Maç öncesi sağlık kontrolünde yakalanırsan maçın iptal edilir.", [s.hastalik.ad])}
      </P>
      {!tedavi ? <Button label={L("Tedavi ol ({0})", [money(treatmentCost(s))])} icon="pill" onPress={() => act((x) => onMsg(treatDisease(x)))} /> : null}
    </Card>
  );
}

function Strip({ s, act, onMsg }: { s: GameState; act: Act; onMsg: (m: string) => void }) {
  return (
    <>
      <LinearGradient colors={['#3a0630', '#0b0209']} style={nl.hero}>
        <Text style={[nl.heroTitle, SLANT]}>{L("NEON CLUB")}</Text>
        <Text style={nl.heroSub}>{L("Neon ışıklar, yüksek müzik, pahalı içkiler. Kafanı dağıtır… ama bedeli var.")}</Text>
      </LinearGradient>
      {STRIP_OPTIONS.map((o, i) => (
        <Choice
          key={o.ad}
          icon={o.ikon as IconName}
          label={`${o.ad} · ${money(stripPrice(s, i))}`}
          desc={L("{0}\nMotivasyon +1 · Disiplin riski (kondisyon)", [o.aciklama])}
          tone={i === 1 ? 'red' : 'gold'}
          disabled={s.para < stripPrice(s, i)}
          onPress={() => act((x) => onMsg(visitStripClub(x, i)))}
        />
      ))}
    </>
  );
}

function MatchModal({ s, c, onClose, onDate }: { s: GameState; c: Candidate | null; onClose: () => void; onDate: () => void }) {
  return (
    <Modal visible={!!c} transparent animationType="fade" onRequestClose={onClose}>
      <View style={nl.modalBg}>
        {c ? (
          <View style={nl.modalBox}>
            <Text style={[nl.matchTitle, SLANT]}>{L("EŞLEŞME!")}</Text>
            <Text style={nl.matchSub}>{L("Sen ve")}{' '}{c.ad} {L("birbirinizi beğendiniz.")}</Text>
            <View style={nl.matchPics}>
              <View style={[nl.matchPic, { transform: [{ rotate: '-8deg' }] }]}>
                <FighterAvatar look={s.fighter.gorunum} size={104} ring="#fff" />
              </View>
              <LinearGradient colors={c.renk ?? TINDER} style={[nl.matchPic, nl.matchEmoji, { transform: [{ rotate: '8deg' }] }]}>
                <Text style={{ fontSize: 64 }}>{c.foto ?? c.emoji}</Text>
              </LinearGradient>
            </View>
            <Pressable onPress={onDate}>
              <LinearGradient colors={TINDER} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={nl.matchBtn}>
                <Icon name="calendar-heart" size={18} color="#fff" />
                <Text style={nl.matchBtnText}>{L("RANDEVU PLANLA")}</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={onClose} style={[nl.matchBtn, nl.matchGhost]}>
              <Text style={nl.matchBtnText}>{L("KAYDIRMAYA DEVAM ET")}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function BreakUpButton({ act, onMsg, ad, flex, evli }: { act: Act; onMsg: (m: string) => void; ad: string; flex?: boolean; evli?: boolean }) {
  const [sure, setSure] = useState(false);
  if (!sure)
    return (
      <Pressable onPress={() => setSure(true)} style={[nl.small, nl.breakBtn, flex && { flex: 1 }]}>
        <Text style={nl.smallText}>{evli ? L("💔 BOŞAN") : L("💔 AYRIL")}</Text>
      </Pressable>
    );
  return (
    <View style={[nl.confirm, flex && { flex: 1 }]}>
      <Text style={nl.confirmText}>{evli ? L("{0} ile boşanmak istediğine emin misin? Servetinin %30'u gider. (Motivasyon -2)", [ad]) : `${ad} ${L("ile ayrılmak istediğine emin misin? (Motivasyon -1)")}`}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={() => setSure(false)} style={[nl.small, { flex: 1 }]}>
          <Text style={nl.smallText}>{L("VAZGEÇ")}</Text>
        </Pressable>
        <Pressable onPress={() => act((x) => onMsg(breakUp(x)))} style={[nl.small, nl.breakBtn, { flex: 1 }]}>
          <Text style={nl.smallText}>{L("EVET, AYRIL")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MatchCard({ s, act, onMsg, c }: { s: GameState; act: Act; onMsg: (m: string) => void; c: Candidate }) {
  const partner = s.iliski?.id === c.id;
  return (
    <View style={[nl.card, partner && { borderColor: '#e0457b' }]}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <LinearGradient colors={c.renk ?? TINDER} style={nl.avatar}>
          <Text style={{ fontSize: 28 }}>{c.foto ?? c.emoji}</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={nl.name}>
            {c.ad}, {c.yas}
          </Text>
          <Text style={nl.meta}>
            {c.meslek}
            {c.unlu ? L(" · ⭐ Ünlü") : ''} {L("· Uyum %")}{c.uyum}
          </Text>
        </View>
        {partner ? (
          <Pill text={L("SEVGİLİN")} icon="heart" color="#e0457b" />
        ) : (
          <Pressable onPress={() => act((x) => onMsg(unmatch(x, c.id)))} hitSlop={8}>
            <Icon name="close-circle-outline" size={22} color={C.faint} />
          </Pressable>
        )}
      </View>
      {c.bio ? <Text style={[nl.meta, { marginTop: 6, fontStyle: 'italic' }]}>“{c.bio}”</Text> : null}
      <Bar value={c.seviye} color="#e0457b" label={L("İlişki")} right={`${c.seviye}/100`} />
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
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {c.seviye >= 30 ? (
          <Pressable onPress={() => act((x) => onMsg(spendNight(x, c.id)))} style={[nl.small, { flex: 1 }]}>
            <Text style={nl.smallText}>{L("ŞEHİRDE GECE GEZMESİ")}</Text>
          </Pressable>
        ) : null}
        {partner ? <BreakUpButton act={act} onMsg={onMsg} ad={c.ad} flex /> : null}
        {c.seviye >= 70 && !partner ? (
          <Pressable onPress={() => act((x) => onMsg(makePartner(x, c.id)))} style={[nl.small, { flex: 1, backgroundColor: '#e0457b' }]}>
            <Text style={nl.smallText}>{L("💞 SEVGİLİ OL")}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Dates({ s, act, onMsg }: { s: GameState; act: Act; onMsg: (m: string) => void }) {
  const [sub, setSub] = useState<'kesfet' | 'eslesme'>('kesfet');
  const [match, setMatch] = useState<Candidate | null>(null);
  const list = matches(s);
  const sorted = [...list].sort((a, b) => (b.id === s.iliski?.id ? 1 : 0) - (a.id === s.iliski?.id ? 1 : 0) || b.seviye - a.seviye);
  return (
    <>
      {s.iliski ? (
        <LinearGradient colors={['#3a0a1c', '#12060a']} style={nl.partner}>
          <Text style={{ fontSize: 38 }}>{s.iliski.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={nl.label}>{s.iliski.durum === 'evli' ? L("EŞİN") : L("SEVGİLİN")}</Text>
            <Text style={[nl.name, SLANT]}>💞 {s.iliski.ad.toLocaleUpperCase(LOC)}</Text>
            <Text style={nl.meta}>{s.iliski.meslek} {L("· Kamp motivasyonu +1. Başkalarıyla görüşürsen yakalanabilirsin.")}</Text>
          </View>
        </LinearGradient>
      ) : null}
      <FamilyPanel s={s} act={act} onMsg={onMsg} />
      {s.iliski ? (
        <View style={{ marginBottom: 8 }}>
          <BreakUpButton act={act} onMsg={onMsg} ad={s.iliski.ad} evli={s.iliski.durum === 'evli'} />
        </View>
      ) : null}
      <View style={nl.appHead}>
        <LinearGradient colors={TINDER} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={nl.appLogo}>
          <Icon name="fire" size={20} color="#fff" />
        </LinearGradient>
        <Text style={nl.appName}>{L("kıvılcım")}</Text>
        <View style={nl.segment}>
          {(
            [
              ['kesfet', L("KEŞFET")],
              ['eslesme', L("EŞLEŞMELER{0}", [list.length ? ` (${list.length})` : ''])],
            ] as const
          ).map(([k, l]) => (
            <Pressable key={k} onPress={() => setSub(k)} style={[nl.segBtn, sub === k && nl.segOn]}>
              <Text style={[nl.segText, sub === k && { color: '#fff' }]}>{l}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {sub === 'kesfet' ? (
        <SwipeDeck s={s} act={act} onMatch={setMatch} />
      ) : sorted.length ? (
        sorted.map((c) => <MatchCard key={c.id} s={s} act={act} onMsg={onMsg} c={c} />)
      ) : (
        <Card>
          <P dim style={{ marginBottom: 0 }}>
            
            {L("Henüz eşleşmen yok. KEŞFET’te sağa kaydır; karşı taraf da seni beğenirse eşleşirsiniz.")}
          </P>
        </Card>
      )}
      <MatchModal
        s={s}
        c={match}
        onClose={() => setMatch(null)}
        onDate={() => {
          setMatch(null);
          setSub('eslesme');
        }}
      />
    </>
  );
}

export function NightlifeScreen({ s, act }: { s: GameState; act: Act }) {
  const [tab, setTab] = useState<'strip' | 'date'>('date');
  const [msg, setMsg] = useState<string | null>(null);
  const risk = s.gece?.risk ?? 0;
  useEffect(() => {
    if (s.adaylar?.hafta !== s.hafta) act((x) => void deck(x));
  }, [s.hafta, s.adaylar?.hafta, act]);
  return (
    <Screen footer={<Button label={L("Kariyere dön")} icon="arrow-left" tone="ghost" onPress={() => act((x) => (x.phase = 'hub'))} />}>
      <Title art="sehir" kicker={L("GECE HAYATI")} sub={L("Kafes dışındaki hayatın. Eğlenceli, pahalı ve riskli.")}>
        
        {L("Şehrin Işıkları")}
      </Title>
      <HealthBanner s={s} act={act} onMsg={setMsg} />
      <View style={nl.riskBox}>
        <Text style={nl.label}>{L("SAĞLIK RİSKİ")}</Text>
        <Bar value={(risk / 12) * 100} color={risk > 6 ? C.red : risk > 3 ? C.orange : C.green} label={L("Seviye")} right={risk > 6 ? L("YÜKSEK") : risk > 3 ? L('ORTA') : L("DÜŞÜK")} />
        <Text style={nl.meta}>{L("Uykusuz geceler birikir, haftalar geçtikçe azalır. Çok sık çıkarsan hastalanma ihtimalin artar.")}</Text>
      </View>
      {msg ? (
        <Card accent={C.gold}>
          <P style={{ marginBottom: 0 }}>{msg}</P>
        </Card>
      ) : null}
      <View style={nl.tabs}>
        {(
          [
            ['date', L("RANDEVU"), 'heart-multiple'],
            ['strip', L("GECE KULÜBÜ"), 'glass-cocktail'],
          ] as const
        ).map(([k, l, ic]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[nl.tab, tab === k && nl.tabOn]}>
            <Icon name={ic} size={14} color={tab === k ? '#fff' : C.dim} />
            <Text style={[nl.tabText, tab === k && { color: '#fff' }]}>{l}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => act((x) => (x.phase = 'kumarhane'))} style={nl.tab}>
          <Icon name="bullseye-arrow" size={14} color={C.dim} />
          <Text style={nl.tabText}>{L("OYUN SALONU")}</Text>
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
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  name: { color: C.text, fontFamily: F.display, fontSize: 18 },
  tiers: { flexDirection: 'row', gap: 6, marginTop: 8 },
  tier: { flex: 1, alignItems: 'center', gap: 2, backgroundColor: C.cardAlt, borderRadius: 6, paddingVertical: 7, borderWidth: 1, borderColor: C.border },
  tierText: { color: C.text, fontFamily: F.semi, fontSize: 10, textAlign: 'center' },
  tierPrice: { color: C.gold, fontFamily: F.display, fontSize: 11 },
  small: { backgroundColor: C.cardAlt, borderRadius: 3, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', transform: [{ skewX: '-8deg' }] },
  appHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 12 },
  appLogo: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  appName: { color: '#ff5a5f', fontFamily: F.black, fontSize: 22, letterSpacing: -0.5 },
  segment: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  segBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  segOn: { backgroundColor: '#fd267a', borderColor: '#fd267a' },
  segText: { color: C.dim, fontFamily: F.display, fontSize: 11, letterSpacing: 0.6 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalBox: { width: '100%', maxWidth: 420, alignItems: 'center' },
  matchTitle: { color: '#fff', fontFamily: F.display, fontSize: 58, letterSpacing: 2, textShadowColor: '#fd267a', textShadowRadius: 22 },
  matchSub: { color: '#eee', fontFamily: F.semi, fontSize: 15, marginBottom: 22 },
  matchPics: { flexDirection: 'row', gap: 0, marginBottom: 30 },
  matchPic: { width: 124, height: 124, borderRadius: 62, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', backgroundColor: '#15161a', marginHorizontal: -6, overflow: 'hidden' },
  matchEmoji: {},
  matchBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', width: 300, paddingVertical: 14, borderRadius: 30, marginBottom: 10 },
  matchGhost: { borderWidth: 1.5, borderColor: '#fff' },
  matchBtnText: { color: '#fff', fontFamily: F.display, fontSize: 15, letterSpacing: 1.2 },
  breakBtn: { backgroundColor: '#5a0f22', borderWidth: 1, borderColor: '#e0457b' },
  confirm: { backgroundColor: '#1a0710', borderRadius: 8, borderWidth: 1, borderColor: '#e0457b', padding: 10, gap: 8 },
  confirmText: { color: C.text, fontFamily: F.semi, fontSize: 13, lineHeight: 18 },
  smallText: { color: '#fff', fontFamily: F.display, fontSize: 12, letterSpacing: 0.8 },
});
