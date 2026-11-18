// Dolap: kozmetikleri önizle, kuşan ve paketleri satın al. Kozmetikler yalnızca görünümü değiştirir, oyun gücü vermez.
// Kilitli bir eşyaya ya da paketin "Dene" düğmesine dokununca dövüşçü vitrinde onu giymiş görünür (önizleme).
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, Ellipse, G, LinearGradient as SvgLinear, Polygon, Stop } from 'react-native-svg';
import { playWalkout, pushScene, sfx, walkoutSeconds } from '../audio';
import { clearNew, equip, useCosmetics, useUnlocked } from '../cosmetics';
import { COSMETICS, packOwned, PACKS, RARITY, rarityOf, type Cosmetic, type CosSlot, type FxKind, type Rarity } from '../engine/cosmetics';
import type { Appearance } from '../engine/types';
import { L, LOC } from '../i18n';
import { buyErrorText, buy, MONETIZATION, openShop, PACK_STORE, PURCHASES, restorePurchases, useOwned, usePrice } from '../monetization';
import { BUNDLE_SKU } from '../monetization/skus';
import { seasonIndex } from '../engine/season';
import { Belt } from './Belt';
import { Button, Icon, Screen, Section, SLANT, Title, type IconName } from './components';
import { DEFAULT_LOOK, FighterAvatar } from './FighterAvatar';
import { Figure, HIP_H, POSES } from './rig';
import { C, F } from './theme';
import { useLook } from '../lookPref';
import { WalkoutFx } from './WalkoutFx';
import { KitDesigner } from './KitDesigner';

const TABS: { slot: CosSlot; ad: string; ikon: IconName }[] = [
  { slot: 'sort', ad: L("Şort"), ikon: 'tshirt-crew' },
  { slot: 'eldiven', ad: L("Eldiven"), ikon: 'boxing-glove' },
  { slot: 'cerceve', ad: L("Çerçeve"), ikon: 'octagon-outline' },
  { slot: 'kemer', ad: L("Kemer"), ikon: 'trophy' },
  { slot: 'giris', ad: L("Giriş müziği"), ikon: 'music' },
  { slot: 'efekt', ad: L("Giriş efekti"), ikon: 'creation' },
  { slot: 'unvan', ad: L("Unvan"), ikon: 'medal' },
  { slot: 'kafes', ad: L("Kafes"), ikon: 'octagon' },
  { slot: 'kart', ad: L("Paylaşım kartı"), ikon: 'image-frame' },
];

const FX_ICON: Record<FxKind, IconName> = { ates: 'fire', duman: 'weather-fog', konfeti: 'party-popper', simsek: 'flash', kar: 'snowflake' };
const PACK_NAME: Record<string, string> = Object.fromEntries(PACKS.map((p) => [p.sku, p.ad]));

function lockText(x: Cosmetic) {
  const k = x.kaynak;
  if (k.tur === 'basari') return k.aciklama;
  if (k.tur === 'sampiyon') return L("Şampiyon Paketi ile gelir");
  if (k.tur === 'paket') return PACK_STORE ? L("{0} paketinde", [PACK_NAME[k.sku]]) : L("Tam Paket'te");
  if (k.tur === 'sezon') return k.pro ? L("Sezon Kemeri · {0}. basamak (Şampiyon)", [k.basamak]) : L("Sezon Kemeri · {0}. basamak", [k.basamak]);
  return '';
}

/** Kafesteki dövüşçü, seçili kıyafetle. */
function KitPreview({ look, x, eldiven, size = 120 }: { look: Appearance; x: Cosmetic; eldiven: string; size?: number }) {
  return (
    <Svg width={size} height={size * 1.25} viewBox="0 0 100 125">
      <Ellipse cx={50} cy={118} rx={22} ry={4} fill="#000" opacity={0.35} />
      <G transform={`translate(50 ${118 - HIP_H * 1.1}) scale(1.1 1.1)`}>
        <Figure p={POSES.stance} look={look} kit={{ shorts: x.renk[0], trim: x.renk[1], glove: eldiven, desen: x.desen, desenRenk: x.desenRenk }} />
      </G>
    </Svg>
  );
}

const PLAIN: Cosmetic = { id: '_', slot: 'sort', ad: '', renk: ['#2a2d33', '#555555'], kaynak: { tur: 'hazir' } };

