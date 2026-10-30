// Ana menüde Tam Sürüm (Şampiyon Paketi, tek seferlik satın alma) ve maç sonundaki nazik teklif. Yalnızca mağaza sürümünde görünür.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import { L } from '../i18n';
import { buy, buyPremium, closeOffer, dismissUpsell, MONETIZATION, PURCHASES, restorePremium, useAdFree, useOffer, usePremium, usePremiumPrice, usePrice, useUpsellDue, type OfferReason } from '../monetization';
import { LEGEND_IDS } from '../engine/legendRun';
import { getPref, setPref } from '../prefs';
import { ADFREE_SKU } from '../monetization/skus';
import { Button, Icon } from './components';
import { C, F } from './theme';

export function PremiumCard() {
  const premium = usePremium();
  const price = usePremiumPrice();
  const adFree = useAdFree();
  const adPrice = usePrice(ADFREE_SKU);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  if (!MONETIZATION || !PURCHASES) return null;

  if (premium)
    return (
      <View style={[st.box, st.owned]}>
        <Icon name="crown" size={20} color={C.gold} />
        <Text style={st.ownedText}>{L("Şampiyon Paketi aktif · Teşekkürler!")}</Text>
      </View>
    );

  const purchase = async (fn: () => ReturnType<typeof buyPremium>) => {
    setBusy(true);
    setMsg('');
    const r = await fn();
    setBusy(false);
    if (r === 'ok') sfx('fanfare');
    else if (r === 'hata') setMsg(L("Satın alma şu an yapılamadı. İnternet bağlantını kontrol edip tekrar dene."));
  };

  return (
    <LinearGradient colors={['#2a1d05', '#0c0d10']} style={st.box}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="crown" size={22} color={C.gold} />
        <View style={{ flex: 1 }}>
          <Text style={st.kicker}>{L("TAM SÜRÜM")}</Text>
          <Text style={st.title}>{L("ŞAMPİYON PAKETİ")}</Text>
        </View>
      </View>
      <Text style={st.lead}>{L("Oyunun tamamı ücretsiz kalır. Tam sürüm tek seferlik alınır, abonelik yoktur.")}</Text>
      <PremiumCompare />
      {/* Fiyat henüz gelmediyse de basılabilir: satın alma ürünleri önce yeniden ister */}
      <Button label={price ? L("Satın al · {0}", [price]) : L("Satın al")} icon="crown" tone="gold" disabled={busy} onPress={() => purchase(buyPremium)} />
      {adFree ? (
        <Text style={st.adFree}>{L("Reklamsız Paket aktif")}</Text>
      ) : (
        <Pressable disabled={busy} onPress={() => purchase(() => buy(ADFREE_SKU))} style={[st.adBtn, busy && { opacity: 0.5 }]}>
          <Icon name="cancel" size={14} color={C.dim} />
          <Text style={st.adText}>{adPrice ? L("Yalnızca reklamları kaldır · {0}", [adPrice]) : L("Yalnızca reklamları kaldır")}</Text>
        </Pressable>
      )}
      <Pressable
        onPress={async () => {
          setMsg((await restorePremium()) ? '' : L("Bu hesapta satın alma bulunamadı."));
        }}
        hitSlop={8}
      >
        <Text style={st.restore}>{L("Satın alımları geri yükle")}</Text>
      </Pressable>
      {msg ? <Text style={st.msg}>{msg}</Text> : null}
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  box: { borderWidth: 1, borderColor: C.goldDeep, borderRadius: 14, padding: 14, gap: 8, marginTop: 12, marginBottom: 4 },
  owned: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1a1405' },
  ownedText: { color: C.gold, fontFamily: F.semi, fontSize: 13 },
  title: { color: C.gold, fontFamily: F.display, fontSize: 18, letterSpacing: 1 },
  kicker: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 2 },
  lead: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.goldDeep, borderRadius: 12, padding: 12, marginBottom: 12 },
  nudgeTitle: { color: C.text, fontFamily: F.display, fontSize: 14, letterSpacing: 0.5 },
  nudgeSub: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 16 },
  later: { color: C.faint, fontFamily: F.semi, fontSize: 12, textDecorationLine: 'underline' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  item: { color: C.text, fontFamily: F.body, fontSize: 13 },
  adBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingVertical: 10 },
  adText: { color: C.dim, fontFamily: F.semi, fontSize: 13 },
  adFree: { color: C.green, fontFamily: F.semi, fontSize: 12, textAlign: 'center' },
  restore: { color: C.faint, fontFamily: F.semi, fontSize: 12, textAlign: 'center', textDecorationLine: 'underline', marginTop: 2 },
  msg: { color: C.dim, fontFamily: F.semi, fontSize: 12, textAlign: 'center' },
  table: { borderWidth: 1, borderColor: C.border, borderRadius: 10, overflow: 'hidden' },
  tRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: C.border, paddingVertical: 7, paddingHorizontal: 8 },
  tHead: { borderTopWidth: 0, backgroundColor: '#00000055' },
  tHeadText: { color: C.dim, fontFamily: F.display, fontSize: 11, letterSpacing: 1, textAlign: 'center' },
  tCell: { flex: 1 },
  tLabel: { flex: 1.5, color: C.text, fontFamily: F.semi, fontSize: 12 },
  tFree: { color: C.dim, fontFamily: F.body, fontSize: 12, textAlign: 'center' },
  tPro: { color: C.gold, fontFamily: F.bold, fontSize: 12, textAlign: 'center' },
  mWrap: { flex: 1, backgroundColor: '#000000cc', justifyContent: 'center', paddingHorizontal: 16 },
  mBox: { borderWidth: 1, borderColor: C.gold + '66', borderRadius: 16, padding: 16, gap: 10 },
});

