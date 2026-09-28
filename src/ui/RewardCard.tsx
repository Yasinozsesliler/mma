// Kulüpte ödüllü teklifler: reklam izle (ya da Şampiyon Paketi ile ücretsiz al) → +1 gelişim puanı / daha hızlı iyileşme.
// Her dövüş arasında birer kez. Yalnızca mağaza sürümünde (web reklamsız).
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GameState } from '../engine/types';
import { L } from '../i18n';
import { MONETIZATION, showRewarded, usePremium } from '../monetization';
import { sfx } from '../audio';
import type { Act } from './GameScreens';
import { Icon, type IconName } from './components';
import { C, F } from './theme';

/** Kariyerdeki toplam dövüş (profesyonel + amatör): ödüllerin "bu dövüş arası" anahtarı. */
export function careerFights(s: GameState) {
  return s.rekor.g + s.rekor.m + s.rekor.b + (s.amator?.g ?? 0) + (s.amator?.m ?? 0) + (s.amator?.b ?? 0);
}

export function RewardCard({ s, act }: { s: GameState; act: Act }) {
  const premium = usePremium();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  if (!MONETIZATION) return null;
  const n = careerFights(s);
  const offers: { key: 'puan' | 'sakatlik'; icon: IconName; label: string; give: (x: GameState) => void }[] = [];
  if (s.odul?.puanMac !== n)
    offers.push({
      key: 'puan',
      icon: 'star-four-points',
      label: L("+1 gelişim puanı"),
      give: (x) => {
        x.puan += 1;
        x.odul = { ...x.odul, puanMac: n };
      },
    });
  if (s.sakatliklar.length && s.odul?.sakatlikMac !== n)
    offers.push({
      key: 'sakatlik',
      icon: 'medical-bag',
      label: L("Sakatlık 2 hafta erken iyileşsin"),
      give: (x) => {
        x.sakatliklar = x.sakatliklar.map((j) => ({ ...j, hafta: Math.max(1, j.hafta - 2) }));
        x.odul = { ...x.odul, sakatlikMac: n };
      },
    });
  if (!offers.length) return null;

  const claim = async (o: (typeof offers)[number]) => {
    if (busy) return;
    setBusy(true);
    setMsg('');
    const r = await showRewarded();
    setBusy(false);
    if (r === 'odul') {
      sfx('chime');
      act(o.give);
    } else if (r === 'yok') setMsg(L("Şu an reklam yok. Biraz sonra tekrar dene."));
  };

  return (
    <View style={st.box}>
      <Text style={st.kicker}>{premium ? L("👑 ŞAMPİYON PAKETİ · ÜCRETSİZ") : L("📺 REKLAM İZLE, ÖDÜLÜ KAP")}</Text>
      {offers.map((o) => (
        <Pressable key={o.key} onPress={() => claim(o)} disabled={busy} style={({ pressed }) => [st.row, (pressed || busy) && { opacity: 0.7 }]}>
          <Icon name={o.icon} size={18} color={C.gold} />
          <Text style={st.label}>{o.label}</Text>
          <View style={st.pill}>
            <Icon name={premium ? 'crown' : 'play-circle'} size={14} color="#1f1605" />
            <Text style={st.pillText}>{premium ? L("AL") : L("İZLE")}</Text>
          </View>
        </Pressable>
      ))}
      {msg ? <Text style={st.msg}>{msg}</Text> : null}
    </View>
  );
}

const st = StyleSheet.create({
  box: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, gap: 6, marginBottom: 12 },
  kicker: { color: C.goldDeep, fontFamily: F.semi, fontSize: 10, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  label: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 13 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.gold, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { color: '#1f1605', fontFamily: F.bold, fontSize: 11 },
  msg: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
});
