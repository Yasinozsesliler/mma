import { L, LOC } from '../i18n';
import { ChallengeList } from './ChallengeList';
import { LegendList, useLegendUnlocked, type LegendName } from './LegendScreens';
import { takeLegendRequest } from '../legendNav';
import { MyLegendLink } from './StudioScreen';
import { SeasonBanner } from './SeasonScreen';
import { loadDream } from './DreamScreen';
import { pendingGhost, useGhosts } from '../ghost';
import { albumProgress, triesLeft } from '../engine/dreamFight';
import { LEGEND_IDS, LEGENDS, type LegendId } from '../engine/legendRun';
import { useLegendBest } from '../legendPrefs';
import type { ChallengeId } from '../engine/challenges';
import { useCosmetics, useFrame } from '../cosmetics';
import { ExportButton } from './CareerTransfer';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, LinearGradient as SvgLinear, Polygon, RadialGradient, Stop } from 'react-native-svg';
import { useCompletedChallenges } from '../challengePrefs';
import { CHALLENGES } from '../engine/challenges';
import { dayNumber, liveStreak } from '../engine/daily';
import { loadDaily } from './DailyScreen';
import { STAGE_LABELS } from '../engine/career';
import { WEIGHT_CLASSES } from '../engine/data';
import { slotsFor, type Slot } from '../storage';
import { PremiumCard, SlotsFullOffer } from './PremiumCard';
import { SettingsSheet } from './SettingsSheet';
import { COACH_STORE, REF_STORE, LEGENDS_STORE, maybeStartWelcome, milestoneOffer, openOffer, PURCHASES, usePremium, usePrice } from '../monetization';
import { DEAL_SKU } from '../monetization/skus';
import { careerFights } from '../engine/rewards';
import { DealPopup } from './ShopSheet';
import { useSeason } from '../season';
import { seasonDaysLeft, seasonRewards, tierOf } from '../engine/season';
import { CoachStart } from './CoachScreen';
import { FighterAvatar } from './FighterAvatar';
import { BACKGROUNDS } from '../engine/data';
import type { Appearance, Background, GameState } from '../engine/types';
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
        <Text style={ms.slotNo}>{L("YUVA {0}", [n])}</Text>
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
        <Text style={ms.slotNo}>{L("YUVA {0}", [n])}{active ? L(" · SON OYNANAN") : ''}</Text>
        {retired ? <Pill text={L("EMEKLİ")} icon="flag-checkered" color={C.faint} /> : null}
      </View>
      <View style={ms.slotBody}>
        <FighterAvatar look={f.gorunum} size={62} ring={frame ?? (belts ? C.gold : active ? C.red : '#3a3d45')} />
        <View style={{ flex: 1 }}>
          {f.lakap ? <Text style={ms.slotNick}>“{f.lakap.toLocaleUpperCase(LOC)}”</Text> : null}
          <Text style={[ms.slotName, SLANT]} numberOfLines={1}>
            {upName(`${f.ad} ${f.soyad}`, f.uyruk)}
          </Text>
          {save.antrenor ? (
            <>
              <Text style={ms.slotMeta} numberOfLines={1}>
                {L("🧢 Antrenör · {0}", [save.salon?.ad ?? ''])}
              </Text>
              <Text style={ms.slotRec}>{L("Seviye {0} · {1} öğrenci{2}", [save.antrenor.seviye, save.salon?.ogrenciler.length ?? 0, save.antrenor.oduller.length ? `  ·  🏆 ${save.antrenor.oduller.length}` : ''])}</Text>
            </>
          ) : (
            <>
              <Text style={ms.slotMeta} numberOfLines={1}>
                {f.yas} {L("yaş ·")}{' '}{WEIGHT_CLASSES[f.siklet].ad} · {STAGE_LABELS[save.stage].replace(/^Aşama \d · /, '')}
              </Text>
              <Text style={ms.slotRec}>
                {pro ? '' : L("Amatör ")}
                {r.g}-{r.m}-{r.b}
                {belts ? `  ·  🏆 ${belts}` : ''}
              </Text>
            </>
          )}
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
      {retired && !sure ? <MyLegendLink s={save} /> : null}
    </LinearGradient>
  );
}

type Sheet = 'ayarlar' | 'meydan' | 'efsane' | 'rehber' | 'antrenor' | null;

