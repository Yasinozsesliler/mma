// Dolap: kozmetikleri önizle, kuşan ve paketleri satın al. Kozmetikler yalnızca görünümü değiştirir, oyun gücü vermez.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Ellipse, G } from 'react-native-svg';
import { playWalkout, pushScene, sfx, walkoutSeconds } from '../audio';
import { clearNew, equip, useCosmetics, useUnlocked } from '../cosmetics';
import { COSMETICS, PACKS, type Cosmetic, type CosSlot } from '../engine/cosmetics';
import type { Appearance } from '../engine/types';
import { L, LOC } from '../i18n';
import { buy, MONETIZATION, restorePurchases, useOwned, usePrice } from '../monetization';
import { Belt } from './Belt';
import { Button, Icon, Screen, Section, SLANT, Title, type IconName } from './components';
import { DEFAULT_LOOK, FighterAvatar } from './FighterAvatar';
import { Figure, HIP_H, POSES } from './rig';
import { C, F } from './theme';

const TABS: { slot: CosSlot; ad: string; ikon: IconName }[] = [
  { slot: 'sort', ad: L("Şort"), ikon: 'tshirt-crew' },
  { slot: 'eldiven', ad: L("Eldiven"), ikon: 'boxing-glove' },
  { slot: 'cerceve', ad: L("Çerçeve"), ikon: 'octagon-outline' },
  { slot: 'kemer', ad: L("Kemer"), ikon: 'trophy' },
  { slot: 'giris', ad: L("Giriş müziği"), ikon: 'music' },
];

const PACK_NAME = Object.fromEntries(PACKS.map((p) => [p.sku, p.ad]));

function lockText(x: Cosmetic) {
  const k = x.kaynak;
  if (k.tur === 'basari') return k.aciklama;
  if (k.tur === 'sampiyon') return L("Şampiyon Paketi ile gelir");
  if (k.tur === 'paket') return L("{0} paketinde", [PACK_NAME[k.sku]]);
  return '';
}

/** Kafesteki dövüşçü, seçili kıyafetle. */
function KitPreview({ look, sort, eldiven, size = 120 }: { look: Appearance; sort: string[]; eldiven: string; size?: number }) {
  return (
    <Svg width={size} height={size * 1.25} viewBox="0 0 100 125">
      <Ellipse cx={50} cy={118} rx={22} ry={4} fill="#000" opacity={0.35} />
      <G transform={`translate(50 ${118 - HIP_H * 1.1}) scale(1.1 1.1)`}>
        <Figure p={POSES.stance} look={look} kit={{ shorts: sort[0], trim: sort[1], glove: eldiven }} />
      </G>
    </Svg>
  );
}

function Swatch({ x, look }: { x: Cosmetic; look: Appearance }) {
  if (x.slot === 'sort') return <KitPreview look={look} sort={x.renk} eldiven="#b8121f" size={64} />;
  if (x.slot === 'eldiven') return <KitPreview look={look} sort={['#2a2d33', '#555']} eldiven={x.renk[0]} size={64} />;
  if (x.slot === 'cerceve') return <FighterAvatar look={look} size={62} ring={x.renk[0] ?? C.red} />;
  if (x.slot === 'kemer') return <Belt org="ufc" width={110} skin={x.renk.length ? x.renk : null} />;
  return (
    <View style={ls.music}>
      <Icon name={x.giris ? 'music' : 'account-group'} size={30} color={x.giris ? C.gold : C.faint} />
    </View>
  );
}

