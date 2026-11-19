// Yeni görünüm: paylaşım kartının arkasındaki çizilmiş sahne. Görsel kartı kaplar; üstüne kart şablonunun
// (Şampiyon Paketi şablonları dahil) renkleri yarı saydam bindirilir, böylece şablon rengi korunur ve yazılar okunur.
import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, View } from 'react-native';
import { ARENA_ART, ARENA_GOLD } from '../ui/arenaArt';
import type { ShareCardData } from './types';

const GYM = require('../../assets/art/gym.jpg');

/** Kaynak görsel ve boyutu. */
export function cardArtSource(sahne: NonNullable<ShareCardData['sahne']>): { src: number; iw: number; ih: number } {
  if (sahne.kaynak === 'salon') return { src: GYM, iw: 1200, ih: 1000 };
  return { src: sahne.kaynak === 'altin' ? ARENA_GOLD : ARENA_ART[sahne.tier], iw: 1170, ih: 1560 };
}

export function CardArt({ sahne, bg, w, h }: { sahne?: ShareCardData['sahne']; bg: [string, string, string]; w: number; h: number }) {
  if (!sahne) return null;
  const { src, iw, ih } = cardArtSource(sahne);
  const k = Math.max(w / iw, h / ih);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image source={src} style={{ position: 'absolute', left: (w - iw * k) / 2, top: h - ih * k, width: iw * k, height: ih * k }} resizeMode="stretch" />
      {sahne.tint ? <LinearGradient colors={[sahne.tint + '50', sahne.tint + '00']} locations={[0, 0.5]} style={StyleSheet.absoluteFill} /> : null}
      <LinearGradient colors={[bg[0] + '59', bg[1] + 'b3', bg[2] + 'f5']} locations={[0, 0.5, 0.85]} style={StyleSheet.absoluteFill} />
    </View>
  );
}
