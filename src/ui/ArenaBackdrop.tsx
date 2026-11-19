// Yeni görünüm: çizilmiş arena arka planı (arenaArt.ts: kariyer seviyesine göre mekan, ünvanda altın, şehre göre
// ışık tonu) ve ring zeminine perspektifle yazılan organizasyon adı. Görsel alta hizalanır (zemin hep görünür); yüklenemezse hiçbir şey çizmez, altındaki
// gradyan zemin kalır. Klasik görünümde kullanılmaz.
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { GameState } from '../engine/types';
import { LOC } from '../i18n';
import { ARENA_ART, ARENA_GOLD, arenaLook, arenaOrgText, type ArenaTier } from './arenaArt';
import { F } from './theme';
const IW = 1170;
const IH = 1560;
/** Görseldeki ring logosunun merkezi (piksel). */
const RING_Y = 1376;

/** s verilirse mekan, altın, şehir tonu ve zemin yazısı oyundan gelir; tek tek verilenler üstüne yazar.
 *  gold: altın ışıklı sürüm (kutlama, ünvan maçı). w/h verilmezse kapsayıcısını kendisi ölçer. dim: karartma (0–1). */
export function ArenaBackdrop(props: { s?: GameState; w?: number; h?: number; org?: string; sub?: string; dim?: number; gold?: boolean; tier?: ArenaTier; tint?: string | null }) {
  const auto = props.s ? { ...arenaOrgText(props.s), ...arenaLook(props.s) } : undefined;
  const { w: w0, h: h0, dim = 0 } = props;
  const org = props.org ?? auto?.org;
  const sub = props.sub ?? auto?.sub;
  const gold = props.gold ?? auto?.gold ?? false;
  const tier = props.tier ?? auto?.tier ?? 2;
  const tint = props.tint === null ? undefined : (props.tint ?? auto?.tint);
  const [ok, setOk] = useState(true);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const w = w0 ?? size.w;
  const h = h0 ?? size.h;
  if (!ok) return null;
  if (w <= 0 || h <= 0)
    return <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} />;
  const k = Math.max(w / IW, h / IH);
  const iw = IW * k;
  const ih = IH * k;
  const left = (w - iw) / 2;
  const top = h - ih;
  const ringY = top + RING_Y * k;
  const name = (org ?? '').toLocaleUpperCase(LOC);
  const fs = Math.min(150, 520 / Math.max(3, name.length * 0.62)) * k;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={w0 === undefined ? (e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }) : undefined}>
      <Image source={gold ? ARENA_GOLD : ARENA_ART[tier]} onError={() => setOk(false)} style={{ position: 'absolute', left, top, width: iw, height: ih }} resizeMode="stretch" resizeMethod="resize" />
      {tint && !gold ? <LinearGradient colors={[tint + '50', tint + '1c', tint + '00']} locations={[0, 0.45, 0.75]} style={StyleSheet.absoluteFill} /> : null}
      {name ? (
        <View style={{ position: 'absolute', left: 0, right: 0, top: ringY - fs * 0.62, alignItems: 'center', transform: [{ scaleY: 0.3 }] }}>
          <Text style={[a.org, { fontSize: fs, lineHeight: fs * 1.15 }]} numberOfLines={1}>
            {name}
          </Text>
          {sub ? (
            <Text style={[a.sub, { fontSize: 46 * k, lineHeight: 52 * k, letterSpacing: 6 * k }]} numberOfLines={1}>
              {sub.toLocaleUpperCase(LOC)}
            </Text>
          ) : null}
        </View>
      ) : null}
      {dim > 0 ? <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(4,4,6,${dim})` }]} /> : null}
    </View>
  );
}

const a = StyleSheet.create({
  org: { color: 'rgba(255,255,255,0.24)', fontFamily: F.display, fontStyle: 'italic', textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 1, height: 3 }, textShadowRadius: 2 },
  sub: { color: 'rgba(230,57,70,0.6)', fontFamily: F.display },
});

const GYM = require('../../assets/art/gym.jpg');
const PRESS = require('../../assets/art/press.jpg');

/** Kapsayıcıyı kaplayan çizilmiş görsel (cover). align: 'bottom' zemini, 'center' ortayı korur. Yüklenemezse çizilmez. */
function CoverArt({ source, iw, ih, align = 'bottom', dim = 0 }: { source: number; iw: number; ih: number; align?: 'bottom' | 'center'; dim?: number }) {
  const [ok, setOk] = useState(true);
  const [size, setSize] = useState({ w: 0, h: 0 });
  if (!ok) return null;
  const { w, h } = size;
  const k = w > 0 && h > 0 ? Math.max(w / iw, h / ih) : 0;
  const top = align === 'bottom' ? h - ih * k : (h - ih * k) / 2;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {k ? <Image source={source} onError={() => setOk(false)} style={{ position: 'absolute', left: (w - iw * k) / 2, top, width: iw * k, height: ih * k }} resizeMode="stretch" resizeMethod="resize" /> : null}
      {dim > 0 ? <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(4,4,6,${dim})` }]} /> : null}
    </View>
  );
}

/** Kariyer sahnesi için çizilmiş dövüş salonu (1200x1000), alta hizalı. */
export function GymBackdrop({ dim = 0 }: { dim?: number }) {
  return <CoverArt source={GYM} iw={1200} ih={1000} dim={dim} />;
}

/** Yüz yüze / tartı sahnesi: basın panosu, spotlar, foto muhabirleri (1200x720), ortalı. */
export function PressBackdrop({ dim = 0 }: { dim?: number }) {
  return <CoverArt source={PRESS} iw={1200} ih={720} align="center" dim={dim} />;
}
