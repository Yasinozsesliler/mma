import { L, LANG, LANGS, LOC } from '../i18n';
import { ChallengeList } from './ChallengeList';
import type { ChallengeId } from '../engine/challenges';
import { useCosmetics, useFrame } from '../cosmetics';
import { ExportButton, FeedbackRow, ImportCard } from './CareerTransfer';
import { setAnnouncer, useAnnouncer } from '../announcer';
import { setHaptics, useHaptics } from '../haptics';
import { setQte, useQte } from '../qtePref';
import { setLive, useLive } from '../livePref';
import { setLowPerf, useLowPerf } from '../perfPref';
import { setLang } from '../i18n/boot';
import { setSoundSettings, useSoundSettings } from '../audio';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, LinearGradient as SvgLinear, Polygon, RadialGradient, Stop } from 'react-native-svg';
import { useCompletedChallenges } from '../challengePrefs';
import { CHALLENGES } from '../engine/challenges';
import { dayNumber, liveStreak } from '../engine/daily';
import { loadDaily } from './DailyScreen';
import { STAGE_LABELS } from '../engine/career';
import { WEIGHT_CLASSES } from '../engine/data';
import { slotsFor, type Slot } from '../storage';
import { PremiumCard } from './PremiumCard';
import { adPrivacyRequired, showAdPrivacyOptions, usePremium } from '../monetization';
import { disableNotifications, enableNotifications, NOTIFY, useNotifyState } from '../notify';
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


function SlotCard({ n, save, active, onNew, onContinue, onDelete, onDynasty }: { n: Slot; save: GameState | null; active: boolean; onNew: () => void; onContinue: () => void; onDelete: () => void; onDynasty: () => void }) {
  const frame = useFrame();
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
        <FighterAvatar look={f.gorunum} size={62} ring={frame ?? (belts ? C.gold : active ? C.red : '#3a3d45')} />
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
            <>
              <Pressable onPress={onDynasty} style={[ms.mainBtn, { backgroundColor: C.gold }]}>
                <Icon name="account-child" size={16} color="#000" />
                <Text style={[ms.mainText, { color: '#000' }]}>{L("YENİ NESİL")}</Text>
              </Pressable>
              <Pressable onPress={onNew} style={[ms.mainBtn, { backgroundColor: C.red }]}>
                <Icon name="plus" size={16} color="#fff" />
                <Text style={ms.mainText}>{L("YENİ KARİYER")}</Text>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={onContinue} style={[ms.mainBtn, { backgroundColor: active ? C.gold : C.red }]}>
              <Icon name="play" size={16} color={active ? '#000' : '#fff'} />
              <Text style={[ms.mainText, active && { color: '#000' }]}>{L("DEVAM ET")}</Text>
            </Pressable>
          )}
          <ExportButton save={save} />
          <Pressable onPress={() => setSure(true)} style={ms.delBtn} hitSlop={6}>
            <Icon name="trash-can-outline" size={18} color={C.faint} />
          </Pressable>
        </View>
      )}
    </LinearGradient>
  );
}

type Sheet = 'ayarlar' | 'meydan' | 'rehber' | null;

