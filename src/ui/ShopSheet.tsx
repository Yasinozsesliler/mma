// Paket Mağazası: iki net seçenek (Tam Paket · Şampiyon Paketi; reklamsız oyun ikisine de dahil) ve süreli Tam Paket Fırsatı.
// Reklamsız tek başına satılmaz (eski alıcıların hakkı premium.ts'de geçerli kalır).
// Bütün teklifler buraya açılır. "Ayrı ayrı alsan" toplamı ve indirim oranı mağazanın gerçek fiyatlarından hesaplanır;
// fiyatlar gelmediyse bu satırlar hiç görünmez (uydurma rakam yok).
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sfx } from '../audio';
import { COSMETICS } from '../engine/cosmetics';
import { LEGEND_IDS } from '../engine/legendRun';
import { L, LOC } from '../i18n';
import {
  buy,
  buyErrorText,
  closeShop,
  dealSeen,
  fmtLeft,
  markDealSeen,
  openShop,
  PACK_STORE,
  PURCHASES,
  restorePurchases,
  useAmounts,
  useDeal,
  useNow,
  useOwned,
  usePrice,
  useShop,
  useShopHost,
  type Deal,
} from '../monetization';
import { track } from '../analytics';
import { BUNDLE_SKU, COACH_SKU, DEAL_SKU, MGR_SKU, PATRON_SKU, PREMIUM_SKU, REF_SKU, ULTIMATE_SKU, UPGRADE_SKU } from '../monetization/skus';
import { Icon, type IconName } from './components';
import { PremiumCompare } from './PremiumCard';
import { C, F } from './theme';

type Amt = { n: number; cur: string } | null;

