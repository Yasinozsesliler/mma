// Kemer vitrini: kadife arka planlı, spot ışıklı cam vitrin; dokununca tam ekran, kaydırmalı kemer galerisi.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ORGS, WEIGHT_CLASSES } from '../engine/data';
import { activeBelts, champLabel, maxHeldBelts } from '../engine/legacy';
import type { Belt as BeltT, GameState } from '../engine/types';
import { Belt } from './Belt';
import { Icon, SLANT } from './components';
import { C, F, R } from './theme';

const GOLD = ['#f7e3a1', '#c8962f', '#8a5a14'] as const;

/** Tepeden inen ışık konisi. */
function Beam({ left, width, strong }: { left: number | string; width: number; strong?: boolean }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[strong ? 'rgba(255,238,190,0.28)' : 'rgba(255,238,190,0.16)', 'rgba(255,238,190,0.03)', 'rgba(0,0,0,0)']}
      style={[bs.beam, { left: left as number, width }]}
    />
  );
}

/** Mermer kaide ve altın isim plaketi. */
function Pedestal({ b, children, big }: { b: BeltT; children: ReactNode; big?: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      {children}
      <LinearGradient colors={['#e9e6e1', '#b9b5ae', '#8f8b84']} style={[bs.marble, big && { width: '78%', height: 16 }]} />
      <LinearGradient colors={['#3a3833', '#1c1b18']} style={[bs.marbleBase, big && { width: '88%', height: 10 }]} />
      <LinearGradient colors={GOLD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[bs.nameplate, big && { paddingHorizontal: 18, paddingVertical: 6 }]}>
        <Text style={[bs.nameplateText, big && { fontSize: 13 }]} numberOfLines={1}>
          {ORGS[b.org].kisa} · {WEIGHT_CLASSES[b.siklet].ad.toLocaleUpperCase('tr-TR')}
        </Text>
      </LinearGradient>
    </View>
  );
}

/** Kemerin üstünden geçen parıltı ve hafif süzülme. */
function ShiningBelt({ b, width }: { b: BeltT; width: number }) {
  const shine = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([Animated.timing(shine, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }), Animated.delay(1800)]));
    const f = Animated.loop(Animated.sequence([Animated.timing(float, { toValue: -6, duration: 1600, useNativeDriver: true }), Animated.timing(float, { toValue: 0, duration: 1600, useNativeDriver: true })]));
    shine.setValue(0);
    a.start();
    f.start();
    return () => {
      a.stop();
      f.stop();
    };
  }, [shine, float]);
  const h = (width * 130) / 300;
  return (
    <Animated.View style={{ width, height: h, overflow: 'hidden', transform: [{ translateY: float }] }}>
      <Belt org={b.org} siklet={b.siklet} width={width} dim={!b.aktif} />
      {b.aktif ? (
        <Animated.View
          pointerEvents="none"
          style={[bs.shine, { height: h * 1.6, transform: [{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.4, width * 1.2] }) }, { rotate: '20deg' }] }]}
        />
      ) : null}
    </Animated.View>
  );
}