/** Alttan açılan pencere: ayarlar, meydan okumalar ve rehber ana ekranı kalabalıklaştırmasın. */
function MenuSheet({ title, icon, onClose, children }: { title: string; icon: IconName; onClose: () => void; children: ReactNode }) {
  const ins = useSafeAreaInsets();
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={ms.sheetWrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[ms.sheet, { paddingBottom: 12 + ins.bottom }]}>
          <View style={ms.sheetHandle} />
          <View style={ms.sheetHead}>
            <Icon name={icon} size={20} color={C.gold} />
            <Text style={[ms.sheetTitle, SLANT]}>{title.toLocaleUpperCase(LOC)}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Icon name="close" size={22} color={C.dim} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Oyun modu kutucuğu (2×2 ızgara). */
function ModeTile({ icon, title, sub, color, badge, onPress }: { icon: IconName; title: string; sub: string; color: string; badge?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [ms.tile, { borderColor: pressed ? color : C.border }, pressed && { transform: [{ scale: 0.98 }] }]}>
      <LinearGradient colors={[color + '22', '#0c0d10']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ms.tileIn}>
        <View style={ms.tileTop}>
          <View style={[ms.tileIcon, { borderColor: color + '66', backgroundColor: color + '18' }]}>
            <Icon name={icon} size={22} color={color} />
          </View>
          {badge ? <Text style={[ms.tileBadge, { color, borderColor: color + '66' }]}>{badge}</Text> : null}
        </View>
        <Text style={ms.tileTitle}>{title.toLocaleUpperCase(LOC)}</Text>
        <Text style={ms.tileSub} numberOfLines={2}>
          {sub}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

export function MenuScreen({
  saves,
  active,
  onNew,
  onChallenge,
  onContinue,
  onDelete,
  onDaily,
  onDynasty,
  onLocker,
  onImport,
}: {
  saves: (GameState | null)[];
  active: Slot;
  onNew: (slot: Slot) => void;
  onChallenge: (id: ChallengeId, slot: Slot) => void;
  onContinue: (slot: Slot) => void;
  onDelete: (slot: Slot) => void;
  onDynasty: (slot: Slot) => void;
  onDaily: () => void;
  onLocker: () => void;
  onImport: (slot: Slot, g: GameState) => void;
}) {
  const any = saves.some(Boolean);
  const [open, setOpen] = useState<number | null>(any ? null : 0);
  const [sheet, setSheet] = useState<Sheet>(null);
  const off = useOfflineStatus();
  const cur = saves[active - 1];
  const canContinue = !!cur && cur.phase !== 'emeklilik';
  const premium = usePremium();
  const SLOTS = slotsFor(premium);
  const firstEmpty = SLOTS.find((x) => !saves[x - 1]);
  const ses = useSoundSettings();
  const spiker = useAnnouncer();
  const titresim = useHaptics();
  const qteAcik = useQte();
  const canli = useLive();
  const hafif = useLowPerf();
  const bildirim = useNotifyState();
  const yeniKoz = useCosmetics().yeni.length;
  const doneCh = useCompletedChallenges();
  const chIds = Object.keys(CHALLENGES) as ChallengeId[];
  const gun = dayNumber();
  const daily = loadDaily();
  const seri = liveStreak(daily, gun);
  // Dolu yuvalar (son oynanan önde), boşlar küçük "yeni kariyer" düğmesi olarak
  const filled = SLOTS.filter((x) => saves[x - 1]).sort((x, y) => (x === active ? -1 : y === active ? 1 : x - y));
  const empty = SLOTS.filter((x) => !saves[x - 1]);
  const busy = off && off.durum !== 'hazir';
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
      {/* Sahne: spot ışıkları altında logo; ayarlar sağ üstte */}
      <View style={ms.hero}>
        <LinearGradient colors={['#4a0d16', '#1a070b', '#0a0b0e']} style={StyleSheet.absoluteFill} />
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none">
          <Defs>
            <SvgLinear id="mnCone" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#fff1d0" stopOpacity={0.2} />
              <Stop offset="1" stopColor="#fff1d0" stopOpacity={0} />
            </SvgLinear>
            <RadialGradient id="mnGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={C.gold} stopOpacity={0.22} />
              <Stop offset="1" stopColor={C.gold} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Polygon points="16,0 24,0 50,100 6,100" fill="url(#mnCone)" />
          <Polygon points="76,0 84,0 94,100 50,100" fill="url(#mnCone)" />
          <Ellipse cx={50} cy={38} rx={36} ry={32} fill="url(#mnGlow)" />
        </Svg>
        <View style={ms.heroLine} />
        <Pressable onPress={() => setSheet('ayarlar')} style={({ pressed }) => [ms.gear, pressed && { borderColor: C.gold }]} hitSlop={8}>
          <Icon name="cog" size={20} color={C.text} />
        </Pressable>
        {/* Sarmalayıcı: web'de mutlak konumlu ışık katmanının altında kalmasın */}
        <View>
          <Logo size={84} />
        </View>
        <Text style={ms.brand}>{L("Y O L")}</Text>
        <Text style={[ms.heroTitle, SLANT]}>{L("KAFESTEN KEMERE")}</Text>
        <Text style={ms.heroSub}>{L("Sıfırdan UCC şampiyonluğuna. Her karar senin.")}</Text>
        {busy ? (
          <View style={[ms.off, { borderColor: C.gold + '66' }]}>
            <Icon name="cloud-download" size={14} color={C.gold} />
            <Text style={[ms.offText, { color: C.gold }]}>
              {off!.durum === 'guncelleniyor'
                ? L("Yeni sürüm indiriliyor… uygulamayı kapatma")
                : L("Çevrimdışı için indiriliyor{0}", [off!.toplam ? ` (${off!.toplam - (off!.eksik ?? 0)}/${off!.toplam})` : '…'])}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Kariyerler */}
      {filled.length ? <Section>{L("KARİYERLERİN")}</Section> : null}
      {filled.map((x) => (
        <SlotCard key={x} n={x} save={saves[x - 1]} active={x === active} onNew={() => onNew(x)} onContinue={() => onContinue(x)} onDelete={() => onDelete(x)} onDynasty={() => onDynasty(x)} />
      ))}
      {!any ? (
        <LinearGradient colors={['#15110a', '#0b0c0e']} style={ms.story}>
          <Text style={ms.intro}>{L("Saat gece 02:14. Şehrin kenarında, tabelasının yarısı yanmayan bir spor salonu var.")}</Text>
          <Text style={ms.intro}>{L("İçeride tek bir ampul yanıyor. Duvarda solmuş bir poster var: sekizgen bir kafes ve havaya kaldırılmış altın bir kemer.")}</Text>
          <Text style={[ms.intro, { color: C.gold, fontStyle: 'italic' }]}>{L("“Herkes kemeri ister. Pek azı yolu yürür.”")}</Text>
          <Text style={[ms.intro, { color: C.text, fontFamily: F.bold, marginBottom: 0 }]}>{L("Bu senin hikâyen. Her yumruk, her karar, her hata senin.")}</Text>
        </LinearGradient>
      ) : null}
      {empty.length && any ? (
        <View style={ms.newRow}>
          {empty.map((x) => (
            <Pressable key={x} onPress={() => onNew(x)} style={({ pressed }) => [ms.newChip, pressed && { borderColor: C.gold }]}>
              <Icon name="plus" size={16} color={C.gold} />
              <Text style={ms.newChipText}>{L("Yeni kariyer · Yuva {0}", [x])}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Modlar */}
      <Section>{L("OYUN MODLARI")}</Section>
      <View style={ms.grid}>
        <ModeTile
          icon="fire"
          color={C.orange}
          title={L("Günün Dövüşü")}
          sub={daily.kayit[gun] ? L("Bugün oynandı · yarın yenisi") : L("Herkes aynı dövüşü oynuyor. Tek hakkın var.")}
          badge={seri ? `🔥 ${seri}` : undefined}
          onPress={onDaily}
        />
        <ModeTile
          icon="sword-cross"
          color={C.red}
          title={L("Meydan Okumalar")}
          sub={L("Özel kurallı kariyerler")}
          badge={`${chIds.filter((i) => doneCh.includes(i)).length}/${chIds.length}`}
          onPress={() => setSheet('meydan')}
        />
        <ModeTile icon="hanger" color={C.gold} title={L("Dolap")} sub={L("Şort, eldiven, çerçeve, kemer ve giriş müziği")} badge={yeniKoz ? L("{0} YENİ", [yeniKoz]) : undefined} onPress={onLocker} />
        <ModeTile icon="book-open-variant" color={C.blue} title={L("Rehber")} sub={L("Nasıl oynanır, gelişim, branşlar")} onPress={() => setSheet('rehber')} />
      </View>

      <PremiumCard />

      {sheet === 'meydan' ? (
        <MenuSheet title={L("Meydan Okumalar")} icon="sword-cross" onClose={() => setSheet(null)}>
          <ChallengeList
            canStart={!!firstEmpty}
            onStart={(id) => {
              setSheet(null);
              if (firstEmpty) onChallenge(id, firstEmpty);
            }}
          />
        </MenuSheet>
      ) : null}

      {sheet === 'rehber' ? (
        <MenuSheet title={L("Rehber")} icon="book-open-variant" onClose={() => setSheet(null)}>
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
        </MenuSheet>
      ) : null}

      {sheet === 'ayarlar' ? (
        <MenuSheet title={L("Ayarlar")} icon="cog" onClose={() => setSheet(null)}>
          <Text style={ms.sheetLabel}>{L("DİL")}</Text>
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
            {(
              [
                ['spiker', spiker, 'microphone-variant', 'microphone-variant-off', L("Spiker"), () => setAnnouncer(!spiker)],
                ['titresim', titresim, 'vibrate', 'vibrate-off', L("Titreşim"), () => setHaptics(!titresim)],
                ['canli', canli, 'gamepad-variant', 'eye', L("Canlı dövüş"), () => setLive(!canli)],
                ['qte', qteAcik, 'gesture-tap', 'gesture-tap-hold', L("Dövüşte elle oyna"), () => setQte(!qteAcik)],
                // Düşük donanımlı telefonlar için: dövüş sahnesi daha seyrek çizilir, efektler sadeleşir (web'de gerekmez)
                ...(Platform.OS === 'web' ? [] : [['hafif', hafif, 'speedometer-slow', 'speedometer', L("Hafif görüntü"), () => setLowPerf(!hafif)] as const]),
              ] as const
            ).map(([k, on, icon, offIcon, ad, toggle]) => (
              <Pressable key={k} onPress={toggle} style={[ms.lang, on && ms.langOn]}>
                <Icon name={on ? icon : offIcon} size={14} color={on ? C.gold : C.faint} />
                <Text style={[ms.langText, on && { color: C.gold }]}>
                  {ad} · {on ? L("AÇIK") : L("KAPALI")}
                </Text>
              </Pressable>
            ))}
            {NOTIFY ? (
              <Pressable onPress={() => void (bildirim === 'acik' ? disableNotifications() : enableNotifications())} style={[ms.lang, bildirim === 'acik' && ms.langOn]}>
                <Icon name={bildirim === 'acik' ? 'bell-ring' : 'bell-off'} size={14} color={bildirim === 'acik' ? C.gold : C.faint} />
                <Text style={[ms.langText, bildirim === 'acik' && { color: C.gold }]}>
                  {L("Bildirimler")} · {bildirim === 'acik' ? L("AÇIK") : L("KAPALI")}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={ms.sheetLabel}>{L("KARİYER AKTARMA VE GERİ BİLDİRİM")}</Text>
          <ImportCard
            canImport={!!firstEmpty}
            onImport={(g) => {
              setSheet(null);
              if (firstEmpty) onImport(firstEmpty, g);
            }}
          />
          <FeedbackRow />
          {off?.durum === 'hazir' ? (
            <View style={[ms.off, { borderColor: C.green + '66', alignSelf: 'center' }]}>
              <Icon name="cloud-check" size={14} color={C.green} />
              <Text style={[ms.offText, { color: C.green }]}>{L("Çevrimdışı oynamaya hazır · sürüm {0}", [off.surum])}</Text>
            </View>
          ) : null}
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
        </MenuSheet>
      ) : null}
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
  hero: { alignItems: 'center', paddingTop: 30, paddingBottom: 22, paddingHorizontal: 16, marginHorizontal: -16, marginTop: -16, marginBottom: 8, overflow: 'hidden' },
  heroLine: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, backgroundColor: C.gold + '55' },
  gear: { position: 'absolute', top: 14, right: 16, width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#ffffff22', backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },
  story: { borderRadius: 14, borderWidth: 1, borderColor: C.goldDeep, padding: 14, marginTop: 6, marginBottom: 6 },
  newRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  newChip: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: '#4a4d55', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12, backgroundColor: '#0a0b0d' },
  newChipText: { color: C.text, fontFamily: F.display, fontSize: 13, letterSpacing: 0.8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  tile: { width: '48%', flexGrow: 1, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  tileIn: { padding: 12, minHeight: 124, gap: 4 },
  tileTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  tileIcon: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tileBadge: { fontFamily: F.display, fontSize: 12, borderWidth: 1, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1, overflow: 'hidden' },
  tileTitle: { color: C.text, fontFamily: F.display, fontSize: 15, letterSpacing: 0.6 },
  tileSub: { color: C.dim, fontFamily: F.body, fontSize: 11, lineHeight: 15 },
  sheetWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet: { maxHeight: '86%', backgroundColor: '#0d0e12', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingTop: 8 },
  sheetHandle: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: '#ffffff33', marginBottom: 10 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sheetTitle: { flex: 1, color: C.text, fontFamily: F.display, fontSize: 20, letterSpacing: 1 },
  sheetLabel: { color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 1.5, marginTop: 8, marginBottom: 8 },
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
  locker: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, marginTop: 12 },
  lockerTitle: { color: C.gold, fontFamily: F.display, fontSize: 16, letterSpacing: 1 },
  lockerSub: { color: C.dim, fontFamily: F.body, fontSize: 12 },
  lockerNew: { backgroundColor: C.red, color: '#fff', fontFamily: F.display, fontSize: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
});
