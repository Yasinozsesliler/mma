// Yeni görünüm: çizilmiş arena arka planı (assets/art/arena.jpg) ve ring zeminine perspektifle yazılan
// organizasyon adı. Görsel alta hizalanır (zemin hep görünür); yüklenemezse hiçbir şey çizmez, altındaki
// gradyan zemin kalır. Klasik görünümde kullanılmaz.
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LOC } from '../i18n';
import { F } from './theme';

const ART = require('../../assets/art/arena.jpg');
const IW = 1170;
const IH = 1560;
/** Görseldeki ring logosunun merkezi (piksel). */
const RING_Y = 1376;

/** w/h verilmezse kapsayıcısını kendisi ölçer. dim: üstüne bindirilen karartma (0–1). */
export function ArenaBackdrop({ w: w0, h: h0, org, sub, dim = 0 }: { w?: number; h?: number; org?: string; sub?: string; dim?: number }) {
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
      <Image source={ART} onError={() => setOk(false)} style={{ position: 'absolute', left, top, width: iw, height: ih }} resizeMode="stretch" />
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

/** Kariyer sahnesi için çizilmiş dövüş salonu (1200x1000), alta hizalı ve kapsayıcıyı kaplar. */
export function GymBackdrop({ dim = 0 }: { dim?: number }) {
  const [ok, setOk] = useState(true);
  const [size, setSize] = useState({ w: 0, h: 0 });
  if (!ok) return null;
  const { w, h } = size;
  const k = w > 0 && h > 0 ? Math.max(w / 1200, h / 1000) : 0;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {k ? <Image source={GYM} onError={() => setOk(false)} style={{ position: 'absolute', left: (w - 1200 * k) / 2, top: h - 1000 * k, width: 1200 * k, height: 1000 * k }} resizeMode="stretch" /> : null}
      {dim > 0 ? <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(4,4,6,${dim})` }]} /> : null}
    </View>
  );
}
