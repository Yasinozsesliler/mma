// Tek bir ödüllü teklif: "Reklam izle → ödül". Şampiyon Paketi sahiplerine ücretsiz ve anında.
// İlgili ekranın içinde, ihtiyaç anında gösterilir. Web sürümünde (reklamsız) hiç görünmez.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import { L } from '../i18n';
import { hourActive, MONETIZATION, PURCHASES, showRewarded, useHour, usePremium } from '../monetization';
import { Icon, type IconName } from './components';
import { C, F } from './theme';

export function AdOffer({ icon, title, desc, onReward }: { icon: IconName; title: string; desc: string; onReward: () => void }) {
  useHour();
  const premium = usePremium() || hourActive();

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  if (!MONETIZATION) return null;

  const claim = async () => {
    if (busy) return;
    setBusy(true);
    setMsg('');
    const r = await showRewarded();
    setBusy(false);
    if (r === 'odul') {
      sfx('chime');
      onReward();
    } else if (r === 'yok') setMsg(L("Şu an reklam yok. Biraz sonra tekrar dene."));
  };

  return (
    <Pressable onPress={claim} disabled={busy} style={({ pressed }) => [st.box, (pressed || busy) && { opacity: 0.75 }]}>
      <View style={st.icon}>
        <Icon name={icon} size={20} color={C.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.title}>{title}</Text>
        <Text style={st.desc}>{desc}</Text>
        {msg ? <Text style={st.msg}>{msg}</Text> : null}
        {PURCHASES && !premium ? <Text style={st.note}>{L("👑 Şampiyon Paketi ile reklamsız, anında")}</Text> : null}
      </View>
      <View style={st.pill}>
        <Icon name={premium ? 'crown' : 'play-circle'} size={14} color="#1f1605" />
        <Text style={st.pillText}>{premium ? L("AL") : L("İZLE")}</Text>
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#15120a', borderWidth: 1, borderColor: C.goldDeep, borderStyle: 'dashed', borderRadius: 12, padding: 10, marginVertical: 8 },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2a2210', alignItems: 'center', justifyContent: 'center' },
  title: { color: C.gold, fontFamily: F.bold, fontSize: 13 },
  desc: { color: C.dim, fontFamily: F.body, fontSize: 12, marginTop: 1 },
  msg: { color: C.faint, fontFamily: F.semi, fontSize: 11, marginTop: 3 },
  note: { color: C.faint, fontFamily: F.body, fontSize: 10, marginTop: 3, opacity: 0.8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.gold, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { color: '#1f1605', fontFamily: F.bold, fontSize: 11 },
});