/** Maç sonunda nazik tam sürüm teklifi: birkaç reklamdan sonra bir kez; "Şimdi değil" uzun süre gizler. */
export function FullVersionNudge() {
  const premium = usePremium();
  const due = useUpsellDue();
  const price = usePremiumPrice();
  const [busy, setBusy] = useState(false);
  if (!MONETIZATION || !PURCHASES || premium || !due) return null;
  return (
    <LinearGradient colors={['#1d1606', '#0c0d10']} style={st.nudge}>
      <Icon name="crown" size={22} color={C.gold} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={st.nudgeTitle}>{L("Reklamsız oynamak ister misin?")}</Text>
        <Text style={st.nudgeSub}>{L("Tam Sürüm tek seferlik: reklamlar kalkar, ödüller anında gelir, 5 kariyer yuvası ve Altın Seri.")}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 }}>
          <Pressable
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              const r = await buyPremium();
              setBusy(false);
              if (r === 'ok') sfx('fanfare');
            }}
            style={({ pressed }) => [st.adBtn, { flex: 1, borderColor: C.gold, paddingVertical: 8 }, pressed && { opacity: 0.8 }, busy && { opacity: 0.5 }]}
          >
            <Text style={[st.adText, { color: C.gold }]}>{price ? L("Tam Sürüm · {0}", [price]) : L("Tam Sürüm")}</Text>
          </Pressable>
          <Pressable onPress={dismissUpsell} hitSlop={8}>
            <Text style={st.later}>{L("Şimdi değil")}</Text>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

/** Ücretsiz ve Şampiyon karşılaştırması: oyunun tamamı ücretsiz kalır, paket rahatlık ve ekstralar getirir. */
export function PremiumCompare() {
  const rows: [string, string, string][] = [
    [L("Bütün oyun modları"), '✓', '✓'],
    [L("Geçiş reklamları"), L("Var"), L("Yok")],
    [L("Ödüllü teklifler"), L("Reklamla"), L("Anında")],
    [L("Kariyer yuvası"), '3', '5'],
    [L("Efsane Yolları"), L("Conor + 1. bölümler"), L("{0} efsanenin tamamı", [LEGEND_IDS.length])],
    [L("Altın Seri ve Şampiyon çerçevesi"), '—', '✓'],
  ];
  return (
    <View style={st.table}>
      <View style={[st.tRow, st.tHead]}>
        <Text style={[st.tCell, st.tLabel]} />
        <Text style={[st.tCell, st.tHeadText]}>{L("ÜCRETSİZ")}</Text>
        <Text style={[st.tCell, st.tHeadText, { color: C.gold }]}>👑 {L("ŞAMPİYON")}</Text>
      </View>
      {rows.map(([k, a, b]) => (
        <View key={k} style={st.tRow}>
          <Text style={[st.tCell, st.tLabel]}>{k}</Text>
          <Text style={[st.tCell, st.tFree]}>{a}</Text>
          <Text style={[st.tCell, st.tPro]}>{b}</Text>
        </View>
      ))}
    </View>
  );
}