/** Mağaza para birimiyle biçimlendirir; olmazsa null (satır gizlenir). */
function money(n: number, cur: string): string | null {
  try {
    return new Intl.NumberFormat(LOC, { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(n);
  } catch {
    return null;
  }
}

/** Tam Paket'in içindekileri ayrı ayrı alsan ne ödersin (hepsinin fiyatı aynı para biriminde geldiyse). */
function useSeparateTotal(): { total: number; cur: string; text: string } | null {
  // Kozmetik paketleri satışta değilse (PACK_STORE) toplama girmez: yalnızca gerçekten alınabilenler sayılır
  const parts = useAmounts(PACK_STORE ? [PREMIUM_SKU, COACH_SKU, REF_SKU, MGR_SKU, PATRON_SKU, BUNDLE_SKU] : [PREMIUM_SKU, COACH_SKU, REF_SKU, MGR_SKU, PATRON_SKU]);
  if (parts.some((p) => !p) || new Set(parts.map((p) => p!.cur)).size !== 1) return null;
  const total = parts.reduce((a, p) => a + p!.n, 0);
  const text = money(total, parts[0]!.cur);
  return text ? { total, cur: parts[0]!.cur, text } : null;
}

/** Şampiyon Paketi'nden Tam Paket'e fark (aynı para biriminde). */
function useUpgradeDiff(): string | null {
  const [p, u] = useAmounts([PREMIUM_SKU, ULTIMATE_SKU]);
  if (!p || !u || p.cur !== u.cur || u.n <= p.n) return null;
  return money(Math.round((u.n - p.n) * 100) / 100, u.cur);
}

const pct = (a: Amt | number, b: number) => {
  const x = typeof a === 'number' ? a : a?.n;
  return x && b > x ? Math.round((1 - x / b) * 100) : 0;
};

function useBuy(onDone?: () => void) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const go = async (sku: string) => {
    if (busy) return;
    setBusy(true);
    setMsg('');
    const r = await buy(sku);
    setBusy(false);
    if (r === 'ok') {
      sfx('fanfare');
      onDone?.();
    } else if (r === 'hata') setMsg(buyErrorText());
  };
  return { busy, msg, go };
}

const FULL_ITEMS = (): [IconName, string][] => [
  ['crown', L("Şampiyon Paketi'nin tamamı: reklamsız, ödüller anında, 5 kariyer yuvası")],
  ['whistle', L("Hakem Modu: sınırsız hakemlik kariyeri")],
  ['clipboard-account', L("Antrenör Modu: kendi salonun, kendi şampiyonların")],
  ['crown', L("Patron Modu: kendi organizasyonun, kendi kemerlerin")],
  ['briefcase', L("Menajer Modu: kendi ajansın, kendi şampiyonların")],
  ['star-circle', L("{0} efsanenin bütün hikâyeleri (gelecek efsaneler dahil)", [LEGEND_IDS.length])],
  ['tshirt-crew', L("6 kozmetik paket: {0} şort, eldiven, kemer, çerçeve ve giriş", [COSMETICS.filter((c) => c.kaynak.tur === 'paket').length])],
];

function Items({ items, color = C.text }: { items: [IconName, string][]; color?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {items.map(([ic, t]) => (
        <View key={t} style={s.itemRow}>
          <Icon name={ic} size={16} color={C.gold} />
          <Text style={[s.item, { color }]}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

function BigBuy({ label, sub, onPress, busy, tone = 'gold' }: { label: string; sub?: string; onPress: () => void; busy?: boolean; tone?: 'gold' | 'red' }) {
  return (
    <Pressable onPress={onPress} disabled={busy} style={({ pressed }) => [{ opacity: busy ? 0.5 : pressed ? 0.85 : 1 }]}>
      <LinearGradient colors={tone === 'gold' ? ['#f7d57a', '#c8902e'] : ['#f0444f', '#a10f1e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.bigBuy}>
        <Text style={[s.bigBuyT, { color: tone === 'gold' ? '#1f1605' : '#fff' }]}>{label.toLocaleUpperCase(LOC)}</Text>
        {sub ? <Text style={[s.bigBuyS, { color: tone === 'gold' ? '#3a2a08' : '#ffd9dc' }]}>{sub}</Text> : null}
      </LinearGradient>
    </Pressable>
  );
}

const DEAL_TITLE: Record<Deal['kind'], () => string> = {
  hosgeldin: () => L("HOŞ GELDİN FIRSATI"),
  karacuma: () => L("KARA CUMA FIRSATI"),
  kemer: () => L("ŞAMPİYON FIRSATI"),
  deneme: () => L("DENEME SONU FIRSATI"),
};
const DEAL_LEAD: Record<Deal['kind'], () => string> = {
  hosgeldin: () => L("Yeni gelenlere özel, yalnızca bir kez: oyunun her şeyi tek pakette, indirimli."),
  karacuma: () => L("Yılın en büyük indirimi: Tam Paket yalnızca Kara Cuma boyunca bu fiyatta."),
  kemer: () => L("Kemeri kazandın. 24 saat boyunca Tam Paket şampiyonlara özel fiyatla."),
  deneme: () => L("Denemeyi bitirdin. 24 saat boyunca Tam Paket bu fiyatta: Patron, Menajer ve bütün modlar dahil."),
};

/** Süreli Tam Paket Fırsatı kartı (mağaza, duyuru ve menüde). */
export function DealCard({ deal, compact, onBought }: { deal: Deal; compact?: boolean; onBought?: () => void }) {
  const now = useNow(1000);
  const price = usePrice(DEAL_SKU);
  const fullPrice = usePrice(ULTIMATE_SKU);
  const [dealAmt, fullAmt] = useAmounts([DEAL_SKU, ULTIMATE_SKU]);
  const sep = useSeparateTotal();
  const { busy, msg, go } = useBuy(onBought);
  if (!price) return null;
  // İndirim oranı Tam Paket'in kendi fiyatına göre; o yoksa ayrı ayrı toplamına göre
  const off = fullAmt && dealAmt && fullAmt.cur === dealAmt.cur ? pct(dealAmt, fullAmt.n) : sep && dealAmt && sep.cur === dealAmt.cur ? pct(dealAmt, sep.total) : 0;
  const was = fullAmt && dealAmt && fullAmt.cur === dealAmt.cur && fullAmt.n > dealAmt.n ? fullPrice : null;
  return (
    <LinearGradient colors={deal.kind === 'karacuma' ? ['#3a2e08', '#0b0a07'] : ['#3a0a12', '#120709']} style={[s.deal, compact && { padding: 12 }]}>
      <View style={s.dealTop}>
        <Text style={s.dealKicker}>🔥 {DEAL_TITLE[deal.kind]()}</Text>
        <View style={s.timer}>
          <Icon name="timer-sand" size={13} color="#fff" />
          <Text style={s.timerT}>{fmtLeft(deal.ends - now)}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        <Text style={s.dealTitle}>{L("TAM PAKET")}</Text>
        {off >= 10 ? <Text style={s.off}>{L("%{0} İNDİRİM", [off])}</Text> : null}
      </View>
      {!compact ? <Text style={s.lead}>{DEAL_LEAD[deal.kind]()}</Text> : null}
      {!compact ? <Items items={FULL_ITEMS()} /> : <Text style={s.lead}>{L("Patron, Menajer, Antrenör ve Hakem Modu, bütün efsaneler, reklamsız oyun ve 6 kozmetik paket.")}</Text>}
      <View style={s.priceRow}>
        {was ? <Text style={s.was}>{was}</Text> : sep ? <Text style={s.was}>{sep.text}</Text> : null}
        <Text style={s.now}>{price}</Text>
      </View>
      <BigBuy label={L("Fırsatı yakala")} sub={L("Tek seferlik alım · abonelik yok")} tone="red" busy={busy} onPress={() => go(DEAL_SKU)} />
      {msg ? <Text style={s.msg}>{msg}</Text> : null}
    </LinearGradient>
  );
}

/** Tam Paket: mağazanın ana ürünü. */
function FullPackCard({ onBought }: { onBought?: () => void }) {
  const price = usePrice(ULTIMATE_SKU);
  const [amt] = useAmounts([ULTIMATE_SKU]);
  const sep = useSeparateTotal();
  const save = sep && amt && sep.cur === amt.cur ? pct(amt, sep.total) : 0;
  const diff = useUpgradeDiff();
  const { busy, msg, go } = useBuy(onBought);
  return (
    <LinearGradient colors={['#2e2206', '#0e0c07']} style={[s.card, { borderColor: C.gold }]}>
      <Text style={s.badge}>{L("EN İYİ DEĞER")}</Text>
      <Text style={s.cardTitle}>{L("TAM PAKET")}</Text>
      <Text style={s.lead}>{L("Oyundaki her şey, tek seferde ve sonsuza dek.")}</Text>
      <Items items={FULL_ITEMS()} />
      {sep && save >= 10 ? (
        <View style={s.priceRow}>
          <Text style={s.sepLabel}>{L("Ayrı ayrı:")}</Text>
          <Text style={s.was}>{sep.text}</Text>
          <Text style={s.save}>{L("%{0} tasarruf", [save])}</Text>
        </View>
      ) : null}
      <BigBuy label={price ? L("Tam Paket · {0}", [price]) : L("Tam Paket")} busy={busy} onPress={() => go(ULTIMATE_SKU)} />
      {diff ? <Text style={s.diff}>{L("Şampiyon Paketi'nden yalnızca {0} fazla", [diff])}</Text> : null}
      {msg ? <Text style={s.msg}>{msg}</Text> : null}
    </LinearGradient>
  );
}

function ChampionCard({ onBought }: { onBought?: () => void }) {
  const price = usePrice(PREMIUM_SKU);
  const diff = useUpgradeDiff();
  const [open, setOpen] = useState(false);
  const { busy, msg, go } = useBuy(onBought);
  return (
    <View style={s.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="crown" size={20} color={C.gold} />
        <Text style={[s.cardTitle, { fontSize: 17, flex: 1 }]}>{L("ŞAMPİYON PAKETİ")}</Text>
        <Text style={s.side}>{price ?? ''}</Text>
      </View>
      <Text style={s.lead}>{L("Reklamsız oyun, ödüller anında, 5 kariyer yuvası, bütün efsaneler ve Altın Seri. Patron, Menajer, Antrenör ve Hakem Modu dahil değil.")}</Text>
      <Pressable onPress={() => setOpen((x) => !x)} hitSlop={8}>
        <Text style={s.link}>{open ? L("Karşılaştırmayı gizle") : L("Ücretsiz ile karşılaştır")}</Text>
      </Pressable>
      {open ? <PremiumCompare /> : null}
      <Pressable disabled={busy} onPress={() => go(PREMIUM_SKU)} style={({ pressed }) => [s.outlineBtn, pressed && { opacity: 0.8 }, busy && { opacity: 0.5 }]}>
        <Text style={s.outlineT}>{price ? L("Şampiyon Paketi · {0}", [price]) : L("Şampiyon Paketi")}</Text>
      </Pressable>
      {diff ? (
        <Pressable disabled={busy} onPress={() => go(ULTIMATE_SKU)} style={({ pressed }) => [s.upsell, pressed && { borderColor: C.gold }]}>
          <Icon name="arrow-up-bold-circle" size={18} color={C.gold} />
          <Text style={s.upsellT}>{L("+{0} ile Tam Paket: Patron, Menajer, Antrenör, Hakem Modu ve 6 kozmetik paket de gelsin", [diff])}</Text>
        </Pressable>
      ) : null}
      {msg ? <Text style={s.msg}>{msg}</Text> : null}
    </View>
  );
}

/** Şampiyon Paketi'ni almış ama Tam Paket'i almamış oyuncu için: yalnızca eksik parçalar. */
function CompleteCard({ owned }: { owned: ReadonlySet<string> }) {
  const parts: [string, IconName, string][] = (
    [
      [REF_SKU, 'whistle', L("Hakem Modu")],
      [COACH_SKU, 'clipboard-account', L("Antrenör Modu")],
      [PATRON_SKU, 'crown', L("Patron Modu")],
      [MGR_SKU, 'briefcase', L("Menajer Modu")],
      [BUNDLE_SKU, 'tshirt-crew', L("Efsane Koleksiyonu (6 kozmetik paket)")],
    ] as [string, IconName, string][]
  ).filter(([k]) => !owned.has(k) && (k !== BUNDLE_SKU || PACK_STORE));
  const amts = useAmounts([...parts.map(([k]) => k), ULTIMATE_SKU]);
  const full = amts[amts.length - 1];
  const partSum = amts.slice(0, -1).every((a) => a && full && a.cur === full.cur) ? amts.slice(0, -1).reduce((t, a) => t + a!.n, 0) : 0;
  const fullPrice = usePrice(ULTIMATE_SKU);
  const upgradePrice = usePrice(UPGRADE_SKU);
  const allInOne = parts.length > 1 && full && partSum > full.n;
  return (
    <LinearGradient colors={['#2e2206', '#0e0c07']} style={[s.card, { borderColor: C.gold }]}>
      <Text style={s.cardTitle}>{L("EKSİKLERİNİ TAMAMLA")}</Text>
      <Text style={s.lead}>{L("Şampiyon Paketi sende. Tam Paket'e giden yolda yalnızca bunlar kaldı:")}</Text>
      {upgradePrice ? <PartRow sku={UPGRADE_SKU} icon="crown" title={L("Tam Paket'e yükselt: Patron, Menajer, Antrenör, Hakem Modu ve 6 kozmetik paket")} /> : allInOne ? <PartRow sku={ULTIMATE_SKU} icon="crown" title={L("Hepsi birden (Tam Paket) · parça parça {0}", [money(partSum, full!.cur) ?? ''])} price={fullPrice} /> : null}
      {parts.map(([sku, ic, t]) => (
        <PartRow key={sku} sku={sku} icon={ic} title={t} />
      ))}
    </LinearGradient>
  );
}

function PartRow({ sku, icon, title, price: fixed }: { sku: string; icon: IconName; title: string; price?: string | null }) {
  const store = usePrice(sku);
  const price = fixed ?? store;
  const { busy, msg, go } = useBuy();
  return (
    <>
      <Pressable disabled={busy} onPress={() => go(sku)} style={({ pressed }) => [s.part, pressed && { borderColor: C.gold }, busy && { opacity: 0.5 }]}>
        <Icon name={icon} size={18} color={C.gold} />
        <Text style={[s.item, { flex: 1 }]}>{title}</Text>
        <Text style={s.side}>{price ?? L("Al")}</Text>
      </Pressable>
      {msg ? <Text style={s.msg}>{msg}</Text> : null}
    </>
  );
}

/** Mağaza penceresi. Uygulama kökünde bir kez; ayrıca mağaza düğmesi barındıran her pencerenin içinde `nested` ile
 *  (iOS pencere üstüne kökten pencere açamaz). Mağaza yalnızca en üstteki yerde çizilir. */
export function ShopModal({ nested = false }: { nested?: boolean }) {
  const src = useShop();
  const top = useShopHost(nested);
  const owned = useOwned();
  const deal = useDeal();
  const dealPrice = usePrice(DEAL_SKU);
  const ins = useSafeAreaInsets();
  const [rmsg, setRmsg] = useState('');
  const visible = !!src && PURCHASES && top;
  const [shown, setShown] = useState(false);
  // Güvenlik ağı: pencere sistem tarafından gösterilemezse mağaza "açık" durumda takılı kalmasın,
  // bir sonraki dokunuş yeniden açabilsin.
  useEffect(() => {
    if (!visible) {
      setShown(false);
      return;
    }
    if (shown) return;
    const t = setTimeout(() => {
      track('shop_present_fail', { kaynak: src ?? '' });
      closeShop();
    }, 2500);
    return () => clearTimeout(t);
  }, [visible, shown, src]);
  if (!visible) return null;
  const all = owned.has(ULTIMATE_SKU);
  const prem = owned.has(PREMIUM_SKU);
  return (
    <Modal transparent animationType="slide" onRequestClose={closeShop} onShow={() => setShown(true)}>
      <View style={s.wrap}>
        <View style={[s.sheet, { paddingBottom: 16 + ins.bottom, paddingTop: 14 }]}>
          <View style={s.head}>
            <Icon name="shopping" size={20} color={C.gold} />
            <Text style={s.headT}>{L("PAKETLER")}</Text>
            <Pressable onPress={closeShop} hitSlop={12}>
              <Icon name="close" size={22} color={C.faint} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
            {all ? (
              <View style={[s.card, { alignItems: 'center' }]}>
                <Icon name="crown" size={28} color={C.gold} />
                <Text style={s.cardTitle}>{L("TAM PAKET SENDE")}</Text>
                <Text style={[s.lead, { textAlign: 'center' }]}>{L("Oyundaki her şey açık. Desteğin için teşekkürler!")}</Text>
              </View>
            ) : (
              <>
                {deal && dealPrice && !prem ? <DealCard deal={deal} onBought={closeShop} /> : null}
                {prem ? <CompleteCard owned={owned} /> : <FullPackCard onBought={closeShop} />}
                {!prem ? <ChampionCard onBought={closeShop} /> : null}
              </>
            )}
            <Text style={s.small}>{L("Hepsi tek seferlik alım; abonelik yok. Oyunun kendisi ücretsiz kalır.")}</Text>
            <Pressable onPress={async () => setRmsg((await restorePurchases()) ? L("Satın alımların geri yüklendi.") : L("Bu hesapta satın alma bulunamadı."))} hitSlop={8} style={{ alignSelf: 'center' }}>
              <Text style={s.link}>{L("Satın alımları geri yükle")}</Text>
            </Pressable>
            {rmsg ? <Text style={s.msg}>{rmsg}</Text> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Fırsat penceresi açılınca bir kez çıkan duyuru (menüde ve maç sonunda çizilir; araya girmez). */
export function DealPopup() {
  const deal = useDeal();
  const price = usePrice(DEAL_SKU);
  const owned = useOwned();
  const shopOpen = useShop();
  const [shown, setShown] = useState<string | null>(null);
  const eligible = !!deal && !!price && !owned.has(PREMIUM_SKU) && !dealSeen(deal.key) && !shopOpen;
  useEffect(() => {
    if (!eligible || !deal) return;
    const t = setTimeout(() => {
      markDealSeen(deal.key);
      setShown(deal.key);
    }, 700);
    return () => clearTimeout(t);
  }, [eligible, deal]);
  if (!deal || shown !== deal.key || owned.has(ULTIMATE_SKU)) return null;
  const close = () => setShown(null);
  return (
    <Modal transparent animationType="fade" onRequestClose={close}>
      <View style={[s.wrap, { justifyContent: 'center', paddingHorizontal: 14 }]}>
        <View>
          <DealCard deal={deal} onBought={close} />
          <Pressable onPress={close} hitSlop={10} style={{ alignSelf: 'center', marginTop: 12 }}>
            <Text style={s.later}>{L("Şimdi değil")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/** Kilitli modlarda ve tekliflerde: "Tam Paket ile hepsi" bağlantısı. */
export function FullPackLink({ kaynak, text }: { kaynak: string; text?: string }) {
  const owned = useOwned();
  const deal = useDeal();
  const full = usePrice(ULTIMATE_SKU);
  const dealPrice = usePrice(DEAL_SKU);
  if (!PURCHASES || owned.has(ULTIMATE_SKU) || owned.has(PREMIUM_SKU)) return null;
  const p = deal && dealPrice ? dealPrice : full;
  return (
    <Pressable onPress={() => openShop(kaynak)} style={({ pressed }) => [s.fullLink, pressed && { borderColor: C.gold }]}>
      <Icon name="crown" size={18} color={C.gold} />
      <View style={{ flex: 1 }}>
        <Text style={s.fullLinkT}>
          {deal && dealPrice ? `🔥 ${DEAL_TITLE[deal.kind]()}` : L("YA DA TAM PAKET")}
          {p ? ` · ${p}` : ''}
        </Text>
        <Text style={s.small}>{text ?? L("Patron, Menajer, Antrenör ve Hakem Modu, bütün efsaneler, reklamsız oyun ve 6 kozmetik paket.")}</Text>
      </View>
      <Icon name="chevron-right" size={18} color={C.gold} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000000cc', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: '#08090b', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: C.goldDeep, paddingHorizontal: 14, width: '100%', maxWidth: 560, alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  headT: { flex: 1, color: C.gold, fontFamily: F.display, fontSize: 20, letterSpacing: 2 },
  card: { borderWidth: 1, borderColor: C.border, backgroundColor: C.card, borderRadius: 14, padding: 14, gap: 9 },
  cardTitle: { color: C.gold, fontFamily: F.display, fontSize: 22, letterSpacing: 1 },
  badge: { alignSelf: 'flex-start', color: '#1f1605', backgroundColor: C.gold, fontFamily: F.bold, fontSize: 10, letterSpacing: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  lead: { color: C.dim, fontFamily: F.body, fontSize: 12.5, lineHeight: 18 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  item: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 13, lineHeight: 18 },
  small: { color: C.faint, fontFamily: F.body, fontSize: 11.5, lineHeight: 16, textAlign: 'center' },
  side: { color: C.gold, fontFamily: F.display, fontSize: 15 },
  link: { color: C.faint, fontFamily: F.semi, fontSize: 12, textDecorationLine: 'underline', textAlign: 'center' },
  later: { color: C.dim, fontFamily: F.semi, fontSize: 13, textDecorationLine: 'underline' },
  msg: { color: C.dim, fontFamily: F.semi, fontSize: 12, textAlign: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' },
  sepLabel: { color: C.dim, fontFamily: F.semi, fontSize: 13 },
  was: { color: C.faint, fontFamily: F.display, fontSize: 18, textDecorationLine: 'line-through' },
  now: { color: '#fff', fontFamily: F.display, fontSize: 30 },
  save: { color: '#1f1605', backgroundColor: C.green, fontFamily: F.bold, fontSize: 12, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden' },
  bigBuy: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  bigBuyT: { fontFamily: F.display, fontSize: 18, letterSpacing: 1 },
  bigBuyS: { fontFamily: F.semi, fontSize: 11, marginTop: 1 },
  outlineBtn: { borderWidth: 1, borderColor: C.gold, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  outlineT: { color: C.gold, fontFamily: F.bold, fontSize: 14 },
  part: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.border, backgroundColor: '#0c0d10', borderRadius: 10, padding: 12 },
  deal: { borderWidth: 2, borderColor: C.red, borderRadius: 16, padding: 16, gap: 10 },
  dealTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dealKicker: { color: '#ffb3b8', fontFamily: F.bold, fontSize: 12, letterSpacing: 1, flexShrink: 1 },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.red, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  timerT: { color: '#fff', fontFamily: F.display, fontSize: 13, letterSpacing: 0.5 },
  dealTitle: { color: '#fff', fontFamily: F.display, fontSize: 30, letterSpacing: 1 },
  off: { color: '#1f1605', backgroundColor: C.gold, fontFamily: F.display, fontSize: 15, borderRadius: 8, paddingHorizontal: 8, overflow: 'hidden', marginBottom: 5 },
  diff: { color: C.dim, fontFamily: F.semi, fontSize: 12, textAlign: 'center', marginTop: -2 },
  upsell: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.goldDeep, backgroundColor: '#15110a', borderRadius: 10, padding: 10 },
  upsellT: { flex: 1, color: C.gold, fontFamily: F.semi, fontSize: 12.5, lineHeight: 17 },
  fullLink: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.goldDeep, backgroundColor: '#140f05', borderRadius: 12, padding: 12, marginTop: 10 },
  fullLinkT: { color: C.gold, fontFamily: F.bold, fontSize: 13 },
});
