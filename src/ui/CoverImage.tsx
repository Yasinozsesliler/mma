// Kapsayıcıyı kaplayan görsel (cover), ölçüyü kendisi hesaplar: kapsayıcıyı ölçer, görseli oranını koruyarak
// büyütür ve istenen kenara hizalar. resizeMode="cover" web'de bazı kaplarda görseli fazla büyüttüğü için
// yeni görünümün çizilmiş sahneleri bununla yerleştirilir. Yüklenemezse hiçbir şey çizmez.
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

export function CoverImage({ source, iw, ih, align = 'center', opacity }: { source: number; iw: number; ih: number; align?: 'top' | 'center' | 'bottom'; opacity?: number }) {
  const [ok, setOk] = useState(true);
  const [size, setSize] = useState({ w: 0, h: 0 });
  if (!ok) return null;
  const { w, h } = size;
  const k = w > 0 && h > 0 ? Math.max(w / iw, h / ih) : 0;
  const top = align === 'bottom' ? h - ih * k : align === 'top' ? 0 : (h - ih * k) / 2;
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none" onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {k ? <Image source={source} onError={() => setOk(false)} style={{ position: 'absolute', left: (w - iw * k) / 2, top, width: iw * k, height: ih * k, opacity }} resizeMode="stretch" /> : null}
    </View>
  );
}