/** Satın alma düğmesi + kısa sonuç mesajı (teklif kartları ve pencere için). */
function BuyPremium() {
  const price = usePremiumPrice();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  return (
    <>
      <Button
        label={price ? L("Şampiyon ol · {0}", [price]) : L("Şampiyon ol")}
        icon="crown"
        tone="gold"
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          setMsg('');
          const r = await buyPremium();
          setBusy(false);
          if (r === 'ok') {
            sfx('fanfare');
            closeOffer();
          } else if (r === 'hata') setMsg(L("Satın alma şu an yapılamadı. İnternet bağlantını kontrol edip tekrar dene."));
        }}
      />
      {msg ? <Text style={st.msg}>{msg}</Text> : null}
    </>
  );
}

const OFFER_TEXT: Record<OfferReason, () => [string, string]> = {
  reklam: () => [L("BUGÜN 3 REKLAM İZLEDİN"), L("Şampiyon Paketi ile bütün ödüller reklamsız ve anında gelir. Tek seferlik alım, abonelik yok.")],
  yuva: () => [L("BÜTÜN YUVALAR DOLU"), L("Şampiyon Paketi ile 5 kariyer yuvası: yeni bir hikâyeye başlamak için eskisini silmen gerekmez.")],
  kemer: () => [L("BİR ŞAMPİYONA YAKIŞIR PAKET"), L("Kemeri kazandın. Şampiyon Paketi ile oyunun bütün ekstralarını aç.")],
};

/** Uygulama kökünde: teklif penceresi (reklam yorgunluğu anı). */
export function PremiumOfferModal() {
  const reason = useOffer();
  const premium = usePremium();
  if (!reason || premium || !MONETIZATION || !PURCHASES) return null;
  const [title, text] = OFFER_TEXT[reason]();
  return (
    <Modal transparent animationType="fade" onRequestClose={closeOffer}>
      <View style={st.mWrap}>
        <LinearGradient colors={['#2a1d05', '#0c0d10']} style={st.mBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="crown" size={22} color={C.gold} />
            <Text style={[st.title, { flex: 1 }]}>{title}</Text>
            <Pressable onPress={closeOffer} hitSlop={10}>
              <Icon name="close" size={20} color={C.faint} />
            </Pressable>
          </View>
          <Text style={st.lead}>{text}</Text>
          <PremiumCompare />
          <BuyPremium />
          <Pressable onPress={closeOffer} hitSlop={8} style={{ alignSelf: 'center' }}>
            <Text style={st.later}>{L("Şimdi değil")}</Text>
          </Pressable>
        </LinearGradient>
      </View>
    </Modal>
  );
}

/** Menüde: bütün yuvalar doluyken 5 yuva teklifi (kapatılırsa 2 hafta görünmez). */
export function SlotsFullOffer() {
  const premium = usePremium();
  const [gone, setGone] = useState(() => Date.now() - Number(getPref('yol_teklif_yuva') || 0) < 14 * 24 * 3600 * 1000);
  if (premium || gone || !MONETIZATION || !PURCHASES) return null;
  const [title, text] = OFFER_TEXT.yuva();
  return (
    <LinearGradient colors={['#1d1606', '#0c0d10']} style={[st.nudge, { flexDirection: 'column', alignItems: 'stretch' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="crown" size={20} color={C.gold} />
        <Text style={[st.nudgeTitle, { flex: 1 }]}>{title}</Text>
        <Pressable
          onPress={() => {
            setPref('yol_teklif_yuva', String(Date.now()));
            setGone(true);
          }}
          hitSlop={10}
        >
          <Icon name="close" size={18} color={C.faint} />
        </Pressable>
      </View>
      <Text style={st.nudgeSub}>{text}</Text>
      <BuyPremium />
    </LinearGradient>
  );
}

/** İlk UCC kemeri kutlamasında bir kez: şampiyonun en mutlu anında, ısrarsız. */
export function BeltOffer() {
  const premium = usePremium();
  const [show] = useState(() => getPref('yol_teklif_kemer') !== '1');
  useEffect(() => {
    if (show) setPref('yol_teklif_kemer', '1');
  }, [show]);
  if (premium || !show || !MONETIZATION || !PURCHASES) return null;
  const [title, text] = OFFER_TEXT.kemer();
  return (
    <LinearGradient colors={['#2a1d05', '#0c0d10']} style={[st.box, { marginTop: 4 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="crown" size={20} color={C.gold} />
        <Text style={[st.title, { fontSize: 15 }]}>{title}</Text>
      </View>
      <Text style={st.lead}>{text}</Text>
      <PremiumCompare />
      <BuyPremium />
    </LinearGradient>
  );
}
