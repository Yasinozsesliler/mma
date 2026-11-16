// Kariyer ana ekranında kişisel öneri kartı: oynayışa göre denenmemiş bir modu ücretsiz denemeye davet eder.
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { track } from '../analytics';
import { careerFights } from '../engine/rewards';
import type { GameState } from '../engine/types';
import { L } from '../i18n';
import { requestLegend } from '../legendNav';
import { requestMode } from '../modeNav';
import { acceptPersonal, dismissPersonal, pickPersonal, usePersonalTick, type PersonalId } from '../monetization/personal';
import { Icon, type IconName } from './components';
import { C, F } from './theme';

const COPY: Record<PersonalId, { icon: IconName; title: () => string; desc: () => string; cta: () => string }> = {
  patron: {
    icon: 'office-building',
    title: () => L("Bir gün kendi organizasyonun olsun mu?"),
    desc: () => L("Patron Modu'nda sıfırdan bir organizasyon kur: dövüşçü imzala, kart yap, geceleri doldur. İlk geceler ücretsiz."),
    cta: () => L("Patron Modu'nu dene"),
  },
  menajer: {
    icon: 'briefcase-account',
    title: () => L("Kafesin dışından da kazanılır"),
    desc: () => L("Menajer Modu'nda dövüşçüleri yönet, sözleşmeleri sen pazarlık et. Ücretsiz deneyebilirsin."),
    cta: () => L("Menajer Modu'nu dene"),
  },
  efsane: {
    icon: 'star-circle',
    title: () => L("Efsanelerin yolunu yürü"),
    desc: () => L("Efsane Yolları'nda büyük bir kariyeri yeniden yaz. İlk efsane tamamen ücretsiz."),
    cta: () => L("Efsane Yolları'na bak"),
  },
};

export function PersonalOffer({ s }: { s: GameState }) {
  usePersonalTick();
  // Yalnızca ekran açılışında bir kez seçilir
  const [id, setId] = useState<PersonalId | null>(() =>
    s.efsane ? null : pickPersonal({ fights: careerFights(s), lostLast: s.gecmis[0]?.sonuc === 'M', champion: !!s.sampiyon, retired: false }),
  );
  const [first] = useState(id);
  useEffect(() => {
    if (first) track('personal_offer', { tur: first });
  }, [first]);
  if (!id) return null;
  const c = COPY[id];
  const go = () => {
    track('personal_offer_go', { tur: id });
    acceptPersonal(id);
    setId(null);
    if (id === 'efsane') {
      requestLegend();
      requestMode('menu');
    } else requestMode(id === 'patron' ? 'patron' : 'manager');
  };
  const later = () => {
    track('personal_offer_later', { tur: id });
    dismissPersonal(id);
    setId(null);
  };
  return (
    <View style={st.box}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <View style={st.icon}>
          <Icon name={c.icon} size={20} color={C.gold} />
        </View>
        <Text style={st.title}>{c.title()}</Text>
      </View>
      <Text style={st.desc}>{c.desc()}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={go} style={({ pressed }) => [st.cta, pressed && { opacity: 0.8 }]}>
          <Text style={st.ctaText}>{c.cta()}</Text>
          <Icon name="chevron-right" size={16} color="#1f1605" />
        </Pressable>
        <Pressable onPress={later} hitSlop={8}>
          <Text style={st.later}>{L("Şimdi değil")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  box: { backgroundColor: '#12100c', borderWidth: 1, borderColor: C.goldDeep, borderRadius: 12, padding: 12, gap: 8, marginVertical: 6 },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#2a2210', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: C.gold, fontFamily: F.bold, fontSize: 13.5 },
  desc: { color: C.dim, fontFamily: F.body, fontSize: 12.5, lineHeight: 18 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: C.gold, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  ctaText: { color: '#1f1605', fontFamily: F.bold, fontSize: 12 },
  later: { color: C.faint, fontFamily: F.semi, fontSize: 12 },
});