export function Swatch({ x, look }: { x: Cosmetic; look: Appearance }) {
  if (x.slot === 'sort') return <KitPreview look={look} x={x} eldiven="#b8121f" size={64} />;
  if (x.slot === 'eldiven') return <KitPreview look={look} x={PLAIN} eldiven={x.renk[0]} size={64} />;
  if (x.slot === 'cerceve') return <FighterAvatar look={look} size={62} ring={x.renk[0] ?? C.red} />;
  if (x.slot === 'kemer') return <Belt org="ufc" width={110} skin={x.renk.length ? x.renk : null} />;
  if (x.slot === 'unvan' || x.slot === 'kafes' || x.slot === 'kart') {
    const on = x.renk.length > 0;
    return (
      <View style={[ls.music, on && { borderColor: x.renk[0], borderWidth: 2, backgroundColor: (x.renk[1] ?? x.renk[0]) + '33' }]}>
        <Icon name={x.slot === 'unvan' ? 'medal' : x.slot === 'kafes' ? 'octagon-outline' : 'image-frame'} size={30} color={on ? x.renk[0] : C.faint} />
      </View>
    );
  }
  const icon: IconName = x.slot === 'efekt' ? (x.fx ? FX_ICON[x.fx] : 'cancel') : x.giris ? 'music' : 'account-group';
  const on = x.slot === 'efekt' ? !!x.fx : !!x.giris;
  return (
    <View style={[ls.music, on && { borderColor: RARITY[rarityOf(x)].renk + '88', borderWidth: 1 }]}>
      <Icon name={icon} size={30} color={on ? RARITY[rarityOf(x)].renk : C.faint} />
    </View>
  );
}

function RarityTag({ r }: { r: Rarity }) {
  return <Text style={[ls.rarity, { color: RARITY[r].renk, borderColor: RARITY[r].renk + '66' }]}>{RARITY[r].ad().toLocaleUpperCase(LOC)}</Text>;
}

function Item({ x, look, on, open, prev, onPick }: { x: Cosmetic; look: Appearance; on: boolean; open: boolean; prev: boolean; onPick: () => void }) {
  const r = rarityOf(x);
  const col = RARITY[r].renk;
  return (
    <Pressable onPress={onPick} style={({ pressed }) => [ls.item, { borderColor: on ? C.green : prev ? C.gold : col + '55' }, pressed && { transform: [{ scale: 0.97 }] }]}>
      <LinearGradient colors={r === 'efsane' ? ['#2a2006', '#0c0d10'] : r === 'epik' ? ['#1a1028', '#0c0d10'] : ['#121317', '#0c0d10']} style={ls.itemIn}>
        <RarityTag r={r} />
        <View style={[ls.swatch, !open && { opacity: 0.6 }]}>
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
      </LinearGradient>
    </Pressable>
  );
}

/** Paket satın alma düğmesi (fiyat mağazadan). */
function BuyButton({ sku, big }: { sku: string; big?: boolean }) {
  const owned = useOwned();
  const has = packOwned(owned, sku);
  const price = usePrice(sku);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  if (has) return <Text style={[ls.packNote, { color: C.green }]}>{L("Sende · Parçalar dolabında")}</Text>;
  if (!MONETIZATION) return <Text style={ls.packNote}>{L("Mobil uygulamada satın alınabilir.")}</Text>;
  return (
    <View style={{ gap: 4, flex: big ? undefined : 1 }}>
      <Button
        label={price ? L("Satın al · {0}", [price]) : L("Satın al")}
        icon="cart"
        tone="gold"
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          setMsg('');
          const r = await buy(sku);
          setBusy(false);
          if (r === 'ok') sfx('fanfare');
          else if (r === 'hata') setMsg(buyErrorText());
        }}
      />
      {msg ? <Text style={ls.packNote}>{msg}</Text> : null}
    </View>
  );
}

