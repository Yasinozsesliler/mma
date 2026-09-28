import { L, LANG, LANGS, LOC } from '../i18n';
import { setLang } from '../i18n/boot';
import { setSoundSettings, useSoundSettings } from '../audio';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { STAGE_LABELS } from '../engine/career';
import { WEIGHT_CLASSES } from '../engine/data';
import { slotsFor, type Slot } from '../storage';
import { PremiumCard } from './PremiumCard';
import { DailyCard } from './DailyCard';
import { adPrivacyRequired, showAdPrivacyOptions, usePremium } from '../monetization';
import { privacyUrl } from '../appConfig';
import { FighterAvatar } from './FighterAvatar';
import { BACKGROUNDS } from '../engine/data';
import type { Background, GameState } from '../engine/types';
import { Button, Card, Icon, Logo, Pill, Screen, Section, SLANT, upName, type IconName } from './components';
import { useOfflineStatus } from './offline';
import { C, F, R } from './theme';

const GUIDE: { baslik: string; icon: IconName; icerik: string[] }[] = [
  {
    baslik: L("Karakterini Nasıl Kurarsın?"),
    icon: 'account-star',
    icerik: [
      L("🌍 Uyruk: Antrenman imkânı başlangıç istatistiklerini, taraftar desteği başlangıç popülerliğini belirler. İlk salonun ve hocan da ülkene göre gelir."),
      L("🎂 Yaş (18-30): Genç başlarsan ham ama hızlı gelişirsin (×1.3). Yaşlı başlarsan güçlü başlarsın ama 32’den sonra hız ve çene düşmeye başlar. 41’de emeklilik kaçınılmazdır."),
      L("⚖️ Sıklet: Hafif sıkletler hızlı ve dayanıklıdır, ağır sıkletler sert vurur ama çabuk yorulur."),
      L("🥋 Branş: En önemli seçim. Güçlü ve zayıf yönlerini, dolayısıyla nasıl dövüşeceğini belirler."),
      L("📖 Hikâye: Kendin yazabilir ya da oyuna yazdırabilirsin."),
      L("🎲 Zar: Son adımda istatistiklerin zarla belirlenir. Beğenmezsen 2 kez yeniden atabilirsin."),
    ],
  },
  {
    baslik: L("Gelişim Puanı"),
    icon: 'star-four-points',
    icerik: [
      L("Kariyere 3 puanla başlarsın. Her antrenman kampı 1-3 puan verir (yoğunluk, yaş, kamp yeri, hoca ve kadro kalitesine bağlı). Kampın odak alanı ayrıca +1-3 gelişir."),
      L("Dövüşler de puan verir: galibiyet 2, bitiriş +1, bonus +1, kemer +1. Mağlubiyet ve beraberlik 1 puan."),
      L("📅 Bir dövüş döngüsü (kamp + toparlanma) yaklaşık 90-100 gün sürer. Yılda 3-4 kez dövüşürsün; her karar önemli."),
      L("Puanı istediğin istatistiğe harcarsın. 50’ye kadar +1 için 1 puan, 70’e kadar 2, 85’e kadar 3, sonrası 4 puan gerekir."),
      L("Kamp sonunda tartıdan önce, dövüş sonrasında ya da Kariyer ekranındaki GELİŞİM sekmesinden harcayabilirsin."),
    ],
  },
  {
    baslik: L("Nasıl Oynanır?"),
    icon: 'gamepad-variant',
    icerik: [
      L("1️⃣ Rakip seç. Bölgesel aşamada sen seçersin, büyük organizasyonlarda rakibi organizasyon dayatır."),
      L("2️⃣ Kamp: odak alanı, oyun planı, yoğunluk, kilo verme ve basın toplantısı. Oyun planı rakibin zaafına denk gelirse kafeste büyük avantaj sağlar."),
      L("3️⃣ Dövüş: her raunt taktik seçersin. Kritik anlarda (rakip sarsıldı, submission yakalandı) hızlı karar verirsin."),
      L("4️⃣ Sonrası: bonuslar, röportaj, sıralama, kontrat teklifleri ve dövüşler arası olaylar."),
      L("🏆 Yol: Amatör → Bölgesel (CFC, Hexagon) → Büyük (PFC, ZEN, VIP) → DWCS veya kısa haber → UCC kemeri."),
    ],
  },
];

