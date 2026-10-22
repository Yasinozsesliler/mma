// Ana menüde Tam Sürüm (Şampiyon Paketi, tek seferlik satın alma) ve maç sonundaki nazik teklif. Yalnızca mağaza sürümünde görünür.
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import { L } from '../i18n';
import { buy, buyPremium, dismissUpsell, MONETIZATION, PURCHASES, restorePremium, useAdFree, usePremium, usePremiumPrice, usePrice, useUpsellDue } from '../monetization';
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
      {[L("Reklamsız oyun"), L("Ödüller reklam izlemeden, anında"), L("5 kariyer yuvası (3 yerine)"), L("Altın Seri kozmetik paketi ve Şampiyon çerçevesi"), L("Oyunun gelişimine destek")].map((t) => (
        <View key={t} style={st.row}>
          <Icon name="check-bold" size={14} color={C.green} />
          <Text style={st.item}>{t}</Text>
        </View>
      ))}
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
