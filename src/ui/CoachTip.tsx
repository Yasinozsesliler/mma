// İlk kez gelinen ekranlarda oyuncunun hocasından kısa bir ipucu. Yalnızca yeni kariyerlerde görünür.
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type { GameState } from '../engine/types';
import { L, LOC } from '../i18n';
import type { Act } from './GameScreens';
import { Icon } from './components';
import { C, F } from './theme';

export type TipId = 'hub' | 'gelisim' | 'rakip' | 'kamp' | 'plan' | 'yuzyuze' | 'dovus' | 'macSonrasi';

const TIPS: Record<TipId, { baslik: string; metin: string }> = {
  hub: {
    baslik: L("Burası senin köşen"),
    metin: L("Üstte paran, sağlığın ve popülerliğin var. Hazır olduğunda “DÖVÜŞ AYARLA” ile rakibini seç. “İlk adımlar” sana yol gösterecek; maç yaptıkça yeni şeyler açılacak. Ama unutma, her şeyin bir bedeli var."),
  },
  gelisim: {
    baslik: L("Gelişim puanları"),
    metin: L("Kamplardan ve dövüşlerden puan kazanırsın, burada istatistiklerine dağıtırsın. 50’den sonra her artış pahalanır; zayıf yönünü kapatmak çoğu zaman daha akıllıcadır."),
  },
  rakip: {
    baslik: L("Rakibini seç"),
    metin: L("Her rakibin gücü ve zayıf yönü yazıyor. Kolay rakip güvenlidir ama az kazandırır; riskli bir rakibi yenersen sıralamada büyük bir sıçrama yaparsın."),
  },
  kamp: {
    baslik: L("Kamp başlıyor"),
    metin: L("Önce kampın süresini seç. Uzun kamp daha çok geliştirir ama pahalıdır ve yorar. Kamptan önceki boş haftalarda teknik çalışabilir, spar yapabilirsin."),
  },
  plan: {
    baslik: L("Oyun planı"),
    metin: L("Rakibin zayıf yönüne uyan plan, dövüşte etkisini ikiye katlar. Keşif raporuna bak ve planını ona göre seç."),
  },
  yuzyuze: {
    baslik: L("Burun buruna"),
    metin: L("Tartıdan sonra rakibinle yüz yüze geleceksin. Takındığın tavır onun moralini bozabilir ya da sana pahalıya patlayabilir."),
  },
  dovus: {
    baslik: L("Dövüş gecesi"),
    metin: L("Her raundun başında bir taktik seç, dövüş kendi akar. Rakip sarsıldığında ya da bir submission fırsatında hızlı karar vermen gerekir. Kondisyonunu izle: yorulursan her şey zorlaşır."),
  },
  macSonrasi: {
    baslik: L("Dövüş bitti"),
    metin: L("Mikrofon sende: röportajdaki sözlerin popülerliğini etkiler. Kazandığın puanları GELİŞİM sekmesinde harca. Güzel bir galibiyet mi? Paylaş, herkes görsün!"),
  },
};

const ALL = Object.keys(TIPS) as TipId[];

export function CoachTip({ s, act, id }: { s: GameState; act: Act; id: TipId | null }) {
  const a = useRef(new Animated.Value(0)).current;
  const show = !!id && !!s.ipuclari && !s.ipuclari.includes(id);
  useEffect(() => {
    if (show) Animated.timing(a, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [show, a]);
  if (!show || !id) return null;
  const t = TIPS[id];
  return (
    <Animated.View style={[st.box, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }]}>
      <View style={st.head}>
        <View style={st.badge}>
          <Icon name="whistle" size={16} color="#1f1605" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.kicker}>{L("HOCAN · {0}", [s.takim.antrenor]).toLocaleUpperCase(LOC)}</Text>
          <Text style={st.title}>{t.baslik}</Text>
        </View>
      </View>
      <Text style={st.text}>{t.metin}</Text>
      <View style={st.row}>
        <Pressable onPress={() => act((x) => void (x.ipuclari = [...(x.ipuclari ?? []), id]))} style={({ pressed }) => [st.ok, pressed && { opacity: 0.8 }]}>
          <Text style={st.okText}>{L("ANLADIM")}</Text>
        </Pressable>
        <Pressable onPress={() => act((x) => void (x.ipuclari = [...ALL]))} hitSlop={8}>
          <Text style={st.off}>{L("İpuçlarını kapat")}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  box: { backgroundColor: '#15120a', borderWidth: 1, borderColor: C.goldDeep, borderLeftWidth: 4, borderLeftColor: C.gold, borderRadius: 12, padding: 12, marginBottom: 12, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  kicker: { color: C.goldDeep, fontFamily: F.semi, fontSize: 10, letterSpacing: 1 },
  title: { color: C.gold, fontFamily: F.display, fontSize: 17 },
  text: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  ok: { backgroundColor: C.gold, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  okText: { color: '#1f1605', fontFamily: F.bold, fontSize: 12, letterSpacing: 0.5 },
  off: { color: C.faint, fontFamily: F.semi, fontSize: 12, textDecorationLine: 'underline' },
});