function PackCard({ p, onTry, look }: { p: (typeof PACKS)[number]; onTry: () => void; look: Appearance }) {
  const items = COSMETICS.filter((x) => x.kaynak.tur === 'paket' && x.kaynak.sku === p.sku);
  const sort = items.find((x) => x.slot === 'sort');
  const eld = items.find((x) => x.slot === 'eldiven');
  const big = p.nadir === 'efsane';
  return (
    <LinearGradient colors={[`${p.renk}${big ? '40' : '26'}`, '#0c0d10']} style={[ls.pack, { borderColor: `${p.renk}88` }, big && { borderWidth: 1.5 }]}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        {sort ? <KitPreview look={look} x={sort} eldiven={eld?.renk[0] ?? '#b8121f'} size={big ? 84 : 62} /> : null}
        <View style={{ flex: 1, gap: 4 }}>
          <RarityTag r={p.nadir} />
          <Text style={[ls.packTitle, SLANT, big && { fontSize: 21 }]}>{p.ad.toLocaleUpperCase(LOC)}</Text>
          <Text style={ls.packDesc}>{p.aciklama}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Pressable onPress={onTry} style={({ pressed }) => [ls.tryBtn, pressed && { borderColor: C.gold }]}>
          <Icon name="eye" size={16} color={C.text} />
          <Text style={ls.tryText}>{L("DENE")}</Text>
        </Pressable>
        <BuyButton sku={p.sku} />
      </View>
    </LinearGradient>
  );
}

// ---------- Yeni görünüm: nadirlik renkli kozmetik kartı ve paket kartı ----------

const STARS: Record<Rarity, number> = { siradan: 1, nadir: 2, epik: 3, efsane: 4 };

function NewItem({ x, look, on, open, prev, isNew, onPick }: { x: Cosmetic; look: Appearance; on: boolean; open: boolean; prev: boolean; isNew: boolean; onPick: () => void }) {
  const r = rarityOf(x);
  const col = RARITY[r].renk;
  const slot = TABS.find((t) => t.slot === x.slot);
  return (
    <Pressable onPress={onPick} style={({ pressed }) => [nk.card, { borderColor: on ? C.green : prev ? C.gold : col + 'aa' }, (on || prev) && { borderWidth: 2 }, pressed && { transform: [{ scale: 0.97 }] }]}>
      <LinearGradient colors={[col + '55', '#14161b', '#0b0c0f']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <View style={[nk.strip, { backgroundColor: col }]}>
        <Text style={nk.stripText} numberOfLines={1}>
          {(slot?.ad ?? '').toLocaleUpperCase(LOC)}
        </Text>
      </View>
      <View style={[nk.art, !open && { opacity: 0.5 }]}>
        <Swatch x={x} look={look} />
      </View>
      <LinearGradient colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']} style={nk.foot}>
        <Text style={nk.name} numberOfLines={1}>
          {x.ad}
        </Text>
        <Text style={[nk.stars, { color: col }]}>{'★'.repeat(STARS[r])}</Text>
        {on ? (
          <Text style={[nk.state, { color: C.green }]}>{L("KUŞANILDI")}</Text>
        ) : open ? (
          <Text style={[nk.state, { color: C.gold }]}>{x.slot === 'giris' && x.giris ? L("DİNLE · KUŞAN") : L("KUŞAN")}</Text>
        ) : (
          <Text style={nk.lockText} numberOfLines={2}>
            {lockText(x)}
          </Text>
        )}
      </LinearGradient>
      {!open ? (
        <View style={nk.lock}>
          <Icon name="lock" size={13} color="#f1f2f5" />
        </View>
      ) : on ? (
        <View style={[nk.lock, { backgroundColor: C.green }]}>
          <Icon name="check-bold" size={13} color="#052012" />
        </View>
      ) : isNew ? (
        <Text style={nk.newTag}>{L("YENİ")}</Text>
      ) : null}
    </Pressable>
  );
}

function NewPackCard({ p, onTry, look }: { p: (typeof PACKS)[number]; onTry: () => void; look: Appearance }) {
  const items = COSMETICS.filter((x) => x.kaynak.tur === 'paket' && x.kaynak.sku === p.sku);
  const fan = items.slice(0, 3);
  const col = RARITY[p.nadir].renk;
  return (
    <View style={[nk.pack, { borderColor: p.renk + 'aa' }]}>
      <LinearGradient colors={[p.renk + '55', '#120c22', '#08060f']} locations={[0, 0.6, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* Yelpaze kartlar */}
      <View style={nk.fan} pointerEvents="none">
        {fan.map((x, i) => {
          const rc = RARITY[rarityOf(x)].renk;
          const rot = (i - (fan.length - 1) / 2) * 13;
          return (
            <View key={x.id} style={[nk.fanCard, { borderColor: rc, transform: [{ rotate: `${rot}deg` }, { translateY: Math.abs(rot) * 0.5 }], zIndex: i === 1 ? 2 : 1 }]}>
              <LinearGradient colors={[rc + '66', '#120a24']} style={StyleSheet.absoluteFill} />
              <Swatch x={x} look={look} />
            </View>
          );
        })}
      </View>
      <View style={{ width: '58%', gap: 4 }}>
        <Text style={[nk.packKicker, { color: col }]}>{L("{0} PAKET", [RARITY[p.nadir].ad().toLocaleUpperCase(LOC)])}</Text>
        <Text style={[nk.packTitle, SLANT]} numberOfLines={2}>
          {p.ad.toLocaleUpperCase(LOC)}
        </Text>
        <Text style={nk.packDesc} numberOfLines={3}>
          {p.aciklama}
        </Text>
        <Text style={nk.packCount}>{L("{0} parça", [items.length])}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 10 }}>
        <Pressable onPress={onTry} style={({ pressed }) => [ls.tryBtn, pressed && { borderColor: C.gold }]}>
          <Icon name="eye" size={16} color={C.text} />
          <Text style={ls.tryText}>{L("DENE")}</Text>
        </Pressable>
        <BuyButton sku={p.sku} />
      </View>
    </View>
  );
}