export function BeltShowcase({ s }: { s: GameState }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageW, setPageW] = useState(360);
  const insets = useSafeAreaInsets();
  const belts = (s.kemerler ?? []).slice().sort((a, b) => Number(b.aktif) - Number(a.aktif) || b.hafta - a.hafta);
  const aktif = activeBelts(s);
  const held = maxHeldBelts(s);
  const savunma = belts.reduce((a, b) => a + b.savunma, 0);
  const onLayout = (e: LayoutChangeEvent) => setPageW(e.nativeEvent.layout.width);

  return (
    <>
      <Pressable onPress={() => belts.length && setOpen(true)} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
        {/* Altın çerçeve */}
        <LinearGradient colors={GOLD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={bs.frame}>
          <LinearGradient colors={['#2a0a0f', '#12060a', '#070507']} style={bs.velvet}>
            <Beam left="8%" width={110} />
            <Beam left="38%" width={120} strong />
            <Beam left="68%" width={110} />
            <View style={bs.reflect} />
            {/* Köşe süsleri */}
            {[bs.cTL, bs.cTR, bs.cBL, bs.cBR].map((st, i) => (
              <View key={i} style={[bs.corner, st]} />
            ))}
            <View style={bs.head}>
              <Text style={[bs.title, SLANT]}>ŞAMPİYONLUK VİTRİNİ</Text>
              {held >= 2 ? (
                <LinearGradient colors={GOLD} style={bs.champTag}>
                  <Text style={bs.champTagText}>{champLabel(held).en}</Text>
                </LinearGradient>
              ) : null}
            </View>
            {belts.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={bs.shelfRow}>
                {belts.map((b, i) => (
                  <Pedestal key={i} b={b}>
                    <Belt org={b.org} siklet={b.siklet} width={150} dim={!b.aktif} />
                  </Pedestal>
                ))}
              </ScrollView>
            ) : (
              <View style={bs.empty}>
                <View style={bs.emptyStand} />
                <Icon name="trophy-outline" size={40} color="#4a3a2a" />
                <Text style={bs.emptyText}>Kaide boş. İlk kemerin burada, spot ışıkları altında duracak.</Text>
              </View>
            )}
            <View style={bs.foot}>
              <View style={bs.stats}>
                {[
                  [String(belts.length), 'KEMER'],
                  [String(aktif.length), 'AKTİF'],
                  [String(savunma), 'SAVUNMA'],
                ].map(([v, l]) => (
                  <View key={l} style={bs.stat}>
                    <Text style={bs.statVal}>{v}</Text>
                    <Text style={bs.statLabel}>{l}</Text>
                  </View>
                ))}
              </View>
              {belts.length ? (
                <View style={bs.openBtn}>
                  <Text style={bs.openText}>VİTRİNİ AÇ</Text>
                  <Icon name="arrow-expand" size={14} color={C.gold} />
                </View>
              ) : null}
            </View>
          </LinearGradient>
        </LinearGradient>
      </Pressable>

      <Modal visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <LinearGradient colors={['#1c0a0e', '#0a0405', '#000']} style={{ flex: 1 }}>
          <View style={[bs.modalHead, { paddingTop: insets.top + 12 }]}>
            <View style={{ flex: 1 }}>
              <Text style={bs.modalKicker}>
                {s.fighter.ad} {s.fighter.soyad}
              </Text>
              <Text style={[bs.modalTitle, SLANT]}>ŞAMPİYONLUK VİTRİNİ</Text>
            </View>
            <Pressable onPress={() => setOpen(false)} style={bs.close} hitSlop={10}>
              <Icon name="close" size={22} color={C.text} />
            </Pressable>
          </View>
          {held >= 2 ? (
            <LinearGradient colors={['#4a3508', '#1a1508']} style={bs.banner}>
              <Icon name="trophy-variant" size={20} color={C.gold} />
              <Text style={[bs.bannerText, SLANT]}>
                {champLabel(held).en} · AYNI ANDA {held} KEMER
              </Text>
            </LinearGradient>
          ) : null}
          <View style={{ flex: 1, maxWidth: 560, width: '100%', alignSelf: 'center' }} onLayout={onLayout}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / Math.max(1, pageW)))}
              scrollEventThrottle={32}
            >
              {belts.map((b, i) => (
                <ScrollView key={i} style={{ width: pageW }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 30 }}>
                  <View style={bs.stage}>
                    <Beam left="18%" width={pageW * 0.64} strong />
                    <View style={{ paddingTop: 34 }}>
                      <Pedestal b={b} big>
                        <ShiningBelt b={b} width={Math.min(330, pageW - 40)} />
                      </Pedestal>
                    </View>
                  </View>
                  <LinearGradient colors={['#1a1509', '#0c0b08']} style={bs.plaque}>
                    <Text style={bs.plaqueOrg}>{ORGS[b.org].ad.toLocaleUpperCase('tr-TR')}</Text>
                    <Text style={[bs.plaqueTitle, SLANT]}>{WEIGHT_CLASSES[b.siklet].ad.toLocaleUpperCase('tr-TR')} SIKLET DÜNYA ŞAMPİYONU</Text>
                    <View style={bs.plaqueRow}>
                      <View style={bs.pStat}>
                        <Text style={bs.pVal}>{b.yas}</Text>
                        <Text style={bs.pLabel}>KAZANDIĞI YAŞ</Text>
                      </View>
                      <View style={bs.pStat}>
                        <Text style={bs.pVal}>{b.savunma}</Text>
                        <Text style={bs.pLabel}>SAVUNMA</Text>
                      </View>
                      <View style={bs.pStat}>
                        <Text style={[bs.pVal, { color: b.aktif ? C.gold : C.faint }]}>{b.aktif ? 'AKTİF' : 'GEÇMİŞ'}</Text>
                        <Text style={bs.pLabel}>DURUM</Text>
                      </View>
                    </View>
                    {b.savunma ? (
                      <View style={bs.shields}>
                        {Array.from({ length: Math.min(b.savunma, 15) }, (_, k) => (
                          <Icon key={k} name="shield-check" size={16} color={b.aktif ? C.gold : C.faint} />
                        ))}
                      </View>
                    ) : null}
                  </LinearGradient>
                </ScrollView>
              ))}
            </ScrollView>
          </View>
          {belts.length > 1 ? (
            <View style={[bs.dots, { paddingBottom: insets.bottom + 14 }]}>
              {belts.map((_, i) => (
                <View key={i} style={[bs.dot, i === page && bs.dotOn]} />
              ))}
            </View>
          ) : null}
        </LinearGradient>
      </Modal>
    </>
  );
}

