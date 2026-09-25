import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { STAGE_LABELS } from '../engine/career';
import { BACKGROUNDS } from '../engine/data';
import type { Background, GameState } from '../engine/types';
import { Button, Card, Icon, Logo, Pill, Screen, Section, type IconName } from './components';
import { StatusPanel } from './StatusPanel';
import { useOfflineStatus } from './offline';
import { C, F } from './theme';

const GUIDE: { baslik: string; icon: IconName; icerik: string[] }[] = [
  {
    baslik: 'Karakterini Nasıl Kurarsın?',
    icon: 'account-star',
    icerik: [
      '🌍 Uyruk: Antrenman imkânı başlangıç istatistiklerini, taraftar desteği başlangıç popülerliğini belirler. İlk salonun ve hocan da ülkene göre gelir.',
      '🎂 Yaş (18-30): Genç başlarsan ham ama hızlı gelişirsin (×1.3). Yaşlı başlarsan güçlü başlarsın ama 32’den sonra hız ve çene düşmeye başlar. 41’de emeklilik kaçınılmazdır.',
      '⚖️ Sıklet: Hafif sıkletler hızlı ve dayanıklıdır, ağır sıkletler sert vurur ama çabuk yorulur.',
      '🥋 Branş: En önemli seçim. Güçlü ve zayıf yönlerini, dolayısıyla nasıl dövüşeceğini belirler.',
      '📖 Hikâye: Kendin yazabilir ya da oyuna yazdırabilirsin.',
      '🎲 Zar: Son adımda istatistiklerin zarla belirlenir. Beğenmezsen 2 kez yeniden atabilirsin.',
    ],
  },
  {
    baslik: 'Gelişim Puanı',
    icon: 'star-four-points',
    icerik: [
      'Kariyere 3 puanla başlarsın. Her antrenman kampı 1-3 puan verir (yoğunluk, yaş, kamp yeri, hoca ve kadro kalitesine bağlı). Kampın odak alanı ayrıca +1-3 gelişir.',
      'Dövüşler de puan verir: galibiyet 2, bitiriş +1, bonus +1, kemer +1. Mağlubiyet ve beraberlik 1 puan.',
      '📅 Bir dövüş döngüsü (kamp + toparlanma) yaklaşık 90-100 gün sürer. Yılda 3-4 kez dövüşürsün; her karar önemli.',
      'Puanı istediğin istatistiğe harcarsın. 50’ye kadar +1 için 1 puan, 70’e kadar 2, 85’e kadar 3, sonrası 4 puan gerekir.',
      'Kamp sonunda tartıdan önce, dövüş sonrasında ya da Kariyer ekranındaki GELİŞİM sekmesinden harcayabilirsin.',
    ],
  },
  {
    baslik: 'Nasıl Oynanır?',
    icon: 'gamepad-variant',
    icerik: [
      '1️⃣ Rakip seç. Bölgesel aşamada sen seçersin, büyük organizasyonlarda rakibi organizasyon dayatır.',
      '2️⃣ Kamp: odak alanı, oyun planı, yoğunluk, kilo verme ve basın toplantısı. Oyun planı rakibin zaafına denk gelirse kafeste büyük avantaj sağlar.',
      '3️⃣ Dövüş: her raunt taktik seçersin. Kritik anlarda (rakip sarsıldı, submission yakalandı) hızlı karar verirsin.',
      '4️⃣ Sonrası: bonuslar, röportaj, sıralama, kontrat teklifleri ve dövüşler arası olaylar.',
      '🏆 Yol: Amatör → Bölgesel (CFC, Oktagon) → Büyük (PFL, ONE, MVP) → DWCS veya kısa haber → UFC kemeri.',
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

function Row({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={ms.row}>
      <Icon name={icon} size={15} color={C.faint} />
      <Text style={ms.line}>{text}</Text>
    </View>
  );
}

export function MenuScreen({ save, onNew, onContinue }: { save: GameState | null; onNew: () => void; onContinue: () => void }) {
  const [open, setOpen] = useState<number | null>(save ? null : 0);
  const retired = save?.phase === 'emeklilik';
  const active = save && !retired;
  const off = useOfflineStatus();
  return (
    <Screen
      footer={
        <>
          {active ? <Button label="Devam et" icon="play" tone="gold" onPress={onContinue} /> : null}
          <Button label="Yeni kariyer" icon="plus" onPress={onNew} tone={active ? 'ghost' : 'red'} />
          {active ? <Text style={ms.warn}>Yeni kariyer tamamlandığında mevcut kayıt silinir.</Text> : null}
        </>
      }
    >
      <LinearGradient colors={['#3b0d14', 'rgba(10,11,14,0)']} style={ms.hero}>
        <Logo size={96} />
        <Text style={ms.brand}>Y O L</Text>
        <Text style={ms.heroTitle}>KAFESTEN KEMERE</Text>
        <Text style={ms.heroSub}>Sıfırdan UFC şampiyonluğuna. Her karar senin.</Text>
        {off ? (
          <View style={[ms.off, { borderColor: (off.durum === 'hazir' ? C.green : C.gold) + '66' }]}>
            <Icon name={off.durum === 'hazir' ? 'cloud-check' : 'cloud-download'} size={14} color={off.durum === 'hazir' ? C.green : C.gold} />
            <Text style={[ms.offText, { color: off.durum === 'hazir' ? C.green : C.gold }]}>
              {off.durum === 'hazir'
                ? `Çevrimdışı oynamaya hazır · sürüm ${off.surum}`
                : off.durum === 'guncelleniyor'
                  ? 'Yeni sürüm indiriliyor… uygulamayı kapatma'
                  : `Çevrimdışı için indiriliyor${off.toplam ? ` (${off.toplam - (off.eksik ?? 0)}/${off.toplam})` : '…'}`}
            </Text>
          </View>
        ) : null}
      </LinearGradient>

      {save ? (
        <>
          <Section>{retired ? 'SON KARİYER (EMEKLİ)' : 'MEVCUT KARİYER'}</Section>
          <StatusPanel s={save} />
          <Card>
            <Row icon="stairs-up" text={`${STAGE_LABELS[save.stage]} · Amatör ${save.amator.g}-${save.amator.m}-${save.amator.b}`} />
            {save.gecmis[0] ? (
              <Row
                icon="history"
                text={`Son dövüş: ${save.gecmis[0].sonuc === 'G' ? 'Galibiyet' : save.gecmis[0].sonuc === 'M' ? 'Mağlubiyet' : 'Beraberlik'} · ${save.gecmis[0].rakip} (${save.gecmis[0].yontem})`}
              />
            ) : null}
            {save.fighter.hikaye ? <Text style={[ms.line, { fontStyle: 'italic', marginTop: 6 }]}>“{save.fighter.hikaye}”</Text> : null}
          </Card>
        </>
      ) : (
        <Card>
          <Text style={ms.intro}>Saat gece 02:14. Şehrin kenarında, tabelasının yarısı yanmayan bir spor salonu var.</Text>
          <Text style={ms.intro}>İçeride tek bir ampul yanıyor. Duvarda solmuş bir poster var: sekizgen bir kafes ve havaya kaldırılmış altın bir kemer.</Text>
          <Text style={[ms.intro, { color: C.gold, fontStyle: 'italic' }]}>“Herkes kemeri ister. Pek azı yolu yürür.”</Text>
          <Text style={[ms.intro, { color: C.text, fontFamily: F.bold, marginBottom: 0 }]}>Bu senin hikâyen. Her yumruk, her karar, her hata senin.</Text>
        </Card>
      )}

      <Section>REHBER</Section>
      {GUIDE.map((g, i) => (
        <Collapsible key={g.baslik} baslik={g.baslik} icon={g.icon} open={open === i} onToggle={() => setOpen(open === i ? null : i)}>
          {g.icerik.map((l, j) => (
            <Text key={j} style={ms.guide}>
              {l}
            </Text>
          ))}
        </Collapsible>
      ))}
      <Collapsible baslik="Branşlar" icon="karate" open={open === 99} onToggle={() => setOpen(open === 99 ? null : 99)}>
        {(Object.keys(BACKGROUNDS) as Background[]).map((b) => {
          const info = BACKGROUNDS[b];
          const zc = info.zorluk === 'Kolay' ? C.green : info.zorluk === 'Orta' ? C.gold : C.red;
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
    </Screen>
  );
}

const ms = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 28, paddingBottom: 20, marginHorizontal: -16, marginTop: -16, marginBottom: 8 },
  brand: { color: C.red, fontFamily: F.display, fontSize: 14, letterSpacing: 6, marginTop: 14 },
  heroTitle: { color: C.text, fontFamily: F.display, fontSize: 42, letterSpacing: 1, lineHeight: 48, textAlign: 'center' },
  heroSub: { color: C.dim, fontFamily: F.body, fontSize: 14, marginTop: 4, textAlign: 'center' },
  off: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  offText: { fontFamily: F.semi, fontSize: 11 },
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
});