function Collapsible({ baslik, icon, children, open, onToggle }: { baslik: string; icon: IconName; children: ReactNode; open: boolean; onToggle: () => void }) {
  return (
    <Card style={{ padding: 0 }}>
      <Pressable onPress={onToggle} style={ms.collHead}>
        <View style={ms.collIcon}>
          <Icon name={icon} size={18} color={C.gold} />
        </View>
        <Text style={ms.collTitle}>{baslik}</Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={22} color={C.faint} />
      </Pressable>
      {open ? <View style={ms.collBody}>{children}</View> : null}
    </Card>
  );
}


function SlotCard({ n, save, active, onNew, onContinue, onDelete }: { n: Slot; save: GameState | null; active: boolean; onNew: () => void; onContinue: () => void; onDelete: () => void }) {
  const [sure, setSure] = useState(false);
  if (!save)
    return (
      <Pressable onPress={onNew} style={({ pressed }) => [ms.slotEmpty, pressed && { borderColor: C.red }]}>
        <Text style={ms.slotNo}>YUVA {n}</Text>
        <Icon name="plus-circle-outline" size={30} color={C.faint} />
        <Text style={ms.emptyTitle}>{L("BOŞ YUVA")}</Text>
        <Text style={ms.emptySub}>{L("Yeni bir kariyere başla")}</Text>
      </Pressable>
    );
  const f = save.fighter;
  const retired = save.phase === 'emeklilik';
  const pro = save.stage !== 'amator';
  const r = pro ? save.rekor : save.amator;
  const belts = (save.kemerler ?? []).filter((b) => b.aktif).length;
  return (
    <LinearGradient colors={active ? ['#2a0a10', '#0e0f12'] : ['#121317', '#0b0c0e']} style={[ms.slot, active && { borderColor: C.red }]}>
      <View style={ms.slotHead}>
        <Text style={ms.slotNo}>YUVA {n}{active ? L(" · SON OYNANAN") : ''}</Text>
        {retired ? <Pill text={L("EMEKLİ")} icon="flag-checkered" color={C.faint} /> : null}
      </View>
      <View style={ms.slotBody}>
        <FighterAvatar look={f.gorunum} size={62} ring={belts ? C.gold : active ? C.red : '#3a3d45'} />
        <View style={{ flex: 1 }}>
          {f.lakap ? <Text style={ms.slotNick}>“{f.lakap.toLocaleUpperCase(LOC)}”</Text> : null}
          <Text style={[ms.slotName, SLANT]} numberOfLines={1}>
            {upName(`${f.ad} ${f.soyad}`, f.uyruk)}
          </Text>
          <Text style={ms.slotMeta} numberOfLines={1}>
            {f.yas} {L("yaş ·")}{' '}{WEIGHT_CLASSES[f.siklet].ad} · {STAGE_LABELS[save.stage].replace(/^Aşama \d · /, '')}
          </Text>
          <Text style={ms.slotRec}>
            {pro ? '' : L("Amatör ")}
            {r.g}-{r.m}-{r.b}
            {belts ? `  ·  🏆 ${belts}` : ''}
          </Text>
        </View>
      </View>
      {sure ? (
        <View style={ms.confirm}>
          <Text style={ms.confirmText}>{L("Bu kariyer kalıcı olarak silinecek. Emin misin?")}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => setSure(false)} style={[ms.smallBtn, { flex: 1 }]}>
              <Text style={ms.smallText}>{L("VAZGEÇ")}</Text>
            </Pressable>
            <Pressable onPress={onDelete} style={[ms.smallBtn, { flex: 1, backgroundColor: '#5a0f16', borderColor: C.red }]}>
              <Text style={ms.smallText}>{L("EVET, SİL")}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={ms.slotActions}>
          {retired ? (
            <Pressable onPress={onNew} style={[ms.mainBtn, { backgroundColor: C.red }]}>
              <Icon name="plus" size={16} color="#fff" />
              <Text style={ms.mainText}>{L("YENİ KARİYER")}</Text>
            </Pressable>
          ) : (
            <Pressable onPress={onContinue} style={[ms.mainBtn, { backgroundColor: active ? C.gold : C.red }]}>
              <Icon name="play" size={16} color={active ? '#000' : '#fff'} />
              <Text style={[ms.mainText, active && { color: '#000' }]}>{L("DEVAM ET")}</Text>
            </Pressable>
          )}
          <Pressable onPress={() => setSure(true)} style={ms.delBtn} hitSlop={6}>
            <Icon name="trash-can-outline" size={18} color={C.faint} />
          </Pressable>
        </View>
      )}
    </LinearGradient>
  );
}