const nk = StyleSheet.create({
  card: { height: 186, borderRadius: 5, borderWidth: 1.5, overflow: 'hidden', backgroundColor: '#0b0c0f' },
  strip: { height: 20, justifyContent: 'center', paddingHorizontal: 6 },
  stripText: { color: '#0b0c0f', fontFamily: F.black, fontSize: 8.5, letterSpacing: 1 },
  art: { height: 96, alignItems: 'center', justifyContent: 'center' },
  foot: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 6, paddingTop: 6, paddingBottom: 6, gap: 1 },
  name: { color: '#f6f7f9', fontFamily: F.display, fontSize: 12.5, letterSpacing: 0.3 },
  stars: { fontSize: 9, letterSpacing: 1 },
  state: { fontFamily: F.display, fontSize: 10, letterSpacing: 1 },
  lockText: { color: '#a3a9b5', fontFamily: F.body, fontSize: 9, lineHeight: 11 },
  lock: { position: 'absolute', right: 5, top: 25, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center' },
  newTag: { position: 'absolute', right: 5, top: 25, backgroundColor: C.red, color: '#fff', fontFamily: F.black, fontSize: 8.5, letterSpacing: 1, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 2, overflow: 'hidden' },
  pack: { borderRadius: 6, borderWidth: 1.2, overflow: 'hidden', padding: 14, marginBottom: 12, minHeight: 200 },
  fan: { position: 'absolute', right: 14, top: 18, width: 130, height: 130, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  fanCard: { width: 62, height: 92, marginHorizontal: -10, borderRadius: 5, borderWidth: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#120a24' },
  packKicker: { fontFamily: F.black, fontSize: 10, letterSpacing: 2 },
  packTitle: { color: '#fff', fontFamily: F.display, fontSize: 24, lineHeight: 27 },
  packDesc: { color: '#cdbdf0', fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  packCount: { color: '#a3a9b5', fontFamily: F.bold, fontSize: 10.5, letterSpacing: 1 },
});

type Preview = Partial<Record<CosSlot, Cosmetic>> & { etiket?: string };

export function LockerScreen({ look = DEFAULT_LOOK, onExit }: { look?: Appearance; onExit: () => void }) {
  const st = useCosmetics();
  const unlocked = useUnlocked();
  const owned = useOwned();
  const { width: W } = useWindowDimensions();
  const [tab, setTab] = useState<CosSlot>('sort');
  const [prev, setPrev] = useState<Preview | null>(null);
  const [restoreMsg, setRestoreMsg] = useState('');
  const yeni = new Set(st.yeni);
  const yeniLook = useLook() === 'yeni';
  // Ekrana girince "yeni" rozetleri görülmüş sayılır (çıkarken temizlenir ki ilk bakışta işaretli kalsın).
  useEffect(() => () => clearNew(), []);

  const byId = (id: string) => COSMETICS.find((x) => x.id === id)!;
  const safe = (slot: CosSlot) => {
    const x = byId(st.equip[slot]);
    return x && unlocked(x) ? x : COSMETICS.find((c) => c.slot === slot && c.kaynak.tur === 'hazir')!;
  };
  // Vitrinde gösterilen: önizleme varsa o, yoksa kuşanılan
  const show = (slot: CosSlot) => prev?.[slot] ?? safe(slot);
  const sort = show('sort');
  const eld = show('eldiven');
  const cer = show('cerceve');
  const kem = show('kemer');
  const gir = show('giris');
  const fx = show('efekt').fx;

  // Sezon ödülleri: yalnızca bu sezonunkiler ve sahip olunanlar (geçmiş sezonlar dolabı kalabalıklaştırmasın)
  const visible = (x: Cosmetic) => (x.id !== 'eld_karacuma' && (x.kaynak.tur !== 'sezon' || x.kaynak.sezon === seasonIndex())) || unlocked(x);
  const sayilan = COSMETICS.filter((x) => visible(x) && (PACK_STORE || (x.kaynak.tur !== 'paket' && x.kaynak.tur !== 'sampiyon') || unlocked(x)));
  const total = sayilan.length;
  const have = sayilan.filter(unlocked).length;
  const allPacks = PACKS.every((p) => packOwned(owned, p.sku));

  const listen = (x: Cosmetic) => {
    if (!x.giris) return;
    const un = pushScene('off');
    playWalkout(x.giris);
    setTimeout(un, walkoutSeconds(x.giris) * 1000);
  };

  const pick = (x: Cosmetic) => {
    if (x.slot === 'giris') listen(x);
    if (!unlocked(x)) {
      // Kilitli: vitrinde dene
      sfx('click');
      setPrev({ [x.slot]: x, etiket: x.ad });
      return;
    }
    sfx('click');
    setPrev(null);
    equip(x);
  };

  const tryPack = (p: (typeof PACKS)[number]) => {
    const items = COSMETICS.filter((x) => x.kaynak.tur === 'paket' && x.kaynak.sku === p.sku);
    const pv: Preview = { etiket: p.ad };
    for (const x of items) pv[x.slot] = x;
    setPrev(pv);
    sfx('swell', 0.4);
  };

  const heroW = W - 32;
  const lockedPrev = !!prev && (Object.values(prev) as unknown[]).some((v) => typeof v === 'object' && v && 'kaynak' in (v as object) && ['paket', 'sampiyon'].includes((v as Cosmetic).kaynak.tur) && !unlocked(v as Cosmetic));
  // Paket mağazası kapalıyken (iPhone) yalnızca oynayarak açılan parçalar listelenir
  // Tam Paket'teki kozmetikler de listelenir: oyuncu ne aldığını görsün, üstünde denesin.
  const items = COSMETICS.filter((x) => x.slot === tab && visible(x) && (PACK_STORE || PURCHASES || (x.kaynak.tur !== 'paket' && x.kaynak.tur !== 'sampiyon') || unlocked(x))).sort((a, b) => RARITY[rarityOf(a)].sira - RARITY[rarityOf(b)].sira);

  return (
    <Screen footer={<Button label={L("Ana menü")} icon="arrow-left" tone="ghost" onPress={onExit} />}>
      <Title kicker={L("YALNIZCA GÖRÜNÜM · OYUN GÜCÜ VERMEZ")} sub={PACK_STORE ? L("Oynayarak yenilerini aç ya da paketlerle koleksiyonunu büyüt.") : L("Oynayarak yenilerini aç.")}>
        {L("Dolap")}
      </Title>

      {/* Vitrin: spot ışığı altında dövüşçü, kuşanılanlar ya da önizleme */}
      <View style={[ls.hero, prev && { borderColor: C.gold }]}>
        <LinearGradient colors={['#2a0c12', '#0e0f13', '#08090b']} style={StyleSheet.absoluteFill} />
        <Svg width={heroW} height={250} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <SvgLinear id="lkCone" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#fff1d0" stopOpacity={0.22} />
              <Stop offset="1" stopColor="#fff1d0" stopOpacity={0} />
            </SvgLinear>
          </Defs>
          <Polygon points={`${heroW * 0.22},0 ${heroW * 0.32},0 ${heroW * 0.5},250 ${heroW * 0.04},250`} fill="url(#lkCone)" />
          <Ellipse cx={heroW * 0.27} cy={236} rx={70} ry={10} fill="#ffffff" opacity={0.05} />
        </Svg>
        {fx ? <WalkoutFx kind={fx} w={heroW} h={250} dense={0.6} /> : null}
        <View style={ls.heroRow}>
          <KitPreview look={look} x={sort} eldiven={eld.renk[0]} size={150} />
          <View style={{ flex: 1, alignItems: 'center', gap: 10 }}>
            <FighterAvatar look={look} size={72} ring={cer.renk[0] ?? C.red} />
            <Belt org="ufc" width={136} skin={kem.renk.length ? kem.renk : null} />
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Pressable onPress={() => listen(gir)} style={ls.chip} hitSlop={6}>
                <Icon name="music" size={13} color={gir.giris ? C.gold : C.faint} />
                <Text style={ls.chipText}>{gir.ad}</Text>
              </Pressable>
              <View style={ls.chip}>
                <Icon name={fx ? FX_ICON[fx] : 'cancel'} size={13} color={fx ? C.gold : C.faint} />
                <Text style={ls.chipText}>{show('efekt').ad}</Text>
              </View>
            </View>
          </View>
        </View>
        {prev ? (
          <View style={ls.prevBar}>
            <Icon name="eye" size={14} color="#111" />
            <Text style={ls.prevText} numberOfLines={1}>
              {L("ÖNİZLEME · {0}", [(prev.etiket ?? '').toLocaleUpperCase(LOC)])}
            </Text>
            <Pressable onPress={() => setPrev(null)} hitSlop={8}>
              <Icon name="close" size={16} color="#111" />
            </Pressable>
          </View>
        ) : null}
      </View>

      {prev && lockedPrev && !PACK_STORE && PURCHASES ? (
        <Pressable onPress={() => openShop('dolap')} style={({ pressed }) => [ls.fullCta, pressed && { opacity: 0.85 }]}>
          <Icon name="crown" size={16} color="#1f1605" />
          <Text style={ls.fullCtaText}>{L("Tam Paket ile aç")}</Text>
          <Icon name="chevron-right" size={18} color="#1f1605" />
        </Pressable>
      ) : null}

      {/* Koleksiyon ilerlemesi */}
      <View style={ls.coll}>
        <Text style={ls.collText}>{L("KOLEKSİYON {0}/{1}", [have, total])}</Text>
        <View style={ls.collBar}>
          <View style={[ls.collFill, { width: `${Math.round((have / total) * 100)}%` }]} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
        {TABS.map((t) => {
          const n = COSMETICS.filter((x) => x.slot === t.slot && yeni.has(x.id)).length;
          return (
            <Pressable key={t.slot} onPress={() => setTab(t.slot)} style={[ls.tab, tab === t.slot && ls.tabOn, yeniLook && { borderRadius: 4 }, yeniLook && tab === t.slot && { backgroundColor: C.text, borderColor: C.text }]}>
              <Icon name={t.ikon} size={15} color={tab === t.slot ? '#000' : C.dim} />
              <Text style={[ls.tabText, tab === t.slot && { color: '#000' }]}>{t.ad}</Text>
              {n ? <View style={ls.dot} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {tab === 'sort' || tab === 'kemer' ? <KitDesigner key={tab} slot={tab} onPreview={(x) => setPrev({ [x.slot]: { ...x, renk: [...x.renk] }, etiket: x.ad })} /> : null}
      <View style={ls.grid}>
        {items.map((x) =>
          yeniLook ? (
            <View key={x.id} style={ls.cell}>
              <NewItem x={x} look={look} on={st.equip[x.slot] === x.id} open={unlocked(x)} prev={prev?.[x.slot]?.id === x.id} isNew={yeni.has(x.id)} onPick={() => pick(x)} />
            </View>
          ) : (
            <View key={x.id} style={ls.cell}>
              <Item x={x} look={look} on={st.equip[x.slot] === x.id} open={unlocked(x)} prev={prev?.[x.slot]?.id === x.id} onPick={() => pick(x)} />
              {yeni.has(x.id) ? <Text style={ls.newTag}>{L("YENİ")}</Text> : null}
            </View>
          ),
        )}
      </View>

      {PACK_STORE ? <Section>{L("MAĞAZA")}</Section> : null}
      {PACK_STORE && !allPacks ? (
        <LinearGradient colors={['#3a2a07', '#140f04', '#0c0d10']} style={[ls.pack, ls.bundle]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="crown" size={22} color={C.gold} />
            <Text style={[ls.packTitle, SLANT, { fontSize: 21, color: C.gold }]}>{L("EFSANE KOLEKSİYONU")}</Text>
            <Text style={ls.best}>{L("EN İYİ DEĞER")}</Text>
          </View>
          <Text style={ls.packDesc}>{L("Bütün paketler tek alımda: {0} paket, şortlar, eldivenler, çerçeveler, kemerler, giriş müzikleri ve efektleri.", [PACKS.length])}</Text>
          <BuyButton sku={BUNDLE_SKU} big />
        </LinearGradient>
      ) : null}
      {PACK_STORE
        ? PACKS.map((p) => (yeniLook ? <NewPackCard key={p.sku} p={p} look={look} onTry={() => tryPack(p)} /> : <PackCard key={p.sku} p={p} look={look} onTry={() => tryPack(p)} />))
        : null}
      {MONETIZATION && PURCHASES ? (
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
  fullCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.gold, borderRadius: 12, paddingVertical: 11, marginTop: 8 },
  fullCtaText: { color: '#1f1605', fontFamily: F.display, fontSize: 14, letterSpacing: 0.5 },
  hero: { height: 250, borderWidth: 1, borderColor: C.border, borderRadius: 16, overflow: 'hidden', justifyContent: 'center' },
  heroRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: C.border, backgroundColor: '#00000066', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 4 },
  chipText: { color: C.dim, fontFamily: F.semi, fontSize: 11 },
  prevBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.gold, paddingHorizontal: 12, paddingVertical: 6 },
  prevText: { flex: 1, color: '#111', fontFamily: F.display, fontSize: 12, letterSpacing: 1 },
  coll: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  collText: { color: C.dim, fontFamily: F.display, fontSize: 11, letterSpacing: 1.2 },
  collBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#ffffff12', overflow: 'hidden' },
  collFill: { height: '100%', backgroundColor: C.gold, borderRadius: 3 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  tabOn: { backgroundColor: C.gold, borderColor: C.gold },
  tabText: { color: C.dim, fontFamily: F.semi, fontSize: 13 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.red },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 8 },
  cell: { width: '33.333%', padding: 4 },
  item: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  itemIn: { padding: 8, alignItems: 'center', gap: 4, minHeight: 176 },
  rarity: { alignSelf: 'flex-start', fontFamily: F.display, fontSize: 8, letterSpacing: 1, borderWidth: 1, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1, overflow: 'hidden' },
  swatch: { height: 82, alignItems: 'center', justifyContent: 'center' },
  music: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#15161a', alignItems: 'center', justifyContent: 'center' },
  itemName: { color: C.text, fontFamily: F.semi, fontSize: 12, textAlign: 'center' },
  itemState: { fontFamily: F.display, fontSize: 10, letterSpacing: 1 },
  lock: { color: C.faint, fontFamily: F.body, fontSize: 10, textAlign: 'center', flexShrink: 1 },
  newTag: { position: 'absolute', top: 8, right: 8, backgroundColor: C.red, color: '#fff', fontFamily: F.display, fontSize: 9, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  pack: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10, marginBottom: 10 },
  bundle: { borderColor: C.gold, borderWidth: 1.5 },
  best: { marginLeft: 'auto', backgroundColor: C.gold, color: '#111', fontFamily: F.display, fontSize: 10, letterSpacing: 1, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  packTitle: { color: C.text, fontFamily: F.display, fontSize: 17, letterSpacing: 1 },
  packDesc: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  packNote: { color: C.faint, fontFamily: F.semi, fontSize: 12 },
  tryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.border, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#0d0e12' },
  tryText: { color: C.text, fontFamily: F.display, fontSize: 13, letterSpacing: 1 },
  restore: { color: C.faint, fontFamily: F.semi, fontSize: 12, textAlign: 'center', textDecorationLine: 'underline' },
});