function Item({ x, look, on, open, onPick }: { x: Cosmetic; look: Appearance; on: boolean; open: boolean; onPick: () => void }) {
  return (
    <Pressable onPress={onPick} style={[ls.item, on && ls.itemOn, !open && { opacity: 0.55 }]}>
      <View style={ls.swatch}>
        <Swatch x={x} look={look} />
      </View>
      <Text style={ls.itemName} numberOfLines={1}>
        {x.ad}
      </Text>
      {on ? (
        <Text style={[ls.itemState, { color: C.green }]}>{L("KUŞANILDI")}</Text>
      ) : open ? (
        <Text style={[ls.itemState, { color: C.gold }]}>{x.slot === 'giris' && x.giris ? L("DİNLE · KUŞAN") : L("KUŞAN")}</Text>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name="lock" size={11} color={C.faint} />
          <Text style={ls.lock} numberOfLines={3}>
            {lockText(x)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function PackCard({ sku, ad, aciklama, renk }: (typeof PACKS)[number]) {
  const owned = useOwned().has(sku);
  const price = usePrice(sku);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  return (
    <LinearGradient colors={[`${renk}33`, '#0c0d10']} style={[ls.pack, { borderColor: `${renk}88` }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="package-variant-closed" size={20} color={renk} />
        <Text style={[ls.packTitle, SLANT]}>{ad.toLocaleUpperCase(LOC)}</Text>
        {owned ? <Icon name="check-decagram" size={18} color={C.green} /> : null}
      </View>
      <Text style={ls.packDesc}>{aciklama}</Text>
      {owned ? (
        <Text style={[ls.packNote, { color: C.green }]}>{L("Sende · Parçalar dolabında")}</Text>
      ) : MONETIZATION ? (
        <Button
          label={price ? L("Satın al · {0}", [price]) : L("Satın al")}
          icon="cart"
          tone="gold"
          disabled={busy || !price}
          onPress={async () => {
            setBusy(true);
            setMsg('');
            const r = await buy(sku);
            setBusy(false);
            if (r === 'ok') sfx('fanfare');
            else if (r === 'hata') setMsg(L("Satın alma şu an yapılamadı. İnternet bağlantını kontrol edip tekrar dene."));
          }}
        />
      ) : (
        <Text style={ls.packNote}>{L("Google Play'deki uygulamada satın alınabilir.")}</Text>
      )}
      {msg ? <Text style={ls.packNote}>{msg}</Text> : null}
    </LinearGradient>
  );
}

export function LockerScreen({ look = DEFAULT_LOOK, onExit }: { look?: Appearance; onExit: () => void }) {
  const st = useCosmetics();
  const unlocked = useUnlocked();
  const [tab, setTab] = useState<CosSlot>('sort');
  const [restoreMsg, setRestoreMsg] = useState('');
  const yeni = new Set(st.yeni);
  // Ekrana girince "yeni" rozetleri görülmüş sayılır (çıkarken temizlenir ki ilk bakışta işaretli kalsın).
  useEffect(() => () => clearNew(), []);

  const byId = (id: string) => COSMETICS.find((x) => x.id === id)!;
  const sort = byId(st.equip.sort);
  const eld = byId(st.equip.eldiven);
  const cer = byId(st.equip.cerceve);
  const kem = byId(st.equip.kemer);
  const gir = byId(st.equip.giris);
  const safe = (x: Cosmetic, slot: CosSlot) => (unlocked(x) ? x : COSMETICS.find((c) => c.slot === slot && c.kaynak.tur === 'hazir')!);

  const listen = (x: Cosmetic) => {
    if (!x.giris) return;
    const un = pushScene('off');
    playWalkout(x.giris);
    setTimeout(un, walkoutSeconds(x.giris) * 1000);
  };

  const pick = (x: Cosmetic) => {
    if (x.slot === 'giris') listen(x);
    if (!unlocked(x)) return;
    sfx('click');
    equip(x);
  };

  return (
    <Screen footer={<Button label={L("Ana menü")} icon="arrow-left" tone="ghost" onPress={onExit} />}>
      <Title kicker={L("YALNIZCA GÖRÜNÜM · OYUN GÜCÜ VERMEZ")} sub={L("Oynayarak yenilerini aç ya da paketlerle koleksiyonunu büyüt.")}>
        {L("Dolap")}
      </Title>

      <LinearGradient colors={['#1d0a0e', '#0c0d10']} style={ls.hero}>
        <KitPreview look={look} sort={safe(sort, 'sort').renk} eldiven={safe(eld, 'eldiven').renk[0]} size={120} />
        <View style={{ flex: 1, alignItems: 'center', gap: 10 }}>
          <FighterAvatar look={look} size={76} ring={safe(cer, 'cerceve').renk[0] ?? C.red} />
          <Belt org="ufc" width={140} skin={safe(kem, 'kemer').renk.length ? safe(kem, 'kemer').renk : null} />
          <Pressable onPress={() => listen(safe(gir, 'giris'))} style={ls.walk} hitSlop={6}>
            <Icon name="music" size={14} color={safe(gir, 'giris').giris ? C.gold : C.faint} />
            <Text style={ls.walkText}>{safe(gir, 'giris').ad}</Text>
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 12 }}>
        {TABS.map((t) => {
          const n = COSMETICS.filter((x) => x.slot === t.slot && yeni.has(x.id)).length;
          return (
            <Pressable key={t.slot} onPress={() => setTab(t.slot)} style={[ls.tab, tab === t.slot && ls.tabOn]}>
              <Icon name={t.ikon} size={15} color={tab === t.slot ? '#000' : C.dim} />
              <Text style={[ls.tabText, tab === t.slot && { color: '#000' }]}>{t.ad}</Text>
              {n ? <View style={ls.dot} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={ls.grid}>
        {COSMETICS.filter((x) => x.slot === tab).map((x) => (
          <View key={x.id} style={ls.cell}>
            <Item x={x} look={look} on={st.equip[x.slot] === x.id} open={unlocked(x)} onPick={() => pick(x)} />
            {yeni.has(x.id) ? <Text style={ls.newTag}>{L("YENİ")}</Text> : null}
          </View>
        ))}
      </View>

      <Section>{L("PAKETLER")}</Section>
      {PACKS.map((p) => (
        <PackCard key={p.sku} {...p} />
      ))}
      {MONETIZATION ? (
        <Pressable
          onPress={async () => setRestoreMsg((await restorePurchases()) ? L("Satın alımların geri yüklendi.") : L("Bu hesapta satın alma bulunamadı."))}
          hitSlop={8}
          style={{ marginTop: 6, marginBottom: 12 }}
        >
          <Text style={ls.restore}>{L("Satın alımları geri yükle")}</Text>
          {restoreMsg ? <Text style={[ls.packNote, { textAlign: 'center' }]}>{restoreMsg}</Text> : null}
        </Pressable>
      ) : null}
    </Screen>
  );
}

const ls = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 12, gap: 8 },
  walk: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  walkText: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  tabOn: { backgroundColor: C.gold, borderColor: C.gold },
  tabText: { color: C.dim, fontFamily: F.semi, fontSize: 13 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.red },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 8 },
  cell: { width: '33.333%', padding: 4 },
  item: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 8, alignItems: 'center', gap: 4, minHeight: 164 },
  itemOn: { borderColor: C.green, backgroundColor: '#0c1a12' },
  swatch: { height: 82, alignItems: 'center', justifyContent: 'center' },
  music: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#15161a', alignItems: 'center', justifyContent: 'center' },
  itemName: { color: C.text, fontFamily: F.semi, fontSize: 12, textAlign: 'center' },
  itemState: { fontFamily: F.display, fontSize: 10, letterSpacing: 1 },
  lock: { color: C.faint, fontFamily: F.body, fontSize: 10, textAlign: 'center', flexShrink: 1 },
  newTag: { position: 'absolute', top: 8, right: 8, backgroundColor: C.red, color: '#fff', fontFamily: F.display, fontSize: 9, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  pack: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8, marginBottom: 10 },
  packTitle: { color: C.text, fontFamily: F.display, fontSize: 17, letterSpacing: 1, flex: 1 },
  packDesc: { color: C.dim, fontFamily: F.body, fontSize: 13 },
  packNote: { color: C.faint, fontFamily: F.semi, fontSize: 12 },
  restore: { color: C.faint, fontFamily: F.semi, fontSize: 12, textAlign: 'center', textDecorationLine: 'underline' },
});