export function MenuScreen({
  saves,
  active,
  onNew,
  onContinue,
  onDelete,
  onDaily,
}: {
  saves: (GameState | null)[];
  active: Slot;
  onNew: (slot: Slot) => void;
  onContinue: (slot: Slot) => void;
  onDelete: (slot: Slot) => void;
  onDaily: () => void;
}) {
  const any = saves.some(Boolean);
  const [open, setOpen] = useState<number | null>(any ? null : 0);
  const off = useOfflineStatus();
  const cur = saves[active - 1];
  const canContinue = !!cur && cur.phase !== 'emeklilik';
  const premium = usePremium();
  const SLOTS = slotsFor(premium);
  const firstEmpty = SLOTS.find((x) => !saves[x - 1]);
  const ses = useSoundSettings();
  return (
    <Screen
      footer={
        canContinue ? (
          <Button label={L("Devam et · {0} {1}", [cur!.fighter.ad, cur!.fighter.soyad])} icon="play" tone="gold" onPress={() => onContinue(active)} />
        ) : firstEmpty ? (
          <Button label={L("Yeni kariyer")} icon="plus" onPress={() => onNew(firstEmpty)} />
        ) : undefined
      }
    >
      <LinearGradient colors={['#3b0d14', 'rgba(10,11,14,0)']} style={ms.hero}>
        <Logo size={96} />
        <Text style={ms.brand}>{L("Y O L")}</Text>
        <Text style={ms.heroTitle}>{L("KAFESTEN KEMERE")}</Text>
        <Text style={ms.heroSub}>{L("Sıfırdan UCC şampiyonluğuna. Her karar senin.")}</Text>
        {off ? (
          <View style={[ms.off, { borderColor: (off.durum === 'hazir' ? C.green : C.gold) + '66' }]}>
            <Icon name={off.durum === 'hazir' ? 'cloud-check' : 'cloud-download'} size={14} color={off.durum === 'hazir' ? C.green : C.gold} />
            <Text style={[ms.offText, { color: off.durum === 'hazir' ? C.green : C.gold }]}>
              {off.durum === 'hazir'
                ? L("Çevrimdışı oynamaya hazır · sürüm {0}", [off.surum])
                : off.durum === 'guncelleniyor'
                  ? L("Yeni sürüm indiriliyor… uygulamayı kapatma")
                  : L("Çevrimdışı için indiriliyor{0}", [off.toplam ? ` (${off.toplam - (off.eksik ?? 0)}/${off.toplam})` : '…'])}
            </Text>
          </View>
        ) : null}
      </LinearGradient>

      <View style={ms.langRow}>
        {LANGS.map((l) => {
          const on = l.id === LANG;
          return (
            <Pressable
              key={l.id}
              disabled={on || !l.hazir}
              onPress={() => setLang(l.id)}
              style={[ms.lang, on && ms.langOn, !l.hazir && { opacity: 0.4 }]}
            >
              <Text style={ms.langFlag}>{l.bayrak}</Text>
              <Text style={[ms.langText, on && { color: C.gold }]}>{l.hazir ? l.ad : L("yakında")}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={ms.langRow}>
        {(
          [
            ['muzik', 'music', L("Müzik")],
            ['efekt', 'volume-high', L("Efektler")],
          ] as const
        ).map(([k, icon, ad]) => {
          const on = ses[k];
          return (
            <Pressable key={k} onPress={() => setSoundSettings({ [k]: !on })} style={[ms.lang, on && ms.langOn]}>
              <Icon name={on ? icon : k === 'muzik' ? 'music-off' : 'volume-off'} size={14} color={on ? C.gold : C.faint} />
              <Text style={[ms.langText, on && { color: C.gold }]}>
                {ad} · {on ? L("AÇIK") : L("KAPALI")}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <DailyCard onPress={onDaily} />

      <Section>{L("KARİYER YUVALARI")}</Section>
      {SLOTS.map((x) => (
        <SlotCard key={x} n={x} save={saves[x - 1]} active={x === active && !!saves[x - 1]} onNew={() => onNew(x)} onContinue={() => onContinue(x)} onDelete={() => onDelete(x)} />
      ))}
      {!any ? (
        <Card>
          <Text style={ms.intro}>{L("Saat gece 02:14. Şehrin kenarında, tabelasının yarısı yanmayan bir spor salonu var.")}</Text>
          <Text style={ms.intro}>{L("İçeride tek bir ampul yanıyor. Duvarda solmuş bir poster var: sekizgen bir kafes ve havaya kaldırılmış altın bir kemer.")}</Text>
          <Text style={[ms.intro, { color: C.gold, fontStyle: 'italic' }]}>{L("“Herkes kemeri ister. Pek azı yolu yürür.”")}</Text>
          <Text style={[ms.intro, { color: C.text, fontFamily: F.bold, marginBottom: 0 }]}>{L("Bu senin hikâyen. Her yumruk, her karar, her hata senin.")}</Text>
        </Card>
      ) : null}

      <PremiumCard />

      <Section>{L("REHBER")}</Section>
      {GUIDE.map((g, i) => (
        <Collapsible key={g.baslik} baslik={g.baslik} icon={g.icon} open={open === i} onToggle={() => setOpen(open === i ? null : i)}>
          {g.icerik.map((l, j) => (
            <Text key={j} style={ms.guide}>
              {l}
            </Text>
          ))}
        </Collapsible>
      ))}
      <Collapsible baslik={L("Branşlar")} icon="karate" open={open === 99} onToggle={() => setOpen(open === 99 ? null : 99)}>
        {(Object.keys(BACKGROUNDS) as Background[]).map((b) => {
          const info = BACKGROUNDS[b];
          const zc = info.zorluk === L("Kolay") ? C.green : info.zorluk === L("Orta") ? C.gold : C.red;
          return (
            <View key={b} style={ms.branch}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={ms.branchTitle}>
                  {info.ikon} {info.ad}
                </Text>
                <Pill text={info.zorluk} color={zc} />
              </View>
              <Text style={ms.guide}>✅ {info.guclu}</Text>
              <Text style={[ms.guide, { marginBottom: 0 }]}>❌ {info.zayif}</Text>
            </View>
          );
        })}
      </Collapsible>

      <View style={ms.legal}>
        {privacyUrl(Platform.OS === 'web') ? (
          <Pressable onPress={() => void Linking.openURL(privacyUrl(Platform.OS === 'web')!)} hitSlop={8}>
            <Text style={ms.legalText}>{L("Gizlilik politikası")}</Text>
          </Pressable>
        ) : null}
        {adPrivacyRequired() ? (
          <Pressable onPress={() => void showAdPrivacyOptions()} hitSlop={8}>
            <Text style={ms.legalText}>{L("Reklam gizlilik ayarları")}</Text>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}

const ms = StyleSheet.create({
  legal: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 18 },
  legalText: { color: C.faint, fontFamily: F.semi, fontSize: 12, textDecorationLine: 'underline' },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: 6 },
  lang: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: C.card },
  langOn: { borderColor: C.gold },
  langFlag: { fontSize: 14 },
  langText: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  hero: { alignItems: 'center', paddingTop: 28, paddingBottom: 20, marginHorizontal: -16, marginTop: -16, marginBottom: 8 },
  brand: { color: C.red, fontFamily: F.display, fontSize: 14, letterSpacing: 6, marginTop: 14 },
  heroTitle: { color: C.text, fontFamily: F.display, fontSize: 42, letterSpacing: 1, lineHeight: 48, textAlign: 'center' },
  heroSub: { color: C.dim, fontFamily: F.body, fontSize: 14, marginTop: 4, textAlign: 'center' },
  off: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  offText: { fontFamily: F.semi, fontSize: 11 },
  slot: { borderRadius: R + 2, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 10 },
  slotEmpty: { borderRadius: R + 2, borderWidth: 1, borderStyle: 'dashed', borderColor: '#3a3d45', padding: 16, marginBottom: 10, alignItems: 'center', gap: 4, backgroundColor: '#0a0b0d' },
  slotHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  slotNo: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 2, alignSelf: 'flex-start' },
  slotBody: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  slotNick: { color: C.gold, fontFamily: F.displayMed, fontSize: 11, letterSpacing: 1 },
  slotName: { color: C.text, fontFamily: F.display, fontSize: 20, lineHeight: 24 },
  slotMeta: { color: C.dim, fontFamily: F.body, fontSize: 12 },
  slotRec: { color: C.text, fontFamily: F.display, fontSize: 15, marginTop: 2, letterSpacing: 0.5 },
  slotActions: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' },
  mainBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 4, transform: [{ skewX: '-8deg' }] },
  mainText: { color: '#fff', fontFamily: F.display, fontSize: 14, letterSpacing: 1.2 },
  delBtn: { width: 44, height: 42, borderRadius: 4, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: C.dim, fontFamily: F.display, fontSize: 16, letterSpacing: 1.5 },
  emptySub: { color: C.faint, fontFamily: F.body, fontSize: 12 },
  confirm: { marginTop: 12, gap: 8 },
  confirmText: { color: C.text, fontFamily: F.semi, fontSize: 13 },
  smallBtn: { alignItems: 'center', paddingVertical: 10, borderRadius: 4, borderWidth: 1, borderColor: C.border, backgroundColor: C.cardAlt },
  smallText: { color: '#fff', fontFamily: F.display, fontSize: 12, letterSpacing: 1 },
  intro: { color: C.dim, fontFamily: F.body, fontSize: 15, lineHeight: 23, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 6 },
  line: { flex: 1, color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  warn: { color: C.faint, fontFamily: F.body, fontSize: 12, textAlign: 'center' },
  collHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  collIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.gold + '18', borderWidth: 1, borderColor: C.gold + '44', alignItems: 'center', justifyContent: 'center' },
  collTitle: { flex: 1, color: C.text, fontFamily: F.display, fontSize: 17, letterSpacing: 0.5, textTransform: 'uppercase' },
  collBody: { paddingHorizontal: 14, paddingBottom: 12 },
  guide: { color: C.dim, fontFamily: F.body, fontSize: 14, lineHeight: 21, marginBottom: 6 },
  branch: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border },
  branchTitle: { color: C.text, fontFamily: F.bold, fontSize: 15 },
});