const bs = StyleSheet.create({
  frame: { borderRadius: R + 6, padding: 3, marginBottom: 6 },
  velvet: { borderRadius: R + 3, overflow: 'hidden', paddingTop: 14, paddingBottom: 12 },
  beam: { position: 'absolute', top: 0, height: '100%', borderBottomLeftRadius: 120, borderBottomRightRadius: 120 },
  reflect: { position: 'absolute', top: -40, bottom: -40, width: 34, left: '72%', backgroundColor: 'rgba(255,255,255,0.04)', transform: [{ rotate: '18deg' }] },
  corner: { position: 'absolute', width: 14, height: 14, borderColor: '#c8962f' },
  cTL: { top: 6, left: 6, borderTopWidth: 2, borderLeftWidth: 2 },
  cTR: { top: 6, right: 6, borderTopWidth: 2, borderRightWidth: 2 },
  cBL: { bottom: 6, left: 6, borderBottomWidth: 2, borderLeftWidth: 2 },
  cBR: { bottom: 6, right: 6, borderBottomWidth: 2, borderRightWidth: 2 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  title: { color: C.gold, fontFamily: F.display, fontSize: 16, letterSpacing: 2 },
  champTag: { borderRadius: 2, paddingHorizontal: 8, paddingVertical: 2, transform: [{ skewX: '-10deg' }] },
  champTagText: { color: '#000', fontFamily: F.display, fontSize: 10, letterSpacing: 1 },
  shelfRow: { paddingHorizontal: 16, paddingTop: 14, gap: 18, alignItems: 'flex-end' },
  marble: { width: 120, height: 12, borderTopLeftRadius: 6, borderTopRightRadius: 6, marginTop: 6 },
  marbleBase: { width: 136, height: 7, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  nameplate: { marginTop: 6, borderRadius: 3, paddingHorizontal: 10, paddingVertical: 3 },
  nameplateText: { color: '#1f1605', fontFamily: F.display, fontSize: 10, letterSpacing: 1 },
  empty: { alignItems: 'center', justifyContent: 'center', height: 130, gap: 6 },
  emptyStand: { position: 'absolute', bottom: 26, width: 120, height: 10, borderRadius: 4, backgroundColor: '#2a2420' },
  emptyText: { color: '#8a7a6a', fontFamily: F.body, fontSize: 12, textAlign: 'center', paddingHorizontal: 20 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, marginTop: 12 },
  stats: { flexDirection: 'row', gap: 16 },
  stat: { alignItems: 'center' },
  statVal: { color: C.text, fontFamily: F.display, fontSize: 18 },
  statLabel: { color: '#8a7a6a', fontFamily: F.display, fontSize: 9, letterSpacing: 1.5 },
  openBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#8a5a14', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  openText: { color: C.gold, fontFamily: F.display, fontSize: 11, letterSpacing: 1.5 },
  modalHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#3a2a10', maxWidth: 560, width: '100%', alignSelf: 'center' },
  modalKicker: { color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 2 },
  modalTitle: { color: C.gold, fontFamily: F.display, fontSize: 26, letterSpacing: 1.5 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a1d', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: R, borderWidth: 1, borderColor: C.goldDeep, padding: 10, margin: 14, marginBottom: 0, maxWidth: 530, alignSelf: 'center' },
  bannerText: { color: C.gold, fontFamily: F.display, fontSize: 14, letterSpacing: 1 },
  stage: { alignItems: 'center', minHeight: 260, justifyContent: 'center' },
  shine: { position: 'absolute', top: -20, width: 26, backgroundColor: 'rgba(255,255,255,0.35)' },
  plaque: { borderRadius: R + 2, borderWidth: 1, borderColor: '#5a4312', padding: 16, marginTop: 18, alignItems: 'center' },
  plaqueOrg: { color: '#a08a5a', fontFamily: F.display, fontSize: 11, letterSpacing: 2.5 },
  plaqueTitle: { color: C.text, fontFamily: F.display, fontSize: 19, textAlign: 'center', marginTop: 2 },
  plaqueRow: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 14, borderTopWidth: 1, borderTopColor: '#3a2a10', paddingTop: 12 },
  pStat: { flex: 1, alignItems: 'center' },
  pVal: { color: C.text, fontFamily: F.display, fontSize: 20 },
  pLabel: { color: '#8a7a6a', fontFamily: F.display, fontSize: 9, letterSpacing: 1.5, marginTop: 2 },
  shields: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 12, justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#3a2a10' },
  dotOn: { backgroundColor: C.gold, width: 20 },
});
