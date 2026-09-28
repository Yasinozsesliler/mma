// Ana menüde Şampiyon Paketi (tek seferlik satın alma). Yalnızca mağaza sürümünde görünür.
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import { L } from '../i18n';
import { buyPremium, MONETIZATION, restorePremium, usePremium, usePremiumPrice } from '../monetization';
import { Button, Icon } from './components';
import { C, F } from './theme';

export function PremiumCard() {
  const premium = usePremium();
  const price = usePremiumPrice();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  if (!MONETIZATION) return null;

  if (premium)
    return (
      <View style={[st.box, st.owned]}>
        <Icon name="crown" size={20} color={C.gold} />
        <Text style={st.ownedText}>{L("Şampiyon Paketi aktif · Teşekkürler!")}</Text>
      </View>
    );

  const buy = async () => {
    setBusy(true);
    setMsg('');
    const r = await buyPremium();
    setBusy(false);
    if (r === 'ok') sfx('fanfare');
    else if (r === 'hata') setMsg(L("Satın alma şu an yapılamadı. İnternet bağlantını kontrol edip tekrar dene."));
  };

  return (
    <LinearGradient colors={['#2a1d05', '#0c0d10']} style={st.box}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="crown" size={22} color={C.gold} />
        <Text style={st.title}>{L("ŞAMPİYON PAKETİ")}</Text>
      </View>
      {[L("Reklamsız oyun"), L("Ödüller reklam izlemeden, anında"), L("5 kariyer yuvası (3 yerine)"), L("Oyunun gelişimine destek")].map((t) => (
        <View key={t} style={st.row}>
          <Icon name="check-bold" size={14} color={C.green} />
          <Text style={st.item}>{t}</Text>
        </View>
      ))}
      <Button label={price ? L("Satın al · {0}", [price]) : L("Satın al")} icon="crown" tone="gold" disabled={busy || !price} onPress={buy} />
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  item: { color: C.text, fontFamily: F.body, fontSize: 13 },
  restore: { color: C.faint, fontFamily: F.semi, fontSize: 12, textAlign: 'center', textDecorationLine: 'underline', marginTop: 2 },
  msg: { color: C.dim, fontFamily: F.semi, fontSize: 12, textAlign: 'center' },
});