/** Menünün üstündeki efsane vitrini: yüzler yan yana, dokununca o efsanenin ayrıntısı açılır. */
function LegendShowcase({ onOpen }: { onOpen: (id?: LegendId) => void }) {
  const best = useLegendBest();
  const unlocked = useLegendUnlocked();
  const total = Object.values(best).reduce((a, b) => a + b.yildiz, 0);
  const chapters = LEGEND_IDS.reduce((n, id) => n + LEGENDS[id].bolumler.length, 0);
  return (
    <View style={ms.show}>
      <Pressable onPress={() => onOpen()} style={ms.showHead} hitSlop={6}>
        <Icon name="book-open-variant" size={16} color={C.gold} />
        <Text style={[ms.showTitle, SLANT]}>{L("Efsane Yolları").toLocaleUpperCase(LOC)}</Text>
        <Text style={ms.showMeta}>{L("{0} hikâye · {1} bölüm", [LEGEND_IDS.length, chapters])}</Text>
        {total ? <Text style={ms.showStars}>{total}★</Text> : null}
        <Icon name="chevron-right" size={18} color={C.faint} />
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ms.showRow}>
        {LEGEND_IDS.map((id) => {
          const d = LEGENDS[id];
          const b = best[id];
          const open = unlocked(id);
          return (
            <Pressable key={id} onPress={() => onOpen(id)} style={({ pressed }) => [ms.lgCard, { borderColor: pressed ? d.renk : d.renk + '55' }]}>
              <LinearGradient colors={[d.renk + '30', '#0c0d10']} style={ms.lgIn}>
                <FighterAvatar look={d.gorunum} size={64} ring={d.renk} />
                <Text style={[ms.lgName, SLANT]} numberOfLines={1}>
                  {upName(d.soyad, d.uyruk)}
                </Text>
                <Text style={[ms.lgNick, { color: d.renk }]} numberOfLines={1}>
                  {d.lakap()}
                </Text>
                {b ? (
                  <Text style={ms.lgBadge}>{b.bitti ? '✅ ' : ''}{L("{0}/{1}★", [b.yildiz, d.bolumler.length * 3])}</Text>
                ) : d.ucretsiz ? (
                  <Text style={[ms.lgBadge, { color: C.green }]}>{L("ÜCRETSİZ")}</Text>
                ) : !open ? (
                  <Text style={ms.lgBadge}>{LEGENDS_STORE ? L("1. BÖLÜM ÜCRETSİZ") : L("👑 TAM SÜRÜM")}</Text>
                ) : (
                  <Text style={ms.lgBadge}>{L("{0} bölüm", [d.bolumler.length])}</Text>
                )}
              </LinearGradient>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

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
  onLegend,
  onCoach,
  onContinue,
  onDelete,
  onDaily,
  onDream,
  onGhost,
  onReferee,
  onSeason,
  onDynasty,
  onLocker,
  onImport,
}: {
  saves: (GameState | null)[];
  active: Slot;
  onNew: (slot: Slot) => void;
  onChallenge: (id: ChallengeId, slot: Slot) => void;
  onLegend: (id: LegendId, isim: LegendName, slot: Slot, deneme: boolean) => void;
  onCoach: (isim: { ad: string; soyad: string; lakap: string; uyruk: string; gorunum?: Appearance }, slot: Slot, deneme: boolean) => void;
  onContinue: (slot: Slot) => void;
  onDelete: (slot: Slot) => void;
  onDynasty: (slot: Slot) => void;
  onDaily: () => void;
  onDream: () => void;
  onGhost: () => void;
  onReferee: () => void;
  onSeason: () => void;
  onLocker: () => void;
  onImport: (slot: Slot, g: GameState) => void;
}) {
  const any = saves.some(Boolean);
  const [open, setOpen] = useState<number | null>(any ? null : 0);
  // Hayalî Maçlar'dan "bu efsanenin hikâyesi" isteği: menü Efsane Yolları açık gelir
  const [req] = useState(takeLegendRequest);
  const [sheet, setSheet] = useState<Sheet>(req ? 'efsane' : null);
  const [legendOpen, setLegendOpen] = useState<LegendId | undefined>(req && req !== true ? req : undefined);
  const openLegends = (id?: LegendId) => {
    setLegendOpen(id);
    setSheet('efsane');
  };
  const off = useOfflineStatus();
  const cur = saves[active - 1];
  const canContinue = !!cur && cur.phase !== 'emeklilik';
  const premium = usePremium();
  // Sezonun son 3 günü: Şampiyon sırasında alınabilecek ödül varsa sezon başına bir kez hatırlat
  const season = useSeason();
  useEffect(() => {
    if (premium || seasonDaysLeft() > 3) return;
    const t = tierOf(season.xp);
    if (seasonRewards(season.idx).some((r) => r.pro && r.basamak <= t && !season.alinan.includes(r.id))) milestoneOffer('sezon', `yol_teklif_sezon_${season.idx}`, 1200);
  }, [premium, season]);
  // Hoş Geldin Fırsatı: 3. maçtan sonra 72 saat, bir kez (fırsat ürünü mağazada varsa)
  const dealReady = !!usePrice(DEAL_SKU);
  const fights = cur && !cur.antrenor ? careerFights(cur) : 0;
  useEffect(() => maybeStartWelcome(fights, dealReady), [fights, dealReady]);
  const SLOTS = slotsFor(premium);
  const firstEmpty = SLOTS.find((x) => !saves[x - 1]);
  const yeniKoz = useCosmetics().yeni.length;
  const doneCh = useCompletedChallenges();
  const chIds = Object.keys(CHALLENGES) as ChallengeId[];
  const gun = dayNumber();
  const daily = loadDaily();
  const seri = liveStreak(daily, gun);
  const dream = loadDream();
  const ghostCount = useGhosts().length;
  const dreamLeft = triesLeft(dream, gun) > 0;
  const dreamProg = albumProgress(dream);
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

      <LegendShowcase onOpen={openLegends} />

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
      {!any ? (
        <Pressable onPress={() => openLegends('kral')} style={({ pressed }) => [ms.firstLegend, pressed && { borderColor: C.gold }]}>
          <FighterAvatar look={LEGENDS.kral.gorunum} size={44} ring={LEGENDS.kral.renk} />
          <View style={{ flex: 1 }}>
            <Text style={ms.firstTitle}>{L("Ya da bir efsaneyi yaşa")}</Text>
            <Text style={ms.firstSub}>{L("{0}: Dublin'den çifte şampiyonluğa, rehberli 9 bölüm. Ücretsiz.", [`${LEGENDS.kral.ad} ${LEGENDS.kral.soyad}`])}</Text>
          </View>
          <Icon name="chevron-right" size={20} color={C.gold} />
        </Pressable>
      ) : null}
      {!firstEmpty ? <SlotsFullOffer /> : null}
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
      {/* Şampiyon Paketi'nin 4. ve 5. yuvası: kilitli olarak görünür, dokununca teklif açılır */}
      {any && !premium && PURCHASES ? (
        <View style={ms.newRow}>
          {[4, 5].map((x) => (
            <Pressable key={x} onPress={() => openOffer('yuva5', true)} style={({ pressed }) => [ms.newChip, ms.lockChip, pressed && { borderColor: C.gold }]}>
              <Icon name="lock" size={14} color={C.goldDeep} />
              <Text style={[ms.newChipText, { color: C.dim }]}>{L("Yuva {0} · 👑 Şampiyon", [x])}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Modlar */}
      <Section>{L("OYUN MODLARI")}</Section>
      <SeasonBanner onPress={onSeason} />
      {/* Meydan okumalar: geniş afiş, ilerleme çubuğu ve son kategoriler */}
      <Pressable onPress={() => setSheet('meydan')} style={({ pressed }) => [ms.chBanner, pressed && { transform: [{ scale: 0.99 }], borderColor: C.red }]}>
        <LinearGradient colors={['#3a0b14', '#160a0d', '#0c0d10']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ms.chIn}>
          <View style={ms.chIcon}>
            <Icon name="sword-cross" size={28} color={C.red} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[ms.chTitle, SLANT]}>{L("Meydan Okumalar").toLocaleUpperCase(LOC)}</Text>
            <Text style={ms.chSub} numberOfLines={1}>
              {L("{0} özel kurallı kariyer · Son Şans, Nakavt Kralı, Hükümdar…", [chIds.length])}
            </Text>
            <View style={ms.chBar}>
              <View style={[ms.chFill, { width: `${Math.round((chIds.filter((i) => doneCh.includes(i)).length / chIds.length) * 100)}%` }]} />
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={ms.chCount}>
              {chIds.filter((i) => doneCh.includes(i)).length}
              <Text style={ms.chCountAll}>/{chIds.length}</Text>
            </Text>
            <Icon name="chevron-right" size={20} color={C.faint} />
          </View>
        </LinearGradient>
      </Pressable>
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
          icon="star-four-points"
          color={C.gold}
          title={L("Hayalî Maçlar")}
          sub={dreamLeft ? L("Bugünün efsane eşleşmesi seni bekliyor") : L("Bugün oynandı · yarın yeni eşleşme")}
          badge={L("📒 {0}/{1}", [dreamProg.got, dreamProg.max])}
          onPress={onDream}
        />
        <ModeTile
          icon="ghost"
          color={C.blue}
          title={L("Hayalet Maç")}
          sub={pendingGhost() ? L("Bir arkadaşın sana meydan okudu!") : L("Arkadaşının dövüşçüsüyle kapış, kodunu paylaş")}
          badge={pendingGhost() ? L("YENİ") : ghostCount ? `👻 ${ghostCount}` : L("YENİ")}
          onPress={onGhost}
        />
        {REF_STORE ? <ModeTile icon="hand-back-left" color={C.red} title={L("Hakem Modu")} sub={L("Kafesin içindeki karar senin: durdur, devam ettir, puanla")} badge={L("YENİ")} onPress={onReferee} /> : null}
        {COACH_STORE ? <ModeTile icon="whistle" color={C.blue} title={L("Antrenör Modu")} sub={L("Bu sefer hoca sensin: salonunu kur, şampiyon yetiştir")} badge={L("YENİ")} onPress={() => setSheet('antrenor')} /> : null}
        <ModeTile icon="hanger" color={C.gold} title={L("Dolap")} sub={L("Şort, eldiven, çerçeve, kemer ve giriş müziği")} badge={yeniKoz ? L("{0} YENİ", [yeniKoz]) : undefined} onPress={onLocker} />
        <ModeTile icon="book-open-variant" color={C.blue} title={L("Rehber")} sub={L("Nasıl oynanır, gelişim, branşlar")} onPress={() => setSheet('rehber')} />
      </View>

      <PremiumCard />
      <DealPopup />

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

      {sheet === 'antrenor' ? (
        <MenuSheet title={L("Antrenör Modu")} icon="whistle" onClose={() => setSheet(null)}>
          <CoachStart
            canStart={!!firstEmpty}
            onStart={(isim, deneme) => {
              setSheet(null);
              if (firstEmpty) onCoach(isim, firstEmpty, deneme);
            }}
          />
        </MenuSheet>
      ) : null}

      {sheet === 'efsane' ? (
        <MenuSheet title={L("Efsane Yolları")} icon="book-open-variant" onClose={() => setSheet(null)}>
          <LegendList
            canStart={!!firstEmpty}
            initial={legendOpen}
            onStart={(id, isim, deneme) => {
              setSheet(null);
              if (firstEmpty) onLegend(id, isim, firstEmpty, deneme);
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
        <SettingsSheet
          onClose={() => setSheet(null)}
          canImport={!!firstEmpty}
          onImport={(g) => {
            setSheet(null);
            if (firstEmpty) onImport(firstEmpty, g);
          }}
        />
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
  show: { marginTop: 4, marginBottom: 8 },
  showHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  showTitle: { color: C.gold, fontFamily: F.display, fontSize: 16, letterSpacing: 0.6 },
  showMeta: { color: C.faint, fontFamily: F.medium, fontSize: 11, flex: 1 },
  showStars: { color: C.gold, fontFamily: F.display, fontSize: 13 },
  showRow: { gap: 8, paddingRight: 4 },
  lgCard: { width: 112, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  lgIn: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, gap: 2 },
  lgName: { color: C.text, fontFamily: F.display, fontSize: 14, marginTop: 6, maxWidth: '100%' },
  lgNick: { fontFamily: F.semi, fontSize: 10.5, maxWidth: '100%' },
  lgBadge: { color: C.gold, fontFamily: F.semi, fontSize: 9.5, letterSpacing: 0.5, marginTop: 4, textAlign: 'center' },
  firstLegend: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.gold + '66', borderRadius: 14, padding: 12, marginBottom: 8, backgroundColor: '#15110a' },
  firstTitle: { color: C.gold, fontFamily: F.bold, fontSize: 14 },
  firstSub: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 16, marginTop: 2 },
  story: { borderRadius: 14, borderWidth: 1, borderColor: C.goldDeep, padding: 14, marginTop: 6, marginBottom: 6 },
  newRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  newChip: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: '#4a4d55', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12, backgroundColor: '#0a0b0d' },
  lockChip: { borderStyle: 'dashed', borderColor: '#4a3810' },
  newChipText: { color: C.text, fontFamily: F.display, fontSize: 13, letterSpacing: 0.8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  chBanner: { borderRadius: 16, borderWidth: 1, borderColor: '#4a1a22', overflow: 'hidden', marginBottom: 10 },
  chIn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  chIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: C.red + '1c', borderWidth: 1, borderColor: C.red + '66', alignItems: 'center', justifyContent: 'center' },
  chTitle: { color: C.text, fontFamily: F.display, fontSize: 18, letterSpacing: 0.6 },
  chSub: { color: C.dim, fontFamily: F.body, fontSize: 11, marginTop: 1 },
  chBar: { height: 5, borderRadius: 3, backgroundColor: '#ffffff12', overflow: 'hidden', marginTop: 8 },
  chFill: { height: '100%', backgroundColor: C.gold, borderRadius: 3 },
  chCount: { color: C.gold, fontFamily: F.display, fontSize: 22 },
  chCountAll: { color: C.faint, fontSize: 13 },
  newBadge: { color: '#111', backgroundColor: C.gold, fontFamily: F.semi, fontSize: 9, letterSpacing: 1, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1, overflow: 'hidden' },
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
